"""Read-only evidence for current population selectors and normalization cohorts."""
import hashlib,json,re,sys
from pathlib import Path
from hockeyos_awards_metadata_dependency_review import decoded,refs

def audit(schema):
 tables={t['name']:{decoded(c['name']):c for c in t['columns']} for t in schema['tables']}
 categories={};by_node={};unsupported=[]
 for prefix in ['Hart','Conn Smythe','Norris','Art Ross','Rocket Richard','Rookie','Lady Byng','Most Improved','Rolaids','Dedication']:
  pending=[('AwardScoring',f) for f in tables['AwardScoring'] if f.startswith(prefix) and any(t in f for t in ['Eligible','Score','Rank Key'])];seen=set()
  if not pending:raise ValueError('Missing award roots: '+prefix)
  while pending:
   node=pending.pop()
   if node in seen:continue
   seen.add(node);table,field=node;formula=decoded(tables[table][field].get('formula') or '')
   by_node.setdefault(node,set()).add(prefix)
   if formula:
    try:pending.extend(refs(formula,table,tables))
    except ValueError as e:unsupported.append({'table':table,'field':field,'error':str(e)})
  categories[prefix]=len(seen)
 evidence=[]
 for (table,field),models in sorted(by_node.items()):
  formula=decoded(tables[table][field].get('formula') or '')
  # Whole-column inputs to aggregates identify candidates for semantic review.
  if not formula or not re.search(r'\b(?:SUMPRODUCT|SUMIFS|AVERAGEIFS|COUNTIFS|AGGREGATE|MAX|MIN|RANK)\s*\(',formula,re.I):continue
  if not any(x in formula for x in ['PlayerInfo[','AwardScoring[']):continue
  evidence.append({'table':table,'field':field,'categories':sorted(models),'formula':formula,'referencesRecentSeasonColumn':'PlayerInfo[Recent Season]' in formula or 'AwardScoring[Recent Season]' in formula,'referencesSelectedSeasonCell':bool(re.search(r"(?:'Master Schedule'|MasterSchedule)!\$?C\$?1",formula,re.I)),'requiresSemanticReview':True})
 return {'state':'COHORT_FORMULA_EVIDENCE_NOT_CURRENT_SCORE_ACCEPTANCE','categoryNodeCoverage':categories,'selectorFormulas':[{ 'table':t,'field':f,'formula':decoded(tables[t][f].get('formula') or '')} for t,f in [('PlayerInfoHelpers','Current Season'),('PlayerInfo','Recent Season'),('PlayerInfo','Active Eligible'),('AwardScoring','Recent Season')]],'aggregateFormulaCount':len(evidence),'aggregateFormulas':evidence,'unsupportedReferences':unsupported,'limitations':['Presence of a season token does not prove a correct population predicate.','A per-player Recent Season is distinct from the selected current season.','Ordinary-cell and named-range transitive precedents are outside this structured traversal.'],'currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 source,out=map(Path,sys.argv[1:]);expected='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae'
 if hashlib.sha256(source.read_bytes()).hexdigest()!=expected:raise ValueError('Captured schema changed')
 result=audit(json.loads(source.read_text(encoding='utf-8-sig')));result['sourceSchemaSha256']=expected
 out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='aggregateFormulas'}))
