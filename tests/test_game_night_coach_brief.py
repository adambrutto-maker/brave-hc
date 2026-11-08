"""Fictional/private coach-sheet regression; no public or lineup writes."""
from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import json
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from render_game_night_coach_brief import render,BriefHold

class CoachBriefTests(unittest.TestCase):
    def setUp(self):
        path=(ROOT.parents[0]/"game_night_defence_latest_PRIVATE.json")
        self.doc=json.loads(path.read_text(encoding="utf8"))
    def test_source_verified_fixture_and_targets_render(self):
        result=render(self.doc)
        self.assertIn("Other Way",result)
        self.assertIn("Nov",result.replace("2026-11","Nov"))
        self.assertIn("F1",result)
        self.assertIn("No Brave H.C. player assigned by HockeyOS.",result)
        self.assertIn("Coach approves specific matchup?",result)
        self.assertEqual(result.count("Tactical responsibility to consider:"),4)
    def test_no_mutation(self):
        prev=deepcopy(self.doc)
        render(self.doc)
        self.assertEqual(prev,self.doc)
    def test_no_approval_bypass(self):
        self.doc["anyNamedAssignmentsApproved"]=True
        with self.assertRaisesRegex(BriefHold,"SOURCE_NOT_PRIVATE"):
            render(self.doc)
    def test_named_player_injection_held(self):
        self.doc["reviewTargets"][0]["bravePlayerAssigned"]="Some Player"
        with self.assertRaisesRegex(BriefHold,"UNVERIFIED_TARGET"):
            render(self.doc)
    def test_unverified_opponent_attendance_held(self):
        self.doc["reviewTargets"][0]["opponentConfirmedDressed"]=True
        with self.assertRaisesRegex(BriefHold,"UNVERIFIED_TARGET"):
            render(self.doc)
    def test_unknown_tactical_responsibility_held(self):
        self.doc["reviewTargets"][0]["proposedDefensiveResponsibility"]="GUESS"
        with self.assertRaisesRegex(BriefHold,"UNVERIFIED_TARGET"):
            render(self.doc)
    def test_untrusted_markdown_source_name_held(self):
        self.doc["reviewTargets"][0]["nameAsPublished"]="[link](malicious)"
        with self.assertRaisesRegex(BriefHold,"UNSAFE_SOURCE_TEXT"):
            render(self.doc)
    def test_duplicate_player_held(self):
        self.doc["reviewTargets"][1]["sourcePlayerId"]=self.doc["reviewTargets"][0]["sourcePlayerId"]
        with self.assertRaisesRegex(BriefHold,"DUPLICATE_OR_OVERFLOW"):
            render(self.doc)

if __name__=="__main__":
    unittest.main(verbosity=2)
