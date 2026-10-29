'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const mod=require('../widgets/player-bio-positive-streaks.js');
const make=()=>({schema:'hockeyos-verified-player-appearance-log/v1',
 status:'ALL_OFFICIAL_PLAYER_APPEARANCES_VERIFIED',playerId:'354060',
 coverage:'PLAYER_CAREER_ALL_PUBLISHED_GAME_TYPES',gamesPlayed:6,sourceDate:'2026-10-28',
 games:[
  {htoGameId:'3300001',date:'2025-03-01',season:'Winter 2024/2025',gameType:'REGULAR',g:1,a:0,pts:1,appearanceConfirmed:true,finalScoreVerified:true},
  {htoGameId:'3300002',date:'2025-03-07',season:'Winter 2024/2025',gameType:'PLAYOFF',g:0,a:1,pts:1,appearanceConfirmed:true,finalScoreVerified:true},
  {htoGameId:'3300003',date:'2025-09-01',season:'Winter 2025/2026',gameType:'REGULAR',g:1,a:1,pts:2,appearanceConfirmed:true,finalScoreVerified:true},
  {htoGameId:'3300004',date:'2025-09-07',season:'Winter 2025/2026',gameType:'REGULAR',g:0,a:0,pts:0,appearanceConfirmed:true,finalScoreVerified:true},
  {htoGameId:'3300005',date:'2025-09-14',season:'Winter 2025/2026',gameType:'REGULAR',g:1,a:0,pts:1,appearanceConfirmed:true,finalScoreVerified:true},
  {htoGameId:'3300006',date:'2025-09-21',season:'Winter 2025/2026',gameType:'REGULAR',g:1,a:0,pts:1,appearanceConfirmed:true,finalScoreVerified:true}
 ]});
test('verified positive point streak carries across regular/playoff and season boundaries',()=>{
 const v=mod.evaluate(make(),'354060');
 assert.equal(v.status,'VERIFIED_POSITIVE_STREAKS');
 assert.equal(v.points.length,3);
 assert.equal(v.points.crossesSeasons,true);
 assert.equal(v.points.crossesGameTypes,true);
 assert.equal(v.goals.length,2);
 assert.equal(v.assists.length,2);
 assert.equal(v.negativeStreaksPublished,false);
 assert.equal(v.publicRecordsWritten,false);
});
test('no authoritative career claim from partial game-event index',()=>{
 const partial=require('../widgets/svhl-player-game-index.json');
 const v=mod.evaluate(partial,'354060');
 assert.equal(v.status,'HELD');
 assert.equal(v.publicRecordsWritten,false);
});
test('missing scoreless appearance, duplicate game, wrong identity, unfinished result and inferred points hold',()=>{
 const cases=[];
 let a=make();a.gamesPlayed=7;cases.push(a);
 a=make();a.games[2].finalScoreVerified=false;cases.push(a);
 a=make();a.games[2].pts=9;cases.push(a);
 a=make();a.games[2].appearanceConfirmed=false;cases.push(a);
 a=make();a.games[2].htoGameId=a.games[1].htoGameId;cases.push(a);
 a=make();a.playerId='99999';cases.push(a);
 a=make();a.coverage='PARTIAL';cases.push(a);
 for(const candidate of cases)assert.equal(mod.evaluate(candidate,'354060').status,'HELD');
});
test('all source rows stay unchanged and no cold or slump information is computed',()=>{
 const s=make(),copy=JSON.stringify(s);
 const v=mod.evaluate(s,'354060');
 assert.equal(JSON.stringify(s),copy);
 assert.ok(!Object.hasOwn(v,'cold'));
 assert.ok(!Object.hasOwn(v,'slump'));
});
