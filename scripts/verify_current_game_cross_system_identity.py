"""Narrow official single-game identity bridge: SVHL division name -> HTO name.

Public-source proof ONLY for the SAME scheduled/played 2026/27 game:
  SVHL current team's TeamInfo schedule date/time/score vs Braves HC
  HTO Brave H.C. corresponding official boxscore date/time/opponent/score
Do NOT merge historic franchise records, player histories or aliases on name
similarity. No original workbook, HTO CMS or schedule writes.
"""
from argparse import ArgumentParser
from datetime import datetime,timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request,urlopen
import json,os,re,sys
LEAGUE=570
BRIDGES=[
 {"divisionName":"Mohawks HC","teamid":13680,"htoName":"Mohawks H.C.",
  "gameId":3356178,"date":"2026-09-27","time":"6:15PM","bravesGF":3,"bravesGA":6},
 {"divisionName":"Sugo Sundays","teamid":13709,"htoName":"Michelob Morts",
  "gameId":3369564,"date":"2026-10-04","time":"8:15PM","bravesGF":2,"bravesGA":3}
]
class Hold(ValueError):pass
class Words(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.tokens=[]
 def handle_data(self,s):
  if s.strip():self.tokens.append(" ".join(s.split()))
def tokens(text):
 parser=Words();parser.feed(text);return parser.tokens
def want(ok,why):
 if not ok:raise Hold(why)
def read(url):
 want(url.startswith("https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid=")
      or url.startswith("https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID="),
      "UNAPPROVED_PUBLIC_SOURCE_URL")
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (Brave HC official game audit)"}),timeout=18) as r:
  want(r.status==200,"PUBLIC_SOURCE_HTTP_UNAVAILABLE")
  b=r.read(200000)
  want(len(b)<200000,"UNEXPECTED_PUBLIC_SOURCE_SIZE")
  return b.decode("utf8",errors="replace"),sha256(b).hexdigest()
def normalize_time(s):
 m=re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)",s,re.I)
 if not m:raise Hold("OFFICIAL_GAME_START_TIME_UNAVAILABLE")
 return f"{int(m.group(1))}:{m.group(2)}{m.group(3).upper()}"
def normalize_date(s):
 try:return datetime.strptime(s.strip(),"%b %d, %Y").date().isoformat()
 except ValueError as ex:raise Hold("OFFICIAL_GAME_DATE_INVALID") from ex
def scheduled_rows(source,team_name):
 # Official SVHL TeamInfo page has an explicit Schedule / Date / Time /
 # vs. Team / Home/Visitor / Score table, followed by a separate Roster.
 ts=tokens(source)
 signature=["Schedule","Date","Time","vs. Team","Home/Visitor","Score"]
 starts=[i+len(signature) for i in range(len(ts)) if ts[i:i+len(signature)]==signature]
 want(len(starts)==1,"SVHL_TEAM_SCHEDULE_TABLE_NOT_UNIQUE")
 start=starts[0]
 stop=ts.index("Roster",start)
 segment=ts[start:stop]
 want(len(segment)%6==0 and len(segment)>=24,"SVHL_SCHEDULE_COLUMNS_CHANGED")
 rows=[]
 for i in range(0,len(segment),6):
  rawday,time,versus,other,side,score=segment[i:i+6]
  want(versus=="vs." and side in ("Home","Visitor"),"SVHL_SCHEDULE_SHAPE_CHANGED")
  want(re.fullmatch(r"\d+\s*-\s*\d+",score) is not None,"SVHL_SCORE_FORMAT_CHANGED")
  home,visitor=[int(x.strip()) for x in score.split("-")]
  rows.append({"date":normalize_date(rawday),"time":normalize_time(time),
    "other":other,"side":side,"home":home,"visitor":visitor})
 return rows
def hto_box_info(page):
 ts=tokens(page)
 ix=[i for i,v in enumerate(ts) if v=="Score Board"]
 want(len(ix)==1,"HTO_GAME_SCOREBOARD_NOT_UNIQUE")
 i=ix[0]+1
 want(ts[i:i+7]==["REGULAR SEASON","1","2","3","OT","2OT","F"],
      "HTO_OFFICIAL_BOXSCORE_HEADER_CHANGED")
 r=ts[i+7:i+21]
 want(len(r)==14,"HTO_GAME_SCOREBOARD_INCOMPLETE")
 a={"name":r[0],"periods":[int(s) for s in r[1:7]]}
 b={"name":r[7],"periods":[int(s) for s in r[8:14]]}
 want(a["periods"][-1]==sum(a["periods"][:5]) and
      b["periods"][-1]==sum(b["periods"][:5]),"HTO_BOX_PERIOD_SUM_DISAGREEMENT")
 dates=[x for x in ts if re.fullmatch(r"Sunday, (?:Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug) \d{1,2}, 20\d\d",x)]
 want(len(dates)==1,"HTO_GAME_DATE_AMBIGUOUS")
 d=normalize_date(dates[0].split(", ",1)[1])
 idx=ts.index(dates[0]);time=normalize_time(ts[idx+1])
 return {"date":d,"time":time,"teams":(a,b)}
