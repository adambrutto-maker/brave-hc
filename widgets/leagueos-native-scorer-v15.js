/* LeagueOS V15 native scorer console. Public fixture evidence; browser-local practice events only. */
(function(){"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="leagueos-v15-scorer-demo",URL="./leagueos-source-qualified-current-fixtures-v4.json";
const nights=["Sunday","Tuesday","Wednesday","Thursday"],types=[
 {id:"goal",label:"Goal",icon:"◎"},{id:"shot",label:"Shot",icon:"◉"},{id:"penalty",label:"Penalty",icon:"⚑"},{id:"clock",label:"Clock",icon:"◷"},{id:"note",label:"Note",icon:"▤"}
];
let registry=null,loading=null,error="",night="Sunday",fixtureId=null,kind="goal",period="1",tab="events",drafts={},validation="";
try{const z=JSON.parse(localStorage.getItem(KEY)||"{}");if(z&&z.version===15){night=nights.includes(z.night)?z.night:"Sunday";fixtureId=Number(z.fixtureId)||null;drafts=z.drafts&&typeof z.drafts==="object"?z.drafts:{}}}catch(_){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:15,night,fixtureId,drafts}))}catch(_){validation="Browser storage unavailable; export your local practice draft."}}
function fixtureList(){return(registry?.fixtures||[]).filter(x=>x.status==="FUTURE_RECIPROCAL_FIXTURE"&&x.night===night).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.game_id-b.game_id)}
function selected(){return fixtureList().find(x=>x.game_id===fixtureId)||null}
function draft(){if(!fixtureId)return null;const k=String(fixtureId);let d=drafts[k];if(!d||!Array.isArray(d.events))d=drafts[k]={events:[],changes:[],period:"1",clock:"00:00"};if(!Array.isArray(d.changes))d.changes=[];return d}
function stats(){const list=draft()?.events||[],n=(type,side)=>list.filter(x=>x.kind===type&&x.side===side);
return{home:n("goal","home").length,away:n("goal","away").length,homeShots:n("shot","home").length,awayShots:n("shot","away").length,homePim:n("penalty","home").reduce((a,x)=>a+(x.penalty||0),0),awayPim:n("penalty","away").reduce((a,x)=>a+(x.penalty||0),0)}}
function option(v,label,chosen){return'<option value="'+esc(v)+'"'+(v===chosen?' selected':'')+'>'+esc(label)+'</option>'}
function exportDraft(){const f=selected(),d=draft();if(!f||!d)return;const output={schema:"bruttech-leagueos-native-scorer-v15",status:"BROWSER_LOCAL_PRACTICE_NOT_OFFICIAL",officialScorePublished:false,gameId:f.game_id,source_snapshot:"2026-11-16",sourceGameUrl:f.official_game_url,game:{date:f.date,time:f.time,night:f.night,rink:f.rink,home:f.home,away:f.away},demonstration:d,totals:stats(),note:"No official league game-sheet, signature, player eligibility or scores were changed"};
const data=new Blob([JSON.stringify(output,null,2)],{type:"application/json"}),url=URL.createObjectURL(data),a=document.createElement("a");a.href=url;a.download="LeagueOS_Practice_Gamesheet_"+f.game_id+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function log(type,entry){const d=draft();if(!d)return;d.changes.push({action:type,at:new Date().toISOString(),eventId:entry?.id||null});d.changes=d.changes.slice(-200);persist()}
function form(){return'<div class="v15-event-selector" role="group" aria-label="Choose game event">'+types.map(t=>'<button type="button" data-v15-event="'+t.id+'" class="'+(t.id===kind?"selected":"")+'" aria-pressed="'+(t.id===kind)+'"><span>'+t.icon+'</span>'+t.label+'</button>').join("")+'</div>'+
'<form id="v15-event-form"><div class="v15-score-inputs"><label>Team<select name="team"><option value="home">Home</option><option value="away">Away</option></select></label><label>Period<select name="period">'+["1","2","3","OT"].map(x=>option(x,x,period)).join("")+'</select></label>'+
'<label>Game clock<input name="clock" inputmode="numeric" maxlength="5" placeholder="MM:SS" value="'+esc(draft()?.clock||"00:00")+'" required></label>'+
'<label>Jersey (optional)<input name="jersey" inputmode="numeric" maxlength="3" placeholder="19"></label>'+
(kind==="penalty"?'<label>Penalty minutes<select name="penalty">'+["2","4","5","10"].map(x=>option(x,x,"2")).join("")+'</select></label>':'')+
'<label class="v15-score-wide">Details (optional)<textarea name="details" rows="2" maxlength="220" placeholder="'+(kind==="goal"?"Assist jersey numbers, e.g. 8, 27":kind==="penalty"?"Penalty description":"Context or observation")+'"></textarea></label></div>'+
'<div class="v15-score-error" role="alert">'+esc(validation)+'</div><button type="submit" class="v15-action-primary">ADD '+esc(kind.toUpperCase())+' EVENT <span>→</span></button></form>'}
function eventList(){const d=draft();if(!d?.events?.length)return'<p class="v15-score-empty">No practice events yet. Choose an event on the left to begin the game log.</p>';
return d.events.slice().reverse().map(e=>'<article class="v15-log-item"><span class="v15-log-clock">'+esc("P"+e.period+" "+e.time)+'</span><div><strong>'+esc(e.kind.toUpperCase())+' · '+esc(e.side==="home"?selected().home:selected().away)+'</strong><small>'+esc((e.jersey?"#"+e.jersey+" · ":"")+(e.details||"No note"))+'</small></div><button type="button" data-v15-delete="'+e.id+'" title="Remove demonstration event" aria-label="Remove '+esc(e.kind)+' event">×</button></article>').join("")}
function view(){
 const root=$("#league-native-scorer-mount");if(!root)return;
 if(!registry){root.innerHTML='<section class="v15-empty-view"><strong>'+(error?"PUBLIC FIXTURES UNAVAILABLE":"LOADING GAME DATA")+'</strong><p>'+esc(error||"Checking the November 16 source-qualified fixture snapshot…")+'</p>'+(error?'<button type="button" class="btn" id="v15-source-retry">Retry source read</button>':'')+'</section>';if(!loading&&!error)load();return}
 const fixtures=fixtureList();if(!fixtures.some(x=>x.game_id===fixtureId)){fixtureId=fixtures[0]?.game_id||null;persist()}
 const f=selected();const source=f&&/^https:\/\/leagues\.sportsvillage\.ca\/gameinfo\.aspx\?/i.test(f.official_game_url||"")?f.official_game_url:null;
 let html='<div class="v15-native-score"><div class="v15-console-header"><div><span>GAME-DAY CONSOLE / LEAGUE OPERATIONS</span><h2>CONTROL THE GAME.</h2><p>Record goals, penalties and events in a clean scorer-box simulation. The published fixture is reference evidence; this is not an official result.</p></div><b>DEMO MODE</b></div>'+
 '<div class="v15-game-chooser"><label>League night<select id="v15-score-night">'+nights.map(x=>option(x,x,night)).join("")+'</select></label><label>Source-listed upcoming game<select id="v15-score-game"'+(!fixtures.length?' disabled':'')+'>'+fixtures.map(g=>option(String(g.game_id),g.date+" · "+g.time+" — "+g.home+" vs "+g.away,String(fixtureId))).join("")+'</select></label>'+
 '<div><small>FIXTURE SNAPSHOT · NOV 16, 2026</small>'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">VIEW SOURCE GAME ↗</a>':'')+'</div></div>';
 if(!f){root.innerHTML=html+'<div class="v15-empty-view"><strong>NO SOURCE-LISTED GAME ON THIS NIGHT</strong><p>The snapshot is partial. Choose another league night or verify the source calendar.</p></div></div>';return}
 const d=draft(),score=stats();
 html+='<div class="v15-scoreboard"><div class="v15-scoreboard-header"><span>LEAGUEOS / GAME ID '+f.game_id+'</span><span>'+esc(f.date+' · '+f.time+' · '+(f.rink||"Rink unverified"))+'</span></div>'+
 '<div class="v15-scoreboard-main"><div class="v15-scoreclub home"><small>HOME</small><strong>'+esc(f.home)+'</strong><span class="v15-score-digit">'+score.home+'</span></div><div class="v15-ice-puck"><div>⦿</div><strong>VS</strong><small>PERIOD '+esc(d.period||"1")+' · '+esc(d.clock||"00:00")+'</small></div><div class="v15-scoreclub away"><small>AWAY</small><strong>'+esc(f.away)+'</strong><span class="v15-score-digit">'+score.away+'</span></div></div>'+
 '<div class="v15-scoreboard-stats"><span>SHOTS '+score.homeShots+'–'+score.awayShots+'</span><span>PENALTY MIN '+score.homePim+'–'+score.awayPim+'</span><span>LOCAL PRACTICE SCORE — NEVER PUBLISHED</span></div></div>'+
 '<div class="v15-game-nav" role="tablist" aria-label="Score sheet views">'+["events","summary","review"].map(x=>'<button type="button" role="tab" data-v15-scoretab="'+x+'" aria-selected="'+(tab===x)+'" class="'+(tab===x?"selected":"")+'">'+x.toUpperCase()+'</button>').join("")+'</div>';
 if(tab==="events")html+='<div class="v15-scorer-columns"><section class="v15-score-panel"><div class="v15-panel-heading"><span>01 / ACTION</span><h3>ADD EVENT</h3><p>Touch-friendly control pad, then quick details.</p></div>'+form()+'</section>'+
 '<section class="v15-score-panel"><div class="v15-panel-heading"><span>02 / REVIEW</span><h3>EVENT LOG <small>'+d.events.length+'</small></h3><p>Everything is editable until the practice session ends.</p></div><div class="v15-log-list">'+eventList()+'</div></section></div>';
 else if(tab==="summary")html+='<section class="v15-score-panel v15-score-summary"><div class="v15-panel-heading"><span>03 / GAME SNAPSHOT</span><h3>DRAFT SUMMARY</h3><p>Score, shots, penalty minutes and event counts are derived from your browser-local entries.</p></div><div class="v15-summary-grid">'+
 [['Home goals',score.home],['Away goals',score.away],['Shots',score.homeShots+'–'+score.awayShots],['Penalty minutes',score.homePim+'–'+score.awayPim],['Recorded events',d.events.length],['Edit history',d.changes.length]].map(([label,value])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join("")+'</div></section>';
 else html+='<section class="v15-score-panel v15-score-summary"><div class="v15-panel-heading"><span>04 / AUTHORITY GATE</span><h3>REVIEW BEFORE RELEASE</h3><p>This practice environment cannot approve player eligibility or publish any game result.</p></div>'+
 '<div class="v15-review-holds">'+["Scorer and officials are not authenticated","Official player rosters and eligibility are not verified","League signatures and approvals are not connected","Server-side immutable audit and release controls are not connected"].map((s,i)=>'<div><span>HOLD '+(i+1)+'</span><strong>'+esc(s)+'</strong></div>').join("")+'</div></section>';
 html+='<div class="v15-score-footer"><button id="v15-score-export" type="button" class="v15-export">EXPORT PRACTICE SHEET</button><button id="v15-score-reset" type="button" class="v15-reset">RESET THIS DRAFT</button><details><summary>Source and legacy prototype</summary><p>The existing standalone score sheet remains archived for reference. The native console is the LeagueOS demonstration interface; neither updates official records.</p><a href="./svhl-leagueos-score-sheet-demo.html" target="_blank" rel="noopener noreferrer">Open earlier score-sheet research ↗</a></details></div></div>';
 root.innerHTML=html
}
async function load(){if(loading)return loading;loading=fetch(URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(x=>{if(x.schema!=="bruttech-svhl-current-fixture-window/v4"||x.counts?.total!==411||!Array.isArray(x.fixtures))throw Error("Fixture source schema mismatch");registry=x;error="";loading=null;view()}).catch(e=>{error=String(e);loading=null;view()});return loading}
document.addEventListener("change",e=>{if(!$("#league-native-scorer-mount"))return;
if(e.target.id==="v15-score-night"){night=e.target.value;fixtureId=null;validation="";persist();view()}
if(e.target.id==="v15-score-game"){fixtureId=Number(e.target.value);validation="";persist();view()}
if(e.target.name==="period")period=e.target.value
});
document.addEventListener("click",e=>{if(!$("#league-native-scorer-mount"))return;const b=e.target.closest("button");if(!b)return;
if(b.id==="v15-source-retry"){error="";load();return}
if(b.dataset.v15Event){kind=b.dataset.v15Event;validation="";view();return}
if(b.dataset.v15Scoretab){tab=b.dataset.v15Scoretab;validation="";view();return}
if(b.dataset.v15Delete){const d=draft(),target=d.events.find(x=>x.id===b.dataset.v15Delete);if(!target)return;d.events=d.events.filter(x=>x.id!==target.id);log("REMOVE",target);view();return}
if(b.id==="v15-score-reset"){drafts[String(fixtureId)]={events:[],changes:[],clock:"00:00",period:"1"};persist();view();return}
if(b.id==="v15-score-export"){exportDraft();return}
});
document.addEventListener("submit",e=>{if(e.target.id!=="v15-event-form"||!$("#league-native-scorer-mount"))return;e.preventDefault();
const x=new FormData(e.target),v=String(x.get("clock")||"").trim();
if(!/^[0-5]\d:[0-5]\d$/.test(v)){validation="Enter the game clock as MM:SS, e.g. 12:34.";view();return}
const jersey=String(x.get("jersey")||"").trim();if(jersey&&!/^\d{1,3}$/.test(jersey)){validation="Jersey must be 1–3 digits.";view();return}
const d=draft(),event={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),kind,side:x.get("team")==="away"?"away":"home",period:x.get("period"),time:v,jersey,details:String(x.get("details")||"").trim().slice(0,220),penalty:kind==="penalty"?Number(x.get("penalty"))||2:0};
d.events.push(event);d.period=event.period;d.clock=v;log("ADD",event);validation="";view();
});
window.LeagueOSNativeScorerV15={mount:view,status(){return{loaded:!!registry,night,fixtureId,events:draft()?.events.length||0,officialWrites:0,serverActions:false}},_test:{source:()=>registry,fixtureList,selected,draft,totals:stats,exportDraft}};
})();
