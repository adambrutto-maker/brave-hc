import sys,json,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_scalar_internals import bindings,calculate,compile_formula,evaluate,MissingInput
from hockeyos_awards_scalar_parity import compare
ROOT=Path(__file__).resolve().parents[1];CAP=ROOT/'docs/261020_Awards_Original_Formula_Capture.json'
class ScalarInternals(unittest.TestCase):
 def test_all44_internal_native_cases_match(self):
  r=compare(CAP,json.loads((ROOT/'docs/261021_Awards_All_Internal_Native_Reference.json').read_text()));self.assertEqual(r['comparisons'],1100);self.assertEqual(r['differenceCount'],0)
 def test_all52_scalar_native_cases_match(self):
  r=compare(CAP,json.loads((ROOT/'docs/261021_Awards_All_Scalar_Native_Reference.json').read_text()));self.assertEqual(r['comparisons'],1300);self.assertEqual(r['differenceCount'],0)
 def test_lazy_branches_do_not_require_unused_data(self):
  b={'ast':compile_formula('IF(0,PL("Missing"),5)')};self.assertEqual(calculate(b,'Player','Skater',{})['value'],5)
 def test_unknown_cannot_be_swallowed_by_iferror(self):
  b={'ast':compile_formula('IFERROR(PL("Required"),0)')}
  for values in [{},{'Required':None},{'Required':float('nan')},{'Required':'unknown'}]:self.assertEqual(calculate(b,'Player','Skater',values)['state'],'INPUT_HOLD')
 def test_known_source_error_and_formula_blank_are_explicit(self):
  b={'ast':compile_formula('IFERROR(PL("V"),0)')};self.assertEqual(calculate(b,'Player','Skater',{'V':{'error':'#N/A'}})['value'],0);self.assertEqual(calculate(b,'Player','Skater',{'V':''})['state'],'SOURCE_BLANK')
 def test_arithmetic_signs_rounding_and_comparisons(self):
  self.assertEqual(evaluate(compile_formula('ROUND(-1.2345,3)'),{},{}),-1.235);self.assertEqual(evaluate(compile_formula('IF(2+3*4=14,ABS(-2),0)'),{},{}),2)
 def test_unknown_functions_external_references_and_wrong_arity_rejected(self):
  for f in ['RUN("command")','Sheet1!A1','IF(1,2)','SUM()']:
   with self.assertRaises(ValueError):compile_formula(f)
 def test_duplicate_or_missing_reference_coverage_rejected(self):
  r=json.loads((ROOT/'docs/261021_Awards_All_Scalar_Native_Reference.json').read_text());r['players'][1]=r['players'][0]
  with self.assertRaises(ValueError):compare(CAP,r)
 def test_missing_current_composite_component_holds(self):
  b=bindings(CAP,True)['Rolaids Raw Composite Score'];r=calculate(b,'Player','Skater',{}, {'Rolaids Eligible':1});self.assertEqual(r['state'],'INPUT_HOLD')
if __name__=='__main__':unittest.main()
