/* LeagueOS V27: pure commissioner decision output and independent research validation.
 * No official league access, no authenticated roles, no game-booking service.
 */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),
 crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const read=x=>JSON.parse(fs.readFileSync(path.join(ROOT,x),"utf8"));
const seed=read("leagueos-connected-fictional-v26.json"),
 research=read("leagueos-decision-research-v27.json"),
 backtest=read("leagueos-competitive-balance-backtest-v25.json");
const env={window:{},document:{addEventListener:()=>{}},console,localStorage:{getItem:()=>null}};
for(const name of ["leagueos-connected-demo-v26.js","leagueos-decision-report-v27.js"])
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,name),"utf8"),env,{filename:name});
const v26=env.window.LeagueOSConnectedV26._test;
const v27=env.window.LeagueOSDecisionV27._test;
const copy=x=>JSON.parse(JSON.stringify(x));
const sim=(state=v26.newState(),size=9)=>
 v27.report(seed,state,v26.recommend(seed,{targetSize:size,overrides:state.overrides}),300);
test("V27 study publication derives from exact SHA-256 of V25 prequential backtest",()=>{
 const sha=crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,
  "leagueos-competitive-balance-backtest-v25.json"))).digest("hex");
 assert.equal(research.sourceSHA256,sha);
 assert.equal(research.eligibleCompletedGames,backtest.overall.games);
 assert.equal(research.sourceLeagueSeasons,backtest.coverage.leagueSeasons);
 assert.equal(research.sourceFile,"leagueos-competitive-balance-backtest-v25.json");
 assert.equal(v27.validateEvidence(research),research);
});
test("historical blowout association is observational and cannot claim V27 effectiveness",()=>{
 assert.equal(research.causalEvidence,false);
 assert.equal(research.incrementalRosterProjectionValidated,false);
 assert.equal(research.noFictionalOutcomesInStudy,true);
 assert.equal(research.noLeagueChanges,true);
 assert.equal(research.cohorts.balanced.games,14055);
 assert.equal(research.cohorts.moderate.games,1407);
 assert.equal(research.cohorts.balanced.sourceFiveGoalRate,.1686);
 assert.equal(research.cohorts.moderate.sourceFiveGoalRate,.2665);
 assert.equal(research.observedRateGapPP,9.79);
 assert.equal(research.notSufficientStrongMismatchSample,6);
});
test("fictional current groups 12/12 compare against A 8/9 and D 7 without B/C",()=>{
 const x=sim();
 assert.equal(x.schema,"bruttech-leagueos-commissioner-decision-report/v27");
 assert.equal(x.status,"FICTIONAL_DECISION_SUPPORT_UNAPPROVED");
 assert.deepEqual(copy(x.current.groupSizes),[12,12]);
 assert.deepEqual(copy(x.proposed.groupSizes),[8,9,7]);
 assert.equal(x.current.teamsCovered,24);
 assert.equal(x.proposed.teamsCovered,24);
 assert.equal(x.current.groupCount,2);
 assert.equal(x.proposed.groupCount,3);
 assert.ok(x.current.meanGap>x.proposed.meanGap);
 assert.ok(x.current.highGapFraction>x.proposed.highGapFraction);
 assert.ok(x.modeledImprovement.meanWithinDivisionGapReduction>0);
 assert.equal(x.modeledImprovement.notForecastOfBlowouts,true);
});
test("rating flag threshold is a sensitivity option, not a calibrated future win rate",()=>{
 const s=v26.newState(),rec=v26.recommend(seed);
 const low=v27.report(seed,s,rec,250),mid=v27.report(seed,s,rec,300),
  high=v27.report(seed,s,rec,400);
 assert.ok(low.current.highGapPairs>=mid.current.highGapPairs);
 assert.ok(mid.current.highGapPairs>=high.current.highGapPairs);
 assert.ok(high.proposed.highGapPairs<=mid.proposed.highGapPairs);
 for(const x of [low,mid,high]){
  assert.equal(x.noCausalPrediction,true);
  assert.equal(x.modeledImprovement.isFictionalScoreProxyOnly,true);
  assert.equal(x.schedule.changedLiveFixtures,0);
 }
 assert.throws(()=>v27.report(seed,s,rec,1000),/threshold/);
});
test("all 24 original fictional teams have one placement decision and no source mutations",()=>{
 const x=sim();
 assert.equal(x.movement.teams.length,24);
 assert.equal(new Set(x.movement.teams.map(y=>y.id)).size,24);
 assert.equal(x.movement.teams.filter(y=>y.held).length,0);
 assert.equal(x.movement.hypotheticalMoveCount,24);
 assert.equal(x.movement.realLeagueMovements,0);
 assert.equal(x.movement.sourceRegistrationChanges,0);
 assert.ok(x.movement.teams.every(y=>y.sourceGroup&&y.proposedGroup&&
  ["A","D"].includes(y.strengthGrade)));
 assert.equal(x.noOfficialWrites,true);
});
test("fictional next game keeps the same A-strength opponents with no venue time impact",()=>{
 const x=sim();
 assert.equal(x.schedule.sourceFictionalGameId,"FIC-GAME-001");
 assert.equal(x.schedule.existingGameStillWithinGroup,true);
 assert.equal(x.schedule.existingGameStatus,"FICTIONAL_REFERENCE_UNCHANGED");
 assert.equal(x.schedule.twoWeekDraftMatchups,22);
 assert.equal(x.schedule.allocatedIceSlots,0);
 assert.equal(x.schedule.changedLiveFixtures,0);
 assert.equal(x.schedule.earlyLateBalanceCalculated,false);
 assert.equal(x.schedule.iceInventory,"NOT_CONNECTED");
});
test("week 5 and week 12 may be reviewed fictionally; other weeks are monitoring-only",()=>{
 for(const wk of [1,4,5,6,11,12,13,23]){
  const s=v26.newState();s.currentWeek=wk;
  const x=sim(s);
  assert.equal(x.gates.reviewWindow,[5,12].includes(wk));
  assert.equal(x.gates.readyForFictionalReview,[5,12].includes(wk));
  assert.equal(x.gates.finalLockActive,wk>12);
  assert.equal(x.gates.officialApproval,false);
  assert.equal(x.gates.officialPublication,false);
  if(wk>12)assert.equal(x.gates.permittedAction,"FINAL_DIVISION_LOCK_MONITOR_ONLY");
 }
});
test("simulated commissioner review remains distinct from a fictional public publication",()=>{
 let s=v26.newState();
 s=v26.applyAction(s,seed,"REVIEW").state;
 const reviewed=sim(s);
 assert.equal(reviewed.gates.reviewRecordedInBrowser,true);
 assert.equal(reviewed.gates.fictionalPublicPreview,false);
 s=v26.applyAction(s,seed,"PUBLISH").state;
 const published=sim(s);
 assert.equal(published.gates.reviewRecordedInBrowser,true);
 assert.equal(published.gates.fictionalPublicPreview,true);
 assert.equal(published.gates.officialApproval,false);
 assert.equal(published.gates.officialPublication,false);
});
test("an isolated B-strength team becomes a hold and no schedule draft is produced",()=>{
 const s=v26.newState();s.overrides={"FIC-A-01":"B"};
 const rec=v26.recommend(seed,{overrides:s.overrides}),x=v27.report(seed,s,rec,300);
 assert.equal(x.holds.length,1);
 assert.equal(x.movement.teams.filter(y=>y.held).length,1);
 assert.equal(x.proposed.teamsCovered,23);
 assert.equal(x.comparisonReady,false);
 assert.equal(x.schedule.twoWeekDraftMatchups,0);
 assert.equal(x.gates.readyForFictionalReview,false);
 assert.equal(x.gates.permittedAction,"EVIDENCE_HOLD_UNDERSIZED_GROUP");
});
test("commissioner may experiment with 6-team target without a phantom B or C division",()=>{
 const x=sim(v26.newState(),6);
 assert.deepEqual(copy(x.proposed.groupSizes),[5,6,6,7]);
 assert.equal(x.proposed.groupCount,4);
 assert.equal(x.proposed.teamsCovered,24);
 assert.equal(x.noOfficialWrites,true);
});
test("forged source authority, original IDs or duplicate proposed teams all fail",()=>{
 const bad=copy(seed);bad.authorization.officialScheduleWrite=true;
 assert.throws(()=>v27.report(bad,v26.newState(),v26.recommend(seed)),/safety gates/);
 const dupe=copy(v26.recommend(seed));dupe.groups[1].teamIds[0]=dupe.groups[0].teamIds[0];
 assert.throws(()=>v27.report(seed,v26.newState(),dupe),/duplicate|conservation/);
 const forged=copy(research);forged.causalEvidence=true;
 assert.throws(()=>v27.validateEvidence(forged),/evidence/);
});
test("tampered historical cohort outcome, counts or identity scope are rejected",()=>{
 for(const change of [
  x=>{x.cohorts.moderate.sourceFiveGoalRate=.01},
  x=>{x.sourceFile="private-player-roster.csv"},
  x=>{x.incrementalRosterProjectionValidated=true},
  x=>{x.noFictionalOutcomesInStudy=false},
  x=>{x.notSufficientStrongMismatchSample=50}
 ]){
  const value=copy(research);change(value);
  assert.throws(()=>v27.validateEvidence(value),/evidence/);
 }
});
