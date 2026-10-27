"""Independent fail-closed QA of the 8-season SVHL held GameInfo review queue."""
import copy
import json
import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "scripts"))
from build_svhl_scoring_source_holds_triage import build


def read(name):
    return json.loads((BASE / "widgets" / name).read_text(encoding="utf-8"))


class HeldGameTriageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = read("svhl-player-game-index.json")
        cls.seasons = {int(s): read(f"svhl-player-game-{s}.json")
                       for s in cls.index["seasons"]}

    def result(self, change=None):
        index = copy.deepcopy(self.index)
        seasons = copy.deepcopy(self.seasons)
        if change:
            change(index, seasons)
        return build(index, seasons)

    def test_admitted_eight_seasons_and_all_137_held_games(self):
        report = self.result()
        self.assertEqual(report["seasonCount"], self.index["sourceSeasonCount"])
        self.assertEqual(report["unresolvedHeldGameSheets"], sum(
            s["partialScoringGames"] for s in self.index["seasons"].values()))
        self.assertEqual(report["totalCompletedGameSheets"], sum(
            s["completedGames"] for s in self.index["seasons"].values()))
        self.assertEqual(report["fullyReconciledGameSheets"], sum(
            s["fullScoringGames"] for s in self.index["seasons"].values()))
        self.assertEqual(report["gamesWithFewerRosterQualifiedEventsThanFinalGoals"] +
                         report["gamesWithMoreRosterQualifiedEventsThanFinalGoals"],
                         report["unresolvedHeldGameSheets"])
        self.assertFalse(report["leagueDataWritten"])
        self.assertFalse(report["publishedPlayerTotalsModified"])
        self.assertIn("NOT_RAW_SCORING_TABLE_ROWS", report["candidateCountDefinition"])
        self.assertTrue(all(g["rawOfficialScoringTableRowCountVerifiedByThisQueue"] is False for g in report["games"]))

    def test_distinguishes_candidate_counts_below_and_above_published_goals(self):
        report = self.result()
        self.assertGreater(report["gamesWithFewerRosterQualifiedEventsThanFinalGoals"], 0)
        self.assertGreater(report["gamesWithMoreRosterQualifiedEventsThanFinalGoals"], 0)
        for g in report["games"]:
            self.assertNotEqual(g["rosterQualifiedGoalEventCandidates"],
                                g["totalGoalsInPublishedFinalScore"])
            self.assertEqual(g["finalScoreCountMinusQualifiedCandidates"] *
                             g["qualifiedCandidatesMinusFinalScoreCount"], 0)
            self.assertEqual(g["absoluteQualifiedCandidateCountDifference"],
                             g["finalScoreCountMinusQualifiedCandidates"] +
                             g["qualifiedCandidatesMinusFinalScoreCount"])
            self.assertFalse(g["acceptAsVerified"])
            self.assertFalse(g["lineupAttendanceVerified"])
            self.assertEqual(len(g["officialGameInfoPageSHA256"]), 64)

    def test_missing_game_from_hold_list_fails_closed(self):
        def change(_, ss):
            ss[570]["heldGameEvidence"].pop()
        with self.assertRaisesRegex(ValueError, "ADMITTED_PARTIAL_GAME_COVERAGE_PARITY"):
            self.result(change)

    def test_changed_source_score_cannot_pass_held_join(self):
        def change(_, ss):
            game = next(x for x in ss[570]["games"]
                        if x["status"] == "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL")
            game["homeGoals"] += 1
        with self.assertRaisesRegex(ValueError, "HELD_GAME_SCORE_SOURCE_DISAGREEMENT"):
            self.result(change)

    def test_source_url_and_capture_hash_required(self):
        def change(_, ss):
            game = next(x for x in ss[570]["games"]
                        if x["status"] == "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL")
            game["sourcePageSHA256"] = "NOT_VERIFIED"
        with self.assertRaisesRegex(ValueError, "UNQUALIFIED_SOURCE_GAME_PROVENANCE"):
            self.result(change)

    def test_lookalike_game_id_url_cannot_impersonate_source(self):
        def change(_, ss):
            game = next(x for x in ss[570]["games"]
                        if x["status"] == "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL")
            game["source"] = game["source"].replace(
                "gameid=" + str(game["gameId"]),
                "gameid=" + str(game["gameId"]) + "0")
        with self.assertRaisesRegex(ValueError, "UNQUALIFIED_SOURCE_GAME_PROVENANCE"):
            self.result(change)

    def test_candidate_count_above_final_score_is_not_a_missing_goal(self):
        report = self.result()
        over = next(g for g in report["games"] if g["qualifiedCandidatesMinusFinalScoreCount"] > 0)
        self.assertEqual(over["finalScoreCountMinusQualifiedCandidates"], 0)
        self.assertEqual(over["direction"], "QUALIFIED_CANDIDATES_ABOVE_FINAL_SCORE_GOALS")

    def test_source_seasons_do_not_silently_disappear(self):
        with self.assertRaisesRegex(ValueError, "SEASON_SET_MISMATCH"):
            self.result(lambda index, ss: ss.pop(375))


if __name__ == "__main__":
    unittest.main()
