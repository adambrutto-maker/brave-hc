"""Synthetic historical HTO Awards fixtures; tests do not perform HTO mutations."""
import copy,datetime,unittest
from aw19_stage_native_hto_awards_actions import (
 HONOURS,build_actions,validate_historical_preservation,source_events_are_fresh)
NOW=datetime.datetime(2026,10,28,6,50,tzinfo=datetime.timezone.utc)
def fixture():
 groups={x:[] for x in HONOURS}
 groups[HONOURS[0]]=[f"2023 - Player {i}" for i in range(5)]
 groups[HONOURS[1]]=[f"2014 - Honour Recipient {i}" for i in range(141)]
 source={"source_count":98,"source_categories":[],"source_entries":[]}
 club_counts=[("50 Game Club",29),("50 Point Club",20),("50 Win Club",1),
  ("100 Game Club",16),("100 Point Club",12),("100 Win Club",1),
  ("200 Game Club",10),("200 Point Club",5),("300 Game Club",3),("300 Point Club",1)]
 for club,n in club_counts:
  rows=[]
  for i in range(n):
   name=f"Original Player {club.split()[0]}-{club.split()[1]}-{i}"
   year="2018"
   dated="January "+str(i+1)+", 2018"
   row=year+" - "+name+" - Earned "+dated+" | Winter 2017/2018 | Historic milestone"
   source["source_entries"].append({"club":club,"player":name,"award_year":year,"display_date":dated})
   rows.append(row)
  source["source_categories"].append({"club":club,"original_count":n})
  groups[club]=rows
 assert sum(map(len,groups.values()))==244
 return source,groups
def report(proposals):
 return {"schema":"brave-hc-aw19-exact-current-game-reconciliation/v1",
 "status":"SOURCE_RECONCILIATION_PASS",
 "game_date":"2026-10-25","verified_game_id":42,
 "source_feed_timestamp":"2026-10-28T06:20:00+00:00",
 "proposed_milestones":proposals}
def goal():
 return {"award_key":"987:50 Goal Club","player_id":987,"recipient":"Jane Doe",
         "club":"50 Goal Club","metric":"Goal","threshold":50,
         "status":"OFFICIAL_GAME_VERIFIED_READY_FOR_NATIVE_HOLD_UNTIL_PARITY",
         "game_id":"42","date":"2026-10-25","award_year":2026,
         "notes":"Earned October 25, 2026 | Winter 2026/2027 | Bronze milestone",
         "source_url":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&p=boxscore&gameID=42",
         "source_sha256":"c"*64}
class NativeActionPlan(unittest.TestCase):
 def test_preserves_146_honours_and_98_historic_clubs(self):
  source,groups=fixture()
  proof=validate_historical_preservation(groups,source)
  self.assertEqual(proof["original_honours_verified"],146)
  self.assertEqual(proof["historic_milestones_verified"],98)
 def test_readonly_no_new_crossing(self):
  source,groups=fixture()
  a=build_actions(report([]),groups,source,now=NOW)
  self.assertEqual(a['status'],'READ_ONLY_NO_ACTIONS')
  self.assertEqual(a['native_award_actions_staged'],[])
  self.assertEqual(a['native_hto_writes'],0)
 def test_new_club_created_only_after_source_crossing(self):
  source,groups=fixture()
  a=build_actions(report([goal()]),groups,source,now=NOW)
  self.assertEqual(a['status'],'VERIFIED_SOURCE_ACTIONS_STAGED_NOT_APPLIED')
  self.assertEqual(a['new_category_names_ordered'],['50 Goal Club'])
  self.assertEqual(a['native_award_actions_staged'][0]['recipient'],'Jane Doe')
  self.assertLess(a['current_and_proposed_category_order'].index('50 Goal Club'),
                  a['current_and_proposed_category_order'].index('50 Point Club'))
  self.assertEqual(a['live_awards_total_before'],244)
 def test_existing_name_in_club_cannot_double_award(self):
  source,groups=fixture()
  groups['50 Goal Club']=['2025 - Jane Doe - Earned September 20, 2025']
  a=build_actions(report([goal()]),groups,source,now=NOW)
  self.assertEqual(a['status'],'REVIEW_HELD')
  self.assertEqual(a['native_award_actions_staged'],[])
  self.assertEqual(a['held_source_candidates'][0]['reason'],'NAME_ALREADY_IN_CLUB_CHECK_NATIVE_PLAYER_ID')
 def test_drifted_historical_awards_holds(self):
  source,groups=fixture()
  groups['50 Game Club'].pop()
  with self.assertRaisesRegex(ValueError,'source|smaller'):
   build_actions(report([]),groups,source,now=NOW)
 def test_stale_source_holds(self):
  source,groups=fixture()
  a=report([goal()])
  a['source_feed_timestamp']='2026-10-26T00:00:00+00:00'
  with self.assertRaisesRegex(ValueError,'stale'):
   build_actions(a,groups,source,now=NOW)
 def test_duplicate_same_player_club_held(self):
  source,groups=fixture()
  a=build_actions(report([goal(),goal()]),groups,source,now=NOW)
  self.assertEqual(len(a['native_award_actions_staged']),1)
  self.assertEqual(a['held_source_candidates'][0]['reason'],'SOURCE_IDENTITY_DUPLICATE_OR_INVALID')
if __name__=='__main__':unittest.main(verbosity=2)
