"""Offline bounded source lead QA using SYNTHETIC historical hold dates.

Fixtures are not legitimate Brave H.C. master entries. Never accept matches
because an official score/date looks plausible.
"""
import copy,json,sys,unittest
from datetime import date,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from triage_historical_43_near_date_candidates import compare,Hold
read=lambda name:json.loads((ROOT/"widgets"/name).read_text(encoding="utf-8"))
accepted=read("brave-historical-gameinfo-ids.json")
seasons={i:read(f"svhl-player-game-{i}.json") for i in (375,420,476,494,512,531,547)}
def fixture():
 s547=seasons[547]
 schmelts=next(t for t in s547["teams"] if t["sourceTeamId"]==13191)
 s531=seasons[531]
 crisis=next(t for t in s531["teams"] if t["sourceTeamId"]==12610)
 cases=[]
 for k in range(40):
  dt=date(2026,7,1)+timedelta(days=k)
  cases.append({
   "leagueId":547,"opponentTeamId":13191,"opponentName":schmelts["name"],
   "officialTeamPageSHA256":schmelts["sourceTeamPageSHA256"],
   "masterRecordedDate":dt.isoformat(),"masterDateOccurrence":1,
   "independentDecision":"UNREVIEWED","historicalH2HAdmitted":False,
   "scoreCorrectionAuthorized":False,
   "daySourceCategory":"NO_OFFICIAL_OPPONENT_GAMEINFO_ON_MASTER_DATE",
   "season":"SYNTHETIC_TEST_CASE_40"})
 cases.append({
  "leagueId":531,"opponentTeamId":12610,"opponentName":crisis["name"],
  "officialTeamPageSHA256":crisis["sourceTeamPageSHA256"],
  "masterRecordedDate":"2025-03-30","masterDateOccurrence":1,
  "independentDecision":"UNREVIEWED","historicalH2HAdmitted":False,
  "scoreCorrectionAuthorized":False,
  "daySourceCategory":"NO_OFFICIAL_OPPONENT_GAMEINFO_ON_MASTER_DATE",
  "season":"SYNTHETIC_2025_TEST"})
 for ordinal in (1,2):
  cases.append({
   "leagueId":547,"opponentTeamId":13191,"opponentName":schmelts["name"],
   "officialTeamPageSHA256":schmelts["sourceTeamPageSHA256"],
   "masterRecordedDate":"2026-03-22","masterDateOccurrence":ordinal,
   "independentDecision":"UNREVIEWED","historicalH2HAdmitted":False,
   "scoreCorrectionAuthorized":False,
   "daySourceCategory":"DUPLICATED_MASTER_DATE_GAME_IDENTITY_REVIEW_REQUIRED",
   "season":"SYNTHETIC_DUPLICATE_DATE_TEST"})
 return {"schema":"HOSIP03_43_HISTORICAL_DATE_SOURCE_OWNER_TRIAGE_V1",
  "status":"READ_ONLY_HISTORICAL_SCHEDULE_DISCREPANCY_REVIEW_NOT_ADMISSION",
  "officialCompetition":"SVHL","vaHLIncluded":False,
  "heldGamesReviewed":43,"sourceOwnerDecisionsAccepted":0,
  "officialStatisticsChanged":False,"historicalH2HAccepted":False,
  "reviewCases":cases}

