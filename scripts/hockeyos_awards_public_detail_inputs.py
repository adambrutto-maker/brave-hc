"""Extend the immutable observation fixture with complete public goal summaries."""
import json,copy,hashlib
from pathlib import Path

def extend(candidate,details):
 if candidate['season']!='W2026/27' or len(candidate['rows'])!=57 or details.get('readOnly') is not True:raise ValueError('Accepted fixture/public evidence required')
 games={g['sourceGameId']:g for g in details['games']}
 if len(games)!=4 or len(details['games'])!=4:raise ValueError('Four unique public games required')
 result=copy.deepcopy(candidate);derivations=[];direct=[]
 for game,source in games.items():
  entries=[r for r in result['rows'] if r['sourceGameId']==game]
  if not entries:raise ValueError('Unaccepted public game')
  summaries=[t for t in source['tables'] if t and 'StrStrength' in t[0] and 'Team' in t[0]]
  goalie_tables=[t for t in source['tables'] if t and 'GP' in t[0] and 'GA' in t[0] and '+/-' in t[0]]
  if len(summaries)!=1 or len(goalie_tables)!=1:raise ValueError('Unique goal and goalie tables required')
  header=summaries[0][0];team_i=header.index('Team');strength_i=header.index('StrStrength');goals=[r for r in summaries[0][1:] if r[team_i]=='Brave H.C.']
  skaters=[r for r in entries if r['targetTable']=='SkaterStatsByGame']
  if len(goals)!=sum(r['inputs']['G'] for r in skaters) or any(r[strength_i]!='ES' for r in goals):raise ValueError('Complete even-strength team goal summary required')
  for r in skaters:
   for field in ('PPG','SHG'):
    if r['inputs'].get(field) not in (None,0):raise ValueError('Special-teams observation conflict')
    r['inputs'][field]=0;derivations.append({'name':r['inputs']['Name'],'sourceGameId':game,'field':field,'value':0,'method':'COMPLETE_TEAM_GOAL_SUMMARY_ALL_EVEN_STRENGTH','teamGoalCount':len(goals),'sourceUrl':source['sourceUrl'],'htmlSha256':source['htmlSha256'],'directObservation':False})
  t=goalie_tables[0];h=t[0]
  for r in (r for r in entries if r['targetTable']=='GoalieStatsByGame'):
   matches=[v for v in t[1:] if v[h.index('Name')]==r['inputs']['Name']]
   if len(matches)!=1:raise ValueError('Unique goalie detail row required')
   v=matches[0]
   for field in ('GP','L','GA'):
    if int(v[h.index(field)])!=r['inputs'][field]:raise ValueError('Goalie public record changed')
   pm=int(v[h.index('+/-')]);r['inputs']['+/-']=pm;direct.append({'name':r['inputs']['Name'],'sourceGameId':game,'field':'+/-','value':pm,'sourceUrl':source['sourceUrl'],'htmlSha256':source['htmlSha256'],'directObservation':True})
 if len(derivations)!=106 or len(direct)!=4:raise ValueError('Detail coverage incomplete')
 result.update({'additionalDerivedObservations':derivations,'additionalDirectObservations':direct,'status':'REVIEW_ONLY_EXTENDED_PUBLIC_INPUTS','publicationAuthorized':False})
 return result
if __name__=='__main__':
 import sys
 candidate=Path(sys.argv[1])
 if hashlib.sha256(candidate.read_bytes()).hexdigest()!='d940763965786aa4288217838e102eb5611a73995f5b5d71afc56f7247a31fe4':raise ValueError('Base observation fixture pin changed')
 p=extend(json.loads(candidate.read_text()),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(p,indent=2));print(json.dumps({'derived':len(p['additionalDerivedObservations']),'direct':len(p['additionalDirectObservations'])}))
