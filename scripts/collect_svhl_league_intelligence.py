"""Read-only multi-division SVHL intelligence collector for Brave H.C.

Captures all current Sunday Winter divisions (not just Cristillo), team IDs,
official season W/L/T/GF/GA standings and team-level schedule results against
named opponents. Official team data is compared reciprocally where both teams'
published result cards exist. Future/0-0 placeholders are NEVER scored as games.
Previous winter standings and roster-ID continuity may be collected as a
reference, never silently merged into a current franchise identity.

Source: public leagues.sportsvillage.ca pages only.
No workbook, HTO, account, GitHub or league-source writes.
"""
from __future__ import annotations
from collections import defaultdict,Counter
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from urllib.request import Request,urlopen
import argparse,json,os,re,sys,time

BASE="https://leagues.sportsvillage.ca"
ACTIVE=570
PREVIOUS=547
TABLE_RE=re.compile(r'(?is)<b\s+class="blue">\s*([^<]+)</b>\s*<br\s*/?>\s*<div>\s*<table\s+class="Grid"([^>]*)>(.*?)</table>')
HEAD=["Team","GP","W","L","T","PTS","GF","GA","PIM"]
class SourceHold(ValueError):pass
def require(ok,why):
 if not ok:raise SourceHold(why)
def url_league(league):return f"{BASE}/Leagues.aspx?leagueid={league}&page_type=Adult&sc=HOCKEY"
def url_team(league,team):return f"{BASE}/TeamInfo.aspx?leagueid={league}&teamid={team}&page_type=Adult"
def get(url):
 u=urlparse(url)
 require(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca" and
         u.path in ("/Leagues.aspx","/TeamInfo.aspx"),"UNAPPROVED_OFFICIAL_SOURCE_HOST_OR_PATH")
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 BraveHC-HockeyOS public-read-only"}),timeout=17) as resp:
  require(resp.status==200,"OFFICIAL_SVHL_HTTP_"+str(resp.status))
  payload=resp.read(350001)
 require(0<len(payload)<=350000,"SVHL_SOURCE_SIZE_OUTSIDE_LIMIT")
 return payload.decode("utf8",errors="replace"),sha256(payload).hexdigest()

