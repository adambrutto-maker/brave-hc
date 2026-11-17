/* LeagueOS V7: public-team demo planner + bracket drafts. No bookings or official writes. */
(function(){"use strict";
const SRC="./leagueos_schedule_equity_public_v6.json",STORAGE="bruttech-leagueos-v7-demo-only";
const $=s=>document.querySelector(s),esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nights=["Sunday","Tuesday","Wednesday","Thursday"],days={Sunday:0,Tuesday:2,Wednesday:3,Thursday:4};
const minute=s=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s).trim());return m?Number(m[1])*60+Number(m[2]):NaN};
const clock=n=>Number.isFinite(n)?String(Math.floor(Math.round(n)/60)%24).padStart(2,"0")+":"+String(Math.round(n)%60).padStart(2,"0"):"—";
const dateFor=(start,night,week)=>{const d=new Date(start+"T12:00:00Z");if(isNaN(+d))return "";let k=0;while(d.getUTCDay()!==days[night]&&k++<7)d.setUTCDate(d.getUTCDate()+1);d.setUTCDate(d.getUTCDate()+week*7);return d.toISOString().slice(0,10)};
const download=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const downloadCsv=(scenario)=>{
 const header=["Week","Date","Start time","Rink","Division","Home team","Away team","Status"];
 const rows=[header,...scenario.fixtures.map(g=>[g.week,g.date,g.time,g.rink,g.division,g.home,g.away,"DRAFT_NOT_BOOKED"])];
 const cell=v=>{let t=String(v??"");if(/^[\s]*[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
 const csv="\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="leagueos-draft-schedule-v11.csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1400)
};
const defaults={night:"Wednesday",weeks:8,start:"2026-12-01",rinks:"A,B,C,D",times:"19:15,20:30,21:45,23:00",includeHistory:true,playNight:"Wednesday",playDivision:"Franco Canadian",seedings:{},scores:{},slots:{},bronze:true,inventoryMode:"historical",scheduler_demo_version:9};
let prefs={...defaults},source=null,loading=null,plan=null,weekShown=0,previewTab="calendar",calendarLayout="list",issue="";
try{const x=JSON.parse(localStorage.getItem(STORAGE)||"null");if(x&&typeof x==="object"){prefs={...defaults,...x,seedings:x.seedings||{},scores:x.scores||{},slots:x.slots||{}};if(!(x.scheduler_demo_version>=9)){prefs.inventoryMode="historical";prefs.scheduler_demo_version=9}}}catch(_){}
const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(prefs))}catch(_){}};
const teamsFor=night=>source?source.teams.filter(t=>t.night===night):[];
const key=t=>t.league_id+":"+t.team_id;
const groupKey=()=>prefs.playNight+" | "+prefs.playDivision;
const divisions=night=>[...new Set(teamsFor(night).map(t=>t.division))].sort((a,b)=>a.localeCompare(b));
const section=(title,sub,content)=>'<section class="panel lc-panel"><div class="panelhead"><div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div></div>'+content+'</section>';
const options=(items,active)=>items.map(v=>'<option value="'+esc(v)+'"'+(v===active?" selected":"")+'>'+esc(v)+'</option>').join("");
function load(){if(loading)return loading;loading=fetch(SRC,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Source HTTP "+r.status);return r.json()}).then(j=>{if(j.coverage?.league_team_seasons!==96||!Array.isArray(j.teams))throw Error("Public team schema mismatch");source=j;renderCurrent()}).catch(e=>{issue=String(e);renderCurrent()});return loading}
function renderCurrent(){if($("#league-planner-mount"))plannerUI();if($("#league-playoffs-mount"))playoffUI()}
function roundRobin(names){let a=names.slice();if(a.length%2)a.push(null);const rounds=[];for(let r=0;r<a.length-1;r++){const ps=[];for(let k=0;k<a.length/2;k++){if(a[k]&&a[a.length-1-k])ps.push([a[k],a[a.length-1-k]])}rounds.push(ps);a=[a[0],a[a.length-1],...a.slice(1,-1)]}return rounds}
function gameWeeks(night,weeks){const list=[],byDiv={};teamsFor(night).forEach(t=>(byDiv[t.division]??=[]).push(t));const names=Object.keys(byDiv).sort();names.forEach(d=>byDiv[d].sort((a,b)=>a.team_name.localeCompare(b.team_name)));for(let w=0;w<weeks;w++)for(const d of names){const rounds=roundRobin(byDiv[d]);rounds[w%rounds.length].forEach((pair,i)=>list.push({id:"w"+w+"-"+d+"-"+i,week:w,division:d,home:pair[0],away:pair[1],slot:null}))}return list}
function exposures(games,archive){const s={};for(const t of teamsFor(prefs.night)){const r=t.randomized_slot_reference||{},past=archive&&typeof r.observed_avg_start_minutes==="number"?t.stats.accepted:0;
s[key(t)]={team:t,history:past,played:past,count:past,sum:past*(Number.isFinite(r.observed_avg_start_minutes)?r.observed_avg_start_minutes:0),late:past?(t.stats.late_after_22||0):0,newGames:0,newLate:0,newSum:0}}
for(const g of games){if(!g.slot)continue;for(const t of [g.home,g.away]){const x=s[key(t)],v=g.slot.min;x.count++;x.sum+=v;x.newGames++;x.newSum+=v;if(v>=1320){x.late++;x.newLate++}}}
const a=Object.values(s),count=a.reduce((x,v)=>x+v.count,0),sum=a.reduce((x,v)=>x+v.sum,0),lat=a.reduce((x,v)=>x+v.late,0);
const target=count?sum/count:0,lateTarget=count?lat/count:0;
let score=0;for(const x of a){x.avg=x.count?x.sum/x.count:0;x.newAvg=x.newGames?x.newSum/x.newGames:0;x.delta=x.avg-target;x.lateShare=x.count?x.late/x.count:0;if(x.count)score+=(x.avg-target)**2+1800*(x.lateShare-lateTarget)**2}
const av=a.filter(x=>x.count).map(x=>x.avg);return{stats:a,target,lateTarget,score,spread:av.length?Math.max(...av)-Math.min(...av):0}
}
function buildPlan(){if(!source){issue="Source roster still loading";plan=null;return}issue="";plan=null;
const imported=prefs.inventoryMode==="imported",historic=prefs.inventoryMode==="historical";
const times=prefs.times.split(/[,\s;]+/).map(v=>v.trim()).filter(Boolean),rinks=prefs.rinks.split(/[,\s;]+/).map(v=>v.trim().toUpperCase()).filter(Boolean);
if(!/^\d{4}-\d{2}-\d{2}$/.test(prefs.start)||isNaN(+new Date(prefs.start+"T12:00:00Z"))||new Date(prefs.start+"T12:00:00Z").toISOString().slice(0,10)!==prefs.start){issue="Choose a valid first planning date.";return}
const slots=[];
if(!imported&&!historic){
 if(times.length<2||times.length>8||new Set(times).size!==times.length||times.some(v=>!Number.isFinite(minute(v)))){issue="Enter 2–8 unique 24-hour start times, such as 19:15,20:30,21:45,23:00.";return}
 if(!rinks.length||rinks.length>8||new Set(rinks).size!==rinks.length||rinks.some(x=>!/^[A-Z0-9]{1,3}$/.test(x))){issue="Enter 1–8 distinct rink labels, for example A,B,C,D.";return}
 for(const time of times)for(const rink of rinks)slots.push({key:time+"/"+rink,time,min:minute(time),rink});
 slots.sort((a,b)=>a.min-b.min||a.rink.localeCompare(b.rink));
}
const all=gameWeeks(prefs.night,prefs.weeks),byWeek=Array.from({length:prefs.weeks},(_,i)=>all.filter(g=>g.week===i));
if(!all.length){issue="No public teams available for the selected night.";return}
const inventory=imported?window.LeagueOSIceV8?.getSlots(prefs.night,prefs.start,prefs.weeks):null;
const historical=historic?window.LeagueOSHistoricalSlotsV9?.getSlots(prefs.night,prefs.start,prefs.weeks):null;
if(imported&&(!inventory||!inventory.registryLoaded)){issue="Load the Ice inventory review first. The source fixture registry must be available before using entered ice rows.";plan=null;return}
if(historic&&!historical){issue="Historical time-pattern evidence is still loading or unavailable. Retry once source evidence appears, or select custom fictional slots.";plan=null;return}
const weeklySlots=historic?historical.slots:imported?inventory.slots:Array.from({length:prefs.weeks},(_,w)=>slots.map(slot=>({...slot,date:dateFor(prefs.start,prefs.night,w),authority:"DEMO_ONLY"})));
for(const [w,rows] of byWeek.entries()){const pool=weeklySlots[w];if(rows.length>pool.length){issue="Week "+(w+1)+" requires "+rows.length+" game slots, but "+(historic?"the inferred historical rink/time pattern":imported?"the submitted dated inventory":"the custom fictional inventory")+" has only "+pool.length+" eligible blocks for "+dateFor(prefs.start,prefs.night,w)+". No partial schedule was generated.";plan=null;return}
rows.forEach((g,i)=>{g.slot=pool[(i+w*3)%pool.length]})}
let initial=exposures(all,prefs.includeHistory);
for(let pass=0;pass<4;pass++)for(const [week,rows] of byWeek.entries()){const slots=weeklySlots[week];for(let step=0;step<rows.length*2;step++){let best=null,bestValue=exposures(all,prefs.includeHistory).score;
for(const g of rows){const original=g.slot;for(const slot of slots){if(slot===original)continue;const other=rows.find(x=>x!==g&&x.slot===slot);g.slot=slot;if(other)other.slot=original;const trial=exposures(all,prefs.includeHistory).score;g.slot=original;if(other)other.slot=slot;
if(trial+1e-5<bestValue){bestValue=trial;best={g,other,slot,original}}}}
if(!best)break;best.g.slot=best.slot;if(best.other)best.other.slot=best.original}}
const report=exposures(all,prefs.includeHistory);
plan={schema:"bruttech-leagueos-v9-demo-scenario",night:prefs.night,source_snapshot:source.source_snapshot||"2026-11-16",facility_inventory:historic?"HISTORICALLY_OBSERVED_RINK_TIME_PATTERN_NOT_BOOKABLE":imported?"OPERATOR_IMPORTED_UNVERIFIED":"ILLUSTRATIVE_UNVERIFIED",not_official:true,bookable:false,first_week:dateFor(prefs.start,prefs.night,0),weeks:prefs.weeks,ice_slots_per_week:weeklySlots.map(x=>x.length),ice_times:(imported||historic)?[]:times,rinks:(imported||historic)?[]:rinks,imported_ice_scope:inventory?.scope||"none",historical_pattern_evidence:historic?{observed_fixture_rows:historical.verified_fixture_rows,observed_dates:historical.observed_dates,completed_historical_night_games:historical.completed_history_night,source_snapshot:historical.snapshot,warning:"Inferred recurring template, not ice availability"}:null,include_partial_archived_starts:prefs.includeHistory,fixtures:all.map(g=>({id:g.id,week:g.week+1,date:g.slot.date||dateFor(prefs.start,prefs.night,g.week),time:g.slot.time,rink:g.slot.rink,slot_source:g.slot.authority||"DEMO_ONLY",pattern_observations:g.slot.pattern_observations||null,division:g.division,home:g.home.team_name,away:g.away.team_name})),report,initial_score:initial.score};
weekShown=0;
}
const note='<p class="lc-warning">Demo only: published team-season records are not confirmed registrations. LeagueOS can replay source-observed start-time patterns, fictional slots or operator-entered dated blocks. <b>None establish future ice availability, bookings or reservations.</b> No SVHL/HTO data is changed.</p>';
function plannerUI(){
 const root=$("#league-planner-mount");if(!root)return;
 if(!source){root.innerHTML=section("Loading league information","Reading the published team list",'<p>'+esc(issue||"Checking source records…")+'</p>');if(!loading)load();return}
 const ts=teamsFor(prefs.night),ds=divisions(prefs.night),weekGames=gameWeeks(prefs.night,1).length;
 const historicInfo=window.LeagueOSHistoricalSlotsV9?.status();
 const observed=historicInfo?.slots_by_night?.[prefs.night]||0;
 const detailsOpen=prefs.inventoryMode!=="historical";
 const selectedSource=prefs.inventoryMode==="historical"?"Observed SVHL game times":prefs.inventoryMode==="illustrative"?"Custom fictional times":"Imported date-specific blocks";
 let historicalSlot=null; if(historicInfo?.loaded&&prefs.inventoryMode==="historical"&&/^\d{4}-\d{2}-\d{2}$/.test(prefs.start)){try{historicalSlot=window.LeagueOSHistoricalSlotsV9?.getSlots(prefs.night,prefs.start,prefs.weeks)}catch(_){historicalSlot=null}}
 const observedRinks=historicalSlot?.distinct_rinks||[];
 const currentWeeks=[4,6,8,10,12];
 const pattern=window.LeagueOSHistoricalSlotsV9?.status();
 const sourceLabel=prefs.inventoryMode==="historical"?"OBSERVED GAME-TIME PATTERNS":prefs.inventoryMode==="illustrative"?"CUSTOM FICTIONAL TIMES":"LOCAL DATED ICE DRAFT";
 let html='<div class="v10-wizard v16-season-console"><section class="v16-season-stage" aria-label="Create a season scheduling scenario">'+
 '<header class="v16-stage-heading"><div><span class="v16-eyebrow">SEASON MANAGER / QUICK START</span><h2>Pick a league night.</h2><p>Choose the teams to schedule. LeagueOS rotates early and late games using published historical start-time patterns.</p></div><span class="v16-stage-counter">01 / 02</span></header>'+
 '<div class="v16-night-tiles" role="group" aria-label="Choose league night">'+nights.map((n,i)=>{
   const teams=teamsFor(n),sources=pattern?.slots_by_night?.[n]||0;
   return '<button type="button" class="v16-night-tile'+(n===prefs.night?' selected':'')+'" data-v16-night="'+esc(n)+'" aria-pressed="'+(n===prefs.night)+'">'+
    '<span class="v16-night-index">0'+(i+1)+' / '+esc(n.toUpperCase())+'</span>'+
    '<span class="v16-night-big">'+esc(n.substring(0,3).toUpperCase())+'</span>'+
    '<span class="v16-night-meta"><b>'+teams.length+'</b> teams <i>·</i> <b>'+sources+'</b> observed slots</span>'+
    '<span class="v16-night-ice" aria-hidden="true"><i></i><i></i><i></i></span>'+
   '</button>'
  }).join('')+'</div>'+
 '<div class="v16-season-length"><div><strong>How many weeks?</strong><small>Use 8 for the demo season</small></div>'+
 '<div class="v16-week-buttons" role="group" aria-label="Weeks to schedule">'+currentWeeks.map(w=>'<button type="button" data-v16-weeks="'+w+'" class="'+(prefs.weeks===w?'selected':'')+'" aria-pressed="'+(prefs.weeks===w)+'">'+w+'<small>weeks</small></button>').join('')+'</div></div>'+
 '<div class="v16-source-summary"><span class="v16-source-puck" aria-hidden="true">◷</span><div><strong>'+esc(sourceLabel)+'</strong><small>'+(prefs.inventoryMode==="historical"?
      observed+' recorded rink/start combinations · '+esc(prefs.night)+' · scenario only':
      esc(selectedSource)+' · unverified scenario blocks')+'</small></div>'+
 '<span class="v16-source-status">NOT BOOKED</span></div>'+
 '<div class="v16-launch"><button type="button" class="v16-launch-button" id="lc-generate"><span>GENERATE SEASON</span><b aria-hidden="true">▶</b></button>'+
 '<p>Draft only. No actual league fixtures or facility reservations change.</p></div>'+
 '<details class="v16-settings"><summary><span>⚙</span> Advanced settings <small>Start date, ice data, historic weight</small></summary><div class="v16-settings-body">'+
 '<div class="v16-settings-grid"><label class="field">Competition night<select id="lc-night">'+options(nights,prefs.night)+'</select></label>'+
 '<label class="field">Number of weeks<select id="lc-weeks">'+options(currentWeeks.map(String),String(prefs.weeks))+'</select></label>'+
 '<label class="field">First planning date<input id="lc-start" type="date" value="'+esc(prefs.start)+'"></label>'+
 '<label class="field">Start-time source<select id="lc-inventory-mode"><option value="historical"'+(prefs.inventoryMode==="historical"?' selected':'')+'>Observed SVHL scheduling patterns</option><option value="illustrative"'+(prefs.inventoryMode==="illustrative"?' selected':'')+'>Custom fictional times</option><option value="imported"'+(prefs.inventoryMode==="imported"?' selected':'')+'>Date-specific local draft</option></select></label></div>'+
 (prefs.inventoryMode==="illustrative"?'<div class="v16-settings-grid"><label class="field">Fictional rink labels<input id="lc-rinks" value="'+esc(prefs.rinks)+'" maxlength="35"></label>'+
 '<label class="field">Fictional start times (24h)<input id="lc-times" value="'+esc(prefs.times)+'" maxlength="90"></label></div>':'')+
 '<label class="v10-check"><input id="lc-history" type="checkbox"'+(prefs.includeHistory?' checked':'')+'> Include past published starts in fairness calculation</label>'+
 '<div class="v10-option-links"><button type="button" class="btn small" data-go="league-schedule-equity">Published time analysis</button><button type="button" class="btn small" data-go="league-inventory">Ice input lab</button></div>'+
 '</div></details></section>';
 if(issue)html+='<div class="v10-input-error lc-error" role="alert">'+esc(issue)+'</div>';
 if(!plan||plan.night!==prefs.night){
  html+='<div class="v10-how-works"><strong>What happens next?</strong><p>LeagueOS pairs teams within their divisions, rotates byes when needed and distributes early and late starts. You’ll see the proposed games and a simple fairness report.</p></div>';
  root.innerHTML=html+'</div>';return
 }
 const r=plan.report,sorted=r.stats.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),weekly=plan.fixtures.filter(g=>g.week===weekShown+1);
 const rounded=Math.round(r.spread),mode=plan.facility_inventory==="HISTORICALLY_OBSERVED_RINK_TIME_PATTERN_NOT_BOOKABLE"?"Based on historical start-time patterns":"Based on selected scenario time slots";
 html+='</div><section class="v10-results" id="lc-preview-results"><div class="v10-result-intro"><div><div class="v10-wizard-label">REVIEW YOUR SCHEDULE <span>2 of 2 · Compare and export</span></div><h2>Here’s your schedule preview</h2><p>'+esc(mode)+' · Not booked or published.</p></div><button type="button" class="btn" id="lc-export-csv">Export schedule (CSV)</button></div>'+
 '<div class="v10-result-metrics"><div><small>Games scheduled</small><strong>'+plan.fixtures.length+'</strong><span>Across '+prefs.weeks+' weeks</span></div><div><small>Teams included</small><strong>'+r.stats.length+'</strong><span>All published teams this night</span></div><div><small>Gap between team averages</small><strong>'+rounded+' min</strong><span>Latest average minus earliest average</span></div></div>'+
 '<div class="v10-readout"><span class="v10-readout-mark">✓</span><p><strong>Fair-start scenario created.</strong> Team average game starts are within '+rounded+' minutes of each other in this sample. Actual scheduling would still require facility approval.</p></div>'+
 '<div class="v10-view-tabs" role="tablist" aria-label="Schedule results">'+
 '<button type="button" role="tab" aria-selected="'+(previewTab==="calendar")+'" class="'+(previewTab==="calendar"?'active':'')+'" data-lc-view="calendar">Games by week</button>'+
 '<button type="button" role="tab" aria-selected="'+(previewTab==="fairness")+'" class="'+(previewTab==="fairness"?'active':'')+'" data-lc-view="fairness">Fairness by team</button></div>';
 if(previewTab==="calendar"){
  const games=weekly.slice().sort((a,b)=>minute(a.time)-minute(b.time)||a.rink.localeCompare(b.rink));
  const lanes=[...new Set(games.map(g=>g.rink))].sort((a,b)=>a.localeCompare(b));
  const list='<div class="v10-game-list">'+games.map(g=>
    '<div class="v10-game-item"><div class="v10-game-time"><strong>'+esc(g.time)+'</strong><small>'+esc(g.date)+'</small></div><div class="v10-matchup"><strong>'+esc(g.home)+' <span>vs</span> '+esc(g.away)+'</strong><small>'+esc(g.division)+'</small></div><div class="v10-game-rink">Rink '+esc(g.rink)+'</div></div>').join('')+'</div>';
  const rinkBoard='<div class="v11-rinks-scroll" role="region" aria-label="Schedule by rink — scroll horizontally if needed" tabindex="0"><div class="v11-rinks-board">'+lanes.map(rink=>
    '<div class="v11-rink-column"><h4>Rink '+esc(rink)+'</h4>'+
    games.filter(g=>g.rink===rink).map(g=>'<div class="v11-rink-event"><time>'+esc(g.time)+'</time><strong>'+esc(g.home)+' vs '+esc(g.away)+'</strong><small>'+esc(g.division)+'</small></div>').join('')+
    '</div>').join('')+'</div></div>';
  html+='<section class="panel v10-preview-panel"><div class="v10-preview-head"><h3>Week '+(weekShown+1)+' of '+prefs.weeks+'</h3><p>Proposed matchups, start times and rinks. These are not confirmed bookings.</p></div>'+
    '<div class="lc-week-tabs">'+Array.from({length:prefs.weeks},(_,i)=>'<button type="button" class="'+(i===weekShown?'selected':'')+'" data-lc-week="'+i+'">Week '+(i+1)+'</button>').join('')+'</div>'+
    '<div class="v11-schedule-view"><span>See the week as</span><button type="button" class="'+(calendarLayout==="list"?'active':'')+'" data-lc-layout="list" aria-pressed="'+(calendarLayout==="list")+'">Game list</button>'+
    '<button type="button" class="'+(calendarLayout==="rinks"?'active':'')+'" data-lc-layout="rinks" aria-pressed="'+(calendarLayout==="rinks")+'">By rink</button></div>'+
    (calendarLayout==="rinks"?rinkBoard:list)+'</section>';
 }else{
  const allTimes=[...new Set(plan.fixtures.map(g=>minute(g.time)).filter(Number.isFinite))].sort((a,b)=>a-b);
  const first=allTimes[Math.floor((allTimes.length-1)/3)]??0,last=allTimes[Math.floor((allTimes.length-1)*2/3)]??1440;
  const matrix='<div class="v11-rotation-legend"><span><b>E</b> Earlier start</span><span><b>M</b> Middle start</span><span><b>L</b> Later start</span><span><b>—</b> Bye</span></div>'+
    '<div class="v11-rotation-wrap" role="region" aria-label="Early and late start rotation by team" tabindex="0"><div class="v11-rotation-grid" style="--v11-week-count:'+Number(prefs.weeks)+'">'+
    '<div class="v11-rotation-header">Team</div>'+
    Array.from({length:prefs.weeks},(_,w)=>'<div class="v11-rotation-header">W'+(w+1)+'</div>').join('')+
    sorted.map(x=>'<div class="v11-rotation-name">'+esc(x.team.team_name)+'</div>'+
      Array.from({length:prefs.weeks},(_,w)=>{
       const game=plan.fixtures.find(g=>g.week===w+1&&g.division===x.team.division&&(g.home===x.team.team_name||g.away===x.team.team_name));
       if(!game)return '<div class="v11-rotation-cell bye" title="Week '+(w+1)+' — no game">—</div>';
       const start=minute(game.time),mode=start<=first?"early":start>=last?"late":"mid";
       const marker=mode==="early"?"E":mode==="late"?"L":"M";
       return '<div class="v11-rotation-cell '+mode+'" title="'+esc("Week "+(w+1)+" · "+game.time+" · "+game.home+" vs "+game.away)+'">'+marker+'</div>';
      }).join('')).join('')+'</div></div>';
  html+='<section class="panel v10-preview-panel"><div class="v10-preview-head"><h3>Early and late rotation by team</h3>'+
   '<p>Check how starts are shared from week to week, then compare each team’s average. Earlier and later are relative to this night’s proposed time slots.</p></div>'+
   '<p class="v11-rotation-explainer">The objective is a similar average start time for every team over the season, with reasonable rotation across early and late games. Byes and prior game history can affect exact equality.</p>'+matrix+
   '<div class="lc-tablewrap"><table class="lc-table v10-fairness-table"><thead><tr><th>Team</th><th>Avg. game start</th><th>Difference from overall average</th><th>10 PM+ starts</th></tr></thead><tbody>'+
   sorted.map(x=>'<tr><td><b>'+esc(x.team.team_name)+'</b><small>'+esc(x.team.division)+'</small></td><td><b>'+clock(x.avg)+'</b></td><td class="'+(Math.abs(x.delta)<30?'lc-good':'lc-attention')+'">'+(x.delta>0?'+':'')+Math.round(x.delta)+' min</td><td>'+x.late+' of '+x.count+'</td></tr>').join('')+'</tbody></table></div></section>';
 }
 html+='<details class="v10-method-note"><summary>How was this schedule created? <span aria-hidden="true">⌄</span></summary>'+
 '<div><p>Games are paired within published divisions. An optimization pass rotates start times while giving each team at most one proposed game per date and using each rink/time once.</p>'+
 (window.LeagueOSHistoricalSlotsV9?.evidence(prefs.night)||'')+
 '<p>Historical game times are not proof the same ice will be available. Some divisions require byes; exactly identical averages may be impossible.</p><button type="button" class="btn small" id="lc-export-plan">Export technical JSON</button></div></details>'+
 '</section>';
 root.innerHTML=html
}
function selectedTeams(){return teamsFor(prefs.playNight).filter(t=>t.division===prefs.playDivision)}
function seedOrder(){const original=selectedTeams().map(t=>t.team_name).sort((a,b)=>a.localeCompare(b));const v=prefs.seedings[groupKey()];return Array.isArray(v)&&v.length===original.length&&v.every(n=>original.includes(n))?v:original}
function seedingPattern(size){let p=[1,2];while(p.length<size){const c=2*p.length+1;p=p.flatMap(x=>[x,c-x])}return p}
function scores(){return prefs.scores[groupKey()]||(prefs.scores[groupKey()]={})}
function assigned(){return prefs.slots[groupKey()]||(prefs.slots[groupKey()]={})}
function bracket(){const names=seedOrder(),size=2**Math.ceil(Math.log2(Math.max(2,names.length))),depth=Math.log2(size),pattern=seedingPattern(size),rounds=[];
let field=pattern.map(k=>k<=names.length?{name:names[k-1],label:"#"+k+" "+names[k-1],bye:false}:{name:null,label:"BYE",bye:true});
const sc=scores();
for(let r=0;r<depth;r++){const matches=[];for(let i=0;i<field.length;i+=2){const left=field[i],right=field[i+1],id="r"+r+"m"+(i/2),entry=sc[id],valid=Boolean(left.name&&right.name&&entry&&entry.left===left.name&&entry.right===right.name&&[left.name,right.name].includes(entry.winner)),bye=left.bye||right.bye;
const winner=bye?(left.name||right.name):valid?entry.winner:null;
matches.push({id,round:r,index:i/2,left,right,bye,winner,entry:valid?entry:null,eligible:Boolean(left.name&&right.name),desc:depth-r===1?"Championship":depth-r===2?"Semifinal":depth-r===3?"Quarterfinal":"Round "+(r+1)})}
rounds.push(matches);field=matches.map(m=>({name:m.winner,label:m.winner||"Winner of "+m.desc+" "+(m.index+1),bye:false}))}
let bronze=null;if(rounds.length>=2){const semis=rounds[rounds.length-2],losers=semis.map(m=>m.entry?(m.entry.winner===m.left.name?m.right.name:m.left.name):null);if(losers.length===2)bronze={id:"bronze",round:depth,index:0,left:{name:losers[0],label:losers[0]||"Semifinal loser 1"},right:{name:losers[1],label:losers[1]||"Semifinal loser 2"},eligible:Boolean(losers[0]&&losers[1]),entry:null,bye:false,winner:null,desc:"Bronze"};if(bronze){const e=sc.bronze;if(e&&e.left===bronze.left.name&&e.right===bronze.right.name){bronze.entry=e;bronze.winner=e.winner}}}
return{rounds,bronze,size,names}
}
function matchCard(m){const a=assigned()[m.id]||{},e=m.entry||{},can=m.eligible;
let out='<article class="lc-match" data-lc-match="'+esc(m.id)+'"><div class="lc-match-head"><b>'+esc(m.desc)+' '+(m.index+1)+'</b><span>'+(m.bye?"Automatic bye":m.winner?"Draft winner":"Awaiting result")+'</span></div>'+
'<div class="lc-participant'+(m.winner&&m.winner===m.left.name?" lc-winner":"")+'"><span>'+esc(m.left.label||m.left.name||"TBD")+'</span><b>'+(e.home!==undefined?e.home:"—")+'</b></div>'+
'<div class="lc-participant'+(m.winner&&m.winner===m.right.name?" lc-winner":"")+'"><span>'+esc(m.right.label||m.right.name||"TBD")+'</span><b>'+(e.away!==undefined?e.away:"—")+'</b></div>';
if(can){out+='<div class="lc-score-entry"><input class="lc-home-score" type="number" min="0" max="99" aria-label="First team goals" placeholder="GF" value="'+(e.home??"")+'"><span>–</span><input class="lc-away-score" type="number" min="0" max="99" aria-label="Second team goals" placeholder="GA" value="'+(e.away??"")+'"></div>'+
'<label class="field lc-small">If tied, select winner and decision<select class="lc-tie"><option value="">Not required for non-tied scores</option>'+["OT:left","OT:right","SO:left","SO:right"].map(v=>'<option value="'+v+'"'+(e.method===v?" selected":"")+'>'+esc(v.startsWith("OT")?"Overtime · ":"Shootout · ")+(v.endsWith("left")?esc(m.left.name):esc(m.right.name))+'</option>').join("")+'</select></label>'+
'<button class="btn small primary" data-lc-save-score="'+esc(m.id)+'" type="button">Save demo result</button>'+(e.winner?'<button class="btn small" data-lc-clear-score="'+esc(m.id)+'" type="button">Clear</button>':'')}
else out+='<p class="lc-match-muted">'+(m.bye?"Advances automatically without a game.":"Both participants must be established before a draft score can be entered.")+'</p>';
if(!m.bye)out+='<div class="lc-ice-entry"><small>Proposed game slot · not reserved</small><div><input type="date" class="lc-slot-date" aria-label="Proposed date" value="'+esc(a.date||"")+'"><input type="time" class="lc-slot-time" aria-label="Proposed start" value="'+esc(a.time||"")+'"><select class="lc-slot-rink" aria-label="Proposed rink">'+options(["—","A","B","C","D"],a.rink||"—")+'</select></div><button type="button" class="btn small" data-lc-save-slot="'+esc(m.id)+'">Save slot draft</button></div>';
out+='<p class="lc-inline-error" role="alert"></p></article>';return out}
function playoffUI(){const root=$("#league-playoffs-mount");if(!root)return;if(!source){root.innerHTML=section("Loading league teams","Public team-season source; no official seeding provided","<p>"+esc(issue||"Loading…")+"</p>");if(!loading)load();return}
const ds=divisions(prefs.playNight);if(!ds.includes(prefs.playDivision))prefs.playDivision=ds[0]||"";
const b=bracket(),scoreCount=Object.keys(scores()).length,slotsCount=Object.keys(assigned()).length;
let html=note+section("Playoff competition setup","Use public team names, but treat initial seed order as illustrative until official standings and the division-specific playoff format are approved.",
'<div class="lc-controls"><label class="field">League night<select id="lc-play-night">'+options(nights,prefs.playNight)+'</select></label><label class="field">Division<select id="lc-play-division">'+options(ds,prefs.playDivision)+'</select></label><label class="lc-check"><input type="checkbox" id="lc-bronze"'+(prefs.bronze?" checked":"")+'> Show optional bronze game</label></div>'+
'<div class="lc-foot">'+b.names.length+' public teams · '+b.size+' seeded positions including '+(b.size-b.names.length)+' byes · '+scoreCount+' local draft results · '+slotsCount+' proposed game slots</div>'+
'<p class="lc-caption">The standard seeded knockout is one <b>demonstration format</b>. SVHL divisions have used different approved formats including round robins, wildcards, byes, consolation and bronze games. The real competition engine must load each division\'s approved rule template before publication.</p>');
html+=section("Seed order · draft","Move clubs into the desired order. No official rank or tie-breaker is inferred from this demonstration.",
'<div class="lc-seeds">'+b.names.map((n,i)=>'<div><b>#'+(i+1)+'</b><span>'+esc(n)+'</span><button type="button" class="btn small" data-lc-up="'+i+'" '+(!i?"disabled":"")+' aria-label="Move '+esc(n)+' up">↑</button><button type="button" class="btn small" data-lc-down="'+i+'" '+(i===b.names.length-1?"disabled":"")+' aria-label="Move '+esc(n)+' down">↓</button></div>').join("")+'</div>'+
'<div class="formfooter"><button id="lc-export-playoffs" class="btn" type="button">Export bracket draft JSON</button><button id="lc-reset-playoffs" class="btn warn" type="button">Reset draft scores</button></div>');
html+=section("Interactive playoff bracket","A completed draft score advances its winner. Official verification, eligibility and facility approval are separate production gates.",
'<div class="lc-bracket">'+b.rounds.map((round,i)=>'<div class="lc-round"><h3>'+(i===b.rounds.length-1?"Championship":i===b.rounds.length-2?"Semifinals":i===b.rounds.length-3?"Quarterfinals":"Opening round")+'</h3>'+round.map(matchCard).join("")+'</div>').join("")+'</div>'+
(prefs.bronze&&b.bronze?'<div class="lc-bronze"><h3>Optional bronze</h3>'+matchCard(b.bronze)+'</div>':'')+
'<p class="lc-caption">No seed, winner, ice allocation, game-sheet signature or playoff result has been transmitted to Sports Village or HomeTeamOnline. Scores and slots exist in this browser only; export your draft if needed.</p>');
root.innerHTML=html}
function findMatch(id){const b=bracket();return b.rounds.flat().concat(b.bronze?[b.bronze]:[]).find(m=>m.id===id)}
document.addEventListener("change",e=>{const x=e.target;
if(x.id==="lc-night"){prefs.night=x.value;plan=null;persist();plannerUI()}
else if(x.id==="lc-weeks"){prefs.weeks=Number(x.value);plan=null;persist();plannerUI()}
else if(x.id==="lc-start"){prefs.start=x.value;plan=null;persist();plannerUI()}
else if(x.id==="lc-rinks"){prefs.rinks=x.value;plan=null;persist();plannerUI()}
else if(x.id==="lc-times"){prefs.times=x.value;plan=null;persist();plannerUI()}
else if(x.id==="lc-history"){prefs.includeHistory=x.checked;plan=null;persist();plannerUI()}
else if(x.id==="lc-inventory-mode"){prefs.inventoryMode=x.value;prefs.scheduler_demo_version=9;plan=null;persist();plannerUI();if(x.value==="historical")window.LeagueOSHistoricalSlotsV9?.ensure().then(()=>{if($("#league-planner-mount"))plannerUI()}).catch(()=>{if($("#league-planner-mount"))plannerUI()})}
else if(x.id==="lc-play-night"){prefs.playNight=x.value;prefs.playDivision=divisions(x.value)[0]||"";persist();playoffUI()}
else if(x.id==="lc-play-division"){prefs.playDivision=x.value;persist();playoffUI()}
else if(x.id==="lc-bronze"){prefs.bronze=x.checked;persist();playoffUI()}
});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
if(b.dataset.v16Night){prefs.night=b.dataset.v16Night;plan=null;weekShown=0;persist();plannerUI();return}
if(b.dataset.v16Weeks){prefs.weeks=Number(b.dataset.v16Weeks);plan=null;weekShown=0;persist();plannerUI();return}

if(b.dataset.lcLayout){calendarLayout=b.dataset.lcLayout==="rinks"?"rinks":"list";plannerUI();return}
if(b.dataset.lcView){previewTab=b.dataset.lcView==="fairness"?"fairness":"calendar";plannerUI();return}
if(b.id==="lc-generate"){buildPlan();previewTab="calendar";plannerUI();const next=plan?$("#lc-preview-results"):$(".v10-input-error");if(next)next.scrollIntoView({behavior:"auto",block:"start"});return}
if(b.id==="lc-export-csv"&&plan){downloadCsv(plan);return}
if(b.id==="lc-export-plan"&&plan){const {report,...safe}=plan;safe.summary={start_mean_spread_minutes:Math.round(report.spread),final_mean_start_minutes:clock(report.target),team_fairness:report.stats.map(v=>({team:v.team.team_name,division:v.team.division,games:v.count,avg_start:clock(v.avg),delta_min:Math.round(v.delta),late_starts:v.late}))};download(safe,"leagueos-scheduling-scenario-v9.json");return}
if(b.dataset.lcWeek!==undefined){weekShown=Number(b.dataset.lcWeek);plannerUI();return}
if(b.dataset.lcUp!==undefined||b.dataset.lcDown!==undefined){const arr=seedOrder().slice(),i=Number(b.dataset.lcUp??b.dataset.lcDown),j=b.dataset.lcUp!==undefined?i-1:i+1;if(j>=0&&j<arr.length){[arr[i],arr[j]]=[arr[j],arr[i]];prefs.seedings[groupKey()]=arr;prefs.scores[groupKey()]={};persist();playoffUI()}return}
if(b.id==="lc-reset-playoffs"){prefs.scores[groupKey()]={};persist();playoffUI();return}
if(b.id==="lc-export-playoffs"){download({schema:"bruttech-leagueos-playoff-demo-v7",snapshot:source?.source_snapshot||"2026-11-16",night:prefs.playNight,division:prefs.playDivision,approved_format:false,official_seeding:false,teams:seedOrder(),scores:scores(),proposed_unconfirmed_slots:assigned(),not_official:true},"leagueos-playoff-bracket-draft-v7.json");return}
const card=b.closest(".lc-match"),id=b.dataset.lcSaveScore??b.dataset.lcClearScore??b.dataset.lcSaveSlot;if(!card||!id)return;const m=findMatch(id);if(!m)return;
const err=msg=>{const el=card.querySelector(".lc-inline-error");if(el)el.textContent=msg};
if(b.dataset.lcClearScore!==undefined){delete scores()[id];persist();playoffUI();return}
if(b.dataset.lcSaveScore!==undefined){if(!m.eligible){err("Both teams must be known.");return}const h=card.querySelector(".lc-home-score").value,a=card.querySelector(".lc-away-score").value,method=card.querySelector(".lc-tie").value;if(h===""||a===""||!Number.isInteger(+h)||!Number.isInteger(+a)||+h<0||+a<0||+h>99||+a>99){err("Enter a valid nonnegative goal total for both teams.");return}
if(+h===+a&&!method){err("Tied games require an explicit OT/SO winner.");return}
const winner=+h===+a?(method.endsWith("left")?m.left.name:m.right.name):(+h>+a?m.left.name:m.right.name);
scores()[id]={left:m.left.name,right:m.right.name,home:+h,away:+a,winner,method:+h===+a?method:"REG",updated_at:new Date().toISOString(),status:"BROWSER_DRAFT_ONLY"};persist();playoffUI();return}
if(b.dataset.lcSaveSlot!==undefined){const date=card.querySelector(".lc-slot-date").value,time=card.querySelector(".lc-slot-time").value,rink=card.querySelector(".lc-slot-rink").value;if((date||time||rink!=="—")&&(!date||!Number.isFinite(minute(time))||rink==="—")){err("A slot draft needs a date, valid start time and rink.");return}
if(!date&&!time&&rink==="—")delete assigned()[id];else{const other=Object.entries(assigned()).find(([k,v])=>k!==id&&v.date===date&&v.time===time&&v.rink===rink);if(other){err("This scenario slot is already assigned to another playoff game.");return}assigned()[id]={date,time,rink,status:"PROPOSED_NOT_BOOKED"}}persist();playoffUI();return}
});
window.LeagueOSCompetition={mountPlanner(){if(!source&&!loading)load();if(prefs.inventoryMode==="historical")window.LeagueOSHistoricalSlotsV9?.ensure().then(()=>{if($("#league-planner-mount"))plannerUI()}).catch(()=>{if($("#league-planner-mount"))plannerUI()});plannerUI()},mountPlayoffs(){if(!source&&!loading)load();playoffUI()},status(){return{sourceLoaded:!!source,publishedTeams:source?.teams.length||0,scenarioGames:plan?.fixtures.length||0,bracketMatches:source?bracket().rounds.flat().length:0,officialWrites:0}},_test:{roundRobin,gameWeeks,exposures,buildPlan,bracket,getPlan:()=>plan,getSource:()=>source}};
})();