"""Game 367 fair-play revision: published starting-slot rotation, never measured ice time."""
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import verify_brave_hc_captain_lineup as v
ASSETS=ROOT/"widgets/assets/lineups"
class Game367FairPlayR3(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rules=v.load(v.RULES)
  cls.old=v.load(ASSETS/"game-367-2026-11-22-working-r2.lineup.json")
  cls.current=v.load(ASSETS/"game-367-2026-11-22-working-r3.lineup.json")
  cls.last=v.load(ASSETS/"game-366-2026-11-15-working-r5.lineup.json")
  cls.manifest=v.load(ROOT/"widgets/game-centre-lineup-public.json")
 def setUp(self):self.c=copy.deepcopy(self.current)
 def check(self):return v.validate(self.c,self.rules,check_assets=True,check_public=True)
 def test_01_current_r3_original_format_and_source(self):
  self.assertEqual(self.check()["status"],"PASS_CAPTAIN_HARD_RULES")
  self.assertEqual(self.c["revision"],3)
  self.assertEqual(self.c["printSpec"]["pixelWidth"],3300)
  self.assertEqual(self.c["printSpec"]["pixelHeight"],2550)
  self.assertTrue(self.c["printSpec"]["source"].startswith("Exact original"))
 def test_02_fair_play_order(self):
  self.assertEqual([[line["LW"]["name"],line["RW"]["name"]] for line in self.c["forwards"]],
  self.rules["wingers"]["game367FairRotationPairSlotOrder20261122"])
 def test_03_unchanged_people_defence_goalie(self):
  def names(doc):return sorted(x["name"] for f in doc["forwards"] for x in [f["LW"],f["RW"],f["C"]] if x)
  self.assertEqual(names(self.c),names(self.old))
  self.assertEqual(self.c["defence"],self.old["defence"])
  self.assertEqual(self.c["goalie"],self.old["goalie"])
 def test_04_no_repeat_last_week_for_returning_wingers(self):
  last={p["name"]:i for i,f in enumerate(self.last["forwards"],1) for p in [f["LW"],f["RW"]]}
  current={p["name"]:i for i,f in enumerate(self.c["forwards"],1) for p in [f["LW"],f["RW"]]}
  returning=set(last).intersection(current)
  self.assertEqual(returning,{"Provenzano, Michael","Povegliano, Adam","Rosenberg, Jamie","Pearsoll, Keith","Pavaday, Damien"})
  self.assertTrue(all(current[n]!=last[n] for n in returning))
 def test_05_two_centres_swapped_from_november15(self):
  self.assertEqual(self.c["centreRotation"],["Saindon, Stephane","Carosi, Justin"])
  self.assertEqual(self.last["centreRotation"],["Carosi, Justin","Saindon, Stephane"])
  self.assertIsNone(self.c["forwards"][2]["C"])
  self.assertEqual(self.c["line3CentreDisplay"],"-")
 def test_06_versioned_public_asset_pointer(self):
  e=self.manifest["publishedWorkingCard"]
  self.assertEqual(e["fixtureId"],3375686)
  self.assertEqual(e["revision"],3)
  self.assertTrue(e["url"].endswith("game-367-2026-11-22-working-r3.pdf"))
  self.assertEqual(e["sha256"],self.c["pdf"]["sha256"])
  self.assertEqual(e["previewSHA256"],self.c["png"]["sha256"])
 def test_07_original_signed_r2_preserved(self):
  self.assertEqual(v.validate(self.old,self.rules,check_assets=True,check_public=True)["status"],"PASS_CAPTAIN_HARD_RULES")
  self.assertEqual(self.old["captainPairOrderRevision"],"20261122_GAME367_MANAGER_APPROVED")
 def test_08_wrong_order_rejected(self):
  for role in ("LW","RW"):
   self.c["forwards"][0][role],self.c["forwards"][2][role]=self.c["forwards"][2][role],self.c["forwards"][0][role]
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_CAPTAIN_APPROVED_WINGER_ORDER_BROKEN"):self.check()
 def test_09_no_ice_time_claim(self):
  self.assertFalse(self.c["currentRotationUsedVerifiedActualIceTime"])
  self.assertFalse(self.c["namedPollVotesIncluded"])
  self.assertFalse(self.c["privateWhatsAppGroupContentIncluded"])
 def test_10_original_damien_number_zero(self):
  self.assertEqual(self.c["forwards"][1]["RW"]["displayText"],"#0 - Pavaday, Damien")
  self.assertEqual(self.c["forwards"][1]["RW"]["htoPlayerId"],849368)
if __name__=="__main__":unittest.main()
