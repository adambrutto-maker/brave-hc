/* V29 isolated, immutable-fictional-source and commissioner 24-week scheduler QA. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),
 crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets"),read=n=>fs.readFileSync(path.join(root,n));
const seed=JSON.parse(read("leagueos-connected-fictional-v26.json")),
 v28=JSON.parse(read("leagueos-fictitious-ice-v28.json")),
 season=JSON.parse(read("leagueos-fictitious-season-v29.json")),
 clone=x=>JSON.parse(JSON.stringify(x));
const context={window:{},document:{addEventListener:()=>{}},localStorage:{getItem:()=>null},console};
for(const n of ["leagueos-connected-demo-v26.js","leagueos-ice-planning-v28.js",
 "leagueos-season-scheduling-v29.js"])
 vm.runInNewContext(read(n).toString("utf8"),context,{filename:n});
const v26=context.window.LeagueOSConnectedV26._test,api=context.window.LeagueOSSeasonV29._test;
const state=()=>v26.newState(),rec=s=>v26.recommend(seed,{targetSize:s.targetSize,overrides:s.overrides});
let baseline=null,shared=null,closed=null,pinnedConflict=null;
const full=()=>baseline||(baseline=api.plan(seed,state(),rec(state()),season,v28));
const hash=raw=>crypto.createHash("sha256").update(raw).digest("hex");
test("V29 source is SHA-referenced to exact V26 and V28 fictional working files",()=>{
 assert.equal(season.sourceSeedSHA256,hash(read("leagueos-connected-fictional-v26.json")));
 assert.equal(season.sourceV28SHA256,hash(read("leagueos-fictitious-ice-v28.json")));
 assert.equal(season.status,"FICTIONAL_24_WEEK_UNVERIFIED_INVENTORY");
 assert.equal(api.validateSeason(season,seed,v28),season);
 assert.equal(season.safety.facilityAuthorization,false);
 assert.equal(season.safety.officialBookingsEdited,false);
});
test("24 invented Sunday weeks, 288 unique slots and V28 weeks 13/14 continuity",()=>{
 const all=new Set(season.slots.map(s=>s.id));
 assert.equal(all.size,288);
 assert.equal(season.slots.filter(s=>s.week===13).length,12);
 assert.equal(season.slots.filter(s=>s.week===14).length,12);
 assert.equal(season.slots.find(s=>s.week===13).date,"2027-01-17");
 assert.equal(season.slots.find(s=>s.week===14).date,"2027-01-24");
 assert.ok(season.slots.every(s=>s.actualAvailability===false&&s.officialBooked===false));
});
test("source-controlled complete fictional 24-week fixture program",()=>{
 const s=state(),games=api.fixtures(seed,rec(s).groups);
 assert.equal(games.length,264);
 for(let week=1;week<=24;week++)assert.equal(games.filter(g=>g.week===week).length,11);
 const seen=new Set();
 for(const g of games)for(const id of [g.homeTeamId,g.awayTeamId]){
  const key=g.week+"|"+id;assert.ok(!seen.has(key));seen.add(key);
 }
 assert.ok(games.every(g=>g.sourceBookingId===null&&g.officialScheduleWrite===false));
});
test("full invented season fits 264 games in 288 source slots with no actual bookings",()=>{
 const d=full();
 assert.equal(d.status,"FEASIBLE_FICTIONAL_SEASON_DRAFT");
 assert.equal(d.fictionalWeeks,24);
 assert.equal(d.requestedGames,264);
 assert.equal(d.games.length,264);
 assert.equal(d.assignedSlotCount,264);
 assert.equal(d.totalSlotsAvailable,288);
 assert.equal(d.freeSlots,24);
 assert.equal(d.bookedSlots,0);
 assert.equal(d.officialBookingsChanged,false);
 assert.equal(d.facilityBookingAuthority,"NONE_BROWSER_ONLY");
 assert.equal(d.officialScheduleWriteAllowed,false);
});
test("whole-season equity improves deterministically against naive slot-first case",()=>{
 const d=full();
 assert.ok(Number.isFinite(d.baselineFairness.score));
 assert.ok(Number.isFinite(d.optimizedFairness.score));
 assert.ok(d.optimizedFairness.score<=d.baselineFairness.score);
 assert.ok(d.improvingChanges>0,"Optimizer should make measurable changes");
 assert.ok(d.fairnessImprovementPercent>0);
 assert.equal(d.optimizedFairness.teamRows.length,24);
 assert.ok(d.optimizedFairness.teamRows.every(r=>r.early+r.late===r.games&&
  r.veryLate<=r.late&&r.games>=1&&r.games<=24));
 assert.ok(d.optimizedFairness.lateCountRange[0]<=d.optimizedFairness.lateCountRange[1]);
});
test("pinned fictional existing games retain their source-week and exact ice",()=>{
 const d=full();
 assert.equal(d.pinnedCommitmentsPreserved,2);
 for(const p of season.pinnedCommitments){
  const g=d.games.find(g=>g.gameId===p.fixtureId);
  assert.ok(g);
  assert.equal(g.week,p.week);assert.equal(g.slotId,p.slotId);
  assert.equal(g.pinnedFictionalCommitment,true);
  assert.equal(g.officialBooked,false);
 }
 const slots=new Set(d.games.map(x=>x.slotId));
 assert.equal(slots.size,264);
});
test("fictional cross-program slots are removed with complete 264-game feasibility",()=>{
 const s=state();
 shared=api.plan(seed,s,rec(s),season,v28,"OTHER_PROGRAM_COMMITMENTS");
 assert.equal(shared.status,"FEASIBLE_FICTIONAL_SEASON_DRAFT");
 assert.equal(shared.totalSlotsAvailable,264);
 assert.equal(shared.assignedSlotCount,264);
 assert.equal(shared.freeSlots,0);
 const blocked=new Set(season.sharedProgramBlocks.map(x=>x.slotId));
 assert.ok(shared.games.every(g=>!blocked.has(g.slotId)));
 assert.equal(shared.pinnedCommitmentsPreserved,2);
});
test("fictional rink closure yields whole-season 72-fixture capacity hold, not partial booking",()=>{
 const s=state();
 closed=api.plan(seed,s,rec(s),season,v28,"RINK_C_UNAVAILABLE");
 assert.equal(closed.status,"SEASON_CAPACITY_HOLD");
 assert.equal(closed.totalSlotsAvailable,192);
 assert.equal(closed.requestedGames,264);
 assert.equal(closed.unallocatedGames,264);
 assert.equal(closed.capacityHold.length,24);
 assert.ok(closed.capacityHold.every(x=>x.shortfall===3));
 assert.equal(closed.capacityHold.reduce((n,x)=>n+x.shortfall,0),72);
 assert.equal(closed.games.length,0);assert.equal(closed.bookedSlots,0);
});
test("slot removal for one immutable fictional fixture blocks entire season despite spare ice",()=>{
 const s=state();
 pinnedConflict=api.plan(seed,s,rec(s),season,v28,"PINNED_SLOT_UNAVAILABLE");
 assert.equal(pinnedConflict.totalSlotsAvailable,287);
 assert.equal(pinnedConflict.requestedGames,264);
 assert.equal(pinnedConflict.status,"FIXED_COMMITMENT_CONFLICT_HOLD");
 assert.equal(pinnedConflict.games.length,0);
 assert.ok(pinnedConflict.conflictDetails.some(x=>x.reason==="FIXED_SLOT_UNAVAILABLE"));
});
test("rest policy checks all team appearances, including a deliberately infeasible 200-hour policy",()=>{
 const games=full().games,fixtures=new Map(api.fixtures(seed,rec(state()).groups).map(g=>[g.id,g])),
  iceSlots=new Map(season.slots.map(x=>[x.id,x]));
 const rows=games.map(g=>({game:fixtures.get(g.gameId),slot:iceSlots.get(g.slotId)}));
 assert.equal(api.findRestViolations(rows,48).length,0);
 assert.ok(api.findRestViolations(rows,200).length>0);
});
test("unapproved singleton B strength assessment must block full-season allocation",()=>{
 const s=state();s.overrides={"FIC-A-01":"B"};
 const d=api.plan(seed,s,rec(s),season,v28);
 assert.equal(d.status,"DIVISION_SOURCE_HOLD");
 assert.equal(d.games.length,0);
 assert.equal(d.bookedSlots,0);
});
test("fictional division regrouping cannot silently change source-held fixed commitments",()=>{
 const s=state();s.targetSize=6;
 const d=api.plan(seed,s,rec(s),season,v28);
 assert.equal(d.status,"FIXED_COMMITMENT_CONFLICT_HOLD");
 assert.equal(d.games.length,0);
});
test("final lock without published fictional snapshot holds future season plan",()=>{
 const s=state();s.currentWeek=13;
 const d=api.plan(seed,s,rec(s),season,v28);
 assert.equal(d.status,"FINAL_DIVISION_LOCK_SNAPSHOT_HOLD");
 assert.equal(d.games.length,0);
 assert.equal(d.locked,true);
});
test("final lock with prior fictional publication only uses frozen division snapshot",()=>{
 let s=state();s=v26.applyAction(s,seed,"REVIEW").state;
 s=v26.applyAction(s,seed,"PUBLISH").state;
 s=v26.applyAction(s,seed,"WEEK",{week:13}).state;
 assert.equal(v26.validateState(s,seed),true);
 const d=api.plan(seed,s,rec(s),season,v28);
 assert.equal(d.status,"FEASIBLE_FICTIONAL_SEASON_DRAFT");
 assert.equal(d.locked,true);assert.equal(d.games.length,264);
 assert.equal(d.sourceGate,"LOCKED_FICTIONAL_PUBLISHED_DIVISIONS");
});
test("forged facility authority, slot availability, pins, revision hashes and block sources fail closed",()=>{
 const forged=clone(season);forged.safety.facilityAuthorization=true;
 assert.throws(()=>api.validateSeason(forged,seed,v28),/authority/);
 const changed=clone(season);changed.slots[0].actualAvailability=true;
 assert.throws(()=>api.validateSeason(changed,seed,v28),/slot/);
 const duplicate=clone(season);duplicate.slots[1].id=duplicate.slots[0].id;
 assert.throws(()=>api.validateSeason(duplicate,seed,v28),/slot/);
 const pin=clone(season);pin.pinnedCommitments[0].immutableInScenario=false;
 assert.throws(()=>api.validateSeason(pin,seed,v28),/commitment/);
 const conflict=clone(season);conflict.sharedProgramBlocks[0].verifiedVenueReservation=true;
 assert.throws(()=>api.validateSeason(conflict,seed,v28),/other-program/);
 const hash=clone(season);hash.sourceSeedSHA256="f".repeat(64);
 assert.throws(()=>api.validateSeason(hash,seed,v28),/authority/);
});
test("a tampered recommendation cannot replace commissioner source or approved groups",()=>{
 const s=state(),r=rec(s),fake=clone(r);
 fake.groups[0].teamIds.pop();
 assert.throws(()=>api.plan(seed,s,fake,season,v28),/Forged/);
});
test("bad what-if scenario and other group counts are never accepted",()=>{
 const s=state();
 assert.throws(()=>api.plan(seed,s,rec(s),season,v28,"BOOK_REAL_ICE"),/Unknown/);
 assert.throws(()=>api.fixtures(seed,[{id:"FAKE",teamIds:["FIC-A-01"]}]),/Unqualified/);
});
