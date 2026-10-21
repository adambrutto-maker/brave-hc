"""Original min/max arithmetic with an explicit accepted current population.

This module owns component normalization, not eligibility, upstream internals or
final composite ratings. Unknown inputs hold a component rather than becoming 0.
"""
import hashlib,json,math,re
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
SOURCE='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154'
CAPTURE='73251e8e4fda7ecb229b9df096cacfcab8e92ddd4c474dcd6a3c646a2920390d'
TEMPLATE='IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)=_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1),75,50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))/(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))*50)),1),0)))'

TEMPLATES={'MINMAX_MIDPOINT': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)=_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1),75,50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))/(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))*50)),1),0)))', 'MINMAX_BLANK_ZERO': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,IFERROR(1*AwardScoring[RAW_FIELD],0)/(AwardScoring[Name]<>""),1)=_xlfn.AGGREGATE(15,6,IFERROR(1*AwardScoring[RAW_FIELD],0)/(AwardScoring[Name]<>""),1),75,50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,IFERROR(1*AwardScoring[RAW_FIELD],0)/(AwardScoring[Name]<>""),1))/(_xlfn.AGGREGATE(14,6,IFERROR(1*AwardScoring[RAW_FIELD],0)/(AwardScoring[Name]<>""),1)-_xlfn.AGGREGATE(15,6,IFERROR(1*AwardScoring[RAW_FIELD],0)/(AwardScoring[Name]<>""),1))*50)),1),0)))', 'MINMAX_SIGNED_TIE': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)=_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1),IF(AwardScoring[[#This Row],[RAW_FIELD]]<0,50,IF(AwardScoring[[#This Row],[RAW_FIELD]]=0,75,100)),50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))/(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))*50)),1),0)))', 'MINMAX_ABSOLUTE_TIE': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)=_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1),50+(AwardScoring[[#This Row],[RAW_FIELD]]*0.5),50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))/(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[RAW_FIELD]<>"")),1))*50)),1),0)))', 'GOALIE_OFFENSE': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(AwardScoring[[#This Row],[RAW_FIELD]]="",0,IFERROR(ROUND(IF(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1)<=0,75,IF(ABS(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1))<0.0001,IF(ABS(AwardScoring[[#This Row],[RAW_FIELD]])<0.0001,75,IF(AwardScoring[[#This Row],[RAW_FIELD]]<0,50,100)),50+((AwardScoring[[#This Row],[RAW_FIELD]]-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1))/(_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1)-_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<>"")),1))*50))),1),0)))', 'SKATER_IMPROVEMENT': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(OR(AwardScoring[[#This Row],[Award Scoring Type]]<>"Skater",AwardScoring[[#This Row],[RAW_FIELD]]=""),0,IFERROR(ROUND(MIN(100,MAX(50,IF(AwardScoring[[#This Row],[RAW_FIELD]]=0,75,IF(AwardScoring[[#This Row],[RAW_FIELD]]>0,75+(25*(AwardScoring[[#This Row],[RAW_FIELD]]/_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Skater")*(AwardScoring[RAW_FIELD]>0)),1))),75-(25*(AwardScoring[[#This Row],[RAW_FIELD]]/_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Skater")*(AwardScoring[RAW_FIELD]<0)),1))))))),1),0)))', 'GOALIE_IMPROVEMENT': 'IF(AwardScoring[[#This Row],[Name]]="","",IF(OR(AwardScoring[[#This Row],[Award Scoring Type]]<>"Goaltender",AwardScoring[[#This Row],[RAW_FIELD]]=""),0,IFERROR(ROUND(MIN(100,MAX(50,IF(AwardScoring[[#This Row],[RAW_FIELD]]=0,75,IF(AwardScoring[[#This Row],[RAW_FIELD]]>0,75+(25*(AwardScoring[[#This Row],[RAW_FIELD]]/_xlfn.AGGREGATE(14,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]>0)),1))),75-(25*(AwardScoring[[#This Row],[RAW_FIELD]]/_xlfn.AGGREGATE(15,6,AwardScoring[RAW_FIELD]/((AwardScoring[Name]<>"")*(AwardScoring[Award Scoring Type]="Goaltender")*(AwardScoring[RAW_FIELD]<0)),1))))))),1),0)))'}

def bindings(capture_path):
 path=Path(capture_path)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Formula capture changed')
 capture=json.loads(path.read_text())
 if capture['sourceWorkbookSha256']!=SOURCE:raise ValueError('Formula authority changed')
 supported={};unsupported=[]
 for column in capture['columns']:
  field=column['name'];formula=column['formula'] or ''
  if not field.endswith(' Web Display Score'):continue
  fields=re.findall(r'AwardScoring\[\[#This Row\],\[([^]]+)\]\]',formula)
  raw=next((f for f in fields if f not in ('Name','Award Scoring Type')),None)
  family=next((k for k,v in TEMPLATES.items() if raw and formula.replace(raw,'RAW_FIELD')==v),None)
  if family is None:unsupported.append(field);continue
  expected_mode={'ordinary':50} if field=='Total Award Goalie SHO Web Display Score' else {'array':50}
  if column['storedFormulaTypes']!=expected_mode:raise ValueError('Stored source formula mode changed')
  supported[field]={'inputField':raw,'family':family,'storedFormulaTypes':column['storedFormulaTypes'],'formulaSha256':hashlib.sha256(formula.encode()).hexdigest(),'sourceWorkbookSha256':SOURCE}
 return supported,unsupported

def minmax_score(value,low,high):
 if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in (value,low,high)):raise ValueError('Finite numeric values required')
 if low>high or value<low or value>high:raise ValueError('Value outside its normalization population')
 if low==high:return 75.0
 return float(Decimal(str(50+(value-low)/(high-low)*50)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP))

def normalize(binding,population,inputs):
 if inputs.get('season')!=population['season'] or inputs.get('cutoff')!=population['cutoff']:raise ValueError('Incompatible season or cutoff')
 names=[p['name'] for p in population['players']]
 if len(names)!=len(set(names)) or len(names)!=population['playerCount']:raise ValueError('Invalid current population')
 if any(p.get('season')!=population['season'] for p in population['players']):raise ValueError('Mixed-season population')
 values=inputs['values']
 if set(values)!=set(names):raise ValueError('Every current player needs a value or explicit disposition; extra names rejected')
 if inputs.get('inputField')!=binding['inputField']:raise ValueError('Component input binding differs')
 unavailable=[];numeric={};not_applicable={}
 for name,record in values.items():
  state=record.get('state')
  if state=='VALUE':
   value=record.get('value')
   if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):raise ValueError('Invalid component value '+name)
   numeric[name]=value
  elif state in ('UNAVAILABLE','NOT_APPLICABLE'):
   if not record.get('reason') or 'value' in record:raise ValueError('Explicit disposition required '+name)
   if state=='UNAVAILABLE':unavailable.append({'name':name,'reason':record['reason']})
   else:not_applicable[name]=record['reason']
  else:raise ValueError('Unknown component input state '+name)
 result={'season':population['season'],'cutoff':population['cutoff'],'inputField':binding['inputField'],'formulaSha256':binding['formulaSha256'],'currentPlayerCoverage':len(names),'unavailable':unavailable,'currentCompositeScoresVerified':False,'publicationAuthorized':False}
 if unavailable:return {**result,'state':'COMPONENT_INPUT_HOLD','scores':None}
 if not numeric:return {**result,'state':'COMPONENT_NOT_APPLICABLE','scores':{},'notApplicable':not_applicable}
 family=binding.get('family','MINMAX_MIDPOINT');roles={p['name']:p.get('role') for p in population['players']}
 scores=family_scores(family,numeric,not_applicable,roles)
 return {**result,'state':'CURRENT_COMPONENT_NORMALIZATION_CANDIDATE','family':family,'numericPlayerCount':len(numeric),'scores':scores,'notApplicable':not_applicable,'upstreamParityVerified':inputs.get('upstreamParityVerified') is True}

def excel_round(value):return float(Decimal(str(value)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP))
def family_scores(family,numeric,not_applicable,roles):
 if family not in TEMPLATES:raise ValueError('Unsupported normalization family')
 role='Skater' if family=='SKATER_IMPROVEMENT' else 'Goaltender' if family in ('GOALIE_IMPROVEMENT','GOALIE_OFFENSE') else None
 values={n:v for n,v in numeric.items() if role is None or roles.get(n)==role}
 cohort=list(values.values())+([0.0]*len(not_applicable) if family=='MINMAX_BLANK_ZERO' else [])
 if not cohort:return {name:0.0 for name in numeric}
 low,high=min(cohort),max(cohort);out={}
 for name,value in numeric.items():
  if family in ('SKATER_IMPROVEMENT','GOALIE_IMPROVEMENT'):
   if roles.get(name)!=role:
    out[name]=0.0;continue
   if value==0:score=75
   elif value>0:score=75+25*(value/max(v for v in cohort if v>0))
   else:score=75-25*(value/min(v for v in cohort if v<0))
   score=min(100,max(50,score))
  elif family=='GOALIE_OFFENSE':
   if high<=0:score=75
   elif abs(high-low)<0.0001:score=75 if abs(value)<0.0001 else 50 if value<0 else 100
   else:score=50+(value-low)/(high-low)*50
  elif low==high:
   if family=='MINMAX_SIGNED_TIE':score=50 if value<0 else 75 if value==0 else 100
   elif family=='MINMAX_ABSOLUTE_TIE':score=50+value*0.5
   else:score=75
  else:score=50+(value-low)/(high-low)*50
  out[name]=excel_round(score)
 return out
