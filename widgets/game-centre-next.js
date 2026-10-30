/* Brave H.C. Game Centre r3 — public, source-qualified Sunday league analysis.
   Public identities, source-verified scorelines and manager-approved lineup only.
   Existing external full reports remain authoritative; no messaging, writes or forecasts.
*/
(function(){
"use strict";
const root=document.getElementById("game-centre");if(!root)return;
const $=id=>document.getElementById(id);
const n=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined&&str!==null)e.textContent=String(str);return e};
const set=(id,s)=>{$(id).textContent=s};
const fmt=(x,opts={})=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",...opts}).format(new Date(x));
const shortDate=day=>fmt(day+"T12:00:00Z",{timeZone:"UTC",month:"short",day:"numeric"});
const when=day=>fmt(day+"T12:00:00Z",{timeZone:"UTC",weekday:"short",month:"short",day:"numeric"});
const age=iso=>{const t=Date.parse(iso||"");return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):Infinity};
const percent=x=>Number.isFinite(x)?(x*100).toFixed(0)+"%":"—";
const number=(x,dec=0)=>Number.isFinite(x)?x.toFixed(dec):"—";
const clean=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const ADULT=["Fazzari Partners","The Cristillo Division","Remax Division"];
const LABEL={"Fazzari Partners":"Fazzari Division","The Cristillo Division":"Cristillo Division","Remax Division":"Remax Division"};
const lineupGroups=[
 {title:"FORWARDS",rows:[
  [["C7","LW"],["D7","C"],["E7","RW"]],
  [["C8","LW"],["D8","C"],["E8","RW"]],
  [["C9","LW"],["D9","C"],["E9","RW"]]]},
 {title:"DEFENCE",rows:[
  [["C12","LD"],["D12","RD"]],
  [["C13","LD"],["D13","RD"]],
  [["C14","LD"],["D14","RD"]]]},
 {title:"GOALTENDER",rows:[ [["D16","G"]] ]}
];
const state={standings:null,league:null,upcoming:null,schedule:null,assign:null,history:null,lineup:null,playerProfiles:null,
 division:"The Cristillo Division",opponent:null,rankIndex:0,rankTeam:null};
