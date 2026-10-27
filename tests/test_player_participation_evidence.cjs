"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const model=require("../widgets/player-participation-evidence.js");
const read=n=>JSON.parse(fs.readFileSync(path.resolve(__dirname,"../widgets",n),"utf8"));
const index=read("svhl-player-game-index.json"),
 year=read("svhl-player-game-570.json"),
 sample=read("svhl-penalty-source-coverage.json");
const clone=x=>JSON.parse(JSON.stringify(x));
const current=index.currentPlayers;
const withEvents=current.find(p=>{
 const actual=year.teams.find(x=>x.sourceTeamId===p.currentTeamId)
  .playerSeasonSummaries.find(x=>x.playerId===p.playerId);
 return actual.events.length>=2;
});
const tests=[
 ["Published GP is not automatically considered game-by-game attendance",()=>{
  const result=model.analyze(index,year,withEvents.currentTeamId,withEvents.playerId);
  assert.equal(result.schema,model.schema);
  assert.equal(result.publishedSeasonGP,
   year.teams.find(t=>t.sourceTeamId===withEvents.currentTeamId)
    .playerSeasonSummaries.find(p=>p.playerId===withEvents.playerId).registeredSeasonGP);
  assert.equal(result.seasonAttendanceFullyVerified,false);
  assert.equal(result.playedWithoutScoringNotObservable,true);
  assert.equal(result.publicationOverrideAuthorized,false);
  assert.equal(result.penaltyMinutesFromScoringSheets,null);
 }],
 ["Distinct verified scoring games never double count several events in one match",()=>{
  const r=model.analyze(index,year,withEvents.currentTeamId,withEvents.playerId);
  assert.equal(new Set(r.scoringEvidenceGames.map(x=>x.gameId)).size,
    r.provenScoringInvolvementGames);
  assert.equal(r.eventRoleCount,r.scoringEvidenceGames.reduce((n,g)=>
    n+g.goalEvents+g.admittedAssistEvents,0));
  assert.ok(r.provenScoringInvolvementGames<=r.eventRoleCount);
 }],
 ["Unscored published GP remains unverified, not presumed absence",()=>{
  const p=current.find(t=>t.seasonEvidence[0].published.g===0 &&
    t.seasonEvidence[0].published.a===0 && t.seasonEvidence[0].published.pts===0 &&
    year.teams.some(x=>x.sourceTeamId===t.currentTeamId &&
      x.playerSeasonSummaries.some(y=>y.playerId===t.playerId && y.registeredSeasonGP>0)));
  assert.ok(p);
  const r=model.analyze(index,year,p.currentTeamId,p.playerId);
  assert.equal(r.provenScoringInvolvementGames,0);
  assert.equal(r.otherPublishedGPNotGameVerified,r.publishedSeasonGP);
  assert.equal(r.didNotScoreDoesNotProveAbsence,true);
 }],
 ["Player known scored games exceeding published GP is an explicit source hold",()=>{
  const d=clone(year);
  const t=d.teams.find(x=>x.sourceTeamId===withEvents.currentTeamId);
  t.playerSeasonSummaries.find(x=>x.playerId===withEvents.playerId).registeredSeasonGP=0;
  const r=model.analyze(index,d,withEvents.currentTeamId,withEvents.playerId);
  assert.equal(r.sourceContradiction,true);
  assert.equal(r.status,"SOURCE_DISCREPANCY_MINIMUM_EXCEEDS_PUBLISHED_GP");
  assert.equal(r.otherPublishedGPNotGameVerified,0);
 }],
 ["Unknown GameInfo game or tampered source fingerprint is refused",()=>{
  const d=clone(year),t=d.teams.find(x=>x.sourceTeamId===withEvents.currentTeamId);
  const p=t.playerSeasonSummaries.find(x=>x.playerId===withEvents.playerId);
  p.events[0].gameId=9999999;
  assert.throws(()=>model.analyze(index,d,t.sourceTeamId,p.playerId),
   /EVENT_NOT_PROVEN_FOR_SAME_TEAM_GAME/);
  const u=clone(year),v=u.teams.find(x=>x.sourceTeamId===withEvents.currentTeamId),
    x=v.playerSeasonSummaries.find(x=>x.playerId===withEvents.playerId);
  x.events[0].gamePageSHA256="modified";
  assert.throws(()=>model.analyze(index,u,v.sourceTeamId,x.playerId),
   /EVENT_NOT_PROVEN_FOR_SAME_TEAM_GAME/);
 }],
 ["A partial game cannot be promoted to verified attendance through event edits",()=>{
  const d=clone(year),p=d.teams.find(t=>t.sourceTeamId===withEvents.currentTeamId)
     .playerSeasonSummaries.find(t=>t.playerId===withEvents.playerId);
  const known=p.events[0];
  const existing=d.games.find(g=>g.status==="PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL");
  assert.ok(existing);
  p.events[0]={...known,gameId:existing.gameId,gameSource:existing.source,
   gamePageSHA256:existing.sourcePageSHA256,date:existing.date};
  assert.throws(()=>model.analyze(index,d,withEvents.currentTeamId,withEvents.playerId),
   /EVENT_NOT_PROVEN_FOR_SAME_TEAM_GAME/);
 }],
 ["Eight source-year sampled penalty tables contain no recorded penalty rows, not zero PIM",()=>{
  const proof=model.penaltySource(sample);
  assert.equal(proof.sampledGames,136);assert.equal(proof.seasons,8);
  assert.equal(proof.recordedPenaltyRowsFound,0);
  assert.ok(proof.message.includes("NOT proof of zero penalties"));
  assert.equal(sample.seasonPIMReconciled,false);
 }],
 ["Forged source page, duplicate game or fake penalty row is refused",()=>{
  const bad=clone(sample);
  bad.games[0].source="https://untrusted.invalid/";
  assert.throws(()=>model.penaltySource(bad),/PENALTY_SAMPLE_ID_OR_TABLE_UNQUALIFIED/);
  const duplicate=clone(sample);
  duplicate.games[1]={...duplicate.games[0]};
  assert.throws(()=>model.penaltySource(duplicate),/PENALTY_SAMPLE_ID_OR_TABLE_UNQUALIFIED/);
  const populated=clone(sample);
  populated.games[0].populatedPenaltyRows=2;
  assert.throws(()=>model.penaltySource(populated),/PENALTY_SAMPLE_ID_OR_TABLE_UNQUALIFIED/);
 }],
 ["No model is allowed to claim full GP or PIM reconciliation",()=>{
  const out=model.analyze(index,year,withEvents.currentTeamId,withEvents.playerId);
  assert.equal(out.seasonAttendanceFullyVerified,false);
  assert.equal(out.penaltyMinutesFromScoringSheets,null);
  assert.equal(index.registeredGPVerified,false);
  assert.equal(sample.penaltyGPVerified,false);
 }],
 ["Original season/source evidence remains immutable",()=>{
  const before=[JSON.stringify(index),JSON.stringify(year),JSON.stringify(sample)];
  model.analyze(index,year,withEvents.currentTeamId,withEvents.playerId);
  model.penaltySource(sample);
  assert.deepEqual([JSON.stringify(index),JSON.stringify(year),JSON.stringify(sample)],before);
 }]
];
let failures=0;for(const [title,test] of tests){try{test();console.log("PASS",title)}catch(e){failures++;console.error("FAIL",title,e.stack||e)}}
if(failures)process.exitCode=2;
else console.log("PLAYER_ATTENDANCE_LOWER_BOUND_AND_PENALTY_SCOPE_TESTS_PASS",tests.length);