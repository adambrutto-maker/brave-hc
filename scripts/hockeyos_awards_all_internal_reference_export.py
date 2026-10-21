"""Read-only source of all internal-formula inputs from saved native XML caches."""
import hashlib,json,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def colnum(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n
def extract(workbook,native,schema):
 columns=[c for t in schema['tables'] if t['name']=='AwardScoring' for c in t['columns'] if c['name'].endswith(' Internal Score') or c['name'].endswith('Raw Improvement Index') or c['name'].endswith('Raw Composite Score')]
 required=set(f for c in columns for f in re.findall(r'PlayerInfo\[([^]]+)\]',c['formula']))|{'Website Name'}
 with zipfile.ZipFile(workbook) as z:
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
  table=next(t for p in z.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml',p) for t in [E.fromstring(z.read(p))] if t.get('name')=='PlayerInfo')
  a,b=table.get('ref').split(':');start=colnum(re.match('[A-Z]+',a)[0]);first=int(re.search(r'\d+',a)[0])+1;last=int(re.search(r'\d+',b)[0]);lookup={start+i:c.get('name') for i,c in enumerate(table.find('m:tableColumns',NS)) if c.get('name') in required}
  if set(lookup.values())!=required:raise ValueError('Missing master input columns')
  masters={}
  for row in E.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('m:sheetData/m:row',NS):
   if not first<=int(row.get('r'))<=last:continue
   values={name:0 for name in required}
   for cell in row:
    name=lookup.get(colnum(re.match('[A-Z]+',cell.get('r'))[0]))
    if name is None:continue
    v=cell.find('m:v',NS);text=v.text if v is not None else None;kind=cell.get('t')
    if kind=='e':value={'error':text}
    elif kind=='s':value=ss[int(text)]
    elif kind=='str':value=text or ''
    elif kind=='inlineStr':value=''.join(cell.find('m:is',NS).itertext())
    else:value=float(text) if text is not None else 0
    values[name]=value
   name=values.pop('Website Name')
   if name in masters:raise ValueError('Duplicate source master identity')
   masters[name]=values
 players=[]
 for row in native['awardRows']:
  if not row.get('Name'):continue
  name=row['Name']
  if name not in masters:raise ValueError('Native master join missing')
  players.append({'name':name,'role':row['Award Scoring Type'],'recentSeason':row['Recent Season'],'inputs':masters[name],'rowValues':{f:row[f] for f in set(f for c in columns for f in re.findall(r'AwardScoring\[\[#This Row\],\[([^]]+)\]\]',c['formula']))},'nativeValues':{c['name']:row[c['name']] for c in columns}})
 return {'state':'ALL_INTERNAL_LEGACY_NATIVE_REFERENCE_NOT_CURRENT_INPUT_ACCEPTANCE','playerCount':len(players),'componentCount':len(columns),'requiredPlayerInfoFieldCount':len(required)-1,'players':players,'blankPolicy':'Known native INDEX references to empty worksheet cells are represented as zero; formula empty strings and cell errors remain explicit. This is legacy reference semantics, not current missing-data imputation.','currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 workbook,native,schema,out=map(Path,sys.argv[1:]);pins={workbook:'30c6a6a27fe6a395d87dcfe878c74e9d97b39522c976ff10fce623d258c83235',native:'e8636061288812c2cdad9826a0e13c1f1214ce89817bea95522686d7ceab6057',schema:'2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae'}
 for p,want in pins.items():
  if hashlib.sha256(p.read_bytes()).hexdigest()!=want:raise ValueError('Pinned source changed '+str(p))
 r=extract(workbook,json.loads(native.read_text()),json.loads(schema.read_text()));r['sourceHashes']={p.name:h for p,h in pins.items()};out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='players'}))
