/* Brave H.C. premium homepage 2026-10-25.
   Preserves official league and source-workbook model boundaries.
   No new rate or trend formulas are introduced. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
const panel=["standings","projection","watch"].includes(params.get("panel"))?params.get("panel"):"standings";
if(params.has("full"))document.body.classList.add("full");
const $=id=>document.getElementById(id);
const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined&&value!==null)e.textContent=String(value);return e};
const set=(id,value)=>{$(id).textContent=String(value)};
const num=x=>typeof x==="number"&&Number.isFinite(x);
const todayDate=()=>{const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));return d.year+"-"+d.month+"-"+d.day+"T"+d.hour+":"+d.minute};
const dateText=stamp=>{const d=new Date(stamp);return Number.isNaN(d.getTime())?"Source date unavailable":new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",month:"short",day:"numeric",year:"numeric"}).format(d)};
const fetchJSON=async path=>{const res=await fetch("./"+path,{cache:"no-store"});if(!res.ok)throw Error(path+" HTTP "+res.status);return res.json()};
const svgNS="http://www.w3.org/2000/svg";
const svgArrow=(rotate,color)=>{const s=document.createElementNS(svgNS,"svg");s.setAttribute("viewBox","0 0 48 48");s.setAttribute("class","trend-svg");s.setAttribute("aria-hidden","true");const p=document.createElementNS(svgNS,"path");p.setAttribute("d","M18 42V19H8L24 3L40 19H30V42Z");p.setAttribute("transform","rotate("+rotate+" 24 24)");p.setAttribute("fill",color);s.append(p);return s};
const states=[
 {name:"Cold",desc:"Strong decline",rotate:180,color:"#217fd4"},
 {name:"Cool",desc:"Moderate decline",rotate:135,color:"#79bdec"},
 {name:"Neutral",desc:"Middle range",rotate:90,color:"#ffffff"},
 {name:"Warm",desc:"Moderate rise",rotate:45,color:"#dc7383"},
 {name:"Hot",desc:"Strong rise",rotate:0,color:"#f0344d"}
];
const linkAllowed=s=>/^https:\/\/leagues\.sportsvillage\.ca\//.test(s||"");
let league=null,projection=null,filter="ALL";
$("subtitle").textContent="Cristillo Division · 2026–27";
$(panel).hidden=false;
$("state").textContent=panel==="projection"?"ROSTER PROJECTION":panel==="standings"?"DIVISION CENTRE":"TEAM NEWS";
function makeTD(value,className,label){
 const td=node("td",className,value);if(label)td.dataset.label=label;return td;
}
function recordLabel(t){return t.w+"–"+t.l+"–"+t.t}
function metric(n){return num(n)?n.toFixed(2):"—"}
function labelPercent(t){return t.gp>0?(100*t.w/t.gp).toFixed(1)+"%":"—"} // requested WIN%, not half-tie point%
function setTab(which){
 const standings=which==="standings";
 $("standing-view").hidden=!standings;$("intel-view").hidden=standings;
 $("tab-standing").setAttribute("aria-selected",String(standings));
 $("tab-intel").setAttribute("aria-selected",String(!standings));
}
$("tab-standing").addEventListener("click",()=>setTab("standings"));
$("tab-intel").addEventListener("click",()=>setTab("intel"));
async function loadStandings(){
 try{
  const d=await fetchJSON("standings.json");
  if(d.schema!=="brave-hc-svhl-standings/v1"||!Array.isArray(d.teams)||d.teams.length<2)throw Error("Unexpected league feed");
  league=d;
  set("standing-date",dateText(d.capturedAt));set("standings-source","SVHL league standings · "+dateText(d.capturedAt));
  if(linkAllowed(d.source))$("standings-link").href=d.source;
  const body=$("standings-rows");body.replaceChildren();
  d.teams.forEach((t,i)=>{
   const row=node("tr",t.name===d.team?"braves":"");
   const name=makeTD(null,"team","Team");
   name.append(node("span","rank",i+1+". "),node("span","",t.name));
   row.append(name);
   [["GP",t.gp],["W",t.w],["L",t.l],["T",t.t],["PTS",t.pts],["GF",t.gf],["GA",t.ga],["WIN%",labelPercent(t)]].forEach(([head,val])=>row.append(makeTD(val,head==="PTS"?"points":head==="WIN%"?"pct":"",head)));
   body.append(row);
  });
  const braves=d.teams.find(t=>t.name===d.team);
  if(!braves)throw Error("Braves row missing");
  set("standings-note","Complete official division table · "+d.teams.length+" teams · wins divided by games played.");
  const select=$("opponent");select.replaceChildren();
  d.teams.filter(t=>t.name!==d.team).forEach(t=>{const o=node("option","",t.name);o.value=t.name;select.append(o)});
  let games=[];
  try{const schedule=await fetchJSON("svhl-upcoming.json");if(schedule.schema==="brave-hc-svhl-schedule/v1"&&Array.isArray(schedule.games))games=schedule.games;}catch(_ignored){}
  const upcoming=games.filter(g=>g.date+"T"+g.time>=todayDate()).sort((a,b)=>(a.date+"T"+a.time).localeCompare(b.date+"T"+b.time));
  let approved=null;
  const next=upcoming.find(g=>d.teams.some(t=>t.name===g.opponent));
  if(next)select.value=next.opponent;
  function updateOpponent(){
   const o=d.teams.find(t=>t.name===select.value);if(!o)return;
   set("intel-team",o.name);
   const upcomingGame=upcoming.find(g=>g.opponent===o.name);
   const gameTime=upcomingGame?upcomingGame.time.split(":"):null;
   const friendlyTime=gameTime?((Number(gameTime[0])%12)||12)+":"+gameTime[1]+(Number(gameTime[0])>=12?" PM":" AM"):"";
   set("intel-next",upcomingGame?"Upcoming: "+dateText(upcomingGame.date+"T12:00:00Z")+" · "+friendlyTime+" · "+upcomingGame.rink:"No confirmed upcoming fixture in saved schedule");
   set("opponent-date",dateText(d.capturedAt));
   const grid=$("intel-metrics");grid.replaceChildren();
   [["RECORD",recordLabel(o)],["POINTS",o.pts],["GOALS / GAME",metric(o.gp?o.gf/o.gp:NaN)],["GOALS AGAINST / GAME",metric(o.gp?o.ga/o.gp:NaN)]].forEach(([label,value])=>{
    const tile=node("div","metricbox");
    tile.append(node("div","number",value),node("div","label",label));grid.append(tile);
   });
   const comp=$("intel-comparison");comp.replaceChildren();
   const compare=[["GF/GP",braves.gp?braves.gf/braves.gp:NaN,o.gp?o.gf/o.gp:NaN],["GA/GP",braves.gp?braves.ga/braves.gp:NaN,o.gp?o.ga/o.gp:NaN],["WIN%",braves.gp?100*braves.w/braves.gp:NaN,o.gp?100*o.w/o.gp:NaN]];
   compare.forEach(([label,b,v])=>{
    const box=node("div","");
    box.append(node("div","muted",label),node("strong","",label==="WIN%"?(num(b)?b.toFixed(0)+"%":"—")+" / "+(num(v)?v.toFixed(0)+"%":"—"):metric(b)+" / "+metric(v)),node("div","muted","Braves / Opponent"));comp.append(box);
   });
   const h2h=approved?.editorialState==="FOUNDER_APPROVED"&&approved.gamePreview?.editorialState==="FOUNDER_APPROVED"&&approved.gamePreview.opponent===o.name?approved.gamePreview.headToHead:null;
   const h2hSection=$("headtohead-section"),h2hTarget=$("headtohead");h2hTarget.replaceChildren();h2hSection.hidden=!h2h;
   if(h2h){[["REGULAR SEASON",h2h.regularSeason],["ALL MEETINGS",h2h.allTime],["PLAYOFFS",h2h.playoffs]].forEach(([label,r])=>{if(!r)return;const el=node("div");el.append(node("div","muted",label),node("strong","",recordLabel(r)),node("div","muted",r.gp+" GP · "+r.gf+" GF · "+r.ga+" GA"));h2hTarget.append(el)});}
   set("intel-note","League comparison: "+dateText(d.capturedAt)+". "+(h2h?"Head-to-head: founder-approved HTO game preview.":"Head-to-head withheld until independently verified.")+" Private scouting notes and unverified opponent rosters are not published.");
  }
  select.addEventListener("change",updateOpponent);updateOpponent();
  // Editorial verification provides a newer Braves result, not an amendment to the official league table.
  try{
   const article=await fetchJSON("hot-stove-approved.json"),actualGP=Number(article.season?.gp);
   approved=article;updateOpponent();
   if(article.editorialState==="FOUNDER_APPROVED"&&actualGP>braves.gp){
    set("standings-note","Official SVHL table: Braves "+braves.gp+" GP. Approved Hot Stove result: "+actualGP+" GP. The league posting has not yet caught up; rankings below remain SVHL's published standings.");
   }
  }catch(_ignored){}
 }catch(err){set("standings-note","Unable to validate division standings. Please use the official SVHL source. ("+err.message+")");$("tab-intel").disabled=true;}
}
function trendState(p,cf){
 if(p.trendInputs?.firstSeasonOrNoCareer)return{new:true,label:"NEW · no established comparable career average"};
 const t=p.trend,th=cf?.arrowIconSet?.thresholds;
 if(!num(t)||!th||!["AB100","AB99","AB97","AB96"].every(k=>num(th[k])))return{new:true,label:"— · verified trend unavailable"};
 const idx=t<th.AB100?0:t<th.AB99?1:t<th.AB97?2:t<th.AB96?3:4;
 return{...states[idx],label:states[idx].name+" · "+states[idx].desc,value:t};
}
function projectedCell(amount,actual,decimals=0){
 const td=node("td");
 td.append(node("span","total",num(amount)?(decimals?amount.toFixed(decimals):String(amount)):"—"));
 if(num(actual))td.append(node("span","actual","("+actual+")"));
 return td;
}
function cleanName(s){return typeof s==="string"&&s.startsWith("Unknown,")?"Unverified roster entry":(String(s).includes(",")?s.split(",").slice(1).join(",").trim()+" "+s.split(",")[0].trim():String(s))}
function drawProjection(){
 if(!projection)return;
 const table=$("projection-rows");table.replaceChildren();
 const players=projection.players.filter(p=>filter==="ALL"||p.rosterStatus===filter)
   .slice().sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)||(Number(b.g)||0)-(Number(a.g)||0)||String(a.name).localeCompare(String(b.name)));
 players.forEach((p,i)=>{
  const tr=node("tr");const name=node("td","team player");
  name.append(node("span","name",cleanName(p.name)));
  name.append(node("span","role",p.rosterStatus+" · #"+(p.number||"—")));
  tr.append(name);
  const ptsActual=num(p.currentPts)?p.currentPts:num(p.currentG)&&num(p.currentA)?p.currentG+p.currentA:null;
  tr.append(projectedCell(p.gp,p.currentGP,1),projectedCell(p.g,p.currentG),projectedCell(p.a,p.currentA),projectedCell(p.pts,ptsActual));
  tr.append(makeTD(num(p.ptsPerGame)?p.ptsPerGame.toFixed(2):"—","rate","P/G"));
  const state=trendState(p,projection.conditionalFormatting);
  const trendTD=node("td");
  const button=node("button","trend-button");button.type="button";
  button.setAttribute("aria-expanded","false");
  const detailId="proj-detail-"+i;button.setAttribute("aria-controls",detailId);
  const career=p.trendInputs?.careerScoringRate,projected=p.trendInputs?.projectedScoringRate;
  const details=node("tr","details");details.id=detailId;details.hidden=true;
  const detailTD=node("td");detailTD.colSpan=7;
  const baselineText=num(career)?career.toFixed(3):"unavailable";
  const modelRate=num(projected)?projected.toFixed(3):"unavailable";
  const diffText=num(p.trend)?(p.trend>0?"+":"")+(p.trend*100).toFixed(1)+"%":"unavailable";
  detailTD.textContent="Workbook trend: "+state.label.replace(/ ·.*/,"")+". Historical career RS rate: "+baselineText+" P/G; model scoring-rate component: "+modelRate+" P/G; workbook trend: "+diffText+". Displayed projected P/G: "+(num(p.ptsPerGame)?p.ptsPerGame.toFixed(3):"—")+". Rates may differ because the workbook retains its established trend formula.";
  details.append(detailTD);
  if(state.new){button.append(node("span","new",state.label.startsWith("NEW")?"NEW":"—"))}
  else button.append(svgArrow(state.rotate,state.color));
  button.title=state.label+(num(state.value)?" · workbook "+diffText:"");
  button.setAttribute("aria-label",cleanName(p.name)+": "+button.title+". Show model comparison");
  button.addEventListener("click",()=>{details.hidden=!details.hidden;button.setAttribute("aria-expanded",String(!details.hidden))});
  trendTD.append(button);tr.append(trendTD);table.append(tr,details);
 });
 document.querySelectorAll("[data-group]").forEach(b=>{const active=b.dataset.group===filter;b.setAttribute("aria-pressed",String(active));b.textContent=({ALL:"All Players",FT:"Full-Time",CU:"Call-Ups",DI:"Drop-Ins"})[b.dataset.group]+(active?" ("+players.length+")":"")});
}
document.querySelectorAll("[data-group]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.group;drawProjection()}));
function drawLegend(){
 const box=$("trend-legend");box.replaceChildren();
 states.slice().reverse().forEach(t=>{const item=node("span");item.append(svgArrow(t.rotate,t.color),node("span","",t.name));box.append(item)});
 box.append(node("span","","NEW · No comparable career data"));
}
async function loadProjection(){
 try{
  const d=await fetchJSON("projection.json");
  if(d.schema!=="brave-hc-workbook-projection/v1"||!Array.isArray(d.players)||!d.conditionalFormatting?.arrowIconSet?.thresholds)throw Error("Workbook data contract invalid");
  projection=d;
  const sourceGames=d.sourceInputs?.verifiedHTOBoxscoreGP;
  set("proj-games",num(sourceGames)?sourceGames:"—");
  set("proj-total",num(d.total?.points)?d.total.points+" PTS":"—");
  set("projection-state",d.modelCurrent===true?"MODEL RECONCILED":"SCENARIO · PARITY PENDING");
  const date=dateText(d.htoreadback||d.exportedAt);
  set("projection-note",d.modelCurrent===true?"Workbook projections reconciled to official HTO actuals.":"Projection feed reflects "+sourceGames+" HTO games at "+date+". Workbook baseline: "+(d.sourceInputs?.workbookRecordedTeamGP??"—")+" game(s). Projections are unreconciled scenarios; actuals may now be higher.");
  set("projection-source","Source: HTO model readback "+date+" · Master Workbook trend thresholds preserved. "+d.players.length+" player rows.");
  drawLegend();drawProjection();
 }catch(e){set("projection-note","Projection data could not be validated. No replacement estimates or trend arrows have been invented. ("+e.message+")");}
}
if(panel==="standings")loadStandings();
if(panel==="projection")loadProjection();
})();