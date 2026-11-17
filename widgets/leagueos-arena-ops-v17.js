/* LeagueOS V17 | Arena Operations console — visual, source-based, local-demo only. */
(function(){"use strict";
const e=window.LeagueOSOpsEngineV17;
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let source=null,error="",pending=null,date="2026-11-19",view="rinks",selectedId=null,teamView="",notice="",showOnlyDrafts=false;
let drafts=e.read(e.DRAFT_KEY,{}),feed=e.read(e.FEED_KEY,{}),settings={...e.DEFAULTS,...e.read(e.SETTINGS_KEY,{})},overrides=e.read(e.REF_KEY,{});
const validSource=x=>Array.isArray(x)&&x.length>0;
function save(){e.write(e.DRAFT_KEY,drafts);e.write(e.SETTINGS_KEY,settings);e.write(e.REF_KEY,overrides)}
function selected(){return source?e.merge(source,drafts).find(x=>x.game_id===selectedId)||null:null}
function dates(){const base=e.publicDates(source||[]),extra=Object.values(drafts).filter(x=>e.dateValid(x.date)).map(x=>x.date);return[...new Set([...base,...extra])].sort()}
function pickDefault(){const list=dates();if(!list.includes(date))date=list.find(x=>x==="2026-11-19")||list[0]||""}
function assess(){return e.evaluate(source||[],drafts,date,settings,overrides)}
function selectedAssess(){const item=selected();return item?e.evaluate(source||[],drafts,item.date,settings,overrides):assess()}
function status(){const a=source?assess():null;return{loaded:!!source,date,view,selectedId,sourceGames:a?.games.length||0,changed:Object.keys(drafts).length,shared:Object.keys(feed).length,issues:a?.issues.length||0,localOnly:true}}
function badge(f){return f.draftChange?'<span class="v17-tag draft">PROPOSED CHANGE</span>':'<span class="v17-tag source">PUBLISHED SOURCE</span>'}
function scheduleCard(g,a){const crew=a.staff.crews.find(x=>x.gameId===g.game_id),issues=a.issues.filter(x=>x.gameIds?.includes(g.game_id)),shared=feed[String(g.game_id)];
 return'<button type="button" data-v17-game="'+g.game_id+'" class="v17-fixture-card'+(selectedId===g.game_id?' selected':'')+(issues.length?' hold':'')+'">'+
  '<span class="v17-fixture-clock">'+esc(g.time)+'<small>'+esc(g.rink)+' RINK</small></span>'+
  '<span class="v17-fixture-teams"><b>'+esc(g.home)+'</b><em>VS</em><b>'+esc(g.away)+'</b></span>'+
  '<span class="v17-fixture-refs">'+esc(crew?.ref1?.replace("Official ","REF ")||"REF HOLD")+' · '+esc(crew?.ref2?.replace("Official ","REF ")||"REF HOLD")+'</span>'+
  '<span class="v17-fixture-flags">'+(g.draftChange?'<span class="v17-dot edited"></span>':'<span class="v17-dot"></span>')+(shared&&shared.revision===g.draftRevision?'TEAM PREVIEW UPDATED':issues.length?'STAFF / ICE HOLD':'SELECT GAME')+'</span></button>'
}
function ribbon(a){return'<div class="v17-ops-ribbon"><span><strong>'+a.games.length+'</strong> source/draft games</span>'+
 '<span><strong>4</strong> rink lanes</span><span><strong>2</strong> shared resurfacing machines</span>'+
 '<span><strong>'+a.staff.crews.filter(c=>c.ref1&&c.ref2).length+'</strong> sample referee crews assigned</span>'+
 '<span class="'+(a.issues.length?'warn':'')+'"><strong>'+a.issues.length+'</strong> model warning(s)</span></div>'
}
function rinkBoard(a){return'<div class="v17-rink-stage"><div class="v17-board-caption"><strong>FOUR RINKS. ONE GAME-NIGHT PLAN.</strong><span>Click a matchup to move it. Unlisted blocks are unknown, NOT free ice.</span></div>'+
 '<div class="v17-rink-scroll" role="region" aria-label="Four rink game night board" tabindex="0"><div class="v17-rink-grid">'+e.RINKS.map(r=>{
  const rows=a.games.filter(g=>g.rink===r),jobs=a.zamboni.jobs.filter(z=>z.rink===r);
  return'<section class="v17-rink-lane"><header><span>RINK</span><b>'+r+'</b><small>'+rows.length+' game(s)</small></header>'+
   '<div class="v17-rink-games">'+(rows.length?rows.map(g=>scheduleCard(g,a)).join(""):'<div class="v17-rink-unknown">No game in the captured window.<strong>Other ice commitments unknown.</strong></div>')+'</div>'+
   '<footer>'+jobs.length+' modeled between-game ice passes</footer></section>'
 }).join("")+'</div></div></div>'
}
function zamboniBoard(a){return'<div class="v17-staff-panel"><div class="v17-staff-heading"><div><span class="v17-eyebrow">ARENA ICE CREW</span><h2>Two Zambonis. Four rinks.</h2><p>Service is modeled before successive published game starts. Twelve-minute passes and three-minute ready buffers are demonstration assumptions—not verified facility procedures.</p></div></div>'+
 '<div class="v17-model-chips"><span>SERVICE DURATION</span>'+[10,12,15].map(x=>'<button type="button" data-v17-service="'+x+'" class="'+(settings.serviceMinutes===x?'selected':'')+'" aria-pressed="'+(settings.serviceMinutes===x)+'">'+x+' MIN</button>').join("")+'</div>'+
 '<div class="v17-machine-columns">'+e.MACHINES.map(machine=>{
  const jobs=a.zamboni.lanes[machine];return'<section class="v17-machine-column"><header><strong>'+machine.toUpperCase()+'</strong><small>'+(machine==="Zamboni 1"?"Demo operator A":"Demo operator B")+' · Fictional staffing</small></header>'+
  '<div>'+ (jobs.length?jobs.map(j=>'<article class="v17-ice-job"><span>'+e.clock(j.start)+'–'+e.clock(j.end)+'</span><b>RINK '+j.rink+'</b><small>Before '+esc(j.gameStart)+' start · game '+j.gameId+'</small></article>').join(""):'<p>No assigned between-game passes.</p>')+'</div></section>'
 }).join("")+'</div>'+
 (a.zamboni.jobs.some(x=>!x.machine)?'<div class="v17-warning"><strong>Not enough shared machines</strong><p>Some service windows overlap. Adjust a game start or the modeled service interval before a draft can be shared.</p></div>':'<div class="v17-ok"><strong>Shared-machine scenario fits this sample</strong><p>Both example machines cover the modeled service windows. This does not confirm actual operators, maintenance schedules or facility procedure.</p></div>')+
 '<details class="v17-ops-method"><summary>What does the model assume?</summary><p>We only create a resurfacing task BETWEEN successive captured games on the same rink. For each new start, the machine window ends three minutes before puck drop. A presumed playing segment of '+settings.assumedPlayingMinutes+' minutes is used solely to flag turnaround risks. The observed 15-minute offsets in published rink start times are evidence of scheduling patterns, not proof of resurfacing times.</p></details></div>'
}
function staffOptions(pool,choice){return '<option value="">Auto-assign</option>'+pool.map(n=>'<option value="'+esc(n)+'"'+(n===choice?' selected':'')+'>'+esc(n)+'</option>').join("")}
function refereeBoard(a){const n=a.staff.crews.filter(x=>x.ref1&&x.ref2).length;return'<div class="v17-staff-panel"><div class="v17-staff-heading"><div><span class="v17-eyebrow">GAME OFFICIALS / STAFFING</span><h2>Every game needs a crew.</h2><p>Two referees and one timekeeper per game in this <b>fictional staffing pool</b>. The exercise flags double-booking and breaks; real names, qualifications and availability are not connected.</p></div><strong>'+n+' / '+a.games.length+'<small>sample crews assigned</small></strong></div>'+
 '<div class="v17-officials-grid">'+a.staff.crews.map(x=>'<button type="button" data-v17-game="'+x.gameId+'" class="v17-crew-card'+(selectedId===x.gameId?' selected':'')+'"><span>'+e.clock(x.start)+' · RINK '+x.rink+'</span><strong>'+esc(x.home)+' vs '+esc(x.away)+'</strong>'+
 '<small>'+esc(x.ref1||"REF HOLD")+' · '+esc(x.ref2||"REF HOLD")+'</small><small>'+esc(x.timekeeper||"TIMEKEEPER HOLD")+'</small></button>').join("")+'</div>'+
 '<details class="v17-shift-board"><summary>VIEW STAFF SHIFTS BY PERSON <span>Referees, timekeepers &amp; example assignments</span></summary>'+
 '<div class="v17-shift-rows">'+[
 ...e.DEMO_REFS.map(name=>({name,assignments:a.staff.availability[name]||[]})),
 ...e.DEMO_TIMEKEEPERS.map(name=>({name,assignments:a.staff.timekeepers[name]||[]}))
 ].filter(x=>x.assignments.length).map(x=>'<div class="v17-shift-row"><strong>'+esc(x.name)+'</strong><div>'+
 x.assignments.slice().sort((l,r)=>l.start-r.start).map(c=>'<button type="button" data-v17-game="'+c.gameId+'">'+e.clock(c.start)+' · RINK '+esc(c.rink)+' · '+esc(c.home)+' vs '+esc(c.away)+'</button>').join("")+
 '</div></div>').join("")+'</div></details>'+
'<div class="v17-roster-note"><strong>Illustrative staffing roster</strong><span>16 numbered referee placeholders, four timekeeper placeholders, and two resurfacing operators. These are NOT Sports Village staffing data.</span></div>'+
 '<details class="v17-ops-method"><summary>Referee rest / game duration assumptions</summary><p>Each source fixture is modeled as a '+settings.assumedGameBlockMinutes+'-minute game block, with a '+settings.refBreakMinutes+'-minute break between referee assignments. The 16 placeholder referees and four placeholder timekeepers are fictitious; the real league would need authenticated staff rosters, shift restrictions and availability.</p></details></div>'
}
function teamSiteUrl(team){return"./leagueos-hockeyos-team-site-v17.html?team="+encodeURIComponent(String(team||""))}
function teamSyncBoard(a){const entries=[...new Set(a.games.flatMap(g=>[g.home,g.away]))].sort(),team=entries.includes(teamView)?teamView:entries[0]||"";teamView=team;
 const list=e.teamFeed(source||[],feed,team).filter(g=>g.date>=date||g.demoUpdated).slice(0,9);
 const sharing=Object.keys(feed).filter(k=>feed[k]?.status==="DEMO_SHARED_LOCAL_ONLY").length;
 return'<div class="v17-team-site-panel"><div class="v17-staff-heading"><div><span class="v17-eyebrow">LEAGUEOS → HOCKEYOS TEAM SITE</span><h2>Change once. Show both teams.</h2><p>A schedule change can feed each affected team’s HockeyOS calendar. This public demonstration updates a <b>separate same-origin team-site preview</b>, not anyone’s live HockeyOS website.</p></div><strong>'+sharing+'<small>local demo shares</small></strong></div>'+
 '<div class="v17-team-select" role="group" aria-label="Choose a team preview">'+entries.map(t=>'<button type="button" data-v17-team="'+esc(t)+'" class="'+(t===team?'selected':'')+'" aria-pressed="'+(t===team)+'">'+esc(t)+'</button>').join("")+'</div>'+
 '<div class="v17-hockeyos-preview"><div class="v17-hockeyos-banner"><span>H O C K E Y O S</span><b>'+esc(team||"SELECT TEAM")+'</b><small>CONNECTED DEMONSTRATION · LOCAL BROWSER ONLY</small></div>'+
 (list.length?list.map(g=>'<article class="v17-team-game'+(g.demoUpdated?' updated':'')+'"><span>'+esc(g.date)+' · '+esc(g.time)+' · '+esc(g.rink)+' RINK</span><strong>'+esc(g.home)+' <em>VS</em> '+esc(g.away)+'</strong><small>'+(g.demoUpdated?'UPDATED IN DEMO AFTER LEAGUEOS CHANGE':'PUBLIC SOURCE SNAPSHOT')+'</small></article>').join(""):'<p class="v17-no-team">No source-visible future fixtures for this team in the selected data window.</p>')+'</div>'+
 '<a class="v17-open-site" href="'+esc(teamSiteUrl(team))+'" target="_blank" rel="noopener noreferrer">OPEN SEPARATE HOCKEYOS TEAM SITE PREVIEW ↗</a>'+
 '<div class="v17-warning subtle"><strong>Production synchronization is not connected</strong><p>Live use requires a league-authorized schedule database, validated ice and referee assignments, secure per-team subscriptions, revision/notification delivery and an auditable publish/rollback mechanism.</p></div></div>'
}
function reviewPanel(a){const g=selected();if(!g)return'<section class="v17-edit-panel v17-idle"><div class="v17-edit-kicker">GAME EDITOR</div><h3>SELECT A GAME</h3><p>Choose a matchup from one of the four rink lanes. The editor will show game time, rink assignment, referees and the team-site update.</p></section>';
 const base=e.evaluate(source||[],drafts,g.date,settings,overrides),check=e.publishable(g,base),staff=base.staff.crews.find(x=>x.gameId===g.game_id);
 const shared=feed[String(g.game_id)],same=shared?.revision===g.draftRevision&&g.draftChange;
 const errs=base.issues.filter(x=>x.gameIds.includes(g.game_id));
 return'<section class="v17-edit-panel"><div class="v17-edit-kicker">SELECTED MATCHUP / GAME '+g.game_id+'</div>'+
 '<h3>'+esc(g.home)+' <span>VS</span> '+esc(g.away)+'</h3><div class="v17-source-line"><span>SOURCE: '+esc(g.sourceDate)+' · '+esc(g.sourceTime)+' · '+g.sourceRink+' RINK</span>'+badge(g)+'</div>'+
 '<div class="v17-edit-time"><strong>'+esc(g.time)+'</strong><small>PROPOSED START</small><div class="v17-time-buttons"><button type="button" data-v17-nudge="-15">− 15 MIN</button><button type="button" data-v17-nudge="15">+ 15 MIN</button></div></div>'+
 '<div class="v17-rink-picks"><span>MOVE TO ANOTHER RINK</span><div role="group" aria-label="Select proposed rink">'+e.RINKS.map(r=>'<button type="button" data-v17-move-rink="'+r+'" class="'+(g.rink===r?'selected':'')+'" aria-pressed="'+(g.rink===r)+'">RINK '+r+'</button>').join("")+'</div></div>'+
 '<div class="v17-crew-inline"><div><span>REFEREE CREW (DEMO)</span><strong>'+esc(staff?.ref1||"HOLD")+' / '+esc(staff?.ref2||"HOLD")+'</strong></div>'+
 '<div><span>TIMEKEEPER (DEMO)</span><strong>'+esc(staff?.timekeeper||"HOLD")+'</strong></div></div>'+
 '<details class="v17-edit-advanced"><summary>More controls: date, exact time &amp; staff</summary>'+
 '<div class="v17-advanced-body"><label>Proposed date<input type="date" id="v17-edit-date" value="'+esc(g.date)+'"></label>'+
 '<label>Exact start<input type="time" id="v17-edit-time" value="'+esc(g.time)+'"></label>'+
 '<button type="button" class="v17-small-action" id="v17-save-exact">APPLY DATE / TIME</button>'+
 '<p>Demo referee allocations are recalculated for every moved game. Manual changes are checked against the mock staff shift board.</p>'+
 '<div class="v17-staff-edit"><label>Referee 1<select id="v17-ref-1">'+staffOptions(e.DEMO_REFS,(overrides[String(g.game_id)]?.ref1||staff?.ref1))+'</select></label>'+
 '<label>Referee 2<select id="v17-ref-2">'+staffOptions(e.DEMO_REFS,(overrides[String(g.game_id)]?.ref2||staff?.ref2))+'</select></label>'+
 '<label>Timekeeper<select id="v17-timekeeper">'+staffOptions(e.DEMO_TIMEKEEPERS,(overrides[String(g.game_id)]?.timekeeper||staff?.timekeeper))+'</select></label>'+
 '<button type="button" id="v17-assign-crew" class="v17-small-action">APPLY PRACTICE STAFF ASSIGNMENT</button></div>'+
 '<p>These numbered officials are fictional labels. There is no real staff roster, employee scheduling, qualification or payroll data.</p></div></details>'+
 (errs.length?'<div class="v17-warning" role="status"><strong>STAFF / ICE HOLD</strong><p>'+errs.map(x=>esc(x.message)).join(" · ")+'</p></div>':'<div class="v17-ok"><strong>No modeled conflicts for this game</strong><p>This does not establish real contracted ice or staff approval.</p></div>')+
 '<div class="v17-sync-action"><button type="button" id="v17-share"'+(!check.ok||same?' disabled':'')+'>'+(same?'SHARED WITH DEMO TEAM SITES':"SIMULATE UPDATE TO BOTH TEAMS")+'</button>'+
 '<button type="button" id="v17-revert"'+(!g.draftChange?' disabled':'')+'>RESET DEMO MOVE</button></div>'+
 '<p class="v17-sync-status" role="status">'+(same?'Both affected team previews show this local revision. Not a real site update.':g.draftChange?check.ok?'Proposed move ready to share locally. NOT official.':'Resolve the model hold before sending a demo update.':'Published source fixture unchanged. Move the game by 15 minutes or choose another rink to try synchronization.')+'</p>'+
 '<div class="v17-team-links"><a target="_blank" rel="noopener noreferrer" href="'+esc(teamSiteUrl(g.home))+'">VIEW '+esc(g.home)+' HOCKEYOS ↗</a>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+esc(teamSiteUrl(g.away))+'">VIEW '+esc(g.away)+' HOCKEYOS ↗</a></div></section>'
}
function render(){const root=$("#league-ops-v17-mount");if(!root)return;
 if(!validSource(source)){root.innerHTML='<div class="v17-loading"><strong>'+(error?'SOURCE NOT AVAILABLE':'LOADING PUBLIC LEAGUE SCHEDULE')+'</strong><p>'+esc(error||"Reading the November 16, 2026 source-qualified fixture window…")+'</p>'+(error?'<button type="button" id="v17-retry">RETRY READ</button>':'')+'</div>';if(!pending&&!error)load();return}
 pickDefault();const result=assess(),allDates=dates();
 root.innerHTML='<div class="v17-console"><header class="v17-stage-header"><div><span class="v17-eyebrow">ARENA OPS / FRANCHISE MODE</span><h2>RUN THE WHOLE GAME NIGHT.</h2><p>Ice, resurfacing and staff all change when a puck-drop time changes. Source data is real; this staffing exercise is fictional.</p></div><div class="v17-demo-status">DEMO SANDBOX <small>NO FACILITY / HTO SERVER CONNECTION</small></div></header>'+
 '<div class="v17-date-strip" role="group" aria-label="Select published league night">'+allDates.map((v,i)=>{
 const count=e.forDate(source,drafts,v).length,night=new Date(v+"T12:00:00Z").toLocaleDateString("en-CA",{weekday:"short",timeZone:"UTC"});
 return'<button type="button" class="'+(v===date?'selected':'')+'" data-v17-date="'+v+'"><small>'+night.toUpperCase()+'</small><b>'+v.slice(5)+'</b><span>'+count+' games</span></button>'
 }).join("")+'</div>'+
 ribbon(result)+
 '<nav class="v17-ops-tabs" role="tablist" aria-label="Arena operations screens">'+[
 ["rinks","🏒 RINK BOARD"],["ice","🚜 ZAMBONI CREW"],["officials","◷ REFEREES & STAFF"],["team","⇄ TEAM SITE SYNC"]
 ].map(([id,label])=>'<button type="button" role="tab" data-v17-view="'+id+'" aria-selected="'+(view===id)+'" class="'+(view===id?'selected':'')+'">'+label+'</button>').join("")+'</nav>'+
 '<div class="v17-ops-workspace">'+
 '<div class="v17-ops-main">'+(view==="rinks"?rinkBoard(result):view==="ice"?zamboniBoard(result):view==="officials"?refereeBoard(result):teamSyncBoard(result))+'</div>'+
 (view==="rinks"||view==="officials"?reviewPanel(result):'<aside class="v17-ops-aside"><strong>HOW IT CONNECTS</strong><p>All views reference the same game-night scenario. Move a game on the Rink Board, inspect staff capacity, then share the change with the local HockeyOS team-site preview.</p><button data-v17-view="rinks" type="button">RETURN TO RINK BOARD →</button></aside>')+'</div>'+
 (notice?'<div class="v17-notice" role="status">'+esc(notice)+'</div>':'')+
 '<details class="v17-ops-method"><summary>Source and operating assumptions</summary><p>Four physical rink lanes; two shared Zambonis per the demonstration requirement. Public reciprocal game starts show some 15-minute staggering, but do not document exact resurfacing duration or staffing practice. The model assumes a '+settings.assumedPlayingMinutes+'-minute playing segment, '+settings.serviceMinutes+'-minute resurfacing pass, '+settings.readyBufferMinutes+'-minute buffer, '+settings.assumedGameBlockMinutes+'-minute referee game block and '+settings.refBreakMinutes+'-minute referee rest. All operator and referee labels are fictional. This is not a complete facility ice inventory or a staff roster.</p>'+
 '<p>No actual league score, booked rink, referee assignment, public TeamOS site or facility contract is changed. No network write occurs; “Sync” means browser-local preview delivery only. A production event bus requires authenticated roles, approved date/rink inventory, server-side conflict checks, change history and revisioned team notifications.</p></details></div>';
}
async function load(){if(pending)return pending;pending=fetch(e.SOURCE,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(x=>{source=e.sourceRows(x);error="";pending=null;render();return source}).catch(x=>{error=String(x);pending=null;render();return null});return pending}
function nudge(minutes){const g=selected();if(!g)return;const t=e.clockMin(g.time);if(t===null)return;apply({time:e.clock(t+minutes)})}
function apply(change){const g=selected();if(!g)return;const d={date:change.date||g.date,time:change.time||g.time,rink:change.rink||g.rink,revision:(g.draftRevision||0)+1};
 if(!e.normalizeDraft(d)){notice="Invalid proposed date/time/rink. No change saved.";render();return}
 if(d.date===g.sourceDate&&d.time===g.sourceTime&&d.rink===g.sourceRink){delete drafts[String(g.game_id)]}
 else drafts[String(g.game_id)]=d;
 date=d.date;save();notice="Changed the browser-local scenario. Source game remains unchanged.";render()
}
function revert(){const g=selected();if(!g)return;delete drafts[String(g.game_id)];delete feed[String(g.game_id)];e.write(e.FEED_KEY,feed);save();date=g.sourceDate;notice="Cleared this local demo move and its team preview revision.";render();window.dispatchEvent(new Event("leagueos-demo-schedule-updated"))}
function share(){const g=selected();if(!g)return;const a=selectedAssess(),check=e.publishable(g,a);
 if(!check.ok){notice=check.reason;render();return}
 const msg=e.shareEvent(g);feed[String(g.game_id)]=msg;e.write(e.FEED_KEY,feed);
 notice="Shared the proposed date/time/rink with BOTH same-origin HockeyOS demo team sites. No external site changed.";render();window.dispatchEvent(new Event("leagueos-demo-schedule-updated"))}
document.addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b||!$("#league-ops-v17-mount"))return;
 if(b.dataset.v17Date){date=b.dataset.v17Date;selectedId=null;notice="";render();return}
 if(b.dataset.v17View){view=b.dataset.v17View;notice="";render();return}
 if(b.dataset.v17Game){selectedId=Number(b.dataset.v17Game);view=view==="officials"?"officials":"rinks";notice="";render();return}
 if(b.dataset.v17Nudge){nudge(Number(b.dataset.v17Nudge));return}
 if(b.dataset.v17MoveRink){apply({rink:b.dataset.v17MoveRink});return}
 if(b.dataset.v17Service){settings.serviceMinutes=Number(b.dataset.v17Service);save();render();return}
 if(b.dataset.v17Team){teamView=b.dataset.v17Team;render();return}
 if(b.id==="v17-save-exact"){apply({date:$("#v17-edit-date")?.value,time:$("#v17-edit-time")?.value});return}
 if(b.id==="v17-assign-crew"){
 const g=selected();if(!g)return;
 const one=$("#v17-ref-1")?.value||"",two=$("#v17-ref-2")?.value||"",tk=$("#v17-timekeeper")?.value||"";
 if(one&&two&&one===two){notice="Referee 1 and Referee 2 must be different people in this scenario.";render();return}
 overrides[String(g.game_id)]={ref1:one,ref2:two,timekeeper:tk};save();notice="Recorded manual fictional crew preferences. Any staffing clash is shown as a hold.";render();return
 }

 if(b.id==="v17-share"){share();return}if(b.id==="v17-revert"){revert();return}
 if(b.id==="v17-retry"){error="";load();return}
});
window.addEventListener("storage",ev=>{if(ev.key===e.FEED_KEY){feed=e.read(e.FEED_KEY,{});render()}});
window.addEventListener("leagueos-demo-schedule-updated",()=>{feed=e.read(e.FEED_KEY,{});if($("#league-ops-v17-mount"))render()});
window.LeagueOSOpsV17={mount(){render()},status,viewTeam(team){teamView=team;view="team";render()},_test:{getSource:()=>source,assessment:assess,selected,readDrafts:()=>drafts,readFeed:()=>feed,apply,nudge,revert,share,selectGame(id){selectedId=id;render()},selectDate(x){date=x;render()},setView(x){view=x;render()},teamSiteUrl}};
})();
