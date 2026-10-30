#!/usr/bin/env python3
"""Private read-only near-date evidence leads for 43 held historical H2H claims.

Only source-verified official same-opponent vs Brave game IDs within an explicitly
bounded +/-14 day window. Absolutely no historical source/score/player admission.
Never reuse an existing admitted historical GameInfo ID as a 'new' match.
"""
import argparse,csv,json,re,hashlib
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse,parse_qs

class Hold(ValueError):pass
def need(v,why):
 if not v:raise Hold("HIST43_NEAR_DATE_HOLD:"+why)
BRAVES={"Braves H.C.","Brave H.C.","Braves H/C","Braves HC"}
SCHEMA="HOSIP03_43_HISTORICAL_DATE_SOURCE_OWNER_TRIAGE_V1"
ACCEPTED="brave-hc-historical-source-matched-gameinfo-ids/v1"
WINDOW=14
HEX=re.compile(r"^[0-9a-f]{64}$")

def record_identity(row,lid):
 u=urlparse(row["source"])
 q=parse_qs(u.query)
 need(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca"
   and u.path.lower()=="/gameinfo.aspx"
   and q.get("leagueid")==[str(lid)] and
   q.get("gameid")==[str(row["gameId"])] and
   q.get("page_type")==["Adult"] and
   bool(HEX.fullmatch(row.get("sourcePageSHA256",""))),
   "ORIGINAL_GAMEINFO_ID_OR_HASH_UNQUALIFIED")

