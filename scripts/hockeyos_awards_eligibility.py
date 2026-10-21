"""Ten exact captured eligibility formulas with explicit season-table contexts.

Context rows must represent a complete, validated table snapshot. Unknown data
raises a hold; missing matching rows in a complete table sum to zero as Excel.
"""
import hashlib,json,re,math
from pathlib import Path
from hockeyos_awards_current_normalization import CAPTURE
from hockeyos_awards_scalar_internals import compile_formula,evaluate,MissingInput,ExcelError
ROSTER='SUMIFS(RosterStatusBySeason[Total Games],RosterStatusBySeason[Name],AwardScoring[[#This Row],[Name]],RosterStatusBySeason[Season],AwardScoring[[#This Row],[Recent Season]])'
PLAYOFF='SUMIFS(SeasonInfo[Total Games Contested],SeasonInfo[Season],AwardScoring[[#This Row],[Recent Season]],SeasonInfo[Game Type],"Playoffs")'
def bindings(capture):
 if hashlib.sha256(Path(capture).read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Formula authority changed')
 result={}
 for c in json.loads(Path(capture).read_text())['columns']:
  if not c['name'].endswith(' Eligible'):continue
  f=c['formula'].replace(ROSTER,'PL("Context roster games")').replace(PLAYOFF,'PL("Context playoff games")')
  result[c['name']]={'ast':compile_formula(f),'formulaSha256':hashlib.sha256(c['formula'].encode()).hexdigest(),'needsRoster':ROSTER in c['formula'],'needsPlayoff':PLAYOFF in c['formula']}
 if len(result)!=10:raise ValueError('Incomplete eligibility coverage')
 return result
def table_sum(rows,criteria,value_field):
 if not isinstance(rows,list):raise MissingInput('Complete season table required')
 total=0
 for r in rows:
  for field in criteria:
   if field not in r or r[field] is None:raise MissingInput('Season table '+field)
  if all(str(r[k]).casefold()==str(v).casefold() for k,v in criteria.items()):
   v=r.get(value_field)
   if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<0:raise MissingInput(value_field)
   total+=v
 return total
def calculate(binding,row,inputs,*,roster=None,seasons=None,context_complete=False):
 try:
  data=dict(inputs)
  if row.get('Name')!='' and (binding['needsRoster'] or binding['needsPlayoff']):
   if not context_complete:raise MissingInput('Validated complete context required')
   if not row.get('Name') or not row.get('Recent Season'):raise MissingInput('Identity and recent season required')
   if binding['needsRoster']:data['Context roster games']=table_sum(roster,{'Name':row['Name'],'Season':row['Recent Season']},'Total Games')
   if binding['needsPlayoff']:data['Context playoff games']=table_sum(seasons,{'Season':row['Recent Season'],'Game Type':'Playoffs'},'Total Games Contested')
  value=evaluate(binding['ast'],row,data)
  if value not in ('',0,1):raise ValueError('Invalid eligibility result')
  return {'state':'ELIGIBILITY_ARITHMETIC_CANDIDATE','value':value,'currentInputsVerified':False,'publicationAuthorized':False}
 except MissingInput as e:return {'state':'INPUT_HOLD','value':None,'missingField':str(e),'publicationAuthorized':False}
 except ExcelError as e:return {'state':'SOURCE_CALCULATION_ERROR','value':None,'error':str(e),'publicationAuthorized':False}
