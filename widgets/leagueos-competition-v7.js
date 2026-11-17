/* LeagueOS V7: public-team demo planner + bracket drafts. No bookings or official writes. */
(function(){"use strict";
const SRC="./leagueos_schedule_equity_public_v6.json",STORAGE="bruttech-leagueos-v7-demo-only";
const $=s=>document.querySelector(s),esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nights=["Sunday","Tuesday","Wednesday","Thursday"],days={Sunday:0,Tuesday:2,Wednesday:3,Thursday:4};
const minute=s=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s).trim());return m?Number(m[1])*60+Number(m[2]):NaN};
const clock=n=>Number.isFinite(n)?String(Math.floor(Math.round(n)/60)%24).padStart(2,"0")+":"+String(Math.round(n)%60).padStart(2,"0"):"—";
const dateFor=(start,night,week)=>{const d=new Date(start+"T12:00:00Z");if(isNaN(+d))return "";let k=0;while(d.getUTCDay()!==days[night]&&k++<7)d.setUTCDate(d.getUTCDate()+1);d.setUTCDate(d.getUTCDate()+week*7);return d.toISOString().slice(0,10)};
const download=(obj,name)=>{const b=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const defaults={night:"Wednesday",weeks:8,start:"2026-12-01",rinks:"A,B,C,D",times:"19:15,20:30,21:45,23:00",includeHistory:true,playNight:"Wednesday",playDivision:"Franco Canadian",seedings:{},scores:{},slots:{},bronze:true};
let prefs={...defaults},source=null,loading=null,plan=null,weekShown=0,issue="";
try{const x=JSON.parse(localStorage.getItem(STORAGE)||"null");if(x&&typeof x==="object")prefs={...defaults,...x,seedings:x.seedings||{},scores:x.scores||{},slots:x.slots||{}}}catch(_){}
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
function buildPlan(){if(!source){issue="Source roster still loading";return}issue="";
const times=prefs.times.split(/[,\s;]+/).map(v=>v.trim()).filter(Boolean),rinks=prefs.rinks.split(/[,\s;]+/).map(v=>v.trim().toUpperCase()).filter(Boolean);
if(times.length<2||times.length>8||new Set(times).size!==times.length||times.some(v=>!Number.isFinite(minute(v)))){issue="Enter 2–8 unique 24-hour start times, such as 19:15,20:30,21:45,23:00.";return}
if(!rinks.length||rinks.length>8||new Set(rinks).size!==rinks.length||rinks.some(x=>!/^[A-Z0-9]{1,3}$/.test(x))){issue="Enter 1–8 distinct rink labels, for example A,B,C,D.";return}
if(!/^\d{4}-\d{2}-\d{2}$/.test(prefs.start)||isNaN(+new Date(prefs.start+"T12:00:00Z"))){issue="Choose a valid first planning date.";return}
const slots=[];for(const time of times)for(const rink of rinks)slots.push({key:time+"/"+rink,time,min:minute(time),rink});
slots.sort((a,b)=>a.min-b.min||a.rink.localeCompare(b.rink));
const all=gameWeeks(prefs.night,prefs.weeks),byWeek=Array.from({length:prefs.weeks},(_,i)=>all.filter(g=>g.week===i));
if(!all.length){issue="No public teams available for the selected night.";return}
for(const [w,rows] of byWeek.entries()){if(rows.length>slots.length){issue="Week "+(w+1)+" needs "+rows.length+" game slots, but the illustrative inventory supplies only "+slots.length+". Add ice slots before generating.";return}
rows.forEach((g,i)=>{g.slot=slots[(i+w*3)%slots.length]})}
let initial=exposures(all,prefs.includeHistory);
for(let pass=0;pass<4;pass++)for(const rows of byWeek){for(let step=0;step<rows.length*2;step++){let best=null,bestValue=exposures(all,prefs.includeHistory).score;
for(const g of rows){const original=g.slot;for(const slot of slots){if(slot===original)continue;const other=rows.find(x=>x!==g&&x.slot===slot);g.slot=slot;if(other)other.slot=original;const trial=exposures(all,prefs.includeHistory).score;g.slot=original;if(other)other.slot=slot;
if(trial+1e-5<bestValue){bestValue=trial;best={g,other,slot,original}}}}
if(!best)break;best.g.slot=best.slot;if(best.other)best.other.slot=best.original}}
const report=exposures(all,prefs.includeHistory);
plan={schema:"bruttech-leagueos-v7-demo-scenario",night:prefs.night,source_snapshot:source.source_snapshot||"2026-11-16",facility_inventory:"ILLUSTRATIVE_UNVERIFIED",not_official:true,first_week:dateFor(prefs.start,prefs.night,0),weeks:prefs.weeks,ice_slots_per_week:slots.length,ice_times:times,rinks,include_partial_archived_starts:prefs.includeHistory,fixtures:all.map(g=>({id:g.id,week:g.week+1,date:dateFor(prefs.start,prefs.night,g.week),time:g.slot.time,rink:g.slot.rink,division:g.division,home:g.home.team_name,away:g.away.team_name})),report,initial_score:initial.score};
weekShown=0;
}
const note='<p class="lc-warning">Demo only: published team-season records are not confirmed registrations. All ice blocks below are <b>illustrative</b>, not confirmed facility availability or reservations. No SVHL/HTO data is changed.</p>';
function plannerUI(){const root=$("#league-planner-mount");if(!root)return;if(!source){root.innerHTML=section("Loading public team list","League-neutral Winter 2026/27 source snapshot",'<p>'+esc(issue||"Reading published team records…")+'</p>');if(!loading)load();return}
const ts=teamsFor(prefs.night),ds=divisions(prefs.night),weekly=gameWeeks(prefs.night,1).length;
let html=note+section("Season scenario inputs","All published teams and divisions on the selected league night are included; matchups remain within divisions.",
'<div class="lc-controls"><label class="field">Competition night<select id="lc-night">'+options(nights,prefs.night)+'</select></label>'+
'<label class="field">Planning weeks<select id="lc-weeks">'+options(["4","6","8","10","12"],String(prefs.weeks))+'</select></label>'+
'<label class="field">First scenario week<input id="lc-start" type="date" value="'+esc(prefs.start)+'"></label>'+
'<label class="field">Scenario rink labels<input id="lc-rinks" value="'+esc(prefs.rinks)+'" maxlength="35"></label>'+
'<label class="field lc-wide">Illustrative start times (24-hour, comma separated)<input id="lc-times" value="'+esc(prefs.times)+'" maxlength="90"></label>'+
'<label class="lc-check"><input id="lc-history" type="checkbox"'+(prefs.includeHistory?" checked":"")+'> Include captured prior game starts when balancing end-of-plan averages (partial public source)</label></div>'+
'<div class="lc-foot">'+ts.length+' published team records · '+ds.length+' divisions · '+weekly+' games in example week · '+prefs.rinks.split(",").length*prefs.times.split(",").length+' illustrative slots/week</div>'+
'<div class="formfooter"><button class="btn primary" id="lc-generate" type="button">Generate balanced scenario</button>'+(plan?'<button class="btn" id="lc-export-plan" type="button">Export draft JSON</button>':'')+'<span class="small dim">No fixture is booked or published</span></div>');
if(issue)html+='<p class="lc-error" role="alert">'+esc(issue)+'</p>';
if(!plan||plan.night!==prefs.night){root.innerHTML=html+section("Scheduler logic","A working scenario, not a mock calendar",'<p>LeagueOS creates division-specific opponent rotations, allocates one game per team per week when possible, prevents double-booking of scenario rink/time slots, and improves average start-time balance with repeated swaps. Odd-sized divisions rotate byes. The goal is minimum end-of-plan disparity, not an impossible guarantee of identical times.</p>');return}
const r=plan.report,stats=r.stats.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),allG=plan.fixtures.filter(g=>g.week===weekShown+1);
html+='<div class="lc-kpis"><div><small>Teams evaluated</small><strong>'+r.stats.length+'</strong><em>Every published team on this night</em></div><div><small>Games assigned</small><strong>'+plan.fixtures.length+'</strong><em>Across '+prefs.weeks+' scenario weeks</em></div><div><small>Proposed mean-start spread</small><strong>'+Math.round(r.spread)+' min</strong><em>Latest vs earliest team average</em></div><div><small>Overall mean start</small><strong>'+clock(r.target)+'</strong><em>Prior source + illustrative games</em></div></div>';
html+=section("Early/late rotation by team","Sorted by greatest difference from the shared night-level average after the illustrative schedule.",
'<div class="lc-tablewrap"><table class="lc-table"><thead><tr><th>Team / division</th><th>Prior games</th><th>New games</th><th>Proposed avg start</th><th>Difference</th><th>10 PM+ total</th></tr></thead><tbody>'+stats.map(x=>'<tr><td><b>'+esc(x.team.team_name)+'</b><small>'+esc(x.team.division)+'</small></td><td>'+x.history+'</td><td>'+x.newGames+'</td><td>'+clock(x.avg)+'</td><td class="'+(Math.abs(x.delta)<30?"lc-good":"lc-attention")+'">'+(x.delta>0?"+":"")+Math.round(x.delta)+' min</td><td>'+x.late+' / '+x.count+'</td></tr>').join("")+'</tbody></table></div>'+
'<p class="lc-caption">Exact equality may be mathematically impossible when the number of early/late slots, byes, and previous assignments differ. Unavailable team preferences, referee requirements and contracted ice are not assumed.</p>');
html+=section("Weekly draft assignments","Choose a week to inspect exact proposed rink/time allocations. No ice-booking system is connected.",
'<div class="lc-week-tabs">'+Array.from({length:prefs.weeks},(_,i)=>'<button class="'+(i===weekShown?"selected":"")+'" data-lc-week="'+i+'">Week '+(i+1)+'</button>').join("")+'</div>'+
'<div class="lc-tablewrap"><table class="lc-table"><thead><tr><th>Start</th><th>Rink</th><th>Matchup</th><th>Division</th></tr></thead><tbody>'+allG.slice().sort((a,b)=>minute(a.time)-minute(b.time)||a.rink.localeCompare(b.rink)).map(x=>'<tr><td><b>'+esc(x.date)+'</b><small>'+esc(x.time)+'</small></td><td>'+esc(x.rink)+'</td><td>'+esc(x.home)+' vs '+esc(x.away)+'</td><td>'+esc(x.division)+'</td></tr>').join("")+'</tbody></table></div>');
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
else if(x.id==="lc-play-night"){prefs.playNight=x.value;prefs.playDivision=divisions(x.value)[0]||"";persist();playoffUI()}
else if(x.id==="lc-play-division"){prefs.playDivision=x.value;persist();playoffUI()}
else if(x.id==="lc-bronze"){prefs.bronze=x.checked;persist();playoffUI()}
});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
if(b.id==="lc-generate"){buildPlan();plannerUI();return}
if(b.id==="lc-export-plan"&&plan){const {report,...safe}=plan;safe.summary={start_mean_spread_minutes:Math.round(report.spread),final_mean_start_minutes:clock(report.target),team_fairness:report.stats.map(v=>({team:v.team.team_name,division:v.team.division,games:v.count,avg_start:clock(v.avg),delta_min:Math.round(v.delta),late_starts:v.late}))};download(safe,"leagueos-scheduling-scenario-v7.json");return}
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
window.LeagueOSCompetition={mountPlanner(){if(!source&&!loading)load();plannerUI()},mountPlayoffs(){if(!source&&!loading)load();playoffUI()},status(){return{sourceLoaded:!!source,publishedTeams:source?.teams.length||0,scenarioGames:plan?.fixtures.length||0,bracketMatches:source?bracket().rounds.flat().length:0,officialWrites:0}},_test:{roundRobin,gameWeeks,exposures,buildPlan,bracket,getPlan:()=>plan,getSource:()=>source}};
})();