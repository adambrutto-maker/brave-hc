"""Release a privacy-minimal, source-qualified League Intelligence JSON.

Input: privately staged verified SVHL division/team/game ledger and the
already-admitted Brave H.C. Master+HTO opponent aggregates.
Only team/season-level facts are published: no player IDs or full workbooks.
"""
from argparse import ArgumentParser
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
import json,os,sys
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
class Hold(ValueError):pass
def need(ok,why):
 if not ok:raise Hold(why)
def read(path):return json.loads(Path(path).read_text(encoding="utf-8-sig"))
def public(old,opponent,source):
 need(old.get("schema")=="brave-hc-svhl-league-intelligence/private-v1" and
      old.get("state")=="PRIVATE_SOURCE_VERIFIED_REVIEW" and
      old.get("zeroZeroNotTreatedAsCompleted") is True and
      old.get("originalMasterWorkbookWritten") is False,"SVHL_PRIVATE_SOURCE_NOT_QUALIFIED")
 current=old.get("current",{});previous=old.get("previous",{})
 need(current.get("leagueId")==570 and previous.get("leagueId")==547 and
      current.get("allTeamCardsMatchStandings") is True and
      20<=current.get("totalTeams",0)<=45 and
      25<=previous.get("totalTeams",0)<=55 and
      current.get("completedReciprocalFixtures",0)>=40,
      "SVHL_MULTIDIVISION_OR_RECIPROCAL_SOURCE_INCOMPLETE")
 need(source.get("schema")=="brave-hc-online-opponent-ledger/private-v1" and
      source.get("status")=="PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY" and
      source.get("sourceMasterSHA256")==MASTER_SHA and
      source.get("workbookWritten") is False and
      source.get("sourceCounts",{}).get("masterGames")==358 and
      source.get("sourceCounts",{}).get("currentOfficialHTOGames",0)>=5 and
      source.get("sourceCounts",{}).get("totalGames")==
        358+source.get("sourceCounts",{}).get("currentOfficialHTOGames",0) and
      source.get("sourceCounts",{}).get("currentOfficialHTOGames")==
        opponent.get("coverage",{}).get("currentSeasonGames"),
      "PRIVATE_BRAVES_SOURCE_HISTORY_UNQUALIFIED")
 need(opponent.get("schema")=="brave-hc-opponent-intelligence/v1" and
      opponent.get("status")=="PUBLIC_VERIFIED_SOURCE_IDENTITY" and
      opponent.get("sourceTeamCanonical")=="Brave H.C." and
      opponent.get("sourceLeagueTeamAlias")=="Braves HC",
      "ACCEPTED_CANONICAL_TEAM_NAMES_UNAVAILABLE")
 teams=current["performance"]
 byname={x["opponentExact"]:x for x in source["profiles"]}
 approved={x["name"]:x for x in opponent["teams"]}
 need(len(approved)==len(opponent["teams"]),"QUALIFIED_OPPONENT_SOURCE_NAME_DUPLICATE")
 priorlinked=0
 cards=[]
 for raw in teams:
  name=raw["name"]
  canon=approved.get(name)
  if name=="Braves HC":
   canonical="Brave H.C."
   history={"state":"SELF_TEAM_NOT_APPLICABLE"}
  elif canon is not None and canon.get("verification") in ("VERIFIED_EXACT_NAME",
            "VERIFIED_HISTORICAL_NAME_VARIANT","VERIFIED_CURRENT_NAME_ALIAS_ONLY"):
   canonical=canon.get("canonicalName") or name
   need(canon.get("allTime") and canon["allTime"]["gp"]>=1,
        "APPROVED_SOURCE_H2H_RECORD_NOT_NUMERIC_"+name)
   history={"state":"SOURCE_VERIFIED_H2H","sourceScope":canon["identityScope"],
            "bravesAllTime":canon["allTime"],"bravesRegularSeason":canon["regularSeason"],
            "bravesPlayoffs":canon["playoffs"],"originalLeagueName":name}
  elif name in byname:
   canonical=name
   prof=byname[name]
   need(prof.get("identityScope")=="EXACT_MATCH_ONLY" and
        prof["allTime"]["gp"]>0,"UNADMITTED_BRAVES_EXACT_NAME_SOURCE_"+name)
   history={"state":"SOURCE_VERIFIED_H2H","sourceScope":"EXACT_MATCH_ONLY_NO_UNREVIEWED_ALIASES",
            "bravesAllTime":prof["allTime"],"bravesRegularSeason":prof["regularSeason"],
            "bravesPlayoffs":prof["playoffs"],"originalLeagueName":name}
  else:
   canonical=name
   history={"state":"NO_VERIFIED_BRAVES_MATCH_HISTORY"}
  previousRef=raw.get("priorSeasonReference")
  if previousRef:
   need(previousRef.get("status")=="ROSTER_ID_CONTINUITY_CONFIRMED" and
        previousRef.get("sharedOfficialPlayerIDs",0)>=3 and
        previousRef.get("continuityRatioOfSmallerRoster",0)>=0.25,
        "UNVERIFIED_CROSS_SEASON_FRANCHISE_IDENTITY_"+name)
   priorlinked+=1
   prev=previousRef["previousSeason"]
   previousClean={"division":prev["divisionNow"],
                  "record":{key:prev[key] for key in ("gp","w","l","t","pts","gf","ga")},
                  "winPct":prev["winPct"],
                  "goalsDiffPerGame":prev["goalsDiffPerGame"],
                  "verifiedGameDetails":prev["verifiedReciprocalGames"],
                  "completeGameDetails":prev["resultsAgreementWithCurrentStandings"],
                  "officialRosterSharedIDs":previousRef["sharedOfficialPlayerIDs"],
                  "rosterContinuityShare":previousRef["continuityRatioOfSmallerRoster"],
                  "association":"ROSTER_ID_CONTINUITY_CONFIRMED",
                  "originalPriorLeagueTeamId":previousRef["priorLeagueTeamId"],
                  "sourceUrl":f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=547&teamid={previousRef['priorLeagueTeamId']}&page_type=Adult"}
  else:previousClean=None
  results=raw["gameResults"]
  need(raw["resultsAgreementWithCurrentStandings"] is True and
       len(results)==raw["gp"] and
       raw["gp"]==raw["w"]+raw["l"]+raw["t"],
       "CURRENT_SVHL_PUBLISHED_WLT_AND_GAME_SOURCE_DISAGREE_"+name)
  games=[{k:x[k] for k in ("date","opponent","opponentCurrentDivision","gf","ga","result")}
         for x in results]
  gamesOutside=sum(x["opponentCurrentDivision"]!=raw["divisionNow"] for x in games)
  opponentsByDivision=dict(Counter(x["opponentCurrentDivision"] for x in games))
  cards.append({"leagueName":name,"displayName":canonical,
       "sourceTeamId":raw["teamId"],"divisionNow":raw["divisionNow"],
       "record":{k:raw[k] for k in ("gp","w","l","t","pts","gf","ga")},
       "winPct":raw["winPct"],
       "goalDiffPerGame":raw["goalsDiffPerGame"],
       "opponentCurrentWinPctAverage":raw["opponentCurrentWinPctAvg"],
       "source":f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid={raw['teamId']}&page_type=Adult",
       "gamesConfirmed":raw["verifiedReciprocalGames"],
       "gamesVsTeamsNowInOtherDivisions":gamesOutside,
       "opponentsByCurrentDivision":opponentsByDivision,
       "completedGames":games,
       "bravesMatchHistory":history,
       "previousWinter":previousClean})
 teamsByDivision={x["leagueName"]:x["divisionNow"] for x in cards}
 competitive=[d["name"] for d in current["divisions"] if d["competitive"]]
 divs=[{"name":d["name"],"competitive":d["competitive"],
        "teams":[t["name"] for t in d["teams"]],
        "teamCount":len(d["teams"])}
       for d in current["divisions"]]
 outputs={"schema":"brave-hc-league-intelligence/public-v1",
     "status":"OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED",
     "asOf":current["sourceRetrievedUTC"],
     "season":"Sunday Winter 2026/27","leagueId":570,
     "previousSeason":"Sunday Winter 2025/26","previousLeagueId":547,
     "source":current["source"],"sourceSHA256":current["sourceSHA256"],
     "currentDivisionCount":len(competitive),"allPublishedDivisions":len(divs),
     "currentLeagueTeamCount":len(cards),
     "verifiedReciprocalCompletedGames":current["completedReciprocalFixtures"],
     "currentSourceDataConcordant":True,
     "unverifiedZeroZeroScheduleSlots":current["gameSourceChecks"].get("UNVERIFIED_ZERO_ZERO",0),
     "priorSeasonRosterContinuityQualifiedCount":priorlinked,
     "previousSeasonGameDetailCoverage":{
       "teamsWithAllGameResultsReconciled":previous["standingTeamCardsMatching"],
       "totalTeams":previous["totalTeams"],
       "note":"The other previous-season game pages omit some draw/forfeit details. Published season standings remain authoritative."},
     "divisions":divs,
     "teams":cards,
     "interpretation":{
       "record":"Official league current GP/W/L/T/PTS/GF/GA by source team ID",
       "reciprocalGames":"Completed nonzero-score matches agreed by both teams' published TeamInfo pages",
       "zeroZero":"0-0 placeholder excluded; actual 0-0 ties require independent verification",
       "opponentDifficulty":"Mean CURRENT published opponent (wins + 0.5 ties)/GP, not a predictive rating",
       "previousWinter":"2025/26 season remains separate and linked only where official player-ID overlap substantiates team continuity",
       "historicHeadToHead":"Brave H.C. Master Workbook / HTO canonical matchup aggregates, never inferred from league rename",
       "crossDivision":"Opponent division labels are CURRENT as of source capture, not guaranteed division labels on the original game date",
       "smallSample":"2026/27 has only the currently published first few league games. Do not treat record ranks as predicted playoff strength."},
     "originalWorkbookWritten":False}
 # Do not leak official roster player IDs, names or private paths to public JSON.
 s=json.dumps(outputs,ensure_ascii=False)
 need("playerIDs" not in s and "D:\\\\" not in s and
      "261026_Master_Complete_Game_History" not in s,
      "PRIVATE_PLAYER_IDS_OR_SOURCE_PATH_IN_PUBLIC_LEAGUE_REPORT")
 need(len(cards)==current["totalTeams"] and
      sum(len(x["completedGames"]) for x in cards)==2*current["completedReciprocalFixtures"],
      "TEAM_PAIRED_SOURCE_GAME_COUNT_NOT_MATCHED")
 return outputs
def main():
 ap=ArgumentParser()
 for name in ("private","opponent-feed","opponent-ledger","out"):ap.add_argument("--"+name,required=True)
 a=ap.parse_args()
 try:
  result=public(read(a.private),read(a.opponent_feed),read(a.opponent_ledger))
  dest=Path(a.out);dest.parent.mkdir(parents=True,exist_ok=True)
  tmp=dest.with_suffix(dest.suffix+".tmp")
  tmp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  os.replace(tmp,dest)
  print(json.dumps({"status":result["status"],"teams":result["currentLeagueTeamCount"],
        "competitiveDivisions":result["currentDivisionCount"],
        "games":result["verifiedReciprocalCompletedGames"],
        "previousQualified":result["priorSeasonRosterContinuityQualifiedCount"],
        "out":str(dest),"originalWorkbookWritten":False}))
  return 0
 except (Hold,KeyError,TypeError,ValueError,OSError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e),"publicNotModified":True}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
