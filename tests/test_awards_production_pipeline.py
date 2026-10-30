import json,sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_production_pipeline import replay
ROOT=Path(__file__).resolve().parents[1];CAP=ROOT/'docs/261020_Awards_Original_Formula_Capture.json'
class ProductionPipeline(unittest.TestCase):
 def fixture(self):return [json.loads((ROOT/'docs'/p).read_text()) for p in ['261021_Awards_Resolved_Game_Input_Candidate.json','261021_Awards_Current_Population_Join.json','261021_Awards_Production_Internal_Native_Reference.json']]
 def test_current_inputs_rebuilt_for_all_19_skaters(self):
  c,p,r=self.fixture();out=replay(CAP,c,p,r);self.assertEqual(out['internalComparisons'],57);self.assertEqual(out['changedInternalValuesFromLegacy'],50)
  for component in out['components'].values():self.assertEqual(component['normalized']['numericPlayerCount'],19);self.assertFalse(component['normalized']['upstreamParityVerified'])
 def test_unknown_historical_baseline_holds_component(self):
  c,p,r=self.fixture();r['players'][0]['components']['Total Final G Internal Score']['inputs']['All-Time Total Skater G Team Rate Avg']=None
  out=replay(CAP,c,p,r);self.assertEqual(out['components']['G']['normalized']['state'],'COMPONENT_INPUT_HOLD')
 def test_duplicate_source_appearance_rejected(self):
  c,p,r=self.fixture();c['rows'].append(c['rows'][0])
  with self.assertRaises(ValueError):replay(CAP,c,p,r)
 def test_changed_current_source_count_cannot_be_hidden(self):
  c,p,r=self.fixture();r['players'][0]['components']['Total Final G Internal Score']['inputs']['Current Total Raw G']=99
  with self.assertRaises(ValueError):replay(CAP,c,p,r)
if __name__=='__main__':unittest.main()
