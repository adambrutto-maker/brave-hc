'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const chrono=require('../widgets/player-bio-form-model-v364.js');
const timeline=require('../widgets/player-form-cross-season-v367.json');
const current=require('../widgets/player-form-appearances-v364.json');
const actual=require('../widgets/player-actuals-hourly.json');
const byName=new Map(actual.players.map(p=>[p.name,p]));
const form=(id,n,source=timeline,seed=current)=>chrono.getCrossSeasonWindow(source,seed,id,n);
test('user-requested last-ten crosses previous season, including actual playoffs',()=>{
 const cases=[
  ['354060',.9,['W2026/27','W2025/26']],
  ['738846',1.2,['W2026/27','W2025/26']],
  ['356089',.9,['W2026/27','W2025/26','W2024/25']]
 ];
 for(const [id,rate,seasons] of cases){
  const r=form(id,10);
  assert.equal(r.status,'VERIFIED','Last 10 source qualified '+id);
  assert.equal(r.gp,10);
  assert.ok(Math.abs(r.rate-rate)<1e-12);
  assert.ok(Math.abs(r.winterEquivalentRate-r.rate)<1e-12,
   'same Winter game format means raw and Winter-equivalent rates match');
  assert.deepEqual(r.sourceSeasons,seasons);
  assert.equal(r.gameIds.length,10);
  assert.equal(r.includesPriorSeason,true);
  assert.equal(r.basis,'LAST_N_VERIFIED_BRAVE_HTO_PLAYER_APPEARANCES_ACROSS_SEASONS');
 }
 assert.equal(form('354060',10).includesPlayoffs,true);
});
test('Last 3/5 retain exact same rate when current verified GP already covers the window',()=>{
 let tested=0;
 for(const [id,p] of Object.entries(current.players)){
  const official=byName.get(p.name);
  assert.ok(official);
  for(const n of [3,5]){
   if(p.gp<n)continue;
   const now=chrono.getRecentWindow(current,id,current.season,official,n);
   const across=form(id,n);
   assert.equal(now.status,'VERIFIED');
   assert.equal(across.status,'VERIFIED');
   assert.ok(Math.abs(now.rate-across.rate)<1e-12,'recent current appearances parity '+id+' n '+n);
   assert.equal(across.sourceSeasons[0],current.season);
   tested++;
  }
 }
 assert.ok(tested>=15);
});
test('short-window players without historical evidence are held, never filled with guesses',()=>{
 for(const id of ['769343','846200','849368','845365','843644','845364','847926']){
  assert.equal(form(id,10).status,'HELD');
  assert.equal(form(id,10).reason,'INSUFFICIENT_VERIFIED_BRAVE_APPEARANCES');
 }
 assert.equal(form('769343',3).status,'HELD');
 assert.equal(form('846200',5).status,'VERIFIED');
});
test('individual chronology uses official 2026 March 22 doubleheader times',()=>{
 const p=timeline.players['354060'];
 const both=p.games.filter(g=>g.date==='2026-03-22');
 assert.deepEqual(both.map(x=>x.time),['20:45','19:15']);
 assert.deepEqual(both.map(x=>x.gameId),[2215014,2215015]);
 assert.equal(p.games[0].date,'2026-10-25');
 assert.equal(p.games[9].date,'2026-02-22');
});
test('stale current feeds cannot unlock archived Last 10',()=>{
 const stale=structuredClone(current);stale.asOf='2020-01-01T00:00:00Z';
 assert.equal(form('354060',10,timeline,stale).status,'HELD');
 const wrong=structuredClone(current);wrong.coverage.verifiedGameIds.pop();
 assert.equal(form('354060',10,timeline,wrong).status,'HELD');
 const missing=structuredClone(timeline);missing.asOf='2020-01-01T00:00:00Z';
 assert.equal(form('354060',10,missing).status,'HELD');
});
test('archive tamper rejects unknown HTO game IDs, wrong seasons, dates and point totals',()=>{
 for(const variant of ['id','date','season','points','url','order','format','duplicate']){
  const s=structuredClone(timeline);
  const p=s.players['354060'];
  if(variant==='id')p.games[6].gameId=99999999;
  if(variant==='date')p.games[6].date='2026-03-23';
  if(variant==='season')p.games[6].season='S2016';
  if(variant==='points')p.games[6].pts=99;
  if(variant==='url')p.games[6].sourceUrl='https://example.com/teams/default.asp';
  if(variant==='order')[p.games[5],p.games[6]]=[p.games[6],p.games[5]];
  if(variant==='format')p.games[6].minutes=48;
  if(variant==='duplicate')p.games[6].gameId=p.games[5].gameId;
  const r=form('354060',10,s);
  assert.equal(r.status,'HELD','tamper '+variant);
 }
});
test('cross-season Summer 48-minute source is normalized for comparison badges only',()=>{
 // Synthetic fixture exercises approved 32/48 duration conversion, not real
 // HTO player participation. No source facts are published from this fixture.
 const mock=structuredClone(timeline);
 const person=mock.players['354060'];
 const prior=person.games[9];const copy=structuredClone(prior);
 const oldSeason=mock.sourceSeasons['Summer 2016'];
 assert.equal(oldSeason.status,'VERIFIED_INDEX_COMPLETE');
 const chosen=oldSeason.playedGameSources[0];
 copy.gameId=chosen.id;copy.date=chosen.date;copy.time=chosen.time;copy.phase=chosen.phase;
 copy.season='S2016';copy.minutes=48;copy.pts=3;copy.g=2;copy.a=1;
 copy.sourceUrl='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&p=boxscore&gameID='+chosen.id;
 person.games[9]=copy;
 person.games.sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time));
 const r=form('354060',10,mock);
 assert.equal(r.status,'VERIFIED','synthetic duration arithmetic should remain deterministic');
 assert.ok(r.rate>r.winterEquivalentRate);
 const basePts=person.games.reduce((sum,g)=>sum+g.pts,0);
 const winterPts=person.games.reduce((sum,g)=>sum+g.pts*32/g.minutes,0);
 assert.equal(r.rate,basePts/10);
 assert.equal(r.winterEquivalentRate,winterPts/10);
});
test('source metadata validates current plus archived game provenance without changing original workbook',()=>{
 assert.equal(timeline.status,chrono.CROSS_VERIFIED);
 assert.equal(timeline.currentSource.verifiedGP,current.coverage.verifiedSkaterAppearances);
 assert.equal(timeline.scoringBasis.noSeasonBoundary,true);
 assert.equal(timeline.governance.noInferredAppearances,true);
 assert.equal(timeline.governance.previousSourceDataEdited,false);
 assert.equal(timeline.sourceSeasons['Summer 2017'].status,'HELD');
 assert.equal(timeline.sourceSeasons['Winter 2025/2026'].forfeits,3);
 assert.equal(timeline.sourceSeasons['Winter 2024/2025'].forfeits,1);
});
