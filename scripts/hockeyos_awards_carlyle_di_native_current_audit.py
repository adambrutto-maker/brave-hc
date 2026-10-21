"""Compare corrected native Carlyle metadata, goalie history and reliability."""
import json,math,hashlib
from pathlib import Path

def audit(native,population,goalie_baselines,reliability):
 names={p['name'] for p in population['players']};pi={p['Website Name']:p for p in native['playerInfoRows']};awards={p['Name']:p for p in native['awardRows'] if p.get('Name')}
 if len(names)!=22 or not names<=set(pi) or not names<=set(awards):raise ValueError('Native copy omits current participants')
 if native['controls']['C1']!=population['season'] or native['awardErrors']:raise ValueError('Native context/errors differ')
 checks=[]
 def check(name,field,computed,actual,tolerance=0):
  checks.append({'name':name,'field':field,'computed':computed,'native':actual,'absoluteTolerance':tolerance,'matches':isinstance(actual,(int,float)) and math.isfinite(actual) and abs(computed-actual)<=tolerance})
 for p in goalie_baselines['players']:
  for field,value in p['values'].items():check(p['name'],field,value,pi[p['name']].get(field),0 if field=='Career Prior Goalie GP' else 1e-12)
 for field,c in reliability['components'].items():
  for r in c['rows']:
   if r['state']=='INTERNAL_VALUE_CANDIDATE':check(r['name'],field,r['value'],awards[r['name']].get(field))
 carlyle={'rosterStatus':pi['Carlyle, Adam'].get('Current Roster Status'),'recentSeason':pi['Carlyle, Adam'].get('Recent Season'),'role':pi['Carlyle, Adam'].get('Award Scoring Type'),'rookieEligible':awards['Carlyle, Adam'].get('Rookie Eligible')}
 identity_ok=carlyle=={'rosterStatus':'DI','recentSeason':population['season'],'role':'Goaltender','rookieEligible':0}
 differences=[c for c in checks if not c['matches']]
 return {'state':'CORRECTED_NATIVE_INPUT_AND_RELIABILITY_PARITY_PASS' if not differences and identity_ok else 'CORRECTED_NATIVE_INPUT_AND_RELIABILITY_PARITY_HOLD','checked':len(checks),'differenceCount':len(differences),'differences':differences,'carlyle':carlyle,'all22CurrentParticipantsPresent':True,'currentCompositeScoresVerified':False,'publicationAuthorized':False,'scope':'Corrected goalie historical inputs plus three raw reliability internals. Current display cohort and full composites not accepted.'}
if __name__=='__main__':
 import sys
 args=[json.loads(Path(p).read_text(encoding='utf-8-sig')) for p in sys.argv[1:5]];p=audit(*args);Path(sys.argv[5]).write_text(json.dumps(p,indent=2));print(json.dumps(p,indent=2))
