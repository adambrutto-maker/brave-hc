import json,unittest,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_rookie_input_assembly import assemble
class RookieAssembly(unittest.TestCase):
 def fixtures(self):
  load=lambda f:json.loads((ROOT/'docs'/f).read_text())
  return [ROOT/'docs/261020_Awards_Original_Formula_Capture.json',load('261021_Awards_Current_Population_Join.json'),load('261021_Awards_Validated_Eligibility_Replay.json'),[load(f) for f in ['261021_Awards_Current_Production_Component_Rebuilt_Replay.json','261021_Awards_Current_Goalie_Component_Replay.json','261021_Awards_Current_Extended_Reliability_Replay.json','261021_Awards_Current_Streak_Replay.json','261021_Awards_Current_Special_Teams_Replay.json','261021_Awards_Current_Plus_Minus_Replay.json']]]
 def test_all_five_share_exact_remaining_dependencies(self):
  p=assemble(*self.fixtures());self.assertEqual(p['eligibleRookieCount'],5);self.assertEqual(p['rebuiltDisplayComponentCount'],15)
  self.assertTrue(all((r['requiredComponentCount'],r['rebuiltComponentCount'],len(r['missingComponents']))==(12,11,1) for r in p['players']))
  self.assertTrue(all(r['calculation']['state']=='INPUT_HOLD' and r['calculation']['value'] is None for r in p['players']))
  self.assertFalse(p['publicationAuthorized'])
 def test_duplicate_component_authority_rejected(self):
  args=self.fixtures();args[-1].append(args[-1][0])
  with self.assertRaises(ValueError):assemble(*args)
 def test_stale_components_rejected(self):
  args=self.fixtures();args[-1][0]['cutoff']='2026-10-25'
  with self.assertRaises(ValueError):assemble(*args)
 def test_no_unneeded_goalie_components_in_skater_hold(self):
  p=assemble(*self.fixtures())
  self.assertFalse(any('Goalie' in f for r in p['players'] for f in r['missingComponents']))
if __name__=='__main__':unittest.main()
