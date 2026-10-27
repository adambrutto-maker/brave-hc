"""Offline negative and replay tests for bounded official GameInfo readback."""
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_svhl_held_gameinfo_live as subject


def load(file):
    return json.loads((ROOT / "widgets" / file).read_text(encoding="utf-8"))


class LiveHeldSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        season = load("svhl-player-game-570.json")
        cls.season = season
        cls.game = next(g for g in season["games"] if g["gameId"] == 127726)
        cls.row = {
            "leagueId": 570, "gameId": 127726,
            "officialGameInfoURL": cls.game["source"],
            "officialGameInfoPageSHA256": cls.game["sourcePageSHA256"]
        }

    def test_gameinfo_raw_table_below_score_not_assumed_roster_only(self):
        self.assertEqual(subject.classify(0, 12, 0, {}),
                         "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE")

    def test_gameinfo_raw_table_above_score_remains_held(self):
        self.assertEqual(subject.classify(18, 9, 18, {}),
                         "RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE")

    def test_current_source_roster_exception_recognized(self):
        self.assertEqual(subject.classify(
            12, 12, 11, {"GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER": 1}),
            "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD")

    def test_other_qualification_hold_not_mistaken_for_missing_raw_row(self):
        self.assertEqual(subject.classify(
            12, 12, 11, {"MORE_THAN_TWO_ASSISTS_UNSUPPORTED": 1}),
            "RAW_SCORE_PARITY_WITH_OTHER_EVENT_QUALIFICATION_HOLD")

    def test_unclear_partial_with_equal_counts_requires_review(self):
        self.assertEqual(subject.classify(12, 12, 12, {}),
                         "RAW_SOURCE_SCORE_AND_CANDIDATES_MATCH_INSPECT_HOLD_POLICY")

    def test_qualified_cannot_exceed_raw_rows(self):
        with self.assertRaisesRegex(ValueError, "MORE_QUALIFIED_CANDIDATES"):
            subject.classify(10, 12, 11, {})

    def test_negative_and_boolean_event_count_refused(self):
        for raw in (-1, True):
            with self.assertRaisesRegex(ValueError, "INVALID_EVENT_COUNT"):
                subject.classify(raw, 12, 2, {})

    def test_archive_hash_drift_refused_before_parser(self):
        with self.assertRaisesRegex(ValueError, "LIVE_SOURCE_HASH_DRIFT"):
            subject.diagnose(self.row, self.season, "untrusted html", "f" * 64)

    def test_exact_fake_parser_replay_keeps_partial_game_held(self):
        class FakeTables:
            def __init__(self):
                self.tables = {}
            def feed(self, _):
                for i, count in [(1, 4), (2, 4), (3, 4), (4, 0)]:
                    self.tables[f"ctl00_MainContent_GridViewScoresPeriod{i}"] = [
                        {"text": f"Period {i}"}] + [{} for _ in range(count)]
        qualification = {
            "events": [{} for _ in range(11)],
            "heldEvents": [{"reason": "GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER"}],
            "status": "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"
        }
        with patch.object(subject, "Tables", FakeTables), patch.object(
                subject, "official_game", return_value=qualification):
            result = subject.diagnose(
                self.row, self.season, "synthetic", self.game["sourcePageSHA256"])
        self.assertEqual(result["rawOfficialScoringRows"], 12)
        self.assertEqual(result["sourceRosterQualifiedCandidateEvents"], 11)
        self.assertEqual(result["sourceClassification"],
                         "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD")
        self.assertFalse(result["sourceCorrectionApproved"])
        self.assertFalse(result["playerScoreOrAttendanceVerified"])

    def test_mismatched_replayed_qualified_count_refused(self):
        class FakeTables:
            def __init__(self):
                self.tables = {}
            def feed(self, _):
                self.tables = {
                    f"ctl00_MainContent_GridViewScoresPeriod{i}": [{}] * (13 if i == 1 else 1)
                    for i in range(1, 5)
                }
        q = {"events": [{} for _ in range(10)], "heldEvents": [],
             "status": "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"}
        with patch.object(subject, "Tables", FakeTables), patch.object(
                subject, "official_game", return_value=q):
            with self.assertRaisesRegex(ValueError, "QUALIFIED_EVENT_COUNT_CHANGED"):
                subject.diagnose(
                    self.row, self.season, "synthetic", self.game["sourcePageSHA256"])

if __name__ == "__main__":
    unittest.main()
