"""Read-only counterfactual for one captured min/max display component.

This measures why filtering final rows cannot establish composite parity. It is
not an accepted replacement model or a verified current award score.
"""
import json,sys,re,hashlib
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
RAW='Total Final Pts Internal Score'
DISPLAY='Total Final Pts Web Display Score'
def normalized(value,low,high):
 if low==high:return 75.0
 return float(Decimal(str(50+(value-low)/(high-low)*50)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP))
def impact(data,candidate,raw=RAW,display=DISPLAY):
 accepted={r['inputs']['Name'] for r in candidate['rows']};pi={r['Website Name']:r for r in data['playerInfoRows']};season=data['controls']['C1']
 if season!=candidate['season']:raise ValueError('Season mismatch')
 def usable(r):return r.get('Name') and isinstance(r.get(raw),(int,float)) and not isinstance(r.get(raw),bool)
 legacy=[r for r in data['awardRows'] if usable(r)];current=[r for r in legacy if r['Name'] in accepted and pi.get(r['Name'],{}).get('Recent Season')==season]
 if not legacy or not current:raise ValueError('Complete numeric cohorts required')
 lo,hi=min(r[raw] for r in legacy),max(r[raw] for r in legacy);clo,chi=min(r[raw] for r in current),max(r[raw] for r in current)
 rows=[{'name':r['Name'],'rawInternal':r[raw],'nativeDisplay':r[display],'reproducedLegacyDisplay':normalized(r[raw],lo,hi),'currentCohortCounterfactualDisplay':normalized(r[raw],clo,chi)} for r in current]
 mismatches=[r for r in rows if r['nativeDisplay']!=r['reproducedLegacyDisplay']]
 return {'state':'ONE_COMPONENT_COHORT_IMPACT_REVIEW_NOT_SCORE_ACCEPTANCE','component':display,'legacyCohortCount':len(legacy),'acceptedCurrentAvailableCount':len(current),'missingAcceptedMasterNames':sorted(accepted-set(pi)),'excludedLegacyNames':[r['Name'] for r in legacy if r not in current],'legacyBounds':[lo,hi],'currentAvailableBounds':[clo,chi],'legacyTranslationMismatchCount':len(mismatches),'changedCurrentComponentCount':sum(r['nativeDisplay']!=r['currentCohortCounterfactualDisplay'] for r in rows),'rows':rows,'limitation':'Counterfactual changes only this one normalization population. Missing player and upstream source/cohort inputs are not repaired. No final composite is verified.','currentScoresVerified':False,'publicationAuthorized':False}
def impact_all(data,candidate,schema):
 columns=next(t['columns'] for t in schema['tables'] if t['name']=='AwardScoring');formulas={c['name']:c.get('formula') or '' for c in columns}
 template=formulas[DISPLAY].replace(RAW,'RAW_FIELD');reviews=[];unsupported=[];unavailable=[]
 for field,formula in formulas.items():
  if not field.endswith(' Web Display Score'):continue
  m=re.search(r'AGGREGATE\(14,6,AwardScoring\[([^]]+)\]',formula)
  if not m or formula.replace(m[1],'RAW_FIELD')!=template:unsupported.append(field);continue
  try:reviews.append(impact(data,candidate,m[1],field))
  except ValueError as error:unavailable.append({'component':field,'reason':str(error)})
 return {'state':'MATCHED_MINMAX_COMPONENT_COHORT_IMPACT_NOT_FINAL_AWARD_ACCEPTANCE','matchedNormalizationCount':len(reviews),'unavailableComponents':unavailable,'unsupportedDisplayFormulas':unsupported,'legacyTranslationMismatchCount':sum(r['legacyTranslationMismatchCount'] for r in reviews),'componentsChanged':[{'component':r['component'],'currentPlayersChanged':r['changedCurrentComponentCount'],'legacyBounds':r['legacyBounds'],'currentAvailableBounds':r['currentAvailableBounds']} for r in reviews if r['changedCurrentComponentCount']],'components':reviews,'currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 if len(sys.argv)==5:
  native,candidate,schema,out=map(Path,sys.argv[1:])
  if hashlib.sha256(schema.read_bytes()).hexdigest()!='2e90a8cacad89ebfc714548ca5f24751bcfe9745f065112c91ede3a75552adae':raise ValueError('Schema changed')
  r=impact_all(json.loads(native.read_text()),json.loads(candidate.read_text()),json.loads(schema.read_text()))
 else:
  native,candidate,out=map(Path,sys.argv[1:]);r=impact(json.loads(native.read_text()),json.loads(candidate.read_text()))
 out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ('rows','components')}))
