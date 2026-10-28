import unittest
from datetime import date,timedelta
from aw19_verified_club_engine import levels,tier,event_to_awards,deduplicate
from copy import deepcopy
class Clubs(unittest.TestCase):
 def sample(self,metric,old,new):
  return {"player_id":354055,"player_name":"Stephen Logue","game_id":"HTO-VERIFIED-FICTIONAL-TEST",
          "game_date":"2026-10-11","metric":metric,"previous_total":old,
          "new_total":new,"official_game_verified":True,"player_identity_verified":True,
          "source_url":"https://www.htosports.com/teams/default.asp?p=stats",
          "source_sha256":"1"*64}
 def test_clubs_for_supported_families(self):
  self.assertEqual(levels("Goal",301),[50,100,200,300])
  self.assertEqual(levels("Assist",501),[50,100,200,300,400,500])
  self.assertEqual(levels("Shutout",41),[5,10,20,30,40])
  self.assertEqual(tier("Goal",300),"Platinum")
  self.assertEqual(tier("Shutout",5),"Bronze")
 def test_source_crossing(self):
  self.assertEqual(event_to_awards(self.sample("Goal",49,50))[0]["club"],"50 Goal Club")
  self.assertEqual(event_to_awards(self.sample("Assist",99,100))[0]["club"],"100 Assist Club")
  self.assertEqual(event_to_awards(self.sample("Shutout",9,10))[0]["club"],"10 Shutout Club")
  self.assertEqual(event_to_awards(self.sample("Win",49,50))[0]["club"],"50 Win Club")
 def test_no_unearned_awards(self):
  self.assertEqual(event_to_awards(self.sample("Goal",38,40)),[])
  self.assertEqual(event_to_awards(self.sample("Shutout",5,5)),[])
 def test_cannot_grant_on_unverified_events(self):
  for field in ("official_game_verified","player_identity_verified"):
   e=self.sample("Goal",49,50);e[field]=False
   with self.assertRaises(ValueError):event_to_awards(e)
  e=self.sample("Goal",49,50);e["source_url"]="https://example.com/score"
  with self.assertRaises(ValueError):event_to_awards(e)
  e=self.sample("Goal",49,50);e["previous_total"]=5
  with self.assertRaises(ValueError):event_to_awards(e)
 def test_exact_date_and_no_duplicate(self):
  e=self.sample("Shutout",4,5)
  a=event_to_awards(e)[0]
  self.assertEqual(a["date"],"2026-10-11")
  self.assertIn("Winter 2026/2027",a["notes"])
  self.assertEqual(len(deduplicate([], [e,e])["ready_for_native_source_parity_review"]),1)
  self.assertEqual(len(deduplicate([{"player_id":354055,"club":"5 Shutout Club"}],[e])["ready_for_native_source_parity_review"]),0)
 def test_future_event_held(self):
  e=self.sample("Shutout",4,5)
  e["game_date"]=(date.today()+timedelta(days=2)).isoformat()
  self.assertEqual(len(deduplicate([],[e])["held_unverified_events"]),1)
if __name__=="__main__":unittest.main(verbosity=2)
