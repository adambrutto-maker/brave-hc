'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const widgets=path.resolve(__dirname,'../widgets');
const original=fs.readFileSync(path.join(widgets,'awards-races-v3.js'),'utf8');
const injected=original.replace(/\bboot\(\);\s*\}\)\(\);\s*$/,
 'globalThis.__awardsQA={state,card,currentComponents,previousSnapshot,movement,isVerifiedWeeklyRace,verifiedWorkbookRookieYearWatch,verifiedHTOStatWatch,sourceReadinessForAward,renderHeldSourceReadiness,renderRaceActivity,renderPlayerEvidence};})();');
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
const elementsById=new Map();
const sandbox={
 document:{
  getElementById(id){if(!elementsById.has(id))elementsById.set(id,elt());return elementsById.get(id);},
  createElement:tag=>elt(tag),createTextNode:s=>({tag:'text',textContent:s})
 },
 location:{search:''},URLSearchParams,
};
vm.runInNewContext(injected,sandbox,{filename:'awards-races-v3.js'});
const api=sandbox.__awardsQA;
const awards=JSON.parse(fs.readFileSync(path.join(widgets,'awards-races.json'),'utf8'));
const ref=JSON.parse(fs.readFileSync(path.join(widgets,'awards-workbook-reference.json'),'utf8'));
const evidence=JSON.parse(fs.readFileSync(path.join(widgets,'awards-component-evidence.json'),'utf8'));
const contracts=JSON.parse(fs.readFileSync(path.join(widgets,'awards-attribute-contracts.json'),'utf8'));
const history=JSON.parse(fs.readFileSync(path.join(widgets,'awards-weekly-history.json'),'utf8'));
const participants=JSON.parse(fs.readFileSync(path.join(widgets,'awards-participants.json'),'utf8'));
api.state.source=awards;
api.state.reference=ref;
api.state.explain=evidence;
api.state.attributeContracts=contracts;
api.state.weeklyHistory=history;
api.state.participation=participants;
const readiness=JSON.parse(fs.readFileSync(path.join(widgets,'awards-source-readiness.json'),'utf8'));
api.state.readiness=readiness;
const hash=awards.sourceWorkbookHash;
const heldOperationalReceipt=JSON.parse(fs.readFileSync(path.join(widgets,'awards-operational-publication.json'),'utf8'));
function syntheticOperationalReceipt(){
 const r=structuredClone(heldOperationalReceipt);
 Object.assign(r,{
  status:'FOUNDER_APPROVED_QA_ACCEPTED_PUBLISHED',
  operationalWorkbookSha256:'b'.repeat(64),
  sourceFormulaMapFingerprintSha256:'c'.repeat(64),
  operationalFormulaMapFingerprintSha256:'c'.repeat(64),
  officialHTOReadbackAt:awards.sourceHTOReadback,
  modelGameCount:awards.currentTeamGP,
  scoringAsOf:awards.latestGameDate>'2026-10-19'?awards.latestGameDate:'2026-10-19',
  sourceModelVerified:true,independentlyApproved:true,publicationAuthorized:true,
  publisherReleaseReceiptSha256:'d'.repeat(64),
  awardFormulaParities:awards.awards.map(x=>({awardId:x.id,
   state:'EXACT_ORIGINAL_FORMULA_ELIGIBILITY_RANK_SCORE_PARITY'}))
 });
 return r;
}
// Synthetic-only proof for unit test "verified" branches. The actual on-disk
// publication receipt remains HELD; no release is inferred from this fixture.
api.state.operationalEvidence=syntheticOperationalReceipt();
const sourceRace={status:'VERIFIED_CURRENT_WEEK',asOf:awards.latestGameDate>'2026-10-19'?awards.latestGameDate:'2026-10-19',modelGameCount:awards.currentTeamGP};
const playerName='QA Player Alpha (FICTIONAL)';
function example(goalie=false){
 const role=goalie?"goalie":"skater";
 const sourcePlayer=goalie?"Svec, Matt (G)":"Rajasooriar, Krishnan";
 const sourceFields=new Map(evidence.races.rolaids[sourcePlayer].components.map(c=>[c.sourceField,c.abbreviation]));
 const components=evidence.roleWeights[role].map(c=>{
  const weightPct=c.weight*100,webComponentScore=90;
  return {abbreviation:sourceFields.get(c.field),sourceField:c.field,
   webComponentScore,weightPct,unroundedWeightedContribution:webComponentScore*weightPct/100};
 });
 return {name:playerName,gamesPlayed:3,eligible:true,rankKey:4,scoreKind:'OFFICIAL_WORKBOOK_FINAL',modelScore:91,
  verifiedComponentEvidence:{
   status:'VERIFIED_CURRENT_WORKBOOK_COMPONENTS',season:'W2026/27',
   awardId:'rolaids',sourceRole:goalie?'Goaltender':'Skater',
   playerName,sourceWorkbookHash:hash,asOf:sourceRace.asOf,
   modelGameCount:sourceRace.modelGameCount,components
  }
 };
}
function withVerifiedRolaids(fn,goalie=false){
 const beforeSource=api.state.source,beforeParticipants=api.state.participation,beforeAward=api.state.award;
 api.state.source={...awards,seasonRaceMode:{...awards.seasonRaceMode,currentModelScoresVerified:true},
  races:{...awards.races,rolaids:sourceRace}};
 api.state.participation={...participants,players:[...participants.players,{
  name:playerName,gp:3,position:goalie?'Goalie':'Skater',role:goalie?'G':'CU'}]};
 api.state.award='rolaids';
 try{return fn();}
 finally {api.state.source=beforeSource;api.state.participation=beforeParticipants;api.state.award=beforeAward;}
}

