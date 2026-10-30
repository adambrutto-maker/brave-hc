"""Rebuild eligibility inputs from an immutable workbook extraction and fixture."""
from datetime import datetime
import json,hashlib
from pathlib import Path
SOURCE='68392eccdd7087f4efbc32cabf23cb308aa7843eb33df72d714a3a099754a132'
def build(source,population):
 if source.get('sourceWorkbookSha256')!=SOURCE or source.get('readOnlyHashUnchanged') is not True:raise ValueError('Protected workbook evidence required')
 if population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18':raise ValueError('Accepted context required')
 cutoff=(datetime.fromisoformat(population['cutoff'])-datetime(1899,12,30)).days
 schedules={};totals={}
 for r in source['schedule']:
  game=r['Game #']
  if not isinstance(game,(int,float)):continue
  if game in schedules:raise ValueError('Duplicate schedule game')
  schedules[game]=r
  if isinstance(r['Date'],(int,float)) and r['Date']<=cutoff:totals[(r['Season'],r['Game Type'])]=totals.get((r['Season'],r['Game Type']),0)+1
 players=[]
 for p in population['players']:
  name=p['name'];season=p['season'];metadata=[r for r in source['playerInfo'] if r['Website Name']==name]
  if len(metadata)!=1:raise ValueError('Unique metadata required '+name)
  metadata=metadata[0];roster=[r for r in source['roster'] if r['Name']==name];current=[r for r in roster if r['Season']==season]
  if len(current)>1:raise ValueError('Duplicate current roster row '+name)
  record={'name':name,'season':season,'role':p['role'],'rosterStatus':p.get('rosterStatus'),'rosterCurrentRowCount':len(current),'rawRosterHistory':[{'season':r['Season'],'status':r['Status'],'sourceRow':r['sourceRow']} for r in roster],'inputs':{},'differences':[]}
  if metadata['Position']!=p['position'] or metadata['Current Roster Status']!=(p.get('rosterStatus') or ''):raise ValueError('Raw metadata conflict '+name)
  season_games=sum(v for (s,t),v in totals.items() if s==season and t in ('Regular Season','Playoffs'))
  record['seasonTeamGames']=season_games;record['rosterTotalGames']=season_games if current else None
  if current and current[0]['Total Games']!=season_games:record['differences'].append('Cached roster total games')
  years=[]
  for r in roster:
   games=sum(v for (s,t),v in totals.items() if s==r['Season'] and t in ('Regular Season','Playoffs'))
   if r['Status']=='FT' and games>0:
    try:years.append(int(r['Season'][1:5]))
    except (ValueError,TypeError):raise ValueError('Unsupported roster season')
  rookie_year=min(years) if years else '';rookie=int(rookie_year==int(season[1:5]))
  record['rookieYear']=rookie_year;record['rookieStatus']=rookie
  if metadata['Rookie Status']!=rookie:record['differences'].append('Cached rookie status')
  positions={metadata['Position'],metadata['Position 2']};forward=bool(positions&{'F','LW','RW','C'});defense=bool(positions&{'D','LD','RD'})
  record['positionGroup']='Goaltender' if metadata['Position']=='G' else 'Utility' if forward and defense else 'Defence' if defense else 'Forward' if forward else ''
  for label,key in [('Skater','skaterGames'),('Goalie','goalieGames')]:
   rows=[r for r in source[key] if r['Name']==name];recent=[]
   for r in rows:
    schedule=schedules.get(r['Game #'])
    if schedule is None or schedule['Season']!=r['Season'] or schedule['Game Type']!=r['Game Type']:record['differences'].append(label+' game/schedule context row '+str(r['sourceRow']))
    if r['Season']==season:recent.append(r)
   prior=sum(r['Season']!=season for r in rows)
   record['inputs']['Career Prior '+label+' GP']=prior
   if metadata['Career Prior '+label+' GP']!=prior:record['differences'].append('Cached prior '+label+' GP')
   record['inputs']['Current Total '+label+' Played Games']=len(recent)
   record['inputs']['Current '+label+' GP']=sum(r['GP'] for r in recent)
   record['inputs']['Current Playoff '+label+' Played Games']=sum(r['Game Type']=='Playoffs' for r in recent)
   if label=='Skater':record['inputs']['Current Skater Playoff GP']=sum(r['GP'] for r in recent if r['Game Type']=='Playoffs')
   accepted=sorted(a['game'] for a in p['appearances']) if (label=='Skater')==(p['role']=='Skater') else []
   if sorted(r['Game #'] for r in recent)!=accepted or any(r['GP']!=1 for r in recent):record['differences'].append('Current '+label+' accepted appearances')
  players.append(record)
 return {'state':'ELIGIBILITY_SOURCE_LEDGER','sourceWorkbookSha256':SOURCE,'season':population['season'],'cutoff':population['cutoff'],'sourceCounts':{k:len(source[k]) for k in ['playerInfo','roster','schedule','skaterGames','goalieGames']},'players':players,'differenceCount':sum(len(p['differences']) for p in players),'seasonInfo':[{'Season':population['season'],'Game Type':t,'Total Games Contested':totals.get((population['season'],t),0)} for t in ['Regular Season','Playoffs']],'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=build(json.loads(Path(sys.argv[1]).read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({'players':len(p['players']),'differences':p['differenceCount']}))