function nextFixture(){return state.upcoming?.games?.find(g=>Date.now()<Date.parse(g.rolloverAtUTC))||null}
function selectTab(tab){
 for(const button of root.querySelectorAll(".tabs button")){
  const selected=button.dataset.tab===tab;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;
 }
 for(const panel of root.querySelectorAll(".tab-panel"))panel.hidden=panel.dataset.name!==tab;
}
for(const [i,button] of [...root.querySelectorAll(".tabs button")].entries()){
 button.addEventListener("click",()=>selectTab(button.dataset.tab));
 button.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
  e.preventDefault();const btns=[...root.querySelectorAll(".tabs button")];
  const at=e.key==="Home"?0:e.key==="End"?btns.length-1:(i+(e.key==="ArrowLeft"?btns.length-1:1))%btns.length;
  btns[at].focus();selectTab(btns[at].dataset.tab);
 });
}
const validRecord=r=>!!(r&&["gp","w","l","t","pts","gf","ga"].every(k=>Number.isInteger(r[k])&&r[k]>=0)&&r.w+r.l+r.t===r.gp);
function verifyStandings(x){
 if(x?.schema!=="brave-hc-svhl-standings/v1"||x.division!=="Cristillo"||!Array.isArray(x.teams)||x.teams.length!==8||
    x.teams.some(t=>!t.name||!validRecord(t)||!Number.isFinite(t.winPct)))throw Error("Cristillo standings source not verified");
 return x;
}
function verifyLeague(x){
 if(x?.schema!=="brave-hc-league-intelligence/public-v1"||
    x.status!=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED"||
    x.currentSourceDataConcordant!==true||!Array.isArray(x.teams)||!Array.isArray(x.divisions))throw Error("SVHL current-league proof missing");
 const eligible=x.teams.filter(t=>ADULT.includes(t.divisionNow));
 if(eligible.length!==22||eligible.some(t=>!Number.isInteger(t.sourceTeamId)||!validRecord(t.record)||!Array.isArray(t.completedGames)))throw Error("Adult Sunday data incomplete");
 return x;
}
function verifyUpcoming(x){if(x?.schema!=="brave-hc-upcoming-countdown/v1"||x.team!=="Brave H.C."||!Array.isArray(x.games))throw Error("HTO fixture invalid");return x}
function verifySchedule(x){if(x?.schema!=="brave-hc-svhl-schedule/v1"||!Array.isArray(x.games))throw Error("SVHL fixtures missing");return x}
function verifyAssignments(x){if(x?.schema!=="brave-hc-goalie-assignments/v1"||!x.assignments)throw Error("Goalie confirmations missing");return x}
function verifyHistory(x){if(x?.schema!=="brave-hc-opponent-intelligence/v1"||x.publishable!==true||x.status!=="PUBLIC_VERIFIED_SOURCE_IDENTITY"||!Array.isArray(x.teams))throw Error("Verified opponent ledger unavailable");return x}
async function fetchJSON(name){const r=await fetch("./"+name,{cache:"no-store"});if(!r.ok)throw Error(name+" HTTP "+r.status);return r.json()}
function eligibleTeams(){return state.league?.teams.filter(t=>ADULT.includes(t.divisionNow))||[]}
function byName(name){return eligibleTeams().find(t=>clean(t.leagueName)===clean(name)||clean(t.displayName)===clean(name))}
function gameStreak(team,standingsRecord){
 if(!team||!Array.isArray(team.completedGames)||!validRecord(team.record))return null;
 const a=team.completedGames;
 if(a.length!==team.record.gp||team.record.gp===0)return null;
 const counts={W:0,L:0,T:0},dates=new Set();
 for(const g of a){
  if(!g||!["W","L","T"].includes(g.result)||!/^\d{4}-\d\d-\d\d$/.test(g.date)||
     !Number.isInteger(g.gf)||!Number.isInteger(g.ga)||g.gf<0||g.ga<0||(g.result==="W"&&g.gf<=g.ga)||(g.result==="L"&&g.gf>=g.ga)||(g.result==="T"&&g.gf!==g.ga))return null;
  counts[g.result]++;
  if(dates.has(g.date+"|"+g.opponent))return null;dates.add(g.date+"|"+g.opponent);
 }
 if(counts.W!==team.record.w||counts.L!==team.record.l||counts.T!==team.record.t)return null;
 if(standingsRecord&&Object.keys(counts).some((k)=>counts[k]!==standingsRecord[{W:"w",L:"l",T:"t"}[k]]))return null;
 const ordered=[...a].sort((x,y)=>y.date.localeCompare(x.date)),kind=ordered[0].result;
 let length=0;for(const g of ordered){if(g.result!==kind)break;length++}
 return {kind,length,label:(kind==="W"?"Won ":kind==="L"?"Lost ":"Tied ")+length};
}
function effectiveDivision(div){
 const row=$("division-heading"),patch=$("division-patch"),identity=patch.closest(".division-identity");
 row.textContent=LABEL[div]||div;identity.classList.toggle("no-patch",div!=="The Cristillo Division");
 $("division-description").textContent=div==="The Cristillo Division"?"SVHL Sunday Winter · Andrew Cristillo dedication":"SVHL Sunday Winter · Official published division";
}
function selectDivisions(){
 if(!state.league)return;
 const s=$("division-select"),prior=state.division;s.replaceChildren();
 for(const name of ADULT){const o=n("option",null,LABEL[name]);o.value=name;s.append(o)}
 s.value=ADULT.includes(prior)?prior:"The Cristillo Division";
}
$("division-select").addEventListener("change",v=>{state.division=v.target.value;drawStandings()});
function pointsPct(t,raw){
 const p=Number.isFinite(raw)?raw:(t.gp?((t.w+.5*t.t)/t.gp):0);
 if(!Number.isFinite(p))return null;
 if(t.gp>0&&Math.abs(p-(t.w+.5*t.t)/t.gp)>0.02)return null;
 return p;
}
function drawStandings(){
 if(!state.standings||!state.league)return;
 effectiveDivision(state.division);
 const current=state.division==="The Cristillo Division";
 const rows=current?state.standings.teams.map(r=>({name:r.name,record:r,winPct:r.winPct,league:byName(r.name)})):
  eligibleTeams().filter(t=>t.divisionNow===state.division).map(t=>({name:t.leagueName,record:t.record,winPct:t.winPct,league:t}));
 const sorted=rows.sort((a,b)=>b.record.pts-a.record.pts||b.record.w-a.record.w||
   ((b.record.gf-b.record.ga)-(a.record.gf-a.record.ga))||a.name.localeCompare(b.name));
 const tbody=$("standings-rows");tbody.replaceChildren();
 for(const row of sorted){
  const {record:r,league:l}=row,tr=n("tr",clean(row.name)===clean("Braves HC")?"brave":null);
  const streak=gameStreak(l,current?r:null),p=pointsPct(r,row.winPct);
  const cells=[
   ["Team",row.name],["GP",r.gp],["W-L-T",r.w+"-"+r.l+"-"+r.t],["Pts",r.pts],
   ["Win %",percent(p)],["GF",r.gf],["GA",r.ga],["Streak",streak?streak.label:"—"]
  ];
  for(const [i,[label,value]] of cells.entries()){
   const cell=n("td",i===7&&streak?"streak-"+({"W":"win","L":"loss","T":"tie"}[streak.kind]):null,value);
   cell.dataset.label=label;tr.append(cell);
  }
  tbody.append(tr);
 }
 const stamp=state.division==="The Cristillo Division"?state.standings.capturedAt:state.league.asOf;
 const warning=age(stamp)>36?"Update check due · ":"";
 set("standings-status",warning+sorted.length+" clubs · "+(current?"Cristillo official table":"SVHL verified current-season table")+" · "+fmt(stamp,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET");
}
function time12(t){
 if(typeof t!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return "TBD";
 const [hour,min]=t.split(":").map(Number);
 return (hour%12||12)+":"+String(min).padStart(2,"0")+(hour>=12?" PM":" AM");
}
function drawGoalies(){
 if(!state.schedule||!state.assign)return;
 const games=state.schedule.games.filter(g=>Date.parse(g.date+"T23:59:00-05:00")>=Date.now()).slice(0,4);
 const body=$("goalie-rows");body.replaceChildren();
 for(const g of games){
  const matched=g.htoSyncStatus==="MATCH"&&!g.requiresGoalieReconfirmation;
  const goalie=matched?(state.assign.assignments[g.assignmentKey]||"TBD"):"TBD";
  const tr=n("tr"),first=n("td");first.append(n("span","date",when(g.date)),n("span","opp",g.opponent),n("span","tiny",(g.rink||"Rink TBD")+" · "+(g.side==="home"?"Home":"Away")));
  tr.append(first,n("td",null,time12(g.time)),n("td",goalie==="TBD"?"pending":null,goalie));body.append(tr);
 }
 if(!games.length){const tr=n("tr"),td=n("td",null,"No current verified fixture");td.colSpan=3;tr.append(td);body.append(tr)}
 const stamp=state.schedule.checkedAt;
 set("goalie-status",(age(stamp)>36?"Schedule check overdue · ":"")+"SVHL fixtures checked "+fmt(stamp,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET · Unconfirmed goalies: TBD");
}
function blankLineup(result){
 const box=$("lineup-card");box.replaceChildren();
 for(const section of lineupGroups){
  const sectionEl=n("section","lineup-section");sectionEl.append(n("div","section-label",section.title));
  for(let i=0;i<section.rows.length;i++){
   const line=n("div","lineup-unit "+(section.title==="DEFENCE"?"defence":section.title==="GOALTENDER"?"goalie":""));
   for(const [cell,role] of section.rows[i]){
    const tile=n("div","lineup-slot"),name=n("strong",null,"—");
    const slot=result?.approved?result.slots[cell]:null;
    if(slot&&slot!=="-")name.textContent=slot.name;
    tile.append(n("span",null,role+(section.title!=="GOALTENDER"?" · "+(i+1):"")),name);line.append(tile);
   }
   sectionEl.append(line);
  }
  box.append(sectionEl);
 }
}
function drawLineup(feed,profiles){
 const fixture=nextFixture();
 set("lineup-fixture",fixture?"Next: "+when(fixture.gameDate)+" · "+fixture.opponent:"Next game pending HTO verification");
 let result=null;
 if(fixture&&feed&&profiles&&profiles.schema==="brave-hc-player-career-insights/v1"&&
   profiles.sourceAuthority==="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK"&&window.BraveGameNightContract){
  const lookup=id=>{
   const hit=profiles.players?.[String(id)];
   return hit&&hit.status==="VERIFIED_PROFILE_CAREER_SUM_PARITY"?{name:hit.name}:null;
  };
  result=window.BraveGameNightContract.confirm(feed,state.upcoming,lookup,new Date().toISOString());
 }
 blankLineup(result);
 const published=result?.approved===true;
 set("lineup-notice",published?"MANAGER-APPROVED PUBLIC LINEUP · "+fmt(result.approvedAt,{month:"short",day:"numeric"}):
  "Blank lineup · WhatsApp responses remain in private review. Players are listed only after verified identities, selections and manager publication approval.");
}
function miniMetric(label,value){const box=n("div","tile");box.append(n("strong",null,value),n("span",null,label));return box}
function renderOpponent(){
 const card=$("opponent-card"),name=state.opponent;
 card.replaceChildren();if(!state.league||!name)return;
 const t=byName(name);
 if(!t){card.append(n("p",null,"No source-verified current team profile for that selection."));return;}
 const strengths=t.strengthContext||{},r=t.record;
 const top=n("div","opp-title"),title=n("div");
 const next=nextFixture();
 title.append(n("div","eyebrow",next&&clean(next.opponent)===clean(t.leagueName)?"NEXT VERIFIED OPPONENT":"SUNDAY LEAGUE SCOUTING"));
 title.append(n("h3",null,t.displayName||t.leagueName),n("p",null,LABEL[t.divisionNow]||t.divisionNow));
 top.append(title,n("span","badge-rank",Number.isInteger(adultRank(t))?"Sunday #"+adultRank(t):"Rating held"));card.append(top);
 const grid=n("div","bio-style-metrics");
 const streak=gameStreak(t);
 for(const [label,val] of [
  ["Strength /100",number(strengths.contextIndex,1)],
  ["W-L-T",r.w+"-"+r.l+"-"+r.t],
  ["Goals /game",r.gp?number(r.gf/r.gp,1):"—"],
  ["Against /game",r.gp?number(r.ga/r.gp,1):"—"]])grid.append(miniMetric(label,val));
 card.append(grid);
 const summary=r.gp?
  t.displayName+" have scored "+number(r.gf/r.gp,1)+" goals per game and allowed "+number(r.ga/r.gp,1)+
  ". "+(streak?"Their latest run is "+streak.label.toLowerCase()+". ":"")+
  "These are completed-game trends, not a predicted score.":
  "Not enough verified current games for a form assessment.";
 card.append(n("p","opp-read",summary));
 card.append(n("div","mini-head","RECENT RESULTS"));
 const ul=n("ul","mini-list");
 const last=[...(t.completedGames||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 for(const g of last){ul.append(n("li",null,shortDate(g.date)+" · "+({"W":"Won","L":"Lost","T":"Tied"}[g.result]||"Result")+" "+g.gf+"–"+g.ga+" vs "+g.opponent))}
 if(!last.length)ul.append(n("li",null,"Verified recent results not available"));
 card.append(ul);
 const history=state.history?.teams.find(x=>clean(x.name)===clean(t.leagueName));
 const hh=n("div","history"),header=n("div","mini-head","BRAVE H.C. HEAD-TO-HEAD");
 hh.append(header);
 if(history&&["VERIFIED_EXACT_NAME","VERIFIED_HISTORICAL_NAME_VARIANT"].includes(history.verification)&&
   history.regularSeason&&Number.isInteger(history.regularSeason.gp)){
  const q=history.regularSeason;
  hh.append(n("p",null,q.gp+" verified regular-season meetings · "+q.w+" wins, "+q.l+" losses, "+q.t+" ties."));
 }else hh.append(n("p",null,"No exact, verified historical matchup linked to this source team."));
 card.append(hh);
 card.append(n("p","source-note","HockeyOS strength context: "+(strengths.confidence==="LIMITED_SAMPLE"?"small sample · early-season evidence":"source-qualified snapshot")+
  " · not a win probability. Opponent division and historical franchise identities are not presumed interchangeable."));
 $("opponent-details-link").href="./league-intelligence.html?team="+encodeURIComponent(t.leagueName);
}
function selectOpponentOptions(){
 const selector=$("opponent-select"),teams=eligibleTeams();
 if(!teams.length)return;
 const next=nextFixture();
 const options=[...teams].sort((a,b)=>a.divisionNow.localeCompare(b.divisionNow)||a.leagueName.localeCompare(b.leagueName));
 const previous=state.opponent;
 selector.replaceChildren();
 for(const t of options){const o=n("option",null,t.leagueName+" · "+LABEL[t.divisionNow]);o.value=t.leagueName;selector.append(o)}
 const initial=teams.find(x=>clean(x.leagueName)===clean(previous))?.leagueName||
  teams.find(x=>next&&clean(x.leagueName)===clean(next.opponent))?.leagueName||"Mid Ice Crisis";
 state.opponent=initial;selector.value=initial;renderOpponent();
}
$("opponent-select").addEventListener("change",e=>{state.opponent=e.target.value;renderOpponent()});
function rankRows(){
 // Accepted HockeyOS context scores are unchanged. Re-number ranks across
 // the 22 competitive adult Sunday teams ONLY (exclude VAHL and x-playoff).
 return eligibleTeams().sort((a,b)=>{
  const ar=a.strengthContext?.contextIndex,br=b.strengthContext?.contextIndex;
  if(Number.isFinite(ar)&&Number.isFinite(br))return br-ar||a.leagueName.localeCompare(b.leagueName);
  if(Number.isFinite(ar))return -1;if(Number.isFinite(br))return 1;
  return a.leagueName.localeCompare(b.leagueName);
 });
}
function adultRank(t){
 const i=rankRows().findIndex(x=>x.sourceTeamId===t.sourceTeamId);
 return i<0?null:i+1;
}
function drawRankings(){
 if(!state.league)return;
 const all=rankRows(),size=8,pages=Math.ceil(all.length/size);
 state.rankIndex=Math.min(Math.max(0,state.rankIndex),pages-1);
 const block=all.slice(state.rankIndex*size,(state.rankIndex+1)*size),body=$("rankings-rows");body.replaceChildren();
 for(const team of block){
  const r=team.strengthContext||{},tr=n("tr",clean(team.leagueName)===clean("Braves HC")?"brave":null);
  for(const value of [adultRank(team)||"—",team.leagueName,LABEL[team.divisionNow],number(r.contextIndex,1)]){
   tr.append(n("td",null,value));
  }
  body.append(tr);
 }
 $("rank-prev").disabled=state.rankIndex===0;$("rank-next").disabled=state.rankIndex===pages-1;
 set("rank-page","Page "+(state.rankIndex+1)+" / "+pages);
 set("rankings-status",all.length+" adult Sunday teams · official league results, source-qualified strength as of "+shortDate(state.league.asOf.slice(0,10))+
  ". Higher index means stronger observed competitive context, not predicted wins.");
}
$("rank-prev").addEventListener("click",()=>{state.rankIndex--;drawRankings()});
$("rank-next").addEventListener("click",()=>{state.rankIndex++;drawRankings()});
function drawRankTeam(){
 const target=$("rank-team-detail"),team=byName(state.rankTeam);
 target.replaceChildren();if(!team)return;
 const q=team.strengthContext||{},r=team.record;
 target.append(n("h4",null,team.leagueName+" · "+LABEL[team.divisionNow]));
 target.append(n("p",null,"HockeyOS strength: "+number(q.contextIndex,1)+"/100 · Sunday rank #"+(adultRank(team)||"—")+
 " · "+r.w+"-"+r.l+"-"+r.t+" · "+(q.confidence==="LIMITED_SAMPLE"?"limited game sample":"verified season sample")));
 const section=n("div","mini-head","RESULTS AGAINST TEAMS NOW IN EACH DIVISION");target.append(section);
 const groups=new Map(ADULT.map(name=>[name,[]]));
 for(const game of team.completedGames||[])if(groups.has(game.opponentCurrentDivision))groups.get(game.opponentCurrentDivision).push(game);
 for(const [division,games] of groups){
  if(!games.length)continue;
  const record={W:0,L:0,T:0};
  games.forEach(x=>{if(Object.hasOwn(record,x.result))record[x.result]++});
  target.append(n("p",null,LABEL[division]+": "+record.W+" W · "+record.L+" L · "+record.T+" T in "+games.length+" verified game(s)"));
 }
 target.append(n("p","source-note","The grouping uses opponents' currently listed divisions, which might not be their division when the game was played."));
}
function drawMovement(){
 const box=$("division-movements");box.replaceChildren();
 const movement=state.league?.movementLedger;
 if(!movement||!Array.isArray(movement.events)){box.append(n("p",null,"No verified division-change ledger available."));return}
 if(!movement.events.length){box.append(n("p",null,"No observed division changes recorded yet."));return}
 for(const e of [...movement.events].slice(-4).reverse()){
  const line=n("div","movement-row");
  line.append(n("strong",null,e.leagueName||"Team"),n("div",null,
  e.fromDivision?(LABEL[e.fromDivision]||e.fromDivision)+" → "+(LABEL[e.toDivision]||e.toDivision):
   "First observed in "+(LABEL[e.toDivision]||e.toDivision)+" · prior division not established"));
  const observed=e.firstObservedAt?shortDate(e.firstObservedAt.slice(0,10)):"date pending";
  line.append(n("small",null,"Detected by "+observed+" · official effective date unverified"));
  box.append(line);
 }
}
function selectRankOptions(){
 const s=$("rank-team-select"),all=rankRows();s.replaceChildren();
 for(const t of all){const o=n("option",null,t.leagueName+" · "+LABEL[t.divisionNow]);o.value=t.leagueName;s.append(o)}
 const found=all.find(t=>t.leagueName===state.rankTeam)?.leagueName||all.find(t=>clean(t.leagueName)===clean("Braves HC"))?.leagueName||all[0]?.leagueName;
 state.rankTeam=found||null;s.value=found||"";drawRankTeam();
}
$("rank-team-select").addEventListener("change",e=>{state.rankTeam=e.target.value;drawRankTeam()});
function refreshLeagueInfo(){
 if(!state.league)return;
 selectDivisions();drawStandings();selectOpponentOptions();drawRankings();selectRankOptions();drawMovement();
}
async function updateData(){
 const jobs=[
  fetchJSON("standings.json").then(verifyStandings).then(t=>{state.standings=t;drawStandings()}).catch(()=>{set("standings-status","Cristillo official standings temporarily unavailable. Check the league website.")}),
  fetchJSON("league-intelligence.json").then(verifyLeague).then(t=>{state.league=t;refreshLeagueInfo()}).catch(()=>{set("rankings-status","Sunday power rankings withheld: verified league evidence unavailable.")}),
  fetchJSON("countdown.json").then(verifyUpcoming).then(t=>{state.upcoming=t;selectOpponentOptions();drawLineup(state.lineup,state.playerProfiles)}).catch(()=>{set("lineup-notice","No verified current fixture. Lineup remains blank.")}),
  fetchJSON("svhl-upcoming.json").then(verifySchedule).then(t=>{state.schedule=t;drawGoalies()}).catch(()=>{set("goalie-status","SVHL schedule unavailable. Check the official league page.")}),
  fetchJSON("goalie-assignments.json").then(verifyAssignments).then(t=>{state.assign=t;drawGoalies()}).catch(()=>{set("goalie-status","Published goaltender confirmation unavailable.")}),
  fetchJSON("opponent-intelligence.json").then(verifyHistory).then(t=>{state.history=t;renderOpponent()}).catch(()=>{renderOpponent()}),
  fetchJSON("game-night-lineup-public-v27-preview.json").then(t=>{state.lineup=t;drawLineup(t,state.playerProfiles)}).catch(()=>{blankLineup();set("lineup-notice","Public lineup not approved. No private WhatsApp votes are published.")}),
  fetchJSON("player-career-insights.json").then(t=>{state.playerProfiles=t;drawLineup(state.lineup,t)}).catch(()=>{blankLineup()})
 ];
 await Promise.allSettled(jobs);
}
// HTO Text Area may size the iframe to actual tab content using a strict
// parent-side origin/source guard. This sends no player or private data.
function publishHeight(){
 const height=Math.ceil(root.getBoundingClientRect().height)+10;
 if(window.parent!==window&&height>=450&&height<=2200){
  window.parent.postMessage({type:"brave-hc.gamecentre.height",version:1,height},"*");
 }
}
if(typeof ResizeObserver==="function")new ResizeObserver(publishHeight).observe(root);
window.addEventListener("load",publishHeight);
blankLineup();
updateData();
setInterval(updateData,5*60*1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateData()});
window.BraveGameCentreTest=Object.freeze({validRecord,gameStreak,verifyLeague,time12,rankRows,ADULT,pointsPct});
})();