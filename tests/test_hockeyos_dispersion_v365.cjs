'use strict';
// Five-iteration ENG61 source and geometric validation; no private datasets.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const b=require('../scripts/hockeyos-dispersion-v365.cjs');
const a=require('../widgets/hockeyos-adaptive-trend-v365.js');
const p=require('../widgets/projection.json'),archive=require('../widgets/player-career-insights.json');
const formats=require('../widgets/league-game-formats.json'),feed=require('../widgets/player-actuals-hourly.json');
const disp=require('../widgets/hockeyos-team-dispersion-v365.json');
const sourceFile=require.resolve('../widgets/projection.json');
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
test('historical reference is qualified and derived from past-only team player seasons',()=>{
 const h=b.historical(archive,formats,p.season);
 assert.equal(h.reference.status,'HISTORICAL_REFERENCE_VERIFIED');
 assert.ok(h.reference.effectiveSample.independentPlayers>=25);
 assert.ok(h.reference.effectiveSample.qualifiedPlayerSeasons>=150);
 assert.equal(h.reference.effectiveSample.sourceGameTypes,'PUBLISHED_ALL_HTO_GAME_TYPES');
 assert.ok(h.records.every(x=>x.seasonKey<b.seasonKey('Winter 2026/2027')&&x.priorGP>=20&&x.priorSeasons>=2));
 assert.ok(h.records.every(x=>x.gp>=5&&x.priorRate>=.20&&Number.isFinite(x.pct)));
 assert.ok(h.reference.neutralAbs<h.reference.coldAbs&&h.reference.neutralAbs<h.reference.hotAbs);
 assert.equal(h.reference.audit.profiles,109);
});
test('historical-derived display is stable and current update is explicitly held for provisional workbook',()=>{
 const cal=a.validate(disp,p);assert.equal(cal.status,'VERIFIED');
 assert.equal(cal.mode,'HISTORICAL_REFERENCE_ONLY');
 assert.equal(cal.weight,0);
 assert.equal(disp.current.status,'HELD');
 assert.equal(disp.current.reason,'FORECAST_PROVISIONAL_OR_UNRECONCILED');
 assert.ok(disp.historical.dispersion>.1&&disp.historical.dispersion<1);
 assert.equal(disp.effective.dispersion,disp.historical.dispersion);
 const q=b.build({now:new Date('2026-10-29T20:00:00Z')});
 assert.equal(q.effective.dispersion,disp.effective.dispersion);
 assert.deepEqual(q.effective.thresholds,disp.effective.thresholds);
});
test('adaptive percentage/dispersion angles follow 0 up, 90 right and 180 down',()=>{
 for(const d of [.13,.31,.65]){
  assert.equal(a.angleFromPercentage(0,d),90);
  const pts=[-10,-1,-.2,-.1,-.001,0,.001,.1,.2,1,10];
  const angles=pts.map(v=>a.angleFromPercentage(v,d));
  for(let i=1;i<angles.length;i++)assert.ok(angles[i]<angles[i-1]);
  assert.ok(angles[0]<180&&angles.at(-1)>0);
  assert.ok(a.angleFromPercentage(-1,d)>90);
  assert.ok(a.angleFromPercentage(1,d)<90);
 }
 assert.equal(a.angleFromPercentage(1,0),null);
 assert.equal(a.angleFromPercentage(Infinity,.3),null);
});
test('inclusive neutral, cold and hot boundaries are exact and independent of source sigma',()=>{
 const t=disp.effective.thresholds;
 assert.equal(a.levelFor(-t.cold,t),'COLD');
 assert.equal(a.levelFor(-t.cold+1e-5,t),'COOL');
 assert.equal(a.levelFor(-t.neutral,t),'NEUTRAL');
 assert.equal(a.levelFor(t.neutral,t),'NEUTRAL');
 assert.equal(a.levelFor(t.neutral+1e-5,t),'WARM');
 assert.equal(a.levelFor(t.hot-1e-5,t),'WARM');
 assert.equal(a.levelFor(t.hot,t),'HOT');
 assert.equal(a.levelFor(0,t),'NEUTRAL');
 const cloned=structuredClone(p);
 cloned.conditionalFormatting.sampleStandardDeviation=null;
 const original=p.players.find(x=>x.name==='Saindon, Stephane');
 // The new display classifies independently of any workbook standard deviation.
 const r=a.classify(original,cloned,disp);
 assert.equal(r.status,'VERIFIED');assert.equal(r.level,'NEUTRAL');
 assert.equal(r.percentage,original.trend);
});
test('published percentages and individual angle remain source-parity exact',()=>{
 const verified=p.players.filter(x=>!x.trendInputs?.firstSeasonOrNoCareer);
 let eligible=0;
 for(const row of verified){
  const r=a.classify(row,p,disp);
  assert.equal(r.status,'VERIFIED',row.name);
  assert.equal(r.percentage,row.trend);
  assert.ok(Math.abs(r.angle-a.angleFromPercentage(row.trend,disp.effective.dispersion))<1e-9);
  assert.ok(r.angle>0&&r.angle<180);
  eligible++;
 }
 assert.ok(eligible>=12);
 assert.equal(a.classify({trend:0,trendInputs:{careerScoringRate:1,projectedScoringRate:2}},p,disp).status,'HELD');
 assert.equal(a.classify({trend:-.1,trendInputs:{firstSeasonOrNoCareer:true}},p,disp).status,'ROOKIE');
 const wrong=structuredClone(disp);wrong.model.projectionExportedAt='2020-01-01';
 assert.equal(a.validate(wrong,p).status,'HELD');
});
test('verified current snapshot can progressively update scale without rewriting historic evidence',()=>{
 const canonical=structuredClone(p);
 canonical.modelCurrent=true;canonical.projectionComplete=true;
 const full=b.build({projection:canonical,now:new Date('2026-10-29T20:00:00Z')});
 assert.equal(full.status,'LIVE_DYNAMIC_VERIFIED');
 assert.equal(full.current.status,'CURRENT_VERIFIED');
 assert.ok(full.current.qualifiedPlayers>=6);
 assert.ok(full.current.weight>0&&full.current.weight<=.8);
 assert.ok(full.effective.dispersion<full.historical.dispersion);
 assert.equal(a.validate(full,canonical).status,'VERIFIED');
 assert.equal(a.validate(full,p).status,'HELD','current flags do not silently leak into provisional source');
 const stale=structuredClone(feed);stale.asOf='2020-01-01T00:00:00Z';
 assert.equal(b.current(canonical,stale,full.historical,new Date('2026-10-29T20:00:00Z')).status,'HELD');
 const wrongGP=structuredClone(feed);wrongGP.teamGP++;
 assert.equal(b.current(canonical,wrongGP,full.historical,new Date('2026-10-29T20:00:00Z')).status,'HELD');
});
test('collective slump is never normalized away or described as neutral',()=>{
 const model=structuredClone(p);model.modelCurrent=true;model.projectionComplete=true;
 for(const row of model.players){
  if(row.trendInputs?.firstSeasonOrNoCareer===true)continue;
  const c=row.trendInputs?.careerScoringRate;
  if(c>0){row.trend=-.4;row.trendInputs.projectedScoringRate=c*.6;}
 }
 const full=b.build({projection:model,now:new Date('2026-10-29T20:00:00Z')});
 assert.equal(full.status,'LIVE_DYNAMIC_VERIFIED');
 assert.ok(full.current.teamMedianDirection<-.3);
 const r=model.players.find(x=>x.name==='Saindon, Stephane');
 const qualified=a.classify(r,model,full);
 assert.equal(qualified.status,'VERIFIED');
 assert.notEqual(qualified.level,'NEUTRAL');
 assert.ok(qualified.angle>90);
});
test('one large outlier cannot control the team median dispersion',()=>{
 const model=structuredClone(p);model.modelCurrent=true;model.projectionComplete=true;
 const normal=b.build({projection:model,now:new Date('2026-10-29T20:00:00Z')});
 const outlier=model.players.find(x=>x.name==='Pagnotta, Alex');
 outlier.trend=4;outlier.trendInputs.projectedScoringRate=outlier.trendInputs.careerScoringRate*5;
 const mutated=b.build({projection:model,now:new Date('2026-10-29T20:00:00Z')});
 assert.ok(mutated.status==='LIVE_DYNAMIC_VERIFIED');
 assert.ok(Math.abs(normal.current.dispersion-mutated.current.dispersion)<.04);
 assert.ok(Math.abs(normal.effective.dispersion-mutated.effective.dispersion)<.02);
});
test('the source workbook, original projection and historical archive were never written by calibration',()=>{
 const next=crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
 assert.equal(next,sourceHash);
 assert.equal(p.model,'BravesRegularSeasonProjection');
 assert.equal(p.modelCurrent,false);
 assert.equal(p.conditionalFormatting.arrowIconSet.type,'5Arrows');
});
