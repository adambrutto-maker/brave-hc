'use strict';
// V3.6 source parity: no calculation forks, no per-category angle snapping.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const published=require('../widgets/projection.json');
const engine=require('../widgets/player-bio-projection-trend.js');
const art=require('../widgets/player-bio-trend-visual-v36.js');
const sigma=published.conditionalFormatting.sampleStandardDeviation;
const thresholds=published.conditionalFormatting.arrowIconSet.thresholds;
test('actual verified sample sigma and all 4 workbook 5Arrows thresholds are unchanged',()=>{
 assert.equal(sigma,0.12046170786292325);
 assert.ok(sigma>0);
 assert.equal(thresholds.AB100,-2*sigma);
 assert.equal(thresholds.AB99,-sigma);
 assert.equal(thresholds.AB97,.5*sigma);
 assert.equal(thresholds.AB96,sigma);
 assert.deepEqual(engine.states.map(v=>v.name),['Cold','Cool','Neutral','Warm','Hot']);
});
test('0=up hottest, 90=right neutral, 180=down coldest: monotonic source sigma, no snapping at end thresholds',()=>{
 const zs=[-30,-8,-3.5,-2.75,-2.3,-2.000001,-2,-1.99999,-1.8,-1.01,-1,-.8,-.2,-.001,0,.001,.25,.5,.8,.99999,1,1.00001,1.25,1.5,3,10,30];
 const angles=zs.map(art.angleFromZ);
 assert.equal(art.angleFromZ(0),90);
 assert.equal(art.angleFromZ(-2),170);
 assert.equal(art.angleFromZ(1),10);
 assert.ok(art.angleFromZ(-30)>179.99999);
 assert.ok(art.angleFromZ(30)<.00001);
 assert.equal(art.angleFromZ(Infinity),null);
 assert.equal(art.angleFromZ(NaN),null);
 for(let i=1;i<angles.length;i++){
  assert.ok(angles[i]<angles[i-1],'must strictly decrease for '+zs[i-1]+' / '+zs[i]);
  assert.ok(angles[i]>0&&angles[i]<180,'no endpoint clamping');
 }
});
test('every distinct published player trend has its own unique calculated angle, ties are exact',()=>{
 const valid=published.players.map(p=>({p,dir:engine.directionalArrow(p,published)}))
   .filter(x=>x.dir.status==='VERIFIED_STANDARD_DEVIATION_ARROW');
 assert.ok(valid.length>=10,'source-qualified skater cohort');
 const all=new Map(),pairs=[];
 for(const {p,dir} of valid){
  const realZ=p.trend/sigma;
  assert.equal(dir.zScore,realZ);
  const angle=art.angleFromZ(dir.zScore);
  assert.ok(angle>0&&angle<180,p.name);
  assert.equal(art.compute(dir.zScore).angle,angle);
  const old=all.get(p.trend);
  if(old!==undefined)assert.equal(angle,old,'identical trend yields same bearing: '+p.name);
  else all.set(p.trend,angle);
  const category=engine.classify(p,published);
  assert.equal(category.name,dir.category);
  pairs.push({name:p.name,trend:p.trend,z:dir.zScore,angle,category:category.name});
 }
 assert.ok(all.size>=7,'distinct source trend values');
 assert.equal(new Set(all.values()).size,all.size,'different published trends must not collapse');
 assert.ok(pairs.some(x=>x.trend>sigma)&&pairs.some(x=>x.trend<0),'positive and negative source cases');
});
test('synthetic extremities beyond workbook thresholds do not collapse into one bearing',()=>{
 const z=[-5,-3,-2.3,-2,-1,-.5,.5,1,1.1,1.27,1.40,2,5];
 for(let i=1;i<z.length;i++)assert.notEqual(art.angleFromZ(z[i]),art.angleFromZ(z[i-1]));
 assert.notEqual(art.angleFromZ(1.2743385655355493),art.angleFromZ(1.4055420847317484));
 assert.ok(art.angleFromZ(1.4055420847317484)>0);
 assert.ok(art.angleFromZ(-2.75)<180);
});
test('V3.6.3 ±5% career tolerance is strictly presentation-only, inclusive, symmetric',()=>{
 assert.equal(art.NEAR_CAREER_TOLERANCE,.05);
 const html=fs.readFileSync(path.join(__dirname,'../widgets/player-bio.html'),'utf8');
 assert.ok(html.includes('player-bio-trend-visual-v36.js?v=3.6.4'));
 assert.ok(html.includes('player-bio-premium.js?v=3.6.8'));
 for(const change of [-.051,-.05001,.05001,.051])
  assert.equal(art.nearCareerAverage(change,'Neutral'),false,'outside ±5%: '+change);
 for(const change of [-.05,-.049,-.025228,0,.015,.049,.05])
  assert.equal(art.nearCareerAverage(change,'Neutral'),true,'within ±5%: '+change);
 for(const other of ['Cold','Cool','Warm','Hot','ROOKIE'])
  assert.equal(art.nearCareerAverage(.02,other),false,'workbook categories unchanged');
 for(const invalid of [null,undefined,NaN,Infinity,-Infinity,'0.02'])
  assert.equal(art.nearCareerAverage(invalid,'Neutral'),false,'invalid trend fails closed');
 const row=published.players.find(p=>p.name==='Carosi, Justin');
 const direction=engine.directionalArrow(row,published);
 assert.equal(direction.status,'VERIFIED_STANDARD_DEVIATION_ARROW');
 assert.equal(direction.category,'Neutral');
 assert.equal(art.nearCareerAverage(direction.sourceValue,direction.category),true);
 assert.equal(art.angleFromZ(direction.zScore),art.compute(direction.zScore).angle);
});
test('visual-only module cannot turn a held or rookie source row into computed data',()=>{
 const rookie=published.players.find(p=>p.trendInputs?.firstSeasonOrNoCareer===true);
 assert.ok(rookie&&engine.directionalArrow(rookie,published).status==='ROOKIE');
 assert.equal(engine.directionalArrow({trend:-.05},{...published,conditionalFormatting:{...published.conditionalFormatting,sampleStandardDeviation:null}}).status,'HELD');
 assert.match(art.badgeMarkup(art.compute(-.75),'qa',70),/v36-element ice/);
 assert.match(art.badgeMarkup(art.compute(.75),'qa',70),/v36-element fire/);
 assert.doesNotMatch(art.badgeMarkup(art.compute(0),'qa',70),/v36-element (ice|fire)/);
 const html=fs.readFileSync(path.join(__dirname,'../widgets/player-bio.html'),'utf8');
 assert.ok(html.includes('player-bio-trend-visual-v36.js?v=3.6'));
 assert.ok(html.includes('player-bio-trend-visual-v36.css?v=3.6'));
 assert.ok(html.includes('player-bio-premium.js?v=3.6'));
});
