"""Check a metadata-only native review copy after Excel closes. No Excel writes."""
import hashlib,json,re,sys,zipfile,xml.etree.ElementTree as E
from pathlib import Path
from hockeyos_awards_metadata_dependency_review import NS,number,letters

from hockeyos_awards_metadata_copy_postcheck import style_fingerprints

def main(receipt_path,out_path):
 receipt=json.loads(Path(receipt_path).read_text(encoding='utf-8-sig'))
 if receipt['state']!='METADATA_COPY_SAVED_REQUIRES_XML_CHECKS_AND_DOWNSTREAM_CALCULATION' or not receipt.get('copySaved'):raise ValueError('Saved metadata candidate required')
 if not receipt.get('sourceHashUnchanged') or not receipt.get('baselineHashUnchanged'):raise ValueError('Input preservation not confirmed')
 if receipt.get('expectedWrites')!=4 or len(receipt['writes'])!=4 or sum(bool(w.get('existingCell')) for w in receipt['writes'])!=1:raise ValueError('Four authorized metadata writes required')
 errors=[];difference_count=0;checks=0;new_cells={}
 def fail(d):
  nonlocal difference_count
  difference_count+=1
  if len(errors)<40:errors.append(d)
 def strings(z):return [''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))]
 def sig(cell,ss,styles):
  f=cell.find('m:f',NS);v=cell.find('m:v',NS);value=v.text if v is not None else None
  if cell.attrib.get('t')=='s' and value is not None:value=ss[int(value)]
  if cell.attrib.get('t')=='inlineStr':value=''.join(cell.find('m:is',NS).itertext())
  return {'value':None if f is not None else value,'formula':None if f is None else f.text,'formulaMode':None if f is None else f.attrib.get('t','ordinary'),'formulaRef':None if f is None else f.attrib.get('ref'),'style':styles[int(cell.attrib.get('s','0'))]}
 with zipfile.ZipFile(receipt['baseline']) as base,zipfile.ZipFile(receipt['copy']) as copy:
  bs,cs=strings(base),strings(copy);bst,cst=style_fingerprints(base),style_fingerprints(copy)
  for sheet in [n for n in base.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml',n)]:
   copied={c.attrib['r']:sig(c,cs,cst) for c in E.fromstring(copy.read(sheet)).findall('m:sheetData/m:row/m:c',NS)}
   for _,cell in E.iterparse(base.open(sheet),events=('end',)):
    if cell.tag!='{'+NS['m']+'}c':continue
    address=cell.attrib['r'];col=number(re.match('[A-Z]+',address)[0]);row=int(re.search(r'\d+',address)[0]);target_row=row
    if sheet=='xl/worksheets/sheet1.xml':
     for added in receipt['addedRows']:
      if added['columnStart']<=col<added['columnStart']+added['columnCount'] and row>=added['row']:target_row+=1
    target=letters(col)+str(target_row);checks+=1
    expected=sig(cell,bs,bst);actual=copied.get(target)
    for write in receipt['writes']:
     if sheet=='xl/worksheets/sheet1.xml' and write.get('existingCell')==address:
      if expected['formula'] is not None or expected['value'] not in (None,''):raise ValueError('Existing raw blank status required')
      expected['value']=write['value']
    # Excel may discard an empty style-free cell; it has no saved data to lose.
    if actual is None and expected['style']==bst[0] and all(v is None for k,v in expected.items() if k!='style'):pass
    elif expected!=actual:fail({'sheet':sheet,'fromCell':address,'toCell':target,'differingFields':[k for k in expected if actual is None or expected[k]!=actual[k]]})
    cell.clear()
   if sheet=='xl/worksheets/sheet1.xml':new_cells=copied
  for added in receipt['addedRows']:
   table_path='xl/tables/table1.xml' if added['table']=='PlayerInfo' else 'xl/tables/table2.xml'
   table=E.fromstring(copy.read(table_path));expected_ref='A5:ZC116' if added['table']=='PlayerInfo' else 'ZE5:ZW497'
   if table.attrib['ref']!=expected_ref:fail({'table':added['table'],'range':table.attrib['ref']})
   columns=list(table.find('m:tableColumns',NS));lookup={c.attrib['name']:letters(added['columnStart']+i)+str(added['row']) for i,c in enumerate(columns)}
   planned={x['field']:x['value'] for x in receipt['writes'] if x['table']==added['table']}
   for column in columns:
    name=column.attrib['name'];cell=new_cells.get(lookup[name],{})
    if column.find('m:calculatedColumnFormula',NS) is not None:
     if cell.get('formula') is None:fail({'table':added['table'],'field':name,'reason':'NEW_FORMULA_MISSING'})
    elif cell.get('value')!=planned.get(name):fail({'table':added['table'],'field':name,'expected':planned.get(name),'actual':cell.get('value')})
 result={'state':'METADATA_COPY_PRESERVATION_PASS' if not errors else 'METADATA_COPY_PRESERVATION_HOLD','historicalCellsChecked':checks,'differenceCount':difference_count,'differences':errors,'styleComparison':'Resolved font/fill/border/number-format/style-XF definitions; style numeric IDs may be reordered by Excel','copy':receipt['copy'],'copySha256':hashlib.sha256(Path(receipt['copy']).read_bytes()).hexdigest(),'sourceHashUnchanged':hashlib.sha256(Path(receipt['source']).read_bytes()).hexdigest()=='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154','baselineHashUnchanged':hashlib.sha256(Path(receipt['baseline']).read_bytes()).hexdigest()=='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132','currentScoresVerified':False,'recalculationPerformed':False,'rosterStatusConfirmationApplied':receipt.get('rosterStatusConfirmationApplied',False),'publicationAuthorized':False}
 if not result['sourceHashUnchanged'] or not result['baselineHashUnchanged']:result['state']='METADATA_COPY_PRESERVATION_HOLD'
 Path(out_path).write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='differences'}));return 0 if result['state'].endswith('PASS') else 2
if __name__=='__main__':raise SystemExit(main(*sys.argv[1:]))
