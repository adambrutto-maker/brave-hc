/* Dynamic no-write V25 release gate for daily source-qualified updates.
 * Unlike the initial snapshot tests, accepts genuinely changed final scores,
 * team output and future fixture coverage only when all source integrity holds.
 */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const W=path.resolve(__dirname,"../widgets");
const read=n=>JSON.parse(fs.readFileSync(path.join(W,n),"utf8"));
const sha=n=>crypto.createHash("sha256").update(fs.readFileSync(path.join(W,n))).digest("hex");
const a=read("leagueos-roster-player-projections-v25.json");
const b=read("leagueos-division-lifecycle-v25.json");
const e=read("leagueos-division-recommendations-v23.json");
const d=read("leagueos-fixture-discovery-v24.json");
test("V25 output remains a bounded public research scenario with no official actions",()=>{
 assert.equal(a.schema,"bruttech-leagueos-roster-player-projections/v25");
 assert.equal(a.officialDivisionsChanged,false);
 assert.equal(a.officialPlayerStatsChanged,false);
 assert.equal(a.officialStandingsChanged,false);
 assert.equal(a.privateWorkbookPlayerRecordsIncluded,false);
 assert.equal(b.officialApprovalAvailable,false);
 assert.equal(b.officialDivisionModified,false);
 assert.equal(b.officialScheduleModified,false);
 assert.equal(b.officialStandingsModified,false);
 assert.equal(b.summary.scheduledIceSlots,0);
 assert.equal(b.summary.officialScheduleChangeActions,0);
});
test("all current source files exactly match their stored SHA-256 provenance",()=>{
 const files={
  model:"leagueos-division-recommendations-v23.json",
  prior:"leagueos-player-history-priors-v25.json",
  roster:"leagueos-cross-night-player-bridge-v23.json",
  registry:"leagueos-source-qualified-current-fixtures-v4.json"};
 for(const [key,file] of Object.entries(files))
  assert.equal(a.sourceModels.exactSourceSHA256[key],sha(file),key+" source drift");
 const discoverySha=sha("leagueos-fixture-discovery-v24.json");
 if(a.sourceModels.exactSourceSHA256.discovery!==discoverySha){
  // A new UNPLAYED source listing changes schedule evidence but not a settled
  // match result. Numerical forecasts intentionally retain their prior snapshot.
  assert.equal(a.sourceModels.exactSourceSHA256.discovery,e.sources.discovery.sha256);
  // A fixture-only source update can occur after prior settled game updates.
  // Only the separately regenerated lifecycle must track the new directory.
  assert.equal(b.sourceHashes.discovery,discoverySha);
 }
 assert.equal(b.sourceHashes.rosterAwareForecast,sha("leagueos-roster-player-projections-v25.json"));
 assert.equal(b.sourceHashes.discovery,sha("leagueos-fixture-discovery-v24.json"));
 assert.equal(b.sourceHashes.model,sha("leagueos-division-recommendations-v23.json"));
 assert.equal(a.sourceModels.historicalArchiveSourceSHA256,
  read("leagueos-competitive-balance-backtest-v25.json").sourceArchiveSHA256);
});
test("all 96 teams conserve single source identity and valid player G/A/P arithmetic",()=>{
 assert.equal(a.teams.length,96);
 const ids=new Set(a.teams.map(x=>x.leagueId+":"+x.teamId));
 assert.equal(ids.size,96);
 assert.equal(a.counts.estimatedSkaterProjections,a.players.length);
 assert.equal(a.counts.qualifiedCurrentTeamRosters+
  a.teams.filter(x=>x.rosterQuality!=="SOURCE_QUALIFIED_PUBLIC_SKATERS").length,96);
 for(const x of a.players){
  assert.equal(x.sourceGoals+x.sourceAssists,x.sourcePoints);
  assert.ok(x.sourceGP>0);
  assert.ok(x.projectedFinalGP>=x.sourceGP);
  assert.ok(Number.isFinite(x.projectedFullSeasonGoals));
  assert.ok(Number.isFinite(x.projectedFullSeasonAssists));
  assert.equal(x.officialStatChanged,undefined);
 }
 for(const x of a.teams){
  assert.ok(Number.isFinite(x.projectedScenarioStrength));
  assert.ok(Number.isFinite(x.projectedGoalsForPerGame));
  assert.ok(Number.isFinite(x.projectedGoalsAgainstPerGame));
  assert.ok(["A","B","C","D","UNRATED"].includes(x.provisionalABCD));
  assert.equal(x.provisionalBandOfficial,false);
  assert.equal(x.modelUse,"EXPERIMENTAL_ROSTER_CONSTRUCTION_SCENARIO_NOT_VALIDATED_OFFICIAL_TIER");
 }
});
test("proposed A-D groups contain the full team pool once without cross-night moves",()=>{
 const eligible=new Set(a.teams.map(t=>t.leagueId+":"+t.teamId));
 const seen=new Set();
 for(const n of b.nights){
  assert.ok(["Sunday","Tuesday","Wednesday","Thursday"].includes(n.night));
  for(const g of n.proposedGroups)for(const id of g.teamIds){
   const key=n.leagueId+":"+id;
   assert.ok(eligible.has(key),key);
   assert.ok(!seen.has(key),"Duplicate group placement "+key);
   seen.add(key);
   assert.equal(a.teams.find(t=>t.leagueId===n.leagueId&&t.teamId===id).night,n.night);
  }
 }
 assert.equal(seen.size,96);
});
test("future source comparison and unslotted scheduling never declare ice bookings",()=>{
 const f=b.scheduleImpact;
 assert.equal(f.length,b.summary.publishedFutureSourceFixtureReferences);
 assert.equal(f.filter(x=>x.modelCandidateImpact==="CROSS_GROUP_FIXTURE_REVIEW_IF_LEAGUE_REALIGNS").length,
  b.summary.crossDivisionSourceMatchupsForCommissionerReview);
 assert.equal(f.filter(x=>x.modelCandidateImpact==="PRESERVE_SOURCE_MATCHUP_WITHIN_CANDIDATE_GROUP").length,
  b.summary.sourceMatchupsUnaffectedBySimulation);
 assert.equal(f.filter(x=>x.modelCandidateImpact==="SOURCE_TEAM_UNRATED_OR_PROGRAM_HOLD").length,
  b.summary.teamOutsideModeledOrProgramHold);
 assert.ok(f.every(x=>x.newOfficialGameDate===null&&!x.sourceFixtureCancelled&&x.officialSourceUnchanged));
 assert.equal(b.unslottedMatchupDraft.length,b.summary.unslottedDraftMatchups);
 assert.ok(b.unslottedMatchupDraft.every(x=>x.slotDate===null&&x.rink===null&&
  x.sourcePublishedGameId===null&&x.requiresFacilityIceConfirmation));
 assert.ok(d.counts.newCandidateCount>=61);
});
test("midseason lock remains a commissioner decision requiring authorization",()=>{
 assert.equal(b.policy.firstReviewAfterWeek,5);
 assert.equal(b.policy.pointsCarryToNewDivision,true);
 assert.equal(b.policy.rosterFreezeIsNotDivisionFreeze,true);
 assert.equal(b.finalLockPolicySource,"USER_REQUESTED_PRODUCT_POLICY_NOT_SVHL_RULEBOOK");
 assert.equal(b.policy.afterLockAction,"MONITOR_REPORT_ONLY_NO_REALIGNMENTS");
 assert.equal(b.summary.officialDivisionChanges,0);
 assert.equal(b.memorialBranding.length,1);
 assert.equal(b.memorialBranding[0].displayName,"The Cristillo Division");
 assert.equal(b.memorialBranding[0].strengthLevel,null);
});
test("evidence audits retain limited model scope and calibrated-test holds",()=>{
 assert.equal(e.overview.modeledTeams,96);
 assert.equal(a.sourceModels.historicalPriorBaselineRosterSHA256.length,64);
 assert.equal(read("leagueos-competitive-balance-backtest-v25.json").
  deploymentGate.rosterScenarioPredictiveGainProven,false);
 assert.equal(read("leagueos-competitive-balance-backtest-v25.json").
  deploymentGate.calibratedDivisionMoveBenefitProven,false);
 assert.equal(read("leagueos-coach-division-context-v25.json").
  privatePlayerRowsPublished,false);
});
