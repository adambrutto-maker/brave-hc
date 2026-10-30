"""Audit goalie +/- history, then apply independently observed current corrections."""
import json,math
from pathlib import Path
from hockeyos_awards_skater_support_baselines import SOURCE

def build(source,population,candidate):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned read-only history required')
 if population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18' or candidate.get('season')!=population['season']:raise ValueError('Accepted context required')
 masters={p['Website Name']:p for p in source['playerInfo']};groups={};checks=[];overrides=[]
 def num(v):
  if v=='':return 0
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Invalid historical number')
  return v
 def check(n,f,value,native):checks.append({'name':n,'field':f,'computed':value,'native':native,'matches':isinstance(native,(int,float)) and abs(value-native)<=1e-12})
 goalies={p['name']:p for p in population['players'] if p['role']=='Goaltender'}
 expected={(n,a['sourceGameId']) for n,p in goalies.items() for a in p['appearances']};seen=set();current={};totals={n:{'GP':0,'+/-':0} for n in goalies}
 if len(goalies)!=3:raise ValueError('Complete goalie population required')
 for r in candidate['rows']:
  if r['targetTable']!='GoalieStatsByGame':continue
  v=r['inputs'];n=v['Name'];key=(n,r['sourceGameId']);x=v.get('+/-')
  if key in seen or key not in expected or v.get('GP')!=1 or isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or int(x)!=x:raise ValueError('Complete accepted goalie +/- required')
  seen.add(key);rawkey=(n,v['Game #'])
  if rawkey in current:raise ValueError('Duplicate raw game identity')
  current[rawkey]=x;totals[n]['GP']+=1;totals[n]['+/-']+=x
 if seen!=expected:raise ValueError('Incomplete goalie observations')
 for n,t in totals.items():
  if t['GP']!=goalies[n]['gp']:raise ValueError('Goalie GP mismatch')
 found=set()
 for r in source['goalieGames']:
  if not r['Name']:continue
  key=(r['Name'],r['Game #']);corrected=num(r['+/-'])
  if key in current:
   if key in found or r['Season']!=population['season'] or r['GP']!=1:raise ValueError('Ambiguous raw observation join')
   found.add(key);corrected=current[key];overrides.append({'name':key[0],'gameNumber':key[1],'sourceRow':r['sourceRow'],'historicalWorkbookValue':r['+/-'],'observedValue':corrected})
  groups.setdefault(r['Name'],[]).append({**r,'correctedPlusMinus':corrected})
 if found!=set(current):raise ValueError('Current observation missing from native history')
 careers={};stale=[]
 for n,p in masters.items():
  if p['Position']!='G':continue
  rows=groups.get(n,[]);gp=sum(num(r['GP']) if r['Season']==p['Recent Season'] else 1 for r in rows)
  careers[n]=(gp,sum(num(r['+/-']) for r in rows),sum(r['correctedPlusMinus'] for r in rows))
  if gp!=num(p['Career Total Goalie GP']):
   if n!='Carlyle, Adam' or gp!=1 or num(p['Career Total Goalie GP'])!=0:raise ValueError('Unexpected stale career GP')
   stale.append(n)
 legacygp=sum(gp for n,(gp,_,_) in careers.items() if n not in stale);legacy=sum(v for n,(_,v,_) in careers.items() if n not in stale)/max(1,legacygp)
 correctedgp=sum(gp for gp,_,_ in careers.values());corrected=sum(v for _,_,v in careers.values())/max(1,correctedgp);players=[]
 for n,p in goalies.items():
  prior=[r for r in groups.get(n,[]) if r['Season']!=population['season']];f='Career Prior Total Goalie +/-/GP';value=sum(num(r['+/-']) for r in prior)/max(1,len(prior));values={'Career Prior Goalie GP':len(prior),f:value,'All-Time Total Goalie +/- Team Rate Avg':corrected}
  if n not in stale:
   check(n,f,value,masters[n][f]);check(n,'All-Time Total Goalie +/- Team Rate Avg',legacy,masters[n]['All-Time Total Goalie +/- Team Rate Avg'])
  players.append({'name':n,'values':values,'currentTotals':totals[n]})
 return {'state':'GOALIE_PLUS_MINUS_BASELINES_REBUILT_WITH_OBSERVED_CURRENT_CORRECTIONS','sourceWorkbookSha256':SOURCE,'season':population['season'],'cutoff':population['cutoff'],'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'absoluteIntermediateTolerance':1e-12,'legacyTeamRate':legacy,'correctedTeamRate':corrected,'correctedCareerGP':correctedgp,'currentCorrections':overrides,'staleNativeMetadataNames':stale,'players':players,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=build(*[json.loads(Path(f).read_text()) for f in sys.argv[1:4]]);Path(sys.argv[4]).write_text(json.dumps(p,indent=2));print(json.dumps({'checked':p['checked'],'differences':p['differenceCount']}))
