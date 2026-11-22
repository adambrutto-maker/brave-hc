"""Fixture-scoped captain approval and independent negative source tests, Game367."""
import copy,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import verify_brave_hc_captain_lineup as v

class Game367ApprovedLineup(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rules=v.load(v.RULES)
  cls.card=v.load(v.ASSETS/"game-367-2026-11-22-working.lineup.json")
 def setUp(self):self.c=copy.deepcopy(self.card)
 def check(self,assets=False):return v.validate(self.c,self.rules,check_assets=assets,check_public=True)
 def test_01_real_source_attested(self):
  self.assertEqual(self.check(assets=True)["status"],"PASS_CAPTAIN_HARD_RULES")
  self.assertEqual(self.c["officialHTOGameId"],"3375686")
  self.assertEqual(self.c["gameDate"],"2026-11-22")
 def test_02_keith_pavaday_intact(self):
  self.assertEqual([self.c["forwards"][2][k]["name"] for k in ["LW","RW"]],
                  ["Pearsoll, Keith","Pavaday, Damien"])
 def test_03_approved_rotation_two_centres(self):
  self.assertEqual(self.c["centreRotation"],["Saindon, Stephane","Carosi, Justin"])
  self.assertIsNone(self.c["forwards"][2]["C"])
 def test_04_fifth_defender_not_ghost_partner(self):
  self.assertEqual(self.c["defence"][2]["LD"]["name"],"Kober, Adam")
  self.assertIsNone(self.c["defence"][2]["RD"])
 def test_05_13_skaters(self):
  self.assertEqual(self.check()["playerCount"],13)
 def test_06_no_private_poll_data(self):
  self.assertIs(self.c["namedPollVotesIncluded"],False)
 def test_07_wrong_game_stops(self):
  self.c["officialHTOGameId"]="3375685"
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_WRONG_FIXTURE"):self.check()
 def test_08_keith_swapped_fails(self):
  self.c["forwards"][2]["LW"],self.c["forwards"][1]["LW"]=self.c["forwards"][1]["LW"],self.c["forwards"][2]["LW"]
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_CAPTAIN_APPROVED_WINGER_ORDER_BROKEN"):self.check()
 def test_09_fifth_d_wrong_fails(self):
  self.c["defence"][2]["LD"],self.c["defence"][0]["LD"]=self.c["defence"][0]["LD"],self.c["defence"][2]["LD"]
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_DEFENSIVE_PARTNERSHIP"):self.check()
 def test_10_goalie_wrong_fails(self):
  self.c["goalie"]["name"]="Logue, Someone Else";self.c["goalie"]["displayText"]="#70 - Logue, Someone Else"
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_GOALIE_INCORRECT"):self.check()
 def test_11_wrong_centre_order_fails(self):
  self.c["forwards"][0]["C"],self.c["forwards"][1]["C"]=self.c["forwards"][1]["C"],self.c["forwards"][0]["C"]
  self.c["centreRotation"]=list(reversed(self.c["centreRotation"]))
  with self.assertRaisesRegex(v.CaptainRulesHold,"GAME367_CENTRE_ROTATION"):self.check()
 def test_12_Damien_identity_fails(self):
  self.c["forwards"][2]["RW"]["htoPlayerId"]=3
  with self.assertRaisesRegex(v.CaptainRulesHold,"DAMIEN_NAME_JERSEY_OR_HTO_ID_WRONG"):self.check()
if __name__=="__main__": unittest.main()
