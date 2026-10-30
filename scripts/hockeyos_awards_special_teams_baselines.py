"""Rebuild special-teams history from immutable raw logs, preserving winter weights."""
import json, math
from pathlib import Path
from hockeyos_awards_skater_support_baselines import SOURCE

def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned read-only source required')
 if population.get('season')!='W2026/27':raise ValueError('Accepted winter season required')
 masters={p['Website Name']:p for p in source['playerInfo']};groups={};checks=[]
 if len(masters)!=len(source['playerInfo']):raise ValueError('Duplicate master identity')
 def num(v):
  if v=='':return 0
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Invalid historical number')
  return v
 def check(name,field,value,native):checks.append({'name':name,'field':field,'computed':value,'native':native,'matches':isinstance(native,(int,float)) and abs(value-native)<=1e-12})
 for r in source['skaterGames']:
  if not r['Name']:continue
  values={m:num(r[m])*(32/48 if r['Season'].startswith('S') else 1) for m in ('PPG','SHG')}
  for m in values:check('row '+str(r['sourceRow']),'W Adj. '+m,values[m],r['W Adj. '+m])
  groups.setdefault(r['Name'],[]).append({**r,'values':values})
 total=gp=0
 for name,p in masters.items():
  if p['Position']=='G':continue
  rows=groups.get(name,[]);total+=sum(sum(r['values'].values()) for r in rows)
  gp+=sum(num(r['GP']) if r['Season']==p['Recent Season'] else 1 for r in rows)
 team=total/max(1,gp);players=[]
 for p in population['players']:
  if p['role']!='Skater':continue
  name=p['name'];prior=[r for r in groups.get(name,[]) if r['Season']!=p['season']];values={'Career Prior Skater GP':len(prior),'All-Time Total Skater Special Teams Team Rate Avg':team}
  for m in ('PPG','SHG'):
   f='Career Prior Total '+m+'/GP';values[f]=sum(r['values'][m] for r in prior)/max(1,len(prior));check(name,f,values[f],masters[name][f])
  f='All-Time Total Skater Special Teams Team Rate Avg';check(name,f,team,masters[name][f]);players.append({'name':name,'values':values})
 return {'state':'SPECIAL_TEAMS_HISTORICAL_BASELINES_REBUILT','sourceWorkbookSha256':SOURCE,'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'absoluteIntermediateTolerance':1e-12,'players':players,'careerTeamGP':gp,'careerTeamRate':team,'blankPolicy':'Historical SUMIFS blank semantics only; current observations independently required','publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=build(*[json.loads(Path(f).read_text()) for f in sys.argv[1:3]]);Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({'checked':p['checked'],'differences':p['differenceCount']}))
