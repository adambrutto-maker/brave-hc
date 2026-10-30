"""Connect supplied eligibility/raw composites to eight scores and rank keys.

The supplied population must already be the intended reference cohort. This
arithmetic stage cannot certify upstream inputs or release the resulting scores.
"""
from hockeyos_awards_final_scores import MODELS,calculate,numeric
RAW_RANK={'Hart','Conn Smythe','Norris','Most Improved','Rolaids','Dedication'}
def run(rows,capture):
 names=set();indices=set();working=[]
 for source in rows:
  row=dict(source);name=row.get('Name');index=row.get('sourceWorksheetRow')
  if not isinstance(name,str) or not name or name in names:raise ValueError('Unique complete identity required')
  if isinstance(index,bool) or not isinstance(index,int) or index<6 or index>55 or index in indices:raise ValueError('Original unique worksheet rows 6–55 required')
  if row.get('Award Scoring Type') not in ('Skater','Goaltender'):raise ValueError('Explicit scoring role required')
  names.add(name);indices.add(index)
  for model,(rank_prefix,_,_) in MODELS.items():
   eligible=row.get(model+' Eligible')
   if isinstance(eligible,bool) or eligible not in (0,1):raise ValueError('Verified eligibility value required: '+model)
   if eligible:
    raw=row.get(model+' Raw Composite Score')
    if model=='Dedication' and raw=='':row[rank_prefix+' Rank Key']=1/(1000000+index)
    else:
     numeric(raw)
     row[rank_prefix+' Rank Key']=raw+1/(1000000+index) if model in RAW_RANK else 0
   else:row[rank_prefix+' Rank Key']=0 if model in ('Rookie','Lady Byng') else ''
  working.append(row)
 for model,(rank_prefix,score_prefix,_) in MODELS.items():
  output=calculate(model,working,capture)
  for row,score in zip(working,output['results']):
   row[score_prefix+' Award Score']=score['score']
   if model in ('Rookie','Lady Byng') and row[model+' Eligible']==1:
    row[rank_prefix+' Rank Key']=score['score']*1000000+row[model+' Raw Composite Score']*100+(100000-row['sourceWorksheetRow'])/100000
 return {'state':'FINAL_SCORES_AND_RANK_KEYS_CANDIDATE','rows':working,'upstreamInputsVerified':False,'publicationAuthorized':False,'dedicationRounding':'approved-whole-number'}
