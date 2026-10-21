"""Saved native reference verification: preservation, source cache values and cohort."""
import hashlib,json,math,posixpath,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
from datetime import datetime
from hockeyos_awards_metadata_dependency_review import NS,decoded,number,letters
from hockeyos_awards_metadata_copy_postcheck import style_fingerprints

def strings(z):return [''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
def value(cell,ss):
 if cell is None:return None
 v=cell.find('m:v',NS)
 if v is None or v.text is None:return None
 if cell.attrib.get('t')=='s':return ss[int(v.text)]
 if cell.attrib.get('t')=='e':return ('error',v.text)
 if cell.attrib.get('t') in ('str','inlineStr'):return v.text or None
 return float(v.text)
def cache_value(cell):
 kind=cell.tag.rsplit('}',1)[-1];v=cell.attrib.get('v')
 if kind=='m':return None
 if kind in ('n','b'):return float(v)
 if kind=='e':return ('error',v)
 if kind=='d':return (datetime.fromisoformat(v)-datetime(1899,12,30)).total_seconds()/86400
 if kind=='s':return v or None
 raise ValueError('Unsupported cache value type '+kind)
def equal(a,b):
 if isinstance(a,(int,float)) and isinstance(b,(int,float)):
  return a==b if float(a).is_integer() and float(b).is_integer() else math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-10)
 return a==b
def source_cache_fields(fields,headers):
 if [decoded(f.attrib['name']) for f in fields[:len(headers)]]!=headers:raise ValueError('Cache/table source field order differs')
 extras=fields[len(headers):]
 if any(f.attrib.get('databaseField','1')!='0' for f in extras):raise ValueError('Unexpected additional database field')
 return fields[:len(headers)],[{k:f.attrib.get(k) for k in ('name','formula','databaseField')} for f in extras]
def cache_definition_signatures(z):
 result={}
 for path in z.namelist():
  if not re.fullmatch(r'xl/pivotCache/pivotCacheDefinition\d+\.xml',path):continue
  root=E.fromstring(z.read(path));src=root.find('m:cacheSource/m:worksheetSource',NS)
  if src is None or src.get('name') not in ('SkaterStatsByGame','GoalieStatsByGame'):continue
  result[src.get('name')]=[(f.get('name'),f.get('formula'),f.get('databaseField','1')) for f in root.find('m:cacheFields',NS)]
 return result
def cache_review(path):
 result=[]
 with zipfile.ZipFile(path) as z:
  ss=strings(z);targets={}
  for name in z.namelist():
   if not re.fullmatch(r'xl/tables/table\d+\.xml',name):continue
   t=E.fromstring(z.read(name))
   if t.attrib['name'] in ('SkaterStatsByGame','GoalieStatsByGame'):targets[t.attrib['name']]=t
  source_rows={k:{} for k in targets}
  with z.open('xl/worksheets/sheet3.xml') as stream:
   for _,row in E.iterparse(stream,events=('end',)):
    if row.tag!='{'+NS['m']+'}row':continue
    rn=int(row.attrib['r']);cells={number(re.match('[A-Z]+',c.attrib['r'])[0]):c for c in row}
    for table,t in targets.items():
     a,b=t.attrib['ref'].split(':');first=int(re.search(r'\d+',a)[0])+1;last=int(re.search(r'\d+',b)[0]);start=number(re.match('[A-Z]+',a)[0]);count=len(t.find('m:tableColumns',NS))
     if first<=rn<=last:source_rows[table][rn-first]=[value(cells.get(start+i),ss) for i in range(count)]
    row.clear()
  for path in z.namelist():
   if not re.fullmatch(r'xl/pivotCache/pivotCacheDefinition\d+\.xml',path):continue
   root=E.fromstring(z.read(path));src=root.find('m:cacheSource/m:worksheetSource',NS)
   if src is None or src.attrib.get('name') not in targets:continue
   table=src.attrib['name'];fields=list(root.find('m:cacheFields',NS));headers=[decoded(c.attrib['name']) for c in targets[table].find('m:tableColumns',NS)]
   fields,extras=source_cache_fields(fields,headers)
   shared=[[cache_value(c) for c in f.find('m:sharedItems',NS)] if f.find('m:sharedItems',NS) is not None else [] for f in fields]
   rp=posixpath.dirname(path)+'/_rels/'+posixpath.basename(path)+'.rels'
   rels=E.fromstring(z.read(rp));target=next(r.attrib['Target'] for r in rels if r.attrib['Type'].endswith('/pivotCacheRecords'))
   records=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.dirname(path)+'/'+target)
   count=0;checks=0;differences=[];difference_count=0
   with z.open(records) as stream:
    for _,record in E.iterparse(stream,events=('end',)):
     if record.tag!='{'+NS['m']+'}r':continue
     source=source_rows[table].get(count)
     if source is None or len(record)!=len(fields):raise ValueError('Cache record shape differs')
     for col,c in enumerate(record):
      actual=shared[col][int(c.attrib['v'])] if c.tag.endswith('}x') else cache_value(c);expected=source[col];checks+=1
      if not equal(expected,actual):
       difference_count+=1
       if len(differences)<20:differences.append({'record':count,'field':headers[col],'source':expected,'cache':actual})
     count+=1;record.clear()
   if count!=len(source_rows[table]):raise ValueError('Cache coverage differs')
   result.append({'table':table,'additionalDerivedCacheFields':extras,'legacyErrorFormulaDefinitions':[f for f in extras if '#NAME?' in (f.get('formula') or '')],'records':count,'cellComparisons':checks,'differenceCount':difference_count,'examples':differences})
 if len(result)!=2:raise ValueError('Both caches required')
 return result
