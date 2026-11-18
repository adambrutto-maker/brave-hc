/* BruTTech LeagueOS V29 — 24-week FICTIONAL commissioner scheduling.
 * No actual league ice, official commitments, player IDs or booking rights.
 */
(function(){"use strict";
const SOURCE="./leagueos-fictitious-season-v29.json";
const MODES=["FULL_FICTIONAL_SEASON","OTHER_PROGRAM_COMMITMENTS",
 "RINK_C_UNAVAILABLE","PINNED_SLOT_UNAVAILABLE"];
const $=q=>document.querySelector(q);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const round=(n,d=1)=>Math.round(n*10**d)/10**d;
const minutes=x=>{if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x))throw Error("Invalid invented local start time");
 const [h,m]=x.split(":").map(Number);return h*60+m};
const pad=n=>String(n).padStart(2,"0");
const clock=n=>pad(Math.floor(n/60))+":"+pad(Math.round(n%60));
const groupMap=seed=>new Map(seed.teams.map(t=>[t.id,t]));
let source=null,ice=null,loader=null,context=null,mode=MODES[0],selectedWeek=13,notice="";
let cachedKey=null,cachedPlan=null;
function validateSeason(x,seed,v28){
 const api=window.LeagueOSIceV28?._test;
 if(!api||!api.validateInventory)throw Error("V28 scheduling safety interface missing");
 api.validateInventory(v28,seed);
 if(x?.schema!=="bruttech-leagueos-fictional-season-ice/v29"||
 x.status!=="FICTIONAL_24_WEEK_UNVERIFIED_INVENTORY"||
 x.generatedFor!=="BRUTTECH_BROWSER_ONLY_COMMISSIONER_SCENARIO"||
 x.sourceSeedFile!=="leagueos-connected-fictional-v26.json"||
 x.sourceV28File!=="leagueos-fictitious-ice-v28.json"||
 x.sourceSeedSHA256!==v28.sourceSeedSHA256||
 !/^[a-f0-9]{64}$/.test(x.sourceV28SHA256||"")||
 x.sourceFictionalTenant!==seed.tenant.id||x.season!==seed.season.id||
 x.fictionalWeeks!==24||seed.season.regularWeeks!==24||
 x.firstFictionalDate!=="2026-10-25"||
 x.night!=="Sunday"||x.timezone!=="America/Toronto"||
 x.venueName!=="Northstar Fictional Ice Centre"||
 x.slotMinutes!==75||x.transitionMinutes!==15||
 x.rinks?.join("|")!=="A|B|C"||
 x.starts?.join("|")!=="18:00|19:30|21:00|22:30"||
 x.modes?.join("|")!==MODES.join("|")||
 x.policy?.oneGamePerTeamPerWeek!==true||
 x.policy.minRestHours!==48||x.policy.lateStartAtOrAfter!=="21:00"||
 x.policy.veryLateStartAtOrAfter!=="22:00"||
 x.policy.noRetroactiveRealFixtureClaims!==true||
 x.safety?.facilityAuthorization!==false||
 x.safety?.officialBookingsEdited!==false||
 x.safety?.confirmedRealIce!==false||x.safety?.realLeagueChanges!==0||
 x.safety?.allCommitmentsFictional!==true||
 x.safety?.commissionerApprovalRights!=="NONE_BROWSER_ONLY"||
 x.safety?.exportLocalOnly!==true||
 x.slotCount!==288||x.slots?.length!==288||
 x.pinnedCommitments?.length!==2||x.sharedProgramBlocks?.length!==24)
 throw Error("V29 fictional season authority/source contract invalid");
 const ids=new Set(),keys=new Set(),weekCounts=Array(25).fill(0);
 for(const s of x.slots){
  const wk=s.week;
  if(!Number.isInteger(wk)||wk<1||wk>24)throw Error("Invented week out of range");
  const dt=new Date(Date.UTC(2026,9,25+(wk-1)*7)).toISOString().slice(0,10);
  if(s.date!==dt||s.night!=="Sunday"||
   !["A","B","C"].includes(s.rinkCode)||
   s.rink!=="Fictional Rink "+s.rinkCode||
   !x.starts.includes(s.startLocal)||
   s.id!=="FIC-SEASON-W"+wk+"-"+s.rinkCode+"-"+s.startLocal.replace(":","")||
   s.endLocal!==clock(minutes(s.startLocal)+75)||
   s.band!==(s.startLocal>="21:00"?"LATE":"EARLY")||
   s.veryLate!==(s.startLocal>="22:00")||
   s.slotMinutes!==75||s.transitionMinutes!==15||
   s.sourceStatus!=="INVENTED_UNVERIFIED_NOT_BOOKABLE"||
   s.actualAvailability!==false||s.officialBooked!==false||
   s.sourceBookingId!==null||s.refereeAssigned!==false||
   ids.has(s.id)||keys.has([wk,s.rinkCode,s.startLocal].join("|")))
  throw Error("Duplicate, altered or official-looking V29 ice slot");
  ids.add(s.id);keys.add([wk,s.rinkCode,s.startLocal].join("|"));weekCounts[wk]++;
 }
 if(weekCounts.slice(1).some(n=>n!==12))throw Error("Incomplete 24-week fictional slot inventory");
 const pinnedWeeks=new Set(),pinnedSlots=new Set();
 for(const p of x.pinnedCommitments){
  if(![13,14].includes(p.week)||pinnedWeeks.has(p.week)||
   p.commitmentId!=="FIC-COMMITMENT-W"+p.week||
   !/^FIC-SEASON-W(13|14)-FIC-NEW-[ABCD]-\d+-FIC-[AD]-\d+-FIC-[AD]-\d+$/.test(p.fixtureId)||
   p.slotId!=="FIC-SEASON-W"+p.week+"-A-1800"||
   !ids.has(p.slotId)||p.immutableInScenario!==true||
   p.actualExternalBooking!==false||
   p.status!=="FICTIONAL_EXISTING_COMMITMENT_FIXED_FOR_DEMO"||
   !seed.teams.some(t=>t.id===p.homeTeamId)||
   !seed.teams.some(t=>t.id===p.awayTeamId)||p.homeTeamId===p.awayTeamId||
   !p.fixtureId.endsWith("-"+p.homeTeamId+"-"+p.awayTeamId)||pinnedSlots.has(p.slotId))
  throw Error("Untrusted or forged fixed fictional commitment");
  pinnedWeeks.add(p.week);pinnedSlots.add(p.slotId);
 }
 const blockedWeeks=new Set(),blockedSlots=new Set();
 for(const p of x.sharedProgramBlocks){
  if(!Number.isInteger(p.week)||p.week<1||p.week>24||blockedWeeks.has(p.week)||
   p.blockId!=="FIC-OTHER-PROGRAM-W"+p.week||
   p.slotId!=="FIC-SEASON-W"+p.week+"-C-2230"||
   !ids.has(p.slotId)||p.verifiedVenueReservation!==false||
   p.sourceBookingId!==null||
   p.status!=="INVENTED_CROSS_PROGRAM_CONFLICT_NOT_REAL"||
   pinnedSlots.has(p.slotId)||blockedSlots.has(p.slotId))
  throw Error("Untrusted other-program fictional conflict");
  blockedWeeks.add(p.week);blockedSlots.add(p.slotId);
 }
 for(const w of [13,14])for(const old of v28.slots.filter(s=>s.week===w)){
  const entry=x.slots.find(s=>s.week===w&&s.rinkCode===old.rinkCode&&s.startLocal===old.startLocal);
  if(!entry||entry.date!==old.date)throw Error("V28 weekly fictional continuity broken");
 }
 return x;
}
function fixtures(seed,groups){
 const api=window.LeagueOSConnectedV26?._test;
 if(!api?.roundRobin)throw Error("V26 round robin source missing");
 const map=groupMap(seed),rows=[],seenGames=new Set(),seenTeams=new Set();
 const allIds=groups.flatMap(g=>g.teamIds);
 if(allIds.length!==24||new Set(allIds).size!==24||allIds.some(t=>!map.has(t)))
  throw Error("Unqualified fictional division snapshot");
 for(let week=1;week<=24;week++){
  const r=week<=12?week-1:week-13;
  for(const g of groups)for(const m of api.roundRobin(g.teamIds,r)){
   const id="FIC-SEASON-W"+week+"-"+g.id+"-"+m.home+"-"+m.away;
   if(seenGames.has(id)||m.home===m.away)throw Error("Duplicate fictional matchup");
   seenGames.add(id);
   for(const teamId of [m.home,m.away]){
    const k=week+"|"+teamId;
    if(seenTeams.has(k))throw Error("Fictional team playing twice in one week");
    seenTeams.add(k);
   }
   rows.push({id,week,divisionId:g.id,divisionName:g.name,
    homeTeamId:m.home,awayTeamId:m.away,
    officialScheduleWrite:false,sourceBookingId:null});
  }
 }
 return rows.sort((a,b)=>a.week-b.week||a.id.localeCompare(b.id));
}
function equity(rows,seed,detail=false){
 const team=groupMap(seed);
 const profiles=new Map(seed.teams.map(t=>[t.id,{
  teamId:t.id,teamName:t.name,games:0,late:0,veryLate:0,early:0,
  startSum:0,lastWeek:-2,run:0,maxLateStreak:0}]));
 let appearances=0,startSum=0,totalLate=0,totalVeryLate=0;
 for(const a of rows){
  const m=minutes(a.slot.startLocal),late=m>=1260,veryLate=m>=1320;
  for(const id of [a.game.homeTeamId,a.game.awayTeamId]){
   if(!team.has(id))throw Error("Unknown fictional team in equity schedule");
   const p=profiles.get(id);
   p.games++;p.startSum+=m;p.late+=Number(late);p.veryLate+=Number(veryLate);
   p.early+=Number(!late);
   p.run=late?(p.lastWeek===a.game.week-1?p.run+1:1):0;
   p.maxLateStreak=Math.max(p.maxLateStreak,p.run);
   p.lastWeek=a.game.week;
   appearances++;startSum+=m;totalLate+=Number(late);totalVeryLate+=Number(veryLate);
  }
 }
 if(!appearances)throw Error("No fictional games to score");
 const avg=startSum/appearances,lateRate=totalLate/appearances,
  veryLateRate=totalVeryLate/appearances;
 let score=0;const list=[...profiles.values()].filter(p=>p.games>0);
 for(const p of list){
  p.average=p.startSum/p.games;p.lateRate=p.late/p.games;p.veryLateRate=p.veryLate/p.games;
  score+=6*((p.average-avg)/90)**2+
   4*((p.lateRate-lateRate)*10)**2+
   6*((p.veryLateRate-veryLateRate)*10)**2+
   2*Math.max(0,p.maxLateStreak-2)**2;
 }
 const means=list.map(p=>p.average),lateRates=list.map(p=>p.lateRate),
  tenRates=list.map(p=>p.veryLateRate),lates=list.map(p=>p.late),
  veryLates=list.map(p=>p.veryLate);
 score+=3*((Math.max(...means)-Math.min(...means))/90)**2+
  4*((Math.max(...lateRates)-Math.min(...lateRates))*10)**2+
  5*((Math.max(...tenRates)-Math.min(...tenRates))*10)**2;
 const result={score:round(score,4),
  meanStartSpreadMinutes:round(Math.max(...means)-Math.min(...means),1),
  lateCountRange:[Math.min(...lates),Math.max(...lates)],
  veryLateCountRange:[Math.min(...veryLates),Math.max(...veryLates)],
  lateRate:round(lateRate,4),veryLateRate:round(veryLateRate,4),
  averageStart:clock(avg)};
 if(detail)result.teamRows=list.map(p=>({
  teamId:p.teamId,teamName:p.teamName,games:p.games,
  early:p.early,late:p.late,veryLate:p.veryLate,
  lateRate:round(p.lateRate*100),veryLateRate:round(p.veryLateRate*100),
  averageStartLocal:clock(p.average),maxLateStreak:p.maxLateStreak
 })).sort((a,b)=>b.veryLateRate-a.veryLateRate||
  b.lateRate-a.lateRate||a.teamName.localeCompare(b.teamName));
 return result;
}
function findRestViolations(rows,minRestHours=48){
 if(!Number.isFinite(minRestHours)||minRestHours<0)throw Error("Invalid hypothetical rest policy");
 const byTeam=new Map();
 for(const a of rows){
  const timestamp=Date.parse(a.slot.date+"T"+a.slot.startLocal+":00Z");
  if(!Number.isFinite(timestamp))throw Error("Invalid fictional slot date");
  for(const id of [a.game.homeTeamId,a.game.awayTeamId]){
   if(!byTeam.has(id))byTeam.set(id,[]);
   byTeam.get(id).push({time:timestamp,week:a.game.week,gameId:a.game.id});
  }
 }
 const violations=[];
 for(const [id,items] of byTeam){
  items.sort((a,b)=>a.time-b.time);
  for(let i=1;i<items.length;i++){
   const hours=(items[i].time-items[i-1].time)/3600000-75/60;
   if(hours<minRestHours)violations.push({teamId:id,
    before:items[i-1].gameId,after:items[i].gameId,
    availableRestHours:round(hours,2),requiredHours:minRestHours});
  }
 }
 return violations;
}
function availableSlots(s,selectedMode){
 if(!MODES.includes(selectedMode))throw Error("Unknown fictional rink scenario");
 const blocks=new Set(s.sharedProgramBlocks.map(b=>b.slotId));
 return s.slots.filter(x=>selectedMode!=="OTHER_PROGRAM_COMMITMENTS"||!blocks.has(x.id))
  .filter(x=>selectedMode!=="RINK_C_UNAVAILABLE"||x.rinkCode!=="C")
  .filter(x=>selectedMode!=="PINNED_SLOT_UNAVAILABLE"||x.id!=="FIC-SEASON-W13-A-1800");
}
function allocate(seed,requests,season,selectedMode){
 const slots=availableSlots(season,selectedMode);
 const byWeek=Array.from({length:24},(_,i)=>{
  const week=i+1;
  return{week,games:requests.filter(g=>g.week===week),
   slots:slots.filter(s=>s.week===week).sort((a,b)=>
    a.startLocal.localeCompare(b.startLocal)||a.rinkCode.localeCompare(b.rinkCode))};
 });
 const holds=byWeek.filter(w=>w.games.length>w.slots.length)
  .map(w=>({week:w.week,needed:w.games.length,available:w.slots.length,
   shortfall:w.games.length-w.slots.length}));
 const makeHold=(status,details=[])=>({status,requestedGames:requests.length,
  totalSlotsAvailable:slots.length,assignedSlotCount:0,bookedSlots:0,
  games:[],unallocatedGames:requests.length,capacityHold:holds,
  conflictDetails:details,officialBookingsChanged:false,reviewOnly:true});
 if(holds.length)return makeHold("SEASON_CAPACITY_HOLD");
 const gameIds=new Map(requests.map(g=>[g.id,g])),
  slotIds=new Map(slots.map(s=>[s.id,s])),pins=new Map();
 for(const p of season.pinnedCommitments){
  const g=gameIds.get(p.fixtureId),sl=slotIds.get(p.slotId);
  if(!g||!sl||p.week!==g.week||p.week!==sl.week||
   p.homeTeamId!==g.homeTeamId||p.awayTeamId!==g.awayTeamId)
   return makeHold("FIXED_COMMITMENT_CONFLICT_HOLD",[
    {commitmentId:p.commitmentId,week:p.week,reason:!g?"MATCHUP_CHANGED_OR_NOT_IN_DIVISION":"FIXED_SLOT_UNAVAILABLE"}]);
  pins.set(g.id,sl);
 }
 const rows=[],rosters=[];
 for(const w of byWeek){
  const used=new Set(),reserved=[];
  for(const game of w.games){
   if(!pins.has(game.id))continue;
   const slot=pins.get(game.id);
   if(used.has(slot.id))throw Error("Conflicting fictional fixed commitments");
   reserved.push({game,slot,pinned:true});used.add(slot.id);
  }
  const free=w.slots.filter(s=>!used.has(s.id));
  const other=w.games.filter(g=>!pins.has(g.id));
  if(free.length<other.length)throw Error("Pinned ice overlap not handled");
  const movable=other.map((g,i)=>({game:g,slot:free[i],pinned:false}));
  const all=[...reserved,...movable];rows.push(...all);
  rosters.push({week:w.week,all,allSlots:w.slots});
 }
 const baseline=equity(rows,seed,true);let latest=baseline.score;
 let passes=0,improvements=0;
 // Deterministic, monotone, bounded coordinate search over each invented week.
 // Never move a pinned commitment; every trial preserves one rink slot per game.
 for(let pass=0;pass<5;pass++){
  let changed=false;passes++;
  for(const w of rosters){
   const movable=w.all.filter(a=>!a.pinned);
   for(let i=0;i<movable.length;i++){
    const row=movable[i],original=row.slot;
    let best=latest,choice=null;
    for(let j=i+1;j<movable.length;j++){
     const other=movable[j],old=other.slot;
     if(old.startLocal===original.startLocal)continue;
     row.slot=old;other.slot=original;
     const s=equity(rows,seed).score;
     if(s<best-.00001){best=s;choice={kind:"swap",other,slot:old}}
     row.slot=original;other.slot=old;
    }
    const occupied=new Set(w.all.map(r=>r.slot.id));
    for(const slot of w.allSlots.filter(s=>!occupied.has(s.id)&&s.startLocal!==original.startLocal)){
     row.slot=slot;const s=equity(rows,seed).score;
     if(s<best-.00001){best=s;choice={kind:"free",slot}}
     row.slot=original;
    }
    if(choice){
     row.slot=choice.slot;
     if(choice.kind==="swap")choice.other.slot=original;
     latest=best;improvements++;changed=true;
    }
   }
  }
  if(!changed)break;
 }
 const after=equity(rows,seed,true);
 if(after.score>baseline.score+.00001)throw Error("Optimization worsened fairness objective");
 const assignedSlotIds=new Set(),weeklyTeam=new Set();
 for(const row of rows){
  if(assignedSlotIds.has(row.slot.id)||row.game.week!==row.slot.week)
   throw Error("Duplicate or wrong-week assigned fictional rink slot");
  assignedSlotIds.add(row.slot.id);
  for(const t of [row.game.homeTeamId,row.game.awayTeamId]){
   const key=row.game.week+"|"+t;
   if(weeklyTeam.has(key))throw Error("Fictional team conflict within a week");
   weeklyTeam.add(key);
  }
 }
 for(const p of season.pinnedCommitments){
  const a=rows.find(r=>r.game.id===p.fixtureId);
  if(!a||!a.pinned||a.slot.id!==p.slotId)throw Error("Fixed fictional commitments moved");
 }
 const restViolations=findRestViolations(rows,season.policy.minRestHours);
 if(restViolations.length)return makeHold("REST_POLICY_CONFLICT_HOLD",restViolations);
 const games=rows.map(r=>({gameId:r.game.id,week:r.game.week,
  divisionId:r.game.divisionId,divisionName:r.game.divisionName,
  homeTeamId:r.game.homeTeamId,awayTeamId:r.game.awayTeamId,
  slotId:r.slot.id,date:r.slot.date,rink:r.slot.rink,
  startLocal:r.slot.startLocal,band:r.slot.band,veryLate:r.slot.veryLate,
  pinnedFictionalCommitment:r.pinned,officialBooked:false,
  realSchedulingAuthority:false,status:"FICTIONAL_UNBOOKED_FULL_SEASON_PREVIEW"
 })).sort((a,b)=>a.week-b.week||a.startLocal.localeCompare(b.startLocal)||
  a.rink.localeCompare(b.rink));
 return{status:"FEASIBLE_FICTIONAL_SEASON_DRAFT",requestedGames:requests.length,
  totalSlotsAvailable:slots.length,assignedSlotCount:games.length,
  games,bookedSlots:0,freeSlots:slots.length-games.length,
  unallocatedGames:0,capacityHold:[],conflictDetails:[],
  pinnedCommitmentsPreserved:season.pinnedCommitments.length,
  restViolations:[],baselineFairness:baseline,optimizedFairness:after,
  fairnessImprovementPercent:baseline.score>0?
   round((baseline.score-after.score)/baseline.score*100,1):0,
  optimizationPasses:passes,improvingChanges:improvements,
  officialBookingsChanged:false,reviewOnly:true};
}
function plan(seed,state,rec,season,v28,selectedMode=MODES[0]){
 validateSeason(season,seed,v28);
 const api=window.LeagueOSConnectedV26?._test;
 if(!api?.validateState(state,seed))throw Error("Untrusted V26 commissioner story state");
 const reference=api.recommend(seed,{targetSize:state.targetSize,overrides:state.overrides});
 if(JSON.stringify(rec.groups)!==JSON.stringify(reference.groups)||
  JSON.stringify(rec.holds)!==JSON.stringify(reference.holds))
  throw Error("Forged commissioner division recommendations");
 if(!MODES.includes(selectedMode))throw Error("Unknown 24-week what-if");
 const locked=state.currentWeek>seed.season.finalLockAfterWeek,
  published=state.publication.status==="FICTIONAL_PUBLIC_PREVIEW",
  frozen=locked&&published?state.publication.divisions:null,
  groups=locked?frozen:reference.groups,
  held=locked?!frozen||!frozen.length:reference.holds.length>0,
  sourceGate=locked?"LOCKED_FICTIONAL_PUBLISHED_DIVISIONS":
   "UNAPPROVED_24_WEEK_FICTIONAL_RESEARCH_ONLY";
 const base={schema:"bruttech-leagueos-season-fairness-plan/v29",
  scenario:selectedMode,fictionalWeeks:24,sourceGate,locked,
  reviewOnly:true,officialBookingsChanged:false,
  officialScheduleWriteAllowed:false,facilityBookingAuthority:"NONE_BROWSER_ONLY",
  sourceSeedSHA256:season.sourceSeedSHA256,sourceV28SHA256:season.sourceV28SHA256,
  noHistoricalFixturesClaimed:true,fictional: true};
 if(held)return{...base,status:locked?"FINAL_DIVISION_LOCK_SNAPSHOT_HOLD":"DIVISION_SOURCE_HOLD",
  requestedGames:0,totalSlotsAvailable:availableSlots(season,selectedMode).length,
  assignedSlotCount:0,games:[],bookedSlots:0,capacityHold:[],
  conflictDetails:locked?["NO_PREVIOUS_FICTIONAL_PUBLIC_GROUPS"]:
   reference.holds.map(h=>h.reason),unallocatedGames:0};
 const requests=fixtures(seed,groups);
 return{...base,...allocate(seed,requests,season,selectedMode)};
}
function panel(data,seed){
 const t=groupMap(seed),ok=data.status==="FEASIBLE_FICTIONAL_SEASON_DRAFT";
 const labels={
  FULL_FICTIONAL_SEASON:"All fictional ice slots",
  OTHER_PROGRAM_COMMITMENTS:"One other-program slot per week",
  RINK_C_UNAVAILABLE:"Close invented Rink C",
  PINNED_SLOT_UNAVAILABLE:"Remove a fixed game slot"};
 const options=MODES.map(x=>'<option value="'+x+'"'+(mode===x?' selected':'')+'>'+esc(labels[x])+'</option>').join("");
 const kpis=[
  ["Season horizon","24","Imaginary Sunday weeks"],
  ["Fictional matchups",data.requestedGames||0,"No official fixtures changed"],
  ["Usable invented slots",data.totalSlotsAvailable,"Source scenarios, not arena ice"],
  ["Actual bookings","0","No facility connection"]];
 return '<section class="v29-season"><header><div><span>V29 · COMMISSIONER FULL-SEASON FAIRNESS</span>'+
  '<h4>Balance every start across the entire illustrative season.</h4>'+
  '<p>24 invented weeks; two fixed fictional games; rest and cross-program conflict gates.</p></div>'+
  '<b class="v29-status '+(ok?'feasible':'held')+'">'+(ok?'FICTIONAL FEASIBLE':'SCHEDULING HOLD')+'</b></header>'+
  '<div class="v29-keys">'+kpis.map(v=>'<div><small>'+esc(v[0])+'</small><strong>'+esc(v[1])+'</strong><span>'+esc(v[2])+'</span></div>').join("")+'</div>'+
  '<div class="v29-toolbar"><label>Ice scenario<select data-v29-mode>'+options+'</select></label>'+
  '<label>Inspect imaginary week<select data-v29-week>'+
  Array.from({length:24},(_,i)=>i+1).map(w=>'<option value="'+w+'"'+(w===selectedWeek?' selected':'')+'>Week '+w+'</option>').join("")+
  '</select></label><button type="button" data-v29-export>Export local season review</button></div>'+
  '<p class="v29-rule">Commissioner sign-off is separate from this feasibility preview. '+
  (data.locked?"Post-week-12 fictional published group snapshot required.":"Division options are unapproved what-ifs, not an accepted real season.")+
  ' No real league or rink system can be changed from here.</p>'+
  (ok?'<div class="v29-fairness">'+
   '<div><span>Full-season equity penalty</span><strong>'+data.baselineFairness.score.toFixed(1)+
   ' → '+data.optimizedFairness.score.toFixed(1)+'</strong><small>'+
   data.fairnessImprovementPercent+'% lower versus fictional slot-first, not a real-season performance metric</small></div>'+
   '<div><span>9 PM+ starts per team</span><strong>'+data.optimizedFairness.lateCountRange.join('–')+
   '</strong><small>24-week cumulative count; inspect participation-normalized rates below</small></div>'+
   '<div><span>10 PM+ starts per team</span><strong>'+data.optimizedFairness.veryLateCountRange.join('–')+
   '</strong><small>Invented 22:30 starts, measured over the entire sample</small></div>'+
   '<div><span>Frozen sample commitments</span><strong>'+data.pinnedCommitmentsPreserved+'/2</strong>'+
   '<small>Existing fictional game slots remain fixed; 0 genuine bookings</small></div></div>'+
   '<details class="v29-details" open><summary>Week '+selectedWeek+' · '+data.games.filter(g=>g.week===selectedWeek).length+
   ' imaginary fixtures</summary><div class="v29-games">'+data.games.filter(g=>g.week===selectedWeek).map(g=>
    '<div><b>'+esc(g.startLocal)+' · '+esc(g.rink)+'</b><span>'+
    esc(t.get(g.homeTeamId)?.name)+' vs '+esc(t.get(g.awayTeamId)?.name)+'</span>'+
    '<small>'+esc(g.divisionName)+(g.pinnedFictionalCommitment?' · Fixed in simulation':'')+
    ' · Not booked</small></div>').join("")+'</div></details>'+
   '<details class="v29-details"><summary>All 24 teams · season-long start-time equity</summary>'+
   '<div class="v29-table"><table><thead><tr><th>Fictional team</th><th>Games</th>'+
   '<th>9 PM+</th><th>10 PM+</th><th>9 PM+ rate</th><th>Avg start</th><th>Late streak</th></tr></thead><tbody>'+
   data.optimizedFairness.teamRows.map(r=>'<tr><td>'+esc(r.teamName)+'</td><td>'+r.games+
    '</td><td>'+r.late+'</td><td>'+r.veryLate+'</td><td>'+r.lateRate+'%</td>'+
    '<td>'+r.averageStartLocal+'</td><td>'+r.maxLateStreak+'</td></tr>').join("")+
   '</tbody></table></div></details>'+
   '<details class="v29-details"><summary>24-week rink capacity and buffer</summary>'+
   '<div class="v29-table"><table><thead><tr><th>Week</th><th>Matchups</th><th>Invented slots</th><th>Unused</th></tr></thead><tbody>'+
   Array.from({length:24},(_,i)=>i+1).map(w=>{const games=data.games.filter(g=>g.week===w).length;
    const available=data.totalSlotsAvailable===264?11:12;
    return '<tr><td>'+w+'</td><td>'+games+'</td><td>'+available+'</td><td>'+(available-games)+'</td></tr>'}).join("")+
   '</tbody></table></div></details>':
   '<div class="v29-hold"><b>'+esc(data.status.replaceAll("_"," "))+'</b>'+
    '<p>'+(
    data.capacityHold?.length?
    data.capacityHold.slice(0,3).map(h=>"Week "+h.week+": "+h.needed+
     " games, "+h.available+" slots (short "+h.shortfall+")").join(" · ")+
     (data.capacityHold.length>3?" · "+data.capacityHold.length+" affected weeks total":""):
    esc((data.conflictDetails||[]).map(x=>typeof x==="string"?x:
     "Week "+x.week+" "+String(x.reason).replaceAll("_"," ")).join(" · ")))+
    '</p><small>No partial fixture schedule is treated as feasible or published.</small></div>')+
  (notice?'<p class="v29-notice" role="status">'+esc(notice)+'</p>':"")+
  '<p class="v29-disclosure">All dates, teams, rink slots, fixed commitments and competing-program blocks are fictional. The 24-week single-group snapshot does not reconstruct actual past games, actual facility supply, actual 10 PM ice inventory or referees. No authentic commissioner permission, signed approvals, source writes, or bookings exist. Rest calculations use invented Sunday local-time dates only.</p>'+
  '</section>';
}
function load(){
 if(!loader)loader=Promise.all([
  fetch(SOURCE,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Fictional season source HTTP "+r.status);return r.json()}),
  fetch("./leagueos-fictitious-ice-v28.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("V28 source HTTP "+r.status);return r.json()})
 ]).then(([x,v])=>{source=x;ice=v;return x}).catch(err=>{
  source=null;ice=null;loader=null;throw err});
 return loader;
}
function paint(){
 const root=$("#leagueos-v29-season-planner");if(!root||!context||!source||!ice)return;
 let r;try{
  const key=JSON.stringify([mode,context.state,context.rec.groups,context.rec.holds,source.sourceV28SHA256]);
  if(key!==cachedKey){cachedPlan=plan(context.seed,context.state,context.rec,source,ice,mode);cachedKey=key}
  r=cachedPlan;
 }catch(_){root.innerHTML='<div class="v29-source-hold">Fictional season source or commissioner authorization contract failed. No timetable proposed.</div>';return}
 root.innerHTML=panel(r,context.seed);
}
function mount(seed,state,rec){
 const root=$("#leagueos-v29-season-planner");if(!root)return;
 context={seed,state,rec};
 load().then(()=>{if(root.isConnected)paint()}).catch(()=>{
  if(root.isConnected)root.innerHTML='<div class="v29-source-hold">Fictional full-season source unavailable; no timetable shown.</div>';
 });
}
function download(){
 if(!context||!source||!ice)return;
 let r;try{r=plan(context.seed,context.state,context.rec,source,ice,mode)}catch(_){return}
 const doc={...r,exportedAt:new Date().toISOString(),
  commissionerApproval:"NOT_AUTHENTICATED",realIceReservations:0,
  paymentTransactions:0,sourceLeagueChanges:0,downloadIsLocalOnly:true};
 const blob=new Blob([JSON.stringify(doc,null,2)],{type:"application/json"});
 const href=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=href;a.download="LeagueOS_V29_FICTIONAL_Full_Season_Review.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
 notice="Downloaded a browser-local fictional season review. Zero real games booked.";paint();
}
document.addEventListener("change",e=>{
 if(!$("#leagueos-v29-season-planner"))return;
 if(e.target?.matches?.("[data-v29-mode]")&&MODES.includes(e.target.value)){
  mode=e.target.value;notice="";paint();
 }else if(e.target?.matches?.("[data-v29-week]")){
  const w=Number(e.target.value);if(w>=1&&w<=24){selectedWeek=w;paint()}
 }
});
document.addEventListener("click",e=>{
 if(e.target?.closest?.("[data-v29-export]")&&$("#leagueos-v29-season-planner"))download();
});
window.LeagueOSSeasonV29={mount,_test:{validateSeason,fixtures,equity,
 findRestViolations,availableSlots,allocate,plan,getSource:()=>source,getMode:()=>mode}};
})();