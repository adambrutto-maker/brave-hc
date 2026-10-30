"""Rebuild six season-adjusted G/A/Pts historical production baselines.

Unrounded native intermediates permit 1e-12 absolute representation tolerance.
No tolerance is applied to final scores/ranks. All raw rows and master identities,
including historical unresolved names, remain in their original source roles.
"""
import json,math
from pathlib import Path
SOURCE='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Protected source required')
 if population.get('season')!='W2026/27':raise ValueError('Winter adjustment context required')
 masters={p['Website Name']:p for p in source['playerInfo']}
 if len(masters)!=len(source['playerInfo']):raise ValueError('Unique master identities required')
 games={};checks=[];blanks=0
 def numeric(value):
  if value=='':return 0
  if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):raise ValueError('Unknown or erroneous historical numeric cell')
  return value
 def check(field,name,calculated,native):
  checks.append({'name':name,'field':field,'calculated':calculated,'native':native,'matches':isinstance(native,(int,float)) and math.isfinite(native) and abs(calculated-native)<=1e-12})
 for r in source['skaterGames']:
  if not r['Name']:continue
  factor=32/48 if r['Season'].startswith('S') else 1
  vals={m:numeric(r[m])*factor for m in ('G','A')};vals['Pts']=vals['G']+vals['A']
  blanks+=sum(r[m]=='' for m in ('G','A'))
  for m in ('G','A'):check('W Adj. '+m,'row '+str(r['sourceRow']),vals[m],r['W Adj. '+m])
  games.setdefault(r['Name'],[]).append({**r,'adjusted':vals})
 team={};current=[]
 for phase in ('Total','Playoff'):
  careers=[]
  for name,p in masters.items():
   if p['Position']=='G':continue
   rows=[r for r in games.get(name,[]) if phase=='Total' or r['Game Type']=='Playoffs']
   recent=[r for r in rows if r['Season']==p['Recent Season']];prior=[r for r in rows if r['Season']!=p['Recent Season']]
   gp=sum(numeric(r['GP']) for r in recent)+len(prior)
   totals={m:sum(r['adjusted'][m] for r in rows) for m in ('G','A')};totals['Pts']=totals['G']+totals['A'];careers.append((gp,totals))
  for m in ('G','A','Pts'):team['All-Time '+phase+' Skater '+m+' Team Rate Avg']=sum(v[m] for _,v in careers)/max(1,sum(gp for gp,_ in careers))
 for p in population['players']:
  name=p['name']
  if p['role']!='Skater':continue
  master=masters[name];values={}
  for phase in ('Total','Playoff'):
   prior=[r for r in games.get(name,[]) if r['Season']!=p['season'] and (phase=='Total' or r['Game Type']=='Playoffs')]
   gp=len(prior);values['Career Prior Skater'+(' Playoff' if phase=='Playoff' else '')+' GP']=gp
   totals={m:sum(r['adjusted'][m] for r in prior) for m in ('G','A')};totals['Pts']=totals['G']+totals['A']
   for m in ('G','A','Pts'):
    f='Career Prior '+phase+' '+m+'/GP';values[f]=totals[m]/max(1,gp);check(f,name,values[f],master[f])
    f='All-Time '+phase+' Skater '+m+' Team Rate Avg';values[f]=team[f];check(f,name,values[f],master[f])
  current.append({'name':name,'values':values})
 return {'state':'PRODUCTION_HISTORICAL_BASELINES_REBUILT','sourceWorkbookSha256':SOURCE,'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'absoluteIntermediateTolerance':1e-12,'sourceSkaterRows':len(source['skaterGames']),'historicalBlankCount':blanks,'blankPolicy':'Known native blank G/A cells ignored by SUMIFS; unavailable current observations are not supplied here','seasonAdjustment':'Winter context: summer G/A multiplied by 32/48; winter unchanged; Pts = adjusted G + adjusted A','teamRates':team,'players':current,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 result=build(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(result,indent=2));print(json.dumps({'checked':result['checked'],'differences':result['differenceCount'],'examples':result['differences'][:3]}))
