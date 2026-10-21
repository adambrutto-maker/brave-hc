'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assessPreparedBatch}=require('./lib/hockeyos_sync_batch_readiness');
const {buildManifest}=require('./lib/hockeyos_stage_manifest_adapter');
// Fictional QA observations only. The real source receipt is private.
function manifest(){
 const game={htoId:900001,workbookGameNumber:359,date:'2026-10-20',
  GF:1,GA:2,sourceUrl:'https://www.htosports.com/teams/default.asp?p=boxscore&gameID=900001'};
 return {
  season:'W2026/27',sourceWorkbookSha256:'a'.repeat(64),
  completedGames:1,workbookScoredGames:0,games:[game],
  rows:[
   {htoGameId:900001,workbookGameNumber:359,table:'SkaterStatsByGame',
    name:'Fictional QA Skater',
    stats:{GP:1,G:1,A:0,Pts:1,PIM:0,'+/-':-1,POTG:0}},
   {htoGameId:900001,workbookGameNumber:359,table:'GoalieStatsByGame',
    name:'Fictional QA Goalie',stats:{GP:1,GA:2,POTG:null}}
  ],
  cachedRows:[],allElevenWorkbookFormulaParityVerified:false,
  independentReviewerAccepted:false,founderApproved:false
 };
}
function fresh(){
 return {verifiedHtoObservedAt:'2026-10-20T10:00:00Z',
  stagePreparedAt:'2026-10-20T10:05:00Z',
  checkPerformedAt:'2026-10-20T10:15:00Z',officialObservationVerified:true};
}
test('historically valid source with NO independently verified HTO timestamp is held',()=>{
 const r=assessPreparedBatch({inputManifest:manifest(),
  freshnessEvidence:{...fresh(),verifiedHtoObservedAt:null}});
 assert.equal(r.status,'SOURCE_PARITY_PASS_FRESHNESS_HOLD');
 assert.equal(r.rawInputParityStatus,'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD');
 assert.equal(r.sourceFreshnessStatus,'FRESHNESS_HOLD');
 assert.equal(r.writeAuthorized,false);
});
test('even real-time fresh and consistent inputs never authorize workbook writing or award output',()=>{
 const r=assessPreparedBatch({inputManifest:manifest(),freshnessEvidence:fresh()});
 assert.equal(r.status,'INPUT_CHECKS_PASS_AWARD_FORMULA_RELEASE_HOLD');
 assert.equal(r.sourceFreshnessStatus,'FRESHNESS_PASS_INPUT_ONLY');
 assert.equal(r.qualifiesForAwardRatingPublication,false);
 assert.equal(r.qualifiesForHourlyWorkbookWrite,false);
 assert.equal(r.writeAuthorized,false);
});
test('source integrity failures cannot be rescued by fresh timestamps',()=>{
 const m=manifest();m.rows[0].stats.G=4;
 const r=assessPreparedBatch({inputManifest:m,freshnessEvidence:fresh()});
 assert.equal(r.status,'SOURCE_INTEGRITY_FAIL_HOLD');
 assert.ok(r.sourceErrors.length>0);
 assert.equal(r.writeAuthorized,false);
});
test('staging alone with no feed provenance cannot be treated as a current live refresh',()=>{
 const r=assessPreparedBatch({inputManifest:manifest(),freshnessEvidence:{
  stagePreparedAt:'2026-10-20T10:13:00Z',
  checkPerformedAt:'2026-10-20T10:15:00Z'
 }});
 assert.equal(r.status,'SOURCE_PARITY_PASS_FRESHNESS_HOLD');
 assert.equal(r.qualifiesForHourlyWorkbookWrite,false);
});
test('missing source manifest and freshness evidence fail closed, never throw',()=>{
 const r=assessPreparedBatch();
 assert.equal(r.status,'SOURCE_INTEGRITY_FAIL_HOLD');
 assert.equal(r.sourceFreshnessStatus,'FRESHNESS_INVALID');
 assert.equal(r.writeAuthorized,false);
});
