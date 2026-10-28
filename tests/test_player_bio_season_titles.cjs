'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fromDir,build}=require('../scripts/bio-season-titles-lib.cjs');
const root=path.resolve(__dirname,'..'),r=fromDir(root),manifest=require('../widgets/player-bio-season-titles.json');
test('source-derived scoring-title manifest is identical to published HTO award data',()=>{
 assert.deepEqual(r.held,[]);
 assert.deepEqual(manifest,r.manifest);
 assert.equal(manifest.schema,'hockeyos-verified-season-scoring-titles/v1');
 assert.equal(manifest.verifiedEvents,33);
 assert.deepEqual(manifest.titleCounts,{goalTitle:17,pointsTitle:16});
 assert.equal(manifest.verifiedSourceRows.NATIVE_HTO_HIGHLIGHTS,32);
 assert.equal(manifest.verifiedSourceRows.PUBLIC_HTO_AWARDS_HISTORY,33);
 assert.equal(manifest.heldCount,0);
});
test('Justin Carosi has goals title in W2024/25 and points titles in W2023/24 and W2022/23',()=>{
 const w=manifest.players['354060'];
 assert.deepEqual(w['Winter 2024/2025'].map(a=>a.type),['goalTitle']);
 assert.deepEqual(w['Winter 2023/2024'].map(a=>a.type),['pointsTitle']);
 assert.deepEqual(w['Winter 2022/2023'].map(a=>a.type),['pointsTitle']);
});
test('published team history supplements a missing native profile award without inventing its points',()=>{
 const m=manifest.players['354061']['Summer 2016'];
 assert.deepEqual(m,[{type:'pointsTitle',award:'Art Ross',sourceTypes:['PUBLIC_HTO_AWARDS_HISTORY']}]);
});
test('same season may have separate G and P titles; official season is not inferred from chart total',()=>{
 for(const season of ['Summer 2013','Summer 2015','Winter 2014/2015','Winter 2015/2016']){
  assert.deepEqual(manifest.players['354061'][season].map(a=>a.type),['goalTitle','pointsTitle']);
 }
 const source=JSON.stringify(manifest);
 assert.ok(!source.includes('awardTotal'),'no cross-source conflicting award point total');
 assert.ok(!source.includes('recordScore'),'award existence not inferred from raw G/A');
 assert.ok(manifest.notice.includes('playoffs'));
});
test('unverified awards are held, and invalid winners cannot produce invented markers',()=>{
 const l=require('../widgets/player-highlights-ledger.json'),h=require('../widgets/history-awards.json'),c=require('../widgets/player-career-insights.json');
 const testLedger=structuredClone(l);testLedger.players['354060'].items.push({
  category:'award',sourceText:'Art Ross Award (99 Points) - Winter 2040/41',
  provenance:'EXISTING_NATIVE_HTO_HIGHLIGHTS',publication:'EXISTING_HTO_MANUAL_RECORD'
 });
 const result=build(testLedger,h,c);
 assert.ok(result.held.some(x=>x.reason==='PLAYER_OR_SEASON_NOT_VERIFIED'));
 assert.ok(!result.manifest.players['354060']?.['Winter 2040/2041']);
 assert.equal(result.manifest.verifiedEvents,33);
});

test('official tied Rocket Richard season credits both verified player IDs without manufactured rankings',()=>{
 const season='Winter 2024/2025';
 assert.deepEqual(manifest.players['354060'][season].map(x=>x.type),['goalTitle']);
 assert.deepEqual(manifest.players['686216'][season].map(x=>x.type),['goalTitle']);
});
test('historical title existence is preserved without exposing conflicting source award point totals',()=>{
 const team=require('../widgets/history-awards.json'),native=require('../widgets/player-highlights-ledger.json');
 const team2015=team.groups.find(g=>g.category==='Art Ross Award - Summer')?.items.find(s=>s.startsWith('2015 - Mark Pastore'));
 const p2015=native.players['354061'].items.find(x=>String(x.sourceText).includes('Art Ross Award')&&String(x.sourceText).includes('Summer 2015'));
 assert.ok(team2015&&p2015);
 assert.ok(/25PTS/i.test(team2015));
 assert.ok(/34 Points/i.test(p2015.sourceText));
 const verified=manifest.players['354061']['Summer 2015'].find(x=>x.type==='pointsTitle');
 assert.equal(verified.award,'Art Ross');
 assert.ok(!Object.hasOwn(verified,'points'));
});
