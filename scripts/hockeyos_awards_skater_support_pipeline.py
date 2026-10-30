"""Current skater PIM, +/- and POTG internals with rebuilt historical inputs.

Goalie branches remain explicit holds; mixed-role display normalization cannot
be accepted until those dependencies are supplied and validated.
"""
import math,json
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_skater_support_baselines import SOURCE,METRICS
COMPONENTS={'PIM':'Total Final PIM Internal Score','+/-':'Total Final +/- Internal Score','POTG':'Total Award POTG Internal Score'}
def replay(capture,candidate,population,baselines):
 if candidate['season']!=population['season'] or population['season']!='W2026/27' or population['cutoff']!='2026-10-18':raise ValueError('Accepted context required')
 if baselines.get('sourceWorkbookSha256')!=SOURCE or baselines.get('differenceCount')!=0:raise ValueError('Reconciled baselines required')
 players={p['name']:p for p in population['players']};skaters={n:{'GP':0,**{m:0 for m in METRICS}} for n,p in players.items() if p['role']=='Skater'}
 if len(players)!=22 or len(skaters)!=19:raise ValueError('Complete current cohort required')
 historical={p['name']:p['values'] for p in baselines['players']}
 if len(historical)!=len(baselines['players']) or set(historical)!=set(skaters):raise ValueError('Complete baseline coverage required')
 expected={(n,a['sourceGameId']) for n,p in players.items() if p['role']=='Skater' for a in p['appearances']};seen=set()
 for r in candidate['rows']:
  if r['targetTable']!='SkaterStatsByGame':continue
  v=r['inputs'];name=v['Name'];key=(name,r['sourceGameId'])
  if key in seen or key not in expected or name not in skaters:raise ValueError('Duplicate/unjoined appearance')
  seen.add(key)
  for m in ('GP',*METRICS):
   x=v.get(m)
   if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or int(x)!=x or (m!='+/-' and x<0):raise ValueError('Missing or invalid accepted '+m)
   skaters[name][m]+=x
 if seen!=expected:raise ValueError('Incomplete accepted appearance coverage')
 for n,t in skaters.items():
  if t['GP']!=players[n]['gp'] or t['GP']<=0:raise ValueError('Current GP differs')
 rules=bindings(capture);components={}
 for metric,component in COMPONENTS.items():
  rates={n:t[metric]/t['GP'] for n,t in skaters.items()};mean=sum(rates.values())/len(rates);best=min(rates.values()) if metric=='PIM' else max(rates.values());rows=[]
  for name,p in players.items():
   if p['role']!='Skater':rows.append({'name':name,'state':'INPUT_HOLD','reason':'Goalie branch requires separately validated current/historical inputs'});continue
   values=dict(historical[name]);values.update({'Current Total Skater Played Games':skaters[name]['GP'],'Current Total '+metric+'/GP':rates[name],'Current Total Skater '+metric+' Field Rate Avg':mean})
   if metric=='POTG':values.update({'Current Total POTG':skaters[name][metric],'Current Total Skater POTG Raw Leader':max(t[metric] for t in skaters.values())})
   else:values['Current Total Skater '+metric+' Field Best Rate']=best
   result=calculate(rules[component],name,'Skater',values)
   if result['state']!='INTERNAL_VALUE_CANDIDATE':raise ValueError('Missing required skater input '+str(result))
   rows.append({'name':name,**result,'rebuiltInputs':values})
  components[component]={'currentFieldRateMean':mean,'rows':rows,'displayNormalizationState':'HOLD_PENDING_GOALIE_BRANCH_VALIDATION'}
 return {'state':'THREE_SKATER_SUPPORT_INTERNAL_PIPELINES_REBUILT','season':population['season'],'cutoff':population['cutoff'],'skaterInternalCount':57,'goalieBranchHoldCount':9,'components':components,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 result=replay(sys.argv[1],json.loads(Path(sys.argv[2]).read_text()),json.loads(Path(sys.argv[3]).read_text()),json.loads(Path(sys.argv[4]).read_text()));Path(sys.argv[5]).write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='components'}))
