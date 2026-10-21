"""Join an accepted season fixture to raw master metadata without stale seasons.

Only accepted appearances define the current population. Historical master rows
remain available for career calculations. Absent observations are not zero-filled.
"""
import copy,json,sys
from collections import defaultdict
from pathlib import Path

def build(candidate,metadata_rows):
 if not candidate.get('season') or not candidate.get('rows'):raise ValueError('Accepted season fixture required')
 masters={}
 for row in metadata_rows:
  name=row.get('Website Name')
  if not name:continue
  if name in masters:raise ValueError('Ambiguous master identity '+name)
  masters[name]=row
 grouped=defaultdict(list);seen=set()
 for appearance in candidate['rows']:
  name=appearance['inputs']['Name'];key=(name,appearance['targetTable'],appearance['sourceGameId'])
  if key in seen:raise ValueError('Duplicate accepted appearance')
  if any(token in name.lower() for token in ('unknown','unidentified','placeholder')):raise ValueError('Unresolved identity in accepted input')
  if name not in masters:raise ValueError('Missing master identity '+name)
  if appearance['targetTable'] not in ('SkaterStatsByGame','GoalieStatsByGame') or (isinstance(appearance['inputs'].get('GP'),bool) or appearance['inputs'].get('GP')!=1):raise ValueError('Invalid appearance role or GP')
  seen.add(key);grouped[name].append(appearance)
 players=[];unresolved=[]
 for name,appearances in grouped.items():
  types={a['targetTable'] for a in appearances}
  if len(types)!=1:raise ValueError('Mixed skater/goalie identity requires explicit utility treatment')
  role='Goaltender' if next(iter(types))=='GoalieStatsByGame' else 'Skater';master=masters[name]
  if (master.get('Position')=='G')!=(role=='Goaltender'):raise ValueError('Master and appearance role disagree '+name)
  status=master.get('Current Roster Status')
  if status not in ('FT','CU','DI','SCR'):unresolved.append({'name':name,'field':'Current Roster Status','value':status})
  players.append({'name':name,'season':candidate['season'],'role':role,'position':master.get('Position'),'rosterStatus':status,'gp':len(appearances),'appearances':copy.deepcopy(appearances)})
 return {'state':'CURRENT_SEASON_POPULATION_JOINED_WITH_EXPLICIT_METADATA_EXCEPTIONS' if unresolved else 'CURRENT_SEASON_POPULATION_JOINED','season':candidate['season'],'cutoff':max(a['date'] for a in candidate['rows']),'playerCount':len(players),'appearanceCount':len(seen),'players':players,'unresolvedMetadata':unresolved,'masterNamesOutsideCurrentPopulation':sorted(set(masters)-set(grouped)),'historicalMasterModified':False,'missingObservationPolicy':'Only fields present in accepted appearances are supplied; missing fields and nulls remain distinct from zero.','currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 candidate,metadata,out=map(Path,sys.argv[1:]);r=build(json.loads(candidate.read_text()),json.loads(metadata.read_text()));out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ('players','masterNamesOutsideCurrentPopulation')}))
