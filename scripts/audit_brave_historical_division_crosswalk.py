"""Private-only historical Brave H.C. Master ↔ SVHL season-name crosswalk.

Not a public source, not source-admitted same-franchise joins. Preserve original
Master Workbook SHA, never export workbook rows/player data or publish output.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime,timezone
from pathlib import Path
import json,sys
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
class CrosswalkHold(ValueError):pass
def need(ok,msg):
 if not ok:raise CrosswalkHold("BRAVE_HISTORY_HOLD:"+msg)
def totals(games):
 return {k:sum(x["result"]==k for x in games) for k in ("W","L","T")} | {
    "gp":len(games),"gf":sum(x["bravesGF"] for x in games),
    "ga":sum(x["bravesGA"] for x in games)}
def source_name(s):return str(s).strip().casefold()
def review(master,archive):
 need(master.get("schema")=="brave-hc-opponent-master-history-stage/v1" and
      master.get("status")=="PRIVATE_HISTORICAL_REVIEW_ONLY" and
      master.get("published") is False and
      master.get("originalWorkbookWritten") is False and
      master.get("source",{}).get("sha256")==MASTER_SHA and
      master.get("counts",{}).get("completedHistorical")==358,
      "MASTER_IMMUTABLE_SOURCE_NOT_ACCEPTED")
 need(archive.get("schema")=="brave-hc-svhl-historical-divisions/v1" and
      archive.get("status")=="OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED",
      "ARCHIVED_LEAGUES_NOT_SOURCE_QUALIFIED")
 games=master.get("games",[])
 need(len(games)==358 and len({g["workbookGame"] for g in games})==358,
      "MASTER_GAME_NUMBER_COVERAGE_INVALID")
 byseason=defaultdict(list)
 for game in games:
  need(game["result"] in ("W","L","T") and game["gameContested"] is True and
       game["type"] in ("Regular Season","Playoffs") and
       game["bravesGF"]>=0 and game["bravesGA"]>=0,
       "MASTER_GAME_RECORD_INVALID")
  byseason[game["season"]].append(game)
 archived={x["season"].replace("Sunday Winter ","W"):x for x in archive["seasons"]}
 candidates=[]
 for season,games_in_season in sorted(byseason.items()):
  prior=archived.get(season)
  if not prior:continue
  for division in prior["divisions"]:
   if division["category"]!="COMPETITIVE_SUNDAY_DIVISION":continue
   for official in division["teams"]:
    matched=[g for g in games_in_season
       if source_name(g["opponentExact"])==source_name(official["name"])]
    if not matched:continue
    candidates.append({
     "season":season,"officialLeagueId":prior["leagueId"],
     "officialLeagueSeasonTeamId":official["seasonTeamId"],
     "officialDivisionName":division["name"],
     "officialPublishedTeamName":official["name"],
     "source":prior["source"],
     "braveAgainstSamePublishedName":totals(matched),
     "officialTeamSeasonRecord":{k:official[k] for k in ("gp","w","l","t","gf","ga")},
     "sourceQualification":"SAME_SEASON_EXACT_NAME_ONLY",
     "admission":"PRIVATE_CANDIDATE_UNTIL_OFFICIAL_TEAM_GAME_DATE_SCORE_PARITY",
     "gameDates":[g["date"] for g in matched]})
 output={
   "schema":"brave-hc-historical-division-crosswalk/private-review-v1",
   "status":"PRIVATE_NOT_A_PUBLIC_FRANCHISE_OR_GAME_JOIN",
   "sourceMasterSHA256":MASTER_SHA,
   "capturedUTC":datetime.now(timezone.utc).isoformat(),
   "masterGames":len(games),
   "firstGameDate":min(g["date"] for g in games),
   "lastGameDate":max(g["date"] for g in games),
   "sourceSeasonsReviewed":len(byseason),
   "seasons":[{"season":s,"masterGames":len(rows),"BraveRecord":totals(rows),
               "scoreResultDisagreementRows":sum(x["scoreResultDisagreement"] for x in rows),
               "officialArchivedSeasonExists":s in archived}
              for s,rows in sorted(byseason.items())],
   "sameSeasonNameCandidates":candidates,
   "candidateCount":len(candidates),
   "privacyBoundary":"PRIVATE_ONLY_NO_PLAYER_IDS_NO_PUBLIC_GITHUB_WRITE",
   "workbookWritten":False,
   "sourceGamesWritten":False,
   "warning":"Same-season exact-name appearance is not proof that an individual Brave game appears on the official TeamInfo ledger. Require date, opponent, home/visitor and score parity before accepting game-level joins."
 }
 return output
def main():
 p=ArgumentParser()
 p.add_argument("--master",required=True)
 p.add_argument("--archive",required=True)
 p.add_argument("--out",required=True)
 a=p.parse_args()
 try:
  m=json.loads(Path(a.master).read_text(encoding="utf-8-sig"))
  archive=json.loads(Path(a.archive).read_text(encoding="utf-8-sig"))
  d=review(m,archive)
  target=Path(a.out);target.parent.mkdir(parents=True,exist_ok=True)
  temp=target.with_suffix(target.suffix+".tmp")
  temp.write_text(json.dumps(d,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  temp.replace(target)
  print(json.dumps({"status":d["status"],"masterGames":d["masterGames"],
     "seasons":d["sourceSeasonsReviewed"],"sameSeasonNameCandidates":d["candidateCount"],
     "yearRange":[d["firstGameDate"],d["lastGameDate"]],"publicDataWritten":False}))
  return 0
 except (CrosswalkHold,OSError,KeyError,TypeError,ValueError) as err:
  print(json.dumps({"status":"HOLD","reason":str(err),"publicDataWritten":False}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
