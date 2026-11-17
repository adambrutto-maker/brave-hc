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
from collect_svhl_league_intelligence import get
from collect_svhl_player_game_events import team_sheet
W=Path(__file__).resolve().parents[1]/"widgets"
REG=W/"leagueos-source-qualified-current-fixtures-v4.json"
OUT=W/"leagueos-settled-delta-v23.json"
DISCOVERY=W/"leagueos-fixture-discovery-v24.json"
SCHEMA="bruttech-leagueos-settled-results/v23"
def need(x,reason):
 if not x:raise ValueError("DAILY_SETTLED_HOLD:"+reason)
def load_discovery(base_hash):
 need(DISCOVERY.exists(),"V24 fixture discovery source not present; do not infer future source IDs")
 d=json.loads(DISCOVERY.read_text("utf8"))
 need(d.get("schema")=="bruttech-leagueos-four-night-fixture-discovery/v24" and
      d.get("status")=="READ_ONLY_CANDIDATE_SOURCE_NOT_LEAGUE_APPROVED" and
      d.get("officialRecordsEdited") is False and
      d.get("baseFixtureSha256")==base_hash and
      d.get("counts",{}).get("sourcePagesHeld")==0 and
      d.get("counts",{}).get("currentLeagueTeams")==len(d.get("teamDirectory",[])) and
      d.get("counts",{}).get("newCandidateCount")==len(d.get("candidates",[])) and
      d.get("counts",{}).get("sourceNights")==4,
      "Current source discovery is incomplete or unauthorised")
 keys=set()
 for f in d["candidates"]:
  key=(f["league_id"],f["game_id"])
  need(key not in keys and f.get("officialWriteAllowed") is False and
       f.get("reciprocal") is True and f.get("sourceCount")==2 and
       f.get("statusEvidence")=="EXACT_TWO_TEAM_SOURCE_GAME_ID_PARITY" and
       re.fullmatch(r"20\d\d-\d\d-\d\d",f.get("date","")) and
       isinstance(f.get("home_team_id"),int) and
       isinstance(f.get("away_team_id"),int) and
       f["home_team_id"]!=f["away_team_id"],
       "Untrusted candidate source record")
  keys.add(key)
 return d
def leaf(f,side):
 league=f["league_id"]
 if side=="home":teamId=f["home_team_id"];opponentId=f["away_team_id"]
 else:teamId=f["away_team_id"];opponentId=f["home_team_id"]
 url=f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid={league}&teamid={teamId}&page_type=Adult"
 html,hash_=get(url)
 rows,held=team_sheet(league,{"sourceTeamId":teamId},html,hash_)
 if any(h.get("gameId")==f["game_id"] for h in held):
  return {"side":side,"status":"DUPLICATED_SOURCE_GAME_ID_HOLD","teamId":teamId}
 matches=[x for x in rows if x["gameId"]==f["game_id"]]
 if len(matches)!=1:return {"side":side,"status":"GAME_ID_MISSING_OR_AMBIGUOUS","teamId":teamId}
 row=matches[0]
 expectedSide="Home" if side=="home" else "Visitor"
 if (row["side"]!=expectedSide or row["opponentTeamId"]!=opponentId or
     row["date"]!=f["date"] or row["time"]!=f["time"]):
  return {"side":side,"status":"EXACT_GAME_ID_DATE_TIME_OR_OPPONENT_CONFLICT","teamId":teamId}
 if row["scoreStatus"]!="SOURCE_NONZERO":
  return {"side":side,"status":"UNSETTLED_ZERO_ZERO","teamId":teamId}
 return {"side":side,"status":"SOURCE_RESULT_PRESENT","teamId":teamId,
         "goals":row["homeGoals"] if side=="home" else row["visitorGoals"],
         "against":row["visitorGoals"] if side=="home" else row["homeGoals"],
         "source":url,"sha256":hash_}
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
 discovery=load_discovery(baseHash)
 known={(f["league_id"],f["game_id"]) for f in j["fixtures"]}
 due=[f for f in j["fixtures"] if f["status"]=="FUTURE_RECIPROCAL_FIXTURE" and f["date"]<today]
 additional=[]
 names={(x["leagueId"],x["teamId"]):x["name"] for x in discovery["teamDirectory"]}
 for c in discovery["candidates"]:
  key=(c["league_id"],c["game_id"])
  need(key not in known,"Discovery candidate duplicates canonical source game ID")
  if c["date"]>=today:continue
  if c.get("missingFromCurrentSource") or c["status"]=="SOURCE_MISSING_REVIEW_HOLD":
   # Missing case remains in source gate as held, never an accepted result.
   additional.append({"league_id":c["league_id"],"game_id":c["game_id"],
     "date":c["date"],"time":c["time"],"origin":"DISCOVERY_V24_MISSING_HOLD",
     "home_team_id":c["home_team_id"],"away_team_id":c["away_team_id"],
     "home":names.get((c["league_id"],c["home_team_id"]),"SOURCE_MISSING"),
     "away":names.get((c["league_id"],c["away_team_id"]),"SOURCE_MISSING")})
   continue
  need(c["status"] in ("NEW_FUTURE_RECIPROCAL","NEW_RECIPROCAL_SETTLED",
      "NEW_PAST_ZERO_ZERO_HOLD","NEW_SAME_DAY_SCORE_HOLD"),"Untrusted discovery case")
  nameHome=names.get((c["league_id"],c["home_team_id"]))
  nameAway=names.get((c["league_id"],c["away_team_id"]))
  need(bool(nameHome) and bool(nameAway),"Discovery source team IDs are outside directory")
  additional.append({"league_id":c["league_id"],"game_id":c["game_id"],
    "date":c["date"],"time":c["time"],"home_team_id":c["home_team_id"],
    "away_team_id":c["away_team_id"],"home":nameHome,"away":nameAway,
    "origin":"DISCOVERY_V24"})
 due.extend(additional)
 need(len({(f["league_id"],f["game_id"]) for f in due})==len(due),
   "Duplicate source fixture ID across frozen and new discovery")
 # A late-settled fixture must not be dropped; all due dates are inspected.
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
 allowedForRating={(x["league_id"],x["team_id"]) for x in
   json.loads((W/"leagueos_division_alignment_public_v2.json").read_text())["teams"]}
 def guarded_check(f):
  if f.get("origin")=="DISCOVERY_V24_MISSING_HOLD":
   return {"fixture":f,"state":"HOLD","reasons":["DISCOVERY_SOURCE_DISAPPEARED"]}
  if ((f["league_id"],f["home_team_id"]) not in allowedForRating or
      (f["league_id"],f["away_team_id"]) not in allowedForRating):
   return {"fixture":f,"state":"HOLD","reasons":["SOURCE_TEAM_UNRATED_RESEARCH_ONLY"]}
  return day_check(f)
 with ThreadPoolExecutor(max_workers=args.max_workers) as pool:
  evaluated=list(pool.map(guarded_check,due))
 by_day={}
 for e in evaluated:by_day.setdefault(e["fixture"]["date"],[]).append(e)
 newly=[]
 for day,events in sorted(by_day.items()):
  # Never publish partial result updates from the same scheduled league night.
  if any(x["state"]!="VERIFIED" for x in events):continue
  for e in events:
   v=e["evidence"];key=(v["leagueId"],v["gameId"])
   v["sourceOrigin"]=e["fixture"].get("origin","CANONICAL_V4")
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
  "discoveryCandidateCountAtAcceptance":len(discovery["candidates"]),
  "discoverySourceRevisionAtAcceptance":discovery["lastMaterialChangeToronto"],
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
