'use strict';

/**
 * Read-only INVENTORY of previously captured historical Rolaids formula evidence.
 * This does NOT open the original Master Workbook or evaluate any Excel formula.
 * It does NOT validate this season's score, eligibility, publisher, or official GP.
 */
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

function sha(s){return crypto.createHash('sha256').update(s).digest('hex');}
function playerInfoRefs(s){
 return [...new Set([...s.matchAll(/PlayerInfo\[([^\]]+)\]/g)].map(m=>m[1]))].sort();
}
function sourceType(field){
 if(field==='Website Name')return 'IDENTITY_JOIN';
 if(field.startsWith('Career Prior '))return 'HISTORICAL_PLAYER_BASELINE';
 if(field.startsWith('All-Time '))return 'HISTORICAL_TEAM_COMPARATOR';
 if(field.startsWith('Current '))return 'CURRENT_DERIVED_OR_COMPARATOR';
 return 'OTHER_DEPENDENCY';
}
function audit(original){
 if(!original||original.schema!=='brave-hc-awards-component-evidence/v1'
    ||original.status!=='HISTORICAL_NOT_CURRENT_AWARD_RACE'
    ||!(/^[a-f0-9]{64}$/i).test(original.sourceWorkbookHash||''))
  throw Error('Historical evidence schema, status or source workbook hash not verified');
 const sets=original.roleWeights,formulas=original.componentFormulas;
 if(!sets||typeof sets!=='object'||!formulas||typeof formulas!=='object')
  throw Error('Historical formula or role weights missing');
 const roles={},used=new Set();
 for(const [role,count] of [['skater',11],['goalie',10]]){
  const weights=sets[role];
  if(!Array.isArray(weights)||weights.length!==count)
   throw Error(role+': wrong original component count');
  const names=new Set();
  const components=[];
  for(const item of weights){
   if(typeof item.field!=='string'||names.has(item.field)||
      typeof item.weight!=='number'||!Number.isFinite(item.weight)||
      item.weight<=0||item.weight>1)throw Error(role+': bad or duplicate source component');
   names.add(item.field);used.add(item.field);
   const pair=formulas[item.field];
   if(!pair||typeof pair.internalFormula!=='string'||!pair.internalFormula
       ||typeof pair.displayFormula!=='string'||!pair.displayFormula)
    throw Error(role+': missing original formula evidence for '+item.field);
   const refs=playerInfoRefs(pair.internalFormula+'\n'+pair.displayFormula);
   if(!refs.length)throw Error(role+': no PlayerInfo lineage for '+item.field);
   const lineages=[...new Set(refs.map(sourceType))].sort();
   components.push({
    sourceField:item.field,originalWeightPercent:item.weight*100,
    internalFormulaSha256:sha(pair.internalFormula),
    displayFormulaSha256:sha(pair.displayFormula),
    playerInfoFields:refs,sourceLayers:lineages,
    historicalEvidenceAvailable:true,
    currentFormulaRecalculationVerified:false,
    currentNormalizedComponentVerified:false
   });
  }
  if(Math.abs(weights.reduce((sum,x)=>sum+x.weight,0)-1)>1e-8)
   throw Error(role+': weights do not total 100 percent');
  roles[role]={componentCount:count,weightTotalPercent:100,components};
 }
 const all=Object.entries(formulas);
 if(all.length!==used.size||all.some(([field])=>!used.has(field)))
  throw Error('Unmapped or missing original formula fields');
 const references=[...new Set(all.flatMap(([,v])=>
   playerInfoRefs(v.internalFormula+'\n'+v.displayFormula)))].sort();
 const layers={};
 for(const item of references){
  const kind=sourceType(item);layers[kind]=(layers[kind]||0)+1;
 }
 return {
  schema:'brave-hc-awards-historical-formula-dependency-review/v1',
  status:'HISTORICAL_ROLAIDS_FORMULA_LINEAGE_MAPPED_CURRENT_OVR_HELD',
  authority:'previously-captured cached Master Workbook AwardScoring formulas',
  sourceWorkbookHash:original.sourceWorkbookHash,
  historicalSnapshotSeason:original.workbookAsOf||null,
  award:'rolaids',
  uniqueComponentFormulas:all.length,
  roleWeights:roles,
  uniquePlayerInfoFields:references.length,
  dependencyCategoryCounts:layers,
  allPlayerInfoDependencies:references.map(x=>({name:x,category:sourceType(x)})),
  currentHTOInputsReplayed:false,
  fullWorkbookFormulaParity:false,
  currentEligibilityVerified:false,
  currentOverallRatingsVerified:false,
  publicationAuthorized:false,
  originalWorkbookAccessed:false,
  originalWorkbookModified:false
 };
}
if(require.main===module){
 const sourcePath=path.join(__dirname,'../widgets/awards-component-evidence.json');
 const result=audit(JSON.parse(fs.readFileSync(sourcePath,'utf8')));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
module.exports={audit,playerInfoRefs,sourceType};
