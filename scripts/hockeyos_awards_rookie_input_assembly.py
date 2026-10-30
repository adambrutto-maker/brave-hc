"""Assemble rebuilt components for the five eligible rookies, preserving holds."""
import json,math
from pathlib import Path
from hockeyos_awards_scalar_internals import bindings,calculate,evaluate

def required_rows(ast,row,inputs):
 """Inspect the selected source branch; missing inputs never select IFERROR zero."""
 kind=ast[0]
 if kind=='literal':return set()
 if kind=='unary':return required_rows(ast[2],row,inputs)
 if kind=='binary':return required_rows(ast[2],row,inputs)|required_rows(ast[3],row,inputs)
 _,func,args=ast
 if func=='ROW':return {args[0][1]}
 if func=='PL':return set()
 if func=='IF':return required_rows(args[0],row,inputs)|required_rows(args[1] if evaluate(args[0],row,inputs) else args[2],row,inputs)
 if func=='IFERROR':return required_rows(args[0],row,inputs)
 return set().union(*(required_rows(a,row,inputs) for a in args))

def assemble(capture,population,eligibility,reports):
 if eligibility.get('season')!=population['season'] or eligibility.get('cutoff')!=population['cutoff'] or eligibility.get('resolvedCount')!=220 or eligibility.get('holdCount')!=0:raise ValueError('Current complete eligibility required')
 players={p['name']:p for p in population['players']}
 if len(players)!=22:raise ValueError('Complete current cohort required')
 components={}
 for report in reports:
  if report.get('season')!=population['season'] or report.get('cutoff')!=population['cutoff']:raise ValueError('Stale component report')
  for c in report['components'].values():
   n=c['normalized']
   if n['state']!='CURRENT_COMPONENT_NORMALIZATION_CANDIDATE' or n['season']!=population['season'] or n['cutoff']!=population['cutoff'] or n['currentPlayerCoverage']!=22:raise ValueError('Complete rebuilt normalization required')
   field=n['inputField'].replace('Internal Score','Web Display Score')
   if field in components:raise ValueError('Duplicate component authority')
   if any(name not in players or isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for name,v in n['scores'].items()):raise ValueError('Invalid component values')
   components[field]=n['scores']
 decisions=[r for r in eligibility['decisions'] if r['field']=='Rookie Eligible'];names=[r['name'] for r in decisions if r['value']==1]
 if len(decisions)!=22 or len({r['name'] for r in decisions})!=22 or {r['name'] for r in decisions}!=set(players):raise ValueError('Complete unique Rookie eligibility coverage required')
 rule=bindings(capture,True)['Rookie Raw Composite Score'];results=[]
 for name in names:
  p=players[name];row={'Name':name,'Award Scoring Type':p['role'],'Rookie Status':1};inputs={'Current Skater GP':p['gp'] if p['role']=='Skater' else 0,'Current Goalie GP':p['gp'] if p['role']=='Goaltender' else 0}
  required={f for f in required_rows(rule['ast'],row,inputs) if f.endswith('Web Display Score')}
  available={f:components[f][name] for f in required if f in components and name in components[f]}
  row.update(available);missing=sorted(required-set(available));out=calculate(rule,name,p['role'],inputs,row)
  if missing and out['state']!='INPUT_HOLD':raise ValueError('Missing components were swallowed')
  results.append({'name':name,'requiredComponentCount':len(required),'rebuiltComponentCount':len(available),'rebuiltComponents':available,'missingComponents':missing,'calculation':out})
 return {'state':'ROOKIE_COMPONENT_ASSEMBLY_WITH_EXPLICIT_HOLDS','season':population['season'],'cutoff':population['cutoff'],'rebuiltDisplayComponentCount':len(components),'eligibleRookieCount':len(names),'players':results,'nativeCorrectedCohortParityVerified':False,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 load=lambda p:json.loads(Path(p).read_text())
 p=assemble(sys.argv[1],load(sys.argv[2]),load(sys.argv[3]),[load(f) for f in sys.argv[4:-1]]);Path(sys.argv[-1]).write_text(json.dumps(p,indent=2));print(json.dumps({'eligibleRookies':p['eligibleRookieCount'],'rebuiltDisplays':p['rebuiltDisplayComponentCount'],'missing':p['players'][0]['missingComponents']}))
