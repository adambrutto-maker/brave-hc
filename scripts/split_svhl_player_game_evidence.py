"""Separate qualified game sheets by official season for efficient public viewing.

Uses only the private GameInfo audit-derived research report. Each season file
is immutable, source-indexed public historical game evidence, not an amendment
to current official player/season records or any 10:15 league standings.
"""
from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
from datetime import datetime,timezone
from collections import defaultdict,Counter
import json,sys
ROOT_SCHEMA="brave-hc-svhl-game-reconciliation-index/v1"
YEAR_SCHEMA="brave-hc-svhl-season-individual-game-evidence/v1"
class SplitHold(ValueError):pass
def need(ok,why):
 if not ok:raise SplitHold("GAME_COMPONENT_HOLD:"+why)
def components(report,league,roster):
 need(report["schema"]=="brave-hc-svhl-individual-game-reconciliation/v1" and
      report["automatedPlayerStatsOverride"] is False and
      report["registeredGameAppearancesNotVerifiable"] is True and
      report["noMasterWorkbookModification"] is True and
      report["officialSourceWrites"] is False and
      report["leagueAsOf"]==league["asOf"] and
      roster["sourceLeagueAsOf"]==league["asOf"],
      "SOURCE_PROVENANCE_OR_SCOPE_INVALID")
 out=[]
 seen=set()
 for y in report["seasons"]:
  lid=y["leagueId"];need(lid not in seen,"YEAR_DUPLICATE")
  seen.add(lid)
  teams=[t for t in report["teamSeasons"] if t["leagueId"]==lid]
  games=[g for g in report["games"] if g["leagueId"]==lid]
  holds=[g for g in report["heldGameEvidence"] if g["leagueId"]==lid]
  need(len(teams)==y["sourceTeams"] and
       len(games)==y["completedReciprocalGameSheets"] and
       len([g for g in games if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"])==
       y["fullGoalSheetGames"] and
       len({g["gameId"] for g in games})==len(games),
       "SEASON_SOURCE_COUNTS_MISMATCH")
  out.append({"schema":YEAR_SCHEMA,"leagueId":lid,
   "status":"SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS",
   "capturedUTC":report["createdUTC"],
   "leagueSourceSnapshotAsOf":report["leagueAsOf"],
   "rosterSourceAsOf":report["rosterAsOf"],
   "summary":y,"teams":teams,"games":games,
   "heldGameEvidence":holds,
   "leagueAssignmentsOrPlayerTotalsWritten":False})
 current=[t for t in out if t["leagueId"]==570]
 need(len(current)==1,"CURRENT_YEAR_NOT_CAPTURED")
 by_id={x["sourceTeamId"]:x for x in current[0]["teams"]}
 currentTeams=[x for x in roster["teams"] if x["sourceTeamId"] in by_id]
 need(len(currentTeams)==22,"CURRENT_TEAM_ROSTER_SOURCE_NOT_COVERED")
 linked=[]
 for team in currentTeams:
  tid=team["sourceTeamId"]
  summary=by_id[tid]
  bypid={p["playerId"]:p for p in summary["playerSeasonSummaries"]}
  for p in team["players"]:
   need(p["playerId"] in bypid,"CURRENT_PLAYER_MISSING_FROM_YEAR_PROOF")
   evidence=[{"leagueId":570,"seasonTeamId":tid,
    "teamName":team["name"],"summary":bypid[p["playerId"]]}]
   for older in p["previousOfficialObservations"]:
    year=next((x for x in out if x["leagueId"]==older["leagueId"]),None)
    if year:
     t=next((x for x in year["teams"] if x["sourceTeamId"]==older["sourceTeamId"]),None)
     if t:
      prev=next((x for x in t["playerSeasonSummaries"] if x["playerId"]==p["playerId"]),None)
      if prev:evidence.append({"leagueId":older["leagueId"],
       "seasonTeamId":older["sourceTeamId"],"teamName":older["teamName"],
       "summary":prev})
   linked.append({"currentTeamId":tid,"currentTeamName":team["name"],
    "playerId":p["playerId"],"name":p["name"],
    "seasonEvidence":[{"leagueId":x["leagueId"],
      "teamId":x["seasonTeamId"],"teamName":x["teamName"],
      "sourceUrl":"./svhl-player-game-"+str(x["leagueId"])+".json",
      "published":x["summary"]["published"],
      "observedFullGameEvents":x["summary"]["observedFullGameEvents"],
      "status":x["summary"]["status"],
      "gameEventLinks":len(x["summary"]["events"])} for x in evidence],
    "noVerifiedGP":True})
 byYear={str(s["leagueId"]):{"source":"./svhl-player-game-"+str(s["leagueId"])+".json",
    "completedGames":s["summary"]["completedReciprocalGameSheets"],
    "fullScoringGames":s["summary"]["fullGoalSheetGames"],
    "partialScoringGames":s["summary"]["partialGoalSheetGames"],
    "sourceCurrentSnapshotMatches":s["summary"]["eligibleAcceptedSourceGamesMatched"],
    "unresolvedGameCount":len(s["heldGameEvidence"]),
    "teamSeasons":len(s["teams"])} for s in out}
 index={"schema":ROOT_SCHEMA,"status":"SEASON_SCOPED_PARTIAL_PLAYER_GAME_EVENT_EVIDENCE",
   "capturedUTC":report["createdUTC"],
   "acceptedLeagueAsOf":league["asOf"],"rosterAsOf":roster["asOf"],
   "sourceSeasonCount":len(out),"seasons":byYear,
   "currentTeamCount":22,"currentRosterPlayers":len(linked),
   "currentPlayers":linked,
   "sourceOnlyPlayerIdentity":"EXACT_OFFICIAL_PLAYERID_WITH_LINKED_SEASON_TEAM_AND_GAMEINFO_SCORER_ID",
   "assistsQualification":"EXACT_UNIQUE_SOURCE_ROSTER_NAME_ONLY_NOT_LINKED_IN_GAMEINFO",
   "goalsQualification":"SCORE_MATCHED_GAME_EVENT_OFFICIAL_PLAYER_ID_ONLY",
   "registeredGPVerified":False,"seasonStatsOverwritten":False,
   "unqualifiedEventRowsHeld":True,
   "sourceCanAdvanceBeyondAcceptedStandings":True,
   "caveat":"This reports source-verified goal events, cautiously associated assists and unresolved discrepancies. GoalInfo sheets do not provide an exhaustive player-appearance roster, PIM or all missing goal events. A season-scoring total is reconciled only if source sheets are complete and aggregate totals agree."}
 return index,out
def main():
 p=ArgumentParser()
 for key in ("source","league","roster","out-dir"):p.add_argument("--"+key,required=True)
 a=p.parse_args()
 try:
  read=lambda x:json.loads(Path(x).read_text(encoding="utf8"))
  index,years=components(read(a.source),read(a.league),read(a.roster))
  dest=Path(a.out_dir);dest.mkdir(parents=True,exist_ok=True)
  for y in years:
   path=dest/("svhl-player-game-"+str(y["leagueId"])+".json")
   path.write_text(json.dumps(y,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf8")
  p=dest/"svhl-player-game-index.json"
  p.write_text(json.dumps(index,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf8")
  print(json.dumps({"state":"SPLIT_OFFICIAL_GAME_SCORING_SOURCE_PASS",
    "seasons":len(years),"sourceGames":sum(len(y["games"]) for y in years),
    "currentPlayers":len(index["currentPlayers"]),
    "files":[(f.name,f.stat().st_size) for f in sorted(dest.glob("svhl-player-game-*.json"))]}))
  return 0
 except (SplitHold,OSError,TypeError,ValueError,KeyError) as e:
  print(json.dumps({"state":"HOLD","reason":str(e)[:1000]}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
