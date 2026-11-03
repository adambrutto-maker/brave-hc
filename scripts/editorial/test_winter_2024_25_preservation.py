"""Source controls for the Winter 2024–25 native HTO editorial preservation audit."""
import json
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SOURCE=Path(__file__).resolve().parents[2]/"docs"/"editorial"/"native_hto"/"2024-25"/"261103_Winter2024_25_Public_Source_Preservation_v2.json"

class HistoricalPreservationAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads(SOURCE.read_text(encoding="utf-8"))
        cls.games=cls.data["games"]

    def test_source_counts_and_no_publication(self):
        d=self.data
        self.assertEqual(d["status"],"REVIEW_ONLY_OFFICIAL_SCORES_MATCHED_NO_EDITOR_WRITES")
        self.assertEqual((d["totalOfficialGames"],d["playedGames"],d["administrativeForfeits"]),(26,25,1))
        self.assertEqual(d["officialBoxscoreParityPassing"],26)
        self.assertEqual(len(self.games),26)
        self.assertEqual({x["editorialStatus"] for x in self.games},{"RESEARCH_ONLY_NO_PUBLICATION_AUTHORIZED"})

    def test_corrected_content_classification(self):
        d=self.data
        self.assertEqual(d["categoryCounts"],{
            "ORIGINAL_EDITORIAL_NARRATIVE_PRESENT":1,"ORIGINAL_SCORING_OR_GAME_EVENT_TABLE_ONLY":7,
            "ORIGINAL_NATIVE_MEDIA_ONLY":16,"NATIVE_RECAP_NOT_PUBLICLY_VISIBLE":2})
        self.assertIn("misidentified seven statistical/event tables as prose",d["importantCorrection"])
        self.assertEqual(sum(x["originalVideos"] for x in self.games),15)
        self.assertEqual(sum(x["originalImages"] for x in self.games),5)
        self.assertEqual([x["gameId"] for x in self.games if x["publicNativeContentCategory"]=="ORIGINAL_EDITORIAL_NARRATIVE_PRESENT"],[2148133])

    def test_no_duplicate_and_forfeit_is_administrative(self):
        ids=[x["gameId"] for x in self.games]
        self.assertEqual(len(set(ids)),26)
        f=[x for x in self.games if x["result"]=="ADMINISTRATIVE_FORFEIT"]
        self.assertEqual(len(f),1)
        self.assertEqual((f[0]["gameId"],f[0]["date"],f[0]["opponent"]),(2148155,"2025-02-16","Don's Cherries"))
        self.assertEqual(f[0]["publicNativeContentCategory"],"ORIGINAL_NATIVE_MEDIA_ONLY")

    def test_held_empty_public_recaps_are_both_separate_playoffs(self):
        missing=[x for x in self.games if x["publicNativeContentCategory"]=="NATIVE_RECAP_NOT_PUBLICLY_VISIBLE"]
        self.assertEqual({x["gameId"] for x in missing},{2148162,2148163})
        self.assertEqual(self.data["heldMissingPublicRecaps"],[2148162,2148163])
        self.assertEqual({x["gameType"] for x in missing},{"PLAYOFFS"})
        self.assertEqual({(x["bravesGoals"],x["opponentGoals"]) for x in missing},{(2,3),(0,3)})

    def test_score_period_and_html_evidence(self):
        for x in self.games:
            with self.subTest(id=x["gameId"]):
                self.assertEqual(x["officialPeriodParity"],"PASS")
                self.assertTrue(0<=x["bravesGoals"]<=30)
                self.assertTrue(0<=x["opponentGoals"]<=30)
                self.assertEqual(len(x["publicBoxscoreHTMLSHA256"]),64)
                if x["publicNativeContentCategory"]=="NATIVE_RECAP_NOT_PUBLICLY_VISIBLE":
                    self.assertIsNone(x["sourceRecapHTMLSHA256"])
                else:
                    self.assertEqual(len(x["sourceRecapHTMLSHA256"]),64)

    def test_verifiable_archived_historical_links(self):
        for x in self.games:
            with self.subTest(id=x["gameId"]):
                u=urlparse(x["publicHTOURL"])
                q=parse_qs(u.query)
                self.assertEqual((u.scheme,u.hostname,u.path),("https","www.htosports.com","/teams/default.asp"))
                self.assertEqual(q["gameID"],[str(x["gameId"])])
                self.assertEqual(q["viewseas"],["Winter_2024/2025"])
                self.assertEqual(q["u"],["BRAVESHOCKEY"])
                self.assertEqual(q["p"],["boxscore"])
                self.assertEqual(q["archTog"],["1"])

    def test_public_audit_is_metadata_only(self):
        required={"gameId","date","gameType","opponent","bravesGoals","opponentGoals",
                  "publicNativeContentCategory","sourceRecapHTMLSHA256","publicHTOURL"}
        self.assertTrue(all(required.issubset(set(x)) for x in self.games))
        self.assertTrue(all("articleText" not in x and "html" not in x for x in self.games))
        self.assertFalse(self.data.get("published",False))

    def test_unapproved_playoff_drafts_are_identity_and_source_gated(self):
        home=SOURCE.parent/"review_drafts"
        for gid, filename, date, score in (
            (2148162,"20250330_HTO_2148162_Preview_NotForPublication.md","March 30, 2025","3–2"),
            (2148163,"20250406_HTO_2148163_Preview_NotForPublication.md","April 6, 2025","3–0"),
        ):
            with self.subTest(game=gid):
                path=home/filename
                self.assertTrue(path.exists(),str(path))
                article=path.read_text(encoding="utf-8")
                self.assertIn("RESEARCH DRAFT, NOT APPROVED OR PUBLISHED",article)
                self.assertIn(str(gid),article)
                self.assertIn(date,article)
                self.assertIn(score,article)
                self.assertIn("original",article.lower())
                self.assertIn("No Founder approval to publish",article) if gid==2148163 else self.assertIn("No approval to publish",article)
        april=(home/"20250406_HTO_2148163_Preview_NotForPublication.md").read_text(encoding="utf-8")
        self.assertIn("goalie row lists Stephen Logue with **two goals against**",april)
        self.assertIn("does not establish an empty-net goal",april)

if __name__=="__main__":
    unittest.main()
