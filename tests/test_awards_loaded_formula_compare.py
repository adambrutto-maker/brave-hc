"""Notation comparison checks; no Excel or workbook writes."""
import sys
sys.dont_write_bytecode=True
import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("loaded_compare",ROOT/"scripts/hockeyos_awards_loaded_formula_compare.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class FormulaNotationTests(unittest.TestCase):
 def setUp(self):self.fields={"Name","Some Field"}
 def test_known_local_row_and_column_shorthand(self):
  source='=ROWS(INDEX(AwardScoring[Name],1):AwardScoring[[#This Row],[Name]])'
  native='=ROWS(INDEX([Name],1):[@Name])'
  self.assertEqual(module.canonical(source,"AwardScoring",self.fields),module.canonical(native,"AwardScoring",self.fields))
  self.assertEqual(module.canonical('=[@[Some Field]]',"AwardScoring",self.fields),'=AwardScoring[[#This Row],[Some Field]]')
 def test_quoted_text_and_other_table_references_are_preserved(self):
  text='=IF(Name="_xlfn.[Name]",PlayerInfo[Name],"a""b")'
  self.assertEqual(module.canonical(text,"AwardScoring",self.fields),text)
 def test_standalone_implicit_intersection_is_not_removed(self):
  self.assertNotEqual(module.canonical('=@INDEX([Name],1)',"AwardScoring",self.fields),module.canonical('=INDEX([Name],1)',"AwardScoring",self.fields))
 def test_unknown_fields_and_unterminated_tokens_reject(self):
  for text in ['=[Wrong]','=[Name','="missing']:
   with self.assertRaises(ValueError):module.canonical(text,"AwardScoring",self.fields)
 def test_function_namespace_only_can_differ(self):
  self.assertEqual(module.canonical('=_xlfn.AGGREGATE(14,6,[Name],1)',"AwardScoring",self.fields),module.canonical('=AGGREGATE(14,6,[Name],1)',"AwardScoring",self.fields))
 def test_full_supplied_source_and_lost_array_mode(self):
  capture=json.loads((ROOT/"docs/261020_Awards_Original_Formula_Capture.json").read_text())
  native=[{"name":c["name"],"formula":"="+c["firstStoredFormula"]["formula"],"hasArray":c["firstStoredFormula"]["metadata"].get("t")=="array"} for c in capture["columns"]]
  result=module.compare(capture,native)
  self.assertEqual(result["checked"],146);self.assertEqual(result["nativeArrayColumns"],132);self.assertEqual(result["differences"],[])
  next(c for c in native if c["hasArray"])["hasArray"]=False
  self.assertTrue(any(d["reason"]=="ARRAY_MODE_DIFFERS" for d in module.compare(capture,native)["differences"]))
 def test_incomplete_inventory_rejects(self):
  with self.assertRaises(ValueError):module.compare({"columns":[]},[])
if __name__=="__main__":unittest.main()

