"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const model=require("../widgets/division-fit-model.js");
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",name),"utf8"));
const copy=x=>JSON.parse(JSON.stringify(x));
const src=read("league-intelligence.json"),history=read("brave-historical-verified-games.json");
const tests=[
 ["Admits only qualified live league and historically source-proven team-seasons",()=>{
  assert.ok(model.validate(src,history));
  const d=copy(src);d.currentSourceDataConcordant=false;
  assert.throws(()=>model.analyze(d,history),/UNQUALIFIED_PUBLIC_SOURCE/);
  const h=copy(history);h.teamSeasons[0].continuousFranchiseNotVerified=false;
  assert.throws(()=>model.analyze(src,h),/HISTORICAL_LINK_PROOF_INVALID/);
 }],
 ["Excludes non-adult league team records and playoff placeholder from adult re-grouping",()=>{
  const result=model.analyze(src,history);
  assert.equal(result.adultPoolTeamCount,22);
  assert.deepEqual(result.poolDivisions,["Fazzari Partners","The Cristillo Division","Remax Division"]);
  assert.equal(result.separateLeagueRecordsExcluded,src.teams.length-result.adultPoolTeamCount);
  assert.ok(result.teams.every(t=>model.poolDivisions.includes(t.divisionNow)));
 }],
 ["Counts reciprocal games once and retains verifiable current-division cross-links",()=>{
  const result=model.analyze(src,history);
  assert.ok(result.gameGraph.verifiedGamesInPool>=43,"verified completed pool games should not regress");
  assert.ok(result.gameGraph.verifiedGamesInPool<=src.verifiedReciprocalCompletedGames);
  assert.ok(result.gameGraph.crossCurrentDivisionGames>=16);
  assert.equal(result.gameGraph.withinCurrentDivisionGames+
    result.gameGraph.crossCurrentDivisionGames,result.gameGraph.verifiedGamesInPool);
  assert.equal(result.gameGraph.links.reduce((n,g)=>n+g.games,0),
    result.gameGraph.verifiedGamesInPool);
  assert.ok(result.gameGraph.links.every(g=>g.meanAbsoluteGoalMargin>=0));
 }],
 ["Scenario assignments preserve all 22 distinct teams and fixed group capacities",()=>{
  const result=model.analyze(src,history);
  const original=result.scenarios[0].groups.map(g=>g.capacity).sort();
  for(const scenario of result.scenarios){
   const ids=scenario.groups.flatMap(g=>g.ids);
   assert.equal(ids.length,result.adultPoolTeamCount);
   assert.equal(new Set(ids).size,ids.length);
   assert.deepEqual(scenario.groups.map(g=>g.capacity).sort(),original);
   assert.ok(Number.isFinite(scenario.dispersion));
  }
 }],
 ["Exploratory scenarios never count as official assignments or win probabilities",()=>{
  const result=model.analyze(src,history);
  assert.equal(result.proposalReady,false);
  assert.equal(result.status,"EXPLORATORY_ONLY_INSUFFICIENT_SEASON_EVIDENCE");
  assert.equal(result.weekCount,1);
  assert.equal(result.playedTen,0);
  assert.equal(result.scenarios[0].kind,"ACTUAL_SOURCE_ASSIGNMENTS");
  assert.ok(result.scenarios.slice(1).every(x=>x.kind==="WHAT_IF_UNAPPROVED"));
 }],
 ["Limited scenario moves at most two source-consistent pairs, improves only arithmetic dispersion",()=>{
  const result=model.analyze(src,history),[base,swaps,bands]=result.scenarios;
  assert.ok(swaps.swaps<=2 && swaps.movedTeams<=4);
  assert.ok(swaps.dispersion<=base.dispersion);
  assert.ok(bands.dispersion<=base.dispersion);
  assert.ok(bands.movedTeams>=0);
 }],
 ["Historical Brave games inform source evidence, not existing scores or team identities",()=>{
  const sourceBefore=JSON.stringify(src),historyBefore=JSON.stringify(history);
  const result=model.analyze(src,history);
  assert.equal(result.historical.matchedGameComparisons,history.matchedGameCount);
  assert.equal(result.historical.heldComparisons,history.heldGameComparisons);
  assert.equal(result.historical.sameCurrentTeamClaims,0);
  assert.equal(JSON.stringify(src),sourceBefore);
  assert.equal(JSON.stringify(history),historyBefore);
 }],
 ["No historical source remains an explicit scope limitation without fabricating matches",()=>{
  const result=model.analyze(src);
  assert.equal(result.historical.matchedGameComparisons,0);
  assert.equal(result.historical.heldComparisons,null);
  assert.equal(result.proposalReady,false);
 }],
 ["Source games/teams cannot disappear unnoticed",()=>{
  const wrong=copy(src);
  const braves=wrong.teams.find(t=>t.leagueName==="Braves HC");
  braves.completedGames.pop();
  assert.throws(()=>model.analyze(wrong,history),/SOURCE_GAME_PARITY_FAILED/);
 }],
 ["Three-group scenario label and source integrity is stable across identical runs",()=>{
  const a=model.analyze(src,history),b=model.analyze(src,history);
  assert.deepEqual(a,b);
  assert.equal(a.scenarios.length,3);
  assert.equal(a.gameGraph.verifiedGamesInPool,
    a.gameGraph.crossCurrentDivisionGames+a.gameGraph.withinCurrentDivisionGames);
 }]
];
let fail=0;
for(const [title,test] of tests){
 try{test();console.log("PASS",title)}catch(e){fail++;console.error("FAIL",title,e.stack||e)}
}
if(fail)process.exitCode=2;
else console.log("DIVISION_FIT_RESEARCH_TESTS_PASS",tests.length);
