'use strict';
// Pure source-gated normalization regression. No HTO, Excel, records or file writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const formats = require('../widgets/league-game-formats.json');
const normal = require('../widgets/player-performance-normalization.js');
const winter = formats.formats['brave-winter-32'];
const summer = formats.formats['brave-summer-48'];
const deepCopy = value => JSON.parse(JSON.stringify(value));

test('reference configuration exposes both directions without mapping unverified historical seasons', () => {
  assert.equal(formats.schema, normal.SCHEMA);
  assert.equal(formats.defaultTargetFormatId, 'brave-winter-32');
  assert.deepEqual(Object.keys(formats.seasonBindings), []);
  assert.equal(normal.verifiedFormat(winter).regulationGameMinutes, 32);
  assert.equal(normal.verifiedFormat(summer).regulationGameMinutes, 48);
});

test('summer 6 goals in 48-minute games equals 4 Winter goals but preserves official actual 6', () => {
  const original = Object.freeze({GP: 3, G: 6, A: 0, Pts: 6, PPG: 2, officialRecord: 6});
  const result = normal.normalizeSkater(original, summer, winter);
  assert.equal(result.status, 'VERIFIED_EQUIVALENT');
  assert.equal(result.analyticOnly, true);
  assert.equal(result.authority, 'ANALYSIS_NOT_RECORDS');
  assert.equal(result.basis.factor, 2 / 3);
  assert.equal(result.actual.G, 6);
  assert.equal(result.equivalent.G, 4);
  assert.equal(result.equivalent.Pts, 4);
  assert.equal(result.equivalent.pointsPerGame, 4 / 3);
  assert.equal(original.officialRecord, 6);
  assert.ok(!Object.hasOwn(result.equivalent, 'officialRecord'));
  assert.ok(!Object.hasOwn(result.equivalent, 'PPG'));
});

test('winter 6 goals in 32-minute games equals 9 Summer goals but preserves actual 6', () => {
  const raw = {GP: 3, G: 6, A: 0, Pts: 6};
  const before = deepCopy(raw);
  const result = normal.normalizeSkater(raw, winter, summer);
  assert.equal(result.basis.factor, 1.5);
  assert.equal(result.equivalent.G, 9);
  assert.equal(result.actual.G, 6);
  assert.deepEqual(raw, before);
});

test('bidirectional equivalence uses G plus A; workbook PPG is power-play goals and never rate source', () => {
  const row = {GP: 3, G: 6, A: 3, Pts: 9, PPG: 99};
  const winterView = normal.normalizeSkater(row, summer, winter);
  assert.equal(winterView.equivalent.G, 4);
  assert.equal(winterView.equivalent.A, 2);
  assert.equal(winterView.equivalent.Pts, 6);
  assert.equal(winterView.equivalent.pointsPerGame, 2);
  assert.equal(winterView.actual.pointsPerGame, 3);
  const summerView = normal.normalizeSkater(winterView.equivalent, winter, summer);
  assert.equal(summerView.status, 'VERIFIED_EQUIVALENT');
  assert.equal(summerView.equivalent.Pts, 9);
});

test('commercial league manager configures 3x12-minute and 3x15-minute regulation periods', () => {
  const leagueA = {id:'league-A-36',verificationStatus:'VERIFIED',periodMinutes:[12,12,12]};
  const leagueB = {id:'league-B-45',verificationStatus:'VERIFIED',periodMinutes:[15,15,15]};
  const result = normal.normalizeSkater({GP:2,G:2,A:2,Pts:4}, leagueA, leagueB);
  assert.equal(result.basis.sourceRegulationGameMinutes, 36);
  assert.equal(result.basis.targetRegulationGameMinutes, 45);
  assert.equal(result.basis.factor, 45 / 36);
  assert.equal(result.equivalent.pointsPerGame, 2.5);
});

test('explicit period durations and scheduled game minutes must match', () => {
  const bad = {...winter, periodMinutes:[12,12,12]};
  assert.equal(normal.normalizeSkater({GP:1,G:1,A:0,Pts:1},bad,summer).reason,
    'CONFLICTING_PERIOD_AND_GAME_MINUTES');
  const valid = {...winter, periodMinutes:[10,10,12]};
  assert.equal(normal.normalizeSkater({GP:1,G:1,A:0,Pts:1},valid,summer).status,'VERIFIED_EQUIVALENT');
});

test('invalid or unapproved duration, missing periods and zero length are blocked', () => {
  const row={GP:1,G:1,A:1,Pts:2};
  for (const invalid of [
    null, {}, {id:'unknown', verificationStatus:'DRAFT',regulationGameMinutes:32},
    {id:'no-duration',verificationStatus:'VERIFIED'},
    {id:'zero',verificationStatus:'VERIFIED',regulationGameMinutes:0},
    {id:'negative',verificationStatus:'VERIFIED',periodMinutes:[10,-2,10]},
    {id:'none',verificationStatus:'VERIFIED',periodMinutes:[]}
  ]) assert.equal(normal.normalizeSkater(row,invalid,summer).status,'HELD');
});

test('bad actual points parity, fractional recorded goal or zero appearances with points fail closed', () => {
  for (const row of [
    {GP:2,G:1,A:1,Pts:3}, {GP:1,G:0.5,A:0,Pts:0.5},
    {GP:0,G:1,A:0,Pts:1}, {GP:-1,G:0,A:0,Pts:0},
    {GP:1,G:0,A:0}, null
  ]) assert.equal(normal.normalizeSkater(row,summer,winter).status,'HELD');
});

