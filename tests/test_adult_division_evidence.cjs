"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const scope=require("../widgets/adult-league-scope.js"),fit=require("../widgets/division-fit-model.js");
const insight=require("../widgets/league-insights.js");
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",name),"utf8"));
const league=read("league-intelligence.json"),history=read("brave-historical-verified-games.json"),
 archive=read("historical-svhl-standings.json");
const original=JSON.stringify(league);
const tests=[
 ["Separate hockey league is absent from adult team and division choices",()=>{
  const clubs=scope.teams(league),divisions=scope.divisions(league);
  assert.equal(clubs.length,22);assert.equal(divisions.length,3);
  assert.deepEqual(divisions.map(x=>x.name),["Fazzari Partners","The Cristillo Division","Remax Division"]);
  assert.equal(clubs.filter(x=>x.divisionNow==="VAHL Division").length,0);
 }],
 ["Adult league context rankings are 1 through 22, with no separate competition in denominator",()=>{
  const ranks=scope.adultRanks(league);
  assert.equal(ranks.size,22);
  assert.deepEqual([...ranks.values()].sort((a,b)=>a-b),Array.from({length:22},(_,i)=>i+1));
  assert.ok(!ranks.has(13737),"separate-league source ID is not adult ranked");
 }],
 ["Adult historical archive view hides separate-league tables but preserves source data",()=>{
  const old=archive.seasons.find(s=>s.season==="Sunday Winter 2025/26");
  assert.ok(old.divisions.some(d=>d.name==="VAHL Division"));
  assert.ok(!scope.archiveDivisions(old).some(d=>d.name==="VAHL Division"));
  assert.equal(scope.archiveDivisions(old).length,old.divisions.length-1);
  assert.equal(scope.archiveCompetitiveCount(archive),archive.competitiveTeamSeasonEntries-4);
 }],
 ["Division balance and readiness denominator use only 22 adult clubs",()=>{
  const review=insight.divisionReview(league,archive);
  assert.equal(review.eligibleTeams,22);
  assert.equal(review.groups.length,3);
  assert.equal(review.groups.reduce((n,g)=>n+g.teams,0),22);
 }],
 ["Grouping scenarios are based on same three adult divisions",()=>{
  const result=fit.analyze(league,history);
  assert.deepEqual(result.poolDivisions,[...scope.divisionsList]);
  assert.equal(result.adultPoolTeamCount,22);
  assert.equal(result.separateLeagueRecordsExcluded,5);
  assert.equal(result.scenarios.length,3);
  assert.equal(result.proposalReady,false);
 }],
 ["Current source-group game evidence matches the evolving reciprocal result ledger",()=>{
  const x=fit.analyze(league,history);
  const evidence=x.scenarios.find(s=>s.code==="CURRENT").evidence;
  assert.ok(evidence.observedSameGroupGames>=27);
  assert.ok(evidence.observedAcrossGroupGames>=16);
  assert.equal(evidence.allPossibleSameGroupPairings,71);
  assert.ok(evidence.observedUniqueSameGroupPairings<=evidence.observedSameGroupGames);
  assert.ok(evidence.twoGoalOrCloserGames<=evidence.observedSameGroupGames);
 }],
 ["Two limited swaps do not turn counterfactual games into simulated wins",()=>{
  const x=fit.analyze(league,history);
  const group=x.scenarios.find(s=>s.code==="LIMITED");
  assert.ok(group.swaps<=2&&group.movedTeams<=4);
  assert.ok(group.evidence.observedSameGroupGames>=0);
  assert.equal(group.evidence.observedSameGroupGames+
     group.evidence.observedAcrossGroupGames,x.gameGraph.verifiedGamesInPool);
  assert.ok(group.evidence.sampleWarning.includes("not a prediction"));
 }],
 ["Sorted-score groups show much weaker historical matchup coverage than current divisions",()=>{
  const x=fit.analyze(league,history);
  const band=x.scenarios.find(s=>s.code==="BANDED");
  assert.ok(band.evidence.observedSameGroupGames>=0);
  assert.equal(band.evidence.observedSameGroupGames+
     band.evidence.observedAcrossGroupGames,x.gameGraph.verifiedGamesInPool);
  assert.ok(band.evidence.observedPairingCoverage>=0&&band.evidence.observedPairingCoverage<=1);
  assert.ok(band.dispersion<x.scenarios[0].dispersion);
 }],
 ["Every scenario partitions exactly the same reciprocal game observations",()=>{
  const x=fit.analyze(league,history);
  for(const scenario of x.scenarios){
   assert.equal(scenario.evidence.observedSameGroupGames+
     scenario.evidence.observedAcrossGroupGames,x.gameGraph.verifiedGamesInPool);
   assert.ok(scenario.evidence.twoGoalOrCloserGames<=scenario.evidence.observedSameGroupGames);
   assert.ok(scenario.evidence.meanObservedGoalMargin===null ||
     scenario.evidence.meanObservedGoalMargin>=0);
  }
 }],
 ["Overlapping official source records are retained unchanged for independent audits",()=>{
  fit.analyze(league,history);
  scope.archiveCompetitiveCount(archive);
  assert.equal(JSON.stringify(league),original);
  assert.equal(league.currentLeagueTeamCount,27);
 }],
 ["Unknown source division cannot be added to adult pool without policy decision",()=>{
  const modified=JSON.parse(JSON.stringify(league));
  modified.divisions.push({name:"Some Other League",competitive:true});
  modified.teams.push({...league.teams[0],sourceTeamId:991999,
      leagueName:"OtherLeagueTeam",divisionNow:"Some Other League"});
  assert.ok(!scope.teams(modified).some(t=>t.leagueName==="OtherLeagueTeam"));
 }]
];
let fails=0;
for(const [name,test] of tests){try{test();console.log("PASS",name)}
catch(e){fails++;console.error("FAIL",name,e.stack)}}
if(fails)process.exitCode=2;else console.log("ADULT_DIVISION_EVIDENCE_PASS",tests.length);
