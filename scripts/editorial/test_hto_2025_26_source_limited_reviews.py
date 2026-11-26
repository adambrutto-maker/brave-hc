"""Fail-closed independent tests for Winter 2025/26 source-limited reviews."""
from collections import Counter
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json,re,unittest

import build_hto_2025_26_source_limited_reviews as app

class SourceLimited2025ReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit=json.loads(app.AUDIT.read_text(encoding="utf8"))
        cls.recheck=json.loads(app.RECHECK.read_text(encoding="utf8"))
        cls.original=json.loads(app.ORIGINAL.read_text(encoding="utf8"))
        cls.manifest=json.loads((app.OUTPUT/"review_manifest.json").read_text(encoding="utf8"))
        cls.gamemap={g["id"]:g for g in cls.audit["games"]}
        cls.reviewmap={g["gameId"]:g for g in cls.manifest["games"]}

    def test_19_live_official_boxscores_reconfirmed(self):
        self.assertEqual(self.recheck["attemptedGames"],19)
        self.assertEqual(self.recheck["reconfirmed"],19)
        self.assertEqual(self.recheck["held"],0)
        self.assertTrue(all(g["status"]=="PUBLIC_SOURCE_RECONFIRMED"
                            and not g["checks"] for g in self.recheck["games"]))

    def test_source_coverage_18_regular_and_1_overtime(self):
        self.assertEqual(len(self.manifest["games"]),19)
        self.assertEqual(len(self.reviewmap),19)
        self.assertEqual(dict(Counter(g["sourceGrade"] for g in self.manifest["games"])),
                         {app.SHORT:18,app.OT:1})

    def test_all_24_played_games_have_a_review(self):
        prior={e["gameId"] for e in json.loads(
            (app.DIR/"editorial_review/manifest.json").read_text(encoding="utf8"))["entries"]}
        self.assertEqual(len(prior),5)
        self.assertFalse(prior.intersection(self.reviewmap))
        allids=prior|set(self.reviewmap)
        expected={g["id"] for g in self.audit["games"]
                  if g["auditStatus"]!="FORFEIT_ONLY_NO_ON_ICE_RECAP"}
        self.assertEqual(len(allids),24)
        self.assertEqual(allids,expected)

    def test_three_forfeits_not_story_files(self):
        forfeits={g["id"] for g in self.audit["games"]
                  if g["auditStatus"]=="FORFEIT_ONLY_NO_ON_ICE_RECAP"}
        self.assertEqual(forfeits,{2215012,2215009,2215007})
        self.assertFalse(forfeits.intersection(self.reviewmap))
        self.assertTrue(all("FORFEIT" not in x["headline"].upper() for x in self.manifest["games"]))

    def test_all_review_files_have_correct_date_id_score_and_source(self):
        for entry in self.manifest["games"]:
            gid=entry["gameId"];g=self.gamemap[gid]
            p=app.OUTPUT/entry["file"]
            self.assertTrue(p.is_file(),str(gid))
            s=p.read_text(encoding="utf8")
            self.assertTrue(s.startswith("# "+entry["headline"]),str(gid))
            self.assertIn(str(gid),s)
            self.assertIn(app.date_str(g["date"]),s)
            self.assertIn(app.result(g["gf"],g["ga"]),s)
            self.assertIn(g["boxscoreURL"],s)
            self.assertIn(entry["sourceFingerprint"],s)
            self.assertIn(entry["recheckFingerprint"],s)

    def test_source_file_sha256s_match_canonical_committed_bytes(self):
        for entry in self.manifest["games"]:
            contents=(app.OUTPUT/entry["file"]).read_bytes().replace(b"\r\n",b"\n")
            self.assertEqual(sha256(contents).hexdigest(),entry["fileSHA256"],str(entry["gameId"]))
        for key,path in (("sourceAuditSHA256",app.AUDIT),
                         ("reverificationSHA256",app.RECHECK)):
            self.assertEqual(sha256(path.read_bytes().replace(b"\r\n",b"\n")).hexdigest(),
                             self.manifest[key])

    def test_all_stories_marked_not_published(self):
        self.assertEqual(self.manifest["publicationStatus"],"DRAFTS_ONLY_NO_NATIVE_HTO_WRITES")
        for entry in self.manifest["games"]:
            self.assertFalse(entry["published"])
            self.assertFalse(entry["nativePublicationAuthorized"])
            contents=(app.OUTPUT/entry["file"]).read_text(encoding="utf8")
            self.assertIn("not an original contemporaneous article",contents)
            self.assertIn("NOT APPROVED OR PUBLISHED TO HTO",contents)

    def test_restricted_games_have_no_unsourced_goal_clock(self):
        for entry in self.manifest["games"]:
            if entry["sourceGrade"]!=app.SHORT:continue
            contents=(app.OUTPUT/entry["file"]).read_text(encoding="utf8")
            opening=contents.split("## Historical game account",1)[1].split("## Source and editorial limitations",1)[0]
            self.assertNotRegex(opening,r"\b\d{1,2}:\d{2}\b",str(entry["gameId"]))
            self.assertNotIn("power-play goal",opening.lower())
            self.assertNotIn("empty-net goal",opening.lower())
            self.assertNotIn("save percentage",opening.lower())

    def test_skater_stats_and_goals_reconcile_for_all_eighteen(self):
        for entry in self.manifest["games"]:
            if entry["sourceGrade"]!=app.SHORT:continue
            game=self.gamemap[entry["gameId"]]
            app.grade_and_periods(game)
            app.production(game)
            self.assertEqual(sum(p["G"] for p in game["players"]),game["gf"])
            self.assertTrue(all(p["G"]+p["A"]==p["Pts"] for p in game["players"]))

    def test_overtime_has_source_limited_scorer_and_goalie_credit(self):
        game=self.gamemap[2215014]
        story=app.overtime_story(game)
        full=" ".join(story)
        self.assertIn("scoreless through all three regulation periods",full)
        self.assertIn("1:05",full)
        self.assertIn("does not identify the scorer",full)
        self.assertIn("Matt Svec",full)
        self.assertIn("one goal against",full)
        self.assertEqual(self.reviewmap[2215014]["gameType"],"PLAYOFFS")

    def test_same_day_playoff_games_not_merged(self):
        self.assertEqual(self.gamemap[2215014]["date"],"2026-03-22")
        self.assertEqual(self.gamemap[2215015]["date"],"2026-03-22")
        self.assertIn(2215014,self.reviewmap)
        self.assertNotIn(2215015,self.reviewmap)
        self.assertTrue((app.DIR/"editorial_review/20260322_HTO_2215015_EDITORIAL_REVIEW.md").exists())

    def test_december_comeback_and_three_goal_table(self):
        g=self.gamemap[2215000]
        self.assertEqual((g["gf"],g["ga"]),(5,3))
        self.assertEqual([(x["braves"],x["opponent"]) for x in g["periods"]],
                         [(2,1),(0,2),(3,0)])
        self.assertIn("entered the third behind",app.source_turn(g))
        self.assertEqual(next(p for p in g["players"] if p["name"]=="Arruda, Mark")["G"],3)

    def test_six_goal_opening_period_is_score_verified(self):
        g=self.gamemap[2214996]
        self.assertEqual((g["periods"][0]["braves"],g["gf"]),(6,7))
        self.assertIn("6 opening-period Braves goals",app.distinctive_fact(g))
        self.assertNotIn("goal at",app.distinctive_fact(g))

    def test_scoreline_does_not_credit_unverified_goalie_shutout(self):
        g=self.gamemap[2215002]
        self.assertEqual((g["gf"],g["ga"]),(7,0))
        self.assertIn("does not verify an individual goalie shutout",app.distinctive_fact(g))

    def test_mutated_period_goals_fail_closed(self):
        g=deepcopy(self.gamemap[2215000])
        g["periods"][1]["braves"]+=2
        with self.assertRaisesRegex(ValueError,"PERIOD_TOTAL_NOT_FINAL"):
            app.grade_and_periods(g)

    def test_mutated_player_point_totals_fail_closed(self):
        g=deepcopy(self.gamemap[2215000])
        g["players"][0]["Pts"]+=1
        with self.assertRaisesRegex(ValueError,"PLAYER_POINT_PARITY"):
            app.production(g)

    def test_mutated_overtime_credit_fails_closed(self):
        g=deepcopy(self.gamemap[2215014])
        g["events"][0]["credit"]="99 Invented Scorer"
        with self.assertRaisesRegex(ValueError,"OVERTIME_EVENT_SOURCE_CONFLICT"):
            app.overtime_story(g)

    def test_refuse_forfeit_into_article(self):
        g=next(x for x in self.audit["games"] if x["id"]==2215012)
        with self.assertRaisesRegex(ValueError,"UNKNOWN_SOURCE_GRADE"):
            app.paragraphs(g)

    def test_no_web_or_native_write_in_generator(self):
        source=Path(app.__file__).read_text(encoding="utf8")
        self.assertNotIn("requests.post(",source)
        self.assertNotIn("requests.put(",source)
        self.assertNotIn("git push",source)
        self.assertNotIn("firebase deploy",source)
        self.assertNotIn("mcp__Remote",source)

if __name__=="__main__":
    unittest.main(verbosity=2)
