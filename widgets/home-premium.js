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
// Homepage trend icons reuse the source-verified Bio SVG renderer. Workbook five
 // category thresholds are unchanged; seven names describe visual intensity.
const states=[
 {name:"Cold",desc:"Strong decline",rotate:180,color:"#217fd4"},
 {name:"Cool",desc:"Moderate decline",rotate:135,color:"#79bdec"},
 {name:"Neutral",desc:"Middle range",rotate:90,color:"#ffffff"},
 {name:"Warm",desc:"Moderate rise",rotate:45,color:"#dc7383"},
 {name:"Hot",desc:"Strong rise",rotate:0,color:"#f0344d"}
];
const linkAllowed=s=>/^https:\/\/leagues\.sportsvillage\.ca\//.test(s||"");
let league=null,projection=null,dispersion=null,latestHTOActuals=null,filter="ALL",standingsPage=0,projectionPage=0;
const isFull=()=>params.has("full");
const pageSize=kind=>9999; // all rows are visible in an independently scrollable iframe shell
function pager(id,total,size,page,onChange){
 const el=$(id);el.replaceChildren();
 if(total<=size){el.hidden=true;return;}
 el.hidden=false;
 const prev=node("button","", "Previous");prev.type="button";prev.disabled=page===0;
 const next=node("button","", "Next");next.type="button";next.disabled=(page+1)*size>=total;
 const range=node("strong","", (page*size+1)+"–"+Math.min(total,(page+1)*size)+" of "+total);
 prev.addEventListener("click",()=>onChange(page-1));next.addEventListener("click",()=>onChange(page+1));
 const full=node("a","", "View all");full.href="./home-panels.html?panel="+(id.startsWith("standing")?"standings":"projection")+"&full=1";
 full.target="_blank";full.rel="noopener noreferrer";
 el.append(prev,range,next,full);
}
$("subtitle").textContent="Cristillo Division · 2026–27";
$(panel).hidden=false;
$("state").textContent=panel==="projection"?"ROSTER PROJECTION":panel==="standings"?"DIVISION CENTRE":"TEAM NEWS";
function makeTD(value,className,label){
 const td=node("td",className,value);if(label)td.dataset.label=label;return td;
}
function recordLabel(t){return t.w+"–"+t.l+"–"+t.t}
function metric(n){return num(n)?n.toFixed(2):"—"}
function labelPercent(t){return t.gp>0?(t.w/t.gp).toFixed(3).replace(/^0(?=\.)/,""):"—"} // WIN% is W/GP to three decimals
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
  const body=$("standings-rows");
  let qualifiedOpponentFeed=null;
  function drawStandingPage(){
   const size=pageSize("standings"),start=standingsPage*size;body.replaceChildren();
   d.teams.slice(start,start+size).forEach((t,i)=>{
   const row=node("tr",t.name===d.team?"braves":"");
   const name=makeTD(null,"team","Team");
   const alias=qualifiedOpponentFeed?.teams.find(x=>x.name===t.name);
   const publicName=t.name===d.team?"Brave H.C.":(alias?.canonicalName||t.name);
   const nameSpan=node("span","",publicName);
   if(publicName!==t.name)nameSpan.title="SVHL lists: "+t.name;
   name.append(node("span","rank",start+i+1+". "),nameSpan);
   row.append(name);
   [["GP",t.gp],["W",t.w],["L",t.l],["T",t.t],["PTS",t.pts],["GF",t.gf],["GA",t.ga],["WIN%",labelPercent(t)]].forEach(([head,val])=>row.append(makeTD(val,head==="PTS"?"points":head==="WIN%"?"pct":"",head)));
   body.append(row);
   });
   pager("standings-pager",d.teams.length,size,standingsPage,n=>{standingsPage=n;drawStandingPage()});
  }
  drawStandingPage();
  const braves=d.teams.find(t=>t.name===d.team);
  if(!braves)throw Error("Braves row missing");
  set("standings-note","Complete official division table · "+d.teams.length+" teams · wins divided by games played.");
  const select=$("opponent");select.replaceChildren();
  d.teams.filter(t=>t.name!==d.team).forEach(t=>{const o=node("option","",t.name);o.value=t.name;select.append(o)});
  let games=[];
  try{const schedule=await fetchJSON("svhl-upcoming.json");if(schedule.schema==="brave-hc-svhl-schedule/v1"&&Array.isArray(schedule.games))games=schedule.games;}catch(_ignored){}
  const upcoming=games.filter(g=>g.date+"T"+g.time>=todayDate()).sort((a,b)=>(a.date+"T"+a.time).localeCompare(b.date+"T"+b.time));
  let approved=null,verifiedSameGames=new Map();
  // Release-gated optional source. An absent, stale or review-only feed must
  // never unlock unverified matchup statistics.
  try{
    const candidate=await fetchJSON("opponent-intelligence.json");
    const stamp=new Date(candidate.asOf),age=Date.now()-stamp.getTime();
    if(candidate.schema==="brave-hc-opponent-intelligence/v1" &&
       ["PUBLIC_VERIFIED_EXACT_ONLY","PUBLIC_VERIFIED_SOURCE_IDENTITY"].includes(candidate.status) && candidate.publishable===true &&
       candidate.coverage?.currentSeasonGames>=5 && Array.isArray(candidate.teams) &&
       candidate.coverage?.currentDivisionOpponents===7 &&
       candidate.teams.length===7+(candidate.coverage?.seasonOpponentArchives||0) &&
       candidate.teams.length<=7+Math.min(24,candidate.coverage.currentSeasonGames) &&
       d.teams.filter(t=>t.name!==d.team).every(t=>candidate.teams.some(x=>x.name===t.name && x.membershipStatus==="CURRENT_DIVISION")) &&
       candidate.teams.filter(x=>x.membershipStatus==="SEASON_OPPONENT_ARCHIVE").length===(candidate.coverage?.seasonOpponentArchives||0) &&
       Number.isFinite(age) && age>=0 &&
       age<=10*24*60*60*1000 && new Set(candidate.teams.map(t=>t.name)).size===candidate.teams.length){
       qualifiedOpponentFeed=candidate;
       drawStandingPage();
       for(const option of select.options){
         const identity=candidate.teams.find(x=>x.name===option.value);
         if(identity?.canonicalName)option.textContent=identity.canonicalName+" (SVHL: "+option.value+")";
       }
       for(const archive of candidate.teams.filter(x=>x.membershipStatus==="SEASON_OPPONENT_ARCHIVE")){
         const opt=node("option","", (archive.canonicalName||archive.name)+" · 2026–27 past opponent");
         opt.value=archive.name;
         select.append(opt);
       }
    }
  }catch(_notReleased){}
  // Narrow official-game bridge: distinct SVHL/HTO display names refer to the
  // SAME verified 2026/27 completed game, not necessarily the full franchise.
  try{
    const proof=await fetchJSON("current-opponent-identity-bridges.json");
    if(proof.schema==="brave-hc-2026-single-game-identity-proof/v1" &&
       proof.status==="OFFICIAL_SAME_GAME_PROOF_VERIFIED" &&
       proof.franchiseHistoryMerged===false && Array.isArray(proof.sameGamePairs) &&
       proof.sameGamePairs.length===2 &&
       proof.sameGamePairs.every(g=>g.scope==="THIS_COMPLETED_GAME_ONLY" &&
         g.historicalFranchiseMergeAuthorized===false &&
         ["W","L","T"].includes(g.result) && num(g.bravesGoals)&&num(g.opponentGoals) &&
         /^https:\/\/leagues\.sportsvillage\.ca\/TeamInfo\.aspx\?/.test(g.svhlSource||"") &&
         /^https:\/\/www\.htosports\.com\/teams\/default\.asp\?/.test(g.htoSource||"")) &&
       new Set(proof.sameGamePairs.map(g=>g.divisionName)).size===2){
      verifiedSameGames=new Map(proof.sameGamePairs.map(g=>[g.divisionName,g]));
    }
  }catch(_noApprovedSameGameSource){}
  const next=upcoming.find(g=>d.teams.some(t=>t.name===g.opponent));
  if(next)select.value=next.opponent;
  function updateOpponent(){
    const entry=qualifiedOpponentFeed?.teams.find(t=>t.name===select.value);
    const o=d.teams.find(t=>t.name===select.value) ||
      (entry?.membershipStatus==="SEASON_OPPONENT_ARCHIVE"?{name:entry.name}:null);
    if(!o)return;
    const nextGame=upcoming.find(g=>g.opponent===o.name);
    const gameTime=nextGame?.time?nextGame.time.split(":"):null;
    const formattedTime=gameTime?((Number(gameTime[0])%12)||12)+":"+gameTime[1]+(Number(gameTime[0])>=12?" PM":" AM"):"";
    set("intel-team",entry?.canonicalName||o.name);
    set("intel-next",entry?.membershipStatus==="SEASON_OPPONENT_ARCHIVE"?"2026–27 completed opponent · not in current Cristillo Division":nextGame?"Upcoming: "+nextGame.date+" · "+formattedTime+" · "+(nextGame.rink||"Venue pending"):"No confirmed future fixture in saved HTO schedule");
    $("intel-comparison").replaceChildren();
    $("intel-comparison").parentElement.hidden=true;
    const grid=$("intel-metrics");grid.replaceChildren();
    const h2h=$("headtohead"),section=$("headtohead-section");
    h2h.replaceChildren();section.hidden=true;
    if(!entry || !["VERIFIED_EXACT_NAME","VERIFIED_HISTORICAL_NAME_VARIANT","VERIFIED_CURRENT_NAME_ALIAS_ONLY"].includes(entry.verification)){
      set("opponent-date","HISTORY ON HOLD");
      const gate=node("div","intel-gate");
      const reason=entry?.verification==="ALIAS_REVIEW_REQUIRED"?
        "This opponent has an unreviewed name/identity alias in the Master Workbook. Historical records must not be merged by guess.":
        entry?.verification==="NO_EXACT_HISTORY"?
        "No completed matchup is confirmed under this exact opponent name in the accepted Master Workbook and official HTO records.":
        "The official-source opponent intelligence feed is not yet released, is stale, or did not pass the verification contract.";
      gate.append(node("strong","","Historical identity verification"),
                  node("p","",reason),
                  node("p","","No zero-game historical record or unsupported scouting claims have been substituted."));
      const sameGame=entry?.verification==="ALIAS_REVIEW_REQUIRED"?verifiedSameGames.get(o.name):null;
      if(sameGame){
        const line=node("p","verified-single-game",
          "VERIFIED 2026–27 MEETING · "+dateText(sameGame.date)+
          " · Braves "+sameGame.result+" "+sameGame.bravesGoals+"–"+sameGame.opponentGoals+
          " · HTO name: "+sameGame.htoRecordedOpponent);
        gate.append(line,node("p","",
          "This official game is matched across SVHL and HTO. Earlier franchise history remains unmerged."));
        const links=node("div","same-game-links");
        const a=node("a","","SVHL team record");a.href=sameGame.svhlSource;
        const b=node("a","","Official HTO boxscore");b.href=sameGame.htoSource;
        for(const item of [a,b]){item.target="_blank";item.rel="noopener noreferrer";links.append(item)}
        gate.append(links);
      }
      grid.append(gate);
      set("intel-note",sameGame?"One 2026–27 meeting is source-verified; historical franchise identity remains withheld.":"Source-gated: completed game history is withheld until released from the verified HockeyOS ledger.");
      return;
    }
    const stats=entry.regularSeason,all=entry.allTime,play=entry.playoffs;
    if(!stats||!all||!play)return;
    set("opponent-date","BRAVE H.C. + HTO · "+dateText(qualifiedOpponentFeed.asOf));
    [["REGULAR SEASON",stats.w+"–"+stats.l+"–"+stats.t],
     ["GOALS FOR",stats.gf],["GOALS AGAINST",stats.ga],
     ["ALL-TIME RECORD",all.w+"–"+all.l+"–"+all.t]].forEach(([label,value])=>{
      const card=node("div","metricbox");
      card.append(node("div","number",value),node("div","label",label));grid.append(card);
    });
    section.hidden=false;
    [["REGULAR SEASON",stats],["ALL MEETINGS",all],["PLAYOFFS",play]].forEach(([label,value])=>{
      const card=node("div");
      card.append(node("div","muted",label),
                  node("strong","",value.w+"–"+value.l+"–"+value.t),
                  node("div","muted",value.gp+" GP · "+value.gf+" GF · "+value.ga+" GA"));
      h2h.append(card);
    });
    const last=Array.isArray(entry.lastFive)?entry.lastFive.slice(-3).reverse():[];
    const recent=last.map(g=>g.date+" "+g.result+" "+g.gf+"–"+g.ga).join(" · ");
    const scopeMessage=entry.notice||"Verified exact-name Brave H.C. match history.";
    if(entry.canonicalName && entry.leagueDisplayAlias){
      const provenance=node("div","intel-gate");
      provenance.append(node("strong","",scopeMessage),
        node("p","","HTO / workbook: "+entry.canonicalName+" · SVHL listing: "+entry.leagueDisplayAlias));
      if(entry.sourceLinks?.svhl && entry.sourceLinks?.hto){
        const links=node("div","same-game-links");
        for(const [label,url] of [["League fixture",entry.sourceLinks.svhl],["Official HTO boxscore",entry.sourceLinks.hto]]){
          const a=node("a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";links.append(a);
        }
        provenance.append(links);
      }
      grid.append(provenance);
    }
    set("intel-note",scopeMessage+" "+(recent?"Recent recorded meetings: "+recent+". ":"")+
       "Source current through "+dateText(qualifiedOpponentFeed.asOf)+".");
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
function sharedTrendBadge(p){
 const engine=window.HockeyOSAdaptiveTrendV365,visual=window.HockeyOSBioTrendVisualV36;
 if(!engine)return null;
 const reading=engine.classify(p,projection,dispersion);
 if(reading.status==='ROOKIE')return engine.rookieBadge(document,visual);
 if(reading.status!=='VERIFIED')return null;
 const badge=engine.badge(document,reading,visual,'PROJECTION');
 if(badge){
  badge.dataset.sourceTrend=String(p.trend);
  badge.dataset.workbookCategory=trendState(p,projection.conditionalFormatting).name||'HELD';
 }
 return badge;
}
function projectedCell(amount,actual,decimals=0,unreported=false){
 const td=node("td");
 td.append(node("span","total",num(amount)?(decimals?amount.toFixed(decimals):String(amount)):"—"));
 if(num(actual))td.append(node("span","actual","("+actual+")"));
 else if(unreported)td.append(node("span","actual","(—)"));
 return td;
}
function cleanName(s){return typeof s==="string"&&s.startsWith("Unknown,")?"Unverified roster entry":(String(s).includes(",")?s.split(",").slice(1).join(",").trim()+" "+s.split(",")[0].trim():String(s))}
function drawProjection(){
 if(!projection)return;
 const table=$("projection-rows");table.replaceChildren();
 const players=projection.players.filter(p=>filter==="ALL"||p.rosterStatus===filter)
   .slice().sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)||(Number(b.g)||0)-(Number(a.g)||0)||String(a.name).localeCompare(String(b.name)));
 const size=pageSize("projection"),start=projectionPage*size;
 players.slice(start,start+size).forEach((p,i)=>{
  const tr=node("tr");const name=node("td","team player");
  name.append(node("span","name",cleanName(p.name)));
  name.append(node("span","role",p.rosterStatus+" · #"+(p.number||"—")+(latestHTOActuals?.verifiedZero?.has(p.name)?" · Rostered / 0 GP":"")));
  tr.append(name);
  const actual=latestHTOActuals?(latestHTOActuals.players.get(p.name)||latestHTOActuals.verifiedZero?.get(p.name)):null;
  const unavailable=Boolean(latestHTOActuals&&!actual);
  const currentGP=latestHTOActuals?actual?.gp:p.currentGP;
  const currentG=latestHTOActuals?actual?.g:p.currentG;
  const currentA=latestHTOActuals?actual?.a:p.currentA;
  const ptsActual=latestHTOActuals?actual?.pts:(num(p.currentPts)?p.currentPts:num(p.currentG)&&num(p.currentA)?p.currentG+p.currentA:null);
  const stats=[projectedCell(p.gp,currentGP,1,unavailable),projectedCell(p.g,currentG,0,unavailable),projectedCell(p.a,currentA,0,unavailable),projectedCell(p.pts,ptsActual,0,unavailable)];
  ["GP","G","A","PTS"].forEach((h,j)=>{stats[j].dataset.label=h;tr.append(stats[j])});
  tr.append(makeTD(num(p.ptsPerGame)?p.ptsPerGame.toFixed(2):"—","rate","P/G"));
  const state=trendState(p,projection.conditionalFormatting);
  const trendTD=node("td");trendTD.dataset.label="TREND";
  const button=node("button","trend-button");button.type="button";
  button.setAttribute("aria-expanded","false");
  const detailId="proj-detail-"+(start+i);button.setAttribute("aria-controls",detailId);
  const career=p.trendInputs?.careerScoringRate,projected=p.trendInputs?.projectedScoringRate;
  const details=node("tr","details");details.id=detailId;details.hidden=true;
  const detailTD=node("td");detailTD.colSpan=7;
  const baselineText=num(career)?career.toFixed(3):"unavailable";
  const modelRate=num(projected)?projected.toFixed(3):"unavailable";
  const diffText=num(p.trend)?(p.trend>0?"+":"")+(p.trend*100).toFixed(1)+"%":"unavailable";
  const badge=sharedTrendBadge(p);
  const displayLevel=badge?.dataset.visualLevel||(state.new?(state.label.startsWith("NEW")?"ROOKIE":"HELD"):"HELD");
  const gpProof=badge?.dataset.verifiedGp;
  const tier=badge?.dataset.evidenceTier||'UNVERIFIED';
  const tierPhrase={MORE_OBSERVED_GAMES:'more observed',
    DEVELOPING_SAMPLE:'developing',LIMITED_SAMPLE:'limited',
    NO_VERIFIED_CURRENT_APPEARANCES:'unverified'}[tier]||'unverified';
  const sharedModel=badge?.dataset.sharedModelOutput==='true';
  const evidenceShort=gpProof?gpProof+' GP | '+(sharedModel?'shared model':tierPhrase):
    'GP unverified';
  const evidenceLong=gpProof?
    gpProof+' verified official GP; '+tierPhrase+' sample'+
    (sharedModel?'; shared zero-scoring model formula across multiple players':''):
    'No independent current-game appearance proof for this model player';
  detailTD.textContent="Five-level adaptive visual strength: "+displayLevel+
    ". Original workbook five-arrow category: "+state.label.replace(/ ·.*/,"")+
    ". Historical career RS rate: "+baselineText+" P/G; model scoring-rate component: "+
    modelRate+" P/G; workbook trend: "+diffText+
    ". Displayed projected P/G: "+(num(p.ptsPerGame)?p.ptsPerGame.toFixed(3):"—")+
    ". Badge sensitivity follows qualified team dispersion; original workbook thresholds and values remain unchanged."+
    " Current evidence: "+evidenceLong+
    "; this is a sample-size description, not forecast confidence.";
  details.append(detailTD);
  if(badge){
    badge.classList.add("home-trend-badge");
    badge.querySelector("svg.bio-trend-direction-arrow")?.setAttribute("aria-hidden","true");
    button.dataset.visualLevel=displayLevel;
    button.dataset.workbookCategory=state.label.replace(/ ·.*/,"");
    button.append(badge,node("span","home-level-word",displayLevel),
      node("span","home-evidence-word",evidenceShort));
    button.dataset.evidenceTier=tier;
    button.dataset.sharedModelOutput=String(sharedModel);
    button.dataset.verifiedGp=gpProof||'';
  }else button.append(node("span","new",state.label.startsWith("NEW")?"NEW":"—"));
  button.title=displayLevel+" team-calibrated display · "+state.label+
    (num(state.value)?" · workbook "+diffText:"")+
    " · Evidence: "+evidenceLong+" · Forecast provisional until workbook reconciliation";
  button.setAttribute("aria-label",cleanName(p.name)+": "+button.title+". Show model comparison");
  button.addEventListener("click",()=>{details.hidden=!details.hidden;button.setAttribute("aria-expanded",String(!details.hidden))});
  trendTD.append(button);tr.append(trendTD);table.append(tr,details);
 });
 pager("projection-pager",players.length,size,projectionPage,n=>{projectionPage=n;drawProjection()});
 document.querySelectorAll("[data-group]").forEach(b=>{const active=b.dataset.group===filter;b.setAttribute("aria-pressed",String(active));b.textContent=({ALL:"All Players",FT:"Full-Time",CU:"Call-Ups",DI:"Drop-Ins"})[b.dataset.group]+(active?" ("+players.length+")":"")});
}
document.querySelectorAll("[data-group]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.group;projectionPage=0;drawProjection()}));
function drawLegend(){
 const box=$("trend-legend");box.replaceChildren();
 const adaptive=window.HockeyOSAdaptiveTrendV365;
 const items=adaptive?.legend(document,dispersion,projection,window.HockeyOSBioTrendVisualV36)||[];
 if(!items.length){
  box.textContent='Adaptive trend source held; no unqualified legend.';
  return;
 }
 for(const item of items){
  item.badge.classList.add("home-trend-badge","home-trend-legend-badge");
  item.badge.querySelector("svg.bio-trend-direction-arrow")?.setAttribute("aria-hidden","true");
  const holder=node("span","home-trend-key");
  holder.append(item.badge,node("span","",item.level));box.append(holder);
 }
 box.append(node("span","","ROOKIE/— · Career or source comparison unavailable"));
}
async function loadProjection(){
 try{
  const d=await fetchJSON("projection.json");
  if(d.schema!=="brave-hc-workbook-projection/v1"||!Array.isArray(d.players)||!d.conditionalFormatting?.arrowIconSet?.thresholds)throw Error("Workbook data contract invalid");
  projection=d;
  dispersion=await fetchJSON("hockeyos-team-dispersion-v365.json").catch(()=>null);
  const sourceGames=d.sourceInputs?.verifiedHTOBoxscoreGP;
  try{
    const feed=await fetchJSON("player-actuals.json"),stamp=new Date(feed.asOf),age=Date.now()-stamp.getTime();
    if(feed.schema==="brave-hc-hto-player-actuals/v1"&&feed.status==="VERIFIED_HTO_CURRENT"&&
       feed.season==="W2026/27"&&num(feed.teamGP)&&feed.teamGP>=Number(sourceGames)&&
       Array.isArray(feed.players)&&feed.players.length===feed.playerCount&&
       Number.isFinite(age)&&age>=0&&age<=10*24*60*60*1000 &&
       new Set(feed.players.map(x=>x.name)).size===feed.players.length&&
       feed.players.every(x=>num(x.gp)&&num(x.g)&&num(x.a)&&num(x.pts)&&x.pts===x.g+x.a)){
        const coverage=feed.rosterCoverage;
       let zeroMap=new Map();
       if(coverage?.schema==="brave-hc-hto-rostered-no-appearance/v1"&&
          coverage.status==="SOURCE_QUALIFIED_NO_RECORDED_APPEARANCES"&&
          coverage.teamGP===feed.teamGP&&coverage.season==="W2026/27"&&
          Array.isArray(coverage.rosteredWithoutRecordedAppearance)&&
          coverage.rosteredWithoutRecordedAppearance.every(x=>
             typeof x.name==="string" && !feed.players.some(p=>p.name===x.name)&&
             x.gp===0&&x.g===0&&x.a===0&&x.pts===0&&
             ["FT","CU"].includes(x.classification)) &&
          new Set(coverage.rosteredWithoutRecordedAppearance.map(x=>x.name)).size===
             coverage.rosteredWithoutRecordedAppearance.length){
          zeroMap=new Map(coverage.rosteredWithoutRecordedAppearance.map(p=>[p.name,p]));
       }
       latestHTOActuals={gp:feed.teamGP,asOf:feed.asOf,
          players:new Map(feed.players.map(p=>[p.name,p])),verifiedZero:zeroMap};
    }
  }catch(_noValidLiveActuals){}
  set("proj-games",latestHTOActuals?latestHTOActuals.gp:num(sourceGames)?sourceGames:"—");
  set("proj-total",num(d.total?.points)?d.total.points+" PTS":"—");
  set("projection-state",latestHTOActuals&&!d.modelCurrent?"HTO ACTUALS CURRENT · FORECAST HELD":d.modelCurrent?"MODEL RECONCILED":"SCENARIO · PARITY PENDING");
  const date=dateText(d.htoreadback||d.exportedAt);
  if(latestHTOActuals){
     set("projection-note","Current figures in parentheses are verified HTO statistics through "+latestHTOActuals.gp+" games ("+dateText(latestHTOActuals.asOf)+"). Projected season totals and five-level calibrated trend badges still use the unreconciled workbook model based on "+sourceGames+" HTO games. Verified rostered players with no recorded appearances show (0); (—) means an unverified or unavailable current value.");
  }else{
     set("projection-note",d.modelCurrent===true?"Workbook projections reconciled to official HTO actuals.":"Projection feed reflects "+sourceGames+" HTO games at "+date+". Workbook baseline: "+(d.sourceInputs?.workbookRecordedTeamGP??"—")+" game(s). Forecasts and displayed actuals are not up to date.");
  }
  set("projection-source","Sources: "+(latestHTOActuals?"current official HTO "+dateText(latestHTOActuals.asOf)+"; ":"")+"projection model readback "+date+" · Original workbook trend thresholds retained. "+d.players.length+" player rows.");
  drawLegend();drawProjection();
 }catch(e){set("projection-note","Projection data could not be validated. No replacement estimates or trend badges have been invented. ("+e.message+")");}
}
if(panel==="standings")loadStandings();
if(panel==="projection")loadProjection();
})();