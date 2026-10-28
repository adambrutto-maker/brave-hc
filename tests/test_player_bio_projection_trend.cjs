'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const trend=require('../widgets/player-bio-projection-trend.js');
const data=require('../widgets/projection.json');
const original=fs.readFileSync(path.join(__dirname,'../widgets/home-premium.js'),'utf8');
test('five trend arrows reproduce homepage state names/colors/rotations',()=>{
 for(const s of trend.states){
  assert.ok(original.includes('name:"'+s.name+'"'),'missing homepage name '+s.name);
  assert.ok(original.includes('rotate:'+s.rotate),'missing homepage rotation '+s.name);
  assert.ok(original.includes('color:"'+s.color+'"'),'different homepage color for '+s.name);
 }
 assert.equal(trend.states.length,5);
});
test('all published players receive identical workbook conditional-formatted trend categories',()=>{
 const th=data.conditionalFormatting.arrowIconSet.thresholds;
 let qualified=0,newPlayers=0;
 for(const p of data.players){
  const res=trend.classify(p,data);
  if(p.trendInputs?.firstSeasonOrNoCareer===true){newPlayers++;assert.equal(res.status,'NEW');continue;}
  if(!Number.isFinite(p.trend)){assert.equal(res.status,'HELD');continue;}
  const idx=p.trend<th.AB100?0:p.trend<th.AB99?1:p.trend<th.AB97?2:p.trend<th.AB96?3:4;
  assert.equal(res.index,idx,p.name);assert.equal(res.status,'VERIFIED_MODEL_TREND');
  assert.equal(res.relativeChange,p.trend);
  assert.equal(res.color,trend.states[idx].color);
  qualified++;
 }
 assert.ok(qualified>0&&newPlayers>0,'need both model evidence groups');
});
test('model result for Justin Carosi is neutral and -2.5% based on career model component not displayed Pts/GP',()=>{
 const p=data.players.find(x=>x.name==='Carosi, Justin');
 const r=trend.classify(p,data);
 assert.equal(r.name,'Neutral');assert.equal(r.symbol,'→');
 assert.ok(Math.abs(r.relativeChange+0.025228)<1e-8);
 assert.equal(r.careerRate,p.trendInputs.careerScoringRate);
 assert.equal(r.modelComponentRate,p.trendInputs.projectedScoringRate);
 assert.notEqual(r.modelComponentRate,p.ptsPerGame);
 assert.equal(r.modelCurrent,false);
});
test('strongly negative, near neutral, warming, hot classifications follow source boundaries',()=>{
 const th=data.conditionalFormatting.arrowIconSet.thresholds;
 for(const [value,idx] of [[th.AB100-1e-6,0],[th.AB100,1],[th.AB99,2],
  [th.AB97,3],[th.AB96,4]]){
  const r=trend.classify({trend:value,trendInputs:{firstSeasonOrNoCareer:false}},data);
  assert.equal(r.index,idx,'threshold '+value);
 }
});
test('missing or malicious model metadata never produces an arrow',()=>{
 for(const bad of [null,{}, {...data,conditionalFormatting:null},
  {...data,conditionalFormatting:{arrowIconSet:{type:'5Arrows',thresholds:{AB100:4,AB99:3,AB97:2,AB96:1}}}}]){
  assert.equal(trend.classify({trend:0},bad).status,'HELD');
 }
 assert.equal(trend.classify({trend:null},data).status,'HELD');
 assert.equal(trend.classify({trend:0,trendInputs:{firstSeasonOrNoCareer:true}},data).status,'NEW');
});
