'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const widgets=path.resolve(__dirname,'../widgets');
const original=fs.readFileSync(path.join(widgets,'awards-races-v3.js'),'utf8');
const injected=original.replace(/\bboot\(\);\s*\}\)\(\);\s*$/,
 'globalThis.__awardsQA={state,card,currentComponents,previousSnapshot,movement,isVerifiedWeeklyRace};})();');
assert.notEqual(injected,original,'Isolated test bootstrap must match entrypoint');
const elt=(tag='div')=>({
 tag,children:[],className:'',textContent:'',
 append(...children){this.children.push(...children)},
 setAttribute(){},addEventListener(){},style:{setProperty(){}},
 querySelector(selector){
  if(selector==='.explain') return visit(this,n=>n.className.split(' ').includes('explain'))[0];
  return null;
 }
});
function visit(root,predicate){
 return (predicate(root)?[root]:[]).concat(...(root.children||[])
   .filter(n=>n&&typeof n==='object').flatMap(n=>visit(n,predicate)));
}
const sandbox={
 document:{getElementById:()=>elt(),createElement:tag=>elt(tag),createTextNode:s=>({tag:'text',textContent:s})},
 location:{search:''},URLSearchParams,
};
vm.runInNewContext(injected,sandbox,{filename:'awards-races-v3.js'});
const api=sandbox.__awardsQA;
const awards=JSON.parse(fs.readFileSync(path.join(widgets,'awards-races.json'),'utf8'));
const ref=JSON.parse(fs.readFileSync(path.join(widgets,'awards-workbook-reference.json'),'utf8'));
const evidence=JSON.parse(fs.readFileSync(path.join(widgets,'awards-component-evidence.json'),'utf8'));
const history=JSON.parse(fs.readFileSync(path.join(widgets,'awards-weekly-history.json'),'utf8'));
const participants=JSON.parse(fs.readFileSync(path.join(widgets,'awards-participants.json'),'utf8'));
api.state.source=awards;
api.state.reference=ref;
api.state.explain=evidence;
api.state.weeklyHistory=history;
api.state.participation=participants;
const hash=awards.sourceWorkbookHash;
const sourceRace={asOf:'2026-10-19',modelGameCount:4};
const playerName='QA Player Alpha (FICTIONAL)';
function example(){
 return {name:playerName,gamesPlayed:3,eligible:true,rankKey:4,scoreKind:'OFFICIAL_WORKBOOK_FINAL',modelScore:91,
  verifiedComponentEvidence:{
    status:'VERIFIED_CURRENT_WORKBOOK_COMPONENTS',season:'W2026/27',
    awardId:'rolaids',playerName,sourceWorkbookHash:hash,
    asOf:sourceRace.asOf,modelGameCount:4,components:[
     {abbreviation:'PTS',sourceField:'Total Final Pts Web Display Score',webComponentScore:90,weightPct:70,unroundedWeightedContribution:63},
     {abbreviation:'CONS',sourceField:'Total Skater Production Consistency Web Display Score',webComponentScore:80,weightPct:30,unroundedWeightedContribution:24}
    ]
  }
 };
}
function snapshot(){
 return {status:'VERIFIED_PUBLISHED_WEEKLY_RACE',season:'W2026/27',teamGP:3,
  publishedAsOf:'2026-10-12',sourceWorkbookHash:'b'.repeat(64),
  races:{rolaids:[{name:playerName,rank:4,overallScore:86.5,scoreKind:'OFFICIAL_WORKBOOK_FINAL'}]}};
}
api.state.award='rolaids';
test('current live publication remains held without verified four-game workbook scores',()=>{
 assert.equal(awards.sourceWorkbookRecordedGP,1);
 assert.equal(awards.seasonRaceMode.currentModelScoresVerified,false);
 assert.equal(api.isVerifiedWeeklyRace(awards,awards.races.rolaids,participants),false);
 assert.equal(history.snapshots.length,0);
});
test('same-week weighted attribute evidence passes and mismatches fail closed',()=>{
 assert.equal(api.currentComponents(example(),sourceRace).length,2);
 for(const mutate of [
  x=>x.verifiedComponentEvidence.sourceWorkbookHash='b'.repeat(64),
  x=>x.verifiedComponentEvidence.modelGameCount=3,
  x=>x.verifiedComponentEvidence.components[0].weightPct=80,
  x=>x.verifiedComponentEvidence.components[0].unroundedWeightedContribution=50,
  x=>x.verifiedComponentEvidence.asOf='2026-10-18',
  x=>x.verifiedComponentEvidence.playerName='Someone else',
  x=>x.scoreKind='AWARD_MODEL_PENDING'
 ]){
  const x=structuredClone(example());mutate(x);
  assert.equal(api.currentComponents(x,sourceRace),null);
 }
});
test('known previous week yields independent OVR and ranking deltas',()=>{
 api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
  status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',snapshots:[snapshot()]};
 const root=elt();
 assert.equal(api.previousSnapshot(sourceRace).publishedAsOf,'2026-10-12');
 api.movement(root,example(),0,sourceRace);
 const found=visit(root,n=>typeof n.textContent==='string').map(n=>n.textContent);
 assert.ok(found.includes('+4.5 OVR'));
 assert.ok(found.includes('▲ 3 ranks'));
 assert.ok(found.includes('vs 2026-10-12'));
});
test('no baseline, future, invalid hash and duplicate players never generate an invented delta',()=>{
 const cases=[
  [],
  [{...snapshot(),publishedAsOf:'2026-10-20'}],
  [{...snapshot(),sourceWorkbookHash:'no-verified-hash'}],
  [{...snapshot(),races:{rolaids:[...snapshot().races.rolaids,...snapshot().races.rolaids]}}]
 ];
 for(const snapshots of cases){
  api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
    status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',snapshots};
  assert.equal(api.previousSnapshot(sourceRace),null);
 }
});
test('valid dated synthetic workbook race can pass the previously broken date gate',()=>{
 const data=structuredClone(awards),p=structuredClone(participants),row=example();
 p.players.push({name:playerName,gp:3,position:'Skater',role:'CU'});
 data.seasonRaceMode.currentModelScoresVerified=true;
 data.sourceWorkbookRecordedGP=data.currentTeamGP;
 data.races.rolaids={status:'VERIFIED_CURRENT_WEEK',asOf:'2026-10-19',
  modelGameCount:4,entries:[row]};
 assert.equal(api.isVerifiedWeeklyRace(data,data.races.rolaids,p),true);
 data.races.rolaids.asOf='not-a-date';
 assert.equal(api.isVerifiedWeeklyRace(data,data.races.rolaids,p),false);
});
test('all eleven awards render saved examples without pretending scoring-title counts are OVR',()=>{
 assert.equal(awards.awards.length,11);
 let cards=0;
 for(const award of awards.awards){
  api.state.award=award.id;
  for(const [i,row] of (ref.races[award.id]||[]).slice(0,5).entries()){
   const tree=api.card(row,i,true);
   const badges=visit(tree,n=>n.className.split(' ').includes('orb'));
   assert.equal(badges.length,1,award.id);
   const label=badges[0].children.map(n=>n.textContent).find(s=>s==='OVR'||s==='STAT');
   assert.equal(label,['art-ross','rocket'].includes(award.id)?'STAT':'OVR',award.id);
   cards++;
  }
 }
 assert.ok(cards>=30);
});
test('verified current component tiles render, but pending players never get invented ratings',()=>{
 api.state.award='rolaids';
 const baseline=api.state.source;
 api.state.source={...awards,races:{...awards.races,rolaids:sourceRace}};
 try {
  const tree=api.card(example(),0,false);
  assert.equal(visit(tree,n=>n.className.split(' ').includes('ea-stat')).length,2);
  const pending=api.card({name:'Unscored QA Player',gamesPlayed:2,eligible:false,scoreKind:'AWARD_MODEL_PENDING',modelScore:null},1,false);
  assert.equal(visit(pending,n=>n.className.split(' ').includes('ea-stat')).length,0);
 } finally {api.state.source=baseline;}
});
test('historical eleven-component Rolaids card shows six prominent tiles and five more',()=>{
 api.state.award='rolaids';
 const row=ref.races.rolaids[0];
 const tree=api.card(row,0,true);
 const chips=visit(tree,n=>n.className.split(' ').includes('ea-stat'));
 assert.equal(chips.length,11);
 const more=visit(tree,n=>n.className.split(' ').includes('more-attributes'));
 assert.equal(more.length,1);
 assert.match(more[0].children[0].textContent,/Show 5 more/);
});
