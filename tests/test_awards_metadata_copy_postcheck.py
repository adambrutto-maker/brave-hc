import importlib.util,sys,unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('postcheck',ROOT/'scripts/hockeyos_awards_metadata_copy_postcheck.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def styles(xfs,formats=''):
 xml='<styleSheet xmlns="'+m.NS['m']+'">'+formats+'<fonts><font><name val="A"/></font><font><name val="B"/></font></fonts><fills><fill/></fills><borders><border/></borders><cellStyleXfs><xf fontId="0" fillId="0" borderId="0" numFmtId="0"/></cellStyleXfs><cellXfs>'+xfs+'</cellXfs></styleSheet>'
 return m.style_fingerprints(SimpleNamespace(read=lambda _:xml.encode()))
class StylePreservationTests(unittest.TestCase):
 def test_reordered_style_ids_match_definitions(self):
  normal='<xf fontId="0" fillId="0" borderId="0" numFmtId="0" xfId="0"/>'
  other=normal.replace('fontId="0"','fontId="1"')
  before,after=styles(normal+other),styles(other+normal)
  self.assertEqual(before[0],after[1]);self.assertEqual(before[1],after[0])
 def test_actual_font_change_remains_a_difference(self):
  self.assertNotEqual(styles('<xf fontId="0"/>'),styles('<xf fontId="1"/>'))
 def test_custom_number_format_ids_are_resolved(self):
  one=styles('<xf numFmtId="164"/>','<numFmts><numFmt numFmtId="164" formatCode="0.0"/></numFmts>')
  same=styles('<xf numFmtId="170"/>','<numFmts><numFmt numFmtId="170" formatCode="0.0"/></numFmts>')
  different=styles('<xf numFmtId="170"/>','<numFmts><numFmt numFmtId="170" formatCode="0.00"/></numFmts>')
  self.assertEqual(one,same);self.assertNotEqual(one,different)
if __name__=='__main__':unittest.main()
