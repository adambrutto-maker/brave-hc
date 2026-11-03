"""Independent archive register completeness, identity and non-publication tests."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import json,unittest

import build_hto_2025_26_archive_review_index as app

class HistoricalSeasonArchiveRegisterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index=json.loads(app.OUT_JSON.read_text(encoding="utf8"))
        cls.source=json.loads(app.AUDIT.read_text(encoding="utf8"))
        cls.games={x["gameId"]:x for x in cls.index["games"]}

    def test_unique_27_game_ledger(self):
        self.assertEqual(self.index["gamesTotal"],27)
        self.assertEqual(self.index["playedGamesVerified"],24)
        self.assertEqual(len(self.index["games"]),24)
        self.assertEqual(len(self.index["forfeits"]),3)
        self.assertEqual(len(set(self.games)|{x["gameId"] for x in self.index["forfeits"]}),27)

    def test_review_grade_partition(self):
        grades=Counter(x["evidenceGrade"] for x in self.index["games"])
        self.assertEqual(grades,{"FULL_GAME_EVENTS_AND_SKATERS":5,
                                 "SCOREBOARD_AND_SKATERS_ONLY":18,
                                 "EVENTS_WITH_PARTIAL_PLAYER_STATS":1})

    def test_explicit_not_published_and_no_auto_authorization(self):
        self.assertEqual(self.index["newRetrospectiveArticlesPublished"],0)
        self.assertEqual(self.index["reviewDecision"],"NOT_APPROVED_FOR_PUBLICATION")
        self.assertEqual(self.index["historicalNativeSourceFieldBackupStatus"],"NOT_YET_INSPECTED")
        self.assertIn("2215008",self.index["archivedGameEditorAccess"])
        self.assertIn("HTO_SUPPORT",self.index["supportDecisionRequired"])
        self.assertTrue(all(not g["nativeSummaryPublicationVerified"] for g in self.index["games"]))

    def test_source_editor_review_draft_files_exist(self):
        for item in self.index["games"]:
            file=app.BASE/item["file"]
            self.assertTrue(file.is_file(),str(item["gameId"]))
            self.assertEqual(sha256(file.read_bytes().replace(b"\r\n",b"\n")).hexdigest(),
                             item["fileSHA256"],str(item["gameId"]))
            self.assertIn("REVIEW_DRAFT_NOT_APPROVED",item["editorialStatus"])

    def test_full_event_individual_review_wave_is_preserved(self):
        full={x["gameId"] for x in self.index["games"]
              if x["evidenceGrade"]=="FULL_GAME_EVENTS_AND_SKATERS"}
        self.assertEqual(full,{2215008,2215010,2215011,2215013,2215015})
        self.assertTrue(all(self.games[i]["file"].startswith("editorial_review/") for i in full))

    def test_march22_overtime_is_separate_game(self):
        a=self.games[2215014]
        b=self.games[2215015]
        self.assertEqual(a["date"],b["date"])
        self.assertEqual(a["gameType"],"PLAYOFFS")
        self.assertEqual(b["gameType"],"PLAYOFFS")
        self.assertEqual((a["goalsFor"],a["goalsAgainst"]),(0,1))
        self.assertEqual((b["goalsFor"],b["goalsAgainst"]),(6,2))
        self.assertNotEqual(a["file"],b["file"])

    def test_three_forfeits_not_a_zero_zero_tie(self):
        self.assertEqual({e["gameId"] for e in self.index["forfeits"]},
                         {2215012,2215009,2215007})
        self.assertTrue(all(e["status"]=="ADMINISTRATIVE_FORFEIT_NO_GAME_STORY"
                            for e in self.index["forfeits"]))
        self.assertFalse(set(self.games).intersection({e["gameId"] for e in self.index["forfeits"]}))

    def test_played_games_match_official_result_dates(self):
        audit={g["id"]:g for g in self.source["games"]}
        for game in self.index["games"]:
            src=audit[game["gameId"]]
            self.assertEqual((game["date"],game["opponent"],game["goalsFor"],game["goalsAgainst"]),
                             (src["date"],src["opponentRaw"],src["gf"],src["ga"]))
            self.assertTrue(game["HTOUrl"].startswith("https://www.htosports.com/teams/"))
            self.assertIn("gameID="+str(game["gameId"]),game["HTOUrl"])

    def test_sort_order_is_deterministic(self):
        order=[(x["date"],x["gameId"]) for x in self.index["games"]]
        self.assertEqual(order,sorted(order))

    def test_full_24_live_source_reverification(self):
        short=json.loads(app.NINETEEN_CHECK.read_text(encoding="utf8"))
        full=json.loads(app.FIVE_CHECK.read_text(encoding="utf8"))
        self.assertEqual(short["reconfirmed"],19)
        self.assertEqual(short["held"],0)
        self.assertEqual(full["verifiedGames"],5)

    def test_markdown_index_contains_links_and_controls(self):
        text=app.OUT_MD.read_text(encoding="utf8")
        self.assertIn("NO NEW RETROSPECTIVE GAME SUMMARY PUBLISHED BY THIS PROJECT",text)
        self.assertIn("not 0–0 ties",text)
        self.assertIn("blank public boxscore page",text)
        for g in self.index["games"]:
            self.assertIn("#"+str(g["gameId"]),text)
            self.assertIn(g["file"],text)
        self.assertIn("[Machine-readable review index](review_index.json)",text)

    def test_current_season_success_kept_separate(self):
        self.assertIn("six summaries and one preview",self.index["currentSeasonSeparate"])
        self.assertEqual(self.index["newRetrospectiveArticlesPublished"],0)

    def test_no_public_page_or_media_write_in_builder(self):
        source=Path(app.__file__).read_text(encoding="utf8")
        for forbidden in ("requests.post(","requests.put(","git push","firebase deploy","LiveBarn(","<iframe"):
            self.assertNotIn(forbidden,source)

if __name__=="__main__":
    unittest.main(verbosity=2)
