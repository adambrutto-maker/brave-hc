import json,unittest,sys,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_validated_eligibility_replay import replay
class ReconciledEligibility(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.ledger=json.loads((ROOT/'docs/261021_Awards_Eligibility_Source_Ledger.json').read_text());cls.capture=ROOT/'docs/261020_Awards_Original_Formula_Capture.json'
 def test_complete_current_decisions(self):
  p=replay(self.ledger,self.capture);self.assertEqual((p['resolvedCount'],p['holdCount']),(219,1))
  holds=[r for r in p['decisions'] if r['value'] is None]
  self.assertEqual([(r['name'],r['field'],r['possibleValues']) for r in holds],[('Carlyle, Adam','Rookie Eligible',[0.0,1.0])])
  for model,count in [('Art Ross',19),('Rocket Richard',19),('Rookie',5)]:self.assertEqual(sum(r['value']==1 for r in p['decisions'] if r['field']==model+' Eligible'),count)
  self.assertFalse(p['publicationAuthorized'])
 def test_unknown_status_preserved(self):
  before=copy.deepcopy(self.ledger);replay(self.ledger,self.capture);self.assertEqual(before,self.ledger)
  carlyle=next(p for p in self.ledger['players'] if p['name']=='Carlyle, Adam');self.assertIsNone(carlyle['rosterStatus'])
 def test_bad_source_rejected(self):
  for key,value in [('differenceCount',1),('sourceWorkbookSha256','wrong'),('cutoff','2026-10-25')]:
   p=copy.deepcopy(self.ledger);p[key]=value
   with self.assertRaises(ValueError):replay(p,self.capture)
if __name__=='__main__':unittest.main()
