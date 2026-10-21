"""Special-teams component from complete accepted PPG/SHG observations."""
import json,math
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize
from hockeyos_awards_skater_support_baselines import SOURCE
FIELD='Total Final Special Teams Internal Score'
def replay(capture,candidate,population,baselines):
 if candidate.get('season')!=population.get('season') or population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18':raise ValueError('Accepted context required')
 if baselines.get('sourceWorkbookSha256')!=SOURCE or baselines.get('differenceCount')!=0:raise ValueError('Reconciled historical baselines required')
 players={p['name']:p for p in population['players']};skaters={n:{'GP':0,'PPG':0,'SHG':0} for n,p in players.items() if p['role']=='Skater'}
 if len(players)!=22 or len(skaters)!=19:raise ValueError('Complete current population required')
 historical={r['name']:r['values'] for r in baselines['players']}
 if len(historical)!=len(baselines['players']) or set(historical)!=set(skaters):raise ValueError('Complete baseline identities required')
 expected={(n,a['sourceGameId']) for n,p in players.items() for a in p['appearances']};seen=set()
 for r in candidate['rows']:
  v=r['inputs'];n=v['Name'];key=(n,r['sourceGameId'])
  if key not in expected or key in seen:raise ValueError('Duplicate/unaccepted appearance')
  seen.add(key)
  if (r['targetTable']=='SkaterStatsByGame')!=(n in skaters):raise ValueError('Role mismatch')
  if v.get('GP')!=1:raise ValueError('One GP per appearance required')
  if n not in skaters:continue
  for m in ('G','PPG','SHG'):
   x=v.get(m)
   if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or x<0 or int(x)!=x:raise ValueError('Complete integer '+m+' required')
  if v['PPG']+v['SHG']>v['G']:raise ValueError('Special goals exceed total goals')
  for m in ('GP','PPG','SHG'):skaters[n][m]+=v[m]
 if seen!=expected:raise ValueError('Incomplete appearance coverage')
 for n,t in skaters.items():
  if t['GP']!=players[n]['gp'] or t['GP']<=0:raise ValueError('GP mismatch')
 rates={n:(t['PPG']+t['SHG'])/t['GP'] for n,t in skaters.items()};mean=sum(rates.values())/len(rates);leader=max(t['PPG']+t['SHG'] for t in skaters.values());rule=bindings(capture)[FIELD];rows=[];values={}
 for n,p in players.items():
  inputs={}
  if n in skaters:
   t=skaters[n];inputs={**historical[n],'Current Total Skater Played Games':t['GP'],'Current Total Raw PPG':t['PPG'],'Current Total Raw SHG':t['SHG'],'Current Total PPG/GP':t['PPG']/t['GP'],'Current Total SHG/GP':t['SHG']/t['GP'],'Current Total Skater Special Teams Raw Leader':leader,'Current Total Skater Special Teams Field Rate Avg':mean}
  out=calculate(rule,n,p['role'],inputs)
  if out['state']=='SOURCE_BLANK' and p['role']=='Goaltender':values[n]={'state':'NOT_APPLICABLE','reason':'Source skater-only branch'}
  elif out['state']=='INTERNAL_VALUE_CANDIDATE':values[n]={'state':'VALUE','value':out['value']}
  else:raise ValueError('Unresolved special teams input '+str(out))
  rows.append({'name':n,**out,'rebuiltInputs':inputs})
 display=FIELD.replace('Internal Score','Web Display Score');rules,_=display_bindings(capture);normalized=normalize(rules[display],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':FIELD,'upstreamParityVerified':False,'values':values})
 return {'state':'SPECIAL_TEAMS_REBUILT_CORRECTED_NATIVE_PARITY_OPEN','season':population['season'],'cutoff':population['cutoff'],'numericInternalCount':19,'components':{FIELD:{'rows':rows,'normalized':normalized}},'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=replay(sys.argv[1],*[json.loads(Path(f).read_text()) for f in sys.argv[2:5]]);Path(sys.argv[5]).write_text(json.dumps(p,indent=2));print(p['state'])
