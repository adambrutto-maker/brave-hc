import json,sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_production_internals import bindings,calculate
from hockeyos_awards_production_parity import compare
ROOT=Path(__file__).resolve().parents[1];CAP=ROOT/'docs/261020_Awards_Original_Formula_Capture.json'
class ProductionInternals(unittest.TestCase):
 def fixture(self):
  b=bindings(CAP)['Total Final G Internal Score'];v={field:0 for field in b['fields'].values()};v[b['fields']['played']]=1;return b,v
 def test_exact_all_150_native_references(self):
  r=compare(CAP,json.loads((ROOT/'docs/261021_Awards_Production_Internal_Native_Reference.json').read_text()));self.assertEqual(r['comparisons'],150);self.assertEqual(r['differenceCount'],0);self.assertEqual(r['numericValueComparisons'],69)
 def test_duplicate_native_player_cannot_substitute_coverage(self):
  r=json.loads((ROOT/'docs/261021_Awards_Production_Internal_Native_Reference.json').read_text());r['players'][1]=r['players'][0]
  with self.assertRaises(ValueError):compare(CAP,r)
 def test_no_prior_games_ignores_missing_prior_rate(self):
  b,v=self.fixture();del v[b['fields']['priorRate']];self.assertEqual(calculate(b,'Skater',v)['value'],0)
 def test_prior_improvement_keeps_negative_sign(self):
  b,v=self.fixture();v[b['fields']['priorGP']]=10;v[b['fields']['priorRate']]=2;self.assertEqual(calculate(b,'Skater',v)['value'],-0.5)
 def test_no_played_games_short_circuits_other_inputs(self):
  b,v=self.fixture();self.assertEqual(calculate(b,'Skater',{b['fields']['played']:0})['state'],'NOT_APPLICABLE');self.assertEqual(calculate(b,'Goaltender',{})['state'],'NOT_APPLICABLE')
 def test_unknown_required_input_is_a_hold_not_zero(self):
  b,v=self.fixture();v[b['fields']['teamRate']]=None;self.assertEqual(calculate(b,'Skater',v)['state'],'INPUT_HOLD')
 def test_zero_leader_uses_one_and_source_weights_preserved(self):
  b,v=self.fixture();v[b['fields']['count']]=1;self.assertEqual(calculate(b,'Skater',v)['value'],0.4)
if __name__=='__main__':unittest.main()
