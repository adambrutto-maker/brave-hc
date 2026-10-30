"""Original regular-season count title arithmetic and source tie ordering.

Inputs must be reconciled current-season skaters. Source row order is a model
input: the captured workbook uses ROW() as its last tie term. No OVR is produced.
"""
import json,sys
from pathlib import Path

def calculate(skaters,team_games):
 if isinstance(team_games,bool) or not isinstance(team_games,int) or team_games<1:raise ValueError('Completed regular-season game count required')
 seen=set();orders=set();rows=[]
 for player in skaters:
  p=dict(player);name=p['name'];order=p['sourceWorksheetRow']
  if not isinstance(name,str) or not name.strip() or name in seen or any(x in name.lower() for x in ('unknown','unidentified','placeholder')):raise ValueError('Unique resolved player identity required')
  if isinstance(order,bool) or not isinstance(order,int) or not 1<=order<100000 or order in orders:raise ValueError('Unique source tie order required')
  for f in ('gp','goals','assists','points'):
   if isinstance(p[f],bool) or not isinstance(p[f],(int,float)) or p[f]<0 or int(p[f])!=p[f]:raise ValueError('Nonnegative integer count required')
  if not 1<=p['gp']<=team_games or p['points']!=p['goals']+p['assists']:raise ValueError('Appearance or point totals inconsistent')
  seen.add(name);orders.add(order);tie=(100000-order)/100000
  rows.append({'name':name,'sourceWorksheetRow':order,'artRossScore':p['points'],'artRossRankKey':p['points']*1000000000000+p['goals']*100000000+p['assists']*10000+(p['points']/max(1,p['gp']))*100+tie,'rocketScore':p['goals'],'rocketRankKey':p['goals']*1000000+tie})
 rows.sort(key=lambda p:p['sourceWorksheetRow'])
 return {'rows':rows,'artRossOrder':[p['name'] for p in sorted(rows,key=lambda p:-p['artRossRankKey'])],'rocketOrder':[p['name'] for p in sorted(rows,key=lambda p:-p['rocketRankKey'])]}
def compare(reference,team_games):
 result=calculate(reference['rows'],team_games);actual={p['name']:p for p in result['rows']};differences=[]
 for p in reference['rows']:
  for field,native in [('artRossScore','nativeArtRossScore'),('artRossRankKey','nativeArtRossRankKey'),('rocketScore','nativeRocketScore'),('rocketRankKey','nativeRocketRankKey')]:
   if actual[p['name']][field]!=p[native]:differences.append({'name':p['name'],'field':field,'calculated':actual[p['name']][field],'native':p[native]})
 return {'state':'CURRENT_COUNT_ARITHMETIC_PARITY_PASS' if not differences else 'CURRENT_COUNT_ARITHMETIC_PARITY_HOLD','playerComparisons':len(reference['rows']),'numericComparisons':4*len(reference['rows']),'differences':differences,'outputs':result,'comparison':'Exact IEEE numeric values; no score or rank tolerance','currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 reference=json.loads(Path(sys.argv[1]).read_text());out=compare(reference,int(sys.argv[2]));Path(sys.argv[3]).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='outputs'}))
