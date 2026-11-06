"""Offline source-proven 43-case historical schedule HOLD and negative tests.

Fixture game IDs and source names are fabricated, not real SVHL score evidence.
"""
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from triage_historical_43_schedule_holds import triage,Hold

FAKE_SHA="a"*64
LEAGUE=570
TEAM=11111
BRAVES=22222
THIRD=33333
def fake_game(gid,date,home,away):
 return {"leagueId":LEAGUE,"gameId":gid,"date":date,
  "source":f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={LEAGUE}&gameid={gid}&page_type=Adult",
  "sourcePageSHA256":FAKE_SHA,
  "homeTeamId":home,"awayTeamId":away,"homeGoals":3,"awayGoals":1}
def source():
 dates=["2026-01-05","2026-01-12","2026-01-19","2026-01-26"]
 group={"season":"W2025/26","officialLeagueId":LEAGUE,
   "officialLeagueSeasonTeamId":TEAM,"officialTeamName":"FICTIONAL Opponent",
   "officialDivision":"FICTIONAL Adult Division",
   "officialSource":f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid={LEAGUE}&teamid={TEAM}&page_type=Adult",
   "officialPageSHA256":FAKE_SHA,"masterSameSeasonGameCount":5,
   "admittedCount":0,"heldCount":5,"admittedGames":[],
   "heldGameDates":[{"date":d,"reason":"OFFICIAL_SCHEDULE_SCORE_OR_DATE_NOT_RECIPROCAL"} for d in dates]+
    [{"date":"2026-01-26","reason":"OFFICIAL_SCHEDULE_SCORE_OR_DATE_NOT_RECIPROCAL"}]}
 private={"schema":"brave-hc-archived-official-games/private-parity-v1",
    "status":"PRIVATE_SOURCE_CHECKED_GAME_JOINS_NOT_FRANCHISE_CONTINUITY",
    "pagesHeld":0,"publicWritten":False,"originalWorkbookWritten":False,
    "candidatesReviewed":1,"heldGameComparisons":5,
    "reviewedSameSeasonTeams":[group],"capturedUTC":"TEST_FIXTURE"}
 season={"schema":"brave-hc-svhl-season-individual-game-evidence/v1",
    "leagueId":LEAGUE,"status":"SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS",
    "leagueAssignmentsOrPlayerTotalsWritten":False,
    "teams":[{"sourceTeamId":TEAM,"name":"FICTIONAL Opponent",
             "sourceTeamPageSHA256":FAKE_SHA},
             {"sourceTeamId":BRAVES,"name":"Braves H.C."},
             {"sourceTeamId":THIRD,"name":"FICTIONAL Third Party"}],
    "games":[fake_game(5001,dates[0],TEAM,THIRD),
             fake_game(5002,dates[1],BRAVES,THIRD),
             fake_game(5003,dates[2],TEAM,BRAVES)]}
 return private,{LEAGUE:season}

class Historical43Tests(unittest.TestCase):
 def test_source_day_classification_never_admits_held_H2H(self):
  p,s=source();out=triage(p,s,expected_total=5)
  self.assertEqual(out["heldGamesReviewed"],5)
  self.assertEqual(out["sourceDayCategories"],{
    "DUPLICATED_MASTER_DATE_GAME_IDENTITY_REVIEW_REQUIRED":2,
    "NO_OFFICIAL_OPPONENT_GAMEINFO_ON_MASTER_DATE":1,
    "OFFICIAL_OPPONENT_GAME_AGAINST_DIFFERENT_TEAM_ON_DATE":1,
    "SAME_DAY_OPPONENT_AND_BRAVES_GAME_REQUIRES_SCORE_SOURCE_REVIEW":1})
  self.assertEqual(out["potentialRepeatedMasterDateEntries"],2)
  self.assertEqual(out["sourceOwnerBundleCount"],1)
  self.assertEqual(out["sourceOwnerBundles"][0]["heldEntries"],5)
  self.assertFalse(out["sourceOwnerBundles"][0]["admittedHistoricalH2H"])
  self.assertFalse(out["historicalH2HAccepted"])
  self.assertFalse(out["officialStatisticsChanged"])
  self.assertTrue(all(row["independentDecision"]=="UNREVIEWED" and
      not row["historicalH2HAdmitted"] and not row["scoreCorrectionAuthorized"]
      for row in out["reviewCases"]))
 def test_same_date_repetitions_remain_distinct_provisional_cases(self):
  p,s=source();rows=triage(p,s,5)["reviewCases"]
  repeated=[r for r in rows if r["masterRecordedDate"]=="2026-01-26"]
  self.assertEqual([r["masterDateOccurrence"] for r in repeated],[1,2])
  self.assertTrue(all(r["masterDateOccurrences"]==2 for r in repeated))
 def test_unqualified_private_receipt_rejected(self):
  p,s=source();p["publicWritten"]=True
  with self.assertRaisesRegex(Hold,"PRIVATE_PARITY_AUTHORITY"):
   triage(p,s)
 def test_wrong_official_team_page_sha_rejected(self):
  p,s=source();s[LEAGUE]["teams"][0]["sourceTeamPageSHA256"]="b"*64
  with self.assertRaisesRegex(Hold,"OFFICIAL_TEAM_ROSTER_PAGE"):
   triage(p,s)
 def test_different_source_game_url_cannot_be_passed_off_as_official(self):
  p,s=source();s[LEAGUE]["games"][0]["source"]="https://example.invalid/"
  with self.assertRaisesRegex(Hold,"CAPTURED_OFFICIAL_GAMEINFO_PAGE_UNQUALIFIED"):
   triage(p,s)
 def test_unknown_braves_name_does_not_get_roster_identity_inferred(self):
  p,s=source();s[LEAGUE]["teams"][1]["name"]="Team that maybe was Braves"
  out=triage(p,s)
  self.assertEqual(out["sourceDayCategories"]["SAME_DAY_OPPONENT_AND_BRAVES_GAME_REQUIRES_SCORE_SOURCE_REVIEW"]
                   if "SAME_DAY_OPPONENT_AND_BRAVES_GAME_REQUIRES_SCORE_SOURCE_REVIEW" in out["sourceDayCategories"]
                   else 0,0)
 def test_unverified_current_source_write_is_rejected(self):
  p,s=source();s[LEAGUE]["leagueAssignmentsOrPlayerTotalsWritten"]=True
  with self.assertRaisesRegex(Hold,"MISSING_QUALIFIED_OFFICIAL_SEASON"):
   triage(p,s)
 def test_missing_date_or_undocumented_reason_refused(self):
  p,s=source();p["reviewedSameSeasonTeams"][0]["heldGameDates"][0]["reason"]="FIXED_AUTOMATICALLY"
  with self.assertRaisesRegex(Hold,"DUPLICATED_OR_RECLASSIFIED_MASTER_HOLD"):
   triage(p,s)
 def test_no_invention_when_original_count_changed(self):
  p,s=source();p["heldGameComparisons"]=4
  with self.assertRaisesRegex(Hold,"NOT_ALL_HISTORICAL_SOURCE_HOLDS_ACCOUNTED"):
   triage(p,s)
 def test_source_season_and_no_vaHL_controls(self):
  p,s=source();s[LEAGUE]["schema"]="VAHL_FAKE"
  with self.assertRaisesRegex(Hold,"MISSING_QUALIFIED_OFFICIAL_SEASON"):
   triage(p,s)
if __name__=="__main__":unittest.main()
