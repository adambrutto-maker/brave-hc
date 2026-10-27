"""Independent public GameInfo and player-season comparison validator.

Checks official linked scorer playerId, reciprocal final-score goal parity,
unresolved assist status, season shard/index cohesion and source fingerprints.
No GP, PIM or career-point totals are silently marked verified.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path
import json,re,sys
SCHEMA="brave-hc-svhl-game-reconciliation-index/v1"
YEAR="brave-hc-svhl-season-individual-game-evidence/v1"
class GameProofHold(ValueError):pass
def need(ok,msg):
 if not ok:raise GameProofHold("PUBLIC_GAME_PROOF_HOLD:"+msg)
def check(index,yearFiles):
 need(index.get("schema")==SCHEMA and
   index.get("status")=="SEASON_SCOPED_PARTIAL_PLAYER_GAME_EVENT_EVIDENCE" and
   index.get("registeredGPVerified") is False and
   index.get("seasonStatsOverwritten") is False and
   index.get("sourceCanAdvanceBeyondAcceptedStandings") is True and
   index.get("sourceOnlyPlayerIdentity")==
     "EXACT_OFFICIAL_PLAYERID_WITH_LINKED_SEASON_TEAM_AND_GAMEINFO_SCORER_ID" and
   index.get("assistsQualification")==
     "EXACT_UNIQUE_SOURCE_ROSTER_NAME_ONLY_NOT_LINKED_IN_GAMEINFO" and
   index.get("goalsQualification")==
     "SCORE_MATCHED_GAME_EVENT_OFFICIAL_PLAYER_ID_ONLY",
   "GAME_INDEX_SCOPE_OR_IDENTITY")
 ids={int(k) for k in index.get("seasons",{})}
 need(len(ids)==index.get("sourceSeasonCount")==len(yearFiles) and
   570 in ids and len(ids)>=2,"SOURCE_SEASON_LIST_INCOMPLETE")
 gamesTotal=0;fullTotal=0;heldTotal=0;years={}
 for lid,season in yearFiles.items():
  need(lid in ids and season.get("schema")==YEAR and
    season.get("leagueId")==lid and
    season.get("status")=="SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS" and
    season.get("leagueAssignmentsOrPlayerTotalsWritten") is False and
    season.get("leagueSourceSnapshotAsOf")==index["acceptedLeagueAsOf"],
    "SOURCE_SEASON_EVIDENCE_INVALID")
  src=index["seasons"][str(lid)]
  need(src["completedGames"]==len(season["games"]) and
       src["teamSeasons"]==len(season["teams"]) and
       src["fullScoringGames"]==sum(g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"
            for g in season["games"]) and
       src["partialScoringGames"]==len(season["games"])-src["fullScoringGames"] and
       len({g["gameId"] for g in season["games"]})==len(season["games"]),
       "SOURCE_YEAR_COUNT_PARITY")
  rosterMap={}
  for t in season["teams"]:
   tid=t["sourceTeamId"]
   need(tid not in rosterMap and
     re.fullmatch("[a-f0-9]{64}",t["sourceTeamPageSHA256"]) is not None and
     t["rosterCount"]==len(t["playerSeasonSummaries"]),"TEAM_SOURCE_PARITY")
   rosterMap[tid]={p["playerId"]:p for p in t["playerSeasonSummaries"]}
   need(len(rosterMap[tid])==t["rosterCount"],"PLAYER_ID_DUPLICATE_ON_TEAM")
   for p in t["playerSeasonSummaries"]:
    need(p["gpStatus"]=="CANNOT_VERIFY_GAME_APPEARANCE_FROM_GOAL_EVENT_SHEET" and
      p["registeredSeasonGP"]>=0 and
      p["published"]["pts"]==p["published"]["g"]+p["published"]["a"] and
      all(v>=0 for v in p["observedFullGameEvents"].values()) and
      p["observedFullGameEvents"]["pts"]==
      p["observedFullGameEvents"]["g"]+p["observedFullGameEvents"]["a"],
      "PLAYER_PROVENANCE_OR_EVENT_ARITHMETIC")
  counted=Counter()
  for g in season["games"]:
   need(g["leagueId"]==lid and g["homeTeamId"]!=g["awayTeamId"] and
     g["homeTeamId"] in rosterMap and g["awayTeamId"] in rosterMap and
     g["homeGoals"]>=0 and g["awayGoals"]>=0 and
     g["source"]=="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid="+
        str(lid)+"&gameid="+str(g["gameId"])+"&page_type=Adult" and
     re.fullmatch("[a-f0-9]{64}",g["sourcePageSHA256"]) is not None,
     "GAME_OFFICIAL_URL_OR_HASH_NOT_ADMITTED")
   if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY":
    goal=Counter(e["teamId"] for e in g["resolvedGoals"])
    need(goal[g["homeTeamId"]]==g["homeGoals"] and
       goal[g["awayTeamId"]]==g["awayGoals"] and
       g["partialSheetGoalCount"]==0,
       "GOALS_DO_NOT_MATCH_OFFICIAL_FINAL_SCORE")
    fullTotal+=1
    for ev in g["resolvedGoals"]:
     tid,pid=ev["teamId"],ev["scorerId"]
     need(pid in rosterMap[tid] and 1<=ev["period"]<=4 and
       ev["assistProof"] in ("EXACT_UNIQUE_OFFICIAL_TEAM_ROSTER_NAME","AMBIGUOUS_NAME_HOLD") and
       len(ev["assistPlayerIds"])<=2 and
       len(set(ev["assistPlayerIds"]))==len(ev["assistPlayerIds"]) and
       all(assist in rosterMap[tid] for assist in ev["assistPlayerIds"]),
       "PLAYER_GOAL_ASSIST_ID_PROOF_INVALID")
     counted[(tid,pid,"g")]+=1
     for assist in ev["assistPlayerIds"]:counted[(tid,assist,"a")]+=1
   else:
    need(g["status"]=="PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL" and
         g["partialSheetGoalCount"]>=0 and not g["resolvedGoals"],
         "PARTIAL_UNQUALIFIED_GAME_EVENT_STORED_AS_VERIFIED")
  for tid,players in rosterMap.items():
   for pid,p in players.items():
    need(p["observedFullGameEvents"]["g"]==counted[(tid,pid,"g")] and
      p["observedFullGameEvents"]["a"]==counted[(tid,pid,"a")] and
      p["deltaPublishedMinusObserved"]["g"]==
        p["published"]["g"]-counted[(tid,pid,"g")] and
      p["deltaPublishedMinusObserved"]["a"]==
        p["published"]["a"]-counted[(tid,pid,"a")],
      "PLAYER_VERIFIED_GAME_TOTAL_CONFLICT")
  gamesTotal+=len(season["games"])
  heldTotal+=len(season["heldGameEvidence"])
  years[lid]=len(season["games"])
 need(len(index.get("currentPlayers",[]))==index["currentRosterPlayers"] and
    len(index["currentPlayers"])>=300 and
    len({(p["currentTeamId"],p["playerId"]) for p in index["currentPlayers"]})==
        len(index["currentPlayers"]),"CURRENT_PLAYER_SEASON_LINK_COUNT_INVALID")
 for p in index["currentPlayers"]:
  need(p["noVerifiedGP"] is True and p["seasonEvidence"] and
       p["seasonEvidence"][0]["leagueId"]==570 and
       p["seasonEvidence"][0]["teamId"]==p["currentTeamId"],
       "HISTORICAL_PLAYER_LINK_TO_NONCURRENT_SOURCE")
  for e in p["seasonEvidence"]:
   need(e["leagueId"] in years and e["teamId"] in
     {t["sourceTeamId"] for t in yearFiles[e["leagueId"]]["teams"]} and
     e["sourceUrl"]=="./svhl-player-game-"+str(e["leagueId"])+".json",
     "HISTORICAL_YEAR_GAME_PROOF_URL_INVALID")
 return {"status":"SOURCE_PLAYER_GAME_EVENT_RECONCILIATION_PASS",
   "seasons":len(years),"gamePages":gamesTotal,"fullGameGoalParity":fullTotal,
   "partiallyHeldOrUnsupportedGameEvidence":heldTotal,
   "currentRosterPlayers":index["currentRosterPlayers"],
   "seasonGameCounts":years,
   "seasonGPClaimedVerified":False,"seasonPIMClaimedVerified":False}
def main():
 p=ArgumentParser()
 p.add_argument("--dir",default=str(Path(__file__).resolve().parents[1]/"widgets"))
 a=p.parse_args();base=Path(a.dir)
 try:
  d=json.loads((base/"svhl-player-game-index.json").read_text(encoding="utf8"))
  years={int(k):json.loads((base/("svhl-player-game-"+k+".json")).read_text(encoding="utf8"))
    for k in d["seasons"]}
  print(json.dumps(check(d,years)))
  return 0
 except (GameProofHold,ValueError,KeyError,TypeError,OSError) as err:
  print(json.dumps({"status":"HOLD","reason":str(err)[:900]}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
