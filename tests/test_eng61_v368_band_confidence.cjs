'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto');
const engine=require('../widgets/hockeyos-adaptive-trend-v365.js');
const generator=require('../scripts/hockeyos-dispersion-v365.cjs');
const projection=require('../widgets/projection.json');
const actual=require('../widgets/player-actuals-hourly.json');
const doc=require('../widgets/hockeyos-team-dispersion-v365.json');
const currentRows=projection.players.filter(p=>!p.trendInputs?.firstSeasonOrNoCareer&&Number.isFinite(p.trend));
const recent=require('../widgets/player-form-appearances-v364.json');
const crossSeason=require('../widgets/player-form-cross-season-v367.json');
const projectionFile=require.resolve('../widgets/projection.json');
const projectionHashAtStart=crypto.createHash('sha256').update(fs.readFileSync(projectionFile)).digest('hex');
// Source-derived synthetic fixture for tests only; production projection/HTO actuals are immutable.
function coherentFiveGameFixture(){
 const model=structuredClone(projection);
 model.modelCurrent=false;model.projectionComplete=false;
 model.sourceInputs.htoRecordedTeamGP=actual.teamGP;
 const official=new Map(actual.players.map(row=>[row.name,row]));
 for(const row of model.players){
  const matched=official.get(row.name);
  row.currentGP=matched?.gp??0;
  row.currentG=matched?.g??0;
  row.currentA=matched?.a??0;
 }
 const derived=generator.build({projection:model,actual,now:new Date('2026-10-29T20:00:00Z')});
 return {model,derived};
}
test('approved five-degree neutral with 3.5% cap and 0.5 dispersion outer with 20% cap',()=>{
 assert.equal(engine.BAND_POLICY.key,'NEUTRAL_5DEG_MAX_3P5_OUTER_HALF_D_MAX_20');
 for(const D of [.1293830181,.20,.3143095874713521,.50,.6531944]){
  const t=engine.thresholdsFor(D);
  assert.ok(t.neutral>0&&t.neutral<=.035+1e-12);
  assert.ok(t.hot>0&&t.hot<=.20+1e-12);
  assert.ok(t.cold>t.neutral);
  assert.equal(t.hot,t.cold);
  assert.ok(Math.abs(t.neutral-Math.min(D*Math.tan(5*Math.PI/180),.035))<1e-12);
  assert.ok(Math.abs(t.hot-Math.min(D*.5,.20))<1e-12);
  const dev=Math.abs(engine.angleFromPercentage(t.neutral,D)-90);
  assert.ok(dev<=5+1e-10,'Neutral arrow no more than 5 degrees off horizontal');
  const p=t.neutral+.00001;
  assert.equal(engine.levelFor(p,t),'WARM');
  assert.equal(engine.levelFor(-p,t),'COOL');
  assert.equal(engine.levelFor(t.hot,t),'HOT');
  assert.equal(engine.levelFor(-t.cold,t),'COLD');
  assert.equal(engine.levelFor(t.neutral,t),'NEUTRAL');
  assert.equal(engine.levelFor(-t.neutral,t),'NEUTRAL');
 }
 assert.equal(engine.thresholdsFor(0),null);
 assert.equal(engine.thresholdsFor(Infinity),null);
});
test('published team scale is historically qualified but the band values are adaptive, symmetrical and capped',()=>{
 assert.equal(doc.version,'3.6.8');
 assert.equal(doc.status,'HISTORICAL_REFERENCE_ONLY');
 const r=engine.validate(doc,projection);assert.equal(r.status,'VERIFIED');
 assert.equal(r.mode,'HISTORICAL_REFERENCE_ONLY');
 assert.equal(doc.effective.weight,0);
 assert.ok(Math.abs(r.thresholds.neutral-.027498525741253107)<1e-10);
 assert.ok(Math.abs(r.thresholds.cold-.15715479373567606)<1e-10);
 assert.equal(r.thresholds.cold,r.thresholds.hot);
 assert.equal(doc.effective.bandPolicy.outerMaximumFraction,.20);
 const old=doc.historical.playerWeightedQuantiles;
 assert.ok(old.negativeAbsP50>r.thresholds.cold);
 assert.ok(old.positiveAbsP50>r.thresholds.hot);
 const invalid=structuredClone(doc);invalid.effective.thresholds.neutral=.13;
 assert.equal(engine.validate(invalid,projection).status,'HELD','tampered restored huge neutral rejected');
 const changed=structuredClone(doc);changed.effective.bandPolicy.outerMaximumFraction=.35;
 assert.equal(engine.validate(changed,projection).status,'HELD','unapproved wider extreme rejected');
});
test('current cohort now has achievable HOT/COLD with no forced bell-curve distribution',()=>{
 for(const row of currentRows){
  const state=engine.classify(row,projection,doc);
  assert.equal(state.status,'VERIFIED',row.name);
  assert.equal(state.percentage,row.trend,'source percentage unchanged');
  assert.ok(Math.abs(state.angle-engine.angleFromPercentage(row.trend,doc.effective.dispersion))<1e-10);
  assert.equal(state.level,engine.levelFor(row.trend,doc.effective.thresholds),'source change classified by approved bands');
 }
 const hist=new Map();
 for(const row of currentRows){
  const state=engine.classify(row,projection,doc);
  hist.set(state.level,(hist.get(state.level)||0)+1);
 }
 assert.equal([...hist.values()].reduce((a,n)=>a+n,0),currentRows.length);
 assert.ok((hist.get('COLD')||0)>0,'source admits actual cold-direction data without forced ranks');
 assert.ok((hist.get('HOT')||0)>0,'source admits actual hot-direction data without forced ranks');
 assert.ok((hist.get('NEUTRAL')||0)<currentRows.length,'not every player is automatically neutral');
});
test('HTO GP mismatch holds live evidence; synthetic source parity still differentiates GP tiers',()=>{
 const live=engine.classify(projection.players.find(p=>p.name==='Provenzano, Mario'),projection,doc);
 assert.equal(live.evidence.status,'HELD');
 assert.equal(live.evidence.tier,'UNVERIFIED');
 const {model,derived}=coherentFiveGameFixture();
 assert.equal(derived.status,'HISTORICAL_REFERENCE_ONLY');
 assert.equal(derived.playerEvidence.status,'VERIFIED_CURRENT_HTO_GP_ONLY');
 assert.equal(engine.validate(derived,model).status,'VERIFIED');
 const mario=model.players.find(p=>p.name==='Provenzano, Mario');
 const lorcan=model.players.find(p=>p.name==='Duffy, Lorcan');
 const a=engine.classify(mario,model,derived);
 const b=engine.classify(lorcan,model,derived);
 assert.equal(a.evidence.tier,'MORE_OBSERVED_GAMES');assert.equal(a.evidence.verifiedGP,5);
 assert.equal(b.evidence.tier,'LIMITED_SAMPLE');assert.equal(b.evidence.verifiedGP,1);
 for(const x of [a.evidence,b.evidence]){
  assert.equal(x.status,'VERIFIED');
  assert.ok(x.groupSize>=1);
  assert.equal(x.forecastProvisional,true);
 }
 assert.equal(engine.classify(model.players.find(p=>p.name==='Saindon, Stephane'),model,derived).evidence.tier,'DEVELOPING_SAMPLE');
 const missing=engine.classify(model.players.find(p=>p.name==='Mazzei, Stefano'),model,derived);
 assert.equal(missing.evidence.tier,'NO_VERIFIED_CURRENT_APPEARANCES');
 assert.equal(missing.evidence.verifiedGP,null);
 assert.equal(missing.evidence.status,'HELD');
});
test('HTO official GP evidence is independent of forecast readiness and fails closed on mismatch',()=>{
 const real=generator.playerEvidence(projection,actual);
 assert.equal(real.status,'HELD');
 assert.equal(real.reason,'OFFICIAL_CURRENT_GP_SOURCE_OR_TEAM_GAMES_MISMATCH');
 assert.deepEqual(real,doc.playerEvidence,'published evidence never contradicts source mismatch');
 const {model,derived}=coherentFiveGameFixture();
 const assessment=generator.playerEvidence(model,actual);
 assert.equal(assessment.status,'VERIFIED_CURRENT_HTO_GP_ONLY');
 assert.equal(assessment.officialPlayerCount,actual.players.length);
 assert.equal(Object.values(assessment.sampleSizeTiers).reduce((a,n)=>a+n,0),model.players.length);
 assert.deepEqual(assessment,derived.playerEvidence,'synthetic source-coherent certificate parity');
 for(const player of assessment.players)assert.equal(player.forecastProvisional,true);
 const duplicate=structuredClone(actual);duplicate.players.push(duplicate.players[0]);
 assert.equal(generator.playerEvidence(model,duplicate).status,'HELD');
 const stale=structuredClone(actual);stale.teamGP+=1;
 assert.equal(generator.playerEvidence(model,stale).status,'HELD');
 const wrong=structuredClone(actual);wrong.players[0].gp+=1;
 assert.equal(generator.playerEvidence(model,wrong).status,'HELD');
 const uncertified=structuredClone(derived);uncertified.playerEvidence.teamGP+=1;
 const mario=model.players.find(p=>p.name==='Provenzano, Mario');
 assert.equal(engine.evidenceFor(mario,model,uncertified).status,'HELD');
 assert.equal(engine.classify(mario,model,uncertified).level,engine.classify(mario,model,derived).level,
  'GP evidence hold cannot rewrite the independently sourced performance temperature');
});
test('live dynamic calibration preserves independent model evidence and does not normalize everyone to Neutral',()=>{
 const m=structuredClone(projection);
 m.modelCurrent=true;m.projectionComplete=true;
 // Synthetic positive-control: the real 6-v-5 HTO source mismatch remains held.
 m.sourceInputs.htoRecordedTeamGP=actual.teamGP;
 const verified=generator.build({projection:m,now:new Date('2026-10-29T20:00:00Z')});
 assert.equal(verified.status,'LIVE_DYNAMIC_VERIFIED');
 assert.equal(engine.validate(verified,m).status,'VERIFIED');
 assert.ok(verified.effective.thresholds.neutral<=.035);
 assert.ok(verified.effective.thresholds.hot<=.2);
 assert.ok(verified.current.independentModelSignals<=verified.current.qualifiedPlayers);
 for(const sign of [-.4,.4]){
  const changed=structuredClone(m);
  for(const row of changed.players){
   if(row.trendInputs?.firstSeasonOrNoCareer)continue;
   const c=row.trendInputs?.careerScoringRate;
   if(c>0){row.trend=sign;row.trendInputs.projectedScoringRate=c*(1+sign);}
  }
  const next=generator.build({projection:changed,now:new Date('2026-10-29T20:00:00Z')});
  assert.equal(next.status,'LIVE_DYNAMIC_VERIFIED');
  const qualified=changed.players.filter(x=>x.trendInputs?.firstSeasonOrNoCareer!==true&&x.trendInputs?.careerScoringRate>0);
  const states=qualified.map(x=>engine.classify(x,changed,next));
  assert.ok(states.every(x=>x.status==='VERIFIED'));
  assert.ok(states.every(x=>x.level===(sign<0?'COLD':'HOT')),
   'whole team may be COLD or HOT without forced ranks');
  assert.equal(Math.sign(next.current.teamMedianDirection),Math.sign(sign));
 }
});
test('original workbook, 463 records and season-agnostic verified form remain unchanged',()=>{
 assert.equal(projection.conditionalFormatting.arrowIconSet.type,'5Arrows');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(projectionFile)).digest('hex'),projectionHashAtStart);
 assert.deepEqual(projection,JSON.parse(fs.readFileSync(projectionFile,'utf8')));
 assert.equal(recent.status,'VERIFIED_COMPLETE_PLAYER_APPEARANCES');
 assert.equal(crossSeason.status,'VERIFIED_SEASON_SCOPED_CROSS_SEASON_APPEARANCES');
 assert.ok(fs.readFileSync(require.resolve('../widgets/projection.json')).length>5000);
});
