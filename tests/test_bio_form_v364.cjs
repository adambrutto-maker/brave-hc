'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const form=require('../widgets/player-bio-form-model-v364.js');
const vis=require('../widgets/player-bio-trend-visual-v36.js');
const projection=require('../widgets/projection.json');
const published=require('../widgets/player-form-appearances-v364.json');
const held={...published,status:'HELD_PENDING_PLAYER_APPEARANCE_AUDIT',players:{}};
const official=require('../widgets/player-actuals-hourly.json');
const adaptive=require('../widgets/hockeyos-adaptive-trend-v365.js');
const dispersion=require('../widgets/hockeyos-team-dispersion-v365.json');
const sigma=projection.conditionalFormatting.sampleStandardDeviation;
const actual={gp:10,g:4,a:3,pts:7};
const games=Array.from({length:10},(_,i)=>{
 const g=i===0?2:i===1?1:i===2?1:0;
 const a=i===3?2:i===4?1:0;
 return {gameId:120000+i,date:'2026-10-'+String(11+i).padStart(2,'0'),
   g,a,pts:g+a,appeared:true,verification:form.GAME_VERIFIED,
   sourceUrl:'https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid='+(120000+i)};
});
const available={schema:form.SCHEMA,status:form.VERIFIED,season:'W2026/27',
 asOf:'2026-10-29T17:00:00Z',players:{'354060':{playerId:'354060',gp:10,pts:7,games}}};
test('hold recent P/GP when source records lack verified individual appearances',()=>{
 for(const n of [3,5,10]){
  const row=form.getRecentWindow(held,'354060','W2026/27',actual,n);
  assert.equal(row.status,'HELD');
  assert.equal(row.reason,'FULL_APPEARANCE_LOG_UNVERIFIED');
 }
 assert.equal(Object.keys(held.players).length,0);
});
test('all 20 official current-season players have source-reconciled last-3/5 windows',()=>{
 assert.equal(published.status,form.VERIFIED);
 assert.equal(Object.keys(published.players).length,official.players.length);
 assert.equal(published.coverage.verifiedSkaterAppearances,official.players.reduce((n,p)=>n+p.gp,0));
 let eligible3=0,eligible5=0;
 for(const [id,player] of Object.entries(published.players)){
  const actual=official.players.find(p=>p.name===player.name);
  assert.ok(actual,'Official season identity '+player.name);
  for(const n of [3,5,10]){
   const r=form.getRecentWindow(published,id,published.season,actual,n);
   if(actual.gp>=n){
    assert.equal(r.status,'VERIFIED','Qualified appearance window '+player.name+' '+n);
    assert.equal(r.gp,n);
    assert.ok(r.pts>=0&&Number.isFinite(r.rate));
    if(n===3)eligible3++;
    if(n===5)eligible5++;
   }else{
    assert.equal(r.status,'HELD','Insufficient actual appearances '+player.name+' '+n);
    assert.equal(r.reason,'INSUFFICIENT_VERIFIED_APPEARANCES');
   }
  }
 }
 assert.equal(eligible3,official.players.filter(p=>p.gp>=3).length);
 assert.equal(eligible5,official.players.filter(p=>p.gp>=5).length);
 assert.equal(published.coverage.eligiblePlayerWindows['10'],official.players.filter(p=>p.gp>=10).length);
 if(official.teamGP===5){assert.equal(eligible3,13);assert.equal(eligible5,6);}
});
test('eligible complete official appearance log supports all windows including verified zeros',()=>{
 for(const n of [3,5,10]){
  const r=form.getRecentWindow(available,'354060','W2026/27',actual,n);
  assert.equal(r.status,'VERIFIED');
  assert.equal(r.gp,n);
  assert.equal(r.gameIds.length,n);
 }
 const last3=form.getRecentWindow(available,'354060','W2026/27',actual,3);
 assert.equal(last3.pts,0,'verified zero-point appearances count as real games');
 assert.equal(last3.rate,0);
 assert.equal(form.getRecentWindow(available,'354060','W2026/27',actual,10).pts,7);
});
test('unverified appearances, duplicate games and inconsistent season totals fail closed',()=>{
 const missing=structuredClone(available);missing.players['354060'].games.pop();
 assert.equal(form.getRecentWindow(missing,'354060','W2026/27',actual,3).status,'HELD');
 const duplicate=structuredClone(available);duplicate.players['354060'].games[1].gameId=duplicate.players['354060'].games[0].gameId;
 assert.equal(form.getRecentWindow(duplicate,'354060','W2026/27',actual,3).status,'HELD');
 const noAppearance=structuredClone(available);noAppearance.players['354060'].games[5].appeared=false;
 assert.equal(form.getRecentWindow(noAppearance,'354060','W2026/27',actual,3).status,'HELD');
 const noSource=structuredClone(available);noSource.players['354060'].games[5].sourceUrl='https://example.com/not-official';
 assert.equal(form.getRecentWindow(noSource,'354060','W2026/27',actual,3).status,'HELD');
 const tampered=structuredClone(available);tampered.players['354060'].games[5].pts=1;
 assert.equal(form.getRecentWindow(tampered,'354060','W2026/27',actual,3).status,'HELD');
 const changed=structuredClone(actual);changed.pts++;
 assert.equal(form.getRecentWindow(available,'354060','W2026/27',changed,3).status,'HELD');
 const otherSeason=structuredClone(available);otherSeason.season='S2026';
 assert.equal(form.getRecentWindow(otherSeason,'354060','W2026/27',actual,3).status,'HELD');
});
test('current HTO rates and original workbook classification remain unchanged under adaptive form',()=>{
 assert.equal(form.currentRate({gp:5,g:4,a:1,pts:5},5).rate,1);
 assert.equal(form.currentRate({gp:0,g:0,a:0,pts:0},5).status,'HELD');
 assert.equal(form.currentRate({gp:5,g:4,a:1,pts:6},5).status,'HELD');
 const rates=[-.35,-.2,-.094348,-.025228,0,.055,.085,.169314];
 const labels=rates.map(x=>vis.visualLevelFromRelativeChange(x,sigma));
 assert.deepEqual(labels,['FROZEN','COLD','COOL','NEUTRAL','NEUTRAL','WARM','HOT','BLAZING']);
 const diff=form.compare(1,1.14,sigma,vis);
 assert.equal(diff.status,'VERIFIED');
 assert.equal(diff.level,'COLD'); // Retained V3.6 legacy source-contract comparison only.
 const currentAdaptive=adaptive.compareRate(1,1.14,dispersion,projection);
 assert.equal(currentAdaptive.status,'VERIFIED');
 assert.equal(currentAdaptive.level,'COOL');
 assert.equal(currentAdaptive.mode,'HISTORICAL_REFERENCE_ONLY');
 assert.deepEqual(projection.conditionalFormatting.arrowIconSet.thresholds,{
    AB100:-2*sigma,AB99:-sigma,AB97:.5*sigma,AB96:sigma
 });
});
