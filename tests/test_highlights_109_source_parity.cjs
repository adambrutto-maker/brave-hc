'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const audit=require('../scripts/audit_highlights_complete_109.cjs');
const saved=require('../docs/261028_Highlights_109_Profile_Parity_Register.json');
const raw=n=>fs.readFileSync(path.join(root,'widgets',n),'utf8');
test('109 registered HTO identities and source completeness matrix are exact and immutable',()=>{
 const now=audit.build();
 assert.deepEqual(JSON.parse(JSON.stringify(now)),saved,'deterministic JSON audit register unchanged');
 assert.equal(now.counts.officialHTOIdentities,109);
 assert.equal(now.rows.length,109);
 assert.equal(new Set(now.rows.map(x=>x.htoPlayerID)).size,109);
 assert.equal(now.counts.nativeHighlightsProfiles,43);
 assert.equal(now.counts.profilesWithoutNativeHighlights,66);
 assert.equal(now.counts.nativeHighlightsOriginalRows,306);
 assert.equal(now.counts.allCapturedHighlightsRows,343);
 for(const row of now.rows){
  assert.ok(row.publicHTOProfile.endsWith('playerID='+row.htoPlayerID));
  assert.equal(row.nativeHighlights.nativeCount<=row.nativeHighlights.count,true);
 }
});
test('published historical award winner evidence counts, source coverage and honest holds',()=>{
 const {counts,rows}=saved;
 assert.equal(counts.officialHistoricalAwardWinnerRows,145);
 assert.equal(counts.awardEventsMatchedNative,143);
 assert.equal(counts.awardEventsMissingNative,1);
 assert.equal(counts.awardNativePeriodConflicts,1);
 assert.equal(counts.awardEventsDuplicateNative,0);
 assert.equal(counts.awardMetricDisagreements,3);
 assert.equal(counts.awardsUnresolvedSourceRows,0);
 assert.equal(counts.officialNoRookieRows,2);
 const missing=rows.flatMap(x=>x.openAwardSourceHolds.map(h=>({name:x.playerName,...h})));
 assert.deepEqual(missing,[{
   name:'Mark Pastore',type:'art_ross',period:'Summer 2016',
   source:'2016 - Mark Pastore - 10G, 13A, 23PTS, 0PIM',
   status:'HOLD_PENDING_SOURCE_SCOPE_AND_PUBLICATION_REVIEW'
 }]);
 const conflicting=rows.flatMap(x=>x.duplicateAwardSourceHolds.map(e=>({player:x.playerName,...e})));
 assert.equal(conflicting.length,1);
 assert.equal(conflicting[0].player,'Mark Arruda');
 assert.equal(conflicting[0].type,'lady_byng');
 assert.equal(conflicting[0].period,'Winter 2024/25');
 assert.equal(conflicting[0].possiblePeriodConflict[0].ledgerSourceText,
  'Lady Byng Award for Sportsmanship - Winter 2025/25');
});
test('three discrepant HTO Art Ross point totals stay source-specific, not conflated',()=>{
 const cases=saved.rows.flatMap(x=>x.conflictingAwardMetrics.map(a=>({
   name:x.playerName,period:a.period,history:a.publishedMetric,native:a.nativeMetric,type:a.type
 })));
 assert.deepEqual(cases.sort((a,b)=>a.period.localeCompare(b.period)),
 [
  {name:'Ben Sherritt',period:'Summer 2014',history:25,native:27,type:'art_ross'},
  {name:'Mark Pastore',period:'Summer 2015',history:25,native:34,type:'art_ross'},
  {name:'Ben Sherritt',period:'Summer 2017',history:32,native:37,type:'art_ross'}
 ].sort((a,b)=>a.period.localeCompare(b.period)));
});
test('all published personal records match official dated HTO records source, no new records',()=>{
 const total=saved.rows.reduce((n,x)=>n+x.nativeRecordRows,0);
 const mismatches=saved.rows.flatMap(x=>x.unmatchedRecordSourceRows);
 assert.equal(total,230);
 assert.equal(saved.counts.recordRowsSourceMatched,230);
 assert.deepEqual(mismatches,[]);
 assert.equal(saved.counts.recordRowsHeld,0);
});
test('team leadership crosswalk equals existing source-only service display',()=>{
 assert.equal(saved.counts.leadershipServiceRows,13);
 assert.equal(saved.counts.leadershipPlayers,9);
 const dylan=saved.rows.find(x=>x.htoPlayerID==='525407');
 assert.equal(dylan.playerName,'Dylan Brennan');
 assert.equal(dylan.teamServiceTenures.length,1);
 assert.equal(dylan.teamServiceTenures[0].role,'Team Captain - 2018 to 2019');
 assert.equal(dylan.teamServiceTenures[0].source,'PUBLIC_HTO_BIO');
 assert.equal(dylan.teamServiceTenures[0].display,
  'HIGHLIGHTS_HONORS_SEPARATE_LEADERSHIP_HISTORY');
});
test('nonbreaking spaces, Hall-of-Fame season/year and multiline HTO records match reliably',()=>{
 assert.deepEqual(audit.itemPeriods('Art Ross Award (32 Points) - Winter 2015/16'),['Winter 2015/16']);
 assert.deepEqual(audit.itemPeriods('Maurice "Rocket" Richard Award (27 Goals) - Winter 2017/18'),['Winter 2017/18']);
 assert.equal(audit.matchesAwardPeriod({sourceText:'Hall of Fame Inductee - Winter 2024/25'},'hall_of_fame','2024'),true);
 assert.equal(audit.matchesAwardPeriod({sourceText:'Hall of Fame Inductee - Winter 2023/24'},'hall_of_fame','2024'),false);
 assert.equal(audit.awardType('Bill Masterton Award for Decidation - Summer 2016'),'dedication');
 assert.equal(audit.awardType('Rolaids Relief Man Award - Winter 2024/25'),'rolaids');
 assert.equal(audit.awardType('Elected Captain - Winter 2018/19'),null);
 assert.equal(audit.awardType('A random points leader'),null);
});
test('official historical source winner rows only: no automatic record promotion or invented stats',()=>{
 assert.equal(saved.evidencePolicy,'PUBLIC_HTO_SNAPSHOT_JOINS_ONLY_NO_NEW_AWARD_PUBLICATION');
 assert.equal(saved.outcome,'OPEN_HOLDS_REQUIRE_REVIEW_NO_NEW_AWARDS_AUTOMATICALLY_PUBLISHED');
 const sourceFiles=saved.sourceInputs;
 assert.equal(sourceFiles.length,8);
 for(const file of sourceFiles){
  const current=crypto.createHash('sha256').update(raw(file.file).replace(/\r\n?/g,'\n')).digest('hex');
  assert.equal(current,file.sha256,file.file+' changed since audit');
 }
 for(const entry of saved.rows.flatMap(x=>x.publicAwardHistoryEvents)){
  assert.ok(entry.officialHistorySourceText);
  assert.equal(entry.scope,'OFFICIAL_AWARD_WINNER_HISTORY_NOT_STATISTICALLY_INFERRED');
  assert.ok(['NATIVE_LEDGER_MATCH','OFFICIAL_HISTORY_NOT_IN_NATIVE_LEDGER','NATIVE_SOURCE_PERIOD_CONFLICT_HOLD'].includes(entry.matchStatus));
  assert.ok(!Object.hasOwn(entry,'promotedToNewAward'));
 }
});
