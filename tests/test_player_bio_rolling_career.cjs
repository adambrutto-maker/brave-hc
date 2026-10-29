'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../widgets/player-bio-rolling-career.js');
const cfg=require('../widgets/league-game-formats.json');
const saved=require('../widgets/player-career-insights.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,'not equal '+a+' != '+b);
const sample=[
 {Season:'Summer 2013',GP:5,G:6,A:4,Pts:10},
 {Season:'Winter 2013/2014',GP:10,G:4,A:6,Pts:10},
 {Season:'Summer 2014',GP:5,G:5,A:5,Pts:10}
];
test('prior-career benchmark is past-only: first season never compares with its future seasons',()=>{
 const result=model.calculate([...sample].reverse(),cfg,'winter');
 assert.equal(result.status,'SOURCE_CALCULATED');
 assert.equal(result.entries[0].season,'Summer 2013');
 assert.equal(result.entries[0].priorRate,null);
 close(result.entries[1].priorRate,10*(2/3)/5);
 close(result.entries[2].priorRate,(10*(2/3)+10)/15);
 close(result.fullCareerRate,(10*(2/3)+10+10*(2/3))/20);
 assert.notEqual(result.entries[1].priorRate,result.fullCareerRate);
 assert.ok(result.entries[1].difference<0,'Winter 2013-14 lower than entering career rate');
 assert.ok(result.entries[2].difference>0,'Summer 2014 stronger than prior career rate');
});
test('rolling source keeps GP weighting, preserves official actuals and compares both conversion directions',()=>{
 const original=JSON.stringify(sample);
 const actual=model.calculate(sample,cfg,'actual');
 const winter=model.calculate(sample,cfg,'winter');
 const summer=model.calculate(sample,cfg,'summer');
 close(actual.entries[1].priorRate,2);
 close(winter.entries[1].priorRate,4/3);
 close(summer.entries[1].priorRate,2);
 close(summer.entries[2].priorRate,(10+15)/15);
 assert.equal(JSON.stringify(sample),original);
 assert.equal(actual.scope,'ALL_PUBLISHED_GAME_TYPES_BY_SEASON');
});
test('a source-incomplete season never becomes zero and taints later career baselines',()=>{
 const incomplete=[sample[0],{Season:'Winter 2013/2014',GP:6},sample[2]];
 const s=model.calculate(incomplete,cfg,'winter');
 assert.equal(s.entries[1].currentStatus,'HELD');
 assert.equal(s.entries[2].priorStatus,'EARLIER_SOURCE_INCOMPLETE');
 assert.equal(s.entries[2].priorRate,null);
 assert.equal(s.fullCareerRate,null);
 assert.equal(s.complete,false);
});
test('zero explicitly confirmed appearances add no points and do not fabricate a performance rate',()=>{
 const rows=[sample[0],{Season:'Winter 2013/2014',GP:0,G:0,A:0,Pts:0},sample[2]];
 const v=model.calculate(rows,cfg,'winter');
 assert.equal(v.entries[1].currentStatus,'NO_APPEARANCE');
 assert.equal(v.entries[1].currentRate,null);
 close(v.entries[2].priorRate,4/3);
 assert.equal(v.complete,true);
});
test('unsupported seasons, duplicated source periods, missing duration mapping fail closed',()=>{
 assert.equal(model.calculate([{Season:'Year 2018'}],cfg,'winter').status,'HELD');
 assert.equal(model.calculate([sample[0],sample[0]],cfg,'winter').reason,'DUPLICATE_SEASON_ROWS');
 assert.equal(model.calculate(sample,cfg,'unknown').reason,'SOURCE_OR_BASIS_INVALID');
 const missingFormat=structuredClone(cfg);
 delete missingFormat.seasonBindings['Winter 2013/2014::ALL_HTO_GAME_TYPES'];
 const v=model.calculate(sample,missingFormat,'winter');
 assert.equal(v.entries[1].currentStatus,'HELD');
 assert.equal(v.entries[2].priorRate,null);
 assert.equal(v.complete,false);
});
test('every available HTO career segment is assessed with no double-counted season IDs',()=>{
 let valid=0,held=0;
 for(const p of Object.values(saved.players||{})){
  const seg=p.segments?.find(x=>x.kind==='skater');
  if(!seg)continue;
  const before=JSON.stringify(seg);
  const result=model.calculate(seg.seasons||[],cfg,'winter');
  if(result.status==='HELD'){held++;continue;}
  valid++;
  assert.equal(JSON.stringify(seg),before);
  assert.equal(new Set(result.entries.map(x=>x.season)).size,result.entries.length);
  assert.ok(result.entries.every(x=>x.priorRate===null||x.priorRate>=0));
 }
 assert.ok(valid>=70,'evaluated only '+valid+' skater profiles');
});
