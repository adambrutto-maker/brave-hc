"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const model=require("../widgets/division-fit-model.js");
const architect=require("../widgets/division-layout-optimizer.js");
const refine=require("../widgets/division-lineup-refinement.js");
const data=JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets/league-intelligence.json"),"utf8"));
const history=JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets/brave-historical-verified-games.json"),"utf8"));
const source=model.analyze(data,history),architected=architect.run(source);
const clone=v=>JSON.parse(JSON.stringify(v));
const item=(mode,shape)=>architected.choices[mode].find(x=>x.shapeId===shape);
const cases=[
 ["Research result never changes official league allocations or source inputs",()=>{
  const before=JSON.stringify(data),baseline=JSON.stringify(architected),original=JSON.stringify(source);
  const result=refine.refine(source,item("CONTINUITY","4-4-6-8"),"CONTINUITY");
  assert.equal(result.schema,refine.schema);
  assert.equal(result.officialAssignmentsChanged,false);
  assert.equal(result.leagueSubmissionReady,false);
  assert.equal(JSON.stringify(data),before);
  assert.equal(JSON.stringify(source),original);
  assert.equal(JSON.stringify(architected),baseline);
 }],
 ["Continuity refinement never forces an obsolete pair swap after accepted results change",()=>{
  const x=refine.refine(source,item("CONTINUITY","4-4-6-8"),"CONTINUITY");
  assert.equal(x.status,"BOUNDED_SOURCE_OBSERVED_RESEARCH_NOT_OFFICIAL");
  assert.equal(x.state,x.swaps.length>0?"SWAP_REFINED":"NO_ADMISSIBLE_IMPROVEMENT");
  assert.ok(x.improvement>=0);
  assert.ok(x.refined.objective<=x.original.objective);
  assert.equal(x.refined.sourceAdultGames,source.gameGraph.verifiedGamesInPool);
  assert.ok(x.refined.sourceVerifiedSameGroupGames>=0);
  assert.ok(x.swaps.length<=x.searchLimit);
 }],
 ["Tightest rating balance does not manufacture a non-improving lineup change",()=>{
  const x=refine.refine(source,item("BALANCE","4-4-4-4-6"),"BALANCE");
  assert.equal(x.state,"NO_ADMISSIBLE_IMPROVEMENT");
  assert.equal(x.swaps.length,0);
  assert.equal(x.improvement,0);
  assert.equal(x.groups.flatMap(g=>g.ids).length,22);
 }],
 ["Every flexible pattern preserves club IDs, capacity and zero odd groups for even total",()=>{
  for(const mode of architect.focuses)for(const proposal of architected.choices[mode]){
   const x=refine.refine(source,proposal,mode);
   const actual=x.groups.flatMap(g=>g.ids),reference=new Set(source.teams.map(t=>t.sourceTeamId));
   assert.equal(new Set(actual).size,22);
   assert.deepEqual(new Set(actual),reference);
   assert.equal(x.groups.filter(g=>g.capacity%2!==0).length,0);
   assert.deepEqual(x.groups.map(g=>g.capacity),proposal.groups.map(g=>g.capacity));
   assert.ok(x.improvement>=0);
   assert.ok(x.refined.objective<=x.original.objective);
   assert.ok(x.swaps.length<=x.searchLimit);
  }
 }],
 ["Replaying the same source gives identical work evidence and deterministic score",()=>{
  const proposal=item("CONTINUITY","4-4-6-8");
  const a=refine.refine(source,proposal,"CONTINUITY");
  const b=refine.refine(source,proposal,"CONTINUITY");
  assert.deepEqual(a,b);
  assert.ok(a.candidateSwapsEvaluated>0);
 }],
 ["Actual source game count is conserved and evidence never invents future matches",()=>{
  for(const s of architected.choices.CONTINUITY){
   const x=refine.refine(source,s,"CONTINUITY");
   assert.equal(x.refined.sourceVerifiedSameGroupGames+
     (x.refined.sourceAdultGames-x.refined.sourceVerifiedSameGroupGames),
     source.gameGraph.verifiedGamesInPool);
   assert.ok(x.refined.verifiedSameGroupPairings<=x.refined.possibleSameGroupPairings);
   assert.ok(x.refined.observedCloseGames<=x.refined.sourceVerifiedSameGroupGames);
   assert.equal(x.refined.sourceAdultGames,source.gameGraph.verifiedGamesInPool);
  }
 }],
 ["Unsupported objective must not enter the source-qualified optimizer",()=>{
  assert.throws(()=>refine.refine(source,item("CONTINUITY","6-8-8"),"FAKE"),
    /UNAPPROVED_OBJECTIVE/);
  assert.throws(()=>refine.refine(source,item("BALANCE","6-8-8"),"CONTINUITY"),
    /UNAPPROVED_OBJECTIVE/);
 }],
 ["Duplicate, omitted or forged source team IDs fail closed",()=>{
  const p=clone(item("CONTINUITY","4-4-6-8"));
  p.groups[0].ids[0]=p.groups[0].ids[1];
  assert.throws(()=>refine.refine(source,p,"CONTINUITY"),/SOURCE_TEAM_MISSING_OR_DUPLICATED/);
  const bad=clone(item("CONTINUITY","4-4-6-8"));
  bad.groups[0].ids.pop();
  assert.throws(()=>refine.refine(source,bad,"CONTINUITY"),/ILLEGAL_DIVISION_CAPACITY/);
 }],
 ["Even enrollment cannot be remodeled with two odd groups",()=>{
  const p=clone(item("CONTINUITY","4-4-6-8"));
  p.groups[0].ids.push(p.groups[1].ids.pop());
  p.groups[0].capacity=5;p.groups[1].capacity=3;
  assert.throws(()=>refine.refine(source,p,"CONTINUITY"),
    /ILLEGAL_DIVISION_CAPACITY/);
 }],
 ["Forged current-source games or edited pool cannot enter the refinement",()=>{
  const bad=clone(source);
  bad.gameGraph.verifiedMatches.push({...bad.gameGraph.verifiedMatches[0]});
  bad.gameGraph.verifiedGamesInPool++;
  assert.throws(()=>refine.refine(bad,item("BALANCE","6-8-8"),"BALANCE"),
    /SOURCE_GAME_DUPLICATE_OR_INVALID/);
  const wrong=clone(source);
  wrong.gameGraph.verifiedMatches.pop();
  assert.throws(()=>refine.refine(wrong,item("BALANCE","6-8-8"),"BALANCE"),
    /ACCEPTED_ADULT_MODEL_MISSING/);
 }],
 ["Odd total can still retain exactly one 5/7-team division using synthetic QA only",()=>{
  const test=clone(source);
  const gone=test.teams.pop();
  test.adultPoolTeamCount=21;
  test.gameGraph.verifiedMatches=test.gameGraph.verifiedMatches.filter(g=>
    !g.teamIds.includes(gone.sourceTeamId));
  test.gameGraph.verifiedGamesInPool=test.gameGraph.verifiedMatches.length;
  const proposed=architect.run(test);
  const p=proposed.choices.CONTINUITY[0];
  const result=refine.refine(test,p,"CONTINUITY");
  assert.equal(result.acceptedAdultTeamCount,21);
  assert.equal(result.oddDivisionsRequired,1);
  assert.equal(result.groups.filter(g=>g.capacity%2!==0).length,1);
  assert.equal(result.groups.flatMap(g=>g.ids).length,21);
  assert.equal(source.teams.length,22);
 }],
 ["Time budget stays small and never performs simulated game generation",()=>{
  const x=refine.refine(source,item("CONTINUITY","4-4-6-8"),"CONTINUITY");
  assert.ok(x.turnsEvaluated<=6);
  assert.ok(x.candidateSwapsEvaluated<=6*22*22);
  assert.ok(x.notes.some(n=>n.includes("No future games are simulated")));
  assert.ok(x.notes.some(n=>n.includes("not league-approved")||n.includes("not an exhaustive global optimization")));
 }]
];
let fails=0;
for(const [name,test] of cases){
 try{test();console.log("PASS",name)}
 catch(e){fails++;console.error("FAIL",name,e.stack||e)}
}
if(fails)process.exitCode=2;else console.log("DIVISION_LINEUP_REFINEMENT_TESTS_PASS",cases.length);
