"""Restricted interpreter for the 44 immutable scalar internal formulas.

No eval, workbook writes or arbitrary functions. Unknown supplied inputs bypass
IFERROR and hold the calculation. Known legacy blanks/errors remain distinct.
"""
import json,re,math
from decimal import Decimal,ROUND_HALF_UP
from hockeyos_awards_current_normalization import CAPTURE,SOURCE
from pathlib import Path
class MissingInput(Exception):pass
class ExcelError(Exception):pass
ALLOWED={'IF','IFERROR','ROUND','MIN','MAX','ABS','SUM','OR','AND','ROUNDUP','MOD','PL','ROW'}
LOOKUP=re.compile(r'INDEX\(PlayerInfo\[([^]]+)\],MATCH\(AwardScoring\[\[#This Row\],\[Name\]\],PlayerInfo\[Website Name\],0\)\)')
TOKEN=re.compile(r'\s*(?:(\d+(?:\.\d*)?(?:[Ee][+-]?\d+)?|\.\d+)|("(?:[^"]|"")*")|([A-Za-z_][A-Za-z0-9_.]*)|(<>|<=|>=|[=<>+*/^(),-]))')
def quote(s):return '"'+s.replace('"','""')+'"'
def compile_formula(formula):
 formula=LOOKUP.sub(lambda m:'PL('+quote(m[1])+')',formula)
 formula=re.sub(r'AwardScoring\[\[#This Row\],\[([^]]+)\]\]',lambda m:'ROW('+quote(m[1])+')',formula)
 tokens=[];pos=0
 while pos<len(formula):
  m=TOKEN.match(formula,pos)
  if not m:raise ValueError('Unsupported source token at '+formula[pos:pos+30])
  token=('num',float(m[1])) if m[1] else ('str',m[2][1:-1].replace('""','"')) if m[2] else ('id',m[3].upper()) if m[3] else ('op',m[4])
  tokens.append(token);pos=m.end()
 index=0;precedence={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'+':2,'-':2,'*':3,'/':3,'^':4}
 def expr(minimum=0):
  nonlocal index
  if index>=len(tokens):raise ValueError('Incomplete formula')
  kind,value=tokens[index];index+=1
  if value in ('+','-') and kind=='op':left=('unary',value,expr(4))
  elif kind in ('num','str'):left=('literal',value)
  elif value=='(':
   left=expr()
   if index>=len(tokens) or tokens[index][1]!=')':raise ValueError('Missing close parenthesis')
   index+=1
  elif kind=='id' and value in ALLOWED:
   if index>=len(tokens) or tokens[index][1]!='(':raise ValueError('Function call expected')
   index+=1;args=[]
   if index<len(tokens) and tokens[index][1]!=')':
    while True:
     args.append(expr())
     if index>=len(tokens):raise ValueError('Unclosed function')
     if tokens[index][1]!=',':break
     index+=1
   if index>=len(tokens) or tokens[index][1]!=')':raise ValueError('Function close expected')
   index+=1
   arity={'IF':3,'IFERROR':2,'ROUND':2,'ROUNDUP':2,'MOD':2,'ABS':1,'PL':1,'ROW':1}
   if value in arity and len(args)!=arity[value]:raise ValueError('Invalid source function arity')
   if value in ('MIN','MAX','SUM','OR','AND') and not args:raise ValueError('Empty source function')
   left=('call',value,args)
  else:raise ValueError('Unsupported scalar expression')
  while index<len(tokens) and tokens[index][0]=='op' and tokens[index][1] in precedence and precedence[tokens[index][1]]>=minimum:
   op=tokens[index][1];index+=1;right=expr(precedence[op]+(0 if op=='^' else 1));left=('binary',op,left,right)
  return left
 ast=expr()
 if index!=len(tokens):raise ValueError('Unexpected trailing source tokens')
 return ast

def number(v):
 if isinstance(v,dict) and 'error' in v:raise ExcelError(v['error'])
 if v=='':return 0.0
 if isinstance(v,bool):return float(v)
 if isinstance(v,(int,float)) and math.isfinite(v):return v
 try:
  value=float(v)
  if not math.isfinite(value):raise ExcelError('Non-finite value')
  return value
 except (TypeError,ValueError):raise ExcelError('Non-numeric value')
