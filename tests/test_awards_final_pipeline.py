import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_final_pipeline import run
from hockeyos_awards_final_scores import MODELS
CAP=Path(__file__).resolve().parents[1]/'docs/261020_Awards_Original_Formula_Capture.json'
def fixture():
 result=[]
 for i,raw in enumerate([3,1,0]):
  row={'Name':str(i),'sourceWorksheetRow':6+i,'Award Scoring Type':'Skater'}
  for m in MODELS:row[m+' Eligible']=1;row[m+' Raw Composite Score']=raw
  result.append(row)
 return result
class FinalPipeline(unittest.TestCase):
 def test_all_eight_models_connected(self):
  p=run(fixture(),CAP);self.assertFalse(p['publicationAuthorized'])
  self.assertEqual([r['Andrew Cristillo Dedication Award Score'] for r in p['rows']],[100,67,50])
  for r in p['rows']:
   for rank,score,_ in MODELS.values():self.assertIn(rank+' Rank Key',r);self.assertIn(score+' Award Score',r)
 def test_rank_tie_keeps_original_row_order(self):
  rows=fixture();rows[1]['Hart Raw Composite Score']=3
  p=run(rows,CAP)['rows'];self.assertGreater(p[0]['Hart Rank Key'],p[1]['Hart Rank Key']);self.assertEqual(p[1]['Hart Award Score'],99)
 def test_rookie_rank_uses_final_then_raw(self):
  rows=run(fixture(),CAP)['rows'];r=rows[1]
  self.assertEqual(r['Rookie Rank Key'],r['Rookie of the Year Award Score']*1000000+100+(100000-7)/100000)
 def test_unknown_raw_holds(self):
  rows=fixture();rows[0]['Norris Raw Composite Score']=None
  with self.assertRaises(ValueError):run(rows,CAP)
 def test_bad_indices_rejected(self):
  for index in [None,5,56,True,7]:
   rows=fixture();rows[0]['sourceWorksheetRow']=index
   with self.assertRaises(ValueError):run(rows,CAP)
if __name__=='__main__':unittest.main()
