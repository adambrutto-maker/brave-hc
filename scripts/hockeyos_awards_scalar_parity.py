"""Exact native arithmetic comparison for 44 internals and 8 raw composites."""
import json,sys,hashlib
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate

def compare(capture,reference):
 bound=bindings(capture,include_composites=reference['componentCount']==52)
 if len(reference['players'])!=reference['playerCount'] or len({p['name'] for p in reference['players']})!=reference['playerCount']:raise ValueError('Unique complete native population required')
 differences=[];checks=0;coverage={f:0 for f in bound};states={}
 for player in reference['players']:
  if set(player['nativeValues'])!=set(bound):raise ValueError('Complete scalar branch coverage required')
  for field,expected in player['nativeValues'].items():
   got=calculate(bound[field],player['name'],player['role'],player['inputs'],player.get('rowValues'));checks+=1;coverage[field]+=1;states[got['state']]=states.get(got['state'],0)+1
   if got['value']!=expected:differences.append({'name':player['name'],'field':field,'native':expected,'calculated':got})
 return {'state':'ALL_SCALAR_NATIVE_ARITHMETIC_PARITY_PASS' if not differences else 'SCALAR_NATIVE_PARITY_HOLD','formulaCount':len(bound),'comparisons':checks,'differenceCount':len(differences),'differences':differences,'coverage':coverage,'resultStates':states,'sourceHashes':reference['sourceHashes'],'currentCompositeScoresVerified':False,'publicationAuthorized':False,'limitation':'Pinned legacy arithmetic only; corrected current inputs, historical-chain validation, eligibility and final-score acceptance remain separate.'}
if __name__=='__main__':
 capture,reference,out=map(Path,sys.argv[1:]);r=compare(capture,json.loads(reference.read_text()));r['referenceFixtureSha256']=hashlib.sha256(reference.read_bytes()).hexdigest();out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ('coverage','differences')}))
