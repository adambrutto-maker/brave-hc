import copy,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('remainder',ROOT/'scripts/hockeyos_awards_observation_remainder.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RemainderTests(unittest.TestCase):
 def setUp(self):
  self.c=json.loads((ROOT/'docs/261020_Awards_Four_Game_Input_Candidate.json').read_text())
  self.p=json.loads((ROOT/'widgets/awards-participants.json').read_text())
 def test_all_42_resolve_without_mutating_raw_observations(self):
  before=copy.deepcopy(self.c);result,receipt=m.reconcile(self.c,self.p)
  self.assertEqual(self.c,before);self.assertEqual(len(receipt['derivedObservations']),42)
  self.assertEqual({d['value'] for d in receipt['derivedObservations']},{0})
  self.assertEqual(receipt['remainingSkaterPIM'],0);self.assertEqual(receipt['remainingGoaliePOTG'],0)
 def test_multiple_positive_remainder_is_not_arbitrarily_allocated(self):
  row=next(r for r in self.c['rows'] if r['inputs']['Name']=='Triumbari, Francesco' and r['inputs']['PIM']==2);row['inputs']['PIM']=0
  result,receipt=m.reconcile(self.c,self.p)
  self.assertEqual(len(receipt['unresolvedConstraints']),1);self.assertEqual(result['unknownSkaterPIM'],3)
 def test_single_missing_value_uses_exact_remainder(self):
  rows=[r for r in self.c['rows'] if r['inputs']['Name']=='Triumbari, Francesco']
  for r in rows:r['inputs']['PIM']=0
  rows[0]['inputs']['PIM']=None
  result,receipt=m.reconcile(self.c,self.p)
  self.assertEqual(next(d for d in receipt['derivedObservations'] if d['name']=='Triumbari, Francesco')['value'],2)
 def test_contradictory_season_total_rejects(self):
  next(p for p in self.p['players'] if p['name']=='Triumbari, Francesco')['currentHTORaw']['penaltyMinutes']=1
  with self.assertRaises(ValueError):m.reconcile(self.c,self.p)
 def test_incomplete_appearance_coverage_rejects(self):
  self.c['rows'].pop()
  with self.assertRaises(ValueError):m.reconcile(self.c,self.p)
 def test_duplicate_appearance_rejects(self):
  self.c['rows'].append(copy.deepcopy(self.c['rows'][0]))
  with self.assertRaises(ValueError):m.reconcile(self.c,self.p)
 def test_mixed_cutoff_and_season_source_reject(self):
  for field,value in [('season','W2025/26'),('latestCompletedGameDate','2026-10-04')]:
   p=copy.deepcopy(self.p);p[field]=value
   with self.assertRaises(ValueError):m.reconcile(self.c,p)
 def test_negative_and_boolean_counts_reject(self):
  for value in [-1,True]:
   c=copy.deepcopy(self.c);c['rows'][0]['inputs']['PIM']=value
   with self.assertRaises(ValueError):m.reconcile(c,self.p)
 def test_raw_field_absence_is_not_silently_filled(self):
  del self.c['rows'][0]['inputs']['PIM']
  with self.assertRaises(ValueError):m.reconcile(self.c,self.p)
if __name__=='__main__':unittest.main()
