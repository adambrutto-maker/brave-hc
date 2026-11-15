"""Brave H.C. captain hard-rules tests. All cases source-only, no site writes."""
from __future__ import annotations
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import verify_brave_hc_captain_lineup as v
class CaptainLineupPolicyQA(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.policy=v.load(v.RULES)
  cls.source=v.load(v.ASSETS/"game-366-2026-11-15-working-r3.lineup.json")
 def setUp(self):
  self.doc=copy.deepcopy(self.source)
 def check(self,assets=False):
  return v.validate(self.doc,self.policy,check_assets=assets,check_public=False)
 def test_01_approved_current_release_valid(self):
  self.assertEqual(self.check(assets=True)["status"],"PASS_CAPTAIN_HARD_RULES")
 def test_02_michael_stays_with_adam_when_mario_out(self):
  self.assertEqual({self.doc["forwards"][1]["LW"]["name"],self.doc["forwards"][1]["RW"]["name"]},
                   {"Provenzano, Michael","Povegliano, Adam"})
 def test_03_forged_michael_keith_pair_refused(self):
  self.doc["forwards"][1]["RW"],self.doc["forwards"][2]["RW"]=self.doc["forwards"][2]["RW"],self.doc["forwards"][1]["RW"]
  with self.assertRaisesRegex(v.CaptainRulesHold,"BUDDY_PAIR_BROKEN"):self.check()
 def test_04_broken_kong_jamie_pair_cannot_claim_current_approved_card(self):
  self.assertEqual({self.doc["forwards"][0]["LW"]["name"],self.doc["forwards"][0]["RW"]["name"]},
                   {"Kong, Henry","Rosenberg, Jamie"})
 def test_05_aaron_number_59(self):
  p=self.doc["defence"][1]["LD"]
  self.assertEqual((p["name"],p["jerseyNumber"]),("Carosi, Aaron","59"))
 def test_06_aaron_jersey_error_is_refused(self):
  p=self.doc["defence"][1]["LD"]
  p["jerseyNumber"]="0";p["displayText"]="#0 - Carosi, Aaron"
  with self.assertRaisesRegex(v.CaptainRulesHold,"JERSEY_OVERRIDE_WRONG"):self.check()
 def test_07_unrelated_internal_DI_label_blocked(self):
  self.doc["forwards"][2]["LW"]["displayText"]="Pavaday, Damian (DI)"
  with self.assertRaisesRegex(v.CaptainRulesHold,"VISIBLE_STATUS_LABEL"):self.check()
 def test_08_unrelated_internal_CU_label_blocked(self):
  self.doc["defence"][1]["RD"]["displayText"]="#15 - Rajasooriar, Krishnan (CU)"
  with self.assertRaisesRegex(v.CaptainRulesHold,"VISIBLE_STATUS_LABEL"):self.check()
 def test_09_unrelated_internal_FD_label_blocked(self):
  self.doc["forwards"][0]["LW"]["displayText"]="#34 - Kong, Henry (F/D)"
  with self.assertRaisesRegex(v.CaptainRulesHold,"VISIBLE_STATUS_LABEL"):self.check()
 def test_10_mismatched_name_font_refused(self):
  self.doc["forwards"][0]["LW"]["playerFontPx"]=45
  with self.assertRaisesRegex(v.CaptainRulesHold,"INCONSISTENT_PLAYER_NAME_FONT"):self.check()
 def test_11_individual_shrink_refused(self):
  self.doc["printSpec"]["independentFontShrinkApplied"]=True
  with self.assertRaisesRegex(v.CaptainRulesHold,"INDEPENDENT_FONT_SHRINK_FORBIDDEN"):self.check()
 def test_12_third_separate_centre_is_illegal(self):
  self.doc["forwards"][2]["C"]=copy.deepcopy(self.doc["forwards"][0]["C"])
  with self.assertRaisesRegex(v.CaptainRulesHold,"DUPLICATE_SKATER"):self.check()
 def test_13_goalie_name_font_must_match(self):
  self.doc["goalie"]["playerFontPx"]=44
  with self.assertRaisesRegex(v.CaptainRulesHold,"INCONSISTENT_PLAYER_NAME_FONT"):self.check()
 def test_14_wrong_pdf_sha_fails(self):
  self.doc["pdf"]["sha256"]="f"*64
  with self.assertRaisesRegex(v.CaptainRulesHold,"PUBLISHED_PDF_SHA_CHANGED"):self.check(assets=True)
 def test_15_wrong_image_dimensions_hold(self):
  self.doc["printSpec"]["pixelWidth"]=3200
  with self.assertRaisesRegex(v.CaptainRulesHold,"BAD_ORIGINAL_ARTWORK_DIMENSIONS"):self.check()
 def test_16_duplicate_skater_not_allowed(self):
  self.doc["defence"][0]["LD"]=copy.deepcopy(self.doc["forwards"][0]["LW"])
  with self.assertRaisesRegex(v.CaptainRulesHold,"DUPLICATE_SKATER"):self.check()
 def test_17_private_poll_content_not_public(self):
  self.doc["namedPollVotesIncluded"]=True
  with self.assertRaisesRegex(v.CaptainRulesHold,"PRIVATE_POLL_CONTENT_NOT_ALLOWED"):self.check()
 def test_18_centres_swap_order_from_nov8(self):
  self.assertEqual(self.doc["centreRotation"],["Carosi, Justin","Saindon, Stephane"])
 def test_19_full_wing_pairs_and_three_defence_pairs(self):
  self.assertEqual(len(self.doc["forwards"]),3)
  self.assertEqual(len(self.doc["defence"]),3)
  self.assertTrue(all(bool(f["LW"] and f["RW"]) for f in self.doc["forwards"]))
 def test_20_current_public_manifest_matches_contract(self):
  result=v.validate(self.doc,self.policy,check_assets=True,check_public=True)
  self.assertEqual(result["gameId"],"3375685")
if __name__=="__main__":unittest.main()
