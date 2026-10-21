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

def bindings(capture_path):
 path=Path(capture_path)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Formula capture changed')
 capture=json.loads(path.read_text())
 if capture['sourceWorkbookSha256']!=SOURCE:raise ValueError('Formula authority changed')
 supported={};unsupported=[]
 for column in capture['columns']:
  field=column['name'];formula=column['formula'] or ''
  if not field.endswith(' Web Display Score'):continue
  match=re.search(r'AGGREGATE\(14,6,AwardScoring\[([^]]+)\]',formula)
  if not match or formula.replace(match[1],'RAW_FIELD')!=TEMPLATE:unsupported.append(field);continue
  if column['storedFormulaTypes']!={'array':50}:raise ValueError('Stored source array mode changed')
  supported[field]={'inputField':match[1],'formulaSha256':hashlib.sha256(formula.encode()).hexdigest(),'sourceWorkbookSha256':SOURCE}
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
 low,high=min(numeric.values()),max(numeric.values())
 return {**result,'state':'CURRENT_COMPONENT_NORMALIZATION_CANDIDATE','bounds':[low,high],'numericPlayerCount':len(numeric),'scores':{name:minmax_score(value,low,high) for name,value in numeric.items()},'notApplicable':not_applicable,'upstreamParityVerified':inputs.get('upstreamParityVerified') is True}
