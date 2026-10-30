'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('./lib/hockeyos_saved_table_expansion_preflight');
const HASH='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
function fixture(){
 const skaters=Array.from({length:41},(_,i)=>({
  key:[360+i%3,'SkaterStatsByGame','Fictional Player '+String(i+1).padStart(2,'0')],
  sourceHTOGameId:[3356178,3369564,3375601][i%3],
  formulaRowsMustBeCopied:true,
  sourceInputFieldCount:12,
  proposedNewWorksheetRow:4669+i,allocationStatus:'PLAN_ONLY_NO_WRITES'
 }));
 const goalies=Array.from({length:3},(_,i)=>({
  key:[360+i,'GoalieStatsByGame','Fictional Goalie '+(i+1)],
  sourceHTOGameId:[3356178,3369564,3375601][i],
  formulaRowsMustBeCopied:true,
  sourceInputFieldCount:8,
  proposedNewWorksheetRow:364+i,allocationStatus:'PLAN_ONLY_NO_WRITES'
 }));
 const newRows=[...skaters,...goalies];
 const existing=Array.from({length:13},(_,i)=>({
  key:[359,'SkaterStatsByGame','Fictional Historic '+i],
  fieldValueDifferences:[],sourceFormulaCellCount:0
 }));
 existing.push({
  key:[359,'GoalieStatsByGame','Leong, Dev'],
  fieldValueDifferences:[
   {field:'GA',oldCached:'0',newHTO:3,cell:'GQ363',containsSourceFormula:false},
   {field:'POTG',oldCached:'0',newHTO:1,cell:'HA363',containsSourceFormula:false}
  ],sourceFormulaCellCount:0
 });
 return {
  extension:{
   schema:'hockeyos-master-workbook-extension-plan-readonly/v1',
   sourceWorkbookSHA256:HASH,status:'PROPOSED_TABLE_EXTENSION_LAYOUT_NO_WRITE_AUTHORITY',
   existingRecordMatches:14,existingRecordCorrectionsToReview:2,
   originalIdentityException:'Unknown, Johnny remains quarantined',
   missingSourceRecords:44,
   appendCandidatesByTable:{SkaterStatsByGame:41,GoalieStatsByGame:3},
   proposedExpansionRows:{SkaterStatsByGame:{first:4669,last:4709},GoalieStatsByGame:{first:364,last:366}},
   physicalCollisionCellCount:{SkaterStatsByGame:1,GoalieStatsByGame:0},
   collisionSamples:{SkaterStatsByGame:[
    {cell:'Y4674',containsFormula:false,hasCachedValue:true,sheetRow:4674}
   ],GoalieStatsByGame:[]},
   newRowCandidates:newRows,oldSkaterTableLastRow:4668,oldGoalieTableLastRow:363,
   originalWorkbookUnchanged:true,writeAuthorized:false,
   gate:'Only independent compatible Excel acceptance mandatory'
  },
  capacity:{
   schema:'hockeyos-master-disposable-table-row-capacity-audit/v1',
   sourceCopySHA256:HASH,workbookOriginalUnmodified:true,
   tableCapacity:{
    SkaterStatsByGame:{declaredTableLastRow:4668,lastNamedSheetRow:4668,
     emptyIdentityRowsPresentInXML:0,emptyRowsAfterLastName:0},
    GoalieStatsByGame:{declaredTableLastRow:363,lastNamedSheetRow:363,
     emptyIdentityRowsPresentInXML:0,emptyRowsAfterLastName:0}
   }
  },
  importPlan:{
   schema:'hockeyos-original-master-copy-field-level-import-plan/v1',
   sourceWorkbookSHA256:HASH,status:'READ_ONLY_SOURCE_DIFF_READY_IMPORT_WRITE_NOT_AUTHORIZED',
   sourceRecordCount:58,existingMatched:14,needsNewRows:44,
   writeAuthorization:false,originalMasterNotTouched:true,
   existingRecords:existing,
   unmatchedHTORecords:newRows.map(x=>({key:x.key,sourceHTOGameId:x.sourceHTOGameId})),
   unverifiedSavedRecords:[{key:[359,'SkaterStatsByGame','Unknown, Johnny'],
      status:'HOLD_SOURCE_IDENTITY_NOT_VERIFIED'}]
  }
 };
}
test('correct saved source plan identifies 44 rows and one nonformula collision, but no writes',()=>{
 const r=check(fixture());
 assert.equal(r.status,'SOURCE_PLAN_PARITY_PASS_EXCEL_RECALCULATION_HOLD');
 assert.deepEqual(r.errors,[]);
 assert.equal(r.newRowsPlanned,44);
 assert.equal(r.existingRecordsPreserved,13);
 assert.equal(r.oldRecordCorrectionReviewCount,1);
 assert.equal(r.oldRecordCorrectionFieldCount,2);
 assert.equal(r.groups.SkaterStatsByGame.proposedFirstRow,4669);
 assert.equal(r.groups.GoalieStatsByGame.proposedLastRow,366);
 assert.ok(r.warnings.includes('NONEMPTY_CANDIDATE_CELL_Y4674_REQUIRES_HUMAN_DISPOSITION'));
 for(const x of ['writeAuthorized','publishAuthorized','operationalWorkbookWritten',
   'originalFormulaCellsTranslated','allElevenAwardScoresRecalculated']){
  assert.equal(r[x],false,x);
 }
});
test('missing manifests and spoofed source authority are held without attempts to read Excel',()=>{
 for(const item of [{}, {extension:{sourceWorkbookSHA256:'a'.repeat(64)}},
  (()=>{const f=fixture();f.capacity.sourceCopySHA256='b'.repeat(64);return f})()]){
  const r=check(item);
  assert.equal(r.status,'BLOCKED_SOURCE_PLAN_INCONSISTENT');
  assert.equal(r.writeAuthorized,false);
 }
});
test('do not confuse two GA/POTG FIELD discrepancies with two player corrections',()=>{
 const a=fixture();
 a.extension.existingRecordCorrectionsToReview=1;
 assert.ok(check(a).errors.includes('CORRECTION_REVIEW_FIELD_ACCOUNTING_INVALID'));
});
test('new row count, identity keys and assignments must match all 44 source records',()=>{
 for(const mutate of [
  x=>x.extension.newRowCandidates.pop(),
  x=>x.importPlan.unmatchedHTORecords.pop(),
  x=>x.extension.newRowCandidates[0].key=x.extension.newRowCandidates[1].key,
  x=>x.extension.newRowCandidates[0].key=x.importPlan.existingRecords[0].key,
  x=>x.extension.newRowCandidates[0].allocationStatus='APPROVED_TO_WRITE',
  x=>x.extension.newRowCandidates[0].formulaRowsMustBeCopied=false
 ]){
  const a=fixture();mutate(a);
  assert.equal(check(a).status,'BLOCKED_SOURCE_PLAN_INCONSISTENT');
 }
});
test('no blind append: overlapping, gapped or out-of-bounds row targets block',()=>{
 for(const mutate of [
  x=>x.extension.newRowCandidates[0].proposedNewWorksheetRow=4668,
  x=>x.extension.newRowCandidates[0].proposedNewWorksheetRow=4709,
  x=>x.extension.proposedExpansionRows.SkaterStatsByGame.first=4668,
  x=>x.extension.proposedExpansionRows.GoalieStatsByGame.last=365,
  x=>x.capacity.tableCapacity.GoalieStatsByGame.emptyRowsAfterLastName=1
 ]){
  const a=fixture();mutate(a);
  assert.equal(check(a).status,'BLOCKED_SOURCE_PLAN_INCONSISTENT');
 }
});
test('unreviewed or formula-bearing collisions cannot be silently cleared',()=>{
 for(const mutate of [
  x=>x.extension.collisionSamples.SkaterStatsByGame[0].containsFormula=true,
  x=>x.extension.collisionSamples.SkaterStatsByGame[0].cell='GQ4674',
  x=>x.extension.physicalCollisionCellCount.SkaterStatsByGame=0
 ]){
  const a=fixture();mutate(a);
  assert.equal(check(a).status,'BLOCKED_SOURCE_PLAN_INCONSISTENT');
 }
});
test('unexpected source correction fields, locations or identities require review',()=>{
 for(const mutate of [
  x=>x.importPlan.existingRecords[13].fieldValueDifferences[0].containsSourceFormula=true,
  x=>x.importPlan.existingRecords[13].fieldValueDifferences[0].field='Award Score',
  x=>x.importPlan.existingRecords[13].fieldValueDifferences[1].cell='GQ364',
  x=>x.importPlan.existingRecords[13].key[2]='Unknown, Johnny'
 ]){
  const a=fixture();mutate(a);
  assert.equal(check(a).status,'BLOCKED_SOURCE_PLAN_INCONSISTENT');
 }
});
test('unverified historical placeholder remains quarantined without deletion',()=>{
 const a=fixture();
 a.importPlan.unverifiedSavedRecords=[];
 assert.ok(check(a).errors.includes('UNVERIFIED_ORIGINAL_IDENTITY_NOT_QUARANTINED'));
});
test('perfect saved audit cannot claim independent review or current award scores',()=>{
 const r=check(fixture());
 assert.equal(r.independentReviewerAccepted,false);
 assert.equal(r.allElevenAwardScoresRecalculated,false);
 assert.equal(r.originalWorkbookOpened,false);
 assert.equal(r.originalWorkbookModified,false);
});
test('source plan that claims authorized writing is rejected even with clean allocations',()=>{
 const a=fixture();
 a.extension.writeAuthorized=true;
 assert.ok(check(a).errors.includes('SAVED_AUDIT_WRITE_BOUNDARY_INVALID'));
});

