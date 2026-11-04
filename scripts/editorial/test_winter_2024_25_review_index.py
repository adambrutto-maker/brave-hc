"""Static review index QA: every historical HTO game has appropriate, safe editorial disposition."""
import json,re,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/"docs"/"editorial"/"native_hto"/"2024-25"
DOC=(ROOT/"REVIEW_INDEX.md").read_text(encoding="utf-8")
AUDIT=json.loads((ROOT/"261103_Winter2024_25_Public_Source_Preservation_v2.json").read_text(encoding="utf-8"))

class HistoricalIndexTests(unittest.TestCase):
    def test_exact_26_game_ids_without_duplicates(self):
        ids=[int(x) for x in re.findall(r"^\| 20\d{2}-\d{2}-\d{2} \| \[(\d+)\]\(",DOC,re.M)]
        self.assertEqual(len(ids),26)
        self.assertEqual(len(set(ids)),26)
        self.assertEqual(set(ids),{x["gameId"] for x in AUDIT["games"]})

    def test_twenty_four_draft_links_exist(self):
        files=re.findall(r"\[Unapproved draft\]\(review_drafts/([^\)]+\.md)\)",DOC)
        self.assertEqual(len(files),24)
        self.assertEqual(len(set(files)),24)
        for fn in files:
            with self.subTest(file=fn):
                self.assertTrue((ROOT/"review_drafts"/fn).is_file())

    def test_original_article_and_forfeit_protected(self):
        rows={int(re.search(r"\[(\d+)\]",line).group(1)):line for line in DOC.splitlines() if re.match(r"\| 20\d{2}-",line)}
        self.assertIn("Existing contemporary native article — preserve",rows[2148133])
        self.assertIn("Administrative forfeit",rows[2148155])
        self.assertIn("1–0 SVHL W",rows[2148155])
        self.assertIn("0–0 HTO",rows[2148155])
        self.assertNotIn("Unapproved draft",rows[2148133])
        self.assertNotIn("Unapproved draft",rows[2148155])
        self.assertIn("goalie discrepancy HOLD",rows[2148163])

    def test_release_boundaries_written(self):
        self.assertIn("RESEARCH / EDITORIAL REVIEW ONLY",DOC)
        self.assertIn("no new Winter 2024–25 HTO recaps published",DOC)
        self.assertIn("23 of 23",DOC)
        self.assertIn("24",DOC)
        self.assertIn("video observations have been invented",DOC)
        self.assertIn("Founder editorial sign-off",DOC)

if __name__=="__main__":
    unittest.main()
