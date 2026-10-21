"""Current attendance, skater two-way and discipline components from appearances.

Original flags: plus >0, minus <0, point >0, PIM-free =0 and multi-PIM >=4.
Carlyle attendance assumes the authorized corrected DI roster row, not old cache.
"""
import json,math
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate
from hockeyos_awards_current_normalization import bindings as display_bindings,normalize

def replay(capture,candidate,population,confirmations):
 if population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18' or candidate.get('season')!=population['season']:raise ValueError('Accepted season/cutoff required')
 if confirmations.get('confirmedBy')!='Adam Brutto' or confirmations.get('season')!=population['season'] or not any(r.get('name')=='Carlyle, Adam' and r.get('rosterStatus')=='DI' for r in confirmations.get('records',[])):raise ValueError('Confirmed Carlyle roster row required')
 players={p['name']:p for p in population['players']}
 if len(players)!=22:raise ValueError('Complete current identities required')
 expected={(n,a['sourceGameId']) for n,p in players.items() for a in p['appearances']};seen=set();stats={n:{k:0 for k in ('GP','plus','minus','point','pimFree','multiPim')} for n in players};games=set()
 for r in candidate['rows']:
  v=r['inputs'];name=v['Name'];key=(name,r['sourceGameId'])
  if key not in expected or key in seen:raise ValueError('Unaccepted/duplicate appearance')
  seen.add(key);games.add(r['sourceGameId'])
  if v.get('GP')!=1:raise ValueError('One accepted GP per appearance required')
  is_skater=players[name]['role']=='Skater'
  if (r['targetTable']=='SkaterStatsByGame')!=is_skater:raise ValueError('Role mismatch')
  s=stats[name];s['GP']+=1
  if not is_skater:continue
  for k in ('+/-','Pts','PIM'):
   x=v.get(k)
   if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or int(x)!=x or (k!='+/-' and x<0):raise ValueError('Complete integer '+k+' required')
  s['plus']+=v['+/-']>0;s['minus']+=v['+/-']<0;s['point']+=v['Pts']>0;s['pimFree']+=v['PIM']==0;s['multiPim']+=v['PIM']>=4
 if seen!=expected or len(games)!=4:raise ValueError('Complete accepted four-game coverage required')
 rules=bindings(capture);displays,_=display_bindings(capture);components={}
 for field in ('Current True Attd. % Internal Score','Total Skater Two-Way Reliability Internal Score','Total Discipline Reliability Internal Score'):
  values={};rows=[]
  for n,p in players.items():
   s=stats[n];gp=s['GP']
   if gp!=p['gp'] or gp<=0:raise ValueError('Appearance GP mismatch')
   inputs={'Current True Attd. % Score':100*min(1,gp/len(games)),'Current Total Skater Played Games':gp,'Current Total Plus Game %':s['plus']/gp,'Current Total Minus Games':s['minus'],'Current Total Point Game %':s['point']/gp,'Current Total PIM-Free Game %':s['pimFree']/gp,'Current Total Multi-PIM Games':s['multiPim']}
   out=calculate(rules[field],n,p['role'],inputs)
   if out['state']=='SOURCE_BLANK':values[n]={'state':'NOT_APPLICABLE','reason':'Source excludes non-skaters'}
   elif out['state']=='INTERNAL_VALUE_CANDIDATE':values[n]={'state':'VALUE','value':out['value']}
   else:raise ValueError('Missing reliability input '+str(out))
   rows.append({'name':n,**out,'rebuiltInputs':inputs})
  display=field.replace('Internal Score','Web Display Score')
  normalized=normalize(displays[display],population,{'season':population['season'],'cutoff':population['cutoff'],'inputField':field,'upstreamParityVerified':False,'values':values})
  components[field]={'rows':rows,'normalized':normalized}
 return {'state':'THREE_RELIABILITY_COMPONENTS_REBUILT_CORRECTED_NATIVE_PARITY_OPEN','season':population['season'],'cutoff':population['cutoff'],'numericInternalCount':60,'components':components,'correctedCarlyleRosterRowRequired':True,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=replay(sys.argv[1],*[json.loads(Path(f).read_text()) for f in sys.argv[2:5]]);Path(sys.argv[5]).write_text(json.dumps(p,indent=2));print(json.dumps({'numericInternals':p['numericInternalCount']}))