function snapshot(){
 return {status:'VERIFIED_PUBLISHED_WEEKLY_RACE',season:'W2026/27',teamGP:3,
  publishedAsOf:'2026-10-12',sourceWorkbookHash:hash,
  races:{rolaids:[{name:playerName,rank:4,overallScore:86.5,scoreKind:'OFFICIAL_WORKBOOK_FINAL'}]}};
}
api.state.award='rolaids';
test('source freshness controls real award publication as future games are recorded',()=>{
 assert.equal(participants.officialTeamGames,awards.currentTeamGP);
 assert.equal(history.schema,'brave-hc-awards-weekly-history/v1');
 const isFresh=awards.sourceWorkbookRecordedGP===awards.currentTeamGP
   &&awards.seasonRaceMode.currentModelScoresVerified===true;
 for(const race of Object.values(awards.races)){
   const valid=api.isVerifiedWeeklyRace(awards,race,participants);
   if(!isFresh)assert.equal(valid,false,'stale game count or model authority must hold awards');
   if(valid)assert.equal(race.modelGameCount,awards.currentTeamGP);
 }
});
test('complete same-week original Rolaids attributes pass and altered inputs hold',()=>withVerifiedRolaids(()=>{
 assert.equal(api.currentComponents(example(),sourceRace).length,11);
 for(const mutate of [
  x=>x.verifiedComponentEvidence.sourceWorkbookHash='b'.repeat(64),
  x=>x.verifiedComponentEvidence.modelGameCount=sourceRace.modelGameCount+1,
  x=>x.verifiedComponentEvidence.components[0].weightPct=80,
  x=>x.verifiedComponentEvidence.components[0].unroundedWeightedContribution=50,
  x=>x.verifiedComponentEvidence.asOf='2026-10-18',
  x=>x.verifiedComponentEvidence.playerName='Someone else',
  x=>x.verifiedComponentEvidence.components.pop(),
  x=>x.verifiedComponentEvidence.components[1].sourceField='Fictional Scoring Metric',
  x=>x.verifiedComponentEvidence.components[1].abbreviation=x.verifiedComponentEvidence.components[0].abbreviation,
  x=>x.verifiedComponentEvidence.sourceRole='Goaltender',
  x=>x.scoreKind='AWARD_MODEL_PENDING'
 ]){
  const x=structuredClone(example());mutate(x);
  assert.equal(api.currentComponents(x,sourceRace),null);
 }
}));
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
  [{...snapshot(),publishedAsOf:'9999-12-31'}],
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
 data.races.rolaids={status:'VERIFIED_CURRENT_WEEK',asOf:sourceRace.asOf,
  modelGameCount:data.currentTeamGP,entries:[row]};
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
test('verified current Rolaids shows all 11 source-contracted attributes; unscored rows show none',()=>withVerifiedRolaids(()=>{
 const tree=api.card(example(),0,false);
 assert.equal(visit(tree,n=>n.className.split(' ').includes('ea-stat')).length,11);
 assert.equal(visit(tree,n=>n.className.split(' ').includes('more-attributes')).length,1);
 const pending=api.card({name:'Unscored QA Player',gamesPlayed:2,eligible:false,scoreKind:'AWARD_MODEL_PENDING',modelScore:null},1,false);
 assert.equal(visit(pending,n=>n.className.split(' ').includes('ea-stat')).length,0);
}));
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

test('both published Awards entrypoints use identical assets and page instructions',()=>{
 const a=fs.readFileSync(path.join(widgets,'awards-races.html'),'utf8');
 const b=fs.readFileSync(path.join(widgets,'awards-races-v3.html'),'utf8');
 assert.equal(a,b);
 assert.match(a,/awards-races-v3\.js\?v=[0-9a-z]+/);
 assert.match(a,/awards-races-v3\.css\?v=[0-9a-z]+/);
});

test('workbook-first Rookie Year reconciliation shows all five first-FT-year players on the unranked watch',()=>{
 api.state.award='rookie';
 const rows=api.verifiedWorkbookRookieYearWatch(
   participants,awards.season,awards.currentTeamGP,awards.sourceWorkbookHash
 );
 assert.ok(rows,'Only an exact workbook-hash and HTO corroboration unlock the watch');
 assert.equal(rows.length,5,'Five candidates with current GP, not four stale formula results');
 assert.ok(rows.some(p=>p.name==='Rosenberg, Jamie'));
 for(const p of rows){
   assert.equal(p.workbookRookieYear.year,2026);
   assert.equal(p.htoRookieYear.year,2026);
   assert.equal(p.role,'FT');
   assert.ok(p.gp>=1);
 }
 assert.equal(participants.workbookRookieYearCrosscheck.sourceRankingRule,
  'MIN(5,COUNTIF(AwardScoring[Rookie Eligible],1))');
 assert.equal(participants.workbookRookieYearCrosscheck.sourceEligibilityTable,'AwardScoring');
});
test('workbook cached Jamie mismatch is explicit, never silently converted to final Rookie award eligibility',()=>{
 const e=participants.workbookRookieYearCrosscheck;
 const saved=e.workbookCachedRows['Rosenberg, Jamie'];
 assert.equal(saved.cachedRookieStatus,0);
 assert.equal(saved.cachedAwardEligible,0);
 assert.equal(saved.cachedSkaterGP,0);
 assert.equal(saved.cachedRecentSeason,'');
 assert.equal(saved.cachedFirstSeason,'');
 const current=participants.players.find(p=>p.name==='Rosenberg, Jamie');
 assert.equal(current.gp,3);
 assert.equal(current.workbookRookieYear.year,2026);
 assert.notEqual(awards.races.rookie?.status,'VERIFIED_CURRENT_WEEK');
 assert.equal(awards.races.rookie.entries.length,0);
});
test('rookie watch refuses a changed workbook hash or uncorroborated Rookie Year',()=>{
 const cloned=structuredClone(participants);
 assert.equal(api.verifiedWorkbookRookieYearWatch(cloned,awards.season,awards.currentTeamGP,'d'.repeat(64)),null);
 const jamie=cloned.players.find(p=>p.name==='Rosenberg, Jamie');
 jamie.htoRookieYear.year=2025;
 assert.equal(api.verifiedWorkbookRookieYearWatch(cloned,awards.season,awards.currentTeamGP,awards.sourceWorkbookHash),null);
});

test('Rookie race on-ice display renders five verified players while remaining unranked',()=>{
 const previousAward=api.state.award;
 api.state.award='rookie';
 const region=elementsById.get('scores');
 region.children=[];
 try {
  api.renderRaceActivity();
  const cards=visit(region,n=>n.className.split(' ').includes('race-activity-player'));
  assert.equal(cards.length,5);
  const names=cards.map(c=>visit(c,n=>n.tag==='strong')[0]?.textContent);
  assert.deepEqual(names.sort(),[
    'Kong, Henry','Povegliano, Adam','Rajkumar, Sanjay',
    'Rosenberg, Jamie','Triumbari, Francesco'].sort());
  assert.equal(awards.races.rookie.entries.length,0,'official award board remains held');
 } finally{api.state.award=previousAward;region.children=[];}
});

