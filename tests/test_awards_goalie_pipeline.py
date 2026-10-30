import json,unittest,sys,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_goalie_pipeline import replay
class GoaliePipeline(unittest.TestCase):
 def fixtures(self):
  load=lambda f:json.loads((ROOT/'docs'/f).read_text())
  return [ROOT/'docs/261020_Awards_Original_Formula_Capture.json',load('261021_Awards_Resolved_Game_Input_Candidate.json'),load('261021_Awards_Current_Population_Join.json'),load('261021_Awards_Goalie_Baseline_Ledger.json'),load('261021_Awards_Current_Skater_Support_Replay.json')]
 def test_all_five_goalie_components(self):
  p=replay(*self.fixtures());self.assertEqual(p['goalieInternalCount'],15);self.assertEqual(len(p['derivedObservations']),12)
  for name,c in p['components'].items():
   self.assertEqual(c['normalized']['state'],'CURRENT_COMPONENT_NORMALIZATION_CANDIDATE')
   self.assertEqual(c['normalized']['numericPlayerCount'],22 if name=='Total Award POTG Internal Score' else 3)
  self.assertFalse(p['publicationAuthorized'])
 def test_loss_derivation_requires_complete_premises(self):
  args=self.fixtures();r=next(r for r in args[1]['rows'] if r['targetTable']=='GoalieStatsByGame');r['inputs']['L']=None
  with self.assertRaises(ValueError):replay(*args)
 def test_no_shutout_guess_for_zero_ga(self):
  args=self.fixtures();r=next(r for r in args[1]['rows'] if r['targetTable']=='GoalieStatsByGame');r['inputs']['GA']=0
  with self.assertRaises(ValueError):replay(*args)
 def test_conflicting_observation_rejected(self):
  args=self.fixtures();r=next(r for r in args[1]['rows'] if r['targetTable']=='GoalieStatsByGame');r['inputs']['W']=1
  with self.assertRaises(ValueError):replay(*args)
 def test_history_receipt_and_stale_native_cohort(self):
  p=self.fixtures()[3];self.assertEqual((p['checked'],p['differenceCount']),(380,0));self.assertEqual(p['staleNativeMetadataNames'],['Carlyle, Adam'])
  self.assertEqual(p['correctedCohortGP']-p['legacyCohortGP'],1)
  self.assertEqual(p['correctedTeamRates']['SHO'],0)
if __name__=='__main__':unittest.main()
