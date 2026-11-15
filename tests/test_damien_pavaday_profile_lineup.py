"""Captain spelling+jersey #0 correction: historical source alias and live r4 release.
No HTO admin writes or WhatsApp data in tests.
"""
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import verify_brave_hc_captain_lineup as v
class CorrectDamienPublicLinkAndLineup(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rules=v.load(v.RULES)
  cls.r4=v.load(v.ASSETS/"game-366-2026-11-15-working-r4.lineup.json")
  cls.r3=v.load(v.ASSETS/"game-366-2026-11-15-working-r3.lineup.json")
 def setUp(self):self.doc=copy.deepcopy(self.r4)
 def check(self,*,public=True,assets=False):
  return v.validate(self.doc,self.rules,check_public=public,check_assets=assets)
 def skater(self):return self.doc["forwards"][2]["LW"]
 def test_01_owner_corrected_name(self):
  self.assertEqual(self.skater()["name"],"Pavaday, Damien")
  self.assertNotEqual(self.skater()["name"],"Pavaday, Damian")
 def test_02_explicit_number_zero(self):
  self.assertEqual(self.skater()["jerseyNumber"],"0")
  self.assertEqual(self.skater()["displayText"],"#0 - Pavaday, Damien")
 def test_03_exact_stable_hto_player_id(self):
  self.assertEqual(self.skater()["htoPlayerId"],849368)
  self.assertEqual(self.doc["sourceCorrection"]["htoPlayerId"],849368)
 def test_04_manager_confirmed_name_number_policy(self):
  p=self.rules["playerIdentityCorrections"]["849368"]
  self.assertEqual((p["canonicalName"],p["jerseyNumber"]),("Pavaday, Damien","0"))
  self.assertEqual(self.rules["printing"]["jerseyNumberOverrides"]["Pavaday, Damien"],"0")
 def test_05_manager_correction_public_manifest_points_to_new_assets(self):
  self.assertEqual(self.check(public=True,assets=True)["status"],"PASS_CAPTAIN_HARD_RULES")
 def test_06_spelling_reversion_is_blocked_in_active_card(self):
  p=self.skater();p["name"]="Pavaday, Damian";p["displayText"]="#0 - Pavaday, Damian"
  with self.assertRaisesRegex(v.CaptainRulesHold,"DAMIEN_NAME_JERSEY_OR_HTO_ID_WRONG"):self.check()
 def test_07_wrong_jersey_number_is_blocked(self):
  p=self.skater();p["jerseyNumber"]="1";p["displayText"]="#1 - Pavaday, Damien"
  with self.assertRaisesRegex(v.CaptainRulesHold,"CAPTAIN_JERSEY_OVERRIDE_WRONG"):self.check()
 def test_08_mismatched_identity_link_is_blocked(self):
  self.skater()["htoPlayerId"]=99999
  with self.assertRaisesRegex(v.CaptainRulesHold,"DAMIEN_NAME_JERSEY_OR_HTO_ID_WRONG"):self.check()
 def test_09_typography_same_as_every_player(self):
  self.assertEqual(self.skater()["playerFontPx"],58)
  self.assertEqual(self.doc["printSpec"]["allPlayerCellsSameFontSizePx"],58)
  self.assertIs(self.doc["printSpec"]["independentFontShrinkApplied"],False)
 def test_10_old_private_source_retained_as_historical_not_current(self):
  self.assertEqual(self.r3["forwards"][2]["LW"]["name"],"Pavaday, Damian")
  self.assertEqual(v.validate(self.r3,self.rules,check_public=True,check_assets=True)["status"],"PASS_CAPTAIN_HARD_RULES")
 def test_11_current_public_contract_is_source_bound(self):
  result=v.check_all()
  self.assertEqual(len(result),2)
  self.assertEqual([x["status"] for x in result],["PASS_CAPTAIN_HARD_RULES"]*2)
 def test_12_private_data_not_public(self):
  self.assertFalse(self.doc["namedPollVotesIncluded"])
  self.assertFalse(self.doc["privateWhatsAppGroupContentIncluded"])
 def test_13_whole_pairs_and_centres_untouched(self):
  self.assertEqual(self.doc["centreRotation"],self.r3["centreRotation"])
  for i in range(3):
   for wing in ("LW","RW"):
    if i==2 and wing=="LW":continue
    self.assertEqual(self.doc["forwards"][i][wing],self.r3["forwards"][i][wing])
  self.assertEqual(self.doc["defence"],self.r3["defence"])
  self.assertEqual(self.doc["goalie"],self.r3["goalie"])
 def test_14_no_native_hto_edit_claim(self):
  self.assertEqual(self.doc["sourceCorrection"]["nativeHTOProfileEditState"],"PENDING_AUTHENTICATED_HTO_ADMIN")
if __name__=="__main__":unittest.main()
