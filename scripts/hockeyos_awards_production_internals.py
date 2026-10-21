"""Six captured goal/assist/point internal formulas, with explicit input holds.

Historical inputs are supplied separately from current observations. This stage
preserves original weights and three-decimal rounding; it does not grant release.
"""
import hashlib,json,math
from decimal import Decimal,ROUND_HALF_UP
from pathlib import Path
from hockeyos_awards_current_normalization import CAPTURE,SOURCE

def fields(phase,metric):
 if phase not in ('Total','Playoff') or metric not in ('G','A','Pts'):raise ValueError('Unknown production branch')
 return {'played':'Current '+phase+' Skater Played Games','count':'Current '+phase+' Raw '+metric,'leader':'Current '+phase+' Skater '+metric+' Raw Leader','rate':'Current '+phase+' '+metric+'/GP','priorGP':'Career Prior Skater'+(' Playoff' if phase=='Playoff' else '')+' GP','priorRate':'Career Prior '+phase+' '+metric+'/GP','fieldRate':'Current '+phase+' Skater '+metric+' Field Rate Avg','teamRate':'All-Time '+phase+' Skater '+metric+' Team Rate Avg'}
def bindings(path):
 path=Path(path)
 if hashlib.sha256(path.read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Formula capture changed')
 source=json.loads(path.read_text());columns={c['name']:c for c in source['columns']};template=columns['Total Final G Internal Score']['formula'];result={}
 # Exact substitution is limited to the captured six regular/playoff stat branches.
 for phase in ('Total','Playoff'):
  for metric in ('G','A','Pts'):
   name=phase+' Final '+metric+' Internal Score';expected=template
   for old,new in sorted(zip(fields('Total','G').values(),fields(phase,metric).values()),key=lambda pair:-len(pair[0])):expected=expected.replace('PlayerInfo['+old+']','PlayerInfo['+new+']')
   column=columns[name]
   if column['formula']!=expected or column['storedFormulaTypes']!={'array':50}:raise ValueError('Captured production branch differs')
   result[name]={'phase':phase,'metric':metric,'fields':fields(phase,metric),'sourceWorkbookSha256':SOURCE,'formulaSha256':hashlib.sha256(column['formula'].encode()).hexdigest()}
 return result

def calculate(binding,role,values):
 result={'inputField':binding.get('metric'),'phase':binding['phase'],'currentCompositeScoresVerified':False}
 if role not in ('Skater','Goaltender'):raise ValueError('Explicit award scoring role required')
 if role!='Skater':return {**result,'state':'NOT_APPLICABLE','reason':'Captured source excludes non-skaters','value':None}
 f=binding['fields'];missing=[]
 def get(key):
  field=f[key];v=values.get(field)
  if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v):missing.append(field);return None
  return v
 played=get('played')
 if missing:return {**result,'state':'INPUT_HOLD','missingFields':missing,'value':None}
 if played<=0:return {**result,'state':'NOT_APPLICABLE','reason':'No played games in the source phase','value':None}
 prior=get('priorGP');count=get('count');leader=get('leader');rate=get('rate');fieldrate=get('fieldRate');teamrate=get('teamRate')
 priorrate=get('priorRate') if prior is not None and prior>0 else None
 if missing:return {**result,'state':'INPUT_HOLD','missingFields':missing,'value':None}
 improvement=0 if prior<=0 else rate-priorrate
 raw=(count/max(1,leader))*0.4+improvement*0.25+(rate-fieldrate)*0.2+(rate-teamrate)*0.15
 value=float(Decimal(str(raw)).quantize(Decimal('0.001'),rounding=ROUND_HALF_UP))
 return {**result,'state':'INTERNAL_VALUE_CANDIDATE','value':value,'terms':{'production':(count/max(1,leader))*0.4,'priorImprovement':improvement*0.25,'fieldDifference':(rate-fieldrate)*0.2,'historicalTeamDifference':(rate-teamrate)*0.15}}
