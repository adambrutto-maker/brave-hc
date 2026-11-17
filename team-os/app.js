/* TeamOS native clean-room website.
   New HTML/JS built from visible Brave H.C. page design cues only.
   No HTO code, JS/CSS, widgets, embeds, player identities, or private records imported.
 */
(function () {
"use strict";
const root=document.getElementById("page-content");
const pages=["home","schedule","standings","stats","roster","news","player"];
let data=null,loading=false,error="",filter="all";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function trusted(x){try{const u=new URL(String(x));return u.protocol==="https:"&&u.hostname==="leagues.sportsvillage.ca"&&["/gameinfo.aspx","/leagues.aspx"].includes(u.pathname.toLowerCase())?u.href:""}catch{return""}}
function page(){let x=new URLSearchParams(location.search).get("page")||"home";return pages.includes(x)?x:"home"}
function date(x){const d=new Date(String(x)+"T12:00:00Z");return Number.isNaN(d.getTime())?esc(x):new Intl.DateTimeFormat("en-CA",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}).format(d)}
function time(x){if(!/^\d\d:\d\d$/.test(x||""))return esc(x||"TBA");const a=x.split(":").map(Number);return(a[0]%12||12)+":"+String(a[1]).padStart(2,"0")+(a[0]>=12?" PM":" AM")}
function percentage(n,d){return d?(100*n/d).toFixed(1)+"%":"—"}
function signed(x){return x>0?"+"+x:String(x)}
function valid(d){
 if(d?.schema!=="bruttech-teamos-native-public-snapshot/v1"||d.team?.teamId!==13679||d.team?.leagueId!==570||d.standings?.length!==10||!Array.isArray(d.games))throw Error("Public season snapshot schema differs");
 const done=d.games.filter(g=>g.status==="final");if(done.length!==d.team.record.gp)throw Error("Games played do not reconcile");
 let gf=0,ga=0;for(const g of d.games){if(!trusted(g.source)||!["final","scheduled"].includes(g.status))throw Error("Unqualified source fixture");if(g.status!=="final")continue;
 if(!Number.isInteger(g.homeScore)||!Number.isInteger(g.awayScore))throw Error("Incomplete source score");
 gf+=g.braveSide==="home"?g.homeScore:g.awayScore;ga+=g.braveSide==="home"?g.awayScore:g.homeScore}
 if(gf!==d.team.record.gf||ga!==d.team.record.ga)throw Error("Scores and standings do not reconcile");return d
}
async function load(){if(loading)return;loading=true;error="";try{const r=await fetch("./data/season.json",{cache:"no-store"});if(!r.ok)throw Error("Source returned "+r.status);data=valid(await r.json())}catch(x){data=null;error=String(x.message||x)}finally{loading=false;render()}}
function hero(kicker,title,description,note){
 return '<header class="page-hero"><div><span class="page-eyebrow">'+esc(kicker)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>'+
 '<div class="page-side-note"><b>PUBLIC SVHL SNAPSHOT</b><span>'+esc(note||"NOV 16, 2026")+'</span></div></header>'
}
function metric(title,value,sub,css){return '<div class="metric"><small>'+esc(title)+'</small><strong class="'+(css||"")+'">'+esc(value)+'</strong><span>'+esc(sub)+'</span></div>'}
function notice(){return '<aside class="source-note"><strong>Source transparency:</strong> Independent team-level SVHL data captured November 16, 2026. This is not a live league feed. No proprietary HTO code, widgets, private roster, individual player statistics or official league-edit access is connected.</aside>'}
function section(title,sub,where,label){
 return '<div class="section-head"><div><h2>'+esc(title)+'</h2><p>'+esc(sub)+'</p></div>'+
 (where?'<a href="?page='+where+'" data-route="'+where+'" class="text-link">'+esc(label||"VIEW ALL")+' ↗</a>':"")+'</div>'
}
function done(){return data.games.filter(g=>g.status==="final")}
function upcoming(){return data.games.filter(g=>g.status==="scheduled")}
function opponent(g){return g.braveSide==="home"?g.away:g.home}
function ourGoals(g){return g.braveSide==="home"?g.homeScore:g.awayScore}
function otherGoals(g){return g.braveSide==="home"?g.awayScore:g.homeScore}
function verdict(g){if(g.status!=="final")return"LISTED";return ourGoals(g)>otherGoals(g)?"WIN":ourGoals(g)<otherGoals(g)?"LOSS":"TIE"}
function scoreBox(g){
 if(!g)return '<div class="empty-msg">No game was listed in this source snapshot.</div>';
 const final=g.status==="final",href=trusted(g.source);
 return '<div class="scoreboard"><div class="club"><small>HOME</small><strong>'+esc(g.home)+'</strong><span class="score">'+(final?g.homeScore:"–")+'</span></div>'+
 '<div class="middle"><small>'+date(g.date)+'</small><strong>'+(final?"FINAL":"VS")+'</strong><span class="result-status">'+(final?"PUBLISHED SCORE":time(g.start))+'</span>'+
 (href?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">OFFICIAL SOURCE ↗</a>':"")+'</div>'+
 '<div class="club"><small>AWAY</small><strong>'+esc(g.away)+'</strong><span class="score">'+(final?g.awayScore:"–")+'</span></div></div>'
}
function gameRow(g){
 const result=verdict(g),href=trusted(g.source),final=g.status==="final";
 return '<article class="game-row"><div class="game-date"><strong>'+date(g.date)+'</strong><small>'+(final?"FINAL":"LISTED FIXTURE")+'</small></div>'+
 '<div class="game-match"><strong>Braves HC vs '+esc(opponent(g))+'</strong><small>'+(g.braveSide==="home"?"Home":"Away")+' · '+esc(g.rink||"Rink not in snapshot")+'</small>'+
 (href?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Official game record ↗</a>':"")+'</div>'+
 '<div class="game-result"><strong class="'+(result==="WIN"?"win":result==="LOSS"?"loss":"")+'">'+(final?ourGoals(g)+"–"+otherGoals(g):time(g.start))+'</strong><small>'+result+'</small></div></article>'
}
function card(to,kicker,title,desc,call){
 return '<a href="?page='+to+'" data-route="'+to+'" class="panel panel-link"><small>'+esc(kicker)+'</small><strong>'+esc(title)+'</strong><span>'+esc(desc)+'</span><em>'+esc(call)+' ↗</em></a>'
}
function home(){
 const r=data.team.record,last=done().at(-1),next=upcoming()[0];
 return hero("BRAVE H.C. · TEAM CENTRE","The home of Brave H.C.","A single native team website for results, standings, statistics and team updates.","SEASON 2026–27")+
 '<div class="stats-strip">'+metric("Games Played",r.gp,"Published season record")+metric("Wins",r.w,r.l+" losses · "+r.t+" ties")+
 metric("Team Goals",r.gf,"From completed source games")+metric("Goal Difference",signed(r.gf-r.ga),r.ga+" goals against","negative")+'</div>'+notice()+
 '<section class="section">'+section("Latest Published Result","Source-qualified completed game","schedule","ALL RESULTS")+scoreBox(last)+'</section>'+
 '<section class="section">'+section("Next Listed Game","As published in the Nov 16 snapshot","schedule","FULL SCHEDULE")+scoreBox(next)+'</section>'+
 '<section class="section">'+section("Explore Brave H.C.","Direct team website sections")+'<div class="panel-grid">'+
 card("standings","01 · Division","Cristillo Standings","All ten clubs, points and goals.","OPEN STANDINGS")+
 card("stats","02 · Statistics","Team Statistics","Season scoring, recent form and opponents.","OPEN TEAM STATS")+
 card("roster","03 · Players","Roster & Players","Native roster and profile layout, pending permitted data.","VIEW PLAYERS")+
 card("news","04 · Club desk","Team News","Independent factual game-result updates.","READ TEAM NEWS")+
 '</div></section>'
}
function schedule(){
 let games=data.games;
 if(filter==="results")games=done();if(filter==="upcoming")games=upcoming();
 return hero("2026–27 / GAME CENTRE","Schedule & Results","Published Braves HC fixtures and results, with direct links to the official game records.")+
 '<div class="filter-row" role="group" aria-label="Schedule filter">'+[
 ["all","All Games",data.games.length],["results","Final Results",done().length],["upcoming","Upcoming in Snapshot",upcoming().length]
 ].map(([key,label,n])=>'<button type="button" data-filter="'+key+'" aria-pressed="'+(key===filter)+'" class="'+(key===filter?"active":"")+'">'+label+' · '+n+'</button>').join("")+'</div>'+
 '<div class="games-list">'+(games.length?games.map(gameRow).join(""):'<div class="empty-msg">No games in this source filter.</div>')+'</div>'+notice()
}
function standings(){
 const r=data.team.record;
 return hero("SVHL · CRISTILLO DIVISION","Division Standings","A native, accessible team table showing the ten clubs in the published division.")+
 '<div class="stats-strip">'+metric("Division Rank","10th","Source snapshot")+metric("Braves Points",r.pts,"Captured standings")+
 metric("Team Wins",r.w,"Across "+r.gp+" games")+metric("Win Rate",percentage(r.w,r.gp),"Wins per game")+'</div>'+
 '<section class="section">'+section("Complete Division Table","Ten source records, listed positions and goals")+
 '<div class="table-region" tabindex="0" role="region" aria-label="Cristillo Division standings"><table class="data-table"><thead><tr>'+
 ["TEAM","GP","W","L","T","PTS","GF","GA","W%"].map(x=>'<th scope="col">'+x+'</th>').join("")+
 '</tr></thead><tbody>'+data.standings.map(x=>'<tr class="'+(x.team==="Braves HC"?"our-team":"")+'"><td><strong>'+x.position+'. '+esc(x.team)+'</strong></td>'+
 '<td>'+x.gp+'</td><td>'+x.w+'</td><td>'+x.l+'</td><td>'+x.t+'</td><td><strong>'+x.pts+'</strong></td>'+
 '<td>'+x.gf+'</td><td>'+x.ga+'</td><td>'+percentage(x.w,x.gp)+'</td></tr>').join("")+'</tbody></table></div></section>'+notice()
}
function stats(){
 const r=data.team.record,games=done(),recent=games.slice(-5).reverse(),wins=recent.filter(g=>verdict(g)==="WIN").length,max=Math.max(r.gf,r.ga);
 const bar=(label,value,red)=>'<div class="chart-row"><span>'+esc(label)+'</span><div class="bar"><b class="'+(red?"red":"")+'" style="width:'+Math.round(100*value/max)+'%"></b></div><strong>'+value+'</strong></div>';
 return hero("2026–27 / TEAM PERFORMANCE","Team Statistics","Source-backed season totals and recent form; no unverified player data or projections.")+
 '<div class="stats-strip">'+metric("Record",r.w+"–"+r.l+"–"+r.t,"Wins–Losses–Ties")+
 metric("Goals For",r.gf,(r.gf/r.gp).toFixed(2)+" per game")+
 metric("Goals Against",r.ga,(r.ga/r.gp).toFixed(2)+" per game")+
 metric("Goal Difference",signed(r.gf-r.ga),"GF minus GA","negative")+'</div>'+
 '<div class="panel-grid"><section class="panel">'+section("Scoring Balance","Team-level goals from completed games")+
 '<div class="chart-list">'+bar("Goals For",r.gf,false)+bar("Goals Against",r.ga,true)+'</div>'+
 '<p>Totals reconcile to all eight source-qualified final results.</p></section>'+
 '<section class="panel">'+section("Recent Form","Last five completed games")+
 '<div class="chart-list"><div class="chart-row"><span>Wins</span><div class="bar"><b style="width:'+20*wins+'%"></b></div><strong>'+wins+'/5</strong></div>'+
 '<div class="chart-row"><span>Losses</span><div class="bar"><b class="red" style="width:'+20*(5-wins)+'%"></b></div><strong>'+(5-wins)+'/5</strong></div></div>'+
 '<p>This is historical form, not a prediction.</p></section></div>'+
 '<section class="section">'+section("Recent Opponents","Braves goals displayed first")+'<div class="games-list">'+recent.map(gameRow).join("")+'</div></section>'+notice()
}
function emptyPlayers(){
 return '<section class="placeholder-panel"><span class="tag tag-red">PLAYER SOURCE NOT CONNECTED</span>'+
 '<h2>Native roster and player-profile layout</h2><p>The site shell is ready for player names, jersey numbers, positions, profiles and statistics. '+
 'This clean-room preview deliberately excludes proprietary HTO roster code, players and individual statistics. '+
 'A separately approved public or licensed player feed is required before those records are populated.</p>'+
 '<div class="placeholder-grid">'+["PLAYER","GP","G","A","PTS"].map(x=>'<span>'+x+'</span>').join("")+'</div>'+
 '<a class="action-link" href="?page=stats" data-route="stats">VIEW VERIFIED TEAM STATS ↗</a></section>'
}
function roster(){return hero("TEAMOS / PLAYER CENTRE","Roster & Players","Native roster, player statistics and player-profile layouts—without embedded widgets.")+emptyPlayers()+notice()}
function player(){return hero("TEAMOS / PLAYER CENTRE","Player Profile","Reserved for individually verified and permitted player information.")+emptyPlayers()}
function news(){
 const games=done().slice(-5).reverse();
 return hero("BRAVE H.C. / CLUB DESK","Team News","Original short game-result notices generated from public scores, not copied HTO articles.")+
 '<div class="news-feed">'+games.map((g,i)=>{
  const result=verdict(g),our=ourGoals(g),other=otherGoals(g),op=opponent(g);
  const title=result==="WIN"?"Braves HC defeat "+op+" "+our+"–"+other:
    result==="TIE"?"Braves HC and "+op+" tie "+our+"–"+other:
    op+" defeat Braves HC "+other+"–"+our;
  return '<article class="news-story"><small>'+(i===0?"LATEST RESULT":"GAME RESULT")+' · '+date(g.date)+' · TEAM-LEVEL SOURCE</small>'+
  '<h2>'+esc(title)+'</h2><p>Braves HC scored '+our+' and allowed '+other+' goals against '+esc(op)+
  '. This is a result summary; no player scoring or game events have been inferred.</p>'+
  '<a href="'+esc(trusted(g.source))+'" target="_blank" rel="noopener noreferrer">VIEW OFFICIAL GAME SOURCE ↗</a></article>'
 }).join("")+'</div>'+notice()
}
function render(){
 const p=page();
 document.title="Brave H.C. | "+({home:"Team Centre",schedule:"Schedule & Results",standings:"Standings",stats:"Team Statistics",roster:"Roster & Players",news:"Team News",player:"Player Profiles"}[p]||"TeamOS");
 for(const a of document.querySelectorAll("[data-route]")){const active=a.dataset.route===p;a.classList.toggle("active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")}
 if(!data){root.innerHTML='<section class="loading-panel"><span class="eyebrow">PUBLIC SVHL SOURCE</span><h1>'+(error?"Source unavailable":"Loading team information")+'</h1><p>'+esc(error||"Reading independent team-level data…")+'</p>'+(error?'<button type="button" class="action-link" data-retry>Retry public data</button>':"")+'</section>';return}
 root.innerHTML=({home,schedule,standings,stats,roster,news,player}[p])()
}
document.addEventListener("click",e=>{
 if(e.target.closest("[data-retry]")){load();return}
 const button=e.target.closest("button[data-filter]");
 if(button){filter=button.dataset.filter;render();return}
 const a=e.target.closest("a[data-route]");
 if(!a||!pages.includes(a.dataset.route))return;
 e.preventDefault();const u=new URL(a.href);if(u.search!==location.search)history.pushState({page:a.dataset.route},"",u.pathname+u.search);
 render();window.scrollTo({top:0,behavior:"instant"})
});
window.addEventListener("popstate",render);
window.NativeTeamOSPreview={status:()=>({loaded:!!data,page:page(),games:data?.games.length||0,standings:data?.standings.length||0,sourceSnapshot:data?.sourceSnapshot||null,htoCodeImported:false,officialWrites:0}),publicData:()=>data&&structuredClone(data)};
load();
})();