test('verified awards reject impossible calendar dates, not just matching date patterns',()=>{
 const baselineAward=api.state.award;
 api.state.award='rolaids';
 try {
  const d=structuredClone(awards),p=structuredClone(participants),row=example();
  p.players.push({name:playerName,gp:3,position:'Skater',role:'CU'});
  d.seasonRaceMode.currentModelScoresVerified=true;
  d.sourceWorkbookRecordedGP=d.currentTeamGP;
  const race={status:'VERIFIED_CURRENT_WEEK',asOf:'2026-10-19',modelGameCount:d.currentTeamGP,entries:[row]};
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),true);
  for(const impossible of ['2026-10-32','2026-11-31','2026-02-30','2026-13-01']){
   const altered=structuredClone(d),bad=structuredClone(race);
   altered.latestGameDate=impossible;
   bad.asOf=impossible;
   altered.publishedAsOf=impossible;
   assert.equal(api.isVerifiedWeeklyRace(altered,bad,p),false,impossible);
  }
  d.publishedAsOf='2026-10-18';
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'race cannot be after source publication date');
 }finally {api.state.award=baselineAward;}
});

test('Art Ross and Rocket must be current verified count values, never OVR or wrong HTO totals',()=>{
 const old=api.state.award;
 const d=structuredClone(awards),p=structuredClone(participants);
 d.seasonRaceMode.currentModelScoresVerified=true;
 d.sourceWorkbookRecordedGP=d.currentTeamGP;
 p.players.push({name:playerName,gp:3,position:'Skater',role:'CU',
  currentHTORaw:{season:d.season,gamesPlayed:3,goals:2,points:4}});
 const race={status:'VERIFIED_CURRENT_WEEK',asOf:'2026-10-19',modelGameCount:d.currentTeamGP,entries:[]};
 const countRow={name:playerName,gamesPlayed:3,eligible:true,rankKey:4,
  scoreKind:'WORKBOOK_REGULAR_SEASON_STAT_COUNT',modelScore:4};
 try {
  api.state.award='art-ross';
  race.entries=[countRow];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),true);
  race.entries=[{...countRow,modelScore:3}];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'wrong HTO points');
  race.entries=[example()];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'Art Ross 50–100 OVR never allowed');
  api.state.award='rocket';
  race.entries=[{...countRow,modelScore:2}];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),true);
  race.entries=[{...countRow,modelScore:4}];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'wrong HTO goals');
  api.state.award='hart';
  race.entries=[countRow];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'count cannot become Hart OVR');
 }finally {api.state.award=old;}
});

test('a verified workbook race cannot silently contain pending or unranked score entries',()=>{
 const old=api.state.award;
 api.state.award='rolaids';
 try{
  const d=structuredClone(awards),p=structuredClone(participants),row=example();
  d.seasonRaceMode.currentModelScoresVerified=true;
  d.sourceWorkbookRecordedGP=d.currentTeamGP;
  p.players.push({name:playerName,gp:3,position:'Skater',role:'CU'});
  const race={status:'VERIFIED_CURRENT_WEEK',asOf:'2026-10-19',
   modelGameCount:d.currentTeamGP,entries:[row]};
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),true);
  race.entries=[{...row,scoreKind:'AWARD_MODEL_PENDING',modelScore:null}];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'pending entry invalidates verified board');
  race.entries=[{...row,rankKey:null}];
  assert.equal(api.isVerifiedWeeklyRace(d,race,p),false,'rank key must come from workbook');
 }finally {api.state.award=old;}
});

test('impossible historical snapshot dates never produce weekly EA OVR movement',()=>{
 const oldHistory=api.state.weeklyHistory, old=api.state.award;
 api.state.award='rolaids';
 try{
  api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
   status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',
   snapshots:[{...snapshot(),publishedAsOf:'2026-02-30'}]};
  assert.equal(api.previousSnapshot(sourceRace),null);
 }finally{api.state.weeklyHistory=oldHistory;api.state.award=old;}
});

const historicalDependencies=require('../scripts/hockeyos_awards_historical_dependency_audit');

test('Rolaids original formula lineage has 18 unique component formulas and 111 PlayerInfo inputs',()=>{
 const inventory=historicalDependencies.audit(evidence);
 assert.equal(inventory.status,'HISTORICAL_ROLAIDS_FORMULA_LINEAGE_MAPPED_CURRENT_OVR_HELD');
 assert.equal(inventory.uniqueComponentFormulas,18);
 assert.equal(inventory.uniquePlayerInfoFields,111);
 assert.equal(inventory.roleWeights.skater.componentCount,11);
 assert.equal(inventory.roleWeights.goalie.componentCount,10);
 assert.equal(inventory.roleWeights.skater.weightTotalPercent,100);
 assert.equal(inventory.roleWeights.goalie.weightTotalPercent,100);
 assert.equal(inventory.currentOverallRatingsVerified,false);
 assert.equal(inventory.fullWorkbookFormulaParity,false);
 assert.equal(inventory.originalWorkbookAccessed,false);
 assert.equal(inventory.publicationAuthorized,false);
 for(const r of [inventory.roleWeights.skater,inventory.roleWeights.goalie]){
  for(const x of r.components){
   assert.match(x.internalFormulaSha256,/^[a-f0-9]{64}$/);
   assert.match(x.displayFormulaSha256,/^[a-f0-9]{64}$/);
   assert.ok(x.playerInfoFields.includes('Website Name'));
   assert.equal(x.currentNormalizedComponentVerified,false);
  }
 }
});

test('historical formula completeness rejects forged score authority or incomplete components',()=>{
 for(const mutate of [
  x=>x.status='CURRENT_AWARD_SCORE_VERIFIED',
  x=>x.sourceWorkbookHash='invalid',
  x=>{delete x.componentFormulas[x.roleWeights.skater[0].field];},
  x=>{x.roleWeights.skater[0].weight=0.7;},
  x=>{x.roleWeights.skater[1].field=x.roleWeights.skater[0].field;},
  x=>{x.componentFormulas['Unauthorized Scoring Field']={
   internalFormula:'=PlayerInfo[NewField]',displayFormula:'=5'};}
 ]){
  const modified=structuredClone(evidence);mutate(modified);
  assert.throws(()=>historicalDependencies.audit(modified));
 }
});

test('original prior-career and all-time baselines remain distinct from public HTO raw fields',()=>{
 const inventory=historicalDependencies.audit(evidence);
 const byName=Object.fromEntries(inventory.allPlayerInfoDependencies.map(x=>[x.name,x.category]));
 assert.equal(byName['Career Prior Total Pts/GP'],'HISTORICAL_PLAYER_BASELINE');
 assert.equal(byName['All-Time Total Skater Pts Team Rate Avg'],'HISTORICAL_TEAM_COMPARATOR');
 assert.equal(byName['Current Total Pts/GP'],'CURRENT_DERIVED_OR_COMPARATOR');
 assert.equal(byName['Website Name'],'IDENTITY_JOIN');
 assert.ok(inventory.dependencyCategoryCounts.HISTORICAL_PLAYER_BASELINE>0);
 assert.ok(inventory.dependencyCategoryCounts.HISTORICAL_TEAM_COMPARATOR>0);
});

