"""Eight captured final-score rules. Caller must validate eligibility and inputs.
Dedication uses whole numbers per Adam’s correction; legacy mode is audit only.

This module does not authorize publication or accept upstream current inputs.
"""
import hashlib,json,math
from decimal import Decimal,ROUND_HALF_UP
from pathlib import Path
from hockeyos_awards_current_normalization import CAPTURE
MODELS={
 'Hart':('Hart','Hart','gap'),
 'Conn Smythe':('Conn Smythe','Conn Smythe','role_gap'),
 'Norris':('Norris','Norris','single_gap'),
 'Rookie':('Rookie','Rookie of the Year','rookie'),
 'Lady Byng':('Lady Byng','Lady Byng','range'),
 'Most Improved':('Most Improved Player','Most Improved Player','signed'),
 'Rolaids':('Rolaids Relief Man','Rolaids Relief Man','gap'),
 'Dedication':('Andrew Cristillo Dedication','Andrew Cristillo Dedication','dedication')}
def rounded(value,digits=0):
 return float(Decimal(str(value)).quantize(Decimal(1).scaleb(-digits),rounding=ROUND_HALF_UP))
def numeric(value):
 if isinstance(value,bool) or not isinstance(value,(float,int)) or not math.isfinite(value):
  raise ValueError('Missing or invalid eligible numeric input')
 return value
def calculate(model,rows,capture,*,legacy_reference=False):
 """Full-cohort calculation; missing eligible inputs hold instead of becoming zero."""
 if hashlib.sha256(Path(capture).read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Formula capture changed')
 if model not in MODELS:raise ValueError('Unknown model')
 rank_prefix,score_prefix,kind=MODELS[model]
 eligibility=model+' Eligible';raw=model+' Raw Composite Score';rank=rank_prefix+' Rank Key'
 seen=set();eligible=[]
 for row in rows:
  name=row.get('Name')
  if not isinstance(name,str) or not name or name in seen:raise ValueError('Missing or duplicate identity')
  seen.add(name)
  if row.get(eligibility) not in (0,1) or isinstance(row.get(eligibility),bool):raise ValueError('Unknown eligibility')
  if row[eligibility]==1:
   if kind=='dedication' and row.get(raw)=='':continue
   numeric(row.get(raw));numeric(row.get(rank))
   if kind=='role_gap' and row.get('Award Scoring Type') not in ('Skater','Goaltender'):raise ValueError('Invalid eligible role')
   eligible.append(row)
 values=[r[raw] for r in eligible];high=max(values) if values else None;low=min(values) if values else None
 results=[]
 for row in rows:
  if row[eligibility]!=1:score='' if kind=='dedication' else 0
  elif kind=='dedication' and row[raw]=='':score=''
  else:
   value=row[raw]
   if kind in ('gap','role_gap','single_gap'):
    score=75 if kind!='gap' and len(eligible)<=1 else max(50,min(rounded(100-(high-value)),100-sum(q[rank]>row[rank] for q in eligible)))
   elif kind in ('rookie','range'):
    score=75 if kind=='rookie' and len(eligible)<=1 else 100 if value==high else min(99,max(50,rounded(50+(value-low)/(high-low)*50)))
   elif kind=='dedication':score=100 if high==low else rounded(min(100,max(50,50+(value-low)/(high-low)*50)),1 if legacy_reference else 0)
   else:
    if value>0:
     positive=[r for r in eligible if r[raw]>0]
     score=100 if row[rank]==max(r[rank] for r in positive) else min(99,max(75,rounded(75+value/max(r[raw] for r in positive)*25)))
    elif value==0:score=75
    else:score=max(50,min(75,rounded(75-(-value)/(-min(v for v in values if v<0))*25)))
   numeric(score)
  results.append({'name':row['Name'],'score':score})
 return {'model':model,'state':'FINAL_ARITHMETIC_CANDIDATE','results':results,
         'dedicationRounding':'legacy-one-decimal-audit-only' if legacy_reference else 'approved-whole-number',
         'eligibilityVerified':False,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
def legacy_parity(capture):
 source=json.loads(Path(capture).read_text())
 def decode(cell):
  if cell is None:return ''
  if isinstance(cell,str):return cell
  if cell['type']=='n':return float(cell['value'])
  if cell['type']=='str':return cell.get('value') or ''
  raise ValueError('Unsupported native cell')
 rows=[{k:decode(v) for k,v in r['values'].items()} for r in source['historicalRows']]
 rows=[r for r in rows if r['Name']]
 comparisons=[]
 for model,(_,score_prefix,_) in MODELS.items():
  result=calculate(model,rows,capture,legacy_reference=True)
  for row,out in zip(rows,result['results']):
   expected=row[score_prefix+' Award Score']
   comparisons.append({'model':model,'name':row['Name'],'calculated':out['score'],'native':expected,'matches':out['score']==expected})
 return {'schema':'brave-hc-awards-final-arithmetic-parity/v1','state':'PASS' if all(c['matches'] for c in comparisons) else 'MISMATCH',
         'comparisons':comparisons,'checked':len(comparisons),'differences':sum(not c['matches'] for c in comparisons),
         'reference':'Original saved native formula capture; eligibility and raw inputs supplied, not recalculated',
         'eligibilityVerified':False,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 import sys
 print(json.dumps(legacy_parity(sys.argv[1]),indent=2))
