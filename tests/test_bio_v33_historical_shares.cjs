'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../widgets/player-bio-alltime-share-v33.js');
const a=require('../widgets/player-career-insights.json');
const r=(id,role,metric)=>api.rankMetric(a,String(id),role,metric);
test('source authority and entire 109-profile history are verified without blanks becoming zero',()=>{
 assert.equal(api.validArchive(a),true);
 assert.equal(Object.keys(a.players).length,109);
 assert.equal(Object.values(a.players).filter(p=>p.status==='NO_PUBLISHED_STATS').length,6);
 assert.equal(Object.values(a.players).filter(p=>(p.segments||[]).some(s=>s.kind==='skater')).length,87);
 assert.equal(Object.values(a.players).filter(p=>(p.segments||[]).some(s=>s.kind==='goalie')).length,17);
 const noGoal=r('354043','skater','G');
 assert.equal(noGoal.status,'UNREPORTED_FOR_PLAYER');
 assert.equal(noGoal.sourceCovered,57);
 assert.equal(r('849368','skater','A').status,'VERIFIED_REPORTED_SHARE',
   '1-GP player still participates in ALL-TIME volume ranking');
 assert.equal(r('849368','skater','A').value,1);
 assert.equal(r('849368','skater','A').rateGPThreshold,0);
 const held={...a,players:Object.fromEntries(Object.entries(a.players).slice(1))};
 assert.equal(api.rankMetric(held,'354060','skater','G').status,'SOURCE_HELD',
   'partial historical roster cannot masquerade as full history');
 assert.equal(api.rankMetric({...a,sourceAuthority:'UNVERIFIED'},'354060','skater','G').status,'SOURCE_HELD');
});
test('source-observed skater and full-roster totals match known archived HTO sums',()=>{
 for(const [metric,val,total,observed,rank] of [
  ['GP',303,5049,103,3],['G',153,1405,57,1],['A',220,2020,65,1],
  ['Pts',373,3425,68,1],['GWG',16,162,31,2],['PPG',18,102,28,1],
  ['SHG',6,43,18,1],['GTG',8,41,18,1],['HAT',5,65,16,3],
  ['POTG',53,493,55,2]
 ]){
  const row=r('354060','skater',metric);
  assert.equal(row.status,'VERIFIED_REPORTED_SHARE',metric);
  assert.equal(row.value,val,metric);assert.equal(row.publishedTotal,total,metric);
  assert.equal(row.qualified,observed,metric);assert.equal(row.rank,rank,metric);
  assert.equal(row.allHistoricalProfiles,109);assert.equal(row.rateGPThreshold,0);
  assert.ok(Math.abs(row.sharePct-100*val/total)<1e-9,metric);
 }
 const goals=r('354060','skater','G');
 assert.equal(goals.roleProfiles,87);
 assert.equal(goals.missingMetricCount,46,'103 verified career profiles screened; 57 publish G, including only skaters');
 assert.equal(goals.scope,'all','All-time goals screen skater + goalie archive roles');
});
test('goalie contribution compares historically published totals rather than inventing missing goalie values',()=>{
 for(const [field,count,total,n,rank] of [
 ['GP',262,5049,103,7],['W',124,162,11,1],['SHO',18,21,3,1],['POTG',56,493,55,1]
 ]){
  const x=r('354055','goalie',field);
  assert.equal(x.status,'VERIFIED_REPORTED_SHARE',field);
  assert.deepEqual([x.value,x.publishedTotal,x.qualified,x.rank],[count,total,n,rank],field);
 }
 assert.equal(r('354060','skater','SHO').status,'NOT_APPLICABLE');
 assert.equal(r('354055','goalie','GWG').status,'NOT_APPLICABLE');
});
test('dual-role player counted once per identity, but published role appearances are additive',()=>{
 const p=a.players['354057'];
 assert.equal(p.segments.length,2);
 const total=p.segments.reduce((n,s)=>n+(Number.isFinite(s.total?.GP)?s.total.GP:0),0);
 const res=r('354057','skater','GP');
 assert.equal(res.status,'VERIFIED_REPORTED_SHARE');
 assert.equal(res.value,total);
 assert.equal(res.qualified,103);
 assert.equal(res.roleProfiles,87);
 assert.equal(api.rankMetric(a,'354057','goalie','GP').value,total);
});
test('ties share competition rank and malformed source scoring parity fails closed',()=>{
 const fake=structuredClone(a);
 const justin=fake.players['354060'].segments.find(s=>s.kind==='skater').total;
 const stephen=fake.players['354055'].segments.find(s=>s.kind==='goalie').total;
 stephen.POTG=justin.POTG;
 const a1=api.rankMetric(fake,'354060','skater','POTG');
 const b1=api.rankMetric(fake,'354055','goalie','POTG');
 assert.equal(a1.rank,b1.rank);
 assert.ok(a1.tied>=2);
 const broken=structuredClone(a);
 broken.players['354060'].segments[0].total.Pts+=1;
 assert.equal(api.validArchive(broken),false);
 assert.equal(api.rankMetric(broken,'354060','skater','G').status,'SOURCE_HELD');
});
test('all 109 historical profiles can be evaluated without invalid inferred zero shares',()=>{
 let qualified=0,held=0,hasMetrics=0;
 for(const [id,p]of Object.entries(a.players)){
  if(p.status==='NO_PUBLISHED_STATS'){held++;continue;}
  qualified++;
  const role=p.segments.some(s=>s.kind==='skater')?'skater':'goalie';
  const out=api.analyzePlayer(a,id,role);
  assert.equal(out.status,'SOURCE_CALCULATED');
  assert.equal(out.archiveSize,109);
  assert.ok(out.metrics.length>0);
  for(const m of out.metrics){
   assert.ok(Number.isFinite(m.sharePct)&&m.sharePct>=0&&m.sharePct<=100);
   assert.ok(m.qualified>0&&m.qualified<=103);
   assert.ok(m.rank>=1&&m.rank<=m.qualified);
   assert.ok(m.publishedTotal>0);
  }
  if(out.metrics.length)hasMetrics++;
 }
 assert.equal(qualified,103);assert.equal(held,6);assert.equal(hasMetrics,103);
});
