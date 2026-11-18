/* BruTTech LeagueOS V28 — fictional ice capacity and start-time equity.
   Original simulation; no facility API, source bookings, referee assignments,
   official league transactions or assertions about real rink availability.
*/
(function(){"use strict";
const SOURCE="./leagueos-fictitious-ice-v28.json",MODES=[
 "FULL_FICTIONAL_CAPACITY","ONE_SLOT_PER_WEEK_UNAVAILABLE","RINK_C_UNAVAILABLE"];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clock=x=>typeof x==="string"&&/^\d\d:\d\d$/.test(x)?x:"—";
const round=(v,n=1)=>Math.round(v*Math.pow(10,n))/Math.pow(10,n);
const $=q=>document.querySelector(q);
const sourceTeamMap=s=>new Map(s.teams.map(x=>[x.id,x]));
const slotsKey=x=>[x.week,x.date,x.rinkCode,x.startLocal].join("|");
let inventory=null,loader=null,context=null,mode=MODES[0],sampleWeek=13,notice="";
function validateInventory(x,seed){
 if(!x||x.schema!=="bruttech-leagueos-fictitious-ice-inventory/v28"||
 x.status!=="EXPLICITLY_FICTIONAL_UNVERIFIED_VENUE_AVAILABILITY"||
 x.sourceSeedFile!=="leagueos-connected-fictional-v26.json"||
 !/^[a-f0-9]{64}$/.test(x.sourceSeedSHA256||"")||
 x.officialBookingsEdited!==false||x.facilityAuthorization!==false||
 x.realInventoryConnection!==false||x.confirmedFacilityRevenue!==0||
 x.safety?.publicSchedulingAuthority!=="NONE_BROWSER_ONLY"||
 x.safety?.noBookingAvailableAssertion!==true||
 x.safety?.cannotIssueOfficialIceReservations!==true||
 x.safety?.afterWeek12DivisionLockRequiresFictionalPublishedSnapshot!==true||
 x.controls?.modes?.join("|")!==MODES.join("|")||
 x.demoWeeks?.join(",")!=="13,14"||x.slotsPerWeek!==12||
 x.nightlyRinkCount!==3||!Array.isArray(x.slots)||x.slots.length!==24||
 seed?.schema!=="bruttech-sportsos-connected-fictional-tenant/v26"||
 seed.teams?.length!==24||seed.authorization?.officialScheduleWrite!==false||
 seed.season?.finalLockAfterWeek!==12)
  throw Error("Fictional venue authority or source contract invalid");
 const ids=new Set(),keys=new Set(),count=new Map();
 for(const s of x.slots){
  if(!/^FIC-ICE-W(13|14)-[ABC]-(1800|1930|2100|2230)$/.test(s.id)||
   ![13,14].includes(s.week)||s.night!=="Sunday"||
   !/^2027-01-(17|24)$/.test(s.date)||
   s.date!==(s.week===13?"2027-01-17":"2027-01-24")||
   !["A","B","C"].includes(s.rinkCode)||
   s.rink!=="Fictional Rink "+s.rinkCode||
   !["18:00","19:30","21:00","22:30"].includes(s.startLocal)||
   s.id!=="FIC-ICE-W"+s.week+"-"+s.rinkCode+"-"+s.startLocal.replace(":","")||
   !["EARLY","LATE"].includes(s.band)||
   s.band!==(s.startLocal<"21:00"?"EARLY":"LATE")||
   s.slotMinutes!==75||s.bufferUntilNextSlotMinutes!==15||
   s.officialBooked!==false||s.facilitySlotVerified!==false||
   s.refereeAssigned!==false||s.sourceBookingId!==null||
   ids.has(s.id)||keys.has(slotsKey(s)))
   throw Error("Unknown fictional time, duplicate ice slot, or forged booking");
  ids.add(s.id);keys.add(slotsKey(s));count.set(s.week,(count.get(s.week)||0)+1);
 }
 if(count.get(13)!==12||count.get(14)!==12||
  x.controls.slotUnavailableIdByWeek["13"]!=="FIC-ICE-W13-C-2230"||
  x.controls.slotUnavailableIdByWeek["14"]!=="FIC-ICE-W14-C-2230")
  throw Error("Inconsistent fictional venue schedule capacity");
 return x;
}
function slotsForMode(x,m){
 if(!MODES.includes(m))throw Error("Unknown commissioner test scenario");
 return x.slots.filter(s=>m===MODES[0]||
  m===MODES[1]&&s.id!==x.controls.slotUnavailableIdByWeek[String(s.week)]||
  m===MODES[2]&&s.rinkCode!==x.controls.rinkUnavailable);
}
function toMinutes(hhmm){
 const [h,m]=hhmm.split(":").map(Number);
 if(!Number.isInteger(h)||!Number.isInteger(m))throw Error("Unknown source clock");
 return h*60+m;
}
function getGames(seed,groups,weekStart=13,weekCount=2){
 const api=window.LeagueOSConnectedV26?._test;
 if(!api||!api.scheduleDraft)throw Error("Connected V26 schedule source unavailable");
 const result=api.scheduleDraft(seed,{groups},weekStart,weekCount);
 const teams=sourceTeamMap(seed),seenIds=new Set(),weeklyTeamKeys=new Set();
 for(const g of result){
  const key=g.week+"|"+g.homeTeamId+"|"+g.awayTeamId;
  if(seenIds.has(g.id)||!teams.has(g.homeTeamId)||!teams.has(g.awayTeamId)||
   g.homeTeamId===g.awayTeamId||!g.id.startsWith("FIC-DRAFT-")||
   ![13,14].includes(g.week)||g.date!==null||g.time!==null||g.rink!==null||
   g.officialScheduleWrite!==false||g.facilityInventoryVerified!==false)
   throw Error("Unqualified fictional matchup source");
  seenIds.add(g.id);
  for(const id of [g.homeTeamId,g.awayTeamId]){
   const k=g.week+"|"+id;
   if(weeklyTeamKeys.has(k))throw Error("A team was scheduled twice in one fictional week");
   weeklyTeamKeys.add(k);
  }
 }
 return result;
}
function fairness(assignments,seed){
 const teams=sourceTeamMap(seed),player=new Map(seed.teams.map(x=>[x.id,
  {teamId:x.id,teamName:x.name,games:0,late:0,early:0,startSum:0,starts:[]}]));
 for(const row of assignments){
  const min=toMinutes(row.slot.startLocal);
  for(const id of [row.game.homeTeamId,row.game.awayTeamId]){
   const p=player.get(id);
   if(!p||!teams.has(id))throw Error("Unknown proposed game team");
   p.games++;p.startSum+=min;p.starts.push(row.slot.startLocal);
   if(row.slot.band==="LATE")p.late++;else p.early++;
  }
 }
 const played=[...player.values()].filter(x=>x.games>0);
 if(!played.length)return{score:Infinity,teamRows:[],lateRange:null,meanMinuteRange:null,
   averageStart:null,lateRate:null,maxLateStarts:null};
 const totalGames=played.reduce((sum,p)=>sum+p.games,0),
 late=played.reduce((sum,p)=>sum+p.late,0),
 sumStart=played.reduce((sum,p)=>sum+p.startSum,0);
 const avg=sumStart/totalGames,lateRate=late/totalGames;
 let score=0;
 for(const p of played){
  p.averageStartMinute=p.startSum/p.games;
  p.averageStartLocal=String(Math.floor(p.averageStartMinute/60)).padStart(2,"0")+":"+
    String(Math.round(p.averageStartMinute%60)).padStart(2,"0");
  p.lateRate=p.late/p.games;
  // Standard-deviation-like proxy on 2-week sample, not full season equity.
  score+=Math.pow((p.averageStartMinute-avg)/90,2)*2.5+
    Math.pow(p.late-p.games*lateRate,2)*6+
    (p.games>1&&(p.late===p.games||p.early===p.games)?1.6:0);
 }
 const minutes=played.map(x=>x.averageStartMinute),
 lateCounts=played.map(x=>x.late);
 score+=Math.pow(Math.max(...lateCounts)-Math.min(...lateCounts),2)*2;
 return{score:round(score,4),
  lateRange:Math.max(...lateCounts)-Math.min(...lateCounts),
  meanMinuteRange:round(Math.max(...minutes)-Math.min(...minutes)),
  averageStart:round(avg),lateRate:round(lateRate,3),
  maxLateStarts:Math.max(...lateCounts),minLateStarts:Math.min(...lateCounts),
  teamRows:played.map(x=>({
   teamId:x.teamId,teamName:x.teamName,games:x.games,
   early:x.early,late:x.late,averageStartLocal:x.averageStartLocal,
   starts:x.starts.slice().sort(),twoWeekSampleOnly:true
  })).sort((a,b)=>b.late-a.late||
   a.averageStartLocal.localeCompare(b.averageStartLocal)||a.teamName.localeCompare(b.teamName))
 };
}
function chooseSchedule(seed,requests,available){
 // No partial plan is presented as feasible when capacity is insufficient.
 const byWeek=new Map([13,14].map(w=>[w,{games:requests.filter(g=>g.week===w)
  .slice().sort((a,b)=>a.id.localeCompare(b.id)),slots:available.filter(s=>s.week===w)
  .slice().sort((a,b)=>a.startLocal.localeCompare(b.startLocal)||
   a.rinkCode.localeCompare(b.rinkCode))}]));
 const under=[...byWeek.entries()].filter(([_,x])=>x.games.length>x.slots.length)
  .map(([week,x])=>({week,needed:x.games.length,available:x.slots.length,
   shortfall:x.games.length-x.slots.length}));
 if(under.length)return{status:"CAPACITY_HOLD_NO_FEASIBLE_FULL_WEEK",
   games:[],capacityHold:under,unallocatedGames:requests.length,
   totalSlotsAvailable:available.length,bookedSlots:0,assignedSlotCount:0,
   officialBookingsChanged:false};
 const rows=[],roster=[];
 for(const [week,data] of byWeek){
  const assignments=data.games.map((game,i)=>({game,slot:data.slots[i]}));
  rows.push(...assignments);
  roster.push({week,games:assignments,allSlots:data.slots});
 }
 const before=fairness(rows,seed);
 // Coordinate-descent swaps and free-slot replacements: deterministic, bounded.
 // Iterate across BOTH weeks so fairness for teams who appear twice improves.
 let best=before.score,changed=true,p=0;
 while(changed&&p++<24){
  changed=false;let bestSwap=null,bestGain=0;
  for(const week of roster){
   const wk=week.games,extra=week.allSlots.find(s=>!wk.some(x=>x.slot.id===s.id))||null;
   for(let i=0;i<wk.length;i++){
    const old=wk[i].slot;
    for(let j=i+1;j<=wk.length;j++){
     const other=j<wk.length?wk[j].slot:extra;
     if(!other)continue;
     wk[i].slot=other;
     if(j<wk.length)wk[j].slot=old;
     const measured=fairness(rows,seed).score;
     const gain=best-measured;
     if(gain>bestGain+.00001){
      bestGain=gain;bestSwap={week,i,j,from:old,to:other,score:measured};
     }
     wk[i].slot=old;
     if(j<wk.length)wk[j].slot=other;
    }
   }
  }
  if(bestSwap){
   const {week,i,j,from,to,score}=bestSwap;
   week.games[i].slot=to;if(j<week.games.length)week.games[j].slot=from;
   best=score;changed=true;
  }
 }
 const result=fairness(rows,seed);
 if(result.score>before.score+.000001)throw Error("Fairness optimization worsened original slot-first baseline");
 const output=rows.map(x=>({
  gameId:x.game.id,week:x.game.week,divisionId:x.game.divisionId,
  divisionName:x.game.divisionName,homeTeamId:x.game.homeTeamId,
  awayTeamId:x.game.awayTeamId,slotId:x.slot.id,
  date:x.slot.date,startLocal:x.slot.startLocal,rink:x.slot.rink,
  band:x.slot.band,slotDurationMinutes:x.slot.slotMinutes,
  officialBooked:false,realSchedulingAuthority:false,
  status:"FICTIONAL_SLOTTED_WHAT_IF_NOT_BOOKED"
 })).sort((a,b)=>a.week-b.week||a.startLocal.localeCompare(b.startLocal)||
  a.rink.localeCompare(b.rink));
 if(new Set(output.map(x=>x.slotId)).size!==output.length||
   new Set(output.map(x=>x.gameId)).size!==output.length)
  throw Error("Duplicate game or rink slot in fictional capacity plan");
 return{status:"FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW",games:output,
  capacityHold:[],unallocatedGames:0,
  requestedGames:requests.length,totalSlotsAvailable:available.length,
  assignedSlotCount:rows.length,bookedSlots:0,freeSlots:available.length-rows.length,
  baselineFairness:before,optimizedFairness:result,
  fairnessImprovementPercent:before.score>0?
   round((before.score-result.score)/before.score*100):0,
  optimizationIterations:p,
  officialBookingsChanged:false,
  supportsFullSeasonFairnessClaim:false
 };
}
function plan(seed,state,rec,ice,modeName=MODES[0]){
 validateInventory(ice,seed);
 const api=window.LeagueOSConnectedV26?._test;
 if(!api||!api.validateState(state,seed))throw Error("Untrusted fictional role/season state");
 if(!MODES.includes(modeName))throw Error("Invalid facility-capacity scenario");
 const locked=state.currentWeek>seed.season.finalLockAfterWeek,
  published=state.publication.status==="FICTIONAL_PUBLIC_PREVIEW",
  frozenGroups=published?state.publication.divisions:null;
 const groups=locked?frozenGroups:rec.groups;
 const planned=locked&&published?"PUBLISHED_FICTIONAL_DIVISIONS_LOCKED":
  locked?"FINAL_LOCK_MISSING_FICTIONAL_PUBLIC_GROUPS":
  "UNAPPROVED_RECOMMENDATIONS_WHAT_IF_ONLY";
 const sourceHeld=(!locked&&rec.holds.length>0)||
  (locked&&(!published||!Array.isArray(frozenGroups)||!frozenGroups.length));
 const slots=slotsForMode(ice,modeName);
 if(sourceHeld)return{schema:"bruttech-leagueos-capacity-fairness-plan/v28",
   status:locked?"FINAL_LOCK_MISSING_SNAPSHOT_HOLD":"PROPOSED_DIVISION_SOURCE_HOLD",
   authority:planned,mode:modeName,requestedGames:0,assignedSlotCount:0,
   games:[],unallocatedGames:0,totalSlotsAvailable:slots.length,
   capacityHold:[],bookedSlots:0,officialBookingsChanged:false,
   reviewOnly:true,locked,hasFictionalApproval:published,
   sourceHold:!locked?rec.holds.map(x=>x.reason):
    ["NO_PREVIOUSLY_PUBLISHED_FICTIONAL_LOCKED_DIVISION_SNAPSHOT"]};
 const requests=getGames(seed,groups);
 const scheduled=chooseSchedule(seed,requests,slots);
 return{schema:"bruttech-leagueos-capacity-fairness-plan/v28",
  ...scheduled,requestedGames:requests.length,
  authority:planned,mode:modeName,locked,
  hasFictionalApproval:published,reviewOnly:true,officialBookingsChanged:false,
  sourceHold:[],week5Rule:"SOURCE_PUBLISHED_WEEK_5_REVIEW_AND_POINTS_CARRY",
  finalLockPolicy:"ADDITIONAL_PRODUCT_PROPOSAL_NOT_OFFICIAL_SVHL_RULE",
  noSourceSystemTouched:true,proposedDivisions:groups.length,
  sourceGamesUnchanged:true,
  reviewWindow:[seed.season.reviewWeek,seed.season.finalReviewWeek].includes(state.currentWeek),
  noRealFacilityInventory:true
 };
}
function panel(data,seed){
 const team=sourceTeamMap(seed);
 const label=data.status==="FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW"?"CAPACITY FEASIBLE":
  data.status==="CAPACITY_HOLD_NO_FEASIBLE_FULL_WEEK"?"CAPACITY HOLD":"REVIEW HOLD";
 const metrics=[
  ["Game matchups",data.requestedGames||0,"Weeks 13 & 14 · fictional"],
  ["Available mock ice slots",data.totalSlotsAvailable,"Two Sunday weeks"],
  ["Assigned preview slots",data.assignedSlotCount||0,"Not arena bookings"],
  ["Actual booked games",0,"No facility connection"]
 ];
 const fairnessOK=data.status==="FEASIBLE_FICTIONAL_UNBOOKED_PREVIEW";
 const f=data.optimizedFairness;
 return '<section class="v28-ice"><header><div><span>V28 · COMMISSIONER ICE & FAIRNESS PLANNER</span>'+
  '<h4>Competitive divisions need a feasible, fair game schedule.</h4>'+
  '<p>Two invented Sunday ice calendars, three fictional rinks and a strict division-lock boundary.</p></div>'+
  '<b class="v28-status '+(fairnessOK?"feasible":"held")+'">'+label+'</b></header>'+
  '<div class="v28-keys">'+metrics.map(x=>
  '<div><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong><span>'+esc(x[2])+'</span></div>').join("")+'</div>'+
  '<div class="v28-toolbar"><label>Test ice capacity<select data-v28-mode>'+
  [
   [MODES[0],"All 3 fictional rinks"],
   [MODES[1],"One last slot per week unavailable"],
   [MODES[2],"Rink C unavailable"]
  ].map(x=>'<option value="'+x[0]+'"'+(mode===x[0]?' selected':'')+'>'+x[1]+'</option>').join("")+
  '</select></label><label>Inspect draft week<select data-v28-week>'+
  [13,14].map(w=>'<option value="'+w+'"'+(sampleWeek===w?' selected':'')+'>Week '+w+'</option>').join("")+
  '</select></label><button type="button" data-v28-export>Export fictional ice review</button></div>'+
  '<div class="v28-rule"><b>'+
  (data.locked?"Final division lock active. "+
  (data.hasFictionalApproval?"Use the previously published fictional groups.":"No authorized fictional division snapshot: schedule held."):
  "A proposed placement remains unapproved until a permitted review window and human signoff.")+
  '</b><small>Week 5 realignment/points carry is the published SVHL rule; a final halfway division lock is an optional new operator policy.</small></div>'+
  (fairnessOK?'<div class="v28-fairness">'+
   '<div><span>Start-time equity score</span><strong>'+
   data.baselineFairness.score.toFixed(1)+' → '+f.score.toFixed(1)+'</strong>'+
   '<small>Within two sample weeks only · lower is closer; '+data.fairnessImprovementPercent.toFixed(1)+'% model-score improvement vs slot-first assignment</small></div>'+
   '<div><span>Late-start exposure spread</span><strong>'+
   f.minLateStarts+'–'+f.maxLateStarts+'</strong>'+
   '<small>Late starts at or after 9 PM · per team in this two-week mock schedule</small></div>'+
   '<div><span>Unused fictional slots</span><strong>'+data.freeSlots+'</strong>'+
   '<small>Retained for venue/maintenance flexibility; not real available ice</small></div></div>'+
   '<details class="v28-details" open><summary>Week '+sampleWeek+
   ' · assigned hypothetical matchups</summary><div class="v28-rows">'+
   data.games.filter(x=>x.week===sampleWeek).map(g=>
    '<div><b>'+esc(g.startLocal)+' · '+esc(g.rink)+'</b>'+
    '<span>'+esc(team.get(g.homeTeamId)?.name||"Unknown")+" vs "+
     esc(team.get(g.awayTeamId)?.name||"Unknown")+'</span>'+
    '<small>'+esc(g.divisionName)+' · Unbooked scenario</small></div>'
   ).join("")+'</div></details>'+
   '<details class="v28-details"><summary>Inspect individual team early/late distribution</summary>'+
   '<div class="v28-table-scroll"><table><thead><tr>'+
   '<th>Fictional team</th><th>Games</th><th>Early</th><th>Late</th><th>Average start</th></tr></thead><tbody>'+
   f.teamRows.map(x=>'<tr><td>'+esc(x.teamName)+'</td><td>'+x.games+'</td><td>'+x.early+
    '</td><td>'+x.late+'</td><td>'+esc(x.averageStartLocal)+'</td></tr>').join("")+
    '</tbody></table></div></details>':
   '<div class="v28-held"><b>'+(
    data.status==="CAPACITY_HOLD_NO_FEASIBLE_FULL_WEEK"?
    "Not enough fictional ice to schedule every game. No partial plan is called feasible.":
    "Source or final-lock division placement is unresolved. No invented ice allocation is shown.")+'</b>'+
    (data.capacityHold?.length?'<p>'+data.capacityHold.map(x=>
      "Week "+x.week+": "+x.needed+" games need slots, "+x.available+
      " available (short "+x.shortfall+").").join(" ")+'</p>':
    '<p>'+esc((data.sourceHold||[]).join(" · "))+'</p>')+'</div>')+
  (notice?'<p class="v28-notice" role="status">'+esc(notice)+'</p>':"")+
  '<p class="v28-disclosure">Every displayed time, rink and date is an invented venue exercise, never a booked slot. Real implementation requires the arena’s authorized ice inventory, conflict detection across concurrent programs, travel/rest rules and referee allocation. Equal early/late exposure over a two-week sample is not a guarantee of full-season scheduling fairness.</p>'+
 '</section>';
}
function load(){
 if(!loader)loader=fetch(SOURCE,{cache:"no-store"}).then(r=>{
  if(!r.ok)throw Error("Fictional source HTTP "+r.status);return r.json();
 }).then(x=>{inventory=x;return x}).catch(e=>{inventory=null;loader=null;throw e});
 return loader;
}
function paint(){
 const root=$("#leagueos-v28-ice-planner");if(!root||!context||!inventory)return;
 const {seed,state,rec}=context;
 let data;
 try{data=plan(seed,state,rec,inventory,mode);}
 catch(_){root.innerHTML='<div class="v28-source-hold">Fictional ice source or team-competition gate failed. No schedule proposed.</div>';return;}
 root.innerHTML=panel(data,seed);
}
function mount(seed,state,rec){
 const root=$("#leagueos-v28-ice-planner");if(!root)return;
 context={seed,state,rec};
 load().then(()=>{if(root.isConnected)paint()}).catch(()=>{
  if(root.isConnected)root.innerHTML='<div class="v28-source-hold">Fictional venue evidence unavailable; no schedule shown.</div>';
 });
}
function download(){
 if(!context||!inventory)return;
 let r;try{r=plan(context.seed,context.state,context.rec,inventory,mode)}catch(_){return}
 const obj={...r,sourceVenueStatus:inventory.status,
  exportedAt:new Date().toISOString(),sourceIceSeedSHA256:inventory.sourceSeedSHA256,
  officialLeagueWriteAllowed:false,
  facilityBookingAuthority:"NONE_BROWSER_ONLY",
  financialTransactions:0,
  commissionerDecisionRights:"NOT_AUTHENTICATED",
  sourcePlayerOrGameSystemsTouched:false};
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="LeagueOS_V28_FICTIONAL_Ice_Schedule_Fairness_Review.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 notice="Local fictional capacity and fairness report exported. No ice time was booked.";paint();
}
document.addEventListener("change",e=>{
 if(!$("#leagueos-v28-ice-planner"))return;
 if(e.target?.matches?.("[data-v28-mode]")&&MODES.includes(e.target.value)){
  mode=e.target.value;notice="";paint();
 }else if(e.target?.matches?.("[data-v28-week]")){
  const wk=Number(e.target.value);
  if([13,14].includes(wk)){sampleWeek=wk;paint()}
 }
});
document.addEventListener("click",e=>{
 if(e.target?.closest?.("[data-v28-export]")&&$("#leagueos-v28-ice-planner"))download();
});
window.LeagueOSIceV28={mount,_test:{validateInventory,slotsForMode,
 toMinutes,getGames,fairness,chooseSchedule,plan,
 getInventory:()=>inventory,getMode:()=>mode}};
})();