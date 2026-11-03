"""Research draft coverage gates for 15 media-only Winter 2024/25 Brave H.C. games."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/"docs"/"editorial"/"native_hto"/"2024-25"
SOURCE=json.loads((ROOT/"261103_Winter2024_25_Public_Source_Preservation_v2.json").read_text(encoding="utf-8"))
MEDIA=json.loads((ROOT/"261103_Fifteen_MediaOnly_Played_Source_Coverage.json").read_text(encoding="utf-8"))
EVENT=json.loads((ROOT/"261103_Seven_Native_HTO_Game_Event_Parity.json").read_text(encoding="utf-8"))
CROSS=json.loads((ROOT/"261103_Winter2024_25_HTO_SVHL_Source_Corroboration.json").read_text(encoding="utf-8"))

class MediaOnlyRecapTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit={g["gameId"]:g for g in SOURCE["games"]}
        cls.games=MEDIA["games"]
        cls.draftdir=ROOT/"review_drafts"

    def test_fifteen_verified_played_media_only_games(self):
        self.assertEqual(MEDIA["schema"],"brave-hc-winter-2024-25-media-only-played-game-source-coverage/v1")
        self.assertEqual(len(self.games),15)
        self.assertEqual(len({g["gameId"] for g in self.games}),15)
        self.assertEqual({g["sourceStatus"] for g in self.games},{"PLAYER_GOALS_PARITY_PASS"})
        self.assertTrue(MEDIA["originalMediaMustRemainUntouched"])
        self.assertEqual(sum(g["originalVideoEmbeds"] for g in self.games),15)

    def test_goals_from_individual_hto_match_final(self):
        for g in self.games:
            with self.subTest(id=g["gameId"]):
                self.assertEqual(g["score"]["braves"],sum(x["goals"] for x in g["creditedPlayers"]))
                self.assertGreaterEqual(g["score"]["braves"],1)
                self.assertEqual(g["gameGoalTotalVsSkaters"],[g["score"]["braves"],g["score"]["braves"]])
                self.assertEqual(g["sourceGrade"],"SCORE_PERIOD_SKATER_TOTALS_NOT_SCORING_EVENTS")
                self.assertGreaterEqual(g["playerRows"],8)

    def test_period_score_totals_match_both_teams(self):
        for g in self.games:
            with self.subTest(id=g["gameId"]):
                self.assertEqual(len(g["periods"]["braves"]),3)
                self.assertEqual(len(g["periods"]["opponent"]),3)
                self.assertEqual(sum(g["periods"]["braves"]),g["score"]["braves"])
                self.assertEqual(sum(g["periods"]["opponent"]),g["score"]["opponent"])

    def test_original_source_hashes_and_legacy_media_preserved(self):
        for g in self.games:
            original=self.audit[g["gameId"]]
            with self.subTest(id=g["gameId"]):
                self.assertEqual(original["publicNativeContentCategory"],"ORIGINAL_NATIVE_MEDIA_ONLY")
                self.assertEqual(g["sourceUrl"],original["publicHTOURL"])
                self.assertEqual(g["publicHTOBoxscoreSHA256"],original["publicBoxscoreHTMLSHA256"])
                self.assertEqual(g["originalRecapSHA256"],original["sourceRecapHTMLSHA256"])
                self.assertEqual(g["originalVideoEmbeds"],original["originalVideos"])
                self.assertEqual(g["originalPhotoCount"],original["originalImages"])
                self.assertEqual(g["result"],original["result"])
                self.assertNotEqual(g["result"],"ADMINISTRATIVE_FORFEIT")

    def test_all_media_only_results_match_independent_svhl(self):
        status={x["htoGameId"]:x for x in CROSS["games"]}
        for g in self.games:
            with self.subTest(id=g["gameId"]):
                row=status[g["gameId"]]
                self.assertEqual(row["status"],"PLAYED_EXACT_DATE_FINAL_SCORE_PARITY")
                self.assertEqual(row["HTOScore"],row["svhlScore"])
                self.assertEqual(row["HTOScore"],[g["score"]["braves"],g["score"]["opponent"]])

    def test_fifteen_review_drafts_are_held_and_source_scoped(self):
        for g in self.games:
            name=f'{g["date"].replace("-","")}_HTO_{g["gameId"]}_SOURCE_LIMITED_REVIEW.md'
            path=self.draftdir/name
            with self.subTest(id=g["gameId"]):
                self.assertTrue(path.exists(),str(path))
                txt=path.read_text(encoding="utf-8")
                self.assertIn("SOURCE-LIMITED EDITORIAL DRAFT, NOT APPROVED OR PUBLISHED",txt)
                self.assertIn(g["sourceUrl"],txt)
                self.assertIn("original native video embed is preserved",txt)
                self.assertIn("NOT a complete goal-event chronology",txt)
                self.assertIn("explicit Founder editorial approval",txt)
                self.assertIn(str(g["gameId"]),txt)
                self.assertGreater(len(txt.split()),140)
                self.assertNotIn("full-time players",txt.lower())
                self.assertNotIn("part-time players",txt.lower())

    def test_all_official_goal_scorers_appear_in_corresponding_review(self):
        for g in self.games:
            txt=(self.draftdir/f'{g["date"].replace("-","")}_HTO_{g["gameId"]}_SOURCE_LIMITED_REVIEW.md').read_text(encoding="utf-8")
            for player in g["creditedPlayers"]:
                if not player["goals"]:continue
                last,first=[t.strip() for t in player["name"].split(",",1)]
                with self.subTest(game=g["gameId"],name=player["name"]):
                    self.assertIn(first+" "+last,txt)

    def test_original_narrative_and_forfeit_excluded(self):
        filenames=[p.name for p in self.draftdir.glob("*.md")]
        self.assertFalse(any("2148133" in p or "2148155" in p for p in filenames))
        self.assertEqual(self.audit[2148133]["publicNativeContentCategory"],"ORIGINAL_EDITORIAL_NARRATIVE_PRESENT")
        self.assertEqual(self.audit[2148155]["result"],"ADMINISTRATIVE_FORFEIT")

    def test_every_other_played_game_has_exactly_one_unapproved_draft(self):
        played={g["gameId"] for g in SOURCE["games"] if g["result"]!="ADMINISTRATIVE_FORFEIT"}
        original={2148133}
        media={g["gameId"] for g in self.games}
        event={g["gameId"] for g in EVENT["games"]}
        playoff={2148162,2148163}
        self.assertEqual(len(played),25)
        self.assertEqual(len(media),15)
        self.assertEqual(len(event),7)
        self.assertEqual(len(playoff),2)
        self.assertFalse(media&event or media&playoff or event&playoff)
        self.assertEqual(media|event|playoff,played-original)
        self.assertEqual(len(played-original),24)
        for gameid in playoff:
            self.assertEqual(self.audit[gameid]["publicNativeContentCategory"],"NATIVE_RECAP_NOT_PUBLICLY_VISIBLE")

if __name__=="__main__":
    unittest.main()
