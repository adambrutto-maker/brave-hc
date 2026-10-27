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
const params=new URLSearchParams(location.search);
const requested=params.get("playerID");
const embedded=params.get("embed")==="1";
if(embedded)document.body.classList.add("embed-mode");
const showState=(message,retry=false)=>{$("loadState").textContent=message;$("loadState").hidden=!message;$("retryLoad").hidden=!retry;};
$("retryLoad").onclick=()=>location.reload();
if((requested&&(!/^\d+$/.test(requested)||String(Number(requested))!==requested||!suffix(requested)))||(embedded&&!requested)){
 $("playerName").textContent="Player not found";
 showState("This profile link does not identify a verified Brave H.C. player. Open the player's Bio from the official HTO roster.");
 return;
}
if(requested)$("playerName").textContent=suffix(requested).name;
const fetchJSON=async name=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const r=await fetch("./"+name,{cache:"no-store",signal:controller.signal});if(!r.ok)throw Error(name+" unavailable");return await r.json();}
 finally{clearTimeout(timer);}
};
let career,actuals,tenures,gameFeed=null,leadershipAvailable=false;
try{
 const results=await Promise.allSettled([
 fetchJSON("player-career-insights.json"),fetchJSON("player-actuals.json"),fetchJSON("player-bio-leadership.json")]);
 career=results[0].status==="fulfilled"?results[0].value:null;
 if(career?.schema!=="brave-hc-player-career-insights/v1"||career.sourceAuthority!=="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK"||!career.players)throw Error("Career source invalid");
 const entries=Object.entries(career.players);
 const validProfile=([id,p])=>{
  if(!suffix(id)||suffix(id).name!==p?.name)return false;
  if(p.status==="NO_PUBLISHED_STATS")return Array.isArray(p.segments)&&p.segments.length===0;
  if(p.status!=="VERIFIED_PROFILE_CAREER_SUM_PARITY")return false;
  return Array.isArray(p.segments)&&p.segments.every(segment=>
   segment&&["skater","goalie"].includes(segment.kind)&&Array.isArray(segment.seasons)&&
   segment.seasons.every(row=>row&&typeof row.Season==="string"));
 };
 if(entries.length!==109||window.BravePlayerLinks?.knownPlayers!==109||!entries.every(validProfile))throw Error("Identity registry mismatch");
 const season=results[1].status==="fulfilled"?results[1].value:null;
 actuals=season?.schema==="brave-hc-hto-player-actuals/v1"&&season.status==="VERIFIED_HTO_CURRENT"&&season.teamGP===5&&Array.isArray(season.players)?season:null;
 const candidate=results[2].status==="fulfilled"?results[2].value:null;
 leadershipAvailable=candidate?.schema==="brave-hc-bio-public-leadership/v1"&&candidate.status==="PUBLIC_BIO_SOURCE_AND_FOUNDER_CONFIRMED"&&Array.isArray(candidate.items)&&candidate.items.every(x=>x&&suffix(x.htoPlayerID)?.name===x.player&&typeof x.text==="string"&&x.status==="SOURCE_DOCUMENTED"&&["PUBLIC_HTO_BIO","FOUNDER_CONFIRMED"].includes(x.source))&&new Set(candidate.items.map(x=>x.htoPlayerID+":"+x.text)).size===candidate.items.length;
 tenures=leadershipAvailable?candidate:{items:[]};
}catch(e){
 showState("This player profile could not load its verified statistics. Please try again.",true);
 return;
}
const ids=Object.keys(career.players);
const currentByID=new Map();let unmatched=0;
for(const x of actuals?.players||[]){
 if(!x||!Number.isInteger(x.gp)||x.gp<=0||x.gp>actuals.teamGP||!validNum(x.g)||!validNum(x.a)||x.g+x.a!==x.pts)continue;
 const link=window.BravePlayerLinks.profileUrl(x.name);
 if(!link){unmatched++;continue;}
 const id=new URL(link).searchParams.get("playerID");
 if(!id||currentByID.has(id)){unmatched++;continue;}
 currentByID.set(id,x);
}
const leadershipByID=new Map();
for(const x of tenures.items){
 const id=String(x.htoPlayerID),identity=suffix(id);
 if(!identity||identity.name!==x.player||typeof x.text!=="string"||x.status!=="SOURCE_DOCUMENTED"||!["PUBLIC_HTO_BIO","FOUNDER_CONFIRMED"].includes(x.source))continue;
 const list=leadershipByID.get(id)||[];list.push(x);leadershipByID.set(id,list);
}
const chooser=$("playerChoice");
for(const id of ids.sort((a,b)=>career.players[a].name.localeCompare(career.players[b].name))){
 const profile=career.players[id],identity=suffix(id);
 if(!identity||identity.name!==profile.name)continue;
 const opt=el("option",profile.name);opt.value=id;chooser.append(opt);
}
if(requested)chooser.value=requested;
let chosenSegments=[],currentPlayerID=null;
function drawBioCharts(){
 const role=Number($("roleChoice").value)||0;
 const segment=chosenSegments[role]||null;
 const filter=$("chartSeasonFilter").value;
 const result=window.BraveBioCharts?.draw($("careerCharts"),segment,{filter})||{status:"CHART_RENDERER_UNAVAILABLE",charts:0};
 $("chartSource").textContent="Historical career archive "+fmt(career.capturedAt)+" · "+(filter==="all"?"All published seasons":filter==="winter"?"Winter seasons only":"Summer seasons only")+" · Missing values are not zero";
 window.__bioChartStatus=result;
}
$("chartSeasonFilter").addEventListener("change",drawBioCharts);
function drawGameCharts(pid,kind,current){
 $("gameNote").textContent=kind==="goalie"?"Unrecorded goalie games are gaps, never assumed losses, wins or shutouts. Save totals and save percentages are not inferred.":"A recorded zero-point appearance differs from a game with no HTO player row. No appearance is never imputed as a zero-point game.";
 const graph=$("gameCharts");
 if(!gameFeed){
  $("gameTrendsSection").hidden=true;
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
  if(current&&current.gp>0)explanation.push("This season: "+(current.pts/current.gp).toFixed(2)+" points per game in "+current.gp+" recorded appearances (separate, newer snapshot).");
  else explanation.push("Current-season scoring is unavailable for this role. This does not establish roster status.");
 }
 if(!goalie){
  const complete=seasons.filter(s=>validNum(s.Pts));
  if(complete.length){const high=Math.max(...complete.map(s=>s.Pts));const tied=complete.filter(s=>s.Pts===high).map(s=>s.Season);explanation.push("Highest recorded season points: "+high+" ("+tied.join(", ")+").");}
 }
 $("analysis").textContent=explanation.join(" ");
 drawBioCharts();
 drawGameCharts(currentPlayerID,seg.kind,current);
}
function render(pid){
 const identity=suffix(pid),p=career.players[pid];
 if(!identity||!p){$("playerName").textContent="Profile not verified";return;}
 currentPlayerID=pid;
 $("playerName").textContent=identity.name;$("playerMeta").textContent="Season statistics · Career history · Team service";
 const link=$("officialLink");link.href=window.BravePlayerLinks.profileUrl(identity.name);link.hidden=false;
 $("sourceSummary").textContent="HTO career archive · "+fmt(career.capturedAt)+" · ";
 $("sourceDetail").textContent="Career archive: "+fmt(career.capturedAt)+(actuals?". Season snapshot: "+fmt(actuals.asOf)+" ("+actuals.teamGP+" team games).":". Current-season source temporarily unavailable.");
 const current=currentByID.get(pid);
 $("currentSection").hidden=false;$("currentCards").replaceChildren();
 if(current){
  for(const [label,v] of [["GP",current.gp],["Goals",current.g],["Assists",current.a],["Points",current.pts]])$("currentCards").append(stat(label,v));
  $("currentDate").textContent="As of "+fmt(actuals.asOf)+" · "+actuals.teamGP+" team games";
 }else{
  const goalieOnly=p.segments?.some(s=>s.kind==="goalie")&&!p.segments?.some(s=>s.kind==="skater");
  $("currentCards").append(makeNotice(goalieOnly
   ?"Current-season goalie totals are not available in this source. Recorded goalie career statistics are shown below."
   :"No verified current-season scoring is available for this player. This does not indicate whether the player is active or inactive."));
  $("currentDate").textContent=actuals?"Season snapshot · "+fmt(actuals.asOf):"Season source temporarily unavailable";
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
 $("leadershipSection").hidden=leadershipAvailable&&!rows.length;
 document.querySelector('a[href="#leadershipSection"]').hidden=$("leadershipSection").hidden;
 if(!leadershipAvailable)$("leadership").append(makeNotice("Leadership history is temporarily unavailable. Please try again later."));
 else for(const x of rows){
  const entry=el("div",undefined,"entry");
  entry.append(el("div",x.text));

  $("leadership").append(entry);
 }
 // Keep the overview compact. Charts remain available through navigation and disclosure controls.
 const hasCurrentGames=window.__bioGameChartStatus?.status==="GAME_ROWS_RENDERED";
 $("gameChartsDetails").open=Boolean(hasCurrentGames);
 $("seasonChartsDetails").open=false;
 $("seasonTableDetails").open=false;
 $("profileContent").hidden=false;$("profileNav").hidden=false;
 showState(actuals?"":"Current-season statistics are temporarily unavailable. Career history remains available.",!actuals);
 document.title=identity.name+" · Brave H.C. Player Bio";
}
chooser.onchange=()=>{
 if(!chooser.value){const url=new URL(location.href);url.searchParams.delete("playerID");history.replaceState(null,"",url);$("profileContent").hidden=true;$("profileNav").hidden=true;$("officialLink").hidden=true;$("playerName").textContent="Player Bio";$("sourceSummary").textContent="Official HTO player profiles";document.title="Brave H.C. · Player Bio";showState("Choose a player to view their profile.");return;}
 const url=new URL(location.href);url.searchParams.set("playerID",chooser.value);history.replaceState(null,"",url);render(chooser.value);
};
$("profileNav").addEventListener("click",event=>{
 const a=event.target.closest("a");if(!a)return;
 const section=document.querySelector(a.getAttribute("href"));
 const detail=section?.querySelector("details");if(detail)detail.open=true;
});
if(chooser.value)render(chooser.value);else showState("Choose a player to view their profile.");
$("coachingState").textContent="Personal coaching notes and video are not published on this public profile.";
/* Public runtime does not expose internal QA registry. */
})();
