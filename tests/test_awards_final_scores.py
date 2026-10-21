import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_final_scores import calculate,legacy_parity,MODELS
CAPTURE=Path(__file__).resolve().parents[1]/'docs/261020_Awards_Original_Formula_Capture.json'
def rows(model,values):
 rank=MODELS[model][0]+' Rank Key'
 return [{'Name':str(i),'Award Scoring Type':'Skater',model+' Eligible':1,model+' Raw Composite Score':v,rank:100-i} for i,v in enumerate(values)]
class FinalScores(unittest.TestCase):
 def scores(self,model,values):return [r['score'] for r in calculate(model,rows(model,values),CAPTURE)['results']]
 def test_original_native_all_eight(self):
  p=legacy_parity(CAPTURE);self.assertEqual(p['checked'],192);self.assertEqual(p['differences'],0)
 def test_single_rules(self):
  for m in ('Conn Smythe','Norris','Rookie'):self.assertEqual(self.scores(m,[20]),[75])
  for m in ('Hart','Rolaids','Lady Byng','Dedication'):self.assertEqual(self.scores(m,[20]),[100])
 def test_ties(self):
  self.assertEqual(self.scores('Hart',[90,90]),[100,99])
  self.assertEqual(self.scores('Rookie',[90,90]),[100,100])
  self.assertEqual(self.scores('Dedication',[90,90]),[100,100])
 def test_signed(self):self.assertEqual(self.scores('Most Improved',[20,20,0,-10,-20]),[100,99,75,63,50])
 def test_decimal(self):self.assertEqual(self.scores('Dedication',[10,1,0]),[100,55,50])
 def test_floor(self):self.assertEqual(self.scores('Hart',[100,0]),[100,50])
 def test_unknown_holds(self):
  for v in (None,float('nan'),''):
   with self.assertRaises(ValueError):self.scores('Hart',[v])
 def test_ineligible_blank(self):
  for model in MODELS:
   r=rows(model,[None]);r[0][model+' Eligible']=0
   score=calculate(model,r,CAPTURE)['results'][0]['score'];self.assertEqual(score,'' if model=='Dedication' else 0)
 def test_invalid_cohort(self):
  r=rows('Hart',[1]);r.append(r[0])
  with self.assertRaises(ValueError):calculate('Hart',r,CAPTURE)
  r=rows('Hart',[1]);del r[0]['Hart Eligible']
  with self.assertRaises(ValueError):calculate('Hart',r,CAPTURE)
if __name__=='__main__':unittest.main()
