"""Independent controls for the April 6, 2025 HTO team-versus-goalie GA residual.

The arithmetic is verified, but the goal's attribution/cause is NOT.
No conclusion about an empty-net goal or changing official stats is permitted.
"""
import json
import unittest
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[2]/"docs"/"editorial"/"native_hto"/"2024-25"
SOURCE=json.loads((ROOT/"261103_Winter2024_25_Public_Source_Preservation_v2.json").read_text(encoding="utf-8"))
REPORT=json.loads((ROOT/"261103_April06_Official_HTO_Goalie_Residual_Exception.json").read_text(encoding="utf-8"))
GAMES={g["gameId"]:g for g in SOURCE["games"]}

class April2025GoalieExceptionTests(unittest.TestCase):
    def test_records_source_and_accounting_status(self):
        self.assertEqual(REPORT["schema"],"brave-hc-2025-04-06-playoff-goalie-stat-exception/v1")
        self.assertEqual(REPORT["status"],
            "OFFICIAL_TEAM_SCORE_AND_GOALIE_ROWS_ACCOUNTED_FOR_CAUSE_UNRESOLVED")
        self.assertEqual(REPORT["officialRecordsSource"]["http"],200)
        self.assertEqual(REPORT["officialRecordsSource"]["recordClass"],
            "HTO_PUBLIC_RECORDS_PLAYED_GAME_SCORING")
        self.assertEqual(urlparse(REPORT["officialRecordsSource"]["url"]).hostname,"www.htosports.com")
        self.assertEqual(len(REPORT["officialRecordsSource"]["publicHTMLSHA256"]),64)

    def test_two_unique_playoff_games_not_forfeits(self):
        original=REPORT["originalGames"]
        self.assertEqual({g["gameId"] for g in original},{2148162,2148163})
        for g in original:
            with self.subTest(game=g["gameId"]):
                audited=GAMES[g["gameId"]]
                self.assertEqual(audited["gameType"],"PLAYOFFS")
                self.assertEqual(audited["result"],"L")
                self.assertEqual(audited["publicNativeContentCategory"],
                    "NATIVE_RECAP_NOT_PUBLICLY_VISIBLE")
                self.assertEqual(g["originalPublicHTMLSHA256"],
                    audited["publicBoxscoreHTMLSHA256"])
                self.assertEqual(g["teamBravesGoals"],audited["bravesGoals"])
                self.assertEqual(g["teamGoalsAgainst"],audited["opponentGoals"])

    def test_team_season_records_and_goalie_residual_exact(self):
        summary=REPORT["seasonPlayoffSummary"]
        self.assertEqual(summary["recordedHTOTeamGoalsFor"],2)
        self.assertEqual(summary["recordedHTOTeamGoalsAgainst"],6)
        self.assertEqual(summary["listedGoalieGoalsAgainst"],5)
        self.assertEqual(summary["teamMinusListedGoalieGoalsAgainst"],1)
        self.assertEqual(sum(g["teamGoalsAgainst"] for g in REPORT["originalGames"]),6)
        self.assertEqual(sum(sum(x["GA"] for x in g["listedGoalies"]) for g in REPORT["originalGames"]),5)

    def test_single_april_difference_has_unknown_cause(self):
        g={x["gameId"]:x for x in REPORT["originalGames"]}
        self.assertEqual(g[2148162]["recordedTeamMinusListedGoalieGA"],0)
        self.assertEqual(g[2148163]["recordedTeamMinusListedGoalieGA"],1)
        self.assertEqual(g[2148162]["listedGoalies"],[{"name":"Logue, Stephen","GA":3}])
        self.assertEqual(g[2148163]["listedGoalies"],[{"name":"Logue, Stephen","GA":2}])
        self.assertTrue({"NOT_VERIFIED_EMPTY_NET_GOAL","NOT_VERIFIED_GOALTENDER_CHANGE",
            "NOT_VERIFIED_STATS_CORRECTION"}.issubset(set(REPORT["disallowedConclusions"])))
        self.assertIn("no verified goal-event source",REPORT["unresolvedCause"])

    def test_review_article_is_still_held_without_inferred_cause(self):
        path=ROOT/"review_drafts"/"20250406_HTO_2148163_Preview_NotForPublication.md"
        article=path.read_text(encoding="utf-8")
        self.assertIn("RESEARCH DRAFT, NOT APPROVED OR PUBLISHED",article)
        self.assertIn("statistical accounting residual",article)
        self.assertIn("not evidence of an empty-net goal",article)
        self.assertIn("No Founder approval to publish",article)
        self.assertFalse(REPORT["nativeHTOFieldsWritten"])
        self.assertEqual(REPORT["editorialStatus"],"HOLD_AS_UNRESOLVED_NOT_AUTHORIZED_FOR_PUBLICATION")

if __name__=="__main__":
    unittest.main()
