import sys,tempfile,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_master_metadata_export import read
class MetadataExport(unittest.TestCase):
 def fixture(self,path,identity_formula=''):
  ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  with zipfile.ZipFile(path,'w') as z:
   z.writestr('xl/sharedStrings.xml',f'<sst xmlns="{ns}"><si><t>Carlyle, Adam</t></si><si><t>G</t></si></sst>')
   z.writestr('xl/tables/table1.xml',f'<table xmlns="{ns}" name="PlayerInfo" ref="A5:C6"><tableColumns><tableColumn name="Website Name"/><tableColumn name="Position"/><tableColumn name="Rookie Year"/></tableColumns></table>')
   z.writestr('xl/worksheets/sheet1.xml',f'<worksheet xmlns="{ns}"><sheetData><row r="6"><c r="A6" t="s">{identity_formula}<v>0</v></c><c r="B6" t="s"><v>1</v></c><c r="C6"><f>YEAR(TODAY())</f><v>2026</v></c></row></sheetData></worksheet>')
 def test_calculated_rookie_year_is_not_raw_identity(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'test.xlsx';self.fixture(p);self.assertEqual(read(p),[{'Website Name':'Carlyle, Adam','Position':'G'}])
 def test_identity_formula_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'test.xlsx';self.fixture(p,'<f>A1</f>')
   with self.assertRaises(ValueError):read(p)
if __name__=='__main__':unittest.main()
