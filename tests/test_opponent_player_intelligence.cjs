"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..","widgets");
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const api=require("../widgets/opponent-player-intelligence.js");
const league=read("league-intelligence.json"),feed=read("opponent-player-intelligence.json");
const clone=x=>structuredClone(x);
const tests=[
 ["Source-qualified adult Sunday scope admits no Brave or VAHL player",()=>{
   assert.equal(api.validate(feed,league),true);
   assert.equal(feed.teamCount,21);assert.equal(feed.playerCount,327);
   assert.ok(feed.teams.every(t=>t.sourceTeamId!==13679&&t.division!=="VAHL Division"));
   assert.equal(feed.svhlBravePlayerStatsPublished,false);
   assert.equal(feed.sourceAuthority.braveHC,"HTO_ONLY");
 }],
 ["327 source-profile specialty records are named, verified and never PPG-as-points",()=>{
   assert.equal(feed.currentSpecialtyProfilesVerified,327);
   const all=feed.teams.flatMap(t=>t.players);
   assert.equal(all.filter(p=>p.specialtyStatus==="PROFILE_VERIFIED").length,327);
   assert.ok(all.every(p=>p.specialtyStats?.ppGoals!==undefined &&
     p.specialtyStats?.ppAssists!==undefined&&
     p.specialtyStats?.pkGoals!==undefined&&
     p.specialtyStats?.gameWinningGoals!==undefined));
 }],
 ["Official player IDs and current-versus-prior game counts are separate",()=>{
   const other=feed.teams.find(t=>t.name==="Other Way");
   assert.ok(other);
   const result=api.team(feed,other.sourceTeamId);
   assert.equal(result.playerCount,other.players.length);
   const player=result.players.find(x=>x.playerId===68165);
   if(player){
    assert.equal(player.current.ptsPerReportedGP,
      Number((player.current.pts/player.current.gp).toFixed(2)));
    assert.ok(player.priorLatest===null||player.priorLatest.season!==undefined);
    assert.equal(player.profileUrl,
      "https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid=570&teamid="+
      other.sourceTeamId+"&playerid=68165&page_type=Adult");
   }
   assert.equal(api.team(feed,13679),null);
 }],
 ["Missing or fabricated source totals hold the whole new feed",()=>{
   const f=clone(feed);f.playerCount++;
   assert.throws(()=>api.validate(f,league),/PLAYER_COVERAGE_COUNT_DRIFT/);
 }],
 ["Forged Brave team or VAHL team cannot be used as adult opponent",()=>{
   const f=clone(feed);f.teams[0].sourceTeamId=13679;
   assert.throws(()=>api.validate(f,league),/TEAM_IDENTITY_AND_ROSTER_CHANGED/);
   const v=clone(feed);v.teams[0].division="VAHL Division";
   assert.throws(()=>api.validate(v,league),/TEAM_IDENTITY_AND_ROSTER_CHANGED/);
 }],
 ["Unreviewed player participation never becomes game-day attendance",()=>{
   const f=clone(feed);f.teams[0].players[0].nextGameAttendanceVerified=true;
   assert.throws(()=>api.validate(f,league),/PLAYER_COUNT_IDENTITY_OR_ATTENDANCE/);
 }],
 ["Forged specialty stats and invalid profile links are held",()=>{
   const f=clone(feed),p=f.teams[0].players[0];
   p.specialtyStats.ppGoals=p.g+1;
   assert.throws(()=>api.validate(f,league),/SPECIALTY_PROFILE_ARITHMETIC/);
   const url=clone(feed);url.teams[0].players[0].profileUrl="https://other.example/test";
   assert.throws(()=>api.validate(url,league),/PLAYER_COUNT_IDENTITY_OR_ATTENDANCE/);
 }],
 ["History cannot claim an unverified source identity or arithmetic",()=>{
   const f=clone(feed),p=f.teams.flatMap(t=>t.players).find(p=>p.priorSeasonTeamObservations.length>0);
   assert.ok(p);
   p.priorSeasonTeamObservations[0].profileUrl="https://other.example/player";
   assert.throws(()=>api.validate(f,league),/PRIOR_SEASON_SOURCE_BOUNDARY_OR_IDENTITY/);
 }],
 ["All source data is immutable through UI calculations",()=>{
   const before=JSON.stringify(feed);
   const roster=feed.teams[0];
   api.team(feed,roster.sourceTeamId);
   assert.equal(JSON.stringify(feed),before);
 }]
];
let fails=0;
for(const [title,fn] of tests){
 try{fn();console.log("PASS",title)}
 catch(e){fails++;console.error("FAIL",title,e.stack)}
}
if(fails)process.exitCode=2;
else console.log("OPPONENT_PLAYER_SOURCE_PASS",tests.length);
