"""Read-only Brave H.C. HTO calendar collector for upcoming, source-linked fixtures.

Independent of the SVHL completed-score pipeline. No missing fixture, opponent
identity, game time or result is inferred. The source is Brave H.C.'s publicly
published HTO schedule; this is not an independent SVHL confirmation.
"""
from __future__ import annotations
from html.parser import HTMLParser
from datetime import datetime,date,timezone,timedelta
from zoneinfo import ZoneInfo
from urllib.request import Request,urlopen
from urllib.parse import urljoin,urlparse,parse_qs
from pathlib import Path
import argparse,hashlib,json,re,sys,calendar
HOST="https://www.hometeamsonline.com/teams/default.asp"
SCHEMA="brave-hc-hto-upcoming-fixtures/v1"
ZONE="America/Toronto"
class ScheduleHold(ValueError): pass
def need(ok,why):
 if not ok:raise ScheduleHold("HTO_FIXTURE_HOLD:"+why)
def month_add(year,month,step):
 n=year*12+month-1+step
 return n//12,(n%12)+1
def schedule_url(year,month):
 return HOST+"?d="+f"{year:04d}{month:02d}01&p=schedule&s=hockey&u=BRAVESHOCKEY"
def norm(value):
 return re.sub(r"[^a-z0-9]","",value.casefold())
