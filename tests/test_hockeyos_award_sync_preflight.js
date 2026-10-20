'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluate}=require('./lib/hockeyos_award_sync_preflight');

const GAME_IDS=[3356177,3356178,3369564,3375601];
const DAY=['2026-09-20','2026-09-27','2026-10-04','2026-10-18'];
const GF=[0,3,1,2], GA=[3,6,3,7];
const SOURCES=[
 Array.from({length:14},(_,i)=>i+1),
 Array.from({length:16},(_,i)=>i+5),
 Array.from({length:12},(_,i)=>i+1),
 Array.from({length:12},(_,i)=>i+9)
];
const skater=n=>'FICTIONAL QA Skater '+String(n).padStart(2,'0');
const goalie=n=>'FICTIONAL QA Goalie '+String(n).padStart(2,'0');
const makeSource=(i)=>'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&gameID='+GAME_IDS[i]+'&p=boxscore';

function makeFixture(){
 const games=GAME_IDS.map((htoId,i)=>({
  htoId,workbookGameNumber:359+i,date:DAY[i],
  GF:GF[i],GA:GA[i],sourceUrl:makeSource(i)
 }));
 const rows=[];
 for(let i=0;i<4;i++){
  const players=SOURCES[i];
  let remainGoals=GF[i],remainAssists=[0,4,2,4][i];
  for(let j=0;j<players.length;j++){
   const g=Math.min(j===0?2:1,remainGoals);
   remainGoals-=g;
   const a=Math.min(1,remainAssists);
   remainAssists-=a;
   rows.push({
    htoGameId:GAME_IDS[i],workbookGameNumber:359+i,
    table:'SkaterStatsByGame',name:skater(players[j]),
    stats:{GP:1,G:g,A:a,Pts:g+a,PIM:i===3&&j===0?2:0,'+/-':-1,POTG:j===0?1:0}
   });
  }
  assert.equal(remainGoals,0);
  assert.equal(remainAssists,0);
  rows.push({
   htoGameId:GAME_IDS[i],workbookGameNumber:359+i,
   table:'GoalieStatsByGame',name:goalie([1,2,3,1][i]),
   stats:{GP:1,GA:GA[i],POTG:i===3?null:1}
  });
 }
 const cachedRows=[
 ...rows.filter(r=>r.htoGameId===GAME_IDS[0]&&r.table==='SkaterStatsByGame').slice(0,13).map(x=>structuredClone(x)),
 {...structuredClone(rows.find(x=>x.htoGameId===GAME_IDS[0]&&x.table==='GoalieStatsByGame')),
  stats:{GP:1,GA:0,POTG:0}},
 {htoGameId:GAME_IDS[0],workbookGameNumber:359,
   table:'SkaterStatsByGame',name:'Unknown, Johnny',stats:{GP:1,G:0,A:0,Pts:0,PIM:0,'+/-':-1,POTG:0}}
 ];
 return {
  season:'W2026/27',sourceWorkbookSha256:'a'.repeat(64),
  completedGames:4,workbookScoredGames:1,
  games,rows,cachedRows,
  allElevenWorkbookFormulaParityVerified:false,independentReviewerAccepted:false,founderApproved:false
 };
}
function copy(x){return structuredClone(x);}
test('fixture represents 54 observed skaters, four goalie appearances and 20 distinct skaters',()=>{
 const f=makeFixture(),s=f.rows.filter(r=>r.table==='SkaterStatsByGame');
 assert.equal(f.rows.length,58);
 assert.equal(s.length,54);
 assert.equal(new Set(s.map(r=>r.name)).size,20);
});
test('first import is held: preserve 13, review one correction, add 44, quarantine cached-only identity',()=>{
 const r=evaluate(makeFixture());
 assert.equal(r.status,'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD');
 assert.deepEqual(r.decisions,{PRESERVE:13,CORRECTION_REVIEW:1,ADD_CANDIDATE:44});
 assert.equal(r.sourceRecordCount,58);
 assert.equal(r.statsTotal.G,6);
 assert.equal(r.statsTotal.A,10);
 assert.equal(r.statsTotal.Pts,16);
 assert.equal(r.statsTotal.PIM,2);
 assert.equal(r.statsTotal.goalieGA,19);
 assert.equal(r.statsTotal.goaliePOTGUnknown,1);
 assert.equal(r.quarantinedCachedOnly.length,1);
 assert.equal(r.writeAuthorized,false);
 assert.equal(r.workbookModified,false);
 assert.equal(r.liveHTOContacted,false);
});
test('unchanged repeat recognizes all verified existing rows and never repeats inserts',()=>{
 const f=makeFixture();
 f.cachedRows=f.rows.map(r=>copy(r));
 const r=evaluate(f);
 assert.equal(r.status,'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD');
 assert.deepEqual(r.decisions,{PRESERVE:58,CORRECTION_REVIEW:0,ADD_CANDIDATE:0});
 assert.equal(r.writeAuthorized,false);
});
test('an explicit unknown goalie POTG is not silently converted into a zero correction',()=>{
 const f=makeFixture();
 f.cachedRows=f.rows.map(r=>copy(r));
 f.cachedRows.find(x=>x.htoGameId===GAME_IDS[3]&&x.table==='GoalieStatsByGame').stats.POTG=0;
 const r=evaluate(f);
 assert.equal(r.decisions.CORRECTION_REVIEW,0);
 assert.equal(r.statsTotal.goaliePOTGUnknown,1);
 assert.equal(r.writeAuthorized,false);
});
test('duplicate observed player-game identity fails closed',()=>{
 const f=makeFixture();f.rows.push(copy(f.rows[0]));
 const r=evaluate(f);
 assert.equal(r.status,'FAIL_CLOSED');
 assert.ok(r.errors.some(x=>x.includes('Repeated player-game')));
 assert.equal(r.writeAuthorized,false);
});
test('unknown official participant is rejected rather than merged into a real player',()=>{
 const f=makeFixture();
 f.rows[0].name='Unknown, Johnny';
 const r=evaluate(f);
 assert.equal(r.status,'FAIL_CLOSED');
 assert.ok(r.errors.some(x=>x.includes('unidentified')));
});
test('unapproved AwardScoring field cannot enter input columns',()=>{
 const f=makeFixture();
 f.rows[0].stats['Hart Award Score']=100;
 const r=evaluate(f);
 assert.equal(r.status,'FAIL_CLOSED');
 assert.ok(r.errors.some(x=>x.includes('unsupported field')));
});
test('wrong original game number fails closed',()=>{
 const f=makeFixture();f.rows[0].workbookGameNumber=362;
 const r=evaluate(f);
 assert.equal(r.status,'FAIL_CLOSED');
 assert.ok(r.errors.some(x=>x.includes('game ID mismatch')));
});
test('wrong or duplicated HTO source game identity fails closed',()=>{
 const a=makeFixture();a.games[0].sourceUrl=a.games[0].sourceUrl.replace(String(GAME_IDS[0]),'9999999');
 assert.equal(evaluate(a).status,'FAIL_CLOSED');
 const b=makeFixture();b.games[1].htoId=b.games[0].htoId;
 assert.equal(evaluate(b).status,'FAIL_CLOSED');
});
test('malformed real date and inconsistent game GF/GA fail closed',()=>{
 const a=makeFixture();a.games[0].date='2026-02-31';
 assert.equal(evaluate(a).status,'FAIL_CLOSED');
 const b=makeFixture();b.games[2].GF=99;
 assert.ok(evaluate(b).errors.some(x=>x.includes('Skater goals disagree')));
 const c=makeFixture();c.games[3].GA=10;
 assert.ok(evaluate(c).errors.some(x=>x.includes('Goalie GA disagree')));
});
test('one unrecorded goalie game is a hard integrity error',()=>{
 const f=makeFixture();
 f.rows=f.rows.filter(x=>x.table!=='GoalieStatsByGame'||x.htoGameId!==GAME_IDS[0]);
 const r=evaluate(f);
 assert.equal(r.status,'FAIL_CLOSED');
 assert.ok(r.errors.some(x=>x.includes('Expected one observed goaltender')));
});
test('setting unverified approvals to true cannot turn this QA module into a workbook writer',()=>{
 const f=makeFixture();
 f.workbookScoredGames=4;
 f.allElevenWorkbookFormulaParityVerified=true;
 f.independentReviewerAccepted=true;
 f.founderApproved=true;
 f.cachedRows=f.rows.map(x=>copy(x));
 for(const row of f.rows){if(row.table==='GoalieStatsByGame'&&row.stats.POTG===null)row.stats.POTG=0;}
 const r=evaluate(f);
 assert.equal(r.status,'RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD');
 assert.equal(r.writeAuthorized,false);
 assert.equal(r.workbookModified,false);
});

test('malformed records fail closed without accidentally throwing or accepting writes',()=>{
 for(const mode of ['game','row','stats']){
  const f=makeFixture();
  if(mode==='game')f.games[0]=null;
  if(mode==='row')f.rows[0]=null;
  if(mode==='stats')f.rows[0].stats=null;
  assert.doesNotThrow(()=>evaluate(f),mode);
  const result=evaluate(f);
  assert.equal(result.status,'FAIL_CLOSED',mode);
  assert.equal(result.writeAuthorized,false);
 }
});
test('missing historical workbook identity or baseline hash fails safely',()=>{
 const f=makeFixture();f.sourceWorkbookSha256='unverified';
 const result=evaluate(f);
 assert.equal(result.status,'FAIL_CLOSED');
 assert.equal(result.writeAuthorized,false);
});
