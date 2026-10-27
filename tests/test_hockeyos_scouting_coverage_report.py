"""Synthetic and source-parity tests for the read-only ENG59 coverage report."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from report_hockeyos_scouting_coverage import build_report


class CoverageReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        def read(name):
            return json.loads((ROOT / "widgets" / name).read_text(encoding="utf-8"))
        cls.actual = (
            read("league-intelligence.json"),
            read("brave-historical-verified-games.json"),
            read("svhl-player-game-index.json"),
            read("svhl-roster-intelligence.json"),
            read("svhl-penalty-source-coverage.json"),
        )

    def build(self, change=None):
        parts = copy.deepcopy(self.actual)
        if change:
            change(parts)
        return build_report(*parts)

    def test_coverage_report_is_source_scoped_and_not_a_release_approval(self):
        report = self.build()
        event = report["gameReconciliation"]
        self.assertEqual(event["gamePages"], event["fullGoalParity"] + event["partialOrHeld"])
        self.assertEqual(event["seasons"], len(event["bySeason"]))
        self.assertFalse(report["status"].endswith("APPROVED"))
        self.assertFalse(event["registeredGamesPlayedVerified"])
        self.assertEqual(report["historicalOpponentEvidence"]["continuousFranchiseIdentityAsserted"], False)
        self.assertEqual(report["league"]["eligibleAdultSundayTeams"], 22)
        self.assertNotIn("VAHL", report["league"]["adultSundayDivisions"])
        self.assertTrue(report["penaltyEvidence"]["zeroObservedPenaltyRowsDoesNotMeanZeroPenalties"])

    def test_partial_game_cannot_be_reclassified_as_verified(self):
        def corrupt(parts):
            first = next(iter(parts[2]["seasons"].values()))
            first["fullScoringGames"] += 1
        with self.assertRaisesRegex(ValueError, "SEASON_GAME_PARITY"):
            self.build(corrupt)

    def test_unproven_historical_franchise_joins_are_rejected(self):
        def corrupt(parts):
            parts[1]["teamSeasons"][0]["continuousFranchiseNotVerified"] = False
        with self.assertRaisesRegex(ValueError, "HISTORICAL_FRANCHISE"):
            self.build(corrupt)

    def test_current_player_roster_count_must_reconcile(self):
        def corrupt(parts):
            parts[2]["currentRosterPlayers"] += 1
        with self.assertRaisesRegex(ValueError, "CURRENT_PLAYER_SOURCE_COUNT_CONFLICT"):
            self.build(corrupt)

    def test_sample_coverage_cannot_be_exaggerated(self):
        def corrupt(parts):
            parts[4]["totalGamesSampled"] += 1
        with self.assertRaisesRegex(ValueError, "PENALTY_SAMPLE_SIZE_CONFLICT"):
            self.build(corrupt)


if __name__ == "__main__":
    unittest.main()
