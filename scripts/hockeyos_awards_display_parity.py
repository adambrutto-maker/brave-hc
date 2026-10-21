"""Compare all captured display formulas to their complete legacy native rows."""
import hashlib,json,sys
from pathlib import Path
from hockeyos_awards_current_normalization import bindings,family_scores

def compare(capture,reference):
 supported,unsupported=bindings(capture)
 if unsupported or set(reference['components'])!=set(supported):raise ValueError('Complete display formula coverage required')
 checks=[];differences=[];identity_roles=None
 for field,component in reference['components'].items():
  if component['inputField']!=supported[field]['inputField']:raise ValueError('Reference input binding differs')
  rows=component['rows'];names=[r['name'] for r in rows]
  if len(names)!=len(set(names)) or len(rows)!=reference['namedNativeRows']:raise ValueError('Incomplete reference population')
  current_identity_roles={r['name']:r['role'] for r in rows}
  if identity_roles is None:identity_roles=current_identity_roles
  elif current_identity_roles!=identity_roles:raise ValueError('Reference identities or roles differ between components')
  numeric={r['name']:r['raw'] for r in rows if r['raw'] not in (None,'')};blank={r['name']:'Explicit native blank' for r in rows if r['raw'] in (None,'')};roles={r['name']:r['role'] for r in rows}
  actual=family_scores(supported[field]['family'],numeric,blank,roles) if numeric else {}
  for row in rows:
   value=actual.get(row['name'],0)
   if value!=row['nativeDisplay']:differences.append({'component':field,'name':row['name'],'calculated':value,'native':row['nativeDisplay']})
  checks.append({'component':field,'family':supported[field]['family'],'comparisons':len(rows),'numericInputs':len(numeric),'explicitBlankInputs':len(blank),'storedFormulaTypes':supported[field]['storedFormulaTypes']})
 return {'state':'ALL_LEGACY_DISPLAY_ARITHMETIC_PARITY_PASS' if not differences else 'DISPLAY_ARITHMETIC_PARITY_HOLD','componentCount':len(checks),'comparisons':sum(c['comparisons'] for c in checks),'differenceCount':len(differences),'differences':differences,'coverage':checks,'nativeExportSha256':reference['nativeExportSha256'],'currentCompositeScoresVerified':False,'publicationAuthorized':False,'limitation':'Legacy population arithmetic only. Current upstream inputs, current cohort correction, eligibility and final composite acceptance remain separate.'}
if __name__=='__main__':
 capture,reference,out=map(Path,sys.argv[1:]);r=compare(capture,json.loads(reference.read_text()));r['referenceFixtureSha256']=hashlib.sha256(reference.read_bytes()).hexdigest();out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='coverage'}))
