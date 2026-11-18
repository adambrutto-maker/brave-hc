/* BruTTech LeagueOS V28 — self-contained fictional facility inventory.
 * This is an invented demonstration venue, NOT Sports Village or any arena's
 * actual booked/unbooked ice. No external reservation rights or connections.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const name="leagueos-connected-fictional-v26.json";
const bytes=fs.readFileSync(path.join(root,name));
const seed=JSON.parse(bytes);
const need=(x,why)=>{if(!x)throw Error("V28_SOURCE_HOLD: "+why)};
need(seed.schema==="bruttech-sportsos-connected-fictional-tenant/v26"&&
 seed.authorization?.officialScheduleWrite===false&&
 seed.season?.finalLockAfterWeek===12&&seed.teams.length===24&&
 seed.teams.every(x=>x.night==="Sunday"&&x.fictional===true),
 "Fictional seed/authorization not approved for demo input");
const weeks=[{week:13,date:"2027-01-17"},{week:14,date:"2027-01-24"}],
 rinks=["A","B","C"],times=[
  {start:"18:00",end:"19:15",band:"EARLY"},
  {start:"19:30",end:"20:45",band:"EARLY"},
  {start:"21:00",end:"22:15",band:"LATE"},
  {start:"22:30",end:"23:45",band:"LATE"}
 ];
const slots=[];
for(const w of weeks)for(const rink of rinks)for(const t of times)
 slots.push({
  id:"FIC-ICE-W"+w.week+"-"+rink+"-"+t.start.replace(":",""),
  week:w.week,date:w.date,night:"Sunday",rink:"Fictional Rink "+rink,
  rinkCode:rink,startLocal:t.start,endLocal:t.end,
  slotMinutes:75,bufferUntilNextSlotMinutes:15,band:t.band,
  label:"FICTIONAL_AVAILABLE_DRAFT_SLOT",
  officialBooked:false,facilitySlotVerified:false,
  refereeAssigned:false,sourceBookingId:null
 });
need(slots.length===24&&new Set(slots.map(x=>x.id)).size===24,
 "Fictional capacity and uniqueness invalid");
const out={
 schema:"bruttech-leagueos-fictitious-ice-inventory/v28",
 status:"EXPLICITLY_FICTIONAL_UNVERIFIED_VENUE_AVAILABILITY",
 sourceSeedFile:name,
 sourceSeedSHA256:crypto.createHash("sha256").update(bytes).digest("hex"),
 asOfDemoDate:"2026-11-17",venueId:"FIC-ARENA-001",
 venueName:"Northstar Fictional Ice Centre",
 night:"Sunday",weekStartsAfterFinalLock:13,
 demoWeeks:weeks.map(x=>x.week),slotsPerWeek:12,
 nightlyRinkCount:3,slotStartOptions:times.map(x=>x.start),
 gameSlotDurationMinutes:75,
 timezone:"America/Toronto",
 facilityAuthorization:false,realInventoryConnection:false,
 officialBookingsEdited:false,confirmedFacilityRevenue:0,
 sourceRinkName:"INVENTED_NOT_REAL_FACILITY",
 controls:{
  modes:["FULL_FICTIONAL_CAPACITY","ONE_SLOT_PER_WEEK_UNAVAILABLE",
   "RINK_C_UNAVAILABLE"],
  initialMode:"FULL_FICTIONAL_CAPACITY",
  slotUnavailableIdByWeek:{"13":"FIC-ICE-W13-C-2230",
   "14":"FIC-ICE-W14-C-2230"},
  rinkUnavailable:"C",
  modeIsOnlyBrowserScenario:true
 },
 safety:{
  noBookingAvailableAssertion:true,
  cannotIssueOfficialIceReservations:true,
  noExistingSVHLGamesCancelled:true,
  noRefereeAssignment:true,
  noPlayerEligibilityInferred:true,
  afterWeek12DivisionLockRequiresFictionalPublishedSnapshot:true,
  publicSchedulingAuthority:"NONE_BROWSER_ONLY"
 },
 slots
};
const dest=path.join(root,"leagueos-fictitious-ice-v28.json");
fs.writeFileSync(dest,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({
 status:out.status,weeks:out.demoWeeks,rinks:out.nightlyRinkCount,
 totalSlots:out.slots.length,slotsEachWeek:out.slotsPerWeek,
 officialBookings:out.slots.filter(x=>x.officialBooked).length,
 file:dest
},null,2));
