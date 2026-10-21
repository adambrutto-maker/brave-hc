"""Read only the raw identity/role/status fields from the saved review master."""
import json,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
from hockeyos_awards_metadata_dependency_review import NS,decoded,number,letters

def read(path):
 with zipfile.ZipFile(path) as z:
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
  tables=[E.fromstring(z.read(p)) for p in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',p)];t=next(t for t in tables if t.attrib['name']=='PlayerInfo')
  start,end=t.attrib['ref'].split(':');col=number(re.match('[A-Z]+',start)[0]);first=int(re.search(r'\d+',start)[0])+1;last=int(re.search(r'\d+',end)[0])
  wanted={'Website Name','First Name','Last Name','Position','Position 2','Current Roster Status','Rookie Year'};columns={col+i:decoded(c.attrib['name']) for i,c in enumerate(t.find('m:tableColumns',NS)) if decoded(c.attrib['name']) in wanted};rows=[]
  for row in E.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('m:sheetData/m:row',NS):
   if not first<=int(row.attrib['r'])<=last:continue
   record={name:None for name in columns.values()}
   for c in row:
    key=columns.get(number(re.match('[A-Z]+',c.attrib['r'])[0]))
    if key is None:continue
    if c.find('m:f',NS) is not None:raise ValueError('Requested metadata field is calculated '+key)
    v=c.find('m:v',NS)
    if v is not None and v.text is not None:record[key]=ss[int(v.text)] if c.get('t')=='s' else v.text if c.get('t')=='str' else float(v.text)
   rows.append(record)
 return rows
if __name__=='__main__':
 source,out=map(Path,sys.argv[1:]);rows=read(source);out.write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'masterRows':len(rows)}))
