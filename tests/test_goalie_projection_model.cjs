'use strict';
// Goalie pilot: synthetic-only tests, no HTO, Excel, awards, records, or schedule writes.
const test=require('node:test'),assert=require('node:assert/strict');
const {forecast}=require('../widgets/goalie-projection-model.js');
const make=()=>({
 sourceVerified:true,currentSourceVerified:true,seasonGames:24,teamGamesPlayed:6,
 current:{gp:2,w:1,l:1,t:0,ga:6},
 history:[{gp:12,w:6,l:6,t:0,ga:36,teamGames:24}],
 confirmedFutureStarts:0,confirmedStartsVerified:false,asOf:'2026-10-28'
});
test('goalie pilot combines historical attendance and observed current starts without changing actual W/GA',()=>{
 const cfg=make(),out=forecast(cfg);
 assert.equal(out.status,'EXPERIMENTAL_SCENARIO');
 assert.equal(out.rates.historyWeight,0.75);
 assert.equal(out.rates.currentWeight,0.25);
 assert.equal(out.forecast.starts,10.25);
 assert.equal(out.forecast.wins,5.125);
 assert.equal(out.forecast.goalsAgainstPerAppearance,3);
 assert.deepEqual(out.actual,{gp:2,w:1,l:1,t:0,ga:6});
 assert.equal(cfg.current.ga,6);
 assert.ok(!Object.hasOwn(out.forecast,'savePct'));
 assert.ok(!Object.hasOwn(out.forecast,'shutouts'));
});
test('as season progresses the current-season evidence gains weighting',()=>{
 const early=make();
 const late=make();late.teamGamesPlayed=18;late.current={gp:10,w:8,l:2,t:0,ga:20};
 const a=forecast(early),b=forecast(late);
 assert.ok(b.rates.currentWeight>a.rates.currentWeight);
 assert.ok(b.rates.historyWeight<a.rates.historyWeight);
 assert.ok(b.rates.futureWinRate>a.rates.futureWinRate);
 assert.ok(b.forecast.starts>=10);
 assert.ok(b.forecast.starts<=16);
});
test('goalie participation must be within team schedule and totals must reconcile',()=>{
 for(const patch of [
  {seasonGames:0},{teamGamesPlayed:25},{current:{gp:7,w:3,l:3,t:1,ga:25}},
  {current:{gp:2,w:1,l:0,t:0,ga:6}},{history:[{gp:10,w:4,l:4,t:1,ga:20,teamGames:24}]},
  {history:[{gp:14,w:7,l:7,t:0,ga:20,teamGames:10}]}
 ]) assert.equal(forecast({...make(),...patch}).status,'HELD');
});
test('cannot infer historical attendance when denominator missing, or treat missing outcomes as zero',()=>{
 const base=make();
 for(const patch of [
  {history:[{gp:10,w:5,l:5,t:0,ga:20}]},
  {current:{gp:2,w:1,l:1,ga:6}},
  {history:[]},
  {sourceVerified:false},{currentSourceVerified:false}
 ]) assert.equal(forecast({...base,...patch}).status,'HELD');
});
test('future confirmed starts are not assumed from roster, and require independent verification',()=>{
 const p=make();p.confirmedFutureStarts=3;
 assert.equal(forecast(p).reason,'FUTURE_STARTS_NOT_VERIFIED');
 p.confirmedStartsVerified=true;
 const x=forecast(p);assert.ok(x.forecast.starts>=p.current.gp+3);
 p.confirmedFutureStarts=20;
 assert.equal(forecast(p).reason,'FUTURE_STARTS_NOT_VERIFIED');
});
test('opponent descriptive intelligence cannot be converted into win probability or goalie win modifier',()=>{
 const b=make();
 const baseline=forecast(b);
 const out=forecast({...b,opponentContext:{sourceVerified:true,
  contextIndex:70,asOf:'2026-10-28',name:'A Verified Opponent'}});
 assert.equal(out.opponentContextStatus,'DESCRIPTIVE_ONLY_NOT_APPLIED_TO_MODEL');
 assert.equal(out.forecast.wins,baseline.forecast.wins);
 assert.equal(out.forecast.goalsAgainstPerAppearance,baseline.forecast.goalsAgainstPerAppearance);
});
test('remaining games zero yields observed actuals and no invented starts',()=>{
 const p=make();p.teamGamesPlayed=24;p.current={gp:12,w:5,l:7,t:0,ga:35};
 const result=forecast(p);
 assert.equal(result.forecast.starts,12);
 assert.equal(result.forecast.wins,5);
 assert.equal(result.forecast.goalsAgainst,35);
 assert.equal(result.forecast.goalsAgainstPerAppearance,35/12);
});