def certify(spec,svhl_text,hto_text):
 name=spec["divisionName"]
 want(name in tokens(svhl_text),"SVHL_TEAM_IDENTITY_NOT_FOUND_"+name)
 rows=scheduled_rows(svhl_text,name)
 games=[r for r in rows if r["date"]==spec["date"] and r["other"]=="Braves HC"]
 want(len(games)==1,"SVHL_BRAVES_GAME_DATE_NOT_UNIQUE_"+name)
 g=games[0]
 want(g["side"]=="Visitor","SVHL_OPPONENT_HOME_AWAY_CHANGE_REQUIRES_REVIEW_"+name)
 want((g["time"],g["home"],g["visitor"])==
      (spec["time"],spec["bravesGF"],spec["bravesGA"]),
      "SVHL_BRAVES_START_TIME_OR_SCORE_CHANGED_"+name)
 h=hto_box_info(hto_text)
 ours=[x for x in h["teams"] if x["name"]=="Brave H.C."]
 others=[x for x in h["teams"] if x["name"]!= "Brave H.C."]
 want(len(ours)==len(others)==1,"HTO_BRAVES_TEAM_IDENTITY_NOT_UNIQUE")
 want((h["date"],h["time"],others[0]["name"],ours[0]["periods"][-1],others[0]["periods"][-1])==
      (spec["date"],spec["time"],spec["htoName"],spec["bravesGF"],spec["bravesGA"]),
      "HTO_OFFICIAL_GAME_ID_DATE_TIME_SCORE_OR_OPPONENT_CHANGED_"+name)
 return {"divisionName":name,"htoRecordedOpponent":spec["htoName"],
  "htogameId":spec["gameId"],"date":g["date"],"gameTime":g["time"],
  "bravesGoals":spec["bravesGF"],"opponentGoals":spec["bravesGA"],
  "result":"W" if spec["bravesGF"]>spec["bravesGA"] else "L" if spec["bravesGF"]<spec["bravesGA"] else "T",
  "scope":"THIS_COMPLETED_GAME_ONLY",
  "historicalFranchiseMergeAuthorized":False}
def build(source=None):
 out=[]
 for spec in BRIDGES:
  teamUrl=f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid={LEAGUE}&teamid={spec['teamid']}&page_type=Adult"
  boxUrl=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={spec['gameId']}&p=boxscore"
  if source is None:
   officialLeague,svhlHash=read(teamUrl)
   officialHTO,htoHash=read(boxUrl)
  else:
   officialLeague,officialHTO=source[spec["divisionName"]]
   svhlHash=sha256(officialLeague.encode()).hexdigest()
   htoHash=sha256(officialHTO.encode()).hexdigest()
  rec=certify(spec,officialLeague,officialHTO)
  rec.update(svhlSource=teamUrl,htoSource=boxUrl,
             svhlSourceSHA256=svhlHash,htoSourceSHA256=htoHash)
  out.append(rec)
 return {"schema":"brave-hc-2026-single-game-identity-proof/v1",
  "status":"OFFICIAL_SAME_GAME_PROOF_VERIFIED",
  "generatedUTC":datetime.now(timezone.utc).isoformat(),
  "franchiseHistoryMerged":False,
  "sameGamePairs":out,
  "notice":"These links validate two individual 2026/27 Braves games between official SVHL and HTO records. Earlier franchise history remains unmerged."}
def main():
 a=ArgumentParser();a.add_argument("--output",required=True);opt=a.parse_args()
 try:
  doc=build();out=Path(opt.output);out.parent.mkdir(parents=True,exist_ok=True)
  temp=out.with_suffix(out.suffix+".tmp")
  temp.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  os.replace(temp,out)
  print(json.dumps({"status":doc["status"],"crossSystemGames":len(doc["sameGamePairs"]),
                    "franchiseHistoryMerged":False,"output":str(out)}))
  return 0
 except (Hold,ValueError,KeyError,OSError,TypeError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e),"publicChanged":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
