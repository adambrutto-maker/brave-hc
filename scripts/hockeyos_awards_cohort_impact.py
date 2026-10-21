"""Read-only counterfactual for one captured min/max display component.

This measures why filtering final rows cannot establish composite parity. It is
not an accepted replacement model or a verified current award score.
"""
import json,sys
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
RAW='Total Final Pts Internal Score'
DISPLAY='Total Final Pts Web Display Score'
def normalized(value,low,high):
 if low==high:return 75.0
 return float(Decimal(str(50+(value-low)/(high-low)*50)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP))
def impact(data,candidate):
 accepted={r['inputs']['Name'] for r in candidate['rows']};pi={r['Website Name']:r for r in data['playerInfoRows']};season=data['controls']['C1']
 if season!=candidate['season']:raise ValueError('Season mismatch')
 def usable(r):return r.get('Name') and isinstance(r.get(RAW),(int,float)) and not isinstance(r.get(RAW),bool)
 legacy=[r for r in data['awardRows'] if usable(r)];current=[r for r in legacy if r['Name'] in accepted and pi.get(r['Name'],{}).get('Recent Season')==season]
 if not legacy or not current:raise ValueError('Complete numeric cohorts required')
 lo,hi=min(r[RAW] for r in legacy),max(r[RAW] for r in legacy);clo,chi=min(r[RAW] for r in current),max(r[RAW] for r in current)
 rows=[{'name':r['Name'],'rawInternal':r[RAW],'nativeDisplay':r[DISPLAY],'reproducedLegacyDisplay':normalized(r[RAW],lo,hi),'currentCohortCounterfactualDisplay':normalized(r[RAW],clo,chi)} for r in current]
 mismatches=[r for r in rows if r['nativeDisplay']!=r['reproducedLegacyDisplay']]
 return {'state':'ONE_COMPONENT_COHORT_IMPACT_REVIEW_NOT_SCORE_ACCEPTANCE','component':DISPLAY,'legacyCohortCount':len(legacy),'acceptedCurrentAvailableCount':len(current),'missingAcceptedMasterNames':sorted(accepted-set(pi)),'excludedLegacyNames':[r['Name'] for r in legacy if r not in current],'legacyBounds':[lo,hi],'currentAvailableBounds':[clo,chi],'legacyTranslationMismatchCount':len(mismatches),'changedCurrentComponentCount':sum(r['nativeDisplay']!=r['currentCohortCounterfactualDisplay'] for r in rows),'rows':rows,'limitation':'Counterfactual changes only this one normalization population. Missing player and upstream source/cohort inputs are not repaired. No final composite is verified.','currentScoresVerified':False,'publicationAuthorized':False}
if __name__=='__main__':
 native,candidate,out=map(Path,sys.argv[1:]);r=impact(json.loads(native.read_text()),json.loads(candidate.read_text()));out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k!='rows'}))
