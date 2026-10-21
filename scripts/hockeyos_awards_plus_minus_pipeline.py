"""Join rebuilt skater and observed goalie +/- before mixed display normalization."""
import json
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize
from hockeyos_awards_skater_support_baselines import SOURCE
FIELD='Total Final +/- Internal Score'
def replay(capture,population,skater_report,goalie_baselines):
 if population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18':raise ValueError('Accepted context required')
 for report in (skater_report,goalie_baselines):
  if (report.get('season'),report.get('cutoff'))!=(population['season'],population['cutoff']):raise ValueError('Stale report')
 if goalie_baselines.get('sourceWorkbookSha256')!=SOURCE or goalie_baselines.get('differenceCount')!=0:raise ValueError('Reconciled goalie history required')
 players={p['name']:p for p in population['players']};skaters={n for n,p in players.items() if p['role']=='Skater'};goalies={n for n,p in players.items() if p['role']=='Goaltender'}
 if len(players)!=22 or len(skaters)!=19 or len(goalies)!=3:raise ValueError('Complete current identities required')
 native=skater_report['components'][FIELD]['rows'];skater_rows={r['name']:r for r in native if r['name'] in skaters}
 if len(native)!=22 or len({r['name'] for r in native})!=22 or set(r['name'] for r in native)!=set(players) or set(skater_rows)!=skaters:raise ValueError('Complete skater report required')
 gs=goalie_baselines['players'];g={p['name']:p for p in gs}
 if len(gs)!=3 or set(g)!=goalies:raise ValueError('Complete goalie baselines required')
 rates={}
 for n,r in g.items():
  if r['currentTotals']['GP']!=players[n]['gp'] or r['currentTotals']['GP']<=0:raise ValueError('Goalie GP mismatch')
  rates[n]=r['currentTotals']['+/-']/r['currentTotals']['GP']
 mean=sum(rates.values())/3;best=max(rates.values());rule=bindings(capture)[FIELD];rows=[];values={}
 for n,p in players.items():
  if n in skaters:
   r=skater_rows[n];out=calculate(rule,n,'Skater',r['rebuiltInputs'])
   if out['state']!='INTERNAL_VALUE_CANDIDATE' or out['value']!=r.get('value'):raise ValueError('Skater intermediate mismatch')
   inputs=r['rebuiltInputs']
  else:
   inputs={**g[n]['values'],'Current Total Goalie Played Games':players[n]['gp'],'Current Total Goalie +/-/GP':rates[n],'Current Total Goalie +/- Field Best Rate':best,'Current Total Goalie +/- Field Rate Avg':mean};out=calculate(rule,n,'Goaltender',inputs)
  if out['state']!='INTERNAL_VALUE_CANDIDATE':raise ValueError('Unresolved +/- input')
  values[n]={'state':'VALUE','value':out['value']};rows.append({'name':n,**out,'rebuiltInputs':inputs})
 displays,_=display_bindings(capture);display=FIELD.replace('Internal Score','Web Display Score');normalized=normalize(displays[display],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':FIELD,'upstreamParityVerified':False,'values':values})
 return {'state':'MIXED_PLUS_MINUS_REBUILT_CORRECTED_NATIVE_PARITY_OPEN','season':population['season'],'cutoff':population['cutoff'],'numericInternalCount':22,'components':{FIELD:{'rows':rows,'normalized':normalized}},'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=replay(sys.argv[1],*[json.loads(Path(f).read_text()) for f in sys.argv[2:5]]);Path(sys.argv[5]).write_text(json.dumps(p,indent=2));print(p['state'])
