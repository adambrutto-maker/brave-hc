/* Unified BruTTech LeagueOS/TeamOS preview. Only public JSON fetches; all edits browser-local. */
(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const base="https://adambrutto-maker.github.io/brave-hc/widgets/",official="https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY";
const rulebook="https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf";
const REG_KEY="bruttech-leagueos-registration-preview-261116",POLL_KEY="bruttech-hockeyos-attendance-demo-261116",FEEDBACK_KEY="bruttech-leagueos-screen01-review-v1";
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=s=>{const d=new Date(s);return isNaN(d)?"Source not dated":d.toLocaleString("en-CA",{timeZone:"America/Toronto",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};
const dateFmt=s=>{const d=new Date(String(s)+"T12:00:00");return isNaN(d)?String(s):d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})};
const load=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||"null");return v&&typeof v==="object"?v:f}catch(_){return f}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){toast("Browser storage unavailable. Use export to preserve your draft.");return false}};
const viewList={
 league:[["league-home","Today · ice schedule","⌂"],["league-schedule","Other league nights","▦"],["league-ice","Ice rentals & requests","◫"],["league-divisions","Divisions & standings","▤"],["league-teams","Teams","♙"],["league-scoring","Game sheets","▣"],["league-registration","Registration","✎"],["league-rules","Rulebook & reviews","⚖"],["league-payments","Payments","▥"],["league-analysis","Intelligence","◈"]],
 team:[["team-home","Team home","⌂"],["team-attendance","Attendance","✓"],["team-lineup","Lineups & goalies","▦"],["team-roster","Players & roster","♙"],["team-widgets","Widgets & analytics","▤"],["team-media","News & history","▧"],["team-upgrades","Team upgrades","✧"]]
};
const widgets=[
 ["analytics.html","Analytics","HTO and league statistics","Core"],
 ["game-centre-next.html","Game Centre","Schedule and game preparation","Core"],
 ["standings-v2.html","Standings","Division results","Core"],
 ["awards-races.html","Awards Centre","Verified watch and historical scorecards","Premium candidate"],
 ["projection-v2.html","Projections","Source-gated scenario forecasts","Premium candidate"],
 ["watch-v2.html","Record Watch","Verified history and milestone watch","Premium candidate"],
 ["league-intelligence.html","League Intelligence","Opponent and division review","Premium candidate"],
 ["hot-stove.html","Hot Stove","Team news and stories","Premium candidate"],
 ["player-highlights.html","Player Highlights","Player-specific HTO profile presentation","Premium candidate"]
];
const rules=[
 ["2.1 · Game sheets","Players must sign the official game sheet, and signing records may affect league enforcement. Digital sign-off needs league approval, identity safeguards, and a clear audit trail."],
 ["2.2.1 · Team rosters","The published rulebook permits 20 individuals per team roster. Additions require league authorization; the form should not impose the smaller limit of the old PDF."],
 ["2.2.2 · Call-ups","Replacement players are required to complete a call-up form and check in with league staff before playing."],
 ["2.2.4 · Playoff eligibility","Playoff eligibility is tied to participation in at least 50% of regular-season games and signatures on at least 50% of game sheets, plus roster freeze conditions."],
 ["2.7.2 · Division realignment","The published rulebook specifies a division realignment after week five, with accumulated points carried into the new division."],
 ["2.4 · Appeals","Team representatives are the authorized channel for appeals; published timelines depend on regular-season versus playoff cases."]
];
const state={league:null,standings:null,upcoming:null,route:null,widget:"analytics.html",registration:load(REG_KEY,{team:"",manager:"",division:"Cristillo",players:[{name:"",jersey:""}]}),poll:load(POLL_KEY,{availability:"",nickname:"",notes:"",fixture:""})};
if(!Array.isArray(state.registration.players))state.registration.players=[{name:"",jersey:""}];
state.registration.players=state.registration.players.slice(0,20);
const prior=load(FEEDBACK_KEY,[]);state.notes=Array.isArray(prior)?prior.filter(x=>x&&typeof x.text==="string").slice(-100):[];
let noteSection="",toastTimeout=0;
function toast(t){const n=$("#toast");if(!n)return;n.textContent=t;n.classList.add("on");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>n.classList.remove("on"),3400)}
function panel(title,sub,body,action=""){return '<section class="panel"><div class="panelhead"><div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+action+'</div>'+body+'</section>'}
function btn(label,route,primary=false){return '<button type="button" class="btn '+(primary?"primary":"")+'" data-go="'+esc(route)+'">'+label+'</button>'}
function link(label,file,cls="btn"){return '<a class="'+cls+'" href="'+esc(base+file)+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>'}
function intro(k,h,p,actions=""){return '<div class="intro"><div><div class="eyebrow">'+k+'</div><h1>'+h+'</h1><p>'+p+'</p></div>'+actions+'</div>'}
function metric(n,v,foot){return '<div class="metric"><small>'+n+'</small><strong>'+esc(v)+'</strong><em>'+foot+'</em></div>'}
function nav(){const c=state.route&&state.route.startsWith("team-")?"team":"league";const label=c==="team"?"Brave H.C. TeamOS":"LeagueOS";$("#topname").innerHTML=esc(label)+'<small>BruTTech SportsOS · Independent SVHL demonstration</small>';$("#sw-league").classList.toggle("selected",c==="league");$("#sw-team").classList.toggle("selected",c==="team");const top=c==="league"?"League workspace":"Brave H.C. team workspace";$("#sidebar-nav").innerHTML='<div class="navheading">'+top+'</div>'+viewList[c].map(v=>'<button class="navlink '+(state.route===v[0]?"active":"")+'" data-go="'+v[0]+'"><span class="navicon">'+v[2]+'</span>'+v[1]+'</button>').join('')+'<div class="navheading">Switch workspace</div><button class="navlink" data-go="'+(c==="team"?"league-home":"team-home")+'"><span class="navicon">⇄</span>'+(c==="team"?"LeagueOS":"Brave H.C. TeamOS")+'</button>';$("#railfooter").textContent=c==="team"?"Brave H.C. is the reference team. HTO remains its current team publishing source.":"League-wide operational features shown as an independent proposal, not SVHL production."}
function navigate(k){if(![...viewList.league,...viewList.team].some(x=>x[0]===k)&&k!=="team-respond")k="league-home";state.route=k;history.replaceState(null,"","#"+k);nav();render();window.scrollTo({top:0,behavior:"instant"})}
function currentGame(){return state.upcoming?.games?.[0]||null}
function fixtureCard(){const f=currentGame();if(!f)return '<div class="callout">No verified upcoming Brave H.C. fixture is available in this snapshot. '+link("Check official schedule","league-intelligence.html","")+'</div>';const d=new Date(f.date+"T12:00:00");return '<div class="fixture"><div class="datechip"><b>'+d.getDate()+'</b><small>'+d.toLocaleString("en-CA",{month:"short"})+'</small></div><div><strong>Braves HC vs '+esc(f.opponent)+'</strong><span class="dim">'+esc(f.time)+' · '+esc(f.rink)+' · '+dateFmt(f.date)+'</span></div></div>'}
function standingsTable(all=true){if(!state.standings?.teams?.length)return '<div class="loader">Published standings are not available in this preview.</div>';const teams=all?state.standings.teams:state.standings.teams.slice(0,6);return '<div class="tablewrap"><table><thead><tr><th>Team</th><th class="num">GP</th><th class="num">W</th><th class="num">L</th><th class="num">T</th><th class="num">PTS</th></tr></thead><tbody>'+teams.map(t=>'<tr class="'+(t.name==="Braves HC"?"highlight":"")+'"><td>'+esc(t.name)+'</td><td class="num">'+t.gp+'</td><td class="num">'+t.w+'</td><td class="num">'+t.l+'</td><td class="num">'+t.t+'</td><td class="num">'+t.pts+'</td></tr>').join('')+'</tbody></table></div>'}

/* Date-first league operations. Arena allocation is never inferred from missing game data. */
function torontoToday(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return p.year+"-"+p.month+"-"+p.day;
}
function addDay(iso,n){const t=new Date(iso+"T12:00:00Z");t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)}
function weekMonday(iso){const d=new Date(iso+"T12:00:00Z").getUTCDay();return addDay(iso,-((d+6)%7))}
function weekday(iso){return new Date(iso+"T12:00:00Z").getUTCDay()}
function readableDay(iso){const d=new Date(iso+"T12:00:00Z");return d.toLocaleDateString("en-CA",{timeZone:"UTC",weekday:"long",month:"long",day:"numeric",year:"numeric"})}
function dayShort(iso){const d=new Date(iso+"T12:00:00Z");return d.toLocaleDateString("en-CA",{timeZone:"UTC",weekday:"short",month:"short",day:"numeric"})}
const leagueNights={0:"Sunday",2:"Tuesday",3:"Wednesday",4:"Thursday"};
const opsNights=[["all","All programs"],["0","SVHL Sunday"],["2","SVHL Tuesday"],["3","SVHL Wednesday"],["4","SVHL Thursday"],["rental","Rentals / other uses"]];
const opsRinks=["A","B","C","D"];
const OPS_ICE_KEY="bruttech-leagueos-ice-inquiries-demo-v1";
const OPS_CHANGE_KEY="bruttech-leagueos-game-change-requests-demo-v1";
state.ops={date:torontoToday(),program:"all",rink:"all",view:"day"};
state.iceDrafts=load(OPS_ICE_KEY,[]);
if(!Array.isArray(state.iceDrafts))state.iceDrafts=[];
state.changeDrafts=load(OPS_CHANGE_KEY,[]);
if(!Array.isArray(state.changeDrafts))state.changeDrafts=[];
function sourceFixtures(iso=state.ops.date){
 const a=state.upcoming?.games||[];
 return a.filter(f=>f&&f.date===iso&&(!state.ops.rink||state.ops.rink==="all"||String(f.rink||"").toUpperCase().startsWith(state.ops.rink))&&(state.ops.program==="all"||state.ops.program==="0"));
}
function dayProgram(iso){
 const n=leagueNights[weekday(iso)];
 return n?"SVHL "+n:"No advertised SVHL adult league night";
}
function opsToolbar(){
 const o=state.ops,mon=weekMonday(o.date),today=torontoToday();
 const opts=opsNights.map(([v,l])=>'<option value="'+v+'" '+(v===o.program?"selected":"")+'>'+l+'</option>').join("");
 return '<section class="ops-toolbar" aria-label="Day, night and rink filters"><div class="ops-filters">'+
 '<div class="ops-nav"><button data-ops-day="-7" title="Previous week" aria-label="Previous week">‹ Week</button><button data-ops-today="1">Today</button><button data-ops-day="7" title="Next week" aria-label="Next week">Week ›</button></div>'+
 '<label class="ops-control">Select date<input id="ops-date" aria-label="Selected schedule date" type="date" value="'+esc(o.date)+'"></label>'+
 '<label class="ops-control">League night<select id="ops-program">'+opts+'</select></label>'+
 '<label class="ops-control">Rink<select id="ops-rink"><option value="all">All rinks</option>'+opsRinks.map(v=>'<option value="'+v+'" '+(o.rink===v?"selected":"")+'>'+v+' Rink</option>').join("")+'</select></label>'+
 '<div class="ops-spacer"></div><div class="ops-nav"><button data-ops-view="day" aria-pressed="'+(o.view==="day")+'">Day</button><button data-ops-view="week" aria-pressed="'+(o.view==="week")+'">Week</button></div></div>'+
 '<div class="ops-week" aria-label="Select a weekday">'+Array.from({length:7},(_,i)=>{const iso=addDay(mon,i);return '<button class="ops-day '+(iso===o.date?"active ":"")+(iso===today?"today":"")+'" data-ops-date="'+iso+'" type="button" title="'+readableDay(iso)+'"><small>'+["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]+'</small><strong>'+iso.slice(-2)+'</strong><span>'+(leagueNights[weekday(iso)]?"SVHL":"—")+'</span></button>'}).join("")+'</div></section>'
}
function opsSummary(){
 const o=state.ops,fixtures=sourceFixtures(),program=dayProgram(o.date);
 return '<div class="ops-summary"><span>Selected day: <strong>'+esc(dayShort(o.date))+'</strong></span>'+
 '<span>League night: <strong>'+esc(program)+'</strong></span>'+
 '<span>Connected game starts: <strong>'+fixtures.length+'</strong></span>'+
 '<span>Venue: <strong>4 ice pads</strong> · live occupancy not connected</span></div>'
}
function opsConfirmedGames(){
 const o=state.ops,fixtures=sourceFixtures();
 const body=fixtures.length?fixtures.map(f=>'<div class="cardrow"><div><strong>'+esc(f.time)+' · '+esc(f.rink)+'</strong><small>Braves HC vs '+esc(f.opponent)+' · Official SVHL public fixture</small></div><span class="pill green">Verified source</span></div>').join(''):
 '<div class="callout">No game records are verified in the connected feed for these filters. <b>This does not mean there are no games or that ice is free.</b> Schedules for other league nights are not yet integrated.</div>';
 return panel("Games on "+esc(dayShort(o.date)),"Verified fixtures only · change day, league night or rink above",body+'<div class="topline"><a class="btn" href="'+esc(official)+'" target="_blank" rel="noopener noreferrer">Full official SVHL schedule ↗</a>'+btn("Open game sheets","league-scoring")+'</div>');
}
function opsIceBoard(){
 const o=state.ops,rinks=opsRinks.filter(r=>o.rink==="all"||o.rink===r);
 const view=rinks.map(r=>{
 const games=sourceFixtures().filter(f=>String(f.rink||"").toUpperCase().startsWith(r));
 const draft=state.iceDrafts.filter(x=>x.date===o.date&&x.rink===r);
 let t=games.map(f=>'<div class="ops-event"><span class="ops-dot"></span>'+esc(f.time)+' · Braves HC vs '+esc(f.opponent)+' <span class="pill green">Published fixture</span></div>').join('');
 t+=draft.map(q=>'<div class="ops-event" style="margin-top:5px"><span class="ops-dot" style="background:#c7a363"></span>'+esc(q.start)+'–'+esc(q.end)+' · '+esc(q.use)+' <span class="pill amber">Your local inquiry only</span></div>').join('');
 if(!t)t='<div class="ops-unknown"><i></i><span>Occupancy unknown · facility booking feed not connected</span></div>';
 return '<div class="ops-lane"><div class="ops-rink">Rink '+r+'</div><div>'+t+'</div></div>';
 }).join('');
 return panel("Ice use by rink","Four surfaces · published games and your unsent inquiries, not full availability",'<div class="ops-board">'+view+'</div><div class="ops-booking-note">Blank space is <b>unknown</b>, not available ice. Rentals, tournaments, city-owned blocks and maintenance require facility-authorized data.</div><div class="topline">'+btn("Ice rental requests","league-ice",true)+'<a class="btn" href="https://www.sportsvillage.ca/ice-rental/" target="_blank" rel="noopener noreferrer">Sports Village available-ice listings ↗</a></div>');
}
function opsWeekBoard(){
 const m=weekMonday(state.ops.date);
 return panel("This week's league nights","Known adult league nights are published; complete per-night game lists are not yet connected.",
 '<div>'+Array.from({length:7},(_,i)=>{
 const iso=addDay(m,i),night=dayProgram(iso),n=(state.upcoming?.games||[]).filter(f=>f.date===iso&&(state.ops.rink==="all"||String(f.rink||"").startsWith(state.ops.rink))).length;
 return '<div class="ops-week-row"><div><b>'+dayShort(iso)+'</b><small>'+esc(iso)+'</small></div><div><strong class="ops-program">'+esc(night)+'</strong><small>'+n+' connected verified game'+(n!==1?"s":"")+" · other allocations not connected</small></div><button class="btn small" data-ops-date="'+iso+'">Open day</button></div>';
 }).join("")+'</div><div class="topline">'+btn("Review rental requests","league-ice")+btn("Division standings","league-divisions")+'</div>');
}
function leagueNightSnapshot(){
 const d=state.league,s=state.standings;
 return panel("League context","Sunday league example · current verified snapshot",'<div class="ops-summary" style="margin-bottom:13px"><span><strong>'+(d?.currentLeagueTeamCount??"—")+'</strong> teams</span><span><strong>'+(d?.currentDivisionCount??"—")+'</strong> divisions</span></div>'+
 (state.ops.date&&weekday(state.ops.date)!==0?'<p class="source">The standings below are for the connected Sunday SVHL league, not the selected night.</p>':'')+
 standingsTable(false)+'<div class="topline">'+btn("All divisions and standings","league-divisions")+'</div>');
}
function rentalDraftList(){
 if(!state.iceDrafts.length)return '<p class="dim small">No ice-use inquiries saved in this browser.</p>';
 return state.iceDrafts.slice(-8).reverse().map((q,i)=>'<div class="ops-request"><b>'+esc(q.date)+' · Rink '+esc(q.rink)+' · '+esc(q.start)+'–'+esc(q.end)+'</b><small>'+esc(q.use)+' · Not booked · Saved on this device'+(q.warning?' · Possible collision with published game start':'')+'</small></div>').join('');
}
function leagueIce(){
 return intro("LEAGUEOS · ICE INVENTORY","Ice rentals & rink commitments","Manage contracted game blocks, rental requests, maintenance and other programs without losing sight of the league night.",
 '<span class="pill amber">Booking preview · no facility access</span>')+
 '<div class="callout warn"><b>No authoritative rink inventory is connected.</b> Sports Village publishes ice-rental opportunities, but an inquiry is not an available slot or confirmed reservation. The facility controls availability, contracts and payment.</div>'+
 opsToolbar()+opsSummary()+
 '<div class="grid"><div class="stack">'+opsIceBoard()+
 panel("Create an ice-use inquiry","Practice, private rental, tournament, league reschedule or another use",'<div class="formgrid"><label class="field">Date<input type="date" id="ice-date" value="'+esc(state.ops.date)+'"></label>'+
 '<label class="field">Requested rink<select id="ice-rink">'+opsRinks.map(v=>'<option>'+v+'</option>').join("")+'</select></label>'+
 '<label class="field">Start time<input type="time" id="ice-start" value="20:00"></label><label class="field">End time<input type="time" id="ice-end" value="21:00"></label>'+
 '<label class="field span">Purpose<select id="ice-use"><option>League game / reschedule</option><option>Team practice</option><option>Private ice rental</option><option>Tournament</option><option>Training / clinic</option><option>Maintenance hold</option><option>Other use</option></select></label></div>'+
 '<div class="formfooter"><button class="btn primary" id="ice-save" type="button">Save inquiry draft</button><span class="small dim">Not sent · not reserved</span></div><div id="ice-warning" class="source" aria-live="polite"></div>')+
 '</div><div class="stack">'+panel("Official availability channels","Facility-controlled rental opportunities",
 '<div class="linklist"><a href="https://www.sportsvillage.ca/ice-rental/" target="_blank" rel="noopener noreferrer">Published ice-rental calendar <span>↗</span></a><a href="https://www.sportsvillage.ca/ice-rental-form/" target="_blank" rel="noopener noreferrer">Sports Village rental request form <span>↗</span></a></div><p class="source">Official rental confirmation requires facility review, payment and contract. This demo does not place bookings.</p>')+
 panel("Your unsent inquiries","Browser-local design drafts",rentalDraftList())+
 panel("Staff authorization model","Separate the authority to schedule league games from facility ice allocation.",
 '<div class="ruletile"><strong>League scheduler</strong><p>May plan games within approved, contracted league ice blocks.</p></div><div class="ruletile"><strong>Facility bookings team</strong><p>Controls actual availability and confirms external rentals or holds.</p></div><div class="ruletile"><strong>Team manager</strong><p>Sees published fixtures and may submit a change request.</p></div>')+'</div></div>'+footnote();
}
function leagueScheduleDay(){
 return opsConfirmedGames()+opsIceBoard();
}
function leagueScheduleWeek(){
 return opsWeekBoard()+opsIceBoard();
}
function homeLeague(){
 const selected=state.ops.date;
 return intro("LEAGUEOS · DAILY OPERATIONS","Today at Sports Village","The selected day's league program, game schedule and rink commitments. Choose any other night from the date strip.",btn("Open Brave H.C. TeamOS","team-home",true))+
 opsToolbar()+opsSummary()+
 '<div class="grid"><div class="stack">'+(state.ops.view==="week"?opsWeekBoard():opsConfirmedGames())+
 opsIceBoard()+'</div><div class="stack">'+
 panel("Today's operating desk","Find the next action without leaving the daily schedule.",'<div class="linklist">'+
 '<button data-go="league-schedule">Schedule another league night <span>›</span></button>'+
 '<button data-go="league-scoring">Open digital game sheets <span>›</span></button>'+
 '<button data-go="league-ice">Request ice for another use <span>›</span></button>'+
 '<button data-go="league-registration">Registration and team roster <span>›</span></button></div>')+
 leagueNightSnapshot()+'</div></div>'+footnote();
}
function leagueSchedule(){
 return intro("LEAGUEOS · SCHEDULING","League nights & game schedules","Review Sunday, Tuesday, Wednesday and Thursday programs. Move between dates without losing the rink and program filters.",
 btn("Open ice-use requests","league-ice",true))+
 opsToolbar()+opsSummary()+
 '<div class="grid"><div class="stack">'+(state.ops.view==="week"?opsWeekBoard():opsConfirmedGames())+opsIceBoard()+'</div><div class="stack">'+
 panel("League nights","Published winter 2026/27 schedule of league programs",
 '<div class="ruletile"><strong>Sunday</strong><p>SVHL adult hockey · verified Brave H.C. public fixture feed connected</p></div>'+
 '<div class="ruletile"><strong>Tuesday</strong><p>SVHL adult hockey · detailed games not yet integrated</p></div>'+
 '<div class="ruletile"><strong>Wednesday</strong><p>SVHL adult hockey · detailed games not yet integrated</p></div>'+
 '<div class="ruletile"><strong>Thursday</strong><p>SVHL adult hockey · detailed games not yet integrated</p></div>'+
 '<div class="source">Program nights are grounded in the published Sports Village Winter 2026/27 information. The rest of the schedule is not inferred.</div>')+
 panel("Schedule change request · demo","Operators can draft an edit for review; nothing changes the official calendar.",
 '<div class="formgrid"><label class="field">Proposed date<input type="date" id="change-date" value="'+esc(state.ops.date)+'"></label>'+
 '<label class="field">Proposed rink<select id="change-rink">'+opsRinks.map(v=>'<option value="'+v+'">Rink '+v+'</option>').join("")+'</select></label>'+
 '<label class="field span">Reason for change<textarea id="change-reason" maxlength="360" placeholder="e.g. move the fixture from Sunday to Tuesday, pending facility approval"></textarea></label></div>'+
 '<div class="formfooter"><button id="change-save" class="btn primary" type="button">Save change request</button><span class="small dim">Internal draft only</span></div><div id="change-count" class="source">'+state.changeDrafts.length+' unsent local change request(s)</div>')+
 '</div></div>'+footnote();
}
function leagueDivisions(){const d=state.league;const ds=d?.divisions?.filter(x=>x.competitive)||[];return intro("LEAGUEOS · COMPETITION","Divisions & standings","Official standings first; strength analysis informs decisions without automatically moving teams.",btn("Open Division Fit Lab","league-analysis",true))+
panel("Current divisions","Published SVHL league model",'<div class="twocol">'+(ds.length?ds.map(x=>'<div class="toolcard"><h3>'+esc(x.name)+'</h3><p>'+esc(x.teamCount)+' published teams</p><p class="small">'+esc(x.teams.slice(0,6).join(" · "))+(x.teams.length>6?" …":"")+'</p></div>').join(''):'<div class="loader">Current divisions could not be loaded.</div>')+'</div>')+
panel("Cristillo standings","Verified league snapshot · Brave H.C. highlighted",standingsTable(true))+
panel("Division placement review","Evidence-assisted, commissioner-approved decisions",'<div class="callout">Existing League Intelligence compares teams, cross-division results and performance patterns. A new placement proposal should always show its evidence and require human approval.</div>'+link("Open League Intelligence","league-intelligence.html")+ " &nbsp; "+link("Division Fit Lab","division-fit-lab.html"))+footnote()}
function leagueTeams(){const d=state.league,rows=(d?.divisions||[]).filter(x=>x.competitive);return intro("LEAGUEOS · TEAMS","Team directory","Open a team’s shared public record. Brave H.C. is the fully populated TeamOS reference implementation.")+
panel("League teams","Displayed by current division",rows.length?rows.map(x=>'<h3 style="margin:17px 0 10px">'+esc(x.name)+'</h3><div class="twocol">'+x.teams.map(n=>'<div class="cardrow"><div><strong>'+esc(n)+'</strong><small>'+esc(x.name)+'</small></div>'+(n==="Braves HC"?btn("Open TeamOS","team-home",true):'<span class="pill">Public team only</span>')+'</div>').join('')+'</div>').join(''):'<div class="loader">Team directory unavailable.</div>')+footnote()}
function leagueScoring(){return intro("LEAGUEOS · GAME OPERATIONS","Digital game sheets","Built for tablets and phones in the scorer’s box, with controlled final review.",link("Open interactive score sheet","svhl-leagueos-score-sheet-demo.html","btn primary"))+
panel("The scorer’s box workflow","Fast recording without hunting through forms",'<div class="twocol"><div class="toolcard"><h3>1. Select an assigned game</h3><p>Verify rink, teams, game time, scorer and authorized rosters.</p></div><div class="toolcard"><h3>2. Tap the event</h3><p>Goal, assists, penalty, shot, period/time or an observation.</p></div><div class="toolcard"><h3>3. Verify the game sheet</h3><p>Review errors, correction history, roster signatures and officials.</p></div><div class="toolcard"><h3>4. Publish once authorized</h3><p>Approved results feed standings, individual statistics and both team websites.</p></div></div>')+
panel("Current prototype boundary","An actual league system requires verified authorization",'<div class="callout warn">The linked mobile score sheet is an interactive local draft only. Its score and events do not update HTO or SVHL, and it is not a valid official player signature.</div><p>Current SVHL Rule 2.1 requires signed official game sheets. Any digital replacement must satisfy the league’s sign-off process and maintain a tamper-evident audit record.</p>')+footnote()}
function regRows(){const a=state.registration.players||[];return '<div class="roster-header"><span>#</span><span>Player name (demo)</span><span>Jersey #</span><span></span></div><div id="roster-rows">'+a.map((p,i)=>'<div class="roster-row"><span class="rowno">'+(i+1)+'</span><input maxlength="80" data-roster-index="'+i+'" data-roster-field="name" aria-label="Player '+(i+1)+' name" placeholder="Player name" value="'+esc(p.name)+'"><input maxlength="3" data-roster-index="'+i+'" data-roster-field="jersey" aria-label="Player '+(i+1)+' jersey" placeholder="#" value="'+esc(p.jersey)+'"><button type="button" aria-label="Remove player '+(i+1)+'" data-remove-roster="'+i+'">×</button></div>').join('')+'</div>'}
function registration(){const r=state.registration;return intro("LEAGUEOS · REGISTRATION","Team registration","Replace the editable PDF with an accessible online form that can grow to the rulebook’s 20-player roster.",'<span class="pill amber">Local-only demonstration</span>')+
'<div class="callout warn"><b>Preview form.</b> This does not submit a registration to SVHL or collect payment. Do not enter real player contact details here.</div>'+
panel("Team information","Easy to complete on mobile or desktop",'<div class="formgrid"><label class="field">Team name<input id="reg-team" maxlength="90" placeholder="Fictional team name" value="'+esc(r.team)+'"></label><label class="field">Manager name / alias<input id="reg-manager" maxlength="90" placeholder="For testing, use a fictional name" value="'+esc(r.manager)+'"></label><label class="field">Requested division<select id="reg-division">'+["Cristillo","Fazzari Partners","Remax","VAHL","Other / request review"].map(v=>'<option '+(r.division===v?"selected":"")+'>'+esc(v)+'</option>').join('')+'</select></label><div class="field"><span>Registration status</span><div class="callout" style="margin:0">Draft — not submitted</div></div></div>')+
panel("Team roster","Rule 2.2.1 · Up to 20 individuals",'<p class="small">The existing PDF’s shorter row layout is not an appropriate product limit. This design allows the full published roster count without editing a document.</p>'+regRows()+'<div class="formfooter"><button class="btn" id="add-player">+ Add player</button><span id="roster-count" class="dim small">'+r.players.length+' of 20 rows</span><button class="btn primary" id="export-reg">Export draft</button><button class="btn warn" id="clear-reg">Clear draft</button></div><p class="source">The production form must add authorized player registration, league-required details, electronic consent and signatures, validation, privacy safeguards, approval and payment processing. They are intentionally absent from this public preview.</p>')+footnote()}
function leagueRules(){return intro("LEAGUEOS · GOVERNANCE","Rulebook & improvements","Find the published rule, record an unclear situation and propose changes for league-official review.",'<a href="'+esc(rulebook)+'" target="_blank" rel="noopener noreferrer" class="btn primary">Open current SVHL rulebook ↗</a>')+
panel("Find a rule","Selected sections, summarized for discovery; the official PDF remains authoritative.",'<label class="field">Search rule summaries<input id="rules-filter" type="search" placeholder="Try roster, signatures, playoffs, call-ups…"></label><div id="rules-list" style="margin-top:12px">'+ruleRows("")+'</div>')+
panel("Rule improvement request","For recurring incidents, unclear cases or policy gaps",'<div class="callout">Suggestions are advisory drafts. The system must never impose a suspension, rewrite an official rule or publish a new interpretation without league approval.</div><div class="formgrid"><label class="field">Related rule / issue<input id="rule-ref" maxlength="110" placeholder="e.g. 2.2.1 or uncovered situation"></label><label class="field">Reason for review<input id="rule-reason" maxlength="130" placeholder="e.g. repeated scorer’s-box confusion"></label><label class="field span">Proposed clarification<textarea id="rule-proposal" maxlength="1300" placeholder="What should change, and why?"></textarea></label></div><div class="formfooter"><button class="btn primary" id="copy-rule-proposal">Copy review proposal</button><span class="small dim">Copies a draft only. No league submission.</span></div>')+
panel("Periodic governance review","A future governed workflow",'<div class="cardrow"><div><strong>Issue & incident trends</strong><small>Flag rules that generate repeated appeals, uncertainty or inconsistent scoring.</small></div><span class="pill amber">Planned</span></div><div class="cardrow"><div><strong>Versioned rule proposals</strong><small>Evidence, proposed text, impact assessment, reviewer, approval and effective date.</small></div><span class="pill amber">Planned</span></div>')+footnote()}
function ruleRows(q){const f=rules.filter(x=>(x[0]+" "+x[1]).toLowerCase().includes(String(q).toLowerCase()));return f.length?f.map(x=>'<div class="ruletile"><strong>'+esc(x[0])+'</strong><p>'+esc(x[1])+'</p></div>').join(''):'<p>No matching summary. Open the official rulebook for full coverage.</p>'}
function leaguePayments(){return intro("LEAGUEOS · FINANCE","Payments & registration","A secure payment workflow should support the league's existing deposit, instalment, balance and receipt process.")+
panel("Payment administration · proposed","Current SVHL arrangements remain external",'<div class="twocol"><div class="toolcard"><h3>Registration and deposits</h3><p>Connect approved registration records to third-party secure payment processing.</p><span class="pill amber">Not connected</span></div><div class="toolcard"><h3>Instalment schedules</h3><p>Due dates, actual received payments, reconciled balances and alerts.</p><span class="pill amber">Not connected</span></div><div class="toolcard"><h3>Receipts & adjustments</h3><p>Payment confirmations, refunds, authorized adjustments and audit history.</p><span class="pill amber">Not connected</span></div><div class="toolcard"><h3>Commissioner reporting</h3><p>Team balances and exceptions visible only to authorized finance roles.</p><span class="pill amber">Not connected</span></div></div><p class="source">No credit card information is requested or handled by this static prototype.</p>')+footnote()}
function leagueAnalysis(){return intro("LEAGUEOS · INTELLIGENCE","League intelligence","The existing HockeyOS research already analyzes divisions, opponents, historical results and source confidence.")+
panel("Existing working modules","Open the current published HockeyOS intelligence tools",'<div class="linklist">'+[["league-intelligence.html","League Intelligence","Cross-division and opponent research"],["division-fit-lab.html","Division Fit Lab","Competitiveness and realignment scenarios"],["player-game-audit.html","Player game audit","Source-qualified event and statistical evidence"]].map(x=>'<a href="'+esc(base+x[0])+'" target="_blank" rel="noopener noreferrer"><span>'+x[1]+'<small style="display:block;color:#778ca0;font-weight:500;margin-top:4px">'+x[2]+'</small></span><span>↗</span></a>').join('')+'</div>')+
panel("Data governance","No invented agreement between systems",'<div class="callout">LeagueOS treats official SVHL standings as the league source and HTO as the team-maintained source. Name aliases, identity matches and historical continuity are governed, not guessed.</div>')+footnote()}
function teamHome(){const s=state.standings?.teams?.find(x=>x.name==="Braves HC");return intro("HOCKEYOS TEAMOS · BRAVE H.C.","One place to run your team.","Game night first. Attendance, goalie confirmation, lineup and team news stay connected to the existing workflows.",btn("Manage attendance","team-attendance",true))+
'<div class="metrics">'+metric("Next game",currentGame()?dateFmt(currentGame().date):"—","Official fixture")+metric("Team record",s?s.w+"–"+s.l+"–"+s.t:"—","Published SVHL")+metric("League points",s?.pts??"—","Published SVHL")+metric("Availability","Not synced","WhatsApp connection pending")+'</div>'+
'<div class="grid"><div class="stack">'+panel("Next game","Your weekly team workflow starts here.",fixtureCard()+'<div class="topline">'+btn("Attendance","team-attendance",true)+btn("Lineups & goalies","team-lineup")+'</div>')+
panel("Manager’s game-night checklist","The same approved fixture drives each task.",'<div class="linklist"><button data-go="team-attendance">① Collect responses and resolve outstanding players <span>›</span></button><button data-go="team-lineup">② Confirm goalie, call-ups and lineup <span>›</span></button><button data-go="team-widgets">③ Review opponent and team statistics <span>›</span></button><button data-go="team-media">④ Publish approved recap and updates <span>›</span></button></div>')+'</div><div class="stack">'+
panel("Brave H.C. · team website","Your reference TeamOS, built on existing public assets",'<div class="teamident"><img class="crest" src="./brave_hc_logo.png" alt="Brave H.C. logo"><div><strong>Brave H.C.</strong><div class="small dim">Cristillo Division · Winter 2026/27</div></div></div><div class="topline">'+btn("Open embedded widgets","team-widgets",true)+link("Current team Game Centre","game-centre-next.html")+'</div>')+
panel("What stays available","We are consolidating navigation, not replacing approved workflows.",'<div class="cardrow"><div><strong>HTO website and widgets</strong><small>Current source-controlled public pages remain available.</small></div><span class="pill green">Retained</span></div><div class="cardrow"><div><strong>Private roster and lineup decisions</strong><small>Stay manager-controlled; no public release.</small></div><span class="pill green">Protected</span></div><div class="cardrow"><div><strong>Premium team features</strong><small>A proposed upgrade system, no billing activated.</small></div>'+btn("View tiers","team-upgrades")+'</div>')+'</div></div>'+footnote()}
function teamAttendance(){const f=currentGame();const ans=state.poll.availability;return intro("HOCKEYOS TEAMOS · WEEKLY OPERATIONS","Attendance & availability","One game, one response link. Responses feed the manager’s roster review—not an automatic lineup.",btn("Return to team home","team-home"))+
'<div class="grid"><div class="stack">'+panel("Game poll","Manager prepares one invitation for this verified fixture.",fixtureCard()+'<div class="callout warn" style="margin-top:14px">Preview only: WhatsApp sharing prepares a message but does not send it automatically. This static version cannot collect other players’ votes across devices.</div><div class="formfooter"><button id="share-whatsapp" class="btn primary">Prepare WhatsApp share</button><button id="copy-invite" class="btn">Copy invitation</button><button id="open-response" class="btn">Test player response</button></div>')+
panel("What the manager will see","Real attendance syncing is a separate private integration step.",'<div class="twocol"><div class="toolcard"><h3>Full-time players</h3><p>Confirmed, unavailable, unsure and no-response groups per game.</p></div><div class="toolcard"><h3>Call-up needs</h3><p>Suggest replacements only after actual responses and manager approval.</p></div><div class="toolcard"><h3>Goalie confirmation</h3><p>Keep goalie scheduling separate from skater lineup decisions.</p></div><div class="toolcard"><h3>Rotation-aware lineups</h3><p>Use the established Brave H.C. weekly line-rotation rules and approved call-ups.</p></div></div>')+'</div><div class="stack">'+
panel("Response preview","Test exactly how the player will see it.",'<div class="choices"><button data-poll="in" class="'+(ans==="in"?"chosen":"")+'">✓ In</button><button data-poll="out" class="'+(ans==="out"?"chosen":"")+'">× Out</button><button data-poll="unsure" class="'+(ans==="unsure"?"chosen":"")+'">? Unsure</button></div><p class="small dim">This sample response is saved to this browser only; it is not counted as a team vote.</p><div class="cardrow"><div><strong>Sample status</strong><small>'+(ans?("This device: "+ans):"No selection")+'</small></div><span class="pill amber">Demo</span></div>')+
panel("WhatsApp & future app","Low-friction first, automation only after approval.",'<p>A manager can share a branded RSVP link to an existing WhatsApp group. Players can later reply in a web app or mobile app, linked to authenticated team identities.</p><p>Actual group message automation and reading WhatsApp poll replies require eligible integration capabilities and consent. They are not operating here.</p>')+'</div></div>'+footnote()}
function teamRespond(){const ans=state.poll.availability;return intro("HOCKEYOS · PLAYER VIEW","Are you playing?","The player experience should take one tap, on any phone.")+
panel("Brave H.C. · availability",fixtureCard()+'<h3 style="margin:17px 0 11px">Choose your answer</h3><div class="choices"><button data-poll="in" class="'+(ans==="in"?"chosen":"")+'">✓ In</button><button data-poll="out" class="'+(ans==="out"?"chosen":"")+'">× Out</button><button data-poll="unsure" class="'+(ans==="unsure"?"chosen":"")+'">? Unsure</button></div><p class="source">Demonstration only: saved on this device, not delivered to a manager. Production polls require authenticated players and shared server storage.</p><div class="topline">'+btn("Return to manager preview","team-attendance")+'</div>')+footnote()}
function teamLineup(){return intro("HOCKEYOS TEAMOS · GAME OPERATIONS","Lineups, goalies & call-ups","Continue the established Brave H.C. workflow with source-qualified attendance and manager approval.")+
panel("Preparation workflow","Private operational source remains separate from this public demo",'<div class="linklist"><a href="'+base+'game-centre-next.html" target="_blank" rel="noopener noreferrer">Current public Game Centre and lineup presentation <span>↗</span></a><button data-go="team-attendance">Return to attendance planning <span>›</span></button></div><div class="callout warn" style="margin-top:14px">The actual Brave H.C. lineup card, full-time responses, goalie commitments and call-up records remain manager-controlled. This view does not invent participation or publish a lineup.</div>')+
panel("TeamOS manager workflow · next integration","Retain accepted scheduling and lineup rules",'<div class="twocol"><div class="toolcard"><h3>Attendance → availability</h3><p>Yes means available, not yet assigned a line or accepted as a call-up.</p></div><div class="toolcard"><h3>Goalie → roster planning</h3><p>Confirm goaltender independently before publishing a final card.</p></div><div class="toolcard"><h3>Weekly line rotation</h3><p>Respect existing first, second and third-line rotation rules.</p></div><div class="toolcard"><h3>Manager sign-off</h3><p>Only an approved lineup can replace the current public blank/approved card.</p></div></div>')+footnote()}
function teamRoster(){return intro("HOCKEYOS TEAMOS · PLAYERS","Team roster & player profiles","A base team site contains public player records; private contact, availability reasons and internal evaluations remain restricted.")+
panel("Existing public team records","HTO is authoritative for the current Brave H.C. roster",'<div class="linklist"><a href="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=roster" target="_blank" rel="noopener noreferrer">Official Brave H.C. roster on HTO <span>↗</span></a><a href="'+base+'player-bio.html" target="_blank" rel="noopener noreferrer">HockeyOS player biographies <span>↗</span></a><a href="'+base+'player-highlights.html" target="_blank" rel="noopener noreferrer">Player highlights component <span>↗</span></a></div>')+
panel("TeamOS privacy design","Shared identities do not imply shared private notes",'<div class="callout">League admins receive permitted league-facing fields. Private player contact information, internal scouting, eligibility drafts and lineup considerations are not automatically visible in LeagueOS.</div>')+footnote()}
function teamWidgets(){const options=widgets.map(w=>'<option value="'+esc(w[0])+'" '+(w[0]===state.widget?"selected":"")+'>'+esc(w[1])+'</option>').join('');const w=widgets.find(x=>x[0]===state.widget)||widgets[0];return intro("HOCKEYOS TEAMOS · PUBLISHING","Widgets & analytics","Run the existing HockeyOS public widgets inside TeamOS while continuing their independent HTO UI/UX development.")+
panel("Widget workspace","Existing public pages loaded from the approved Brave H.C. GitHub Pages release.",'<div class="formgrid"><label class="field">Choose a widget<select id="widget-select">'+options+'</select></label><div class="field"><span>Public widget source</span><a id="widget-source" class="btn" href="'+esc(base+w[0])+'" target="_blank" rel="noopener noreferrer">Open full widget ↗</a></div></div><p class="small dim">'+esc(w[2])+' · '+esc(w[3])+'</p><div class="iframebox"><iframe id="widget-frame" title="'+esc(w[1])+' widget" loading="lazy" src="'+esc(base+w[0])+'"></iframe></div><div class="callout" style="margin-top:13px">Widgets remain independently versioned for the current HTO site. The future TeamOS website can use these same source-controlled components without migrating HTO’s authoritative records prematurely.</div>')+footnote()}
function teamMedia(){return intro("HOCKEYOS TEAMOS · CONTENT","News, history & media","An evolving team website—without breaking the current HTO publishing and editorial workflow.")+
panel("Existing Brave H.C. public content","Open the current source-controlled experiences",'<div class="linklist"><a href="'+base+'hot-stove.html" target="_blank" rel="noopener noreferrer">Hot Stove articles and recaps <span>↗</span></a><a href="'+base+'history.html" target="_blank" rel="noopener noreferrer">Club history <span>↗</span></a><a href="'+base+'watch-v2.html" target="_blank" rel="noopener noreferrer">Milestones and record watch <span>↗</span></a><a href="'+base+'awards-races.html" target="_blank" rel="noopener noreferrer">Team awards <span>↗</span></a></div>')+
panel("Future team website","Publishing remains permissioned",'<p>Teams can create news posts, select branded widgets and eventually host approved media. Editorial approval, rights to video footage and HTO parity checks remain in place.</p>')+footnote()}
function teamUpgrades(){return intro("HOCKEYOS TEAMOS · PACKAGING","One base website. More when you need it.","LeagueOS provides HockeyOS Core access for each participating team; additional capabilities are optional and subject to product pricing decisions.")+
panel("Team experience","Commercial configuration is proposed, not active billing",'<div class="twocol"><div class="toolcard"><h3>HockeyOS Core · Included</h3><p>Team website, branding, roster, approved schedule/results, basic stats, standings, attendance response link and standard widgets.</p><span class="pill green">Included concept</span></div><div class="toolcard"><h3>HockeyOS Team Pro · Add-on</h3><p>Manager workflow, lineup and call-up intelligence, advanced awards, historical analytics, custom media, player highlights and scouting.</p><span class="pill amber">Proposed paid upgrade</span></div><div class="toolcard"><h3>Video Intelligence · Add-on</h3><p>Rights-cleared video analysis, event review, clips and advanced team insights with explicit permissions.</p><span class="pill amber">Proposed paid upgrade</span></div><div class="toolcard"><h3>Player Plus · Optional</h3><p>Personal insights and additional player experiences, without exposing private team records.</p><span class="pill amber">Proposed paid upgrade</span></div></div><p class="source">No pricing, enrolment or charges are activated. League subscription and optional team/player tiers require a formal product decision.</p>')+footnote()}
const screens={"league-home":homeLeague,"league-schedule":leagueSchedule,"league-ice":leagueIce,"league-divisions":leagueDivisions,"league-teams":leagueTeams,"league-scoring":leagueScoring,"league-registration":registration,"league-rules":leagueRules,"league-payments":leaguePayments,"league-analysis":leagueAnalysis,"team-home":teamHome,"team-attendance":teamAttendance,"team-respond":teamRespond,"team-lineup":teamLineup,"team-roster":teamRoster,"team-widgets":teamWidgets,"team-media":teamMedia,"team-upgrades":teamUpgrades};
function render(){const fn=screens[state.route]||homeLeague;$("#workspace").innerHTML=fn()}
function openFeedback(section){noteSection=section||state.route||"General";$("#feedback-section").textContent=noteSection;$("#feedback-input").value="";$("#feedback-shade").classList.add("on");$("#feedback-drawer").classList.add("on");$("#feedback-drawer").setAttribute("aria-hidden","false");renderNotes();$("#feedback-input").focus()}
function closeFeedback(){$("#feedback-shade").classList.remove("on");$("#feedback-drawer").classList.remove("on");$("#feedback-drawer").setAttribute("aria-hidden","true")}
function renderNotes(){const el=$("#saved-notes");el.replaceChildren();$("#comment-count").textContent=state.notes.length;state.notes.slice().reverse().forEach(n=>{const box=document.createElement("div"),b=document.createElement("b"),p=document.createElement("p"),s=document.createElement("small");box.className="savednote";b.textContent=n.section||"General";p.textContent=n.text;s.textContent=n.created||"";box.append(b,p,s);el.append(box)});if(!state.notes.length)el.textContent="No comments saved yet."}
function fullNotes(){return "BruTTech SportsOS redesign · Screen-by-screen review\n"+state.notes.map((n,i)=>(i+1)+". ["+(n.section||"General")+"] "+n.text).join("\n\n")+"\n\nPlease revise the browser prototype against these notes."}
function download(text,name,type){const b=new Blob([text],{type:type||"text/plain;charset=utf-8"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function pollInvitation(){const f=currentGame();const url=base+"leagueos-team-os-demo.html#team-respond";return "🏒 Brave H.C. · HockeyOS attendance DEMO\n"+(f?"Next game: "+dateFmt(f.date)+" at "+f.time+" · "+f.rink+" vs "+f.opponent+"\n":"Upcoming game: see official schedule\n")+"Test the new one-tap In / Out / Unsure experience:\n"+url+"\n\nDEMO ONLY: responses are not yet delivered to the manager."}
document.addEventListener("click",e=>{const node=e.target.closest("button,[data-go]");if(!node)return;if(node.dataset.go){navigate(node.dataset.go);return}
if(node.dataset.opsDate){state.ops.date=node.dataset.opsDate;state.ops.view="day";state.ops.program="all";render();return}
if(node.dataset.opsToday){state.ops.date=torontoToday();state.ops.program="all";state.ops.view="day";render();return}
if(node.dataset.opsDay){state.ops.date=addDay(state.ops.date,Number(node.dataset.opsDay));render();return}
if(node.dataset.opsView){state.ops.view=node.dataset.opsView;render();return}
if(node.id==="ice-save"){
 const date=$("#ice-date")?.value,rink=$("#ice-rink")?.value,start=$("#ice-start")?.value,end=$("#ice-end")?.value,use=$("#ice-use")?.value;
 if(!date||!rink||!start||!end)return toast("Select a date, rink and time range.");
 if(end<=start)return toast("End time must follow the start time.");
 const warning=(state.upcoming?.games||[]).some(f=>f.date===date&&String(f.rink||"").startsWith(rink)&&f.time>=start&&f.time<end);
 state.iceDrafts.push({date,rink,start,end,use,warning,createdAt:new Date().toISOString()});
 state.iceDrafts=state.iceDrafts.slice(-50);save(OPS_ICE_KEY,state.iceDrafts);render();
 toast(warning?"Inquiry saved with possible published-game start conflict.":"Local inquiry draft saved. Ice has NOT been reserved.");
 return;
}
if(node.id==="change-save"){
 const date=$("#change-date")?.value,rink=$("#change-rink")?.value,reason=$("#change-reason")?.value.trim();
 if(!date||!rink||!reason)return toast("Complete date, rink and reason.");
 state.changeDrafts.push({date,rink,reason,createdAt:new Date().toISOString(),notOfficial:true});
 state.changeDrafts=state.changeDrafts.slice(-50);save(OPS_CHANGE_KEY,state.changeDrafts);render();
 toast("Schedule change request saved locally. Official calendar unchanged.");return;
}
if(node.dataset.feedback){openFeedback(node.dataset.feedback);return}
if(node.id==="add-player"){if(state.registration.players.length>=20)return toast("The published roster limit is 20.");state.registration.players.push({name:"",jersey:""});save(REG_KEY,state.registration);render();return}
if(node.dataset.removeRoster!==undefined){const n=Number(node.dataset.removeRoster);state.registration.players.splice(n,1);if(!state.registration.players.length)state.registration.players=[{name:"",jersey:""}];save(REG_KEY,state.registration);render();return}
if(node.id==="clear-reg"){if(confirm("Clear your local registration demo draft?")){state.registration={team:"",manager:"",division:"Cristillo",players:[{name:"",jersey:""}]};save(REG_KEY,state.registration);render()}return}
if(node.id==="export-reg"){download(JSON.stringify({kind:"LeagueOS team registration demo",notOfficial:true,createdAt:new Date().toISOString(),registration:state.registration},null,2),"LeagueOS_registration_DEMO.json","application/json");toast("Demo form exported; not submitted.");return}
if(node.id==="copy-rule-proposal"){const rule=$("#rule-ref")?.value.trim(),why=$("#rule-reason")?.value.trim(),proposal=$("#rule-proposal")?.value.trim();if(!rule||!why||!proposal)return toast("Complete all three fields first.");copy("SVHL RULEBOOK REVIEW PROPOSAL (DRAFT ONLY)\nRule/issue: "+rule+"\nReason: "+why+"\nSuggested clarification: "+proposal+"\nNot approved by league officials.");return}
if(node.id==="copy-invite"){copy(pollInvitation());return}
if(node.id==="share-whatsapp"){const txt=pollInvitation();window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank","noopener,noreferrer");toast("WhatsApp share opened. No message was sent automatically.");return}
if(node.id==="open-response"){navigate("team-respond");return}
if(node.dataset.poll){state.poll.availability=node.dataset.poll;save(POLL_KEY,state.poll);render();toast("Sample reply saved on this device, not transmitted.");return}
if(node.id==="save-feedback"){const val=$("#feedback-input").value.trim();if(!val)return toast("Enter a comment first.");state.notes.push({section:noteSection,text:val,created:new Date().toLocaleString("en-CA")});state.notes=state.notes.slice(-100);save(FEEDBACK_KEY,state.notes);$("#feedback-input").value="";renderNotes();toast("Comment saved locally.");return}
if(node.id==="copy-feedback"){if(!state.notes.length)return toast("Add feedback before copying.");copy(fullNotes());return}
if(node.id==="download-feedback"){if(!state.notes.length)return toast("Add feedback before exporting.");download(fullNotes(),"BruTTech_SportsOS_Design_Review.txt");return}
if(node.id==="close-feedback"){closeFeedback();return}
});
function copy(text){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>toast("Copied to clipboard.")).catch(()=>toast("Clipboard blocked; try a supported browser."))}else toast("Clipboard unavailable on this browser.")}
document.addEventListener("input",e=>{const n=e.target;if(n.dataset.rosterIndex!==undefined){const i=Number(n.dataset.rosterIndex),field=n.dataset.rosterField;if(state.registration.players[i]&&["name","jersey"].includes(field)){state.registration.players[i][field]=n.value;save(REG_KEY,state.registration)}}if(n.id==="reg-team"){state.registration.team=n.value;save(REG_KEY,state.registration)}if(n.id==="reg-manager"){state.registration.manager=n.value;save(REG_KEY,state.registration)}if(n.id==="rules-filter"){$("#rules-list").innerHTML=ruleRows(n.value)}});
document.addEventListener("change",e=>{if(e.target.id==="ops-date"&&e.target.value){state.ops.date=e.target.value;state.ops.program="all";state.ops.view="day";render();return}
if(e.target.id==="ops-rink"){state.ops.rink=e.target.value;render();return}
if(e.target.id==="ops-program"){
 const program=e.target.value;state.ops.program=program;
 if(/^[0-6]$/.test(program)){const m=weekMonday(state.ops.date);let desired=Number(program);state.ops.date=addDay(m,(desired+6)%7)}
 state.ops.view="day";render();return;
}
if(e.target.id==="reg-division"){state.registration.division=e.target.value;save(REG_KEY,state.registration)}if(e.target.id==="widget-select"){state.widget=e.target.value;render()}});
$("#sw-league").addEventListener("click",()=>navigate("league-home"));$("#sw-team").addEventListener("click",()=>navigate("team-home"));
$("#feedback-open").addEventListener("click",()=>openFeedback(state.route));
$("#feedback-shade").addEventListener("click",closeFeedback);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeFeedback()});
async function data(){const items=[["league","league-intelligence.json"],["standings","standings.json"],["upcoming","svhl-upcoming.json"]];
await Promise.all(items.map(async([key,file])=>{try{const r=await fetch("./"+file,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const val=await r.json();if(key==="league"&&val.schema!=="brave-hc-league-intelligence/public-v1")throw new Error("League schema");if(key==="standings"&&!Array.isArray(val.teams))throw new Error("Standings schema");if(key==="upcoming"&&!Array.isArray(val.games))throw new Error("Schedule schema");state[key]=val}catch(e){console.warn("Public snapshot not available:",file,String(e))}}));render()}
navigate((location.hash||"#league-home").slice(1));renderNotes();data();
})();
