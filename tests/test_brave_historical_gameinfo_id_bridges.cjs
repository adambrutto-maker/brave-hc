"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const {build,gitSourceHash}=require("../scripts/build_brave_historical_gameinfo_id_bridges.cjs");
const dir=path.resolve(__dirname,"../widgets");
const read=n=>fs.readFileSync(path.join(dir,n));
const src=JSON.parse(read("brave-historical-verified-games.json"));
const leagues=[494,512,531,547];
const inputs=Object.fromEntries(leagues.map(lid=>[lid,read("svhl-player-game-"+lid+".json")]));
const seasons=Object.fromEntries(leagues.map(lid=>[lid,JSON.parse(inputs[lid])]));
const hashes={historicalVerifiedJSON:gitSourceHash(read("brave-historical-verified-games.json")),
 seasons:Object.fromEntries(leagues.map(lid=>[lid,gitSourceHash(inputs[lid])]))};
const clone=x=>JSON.parse(JSON.stringify(x));
const tests=[
 ["All 79 cross-source Brave H.C. meetings have a unique historical official GameInfo ID",()=>{
  const d=build(src,seasons,hashes);
  assert.equal(d.matchedHistoricalGames,79);
  assert.equal(d.sourceTeamSeasonOpponentGroups,35);
  assert.equal(d.fullGoalScoringSourceGames,75);
  assert.equal(d.heldScorerEventSourceGames,4);
  assert.equal(d.historicalComparisonsStillHeld,src.heldGameComparisons);
  assert.equal(new Set(d.games.map(g=>g.leagueId+"|"+g.gameId)).size,79);
  assert.equal(d.originalHistoricalH2HModified,false);
  assert.equal(d.videoTeamRatingProduced,false);
  assert.equal(d.historicalFranchiseContinuityInferred,false);
 }],
 ["Every historical score is exactly Brave results versus official home/away sides",()=>{
  const d=build(src,seasons,hashes);
  for(const g of d.games){
   const source=seasons[g.leagueId].games.find(x=>x.gameId===g.gameId);
   assert.equal(g.sourceGameInfoSHA256,source.sourcePageSHA256);
   assert.equal(g.sourceGameInfoURL,source.source);
   assert.ok(g.braveSourceTeamId!==g.opponentTeamId);
   assert.ok(g.braveSourceTeamId===g.officialHomeTeamId?
     g.publishedFinalHomeAway[0]===g.braveGF&&g.publishedFinalHomeAway[1]===g.braveGA:
     g.publishedFinalHomeAway[1]===g.braveGF&&g.publishedFinalHomeAway[0]===g.braveGA);
  }
 }],
 ["Byte-for-byte build is reproducible on source-bounded archived seasons",()=>{
  assert.deepEqual(build(src,seasons,hashes),
    JSON.parse(read("brave-historical-gameinfo-ids.json")));
 }],
 ["A tampered source game score is rejected",()=>{
  const copy=clone(seasons);copy[494].games[0].homeGoals+=12;
  // Alter the exact source-matched GameInfo record instead of an unrelated game.
  const d=build(src,seasons,hashes);const gid=d.games.find(g=>g.leagueId===494).gameId;
  copy[494].games.find(g=>g.gameId===gid).homeGoals+=1;
  assert.throws(()=>build(src,copy,hashes),/NO_UNIQUE_GAMEINFO_ID_FOR_HISTORICAL_MATCH/);
 }],
 ["Opponent source team ID cannot silently join on similar team name",()=>{
  const copy=clone(src);copy.teamSeasons[0].officialTeamSeasonId+=999999;
  assert.throws(()=>build(copy,seasons,hashes),/HISTORICAL_OFFICIAL_OPPONENT_ID_OR_TEAM_PAGE_SOURCE_DISAGREEMENT/);
 }],
 ["A wrong historical official team page SHA is rejected",()=>{
  const copy=clone(src);copy.teamSeasons[0].officialTeamPageSHA256="0".repeat(64);
  assert.throws(()=>build(copy,seasons,hashes),/HISTORICAL_OFFICIAL_OPPONENT_ID_OR_TEAM_PAGE_SOURCE_DISAGREEMENT/);
 }],
 ["One official historical game cannot serve two unrelated H2H observations",()=>{
  const copy=clone(src);
  const g=copy.teamSeasons[0];g.games.push(clone(g.games[0]));
  copy.matchedGameCount++;
  copy.teamSeasons[0].bravesRecord.gp++;
  assert.throws(()=>build(copy,seasons,hashes),/HISTORICAL_DUAL_SOURCE_79_GAME_PROOF_REQUIRED/);
 }],
 ["Excludes VAHL and seasons outside the four source-qualified historical game collections",()=>{
  const copy=clone(src);copy.teamSeasons[0].officialLeagueId=9999;
  assert.throws(()=>build(copy,seasons,hashes),/HISTORICAL_OFFICIAL_OPPONENT_ID_OR_TEAM_PAGE_SOURCE_DISAGREEMENT/);
  const copySeason=clone(seasons);copySeason[494].leagueAssignmentsOrPlayerTotalsWritten=true;
  assert.throws(()=>build(src,copySeason,hashes),/UNADMITTED_SEASON_GAMEINFO_EVIDENCE/);
 }],
 ["The four partial sheets stay held from player statistics",()=>{
  const d=build(src,seasons,hashes);
  const held=d.games.filter(g=>g.scorerEventEvidenceStatus==="HELD_PLAYER_GOAL_EVENT_SHEET");
  assert.equal(held.length,4);
  assert.ok(held.every(g=>!g.playerGPVerified&&!g.currentRosterContinuityVerified&&
    !g.videoObservationAccepted));
  assert.ok(d.games.every(g=>!g.scoutingIndexModified));
 }],
 ["Unknown Braves team alias and changed year/date cannot be inferred",()=>{
  const changed=clone(seasons);
  const gid=build(src,seasons,hashes).games[0];
  const team=changed[gid.leagueId].teams.find(t=>t.sourceTeamId===gid.braveSourceTeamId);
  team.name="Unverified Franchise Alias";
  assert.throws(()=>build(src,changed,hashes),/SOURCE_BRAVES_HISTORICAL_TEAM_ID_UNVERIFIED/);
  const changedLinks=clone(src);changedLinks.teamSeasons[0].games[0].date="2024-01-01";
  assert.throws(()=>build(changedLinks,seasons,hashes),/NO_UNIQUE_GAMEINFO_ID_FOR_HISTORICAL_MATCH/);
 }]
];
for(const [name,fn] of tests){fn();console.log("PASS "+name)}
console.log(JSON.stringify({status:"HISTORICAL_GAMEINFO_SOURCE_IDENTITY_TESTS_PASS",tests:tests.length,sourceCorrections:0}));
