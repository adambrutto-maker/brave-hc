'use strict';
// Inventory captured source expressions only; never a current scoring engine.
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const SOURCE='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
function argumentsAt(text,start){
 const out=[];let depth=0,brackets=0,quoted=false,begin=start;
 for(let i=start;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;continue;}
  if(quoted)continue;
  if(c==='[')brackets++;else if(c===']')brackets--;
  if(brackets<0)throw Error('Unbalanced structured reference');
  if(brackets)continue;
  if(c==='(')depth++;
  else if(c===')'){if(depth===0){out.push(text.slice(begin,i));return out;}depth--;}
  else if(c===','&&depth===0){out.push(text.slice(begin,i));begin=i+1;}
 }
 throw Error('Incomplete captured function');
}
function roleBranch(formula,role){
 const needle='IF(AwardScoring[[#This Row],[Award Scoring Type]]="'+role+'",';
 const branches=[];
 for(let index=formula.indexOf(needle);index>=0;index=formula.indexOf(needle,index+1)){
  const expression=argumentsAt(formula,index+3)[1];
  if(expression.includes('Web Display Score'))branches.push(expression);
 }
 if(branches.length!==1)throw Error('Missing or ambiguous weighted role branch: '+role);
 return branches[0];
}
function directWeights(branch,columns){
 const matches=[...branch.matchAll(/IFERROR\(AwardScoring\[\[#This Row\],\[([^\]]+)\]\],0\)\*([0-9.]+)/g)];
 const weights=matches.map(m=>({field:m[1],coefficient:Number(m[2])}));
 if(!weights.length||new Set(weights.map(w=>w.field)).size!==weights.length)throw Error('Missing or duplicate component');
 for(const w of weights)if(!columns.has(w.field)||!w.field.endsWith('Web Display Score')||!(w.coefficient>0&&w.coefficient<=1))throw Error('Unknown source component');
 return weights;
}
function inventory(capture){
 if(capture?.schema!=='brave-hc-awards-source-formula-capture/v1'||capture.sourceWorkbookSha256!==SOURCE
  ||capture.currentScoresVerified!==false||capture.publicationAuthorized!==false
  ||!Array.isArray(capture.columns)||capture.columns.length!==146)throw Error('Incomplete source capture');
 const cols=new Map(capture.columns.map(c=>[c.name,c]));
 if(cols.size!==146)throw Error('Duplicate source field');
 function field(name){
  const c=cols.get(name);
  if(!c||typeof c.formula!=='string'||!c.formula||c.firstStoredFormula?.formula!==c.formula)throw Error('Missing or inconsistent source formula: '+name);
  return {field:name,formula:c.formula,sha256:sha(c.formula),storedFormulaTypes:c.storedFormulaTypes};
 }
 const models={};
 for(const [id,prefix] of [['hart','Hart'],['conn-smythe','Conn Smythe'],['rookie','Rookie'],['lady-byng','Lady Byng'],['rolaids','Rolaids'],['dedication','Dedication']]){
  const raw=field(prefix+' Raw Composite Score'),roles={};
  for(const [key,role] of [['skater','Skater'],['goalie','Goaltender']]){
   const expression=roleBranch(raw.formula,role),weights=directWeights(expression,cols);
   const total=weights.reduce((a,w)=>a+w.coefficient,0);
   if(Math.abs(total-1)>1e-9)throw Error('Source branch coefficient total differs from 1: '+id+'/'+key);
   roles[key]={kind:'WEIGHTED_WEB_COMPONENTS',weights,coefficientTotal:total,expression,expressionSha256:sha(expression)};
  }
  models[id]={rawFormula:raw,roles};
 }
 const norris=field('Norris Raw Composite Score');
 const fixed=directWeights(norris.formula,cols);
 if(fixed.length!==9||!norris.formula.includes('IF(AwardScoring[[#This Row],[Position Group]]="Utility",0.075,0.1)')
  ||!norris.formula.includes('IF(AwardScoring[[#This Row],[Position Group]]="Utility",88,100)*0.02'))throw Error('Unrecognized conditional Norris expression');
 models.norris={rawFormula:norris,roles:{}};
 for(const [role,coefficient,bonus] of [['defence',0.1,100],['utility',0.075,88]]){
  const weights=[...fixed,{field:'Total Final Pts Web Display Score',coefficient}];
  models.norris.roles[role]={kind:'CONDITIONAL_WEIGHTED_COMPONENTS_AND_POSITION_CONSTANT',weights,
   positionConstant:{value:bonus,coefficient:0.02},
   coefficientTotal:weights.reduce((a,w)=>a+w.coefficient,0)+0.02,
   renormalize:false,roundDigits:1};
 }
 const improved=field('Most Improved Raw Composite Score');
 models.improved={rawFormula:improved,roles:{}};
 for(const [role,prefix] of [['skater','Total Skater'],['goalie','Total Goalie']]){
  const rawIndex=field(prefix+' Raw Improvement Index'),finalLink=field(prefix+' Most Improved Final Score');
  const at=rawIndex.formula.indexOf('ROUND(SUM(');
  if(at<0)throw Error('Missing source improvement SUM');
  const terms=argumentsAt(rawIndex.formula,at+'ROUND(SUM('.length);
  const components=terms.map(expression=>{
   const coefficient=Number(expression.match(/\*([0-9.]+)$/)?.[1]);
   const fields=[...new Set([...expression.matchAll(/PlayerInfo\[([^\]]+)\]/g)].map(m=>m[1]))];
   if(!coefficient||!fields.some(f=>f.startsWith('Current '))||!fields.some(f=>f.startsWith('Career Prior ')))throw Error('Unrecognized improvement term');
   return {coefficient,playerInfoFields:fields,expression,expressionSha256:sha(expression)};
  });
  if(components.length!==7||Math.abs(components.reduce((a,t)=>a+t.coefficient,0)-1)>1e-9)throw Error('Incomplete improvement components');
  models.improved.roles[role]={kind:'SIGNED_RELATIVE_RATE_CHANGES_NOT_WEB_SCORES',components,rawIndex,finalLink,roundDigits:4};
 }
 const scoringTitles={};
 for(const [id,prefix] of [['art-ross','Art Ross'],['rocket','Rocket Richard']])
  scoringTitles[id]={kind:'REGULAR_SEASON_COUNT_NOT_NORMALIZED_OVR',eligibility:field(prefix+' Eligible'),rankKey:field(prefix+' Rank Key'),count:field(prefix+' Award Score')};
 function dependencies(roots){
  const visited=new Set(),external=new Map();
  function scan(name){
   if(visited.has(name))return;
   visited.add(name);const formula=field(name).formula;
   for(const match of formula.matchAll(/AwardScoring\[\[#This Row\],\[([^\]]+)\]\]|AwardScoring\[([^\[\]]+)\]/g))scan(match[1]||match[2]);
   for(const table of ['PlayerInfo','RosterStatusBySeason','SeasonInfo']){
    const fields=[...formula.matchAll(new RegExp(table+'\\[([^\\[\\]]+)\\]','g'))].map(m=>m[1]);
    if(!external.has(table))external.set(table,new Set());
    for(const value of fields)external.get(table).add(value);
   }
  }
  roots.forEach(scan);
  return {awardScoringFields:[...visited].sort(),externalFields:Object.fromEntries([...external].map(([table,fields])=>[table,[...fields].sort()])),externalValuesVerifiedByThisInventory:false};
 }
 const awardFields={hart:['Hart','Hart'], 'conn-smythe':['Conn Smythe','Conn Smythe'],
  norris:['Norris','Norris'],rookie:['Rookie','Rookie of the Year'],
  'lady-byng':['Lady Byng','Lady Byng'],rolaids:['Rolaids','Rolaids Relief Man'],
  dedication:['Dedication','Andrew Cristillo Dedication'],improved:['Most Improved','Most Improved Player']};
 for(const [id,model] of Object.entries(models)){
  const [eligible,final]=awardFields[id];
  model.eligibilityFormula=field(eligible+' Eligible');model.finalFormula=field(final+' Award Score');
  model.rankKeyFormula=field((id==='rookie'?'Rookie':final)+' Rank Key');
  model.dependencies=dependencies([model.rawFormula.field,model.eligibilityFormula.field,model.finalFormula.field,model.rankKeyFormula.field]);
 }
 for(const model of Object.values(scoringTitles))model.dependencies=dependencies([model.eligibility.field,model.rankKey.field,model.count.field]);
 return {schema:'brave-hc-awards-captured-composition-inventory/v1',sourceWorkbookSha256:SOURCE,
  status:'CAPTURED_SOURCE_COMPOSITION_ONLY',models,scoringTitles,
  hallOfFame:'SEPARATE_BALLOT_NOT_AN_AWARDSCORING_FORMULA_MODEL',
  sourceAuthenticityEstablishedByThisScript:false,
  playerInfoInputsRecalculated:false,currentEligibilityVerified:false,currentScoresVerified:false,publicationAuthorized:false};
}
if(require.main===module){
 const capture=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/261020_Awards_Original_Formula_Capture.json'),'utf8'));
 process.stdout.write(JSON.stringify(inventory(capture),null,2)+'\n');
}
module.exports={inventory,argumentsAt,roleBranch};