const cachedRolaidsParity=require('../scripts/hockeyos_awards_cached_raw_parity');

test('five saved Rolaids historical players reproduce original weighted RAW composites',()=>{
 const r=cachedRolaidsParity.audit(evidence,ref);
 assert.equal(r.status,'HISTORICAL_ROLAIDS_RAW_COMPOSITE_PARITY_PASS_FINAL_OVR_HELD');
 assert.equal(r.historicalPlayerExamples,5);
 assert.equal(r.componentsChecked,54);
 assert.equal(r.rawCompositeReproduced,true);
 assert.equal(r.finalOVRNormalizationReproduced,false);
 assert.equal(r.current2026ModelScoresVerified,false);
 assert.equal(r.releaseAuthorized,false);
 const byName=Object.fromEntries(r.players.map(x=>[x.name,x]));
 assert.equal(byName['Rajasooriar, Krishnan'].roundedRawComposite,82.2);
 assert.equal(byName['Duffy, Lorcan'].roundedRawComposite,82.1);
 assert.equal(byName['Svec, Matt (G)'].roundedRawComposite,82.1);
 assert.equal(byName['Kober, Adam'].roundedRawComposite,74.4);
 assert.equal(byName['Mazzei, Stefano'].roundedRawComposite,67.8);
 assert.equal(byName['Svec, Matt (G)'].weightComponents,10);
 for(const x of r.players)assert.equal(x.finalOVRNormalizationReproduced,false);
});

test('cached Rolaids replay rejects a changed component, source weight or composite',()=>{
 const mutants=[
  e=>e.races.rolaids['Kober, Adam'].components[0].webComponentScore+=1,
  e=>e.races.rolaids['Rajasooriar, Krishnan'].components[0].unroundedWeightedContribution+=0.2,
  e=>e.races.rolaids['Duffy, Lorcan'].cachedRawComposite=50,
  e=>e.races.rolaids['Mazzei, Stefano'].components[1].sourceField='Unauthorized',
  e=>e.races.rolaids['Rajasooriar, Krishnan'].components.pop(),
  e=>e.roleWeights.skater[0].weight=0.37,
  e=>{delete e.componentFormulas[e.roleWeights.goalie[0].field];}
 ];
 for(const mutate of mutants){
  const changed=structuredClone(evidence);
  mutate(changed);
  assert.throws(()=>cachedRolaidsParity.audit(changed,ref));
 }
});

test('cached raw parity separately rejects fabricated final score and mismatched source hash',()=>{
 const fakeRef=structuredClone(ref);
 fakeRef.races.rolaids[1].score=101;
 assert.throws(()=>cachedRolaidsParity.audit(evidence,fakeRef));
 fakeRef.races.rolaids[1].score=99;
 fakeRef.sourceWorkbookHash='a'.repeat(64);
 assert.throws(()=>cachedRolaidsParity.audit(evidence,fakeRef));
});

test('cached historical source must never be interpreted as a live verified award rating',()=>{
 const result=cachedRolaidsParity.audit(evidence,ref);
 assert.ok(result.players.every(p=>p.historicalPublishedOVRObservedOnly>=50));
 assert.equal(result.completeHistoricalEligiblePopulationRecalculated,false);
 assert.equal(result.finalOVRNormalizationReproduced,false);
 assert.equal(result.originalWorkbookOpened,false);
 assert.equal(result.originalWorkbookModified,false);
 assert.equal(result.websitePublished,false);
});

test('goalie requires all ten original goalie weights and an actual goalie roster role',()=>withVerifiedRolaids(()=>{
 const row=example(true);
 assert.equal(api.currentComponents(row,sourceRace).length,10);
 const bad=structuredClone(row);bad.verifiedComponentEvidence.components.pop();
 assert.equal(api.currentComponents(bad,sourceRace),null);
},true));

test('other awards cannot borrow Rolaids attributes without their own verified component contract',()=>withVerifiedRolaids(()=>{
 api.state.award='hart';
 const forged=example();forged.verifiedComponentEvidence.awardId='hart';
 assert.equal(api.currentComponents(forged,sourceRace),null);
}));

test('unverified model-state or unrecognized player blocks otherwise full Rolaids component tiles',()=>withVerifiedRolaids(()=>{
 const r=example();
 const saved=api.state.source;
 try{
  api.state.source={...saved,seasonRaceMode:{...saved.seasonRaceMode,currentModelScoresVerified:false}};
  assert.equal(api.currentComponents(r,sourceRace),null);
 }finally{api.state.source=saved;}
 const old=api.state.participation;
 try{
  api.state.participation=participants;
  assert.equal(api.currentComponents(r,sourceRace),null);
 }finally{api.state.participation=old;}
}));

const operationalProvenanceGate=require('../scripts/hockeyos_awards_operational_provenance_gate');

