/* LeagueOS V28: source, ice-capacity, fairness and final division-lock safeguards. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),
 crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets"),read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const seed=read("leagueos-connected-fictional-v26.json"),ice=read("leagueos-fictitious-ice-v28.json");
const clone=x=>JSON.parse(JSON.stringify(x));
const copy=clone;
const context={window:{},document:{addEventListener:()=>{}},console,localStorage:{getItem:()=>null}};
for(const n of ["leagueos-connected-demo-v26.js","leagueos-ice-planning-v28.js"])
 vm.runInNewContext(fs.readFileSync(path.join(root,n),"utf8"),context,{filename:n});
const v26=context.window.LeagueOSConnectedV26._test;
const api=context.window.LeagueOSIceV28._test;
const state=()=>v26.newState(),recommend=s=>v26.recommend(seed,{targetSize:s.targetSize,overrides:s.overrides});
test("invented venue source is SHA-bound to V26 seed and not a real rink availability claim",()=>{
 assert.equal(api.validateInventory(ice,seed),ice);
 const sha=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,
  "leagueos-connected-fictional-v26.json"))).digest("hex");
 assert.equal(ice.sourceSeedSHA256,sha);
 assert.equal(ice.slots.length,24);
 assert.equal(ice.facilityAuthorization,false);
 assert.equal(ice.realInventoryConnection,false);
 assert.equal(ice.officialBookingsEdited,false);
 assert.equal(ice.safety.noBookingAvailableAssertion,true);
 assert.equal(ice.safety.publicSchedulingAuthority,"NONE_BROWSER_ONLY");
});
test("all slots are explicitly fictional, unique by rink, week and start",()=>{
 const keys=ice.slots.map(s=>s.week+"|"+s.date+"|"+s.rinkCode+"|"+s.startLocal);
 assert.equal(new Set(keys).size,24);
 assert.deepEqual([...new Set(ice.slots.map(s=>s.week))],[13,14]);
 assert.deepEqual([...new Set(ice.slots.map(s=>s.rinkCode))],["A","B","C"]);
 assert.ok(ice.slots.every(s=>s.officialBooked===false&&
  s.facilitySlotVerified===false&&s.sourceBookingId===null&&
  s.refereeAssigned===false));
});
test("base 22-game plan fits 24 invented slots with two spare buffers and zero bookings",()=>{
 const s=state(),out=api.plan(seed,s,recommend(s),ice);
 assert.equal(out.status,"FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW");
 assert.equal(out.requestedGames,22);
 assert.equal(out.games.length,22);
 assert.equal(out.totalSlotsAvailable,24);
 assert.equal(out.assignedSlotCount,22);
 assert.equal(out.freeSlots,2);
 assert.equal(out.bookedSlots,0);
 assert.equal(out.officialBookingsChanged,false);
 assert.equal(out.sourceGamesUnchanged,true);
 assert.equal(out.hasFictionalApproval,false);
 assert.equal(out.authority,"UNAPPROVED_RECOMMENDATIONS_WHAT_IF_ONLY");
});
test("each team has no double-booking within a fictional week",()=>{
 const s=state(),rows=api.plan(seed,s,recommend(s),ice).games;
 const teamWeeks=new Set(),slots=new Set(),gameIds=new Set();
 for(const g of rows){
  assert.ok(!slots.has(g.slotId));slots.add(g.slotId);
  assert.ok(!gameIds.has(g.gameId));gameIds.add(g.gameId);
  assert.ok([13,14].includes(g.week));
  for(const t of [g.homeTeamId,g.awayTeamId]){
   const key=g.week+"|"+t;assert.ok(!teamWeeks.has(key));teamWeeks.add(key);
  }
  assert.equal(g.officialBooked,false);
  assert.equal(g.realSchedulingAuthority,false);
  assert.equal(g.status,"FICTIONAL_SLOTTED_WHAT_IF_NOT_BOOKED");
 }
 assert.equal(rows.filter(x=>x.week===13).length,11);
 assert.equal(rows.filter(x=>x.week===14).length,11);
});
test("source optimizer does not make fair-start objective worse than slot-first schedule",()=>{
 const s=state(),out=api.plan(seed,s,recommend(s),ice);
 assert.ok(Number.isFinite(out.baselineFairness.score));
 assert.ok(Number.isFinite(out.optimizedFairness.score));
 assert.ok(out.optimizedFairness.score<=out.baselineFairness.score);
 assert.ok(out.fairnessImprovementPercent>=0);
 assert.equal(out.supportsFullSeasonFairnessClaim,false);
 assert.equal(out.optimizedFairness.teamRows.length,24);
 assert.ok(out.optimizedFairness.teamRows.every(x=>x.games>=1&&x.games<=2&&
  x.early+x.late===x.games));
});
test("one last ice slot unavailable each week still permits complete hypothetical schedule",()=>{
 const s=state(),out=api.plan(seed,s,recommend(s),ice,"ONE_SLOT_PER_WEEK_UNAVAILABLE");
 assert.equal(out.status,"FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW");
 assert.equal(out.totalSlotsAvailable,22);
 assert.equal(out.assignedSlotCount,22);
 assert.equal(out.freeSlots,0);
 assert.equal(out.capacityHold.length,0);
 assert.ok(out.games.every(g=>!g.slotId.endsWith("-C-2230")));
});
test("closing an entire rink makes 11 weekly games infeasible in eight weekly slots",()=>{
 const s=state(),out=api.plan(seed,s,recommend(s),ice,"RINK_C_UNAVAILABLE");
 assert.equal(out.status,"CAPACITY_HOLD_NO_FEASIBLE_FULL_WEEK");
 assert.equal(out.requestedGames,22);
 assert.equal(out.totalSlotsAvailable,16);
 assert.equal(out.capacityHold.length,2);
 assert.ok(out.capacityHold.every(x=>x.needed===11&&x.available===8&&x.shortfall===3));
 assert.equal(out.games.length,0);
 assert.equal(out.assignedSlotCount,0);
 assert.equal(out.bookedSlots,0);
 assert.equal(out.officialBookingsChanged,false);
});
test("exact 24-team league, unchanged A/D division source and no phantom B/C levels",()=>{
 const s=state(),groups=recommend(s).groups;
 const output=api.plan(seed,s,recommend(s),ice);
 assert.deepEqual(copy(groups.map(x=>x.strengthLevel)),["A","A","D"]);
 assert.equal(output.proposedDivisions,3);
 assert.equal(output.requestedGames,22);
 assert.ok(output.games.every(x=>groups.some(g=>g.id===x.divisionId)));
});
test("six-team commissioner target rebalances group sizes and recomputes schedule from source",()=>{
 const s=state();s.targetSize=6;
 assert.ok(v26.validateState(s,seed));
 const rec=recommend(s),out=api.plan(seed,s,rec,ice);
 assert.deepEqual(copy(rec.groups.map(x=>x.teamIds.length)),[5,6,6,7]);
 assert.equal(out.status,"FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW");
 assert.equal(out.proposedDivisions,4);
 assert.equal(out.requestedGames,22);
 assert.equal(out.officialBookingsChanged,false);
});
test("singleton B-grade what-if is held, with no 'partial capacity passed' claim",()=>{
 const s=state();s.overrides={"FIC-A-01":"B"};
 const rec=recommend(s),out=api.plan(seed,s,rec,ice);
 assert.equal(rec.holds.length,1);
 assert.equal(out.status,"PROPOSED_DIVISION_SOURCE_HOLD");
 assert.equal(out.assignedSlotCount,0);
 assert.equal(out.games.length,0);
 assert.ok(out.sourceHold.some(x=>x==="BELOW_FOUR_TEAM_MINIMUM"));
});
test("midseason final lock without previously published fictional groups fails closed",()=>{
 const s=state();s.currentWeek=13;
 const out=api.plan(seed,s,recommend(s),ice);
 assert.equal(out.status,"FINAL_LOCK_MISSING_SNAPSHOT_HOLD");
 assert.equal(out.authority,"FINAL_LOCK_MISSING_FICTIONAL_PUBLIC_GROUPS");
 assert.equal(out.locked,true);
 assert.equal(out.games.length,0);
 assert.equal(out.assignedSlotCount,0);
});
test("post-lock schedule reads previous fictional public division snapshot, not a new grouping",()=>{
 let s=state();
 s=v26.applyAction(s,seed,"REVIEW").state;
 s=v26.applyAction(s,seed,"PUBLISH").state;
 s=v26.applyAction(s,seed,"WEEK",{week:13}).state;
 assert.equal(v26.validateState(s,seed),true);
 const locked=api.plan(seed,s,recommend(s),ice);
 assert.equal(locked.status,"FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW");
 assert.equal(locked.locked,true);
 assert.equal(locked.authority,"PUBLISHED_FICTIONAL_DIVISIONS_LOCKED");
 assert.equal(locked.hasFictionalApproval,true);
 assert.equal(locked.requestedGames,22);
 assert.equal(locked.officialBookingsChanged,false);
});
test("hostile venue source must not enable real booking, change slot times or duplicate slots",()=>{
 const a=clone(ice);a.facilityAuthorization=true;
 assert.throws(()=>api.validateInventory(a,seed),/authority/);
 const b=clone(ice);b.slots[0].officialBooked=true;
 assert.throws(()=>api.validateInventory(b,seed),/forged booking/);
 const c=clone(ice);c.slots[1].id=c.slots[0].id;
 assert.throws(()=>api.validateInventory(c,seed),/ice slot|forged booking/);
 const e=clone(ice);e.slots[0].startLocal="17:15";
 assert.throws(()=>api.validateInventory(e,seed),/forged booking/);
});
test("fabricated saved public review cannot pass role-and-source validation",()=>{
 const s=state();
 s.publication.status="FICTIONAL_PUBLIC_PREVIEW";
 s.publication.divisions=[{name:"Invented full division",teamIds:["FIC-A-01"]}];
 s.currentWeek=15;
 assert.throws(()=>api.plan(seed,s,recommend(s),ice),/Untrusted/);
});
test("fictional source day, week, rink, start and games are consistently named",()=>{
 const slots=api.slotsForMode(ice,"FULL_FICTIONAL_CAPACITY");
 assert.equal(slots.length,24);
 assert.equal(api.toMinutes("18:00"),1080);
 assert.equal(api.toMinutes("22:30"),1350);
 assert.ok(slots.every(x=>x.startLocal>="18:00"&&x.startLocal<="22:30"));
 assert.throws(()=>api.slotsForMode(ice,"REAL_ARENA"),/Unknown/);
});
test("strict closed-rink scenario cannot silently mark dates booked or source games cancelled",()=>{
 const s=state(),hold=api.plan(seed,s,recommend(s),ice,"RINK_C_UNAVAILABLE");
 assert.equal(hold.officialBookingsChanged,false);
 assert.equal(hold.reviewOnly,true);
 assert.equal(hold.noSourceSystemTouched,true);
 assert.equal(hold.sourceGamesUnchanged,true);
 assert.ok(hold.capacityHold.reduce((sum,x)=>sum+x.shortfall,0)===6);
});
