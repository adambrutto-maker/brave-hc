"use strict";
// Portable HockeyOS source-qualified division movement regression; no network/writes.
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base=path.resolve(__dirname,"../widgets");
const scout=require(path.join(base,"roster-strength-scouting.js"));
const league=JSON.parse(fs.readFileSync(path.join(base,"league-intelligence.json"),"utf8"));
const roster=JSON.parse(fs.readFileSync(path.join(base,"svhl-roster-intelligence.json"),"utf8"));
const clone=o=>JSON.parse(JSON.stringify(o));
const adults=["Fazzari Partners","The Cristillo Division","Remax Division"];
const moved=[
 {id:13717,name:"Degenerates",from:"Fazzari Partners",to:"Remax Division"},
 {id:13709,name:"Sugo Sundays",from:"Remax Division",to:"The Cristillo Division"},
 {id:13716,name:"Young Guns",from:"Remax Division",to:"The Cristillo Division"}];
function transfer(league,id){
 const now=league.teams.find(t=>t.sourceTeamId===id)?.divisionNow;
 return league.movementLedger.events.find(e=>e.sourceTeamId===id &&
 e.eventType==="OBSERVED_DIVISION_TRANSFER"&&e.toDivision===now);
}
test("same official team ID remains linked after current documented movement",()=>{
 assert.equal(scout.valid(league,roster),true);
 assert.equal(league.teams.filter(x=>adults.includes(x.divisionNow)).length,22);
 const reports=league.teams.filter(x=>adults.includes(x.divisionNow))
    .map(t=>scout.analyze(league,roster,t.leagueName));
 assert.equal(reports.length,22);
 for(const m of moved){
  const r=reports.find(x=>x.teamId===m.id);assert.ok(r);
  assert.equal(r.name,m.name);
  assert.equal(r.rosterDivisionAtCapture,m.from);
  assert.equal(r.division,m.to);
  assert.equal(r.divisionMovementEvidence?.sourceTeamId,m.id);
  assert.equal(r.divisionMovementEvidence?.effectiveDateVerified,false);
 }
});
test("division source counts derive from current source, never hard-coded October membership",()=>{
 const bridge=scout.bridge(league);
 assert.deepEqual(bridge.groups.map(x=>x.teams),
   adults.map(name=>league.teams.filter(t=>t.divisionNow===name).length));
 assert.equal(bridge.groups.reduce((n,x)=>n+x.teams,0),22);
 assert.equal(bridge.groups.reduce((n,x)=>n+x.crossDivisionGames,0),
              bridge.verifiedCrossDivisionGames*2);
});
test("historical snapshot is not represented as current-game attendance",()=>{
 const r=scout.analyze(league,roster,"Sugo Sundays");
 assert.equal(r.noCurrentGameDayAttendanceEvidence,true);
 assert.equal(r.rosterSourceCurrentQualified,false);
 assert.ok(r.rosterSourceAgeDays>8);
 assert.match(r.rosterSourceStatus,/STALE_CURRENT_ROSTER_NOT_QUALIFIED/);
 assert.match(scout.message(r),/NOT current roster confirmation/);
 assert.match(scout.message(r),/effective date unknown/);
 assert.equal(r.noWinProbability,true);
});
test("unmoved team has no fabricated move",()=>{
 const r=scout.analyze(league,roster,"Other Way");
 assert.equal(r.divisionMovementEvidence,null);
 assert.match(scout.message(r),/Division source unchanged/);
});
test("missing matching official transfer is a source HOLD",()=>{
 const l=clone(league);l.movementLedger.events=l.movementLedger.events.filter(e=>e.sourceTeamId!==13717);
 assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING/);
});
test("duplicate official transfer is ambiguous and held",()=>{
 const l=clone(league);l.movementLedger.events.push(clone(transfer(l,13717)));
 assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING_OR_AMBIGUOUS/);
});
test("official source basis and event type cannot be weakened",()=>{
 for(const change of [{sourceBasis:"STALE_GUESS"},{eventType:"UNVERIFIED_TRANSFER"},
                       {effectiveDateNotVerified:false},{eventId:"fabricated"}]){
  const l=clone(league);Object.assign(transfer(l,13717),change);
  assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING_OR_AMBIGUOUS/);
 }
});
test("to/from division identity cannot be swapped without source proof",()=>{
 for(const change of [{fromDivision:"The Cristillo Division"},
                       {toDivision:"The Cristillo Division"}]){
  const l=clone(league);Object.assign(transfer(l,13717),change);
  assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING_OR_AMBIGUOUS/);
 }
});
test("source chronology is validated and effective date not assumed",()=>{
 for(const change of [{firstObservedAt:"2027-01-01T00:00:00Z"},
                       {lastObservedAt:"2027-01-01T00:00:00Z"}]){
  const l=clone(league);Object.assign(transfer(l,13717),change);
  assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING_OR_AMBIGUOUS/);
 }
});
test("out-of-date membership ledger cannot pass as current league agreement",()=>{
 const l=clone(league);l.movementLedger.latestSnapshotUTC="2025-01-01T00:00:00Z";
 assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_LEDGER_NOT_QUALIFIED/);
});
test("new undocumented move is not silently admitted by current division label",()=>{
 const l=clone(league);l.teams.find(x=>x.leagueName==="Other Way").divisionNow="Remax Division";
 assert.throws(()=>scout.valid(l,roster),/DIVISION_TRANSFER_SOURCE_PROOF_MISSING/);
});
test("duplicate current-team official IDs are blocked before roster inspection",()=>{
 const l=clone(league),t=l.teams.filter(x=>adults.includes(x.divisionNow));
 t[1].sourceTeamId=t[0].sourceTeamId;
 assert.throws(()=>scout.valid(l,roster),/CURRENT_ROSTER_TEAM_ID_COLLISION/);
});
test("forged profile URL, team name, or archive hash remains inadmissible",()=>{
 const a=clone(roster);a.teams[0].players[0].profileUrl="https://example.org/fake";
 assert.throws(()=>scout.valid(league,a),/PLAYER_STATS_OR_IDENTITY_INVALID/);
 const b=clone(roster);b.teams[0].name="Invented Franchise";
 assert.throws(()=>scout.valid(league,b),/TEAM_SOURCE_ID_OR_COUNT_INVALID/);
 const c=clone(roster);c.historicalRosterManifest[0].sourceSHA256="0";
 assert.throws(()=>scout.valid(league,c),/HISTORICAL_ROSTER_SOURCE_PAGE_MISMATCH/);
});
test("dated scouting notes never label October game counts as live-current data",()=>{
 const report=scout.analyze(league,roster,"Sugo Sundays");
 assert.equal(report.rosterSourceCurrentQualified,false);
 const copied=scout.message(report);
 assert.match(copied,/Roster observations as of /);
 assert.match(copied,/GP recorded in source capture/);
 assert.doesNotMatch(copied,/public current GP/);
 assert.match(copied,/historical scouting reference only/);
});
test("scouting is read-only for source league and archived roster",()=>{
 const before=[JSON.stringify(league),JSON.stringify(roster)];
 for(const t of league.teams.filter(x=>adults.includes(x.divisionNow)))scout.analyze(league,roster,t.leagueName);
 assert.deepEqual([JSON.stringify(league),JSON.stringify(roster)],before);
});
