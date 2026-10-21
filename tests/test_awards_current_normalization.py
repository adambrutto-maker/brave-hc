import sys,json,tempfile,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_current_normalization import bindings,minmax_score,normalize,family_scores
ROOT=Path(__file__).resolve().parents[1]
class CurrentNormalization(unittest.TestCase):
 def fixture(self):
  b={'inputField':'Metric','formulaSha256':'test'};p={'season':'W2026/27','cutoff':'2026-10-18','playerCount':2,'players':[{'name':n,'season':'W2026/27'} for n in ['A','B']]};i={'season':p['season'],'cutoff':p['cutoff'],'inputField':'Metric','values':{'A':{'state':'VALUE','value':-2},'B':{'state':'VALUE','value':2}}};return b,p,i
 def test_native_bounds_reproduce_all_120_component_values(self):
  review=json.loads((ROOT/'docs/261021_Awards_Cohort_Impact_Review.json').read_text());checks=0
  for component in review['components']:
   for row in component['rows']:
    self.assertEqual(minmax_score(row['rawInternal'],*component['legacyBounds']),row['nativeDisplay']);checks+=1
  self.assertEqual(checks,120)
 def test_bind_all_44_and_preserve_ordinary_shutout_mode(self):
  supported,unsupported=bindings(ROOT/'docs/261020_Awards_Original_Formula_Capture.json');self.assertEqual(len(supported),44);self.assertEqual(unsupported,[]);self.assertEqual(supported['Total Award Goalie SHO Web Display Score']['storedFormulaTypes'],{'ordinary':50})
 def test_changed_source_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'capture.json';p.write_text((ROOT/'docs/261020_Awards_Original_Formula_Capture.json').read_text()+' ')
   with self.assertRaises(ValueError):bindings(p)
 def test_current_bounds_negative_values_and_no_input_mutation(self):
  b,p,i=self.fixture();before=copy.deepcopy((p,i));r=normalize(b,p,i);self.assertEqual(r['scores'],{'A':50,'B':100});self.assertEqual((p,i),before);self.assertFalse(r['currentCompositeScoresVerified'])
 def test_missing_or_extra_player_cannot_shift_denominator(self):
  b,p,i=self.fixture()
  for values in [{'A':i['values']['A']},{**i['values'],'Historical':{'state':'VALUE','value':100}}]:
   i['values']=values
   with self.assertRaises(ValueError):normalize(b,p,i)
 def test_unavailable_holds_entire_component(self):
  b,p,i=self.fixture();i['values']['B']={'state':'UNAVAILABLE','reason':'Carlyle not recalculated'};r=normalize(b,p,i);self.assertEqual(r['state'],'COMPONENT_INPUT_HOLD');self.assertIsNone(r['scores'])
 def test_not_applicable_is_not_an_unknown_zero(self):
  b,p,i=self.fixture();i['values']['B']={'state':'NOT_APPLICABLE','reason':'Skater-only source formula'};r=normalize(b,p,i);self.assertEqual(r['scores'],{'A':75});self.assertNotIn('B',r['scores'])
 def test_wrong_context_and_untyped_unknowns_rejected(self):
  for change in ['season','cutoff','inputField']:
   b,p,i=self.fixture();i[change]='wrong'
   with self.assertRaises(ValueError):normalize(b,p,i)
  for value in [None,True,float('nan'),float('inf')]:
   b,p,i=self.fixture();i['values']['A']['value']=value
   with self.assertRaises(ValueError):normalize(b,p,i)
 def test_source_tie_families_are_distinct(self):
  for value,want in [(-1,50),(0,75),(1,100)]:self.assertEqual(family_scores('MINMAX_SIGNED_TIE',{'A':value},{},{})['A'],want)
  self.assertEqual(family_scores('MINMAX_ABSOLUTE_TIE',{'A':40},{},{})['A'],70)
  self.assertEqual(family_scores('MINMAX_ABSOLUTE_TIE',{'A':-4},{},{})['A'],48)
 def test_explicit_inapplicable_adds_zero_only_to_source_coerced_family(self):
  self.assertEqual(family_scores('MINMAX_BLANK_ZERO',{'A':2},{'G':'source blank'},{}),{'A':100})
  self.assertEqual(family_scores('MINMAX_MIDPOINT',{'A':2},{'G':'source blank'},{}),{'A':75})
 def test_signed_improvement_preserves_both_signs_and_zero(self):
  v={'Worse':-4,'HalfWorse':-2,'Same':0,'HalfBetter':2,'Better':4};roles={n:'Skater' for n in v}
  self.assertEqual(family_scores('SKATER_IMPROVEMENT',v,{},roles),{'Worse':50,'HalfWorse':62.5,'Same':75,'HalfBetter':87.5,'Better':100})
 def test_goalie_offense_nonpositive_and_near_ties(self):
  self.assertEqual(family_scores('GOALIE_OFFENSE',{'G':-2},{},{'G':'Goaltender'}),{'G':75})
  self.assertEqual(family_scores('GOALIE_OFFENSE',{'G':0.00005},{},{'G':'Goaltender'}),{'G':75})
  self.assertEqual(family_scores('GOALIE_OFFENSE',{'G':1},{},{'G':'Goaltender'}),{'G':100})
  self.assertEqual(family_scores('GOALIE_OFFENSE',{'F':1},{},{'F':'Skater'}),{'F':0})
 def test_single_tie_and_rounding(self):
  self.assertEqual(minmax_score(0,0,0),75);self.assertEqual(minmax_score(0.1,0,100),50.1)
  with self.assertRaises(ValueError):minmax_score(3,0,2)
if __name__=='__main__':unittest.main()
