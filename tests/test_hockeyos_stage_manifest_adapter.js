'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildManifest}=require('./lib/hockeyos_stage_manifest_adapter');
const {evaluate}=require('./lib/hockeyos_award_sync_preflight');

const sourceSHA='f'.repeat(64),GAMES=[3356177,3356178,3369564,3375601];
const DATES=['2026-09-20','2026-09-27','2026-10-04','2026-10-18'];
function fixture(){
 const scores=[[0,3],[3,6],[1,3],[2,7]];
 const lens=[13,16,13,12];
 const mapped=GAMES.map((externalHTOGameId,i)=>({
  sourceSystem:'HTO_OFFICIAL_BOX_SCORE',externalHTOGameId,verifiedDate:DATES[i],
  workbookGameNumber:359+i,workbookSeason:'W2026/27',sourceScore:{GF:scores[i][0],GA:scores[i][1]},
  sourceUrl:'https://www.htosports.com/teams/default.asp?p=boxscore&gameID='+externalHTOGameId
 }));
 const rows=[];
 for(let i=0;i<4;i++){
  for(let j=0;j<lens[i];j++){
   const g=j===0?scores[i][0]:0;
   const a=j===1?([0,4,2,4][i]):0;
   // Tests deliberately isolate adapter behaviour: the scoring assignment for
   // game 3 can differ in assists; overall totals must still reconcile.
   rows.push({sourceHTOGameId:GAMES[i],originalWorkbookGameNumber:359+i,
    sourceWorkbookTable:'SkaterStatsByGame',player:'Fictional QA Skater '+i+'-'+j,
    sourceEquivalentFieldsWithObservedInputs:{
     Name:'Fictional QA Skater '+i+'-'+j,
     'Game #':359+i,Season:'W2026/27','Game Type':'Regular Season',Date:DATES[i],
     GP:1,G:g,A:a,Pts:g+a,PIM:i===3&&j===0?2:0,
     '+/-':-1,POTG:j===0?1:0
    },
    scoreOrRankComputed:false,workbookRowAssigned:false,historicalCareerReplayComplete:false
   });
  }
  rows.push({sourceHTOGameId:GAMES[i],originalWorkbookGameNumber:359+i,
   sourceWorkbookTable:'GoalieStatsByGame',player:'Fictional QA Goalie '+i,
   sourceEquivalentFieldsWithObservedInputs:{
    Name:'Fictional QA Goalie '+i,'Game #':359+i,Season:'W2026/27',
    'Game Type':'Regular Season',Date:DATES[i],GP:1,GA:scores[i][1],
    POTG:i===3?null:1
   },scoreOrRankComputed:false,workbookRowAssigned:false,historicalCareerReplayComplete:false});
 }
 const initial=rows.filter(r=>r.sourceHTOGameId===GAMES[0]);
 const saved=initial.map(r=>({
  table:r.sourceWorkbookTable,gameNumber:String(r.originalWorkbookGameNumber),
  values:structuredClone(r.sourceEquivalentFieldsWithObservedInputs)
 }));
 const goalie=saved.find(r=>r.table==='GoalieStatsByGame');
 goalie.values.GA='0';goalie.values.POTG='0';
 saved.push({table:'SkaterStatsByGame',gameNumber:'359',
  values:{Name:'Unknown, Johnny',GP:'1',G:'0',A:'0',Pts:'0',PIM:'0','+/-':'-1',POTG:'0'}});
 return {
  stage:{schema:'hockeyos-awards-workbook-game-log-staging/v1',
   status:'INPUT_STAGE_PASS_AWARD_MODEL_HELD',
   season:'W2026/27',workbookAuthority:{sha256:sourceSHA},
   counts:{observedPlayerGameRows:58,teamGames:4}},
  join:{schema:'hockeyos-awards-external-to-alltimeschedule-source-join/v1',
   status:'FOUR_GAME_WORKBOOK_SEQUENCE_JOIN_PASS_CURRENT_SCORE_HELD',
   sourceWorkbookSHA256:sourceSHA,mapped},
  records:{schema:'hockeyos-awards-source-equivalent-player-game-join/v1',
   status:'SOURCE_EQUIVALENT_GAME_NUMBER_JOIN_PASS_RATINGS_HELD',rows},
  existing:{schema:'hockeyos-disposable-master-existing-game-row-check/v1',
   workbookCopyUnchanged:true,sourceWorkbookCopySHA256:sourceSHA,sourceCopyRows:saved},
  savedAwardScoringGames:1
 };
}
test('pure adapter maps saved, verified staging shapes to original source field whitelists',()=>{
 const manifest=buildManifest(fixture());
 assert.equal(manifest.rows.length,58);
 assert.equal(manifest.games.length,4);
 assert.equal(manifest.cachedRows.length,15);
 assert.equal(manifest.rows.find(r=>r.table==='GoalieStatsByGame'&&r.htoGameId===GAMES[3]).stats.POTG,null);
 assert.equal(manifest.workbookScoredGames,1);
 assert.equal(manifest.founderApproved,false);
 const result=evaluate(manifest);
 assert.equal(result.status,'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD');
 assert.equal(result.errors.length,0);
 assert.deepEqual(result.decisions,{PRESERVE:13,CORRECTION_REVIEW:1,ADD_CANDIDATE:44});
 assert.equal(result.writeAuthorized,false);
});
test('adapter fails closed on workbook hash drift',()=>{
 const f=fixture();f.existing.sourceWorkbookCopySHA256='a'.repeat(64);
 assert.throws(()=>buildManifest(f),/workbook authority SHA/);
});
test('adapter fails closed on missing source row, source season drift or unknown input table',()=>{
 const a=fixture();a.records.rows.pop();assert.throws(()=>buildManifest(a),/row-count mismatch/);
 const b=fixture();b.records.rows[0].sourceEquivalentFieldsWithObservedInputs.Season='W2025/26';
 assert.throws(()=>buildManifest(b),/source metadata mismatch/);
 const c=fixture();c.records.rows[0].sourceWorkbookTable='AwardScoring';
 assert.throws(()=>buildManifest(c),/unrecognized workbook input table/);
});
test('adapter refuses current-season source with invented workbook calculation or GP',()=>{
 const f=fixture();f.records.rows[0].scoreOrRankComputed=true;
 assert.throws(()=>buildManifest(f),/calculated award/);
 const g=fixture();g.stage.counts.teamGames=3;
 assert.throws(()=>buildManifest(g),/manifest counts mismatch/);
});
test('adapter preserves explicit unknown goalie POTG but refuses absent skater raw inputs',()=>{
 const f=fixture();
 const g=f.records.rows.find(r=>r.sourceWorkbookTable==='GoalieStatsByGame'&&r.sourceHTOGameId===GAMES[3]);
 assert.equal(g.sourceEquivalentFieldsWithObservedInputs.POTG,null);
 const out=buildManifest(f);
 assert.equal(out.rows.find(r=>r.table==='GoalieStatsByGame'&&r.htoGameId===GAMES[3]).stats.POTG,null);
 const bad=fixture();delete bad.records.rows[0].sourceEquivalentFieldsWithObservedInputs.G;
 assert.throws(()=>buildManifest(bad),/required observed input missing/);
});