def compare(source_day,seasons,accepted):
 need(source_day.get("schema")==SCHEMA and
  source_day.get("status")=="READ_ONLY_HISTORICAL_SCHEDULE_DISCREPANCY_REVIEW_NOT_ADMISSION" and
  source_day.get("officialCompetition")=="SVHL" and
  source_day.get("vaHLIncluded") is False and
  source_day.get("heldGamesReviewed")==43 and
  len(source_day.get("reviewCases",[]))==43 and
  source_day.get("sourceOwnerDecisionsAccepted")==0 and
  source_day.get("officialStatisticsChanged") is False and
  source_day.get("historicalH2HAccepted") is False,
  "ORIGINAL_43_DAY_REVIEW_NOT_QUALIFIED")
 need(accepted.get("schema")==ACCEPTED and
  accepted.get("status")==
    "HISTORICAL_EXACT_GAMEINFO_IDS_SOURCE_QUALIFIED_PLAYER_STATS_HELD_SEPARATELY"
  and accepted.get("sourceHashBytePolicy")=="UTF8_LF_GIT_BLOB"
  and accepted.get("matchedHistoricalGames")==79 and
  len(accepted.get("games",[]))==79 and
  accepted.get("historicalFranchiseContinuityInferred") is False and
  accepted.get("officialSourceOrPlayerDataWritten") is False and
  accepted.get("originalHistoricalH2HModified") is False,
  "ORIGINAL_79_ACCEPTED_SOURCE_IDS_UNVERIFIED")
 accepted_idx={}
 for game in accepted["games"]:
  key=(game["leagueId"],game["gameId"])
  need(key not in accepted_idx and
   bool(HEX.fullmatch(game.get("sourceGameInfoSHA256",""))),
   "DUPLICATED_OR_UNQUALIFIED_ACCEPTED_HISTORY_ID")
  accepted_idx[key]=game
 seen=set();rows=[];uniqueLeadGames={}
 for original in source_day["reviewCases"]:
  lid,opponent=original["leagueId"],original["opponentTeamId"]
  s=seasons.get(lid)
  need(s and s.get("schema")=="brave-hc-svhl-season-individual-game-evidence/v1" and
   s.get("status")=="SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS" and
   s.get("leagueId")==lid and
   s.get("leagueAssignmentsOrPlayerTotalsWritten") is False and
   isinstance(s.get("games"),list) and isinstance(s.get("teams"),list),
   "SOURCE_GAMEINFO_SEASON_MISSING")
  teams={t["sourceTeamId"]:t for t in s["teams"]}
  need(len(teams)==len(s["teams"]) and
   teams.get(opponent,{}).get("name")==original["opponentName"] and
   teams[opponent].get("sourceTeamPageSHA256")==original["officialTeamPageSHA256"] and
   original["independentDecision"]=="UNREVIEWED" and
   original["historicalH2HAdmitted"] is False and
   original["scoreCorrectionAuthorized"] is False,
   "HISTORICAL_OPPONENT_ID_OR_HOLD_CHANGED")
  casekey=(lid,opponent,original["masterRecordedDate"],
    original["masterDateOccurrence"])
  need(casekey not in seen and original["masterDateOccurrence"]>0,
   "DUPLICATED_MASTER_CASE_ORDINAL")
  seen.add(casekey)
  braveIDs={t["sourceTeamId"] for t in s["teams"] if t["name"] in BRAVES}
  day=date.fromisoformat(original["masterRecordedDate"])
  candidates=[]
  for game in s["games"]:
   if (game["homeTeamId"]!=opponent and game["awayTeamId"]!=opponent):continue
   brave=game["awayTeamId"] if game["homeTeamId"]==opponent else game["homeTeamId"]
   if brave not in braveIDs:continue
   delta=(date.fromisoformat(game["date"])-day).days
   if abs(delta)>WINDOW:continue
   record_identity(game,lid)
   approved=accepted_idx.get((lid,game["gameId"]))
   if approved:
    need(approved["date"]==game["date"] and
     approved["opponentTeamId"]==opponent and
     approved["sourceGameInfoSHA256"]==game["sourcePageSHA256"] and
     approved["sourceGameInfoURL"]==game["source"],
     "PREVIOUSLY_ADMITTED_GAMEINFO_PROOF_CONFLICT")
   key=(lid,game["gameId"])
   uniqueLeadGames[key]=game
   candidates.append({
     "officialLeagueId":lid,"officialGameId":game["gameId"],
     "officialSourceDate":game["date"],"dateOffsetDays":delta,
     "distanceDays":abs(delta),
     "homeSourceTeamId":game["homeTeamId"],"awaySourceTeamId":game["awayTeamId"],
     "officialFinalScoreHomeAway":[game["homeGoals"],game["awayGoals"]],
     "officialGameInfoURL":game["source"],
     "officialPageSHA256":game["sourcePageSHA256"],
     "alreadyIncludedIn79AcceptedHistoricalGames":bool(approved),
     "newHistoryAdmissionAuthorized":False,
     "historyReuseWouldDoubleCount":bool(approved),
     "masterScoreEquality":"NOT_CHECKED_MASTER_SCORE_NOT_IN_HELD_DATE_RECEIPT"
   })
  candidates.sort(key=lambda x:(x["distanceDays"],x["officialGameId"]))
  need(not any(x["dateOffsetDays"]==0 for x in candidates),
   "EXISTING_SOURCE_DAY_CLASSIFICATION_CONFLICT")
  state=("NO_OFFICIAL_MATCH_WITHIN_14_DAYS" if not candidates else
    "NEAR_DATE_LEAD_ALREADY_IN_79_ACCEPTED" if all(
     x["alreadyIncludedIn79AcceptedHistoricalGames"] for x in candidates) else
    "NEAR_DATE_UNADMITTED_OFFICIAL_GAME_REQUIRES_MASTER_SCORE_AND_SOURCE_OWNER_REVIEW")
  rows.append({
    "originalCaseKey":"|".join(map(str,casekey)),
    "season":original["season"],"officialLeagueId":lid,
    "opponentSourceTeamId":opponent,"opponentName":original["opponentName"],
    "masterDate":original["masterRecordedDate"],
    "masterDateOccurrence":original["masterDateOccurrence"],
    "sameDayEvidenceStatus":original["daySourceCategory"],
    "nearDateStatus":state,
    "candidateCount":len(candidates),
    "officialNearbyGames":candidates,
    "documentaryEvidenceRequired":"Original dated HTO/master score, signed game sheet and source-owner game-date or game-ID disposition.",
    "approvalStatus":"OPEN_NOT_CORRECTED",
    "sourceH2HAdded":False,"originalRecordChanged":False})
 need(len(rows)==43,"ORIGINAL_HELD_CASES_NOT_EXHAUSTIVELY_CONSIDERED")
 totalCandidates=sum(x["candidateCount"] for x in rows)
 uniqueIDs={(l,g) for l,g in uniqueLeadGames}
 newIDs=uniqueIDs-set(accepted_idx)
 reused=uniqueIDs.intersection(accepted_idx)
 leadByState=dict(Counter(x["nearDateStatus"] for x in rows))
 ownerBuckets={}
 for case in rows:
  key=(case["officialLeagueId"],case["opponentSourceTeamId"])
  b=ownerBuckets.setdefault(key,{
   "reviewBundleKey":"|".join(map(str,key)),
   "leagueId":key[0],"opponentSourceTeamId":key[1],
   "opponentName":case["opponentName"],"heldMasterCases":0,
   "sourceDayCaseIDs":[],"nearbyOfficialGameIDs":set(),
   "newUnadmittedOfficialGameIDs":set(),
   "alreadyAcceptedOfficialGameIDs":set(),
   "sourceOwnerRecordDisposition":"UNREVIEWED",
   "masterScoreOrGameDateCorrectionApproved":False})
  need(b["opponentName"]==case["opponentName"],"SOURCE_OWNER_BUNDLE_NAME_CHANGED")
  b["heldMasterCases"]+=1
  b["sourceDayCaseIDs"].append(case["originalCaseKey"])
  for candidate in case["officialNearbyGames"]:
   gid=candidate["officialGameId"]
   b["nearbyOfficialGameIDs"].add(gid)
   if candidate["alreadyIncludedIn79AcceptedHistoricalGames"]:
    b["alreadyAcceptedOfficialGameIDs"].add(gid)
   else:b["newUnadmittedOfficialGameIDs"].add(gid)
 bundles=[]
 for group in ownerBuckets.values():
  for key in ("nearbyOfficialGameIDs","newUnadmittedOfficialGameIDs","alreadyAcceptedOfficialGameIDs"):
   group[key]=sorted(group[key])
  group["priority"]=(
   "REVIEW_POTENTIAL_UNADMITTED_GAME_AND_MASTER_DATE_EVIDENCE" if group["newUnadmittedOfficialGameIDs"] else
   "CHECK_POSSIBLE_DUPLICATE_ALREADY_ADMITTED_GAME" if group["alreadyAcceptedOfficialGameIDs"] else
   "LOCATE_MISSING_OR_MISMATCHED_GAME_SOURCE")
  bundles.append(group)
 bundles.sort(key=lambda b:(0 if b["newUnadmittedOfficialGameIDs"] else 1 if b["alreadyAcceptedOfficialGameIDs"] else 2,-b["heldMasterCases"],-b["leagueId"],b["opponentSourceTeamId"]))
 need(len(bundles)==source_day.get("sourceOwnerBundleCount",len(bundles)) and
   sum(b["heldMasterCases"] for b in bundles)==43,
   "OWNER_17_BUNDLE_SCOPE_CHANGED")
 return {
   "schema":"HOSIP03_HIST43_BOUNDED_NEAR_DATE_EVIDENCE_V1",
   "status":"PRIVATE_NEAR_DATE_SOURCE_LEADS_NOT_HISTORICAL_ADMISSION",
   "officialCompetition":"SVHL","vaHLIncluded":False,
   "maxDateOffsetDays":WINDOW,
   "sourceDayReviewedCases":43,"matchedHistoricalGamesUnmodified":79,
   "priorAcceptedMatchupsUnmodified":True,
   "caseStatusCounts":leadByState,
   "caseCandidateReferences":totalCandidates,
   "distinctSourceGameCandidateIDs":len(uniqueIDs),
   "distinctAlreadyAcceptedGameIDs":len(reused),
   "distinctNewSourceGameLeads":len(newIDs),
   "candidateNewGameIDs":[{"leagueId":l,"gameId":g} for l,g in sorted(newIDs)],
   "sourceOwnerBundleCount":len(bundles),"sourceOwnerBundles":bundles,
   "historicalH2HAdded":0,"playerStatisticsChanged":False,
   "independentSourceOwnerAcceptance":False,
   "cases":rows,
   "limitations":[
     "Date-offset source leads are not matched historical games without original master score and source owner correction.",
     "A game already in the 79 accepted cross-source matches must never be counted twice.",
     "Repeated held master date cases remain separate even when they point to the same nearby game.",
     "GameInfo source coverage is incomplete by historical eligibility; no absent record implies a game was never played.",
     "No source video, current franchise continuity, player appearance, special-teams or historical strength is inferred."
   ]}

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
 p.add_argument("--source-day",type=Path,required=True)
 p.add_argument("--json-out",type=Path,required=True)
 p.add_argument("--csv-out",type=Path,required=True)
 p.add_argument("--bundle-csv-out",type=Path)
 a=p.parse_args()
 widgets=(a.repo/"widgets").resolve()
 for output in (a.json_out,a.csv_out,a.bundle_csv_out):
  if output is not None:
   need(not output.resolve().is_relative_to(widgets),"PRIVATE_SOURCE_LEAD_PACKET_NOT_PUBLIC_WIDGET")
 dayBytes=a.source_day.read_bytes()
 acceptedBytes=(widgets/"brave-historical-gameinfo-ids.json").read_bytes()
 days=json.loads(dayBytes.decode("utf-8"))
 srcids=json.loads(acceptedBytes.decode("utf-8"))
 leagues={x["leagueId"] for x in days["reviewCases"]}
 sourceBytes={l:(widgets/f"svhl-player-game-{l}.json").read_bytes() for l in leagues}
 seasons={l:json.loads(sourceBytes[l].decode("utf-8")) for l in leagues}
 report=compare(days,seasons,srcids)
 sha=lambda buf:hashlib.sha256(buf).hexdigest()
 report["inputReadbackSHA256"]={
  "privateHeldCaseDatesSHA256":sha(dayBytes),
  "acceptedHistoricalGameIDsSHA256":sha(acceptedBytes),
  "officialGameInfoSeasonSourceSHA256":{str(l):sha(raw) for l,raw in sorted(sourceBytes.items())}}
 report["inputHashPolicy"]="LOCAL_READ_ONLY_SOURCE_BYTES_EXACT_SHA256"
 a.json_out.parent.mkdir(parents=True,exist_ok=True)
 a.json_out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 cols=["originalCaseKey","season","officialLeagueId","opponentSourceTeamId",
       "opponentName","masterDate","masterDateOccurrence","sameDayEvidenceStatus",
       "nearDateStatus","candidateCount","officialNearbyGameIDs",
       "acceptedGameIDs","newSourceGameIDs","documentaryEvidenceRequired","approvalStatus"]
 with a.csv_out.open("w",encoding="utf-8-sig",newline="") as fp:
  writer=csv.DictWriter(fp,fieldnames=cols);writer.writeheader()
  for row in report["cases"]:
   games=row["officialNearbyGames"]
   record={k:row.get(k,"") for k in cols}
   record["officialNearbyGameIDs"]=";".join(str(x["officialGameId"]) for x in games)
   record["acceptedGameIDs"]=";".join(str(x["officialGameId"]) for x in games if x["alreadyIncludedIn79AcceptedHistoricalGames"])
   record["newSourceGameIDs"]=";".join(str(x["officialGameId"]) for x in games if not x["alreadyIncludedIn79AcceptedHistoricalGames"])
   writer.writerow(record)
 if a.bundle_csv_out:
  headers=["reviewBundleKey","leagueId","opponentSourceTeamId","opponentName",
   "heldMasterCases","priority","newUnadmittedOfficialGameIDs",
   "alreadyAcceptedOfficialGameIDs","nearbyOfficialGameIDs",
   "sourceDayCaseIDs","sourceOwnerRecordDisposition",
   "masterScoreOrGameDateCorrectionApproved"]
  with a.bundle_csv_out.open("w",encoding="utf-8-sig",newline="") as f:
   writer=csv.DictWriter(f,fieldnames=headers);writer.writeheader()
   for group in report["sourceOwnerBundles"]:
    item={k:group[k] for k in headers}
    for k in ("newUnadmittedOfficialGameIDs","alreadyAcceptedOfficialGameIDs",
              "nearbyOfficialGameIDs","sourceDayCaseIDs"):
     item[k]=";".join(map(str,item[k]))
    writer.writerow(item)
 print(json.dumps({key:report[key] for key in
   ("status","sourceDayReviewedCases","maxDateOffsetDays",
    "caseCandidateReferences","distinctSourceGameCandidateIDs",
    "distinctAlreadyAcceptedGameIDs","distinctNewSourceGameLeads","historicalH2HAdded")}))
if __name__=="__main__":main()
