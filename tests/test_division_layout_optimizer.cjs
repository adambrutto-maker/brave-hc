"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=require("../widgets/division-fit-model.js");
const optimizer=require("../widgets/division-layout-optimizer.js");
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",n),"utf8"));
const league=read("league-intelligence.json"),history=read("brave-historical-verified-games.json");
const ref=base.analyze(league,history),copy=x=>JSON.parse(JSON.stringify(x));
const rules=[
 ["Exhaustively enumerates all legal 4/6/8 partitions of 22",()=>{
  const patterns=optimizer.patterns(22).map(x=>x.join("-"));
  assert.deepEqual(patterns,["6-8-8","4-4-6-8","4-6-6-6","4-4-4-4-6"]);
  assert.ok(patterns.every(p=>p.split("-").map(Number).reduce((a,b)=>a+b,0)===22));
 }],
 ["All valid capacity orders are considered and every proposal partitions exactly 22 IDs",()=>{
  const m=optimizer.run(ref);
  assert.equal(m.exploredShapes,4);
  assert.deepEqual(m.layouts.map(x=>x.permutationsEvaluated),[3,12,4,5]);
  for(const mode of optimizer.focuses)for(const proposed of m.choices[mode]){
   const ids=proposed.groups.flatMap(g=>g.ids);
   assert.equal(ids.length,22);assert.equal(new Set(ids).size,22);
   assert.deepEqual(new Set(ids),new Set(ref.teams.map(t=>t.sourceTeamId)));
   assert.deepEqual(proposed.groups.map(g=>g.capacity).sort((a,b)=>a-b),
      proposed.capacities);
   assert.ok(proposed.groups.every(g=>[4,6,8].includes(g.capacity) &&
       g.min>=0&&g.max<=100&&g.spread>=0));
  }
 }],
 ["Returns actual lowest descriptive dispersion design without naming official league tiers",()=>{
  const m=optimizer.run(ref);
  assert.equal(m.leading.BALANCE,"4-4-4-4-6");
  assert.ok(m.choices.BALANCE.every((x,i,a)=>i===0||x.objectiveScore>=a[i-1].objectiveScore));
  assert.equal(m.researchOnly,true);
  assert.equal(m.officialDivisionsChanged,false);
  assert.equal(m.readyForLeagueSubmission,false);
 }],
 ["Also provides a conservative model-selected operational trade-off",()=>{
  const m=optimizer.run(ref);
  assert.equal(m.leading.PRACTICAL,"6-8-8");
  assert.ok(m.choices.PRACTICAL.every((x,i,a)=>i===0||x.objectiveScore>=a[i-1].objectiveScore));
  assert.ok(m.modes.some(x=>x.code==="CONTINUITY"));
  assert.ok(m.sourceLimitations.some(x=>x.includes("editorial research")));
 }],
 ["Current source size pattern is not confused with original league assignments",()=>{
  const m=optimizer.run(ref),p=m.choices.BALANCE.find(x=>x.shapeId==="6-8-8");
  assert.equal(p.kind,undefined); // this is a new research layout, not official
  assert.equal(ref.scenarios[0].kind,"ACTUAL_SOURCE_ASSIGNMENTS");
  assert.ok(p.groups.every(g=>g.key.startsWith("CANDIDATE_")));
 }],
 ["Historical games count as evidence only, never automatic same-franchise identity",()=>{
  const m=optimizer.run(ref);
  assert.equal(m.historicalBravesComparisons,79);
  assert.equal(m.sourceAdultGames,43);
  assert.equal(m.admittedWeeks,1);
  assert.equal(m.proposedForDiscussion,true);
  assert.equal(m.readyForLeagueSubmission,false);
 }],
 ["All shape proposals report only actual games between proposed group members",()=>{
  const m=optimizer.run(ref);
  for(const mode of optimizer.focuses)for(const p of m.choices[mode]){
   assert.equal(p.sameGroupObservedGames+p.acrossGroupObservedGames,
      ref.gameGraph.verifiedGamesInPool);
   assert.ok(p.sameGroupSourcePairings<=p.possibleGroupPairings);
   assert.ok(p.twoGoalOrCloserObserved<=p.sameGroupObservedGames);
   assert.equal(p.prospectiveOneRoundRobinGames,p.possibleGroupPairings);
   assert.ok(p.directPairCoverage>=0&&p.directPairCoverage<=1);
   assert.ok(p.proofNotice.includes("not simulate"));
  }
 }],
 ["Adding a division comes with explicit administrative and opponent-variety caveats",()=>{
  const m=optimizer.run(ref);
  for(const p of m.choices.BALANCE){
   assert.equal(p.movement.newResearchGroupsNeeded,p.divisionCount-3);
   assert.ok(p.movement.hypotheticalDifferentGroupCount>=0);
  }
  assert.ok(m.sourceLimitations.some(x=>x.includes("ice-time")));
  assert.ok(m.sourceLimitations.some(x=>x.includes("more divisions")));
 }],
 ["One source week never establishes a league ready realignment proposal",()=>{
  const m=optimizer.run(ref);
  assert.equal(m.admittedWeeks,1);
  assert.equal(m.status,"PROVISIONAL_RESEARCH_LAYOUTS_NOT_LEAGUE_APPROVED");
  assert.ok(m.modes.every(x=>x.description.length>30));
 }],
 ["Tampered source IDs and omitted games cannot enter the optimizer",()=>{
  const bad=copy(ref);bad.teams[0].sourceTeamId=bad.teams[1].sourceTeamId;
  assert.throws(()=>optimizer.run(bad),/ADULT_SOURCE_TEAM_RATINGS_INVALID/);
  const short=copy(ref);short.gameGraph.verifiedMatches.pop();
  assert.throws(()=>optimizer.run(short),/CURRENT_ADULT_RESEARCH_SOURCE_INVALID/);
 }],
 ["Unsupported capacity templates fail rather than quietly omit clubs",()=>{
  assert.throws(()=>optimizer.patterns(3),/INVALID_ADULT_POOL_SIZE/);
  assert.throws(()=>optimizer.patterns(17),/NO_SUPPORTED_4_6_8_PARTITION/);
 }],
 ["Repeat analysis is deterministic and writes no original league records",()=>{
  const before=JSON.stringify(league),old=JSON.stringify(history);
  assert.deepEqual(optimizer.run(ref),optimizer.run(ref));
  assert.equal(JSON.stringify(league),before);assert.equal(JSON.stringify(history),old);
 }]
];
let fails=0;for(const [title,test] of rules){
 try{test();console.log("PASS",title)}catch(e){fails++;console.error("FAIL",title,e.stack||e)}
}
if(fails)process.exitCode=2;else console.log("DIVISION_LAYOUT_OPTIMIZER_TESTS_PASS",rules.length);
