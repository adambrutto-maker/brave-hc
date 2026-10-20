'use strict';

/**
 * HISTORICAL CACHE PARITY ONLY.
 * Replay the exact cached Rolaids weighted component sum from previously
 * captured AwardScoring evidence. No workbook, HTO, publishing or file writes.
 *
 * Important: verifies visible component weights vs saved RAW COMPOSITE.
 * Does NOT derive the workbook's final public 50–100 eligible OVR, eligibility,
 * full-population normalization, historic seasons or this season's results.
 */
const fs=require('node:fs');
const path=require('node:path');

const TOL=1e-6;
function failure(message){throw new Error('CACHED_ROLAIDS_PARITY_HOLD: '+message);}
function almost(x,y,eps=TOL){return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=eps;}
function audit(evidence,reference){
 if(evidence?.schema!=='brave-hc-awards-component-evidence/v1'
    ||evidence?.status!=='HISTORICAL_NOT_CURRENT_AWARD_RACE'
    ||reference?.status!=='HISTORICAL_NOT_CURRENT_AWARD_RACE'
    ||!(/^[a-f0-9]{64}$/i).test(evidence.sourceWorkbookHash||'')
    ||reference.sourceWorkbookHash!==evidence.sourceWorkbookHash)
  failure('Evidence source, cached state or workbook hash not aligned');
 const weights=evidence.roleWeights,formula=evidence.componentFormulas;
 const scores=evidence.races?.rolaids;
 const candidates=reference.races?.rolaids;
 if(!weights||!formula||!scores||!Array.isArray(candidates)||!candidates.length)
  failure('Historical role weights, component formulas or cached players missing');
 if(Object.keys(scores).length!==candidates.length)
  failure('Cached scorecard and component player sets differ');
 const roleMeta={
  Skater:{sourceKey:'skater',expectedComponents:11},
  Goaltender:{sourceKey:'goalie',expectedComponents:10}
 };
 const players=[];
 const names=new Set();
 for(const [i,card] of candidates.entries()){
  if(typeof card?.name!=='string'||names.has(card.name)||!Number.isInteger(card.rank)
    ||card.rank!==i+1||!Number.isFinite(card.score))
   failure('Historical scorecard identity, rank or final score invalid');
  names.add(card.name);
  const entry=scores[card.name];
  const meta=roleMeta[entry?.sourceRole];
  if(!meta||entry.total!==meta.expectedComponents
    ||!Array.isArray(entry.components)||entry.components.length!==meta.expectedComponents)
   failure('Historical role or component length mismatch for '+card.name);
  const scheme=weights[meta.sourceKey];
  if(!Array.isArray(scheme)||scheme.length!==meta.expectedComponents)
   failure('Historical source role-weight contract absent');
  const expected=new Map();
  for(const {field,weight} of scheme){
   if(typeof field!=='string'||expected.has(field)
      ||!Number.isFinite(weight)||weight<=0||weight>1)
    failure('Invalid source weight contract');
   expected.set(field,weight*100);
  }
  if(!almost([...expected.values()].reduce((x,y)=>x+y,0),100))
   failure('Weights not exactly normalized for role '+meta.sourceKey);
  let total=0;
  const seen=new Set();
  for(const item of entry.components){
   const {sourceField,weightPct,webComponentScore,unroundedWeightedContribution}=item;
   if(!expected.has(sourceField)||seen.has(sourceField)
      ||!almost(weightPct,expected.get(sourceField),0.001)
      ||!Number.isFinite(webComponentScore)||webComponentScore<0||webComponentScore>100
      ||!Number.isFinite(unroundedWeightedContribution))
    failure('Field/weight/component mismatch for '+card.name);
   if(!formula[sourceField]?.internalFormula||!formula[sourceField]?.displayFormula)
    failure('Missing cached source formula pair for '+sourceField);
   seen.add(sourceField);
   const contribution=webComponentScore*weightPct/100;
   if(!almost(contribution,unroundedWeightedContribution,0.00001))
    failure('Cached weighted contribution not reproducible: '+card.name);
   total+=contribution;
  }
  if(seen.size!==expected.size
     ||!almost(total,entry.formulaWeightedSumFromCachedComponents,0.00001))
   failure('Cached player weighted sum mismatch: '+card.name);
  const rounded=Math.round((total+Number.EPSILON)*10)/10;
  if(!almost(rounded,entry.cachedRawComposite,0.00001))
   failure('Cached raw composite mismatch: '+card.name);
  if(card.score!==entry.cachedFinalPublicScore)
   failure('Historical public scorecard differs from cached published number: '+card.name);
  players.push({
   name:card.name,role:entry.sourceRole,
   weightComponents:seen.size,
   recalculatedWeightedComposite:Number(total.toFixed(3)),
   roundedRawComposite:rounded,
   savedRawComposite:entry.cachedRawComposite,
   historicalPublishedOVRObservedOnly:card.score,
   finalOVRNormalizationReproduced:false
  });
 }
 return {
  schema:'hockeyos-awards-cached-raw-parity/v1',
  status:'HISTORICAL_ROLAIDS_RAW_COMPOSITE_PARITY_PASS_FINAL_OVR_HELD',
  sourceWorkbookHash:evidence.sourceWorkbookHash,
  historicalPlayerExamples:players.length,
  componentsChecked:players.reduce((n,x)=>n+x.weightComponents,0),
  players,
  rawCompositeReproduced:true,
  completeHistoricalEligiblePopulationRecalculated:false,
  finalOVRNormalizationReproduced:false,
  current2026ModelScoresVerified:false,
  originalWorkbookOpened:false,originalWorkbookModified:false,
  websitePublished:false,releaseAuthorized:false
 };
}
if(require.main===module){
 const folder=path.resolve(__dirname,'../widgets');
 const evidence=JSON.parse(fs.readFileSync(path.join(folder,'awards-component-evidence.json'),'utf8'));
 const reference=JSON.parse(fs.readFileSync(path.join(folder,'awards-workbook-reference.json'),'utf8'));
 process.stdout.write(JSON.stringify(audit(evidence,reference),null,2)+'\n');
}
module.exports={audit};