def pivot_rectangles(z):
 result={}
 for sheet in z.namelist():
  if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml',sheet):continue
  relpath=posixpath.dirname(sheet)+'/_rels/'+posixpath.basename(sheet)+'.rels'
  if relpath not in z.namelist():continue
  for rel in E.fromstring(z.read(relpath)):
   if not rel.attrib['Type'].endswith('/pivotTable'):continue
   target=rel.attrib['Target'];path=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.dirname(sheet)+'/'+target)
   pivot=E.fromstring(z.read(path))
   if pivot.attrib['name'] not in ('PlayerStatsBySeason','GoalieStatsBySeason'):continue
   ref=pivot.find('m:location',NS).attrib['ref'];a,b=ref.split(':')
   def point(c):return number(re.match('[A-Z]+',c)[0]),int(re.search(r'\d+',c)[0])
   result.setdefault(sheet,[]).append((*point(a),*point(b)))
 return result
def in_rectangles(address,rectangles):
 col=number(re.match('[A-Z]+',address)[0]);row=int(re.search(r'\d+',address)[0])
 return any(a<=col<=c and b<=row<=d for a,b,c,d in rectangles)
def array_dependents(z,sheet):
 cells=set()
 with z.open(sheet) as stream:
  for _,f in E.iterparse(stream,events=('end',)):
   if f.tag!='{'+NS['m']+'}f' or f.attrib.get('t')!='array' or ':' not in f.attrib.get('ref',''):continue
   a,b=f.attrib['ref'].split(':');ac=number(re.match('[A-Z]+',a)[0]);bc=number(re.match('[A-Z]+',b)[0]);ar=int(re.search(r'\d+',a)[0]);br=int(re.search(r'\d+',b)[0])
   cells.update(letters(c)+str(r) for r in range(ar,br+1) for c in range(ac,bc+1) if (r,c)!=(ar,ac))
 return cells
