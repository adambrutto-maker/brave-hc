import unittest,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_current_reliability_pipeline import replay
class CurrentReliability(unittest.TestCase):
 def fixtures(self):return [ROOT/'docs/261020_Awards_Original_Formula_Capture.json']+[json.loads((ROOT/'docs'/f).read_text()) for f in ['261021_Awards_Resolved_Game_Input_Candidate.json','261021_Awards_Current_Population_Join.json','261021_Awards_Confirmed_Metadata.json']]
 def test_complete_current_components(self):
  p=replay(*self.fixtures());self.assertEqual(p['numericInternalCount'],60)
  for c in p['components'].values():self.assertEqual(c['normalized']['state'],'CURRENT_COMPONENT_NORMALIZATION_CANDIDATE')
  att={r['name']:r['value'] for r in p['components']['Current True Attd. % Internal Score']['rows']}
  self.assertEqual(att['Carlyle, Adam'],25);self.assertEqual(att['Brutto, Adam'],100)
  self.assertFalse(p['publicationAuthorized'])
 def test_two_minute_penalty_is_not_multi_pim(self):
  p=replay(*self.fixtures());r=next(r for r in p['components']['Total Discipline Reliability Internal Score']['rows'] if r['name']=='Triumbari, Francesco')
  self.assertEqual(r['rebuiltInputs']['Current Total Multi-PIM Games'],0)
 def test_four_minute_penalty_is_multi_pim(self):
  args=self.fixtures();r=next(r for r in args[1]['rows'] if r['targetTable']=='SkaterStatsByGame');n=r['inputs']['Name'];r['inputs']['PIM']=4
  p=replay(*args);out=next(r for r in p['components']['Total Discipline Reliability Internal Score']['rows'] if r['name']==n)
  self.assertEqual(out['rebuiltInputs']['Current Total Multi-PIM Games'],1)
 def test_missing_plus_minus_holds(self):
  args=self.fixtures();args[1]['rows'][0]['inputs']['+/-']=None
  with self.assertRaises(ValueError):replay(*args)
 def test_roster_confirmation_required(self):
  args=self.fixtures();args[3]['records']=[]
  with self.assertRaises(ValueError):replay(*args)
if __name__=='__main__':unittest.main()
