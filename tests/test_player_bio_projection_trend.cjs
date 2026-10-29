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
  if(p.trendInputs?.firstSeasonOrNoCareer===true){newPlayers++;assert.equal(res.status,'ROOKIE');continue;}
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
 assert.equal(trend.classify({trend:0,trendInputs:{firstSeasonOrNoCareer:true}},data).status,'ROOKIE');
});

test('the polished σ-based arrow is continuously angled and remains downward even for mildly negative Neutral trends',()=>{
 const p=data.players.find(x=>x.name==='Carosi, Justin');
 const a=trend.directionalArrow(p,data),b=trend.directionalArrow({...p,trend:p.trend-.02},data);
 assert.equal(a.status,'VERIFIED_STANDARD_DEVIATION_ARROW');
 assert.equal(a.category,'Neutral');
 assert.equal(a.direction,'BELOW');
 assert.ok(a.angleDegrees<0,'negative trend must point down');
 assert.ok(a.renderRotationDegrees>0,'SVG rotation direction must point down');
 assert.equal(b.category,'Neutral');
 assert.ok(b.angleDegrees<a.angleDegrees,'more negative value tilts further downward');
 assert.notEqual(b.color,a.color,'color strength changes continuously with z');
 assert.ok(Math.abs(a.zScore-p.trend/data.conditionalFormatting.sampleStandardDeviation)<1e-12);
});
test('zero points horizontally and positive/negative magnitudes angle from the same standard-deviation baseline',()=>{
 const make=t=>({trend:t,trendInputs:{firstSeasonOrNoCareer:false}});
 const sigma=data.conditionalFormatting.sampleStandardDeviation;
 const zero=trend.directionalArrow(make(0),data);
 assert.equal(zero.angleDegrees,0);assert.equal(zero.direction,'AT');
 const negative=trend.directionalArrow(make(-.25*sigma),data);
 const positive=trend.directionalArrow(make(.25*sigma),data);
 assert.equal(negative.category,'Neutral');
 assert.equal(positive.category,'Neutral');
 assert.equal(negative.direction,'BELOW');
 assert.equal(positive.direction,'ABOVE');
 assert.equal(negative.angleDegrees,-7.5);
 assert.equal(positive.angleDegrees,7.5);
 assert.notEqual(negative.color,positive.color);
});
test('greater than ±2 workbook standard deviations saturates angle but does not alter the original classification',()=>{
 const make=t=>({trend:t,trendInputs:{firstSeasonOrNoCareer:false}});
 const sigma=data.conditionalFormatting.sampleStandardDeviation;
 const cold=trend.directionalArrow(make(-5*sigma),data),hot=trend.directionalArrow(make(5*sigma),data);
 assert.equal(cold.angleDegrees,-60);
 assert.equal(hot.angleDegrees,60);
 assert.equal(cold.category,'Cold');assert.equal(hot.category,'Hot');
 assert.equal(cold.capped,true);assert.equal(hot.capped,true);
});
test('first-season users show ROOKIE, not NEW, with no invented angle or color',()=>{
 const rookie=data.players.find(p=>p.trendInputs?.firstSeasonOrNoCareer===true);
 assert.ok(rookie);
 const c=trend.classify(rookie,data),a=trend.directionalArrow(rookie,data);
 assert.equal(c.status,'ROOKIE');
 assert.equal(c.symbol,'ROOKIE');
 assert.equal(a.status,'ROOKIE');
 assert.equal(a.angleDegrees,undefined);
});
test('missing workbook sigma or source threshold mismatch holds the arrow rather than estimating it',()=>{
 const make={trend:-.05,trendInputs:{firstSeasonOrNoCareer:false}};
 assert.equal(trend.directionalArrow(make,{...data,conditionalFormatting:{...data.conditionalFormatting,sampleStandardDeviation:null}}).status,'HELD');
 const conflict={...data,conditionalFormatting:{...data.conditionalFormatting,sampleStandardDeviation:.01}};
 assert.equal(trend.directionalArrow(make,conflict).status,'HELD');
});
