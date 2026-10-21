import sys,unittest,zipfile,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_downstream_postcheck import equal,cache_value,in_rectangles,pivot_rectangles,array_dependents
import xml.etree.ElementTree as E
class DownstreamChecks(unittest.TestCase):
 def test_numeric_serialization(self):
  self.assertTrue(equal(0.1,0.100000000000001));self.assertFalse(equal(1,2));self.assertFalse(equal(None,0))
 def test_cache_types(self):
  for xml,want in [('<m/>',None),('<n v="2"/>',2),('<s v="name"/>','name'),('<d v="1899-12-31T00:00:00"/>',1),('<e v="#N/A"/>',('error','#N/A'))]:self.assertEqual(cache_value(E.fromstring(xml)),want)
  with self.assertRaises(ValueError):cache_value(E.fromstring('<unsupported/>'))
 def test_rectangles_precise(self):
  rect=[(1,2,46,655)]
  for a in ['A2','AT655']:self.assertTrue(in_rectangles(a,rect))
  for a in ['A1','AU2','A656']:self.assertFalse(in_rectangles(a,rect))
 def test_array_cache_exemption_excludes_anchor_and_neighbours(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:z.writestr('sheet.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><f t="array" ref="B2:B4">SUM(A1)</f></worksheet>')
  with zipfile.ZipFile(b) as z:self.assertEqual(array_dependents(z,'sheet.xml'),{'B3','B4'})
 def test_only_named_pivot_ranges(self):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   z.writestr('xl/worksheets/sheet2.xml','<worksheet/>')
   z.writestr('xl/worksheets/_rels/sheet2.xml.rels','<Relationships><Relationship Type="x/pivotTable" Target="../pivotTables/pivotTable1.xml"/><Relationship Type="x/pivotTable" Target="../pivotTables/pivotTable2.xml"/></Relationships>')
   for i,name in [(1,'PlayerStatsBySeason'),(2,'OtherPivot')]:z.writestr(f'xl/pivotTables/pivotTable{i}.xml',f'<pivotTableDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" name="{name}"><location ref="A2:AT655"/></pivotTableDefinition>')
  with zipfile.ZipFile(b) as z:self.assertEqual(pivot_rectangles(z),{'xl/worksheets/sheet2.xml':[(1,2,46,655)]})
if __name__=='__main__':unittest.main()
