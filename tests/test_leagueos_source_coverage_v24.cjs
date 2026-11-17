/* LeagueOS V24 source expansion, pending tier history and public demo safety. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),"utf8"));
const discovery=read("leagueos-fixture-discovery-v24.json");
const history=read("leagueos-strength-level-history-v24.json");
const model=read("leagueos-division-recommendations-v23.json");
const tiers=read("leagueos-division-strength-levels-v23.json");
const baseline=read("leagueos-source-qualified-current-fixtures-v4.json");
const clone=x=>JSON.parse(JSON.stringify(x));
const initial=discovery.lastMaterialChangeToronto==="2026-11-17";
const env={window:{},console,document:{getElementById:()=>null}};
vm.runInNewContext(fs.readFileSync(path.join(root,"leagueos-source-coverage-v24.js"),"utf8"),env,
 {filename:"leagueos-source-coverage-v24.js"});
const api=env.window.LeagueOSCoverageV24._test;
test("new public coverage and unassigned historical tier source pass unmodified",()=>{
 const old=JSON.stringify({discovery,history});
 const result=api.validate(discovery,history);
 assert.equal(result.discovery,discovery);assert.equal(result.history,history);
 assert.equal(JSON.stringify({discovery,history}),old);
 assert.equal(discovery.officialRecordsEdited,false);
 assert.equal(history.officialChanges,false);
});
test("scanned 102 team pages, original 411 reference plus 61 verified new IDs",()=>{
 assert.equal(baseline.counts.total,411);
 assert.ok(discovery.counts.currentLeagueTeams>=102);
 assert.equal(discovery.counts.sourcePagesAccepted,discovery.counts.currentLeagueTeams);
 assert.equal(discovery.counts.sourcePagesHeld,0);
 assert.ok(discovery.counts.sourceGameIDsObserved>=411);
 assert.ok(discovery.counts.newCandidateCount>=61);
 assert.equal(discovery.counts.newCandidateCount,discovery.candidates.length);
 assert.equal(discovery.counts.newSettled+discovery.counts.currentNewFuture+
  discovery.counts.newHeld,discovery.candidates.length);
 if(initial){
  assert.equal(discovery.counts.currentLeagueTeams,102);
  assert.equal(discovery.counts.sourceGameIDsObserved,472);
  assert.equal(discovery.counts.newCandidateCount,61);
  assert.equal(discovery.counts.newSettled,0);
  assert.equal(discovery.counts.currentNewFuture,61);
 }
 assert.equal(discovery.counts.sourceNights,4);
});
test("new future published references are all Sunday after Nov 22 and have no invented results",()=>{
 if(initial){
  assert.ok(discovery.candidates.every(x=>x.night==="Sunday"&&x.date>="2026-11-29"));
  assert.ok(discovery.candidates.every(x=>x.status==="NEW_FUTURE_RECIPROCAL"));
 }
 assert.ok(discovery.candidates.every(x=>x.officialWriteAllowed===false));
 assert.equal(new Set(discovery.candidates.map(x=>x.league_id+":"+x.game_id)).size,
  discovery.candidates.length);
});
test("every published game uses exact allowlisted SVHL ID and independent two-team evidence",()=>{
 for(const g of discovery.candidates){
  assert.equal(api.safeHref(g),g.officialGameUrl);
  assert.equal(g.sourceCount,2);
  assert.equal(g.reciprocal,true);
  assert.equal(g.statusEvidence,"EXACT_TWO_TEAM_SOURCE_GAME_ID_PARITY");
  assert.equal(g.sourceTeamPageSHA256.length,2);
  assert.ok(g.sourceTeamPageSHA256.every(x=>/^[a-f0-9]{64}$/.test(x)));
 }
});
test("six unrated source teams remain separate from the 96-team rating model",()=>{
 assert.equal(model.teams.length,96);
 assert.ok(discovery.unratedTeams.length>=6);
 assert.equal(discovery.counts.unratedByCurrentDivisionModel,discovery.unratedTeams.length);
 const rated=new Set(model.teams.map(t=>t.leagueId+":"+t.teamId));
 assert.ok(discovery.unratedTeams.every(t=>!rated.has(t.leagueId+":"+t.teamId)));
 if(initial)assert.ok(discovery.unratedTeams.every(t=>/playoff/i.test(t.division)));
});
test("one invalid standings source row does not hide the exact published team directory",()=>{
 assert.ok(discovery.counts.sourceInvalidStandingsRows>=0);
 assert.equal(discovery.teamDirectory.length,discovery.counts.currentLeagueTeams);
 assert.equal(new Set(discovery.teamDirectory.map(t=>t.leagueId+":"+t.teamId)).size,
  discovery.counts.currentLeagueTeams);
 if(initial)assert.equal(discovery.counts.sourceInvalidStandingsRows,1);
});
test("V23 recommendation gains source coverage evidence without new unverified goals",()=>{
 assert.ok(model.verifiedNewSettledGames>=0);
 assert.ok(model.overview.newlyDiscoveredSourceFixtures>=61);
 assert.ok(model.overview.expandedPublicTeamDirectory>=102);
 assert.ok(model.overview.sourceUnratedTeamCount>=6);
 assert.equal(model.officialCompetitionChanged,false);
 assert.equal(model.officialStandingsChanged,false);
});
test("current division strength remains unassigned for all fifteen source groups",()=>{
 assert.equal(history.counts.currentDivisions,15);
 assert.equal(history.counts.officialCurrentAssignments,0);
 assert.equal(history.currentDivisions.length,15);
 assert.ok(history.currentDivisions.every(x=>x.officialStrengthLevel===null&&
 x.approvalStatus==="CURRENT_LEVEL_UNASSIGNED"&&x.effectiveFrom===null&&
 x.officialApprovalRef===null&&x.schedulePlacementAuthorized===false));
 assert.equal(tiers.assignments.length,15);
});
test("historical Sunday archive presents 39 division-season labels without invented tiers",()=>{
 assert.equal(history.counts.historicalDivisionSeasonLabels,39);
 assert.equal(history.counts.officialHistoricalAssignments,0);
 assert.equal(history.historicalEvidence.length,39);
 assert.ok(history.historicalEvidence.every(x=>x.officialAssignedStrengthLevel===null&&
 x.permittedToCalibrateCrossNight===false&&x.approvalStatus==="HISTORICAL_LEVEL_NOT_VERIFIED"));
 assert.equal(history.officialAssignmentEvents.length,0);
 assert.equal(history.officialApprovalsConnected,false);
});
test("strength ledger SHA matches exact approved-source snapshots, not player name joins",()=>{
 const pairs=[
  ["currentTiers","leagueos-division-strength-levels-v23.json"],
  ["historicalSundayRoster","svhl-roster-intelligence.json"]
 ];
 for(const [k,file] of pairs){
  const digest=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
  assert.equal(history.sourceSha256[k],digest);
 }
 assert.equal(history.policy.sourceIdentity.includes("leagueId"),true);
});
test("published discovery SHA is grounded to frozen original source fixture registry",()=>{
 const sha=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,
  "leagueos-source-qualified-current-fixtures-v4.json"))).digest("hex");
 assert.equal(discovery.baseFixtureSha256,sha);
 const digest=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,
    "leagueos-fixture-discovery-v24.json"))).digest("hex");
 assert.match(model.sources.discovery.sha256,/^[a-f0-9]{64}$/);
 if(initial||model.overview.verifiedNewSettledGames>0){
  // Model may be older if discovery-only additions occurred without a settled score;
  // the mismatch is not authority to silently recalculate numeric strength.
  if(model.sources.discovery.sha256!==digest)
    assert.ok(discovery.lastMaterialChangeToronto>=model.sources.discovery.capturedAt);
 }
});
test("forged approval and official standings modifications are rejected",()=>{
 const a=clone(discovery);a.officialRecordsEdited=true;
 assert.throws(()=>api.validate(a,history),/fixture source/);
 const b=clone(history);b.officialApprovalsConnected=true;
 assert.throws(()=>api.validate(discovery,b),/tier history/);
 const c=clone(history);c.currentDivisions[0].officialStrengthLevel=2;
 assert.throws(()=>api.validate(discovery,c),/tier history/);
});
test("fake score and spoofed source host are held before display",()=>{
 const a=clone(discovery);a.candidates[0].officialWriteAllowed=true;
 assert.throws(()=>api.validate(a,history),/Discovered source game ID/);
 const b=clone(discovery);b.candidates[0].officialGameUrl=
  "https://leagues.sportsvillage.ca.evil.test/gameinfo.aspx?gameid=123";
 assert.equal(api.safeHref(b.candidates[0]),null);
 assert.throws(()=>api.validate(b,history),/Discovered source game ID/);
});
test("duplicate or missing exact game identity fails closed",()=>{
 const a=clone(discovery);a.candidates[1].game_id=a.candidates[0].game_id;
 assert.throws(()=>api.validate(a,history),/Discovered source game ID/);
 const b=clone(discovery);b.teamDirectory.pop();b.counts.currentLeagueTeams--;
 assert.throws(()=>api.validate(b,history),/Discovered source game ID|Unrated team|fixture source/);
});
test("source collection and placement rules do not infer player eligibility or ice inventory",()=>{
 assert.equal(discovery.noAvailableIceInference,true);
 assert.equal(/separate/i.test(history.policy.eligibility),true);
 assert.equal(model.bridgeEvidence.numericTierCalibrationEnabled,false);
 assert.equal(model.policy.rosterWeightInPlacement,0);
 assert.equal(model.policy.crossNightWeightInPlacement,0);
});
