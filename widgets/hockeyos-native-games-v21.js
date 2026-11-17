/* BruTTech HockeyOS V21 — original source-verified schedule, results and game detail.
   HTO and league records are read-only. No inferred home/away or unverified future games. */
(function(){"use strict";
const SOURCE="./hockeyos-hto-games-v21.json",SCHEMA="bruttech-hockeyos-hto-games/v21";
const BASE="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=";
const TEAM="Brave H.C.";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
const isGameRoute=s=>/^team-game-\d{6,9}$/.test(s);
const rawGameId=s=>isGameRoute(s)?s.slice("team-game-".length):null;
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+"T12:00:00Z"))&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
const validTime=s=>typeof s==="string"&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
const link=(label,url)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>';
const ui={month:null,view:"calendar",status:"all",query:"",scoreFilter:"all",scoreQuery:""};
let source=null,pending=null,error="";
function fail(message){throw Error("V21 public source hold: "+message)}
function validate(d){
 if(!d||d.schema!==SCHEMA||d.team!==TEAM||d.seasonKey!=="Winter_2026/2027"||
 d.season!=="Winter 2026/2027"||d.scope!=="HTO_CURRENT_SEASON_SOURCE_VERIFIED"||
 d.sourceReadOnly!==true||d.officialRecordEdited!==false||d.status!=="DATED_PUBLIC_SNAPSHOT_NOT_LIVE")
   fail("Authority or scope missing");
 if(d.sources?.schedule!==BASE+"schedule"||d.sources?.scores!==BASE+"scores")fail("Official HTO source links changed");
 if(!Array.isArray(d.games)||!d.coverage||!Array.isArray(d.coverage.months)||
  d.coverage.months.length!==8||!d.counts||!d.reconciliation)fail("Incomplete game snapshot");
 if(!Number.isFinite(Date.parse(d.sourceCapturedAt)))fail("Invalid source capture date");
 if(d.reconciliation.htoScoresIdsExactlyMatchCompletedCalendar!==true||
    d.reconciliation.teamRecordMatchesHTOStatsSnapshot!==true||
    d.reconciliation.unrelatedCalendarEventsExcluded!==true||
    d.reconciliation.sourceGameIdsOnly!==true||
    d.reconciliation.inferredHomeAway!==false||
    d.reconciliation.futureSvhlOnlyFixturesAreNotMerged!==true)fail("Source reconciliation not certified");
 const months=d.coverage.months.map(x=>x.month);
 if(new Set(months).size!==months.length||months[0]!=="2026-09"||months[months.length-1]!=="2027-04")
  fail("Unexpected calendar coverage");
 for(const m of d.coverage.months){
  if(!/^\d{4}-\d{2}$/.test(m.month)||!Number.isInteger(m.gameReferences)||m.gameReferences<0)fail("Invalid calendar inventory");
 }
 const ids=new Set(),results={wins:0,losses:0,ties:0},counts={completed:0,scheduled:0,periodMismatch:0};
 for(const g of d.games){
  if(!g||!/^\d{6,9}$/.test(g.htoGameId)||ids.has(g.htoGameId))fail("Duplicate or invalid game ID");
  ids.add(g.htoGameId);
  if(g.club!==TEAM||g.season!==d.season||!validDate(g.date)||!validTime(g.timeLocal)||
    !validTime(g.endTimeLocal)||!months.includes(g.date.slice(0,7))||
    typeof g.opponent!=="string"||!g.opponent.trim()||g.opponent===TEAM||
    g.opponent.length>130||/[<>]/.test(g.opponent)||
    typeof g.rink!=="string"||!g.rink.trim()||g.rink.length>170||/[<>]/.test(g.rink)||
    g.sourceCalendarMonth!==g.date.slice(0,7)||
    !["COMPLETED_HTO_BOX_SCORE","SCHEDULED_HTO_PREVIEW_AT_CAPTURE"].includes(g.status))
   fail("Unverified game data");
  const kind=g.status==="COMPLETED_HTO_BOX_SCORE"?"boxscore":"preview";
  if(g.sourceUrl!==BASE+kind+"&sportsHQ=BRAVESHOCKEY&gameID="+g.htoGameId)fail("Game link is not an exact HTO source URL");
  if(kind==="boxscore"){
   counts.completed++;
   if(!g.score||!["W","L","T"].includes(g.result)||!["1","2","3"].every(p=>g.score.periods.includes(p))||
    !Array.isArray(g.score.periods)||!Array.isArray(g.score.clubPeriods)||
    !Array.isArray(g.score.opponentPeriods)||g.score.periods.length!==g.score.clubPeriods.length||
    g.score.periods.length!==g.score.opponentPeriods.length||new Set(g.score.periods).size!==g.score.periods.length)
      fail("Completed game missing verified scoreboard");
   for(const val of [g.score.club,g.score.opponent,...g.score.clubPeriods,...g.score.opponentPeriods])
    if(!Number.isInteger(val)||val<0||val>99)fail("Non-integer period or final score");
   const outcome=g.score.club>g.score.opponent?"W":g.score.club<g.score.opponent?"L":"T";
   if(g.result!==outcome)fail("Score/outcome disagreement");
   const parity=g.score.clubPeriods.reduce((a,b)=>a+b,0)===g.score.club&&
     g.score.opponentPeriods.reduce((a,b)=>a+b,0)===g.score.opponent;
   if(g.score.periodSumMatchesFinal!==parity)fail("Period parity status false");
   if(!parity)counts.periodMismatch++;
   if(outcome==="W")results.wins++;else if(outcome==="L")results.losses++;else results.ties++;
  }else{
   counts.scheduled++;
   if(g.score!==null||g.result!==null)fail("Future fixture cannot inherit a score");
  }
 }
 if(d.counts.completed!==counts.completed||d.counts.scheduledAtCapture!==counts.scheduled||
    d.counts.totalVerifiedGames!==d.games.length||
    d.counts.completedWithPeriodSumMismatch!==counts.periodMismatch||
    d.counts.results?.wins!==results.wins||d.counts.results?.losses!==results.losses||
    d.counts.results?.ties!==results.ties||
    d.coverage.months.reduce((a,m)=>a+m.gameReferences,0)!==d.games.length)
    fail("Source counts or authoritative W-L-T changed");
 return d;
}
function load(){
 if(!pending)pending=fetch(SOURCE,{cache:"no-store"}).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);return r.json()
 }).then(d=>{source=validate(d);error="";return source}).catch(e=>{
  source=null;pending=null;error=String(e);throw e
 });
 return pending;
}
function niceDate(day,weekday=false){
 if(!validDate(day))return "Date not verified";
 return new Date(day+"T12:00:00Z").toLocaleDateString("en-CA",
  {timeZone:"UTC",...(weekday?{weekday:"short"}:{}),month:"short",day:"numeric",year:"numeric"});
}
function niceTime(t){
 if(!validTime(t))return "Time not verified";
 const h=Number(t.slice(0,2));
 return (h%12||12)+":"+t.slice(3)+(h>=12?" PM":" AM");
}
function shortRink(rink){
 return rink.replace(/^Vaughan Sports Village - /,"");
}
function monthTitle(month){
 return new Date(month+"-01T12:00:00Z").toLocaleDateString("en-CA",
  {timeZone:"UTC",month:"long",year:"numeric"});
}
function currentlyScheduledAtCapture(g){return g.status==="SCHEDULED_HTO_PREVIEW_AT_CAPTURE"}
function card(g,{condensed=false}={}){
 const done=!currentlyScheduledAtCapture(g);
 const result=done?'<span class="v21-result '+(g.result==="W"?"is-win":g.result==="L"?"is-loss":"is-tie")+
 '">'+esc(g.result)+'</span>':'<span class="v21-result is-future">SCHEDULED</span>';
 return '<button type="button" data-v21-game="'+esc(g.htoGameId)+'" class="v21-game-card'+(condensed?' is-condensed':'')+'">'+
 '<div class="v21-card-date"><b>'+esc(niceDate(g.date,true))+'</b><small>'+esc(niceTime(g.timeLocal))+' · '+esc(shortRink(g.rink))+'</small></div>'+
 '<div class="v21-card-match"><span>BRAVE H.C. <i>VS</i></span><strong>'+esc(g.opponent)+'</strong></div>'+
 '<div class="v21-card-final">'+(done?'<strong>'+g.score.club+'–'+g.score.opponent+'</strong>':'<strong>VS</strong>')+
 result+'</div><span class="v21-card-arrow" aria-hidden="true">›</span></button>';
}
function navButtons(d,mode){
 const old=ui.month||d.sourceCapturedAt.slice(0,7);
 const selected=d.coverage.months.some(m=>m.month===old)?old:d.coverage.months[0].month;
 ui.month=selected;
 const opts=d.coverage.months.map(x=>'<option value="'+esc(x.month)+'"'+(x.month===selected?' selected':'')+'>'+
  esc(monthTitle(x.month))+'</option>').join("");
 return '<div class="v21-controls">'+
 '<label>Month<select id="v21-month">'+opts+'</select></label>'+
 '<label>Find opponent<input id="v21-search" type="search" value="'+esc(ui.query)+
 '" placeholder="Search team name" autocomplete="off"></label>'+
 '<label>Status<select id="v21-status">'+[["all","All verified"],["done","Completed"],["future","Scheduled at capture"]].map(([id,v])=>
  '<option value="'+id+'"'+(ui.status===id?' selected':'')+'>'+v+'</option>').join("")+'</select></label>'+
 '<div class="v21-view-toggle" role="group" aria-label="Schedule display">'+[["calendar","Calendar"],["list","List"]].map(([id,t])=>
 '<button type="button" data-v21-view="'+id+'" aria-pressed="'+(ui.view===id)+'"'+(ui.view===id?' class="active"':'')+
 '>'+t+'</button>').join("")+'</div></div>';
}
function filtersSchedule(d){
 const m=ui.month||"2026-11",q=ui.query.trim().toLowerCase();
 return d.games.filter(g=>g.date.startsWith(m)&&(!q||g.opponent.toLowerCase().includes(q))&&
  (ui.status==="all"||ui.status==="done"&&!currentlyScheduledAtCapture(g)||
   ui.status==="future"&&currentlyScheduledAtCapture(g)));
}
function daysGrid(d,rows){
 const m=ui.month,first=new Date(m+"-01T12:00:00Z");
 const count=new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).getUTCDate();
 const offset=first.getUTCDay(),end=Math.ceil((offset+count)/7)*7;
 const cells=Array.from({length:end},(_,i)=>{
  const day=i-offset+1;
  if(day<=0||day>count)return '<div class="v21-calendar-empty" aria-hidden="true"></div>';
  const date=m+"-"+String(day).padStart(2,"0"),items=rows.filter(x=>x.date===date);
  return '<div class="v21-day"><span class="v21-day-number">'+day+'</span>'+
   items.map(g=>'<button type="button" data-v21-game="'+esc(g.htoGameId)+'" title="'+
   esc(g.opponent)+' · '+esc(niceTime(g.timeLocal))+'" class="v21-day-event">'+
   (g.score?'<b>'+g.score.club+'–'+g.score.opponent+'</b>':'<b>VS</b>')+
   '<small>'+esc(g.opponent)+'</small></button>').join("")+'</div>';
 }).join("");
 return '<div class="v21-calendar"><div class="v21-weekdays">'+
 ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>'<b>'+x+'</b>').join("")+
 '</div><div class="v21-days">'+cells+'</div></div>';
}
function sourceNote(d){
 return '<div class="v21-source-note"><div><strong>HTO public snapshot · '+esc(niceDate(d.sourceCapturedAt.slice(0,10)))+
 '</strong><small>Current season only. Unpublished future league assignments are not part of this HTO-confirmed calendar.</small></div>'+
 link("Official HTO schedule",d.sources.schedule)+'</div>';
}
function heading(title,d,desc){
 return '<section class="v21-heading"><div><span>HOCKEYOS / BRAVE H.C. / '+esc(d.season)+'</span>'+
 '<h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div><div class="v21-source-stamp">'+
 '<small>CAPTURED PUBLIC RECORD</small><b>'+esc(niceDate(d.sourceCapturedAt.slice(0,10)))+'</b>'+
 '<em>No official edits or live synchronization</em></div></section>';
}
function scheduleView(d){
 const rows=filtersSchedule(d);
 const content=ui.view==="calendar"?daysGrid(d,rows):
 '<div class="v21-card-list">'+rows.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(g=>card(g)).join("")+'</div>';
 const empty=rows.length?"":'<p class="v21-no-results">No HTO-published games match this month and filter in the dated snapshot. This does not establish that the facility or league has no other games scheduled.</p>';
 return heading("Team schedule",d,"A source-qualified hockey calendar. Games appear only when a direct public HTO game ID is available.")+
 '<section class="v21-overview"><div><small>COMPLETED HTO GAMES</small><b>'+d.counts.completed+
 '</b></div><div><small>SCHEDULED AT CAPTURE</small><b>'+d.counts.scheduledAtCapture+
 '</b></div><div><small>RECONCILIATION</small><strong>HTO ID MATCHED</strong></div></section>'+
 navButtons(d,"schedule")+'<div class="v21-schedule-section"><div class="v21-section-head"><h3>'+
 esc(monthTitle(ui.month))+'</h3><span>'+rows.length+' public source-listed game'+(rows.length===1?"":"s")+
 '</span></div>'+content+empty+'</div>'+
 '<section class="v21-hold-note"><strong>League calendar distinction</strong><p>LeagueOS may show additional league-listed assignments. They are not automatically promoted to the HockeyOS schedule until the HTO game ID and details have been independently reconciled.</p>'+
 '<button type="button" data-go="league-schedule">Open LeagueOS schedule</button></section>'+sourceNote(d);
}
function scoreControls(){
 return '<div class="v21-controls v21-score-controls"><label>Find opponent<input id="v21-score-search" type="search"'+
 ' value="'+esc(ui.scoreQuery)+'" placeholder="Opponent name"></label>'+
 '<div class="v21-view-toggle" role="group" aria-label="Score result filter">'+
 [["all","All"],["W","Wins"],["L","Losses"],["T","Ties"]].map(([id,t])=>'<button type="button" data-v21-result="'+id+
 '" aria-pressed="'+(ui.scoreFilter===id)+'"'+(ui.scoreFilter===id?' class="active"':'')+'>'+
 t+'</button>').join("")+'</div></div>';
}
function resultsView(d){
 const q=ui.scoreQuery.toLowerCase().trim();
 const rows=d.games.filter(x=>x.status==="COMPLETED_HTO_BOX_SCORE"&&
  (ui.scoreFilter==="all"||x.result===ui.scoreFilter)&&(!q||x.opponent.toLowerCase().includes(q)))
  .sort((a,b)=>b.date.localeCompare(a.date));
 return heading("Scores & results",d,"Official HTO final scores and original game IDs, shown without inferred roster or player appearances.")+
 '<div class="v21-record"><strong>'+d.counts.results.wins+'–'+d.counts.results.losses+'–'+d.counts.results.ties+
 '</strong><span>W – L – T · '+d.counts.completed+' completed, official-source games</span></div>'+
 scoreControls()+'<div class="v21-schedule-section"><div class="v21-section-head"><h3>Game results</h3><span>'+
 rows.length+' of '+d.counts.completed+' completed games</span></div><div class="v21-card-list">'+
 rows.map(g=>card(g)).join("")+'</div>'+(rows.length?"":'<p class="v21-no-results">No matching completed HTO game records.</p>')+
 '</div>'+'<div class="v21-parity"><strong>Source reconciliation passed</strong><p>Every completed HTO Scores game ID was matched to the public season calendar. The W–L–T record matches the separately captured team-statistics snapshot. The official player record book remains untouched.</p></div>'+
 '<section class="v18-bridge" id="team-leagueos-bridge-mount" aria-live="polite"><p>Checking browser-local practice entries…</p></section>'+
 '<div class="v21-hold-note"><strong>Practice scores are separate</strong><p>LeagueOS demonstration game sheets do not update this page. They remain local review drafts until a production league authorization process is implemented.</p></div>'+
 '<div class="v21-source-note">'+link("Open original HTO results",d.sources.scores)+'</div>';
}
function detailView(d,route){
 const id=rawGameId(route),g=d.games.find(x=>x.htoGameId===id);
 if(!g)return '<section class="v21-shell"><div class="v21-source-fail"><strong>Game not found in this verified season snapshot.</strong>'+
 '<p>HockeyOS will not invent a game record or follow an unverified game ID.</p>'+
 '<button type="button" data-go="team-results">Return to Scores</button></div></section>';
 const completed=g.status==="COMPLETED_HTO_BOX_SCORE";
 const periods=g.score?.periods||[];
 const names=["TEAM",...periods,"F"],clubData=[TEAM,...(g.score?.clubPeriods||[]),g.score?.club],
  oppData=[g.opponent,...(g.score?.opponentPeriods||[]),g.score?.opponent];
 const table=completed?'<div class="v21-score-table-wrap"><table class="v21-score-table"><thead><tr>'+
 names.map(n=>'<th>'+esc(n)+'</th>').join("")+'</tr></thead><tbody>'+
 [clubData,oppData].map(row=>'<tr>'+row.map((v,i)=>'<td'+(i===0?' class="v21-club"':'')+'>'+
 esc(v)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>':
 '<p class="v21-preview-message">This is a scheduled HTO game preview at the captured source date. No result or player game sheet has been published in the verified record.</p>';
 const value=completed?'<div class="v21-big-result"><span>BRAVE H.C.</span><b>'+g.score.club+
 ' <i>–</i> '+g.score.opponent+'</b><strong>'+esc(g.opponent)+'</strong></div>':
 '<div class="v21-big-result"><span>BRAVE H.C.</span><b>VS</b><strong>'+esc(g.opponent)+'</strong></div>';
 return heading(completed?"Official game summary":"Scheduled game preview",d,
  "Direct public HTO game #"+id+" · "+esc(niceDate(g.date,true)))+
 '<section class="v21-detail"><div class="v21-detail-top"><span>HTO GAME #'+id+'</span><strong>'+
 (completed?g.result==="W"?"WIN":g.result==="L"?"LOSS":"TIE":"SCHEDULED AT CAPTURE")+
 '</strong></div>'+value+'<div class="v21-detail-meta"><span>'+esc(niceDate(g.date,true))+
 '</span><span>'+esc(niceTime(g.timeLocal))+'–'+esc(niceTime(g.endTimeLocal))+
 ' (local)</span><span>'+esc(g.rink)+'</span></div>'+
 (completed?'<h3>Published period-by-period score</h3>': '<h3>HTO schedule details</h3>')+
 table+'<p class="v21-detail-source">Original HTO period totals are displayed without reinterpretation. '+(completed&&
 !g.score.periodSumMatchesFinal?"Period totals need a source review.":"No player-level events or signatures have been fabricated.")+'</p>'+
 '<div class="v21-detail-actions">'+link(completed?"Full official box score":"Original HTO game preview",g.sourceUrl)+
 '<button type="button" data-go="team-results">All scores</button>'+
 '<button type="button" data-go="team-schedule">Team schedule</button></div></section>'+
 sourceNote(d);
}
function page(route){
 return '<section id="hockeyos-native-games-v21" class="v21-root" data-route="'+esc(route)+'" aria-live="polite">'+
 '<div class="v21-loading"><span>HOCKEYOS / '+(route==="team-schedule"?"CALENDAR":route==="team-results"?"RESULTS":"GAME CENTER")+'</span>'+
 '<h2>Checking public HTO records</h2><p>Validating official game IDs and source dates before showing the schedule…</p></div></section>';
}
function render(route,d){
 const root=$("#hockeyos-native-games-v21");if(!root||root.dataset.route!==route)return;
 if(route==="team-schedule"){
  if(!ui.month){const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",
    {timeZone:"America/Toronto",year:"numeric",month:"2-digit"}).formatToParts(new Date(d.sourceCapturedAt)).map(x=>[x.type,x.value]));
   ui.month=parts.year+"-"+parts.month;
  }
  root.innerHTML=scheduleView(d);
 }else if(route==="team-results")root.innerHTML=resultsView(d);
 else if(isGameRoute(route))root.innerHTML=detailView(d,route);
 if(route==="team-results")window.LeagueOSTeamBridgeV18?.mountTeam();
}
function fillHome(d){
 const holder=$("#hockeyos-v21-last-game");if(!holder)return;
 const final=d.games.filter(x=>x.status==="COMPLETED_HTO_BOX_SCORE")
 .sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!final){holder.innerHTML='<p>No verified completed game in this snapshot.</p>';return}
 holder.innerHTML='<div class="v21-home-last"><b>'+final.score.club+'–'+final.score.opponent+
 '</b><span>'+esc(final.result==="W"?"WIN":final.result==="L"?"LOSS":"TIE")+
 ' · '+esc(niceDate(final.date))+'</span><strong>vs '+esc(final.opponent)+'</strong>'+
 '<small>'+esc(shortRink(final.rink))+'</small></div>'+
 link("Official game box score",final.sourceUrl);
}
function mount(route){
 if(route==="team-home"){
  load().then(fillHome).catch(()=>{const el=$("#hockeyos-v21-last-game");if(el)
   el.innerHTML='<p>HTO source unavailable; official Scores page remains authoritative.</p>'});
  return;
 }
 if(!["team-schedule","team-results"].includes(route)&&!isGameRoute(route))return;
 const root=$("#hockeyos-native-games-v21");if(!root)return;
 load().then(d=>{if(root.isConnected&&root.dataset.route===route)render(route,d)})
 .catch(()=>{if(root.isConnected)root.innerHTML='<div class="v21-source-fail"><strong>Verified game records unavailable</strong>'+
 '<p>HockeyOS has held the calendar rather than displaying stale or unverified games.</p>'+
 link("Official HTO schedule",BASE+"schedule")+" "+link("Official HTO scores",BASE+"scores")+
 '</div>'});
}
function refreshCurrent(){
 const route=window.LeagueOSDemoBridgeV13?.currentRoute?.();
 const active=document.activeElement,id=active?.id;
 const restore=["v21-search","v21-score-search"].includes(id)&&
   typeof active.selectionStart==="number";
 const cursor=restore?{start:active.selectionStart,end:active.selectionEnd}:null;
 if(source&&route)render(route,source);
 if(restore){
  const next=document.getElementById(id);
  if(next){
   next.focus({preventScroll:true});
   next.setSelectionRange(Math.min(cursor.start,next.value.length),Math.min(cursor.end,next.value.length));
  }
 }
}
document.addEventListener("change",e=>{
 const t=e.target;
 if(t.id==="v21-month"){ui.month=t.value;refreshCurrent()}
 else if(t.id==="v21-status"){ui.status=t.value;refreshCurrent()}
});
document.addEventListener("input",e=>{
 const t=e.target;
 if(t.id==="v21-search"){ui.query=t.value;refreshCurrent()}
 else if(t.id==="v21-score-search"){ui.scoreQuery=t.value;refreshCurrent()}
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.v21Game){
  const id=b.dataset.v21Game;
  if(!source?.games.some(g=>g.htoGameId===id))return;
  window.LeagueOSDemoBridgeV13?.go("team-game-"+id);
 }else if(b.dataset.v21View){
  ui.view=b.dataset.v21View;refreshCurrent()
 }else if(b.dataset.v21Result){
  ui.scoreFilter=b.dataset.v21Result;refreshCurrent()
 }
});
window.HockeyOSGamesV21={page,mount,isGameRoute,
 _test:{validate,validDate,validTime,niceTime,filtersSchedule,
  getSource:()=>source,getState:()=>({...ui}),setMonth:m=>ui.month=m}};
})();