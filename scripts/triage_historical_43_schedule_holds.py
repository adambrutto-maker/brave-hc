#!/usr/bin/env python3
"""HIS-06: strictly read-only source-day audit of historical 43 H2H holds.

Input: private 2026-10-26 dual-source parity review; published official SVHL
GameInfo season snapshots. Never changes existing H2H admissions/score/source.
Outputs PRIVATE source-owner handoff outside repo widgets.
"""
from __future__ import annotations
import argparse,csv,json,re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse,parse_qs

class Hold(ValueError): pass
def require(ok,reason):
 if not ok:raise Hold("HIST43_SOURCE_DAY_HOLD:"+reason)

NAMES={"Braves H.C.","Brave H.C.","Braves H/C","Braves HC"}
STATUS="PRIVATE_SOURCE_CHECKED_GAME_JOINS_NOT_FRANCHISE_CONTINUITY"
SCHEMA="brave-hc-archived-official-games/private-parity-v1"

def triage(private,seasons,expected_total=None):
 require(private.get("schema")==SCHEMA and private.get("status")==STATUS
   and private.get("pagesHeld")==0
   and private.get("publicWritten") is False
   and private.get("originalWorkbookWritten") is False
   and private.get("candidatesReviewed")==len(private.get("reviewedSameSeasonTeams",[]))
   and isinstance(private.get("heldGameComparisons"),int),
   "PRIVATE_PARITY_AUTHORITY_OR_SOURCE_MISSING")
 gameCount=private["heldGameComparisons"]
 if expected_total is not None:
  require(gameCount==expected_total,"HISTORICAL_PRIVATE_HOLD_COUNT_CHANGED")
 rows=[];seen=set()
 for group in private["reviewedSameSeasonTeams"]:
  held=group.get("heldGameDates",[])
  if not held:continue
  lid,tid=group["officialLeagueId"],group["officialLeagueSeasonTeamId"]
  season=seasons.get(lid)
  require(season and season.get("schema")=="brave-hc-svhl-season-individual-game-evidence/v1"
    and season.get("leagueId")==lid
    and season.get("status")=="SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS"
    and season.get("leagueAssignmentsOrPlayerTotalsWritten") is False,
    "MISSING_QUALIFIED_OFFICIAL_SEASON")
  teamMap={t["sourceTeamId"]:t for t in season["teams"]}
  require(len(teamMap)==len(season["teams"]) and
   teamMap.get(tid,{}).get("name")==group["officialTeamName"]
   and teamMap[tid].get("sourceTeamPageSHA256")==group["officialPageSHA256"]
   and group.get("heldCount")==len(held)
   and group["admittedCount"]+group["heldCount"]==group["masterSameSeasonGameCount"],
   "OFFICIAL_TEAM_ROSTER_PAGE_OR_HOLD_COUNT_CONFLICT")
  u=urlparse(group["officialSource"]);q=parse_qs(u.query)
  require(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca"
    and u.path.lower()=="/teaminfo.aspx"
    and q.get("leagueid")==[str(lid)]
    and q.get("teamid")==[str(tid)]
    and q.get("page_type")==["Adult"],
    "OFFICIAL_TEAM_SOURCE_LINK_NOT_QUALIFIED")
  dated=Counter(item["date"] for item in held)
  occurrences=Counter()
  for entry in held:
   date=entry["date"];occurrences[date]+=1
   ordinal=occurrences[date]
   key=(lid,tid,date,ordinal)
   require(key not in seen and re.fullmatch(r"20\d\d-\d\d-\d\d",date)
     and entry["reason"]=="OFFICIAL_SCHEDULE_SCORE_OR_DATE_NOT_RECIPROCAL",
     "DUPLICATED_OR_RECLASSIFIED_MASTER_HOLD")
   seen.add(key)
   oppOnDate=[g for g in season["games"] if g["date"]==date and
     tid in (g["homeTeamId"],g["awayTeamId"])]
   braveIds={t["sourceTeamId"] for t in season["teams"] if t["name"] in NAMES}
   braveOnDate=[g for g in season["games"] if
     g["date"]==date and
     (g["homeTeamId"] in braveIds or g["awayTeamId"] in braveIds)]
   def packet(g):
    require(g["source"]==
      f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={lid}&gameid={g['gameId']}&page_type=Adult"
      and re.fullmatch("[0-9a-f]{64}",g["sourcePageSHA256"])
      and type(g["homeGoals"]) is int and type(g["awayGoals"]) is int
      and g["homeGoals"]>=0 and g["awayGoals"]>=0,
      "CAPTURED_OFFICIAL_GAMEINFO_PAGE_UNQUALIFIED")
    return {"officialGameId":g["gameId"],"gameURL":g["source"],
     "pageSHA256":g["sourcePageSHA256"],
     "homeTeamId":g["homeTeamId"],"awayTeamId":g["awayTeamId"],
     "homeTeam":teamMap[g["homeTeamId"]]["name"],
     "awayTeam":teamMap[g["awayTeamId"]]["name"],
     "homeGoals":g["homeGoals"],"awayGoals":g["awayGoals"]}
   officialMatches=[packet(g) for g in oppOnDate]
   braveMatches=[packet(g) for g in braveOnDate]
   vsBraves=any(
     (g["homeTeamId"]==tid and g["awayTeamId"] in braveIds) or
     (g["awayTeamId"]==tid and g["homeTeamId"] in braveIds)
     for g in oppOnDate)
   category=("DUPLICATED_MASTER_DATE_GAME_IDENTITY_REVIEW_REQUIRED" if dated[date]>1
    else "SAME_DAY_OPPONENT_AND_BRAVES_GAME_REQUIRES_SCORE_SOURCE_REVIEW" if vsBraves
    else "OFFICIAL_OPPONENT_GAME_AGAINST_DIFFERENT_TEAM_ON_DATE" if oppOnDate
    else "NO_OFFICIAL_OPPONENT_GAMEINFO_ON_MASTER_DATE")
   rows.append({"season":group["season"],"leagueId":lid,"opponentTeamId":tid,
      "opponentName":group["officialTeamName"],"historicalDivision":group["officialDivision"],
      "masterRecordedDate":date,"masterDateOccurrences":dated[date],
      "masterDateOccurrence":ordinal,"originalHoldReason":entry["reason"],
      "officialTeamPageSHA256":group["officialPageSHA256"],
      "officialTeamInfoURL":group["officialSource"],
      "daySourceCategory":category,
      "officialOpponentGamesOnDate":officialMatches,
      "officialBravesGamesOnDate":braveMatches,
      "officialBravesOnDateCount":len(braveOnDate),
      "sourceOwnerQuestion":"Check dated master HTO record against original official season-team schedule, GameInfo source and possible date/identity/forfeit discrepancies.",
      "independentDecision":"UNREVIEWED","scoreCorrectionAuthorized":False,
      "historicalH2HAdmitted":False,"currentFranchiseContinuityVerified":False})
 require(len(rows)==gameCount,"NOT_ALL_HISTORICAL_SOURCE_HOLDS_ACCOUNTED")
 bundles={}
 for row in rows:
  k=(row["leagueId"],row["opponentTeamId"])
  b=bundles.setdefault(k,{
   "reviewBundleKey":str(k[0])+"|"+str(k[1]),"leagueId":k[0],
   "historicalSeason":row["season"],"opponentTeamId":k[1],
   "opponentName":row["opponentName"],"officialTeamInfoURL":row["officialTeamInfoURL"],
   "sourceTeamPageSHA256":row["officialTeamPageSHA256"],
   "heldEntries":0,"masterDateReferences":[],
   "sourceOwnerDocumentaryEvidence":None,"independentReviewer":None,
   "finalSourceOwnerDisposition":"UNREVIEWED",
   "admittedHistoricalH2H":False})
  b["heldEntries"]+=1
  b["masterDateReferences"].append(str(row["masterRecordedDate"])+"#"+str(row["masterDateOccurrence"]))
 orderedBundles=sorted(bundles.values(),key=lambda b:(-b["heldEntries"],-b["leagueId"],b["opponentTeamId"]))
 summary=dict(sorted(Counter(row["daySourceCategory"] for row in rows).items()))
 seasonsSummary=dict(sorted(Counter(row["season"] for row in rows).items()))
 return {"schema":"HOSIP03_43_HISTORICAL_DATE_SOURCE_OWNER_TRIAGE_V1",
  "status":"READ_ONLY_HISTORICAL_SCHEDULE_DISCREPANCY_REVIEW_NOT_ADMISSION",
  "officialCompetition":"SVHL","vaHLIncluded":False,
  "privateSourceCapturedUTC":private.get("capturedUTC"),
  "heldGamesReviewed":gameCount,"sourceDayCategories":summary,
  "heldSeasonCounts":seasonsSummary,
  "sourceOwnerBundleCount":len(orderedBundles),"sourceOwnerBundles":orderedBundles,
  "sourceOwnerDecisionsAccepted":0,"officialStatisticsChanged":False,
  "historicalH2HAccepted":False,"reviewCases":rows,
  "potentialRepeatedMasterDateEntries":sum(row["masterDateOccurrences"]>1 for row in rows),
  "limitations":[
   "Historical master scores not represented in the private held-date packet; exact score parity for held games cannot be asserted.",
   "Presence of a same-day official GameInfo game is not sufficient to promote historical H2H.",
   "Absence of a game from this collected source is not proof that no game took place.",
   "This only groups dated source conflicts and does not modify private HTO, historical master or player records."
  ]}

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--private",required=True,type=Path)
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--json-out",required=True,type=Path)
 p.add_argument("--csv-out",required=True,type=Path)
 p.add_argument("--bundle-csv-out",type=Path)
 a=p.parse_args()
 widgets=(a.repo/"widgets").resolve()
 for dest in (a.json_out,a.csv_out,a.bundle_csv_out):
  if dest is None:continue
  require(not dest.resolve().is_relative_to(widgets),"PRIVATE_REVIEW_OUTSIDE_PUBLIC_WIDGETS")
 src=json.loads(a.private.read_text(encoding="utf-8-sig"))
 ids={g["officialLeagueId"] for g in src["reviewedSameSeasonTeams"] if g.get("heldGameDates")}
 seasons={lid:json.loads((widgets/f"svhl-player-game-{lid}.json").read_text(encoding="utf-8"))
           for lid in ids}
 result=triage(src,seasons,expected_total=43)
 a.json_out.parent.mkdir(parents=True,exist_ok=True)
 a.json_out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 keys=["season","leagueId","opponentTeamId","opponentName","historicalDivision",
       "masterRecordedDate","originalHoldReason","daySourceCategory",
       "officialBravesOnDateCount","officialTeamInfoURL",
       "officialTeamPageSHA256","independentDecision"]
 with a.csv_out.open("w",encoding="utf-8-sig",newline="") as f:
  w=csv.DictWriter(f,fieldnames=keys)
  w.writeheader()
  for row in result["reviewCases"]:w.writerow({k:row[k] for k in keys})
 if a.bundle_csv_out is not None:
  fields=["reviewBundleKey","leagueId","historicalSeason","opponentTeamId",
   "opponentName","heldEntries","masterDateReferences","officialTeamInfoURL",
   "sourceTeamPageSHA256","sourceOwnerDocumentaryEvidence",
   "independentReviewer","finalSourceOwnerDisposition"]
  with a.bundle_csv_out.open("w",encoding="utf-8-sig",newline="") as f:
   w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
   for b in result["sourceOwnerBundles"]:
    item={k:b.get(k) for k in fields}
    item["masterDateReferences"]=";".join(b["masterDateReferences"])
    w.writerow(item)
 print(json.dumps({"status":result["status"],"reviewed":result["heldGamesReviewed"],
    "counts":result["sourceDayCategories"],"seasons":result["heldSeasonCounts"],
    "bundles":result["sourceOwnerBundleCount"],
    "officialStatsChanged":result["officialStatisticsChanged"]}))
if __name__=="__main__":main()
