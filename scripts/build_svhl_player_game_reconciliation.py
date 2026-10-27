"""Build public source-scoped player game reconciliation from PRIVATE GameInfo audits.

No inferred GP, assists by ambiguous names, unplayed games or correction of
official published season totals. Raw source evidence is preserved separately.
"""
from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
from collections import defaultdict,Counter
from urllib.parse import urlparse,parse_qs
from datetime import datetime,timezone
import json,re,sys,hashlib
SCHEMA="brave-hc-svhl-individual-game-reconciliation/v1"
AUDIT="brave-hc-svhl-game-events/private-source-audit-v1"
class ReconciliationHold(ValueError):pass
def need(ok,why):
 if not ok:raise ReconciliationHold("PLAYER_GAME_PUBLIC_HOLD:"+why)
def pub_url(lid,gid):
 return f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={lid}&gameid={gid}&page_type=Adult"
def score_key(day,a,b,gf,ga):
 lo,hi=sorted((a,b));scores=(gf,ga) if a==lo else (ga,gf)
 return day+"|"+str(lo)+"|"+str(hi)+"|"+str(scores[0])+"-"+str(scores[1])
def current_keys(league):
 teams={t["leagueName"]:t for t in league["teams"]}
 seen=set()
 for t in league["teams"]:
  for g in t["completedGames"]:
   o=teams.get(g["opponent"])
   if o is None:continue
   seen.add(score_key(g["date"],t["sourceTeamId"],o["sourceTeamId"],g["gf"],g["ga"]))
 return seen
