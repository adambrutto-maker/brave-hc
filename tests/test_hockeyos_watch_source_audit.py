"""Synthetic, no-network tests for the Plan 03 Record Watch source preflight."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from audit_hockeyos_watch_sources import audit, EXPECTED_COMPLETED_IDS


def fixture():
    games = [
        dict(htoGameId=gid, workbookGameNumber=359+i,
             date=date, teamGoals=gf, teamGoalsAgainst=ga)
        for i,(gid,date,gf,ga) in enumerate([
            (3356177, "2026-09-20", 0, 3),
            (3356178, "2026-09-27", 3, 6),
            (3369564, "2026-10-04", 2, 3),
            (3375601, "2026-10-18", 1, 7)])
    ]
    feed = {"schema": "brave-hc-hto-verified-game-feed/v1",
            "playerAggregateParity": True, "allGamesDiscovered": True,
            "sourceReadback": "2026-10-21T14:31:14+00:00", "teamGP": 4, "games": games}
    rows = [
        {"season": "W2026/27", "scope": "Regular Season", "date": g["date"],
         "gameNumber": g["workbookGameNumber"], "gf": 0, "ga": 0}
        for g in games
    ]
    readback = {"pages": [{"name": "svhl_brave", "error": "Error: Uncaught"}]}
    return feed,rows,readback


class WatchSourceAuditTests(unittest.TestCase):
    def test_source_error_does_not_become_false_zero(self):
        feed,rows,rb=fixture()
        r=audit(feed,rows,rb)
        self.assertEqual(r["status"], "HTO_ONLY_PARTIAL_NOT_FOR_PUBLICATION")
        self.assertEqual(r["svhlSourceState"], "READBACK_FAILED")
        self.assertEqual(r["officialGameCount"], 4)
        self.assertFalse(r["workbookScoreParity"])
        self.assertFalse(r["fullWatchPublicationAuthorized"])
        self.assertEqual(r["comparisons"][3]["officialFinal"], [1,7])

    def test_unique_explicit_game_ids(self):
        feed,rows,rb=fixture()
        self.assertEqual(tuple(g["htoGameId"] for g in feed["games"]), EXPECTED_COMPLETED_IDS)
        r=audit(feed,rows,rb)
        self.assertEqual([g["workbookGameNumber"] for g in r["comparisons"]], [359,360,361,362])

    def test_future_fifth_game_holds_even_when_discovery_claims_true(self):
        feed,rows,rb=fixture()
        feed["games"].append(dict(htoGameId=3375682, date="2026-10-25",
                                  workbookGameNumber=363, teamGoals=2, teamGoalsAgainst=1))
        feed["teamGP"]=5
        with self.assertRaisesRegex(ValueError,"UNADMITTED_COMPLETED_GAME_ID"):
            audit(feed,rows,rb)

    def test_missing_player_parity_holds(self):
        feed,rows,rb=fixture()
        feed["playerAggregateParity"]=False
        with self.assertRaisesRegex(ValueError,"HTO_COMPLETE_COVERAGE_NOT_VERIFIED"):
            audit(feed,rows,rb)

    def test_missing_game_date_join_holds(self):
        feed,rows,rb=fixture()
        rows.pop()
        with self.assertRaisesRegex(ValueError,"HTO_WORKBOOK_GAME_JOIN_UNVERIFIED"):
            audit(feed,rows,rb)

    def test_false_boolean_goal_is_not_integer_score(self):
        feed,rows,rb=fixture()
        feed["games"][0]["teamGoals"]=False
        with self.assertRaisesRegex(ValueError,"OFFICIAL_FINAL_SCORE_INVALID"):
            audit(feed,rows,rb)

    def test_full_workbook_parity_still_does_not_authorize_publication(self):
        feed,rows,rb=fixture()
        for row,game in zip(rows,feed["games"]):
            row["gf"]=game["teamGoals"]
            row["ga"]=game["teamGoalsAgainst"]
        rb["pages"][0]={"name":"svhl_brave","tables":[]}
        r=audit(feed,rows,rb)
        self.assertTrue(r["workbookScoreParity"])
        self.assertFalse(r["fullWatchPublicationAuthorized"])
        self.assertEqual(r["svhlSourceState"],"TABLES_PRESENT_NOT_INDEPENDENTLY_RECONCILED")

    def test_duplicate_game_id_holds(self):
        feed,rows,rb=fixture()
        feed["games"][1]["htoGameId"]=feed["games"][0]["htoGameId"]
        with self.assertRaisesRegex(ValueError,"MISSING_OR_DUPLICATE_HTO_GAME_ID"):
            audit(feed,rows,rb)

    def test_duplicate_workbook_date_holds(self):
        feed,rows,rb=fixture()
        rows.append(copy.deepcopy(rows[0]))
        with self.assertRaisesRegex(ValueError,"INVALID_OR_DUPLICATE_WORKBOOK_DATE"):
            audit(feed,rows,rb)


if __name__ == "__main__":
    unittest.main()
