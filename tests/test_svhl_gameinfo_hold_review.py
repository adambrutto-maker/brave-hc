"""Offline independently reproducible GameInfo review display source gates."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_svhl_gameinfo_hold_review import review


def load(name):
    return json.loads((ROOT/"widgets"/name).read_text(encoding="utf-8"))


class ReviewDisplaySourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = load("svhl-player-game-index.json")
        cls.seasons = {int(k):load(f"svhl-player-game-{k}.json")
                       for k in cls.index["seasons"]}
        cls.public = load("svhl-gameinfo-hold-review.json")

    def synthetic_capture_from_pinned_review(self):
        p = self.public
        return {
            "schema":"brave-hc-private-live-held-gameinfo-diagnostic/v1",
            "observedUTC":p["capturedUTC"],
            "sourceCapturedUTC":p["originalGameSourceCapturedUTC"],
            "queuedGameCount":p["gamePages"],
            "requested":p["gamePages"],"pageHashVerified":p["gamePageHashesMatched"],
            "failedOrChangedSource":0,"officialStatsChanged":False,
            "releaseGate":"HELD_INDEPENDENT_REVIEW_REQUIRED","sourceHolds":[],
            "classificationCounts":p["categories"],
            "results":[{
                "leagueId":g["leagueId"],"gameId":g["gameId"],
                "pageByteIdenticalToPinned":True,"replayedFromUnmodifiedOfficialPage":True,
                "pageSHA256":g["officialPageSHA256"],
                "sourceURL":g["officialGameInfoURL"],"date":g["date"],
                "publishedFinalGoals":sum(g["finalScore"]),
                "sourceRosterQualifiedCandidateEvents":g["rosterQualifiedEvents"],
                "playerScoreOrAttendanceVerified":False,
                "sourceCorrectionApproved":False,
                "sourceClassification":g["category"],
                "rawOfficialScoringRows":g["rawScoringRows"],
                "heldEventReasons":g["heldReasons"]
            } for g in p["games"]]
        }

    def test_exact_137_live_classified_records_rebuild_against_original_season_sources(self):
        capture=self.synthetic_capture_from_pinned_review()
        regenerated=review(self.index,self.seasons,capture)
        self.assertEqual(regenerated,self.public)
        self.assertEqual(regenerated["gamePages"],137)
        self.assertEqual(regenerated["categories"],{
            "RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE":12,
            "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE":86,
            "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD":39})
        self.assertTrue(regenerated["reviewOnly"])
        self.assertFalse(regenerated["publicStatsOrScoresChanged"])

    def test_wrong_official_source_sha_blocks_replay(self):
        capture=self.synthetic_capture_from_pinned_review()
        capture["results"][0]["pageSHA256"]="0"*64
        with self.assertRaisesRegex(ValueError,"GAMEINFO_HASH_OR_QUALIFICATION_CONFLICT"):
            review(self.index,self.seasons,capture)

    def test_reclassified_current_game_without_raw_evidence_is_rejected(self):
        capture=self.synthetic_capture_from_pinned_review()
        current=next(x for x in capture["results"] if x["leagueId"]==570)
        current["sourceClassification"]="RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE"
        with self.assertRaisesRegex(ValueError,"WRONG_RAW_BELOW_CATEGORY"):
            review(self.index,self.seasons,capture)

    def test_missing_game_or_duplicate_game_is_held(self):
        cap=self.synthetic_capture_from_pinned_review()
        cap["results"].pop()
        with self.assertRaisesRegex(ValueError,"MISSING_REVIEWED_SOURCE_PAGE"):
            review(self.index,self.seasons,cap)
        cap=self.synthetic_capture_from_pinned_review()
        cap["results"][0]=copy.deepcopy(cap["results"][1])
        with self.assertRaisesRegex(ValueError,"UNMATCHED_OR_DUPLICATE_CAPTURED_GAME"):
            review(self.index,self.seasons,cap)

    def test_player_score_claim_or_source_population_change_is_refused(self):
        cap=self.synthetic_capture_from_pinned_review()
        cap["results"][0]["playerScoreOrAttendanceVerified"]=True
        with self.assertRaisesRegex(ValueError,"GAMEINFO_HASH_OR_QUALIFICATION_CONFLICT"):
            review(self.index,self.seasons,cap)
        cap=self.synthetic_capture_from_pinned_review()
        cap["officialStatsChanged"]=True
        with self.assertRaisesRegex(ValueError,"PRIVATE_RECEIPT_UNQUALIFIED_OR_PARTIAL"):
            review(self.index,self.seasons,cap)

    def test_raw_count_cannot_be_smaller_than_qualified_player_events(self):
        cap=self.synthetic_capture_from_pinned_review()
        first=next(x for x in cap["results"] if x["sourceRosterQualifiedCandidateEvents"]>0)
        first["rawOfficialScoringRows"]=0
        with self.assertRaisesRegex(ValueError,"INVALID_RAW_COUNT"):
            review(self.index,self.seasons,cap)


if __name__=="__main__":
    unittest.main()