class Parsed(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.words=[];self.refs=[];self.anchor=None;self.depth=0;self.row=None;self.cell=None;self.rows=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=="a":self.anchor={"url":a.get("href",""),"label":[]}
  if t=="table":self.depth+=1
  if t=="tr" and self.depth:self.row=[]
  if t in ("td","th") and self.row is not None:self.cell=[]
 def handle_data(self,v):
  if v.strip():self.words.append(" ".join(v.split()))
  if self.anchor is not None:self.anchor["label"].append(v)
  if self.cell is not None:self.cell.append(v)
 def handle_endtag(self,t):
  if t=="a" and self.anchor is not None:
   self.refs.append({"label":" ".join("".join(self.anchor["label"]).split()),
                     "url":self.anchor["url"]})
   self.anchor=None
  if t in ("td","th") and self.cell is not None and self.row is not None:
   self.row.append(" ".join("".join(self.cell).split()));self.cell=None
  if t=="tr" and self.row is not None:
   if self.row:self.rows.append(self.row)
   self.row=None
  if t=="table" and self.depth:self.depth-=1
def standings(league,html,source_sha):
 matches=list(TABLE_RE.finditer(html))
 require(4<=len(matches)<=22,"SVHL_DIVISION_TABLES_NOT_FOUND")
 page=Parsed();page.feed(html)
 ids={}
 for link in page.refs:
  u=urlparse(link["url"])
  if u.path.lower().lstrip("/")!="teaminfo.aspx":continue
  q=parse_qs(u.query)
  if q.get("leagueid")!=[str(league)] or not q.get("teamid"):continue
  name=link["label"]
  tid=int(q["teamid"][0])
  if name in ids:require(ids[name]==tid,"DUPLICATE_TEAM_NAME_TO_DIFFERENT_ID_"+name)
  ids[name]=tid
 divisions=[];allteams=[]
 for m in matches:
  label=" ".join(m.group(1).split())
  rows=Parsed();rows.feed("<table>"+m.group(3)+"</table>")
  data=rows.rows
  require(data and data[0]==HEAD,"LEAGUE_STANDINGS_HEADER_CHANGED_"+label)
  teams=[]
  for row in data[1:]:
   require(len(row)==len(HEAD),"INVALID_SVHL_STANDINGS_ROW_"+label)
   name=row[0]
   require(name in ids,"LEAGUE_TEAMINFO_ID_MISSING_"+name)
   stats={k.lower():int(v) for k,v in zip(HEAD[1:],row[1:])}
   require(all(v>=0 for v in stats.values()) and
           stats["gp"]==stats["w"]+stats["l"]+stats["t"] and
           stats["pts"]==2*stats["w"]+stats["t"],
           "INVALID_LEAGUE_WLT_PTS_"+name)
   entry={"name":name,"sourceTeamId":ids[name],"division":label,**stats}
   teams.append(entry);allteams.append(entry)
  divisions.append({"name":label,"competitive":bool(teams) and not re.search(r"x.?playoff",label,re.I),
                    "teams":teams})
 require(len({x["sourceTeamId"] for x in allteams})==len(allteams) and
         len({x["name"] for x in allteams})==len(allteams),
         "DUPLICATE_LEAGUE_SOURCE_TEAM_OR_ID")
 return {"leagueId":league,"source":url_league(league),"sourceSHA256":source_sha,
         "divisions":divisions,"teams":allteams}

SCHEDULE_HEAD=["Schedule","Date","Time","vs. Team","Home/Visitor","Score"]
def team_schedule(league,team,html,sha):
 p=Parsed();p.feed(html)
 starts=[i+len(SCHEDULE_HEAD) for i in range(len(p.words))
         if p.words[i:i+len(SCHEDULE_HEAD)]==SCHEDULE_HEAD]
 require(len(starts)==1,"TEAM_SCHEDULE_NOT_UNIQUE_"+team["name"])
 start=starts[0]
 stops=[i for i in range(start,len(p.words)) if p.words[i]=="Roster"]
 require(len(stops)>=1,"TEAM_SCHEDULE_MISSING_ROSTER_SECTION_"+team["name"])
 rows=p.words[start:stops[0]]
 require(len(rows)%6==0 and 1<=len(rows)//6<=32,"TEAM_SCHEDULE_ROW_SHAPE_CHANGED_"+team["name"])
 result=[]
 for i in range(0,len(rows),6):
  date_s,time_s,versus,other,side,score=rows[i:i+6]
  require(versus=="vs." and side in ("Home","Visitor"),"TEAM_FIXTURE_SIDE_INVALID_"+team["name"])
  try:
   date=datetime.strptime(date_s,"%b %d, %Y").date().isoformat()
   clock=datetime.strptime(time_s.upper(),"%I:%M%p").strftime("%H:%M")
  except ValueError as err:raise SourceHold("TEAM_SCHEDULE_DATE_TIME_INVALID_"+team["name"]) from err
  m=re.fullmatch(r"(\d+)\s*-\s*(\d+)",score)
  require(m is not None,"TEAM_FIXTURE_SCORE_NOT_NUMERIC_"+team["name"])
  home,away=(int(m.group(1)),int(m.group(2)))
  require(0<=home<=40 and 0<=away<=40,"SCHEDULE_SCORE_OUT_OF_SCOPE")
  result.append({"date":date,"time":clock,"opponentName":other,"side":side,
                 "homeScore":home,"visitorScore":away,
                 "teamGoals":home if side=="Home" else away,
                 "against":away if side=="Home" else home,
                 "scoreStatus":"UNVERIFIED_ZERO_ZERO" if home==away==0 else "REPORTED_NONZERO",
                 "source":url_team(league,team["sourceTeamId"])})
 rosterids=set()
 for item in p.refs:
  u=urlparse(item["url"]);q=parse_qs(u.query)
  if u.path.lower().lstrip("/")!="playerinfo.aspx" or q.get("teamid")!=[str(team["sourceTeamId"])]:
   continue
  if q.get("playerid"):rosterids.add(q["playerid"][0])
 return {"name":team["name"],"sourceTeamId":team["sourceTeamId"],"division":team["division"],
         "sourceSHA256":sha,"sourceURL":url_team(league,team["sourceTeamId"]),
         "publishedScheduleRows":result,"rosterIDCount":len(rosterids),"playerIDs":sorted(rosterids)}
def fixture_ledger(team_pages,teams):
 by_name={x["name"]:x for x in teams}
 singles=defaultdict(list)
 counts=Counter()
 for team in team_pages:
  for row in team["publishedScheduleRows"]:
   other=by_name.get(row["opponentName"])
   if other is None:
    counts["opponentOutOfCurrentTeamDirectory"]+=1
    continue
   identity=tuple(sorted((team["sourceTeamId"],other["sourceTeamId"])))
   key=(row["date"],row["time"],identity)
   singles[key].append((team,row,other))
 games=[]
 for (day,clock,pair),observations in sorted(singles.items()):
  if len(observations)!=2:
   counts["unpairedScheduleFixture"]+=1
   continue
  a,b=observations
  require(a[0]["sourceTeamId"]!=b[0]["sourceTeamId"] and
          a[1]["opponentName"]==b[0]["name"] and
          b[1]["opponentName"]==a[0]["name"],
          "RECIPROCAL_SOURCE_FIXTURE_IDENTITIES_DISAGREE")
  require(a[1]["side"]!=b[1]["side"] and
          (a[1]["homeScore"],a[1]["visitorScore"])==
          (b[1]["homeScore"],b[1]["visitorScore"]),
          "RECIPROCAL_SOURCE_SCORE_OR_HOME_AWAY_DISAGREEMENT")
  home=a if a[1]["side"]=="Home" else b
  away=b if home is a else a
  status="UNVERIFIED_ZERO_ZERO" if home[1]["homeScore"]==home[1]["visitorScore"]==0 else "OFFICIAL_RECIPROCAL_NONZERO_SCORE"
  games.append({"date":day,"time":clock,"homeTeamId":home[0]["sourceTeamId"],
      "visitorTeamId":away[0]["sourceTeamId"],"homeTeam":home[0]["name"],
      "visitorTeam":away[0]["name"],"homeDivisionNow":home[0]["division"],
      "visitorDivisionNow":away[0]["division"],
      "homeGoals":home[1]["homeScore"],"visitorGoals":home[1]["visitorScore"],
      "sourceStatus":status,"sourcePages":[home[1]["source"],away[1]["source"]]})
  counts[status]+=1
 return games,dict(counts)
def compute(league,team_pages):
 teams=league["teams"]
 games,issues=fixture_ledger(team_pages,teams)
 byid={t["sourceTeamId"]:t for t in teams}
 results=defaultdict(list)
 for g in games:
  if g["sourceStatus"]!="OFFICIAL_RECIPROCAL_NONZERO_SCORE":continue
  for tid,opid,for_,against in (
      (g["homeTeamId"],g["visitorTeamId"],g["homeGoals"],g["visitorGoals"]),
      (g["visitorTeamId"],g["homeTeamId"],g["visitorGoals"],g["homeGoals"])):
   results[tid].append({"date":g["date"],"opponentTeamId":opid,"opponent":byid[opid]["name"],
       "opponentCurrentDivision":byid[opid]["division"],
       "gf":for_,"ga":against,"result":"W" if for_>against else "L" if for_<against else "T"})
 rank=[]
 for t in teams:
  gp=t["gp"];w,l,ties=t["w"],t["l"],t["t"]
  played=results[t["sourceTeamId"]]
  measured={"gp":len(played),"w":sum(x["result"]=="W" for x in played),
    "l":sum(x["result"]=="L" for x in played),"t":sum(x["result"]=="T" for x in played),
    "gf":sum(x["gf"] for x in played),"ga":sum(x["ga"] for x in played)}
  comparable={k:t[k] for k in measured}
  parity=measured==comparable
  opps=[byid[x["opponentTeamId"]] for x in played]
  sos=round(sum((o["w"]+0.5*o["t"])/o["gp"] for o in opps if o["gp"])/len(opps),4) if opps else None
  rank.append({"name":t["name"],"teamId":t["sourceTeamId"],"divisionNow":t["division"],
      "gp":gp,"w":w,"l":l,"t":ties,"gf":t["gf"],"ga":t["ga"],"pts":t["pts"],
      "winPct":round((w+0.5*ties)/gp,4) if gp else None,
      "goalsDiffPerGame":round((t["gf"]-t["ga"])/gp,3) if gp else None,
      "opponentCurrentWinPctAvg":sos,"verifiedReciprocalGames":len(played),
      "resultsAgreementWithCurrentStandings":parity,
      "sourceRecordDifferences":{} if parity else {k:{"standings":comparable[k],"pairedTeamCards":measured[k]}
                                                 for k in measured if comparable[k]!=measured[k]},
      "gameResults":played})
 league["scheduleSources"]={p["name"]:{"teamId":p["sourceTeamId"],
     "url":p["sourceURL"],"sha256":p["sourceSHA256"],"listedFixtures":len(p["publishedScheduleRows"]),
     "rosterIDCount":p["rosterIDCount"]}
     for p in team_pages}
 league["gameLedger"]=games
 league["gameSourceChecks"]=issues
 league["performance"]=rank
 league["totalTeams"]=len(teams)
 league["totalDivisions"]=len(league["divisions"])
 league["completedReciprocalFixtures"]=sum(x["sourceStatus"]=="OFFICIAL_RECIPROCAL_NONZERO_SCORE" for x in games)
 league["standingTeamCardsMatching"]=sum(t["resultsAgreementWithCurrentStandings"] for t in rank)
 league["allTeamCardsMatchStandings"]=(league["standingTeamCardsMatching"]==len(rank))
 return league
def run_one(league):
 source,hash_=get(url_league(league))
 result=standings(league,source,hash_)
 allteams=result["teams"]
 def worker(team):
  url=url_team(league,team["sourceTeamId"])
  text,sha=get(url)
  return team_schedule(league,team,text,sha)
 pages=[]
 with ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(worker,t):t["name"] for t in allteams}
  for f in as_completed(futures):
   pages.append(f.result())
 result=compute(result,pages)
 result["sourceRetrievedUTC"]=datetime.now(timezone.utc).isoformat()
 return result,pages
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--output",required=True)
 ap.add_argument("--prior",action="store_true")
 opts=ap.parse_args()
 started=datetime.now(timezone.utc).isoformat()
 try:
  current,current_pages=run_one(ACTIVE)
  previous,previous_pages=run_one(PREVIOUS) if opts.prior else (None,None)
  continuity=[]
  if previous is not None:
   currentRoster={p["name"]:set(p["playerIDs"]) for p in current_pages}
   previousRoster={p["name"]:set(p["playerIDs"]) for p in previous_pages}
   priorByName={p["name"]:p for p in previous["performance"]}
   # Only this spelling variant has separate original Brave H.C./HTO
   # evidence, not league-name similarity or an inferred team rename.
   reviewed={"Mohawks HC":"Mohawks H/C"}
   for now in current["performance"]:
    name=now["name"]
    old_name=name if name in priorByName else reviewed.get(name)
    if old_name not in priorByName:continue
    overlap=len(currentRoster[name] & previousRoster[old_name])
    smaller=min(len(currentRoster[name]),len(previousRoster[old_name]))
    ratio=round(overlap/smaller,3) if smaller else 0.0
    qualified=overlap>=3 and ratio>=0.25
    prior=priorByName[old_name]
    record={"currentSourceName":name,"priorSourceName":old_name,
      "priorLeagueId":PREVIOUS,"priorDivision":prior["divisionNow"],
      "currentLeagueTeamId":now["teamId"],"priorLeagueTeamId":prior["teamId"],
      "sameDisplayedName":name==old_name,
      "reviewedHTOWorkbookNameVariant":old_name!=name,
      "sharedOfficialPlayerIDs":overlap,"continuityRatioOfSmallerRoster":ratio,
      "status":"ROSTER_ID_CONTINUITY_CONFIRMED" if qualified else "CROSS_SEASON_IDENTITY_NOT_VERIFIED"}
    if qualified:
     record["previousSeason"]={k:prior[k] for k in
       ("gp","w","l","t","gf","ga","pts","winPct","goalsDiffPerGame","divisionNow",
        "verifiedReciprocalGames","resultsAgreementWithCurrentStandings")}
     now["priorSeasonReference"]=record
    continuity.append(record)
  result={"schema":"brave-hc-svhl-league-intelligence/private-v1",
          "state":"PRIVATE_SOURCE_VERIFIED_REVIEW",
          "source":"Sports Village Sunday Winter official public multi-division standings and TeamInfo results",
          "fetchedStartedUTC":started,
          "fetchedFinishedUTC":datetime.now(timezone.utc).isoformat(),
          "current":current,"previous":previous,
          "crossSeasonContinuity":continuity,
          "qualifiedPriorSeasonAssociations":sum(x["status"]=="ROSTER_ID_CONTINUITY_CONFIRMED" for x in continuity),
          "canonicalFranchiseAliasesNotAutomaticallyAssumed":True,
          "zeroZeroNotTreatedAsCompleted":True,
          "officialHtoBravesGameResultsNotReplaced":True,
          "originalMasterWorkbookWritten":False,"publicGithubPublished":False}
  outfile=Path(opts.output)
  outfile.parent.mkdir(parents=True,exist_ok=True)
  tmp=outfile.with_suffix(outfile.suffix+".tmp")
  tmp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  os.replace(tmp,outfile)
  print(json.dumps({"status":result["state"],
    "currentLeague":ACTIVE,"currentDivisionCount":current["totalDivisions"],
    "currentTeams":current["totalTeams"],
    "verifiedGames":current["completedReciprocalFixtures"],
    "teamCardsAgree":current["standingTeamCardsMatching"],
    "zeroZeroUnverified":current["gameSourceChecks"].get("UNVERIFIED_ZERO_ZERO",0),
    "priorTeams":previous["totalTeams"] if previous else 0,
    "privateOutput":str(outfile),"bookWritten":False}))
 except (SourceHold,KeyError,ValueError,OSError,TypeError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e),"noPublicWrites":True}),file=sys.stderr)
  return 2
 return 0
if __name__=="__main__":sys.exit(main())
