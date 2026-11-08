'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assess,MAX_READBACK_AGE}=require('../widgets/home-embedded-projection-gate.js');
const now=Date.parse('2026-11-08T02:40:00Z');
const base=()=>{
 const hto=6;
 return {
  schema:'brave-hc-workbook-projection/v1',
  publicationStatus:'HTO_MODEL_CURRENT',
  modelCurrent:true,projectionComplete:true,
  total:{points:183},players:[{name:'Fixture Player'}],
  modelParity:{replayedRows:21,mismatches:0},
  sourceInputs:{workbookRecordedTeamGP:hto,htoRecordedTeamGP:hto,verifiedHTOBoxscoreGP:hto},
  htoreadback:'2026-11-07T23:40:00Z'
 };
};
test('source-equivalent fresh verified coverage admits an embedded forecast',()=>{
 assert.deepEqual(assess(base(),now),{ok:true,reason:'SOURCE_COVERAGE_RECONCILED'});
});
test('P1: real baseline shape, source workbook 1 GP vs official HTO 6 GP is HELD even when modelCurrent=true',()=>{
 const m=base();m.sourceInputs.workbookRecordedTeamGP=1;
 assert.equal(assess(m,now).reason,'WORKBOOK_HTO_GAME_COVERAGE_MISMATCH');
});
test('modelCurrent=false is HELD even when all counters agree',()=>{
 const m=base();m.modelCurrent=false;
 assert.equal(assess(m,now).reason,'MODEL_NOT_CURRENT');
});
test('projectionComplete=false or publicationStatus unverified is HELD',()=>{
 const a=base();a.projectionComplete=false;assert.equal(assess(a,now).reason,'MODEL_NOT_CURRENT');
 const b=base();b.publicationStatus='PROVISIONAL';assert.equal(assess(b,now).reason,'MODEL_NOT_CURRENT');
});
test('replay mismatches, null and zero row counts are HELD',()=>{
 const a=base();a.modelParity.mismatches=1;assert.equal(assess(a,now).reason,'MODEL_PARITY_UNVERIFIED');
 const b=base();b.modelParity.replayedRows=0;assert.equal(assess(b,now).reason,'MODEL_PARITY_UNVERIFIED');
 const c=base();delete c.modelParity;assert.equal(assess(c,now).reason,'MODEL_PARITY_UNVERIFIED');
});
test('independent HTO and verified boxscore counts also must agree',()=>{
 const a=base();a.sourceInputs.htoRecordedTeamGP=5;assert.equal(assess(a,now).reason,'WORKBOOK_HTO_GAME_COVERAGE_MISMATCH');
 const b=base();a.sourceInputs.workbookRecordedTeamGP=0;assert.equal(assess(a,now).ok,false);
 const c=base();delete c.sourceInputs;assert.equal(assess(c,now).reason,'WORKBOOK_HTO_GAME_COVERAGE_MISMATCH');
});
test('non-integer and speculative source coverage never qualifies',()=>{
 for(const gap of [6.5,'6',-1,NaN,null]){
  const m=base();m.sourceInputs.verifiedHTOBoxscoreGP=gap;
  assert.equal(assess(m,now).ok,false);
 }
});
test('stale, future, unparsable or absent HTO readbacks are HELD',()=>{
 const a=base();a.htoreadback=new Date(now-MAX_READBACK_AGE-1).toISOString();
 assert.equal(assess(a,now).reason,'HTO_READBACK_NOT_FRESH');
 const b=base();b.htoreadback=new Date(now+1).toISOString();
 assert.equal(assess(b,now).reason,'HTO_READBACK_NOT_FRESH');
 const c=base();c.htoreadback='unknown';
 assert.equal(assess(c,now).reason,'HTO_READBACK_NOT_FRESH');
 const e=base();delete e.htoreadback;
 assert.equal(assess(e,now).reason,'HTO_READBACK_NOT_FRESH');
});
test('invalid or empty model schema, players or points always held',()=>{
 const a=base();a.schema='other';assert.equal(assess(a,now).reason,'INVALID_MODEL_SCHEMA');
 const b=base();b.players=[];assert.equal(assess(b,now).reason,'INVALID_MODEL_SCHEMA');
 const c=base();c.total.points=Infinity;assert.equal(assess(c,now).reason,'INVALID_MODEL_SCHEMA');
 const e=base();e.total.points=-2;assert.equal(assess(e,now).reason,'INVALID_MODEL_SCHEMA');
});
