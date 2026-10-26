/* Brave H.C. public Bio Centre: HTO-sourced stats and manager-reviewed public leadership only. */
(async()=>{
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,content,klass)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=String(content);if(klass)n.className=klass;return n;};
const fmt=d=>{const t=new Date(d);return Number.isNaN(t.valueOf())?"unavailable":t.toLocaleDateString("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"short",day:"numeric"});};
const validNum=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0;
const stat=(label,val)=>{const x=el("div",undefined,"stat");x.append(el("div",val,"num"),el("div",label,"stlab"));return x;};
const makeNotice=msg=>{const p=el("p",msg,"muted");return p;};
const suffix=id=>window.BravePlayerLinks?.identityById(Number(id));
const fetchJSON=async name=>{const r=await fetch("./"+name,{cache:"no-store"});if(!r.ok)throw Error(name+" unavailable");return r.json();};
let career,actuals,tenures,gameFeed;
try{
 const results=await Promise.allSettled([
 fetchJSON("player-career-insights.json"),fetchJSON("player-actuals.json"),fetchJSON("player-bio-leadership.json"),
 Promise.reject(new Error("Current per-game series awaits production approval"))]);
 if(results[0].status!=="fulfilled"||results[1].status!=="fulfilled")throw Error("Verified statistics source unavailable");
 career=results[0].value;actuals=results[1].value;
 if(career.schema!=="brave-hc-player-career-insights/v1"||career.sourceAuthority!=="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK")throw Error("Career source invalid");
 if(actuals.schema!=="brave-hc-hto-player-actuals/v1"||actuals.status!=="VERIFIED_HTO_CURRENT"||actuals.teamGP!==5)throw Error("Current source invalid");
 const candidate=results[2].status==="fulfilled"?results[2].value:null;
 tenures=candidate?.schema==="brave-hc-bio-public-leadership/v1"&&candidate.status==="PUBLIC_BIO_SOURCE_AND_FOUNDER_CONFIRMED"?candidate:{items:[]};
 const observed=results[3].status==="fulfilled"?results[3].value:null;
 gameFeed=observed?.schema==="brave-hc-player-games-private-five-source/v1"&&
  observed.status==="PRIVATE_ACCEPTED_SOURCE_NOT_PRODUCTION"&&observed.sourceAcceptance==="PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS"&&
  observed.teamGP===actuals.teamGP&&observed.currentActualsAsOf===actuals.asOf&&observed.productionAccepted===false?
  observed:null;
}catch(e){$("careerNote").textContent="Source validation unavailable: "+e.message;return;}
const ids=Object.keys(career.players);
if(ids.length!==109||window.BravePlayerLinks?.knownPlayers!==109){$("careerNote").textContent="109-player identity parity failed.";return;}
const currentByID=new Map();let unmatched=0;
for(const x of actuals.players){
 if(!Number.isInteger(x.gp)||!validNum(x.g)||!validNum(x.a)||x.g+x.a!==x.pts)continue;
 const link=window.BravePlayerLinks.profileUrl(x.name);
 if(!link){unmatched++;continue;}
 const id=new URL(link).searchParams.get("playerID");
 if(!id||currentByID.has(id)){unmatched++;continue;}
 currentByID.set(id,x);
}
const leadershipByID=new Map();
for(const x of tenures.items){
 const id=String(x.htoPlayerID),identity=suffix(id);
 if(!identity||identity.name!==x.player||x.status!=="SOURCE_DOCUMENTED"||!["PUBLIC_HTO_BIO","FOUNDER_CONFIRMED"].includes(x.source))continue;
 const list=leadershipByID.get(id)||[];list.push(x);leadershipByID.set(id,list);
}
const chooser=$("playerChoice");
for(const id of ids.sort((a,b)=>career.players[a].name.localeCompare(career.players[b].name))){
 const profile=career.players[id],identity=suffix(id);
 if(!identity||identity.name!==profile.name)continue;
 const opt=el("option",profile.name);opt.value=id;chooser.append(opt);
}
const params=new URLSearchParams(location.search);
const requested=params.get("playerID");
const embedded=params.get("embed")==="1";
if(embedded)document.body.classList.add("embed-mode");
if(requested&&ids.includes(requested))chooser.value=requested;
else if(requested)$('playerName').textContent='Profile not verified';
// Embedded player page has no roster chooser; user identity is determined only by verified playerID.
if(embedded&&!requested)$('playerName').textContent='Profile not verified';
let chosenSegments=[],currentPlayerID=null;
function drawBioCharts(){
 const role=Number($("roleChoice").value)||0;
 const segment=chosenSegments[role]||null;
 const filter=$("chartSeasonFilter").value;
 const result=window.BraveBioCharts?.draw($("careerCharts"),segment,{filter})||{status:"CHART_RENDERER_UNAVAILABLE",charts:0};
 $("chartSource").textContent="Historical career archive "+fmt(career.capturedAt)+" · "+(filter==="all"?"All published seasons":filter==="winter"?"Winter seasons only":"Summer seasons only")+" · Never merged with the separate "+actuals.teamGP+"-game "+actuals.season+" feed ("+fmt(actuals.asOf)+")";
 window.__bioChartStatus=result;
}
$("chartSeasonFilter").addEventListener("change",drawBioCharts);
function drawGameCharts(pid,kind,current){
 $("gameNote").textContent=kind==="goalie"?"Unrecorded goalie games are gaps, never assumed losses, wins or shutouts. Save totals and save percentages are not inferred.":"A recorded zero-point appearance differs from a game with no HTO player row. No appearance is never imputed as a zero-point game.";
 const graph=$("gameCharts");
 if(!gameFeed){
  graph.replaceChildren(makeNotice("A verified player-by-game series matching this season snapshot is unavailable."));
  $("gameSource").textContent="Game-by-game charts are held until all verified player totals reconcile with the current season feed.";
  window.__bioGameChartStatus={status:"GAME_SOURCE_HELD",charts:0};return;
 }
 const rows=gameFeed.skaters?.[String(pid)]||[];
 if(kind==="skater"&&current){
  const total={gp:rows.length,g:rows.reduce((s,r)=>s+r.g,0),a:rows.reduce((s,r)=>s+r.a,0),pts:rows.reduce((s,r)=>s+r.pts,0)};
  if(Object.keys(total).some(k=>total[k]!==current[k])){
   graph.replaceChildren(makeNotice("Game-by-game values do not reconcile with current HTO totals; trends withheld."));
   window.__bioGameChartStatus={status:"SEASON_PARITY_HOLD",charts:0};return;
  }
 }
 const result=window.BraveBioCharts?.drawGames(graph,gameFeed,pid,kind)||{status:"GAME_CHART_RENDERER_UNAVAILABLE",charts:0};
 $("gameSource").textContent=gameFeed.teamGP+" explicitly audited HTO games · source-only accepted "+fmt(gameFeed.sourceAcceptedAt)+" · Not an automatically discovered or production-published feed";
 window.__bioGameChartStatus=result;
}
function drawRole(p,roleIndex,current){
 const seg=chosenSegments[roleIndex];if(!seg)return;
 $("careerCards").replaceChildren();
 $("seasons").replaceChildren();
 const goalie=seg.kind==="goalie",total=seg.total||{},seasons=Array.isArray(seg.seasons)?seg.seasons:[];
 $("c1").textContent=goalie?"W":"G";$("c2").textContent=goalie?"L":"A";$("c3").textContent=goalie?"T":"PTS";
 const cards=goalie?[["GP",total.GP],["Wins",total.W],["Losses",total.L],["GAA",total.GAA]]:
 [["GP",total.GP],["Goals",total.G],["Assists",total.A],["Points",total.Pts]];
 for(const [key,v] of cards)if(validNum(v))$("careerCards").append(stat(key,v));
 if(!$("careerCards").children.length)$("careerCards").append(makeNotice("Published career totals are not available for this role."));
 for(const s of [...seasons].reverse()){
  const vals=goalie?[s.Season,s.GP,s.W,s.L,s.T]:[s.Season,s.GP,s.G,s.A,s.Pts];
  const tr=el("tr");for(const val of vals)tr.append(el("td",val===undefined?"—":val));$("seasons").append(tr);
 }
 if(!seasons.length){const tr=el("tr");const td=el("td","No published season breakdown.");td.colSpan=5;tr.append(td);$("seasons").append(tr);}
 const explanation=[];
 if(goalie){
  if(validNum(total.GP)&&validNum(total.W)&&validNum(total.L))explanation.push(total.W+" wins, "+total.L+" losses across "+total.GP+" published goalie appearances.");
  if(validNum(total.GAA))explanation.push("Published career goals-against average: "+total.GAA+".");
  explanation.push("No save total or save percentage is inferred from incomplete shot data.");
 }else{
  if(validNum(total.GP)&&total.GP>0&&validNum(total.Pts))explanation.push("Recorded career scoring rate: "+(total.Pts/total.GP).toFixed(2)+" points per game across "+total.GP+" appearances.");
  if(current)explanation.push("This season: "+(current.pts/current.gp).toFixed(2)+" points per game in "+current.gp+" recorded appearances (separate, newer snapshot).");
  else explanation.push("No mapped skater appearance in the latest five-game feed; that does not establish roster status.");
 }
 explanation.push("Career data include all published HTO game types and have not been recalculated using the newer season feed.");
 $("analysis").textContent=explanation.join(" ");
 drawBioCharts();
 drawGameCharts(currentPlayerID,seg.kind,current);
}
function render(pid){
 const identity=suffix(pid),p=career.players[pid];
 if(!identity||!p){$("playerName").textContent="Profile not verified";return;}
 currentPlayerID=pid;
 $("playerName").textContent=identity.name;$("playerMeta").textContent="Official HTO player ID "+pid+" · Career and development profile";
 const link=$("officialLink");link.href=window.BravePlayerLinks.profileUrl(identity.name);link.hidden=false;
 $("sourceSummary").textContent="Career snapshot "+fmt(career.capturedAt)+" · Five-game stats "+fmt(actuals.asOf)+" · ";
 const current=currentByID.get(pid);
 $("currentSection").hidden=false;$("currentCards").replaceChildren();
 if(current){
  for(const [label,v] of [["GP",current.gp],["Goals",current.g],["Assists",current.a],["Points",current.pts]])$("currentCards").append(stat(label,v));
  $("currentDate").textContent="Verified skater scoring as of "+fmt(actuals.asOf)+" · Team games "+actuals.teamGP+" · not an ice-time estimate";
 }else{
  const goalieOnly=p.segments?.some(s=>s.kind==="goalie")&&!p.segments?.some(s=>s.kind==="skater");
  $("currentCards").append(makeNotice(goalieOnly
   ?"The current public five-game player-actuals feed contains skater totals only. The private, source-only accepted goalie game observations appear below; a published current goalie season roll-up remains unavailable."
   :"No mapped skater stats in the current five-game HTO feed. This does not confirm zero career activity or inactive roster status."));
  $("currentDate").textContent="Five-game source captured "+fmt(actuals.asOf);
 }
 $("careerDate").textContent="Historical HTO archive captured "+fmt(p.capturedAt||career.capturedAt)+" · all published game types";
 $("careerNote").textContent=p.status==="VERIFIED_PROFILE_CAREER_SUM_PARITY"?"Historical archive only; may exclude newer results.":"No published career totals were available in this archived source. Missing data are not zero.";
 chosenSegments=p.status==="VERIFIED_PROFILE_CAREER_SUM_PARITY"&&Array.isArray(p.segments)?p.segments:[];
 $("chartSeasonFilter").value="all";
 $("roleChoice").replaceChildren();$("roleControls").hidden=chosenSegments.length<2;
 chosenSegments.forEach((seg,i)=>{const op=el("option",seg.kind==="goalie"?"Goaltender":"Skater");op.value=i;$("roleChoice").append(op);});
 $("roleChoice").onchange=()=>drawRole(p,Number($("roleChoice").value),current);
 if(chosenSegments.length)drawRole(p,0,current);
 else{
  $("careerCards").replaceChildren(makeNotice("Historical statistical totals unavailable."));
  $("analysis").textContent="No source-qualified career rates are available.";
  drawBioCharts();
  drawGameCharts(pid,"skater",current);
  $("seasons").replaceChildren();const tr=el("tr");const td=el("td","No published historical seasons.");td.colSpan=5;tr.append(td);$("seasons").append(tr);
 }
 $("leadership").replaceChildren();
 const rows=leadershipByID.get(pid)||[];
 if(!rows.length)$("leadership").append(makeNotice("No sourced leadership tenure currently recorded for this player."));
 else for(const x of rows){
  const entry=el("div",undefined,"entry");
  entry.append(el("div",x.text));
  entry.append(el("div","Leadership service · "+(x.source==="FOUNDER_CONFIRMED"?"Team management":"Original public HTO Bio"),"date"));
  $("leadership").append(entry);
 }
 // Keep the native HTO Bio compact: open the most relevant chart family.
 // A source-backed game series takes priority; alumni see career trends first.
 const hasCurrentGames=window.__bioGameChartStatus?.status==="GAME_ROWS_RENDERED";
 $("gameChartsDetails").open=Boolean(hasCurrentGames);
 $("seasonChartsDetails").open=!hasCurrentGames&&chosenSegments.length>0;
 $("seasonTableDetails").open=false;
}
chooser.onchange=()=>render(chooser.value);
if(chooser.value)render(chooser.value);
$("coachingState").textContent="Individual coaching assignments and reviewed video remain in the protected team area, not on this public page.";
/* Public runtime does not expose internal QA registry. */
})();