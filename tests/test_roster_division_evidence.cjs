"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const fit=require("../widgets/division-fit-model.js"),
 architect=require("../widgets/division-layout-optimizer.js"),
 model=require("../widgets/roster-division-evidence.js");
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",n),"utf8"));
const league=read("league-intelligence.json"),roster=read("svhl-roster-intelligence.json"),
 hist=read("brave-historical-verified-games.json"),base=fit.analyze(league,hist),
 plans=architect.run(base);
const clone=x=>JSON.parse(JSON.stringify(x));
const cases=[
 ["Every active adult-team ID appears exactly once in roster construction evidence",()=>{
  const groups=plans.choices.BALANCE[0].groups;
  const result=model.summarize(league,roster,groups);
  assert.equal(result.teamCount,22);
  assert.equal(result.groups.reduce((n,g)=>n+g.capacity,0),22);
  assert.equal(result.sourceHistoricalPlayerSeasons,3222);
  assert.equal(result.status,"SOURCE_QUALIFIED_ROSTER_EVIDENCE_NOT_OPTIMIZATION_WEIGHT");
  assert.equal(result.approvedForecastWeight,0);
 }],
 ["Verified player history is descriptive and never a numerical team strength substitute",()=>{
  const groups=plans.choices.PRACTICAL[0].groups;
  const result=model.summarize(league,roster,groups);
  for(const group of result.groups){
   assert.ok(group.avgHistoricallyExperienced>=0);
   assert.ok(group.avgLinkedPriorPlayerIDs>=0);
   assert.ok(group.meanTopTwoPointShare===null ||
       group.meanTopTwoPointShare>=0&&group.meanTopTwoPointShare<=1);
   assert.ok(group.interpretation.includes("not validated"));
  }
  assert.ok(result.caveat.includes("excluded from the division optimizer"));
 }],
 ["Even and hypothetical odd capacity source IDs are handled only when source-supplied",()=>{
  for(const shape of plans.choices.BALANCE){
   const result=model.summarize(league,roster,shape.groups);
   assert.equal(result.groups.length,shape.divisionCount);
   assert.deepEqual(result.groups.map(g=>g.capacity).sort((a,b)=>a-b),
      [...shape.capacities].sort((a,b)=>a-b));
  }
 }],
 ["Missing or repeated team ID yields a source hold, not made-up roster depth",()=>{
  const p=clone(plans.choices.BALANCE[0].groups);
  p[0].ids[0]=p[1].ids[0];
  assert.throws(()=>model.summarize(league,roster,p),/GROUP_TEAM_NOT_UNIQUE_SOURCE_ID/);
  const q=clone(plans.choices.BALANCE[0].groups);
  q[0].ids.pop();
  assert.throws(()=>model.summarize(league,roster,q),/CAPACITY_INVALID/);
 }],
 ["Tampered official historical player ID or page source cannot enter grouped evidence",()=>{
  const x=clone(roster);
  x.teams[0].players[0].playerId=999999;
  assert.throws(()=>model.summarize(league,x,plans.choices.BALANCE[0].groups),
    /PLAYER_STATS_OR_IDENTITY_INVALID/);
  const y=clone(roster);y.historicalRosterManifest[0].sourceSHA256="not-valid";
  assert.throws(()=>model.summarize(league,y,plans.choices.BALANCE[0].groups),
    /HISTORICAL_ROSTER_SOURCE_PAGE_MISMATCH/);
 }],
 ["Completed league results and raw player roster data remain unchanged",()=>{
  const current=JSON.stringify(league),previous=JSON.stringify(roster);
  model.summarize(league,roster,plans.choices.BALANCE[0].groups);
  model.summarize(league,roster,plans.choices.CONTINUITY[0].groups);
  assert.equal(JSON.stringify(league),current);
  assert.equal(JSON.stringify(roster),previous);
 }]
];
let failed=0;for(const [name,fn] of cases){
 try{fn();console.log("PASS",name)}catch(e){failed++;console.error("FAIL",name,e.stack)}
}
if(failed)process.exitCode=2;else console.log("ROSTER_DIVISION_EVIDENCE_PASS",cases.length);
