/* LeagueOS V15 native scorer console. Public fixture evidence; browser-local practice events only. */
(function(){"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="leagueos-v15-scorer-demo",SOURCE_ASSET="./leagueos-source-qualified-current-fixtures-v4.json";
const nights=["Sunday","Tuesday","Wednesday","Thursday"],types=[
 {id:"goal",label:"Goal",icon:"◎"},{id:"shot",label:"Shot",icon:"◉"},{id:"penalty",label:"Penalty",icon:"⚑"},{id:"clock",label:"Clock",icon:"◷"},{id:"note",label:"Note",icon:"▤"}
];
let registry=null,loading=null,error="",night="Sunday",fixtureId=null,kind="goal",period="1",tab="events",drafts={},validation="",selectedSide="home",editingId=null,resultError="";
try{const z=JSON.parse(localStorage.getItem(KEY)||"{}");if(z&&z.version===15){night=nights.includes(z.night)?z.night:"Sunday";fixtureId=Number(z.fixtureId)||null;drafts=z.drafts&&typeof z.drafts==="object"?z.drafts:{}}}catch(_){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:15,night,fixtureId,drafts}))}catch(_){validation="Browser storage unavailable; export your local practice draft."}}
function fixtureList(){return(registry?.fixtures||[]).filter(x=>x.status==="FUTURE_RECIPROCAL_FIXTURE"&&x.night===night).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.game_id-b.game_id)}
function selected(){return fixtureList().find(x=>x.game_id===fixtureId)||null}
function draft(){if(!fixtureId)return null;const k=String(fixtureId);let d=drafts[k];if(!d||!Array.isArray(d.events))d=drafts[k]={events:[],changes:[],period:"1",clock:"00:00"};if(!Array.isArray(d.changes))d.changes=[];return d}
function stats(){const list=draft()?.events||[],n=(type,side)=>list.filter(x=>x.kind===type&&x.side===side);
return{home:n("goal","home").length,away:n("goal","away").length,homeShots:n("shot","home").length,awayShots:n("shot","away").length,homePim:n("penalty","home").reduce((a,x)=>a+(x.penalty||0),0),awayPim:n("penalty","away").reduce((a,x)=>a+(x.penalty||0),0)}}
/* V17 original league-level result/stat entry, from user-facing team workflow concepts only. */
function resultDraft(){
 const d=draft();if(!d)return null;
 const x=d.result;
 if(!x||typeof x!=="object"||!Number.isInteger(x.home)||!Number.isInteger(x.away)||!["regulation","overtime","shootout","draw"].includes(x.decision)){
  const totals=stats();d.result={home:totals.home,away:totals.away,decision:"regulation",saved:false,reviewed:false};return d.result
 }
 return x
}
function resultValidation(r){
 if(!r||!Number.isInteger(r.home)||!Number.isInteger(r.away)||r.home<0||r.away<0||r.home>99||r.away>99)return"Score must be a whole number from 0 through 99.";
 if(r.decision==="draw"&&r.home!==r.away)return"A draw requires equal scores. League policy is not verified in this demo.";
 if(r.decision!=="draw"&&r.home===r.away)return"Select a winner, or choose Draw for a hypothetical tied result.";
 return""
}
function resultComparison(r){
 const s=stats(),events=draft()?.events||[],goals=events.filter(e=>e.kind==="goal").length;
 if(!goals)return{status:"NO_GOAL_EVENTS",note:"Result entered independently. No recorded goal events are linked to this draft score.",unlinked:r.home+r.away};
 const delta=(r.home-s.home)+(r.away-s.away);
 if(r.home===s.home&&r.away===s.away)return{status:"COUNTS_MATCH",note:"Recorded goal events match the draft final score. Player identity and official game sheet are still unverified.",unlinked:0};
 return{status:"UNRECONCILED_EVENTS",note:"Goal events ("+s.home+"–"+s.away+") and draft final score ("+r.home+"–"+r.away+") differ. Review before any actual official publication.",unlinked:Math.max(0,delta)}
}
function playerSummary(){
 const map=new Map(),unassigned={goals:0,shots:0,penalties:0};
 const get=(side,num)=>{const jersey=String(num||"").trim(),key=side+"/"+jersey;
 if(!jersey)return null;
 if(!map.has(key))map.set(key,{side,jersey,goals:0,assists:0,shots:0,pim:0});
 return map.get(key)};
 for(const e of draft()?.events||[]){
  if(!["home","away"].includes(e.side))continue;
  if(e.kind==="goal"){
   const scorer=get(e.side,e.jersey);
   if(scorer)scorer.goals++;else unassigned.goals++;
   for(const aid of Array.isArray(e.assists)?e.assists:[]){const p=get(e.side,aid);if(p)p.assists++}
  }else if(e.kind==="shot"){
   const shooter=get(e.side,e.jersey);if(shooter)shooter.shots++;else unassigned.shots++;
  }else if(e.kind==="penalty"){
   const offender=get(e.side,e.jersey);if(offender)offender.pim+=Number(e.penalty)||0;else unassigned.penalties++;
  }
 }
 return{rows:[...map.values()].map(r=>({...r,points:r.goals+r.assists})).sort((a,b)=>a.side.localeCompare(b.side)||b.points-a.points||Number(a.jersey)-Number(b.jersey)),unassigned}
}
function resultView(){
 const f=selected(),r=resultDraft(),c=resultComparison(r),error=resultValidation(r),outcomes=[["regulation","Regulation"],["overtime","Overtime"],["shootout","Shootout"],["draw","Draw"]];
 return'<section class="v17-result-console"><header class="v17-stage-title"><span>GAME RESULT / 02</span><h3>Enter the final result.</h3><p>Tap + or − to set the score. This is a browser-local practice result, separate from source-listed official games.</p></header>'+
 '<div class="v17-result-board">'+[["home",f.home],["away",f.away]].map(([side,name])=>
 '<div class="v17-result-team"><span>'+esc(side.toUpperCase())+'</span><strong>'+esc(name)+'</strong><div class="v17-stepper"><button type="button" data-v17-score="'+side+'-down" aria-label="Decrease '+esc(name)+' draft score"'+(r[side]===0?' disabled':'')+'>−</button><b>'+r[side]+'</b><button type="button" data-v17-score="'+side+'-up" aria-label="Increase '+esc(name)+' draft score"'+(r[side]===99?' disabled':'')+'>+</button></div></div>'
 ).join('')+'</div>'+
 '<div class="v17-outcome"><h4>How was the game decided?</h4><div role="group" aria-label="Choose result type">'+outcomes.map(([id,name])=>'<button type="button" data-v17-outcome="'+id+'" aria-pressed="'+(r.decision===id)+'" class="'+(r.decision===id?'selected':'')+'">'+name+'</button>').join('')+'</div></div>'+
 '<div class="v17-reconcile '+(c.status==="COUNTS_MATCH"?'is-match':'')+'"><strong>'+esc(c.status==="COUNTS_MATCH"?"Event totals match":c.status==="NO_GOAL_EVENTS"?"No detailed goal events":"Event totals need review")+'</strong><p>'+esc(c.note)+'</p></div>'+
 (error?'<p class="v17-result-error" role="alert">'+esc(error)+'</p>':'')+
 (resultError?'<p class="v17-result-error" role="alert">'+esc(resultError)+'</p>':'')+
 '<div class="v17-result-actions"><button type="button" id="v17-save-result" class="v16-record-button"'+(error?' disabled':'')+'>'+(r.saved?'SAVE UPDATED RESULT':'SAVE DRAFT RESULT')+' <b>▶</b></button>'+
 '<span>'+(r.saved?'Saved locally · '+esc(r.savedAt||""):'Not yet saved')+'</span></div>'+
 '<p class="v17-result-note">No official results or standings are updated. Actual games may require authorized team/official confirmation and league-specific outcome rules.</p></section>'
}
function playerStatsView(){
 const f=selected(),d=draft(),stat=playerSummary(),totals=stats(),events=d?.events||[];
 const unassigned=stat.unassigned;
 return'<section class="v17-player-console"><header class="v17-stage-title"><span>PLAYER STATISTICS / 03</span><h3>Build the game stats.</h3><p>Assign jersey numbers to recorded events, then LeagueOS calculates goals, assists, points, shots and penalty minutes. Jersey numbers are anonymous demo labels—not verified players.</p></header>'+
 '<div class="v17-player-kpis"><div><small>Goal events</small><b>'+(totals.home+totals.away)+'</b></div><div><small>Tagged jerseys</small><b>'+stat.rows.length+'</b></div><div><small>Unassigned goals</small><b>'+unassigned.goals+'</b></div></div>'+
 '<div class="v17-player-table-wrap"><table class="v17-player-table"><thead><tr><th>Team</th><th>Jersey (unverified)</th><th>G</th><th>A</th><th>PTS</th><th>Shot events</th><th>PIM</th></tr></thead><tbody>'+
 (stat.rows.length?stat.rows.map(r=>'<tr><td>'+esc(r.side==="home"?f.home:f.away)+'</td><td><b>#'+esc(r.jersey)+'</b></td><td>'+r.goals+'</td><td>'+r.assists+'</td><td>'+r.points+'</td><td>'+r.shots+'</td><td>'+r.pim+'</td></tr>').join(''):'<tr><td colspan="7">No jersey-tagged events yet. Tag a goal or other event below to start the stats board.</td></tr>')+
 '</tbody></table></div>'+
 '<div class="v17-stat-guidance"><strong>Attach players to events</strong><p>Choose an event, enter a jersey and optional assists. Statistics update automatically without entering totals separately.</p></div>'+
 '<div class="v17-stat-events">'+(events.length?events.slice().reverse().map(e=>
 '<button type="button" data-v17-tag="'+esc(e.id)+'"><span>'+esc(e.kind.toUpperCase())+' / '+esc(e.side==="home"?f.home:f.away)+'</span><strong>'+esc(e.jersey?"#"+e.jersey:"Unassigned jersey")+'</strong><small>'+esc(e.time)+' · '+(e.kind==="goal"?"Edit scorer & assists":"Assign jersey")+' →</small></button>'
 ).join(''):'<p>No game events have been recorded. Return to Events to add a practice goal, shot or penalty.</p>')+'</div>'+
 (editingId?eventTagEditor():'')+
 '<div class="v17-stat-footer"><button type="button" class="btn" data-v17-switch-tab="events">← Game events</button><button type="button" class="btn" data-v17-switch-tab="result">Final result →</button></div>'+
 '<p class="v17-result-note">Source rosters and eligibility are not connected. Do not use these anonymous jersey entries as real player appearances or official season totals.</p></section>'
}
function eventTagEditor(){
 const e=draft()?.events.find(x=>x.id===editingId);if(!e)return"";
 const assists=Array.isArray(e.assists)?e.assists:[];
 return'<section class="v17-tag-editor" id="v17-tag-editor"><div><span>EDIT PRACTICE EVENT</span><h4>'+esc(e.kind.toUpperCase())+' · '+esc(e.side.toUpperCase())+'</h4></div>'+
 '<form id="v17-tag-form"><label>Jersey number (fictional)<input name="jersey" inputmode="numeric" maxlength="3" placeholder="19" value="'+esc(e.jersey||"")+'"></label>'+
 (e.kind==="goal"?'<label>1st assist jersey<input name="assist1" inputmode="numeric" maxlength="3" placeholder="8" value="'+esc(assists[0]||"")+'"></label><label>2nd assist jersey<input name="assist2" inputmode="numeric" maxlength="3" placeholder="27" value="'+esc(assists[1]||"")+'"></label>':'')+
 '<div class="v17-tag-actions"><button type="submit" class="btn primary">Save event stats</button><button type="button" class="btn" id="v17-cancel-tags">Cancel</button></div></form></section>'
}
function option(v,label,chosen){return'<option value="'+esc(v)+'"'+(v===chosen?' selected':'')+'>'+esc(label)+'</option>'}
function exportDraft(){const f=selected(),d=draft();if(!f||!d)return;const output={schema:"bruttech-leagueos-native-scorer-v15",status:"BROWSER_LOCAL_PRACTICE_NOT_OFFICIAL",officialScorePublished:false,gameId:f.game_id,source_snapshot:"2026-11-16",sourceGameUrl:f.official_game_url,game:{date:f.date,time:f.time,night:f.night,rink:f.rink,home:f.home,away:f.away},demonstration:d,totals:stats(),v17:{schema:"bruttech-leagueos-result-stats-entry/v17",result:d.result||null,player_stats:playerSummary(),comparison:d.result?resultComparison(d.result):null},note:"No official league game-sheet, signature, player eligibility or scores were changed"};
const data=new Blob([JSON.stringify(output,null,2)],{type:"application/json"}),url=URL.createObjectURL(data),a=document.createElement("a");a.href=url;a.download="LeagueOS_Practice_Gamesheet_"+f.game_id+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function log(type,entry){const d=draft();if(!d)return;d.changes.push({action:type,at:new Date().toISOString(),eventId:entry?.id||null});d.changes=d.changes.slice(-200);persist()}
function form(){
 const f=selected(),d=draft();
 return '<div class="v16-score-controls"><div class="v16-step-kicker">PRACTICE EVENT CONSOLE / 01</div><h3>What happened?</h3>'+
 '<div class="v15-event-selector" role="group" aria-label="Choose game event">'+types.map(t=>'<button type="button" data-v15-event="'+t.id+'" class="'+(t.id===kind?"selected":"")+'" aria-pressed="'+(t.id===kind)+'"><span>'+t.icon+'</span>'+t.label+'</button>').join("")+'</div>'+
 '<div class="v16-target-heading">FOR WHICH TEAM?</div><div class="v16-team-targets" role="group" aria-label="Select team">'+
 '<button type="button" data-v16-side="home" class="'+(selectedSide==="home"?"selected":"")+'" aria-pressed="'+(selectedSide==="home")+'"><span>HOME</span><b>'+esc(f?.home||"—")+'</b></button>'+
 '<button type="button" data-v16-side="away" class="'+(selectedSide==="away"?"selected":"")+'" aria-pressed="'+(selectedSide==="away")+'"><span>AWAY</span><b>'+esc(f?.away||"—")+'</b></button></div>'+
 '<button type="button" class="v16-record-button" id="v16-quick-add"><span>'+((kind==="clock"||kind==="note")?"ENTER DETAILS FOR ":"RECORD PRACTICE ")+esc(kind.toUpperCase())+'</span><b>▶</b></button>'+
 '<p class="v16-quick-note">Period '+esc(d?.period||period)+' · '+esc(d?.clock||"00:00")+' · Practice only. No real league scoreboard changes.</p></div>'+
 '<details class="v16-event-details" id="v16-scorer-details"><summary>⚙ Clock, period, jersey &amp; notes <span>Optional detailed entry</span></summary><div class="v16-event-detail-body">'+
 '<form id="v15-event-form"><div class="v15-score-inputs"><label>Team<select name="team">'+option("home",f?.home||"Home",selectedSide)+option("away",f?.away||"Away",selectedSide)+'</select></label><label>Period<select name="period">'+["1","2","3","OT"].map(x=>option(x,x,period)).join("")+'</select></label>'+
 '<label>Game clock<input name="clock" inputmode="numeric" maxlength="5" placeholder="MM:SS" value="'+esc(d?.clock||"00:00")+'" required></label>'+
 '<label>Jersey (optional)<input name="jersey" inputmode="numeric" maxlength="3" placeholder="19"></label>'+
 (kind==="penalty"?'<label>Penalty minutes<select name="penalty">'+["2","4","5","10"].map(x=>option(x,x,"2")).join("")+'</select></label>':'')+
 (kind==="goal"?'<label>First assist jersey (optional)<input name="assist1" inputmode="numeric" maxlength="3" placeholder="8"></label><label>Second assist jersey (optional)<input name="assist2" inputmode="numeric" maxlength="3" placeholder="27"></label>':'')+
 '<label class="v15-score-wide">Details (optional)<textarea name="details" rows="2" maxlength="220" placeholder="'+(kind==="goal"?"Assist jersey numbers, e.g. 8, 27":kind==="penalty"?"Penalty description":"Context or observation")+'"></textarea></label></div>'+
 '<div class="v15-score-error" role="alert">'+esc(validation)+'</div><button type="submit" class="v15-action-primary">ADD '+esc(kind.toUpperCase())+' EVENT <span>→</span></button></form></div></details>'
}
function quickAdd(eventKind,side){
 const d=draft();if(!d||!["goal","shot","penalty"].includes(eventKind))return false;
 const event={id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),kind:eventKind,side:side==="away"?"away":"home",period:d.period||period,time:d.clock||"00:00",jersey:"",details:"One-tap practice event; no official scoring",penalty:eventKind==="penalty"?2:0};
 d.events.push(event);log("ADD",event);validation="";view();return true
}
function eventList(){const d=draft();if(!d?.events?.length)return'<p class="v15-score-empty">No practice events yet. Choose an event on the left to begin the game log.</p>';
return d.events.slice().reverse().map(e=>'<article class="v15-log-item"><span class="v15-log-clock">'+esc("P"+e.period+" "+e.time)+'</span><div><strong>'+esc(e.kind.toUpperCase())+' · '+esc(e.side==="home"?selected().home:selected().away)+'</strong><small>'+esc((e.jersey?"#"+e.jersey+" · ":"")+(e.details||"No note"))+'</small></div>'+(e.kind==="goal"||e.kind==="shot"||e.kind==="penalty"?'<button type="button" class="v17-tag-quick" data-v17-tag="'+e.id+'">Assign stats</button>':'')+'<button type="button" data-v15-delete="'+e.id+'" title="Remove demonstration event" aria-label="Remove '+esc(e.kind)+' event">×</button></article>').join("")}
function view(){
 const root=$("#league-native-scorer-mount");if(!root)return;
 if(!registry){root.innerHTML='<section class="v15-empty-view"><strong>'+(error?"PUBLIC FIXTURES UNAVAILABLE":"LOADING GAME DATA")+'</strong><p>'+esc(error||"Checking the November 16 source-qualified fixture snapshot…")+'</p>'+(error?'<button type="button" class="btn" id="v15-source-retry">Retry source read</button>':'')+'</section>';if(!loading&&!error)load();return}
 const fixtures=fixtureList();if(!fixtures.some(x=>x.game_id===fixtureId)){fixtureId=fixtures[0]?.game_id||null;persist()}
 const f=selected();const source=f&&/^https:\/\/leagues\.sportsvillage\.ca\/gameinfo\.aspx\?/i.test(f.official_game_url||"")?f.official_game_url:null;
 const index=fixtures.findIndex(x=>x.game_id===fixtureId);
 let html='<div class="v15-native-score v16-native-score">'+
 '<div class="v16-game-brief"><span class="v16-eyebrow">GAME CENTER / PRACTICE SCORER</span><strong>RUN THE GAME.</strong><small>Demo events only · No official result submitted</small></div>'+
 '<div class="v16-fixture-carousel"><button type="button" data-v16-game-nav="-1"'+(index<=0?' disabled':'')+' aria-label="Previous published game">‹</button>'+
 '<div class="v16-fixture-current"><span>PUBLISHED FIXTURE · '+esc(f?.date||"—")+' · '+esc(f?.time||"—")+'</span><strong>'+esc(f?.home||"No fixture")+' <i>VS</i> '+esc(f?.away||"—")+'</strong><small>RINK '+esc(f?.rink||"unknown")+' · SOURCE SNAPSHOT NOV 16, 2026</small></div>'+
 '<button type="button" data-v16-game-nav="1"'+(index<0||index>=fixtures.length-1?' disabled':'')+' aria-label="Next published game">›</button></div>'+
 '<details class="v16-fixture-picker"><summary>Change league night or find another game</summary><div class="v15-game-chooser"><label>League night<select id="v15-score-night">'+nights.map(x=>option(x,x,night)).join("")+'</select></label>'+
 '<label>Source-listed upcoming game<select id="v15-score-game"'+(!fixtures.length?' disabled':'')+'>'+fixtures.map(g=>option(String(g.game_id),g.date+" · "+g.time+" — "+g.home+" vs "+g.away,String(fixtureId))).join("")+'</select></label>'+
 '<div><small>SOURCE-LISTED FIXTURES · NOV 16, 2026</small>'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">OFFICIAL SOURCE ↗</a>':'')+'</div></div></details>';

 if(!f){root.innerHTML=html+'<div class="v15-empty-view"><strong>NO SOURCE-LISTED GAME ON THIS NIGHT</strong><p>The snapshot is partial. Choose another league night or verify the source calendar.</p></div></div>';return}
 const d=draft(),score=stats();
 html+='<div class="v15-scoreboard"><div class="v15-scoreboard-header"><span>LEAGUEOS / GAME ID '+f.game_id+'</span><span>'+esc(f.date+' · '+f.time+' · '+(f.rink||"Rink unverified"))+'</span></div>'+
 '<div class="v15-scoreboard-main"><div class="v15-scoreclub home"><small>HOME</small><strong>'+esc(f.home)+'</strong><span class="v15-score-digit">'+score.home+'</span><button type="button" class="v16-score-goal" data-v16-goal-side="home">+ PRACTICE GOAL</button></div><div class="v15-ice-puck"><div>⦿</div><strong>VS</strong><small>PERIOD '+esc(d.period||"1")+' · '+esc(d.clock||"00:00")+'</small></div><div class="v15-scoreclub away"><small>AWAY</small><strong>'+esc(f.away)+'</strong><span class="v15-score-digit">'+score.away+'</span><button type="button" class="v16-score-goal" data-v16-goal-side="away">+ PRACTICE GOAL</button></div></div>'+
 '<div class="v15-scoreboard-stats"><span>SHOTS '+score.homeShots+'–'+score.awayShots+'</span><span>PENALTY MIN '+score.homePim+'–'+score.awayPim+'</span><span>LOCAL PRACTICE SCORE — NEVER PUBLISHED</span></div></div>'+
 '<div class="v15-game-nav" role="tablist" aria-label="Score sheet views">'+["events","summary","review"].map(x=>'<button type="button" role="tab" data-v15-scoretab="'+x+'" aria-selected="'+(tab===x)+'" class="'+(tab===x?"selected":"")+'">'+x.toUpperCase()+'</button>').join("")+'</div>';
 if(tab==="events")html+='<div class="v15-scorer-columns"><section class="v15-score-panel v16-event-console">'+form()+'</section>'+
 '<section class="v15-score-panel"><div class="v15-panel-heading"><span>02 / REVIEW</span><h3>EVENT LOG <small>'+d.events.length+'</small></h3><p>Everything is editable until the practice session ends.</p></div><div class="v15-log-list">'+eventList()+'</div></section></div>';
 else if(tab==="summary")html+='<section class="v15-score-panel v15-score-summary"><div class="v15-panel-heading"><span>03 / GAME SNAPSHOT</span><h3>DRAFT SUMMARY</h3><p>Score, shots, penalty minutes and event counts are derived from your browser-local entries.</p></div><div class="v15-summary-grid">'+
 [['Home goals',score.home],['Away goals',score.away],['Shots',score.homeShots+'–'+score.awayShots],['Penalty minutes',score.homePim+'–'+score.awayPim],['Recorded events',d.events.length],['Edit history',d.changes.length]].map(([label,value])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join("")+'</div></section>';
 else html+='<section class="v15-score-panel v15-score-summary"><div class="v15-panel-heading"><span>04 / AUTHORITY GATE</span><h3>REVIEW BEFORE RELEASE</h3><p>This practice environment cannot approve player eligibility or publish any game result.</p></div>'+
 '<div class="v15-review-holds">'+["Scorer and officials are not authenticated","Official player rosters and eligibility are not verified","League signatures and approvals are not connected","Server-side immutable audit and release controls are not connected"].map((s,i)=>'<div><span>HOLD '+(i+1)+'</span><strong>'+esc(s)+'</strong></div>').join("")+'</div></section>';
 html+='<div class="v15-score-footer"><button id="v15-score-export" type="button" class="v15-export">EXPORT PRACTICE SHEET</button><button id="v15-score-reset" type="button" class="v15-reset">RESET THIS DRAFT</button><details><summary>Source and legacy prototype</summary><p>The existing standalone score sheet remains archived for reference. The native console is the LeagueOS demonstration interface; neither updates official records.</p><a href="./svhl-leagueos-score-sheet-demo.html" target="_blank" rel="noopener noreferrer">Open earlier score-sheet research ↗</a></details></div></div>';
 root.innerHTML=html
}
async function load(){if(loading)return loading;loading=fetch(SOURCE_ASSET,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(x=>{if(x.schema!=="bruttech-svhl-current-fixture-window/v4"||x.counts?.total!==411||!Array.isArray(x.fixtures))throw Error("Fixture source schema mismatch");registry=x;error="";loading=null;view()}).catch(e=>{error=String(e);loading=null;view()});return loading}
document.addEventListener("change",e=>{if(!$("#league-native-scorer-mount"))return;
if(e.target.id==="v15-score-night"){night=e.target.value;fixtureId=null;validation="";persist();view()}
if(e.target.id==="v15-score-game"){fixtureId=Number(e.target.value);validation="";persist();view()}
if(e.target.name==="period")period=e.target.value
});
document.addEventListener("click",e=>{if(!$("#league-native-scorer-mount"))return;const b=e.target.closest("button");if(!b)return;
if(b.dataset.v16GoalSide){quickAdd("goal",b.dataset.v16GoalSide);return}
if(b.dataset.v16Side){selectedSide=b.dataset.v16Side;view();return}
if(b.dataset.v16GameNav){const list=fixtureList(),i=list.findIndex(x=>x.game_id===fixtureId),j=i+Number(b.dataset.v16GameNav);if(j>=0&&j<list.length){fixtureId=list[j].game_id;persist();view()}return}
if(b.id==="v16-quick-add"){if(["clock","note"].includes(kind)){const detail=$("#v16-scorer-details");if(detail){detail.open=true;detail.scrollIntoView({behavior:"auto",block:"nearest"})}return}quickAdd(kind,selectedSide);return}

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
