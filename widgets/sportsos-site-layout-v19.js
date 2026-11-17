/* BruTTech SportsOS V19 — original two-mode site information architecture.
   Inspired by familiar team/league site patterns, NOT HTO source code or page markup.
   All current operational tools remain source-gated and independent. */
(function(){
"use strict";
const TEAM_SOURCE="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=";
const SITE_SOURCE="https://www.sportsvillage.ca/adult-hockey-league-3/";
const PRIMARY={
 team:[
  ["Home","team-home"],["News","team-media"],["Roster","team-roster"],
  ["Schedule","team-schedule"],["Scores","team-results"],["Stats","team-stats"],
  ["Analytics","team-widgets"],["Awards","team-awards"],["Records","team-records"]
 ],
 league:[
  ["League Home","league-home"],["Schedule","league-schedule"],["Results","league-results"],
  ["Standings","league-divisions"],["Teams","league-teams"],["Playoffs","league-playoffs"],
  ["Statistics","league-analysis"],["League Admin","league-admin"]
 ]
};
const SECONDARY={
 team:[
  ["About","team-about"],["Hot Stove","team-media"],["Award Races","team-awards"],
  ["Photos","team-photos"],["History & Alumni","team-history"],["Team Fees","team-fees"],
  ["Attendance","team-attendance"],["Lines & Goalies","team-lineup"],
  ["Team upgrades","team-upgrades"]
 ],
 league:[
  ["Game sheets","league-scoring"],["Fair scheduler","league-planner"],
  ["Ice inventory","league-inventory"],["Schedule audit","league-schedule-equity"],
  ["Division balance","league-alignment"],["Decisions","league-decisions"],
  ["Registration","league-registration"],["Eligibility","league-eligibility-preview"],
  ["Discipline","league-discipline-preview"],["Rules","league-rules"],
  ["Payments","league-payments"],["Rental requests","league-ice"],
  ["Season archive","league-history"],["All features","league-features"]
 ]
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const routeButton=(label,route,cls="")=>'<button type="button" class="'+esc(cls)+'" data-go="'+esc(route)+'">'+esc(label)+'</button>';
const ext=(label,url)=>'<a class="v19-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>';
const routeLink=(label,route)=>'<button type="button" class="v19-link" data-go="'+esc(route)+'">'+esc(label)+' <span aria-hidden="true">›</span></button>';
const shortDate=x=>x?new Date(x+"T12:00:00").toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"}):"Not verified";
const numberOrDash=x=>Number.isInteger(x)&&x>=0?x:"—";
const sourceInfo='<p class="v19-source">Public source snapshots and independently developed previews only. Official game, roster and financial records stay in their authorized systems.</p>';
function masthead(route){
 const team=route.startsWith("team-");
 return team?
 '<div class="v19-header-main"><img src="./brave_hc_logo.png" alt="Brave H.C. crest" class="v19-crest">'+
 '<div class="v19-brand-copy"><span>HOCKEYOS • TEAM WEBSITE</span><h1>BRAVE H.C.</h1>'+
 '<p>Team news, game nights, history and player development</p></div>'+
 '<div class="v19-header-aside"><strong>WINTER 2026/27</strong><small>BruTTech SportsOS · independent demo</small></div></div>':
 '<div class="v19-header-main"><div class="v19-league-crest" aria-hidden="true">BT</div>'+
 '<div class="v19-brand-copy"><span>LEAGUEOS • COMMISSIONER WEBSITE</span><h1>LEAGUE CENTRAL</h1>'+
 '<p>Competition, schedules, teams and league operations</p></div>'+
 '<div class="v19-header-aside"><strong>FOUR LEAGUE NIGHTS</strong><small>Independent SVHL concept · source snapshot Nov 16, 2026</small></div></div>';
}
function mount(route){
 const content=document.querySelector(".shell>.content"),top=content?.querySelector(".topbar");
 if(!content||!top)return;
 let banner=document.getElementById("v19-site-banner"),nav=document.getElementById("v19-site-navigation");
 if(!banner){banner=document.createElement("div");banner.id="v19-site-banner";top.before(banner);}
 if(!nav){nav=document.createElement("nav");nav.id="v19-site-navigation";nav.setAttribute("aria-label","Site navigation");top.before(nav);}
 const team=route.startsWith("team-"),mode=team?"team":"league";
 document.body.classList.add("sportsos-site-v19");
 document.body.classList.toggle("v19-team",team);
 document.body.classList.toggle("v19-league",!team);
 banner.innerHTML=masthead(route);
 const utility=document.getElementById("topname");if(utility)utility.textContent=team?"HockeyOS · Brave H.C. team website":"LeagueOS · commissioner workspace";
 const navs=PRIMARY[mode],more=SECONDARY[mode];
 const activeRoute=route.startsWith("team-game-")?"team-results":route;
 nav.innerHTML='<div class="v19-tabs" aria-label="Primary navigation">'+navs.map(([title,key])=>
  '<button type="button" data-go="'+key+'"'+(activeRoute===key?' aria-current="page"':'')+
  ' class="v19-tab'+(activeRoute===key?' is-active':'')+'">'+esc(title)+'</button>').join("")+'</div>'+
 '<div class="v19-subnav"><span class="v19-nav-hint">'+(team?'THE TEAM':'OPERATIONS')+'</span>'+
 (team?routeButton("Attendance","team-attendance","v19-subaction")+routeButton("Lineups","team-lineup","v19-subaction"):
  routeButton("Game sheets","league-scoring","v19-subaction")+routeButton("Fair scheduler","league-planner","v19-subaction")+
  routeButton("Ice & rinks","league-inventory","v19-subaction"))+
 '<details class="v19-more'+(more.some(x=>x[1]===route)?' has-active':'')+'"><summary>'+
 (team?'More team pages':'More commissioner tools')+' <span aria-hidden="true">▾</span></summary>'+
 '<div class="v19-more-menu">'+more.map(([title,key])=>routeButton(title,key,"v19-more-item"+(route===key?" is-active":""))).join("")+'</div></details>'+
 '<span class="v19-view-label">'+(team?'Team-facing layout':'League administrator layout')+'</span></div>';
}
function heading(kicker,title,desc,actions=""){
 return '<section class="v19-page-heading"><div><span>'+esc(kicker)+'</span><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div>'+actions+'</section>';
}
function tile(label,desc,route,status){
 return '<button type="button" class="v19-action-tile" data-go="'+esc(route)+'"><span>'+
 esc(status||"OPEN MODULE")+'</span><strong>'+esc(label)+'</strong><small>'+esc(desc)+'</small><b aria-hidden="true">↗</b></button>';
}
function wrap(title,desc,content){
 return '<section class="v19-box"><header><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p></header>'+content+'</section>';
}
function teamHome(c){
 const f=c.upcoming||null,s=c.teamStanding||null;
 const next=f?('<strong>'+esc(shortDate(f.date))+'</strong><span>'+esc(f.time||"Time not verified")+
 ' · '+esc(f.rink||"Rink not verified")+'</span><b>vs '+esc(f.opponent||"Opponent not verified")+'</b>'):
 '<strong>Check official schedule</strong><span>Next matchup not confirmed in this source snapshot.</span>';
 const record=s&&Number.isInteger(s.w)?esc(s.w+"–"+s.l+"–"+s.t):"—";
 return heading("HOCKEYOS / BRAVE H.C.","Team home","A familiar hockey website with richer team operations, history, records and analytics.",
  routeButton("Next game","team-schedule","v19-action-btn"))+
 '<div class="v19-home-grid"><aside class="v19-side-stack">'+
 wrap("Team record","Published source snapshot",'<div class="v19-big-numeral">'+record+'</div>'+
 '<p class="v19-mini">Season: Winter 2026/27 · source-qualified where available</p>'+routeLink("Stats & standings","team-stats"))+
 wrap("Last game","Official HTO result snapshot",'<div id="hockeyos-v21-last-game"><p>Checking the last verified game…</p></div>')+
 wrap("Next on the ice","Upcoming game",'<div class="v19-next-game">'+next+'</div>'+routeLink("Full schedule","team-schedule"))+
 wrap("Stat leaders","HTO actuals · source dated",'<div id="hockeyos-v20-leaders"><p>Checking the latest verified player statistics…</p></div>'+routeLink("View team stats","team-stats"))+
 '</aside><div class="v19-main-stack">'+
 '<section class="v19-lead-story"><div class="v19-lead-kicker">BRAVE H.C. • HOT STOVE</div>'+
 '<h2>The club. The games. The history.</h2><p>Game coverage, highlights, news, player recognition and meaningful insights — together in one team website.</p>'+
 '<div class="v19-hero-visual" aria-hidden="true"><img src="./brave_hc_logo.png" alt=""></div>'+
 '<div class="v19-hero-actions">'+routeButton("News & highlights","team-media","v19-action-btn")+
 routeButton("Game centre","team-schedule","v19-action-btn alternate")+'</div></section>'+
 '<section class="v19-feature-news" id="v19-approved-recap"><span>LATEST APPROVED RECAP</span><h3>Browse the Brave H.C. Hot Stove</h3><p>Source-verified team news and highlights.</p>'+ext("Hot Stove","./hot-stove.html")+'</section>'+
 '<div class="v19-tile-grid">'+
 tile("Roster & player profiles","Current official roster, Bio profiles and historical player achievements","team-roster","TEAM")+
 tile("Scores & game reports","Official box scores and HockeyOS practice-review workflow","team-results","GAMES")+
 tile("Analytics & awards","Player trends, award races and source-controlled projections","team-widgets","INTELLIGENCE")+
 tile("History & records","Milestones, record watch, past seasons and club history","team-records","ARCHIVE")+
 '</div>'+
 wrap("Manager's game-night desk","Private team work stays independent of public results",'<div class="v19-inline-actions">'+
 routeButton("Availability","team-attendance","v19-action-btn")+routeButton("Lineups & goalies","team-lineup","v19-action-btn alternate")+
 routeButton("Team administration","team-fees","v19-action-btn alternate")+'</div>')+
 '</div></div>'+
 '<section class="v18-bridge" id="team-leagueos-bridge-mount" aria-live="polite"><p>Checking practice results in this browser…</p></section>'+sourceInfo;
}
function leagueHome(c){
 const counts=c.counts||{};
 return heading("LEAGUEOS / COMMISSIONER CENTRE","League home",
 "A league website built for commissioners: competition records first, administrative controls one click away.",
 routeButton("Open league admin","league-admin","v19-action-btn"))+
 '<div class="v19-league-kpis">'+
 [['League programs','4','Sunday · Tuesday · Wednesday · Thursday'],
 ['Fixture references',numberOrDash(counts.total),'Dated public snapshot'],
 ['Completed records',numberOrDash(counts.completed),'Only verified source rows'],
 ['Held records',numberOrDash(counts.held),'Require review before any use']
 ].map(([name,value,note])=>'<div><span>'+esc(name)+'</span><b>'+esc(value)+'</b><small>'+esc(note)+'</small></div>').join("")+'</div>'+
 '<div class="v19-home-grid v19-league-grid"><aside class="v19-side-stack">'+
 wrap("League office","Primary commissioner tasks",'<div class="v19-quick-list">'+
 routeLink("Game result entry","league-scoring")+routeLink("Schedule fairness audit","league-schedule-equity")+
 routeLink("Team registration","league-registration")+routeLink("Rulebook & reviews","league-rules")+'</div>')+
 wrap("Facility & ice","Authority requires contracted slots",'<p>Published fixtures do not prove free rink inventory. Rental requests remain unsent drafts.</p>'+routeLink("Ice inventory","league-inventory"))+
 wrap("Competition controls","Separate planning and approval",'<p>Division changes, official scoring and disciplinary outcomes require verified league authority.</p>'+routeLink("Commissioner admin","league-admin"))+
 '</aside><div class="v19-main-stack">'+
 '<section class="v19-lead-story v19-league-story"><div class="v19-lead-kicker">LEAGUE MANAGEMENT • WINTER 2026/27</div>'+
 '<h2>One league. Every game. Clear decisions.</h2><p>Run the calendar, monitor results, build equitable schedules and manage playoffs without spreadsheets masquerading as brackets.</p>'+
 '<div class="v19-hero-actions">'+routeButton("Game schedule","league-schedule","v19-action-btn")+
 routeButton("Playoff centre","league-playoffs","v19-action-btn alternate")+'</div></section>'+
 '<div class="v19-tile-grid">'+
 tile("Schedule & results","Calendar, matchup details, scores and league nights","league-schedule","COMPETITION")+
 tile("Balanced scheduler","Rotate early/late starts and audit average ice-time exposure","league-planner","FAIRNESS")+
 tile("Playoff centre","Series, brackets, winner advancement and scheduling","league-playoffs","POSTSEASON")+
 tile("Game sheets & stats","Scorer entry, event reconciliation and source controls","league-scoring","GAME DAY")+
 tile("Teams & divisions","Standings, roster structure and division alignment","league-teams","LEAGUE")+
 tile("Intelligence & audits","Opponent balance, reports and research history","league-analysis","ANALYTICS")+
 '</div>'+
 wrap("More commissioner functions","Original BruTTech modules, not connected to an official league account",
 '<div class="v19-quick-grid">'+
 routeLink("Registration & eligibility","league-registration")+routeLink("Ice allocation","league-inventory")+
 routeLink("Discipline & reviews","league-discipline-preview")+routeLink("Payments & receipts","league-payments")+
 routeLink("All LeagueOS features","league-features")+routeLink("Season history","league-history")+'</div>')+
 '</div></div>'+sourceInfo;
}
function pageWithLinks(kicker,title,description,links,details=""){
 const linksHtml='<div class="v19-link-grid">'+links.map(x=>x[0]==="route"?routeLink(x[1],x[2]):ext(x[1],x[2])).join("")+'</div>';
 return heading(kicker,title,description)+wrap("Explore this section","Only verified public data and approved team assets",linksHtml+details)+sourceInfo;
}
function screen(route,c={}){
 switch(route){
 case "team-home":return teamHome(c);
 case "league-home":return leagueHome(c);
 case "team-about":return pageWithLinks("TEAM / CLUB","About Brave H.C.","Team history, identity and current club information.",[
 ["external","Original Brave H.C. about page",TEAM_SOURCE+"about"],["route","Club history","team-history"],["route","Roster","team-roster"]]);
 case "team-schedule":return pageWithLinks("TEAM / GAME NIGHT","Schedule","Official current fixtures plus your existing HockeyOS game preparation components.",[
 ["external","Official HTO schedule",TEAM_SOURCE+"schedule"],["external","Current HockeyOS Game Centre","./game-centre-next.html"],["route","Attendance & availability","team-attendance"],["route","Lineups & goalies","team-lineup"]
 ],c.upcoming?'<div class="v19-fixture-preview"><span>NEXT SOURCE-LISTED GAME</span><strong>vs '+esc(c.upcoming.opponent||"Opponent pending")+
 '</strong><p>'+esc(shortDate(c.upcoming.date))+' · '+esc(c.upcoming.time||"Time pending")+' · '+esc(c.upcoming.rink||"Rink pending")+'</p></div>':
 '<p>Next fixture not verified in the local snapshot. Use the official HTO schedule.</p>');
 case "team-results":return pageWithLinks("TEAM / GAME REPORTS","Scores & results",
 "Official scores remain on HTO. Unofficial LeagueOS drafts can be reviewed on this device.",[
 ["external","Official HTO box scores",TEAM_SOURCE+"scores"],["route","LeagueOS game sheets","league-scoring"],
 ["route","League standings","league-divisions"],["route","Team media and recaps","team-media"]
 ],'<section class="v18-bridge" id="team-leagueos-bridge-mount" aria-live="polite"><p>Checking saved practice results…</p></section>');
 case "team-stats":return pageWithLinks("TEAM / SEASON DATA","Player & team statistics",
 "Season-aware player production, advanced analysis and verified history; original HTO stats remain authoritative.",[
 ["external","Official current HTO statistics",TEAM_SOURCE+"stats"],["external","HockeyOS analytics","./analytics.html"],
 ["external","Player biographies","./player-bio.html"],["route","Award races","team-awards"]
 ],'<p>Official stats include goals, assists, points, power-play goals (PPG), game-tying goals, penalties and plus/minus. PPG is not points per game.</p>');
 case "team-awards":return pageWithLinks("TEAM / HONOURS","Awards & award races",
 "Separate officially earned awards from provisional race analysis and historical models.",[
 ["external","Official HTO awards",TEAM_SOURCE+"awards"],["external","HockeyOS Awards Centre","./awards-races.html"],
 ["route","History & alumni","team-history"],["route","Player stats","team-stats"]]);
 case "team-records":return pageWithLinks("TEAM / HISTORY","Records & milestones",
 "Verified team record books, player milestones and historical scorecards; no projected totals count as records.",[
 ["external","Official HTO team records",TEAM_SOURCE+"records"],["external","HockeyOS Record Watch","./watch-v2.html"],
 ["external","Club history","./history.html"],["route","Award races","team-awards"]]);
 case "team-photos":return pageWithLinks("TEAM / MEDIA","Photos & highlights",
 "Official photo galleries and rights-cleared video coverage.",[
 ["external","HTO photo gallery",TEAM_SOURCE+"photos"],["external","Brave H.C. Hot Stove","./hot-stove.html"],["route","Team media","team-media"]]);
 case "team-history":return pageWithLinks("TEAM / ARCHIVE","History & alumni",
 "Preserving the club's seasons, leadership, awards, alumni and championships.",[
 ["external","HockeyOS historical archive","./history.html"],["external","HTO club history",TEAM_SOURCE+"about"],
 ["external","Record Watch","./watch-v2.html"],["route","Awards","team-awards"]]);
 case "team-fees":return pageWithLinks("TEAM / ADMINISTRATION","Team administration",
 "Manager workflow concept for season registration, team fees, sponsorship and roster confirmation. No private payment details are published here.",[
 ["external","Current HTO bulletin board",TEAM_SOURCE+"bboard"],["route","Attendance","team-attendance"],["route","Roster","team-roster"]
 ],'<p class="v19-privacy-note">FINANCIAL DATA HELD: The demo does not expose individual player balances, payment identifiers or transaction records. Authenticated manager access will be required.</p>');
 case "league-results":return pageWithLinks("LEAGUE / COMPETITION","Game results",
 "Source-qualified schedule records, league standings and a separate practice scorer.",[
 ["route","League schedule","league-schedule"],["route","Enter practice game sheet","league-scoring"],
 ["route","Standings","league-divisions"],["route","Playoff results","league-playoffs"],
 ["external","Official league website",SITE_SOURCE]
 ],'<p>Official publication and standings recalculation require commissioner approval and source reconciliation. Practice drafts do not change the published season.</p>');
 case "league-admin":return heading("LEAGUE / ADMINISTRATION","Commissioner office",
 "A purpose-built operations page beyond the familiar league website. All write actions remain demonstrations.")+
 '<div class="v19-tile-grid v19-admin-grid">'+
 tile("Game verification","Game sheet review, goal events and score discrepancies","league-scoring","REVIEW")+
 tile("Schedule management","Available ice slots, start-time equity and changes","league-planner","PLANNING")+
 tile("Playoff administration","Qualifiers, series, bracket advancement and game times","league-playoffs","POSTSEASON")+
 tile("Roster registration","Team registration and player eligibility concepts","league-registration","TEAMS")+
 tile("Competitive balance","Division realignment, opponent exposure and audit","league-alignment","DECISIONS")+
 tile("League rulebook","Rules, appeals, discipline and decision evidence","league-rules","GOVERNANCE")+
 tile("Facility allocation","Ice requests, inventory and conflict review","league-inventory","FACILITY")+
 tile("Finance controls","Team deposits and ledger concepts, no payment processor","league-payments","FINANCE")+
 '</div>'+wrap("Release authority","Separation of duties",
 '<p>Data entry, team review, referee confirmation and commissioner approval will be separate authenticated steps in a future production service. This public demo contains none of those authorizations.</p>')+sourceInfo;
 default:return null;
 }
}
async function hydrate(route){
 if(route!=="team-home")return;
 const node=document.getElementById("v19-approved-recap");if(!node)return;
 try{
  const response=await fetch("./hot-stove-approved.json",{cache:"no-store"});
  if(!response.ok)throw Error("Recap source unavailable");
  const j=await response.json(),article=j.latestArticle;
  if(j.schema!=="brave-hc-hot-stove-editorial-preview/v1"||
     j.editorialState!=="FOUNDER_APPROVED"||
     article?.editorialState!=="FOUNDER_APPROVED"||
     article?.publicationApproval?.decision!=="FOUNDER_APPROVED_PUBLISH"||
     article?.nativeHtoPublication?.status!=="PUBLIC_READBACK_VERIFIED"||
     !article.headline||!article.date)throw Error("Recap approval not verified");
  if(!node.isConnected)return;
  const kicker=document.createElement("span"),headline=document.createElement("h3");
  const date=document.createElement("small"),summary=document.createElement("p"),link=document.createElement("a");
  kicker.textContent="LATEST VERIFIED HOT STOVE";
  headline.textContent=article.headline;date.textContent=shortDate(article.date);
  summary.textContent=String(article.dek||"Read the latest approved game report.");
  link.href="./hot-stove.html";link.target="_blank";link.rel="noopener noreferrer";
  link.className="v19-link";link.textContent="Read approved recap ↗";
  node.replaceChildren(kicker,headline,date,summary,link);
 }catch(_){ /* Keep the clearly labelled link to the public Hot Stove. */ }
}
window.SportsOSSiteShellV19={mount,screen,hydrate,primary:PRIMARY,secondary:SECONDARY,isRoute:key=>Object.values(PRIMARY).concat(Object.values(SECONDARY)).some(group=>group.some(row=>row[1]===key)),_test:{esc,numberOrDash}};
})();