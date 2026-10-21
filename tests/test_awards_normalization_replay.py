import sys,json,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_normalization_replay import replay
ROOT=Path(__file__).resolve().parents[1]
class NormalizationReplay(unittest.TestCase):
 def test_complete_current_population_is_explicit_for_every_binding(self):
  p=json.loads((ROOT/'docs/261021_Awards_Current_Population_Join.json').read_text());r=json.loads((ROOT/'docs/261021_Awards_All_Display_Native_Reference.json').read_text());out=replay(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',p,r)
  self.assertEqual(out['supportedFormulaCount'],44);self.assertEqual(out['candidateComponentCount'],8);self.assertEqual(out['heldComponentCount'],36)
  for c in out['components'].values():self.assertEqual(c['currentPlayerCoverage'],22);self.assertFalse(c['currentCompositeScoresVerified'])
 def test_carlyle_cannot_be_omitted_to_pass_attendance(self):
  p=json.loads((ROOT/'docs/261021_Awards_Current_Population_Join.json').read_text());r=json.loads((ROOT/'docs/261021_Awards_All_Display_Native_Reference.json').read_text());out=replay(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',p,r);c=out['components']['Current True Attd. % Web Display Score']
  self.assertEqual(c['state'],'COMPONENT_INPUT_HOLD');self.assertIn('Carlyle, Adam',[v['name'] for v in c['unavailable']]);self.assertIsNone(c['scores'])
if __name__=='__main__':unittest.main()
