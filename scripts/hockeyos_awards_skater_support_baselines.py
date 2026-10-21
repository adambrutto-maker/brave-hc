"""Rebuild PIM, +/- and POTG skater baselines without substituting cache inputs."""
import math,json
from pathlib import Path
SOURCE='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
METRICS=('PIM','+/-','POTG')
def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned read-only source required')
 if population.get('season')!='W2026/27':raise ValueError('Winter adjustment context required')
 masters={p['Website Name']:p for p in source['playerInfo']}
 if len(masters)!=len(source['playerInfo']):raise ValueError('Duplicate master')
 groups={};checks=[];blank_counts={m:0 for m in METRICS}
 def num(v):
  if v=='':return 0
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Unknown numeric source')
  return v
 def check(name,field,computed,native):checks.append({'name':name,'field':field,'computed':computed,'native':native,'matches':isinstance(native,(int,float)) and math.isfinite(native) and abs(computed-native)<=1e-12})
 for row in source['skaterGames']:
  if not row['Name']:continue
  values={m:num(row[m])*(32/48 if m=='PIM' and row['Season'].startswith('S') else 1) for m in METRICS}
  for m in METRICS:blank_counts[m]+=row[m]==''
  check('row '+str(row['sourceRow']),'W Adj. PIM',values['PIM'],row['W Adj. PIM'])
  groups.setdefault(row['Name'],[]).append({**row,'values':values})
 team={}
 for phase in ('Total','Playoff'):
  totals={m:0 for m in METRICS};gp=0
  for name,p in masters.items():
   if p['Position']=='G':continue
   rows=[r for r in groups.get(name,[]) if phase=='Total' or r['Game Type']=='Playoffs']
   gp+=sum(num(r['GP']) if r['Season']==p['Recent Season'] else 1 for r in rows)
   for m in METRICS:totals[m]+=sum(r['values'][m] for r in rows)
  for m in METRICS:team['All-Time '+phase+' Skater '+m+' Team Rate Avg']=totals[m]/max(1,gp)
 # Exact source exception: the field named All-Time Playoff PIM is
 # actually a current-season equal-player mean, not a career team rate.
 playoff_rates=[]
 for name,p in masters.items():
  if p['Position']=='G' or p['Recent Season']!=population['season']:continue
  rows=[r for r in groups.get(name,[]) if r['Season']==population['season'] and r['Game Type']=='Playoffs']
  gp=sum(num(r['GP']) for r in rows)
  if gp>0:playoff_rates.append(sum(r['values']['PIM'] for r in rows)/gp)
 team['All-Time Playoff Skater PIM Team Rate Avg']=sum(playoff_rates)/max(1,len(playoff_rates))
 players=[]
 for p in population['players']:
  if p['role']!='Skater':continue
  values={}
  for phase in ('Total','Playoff'):
   prior=[r for r in groups.get(p['name'],[]) if r['Season']!=p['season'] and (phase=='Total' or r['Game Type']=='Playoffs')]
   values['Career Prior Skater'+(' Playoff' if phase=='Playoff' else '')+' GP']=len(prior)
   for m in METRICS:
    f='Career Prior '+phase+' '+m+'/GP';values[f]=sum(r['values'][m] for r in prior)/max(1,len(prior));check(p['name'],f,values[f],masters[p['name']][f])
    f='All-Time '+phase+' Skater '+m+' Team Rate Avg';values[f]=team[f];check(p['name'],f,values[f],masters[p['name']][f])
  players.append({'name':p['name'],'values':values})
 return {'state':'SKATER_SUPPORT_HISTORICAL_BASELINES_REBUILT','sourceWorkbookSha256':SOURCE,'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'absoluteIntermediateTolerance':1e-12,'historicalBlankCounts':blank_counts,'blankPolicy':'Known workbook blanks ignored by original SUMIFS; no current missing observations supplied as zero','players':players,'teamRates':team,'preservedException':'All-Time Playoff Skater PIM Team Rate Avg uses current-season equal-player playoff PIM/GP mean per source formula','publicationAuthorized':False}
if __name__=='__main__':
 import sys
 result=build(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(result,indent=2));print(json.dumps({'checked':result['checked'],'differences':result['differenceCount'],'examples':result['differences'][:3]}))
