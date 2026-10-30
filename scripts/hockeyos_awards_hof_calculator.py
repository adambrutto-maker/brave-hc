"""HOF eligibility, awards, raw composite and final ranking arithmetic.

Career component inputs are saved native values, not rebuilt career evidence.
This verifies only these downstream stages and never authorizes publication.
"""
import json,math
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
from hockeyos_awards_hof_reference_export import PIN
WEIGHTS={'Skater':{'HOF Career Production Internal Score':.36,'HOF Career Playoff Internal Score':.18,'HOF Production Consistency Internal Score':.15,'HOF Longevity Internal Score':.16,'HOF Awards & Records Score':.1,'HOF Streak Heat Internal Score':.05},'Goaltender':{'HOF Goalie Career Internal Score':.38,'HOF Goalie Playoff Internal Score':.24,'HOF Longevity Internal Score':.23,'HOF Awards & Records Score':.1,'HOF Streak Heat Internal Score':.05}}
def rounded(v,d=1):return float(Decimal(str(v)).quantize(Decimal(1).scaleb(-d),rounding=ROUND_HALF_UP))
def numeric(v):
 if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):raise ValueError('Missing finite HOF observation')
 return v
def calculate(players,awards):
 names=set();rows=[];orders=set()
 for p in players:
  n=p['Website Name']
  if not n:continue
  if not isinstance(n,str) or n in names:raise ValueError('Unique career identities required')
  order=p['sourceRow']
  if isinstance(order,bool) or not isinstance(order,int) or order<6 or order in orders:raise ValueError('Unique native worksheet rows required')
  names.add(n);orders.add(order);sg=numeric(p['Career Total Skater GP']);gg=numeric(p['Career Total Goalie GP'])
  if sg<0 or gg<0:raise ValueError('Negative career GP')
  a=[r for r in awards if r['Player']==n];inducted=any(r['Brave H.C. Hall of Fame']==1 for r in a)
  role='Goaltender' if gg>sg else 'Skater';eligible=int(not inducted and sg+gg>=50)
  values={'HOF Scoring Type':role,'HOF Eligible':eligible}
  for field,key in [('HOF Major Awards Won','Major Awards Won'),('HOF Minor Awards Won','Minor Awards Won'),('HOF Award Points','Points Awarded')]:values[field]=sum(0 if r[key]=='' else numeric(r[key]) for r in a)
  values['HOF Total Awards Won']=values['HOF Major Awards Won']+values['HOF Minor Awards Won']
  values['HOF Raw Composite Internal Score']=rounded(sum(numeric(p[f])*w for f,w in WEIGHTS[role].items()))
  rows.append({'name':n,'sourceRow':order,'values':values})
 eligible=[r['values']['HOF Raw Composite Internal Score'] for r in rows if r['values']['HOF Eligible']==1];hi=max(eligible,default=0);lo=min(eligible,default=0)
 for r in rows:
  v=r['values'];raw=v['HOF Raw Composite Internal Score'];score=0
  if v['HOF Eligible']==1:score=50 if hi<=0 else 100 if hi==lo or raw==hi else min(99.9,rounded(50+49.9*((raw-lo)/(hi-lo))))
  v['HOF Final Web Display Score']=score;v['HOF Rank Key']=rounded(score,3)*1000000+rounded(raw,3)*100+(100000-(r['sourceRow']-5))/100000 if v['HOF Eligible']==1 else 0
 return rows

def audit(reference):
 if reference.get('sourceSchemaSha256')!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae' or reference.get('sourceWorkbookSha256')!=PIN or reference.get('readOnlyHashUnchanged') is not True:raise ValueError('Pinned read-only native reference required')
 native={p['Website Name']:p for p in reference['players'] if p['Website Name']};rows=calculate(reference['players'],reference['awardSummary']);checks=[]
 for r in rows:
  for f,v in r['values'].items():checks.append({'name':r['name'],'field':f,'computed':v,'native':native[r['name']][f],'matches':v==native[r['name']][f]})
 differences=[c for c in checks if not c['matches']]
 return {'state':'HOF_DOWNSTREAM_SAVED_ARITHMETIC_PARITY_PASS' if not differences else 'HOF_DOWNSTREAM_SAVED_ARITHMETIC_PARITY_HOLD','sourceWorkbookSha256':PIN,'playerCount':len(rows),'checked':len(checks),'differenceCount':len(differences),'differences':differences,'rows':rows,'eligibleOrder':[r['name'] for r in sorted(rows,key=lambda r:-r['values']['HOF Rank Key']) if r['values']['HOF Eligible']==1],'scope':'Eligibility, scoring role, award totals, raw composite, final display and rank key only. Career component inputs remain saved native observations.','careerComponentsRebuilt':False,'currentHallOfFameVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 p=audit(json.loads(Path(sys.argv[1]).read_text()));Path(sys.argv[2]).write_text(json.dumps(p,indent=2));print(json.dumps({k:v for k,v in p.items() if k not in ('rows','eligibleOrder')}))
