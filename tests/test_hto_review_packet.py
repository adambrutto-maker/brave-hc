import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from hto_review_packet import render_review, game_link, safe

OLD = {
    "date": "2026-11-01", "time": "20:15", "opponent": "Mid Ice Crisis",
    "rink": "D Rink", "side": "away", "htoGameId": "3375683"
}
NEW = {
    "date": "2026-11-01", "time": "21:15", "opponent": "Mid Ice Crisis",
    "rink": "A Rink", "side": "away"
}

class ReviewPacketTests(unittest.TestCase):
    def test_match_produces_no_correction_issue(self):
        self.assertEqual(render_review([{"action":"MATCH","svhl":NEW,"hto":OLD,"changes":{}}]), "")

    def test_time_and_rink_changes_produce_explicit_old_new_fields(self):
        queue=[{"action":"EDIT_HTO","svhl":NEW,"hto":OLD,
                "changes":{"time":{"hto":"20:15","svhl":"21:15"},
                           "rink":{"hto":"D Rink","svhl":"A Rink"}}}]
        packet=render_review(queue)
        self.assertIn("HTO game 3375683", packet)
        self.assertIn("20:15 → 21:15",packet)
        self.assertIn("D Rink → A Rink",packet)
        self.assertIn("Preserve the existing HTO game ID",packet)
        self.assertIn("No HTO records",packet)
        self.assertNotIn("New Game and record",packet)

    def test_new_fixture_warns_before_adding(self):
        queue=[{"action":"ADD_HTO","svhl":NEW,"hto":None,"changes":{}}]
        text=render_review(queue)
        self.assertIn("No existing HTO ID",text)
        self.assertIn("Search the complete 2026/27 HTO schedule",text)
        self.assertIn("No HTO records",text)

    def test_stale_hto_only_does_not_authorize_deletion(self):
        text=render_review([{"action":"REVIEW_HTO_ONLY","svhl":None,"hto":OLD,"changes":{}}])
        self.assertIn("Investigate HTO-only game",text)
        self.assertIn("do not delete scored",text.lower())

    def test_identity_review_requires_human_verification(self):
        text=render_review([{"action":"REVIEW_IDENTITY","svhl":NEW,"hto":OLD,
                            "changes":{"opponent":{"hto":"Old Opponent","svhl":"New Opponent"}}}])
        self.assertIn("Verify opponent or game identity",text)
        self.assertIn("Old Opponent → New Opponent",text)

    def test_unverified_id_has_no_generated_link(self):
        self.assertNotIn("gameID=",game_link({"htoGameId":"7<script>"}))

    def test_escape_provider_markdown(self):
        self.assertEqual(safe("Team | [unsafe]\n<script>"),"Team unsafe script ")
        text=render_review([{"action":"ADD_HTO","svhl":{**NEW,"opponent":"[click](http://bad)"},
                            "hto":None,"changes":{}}])
        self.assertNotIn("[click]",text)
        self.assertNotIn("http://bad",text.split("### 1.")[1].split("**HTO record:**")[0])

    def test_unknown_action_fails_closed(self):
        with self.assertRaises(ValueError):
            render_review([{"action":"MASS_DELETE","svhl":NEW,"hto":OLD,"changes":{}}])

if __name__=="__main__":
    unittest.main(verbosity=2)
