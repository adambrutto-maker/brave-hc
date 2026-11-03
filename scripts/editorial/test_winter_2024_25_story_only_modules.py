"""Private staging QA for all 24 Winter 2024/25 story-only review modules."""
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from hashlib import sha256
from bs4 import BeautifulSoup
from build_winter_2024_25_story_only_modules import generate,REPO

SOURCE=REPO/"docs"/"editorial"/"native_hto"/"2024-25"/"261103_Winter2024_25_Public_Source_Preservation_v2.json"

class Private2024StoryReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=TemporaryDirectory(prefix="bravehc_private_review_test_")
        cls.folder=Path(cls.tmp.name)/"NewPrivateOutput"
        cls.result=generate(cls.folder)
        cls.source=json.loads(SOURCE.read_text(encoding="utf-8"))
        cls.byGame={x["gameId"]:x for x in cls.source["games"]}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_all_24_exact_game_candidates_and_unapproved(self):
        m=self.result
        self.assertEqual(m["status"],"24_STORY_MODULES_STAGED_PRIVATE_NOT_NATIVE_PASTE_READY")
        self.assertEqual(len(m["items"]),24)
        self.assertEqual(len({x["gameId"] for x in m["items"]}),24)
        self.assertEqual({x["gameId"] for x in m["items"]}|{2148133,2148155},set(self.byGame))
        self.assertEqual(m["publishedNativeArticlesAdded"],0)
        self.assertFalse(m["founderApprovalRecorded"])
        self.assertFalse(m["originalAuthenticatedEditorFieldsInspectedAndBackedUp"])

    def test_styles_preserve_source_article_and_release_hold(self):
        for x in self.result["items"]:
            with self.subTest(game=x["gameId"]):
                self.assertEqual(x["editorialApproval"],"NOT_APPROVED_FOR_PUBLICATION")
                self.assertFalse(x["publicationSafe"])
                self.assertFalse(x["includesOriginalHTOPhotosVideosOrTables"])
                self.assertFalse(x["nativeEditorFieldInspectedAndBackedUp"])
                raw=(self.folder/x["candidateName"]).read_text(encoding="utf-8")
                self.assertIn("Historical retrospective",raw)
                self.assertIn("reconstructed in November 2026",raw)
                self.assertIn("not contemporaneous reporting",raw)
                self.assertIn("Browse the Brave H.C. Hot Stove archive",raw)
                self.assertIn("background-color:#ffffff",raw)
                self.assertEqual(sha256(raw.encode("utf-8")).hexdigest(),x["styledHtmlSHA256"])

    def test_original_media_and_event_tables_not_reproduced_as_replaceable_fields(self):
        for x in self.result["items"]:
            with self.subTest(game=x["gameId"]):
                soup=BeautifulSoup((self.folder/x["candidateName"]).read_text(encoding="utf-8"),"html.parser")
                for forbidden in ("script","iframe","img","video","table","style","form"):
                    self.assertEqual(len(soup.find_all(forbidden)),0,forbidden)
                self.assertEqual(len(soup.find_all("h2")),1)
                self.assertGreaterEqual(len(soup.find_all("p")),6)
                self.assertEqual(x["originalPublicHTOGameSHA256"],self.byGame[x["gameId"]]["publicBoxscoreHTMLSHA256"])
                self.assertEqual(x["originalPublicNativeRecapSHA256"],self.byGame[x["gameId"]]["sourceRecapHTMLSHA256"])

    def test_manifest_matches_written_24_modules(self):
        mpath=self.folder/"PRIVATE_REVIEW_MANIFEST.json"
        self.assertTrue(mpath.is_file())
        m=json.loads(mpath.read_text(encoding="utf-8"))
        self.assertEqual({x["candidateName"] for x in m["items"]},
                         {p.name for p in self.folder.glob("*_STORY_ONLY_DRAFT.html")})
        self.assertEqual(len(list(self.folder.iterdir())),25)
        self.assertIn("Founder approval",m["nextGate"])
        self.assertIn("inspect/backup",m["nextGate"])

    def test_unsafe_output_directories_are_rejected(self):
        with self.assertRaisesRegex(ValueError,"outside the public GitHub repository"):
            generate(REPO/"unapproved_staged_article_output")
        with self.assertRaisesRegex(ValueError,"already exists"):
            generate(self.folder)
        self.assertEqual(len(list(self.folder.iterdir())),25)

if __name__=="__main__":
    unittest.main()
