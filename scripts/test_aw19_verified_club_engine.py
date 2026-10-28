import unittest
from datetime import date,timedelta
from aw19_verified_club_engine import levels,tier,event_to_awards,deduplicate,club_category_sort_key,order_native_awards_categories
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
 def test_native_current_10_club_category_order(self):
  existing=["50 Point Club","100 Game Club","300 Point Club","50 Win Club","200 Game Club","50 Game Club","300 Game Club","100 Win Club","200 Point Club","100 Point Club"]
  ordered=order_native_awards_categories(["Brave H.C. Hall of Fame","Art Ross Award"]+existing)
  self.assertEqual(ordered,["Brave H.C. Hall of Fame","Art Ross Award","50 Win Club","100 Win Club","50 Game Club","50 Point Club","100 Game Club","100 Point Club","200 Game Club","200 Point Club","300 Game Club","300 Point Club"])
 def test_future_goalie_first_then_thresholds_to_500(self):
  mixed=["400 Goal Club","50 Assist Club","10 Shutout Club","50 Win Club","500 Point Club","5 Shutout Club","50 Goal Club","100 Assist Club","400 Game Club","20 Shutout Club","100 Win Club","50 Game Club","100 Point Club","200 Goal Club","30 Shutout Club","400 Win Club","40 Shutout Club"]
  actual=order_native_awards_categories(["Hall of Fame","Hart Award"]+mixed)
  self.assertEqual(actual[:2],["Hall of Fame","Hart Award"])
  self.assertEqual(actual[2:9],["5 Shutout Club","10 Shutout Club","20 Shutout Club","30 Shutout Club","40 Shutout Club","50 Win Club","100 Win Club"])
  self.assertEqual(actual[9],"400 Win Club")
  self.assertEqual(actual[10:13],["50 Game Club","50 Goal Club","50 Assist Club"])
  self.assertTrue(actual.index("50 Goal Club")<actual.index("100 Assist Club"))
  self.assertTrue(actual.index("100 Point Club")<actual.index("200 Goal Club")<actual.index("400 Goal Club")<actual.index("500 Point Club"))
 def test_invalid_or_duplicate_native_clubs_rejected(self):
  for invalid in ("50 Save Club","75 Win Club","Career Milestones","50 Game Club "):
   with self.assertRaises(ValueError):
    order_native_awards_categories(["Hart Award",invalid]) if invalid!="50 Game Club " else club_category_sort_key(invalid)
  with self.assertRaises(ValueError):order_native_awards_categories(["50 Game Club","50 Game Club"])
 def test_proposed_new_categories_are_goalie_first_sorted(self):
  events=[self.sample("Goal",49,50),self.sample("Win",49,50),self.sample("Shutout",4,5),self.sample("Assist",49,50),self.sample("Game",49,50)]
  self.assertEqual(deduplicate([],events)["new_native_category_names"],["5 Shutout Club","50 Win Club","50 Game Club","50 Goal Club","50 Assist Club"])
if __name__=="__main__":unittest.main(verbosity=2)
