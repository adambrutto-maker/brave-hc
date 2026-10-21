import json,unittest,sys,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_skater_support_baselines import build,SOURCE,METRICS
from hockeyos_awards_skater_support_pipeline import replay
class SkaterSupport(unittest.TestCase):
 def test_playoff_pim_uses_current_mean_exception(self):
  masters=[]
  for name in ('P','Q'):
   p={'Website Name':name,'Position':'F','Recent Season':'W2026/27'}
   for phase in ('Total','Playoff'):
    for m in METRICS:
     p['Career Prior '+phase+' '+m+'/GP']=2 if m=='PIM' and name=='P' else 0
     p['All-Time '+phase+' Skater '+m+' Team Rate Avg']=(4/3 if phase=='Total' else 1) if m=='PIM' else 0
   masters.append(p)
  rows=[]
  for i,(n,s,pim,adjusted) in enumerate([('P','S2025',3,2),('P','W2026/27',2,2),('Q','W2026/27',0,0)]):rows.append({'Name':n,'Season':s,'Game Type':'Playoffs','GP':1,'PIM':pim,'W Adj. PIM':adjusted,'+/-':0,'POTG':0,'sourceRow':3+i})
  source={'sourceWorkbookSha256':SOURCE,'readOnlyHashUnchanged':True,'playerInfo':masters,'skaterGames':rows}
  pop={'season':'W2026/27','players':[{'name':n,'role':'Skater','season':'W2026/27'} for n in ('P','Q')]}
  p=build(source,pop);self.assertEqual(p['differenceCount'],0)
  self.assertEqual(p['teamRates']['All-Time Playoff Skater PIM Team Rate Avg'],1)
 def fixtures(self):
  load=lambda p:json.loads((ROOT/p).read_text())
  return [ROOT/'docs/261020_Awards_Original_Formula_Capture.json',load('docs/261021_Awards_Resolved_Game_Input_Candidate.json'),load('docs/261021_Awards_Current_Population_Join.json'),load('docs/261021_Awards_Skater_Support_Baseline_Ledger.json')]
 def test_saved_native_support_baselines(self):
  p=self.fixtures()[-1];self.assertEqual(p['checked'],4934);self.assertEqual(p['differenceCount'],0)
 def test_current_support_complete_skater_coverage(self):
  p=replay(*self.fixtures());self.assertEqual(p['skaterInternalCount'],57);self.assertEqual(p['goalieBranchHoldCount'],9)
  for component in p['components'].values():
   self.assertEqual(len(component['rows']),22)
   self.assertEqual(sum(r['state']=='INTERNAL_VALUE_CANDIDATE' for r in component['rows']),19)
  self.assertFalse(p['publicationAuthorized'])
 def test_current_missing_data_not_zero_filled(self):
  args=self.fixtures();del args[1]['rows'][0]['inputs']['PIM']
  with self.assertRaises(ValueError):replay(*args)
 def test_unaccepted_appearance_rejected(self):
  args=self.fixtures();args[1]['rows'][0]['sourceGameId']=1
  with self.assertRaises(ValueError):replay(*args)
if __name__=='__main__':unittest.main()
