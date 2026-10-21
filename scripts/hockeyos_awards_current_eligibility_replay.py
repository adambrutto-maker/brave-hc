"""Conservative current replay: accepted regular-season GP, no cached history.

The four accepted games are regular-season games. Full roster-season denominator
and rookie metadata validation remain open, so dependent decisions hold.
"""
import json
from hockeyos_awards_eligibility import bindings,calculate
def replay(population,capture):
 if population.get('season')!='W2026/27' or population.get('cutoff')!='2026-10-18' or population.get('playerCount')!=22:raise ValueError('Accepted fixture context required')
 players=population['players']
 if len(players)!=22 or len({p['name'] for p in players})!=22 or sum(p['gp'] for p in players)!=57:raise ValueError('Population coverage changed')
 rules=bindings(capture);results=[]
 for p in players:
  if p['role'] not in ('Skater','Goaltender') or p['gp']!=len(p['appearances']) or any(a['game'] not in (359,360,361,362) for a in p['appearances']):raise ValueError('Accepted appearance mismatch')
  row={'Name':p['name'],'Recent Season':p['season'],'Award Scoring Type':p['role']}
  if p.get('rosterStatus') is not None:row['Current Roster Status']=p['rosterStatus']
  inputs={'Current Skater GP':p['gp'] if p['role']=='Skater' else 0,'Current Goalie GP':p['gp'] if p['role']=='Goaltender' else 0,'Current Skater Playoff GP':0}
  for field,binding in rules.items():
   # Conn Smythe depends only on the complete season/game-type playoff sum.
   # No playoff games at the accepted cutoff is independently established.
   output=calculate(binding,row,inputs,seasons=[],context_complete=field=='Conn Smythe Eligible')
   results.append({'name':p['name'],'field':field,**output})
 return {'state':'CURRENT_ELIGIBILITY_PARTIAL_REPLAY','season':population['season'],'cutoff':population['cutoff'],'decisions':results,
         'candidateCount':sum(r['state']=='ELIGIBILITY_ARITHMETIC_CANDIDATE' for r in results),'holdCount':sum(r['state']=='INPUT_HOLD' for r in results),
         'context':'Four accepted regular-season games; no current playoffs. Roster denominators and rookie/historical inputs not accepted.',
         'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 print(json.dumps(replay(json.load(open(sys.argv[1])),sys.argv[2]),indent=2))
