"""Read-only Hall of Fame arithmetic reference; preserves full career population."""
import json,hashlib,re,posixpath,zipfile,xml.etree.ElementTree as E
from pathlib import Path
PIN='bfcae41a39e3399ea01ac2b2fe9696da78dc5d57f47399e448a7beed44532c85'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def col(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n
def export(path,schema_path):
 if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=PIN:raise ValueError('Native reference changed')
 schema_bytes=Path(schema_path).read_bytes()
 if hashlib.sha256(schema_bytes).hexdigest()!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae':raise ValueError('Schema changed')
 schema=json.loads(schema_bytes);formulas={c['name']:c.get('formula') for t in schema['tables'] if t['name']=='PlayerInfo' for c in t['columns'] if c['name'].startswith('HOF ')}
 with zipfile.ZipFile(path) as z:
  ss=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))];rels={r.attrib['Id']:posixpath.normpath('xl/'+r.attrib['Target']) if not r.attrib['Target'].startswith('/') else r.attrib['Target'].lstrip('/') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))};sheets={s.attrib['name']:rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']] for s in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS)};tables={}
  for p in z.namelist():
   if re.fullmatch(r'xl/tables/table\d+\.xml',p):
    t=E.fromstring(z.read(p));tables[t.attrib['name']]=t
  def read(table,wanted):
   t=tables[table];start,end=t.attrib['ref'].split(':');offset=col(re.match('[A-Z]+',start)[0]);first=int(re.search(r'\d+',start)[0])+1;last=int(re.search(r'\d+',end)[0]);columns={offset+i:c.attrib['name'] for i,c in enumerate(t.find('m:tableColumns',NS)) if wanted(c.attrib['name'])};rows=[]
   # Resolve the table's actual worksheet through worksheet table relationships.
   candidates=[]
   for sheet,p in sheets.items():
    relpath=posixpath.dirname(p)+'/_rels/'+posixpath.basename(p)+'.rels'
    if relpath in z.namelist():
     if any(posixpath.normpath(posixpath.dirname(p)+'/'+r.attrib['Target'])==next(q for q in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',q) and E.fromstring(z.read(q)).attrib['name']==table) for r in E.fromstring(z.read(relpath))):candidates.append(p)
   if len(candidates)!=1:raise ValueError('Ambiguous table worksheet')
   for row in E.fromstring(z.read(candidates[0])).findall('m:sheetData/m:row',NS):
    if not first<=int(row.attrib['r'])<=last:continue
    r={'sourceRow':int(row.attrib['r']),**{k:'' for k in columns.values()}}
    for c in row:
     k=columns.get(col(re.match('[A-Z]+',c.attrib['r'])[0]));v=c.find('m:v',NS)
     if k is not None and v is not None and v.text is not None:r[k]=ss[int(v.text)] if c.get('t')=='s' else v.text if c.get('t') in ('str','e') else float(v.text)
    rows.append(r)
   return rows
  players=read('PlayerInfo',lambda n:n.startswith('HOF ') or n in ('Website Name','Career Total Skater GP','Career Total Goalie GP'))
  awards=read('AwardSummary',lambda n:n in ('Player','Brave H.C. Hall of Fame','Major Awards Won','Minor Awards Won','Points Awarded'))
 return {'state':'SAVED_HOF_ARITHMETIC_REFERENCE_NOT_REBUILT_CAREER_INPUTS','sourceWorkbookSha256':PIN,'sourceSchemaSha256':hashlib.sha256(schema_bytes).hexdigest(),'readOnlyHashUnchanged':hashlib.sha256(Path(path).read_bytes()).hexdigest()==PIN,'formulas':formulas,'players':players,'awardSummary':awards,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=export(sys.argv[1],sys.argv[2]);Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({'players':len(p['players']),'awards':len(p['awardSummary'])}))
