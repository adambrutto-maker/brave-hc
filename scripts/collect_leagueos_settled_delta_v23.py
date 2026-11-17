"""Daily post-settlement candidate capture for public LeagueOS V23 recommendations.

Read-only: verify both sides of each RECIPROCAL future fixture after Toronto
calendar day has passed. Do not accept 0-0 placeholders, incomplete fixtures,
one-sided scores, missing source or source disagreements. Never modify HTO/SVHL.
Only update derived public GitHub Pages model after a fully settled league night.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo
from hashlib import sha256
from pathlib import Path
import argparse,json,sys,re,os
from collect_svhl_league_intelligence import get,team_schedule
W=Path(__file__).resolve().parents[1]/"widgets"
REG=W/"leagueos-source-qualified-current-fixtures-v4.json"
OUT=W/"leagueos-settled-delta-v23.json"
SCHEMA="bruttech-leagueos-settled-results/v23"
def need(x,reason):
 if not x:raise ValueError("DAILY_SETTLED_HOLD:"+reason)
def leaf(f,side):
 league=f["league_id"]
 if side=="home":teamId=f["home_team_id"];name=f["home"]
 else:teamId=f["away_team_id"];name=f["away"]
 url=f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid={league}&teamid={teamId}&page_type=Adult"
 html,hash_=get(url)
 team={"sourceTeamId":teamId,"name":name,"division":"Unknown"}
 parsed=team_schedule(league,team,html,hash_)
 opponent=f["away"] if side=="home" else f["home"]
 rows=[x for x in parsed["publishedScheduleRows"] if x["date"]==f["date"] and
       x["time"]==f["time"] and x["opponentName"]==opponent]
 if len(rows)!=1:return {"side":side,"status":"MISSING_OR_AMBIGUOUS_SCHEDULE","teamId":teamId}
 row=rows[0]
 expectedSide="Home" if side=="home" else "Visitor"
 if row["side"]!=expectedSide:return {"side":side,"status":"SOURCE_HOME_AWAY_CONFLICT","teamId":teamId}
 if row["scoreStatus"]!="REPORTED_NONZERO":return {"side":side,"status":"UNSETTLED_ZERO_ZERO","teamId":teamId}
 return {"side":side,"status":"SOURCE_RESULT_PRESENT","teamId":teamId,
         "goals":row["teamGoals"],"against":row["against"],
         "source":parsed["sourceURL"],"sha256":hash_}
def day_check(f):
 try:
  with ThreadPoolExecutor(max_workers=2) as pool:
   a,b=list(pool.map(lambda side:leaf(f,side),("home","away")))
  if a["status"]!="SOURCE_RESULT_PRESENT" or b["status"]!="SOURCE_RESULT_PRESENT":
   return {"fixture":f,"state":"HOLD", "reasons":[a["status"],b["status"]]}
  if a["goals"]!=b["against"] or b["goals"]!=a["against"]:
   return {"fixture":f,"state":"HOLD","reasons":["RECIPROCAL_GOAL_CONFLICT"]}
  if a["goals"]+b["goals"]==0:
   return {"fixture":f,"state":"HOLD","reasons":["ZERO_ZERO_NOT_FINAL"]}
  return {"fixture":f,"state":"VERIFIED","evidence":{
   "leagueId":f["league_id"],"gameId":f["game_id"],"date":f["date"],
   "homeTeamId":f["home_team_id"],"awayTeamId":f["away_team_id"],
   "homeGoals":a["goals"],"awayGoals":b["goals"],
   "homeSourceSha256":a["sha256"],"awaySourceSha256":b["sha256"],
   "recipientCoverage":"RECIPROCAL_TEAM_SCHEDULES_VERIFIED",
   "sourceURLs":[a["source"],b["source"]]}}
 except Exception as e:
  return {"fixture":f,"state":"HOLD","reasons":[str(e)[:140]]}
def main():
 parser=argparse.ArgumentParser();parser.add_argument("--asof",default=None,
  help="Toronto date YYYY-MM-DD override for local test only")
 parser.add_argument("--max-workers",type=int,default=4)
 args=parser.parse_args()
 need(1<=args.max_workers<=6,"Worker limit")
 today=args.asof or datetime.now(ZoneInfo("America/Toronto")).date().isoformat()
 need(re.fullmatch(r"20\d{2}-\d{2}-\d{2}",today),"Invalid Toronto day")
 raw=REG.read_bytes();j=json.loads(raw)
 need(j.get("schema")=="bruttech-svhl-current-fixture-window/v4" and
      j.get("counts",{}).get("total")==411,"Original approved reciprocal registry unknown")
 baseHash=sha256(raw).hexdigest()
 due=[f for f in j["fixtures"] if f["status"]=="FUTURE_RECIPROCAL_FIXTURE" and f["date"]<today]
 # A late-settled fixture must not be dropped; all due dates are inspected, not just yesterday.
 due.sort(key=lambda x:(x["date"],x["league_id"],x["game_id"]))
 previous=None
 if OUT.exists():
  previous=json.loads(OUT.read_text("utf8"))
  need(previous.get("schema")==SCHEMA and previous.get("status")=="RECIPROCAL_SETTLED_GAMES_ONLY" and
       previous.get("baseFixtureSha256")==baseHash and
       previous.get("officialRecordsEdited") is False,"Previously accepted delta corrupt")
 old={(e["leagueId"],e["gameId"]):e for e in previous["games"]} if previous else {}
 if not due:
  print(json.dumps({"state":"NO_DUE_FIXTURES","asOfToronto":today,
   "verifiedNewGameCount":0,"publishedFileChanged":False,"previousVerified":len(old)}));return
 with ThreadPoolExecutor(max_workers=args.max_workers) as pool:
  evaluated=list(pool.map(day_check,due))
 by_day={}
 for e in evaluated:by_day.setdefault(e["fixture"]["date"],[]).append(e)
 newly=[]
 for day,events in sorted(by_day.items()):
  # Never publish partial result updates from the same scheduled league night.
  if any(x["state"]!="VERIFIED" for x in events):continue
  for e in events:
   v=e["evidence"];key=(v["leagueId"],v["gameId"])
   if key in old:
    for field in ("date","homeGoals","awayGoals","homeTeamId","awayTeamId"):
     need(old[key][field]==v[field],"Previously verified score changed: "+str(key))
   else:newly.append(v)
 if not newly:
  print(json.dumps({"state":"WAITING_FOR_NEW_SETTLED_SOURCE",
   "asOfToronto":today,"dueFixtures":len(due),"completeDates":[day for day,es in by_day.items()
     if all(e["state"]=="VERIFIED" for e in es)],
   "heldDates":[day for day,es in by_day.items() if any(e["state"]!="VERIFIED" for e in es)],
   "verifiedNewGameCount":0,"publishedFileChanged":False,"previousVerified":len(old)}));return
 games=sorted([*old.values(),*newly],key=lambda r:(r["date"],r["leagueId"],r["gameId"]))
 data={"schema":SCHEMA,"createdAt":datetime.now(ZoneInfo("America/Toronto")).isoformat(),
  "asOfToronto":today,"baseFixtureSha256":baseHash,
  "status":"RECIPROCAL_SETTLED_GAMES_ONLY",
  "capturePolicy":"Only previously announced future fixtures, after Toronto date, with both reciprocal public source scores and a fully settled date.",
  "officialRecordsEdited":False,"notLeagueApproved":True,
  "heldDates":[day for day,es in by_day.items() if any(e["state"]!="VERIFIED" for e in es)],
  "games":games}
 OUT.write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
 print(json.dumps({"state":"NEW_RECIPROCAL_SETTLED_GAMES_VERIFIED",
  "asOfToronto":today,"verifiedNewGameCount":len(newly),
  "totalVerifiedDelta":len(games),"newGameIds":[r["gameId"] for r in newly],
  "heldDates":data["heldDates"],"publishedFileChanged":True},indent=2))
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(json.dumps({"state":"SOURCE_HOLD","reason":str(e),"officialChanges":False}),file=sys.stderr);sys.exit(2)
