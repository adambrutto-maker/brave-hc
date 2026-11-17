/* HockeyOS Team Schedule V17 — public-safe standalone subscriber preview.
 * Connects to LeagueOS only through SAME-ORIGIN browser localStorage, not any live site/server.
 */
(function(){"use strict";
const e=window.LeagueOSOpsEngineV17,$=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const requested=(new URLSearchParams(location.search).get("team")||"Braves HC").slice(0,110).trim();
let source=null,error="",team=requested,sourceAt="November 16, 2026";
const root=$("#hockeyos-team-site-v17");
function render(){if(!root)return;
 if(!source){root.innerHTML='<div class="ht17-loading"><strong>'+(error?"SOURCE UNAVAILABLE":"LOADING TEAM GAME DATA")+'</strong><p>'+esc(error||"Reading published SVHL fixtures…")+'</p>'+(error?'<button id="ht17-retry">RETRY</button>':'')+'</div>';return}
 const teams=[...new Set(source.flatMap(x=>[x.home,x.away]))].sort((a,b)=>a.localeCompare(b));
 const canonical=teams.find(n=>n.toLowerCase()===requested.toLowerCase())||null;
 if(!canonical){root.innerHTML='<div class="ht17-loading"><strong>TEAM NOT FOUND IN THIS PUBLIC SNAPSHOT</strong><p>There are no source-qualified upcoming fixtures for '+esc(requested)+'. This does not prove a team is unenrolled or has no games.</p></div>';return}
 team=canonical;
 const feed=e.read(e.FEED_KEY,{}),games=e.teamFeed(source,feed,team),updated=games.filter(g=>g.demoUpdated),next=games[0];
 root.innerHTML='<section class="ht17-hero"><div><span>TEAM FRANCHISE / SOURCE-GROUNDED DEMO</span><h1>'+esc(team)+'</h1><p>LeagueOS schedule updates appear here when the commissioner shares a local demonstration change. Both clubs can see the same proposed fixture.</p></div>'+
 '<div class="ht17-count"><strong>'+games.length+'</strong><span>Source-visible future games</span></div></section>'+
 '<div class="ht17-status"><b>'+updated.length+' DEMO CHANGE'+(updated.length===1?"":"S")+' RECEIVED</b><span>This is NOT your official team calendar. All updates exist only in this browser and origin.</span></div>'+
 (next?'<section class="ht17-next"><div><span>NEXT VISIBLE MATCHUP</span><strong>'+esc(next.date)+' · '+esc(next.time)+'</strong><small>'+esc(next.rink)+' RINK · '+esc(next.home)+' vs '+esc(next.away)+'</small></div><b>'+(next.demoUpdated?"UPDATED DEMO":"SOURCE SNAPSHOT")+'</b></section>':'')+
 '<section class="ht17-games"><div class="ht17-head"><h2>GAME SCHEDULE</h2><span>PUBLIC SOURCE / LOCAL DEMO PROJECTIONS</span></div>'+
 games.map(g=>'<article class="ht17-card'+(g.demoUpdated?' updated':'')+'"><div class="ht17-card-top"><span>'+esc(g.date)+' · '+esc(g.time)+' · '+esc(g.rink)+' RINK</span><b>'+(g.demoUpdated?'LEAGUEOS DEMO REVISION '+g.revision:'PUBLIC SOURCE')+'</b></div><div class="ht17-match">'+esc(g.home)+' <em>VS</em> '+esc(g.away)+'</div>'+
 (g.demoUpdated?'<div class="ht17-changed"><span>Originally published:</span> '+esc(g.sourceDate)+' · '+esc(g.sourceTime)+' · '+esc(g.sourceRink)+' RINK</div>':'')+
 (g.officialUrl&&/^https:\/\/leagues\.sportsvillage\.ca\//.test(g.officialUrl)?'<a href="'+esc(g.officialUrl)+'" target="_blank" rel="noopener noreferrer">VIEW ORIGINAL SOURCE RECORD ↗</a>':'')+'</article>').join("")+'</section>'+
 '<p class="ht17-note">Source window captured '+esc(sourceAt)+'. The live Sports Village schedule, bookings and team notifications are not connected. An earlier result, absent game or source discrepancy must be verified against official channels.</p>';
}
function load(){error="";render();return fetch(e.SOURCE,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{source=e.sourceRows(d);sourceAt=d.captured_date||sourceAt;render()}).catch(err=>{error=String(err);render()})}
window.addEventListener("storage",event=>{if(event.key===e.FEED_KEY)render()});
window.addEventListener("leagueos-demo-schedule-updated",render);
document.addEventListener("click",event=>{if(event.target.id==="ht17-retry")load()});
window.HockeyOSTeamScheduleV17={status(){const feed=e.read(e.FEED_KEY,{});return{loaded:Boolean(source),team,updates:source?e.teamFeed(source,feed,team).filter(x=>x.demoUpdated).length:0,officialWebsiteConnected:false}},_test:{getRows:()=>source,render}};
load();
})();