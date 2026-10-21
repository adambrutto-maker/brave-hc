"""Read-only raw/cached eligibility source extraction; no Excel recalculation."""
import json,hashlib,re,posixpath,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
PIN='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
def col(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n
def export(path):
 before=hashlib.sha256(Path(path).read_bytes()).hexdigest()
 if before!=PIN:raise ValueError('Protected source pin changed')
 with zipfile.ZipFile(path) as z:
  ss=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml'))]
  rel={r.attrib['Id']:posixpath.normpath('xl/'+r.attrib['Target']) if not r.attrib['Target'].startswith('/') else r.attrib['Target'].lstrip('/') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets={s.attrib['name']:rel[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']] for s in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS)}
  tables={}
  for p in z.namelist():
   if re.fullmatch(r'xl/tables/table\d+\.xml',p):
    t=E.fromstring(z.read(p));tables[t.attrib['name']]=t
  cache={}
  def read(table,sheet,wanted):
   t=tables[table];start,end=t.attrib['ref'].split(':');offset=col(re.match('[A-Z]+',start)[0]);first=int(re.search(r'\d+',start)[0])+1;last=int(re.search(r'\d+',end)[0])
   columns={offset+i:c.attrib['name'].replace("'",'') for i,c in enumerate(t.find('m:tableColumns',NS)) if c.attrib['name'].replace("'",'') in wanted}
   if set(columns.values())!=set(wanted):raise ValueError('Missing source columns '+table)
   if sheet not in cache:cache[sheet]=E.fromstring(z.read(sheets[sheet]))
   result=[]
   for row in cache[sheet].findall('m:sheetData/m:row',NS):
    if not first<=int(row.attrib['r'])<=last:continue
    r={k:'' for k in wanted};r['sourceRow']=int(row.attrib['r'])
    for c in row:
     k=columns.get(col(re.match('[A-Z]+',c.attrib['r'])[0]))
     if k is None:continue
     v=c.find('m:v',NS)
     if v is not None and v.text is not None:r[k]=ss[int(v.text)] if c.get('t')=='s' else v.text if c.get('t') in ('str','e') else float(v.text)
    result.append(r)
   return result
  result={'playerInfo':read('PlayerInfo','Player Information',['Website Name','Position','Position 2','Current Roster Status','Recent Season','Rookie Status','Rookie Year','Career Prior Skater GP','Career Prior Goalie GP','Position Group']),
   'roster':read('RosterStatusBySeason','Player Information',['Name','Season','Status','Total Games']),
   'schedule':read('AllTimeSchedule','Master Schedule',['Game #','Season','Game Type','Date']),
   'skaterGames':read('SkaterStatsByGame','Player Game Logs',['Game #','Name','Season','GP','Game Type']),
   'goalieGames':read('GoalieStatsByGame','Player Game Logs',['Game #','Name','Season','GP','Game Type'])}
 result.update({'sourceWorkbookSha256':before,'readOnlyHashUnchanged':hashlib.sha256(Path(path).read_bytes()).hexdigest()==before,'publicationAuthorized':False})
 return result
if __name__=='__main__':
 result=export(sys.argv[1]);Path(sys.argv[2]).write_text(json.dumps(result,indent=2));print(json.dumps({k:len(v) for k,v in result.items() if isinstance(v,list)}))