class TestNearDate(unittest.TestCase):
 def test_all_cases_accounted_and_distinct_leads_not_double_counted(self):
  d=compare(fixture(),seasons,accepted)
  self.assertEqual(d["sourceDayReviewedCases"],43)
  self.assertEqual(d["caseCandidateReferences"],3)
  self.assertEqual(d["distinctSourceGameCandidateIDs"],2)
  self.assertEqual(d["distinctAlreadyAcceptedGameIDs"],1)
  self.assertEqual(d["distinctNewSourceGameLeads"],1)
  self.assertEqual(d["caseStatusCounts"]["NO_OFFICIAL_MATCH_WITHIN_14_DAYS"],40)
  self.assertEqual(d["caseStatusCounts"]["NEAR_DATE_LEAD_ALREADY_IN_79_ACCEPTED"],1)
  self.assertEqual(d["caseStatusCounts"]["NEAR_DATE_UNADMITTED_OFFICIAL_GAME_REQUIRES_MASTER_SCORE_AND_SOURCE_OWNER_REVIEW"],2)
  self.assertFalse(d["historicalH2HAdded"])
  self.assertFalse(d["playerStatisticsChanged"])
  self.assertFalse(d["independentSourceOwnerAcceptance"])
 def test_repeated_master_date_preserves_two_review_entries_but_one_game(self):
  d=compare(fixture(),seasons,accepted)
  s=[x for x in d["cases"] if x["masterDate"]=="2026-03-22"]
  self.assertEqual([x["masterDateOccurrence"] for x in s],[1,2])
  self.assertEqual({x["officialNearbyGames"][0]["officialGameId"] for x in s},{122910})
  self.assertTrue(all(not x["sourceH2HAdded"] for x in s))
 def test_previously_accepted_game_is_ineligible_for_second_historical_count(self):
  d=compare(fixture(),seasons,accepted)
  q=next(x for x in d["cases"] if x["masterDate"]=="2025-03-30")
  self.assertEqual(q["officialNearbyGames"][0]["officialGameId"],116729)
  self.assertTrue(q["officialNearbyGames"][0]["historyReuseWouldDoubleCount"])
 def test_source_page_hash_drift_fails_closed(self):
  source=copy.deepcopy(seasons)
  g=next(x for x in source[531]["games"] if x["gameId"]==116729)
  g["sourcePageSHA256"]="invalid"
  with self.assertRaisesRegex(Hold,"ORIGINAL_GAMEINFO_ID_OR_HASH_UNQUALIFIED"):
   compare(fixture(),source,accepted)
 def test_source_score_or_date_drift_does_not_admit_new_game(self):
  source=copy.deepcopy(seasons)
  next(x for x in source[531]["games"] if x["gameId"]==116729)["sourcePageSHA256"]="b"*64
  with self.assertRaisesRegex(Hold,"PREVIOUSLY_ADMITTED_GAMEINFO_PROOF_CONFLICT"):
   compare(fixture(),source,accepted)
 def test_wrong_opponent_team_sha_blocks_reconciliation(self):
  src=fixture()
  src["reviewCases"][40]["officialTeamPageSHA256"]="0"*64
  with self.assertRaisesRegex(Hold,"HISTORICAL_OPPONENT_ID_OR_HOLD_CHANGED"):
   compare(src,seasons,accepted)
 def test_duplicate_ordinal_refused_not_collapsed(self):
  src=fixture()
  src["reviewCases"][-1]["masterDateOccurrence"]=1
  with self.assertRaisesRegex(Hold,"DUPLICATED_MASTER_CASE_ORDINAL"):
   compare(src,seasons,accepted)
 def test_public_acceptance_mutation_refused(self):
  a=copy.deepcopy(accepted)
  a["originalHistoricalH2HModified"]=True
  with self.assertRaisesRegex(Hold,"ORIGINAL_79_ACCEPTED_SOURCE_IDS_UNVERIFIED"):
   compare(fixture(),seasons,a)
 def test_wrong_season_scope_and_vaHL_refused(self):
  source=copy.deepcopy(seasons)
  source[547]["leagueAssignmentsOrPlayerTotalsWritten"]=True
  with self.assertRaisesRegex(Hold,"SOURCE_GAMEINFO_SEASON_MISSING"):
   compare(fixture(),source,accepted)
  f=fixture();f["vaHLIncluded"]=True
  with self.assertRaisesRegex(Hold,"ORIGINAL_43_DAY_REVIEW_NOT_QUALIFIED"):
   compare(f,seasons,accepted)
 def test_no_15_day_promotion_and_no_master_score_imputation(self):
  out=compare(fixture(),seasons,accepted)
  self.assertEqual(out["maxDateOffsetDays"],14)
  self.assertTrue(all(y["masterScoreEquality"]=="NOT_CHECKED_MASTER_SCORE_NOT_IN_HELD_DATE_RECEIPT"
   for x in out["cases"] for y in x["officialNearbyGames"]))
  self.assertTrue(all(not y["newHistoryAdmissionAuthorized"]
   for x in out["cases"] for y in x["officialNearbyGames"]))
if __name__=="__main__":unittest.main()
