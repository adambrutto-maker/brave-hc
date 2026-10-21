'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {inventory,argumentsAt}=require('../scripts/hockeyos_awards_composition_inventory');
const capture=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/261020_Awards_Original_Formula_Capture.json'),'utf8'));
test('all eight composite models and two count titles retain separate source chains',()=>{
 const d=inventory(capture);
 assert.equal(Object.keys(d.models).length,8);assert.equal(Object.keys(d.scoringTitles).length,2);
 assert.equal(d.publicationAuthorized,false);assert.equal(d.currentScoresVerified,false);
 assert.equal(d.playerInfoInputsRecalculated,false);
 for(const model of Object.values(d.models)){
  assert.ok(model.rawFormula.formula&&model.eligibilityFormula.formula&&model.finalFormula.formula&&model.rankKeyFormula.formula);
  assert.ok(model.dependencies.externalFields.PlayerInfo.length);
  assert.equal(model.dependencies.externalValuesVerifiedByThisInventory,false);
 }
 assert.ok(!Object.hasOwn(d.models,'hof'));
});
test('twelve ordinary role branches preserve source weights totaling one',()=>{
 const d=inventory(capture);
 for(const id of ['hart','conn-smythe','rookie','lady-byng','rolaids','dedication'])
  for(const role of ['skater','goalie'])assert.ok(Math.abs(d.models[id].roles[role].coefficientTotal-1)<1e-9);
 assert.equal(d.models.hart.roles.skater.weights.find(w=>w.field==='Total Final Pts Web Display Score').coefficient,.25);
 assert.equal(d.models.dedication.roles.goalie.weights.find(w=>w.field==='Current True Attd. % Web Display Score').coefficient,.45);
});
test('Norris utility reduction and lower position constant are never renormalized',()=>{
 const d=inventory(capture).models.norris.roles;
 assert.ok(Math.abs(d.defence.coefficientTotal-1)<1e-9);
 assert.ok(Math.abs(d.utility.coefficientTotal-.975)<1e-9);
 assert.equal(d.utility.positionConstant.value,88);assert.equal(d.defence.positionConstant.value,100);
 assert.equal(d.utility.weights.find(w=>w.field==='Total Final Pts Web Display Score').coefficient,.075);
 assert.equal(d.utility.renormalize,false);
});
test('improvement retains seven signed rate expressions per role, not normalized attribute scores',()=>{
 const d=inventory(capture).models.improved.roles;
 for(const role of ['skater','goalie']){
  assert.equal(d[role].components.length,7);
  assert.equal(d[role].kind,'SIGNED_RELATIVE_RATE_CHANGES_NOT_WEB_SCORES');
  assert.ok(Math.abs(d[role].components.reduce((a,c)=>a+c.coefficient,0)-1)<1e-9);
 }
 assert.match(d.goalie.components[1].expression,/Career Prior Total Goalie GAA/);
 assert.match(d.goalie.components[1].expression,/Current Total Goalie GAA/);
});
test('source dependencies include roster denominators and playoff season coverage',()=>{
 const d=inventory(capture);
 assert.ok(d.models.rolaids.dependencies.externalFields.RosterStatusBySeason.includes('Total Games'));
 assert.ok(d.models['conn-smythe'].dependencies.externalFields.SeasonInfo.includes('Total Games Contested'));
 assert.ok(d.scoringTitles['art-ross'].dependencies.externalFields.PlayerInfo.includes('Current Skater Playoff GP'));
});
test('source branch coefficient loss and unknown dependency reject incomplete mapping',()=>{
 const bad=structuredClone(capture),col=bad.columns.find(c=>c.name==='Hart Raw Composite Score');
 col.formula=col.formula.replace('*0.25','*0.24');col.firstStoredFormula.formula=col.formula;
 assert.throws(()=>inventory(bad),/coefficient total/);
 const missing=structuredClone(capture);missing.columns.find(c=>c.name==='Current True Attd. % Web Display Score').name='REMOVED_SOURCE_FIELD';
 assert.throws(()=>inventory(missing),/Unknown source component/);
});
test('argument parsing respects structured-reference commas and quoted commas',()=>{
 assert.deepEqual(argumentsAt('F(AwardScoring[[#This Row],[Name]],"a,b",G(1,2))',2),['AwardScoring[[#This Row],[Name]]','"a,b"','G(1,2)']);
 assert.throws(()=>argumentsAt('F("unfinished)',2),/Incomplete/);
});

