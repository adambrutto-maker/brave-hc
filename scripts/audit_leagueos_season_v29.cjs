/* Local-only LeagueOS V29 scenario evidence: 24 fictional weeks, no live integration. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const widgets=path.resolve(__dirname,"../widgets");
const read=n=>fs.readFileSync(path.join(widgets,n),"utf8"),json=n=>JSON.parse(read(n));
const cx={window:{},document:{addEventListener:()=>{}},localStorage:{getItem:()=>null},console};
for(const file of ["leagueos-connected-demo-v26.js","leagueos-ice-planning-v28.js",
 "leagueos-season-scheduling-v29.js"])vm.runInNewContext(read(file),cx,{filename:file});
const seed=json("leagueos-connected-fictional-v26.json"),
 ice=json("leagueos-fictitious-ice-v28.json"),
 season=json("leagueos-fictitious-season-v29.json");
const v26=cx.window.LeagueOSConnectedV26._test,v29=cx.window.LeagueOSSeasonV29._test;
const state=v26.newState(),rec=v26.recommend(seed,{targetSize:state.targetSize,overrides:state.overrides});
const options={};
for(const mode of season.modes){
 const t=Date.now(),r=v29.plan(seed,state,rec,season,ice,mode);
 options[mode]={status:r.status,requested:r.requestedGames,usableSlots:r.totalSlotsAvailable,
  assigned:r.assignedSlotCount,availableBuffer:r.freeSlots||0,affectedWeeks:r.capacityHold.length,
  capacityShortfall:r.capacityHold.reduce((n,x)=>n+x.shortfall,0),
  fictionalCommitmentsPreserved:r.pinnedCommitmentsPreserved||0,
  elapsedMs:Date.now()-t,actualBookings:r.bookedSlots};
 if(r.status==="FEASIBLE_FICTIONAL_SEASON_DRAFT"){
  options[mode].fairness={slotFirstPenalty:r.baselineFairness.score,
   optimizedPenalty:r.optimizedFairness.score,
   penaltyImprovementPercent:r.fairnessImprovementPercent,
   startMeanSpreadMinutes:r.optimizedFairness.meanStartSpreadMinutes,
   lateStartCountRange:r.optimizedFairness.lateCountRange,
   after10pmCountRange:r.optimizedFairness.veryLateCountRange,
   startAverage:r.optimizedFairness.averageStart,
   improvingChanges:r.improvingChanges,passes:r.optimizationPasses,
   teamRows:r.optimizedFairness.teamRows};
 }
}
const out={schema:"bruttech-leagueos-v29-fictional-season-audit/v1",
 model:"SOURCE-BOUND-FAKE-ICE-ONLY",runAt:new Date().toISOString(),
 sourceSeedSHA256:season.sourceSeedSHA256,sourceV28SHA256:season.sourceV28SHA256,
 fictionalSeasonWeeks:24,slots:season.slotCount,
 pinnedFictionalCommitments:season.pinnedCommitments.length,
 otherProgramFictionalBlocks:season.sharedProgramBlocks.length,
 realFacilityTransactions:0,realLeagueChanges:0,options};
const target=process.env.SPORTSOS_V29_AUDIT_OUT||path.join(__dirname,"../v29_audit.json");
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({report:target,
 best:options.FULL_FICTIONAL_SEASON,otherProgram:options.OTHER_PROGRAM_COMMITMENTS,
 closed:options.RINK_C_UNAVAILABLE,
 pinnedSlotUnavailable:options.PINNED_SLOT_UNAVAILABLE},(key,v)=>key==="teamRows"?undefined:v,2));
