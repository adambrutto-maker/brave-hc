import unittest,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_current_category_readiness import build
class CategoryReadiness(unittest.TestCase):
 def fixtures(self):return [json.loads((ROOT/'docs'/p).read_text()) for p in ['261021_Awards_Current_Population_Join.json','261021_Awards_Validated_Eligibility_Replay.json','261021_Awards_Current_Count_Calculator_Parity.json']]
 def test_all_ten_current_categories(self):
  p=build(*self.fixtures());self.assertEqual(len(p['categories']),10)
  states=[c['state'] for c in p['categories']];self.assertEqual(states.count('NO_ELIGIBLE_PLAYERS'),7);self.assertEqual(states.count('COUNT_CALCULATION_VERIFIED'),2)
  rookie=next(c for c in p['categories'] if c['category']=='Rookie');self.assertEqual(len(rookie['eligibleNames']),5);self.assertNotIn('Carlyle, Adam',rookie['eligibleNames'])
  self.assertFalse(p['publicationAuthorized'])
 def test_stale_eligibility_rejected(self):
  args=self.fixtures();args[1]['cutoff']='2026-10-25'
  with self.assertRaises(ValueError):build(*args)
 def test_count_coverage_rejected(self):
  args=self.fixtures();args[2]['outputs']['rows'].pop()
  with self.assertRaises(ValueError):build(*args)
if __name__=='__main__':unittest.main()
