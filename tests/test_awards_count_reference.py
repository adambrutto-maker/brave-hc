import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_count_reference import extract
class CountReference(unittest.TestCase):
 def fixture(self):
  c={'season':'W2026/27','rows':[{'targetTable':'SkaterStatsByGame','date':'2026-10-18','inputs':{'Name':'Player, One','GP':1,'G':0,'A':1,'Pts':1}}]}
  d={'controls':{'C1':'W2026/27','J2':1},'awardErrors':[],'playerInfoRows':[{'Website Name':'Player, One','Current Skater GP':1,'Current Total Raw G':0,'Current Total Raw A':1,'Current Total Raw Pts':1,'Recent Season':'W2026/27'}],'awardRows':[{'Name':'Player, One','Art Ross Eligible':1,'Rocket Richard Eligible':1,'Art Ross Award Score':1,'Rocket Richard Award Score':0,'Art Ross Rank Key':1000000010100.9999,'Rocket Richard Rank Key':0.99994}]}
  return d,c
 def test_zero_goals_retained_without_composite_acceptance(self):
  d,c=self.fixture();before=copy.deepcopy(d);r=extract(d,c);self.assertEqual(r['rows'][0]['goals'],0);self.assertFalse(r['currentCompositeScoresVerified']);self.assertEqual(d,before)
 def test_wrong_context(self):
  for field,value in [('C1','W2025/26'),('J2',2)]:
   d,c=self.fixture();d['controls'][field]=value
   with self.assertRaises(ValueError):extract(d,c)
 def test_count_mismatch_rejects(self):
  d,c=self.fixture();d['awardRows'][0]['Art Ross Award Score']=3
  with self.assertRaises(ValueError):extract(d,c)
 def test_eligibility_cannot_be_assumed(self):
  d,c=self.fixture();d['awardRows'][0]['Art Ross Eligible']=0
  with self.assertRaises(ValueError):extract(d,c)
 def test_error_rejects(self):
  d,c=self.fixture();d['awardErrors']=[{'code':'#VALUE!'}]
  with self.assertRaises(ValueError):extract(d,c)
if __name__=='__main__':unittest.main()
