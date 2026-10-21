"""Read-only structured-table dependency inventory and exact player-master search.

This inventories captured formulas; it does not evaluate Excel or resolve ordinary
cell references. A cohort reference is retained as a dependency, not called a cycle.
"""
import hashlib,json,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path

NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def decoded(text):
 return re.sub(r'_x([0-9a-fA-F]{4})_',lambda m:chr(int(m[1],16)),text)
def unquoted(text):
 return re.sub(r'"(?:[^"]|"")*"','""',text)
def refs(formula,context,tables):
 text=unquoted(formula);found=set()
 for name in re.findall(r'(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\[',text):
  if name not in tables:raise ValueError('Unknown table: '+name)
 # Qualified references are scanned as balanced bracket groups. Local references
 # are interpreted only within their explicitly supplied table context.
 pattern=re.compile(r'(?<![A-Za-z0-9_])('+ '|'.join(re.escape(t) for t in sorted(tables,key=len,reverse=True))+r')(?=\[)|(?<![A-Za-z0-9_\]])\[')
 for match in pattern.finditer(text):
  table=match.group(1) or context
  start=match.end() if match.group(1) else match.start()
  # Nested groups of an already qualified/local reference are not separate refs.
  if text[:start].count('[')!=text[:start].count(']'):continue
  end=start;depth=0
  for end in range(start,len(text)):
   if text[end]=='[':depth+=1
   elif text[end]==']':
    depth-=1
    if depth==0:break
  if depth:raise ValueError('Unclosed structured reference')
  body=re.sub(r"'([#@\[\]'])",r'\1',text[start:end+1])
  columns=list(tables[table]);hits=[f for f in columns if '['+f+']' in body]
  if body in ('[#All]','[#Data]','[#Totals]'):hits=columns
  elif body=='[#Headers]':continue
  if not hits:raise ValueError('Unresolved structured reference: '+table+body)
  if ']:[' in body:
   lo,hi=min(columns.index(f) for f in hits),max(columns.index(f) for f in hits)
   hits=columns[lo:hi+1]
  found.update((table,f) for f in hits)
 return found
def inventory(schema):
 tables={t['name']:{decoded(c['name']):c for c in t['columns']} for t in schema['tables']}
 def closure(roots):
  pending=list(roots);seen=set();raw=set();ordinary=set();unsupported=[]
  while pending:
   node=pending.pop()
   if node in seen:continue
   seen.add(node);table,field=node;c=tables[table][field];formula=decoded(c.get('formula') or '')
   if not formula:raw.add(node);continue
   ordinary.update(re.findall(r"(?:'[^']+'|[A-Za-z_][A-Za-z0-9_ ]*)!\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?",unquoted(formula)))
   try:pending.extend(sorted(refs(formula,table,tables)))
   except ValueError as error:unsupported.append({'table':table,'field':field,'error':str(error)})
  return {'structuredNodesVisited':len(seen),'rawPlayerInfoFields':sorted(f for t,f in raw if t=='PlayerInfo'),'rawRosterFields':sorted(f for t,f in raw if t=='RosterStatusBySeason'),'rawInputTables':sorted({t for t,f in raw}),'rawInputsByTable':{t:sorted(f for rt,f in raw if rt==t) for t in sorted({t for t,f in raw})},'historicalPlayerInfoFields':sorted(f for t,f in seen if t=='PlayerInfo' and (f.startswith('Career Prior ') or f.startswith('All-Time '))),'ordinaryReferencesRequiringSeparateResolution':sorted(ordinary),'unsupportedStructuredReferences':unsupported}
 categories={}
 for prefix in ['Hart','Conn Smythe','Norris','Art Ross','Rocket Richard','Rookie','Lady Byng','Most Improved','Rolaids','Dedication']:
  roots=[('AwardScoring',f) for f in tables['AwardScoring'] if f.startswith(prefix) and ('Eligible' in f or 'Score' in f or 'Rank Key' in f)]
  if not roots:raise ValueError('Missing award roots: '+prefix)
  categories[prefix]=closure(roots)
  categories[prefix]['rootFields']=[f for t,f in roots]
 return tables,categories
def number(s):
 n=0
 for c in s:n=n*26+ord(c)-64
 return n
def letters(n):
 s=''
 while n:n,a=divmod(n-1,26);s=chr(65+a)+s
 return s
def master_rows(path,schema):
 out={}
 with zipfile.ZipFile(path) as z:
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
  def value(c):
   if c is None:return None
   v=c.find('m:v',NS)
   if v is None:return None
   return ss[int(v.text)] if c.attrib.get('t')=='s' else v.text
  # Both registered tables are on the source's Player Info worksheet (sheet1).
  root=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
  rows={int(r.attrib['r']):{re.match('[A-Z]+',c.attrib['r'])[0]:c for c in r} for r in root.findall('m:sheetData/m:row',NS)}
  for name,key in [('PlayerInfo','Website Name'),('RosterStatusBySeason','Name')]:
   t=next(t for t in schema['tables'] if t['name']==name)
   start,end=t['ref'].split(':');start_col=number(re.match('[A-Z]+',start)[0]);first=int(re.search(r'\d+',start)[0])+1;last=int(re.search(r'\d+',end)[0])
   cols={decoded(c['name']):letters(start_col+i) for i,c in enumerate(t['columns'])}
   exact=[];surname=[]
   for rn in range(first,last+1):
    cells=rows.get(rn,{});player=value(cells.get(cols[key]))
    if player=='Pavaday, Damian':exact.append({'row':rn,'values':{decoded(c['name']):value(cells.get(cols[decoded(c['name'])])) for c in t['columns'] if not c.get('formula')}})
    if isinstance(player,str) and 'pavaday' in player.casefold():surname.append({'row':rn,'name':player})
   out[name]={'registeredRange':t['ref'],'rowsSearched':last-first+1,'exactMatches':exact,'surnameMatches':surname}
 return out
def main(schema_path,source_path,out_path):
 source_path=Path(source_path);before=hashlib.sha256(source_path.read_bytes()).hexdigest()
 if before!='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154':raise ValueError('Original source changed')
 schema_bytes=Path(schema_path).read_bytes()
 if hashlib.sha256(schema_bytes).hexdigest()!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae':raise ValueError('Captured schema changed')
 schema=json.loads(schema_bytes);tables,categories=inventory(schema)
 out={'state':'METADATA_DEPENDENCY_INVENTORY_NOT_SCORING_VERIFICATION','sourceWorkbookSha256':before,'categories':categories,'damianSourceMasterSearch':master_rows(source_path,schema),'limitations':['Structured-table closure only; ordinary and same-sheet cell precedents are not fully resolved.','Missing master history is not proof of rookie status or first full-time year.','No alias to another Damian is assumed.','Hall of Fame career rules remain a separate validation task.'],'currentScoresVerified':False,'publicationAuthorized':False}
 out['sourceHashUnchanged']=hashlib.sha256(source_path.read_bytes()).hexdigest()==before
 if not out['sourceHashUnchanged']:raise ValueError('Source changed during read-only inspection')
 Path(out_path).write_text(json.dumps(out,indent=2),encoding='utf-8');print(json.dumps({'categories':len(categories),'unsupported':sum(len(c['unsupportedStructuredReferences']) for c in categories.values()),'sourceHashUnchanged':True}))
if __name__=='__main__':main(*sys.argv[1:])
