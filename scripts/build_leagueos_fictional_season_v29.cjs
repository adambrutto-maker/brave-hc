/* BruTTech LeagueOS V29 - deterministic, entirely FICTIONAL season ice fixture.
 * Never imports actual arena availability, contracts, bookings, or real player records.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),vm=require("node:vm");
const widgets=path.resolve(__dirname,"../widgets");
const source=(name)=>fs.readFileSync(path.join(widgets,name));
const seedRaw=source("leagueos-connected-fictional-v26.json"),
 iceRaw=source("leagueos-fictitious-ice-v28.json");
const seed=JSON.parse(seedRaw),v28=JSON.parse(iceRaw);
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
if(seed.schema!=="bruttech-sportsos-connected-fictional-tenant/v26"||
 v28.schema!=="bruttech-leagueos-fictitious-ice-inventory/v28"||
 seed.season.regularWeeks!==24||v28.slots.length!==24||
 v28.sourceSeedSHA256!==sha(seedRaw)||v28.facilityAuthorization!==false)
 throw Error("V28 or V26 fictional source / hash contract failed");
const cx={window:{},document:{addEventListener:()=>{}},localStorage:{getItem:()=>null},console};
vm.runInNewContext(source("leagueos-connected-demo-v26.js").toString("utf8"),cx);
const v26=cx.window.LeagueOSConnectedV26._test;
const groups=v26.recommend(seed,{targetSize:9,overrides:{}}).groups;
if(groups.map(g=>g.teamIds.length).join(",")!=="8,9,7")throw Error("Fictional group topology changed");
const pad=n=>String(n).padStart(2,"0"),
 dates={},slots=[],starts=["18:00","19:30","21:00","22:30"],rinks=["A","B","C"];
for(let week=1;week<=24;week++){
 const utc=new Date(Date.UTC(2026,9,25+(week-1)*7));
 const date=utc.toISOString().slice(0,10);dates[week]=date;
 for(const rinkCode of rinks)for(const startLocal of starts){
  const [h,m]=startLocal.split(":").map(Number),end=h*60+m+75;
  slots.push({
   id:"FIC-SEASON-W"+week+"-"+rinkCode+"-"+startLocal.replace(":",""),
   week,date,night:"Sunday",rink:"Fictional Rink "+rinkCode,rinkCode,
   startLocal,endLocal:pad(Math.floor(end/60))+":"+pad(end%60),
   band:startLocal>="21:00"?"LATE":"EARLY",
   veryLate:startLocal>="22:00",slotMinutes:75,transitionMinutes:15,
   sourceStatus:"INVENTED_UNVERIFIED_NOT_BOOKABLE",
   actualAvailability:false,officialBooked:false,sourceBookingId:null,
   refereeAssigned:false
  });
 }
}
if(dates[13]!=="2027-01-17"||dates[14]!=="2027-01-24")throw Error("V28 calendar continuity failed");
for(const wk of [13,14])for(const v of v28.slots.filter(s=>s.week===wk)){
 const m=slots.find(s=>s.week===wk&&s.rinkCode===v.rinkCode&&s.startLocal===v.startLocal);
 if(!m||m.date!==v.date||m.slotMinutes!==v.slotMinutes)throw Error("V28 two-week inventory changed");
}
const baseline=v26.scheduleDraft(seed,{groups},13,2),pinnedCommitments=[13,14].map(week=>{
 const game=baseline.filter(g=>g.week===week).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(!game)throw Error("Pinned game source absent");
 return{commitmentId:"FIC-COMMITMENT-W"+week,week,
  fixtureId:"FIC-SEASON-W"+week+"-"+game.divisionId+"-"+game.homeTeamId+"-"+game.awayTeamId,
  homeTeamId:game.homeTeamId,awayTeamId:game.awayTeamId,
  slotId:"FIC-SEASON-W"+week+"-A-1800",
  status:"FICTIONAL_EXISTING_COMMITMENT_FIXED_FOR_DEMO",
  immutableInScenario:true,actualExternalBooking:false};
});
const sharedProgramBlocks=Array.from({length:24},(_,i)=>{
 const week=i+1;return{blockId:"FIC-OTHER-PROGRAM-W"+week,week,
  slotId:"FIC-SEASON-W"+week+"-C-2230",
  status:"INVENTED_CROSS_PROGRAM_CONFLICT_NOT_REAL",
  verifiedVenueReservation:false,sourceBookingId:null};
});
const doc={
 schema:"bruttech-leagueos-fictional-season-ice/v29",
 status:"FICTIONAL_24_WEEK_UNVERIFIED_INVENTORY",
 generatedFor:"BRUTTECH_BROWSER_ONLY_COMMISSIONER_SCENARIO",
 sourceSeedFile:"leagueos-connected-fictional-v26.json",
 sourceSeedSHA256:sha(seedRaw),
 sourceV28File:"leagueos-fictitious-ice-v28.json",
 sourceV28SHA256:sha(iceRaw),
 sourceFictionalTenant:seed.tenant.id,
 season:seed.season.id,
 fictionalWeeks:24,firstFictionalDate:dates[1],
 venueName:"Northstar Fictional Ice Centre",
 timezone:"America/Toronto",night:"Sunday",
 slotMinutes:75,transitionMinutes:15,rinks,starts,
 policy:{oneGamePerTeamPerWeek:true,minRestHours:48,
  lateStartAtOrAfter:"21:00",veryLateStartAtOrAfter:"22:00",
  noRetroactiveRealFixtureClaims:true},
 modes:["FULL_FICTIONAL_SEASON","OTHER_PROGRAM_COMMITMENTS",
  "RINK_C_UNAVAILABLE","PINNED_SLOT_UNAVAILABLE"],
 slotCount:slots.length,slots,pinnedCommitments,sharedProgramBlocks,
 safety:{facilityAuthorization:false,officialBookingsEdited:false,
  confirmedRealIce:false,realLeagueChanges:0,allCommitmentsFictional:true,
  commissionerApprovalRights:"NONE_BROWSER_ONLY",exportLocalOnly:true}
};
if(slots.length!==288||pinnedCommitments.length!==2||sharedProgramBlocks.length!==24)
 throw Error("Source inventory expected counts changed");
const out=path.join(widgets,"leagueos-fictitious-season-v29.json");
fs.writeFileSync(out,JSON.stringify(doc,null,2)+"\n","utf8");
console.log(JSON.stringify({output:out,seasonWeeks:24,slots:288,
 pinnedCommitments:2,fictionalCrossProgramBlocks:24,
 v26SourceSHA256:doc.sourceSeedSHA256,v28SourceSHA256:doc.sourceV28SHA256},null,2));