def evaluate(ast,row,inputs):
 kind=ast[0]
 if kind=='literal':return ast[1]
 if kind=='unary':return number(evaluate(ast[2],row,inputs))*(-1 if ast[1]=='-' else 1)
 if kind=='binary':
  op=ast[1];a=evaluate(ast[2],row,inputs);b=evaluate(ast[3],row,inputs)
  if op in ('=','<>','<','>','<=','>='):
   # Excel compares text after numbers; text equality is case-insensitive.
   a=(1,a.casefold()) if isinstance(a,str) else (0,number(a));b=(1,b.casefold()) if isinstance(b,str) else (0,number(b))
   return {'=':lambda:a==b,'<>':lambda:a!=b,'<':lambda:a<b,'>':lambda:a>b,'<=':lambda:a<=b,'>=':lambda:a>=b}[op]()
  a,b=number(a),number(b)
  try:return {'+':lambda:a+b,'-':lambda:a-b,'*':lambda:a*b,'/':lambda:a/b,'^':lambda:a**b}[op]()
  except (ZeroDivisionError,OverflowError):raise ExcelError('Arithmetic error')
 _,func,args=ast
 if func=='IF':return evaluate(args[1] if bool(evaluate(args[0],row,inputs)) else args[2],row,inputs)
 if func=='IFERROR':
  try:
   value=evaluate(args[0],row,inputs)
   if isinstance(value,dict) and 'error' in value:raise ExcelError(value['error'])
   return value
  except ExcelError:return evaluate(args[1],row,inputs)
 values=[evaluate(a,row,inputs) for a in args]
 if func in ('PL','ROW'):
  source=inputs if func=='PL' else row;field=values[0]
  if field not in source or source[field] is None:raise MissingInput(field)
  value=source[field]
  if func=='PL' and (isinstance(value,str) and value!='' or isinstance(value,(int,float)) and not math.isfinite(value) or isinstance(value,dict) and set(value)!={'error'}):raise MissingInput(field+' invalid or untyped')
  if isinstance(value,dict) and 'error' in value:raise ExcelError(value['error'])
  return value
 if func=='OR':return any(bool(v) for v in values)
 if func=='AND':return all(bool(v) for v in values)
 nums=[number(v) for v in values]
 if func=='ROUNDUP':
  scale=10**int(nums[1]);return math.copysign(math.ceil(abs(nums[0])*scale)/scale,nums[0])
 if func=='MOD':
  if nums[1]==0:raise ExcelError('Division by zero')
  return nums[0]%nums[1]
 if func=='SUM':return sum(nums)
 if func=='MIN':return min(nums)
 if func=='MAX':return max(nums)
 if func=='ABS':return abs(nums[0])
 if func=='ROUND':return float(Decimal(str(nums[0])).quantize(Decimal(1).scaleb(-int(nums[1])),rounding=ROUND_HALF_UP))
 raise ValueError('Unsupported function')

def bindings(path,include_composites=False):
 path=Path(path)
 import hashlib
 if hashlib.sha256(path.read_bytes()).hexdigest()!=CAPTURE:raise ValueError('Captured formula authority changed')
 capture=json.loads(path.read_text());result={}
 for c in capture['columns']:
  if not (c['name'].endswith(' Internal Score') or c['name'].endswith('Raw Improvement Index') or include_composites and c['name'].endswith('Raw Composite Score')):continue
  result[c['name']]={'ast':compile_formula(c['formula']),'formulaSha256':hashlib.sha256(c['formula'].encode()).hexdigest(),'storedFormulaTypes':c['storedFormulaTypes'],'requiredPlayerInfoFields':sorted(set(LOOKUP.findall(c['formula'])))}
 if len(result)!=(52 if include_composites else 44):raise ValueError('Complete scalar coverage required')
 return result

def calculate(binding,name,role,inputs,row_values=None):
 if role not in ('Skater','Goaltender'):raise ValueError('Explicit scoring role required')
 row=dict(row_values or {})
 if row.get('Name',name)!=name or row.get('Award Scoring Type',role)!=role:raise ValueError('Conflicting row identity or role')
 row.update({'Name':name,'Award Scoring Type':role})
 try:
  value=evaluate(binding['ast'],row,inputs)
  return {'state':'SOURCE_BLANK' if value=='' else 'INTERNAL_VALUE_CANDIDATE','value':value,'currentCompositeScoresVerified':False}
 except MissingInput as error:return {'state':'INPUT_HOLD','missingField':str(error),'value':None,'currentCompositeScoresVerified':False}
 except ExcelError as error:return {'state':'SOURCE_CALCULATION_ERROR','error':str(error),'value':None,'currentCompositeScoresVerified':False}
