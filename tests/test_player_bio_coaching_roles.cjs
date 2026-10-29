'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../widgets/player-bio-coaching-roles.js');
test('Brave H.C. public coaching role bank uses C RW LW LD RD and goalie without fake individual assignments',()=>{
 assert.deepEqual(Object.keys(model.positions),['C','RW','LW','LD','RD','G']);
 assert.equal(model.sourceScope,'GENERAL_1_2_2_TEAM_FRAMEWORK_NO_PRIVATE_COACHING');
 assert.equal(model.publishedIndividualAssignments,false);
 for(const [code,details] of Object.entries(model.positions)){
   const v=model.explore(code);
   assert.equal(v.status,'GENERAL_TEAM_STRATEGY_ONLY');
   assert.equal(v.code,code);assert.ok(v.title&&v.withPuck&&v.withoutPuck&&v.transition&&v.cue);
   assert.match(v.notice,/not a confirmed player assignment/i);
   assert.ok(!JSON.stringify(v).match(/htosports\.com|playerId|coachNote|appointment|booking/i));
 }
});
test('goalie role may default only when source verified goalie-only identity exists',()=>{
 assert.equal(model.defaultForIdentity(true,false),'G');
 assert.equal(model.defaultForIdentity(true,true),null);
 assert.equal(model.defaultForIdentity(false,true),null);
 assert.equal(model.defaultForIdentity(null,null),null);
});
test('invalid or private assignment-like roles are declined rather than inferred',()=>{
 assert.equal(model.explore('F1').status,'NO_VERIFIED_SELECTION');
 assert.equal(model.explore('D2').status,'NO_VERIFIED_SELECTION');
 assert.equal(model.explore('RW/LD').status,'NO_VERIFIED_SELECTION');
 assert.equal(model.explore('Justin Carosi').status,'NO_VERIFIED_SELECTION');
});