const {inspect:inspectGameJoin}=require('./lib/hockeyos_saved_game_mapping_crosscheck');

function withJoin(){
 const data=fixture();
 const ids=[3356177,3356178,3369564,3375601];
 const dates=['2026-09-20','2026-09-27','2026-10-04','2026-10-18'];
 const games=ids.map((externalHTOGameId,i)=>({
  sourceSystem:'HTO_OFFICIAL_BOX_SCORE',externalHTOGameId,
  verifiedDate:dates[i],workbookTable:'AllTimeSchedule',workbookGameType:'Regular Season',
  workbookSeason:'W2026/27',workbookGameNumber:359+i,
  gameNumberJoinStatus:'MATCH_SOURCE_SEASON_AND_UNIQUE_SCHEDULE_DATE',
  sourceUrl:'https://www.htosports.com/teams/default.asp?p=boxscore&gameID='+externalHTOGameId,
  savedScoreStatus:'STALE_UNSCORED_PLACEHOLDER_DO_NOT_REPLAY_AS_RESULT',
  workbookOpponentCached:i===0?'Fictional Rival A':'OUTDATED OPPONENT',
  currentHTOOpponent:'Fictional Rival '+String.fromCharCode(65+i)
 }));
 return {...data,sourceJoin:{
  schema:'hockeyos-awards-external-to-alltimeschedule-source-join/v1',
  status:'FOUR_GAME_WORKBOOK_SEQUENCE_JOIN_PASS_CURRENT_SCORE_HELD',
  sourceWorkbookSHA256:HASH,recordCount:4,workbookSeasonRowCount:25,
  originalWorkbookEdited:false,failures:[],mapped:games
 }};
}
test('four-game source join validates every one of the 44 planned inserts by HTO ID and workbook game number',()=>{
 const r=inspectGameJoin(withJoin());
 assert.equal(r.status,'SAVED_FOUR_GAME_IDENTITY_CROSSCHECK_PASS_WORKBOOK_MODEL_HELD');
 assert.equal(r.savedOpponentNameDifferences,3);
 assert.equal(r.originalHistoricalScheduleResultsStale,4);
 assert.ok(r.warnings.some(x=>x.includes('CACHED_OPPONENT_NAMES_DIFFER')));
 assert.equal(r.freshOfficialHTOReadbackVerified,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.workbookWriteAuthorized,false);
});
test('wrong HTO ID, workbook game number or missing input key blocks the schedule-to-44-rows join',()=>{
 for(const mutate of [
  x=>x.extension.newRowCandidates[0].sourceHTOGameId=3375601,
  x=>x.importPlan.unmatchedHTORecords[1].sourceHTOGameId=3375601,
  x=>x.sourceJoin.mapped[0].workbookGameNumber=360,
  x=>x.sourceJoin.mapped[0].externalHTOGameId=3356178,
  x=>x.sourceJoin.mapped.pop(),
  x=>x.importPlan.unmatchedHTORecords.pop()
 ]){
  const a=withJoin();mutate(a);
  const r=inspectGameJoin(a);
  assert.equal(r.status,'HOLD_GAME_IDENTITY_SOURCE_MISMATCH');
  assert.ok(r.holds.length>=1);
 }
});
test('untrusted HTO host and fabricated or duplicated historical schedule IDs block',()=>{
 for(const mutate of [
  x=>x.sourceJoin.mapped[0].sourceUrl='https://not-hto.invalid/games?gameID=3356177&p=boxscore',
  x=>x.sourceJoin.mapped[0].sourceUrl='https://www.htosports.com/teams/default.asp?p=boxscore&gameID=999999',
  x=>x.sourceJoin.mapped[1].verifiedDate='2026-02-30',
  x=>x.sourceJoin.mapped[0].gameNumberJoinStatus='HEURISTIC_MATCH',
  x=>x.sourceJoin.mapped[0].savedScoreStatus='VERIFIED_HISTORICAL_RESULT',
  x=>x.sourceJoin.originalWorkbookEdited=true
 ]){
  const a=withJoin();mutate(a);
  assert.equal(inspectGameJoin(a).status,'HOLD_GAME_IDENTITY_SOURCE_MISMATCH');
 }
});
test('saved placeholder score and cached opponent mismatch are review warnings, never official results',()=>{
 const r=inspectGameJoin(withJoin());
 assert.equal(r.holds.length,0);
 assert.ok(r.warnings.some(x=>x.includes('FOUR_SAVED_SCHEDULE_RESULTS_ARE_STALE')));
 assert.equal(r.savedOpponentNameDifferences,3);
 assert.equal(r.currentAwardScoresVerified,false);
 assert.equal(r.originalWorkbookOpened,false);
});
