"""Read-only award date/season controls and current schedule context. No Excel writes."""
import hashlib,json,posixpath,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
from datetime import datetime,timedelta
from hockeyos_awards_metadata_dependency_review import NS,decoded,number,letters

def inspect(path,schema_path):
 path=Path(path);before=hashlib.sha256(path.read_bytes()).hexdigest()
 schema=json.loads(Path(schema_path).read_text());out={}
 with zipfile.ZipFile(path) as z:
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
  rel={r.attrib['Id']:posixpath.normpath('xl/'+r.attrib['Target']) if not r.attrib['Target'].startswith('/') else r.attrib['Target'].lstrip('/') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets={s.attrib['name']:rel[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']] for s in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS)}
  root=E.fromstring(z.read(sheets['Master Schedule']));cells={c.attrib['r']:c for c in root.findall('m:sheetData/m:row/m:c',NS)}
  def val(address):
   cell=cells.get(address)
   if cell is None:return None
   v=cell.find('m:v',NS)
   if v is None:return None
   if cell.attrib.get('t')=='s':return ss[int(v.text)]
   try:return float(v.text)
   except (ValueError,TypeError):return v.text
  def record(address):
   c=cells.get(address);f=None if c is None else c.find('m:f',NS)
   return {'value':val(address),'formula':None if f is None else f.text,'arrayMode':f is not None and f.attrib.get('t')=='array'}
  out['controls']={a:record(a) for a in ['C1','J2','AH1','V2']}
  # Include each header control that these formula cells might refer to.
  out['headerControls']={a:record(a) for a in cells if int(re.search(r'\d+',a)[0])<=2 and (cells[a].find('m:f',NS) is not None or val(a) is not None)}
  t=next(t for t in schema['tables'] if t['name']=='AllTimeSchedule');cols={decoded(c['name']):letters(i+1) for i,c in enumerate(t['columns'])}
  rows=[]
  for rn in range(4,394):
   if val(cols['Season']+str(rn))!='W2026/27':continue
   row={'row':rn,**{k:val(v+str(rn)) for k,v in cols.items()}}
   if isinstance(row['Date'],(int,float)):row['dateISO']=(datetime(1899,12,30)+timedelta(days=row['Date'])).isoformat()
   rows.append(row)
  out['currentSeasonSchedule']=rows
  out['cachedCutoffISO']=(datetime(1899,12,30)+timedelta(days=val('AH1'))).isoformat() if isinstance(val('AH1'),(int,float)) else None
  out['dateBasedContestedCountAtCachedCutoff']=sum(isinstance(r['Game #'],(int,float)) and isinstance(r['Date'],(int,float)) and r['Date']<=val('AH1') and r['Game Type']=='Regular Season' for r in rows) if isinstance(val('AH1'),(int,float)) else None
  out['scheduleFormulaDefinitions']={c['name']:c['formula'] for t in schema['tables'] if t['name'] in ['AllTimeSchedule','SeasonInfo'] for c in t['columns'] if c['name'] in ['Game Contested','Total Games Contested']}
 out.update({'workbookSha256':before,'readOnlyHashUnchanged':hashlib.sha256(path.read_bytes()).hexdigest()==before,'currentScoresVerified':False,'publicationAuthorized':False})
 if not out['readOnlyHashUnchanged']:raise ValueError('Workbook changed during inspection')
 return out
if __name__=='__main__':
 result=inspect(sys.argv[1],sys.argv[2]);Path(sys.argv[3]).write_text(json.dumps(result,indent=2));print(json.dumps({'cutoff':result['cachedCutoffISO'],'dateBasedContestedCount':result['dateBasedContestedCountAtCachedCutoff'],'controls':result['controls']}))
