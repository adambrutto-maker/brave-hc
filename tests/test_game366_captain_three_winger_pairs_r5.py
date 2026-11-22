"""Owner-approved exact Game 366 line slots and preferred intact winger pairs."""
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import verify_brave_hc_captain_lineup as v
class Game366ThreePairs(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rule=v.load(v.RULES)
  cls.r5=v.load(v.ASSETS/"game-366-2026-11-15-working-r5.lineup.json")
  cls.r4=v.load(v.ASSETS/"game-366-2026-11-15-working-r4.lineup.json")
 def setUp(self):self.doc=copy.deepcopy(self.r5)
 def check(self,asset=False):return v.validate(self.doc,self.rule,check_public=True,check_assets=asset)
 def pair_order(self):return [[x["LW"]["name"],x["RW"]["name"]] for x in self.doc["forwards"]]
 def test_01_exact_user_pairs_and_slots(self):
  self.assertEqual(self.pair_order(),[
   ["Kong, Henry","Pearsoll, Keith"],
   ["Provenzano, Michael","Povegliano, Adam"],
   ["Pavaday, Damien","Rosenberg, Jamie"]])
  self.assertEqual(self.pair_order(),self.rule["wingers"]["game366PairSlotOrder20261115"])
 def test_02_two_centres_no_third(self):
  self.assertEqual(self.doc["centreRotation"],["Carosi, Justin","Saindon, Stephane"])
  self.assertEqual([x["C"]["name"] if x["C"] else None for x in self.doc["forwards"]],
                   ["Carosi, Justin","Saindon, Stephane",None])
 def test_03_defence_unchanged(self):
  self.assertEqual(self.doc["defence"],self.r4["defence"])
 def test_04_goalie_unchanged(self):
  self.assertEqual(self.doc["goalie"],self.r4["goalie"])
 def test_05_number_and_name_stable(self):
  self.assertEqual(self.doc["forwards"][2]["LW"]["displayText"],"#0 - Pavaday, Damien")
  self.assertEqual(self.doc["defence"][1]["LD"]["displayText"],"#59 - Carosi, Aaron")
 def test_06_every_player_font_uniform(self):
  self.assertEqual(self.doc["printSpec"]["allPlayerCellsSameFontSizePx"],58)
  self.assertFalse(self.doc["printSpec"]["independentFontShrinkApplied"])
  self.assertEqual(self.check(asset=True)["nameFontPx"],58)
 def test_07_historical_game366_r5_remains_immutable_and_source_verified(self):
  self.assertEqual(self.doc["officialHTOGameId"],"3375685")
  self.assertEqual(self.doc["status"],"FINAL_TEAM_LINEUP")
  self.assertEqual(self.check(asset=True)["status"],"PASS_CAPTAIN_HARD_RULES")
 def test_08_old_history_still_exists_and_qualifies(self):
  self.assertEqual(v.validate(self.r4,self.rule,check_public=True,check_assets=True)["status"],
                   "PASS_CAPTAIN_HARD_RULES")
 def test_09_wrong_partner_swap_refused(self):
  self.doc["forwards"][0]["RW"],self.doc["forwards"][2]["RW"]=(
   self.doc["forwards"][2]["RW"],self.doc["forwards"][0]["RW"])
  with self.assertRaisesRegex(v.CaptainRulesHold,"CAPTAIN_PREFERRED_WINGER_PAIR_SPLIT"):
   self.check()
 def test_10_pair_slots_swapped_refused_even_if_buddies_together(self):
  self.doc["forwards"][0]["LW"],self.doc["forwards"][1]["LW"]=(
   self.doc["forwards"][1]["LW"],self.doc["forwards"][0]["LW"])
  self.doc["forwards"][0]["RW"],self.doc["forwards"][1]["RW"]=(
   self.doc["forwards"][1]["RW"],self.doc["forwards"][0]["RW"])
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME366_CAPTAIN_LINE_SLOT_ROTATION_BROKEN"):
   self.check()
 def test_11_buddy_pair_kept_and_all_three_lines_distinct(self):
  ps=self.pair_order()
  self.assertEqual(len({frozenset(x) for x in ps}),3)
  self.assertEqual(len({name for x in ps for name in x}),6)
 def test_12_no_claim_of_measured_ice_minutes(self):
  self.assertFalse(self.doc["currentRotationUsedVerifiedActualIceTime"])
  self.assertIn("NOT measured ice time",self.doc["rotationContext"])
 def test_13_source_frame_and_privacy(self):
  self.assertEqual((self.doc["gameId"],self.doc["officialHTOGameId"]),("366","3375685"))
  self.assertFalse(self.doc["namedPollVotesIncluded"])
  self.assertFalse(self.doc["privateWhatsAppGroupContentIncluded"])
 def test_14_centre_rotation_wrong_order_rejected(self):
  self.doc["forwards"][0]["C"],self.doc["forwards"][1]["C"]=(
   self.doc["forwards"][1]["C"],self.doc["forwards"][0]["C"])
  self.doc["centreRotation"]=["Saindon, Stephane","Carosi, Justin"]
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME366_CENTRE_ROTATION_ORDER_BROKEN"):
   self.check()
 def test_15_changed_public_role_tag_refused(self):
  self.doc["forwards"][2]["LW"]["displayText"]="#0 - Pavaday, Damien (DI)"
  with self.assertRaisesRegex(v.CaptainRulesHold,"FORBIDDEN_VISIBLE_STATUS_LABEL"):
   self.check()
 def test_16_public_card_unapproved_refused(self):
  self.doc["userManagerApproved"]=False
  with self.assertRaisesRegex(v.CaptainRulesHold,"CAPTAIN_FINAL_APPROVAL_NOT_GRANTED"):
   self.check()
if __name__=="__main__":unittest.main()