def preservation(receipt):
 errors=[];difference_count=0;checks=0;pivot_changes=0
 planned={letters(w['column'])+str(w['row']):w['value'] for w in receipt['inputWrites']}
 if len(planned)!=42:raise ValueError('Expected 42 distinct planned cells')
 with zipfile.ZipFile(receipt['baseline']) as base,zipfile.ZipFile(receipt['copy']) as copy:
  bs,cs=strings(base),strings(copy);bst,cst=style_fingerprints(base),style_fingerprints(copy)
  bp,cp=pivot_rectangles(base),pivot_rectangles(copy)
  cache_definitions_unchanged=cache_definition_signatures(base)==cache_definition_signatures(copy)
  if not cache_definitions_unchanged:raise ValueError('Native cache field definitions changed')
  def sig(c,ss,styles):
   f=c.find('m:f',NS)
   return {'value':None if f is not None else value(c,ss),'formula':None if f is None else f.text,'mode':None if f is None else f.attrib.get('t','ordinary'),'arrayRef':None if f is None else f.attrib.get('ref'),'style':styles[int(c.attrib.get('s','0'))]}
  for sheet in [p for p in base.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml',p)]:
   derived=array_dependents(base,sheet)
   actual={c.attrib['r']:sig(c,cs,cst) for c in E.fromstring(copy.read(sheet)).findall('m:sheetData/m:row/m:c',NS)}
   with base.open(sheet) as stream:
    for _,c in E.iterparse(stream,events=('end',)):
     if c.tag!='{'+NS['m']+'}c':continue
     address=c.attrib['r'];before=sig(c,bs,bst);after=actual.get(address);checks+=1
     if sheet=='xl/worksheets/sheet3.xml' and address in planned:before['value']=planned[address]
     if address in derived and after is not None and before['formula'] is None and after['formula'] is None:before['value']=after['value']
     if after is not None and before['formula'] is None and after['formula'] is None and in_rectangles(address,bp.get(sheet,[])+cp.get(sheet,[])):
      if before['value']!=after['value']:pivot_changes+=1
      before['value']=after['value']
     same=before==after or after is None and before['style']==bst[0] and all(v is None for k,v in before.items() if k!='style')
     if not same:
      difference_count+=1
      if len(errors)<30:errors.append({'sheet':sheet,'cell':address,'fields':[k for k in before if after is None or before[k]!=after[k]]})
     c.clear()
  game=E.fromstring(copy.read('xl/worksheets/sheet3.xml'));cells={c.attrib['r']:c for c in game.findall('m:sheetData/m:row/m:c',NS)}
  for a,want in planned.items():
   if value(cells.get(a),cs)!=want:raise ValueError('Planned write missing '+a)
 return {'cacheFieldDefinitionsPreserved':cache_definitions_unchanged,'cellsChecked':checks,'regeneratedPivotValueChanges':pivot_changes,'plannedWritesChecked':len(planned),'differenceCount':difference_count,'examples':errors,'formulaCachesIntentionallyRecalculated':True,'storedArrayDependentCachesIntentionallyRecalculated':True,'styleComparison':'Resolved definitions, not style IDs'}
def output_review(data,candidate):
 expected={};participants={entry['inputs']['Name'] for entry in candidate['rows']}
 for entry in candidate['rows']:
  if entry['targetTable']!='SkaterStatsByGame':continue
  row=entry['inputs'];t=expected.setdefault(row['Name'],{'GP':0,'G':0,'A':0,'Pts':0})
  for f in t:t[f]+=row[f]
 fields={'GP':'Current Skater GP','G':'Current Total Raw G','A':'Current Total Raw A','Pts':'Current Total Raw Pts'}
 pi={r['Website Name']:r for r in data['playerInfoRows']};mismatches=[]
 for name,totals in expected.items():
  if name not in pi:mismatches.append({'name':name,'reason':'PLAYER_INFO_MISSING'});continue
  for f,want in totals.items():
   if pi[name].get(fields[f])!=want:mismatches.append({'name':name,'field':f,'expected':want,'native':pi[name].get(fields[f])})
 current=set(expected);awards={r['Name']:r for r in data['awardRows'] if r.get('Name')};eligible={}
 for field in [k for k in data['awardRows'][0] if k.endswith(' Eligible')]:
  names=[r['Name'] for r in data['awardRows'] if r.get(field)==1]
  eligible[field]={'names':names,'otherSeasonNames':[n for n in names if n in pi and pi[n].get('Recent Season')!=data['controls']['C1']],'unknownIdentityNames':[n for n in names if n not in pi],'currentNamesOutsideAcceptedParticipants':[n for n in names if n in pi and pi[n].get('Recent Season')==data['controls']['C1'] and n not in participants]}
 for name,totals in expected.items():
  if name not in awards:mismatches.append({'name':name,'reason':'AWARD_TABLE_OMITS_CURRENT_SKATER'});continue
  for field,src in [('Art Ross Award Score','Pts'),('Rocket Richard Award Score','G')]:
   if awards[name].get(field)!=totals[src]:mismatches.append({'name':name,'field':field,'expected':totals[src],'native':awards[name].get(field)})
 damian=awards.get('Pavaday, Damian',{})
 return {'currentNamedParticipantsExpected':len(participants),'currentParticipantsMissingFromAwardTable':sorted(participants-set(awards)),'currentNamedSkatersExpected':len(expected),'currentSkatersInAwardTable':len(current & set(awards)),'playerInfoAndCountTitleMismatches':mismatches,'eligiblePopulationByCategory':eligible,'damian':{'playerInfoRosterStatus':pi.get('Pavaday, Damian',{}).get('Current Roster Status'),'presentInAwardTable':bool(damian),'rookieEligible':damian.get('Rookie Eligible')},'awardCellErrors':data['awardErrors'],'controls':data['controls']}
def main(folder,candidate_path):
 folder=Path(folder);receipt=json.loads((folder/'calculation-runtime.json').read_text(encoding='utf-8-sig'))
 if receipt['state']!='REFERENCE_COPY_SAVED_REQUIRES_SOURCE_AND_COHORT_PARITY_REVIEW' or not receipt.get('copySaved') or not receipt.get('sourceHashUnchanged') or not receipt.get('baselineHashUnchanged'):raise ValueError('Completed reference required')
 if hashlib.sha256(Path(candidate_path).read_bytes()).hexdigest()!='d940763965786aa4288217838e102eb5611a73995f5b5d71afc56f7247a31fe4':raise ValueError('Candidate pin changed')
 before=hashlib.sha256(Path(receipt['copy']).read_bytes()).hexdigest();candidate=json.loads(Path(candidate_path).read_text());data=json.loads((folder/'native-reference-values.json').read_text(encoding='utf-8-sig'))
 out={'preservation':preservation(receipt),'caches':cache_review(receipt['copy']),'outputs':output_review(data,candidate),'copySha256':before,'currentScoresVerified':False,'publicationAuthorized':False}
 out['readOnlyHashUnchanged']=hashlib.sha256(Path(receipt['copy']).read_bytes()).hexdigest()==before
 out['protectedHashesUnchanged']=all(hashlib.sha256(Path(receipt[k]).read_bytes()).hexdigest()==v for k,v in {'source':'0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154','baseline':'12e90e974176bf49860c45d1becb375b76e21efc1fa9319fc5e0ae104addc994'}.items())
 out['state']='NATIVE_REFERENCE_CHECKS_PASS_NOT_PRODUCTION_ACCEPTANCE' if out['preservation']['differenceCount']==0 and all(c['differenceCount']==0 for c in out['caches']) and not out['outputs']['playerInfoAndCountTitleMismatches'] and not any(c['otherSeasonNames'] or c['unknownIdentityNames'] or c['currentNamesOutsideAcceptedParticipants'] for c in out['outputs']['eligiblePopulationByCategory'].values()) and not out['outputs']['currentParticipantsMissingFromAwardTable'] and not out['outputs']['awardCellErrors'] and out['outputs']['damian']['presentInAwardTable'] and out['outputs']['damian']['playerInfoRosterStatus']=='DI' and out['outputs']['damian']['rookieEligible']==0 and out['protectedHashesUnchanged'] and out['readOnlyHashUnchanged'] else 'NATIVE_REFERENCE_RECONCILIATION_HOLD'
 (folder/'downstream-postcheck.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k not in ('outputs','caches','preservation')},indent=2))
if __name__=='__main__':main(*sys.argv[1:])
