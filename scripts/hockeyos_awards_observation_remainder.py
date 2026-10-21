"""Resolve missing nonnegative game counts from complete same-cutoff season totals.

Raw observations stay unchanged. Every inferred value carries its exact equation.
"""
import copy,hashlib,json,sys
from collections import defaultdict
from pathlib import Path

def count(v):
 if isinstance(v,bool) or not isinstance(v,(int,float)) or v<0 or int(v)!=v:raise ValueError('Nonnegative integer count required')
 return int(v)
def reconcile(candidate,participants):
 if candidate['season']!=participants['season']:raise ValueError('Season mismatch')
 players={p['name']:p for p in participants['players']}
 if len(players)!=len(participants['players']):raise ValueError('Duplicate player identity')
 expected_games=set(participants['evidenceGameIds'])
 if len(expected_games)!=participants['officialTeamGames'] or candidate['officialTeamGames']!=participants['officialTeamGames']:raise ValueError('Game cutoff mismatch')
 result=copy.deepcopy(candidate);grouped=defaultdict(list);seen=set()
 for row in result['rows']:
  name=row['inputs']['Name'];key=(row['targetTable'],row['sourceGameId'],name)
  if key in seen:raise ValueError('Duplicate appearance')
  seen.add(key)
  if name not in players or row['sourceGameId'] not in expected_games:raise ValueError('Unknown player or game')
  expected_table='SkaterStatsByGame' if players[name]['position']=='Skater' else 'GoalieStatsByGame' if players[name]['position']=='Goalie' else None
  if expected_table is None or row['targetTable']!=expected_table or count(row['inputs']['GP'])!=1:raise ValueError('Role or appearance GP mismatch')
  grouped[name].append(row)
 if set(grouped)!=set(players) or {r['sourceGameId'] for r in result['rows']}!=expected_games:raise ValueError('Incomplete participant/game coverage')
 if max(r['date'] for r in result['rows'])!=participants['latestCompletedGameDate']:raise ValueError('Date cutoff mismatch')
 derived=[];constraints=[]
 for name,rows in grouped.items():
  player=players[name];raw=player['currentHTORaw']
  if raw['name']!=name or raw['season']!=candidate['season'] or raw['sourceKind']!='OFFICIAL_HTO_PUBLISHED_SEASON_STATISTICS':raise ValueError('Season source identity mismatch')
  if count(raw['gamesPlayed'])!=sum(count(r['inputs']['GP']) for r in rows):raise ValueError('Incomplete appearance coverage')
  field,season_field=('PIM','penaltyMinutes') if player['position']=='Skater' else ('POTG','playerOfTheGameCount')
  if any(field not in r['inputs'] for r in rows):raise ValueError('Target field absent; cannot invent raw observation')
  total=count(raw[season_field]);known=sum(count(r['inputs'][field]) for r in rows if r['inputs'][field] is not None)
  holes=[r for r in rows if r['inputs'][field] is None];residual=total-known
  if residual<0 or not holes and residual!=0:raise ValueError('Game values contradict season total')
  if field=='POTG' and (total>len(rows) or any(r['inputs'][field] is not None and count(r['inputs'][field])>1 for r in rows)):raise ValueError('POTG exceeds one per appearance')
  if residual==0 or len(holes)==1:
   value=residual if len(holes)==1 else 0
   if field=='POTG' and value>1:raise ValueError('POTG residual exceeds appearance maximum')
   for row in holes:
    evidence={'name':name,'sourceGameId':row['sourceGameId'],'field':field,'value':value,'method':'ADDITIVE_SEASON_REMAINDER','seasonTotal':total,'knownGameSubtotal':known,'missingAppearanceCount':len(holes),'residual':residual,'completeAppearanceGP':len(rows),'season':candidate['season'],'cutoff':participants['latestCompletedGameDate'],'directGameObservation':False,'basis':'All appearances covered; counts are nonnegative integers. Zero remainder forces each missing count to zero.' if residual==0 else 'One missing observation equals the verified season total minus known game counts.'}
    row['inputs'][field]=value;row.setdefault('derivedObservations',[]).append(evidence);derived.append(evidence)
  else:constraints.append({'name':name,'field':field,'residual':residual,'unknownGames':[r['sourceGameId'] for r in holes]})
 result['status']='DERIVED_OBSERVATIONS_REVIEW_ONLY'
 result['originalAbsentFieldsPolicy']=result.get('absentFieldsPolicy')
 result['absentFieldsPolicy']='Raw missing values remain preserved in the pinned source. This candidate adds only same-cutoff additive derivations with recorded equations; unresolved observations remain null.'
 result['unknownSkaterPIM']=sum(r['inputs'].get('PIM') is None for r in result['rows'] if r['targetTable']=='SkaterStatsByGame')
 result['unknownGoaliePOTG']=sum(r['inputs'].get('POTG') is None for r in result['rows'] if r['targetTable']=='GoalieStatsByGame')
 result['derivedObservationCount']=len(derived);result['currentScoresVerified']=False;result['publicationAuthorized']=False
 return result,{'state':'ALL_TARGET_OBSERVATIONS_RESOLVED_BY_ADDITIVE_CONSTRAINTS' if not constraints else 'ADDITIVE_CONSTRAINTS_PARTIAL','playerCoverage':len(players),'appearanceCoverage':len(result['rows']),'derivedObservations':derived,'unresolvedConstraints':constraints,'remainingSkaterPIM':result['unknownSkaterPIM'],'remainingGoaliePOTG':result['unknownGoaliePOTG'],'rawInputsModified':False,'currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 c,p=Path(sys.argv[1]),Path(sys.argv[2]);result,receipt=reconcile(json.loads(c.read_text()),json.loads(p.read_text()))
 receipt['sourceHashes']={'candidate':hashlib.sha256(c.read_bytes()).hexdigest(),'participants':hashlib.sha256(p.read_bytes()).hexdigest()}
 Path(sys.argv[3]).write_text(json.dumps(result,indent=2)+'\n');Path(sys.argv[4]).write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps({k:v for k,v in receipt.items() if k!='derivedObservations'}))
