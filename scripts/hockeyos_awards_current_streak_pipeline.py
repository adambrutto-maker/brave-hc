"""Current mixed-role streak heat from rebuilt career rows and accepted losses."""
import json
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize
from hockeyos_awards_streak_ledger import SOURCE

def replay(capture,candidate,population,ledger):
 if ledger.get('sourceWorkbookSha256')!=SOURCE or ledger.get('differenceCount')!=0:raise ValueError('Reconciled career streak source required')
 if candidate['season']!=population['season'] or population['season']!='W2026/27' or population['cutoff']!='2026-10-18':raise ValueError('Accepted context required')
 players={p['name']:p for p in population['players']};history={p['name']:p for p in ledger['players']};expected={(n,a['sourceGameId']) for n,p in players.items() for a in p['appearances']};seen=set()
 if len(players)!=22 or set(history)!={n for n,p in players.items() if p['role']=='Skater'}:raise ValueError('Full current coverage required')
 for r in candidate['rows']:
  v=r['inputs'];n=v['Name'];key=(n,r['sourceGameId'])
  if key not in expected or key in seen:raise ValueError('Unaccepted/duplicate appearance')
  seen.add(key)
  if r['targetTable']=='SkaterStatsByGame':
   matches=[a for a in history[n]['currentAppearances'] if a['Game #']==v['Game #']]
   if len(matches)!=1 or any(matches[0][k]!=v[k] for k in ('GP','G','A','Pts','POTG','+/-')):raise ValueError('Historical source/current observations differ')
  elif v.get('GP')!=1 or v.get('L')!=1 or not isinstance(v.get('GA'),(int,float)) or v['GA']<=0 or any(v.get(k) not in (None,0) for k in ('W','T','SHO')):raise ValueError('Goalie zero heat premises unresolved')
 if seen!=expected:raise ValueError('Complete accepted appearances required')
 leader=max(p['values']['Current Total Skater Streak Heat Points'] for p in history.values());mean=sum(p['values']['Current Total Skater Streak Heat Points']/players[n]['gp'] for n,p in history.items())/len(history)
 field='Total Streak Heat Internal Score';rule=bindings(capture)[field];rows=[];values={}
 for n,p in players.items():
  v=dict(history[n]['values']) if p['role']=='Skater' else {'Current Total Goalie Streak Heat Points':0}
  if p['role']=='Skater':v.update({'Current Total Skater Streak Heat Raw Leader':leader,'Current Total Skater Streak Heat/GP':v['Current Total Skater Streak Heat Points']/p['gp'],'Current Total Skater Streak Heat Field Rate Avg':mean})
  out=calculate(rule,n,p['role'],v)
  if out['state']!='INTERNAL_VALUE_CANDIDATE':raise ValueError('Missing streak input '+str(out))
  values[n]={'state':'VALUE','value':out['value']};rows.append({'name':n,**out,'rebuiltInputs':v})
 displays,_=display_bindings(capture);norm=normalize(displays['Total Streak Heat Web Display Score'],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':field,'upstreamParityVerified':False,'values':values})
 return {'state':'CURRENT_STREAK_HEAT_REBUILT_CORRECTED_NATIVE_PARITY_OPEN','season':population['season'],'cutoff':population['cutoff'],'components':{field:{'rows':rows,'normalized':norm}},'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=replay(sys.argv[1],*[json.loads(Path(f).read_text()) for f in sys.argv[2:5]]);Path(sys.argv[5]).write_text(json.dumps(p,indent=2));print(json.dumps({'normalized':p['components']['Total Streak Heat Internal Score']['normalized']['state']}))
