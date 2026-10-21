import sys,unittest,copy,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_cohort_impact import impact,normalized,RAW,DISPLAY,impact_all
class CohortImpact(unittest.TestCase):
 def fixture(self):
  c={'season':'W2026/27','rows':[{'inputs':{'Name':n}} for n in ['A','B']]}
  d={'controls':{'C1':c['season']},'playerInfoRows':[{'Website Name':n,'Recent Season':c['season'] if n!='Old' else 'W2025/26'} for n in ['A','B','Old']],'awardRows':[{'Name':n,RAW:v,DISPLAY:score} for n,v,score in [('A',0,50),('B',10,55),('Old',100,100)]]}
  return d,c
 def test_stale_extreme_changes_current_component(self):
  d,c=self.fixture();before=copy.deepcopy(d);r=impact(d,c);self.assertEqual(r['legacyTranslationMismatchCount'],0);self.assertEqual(r['changedCurrentComponentCount'],1);self.assertEqual(r['rows'][1]['currentCohortCounterfactualDisplay'],100);self.assertFalse(r['currentScoresVerified']);self.assertEqual(d,before)
 def test_only_exact_template_is_translated(self):
  capture=json.loads((Path(__file__).resolve().parents[1]/'docs/261020_Awards_Original_Formula_Capture.json').read_text());column=next(c for c in capture['columns'] if c['name']==DISPLAY);schema={'tables':[{'name':'AwardScoring','columns':[column,{'name':'Unknown Web Display Score','formula':'SUM(A1:A3)'}]}]}
  d,c=self.fixture();r=impact_all(d,c,schema);self.assertEqual(r['matchedNormalizationCount'],1);self.assertEqual(r['unsupportedDisplayFormulas'],['Unknown Web Display Score'])
 def test_tied_cohort_midpoint(self):self.assertEqual(normalized(3,3,3),75)
 def test_native_mismatch_is_visible(self):
  d,c=self.fixture();d['awardRows'][0][DISPLAY]=51;self.assertEqual(impact(d,c)['legacyTranslationMismatchCount'],1)
 def test_wrong_season_rejected(self):
  d,c=self.fixture();c['season']='W2025/26'
  with self.assertRaises(ValueError):impact(d,c)
if __name__=='__main__':unittest.main()
