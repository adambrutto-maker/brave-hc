"""Current category states driven by reconciled eligibility, never fabricated OVR."""
from hockeyos_awards_final_scores import MODELS

def build(population,eligibility,count_receipt):
 if eligibility.get('season')!=population.get('season') or eligibility.get('cutoff')!=population.get('cutoff') or eligibility.get('resolvedCount')!=220 or eligibility.get('holdCount')!=0:raise ValueError('Complete reconciled current eligibility required')
 names={p['name'] for p in population['players']}
 if len(names)!=22:raise ValueError('Complete accepted population required')
 groups={}
 for r in eligibility['decisions']:
  key=(r['name'],r['field'])
  if key in groups or r['name'] not in names or r['value'] not in (0,1):raise ValueError('Invalid current eligibility coverage')
  groups[key]=r['value']
 categories=[]
 for model in (*MODELS,'Art Ross','Rocket Richard'):
  if any((n,model+' Eligible') not in groups for n in names):raise ValueError('Missing category eligibility')
  eligible=sorted(n for n in names if groups[(n,model+' Eligible')]==1)
  if model in ('Art Ross','Rocket Richard'):
   if count_receipt.get('state')!='CURRENT_COUNT_ARITHMETIC_PARITY_PASS' or count_receipt.get('differences'):raise ValueError('Accepted count reference arithmetic required')
   if {r['name'] for r in count_receipt['outputs']['rows']}!=set(eligible):raise ValueError('Count/eligibility identity mismatch')
   category={'category':model,'state':'COUNT_CALCULATION_VERIFIED','eligibleNames':eligible,'scoreKind':'Actual points' if model=='Art Ross' else 'Actual goals'}
  elif not eligible:category={'category':model,'state':'NO_ELIGIBLE_PLAYERS','eligibleNames':[],'message':'No players meet the award requirements at this cutoff.'}
  else:category={'category':model,'state':'COMPOSITE_INPUT_VALIDATION_PENDING','eligibleNames':eligible,'message':'Eligible players identified; complete score validation remains open.'}
  categories.append(category)
 return {'season':population['season'],'cutoff':population['cutoff'],'categories':categories,'hallOfFameState':'SEPARATE_CAREER_RULE_VALIDATION_PENDING','publicationAuthorized':False,'currentCompositeScoresVerified':False}
if __name__=='__main__':
 import sys,json
 from pathlib import Path
 p=build(*[json.loads(Path(a).read_text()) for a in sys.argv[1:4]]);Path(sys.argv[4]).write_text(json.dumps(p,indent=2));print(json.dumps({c['category']:c['state'] for c in p['categories']}))
