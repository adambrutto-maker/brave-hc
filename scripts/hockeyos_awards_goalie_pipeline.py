"""Five goalie internals and mixed-role POTG normalization from rebuilt inputs."""
import json,math
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize
from hockeyos_awards_goalie_baselines import SOURCE
COMPONENTS={'W':'Total Award Goalie W Internal Score','Win %':'Total Award Goalie Win % Internal Score','GAA':'Total Award Goalie GAA Internal Score','SHO':'Total Award Goalie SHO Internal Score','POTG':'Total Award POTG Internal Score'}
def replay(capture,candidate,population,baselines,skater_support):
 if candidate['season']!=population['season'] or population['season']!='W2026/27' or population['cutoff']!='2026-10-18':raise ValueError('Accepted fixture context required')
 if baselines.get('sourceWorkbookSha256')!=SOURCE or baselines.get('differenceCount')!=0:raise ValueError('Reconciled goalie history required')
 players={p['name']:p for p in population['players']};goalies={n:{k:0 for k in ('GP','W','T','GA','SHO','POTG')} for n,p in players.items() if p['role']=='Goaltender'}
 if len(players)!=22 or len(goalies)!=3:raise ValueError('Complete current population required')
 historical={p['name']:p['values'] for p in baselines['players']}
 if len(historical)!=len(baselines['players']) or set(historical)!=set(goalies):raise ValueError('Complete goalie baseline coverage required')
 expected={(n,a['sourceGameId']) for n,p in players.items() if n in goalies for a in p['appearances']};seen=set();derivations=[]
 for r in candidate['rows']:
  if r['targetTable']!='GoalieStatsByGame':continue
  v=r['inputs'];n=v['Name'];key=(n,r['sourceGameId'])
  if key in seen or key not in expected:raise ValueError('Unaccepted or duplicate goalie appearance')
  seen.add(key)
  for k in ('GP','L','GA','POTG'):
   x=v.get(k)
   if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or int(x)!=x or x<0:raise ValueError('Complete accepted integer goalie '+k+' required')
  if v['GP']!=1 or v['L']!=1 or v['GA']<=0:raise ValueError('Zero outcome derivation not supported by premises')
  for k in ('W','T','SHO'):
   if v.get(k) not in (None,0):raise ValueError('Outcome derivation conflicts with supplied value')
   derivations.append({'name':n,'sourceGameId':r['sourceGameId'],'field':k,'value':0,'premises':{'GP':1,'L':1,'GA':v['GA']},'rule':'One recorded loss leaves no win/tie; positive goals allowed excludes a shutout','directObservation':False})
  for k in ('GP','GA','POTG'):goalies[n][k]+=v[k]
 if seen!=expected:raise ValueError('Incomplete goalie appearance coverage')
 for n,t in goalies.items():
  if t['GP']!=players[n]['gp']:raise ValueError('Goalie GP mismatch')
  t.update({'Win %':(t['W']+.5*t['T'])/t['GP'],'GAA':t['GA']/t['GP'],'SHO/GP':t['SHO']/t['GP'],'POTG/GP':t['POTG']/t['GP']})
 rules=bindings(capture);displays,_=display_bindings(capture);results={}
 for metric,component in COMPONENTS.items():
  rate='Win %' if metric=='W' else metric+'/GP' if metric in ('SHO','POTG') else metric
  rates=[t[rate] for t in goalies.values()];mean=sum(rates)/len(rates);best=min(rates) if metric=='GAA' else max(rates);values_by_name={};rows=[]
  for n,p in players.items():
   if n not in goalies:
    if metric=='POTG':
     skater_rows=skater_support['components'][component]['rows'];hits=[r for r in skater_rows if r['name']==n and r['state']=='INTERNAL_VALUE_CANDIDATE']
     if len(hits)!=1:raise ValueError('Complete skater POTG internals required')
     values_by_name[n]={'state':'VALUE','value':hits[0]['value']}
    else:values_by_name[n]={'state':'NOT_APPLICABLE','reason':'Source excludes non-goalies'}
    continue
   t=goalies[n];v=dict(historical[n]);v['Current Total Goalie Played Games']=t['GP'];v['Current Total Goalie '+rate]=t[rate]
   if metric in ('W','SHO','POTG'):
    v['Current Total Goalie '+metric]=t[metric];v['Current Total Goalie '+metric+' Raw Leader']=max(q[metric] for q in goalies.values())
   if metric in ('W','Win %'):
    v['Current Total Goalie Win %']=t['Win %'];v['Current Total Goalie Win % Field Rate Avg']=mean;v['Current Total Goalie Win % Field Best Rate']=best
   else:v['Current Total Goalie '+metric+' Field Rate Avg']=mean;v['Current Total Goalie '+metric+' Field Best Rate']=best
   out=calculate(rules[component],n,'Goaltender',v)
   if out['state']!='INTERNAL_VALUE_CANDIDATE':raise ValueError('Missing goalie formula input '+str(out))
   values_by_name[n]={'state':'VALUE','value':out['value']};rows.append({'name':n,**out,'rebuiltInputs':v})
  display=component.replace('Internal Score','Web Display Score')
  normalized=normalize(displays[display],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':component,'upstreamParityVerified':False,'values':values_by_name})
  results[component]={'goalieRows':rows,'normalized':normalized}
 return {'state':'FIVE_GOALIE_COMPONENTS_REBUILT_CORRECTED_NATIVE_PARITY_OPEN','season':population['season'],'cutoff':population['cutoff'],'goalieInternalCount':15,'derivedObservations':derivations,'components':results,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 args=[sys.argv[1]]+[json.loads(Path(p).read_text()) for p in sys.argv[2:6]];p=replay(*args);Path(sys.argv[6]).write_text(json.dumps(p,indent=2));print(json.dumps({'goalieInternals':p['goalieInternalCount'],'derivedObservations':len(p['derivedObservations'])}))
