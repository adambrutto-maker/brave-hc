/* LeagueOS V23: four-night division engine and governance unit tests. No network. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),
 crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),"utf8"));
const src=read("leagueos-division-recommendations-v23.json");
const tier=read("leagueos-division-strength-levels-v23.json");
const roster=read("leagueos-cross-night-player-bridge-v23.json");
const base=read("leagueos_division_alignment_public_v2.json");
const clones=()=>[JSON.parse(JSON.stringify(src)),JSON.parse(JSON.stringify(tier))];
const env={window:{},document:{addEventListener:()=>{}},console};
vm.runInNewContext(fs.readFileSync(path.join(root,"leagueos-division-plan-v23.js"),"utf8"),
 env,{filename:"leagueos-division-plan-v23.js"});
const api=env.window.LeagueOSDivisionV23._test;
const p=n=>src.nights.find(x=>x.night===n);
test("source schema is certified without declaring an official league approval",()=>{
 const [d,t]=clones();
 const v=api.validate(d,t);
 assert.equal(v.recommendations,d);
 assert.equal(d.officialCompetitionChanged,false);
 assert.equal(d.officialStandingsChanged,false);
 assert.equal(d.tiersState,"ALL_OFFICIAL_DIVISION_STRENGTH_LEVELS_UNASSIGNED");
 assert.equal(d.overview.officialApprovedTiers,0);
 assert.equal(d.policy.crossNightWeightInPlacement,0);
});
test("all four nights are shown and source scope is conserved at 96 teams",()=>{
 assert.deepEqual(src.nights.map(x=>x.night),["Sunday","Tuesday","Wednesday","Thursday"]);
 assert.deepEqual(src.nights.map(x=>x.sourceTeamCount),[26,16,20,34]);
 assert.equal(src.nights.reduce((s,n)=>s+n.sourceTeamCount,0),96);
 assert.equal(new Set(src.teams.map(x=>x.leagueId+":"+x.teamId)).size,96);
});
test("source division assignments start unassigned and retain all fifteen public divisions",()=>{
 assert.equal(tier.assignments.length,15);
 assert.ok(tier.assignments.every(x=>x.level===null&&x.approval==="UNASSIGNED"));
 assert.equal(new Set(tier.assignments.map(x=>x.key)).size,15);
 assert.deepEqual(tier.assignmentLevels.map(x=>x.level),[1,2,3,4,5]);
 assert.ok(tier.assignments.some(x=>x.program==="Masters"));
 assert.ok(tier.assignments.some(x=>x.program==="Separate program"));
});
test("source model validation rejected unsupported player priors before numeric placement",()=>{
 assert.equal(base.validation.roster_prior_selected,false);
 assert.equal(src.policy.rosterWeightInPlacement,0);
 assert.equal(src.policy.crossNightWeightInPlacement,0);
 assert.match(src.policy.reasonForZeroWeights,/validation/i);
});
test("all original source groupings and recommended groups conserve their exact source teams",()=>{
 for(const n of src.nights){
  const current=n.pools.flatMap(p=>p.current.flatMap(g=>g.teamIds));
  const recommended=n.pools.flatMap(p=>p.proposed.flatMap(g=>g.teams));
  assert.equal(current.length,n.sourceTeamCount);
  assert.equal(recommended.length,n.sourceTeamCount);
  assert.deepEqual(current.slice().sort(),recommended.slice().sort());
  for(const pool of n.pools){
   assert.ok(pool.current.length>=1&&pool.proposed.length>=1);
   assert.ok(pool.currentDivisionSizes.every(x=>x>=1));
   assert.ok(pool.recommendedDivisionSizes.every(x=>x>=1&&x<=10));
   assert.equal(pool.currentDivisionSizes.reduce((a,b)=>a+b,0),pool.sourceTeamCount);
   assert.equal(pool.recommendedDivisionSizes.reduce((a,b)=>a+b,0),pool.sourceTeamCount);
   assert.equal(pool.reviewRequired,true);
  }
 }
});
test("Sunday open can model unconventional 8/8/6 instead of current 5/7/10",()=>{
 const x=p("Sunday").pools.find(x=>x.program==="Open");
 assert.deepEqual(x.currentDivisionSizes,[5,7,10]);
 if(src.verifiedNewSettledGames===0)assert.deepEqual(x.recommendedDivisionSizes,[8,8,6]);
 if(src.verifiedNewSettledGames===0)assert.equal(x.status,"PROVISIONAL_COMPETITIVE_REALIGNMENT");
 if(x.status==="PROVISIONAL_COMPETITIVE_REALIGNMENT")
  assert.ok(x.currentMeanPairwiseMismatchPP>x.proposedMeanPairwiseMismatchPP);
});
test("Tuesday open can propose two eight-team divisions instead of three",()=>{
 const x=p("Tuesday").pools.find(x=>x.program==="Open");
 assert.deepEqual(x.currentDivisionSizes,[6,5,5]);
 if(src.verifiedNewSettledGames===0)assert.deepEqual(x.recommendedDivisionSizes,[8,8]);
 assert.ok(x.relativeObjectiveGain>=0);
 if(x.status==="PROVISIONAL_COMPETITIVE_REALIGNMENT")assert.ok(x.relativeObjectiveGain>0);
});
test("Wednesday open evaluates the entire connected twenty-team pool",()=>{
 const x=p("Wednesday").pools.find(x=>x.program==="Open");
 assert.equal(x.sourceTeamCount,20);
 assert.deepEqual(x.currentDivisionSizes,[6,8,6]);
 assert.ok(x.proposed.length>=2);
 assert.ok(x.proposedMeanPairwiseMismatchPP<=x.currentMeanPairwiseMismatchPP);
});
test("Thursday open may split a nine-team pool into 4/5 while holding disconnected source groups",()=>{
 const pool=p("Thursday").pools.find(x=>x.program==="Open"&&x.sourceTeamCount===9);
 assert.deepEqual(pool.currentDivisionSizes,[9]);
 if(src.verifiedNewSettledGames===0)assert.deepEqual(pool.recommendedDivisionSizes,[4,5]);
 const holds=p("Thursday").pools.filter(x=>x.status==="SOURCE_QUALITY_HOLD_KEEP_CURRENT");
 assert.equal(holds.length,2);
 assert.ok(holds.some(x=>x.sourceHolds.some(e=>e.reason==="DIVISION_SPANS_DISCONNECTED_SOURCE_COMPONENTS")));
});
test("Sunday separate program remains protected when four public rosters are unqualified",()=>{
 const pool=p("Sunday").pools.find(x=>x.program==="Separate program");
 assert.equal(pool.sourceTeamCount,4);
 assert.ok(["SOURCE_QUALITY_HOLD_KEEP_CURRENT","CURRENT_GROUPS_RETAINED_NO_MATERIAL_GAIN"].includes(pool.status));
 assert.deepEqual(pool.currentDivisionSizes,[4]);
 assert.deepEqual(pool.recommendedDivisionSizes,[4]);
});
test("Thursday Masters groups remain protected and never merge across disconnected components",()=>{
 const pools=p("Thursday").pools.filter(x=>x.program==="Masters");
 assert.equal(pools.length,2);
 assert.deepEqual(pools.map(x=>x.sourceTeamCount).sort(),[5,6]);
 assert.ok(pools.every(x=>x.currentDivisionSizes.join(",")===x.recommendedDivisionSizes.join(",")));
});
test("every recommended team is from the exact night, program, component as its source",()=>{
 const byId=new Map(src.teams.map(x=>[x.leagueId+":"+x.teamId,x]));
 for(const n of src.nights)for(const pool of n.pools){
  for(const g of pool.proposed)for(const id of g.teams){
   const t=byId.get(n.leagueId+":"+id);
   assert.ok(t);assert.equal(t.night,pool.night);
   assert.equal(t.program,pool.program);
   assert.equal(t.component,pool.component);
  }
 }
});
test("70 current player IDs bridge nights using direct player IDs, not names",()=>{
 assert.ok(roster.counts.crossNightPlayerIDsWithPublishedGP>=60);
 assert.equal(src.overview.crossNightVerifiedPlayerIDs,roster.counts.crossNightPlayerIDsWithPublishedGP);
 assert.equal(roster.counts.qualifiedTeams+roster.counts.heldTeams,96);
 assert.ok(roster.counts.qualifiedTeams>=88);
 assert.ok(roster.counts.heldTeams<=8);
 assert.ok(roster.bridges.every(x=>x.samePlayerIdDirectPublicEvidence&&x.observations.length>=2));
 assert.equal(roster.counts.crossProgramBridgeIDs,1);
});
test("no public cross-night numeric calibration is claimed without league-authorized tiers",()=>{
 assert.equal(src.bridgeEvidence.numericTierCalibrationEnabled,false);
 assert.ok(src.bridgeEvidence.divisionPairEvidence.length>=20);
 assert.ok(src.bridgeEvidence.divisionPairEvidence.every(x=>x.appliedToPlacementModel===false));
 assert.ok(src.bridgeEvidence.divisionPairEvidence.some(x=>x.exactSourcePlayerIds>=5));
});
test("personal roster scoring sample/strength context is present but not mistaken for registration",()=>{
 const cases=src.teams.filter(x=>x.priorRosterSamples>=8);
 assert.ok(cases.length>=20);
 assert.ok(src.teams.some(x=>x.crossNightRosterIDs>=2));
 assert.ok(src.teams.every(x=>typeof x.sourceDivision==="string"&&typeof x.night==="string"));
 assert.match(src.policy.sideSignals,/roster/i);
});
test("current source fingerprints cover model, player IDs, official tier policy and fixtures",()=>{
 for(const key of ["model","roster","historical","tiers","fixtures"]){
  const entry=src.sources[key];
  assert.match(entry.sha256,/^[a-f0-9]{64}$/);
  const bytes=fs.readFileSync(path.join(root,entry.file));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),entry.sha256);
 }
});
test("Sunday exact archived player IDs carry source division and season experience but not invented official tiers",()=>{
 assert.ok(src.overview.sundayTeamPlayerHistoryLinks>=200);
 const team=src.teams.find(t=>t.name==="Braves HC"&&t.night==="Sunday");
 assert.ok(team);
 assert.ok(team.archivedDivisionEvidence.exactHistoryPlayerIds>=10);
 assert.ok(team.archivedDivisionEvidence.divisions.some(x=>x.season==="Sunday Winter 2025/26"));
 assert.ok(team.archivedDivisionEvidence.divisions.every(x=>x.approvedHistoricalDivisionTier===null));
 assert.ok(src.teams.filter(x=>x.night!=="Sunday").every(x=>x.archivedDivisionEvidence.exactHistoryPlayerIds===0));
});
test("no new daily settled result is fabricated before its Toronto game night",()=>{
 if(src.verifiedNewSettledGames===0){
  assert.equal(src.dailyRefreshStatus,"NO_NEW_RECIPROCAL_SETTLED_GAME_SOURCE");
  assert.equal(src.overview.verifiedNewSettledGames,0);
 }
 assert.equal(src.officialStandingsChanged,false);
});
test("tampered source-authority flags and invented tier levels fail closed",()=>{
 const [a,t]=clones();a.officialCompetitionChanged=true;
 assert.throws(()=>api.validate(a,t),/qualification|authority/);
 const [b,t2]=clones();t2.assignments[0].level=1;
 assert.throws(()=>api.validate(b,t2),/not officially authorized/);
 const [c,t3]=clones();c.policy.crossNightWeightInPlacement=0.5;
 assert.throws(()=>api.validate(c,t3),/qualification|authority/);
});
test("team omitted or duplicated in a proposed division fails before any UI",()=>{
 const [a,t]=clones();
 const group=a.nights[0].pools[0].proposed[0];
 group.teams[0]=group.teams[1];
 assert.throws(()=>api.validate(a,t),/conserve|qualification|authority/);
});
test("browser-local division tier draft ignores malformed state",()=>{
 const snap=api.readDraft({getItem:()=>"{bad"});
 assert.equal(snap,null);
 const wrong=api.readDraft({getItem:()=>JSON.stringify({version:2,drafts:{"k":1}})});
 assert.equal(wrong,null);
 const good=api.readDraft({getItem:()=>JSON.stringify({version:1,sourceTierDigest:"abc",drafts:{"x":2}})});
 assert.equal(good.drafts.x,2);
});
test("official business rule never changes Masters/Separate program eligibility",()=>{
 assert.ok(src.policy.currentModelComponents.includes("Masters"));
 assert.ok(src.policy.currentModelComponents.includes("source-connected"));
 assert.ok(src.overview.programsProtected.includes("Masters"));
 assert.ok(src.overview.programsProtected.includes("Separate program"));
});
