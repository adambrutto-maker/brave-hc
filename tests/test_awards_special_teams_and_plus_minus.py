import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_special_teams_pipeline import replay as special
from hockeyos_awards_plus_minus_pipeline import replay as plus
from hockeyos_awards_special_teams_baselines import build
from hockeyos_awards_skater_support_baselines import SOURCE
class RemainingComponents(unittest.TestCase):
 def setUp(self):
  load=lambda f:json.loads((ROOT/'docs'/f).read_text())
  self.capture=ROOT/'docs/261020_Awards_Original_Formula_Capture.json';self.pop=load('261021_Awards_Current_Population_Join.json');self.candidate=load('261021_Awards_Extended_Game_Input_Candidate.json');self.base=load('261021_Awards_Special_Teams_Baseline_Ledger.json');self.skater=load('261021_Awards_Current_Skater_Support_Replay.json');self.goalie=load('261021_Awards_Goalie_Support_Baseline_Ledger.json')
 def test_special_complete_observations_and_reconciled_history(self):
  self.assertEqual((self.base['checked'],self.base['differenceCount']),(9469,0));p=special(self.capture,self.candidate,self.pop,self.base)
  self.assertEqual(p['numericInternalCount'],19);self.assertFalse(p['publicationAuthorized']);self.assertEqual(len(next(iter(p['components'].values()))['rows']),22)
 def test_missing_special_observation_is_not_zero(self):
  del next(r for r in self.candidate['rows'] if r['targetTable']=='SkaterStatsByGame')['inputs']['PPG']
  with self.assertRaises(ValueError):special(self.capture,self.candidate,self.pop,self.base)
 def test_duplicate_appearance_rejected(self):
  self.candidate['rows'].append(copy.deepcopy(self.candidate['rows'][0]))
  with self.assertRaises(ValueError):special(self.capture,self.candidate,self.pop,self.base)
 def test_special_goals_cannot_exceed_goals(self):
  r=next(r for r in self.candidate['rows'] if r['targetTable']=='SkaterStatsByGame');r['inputs']['SHG']=r['inputs']['G']+1
  with self.assertRaises(ValueError):special(self.capture,self.candidate,self.pop,self.base)
 def test_summer_weight_and_prior_row_count(self):
  p={'name':'Test','role':'Skater','season':'W2026/27'};master={'Website Name':'Test','Position':'C','Recent Season':'W2026/27','Career Prior Total PPG/GP':2/3,'Career Prior Total SHG/GP':1/3,'All-Time Total Skater Special Teams Team Rate Avg':1}
  rows=[{'Name':'Test','Season':'S2026','GP':9,'PPG':2,'SHG':1,'W Adj. PPG':4/3,'W Adj. SHG':2/3,'sourceRow':1},{'Name':'Test','Season':'W2026/27','GP':1,'PPG':1,'SHG':0,'W Adj. PPG':1,'W Adj. SHG':0,'sourceRow':2},{'Name':'Test','Season':'W2025/26','GP':1,'PPG':0,'SHG':0,'W Adj. PPG':0,'W Adj. SHG':0,'sourceRow':3}]
  b=build({'sourceWorkbookSha256':SOURCE,'readOnlyHashUnchanged':True,'playerInfo':[master],'skaterGames':rows},{'season':'W2026/27','players':[p]})
  self.assertEqual(b['differenceCount'],0);self.assertEqual(b['careerTeamGP'],3);self.assertEqual(b['players'][0]['values']['Career Prior Skater GP'],2)
 def test_mixed_plus_minus_preserves_observed_negative_values(self):
  p=plus(self.capture,self.pop,self.skater,self.goalie);rows={r['name']:r for r in next(iter(p['components'].values()))['rows']}
  self.assertEqual(p['numericInternalCount'],22);self.assertEqual(rows['Leong, Dev']['rebuiltInputs']['Current Total Goalie +/-/GP'],-4.5);self.assertEqual(rows['Carlyle, Adam']['rebuiltInputs']['Current Total Goalie +/- Field Best Rate'],-1);self.assertFalse(p['currentCompositeScoresVerified'])
 def test_stale_goalie_report_rejected(self):
  self.goalie['cutoff']='2026-10-25'
  with self.assertRaises(ValueError):plus(self.capture,self.pop,self.skater,self.goalie)
 def test_missing_goalie_baseline_rejected(self):
  self.goalie['players'].pop()
  with self.assertRaises(ValueError):plus(self.capture,self.pop,self.skater,self.goalie)
if __name__=='__main__':unittest.main()
