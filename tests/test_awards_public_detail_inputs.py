import json,unittest,sys,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_public_detail_inputs import extend
from hockeyos_awards_current_reliability_pipeline import replay
class PublicDetails(unittest.TestCase):
 def fixtures(self):return [json.loads((ROOT/'docs'/f).read_text()) for f in ['261021_Awards_Resolved_Game_Input_Candidate.json','261021_Awards_Public_Boxscore_Details.json']]
 def test_all_four_games_and_even_strength_derivations(self):
  args=self.fixtures();before=copy.deepcopy(args[0]);p=extend(*args)
  self.assertEqual(len(p['additionalDerivedObservations']),106);self.assertEqual(len(p['additionalDirectObservations']),4)
  self.assertEqual([r['value'] for r in p['additionalDirectObservations']],[-3,-3,-1,-6]);self.assertEqual(args[0],before)
 def test_opponent_powerplay_does_not_invalidate_brave_even_strength(self):self.assertEqual(len(extend(*self.fixtures())['rows']),57)
 def test_brave_powerplay_prevents_zero_derivation(self):
  args=self.fixtures();t=args[1]['games'][1]['tables'][0];r=next(r for r in t[1:] if r[3]=='Brave H.C.');r[2]='PP'
  with self.assertRaises(ValueError):extend(*args)
 def test_missing_scoring_event_rejected(self):
  args=self.fixtures();t=args[1]['games'][1]['tables'][0];t.remove(next(r for r in t[1:] if r[3]=='Brave H.C.'))
  with self.assertRaises(ValueError):extend(*args)
 def test_consistency_uses_all_confirmed_observations(self):
  load=lambda f:json.loads((ROOT/'docs'/f).read_text());candidate=extend(*self.fixtures())
  p=replay(ROOT/'docs/261020_Awards_Original_Formula_Capture.json',candidate,load('261021_Awards_Current_Population_Join.json'),load('261021_Awards_Confirmed_Metadata.json'),include_production=True)
  self.assertEqual(p['numericInternalCount'],79)
  rows={r['name']:r['value'] for r in p['components']['Total Skater Production Consistency Internal Score']['rows']}
  self.assertEqual(rows['Kong, Henry'],25);self.assertEqual(rows['Carosi, Justin'],40);self.assertEqual(rows['Rosenberg, Jamie'],3.3)
if __name__=='__main__':unittest.main()
