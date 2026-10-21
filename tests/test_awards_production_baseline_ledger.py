import unittest,sys,json,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_production_baseline_ledger import build,SOURCE
from hockeyos_awards_production_pipeline import replay
class ProductionBaselines(unittest.TestCase):
 def test_summer_adjustment_and_prior_denominator(self):
  p={'Website Name':'P','Position':'F','Recent Season':'W2026/27'}
  for phase in ('Total','Playoff'):
   for m,value in [('G',2),('A',4),('Pts',6)]:
    for f in ('Career Prior '+phase+' '+m+'/GP','All-Time '+phase+' Skater '+m+' Team Rate Avg'):p[f]=value
  row={'Name':'P','Season':'S2025','Game Type':'Playoffs','sourceRow':3,'GP':1,'G':3,'A':6,'Pts':9,'W Adj. G':2,'W Adj. A':4}
  source={'sourceWorkbookSha256':SOURCE,'readOnlyHashUnchanged':True,'playerInfo':[p],'skaterGames':[row]}
  pop={'season':'W2026/27','players':[{'name':'P','role':'Skater','season':'W2026/27'}]}
  result=build(source,pop);self.assertEqual(result['differenceCount'],0)
  source['skaterGames'][0]['W Adj. G']=3;self.assertEqual(build(source,pop)['differenceCount'],1)
 def test_current_pipeline_uses_rebuilt_history(self):
  load=lambda p:json.loads((ROOT/p).read_text())
  ledger=load('docs/261021_Awards_Production_Baseline_Ledger.json')
  args=[ROOT/'docs/261020_Awards_Original_Formula_Capture.json',load('docs/261021_Awards_Resolved_Game_Input_Candidate.json'),load('docs/261021_Awards_Current_Population_Join.json'),load('docs/261021_Awards_Production_Internal_Native_Reference.json')]
  p=replay(*args,ledger);self.assertTrue(p['historicalProductionBaselinesRebuilt']);self.assertEqual(p['internalComparisons'],57)
  self.assertFalse(p['publicationAuthorized'])
  bad=copy.deepcopy(ledger);bad['players'].pop()
  with self.assertRaises(ValueError):replay(*args,bad)
 def test_saved_native_baseline_receipt(self):
  p=json.loads((ROOT/'docs/261021_Awards_Production_Baseline_Ledger.json').read_text())
  self.assertEqual(p['checked'],9640);self.assertEqual(p['differenceCount'],0);self.assertEqual(len(p['players']),19)
if __name__=='__main__':unittest.main()
