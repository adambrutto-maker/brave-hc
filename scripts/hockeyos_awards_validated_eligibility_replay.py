"""Resolve current eligibility from the reconciled source ledger.

Unknown Carlyle status is retained. A finite equivalence-class analysis covers
all status branches, both rookie states and absent/present current roster row;
only invariant results may be used without choosing his status.
"""
import json
from pathlib import Path
from itertools import product
from hockeyos_awards_eligibility import bindings,calculate
from hockeyos_awards_eligibility_source_ledger import SOURCE

def replay(ledger,capture):
 if ledger.get('sourceWorkbookSha256')!=SOURCE or ledger.get('differenceCount')!=0 or ledger.get('season')!='W2026/27' or ledger.get('cutoff')!='2026-10-18':raise ValueError('Reconciled source ledger required')
 players=ledger['players']
 if len(players)!=22 or len({p['name'] for p in players})!=22:raise ValueError('Complete current identity coverage required')
 rules=bindings(capture);results=[]
 team_total=sum(r['Total Games Contested'] for r in ledger['seasonInfo'])
 for p in players:
  if p['differences']:raise ValueError('Unresolved source differences')
  row={'Name':p['name'],'Recent Season':p['season'],'Award Scoring Type':p['role'],'Position Group':p['positionGroup'],'Rookie Status':p['rookieStatus']}
  if p['rosterStatus'] is not None:row['Current Roster Status']=p['rosterStatus']
  known=p['rosterStatus'] is not None and p['rosterCurrentRowCount']==1
  for field,rule in rules.items():
   scenarios=[]
   variants=[(p['rosterStatus'],p['rookieStatus'],p['rosterTotalGames'])] if known else list(product(['FT','CU','DI','','OTHER'],[0,1],[0,team_total]))
   for status,rookie,total in variants:
    current=dict(row,**{'Current Roster Status':status,'Rookie Status':rookie})
    roster=[{'Name':p['name'],'Season':p['season'],'Total Games':total}]
    out=calculate(rule,current,p['inputs'],roster=roster,seasons=ledger['seasonInfo'],context_complete=True)
    if out['state']!='ELIGIBILITY_ARITHMETIC_CANDIDATE':raise ValueError('Incomplete validated arithmetic '+field+': '+str(out))
    scenarios.append(out['value'])
   possible=sorted(set(scenarios))
   results.append({'name':p['name'],'field':field,'state':'ELIGIBILITY_INPUTS_RECONCILED' if len(possible)==1 else 'INPUT_HOLD','value':possible[0] if len(possible)==1 else None,'possibleValues':possible,'method':'Direct reconciled inputs' if known else 'Invariant across all status branches, both rookie states and absent/present current roster row','scenarioCount':len(variants),'publicationAuthorized':False})
 return {'state':'CURRENT_ELIGIBILITY_RECONCILED_WITH_EXPLICIT_EXCEPTION','season':ledger['season'],'cutoff':ledger['cutoff'],'decisions':results,'resolvedCount':sum(r['value'] is not None for r in results),'holdCount':sum(r['value'] is None for r in results),'currentCompositeScoresVerified':False,'publicationAuthorized':False,'sourceWorkbookSha256':SOURCE}
if __name__=='__main__':
 import sys
 p=replay(json.loads(Path(sys.argv[1]).read_text()),sys.argv[2]);print(json.dumps(p,indent=2))