test('zero actual games yields no invented points-per-game rate', () => {
  const result=normal.normalizeSkater({GP:0,G:0,A:0,Pts:0},summer,winter);
  assert.equal(result.status,'VERIFIED_EQUIVALENT');
  assert.equal(result.actual.pointsPerGame,null);
  assert.equal(result.equivalent.pointsPerGame,null);
});

test('fractional equivalence remains unrounded and reverses without changing raw actuals', () => {
  const actual={GP:7,G:1,A:0,Pts:1};
  const a=normal.normalizeSkater(actual,summer,winter);
  assert.equal(a.equivalent.G,2/3);
  const b=normal.normalizeSkater(a.equivalent,winter,summer);
  assert.equal(b.equivalent.G,1);
  assert.deepEqual(actual,{GP:7,G:1,A:0,Pts:1});
});

test('historical reference config holds all unverified source season/game-type assignments', () => {
  const row={Season:'Summer 2013','Game Type':'Regular Season',GP:2,G:3,A:0,Pts:3};
  const result=normal.normalizeHistorical(row,formats,{role:'skater',seasonKey:'Summer 2013',gameType:'Regular Season',targetFormatId:'brave-winter-32'});
  assert.equal(result.reason,'HISTORICAL_SOURCE_FORMAT_NOT_VERIFIED');
});

test('verified historically scoped bindings permit normalization but never infer by season label', () => {
  const config=deepCopy(formats);
  config.seasonBindings['Summer 2013::Regular Season']={
    formatId:'brave-summer-48',verificationStatus:'VERIFIED',
    evidenceRef:'verified worksheet row + HTO season/game-type reconciliation'
  };
  const row={Season:'Summer 2013','Game Type':'Regular Season',GP:2,G:3,A:3,Pts:6};
  const result=normal.normalizeHistorical(row,config,{role:'skater',seasonKey:'Summer 2013',gameType:'Regular Season'});
  assert.equal(result.status,'VERIFIED_EQUIVALENT');
  assert.equal(result.equivalent.Pts,4);
  assert.equal(normal.normalizeHistorical(row,config,{role:'skater',seasonKey:'Summer 2013',gameType:'Playoffs'}).reason,'SOURCE_GAME_TYPE_MISMATCH');
  const withoutGameType={Season:'Summer 2013',GP:2,G:3,A:3,Pts:6};
  assert.equal(normal.normalizeHistorical(withoutGameType,config,{role:'skater',seasonKey:'Summer 2013',gameType:'Playoffs'}).reason,
    'HISTORICAL_SOURCE_FORMAT_NOT_VERIFIED');
  assert.equal(normal.normalizeHistorical({...row,Season:'Winter 2013/2014'},config,{role:'skater',seasonKey:'Summer 2013',gameType:'Regular Season'}).reason,'SOURCE_SEASON_MISMATCH');
});

test('manager changing current target does not alter stored original season format or raw counts', () => {
  const config=deepCopy(formats);config.seasonBindings['Summer 2020::Regular Season']={
    formatId:'brave-summer-48', verificationStatus:'VERIFIED', evidenceRef:'reviewed 2020 source'
  };
  const raw=Object.freeze({Season:'Summer 2020','Game Type':'Regular Season',GP:4,G:1,A:2,Pts:3});
  const opts={role:'skater',seasonKey:'Summer 2020',gameType:'Regular Season'};
  const winterTotal=normal.normalizeHistorical(raw,config,{...opts,targetFormatId:'brave-winter-32'});
  config.defaultTargetFormatId='brave-summer-48';
  const summerTotal=normal.normalizeHistorical(raw,config,opts);
  assert.equal(winterTotal.equivalent.Pts,2);
  assert.equal(summerTotal.equivalent.Pts,3);
  assert.equal(raw.Pts,3);
  assert.equal(config.seasonBindings['Summer 2020::Regular Season'].formatId,'brave-summer-48');
});

test('goalkeeper only equivalent GA, never win/loss/shutout or official GAA', () => {
  const row=Object.freeze({GP:2,GA:6,W:1,L:1,SHO:0,GAA:3});
  const result=normal.normalizeGoalie(row,summer,winter);
  assert.equal(result.status,'VERIFIED_EQUIVALENT');
  assert.equal(result.equivalent.GA,4);
  assert.equal(result.equivalent.goalsAgainstPerAppearance,2);
  for (const key of ['W','L','SHO','GAA']) assert.equal(Object.hasOwn(result.equivalent,key),false);
  assert.equal(row.GAA,3);
  assert.equal(normal.normalizeGoalie({GP:0,GA:1},summer,winter).status,'HELD');
});

test('neither skater nor goalkeeper normalization changes a season-length count or projects full seasons', () => {
  const r=normal.normalizeSkater({GP:1,G:1,A:0,Pts:1,summerSeasonGames:10,winterSeasonGames:23},summer,winter);
  assert.equal(r.actual.GP,1);
  assert.equal(r.equivalent.GP,1);
  assert.equal(r.equivalent.Pts,2/3);
  for(const key of ['summerSeasonGames','winterSeasonGames','projectedSeasonPts','milestones','records','awards']){
    assert.equal(Object.hasOwn(r.equivalent,key),false);
  }
});