class CalendarParser(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.table=0;self.day_td=0;self.date=None;self.span=0
  self.anchor=None;self.strong=0;self.rows=[];self.present=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="table":
   if self.table:self.table+=1
   elif a.get("id")=="daysDetail":
    self.table=1;self.present=True
  if not self.table:return
  if tag=="td":
   if self.day_td:self.day_td+=1
   elif "eventDays" in a.get("class","").split() and a.get("id","").startswith("day_"):
    self.day_td=1;self.date=None
  if not self.day_td:return
  if tag=="span":self.span+=1
  if tag=="a" and "game" in a.get("class","").split() and "type0" in a.get("class","").split():
   need(self.anchor is None,"NESTED_GAME_LINK")
   self.anchor={"href":a.get("href",""),"class":a.get("class",""),
                "parts":[],"name":[]}
  if self.anchor:
   if tag=="br":self.anchor["parts"].append("\n")
   if tag=="strong":self.strong+=1
 def handle_data(self,data):
  if not self.day_td:return
  if self.span and re.search(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+ \d+ \d{4}",data):
   self.date=data.strip()
  if self.anchor:
   self.anchor["parts"].append(data)
   if self.strong:self.anchor["name"].append(data)
 def handle_endtag(self,tag):
  if not self.table:return
  if tag=="strong" and self.strong:self.strong-=1
  if tag=="a" and self.anchor:
   item=self.anchor;item["date"]=self.date;self.rows.append(item);self.anchor=None
  if tag=="span" and self.span:self.span-=1
  if tag=="td" and self.day_td:
   self.day_td-=1
   if not self.day_td:self.date=None;self.span=0
  if tag=="table":
   self.table-=1
   need(self.table>=0,"CALENDAR_TABLE_UNBALANCED")
def parse(html,month):
 parser=CalendarParser();parser.feed(html)
 need(parser.present,"HTO_SCHEDULE_DETAIL_TABLE_MISSING")
 result=[]
 for row in parser.rows:
  raw=row.get("date")
  need(isinstance(raw,str),"GAME_DATE_NOT_FOUND")
  try:dt=datetime.strptime(raw,"%A, %B %d %Y")
  except ValueError as e:raise ScheduleHold("HTO_FIXTURE_HOLD:CALENDAR_DATE_INVALID") from e
  need(dt.strftime("%A")==raw.split(",")[0],"CALENDAR_WEEKDAY_MISMATCH")
  need(dt.strftime("%Y-%m")==month,"SOURCE_PAGE_MONTH_MISMATCH")
  href=urljoin(HOST,row["href"].replace("&amp;","&"))
  u=urlparse(href);p=parse_qs(u.query)
  # Completed games link to a different HTO view; never admit them as future fixtures.
  if p.get("p")!=["preview"]:continue
  need(u.scheme=="https" and u.hostname in ("www.hometeamsonline.com","www.htosports.com") and
       u.path=="/teams/default.asp" and p.get("u")==["BRAVESHOCKEY"] and
       p.get("p")==["preview"] and len(p.get("gameID",[]))==1 and
       p["gameID"][0].isdigit(),"UNVERIFIED_GAME_PREVIEW_LINK")
  name=" ".join(row["name"]).strip()
  text="\n".join(x.strip() for x in "".join(row["parts"]).split("\n"))
  detail=re.search(r"(?i)\b(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*\((Home|Away)\)",text)
  need(bool(name) and detail is not None,"GAME_NAME_TIME_OR_HOME_AWAY_MISSING")
  clock=datetime.strptime(detail.group(1)+" "+detail.group(2).upper(),"%I:%M %p").strftime("%H:%M")
  location=text.split("\n")[-1].strip()
  need(location.lower().startswith("at ") and len(location)>3,"GAME_LOCATION_NOT_LISTED")
  result.append({"gameId":int(p["gameID"][0]),"date":dt.date().isoformat(),
                 "localTime":clock,"homeAway":detail.group(3).upper(),
                 "opponentHTO":name,"location":location[3:].strip(),
                 "gameUrl":href})
 return result
def collect(league,calendar_pages,now=None,days=75):
 need(league.get("schema")=="brave-hc-league-intelligence/public-v1" and
      league.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
      league.get("currentSourceDataConcordant") is True and league.get("leagueId")==570,
      "LEAGUE_CONTEXT_NOT_QUALIFIED")
 now=now or datetime.now(ZoneInfo(ZONE))
 need(now.tzinfo is not None,"COLLECTION_TIME_UNZONED")
 need(7<=days<=93,"SCHEDULE_WINDOW_NOT_ALLOWED")
 start=now.date();last=start+timedelta(days=days)
 lookup={}
 for t in league["teams"]:
  for name in (t["leagueName"],t["displayName"]):
   k=norm(name)
   need(k!="","TEAM_NAME_INVALID")
   if k in lookup:need(lookup[k]["sourceTeamId"]==t["sourceTeamId"],"AMBIGUOUS_LEAGUE_TEAM_ALIAS")
   lookup[k]=t
 need(len(calendar_pages)>=3,"SCHEDULE_MONTH_COVERAGE_INSUFFICIENT")
 games={};sources=[]
 for url,body in calendar_pages:
  q=parse_qs(urlparse(url).query)
  need(urlparse(url).hostname=="www.hometeamsonline.com" and
       q.get("u")==["BRAVESHOCKEY"] and q.get("p")==["schedule"],"MONTH_SOURCE_URL_INVALID")
  month=q.get("d",[""])[0][:6]
  need(re.fullmatch(r"\d{6}",month) is not None,"MONTH_SOURCE_ID_INVALID")
  label=month[:4]+"-"+month[4:]
  entries=parse(body,label)
  sources.append({"month":label,"url":url,"htmlSHA256":hashlib.sha256(body.encode("utf8")).hexdigest(),
                  "listedGames":len(entries)})
  for g in entries:
   if not start<=date.fromisoformat(g["date"])<=last:continue
   before=games.get(g["gameId"])
   need(before is None or before==g,"SCHEDULE_ID_CONFLICT")
   games[g["gameId"]]=g
 fixtures=[]
 for g in sorted(games.values(),key=lambda x:(x["date"],x["localTime"],x["gameId"])):
  match=lookup.get(norm(g["opponentHTO"]))
  fixtures.append({**g,"sourceTeamId":match["sourceTeamId"] if match else None,
                   "leagueName":match["leagueName"] if match else None,
                   "divisionNow":match["divisionNow"] if match else None,
                   "identityState":"MATCHED_CURRENT_SVHL_SEASON_TEAM" if match else
                     "HTO_NAME_NOT_MATCHED_TO_CURRENT_SVHL_TEAM"})
 result={"schema":SCHEMA,"status":"SOURCE_LINKED_BRAVES_HTO_SCHEDULE_NOT_SVHL_VERIFIED",
    "teamAccount":"BRAVESHOCKEY","timeZone":ZONE,
    "capturedUTC":now.astimezone(timezone.utc).isoformat(),
    "windowStart":start.isoformat(),"windowEnd":last.isoformat(),
    "leagueSourceAsOf":league["asOf"],
    "sourcePages":sources,"games":fixtures,
    "gamesCount":len(fixtures),
    "matchedCurrentLeagueCount":sum(x["sourceTeamId"] is not None for x in fixtures),
    "nonpredictive":True,
    "note":"Upcoming fixtures are read from Brave H.C.'s published HTO calendar, not independently verified with SVHL. Times are Vaughan/Toronto local; source may reschedule. Scores are not collected here."}
 validate(result,league)
 return result
def validate(doc,league):
 need(doc.get("schema")==SCHEMA and
      doc.get("status")=="SOURCE_LINKED_BRAVES_HTO_SCHEDULE_NOT_SVHL_VERIFIED" and
      doc.get("teamAccount")=="BRAVESHOCKEY" and doc.get("timeZone")==ZONE and
      doc.get("nonpredictive") is True,"PUBLIC_SCHEDULE_PROVENANCE_INVALID")
 try:
  d=datetime.fromisoformat(doc["capturedUTC"].replace("Z","+00:00"))
  start=date.fromisoformat(doc["windowStart"]);end=date.fromisoformat(doc["windowEnd"])
 except (ValueError,KeyError) as err:raise ScheduleHold("HTO_FIXTURE_HOLD:SOURCE_DATE_INVALID") from err
 need(d.tzinfo is not None and 7<=(end-start).days<=93,"SOURCE_WINDOW_INVALID")
 pages=doc.get("sourcePages",[])
 need(isinstance(pages,list) and len(pages)>=3 and
      len({x["month"] for x in pages})==len(pages),"SOURCE_MONTH_COVERAGE_BAD")
 for p in pages:
  need(re.fullmatch(r"[0-9a-f]{64}",p.get("htmlSHA256","")) is not None and
       p["url"]==schedule_url(int(p["month"][:4]),int(p["month"][5:])),"SOURCE_PAGE_HASH_OR_URL_BAD")
 members={x["sourceTeamId"]:x for x in league["teams"]}
 games=doc.get("games",[])
 need(isinstance(games,list) and len(games)==doc.get("gamesCount") and
      len({x["gameId"] for x in games})==len(games) and len(games)<=100,
      "PUBLIC_GAME_COUNT_OR_ID_INVALID")
 need(games==sorted(games,key=lambda x:(x["date"],x["localTime"],x["gameId"])),
      "PUBLIC_GAME_ORDER_INVALID")
 for g in games:
  need(type(g.get("gameId")) is int and g["gameId"]>0 and
       re.fullmatch(r"\d{2}:\d{2}",g.get("localTime","")) is not None and
       g.get("homeAway") in ("HOME","AWAY") and
       isinstance(g.get("opponentHTO"),str) and len(g["opponentHTO"])>0 and
       isinstance(g.get("location"),str) and len(g["location"])>0 and
       start<=date.fromisoformat(g["date"])<=end,"GAME_FIELDS_INVALID")
  u=urlparse(g["gameUrl"]);p=parse_qs(u.query)
  need(u.scheme=="https" and u.hostname in ("www.hometeamsonline.com","www.htosports.com") and
       u.path=="/teams/default.asp" and p.get("gameID")==[str(g["gameId"])] and
       p.get("u")==["BRAVESHOCKEY"] and p.get("p")==["preview"],"GAME_EVIDENCE_URL_INVALID")
  match=members.get(g.get("sourceTeamId"))
  if match:
   need(g["identityState"]=="MATCHED_CURRENT_SVHL_SEASON_TEAM" and
        g["leagueName"]==match["leagueName"] and g["divisionNow"]==match["divisionNow"] and
        norm(g["opponentHTO"]) in (norm(match["leagueName"]),norm(match["displayName"])),
        "UNVERIFIED_LEAGUE_TEAM_MATCH")
  else:need(g["sourceTeamId"] is None and g["leagueName"] is None and
             g["divisionNow"] is None and
             g["identityState"]=="HTO_NAME_NOT_MATCHED_TO_CURRENT_SVHL_TEAM",
             "UNQUALIFIED_IDENTITY_MUST_BE_UNKNOWN")
 need(doc.get("matchedCurrentLeagueCount")==sum(g["sourceTeamId"] is not None for g in games),
      "MATCHED_COUNT_MISMATCH")
 return True
def main():
 a=argparse.ArgumentParser()
 a.add_argument("--league",required=True);a.add_argument("--out",required=True)
 a.add_argument("--days",type=int,default=75);a.add_argument("--check-only",action="store_true")
 v=a.parse_args()
 try:
  league=json.loads(Path(v.league).read_text(encoding="utf-8-sig"))
  now=datetime.now(ZoneInfo(ZONE))
  pages=[]
  for i in range(4):
   y,m=month_add(now.year,now.month,i);url=schedule_url(y,m)
   req=Request(url,headers={"User-Agent":"BraveHC-HockeyOS/1.0 (public schedule QA)","Accept":"text/html"})
   with urlopen(req,timeout=25) as res:
    need(res.status==200,"SOURCE_RESPONSE_NOT_200")
    pages.append((url,res.read(600000).decode("utf8","replace")))
  result=collect(league,pages,now,days=v.days)
  target=Path(v.out);target.parent.mkdir(parents=True,exist_ok=True)
  if not v.check_only:
   temp=target.with_suffix(target.suffix+".tmp")
   temp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
   temp.replace(target)
  print(json.dumps({"state":"HTO_UPCOMING_FIXTURE_SOURCE_PASS","games":result["gamesCount"],
         "matched":result["matchedCurrentLeagueCount"],"capturedUTC":result["capturedUTC"],
         "sourceMonths":len(result["sourcePages"]),"sourceWritten":not v.check_only}))
  return 0
 except (ScheduleHold,ValueError,KeyError,TimeoutError,OSError) as err:
  print(json.dumps({"state":"HOLD","reason":str(err),"sourceWritten":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
