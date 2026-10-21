import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_current_population import build
class CurrentPopulation(unittest.TestCase):
 def fixture(self):
  c={'season':'W2026/27','rows':[{'targetTable':'GoalieStatsByGame','sourceGameId':1,'date':'2026-10-04','inputs':{'Name':'Carlyle, Adam','GP':1,'GA':3}}]}
  m=[{'Website Name':'Carlyle, Adam','Position':'G','Current Roster Status':None},{'Website Name':'Historical, Player','Position':'F','Current Roster Status':'CU','Recent Season':'W2025/26'}]
  return c,m
 def test_current_appearance_scope_and_unknown_status_preserved(self):
  c,m=self.fixture();before=copy.deepcopy((c,m));r=build(c,m);self.assertEqual(r['playerCount'],1);self.assertEqual(r['masterNamesOutsideCurrentPopulation'],['Historical, Player']);self.assertEqual(r['unresolvedMetadata'][0]['value'],None);self.assertNotIn('PIM',r['players'][0]['appearances'][0]['inputs']);self.assertEqual((c,m),before)
 def test_missing_and_duplicate_master_rejected(self):
  c,m=self.fixture()
  for masters in [m[1:],m+[m[0]]]:
   with self.assertRaises(ValueError):build(c,masters)
 def test_duplicate_appearance_rejected(self):
  c,m=self.fixture();c['rows']*=2
  with self.assertRaises(ValueError):build(c,m)
 def test_boolean_gp_rejected(self):
  c,m=self.fixture();c['rows'][0]['inputs']['GP']=True
  with self.assertRaises(ValueError):build(c,m)
 def test_role_conflict_rejected(self):
  c,m=self.fixture();m[0]['Position']='F'
  with self.assertRaises(ValueError):build(c,m)
 def test_placeholder_never_becomes_current_candidate(self):
  c,m=self.fixture();c['rows'][0]['inputs']['Name']=m[0]['Website Name']='Unknown, Johnny'
  with self.assertRaises(ValueError):build(c,m)
if __name__=='__main__':unittest.main()
