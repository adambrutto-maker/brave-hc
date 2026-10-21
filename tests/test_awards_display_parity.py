import json,sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_display_parity import compare
ROOT=Path(__file__).resolve().parents[1]
class AllDisplayParity(unittest.TestCase):
 def fixture(self):return json.loads((ROOT/'docs/261021_Awards_All_Display_Native_Reference.json').read_text())
 def test_all44_exact_1100_native_values(self):
  r=compare(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',self.fixture());self.assertEqual(r['componentCount'],44);self.assertEqual(r['comparisons'],1100);self.assertEqual(r['differenceCount'],0);self.assertFalse(r['currentCompositeScoresVerified'])
 def test_missing_component_and_missing_row_rejected(self):
  for what in ['component','row']:
   f=self.fixture();key=next(iter(f['components']))
   if what=='component':del f['components'][key]
   else:f['components'][key]['rows'].pop()
   with self.assertRaises(ValueError):compare(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',f)
 def test_same_count_with_changed_identity_rejected(self):
  f=self.fixture();keys=list(f['components']);f['components'][keys[1]]['rows'][0]['name']='Other, Player'
  with self.assertRaises(ValueError):compare(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',f)
 def test_changed_native_score_reported(self):
  f=self.fixture();key=next(iter(f['components']));f['components'][key]['rows'][0]['nativeDisplay']+=1
  r=compare(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',f);self.assertEqual(r['differenceCount'],1)
if __name__=='__main__':unittest.main()
