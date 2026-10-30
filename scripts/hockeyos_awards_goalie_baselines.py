"""Rebuild goalie history; distinguish stale Carlyle cache from corrected cohort."""
import json,math
from pathlib import Path
SOURCE='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
METRICS=('Win %','GAA','SHO','POTG')
def rate_field(metric):return 'Career Prior Total Goalie '+metric+('/GP' if metric in ('SHO','POTG') else '')
def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned read-only source required')
 if population.get('season')!='W2026/27':raise ValueError('Accepted season required')
 masters={p['Website Name']:p for p in source['playerInfo']};groups={};checks=[];stale=[]
 def num(v):
  if v=='':return 0
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Unknown numeric source')
  return v
 def totals(rows):return {k:sum(num(r[k])*(32/48 if k=='GA' and r['Season'].startswith('S') else 1) for r in rows) for k in ('W','T','SHO','GA','POTG')}
 def rates(t,gp):return {'Win %':(t['W']+.5*t['T'])/max(1,gp),'GAA':t['GA']/max(1,gp),'POTG':t['POTG']/max(1,gp),'SHO':t['SHO']/max(1,gp)}
 def check(name,field,computed,native):checks.append({'name':name,'field':field,'computed':computed,'native':native,'matches':isinstance(native,(int,float)) and abs(computed-native)<=1e-12})
 for r in source['goalieGames']:
  if r['Name']:
   check('row '+str(r['sourceRow']),'W Adj. GA',num(r['GA'])*(32/48 if r['Season'].startswith('S') else 1),r['W Adj. GA'])
   groups.setdefault(r['Name'],[]).append(r)
 career={}
 for name,p in masters.items():
  if p['Position']!='G':continue
  rows=groups.get(name,[]);gp=sum(num(r['GP']) if r['Season']==p['Recent Season'] else 1 for r in rows);career[name]=(gp,totals(rows))
  observed=num(p['Career Total Goalie GP'])
  if gp!=observed:
   if name!='Carlyle, Adam' or gp!=1 or observed!=0:raise ValueError('Unexpected native career GP discrepancy '+name)
   stale.append(name)
 def team(excluded):
  t={k:sum(v[k] for n,(_,v) in career.items() if n not in excluded) for k in ('W','T','SHO','GA','POTG')};gp=sum(g for n,(g,_) in career.items() if n not in excluded);out=rates(t,gp)
  # Exact source exception: this is current PLAYOFF shutout leader, not career SHO/GP.
  playoff_sho=[]
  for n,p in masters.items():
   if p['Position']!='G' or p['Recent Season']!=population['season']:continue
   rows=[r for r in groups.get(n,[]) if r['Season']==population['season'] and r['Game Type']=='Playoffs']
   if sum(num(r['GP']) for r in rows)>0:playoff_sho.append(sum(num(r['SHO']) for r in rows))
  out['SHO']=max(playoff_sho,default=0)
  return out,gp
 legacy,legacy_gp=team(set(stale));corrected,corrected_gp=team(set());players=[]
 for p in population['players']:
  if p['role']!='Goaltender':continue
  name=p['name'];prior=[r for r in groups.get(name,[]) if r['Season']!=p['season']];prior_rates=rates(totals(prior),len(prior));values={'Career Prior Goalie GP':len(prior)}
  for metric in METRICS:
   f=rate_field(metric);values[f]=prior_rates[metric]
   if name not in stale:check(name,f,values[f],masters[name][f])
   f='All-Time Total Goalie '+metric+' Team Rate Avg';values[f]=corrected[metric]
   if name not in stale:check(name,f,legacy[metric],masters[name][f])
  players.append({'name':name,'values':values})
 return {'state':'GOALIE_HISTORY_REBUILT_CORRECTED_COHORT_NATIVE_RECALC_REQUIRED','sourceWorkbookSha256':SOURCE,'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'staleNativeMetadataNames':stale,'legacyCohortGP':legacy_gp,'correctedCohortGP':corrected_gp,'legacyTeamRates':legacy,'correctedTeamRates':corrected,'players':players,'preservedException':'All-Time Total Goalie SHO Team Rate Avg is current playoff SHO leader','absoluteIntermediateTolerance':1e-12,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=build(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({k:v for k,v in p.items() if k not in ('players','differences')}));print(p['differences'][:3])