def aggregate(league,roster,audits):
 need(league.get("schema")=="brave-hc-league-intelligence/public-v1" and
      league.get("currentSourceDataConcordant") is True and
      roster.get("schema")=="brave-hc-public-svhl-roster-seasons/v1" and
      roster.get("currentTeams")==22 and
      roster.get("historicalRosterManifest") and
      all(x.get("schema")==AUDIT and x.get("individualGameProofOnly") is True and
       x.get("workbookWritten") is False for x in audits),"SOURCE_CHAIN_INVALID")
 acceptedSourceGames=current_keys(league)
 years={};sourceGames=[];yearSummaries=[];heldGames=[]
 now=datetime.now(timezone.utc).isoformat()
 for audit in audits:
  for y in audit["years"]:
   lid=y["leagueId"]
   need(lid not in years and lid in (570,547,531,512,494,476,420,375) and
        y["teams"]>=12 and y["sourceFixtureGameIds"]>=y["reciprocalCompletedGames"]>=0,
        "DUPLICATE_OR_TOO_SMALL_LEAGUE_YEAR")
   years[lid]=y
 for lid,y in sorted(years.items(),reverse=True):
  pages={t["teamId"]:t for t in y["sourceTeamRosters"]}
  need(len(pages)==y["teams"] and
   all(len(t["players"])==t["rosterCount"] and
      re.fullmatch(r"[0-9a-f]{64}",t["pageSHA256"]) is not None
      for t in pages.values()),"TEAM_ROSTER_PROOF_INCOMPLETE")
  completed=0;full=0;unresolved=0;events=0;sourceSnapshotMatched=0
  for game in y["games"]:
   g=game["gameId"];need(g>0 and game["leagueId"]==lid and
        game["homeId"] in pages and game["awayId"] in pages and
        re.fullmatch(r"[0-9a-f]{64}",game["pageSHA256"]) is not None and
        game["source"]==pub_url(lid,g),"GAMEINFO_PROVENANCE_INVALID")
   completed+=1
   gamekey=score_key(game["date"],game["homeId"],game["awayId"],
       game["homeGoals"],game["awayGoals"])
   if lid==570 and gamekey in acceptedSourceGames:sourceSnapshotMatched+=1
   status=game["status"]
   need(status in ("FULL_GAME_GOAL_EVENTS_SCORE_PARITY",
     "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"),"INVALID_GAME_AUDIT_STATE")
   accepted=status=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"
   if accepted:full+=1
   unresolved+=game["unresolvedAssistCount"]
   events+=len(game["events"])
   goals=[]
   if accepted:
    for ev in game["events"]:
     tid=ev["sourceTeamId"];pid=ev["sourcePlayerId"]
     need(tid in (game["homeId"],game["awayId"]) and
       type(pid) is int and pid>0 and 1<=ev["period"]<=4 and
       ev["assistResolution"] in ("EXACT_UNIQUE_OFFICIAL_TEAM_ROSTER_NAME","AMBIGUOUS_NAME_HOLD"),
       "GAME_SCORER_OR_ASSIST_SOURCE_INVALID")
     teamplayer={p["playerId"] for p in pages[tid]["players"]}
     need(pid in teamplayer and all(a in teamplayer for a in ev["admittedAssistPlayerIds"]),
       "GOAL_OR_ASSIST_PLAYER_NOT_IN_SEASON_TEAM")
     goals.append({"period":ev["period"],"ordinal":ev["ordinal"],
       "time":ev["time"],"teamId":tid,"scorerId":pid,
       "scorerName":ev["scorerName"],"assistPlayerIds":ev["admittedAssistPlayerIds"],
       "assistNames":ev["assistNames"],"unresolvedAssistNames":ev["unresolvedAssistNames"],
       "assistProof":ev["assistResolution"]})
   sourceGames.append({"leagueId":lid,"gameId":g,"date":game["date"],
     "source":game["source"],"sourcePageSHA256":game["pageSHA256"],
     "homeTeamId":game["homeId"],"awayTeamId":game["awayId"],
     "homeGoals":game["homeGoals"],"awayGoals":game["awayGoals"],
     "status":status,"sourceCurrentLeagueSnapshotAgreement":
       "MATCHED_ACCEPTED_CURRENT_RESULTS" if lid==570 and gamekey in acceptedSourceGames else
       "NOT_IN_ACCEPTED_CURRENT_SNAPSHOT" if lid==570 else
       "HISTORICAL_SEASON_SEPARATE",
     "resolvedGoals":goals if accepted else [],
     "partialSheetGoalCount":len(game["events"]) if not accepted else 0,
     "unresolvedAssists":game["unresolvedAssistCount"] if accepted else None})
   if not accepted:heldGames.append({"leagueId":lid,"gameId":g,
     "reason":"GAME_GOAL_EVENTS_DO_NOT_FULLY_RECONCILE_FINAL_SCORE",
     "observedEventCount":len(game["events"]),
     "expectedScore":[game["homeGoals"],game["awayGoals"]]})
  for x in y["gamePageHolds"]:heldGames.append({"leagueId":lid,"gameId":x["gameId"],"reason":x["reason"]})
  yearSummaries.append({"leagueId":lid,"sourceTeams":len(pages),
   "sourceScheduleIDs":y["sourceFixtureGameIds"],
   "completedReciprocalGameSheets":completed,"fullGoalSheetGames":full,
   "partialGoalSheetGames":completed-full,"unresolvedAssistNamesInAllSheets":unresolved,
   "eligibleAcceptedSourceGamesMatched":sourceSnapshotMatched if lid==570 else None,
   "publishedCurrentSourceGameCount":len(acceptedSourceGames) if lid==570 else None,
   "gamePageSourceHolds":len(y["gamePageHolds"]),
   "unpairedOrZeroZeroScheduleHolds":len(y["scheduleHeldGames"]),
   "eventRowsRead":events,"completenessNotice":
    "Game-info goal sheets validated against final score; incomplete sheets excluded from admitted G/A event totals. Games played and PIM cannot be recovered reliably from goal events alone."})
 # Calculate source-scoped, per-player G and A across FULL game sheets only.
 perTeam=defaultdict(lambda:{"G":Counter(),"A":Counter(),"games":set(),"assistHeld":set()})
 perPlayerEvent=defaultdict(list)
 for g in sourceGames:
  if g["status"]!="FULL_GAME_GOAL_EVENTS_SCORE_PARITY":continue
  lid=g["leagueId"]
  for tid in (g["homeTeamId"],g["awayTeamId"]):perTeam[(lid,tid)]["games"].add(g["gameId"])
  for ev in g["resolvedGoals"]:
   tid=ev["teamId"];pid=ev["scorerId"]
   perTeam[(lid,tid)]["G"][pid]+=1
   perPlayerEvent[(lid,tid,pid)].append({"gameId":g["gameId"],"date":g["date"],
      "period":ev["period"],"time":ev["time"],"credited":"GOAL",
      "gameSource":g["source"],"gamePageSHA256":g["sourcePageSHA256"]})
   for aid in ev["assistPlayerIds"]:
    perTeam[(lid,tid)]["A"][aid]+=1
    perPlayerEvent[(lid,tid,aid)].append({"gameId":g["gameId"],"date":g["date"],
     "period":ev["period"],"time":ev["time"],"credited":"ASSIST_EXACT_UNIQUE_NAME",
     "gameSource":g["source"],"gamePageSHA256":g["sourcePageSHA256"]})
   if ev["unresolvedAssistNames"]:perTeam[(lid,tid)]["assistHeld"].add(g["gameId"])
 # Source-team score coverage: season record could include unpaired games
 teams=[];counts=Counter()
 for lid,y in sorted(years.items(),reverse=True):
  games=[g for g in sourceGames if g["leagueId"]==lid]
  for sheet in y["sourceTeamRosters"]:
   tid=sheet["teamId"]
   linked=[g for g in games if tid in (g["homeTeamId"],g["awayTeamId"])]
   full=[g for g in linked if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"]
   incomplete=len(linked)-len(full)
   outScope=sum(x["reason"]=="ONE_OR_MORE_TEAMS_OUTSIDE_SELECTED_SCOPE"
    for x in y["scheduleHeldGames"])
   teamRecord=perTeam[(lid,tid)]
   scored=[]
   for p in sheet["players"]:
    pid=p["playerId"];goal=teamRecord["G"][pid];assist=teamRecord["A"][pid]
    exact=(goal==p["g"] and assist==p["a"])
    fullCoverage=(incomplete==0 and
      not teamRecord["assistHeld"] and
      outScope==0 and not y["gamePageHolds"])
    sourceArithmetic=(p["statStatus"]=="PUBLISHED_ARITHMETICALLY_CONSISTENT" and
      p["pts"]==p["g"]+p["a"])
    state=("SOURCE_PUBLISHED_STATS_CONFLICT_HOLD" if not sourceArithmetic else
      "RECONCILED_GOALS_ASSISTS_ON_SOURCE_COMPLETE_EVENTS" if fullCoverage and exact else
      "OBSERVED_EVENTS_MATCH_PUBLISHED_TOTALS_COVERAGE_PARTIAL" if exact else
      "OBSERVED_GOAL_ASSIST_DIFFERENCE_OR_INCOMPLETE_COVERAGE")
    counts[state]+=1
    scored.append({"playerId":pid,"name":p["name"],
     "registeredSeasonGP":p["gp"],"published":{k:p[k] for k in ("g","a","pts","pim")},
     "observedFullGameEvents":{"g":goal,"a":assist,"pts":goal+assist},
     "deltaPublishedMinusObserved":{"g":p["g"]-goal,"a":p["a"]-assist},
     "status":state,"gpStatus":"CANNOT_VERIFY_GAME_APPEARANCE_FROM_GOAL_EVENT_SHEET",
     "events":perPlayerEvent[(lid,tid,pid)]})
   teams.append({"leagueId":lid,"sourceTeamId":tid,"name":sheet["name"],
     "sourceTeamPageSHA256":sheet["pageSHA256"],"rosterCount":len(scored),
     "reciprocalSourceGames":len(linked),"fullyScoredGameSheets":len(full),
     "partiallyScoredGameSheets":incomplete,
     "outOfScopeScheduleIDsInSeason":outScope,
     "unresolvedAssistGames":len(teamRecord["assistHeld"]),
     "playerSeasonSummaries":scored,
     "completeness":("FULL_SOURCE_SCOPED_GAME_EVENTS" if incomplete==0 else
       "PARTIAL_GAME_SHEETS_SEASON_RECONCILIATION_HELD")})
 public={"schema":SCHEMA,"status":"OFFICIAL_GAMEINFO_PLAYER_EVENT_SOURCE_RESEARCH",
  "createdUTC":now,"leagueAsOf":league["asOf"],
  "rosterAsOf":roster["asOf"],"sourceLeagueIds":sorted(years.keys(),reverse=True),
  "sourceCurrentLeagueSnapshotGameKeys":len(acceptedSourceGames),
  "seasons":yearSummaries,"teamSeasons":teams,"games":sourceGames,
  "heldGameEvidence":heldGames,"gameSourceScope":"OFFICIAL_GAMEINFO_SOURCE_GOALS_BY_PLAYERID_ASSISTS_ONLY_EXACT_UNIQUE_TEAM_NAME",
  "registeredGameAppearancesNotVerifiable":True,
  "registeredPenaltiesInMinutesNotReconciled":True,
  "currentSnapshotSourceCanLagGameInfo":True,
  "noMasterWorkbookModification":True,
  "officialSourceWrites":False,"automatedPlayerStatsOverride":False,
  "seasonComparisonStatuses":dict(counts),
  "limitation":"Goal scorer ID is official source link; assister text is matched only to an exact unique source team player name. Per-game score parity is necessary but not proof all assists were registered. Unlinked goal scorers, ambiguous assists, missing game sheets and source timing differences are held. GP and PIM are not game-level reconciled."}
 need(all(t["leagueId"] in public["sourceLeagueIds"] for t in teams) and
      len({(g["leagueId"],g["gameId"]) for g in sourceGames})==len(sourceGames),
      "SHEET_ID_NOT_UNIQUE")
 return public
def main():
 p=ArgumentParser()
 p.add_argument("--league",required=True);p.add_argument("--roster",required=True)
 p.add_argument("--audits",required=True,nargs="+")
 p.add_argument("--out",required=True)
 a=p.parse_args()
 try:
  read=lambda x:json.loads(Path(x).read_text(encoding="utf8"))
  doc=aggregate(read(a.league),read(a.roster),[read(v) for v in a.audits])
  target=Path(a.out);target.parent.mkdir(parents=True,exist_ok=True)
  temp=target.with_suffix(".tmp")
  temp.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
  temp.replace(target)
  print(json.dumps({"state":"GAMEINFO_RECONCILIATION_DERIVED_RESEARCH",
    "years":len(doc["sourceLeagueIds"]),"games":len(doc["games"]),
    "full":sum(s["fullGoalSheetGames"] for s in doc["seasons"]),
    "partial":sum(s["partialGoalSheetGames"] for s in doc["seasons"]),
    "playerSeasons":sum(len(t["playerSeasonSummaries"]) for t in doc["teamSeasons"]),
    "gameLevelGoalAssists":sum(len(p["events"]) for t in doc["teamSeasons"] for p in t["playerSeasonSummaries"]),
    "seasonStatuses":doc["seasonComparisonStatuses"],
    "noSourceWrites":True}))
  return 0
 except (ReconciliationHold,ValueError,TypeError,KeyError,OSError) as e:
  print(json.dumps({"state":"HOLD","reason":str(e)[:900],"publicNotModified":True}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
