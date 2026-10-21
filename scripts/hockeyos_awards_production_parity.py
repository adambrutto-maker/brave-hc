"""Exact arithmetic comparison for the six captured production internals."""
import json,sys
from pathlib import Path
from hockeyos_awards_production_internals import bindings,calculate

def compare(capture,reference):
 if len(reference['players'])!=reference['playerCount'] or len({p['name'] for p in reference['players']})!=reference['playerCount']:raise ValueError('Complete unique native player population required')
 bound=bindings(capture);differences=[];checks=0;value_count=0;blank_count=0
 for player in reference['players']:
  if set(player['components'])!=set(bound):raise ValueError('Complete production branch coverage required')
  for field,item in player['components'].items():
   result=calculate(bound[field],player['role'],item['inputs']);checks+=1
   if result['state']=='INTERNAL_VALUE_CANDIDATE':value_count+=1
   elif result['state']=='NOT_APPLICABLE':blank_count+=1
   expected=item['nativeValue'];same=result['value']==expected or result['value'] is None and expected in ('',None)
   if result['state']=='INPUT_HOLD' or not same:differences.append({'name':player['name'],'field':field,'calculated':result,'native':expected})
 if checks!=reference['playerCount']*reference['componentCount']:raise ValueError('Reference coverage differs')
 return {'state':'SIX_PRODUCTION_INTERNAL_ARITHMETIC_PARITY_PASS' if not differences else 'PRODUCTION_INTERNAL_PARITY_HOLD','comparisons':checks,'numericValueComparisons':value_count,'inapplicableBlankComparisons':blank_count,'differenceCount':len(differences),'differences':differences,'nativeExportSha256':reference['nativeExportSha256'],'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 capture,reference,out=map(Path,sys.argv[1:]);r=compare(capture,json.loads(reference.read_text()));out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
