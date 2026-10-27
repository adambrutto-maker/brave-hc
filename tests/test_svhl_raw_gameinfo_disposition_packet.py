"""ENG59 independent read-only source discrepancy handoff checks."""
import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_svhl_raw_gameinfo_disposition_packet import (
 packet,EMPTY,PARTIAL,EXCESS,QA
)
SRC=json.loads((ROOT/"widgets"/"svhl-gameinfo-hold-review.json")
               .read_text(encoding="utf-8"))
class SourceOwner98Tests(unittest.TestCase):
 def test_admitted_98_raw_source_holds_are_grouped_not_corrected(self):
  d=packet(SRC)
  self.assertEqual(d["rawDiscrepancyGames"],98)
  self.assertEqual(d["sourceVerifiedPageHashes"],98)
  self.assertEqual(d["sourceOwnerBundleCount"],14)
  self.assertEqual((d["emptyOfficialGoalTablesWithNonzeroFinalGoals"],
                    d["partialOfficialGoalTablesBelowFinal"],
                    d["scoringTablesAbovePublishedTotal"]),(84,2,12))
  self.assertEqual(d["separateRosterIdentityHolds"],39)
  self.assertEqual(d["correctionsAccepted"],0)
  self.assertFalse(d["sourceStatsOrScoresWritten"])
  self.assertEqual(d["independentAcceptance"],QA)
  self.assertEqual(sum(len(x["officialGameIds"]) for x in d["reviewBundles"]),98)
  self.assertTrue(all(x["sameUnderlyingDefectProved"] is False for x in d["reviewBundles"]))
  self.assertEqual(len({(x["leagueId"],x["gameId"]) for x in d["games"]}),98)
  self.assertTrue(all(x["acceptedScoreOrPlayerCorrection"] is False for x in d["games"]))
  self.assertTrue(all(x["documentaryEvidenceReference"] is None for x in d["games"]))
  self.assertEqual({x["reviewFamily"] for x in d["games"]},{EMPTY,PARTIAL,EXCESS})
 def alter(self,mutator,expect):
  source=copy.deepcopy(SRC)
  mutator(source)
  with self.assertRaisesRegex(ValueError,expect):
   packet(source)
 def test_duplicate_game_id_cannot_silently_overwrite_source(self):
  def change(s):
   s["games"][1]["leagueId"]=s["games"][0]["leagueId"]
   s["games"][1]["gameId"]=s["games"][0]["gameId"]
  self.alter(change,"DUPLICATE_OR_MALFORMED_SOURCE_GAME")
 def test_wrong_page_sha_is_held(self):
  self.alter(lambda s:s["games"][0].update(officialPageSHA256="FAKE"),
             "DUPLICATE_OR_MALFORMED_SOURCE_GAME")
 def test_tampered_game_url_or_game_id_is_held(self):
  self.alter(lambda s:s["games"][0].update(
    officialGameInfoURL="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid=999999&page_type=Adult"),
    "SOURCE_PAGE_GAME_SCOPE_OR_ID_MISMATCH")
 def test_fabricated_under_or_over_classification_is_refused(self):
  source=copy.deepcopy(SRC)
  candidate=next(g for g in source["games"] if g["category"]==
   "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE")
  candidate["rawScoringRows"]=sum(candidate["finalScore"])+1
  with self.assertRaisesRegex(ValueError,"BELOW_CLASS_HAS_NO_DEFICIT"):
   packet(source)
 def test_game_score_negative_and_zero_or_noninteger_counts_are_refused(self):
  self.alter(lambda s:s["games"][0].update(rawScoringRows=-1),
             "DUPLICATE_OR_MALFORMED_SOURCE_GAME")
  self.alter(lambda s:s["games"][0].update(finalScore=[True,12]),
             "DUPLICATE_OR_MALFORMED_SOURCE_GAME")
 def test_no_accepted_correction_can_enter_packet(self):
  self.alter(lambda s:s["games"][0].update(acceptedPlayerCorrection=True),
             "DUPLICATE_OR_MALFORMED_SOURCE_GAME")
  self.alter(lambda s:s.update(publicStatsOrScoresChanged=True),
             "PUBLIC_SOURCE_COVERAGE_OR_ACCEPTANCE_UNVERIFIED")
 def test_roster_holds_remain_separate_from_raw_gap_review(self):
  source=copy.deepcopy(SRC)
  roster=next(g for g in source["games"] if g["category"]==
    "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD")
  roster["rawScoringRows"]=roster["rawScoringRows"]-1
  with self.assertRaisesRegex(ValueError,"SOURCE_ROSTER_PARITY_INVALID"):
   packet(source)
 def test_no_unapproved_new_source_or_vaHL_page(self):
  self.alter(lambda s:s["games"][0].update(
    officialGameInfoURL="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid="+
     str(s["games"][0]["gameId"])+"&page_type=VAHL"),
    "SOURCE_PAGE_GAME_SCOPE_OR_ID_MISMATCH")
 def test_missing_page_can_not_be_represented_as_complete(self):
  self.alter(lambda s:s["games"].pop(),
             "PUBLIC_SOURCE_COVERAGE_OR_ACCEPTANCE_UNVERIFIED")
if __name__=="__main__":unittest.main()