function candidateOperationalAttestation(){
 const source=structuredClone(awards);
 source.sourceWorkbookRecordedGP=source.currentTeamGP;
 source.seasonRaceMode.currentModelScoresVerified=true;
 source.sourceHTOReadback='2026-10-20T15:30:00Z';
 return {source,attestation:{
  schema:'brave-hc-awards-operational-workbook-recalculation/v1',
  status:'COMPLETE_SOURCE_FORMULA_REPLAY_REVIEW_CANDIDATE',
  immutableFormulaAuthoritySha256:operationalProvenanceGate.AUTHORITY,
  operationalWorkbookSha256:'b'.repeat(64),
  originalFormulaMapFingerprintSha256:'c'.repeat(64),
  operationalFormulaMapFingerprintSha256:'c'.repeat(64),
  season:source.season,recalculatedTeamGP:4,officialHTOTeamGP:4,
  originalHistoricalModelParity:'COMPLETE_UNCHANGED_HISTORY',
  officialHTOReadbackAt:'2026-10-20T15:30:00Z',
  sourceGameMappings:[
   {htoGameId:3356177,originalWorkbookGameNumber:359,gameDate:'2026-09-20'},
   {htoGameId:3356178,originalWorkbookGameNumber:360,gameDate:'2026-09-27'},
   {htoGameId:3369564,originalWorkbookGameNumber:361,gameDate:'2026-10-04'},
   {htoGameId:3375601,originalWorkbookGameNumber:362,gameDate:'2026-10-18'}
  ],
  awardFormulaParities:operationalProvenanceGate.AWARDS.map(awardId=>({
   awardId,state:'EXACT_ORIGINAL_FORMULA_ELIGIBILITY_RANK_SCORE_PARITY'
  }))
 }};
}
test('real current awards data holds 1-to-4 game gap and nonexistent operational attestation',()=>{
 const result=operationalProvenanceGate.assess(
  awards,null,'2026-10-20T16:00:00Z');
 assert.equal(result.status,'HOLD_OPERATIONAL_MODEL_EVIDENCE');
 assert.ok(result.holds.includes('CACHED_AWARDS_GAME_COUNT_BEHIND_HTO'));
 assert.ok(result.holds.includes('OPERATIONAL_RECALCULATION_EVIDENCE_MISSING'));
 assert.equal(result.scoresAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
});
test('complete synthetic operational and original hash separation is REVIEW ONLY, never signed or published',()=>{
 const {source,attestation}=candidateOperationalAttestation();
 const result=operationalProvenanceGate.assess(
  source,attestation,'2026-10-20T16:00:00Z');
 assert.equal(result.status,'SOURCE_EVIDENCE_REVIEW_CANDIDATE_ONLY');
 assert.deepEqual(result.holds,[]);
 assert.equal(result.sourceAuthorityHash,awards.sourceWorkbookHash);
 assert.equal(result.declaredOperationalHash,'b'.repeat(64));
 assert.equal(result.cryptographicSignerValidated,false);
 assert.equal(result.scoresAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
});
test('operational provenance rejects changed authority, reused source SHA and mismatched formula fingerprints',()=>{
 for(const mutate of [
  (d,e)=>d.sourceWorkbookHash='c'.repeat(64),
  (d,e)=>e.immutableFormulaAuthoritySha256='c'.repeat(64),
  (d,e)=>e.operationalWorkbookSha256=e.immutableFormulaAuthoritySha256,
  (d,e)=>e.operationalFormulaMapFingerprintSha256='d'.repeat(64),
  (d,e)=>e.originalHistoricalModelParity='PARTIAL',
  (d,e)=>e.recalculatedTeamGP=1
 ]){
  const {source,attestation}=candidateOperationalAttestation();
  mutate(source,attestation);
  const result=operationalProvenanceGate.assess(
   source,attestation,'2026-10-20T16:00:00Z');
  assert.equal(result.status,'HOLD_OPERATIONAL_MODEL_EVIDENCE');
  assert.ok(result.holds.length>=1);
  assert.equal(result.publicationAuthorized,false);
 }
});
test('all 11 award-specific exact formula parity receipts and unique official games are required',()=>{
 for(const mutate of [
  e=>e.awardFormulaParities.pop(),
  e=>e.awardFormulaParities[0].state='RAW_STATS_ONLY',
  e=>e.awardFormulaParities[0].awardId='rolaids',
  e=>e.sourceGameMappings.pop(),
  e=>e.sourceGameMappings[0].htoGameId=e.sourceGameMappings[1].htoGameId,
  e=>e.sourceGameMappings[1].originalWorkbookGameNumber=359,
  e=>e.sourceGameMappings[1].gameDate='2026-02-30'
 ]){
  const {source,attestation}=candidateOperationalAttestation();
  mutate(attestation);
  const result=operationalProvenanceGate.assess(
   source,attestation,'2026-10-20T16:00:00Z');
  assert.equal(result.status,'HOLD_OPERATIONAL_MODEL_EVIDENCE');
 }
});
test('stale HTO and future observation dates fail closed even with claimed full workbook parity',()=>{
 const cases=[
  {sourceAt:'2026-10-20T12:00:00Z',now:'2026-10-20T16:00:00Z'},
  {sourceAt:'2026-10-20T16:05:00Z',now:'2026-10-20T16:00:00Z'},
  {sourceAt:'2026-02-30T15:30:00Z',now:'2026-10-20T16:00:00Z'},
  {sourceAt:'2026-10-20T15:30:00Z',now:'invalid'}
 ];
 for(const {sourceAt,now} of cases){
  const {source,attestation}=candidateOperationalAttestation();
  attestation.officialHTOReadbackAt=sourceAt;
  const result=operationalProvenanceGate.assess(source,attestation,now);
  assert.ok(result.holds.includes('INDEPENDENT_OFFICIAL_HTO_FRESHNESS_UNVERIFIED'));
 }
});

test('a fresh claimed HTO readback cannot override the older actual Awards feed timestamp',()=>{
 const {source,attestation}=candidateOperationalAttestation();
 source.sourceHTOReadback='2026-10-19T03:55:10.771Z';
 const result=operationalProvenanceGate.assess(
  source,attestation,'2026-10-20T16:00:00Z');
 assert.equal(result.status,'HOLD_OPERATIONAL_MODEL_EVIDENCE');
 assert.ok(result.holds.includes('OFFICIAL_HTO_READBACK_NOT_BOUND_TO_AWARDS_DATA'));
 assert.equal(result.scoresAuthorized,false);
});

test('two verified HTO games on the same day remain distinct by official game ID and workbook game number',()=>{
 const {source,attestation}=candidateOperationalAttestation();
 attestation.sourceGameMappings[1].gameDate=attestation.sourceGameMappings[0].gameDate;
 const result=operationalProvenanceGate.assess(
  source,attestation,'2026-10-20T16:00:00Z');
 assert.equal(result.status,'SOURCE_EVIDENCE_REVIEW_CANDIDATE_ONLY');
 assert.ok(!result.holds.includes('OFFICIAL_GAME_MAPPING_DUPLICATE_OR_INVALID'));
 assert.equal(result.scoresAuthorized,false);
});

test('different workbook formula authority suppresses weekly OVR movement even with a valid SHA256',()=>{
 const old=api.state.weeklyHistory,oldAward=api.state.award;
 try{
  api.state.award='rolaids';
  api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
   status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',
   snapshots:[{...snapshot(),sourceWorkbookHash:'b'.repeat(64)}]};
  assert.equal(api.previousSnapshot(sourceRace),null);
  const tree=elt();
  api.movement(tree,example(),0,sourceRace);
  const words=visit(tree,x=>typeof x.textContent==='string').map(x=>x.textContent);
  assert.ok(words.includes('Weekly movement available after two verified published snapshots'));
  assert.ok(!words.some(x=>x.includes(' OVR')&&x.includes('+')));
 }finally{api.state.weeklyHistory=old;api.state.award=oldAward;}
});
test('same-season duplicate or malformed published weeks suppress movement rather than select a convenient baseline',()=>{
 const old=api.state.weeklyHistory,oldAward=api.state.award;
 try{
  api.state.award='rolaids';
  for(const snapshots of [
    [snapshot(),{...snapshot(),sourceWorkbookHash:'c'.repeat(64)}],
    [snapshot(),{...snapshot(),status:'INVALID'}],
    [snapshot(),{...snapshot(),publishedAsOf:'2026-02-30'}]
  ]){
   api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
    status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',snapshots};
   assert.equal(api.previousSnapshot(sourceRace),null);
  }
 }finally{api.state.weeklyHistory=old;api.state.award=oldAward;}
});
test('valid older same-source week remains eligible when a newer held mismatched-model week exists',()=>{
 const old=api.state.weeklyHistory,oldAward=api.state.award;
 try{
  api.state.award='rolaids';
  api.state.weeklyHistory={schema:'brave-hc-awards-weekly-history/v1',
   status:'VERIFIED_PUBLISHED_WEEKLY_SNAPSHOTS',
   snapshots:[snapshot(),{...snapshot(),publishedAsOf:'2026-10-15',
     sourceWorkbookHash:'d'.repeat(64)}]};
  const prior=api.previousSnapshot(sourceRace);
  assert.equal(prior?.publishedAsOf,'2026-10-12');
  assert.equal(prior?.sourceWorkbookHash,hash);
 }finally{api.state.weeklyHistory=old;api.state.award=oldAward;}
});

test('HTO Art Ross observation shows exactly five verified positive-point skaters, not OVR shortlist',()=>{
 const result=api.verifiedHTOStatWatch('art-ross',participants,awards);
 assert.equal(result.kind,'HTO_RAW_STAT_WATCH_NOT_OFFICIAL_AWARD_RANKING');
 assert.equal(result.officialAwardEligibilityVerified,false);
 assert.equal(result.officialAwardRankVerified,false);
 assert.equal(result.ratingsVerified,false);
 assert.equal(result.leaders.length,5);
 assert.equal(result.asOf,'2026-10-18');
 assert.deepEqual(result.leaders.map(p=>[p.name,p.points]),[
  ['Carosi, Justin',3],['Pagnotta, Alex',3],['Provenzano, Michael',3],
  ['Kober, Adam',2],['Kong, Henry',2]
 ]);
});
test('HTO Rocket watch shows four positive-goal scorers and never converts goals into OVR',()=>{
 const result=api.verifiedHTOStatWatch('rocket',participants,awards);
 assert.equal(result.leaders.length,4);
 assert.deepEqual(result.leaders.map(p=>[p.name,p.goals]),[
  ['Carosi, Justin',3],['Kober, Adam',1],['Kong, Henry',1],
  ['Pearsoll, Keith',1]
 ]);
 assert.equal(result.officialAwardRankVerified,false);
 assert.equal(result.ratingsVerified,false);
 assert.equal(api.verifiedHTOStatWatch('hart',participants,awards),null);
});
test('HTO scoring watch holds on incorrect source sum, player boxscore mismatch or game count',()=>{
 for(const change of [
  x=>x.players[0].currentHTORaw.goals++,
  x=>x.players[0].points++,
  x=>x.players[0].currentHTORaw.points++,
  x=>x.players[0].currentHTORaw.gamesPlayed++,
  x=>x.players[0].currentHTORaw.sourceKind='UNREVIEWED_STATS',
  x=>x.players.push(structuredClone(x.players[0])),
  x=>x.verifiedSourceReadback.team.points++,
  x=>x.verifiedSourceReadback.status='UNVERIFIED',
  x=>x.verifiedSourceReadback.independentBoxscoreParity.status='PENDING',
  x=>x.evidenceGameIds[0]=1234567,
  x=>x.verifiedSourceReadback.independentBoxscoreParity.boxscoreGameIds[1]=1234567,
  x=>x.evidenceGameIds[1]=x.evidenceGameIds[0],
  x=>x.latestCompletedGameDate='2026-10-04'
 ]){
  const fake=structuredClone(participants);change(fake);
  assert.equal(api.verifiedHTOStatWatch('art-ross',fake,awards),null);
 }
});
test('stat watch shows every player tied at the five-place cutoff, never fabricating workbook tiebreak',()=>{
 const d=structuredClone(participants);
 // Fictional all-players-tie test: 7 skaters with one goal, one point.
 const names=d.players.filter(x=>x.position==='Skater').slice(0,7);
 for(const p of d.players.filter(x=>x.position==='Skater')){
  const g=names.some(n=>n.name===p.name)?1:0;
  p.goals=g;p.assists=0;p.points=g;
  p.currentHTORaw.goals=g;p.currentHTORaw.assists=0;p.currentHTORaw.points=g;
 }
 d.verifiedSourceReadback.team={gp:4,goals:7,assists:0,points:7};
 d.verifiedSourceReadback.independentBoxscoreParity.teamGoalsFor=7;
 const result=api.verifiedHTOStatWatch('rocket',d,awards);
 assert.equal(result.leaders.length,7);
 assert.equal(result.shownBeyondFiveBecauseOfTies,true);
 assert.equal(result.cutoffScore,1);
});
test('Art Ross and Rocket visible watch identifies HTO data separately from official award scoring',()=>{
 const oldAward=api.state.award;
 const region=elementsById.get('scores');
 try{
  for(const [award,n] of [['art-ross',5],['rocket',4]]){
   region.children=[];api.state.award=award;api.renderRaceActivity();
   const blocks=visit(region,x=>x.className.split(' ').includes('race-activity-player'));
   assert.equal(blocks.length,n);
   const text=visit(region,x=>typeof x.textContent==='string').map(x=>x.textContent).join(' | ');
   assert.match(text,/HTO source count/);
   assert.match(text,/not the workbook.s award shortlist or EA-style overall ratings/);
   assert.match(text,/award qualification and tiebreaks unverified/);
  }
 }finally{api.state.award=oldAward;region.children=[];}
});

test('actual held operational publication receipt cannot unlock current Awards with a model-verified flag',()=>{
 const prior=api.state.operationalEvidence;
 try{
  api.state.operationalEvidence=heldOperationalReceipt;
  const d=structuredClone(awards),p=structuredClone(participants);
  d.seasonRaceMode.currentModelScoresVerified=true;
  d.sourceWorkbookRecordedGP=d.currentTeamGP;
  p.players.push({name:playerName,gp:3,position:'Skater',role:'CU'});
  assert.equal(api.isVerifiedWeeklyRace(d,{status:'VERIFIED_CURRENT_WEEK',
   asOf:sourceRace.asOf,modelGameCount:d.currentTeamGP,entries:[example()]},p),false);
  assert.equal(api.currentComponents(example(),sourceRace),null);
 }finally{api.state.operationalEvidence=prior;}
});

test('public Awards require separate operational snapshot identity, complete formula parity and release receipt',()=>{
 const previous=api.state.operationalEvidence,priorAward=api.state.award;
 const d=structuredClone(awards),p=structuredClone(participants);
 d.seasonRaceMode.currentModelScoresVerified=true;
 d.sourceWorkbookRecordedGP=d.currentTeamGP;
 p.players.push({name:playerName,gp:3,position:'Skater',role:'CU'});
 const race={status:'VERIFIED_CURRENT_WEEK',asOf:sourceRace.asOf,
  modelGameCount:d.currentTeamGP,entries:[example()]};
 try{
  api.state.award='rolaids';
  for(const change of [
   x=>x.status='AWAITING_SOURCE_FAITHFUL_EXCEL_RECALCULATION',
   x=>x.publicationAuthorized=false,
   x=>x.independentlyApproved=false,
   x=>x.operationalWorkbookSha256=x.immutableFormulaAuthoritySha256,
   x=>x.operationalWorkbookSha256=null,
   x=>x.operationalFormulaMapFingerprintSha256='e'.repeat(64),
   x=>x.sourceFormulaMapFingerprintSha256=null,
   x=>x.officialHTOReadbackAt='2026-10-19T00:00:00Z',
   x=>x.publisherReleaseReceiptSha256=null,
   x=>x.modelGameCount++,
   x=>x.scoringAsOf='2026-10-18',
   x=>x.awardFormulaParities.pop(),
   x=>x.awardFormulaParities[0].state='RAW_HTO_STATS_ONLY',
   x=>x.awardFormulaParities[0].awardId=x.awardFormulaParities[1].awardId
  ]){
   const r=syntheticOperationalReceipt();change(r);
   api.state.operationalEvidence=r;
   assert.equal(api.isVerifiedWeeklyRace(d,race,p),false);
   assert.equal(api.currentComponents(example(),sourceRace),null);
  }
 }finally{api.state.operationalEvidence=previous;api.state.award=priorAward;}
});

test('tracked operational publication file remains explicitly on hold until actual Excel release',()=>{
 assert.equal(heldOperationalReceipt.schema,'brave-hc-awards-operational-publication/v1');
 assert.equal(heldOperationalReceipt.status,'AWAITING_SOURCE_FAITHFUL_EXCEL_RECALCULATION');
 assert.equal(heldOperationalReceipt.immutableFormulaAuthoritySha256,hash);
 assert.equal(heldOperationalReceipt.publicationAuthorized,false);
 assert.equal(heldOperationalReceipt.sourceModelVerified,false);
 assert.equal(heldOperationalReceipt.independentlyApproved,false);
 assert.equal(heldOperationalReceipt.operationalWorkbookSha256,null);
 assert.equal(heldOperationalReceipt.awardFormulaParities.length,0);
 assert.ok(original.includes('awards-operational-publication.json'));
});

test('all eleven award holds explain original source fields and actual missing formula dependencies',()=>{
 const expected=new Set(awards.awards.map(x=>x.id));
 const observed=new Set();
 for(const award of awards.awards){
  const row=api.sourceReadinessForAward(awards,readiness,award.id);
  assert.ok(row,"Missing verified source-ready explanation for "+award.id);
  assert.equal(row.state,'INPUT_PARTIAL_SCORE_HELD');
  assert.equal(row.officialScoreVerified,false);
  assert.ok(row.eligibleField.includes('Eligible'));
  assert.ok(row.rankField.includes('Rank Key'));
  assert.ok(row.knownInputs.length>12);
  assert.ok(row.remainingToVerify.length>12);
  assert.equal(row.scoreKind,['art-ross','rocket'].includes(award.id)?'STAT':'OVR');
  observed.add(row.id);
 }
 assert.deepEqual([...observed].sort(),[...expected].sort());
 assert.equal(readiness.sourceModelCalculated,false);
 assert.equal(readiness.awardScoreReleaseAllowed,false);
 assert.equal(readiness.htoObservedTeamGames,4);
 assert.equal(readiness.savedAwardScoringTeamGames,1);
});

test('source readiness explanations hold on stale games, changed model source or invented award completion',()=>{
 const mutations=[
  (d,r)=>r.originalWorkbookAuthoritySha256='a'.repeat(64),
  (d,r)=>r.htoObservedTeamGames=5,
  (d,r)=>r.savedAwardScoringTeamGames=4,
  (d,r)=>r.auditedAsOf='2026-02-30',
  (d,r)=>r.auditedAsOf='2026-10-04',
  (d,r)=>r.awardScoreReleaseAllowed=true,
  (d,r)=>r.sourceModelCalculated=true,
  (d,r)=>r.awards[0].officialScoreVerified=true,
  (d,r)=>r.awards[0].scoreKind='STAT',
  (d,r)=>r.awards.pop(),
  (d,r)=>r.awards[0].id='rocket',
  (d,r)=>d.currentTeamGP=5,
  (d,r)=>d.publishedAsOf='2026-10-18'
 ];
 for(const mutate of mutations){
  const src=structuredClone(awards),report=structuredClone(readiness);
  mutate(src,report);
  assert.equal(api.sourceReadinessForAward(src,report,'hart'),null);
 }
});

test('held Awards page shows dated source explanation separately from HTO statistical watch',()=>{
 const old=api.state.award, before=api.state.readiness, region=elementsById.get('scores');
 try{
  api.state.readiness=readiness;
  for(const award of awards.awards){
   api.state.award=award.id;
   region.children=[];
   assert.equal(api.renderHeldSourceReadiness(award.id,awards),true);
   const heads=visit(region,x=>x.tag==='h4').map(x=>x.textContent);
   assert.ok(heads.includes('Available observations'),award.id);
   assert.ok(heads.includes('What still requires verification'),award.id);
   const words=visit(region,x=>typeof x.textContent==='string').map(x=>x.textContent).join(' | ');
   assert.match(words,/saved award model 1 game/);
   assert.match(words,/not live or a released award result/);
  }
  api.state.readiness=null;
  region.children=[];
  assert.equal(api.renderHeldSourceReadiness('hart',awards),false);
  assert.equal(region.children.length,0);
 }finally{api.state.award=old;api.state.readiness=before;region.children=[];}
});

test('all 11 award-specific attribute slots are declared but only historical Rolaids field rules are mapped',()=>{
 const ids=awards.awards.map(a=>a.id);
 assert.equal(contracts.schema,'brave-hc-awards-attribute-contract-registry/v1');
 assert.equal(contracts.sourceWorkbookAuthoritySha256,awards.sourceWorkbookHash);
 assert.equal(contracts.season,awards.season);
 assert.equal(contracts.releaseAuthorized,false);
 assert.equal(contracts.sourceModelScoreRecalculated,false);
 assert.deepEqual(Object.keys(contracts.awards).sort(),ids.sort());
 for(const id of ids){
  const def=contracts.awards[id];
  assert.ok(def);
  if(id==='rolaids'){
   assert.equal(def.status,'HISTORICAL_ORIGINAL_FIELDS_AND_WEIGHTS_MAPPED_CURRENT_OVR_HELD');
   assert.equal(def.roleWeights.skater.length,11);
   assert.equal(def.roleWeights.goalie.length,10);
   for(const role of ['skater','goalie']){
    assert.deepEqual(def.roleWeights[role],evidence.roleWeights[role]);
   }
  }else{
   assert.equal(def.status,'HOLD_ORIGINAL_ATTRIBUTE_FORMULAS_NOT_MAPPED');
   assert.equal(def.originalFormulaPairsVerifiedHistorically,false);
   assert.deepEqual(def.roleWeights,{});
  }
 }
});

test('Rolaids cannot use changed registry source weights even if components are tampered to match',()=>withVerifiedRolaids(()=>{
 const before=api.state.attributeContracts;
 const fake=structuredClone(contracts);
 const w=fake.awards.rolaids.roleWeights.skater;
 w[0].weight=0.2;
 w[1].weight=0.16;
 const row=example();
 row.verifiedComponentEvidence.components[0].weightPct=20;
 row.verifiedComponentEvidence.components[0].unroundedWeightedContribution=18;
 row.verifiedComponentEvidence.components[1].weightPct=16;
 row.verifiedComponentEvidence.components[1].unroundedWeightedContribution=14.4;
 try{
  api.state.attributeContracts=fake;
  assert.equal(api.currentComponents(row,sourceRace),null);
 }finally{api.state.attributeContracts=before;}
}));

test('a synthetic non-Rolaids award displays attributes only with a distinct source-matched model contract',()=>withVerifiedRolaids(()=>{
 const oldRegistry=api.state.attributeContracts,oldExplain=api.state.explain,oldAward=api.state.award;
 try{
  api.state.award='hart';
  const fakeRegistry=structuredClone(contracts);
  fakeRegistry.awards.hart={
    status:'HISTORICAL_ORIGINAL_FIELDS_AND_WEIGHTS_MAPPED_CURRENT_OVR_HELD',
    originalFormulaPairsVerifiedHistorically:true,
    roleWeights:{skater:[
      {field:'QA_HART_FAKE_IMPACT',weight:0.6},
      {field:'QA_HART_FAKE_CLUTCH',weight:0.4}
    ]}
  };
  const fakeEvidence=structuredClone(evidence);
  fakeEvidence.awardRoleWeights={hart:{skater:structuredClone(fakeRegistry.awards.hart.roleWeights.skater)}};
  fakeEvidence.componentFormulas.QA_HART_FAKE_IMPACT={
    internalFormula:'FICTIONAL_QA_ONLY(PlayerInfo[Impact])',
    displayFormula:'FICTIONAL_QA_ONLY(60)'};
  fakeEvidence.componentFormulas.QA_HART_FAKE_CLUTCH={
    internalFormula:'FICTIONAL_QA_ONLY(PlayerInfo[Clutch])',
    displayFormula:'FICTIONAL_QA_ONLY(40)'};
  const row=example();
  row.verifiedComponentEvidence.awardId='hart';
  row.verifiedComponentEvidence.components=[
    {abbreviation:'IMPACT',sourceField:'QA_HART_FAKE_IMPACT',webComponentScore:80,weightPct:60,unroundedWeightedContribution:48},
    {abbreviation:'CLUTCH',sourceField:'QA_HART_FAKE_CLUTCH',webComponentScore:95,weightPct:40,unroundedWeightedContribution:38}
  ];
  api.state.attributeContracts=fakeRegistry;api.state.explain=fakeEvidence;
  assert.equal(api.currentComponents(row,sourceRace).length,2);
  delete fakeEvidence.awardRoleWeights.hart;
  assert.equal(api.currentComponents(row,sourceRace),null,'a registry alone cannot invent original Hart formula weights');
 }finally{api.state.attributeContracts=oldRegistry;api.state.explain=oldExplain;api.state.award=oldAward;}
}));

test('an award with no original source mapping cannot display an arbitrary two-score card',()=>withVerifiedRolaids(()=>{
 const prior=api.state.award,priorRegistry=api.state.attributeContracts;
 try{
  api.state.award='norris';
  const row=example();row.verifiedComponentEvidence.awardId='norris';
  assert.equal(api.currentComponents(row,sourceRace),null);
  api.state.attributeContracts=null;
  api.state.award='rolaids';
  assert.equal(api.currentComponents(example(),sourceRace),null);
 }finally{api.state.award=prior;api.state.attributeContracts=priorRegistry;}
}));


test('penalty-free appearance count requires explicit reconciled PIM for every game',()=>{
 const player=structuredClone(participants.players.find(p=>p.position==='Skater'&&p.gp===1));
 player.currentHTORaw.penaltyMinutes=0;
 player.currentHTOEventEvidence.reportedPIMFreeGameAppearances=1;
 function display(){
  const root=elt();api.renderPlayerEvidence(root,player,participants);
  return visit(root,x=>typeof x.textContent==='string').map(x=>x.textContent).join(' | ');
 }
 delete player.sourceHTOGamePattern.games[0].penaltyMinutes;
 assert.match(display(),/Penalty-free game count unavailable/);
 assert.doesNotMatch(display(),/HTO-reported penalty-free games: 1/);
 player.sourceHTOGamePattern.games[0].penaltyMinutes=0;
 assert.match(display(),/HTO-reported penalty-free games: 1 of 1/);
 player.sourceHTOGamePattern.games[0].penaltyMinutes=null;
 assert.match(display(),/Penalty-free game count unavailable/);
 player.sourceHTOGamePattern.games[0].penaltyMinutes=2;
 assert.match(display(),/Penalty-free game count unavailable/);
 player.currentHTORaw.penaltyMinutes=2;
 player.currentHTOEventEvidence.reportedPIMFreeGameAppearances=0;
 assert.match(display(),/HTO-reported penalty-free games: 0 of 1/);
 player.currentHTOEventEvidence.reportedPIMFreeGameAppearances=1;
 assert.match(display(),/Penalty-free game count unavailable/);
});

for(const position of ['Skater','Goalie'])test(`${position} retains known stats when POTG is unknown`,()=>{
 const player=structuredClone(participants.players.find(p=>p.position===position));
 player.currentHTORaw.playerOfTheGameCount=null;
 if(position==='Skater')player.currentHTORaw.penaltyMinutes=null;
 function text(){const root=elt();api.renderPlayerEvidence(root,player,participants);
  return visit(root,n=>typeof n.textContent==='string').map(n=>n.textContent).join(' | ');}
 assert.match(text(),/Unreported Player of the Game/);
 assert.match(text(),/Game-by-game form/);
 assert.doesNotMatch(text(),/null Player of the Game|0 Player of the Game/);
 player.currentHTORaw.playerOfTheGameCount=0;
 assert.match(text(),/0 Player of the Game/);
});
