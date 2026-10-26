"""Private cross-system historical Brave game validation, no source writes.

Compare official archived SVHL TeamInfo opponent-schedule game date + both
perspective scores with the canonical Master source game date, exact opponent
season and score. Old 0–0 calendar slots and incomplete pages never produce
verified game joins. Season-scoped team IDs are not continuing franchise IDs.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from pathlib import Path
from hashlib import sha256
import json,re,sys
from collect_svhl_league_intelligence import get,team_schedule,url_team,SourceHold
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
BRAVE_NAMES={"bravehc","braveshc"} 
class HistoryJoinHold(ValueError): pass
def need(condition,message):
 if not condition:raise HistoryJoinHold("BRAVE_OFFICIAL_GAME_HOLD:"+message)
def key(x):return re.sub(r"[^a-z0-9]","",str(x).lower())
def build(master,candidates):
 need(master.get("schema")=="brave-hc-opponent-master-history-stage/v1" and
      master.get("status")=="PRIVATE_HISTORICAL_REVIEW_ONLY" and
      master.get("source",{}).get("sha256")==MASTER_SHA and
      len(master.get("games",[]))==358,"MASTER_SOURCE_DRIFTED")
 need(candidates.get("schema")=="brave-hc-historical-division-crosswalk/private-review-v1" and
      candidates.get("sourceMasterSHA256")==MASTER_SHA and
      candidates.get("status")=="PRIVATE_NOT_A_PUBLIC_FRANCHISE_OR_GAME_JOIN",
      "CROSSWALK_NOT_QUALIFIED")
 byseason=defaultdict(list)
 for x in master["games"]:byseason[(x["season"],x["opponentExact"].strip().casefold())].append(x)
 tasks=candidates["sameSeasonNameCandidates"]
 def check(c):
  original=byseason[(c["season"],c["officialPublishedTeamName"].strip().casefold())]
  url=url_team(c["officialLeagueId"],c["officialLeagueSeasonTeamId"])
  receipt={"season":c["season"],"officialLeagueId":c["officialLeagueId"],
   "officialLeagueSeasonTeamId":c["officialLeagueSeasonTeamId"],
   "officialTeamName":c["officialPublishedTeamName"],
   "officialDivision":c["officialDivisionName"],
   "officialSource":url,
   "masterSameSeasonGameCount":len(original),
   "admittedGames":[],"heldGameDates":[],"identityBasis":"VERIFIED_SAME_SEASON_OPPONENT_SCORE_DATE_ONLY"}
  try:
   html,source_sha=get(url)
   receipt["officialPageSHA256"]=source_sha
   team={"name":c["officialPublishedTeamName"],"sourceTeamId":c["officialLeagueSeasonTeamId"],
    "division":c["officialDivision"]}
   page=team_schedule(c["officialLeagueId"],team,html,source_sha)
   schedule=page["publishedScheduleRows"]
   for game in original:
    matches=[g for g in schedule if g["date"]==game["date"] and
        key(g["opponentName"]) in BRAVE_NAMES]
    confirmed=[g for g in matches if g["scoreStatus"]=="REPORTED_NONZERO" and
       g["teamGoals"]==game["bravesGA"] and g["against"]==game["bravesGF"]]
    if len(confirmed)==1 and not game["scoreResultDisagreement"]:
     g=confirmed[0]
     receipt["admittedGames"].append({"date":game["date"],
       "bravesGF":game["bravesGF"],"bravesGA":game["bravesGA"],
       "result":game["result"],"sourceOfficialScoreStatus":g["scoreStatus"],
       "officialOpponentName":g["opponentName"]})
    else:receipt["heldGameDates"].append({
       "date":game["date"],
       "reason":"AMBIGUOUS" if len(confirmed)>1 else
         "SOURCE_SCORE_RESULT_DISAGREEMENT" if game["scoreResultDisagreement"] else
         "OFFICIAL_SCHEDULE_SCORE_OR_DATE_NOT_RECIPROCAL",
       "publishedScheduleBravesOnDate":len(matches)})
  except (OSError,SourceHold,ValueError,KeyError,TypeError) as e:
   receipt["pageHold"]=str(e)[:220]
   receipt["heldGameDates"]=[{"date":g["date"],"reason":"OFFICIAL_TEAM_PAGE_UNQUALIFIED"}
      for g in original]
  receipt["admittedCount"]=len(receipt["admittedGames"])
  receipt["heldCount"]=len(receipt["heldGameDates"])
  need(receipt["admittedCount"]+receipt["heldCount"]==len(original),
       "GAME_COUNT_DECREMENT")
  return receipt
 reviews=[]
 with ThreadPoolExecutor(max_workers=4) as pool:
  future={pool.submit(check,c):c for c in tasks}
  for f in as_completed(future):reviews.append(f.result())
 reviews.sort(key=lambda x:(x["season"],x["officialTeamName"]))
 admitted=sum(x["admittedCount"] for x in reviews)
 held=sum(x["heldCount"] for x in reviews)
 return {"schema":"brave-hc-archived-official-games/private-parity-v1",
   "status":"PRIVATE_SOURCE_CHECKED_GAME_JOINS_NOT_FRANCHISE_CONTINUITY",
   "capturedUTC":datetime.now(timezone.utc).isoformat(),
   "masterSourceSHA256":MASTER_SHA,
   "candidatesReviewed":len(reviews),"admittedGameComparisons":admitted,
   "heldGameComparisons":held,"pagesHeld":sum(bool(x.get("pageHold")) for x in reviews),
   "reviewedSameSeasonTeams":reviews,
   "sourceLimit":"Game dates and opposite-perspective scores crosschecked with published official TeamInfo rows, not historical roster continuity. Official 0–0 placeholders and unpaired games are held.",
   "publicWritten":False,"originalWorkbookWritten":False}
def main():
 p=ArgumentParser()
 for field in ("master","candidates","out"):p.add_argument("--"+field,required=True)
 a=p.parse_args()
 try:
  read=lambda path:json.loads(Path(path).read_text(encoding="utf-8-sig"))
  doc=build(read(a.master),read(a.candidates))
  target=Path(a.out);target.parent.mkdir(parents=True,exist_ok=True)
  temp=target.with_suffix(target.suffix+".tmp")
  temp.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  temp.replace(target)
  print(json.dumps({"status":doc["status"],"seasonTeamCandidates":doc["candidatesReviewed"],
    "dateScoreMatchedGames":doc["admittedGameComparisons"],
    "gameComparisonsHeld":doc["heldGameComparisons"],
    "pagesHeld":doc["pagesHeld"],"publicWritten":False}))
  return 0
 except (HistoryJoinHold,OSError,KeyError,ValueError) as e:
  print(json.dumps({"status":"HOLD","error":str(e),"publicWritten":False}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
