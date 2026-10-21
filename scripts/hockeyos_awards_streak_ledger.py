"""Rebuild native worksheet-order career streaks and current heat inputs."""
import json,math
from pathlib import Path
SOURCE='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
RULES=[('Point Streak','Pts',1,1),('Goal Streak','G',1,.5),('Assist Streak','A',1,.35),('Multi-Point Streak','Pts',2,.75),('POTG Streak','POTG',1,.75),('Multi-Goal Streak','G',2,1),('Plus Streak','+/-',1,.35)]
def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned source required')
 if population.get('season')!='W2026/27':raise ValueError('Accepted context required')
 masters={p['Website Name']:p for p in source['playerInfo']};groups={};previous={};checks=[];order=set();reversals=0
 def num(v):
  if v=='':return 0
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Unknown source number')
  return v
 def check(name,field,computed,native):checks.append({'name':name,'field':field,'computed':computed,'native':native,'matches':isinstance(native,(int,float)) and abs(computed-native)<=1e-12})
 for row in sorted(source['skaterGames'],key=lambda r:r['sourceRow']):
  if row['sourceRow'] in order:raise ValueError('Duplicate source worksheet row')
  order.add(row['sourceRow']);name=row['Name']
  if not name:continue
  state=previous.setdefault(name,{f:0 for f,_,_,_ in RULES});heat=0
  for f,metric,threshold,weight in RULES:
   state[f]=state[f]+1 if num(row[metric])>=threshold else 0
   check('row '+str(row['sourceRow']),f,state[f],row[f]);heat+=max(0,state[f]-2)*weight
  check('row '+str(row['sourceRow']),'Skater Positive Streak Heat Points',heat,row['Skater Positive Streak Heat Points'])
  if groups.get(name) and row['Game #']<groups[name][-1]['Game #']:reversals+=1
  groups.setdefault(name,[]).append({**row,'rebuiltHeat':heat})
 career_rates=[]
 for n,p in masters.items():
  if p['Position']=='G':continue
  rows=groups.get(n,[]);gp=sum(num(r['GP']) if r['Season']==p['Recent Season'] else 1 for r in rows)
  if gp>0:career_rates.append(sum(r['rebuiltHeat'] for r in rows)/gp)
 team=sum(career_rates)/max(1,len(career_rates));players=[]
 for p in population['players']:
  if p['role']!='Skater':continue
  rows=groups.get(p['name'],[]);current=[r for r in rows if r['Season']==p['season']];prior=[r for r in rows if r['Season']!=p['season']]
  values={'Current Total Skater Streak Heat Points':sum(r['rebuiltHeat'] for r in current),'Career Prior Skater GP':len(prior),'Career Prior Total Skater Streak Heat/GP':sum(r['rebuiltHeat'] for r in prior)/max(1,len(prior)),'All-Time Total Skater Streak Heat Team Rate Avg':team}
  for field in ('Current Total Skater Streak Heat Points','Career Prior Total Skater Streak Heat/GP','All-Time Total Skater Streak Heat Team Rate Avg'):check(p['name'],field,values[field],masters[p['name']][field])
  players.append({'name':p['name'],'values':values,'currentAppearances':[{k:r[k] for k in ['Game #','GP','G','A','Pts','POTG','+/-','sourceRow']} for r in current]})
 return {'state':'WORKSHEET_ORDER_SKATER_STREAKS_REBUILT','sourceWorkbookSha256':SOURCE,'checked':len(checks),'differenceCount':sum(not c['matches'] for c in checks),'differences':[c for c in checks if not c['matches']],'sourceOrderPolicy':'Preserve native worksheet order and carry each player streak across seasons; do not sort by game date','worksheetGameOrderReversals':reversals,'teamRatePolicy':'Equal-player mean of career heat/GP among master skaters with career GP >0','players':players,'publicationAuthorized':False,'currentCompositeScoresVerified':False}
if __name__=='__main__':
 import sys
 p=build(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({k:v for k,v in p.items() if k not in ('players','differences')}));print(p['differences'][:3])
