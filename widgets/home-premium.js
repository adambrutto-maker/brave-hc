/* Brave H.C. premium homepage 2026-10-25.
   Preserves official league and source-workbook model boundaries.
   No new rate or trend formulas are introduced. */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
const panel=["standings","projection","watch"].includes(params.get("panel"))?params.get("panel"):"standings";
if(params.has("full"))document.body.classList.add("full");
if(panel==="projection")document.body.classList.add("projection-panel");
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
let projectionFingerprint="",projectionLoading=false;
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
  let games=[],meetings=null;
  try{
   const f=await fetchJSON("current-meetings.json"),b=d.teams.find(t=>t.name===d.team);
   if(f.schema==="brave-hc-current-season-meetings/v1"&&f.season===d.season&&Array.isArray(f.games)&&f.games.length===b.gp&&f.games.every(g=>/^\d{4}-\d{2}-\d{2}$/.test(g.date)&&d.teams.some(t=>t.name!==d.team&&t.name===g.opponent)&&Number.isSafeInteger(g.gf)&&Number.isSafeInteger(g.ga)&&g.gf>=0&&g.ga>=0&&g.result===(g.gf>g.ga?"W":g.gf<g.ga?"L":"T"))&&f.games.reduce((s,g)=>s+g.gf,0)===b.gf&&f.games.reduce((s,g)=>s+g.ga,0)===b.ga)meetings=f.games;
  }catch(_ignored){}
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
    if(meetings){
      const current=node("div","intel-gate");
      current.append(node("strong","","Verified 2026/27 meetings"));
      const rows=meetings.filter(g=>g.opponent===o.name);
      if(!rows.length)current.append(node("p","","No completed meeting in the verified current-season schedule."));
      for(const g of rows)current.append(node("p","",g.date+" | Braves "+g.result+" "+g.gf+"-"+g.ga));
      grid.append(current);
    }
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
 if(reading.status==='ROOKIE'){const b=engine.rookieBadge(document,visual);if(b)b.dataset.iconSource='APPROVED_BIO_ARTWORK_ROOKIE';return b;}
 if(reading.status!=='VERIFIED')return null;
 const badge=engine.badge(document,reading,visual,'PROJECTION');
 if(badge){
  badge.dataset.sourceTrend=String(p.trend);
  badge.dataset.workbookCategory=trendState(p,projection.conditionalFormatting).name||'HELD';
 }
 return badge;
}
// Stable original-workbook icon when verified adaptive dispersion is held.
// This is not a substitute for source-qualified adaptive trend classification.
// Render the approved Bio SVG artwork, not a simplified homepage-only arrow.
// Original workbook five-arrow thresholds and sigma remain the source of truth.
function approvedWorkbookBadge(row){
 const model=window.HockeyOSBioProjectionTrend;
 const visual=window.HockeyOSBioTrendVisualV36;
 if(!model?.directionalArrow||!visual?.createBadge||!projection)return null;
 const reading=model.directionalArrow(row,projection);
 let icon=null;
 if(reading.status==="ROOKIE"){
  icon=visual.createBadge(document,{zScore:0},"Neutral",true);
  if(icon)icon.dataset.iconSource="APPROVED_BIO_ARTWORK_ROOKIE";
 }else if(reading.status==="VERIFIED_STANDARD_DEVIATION_ARROW"){
  icon=visual.createBadge(document,reading,reading.category,false);
  if(icon){
   icon.dataset.iconSource="APPROVED_BIO_ARTWORK_WORKBOOK";
   icon.dataset.workbookCategory=reading.category;
   icon.dataset.sourceTrend=String(row.trend);
   icon.dataset.sigma=String(reading.sigma);
   icon.dataset.evidenceTier="WORKBOOK_SIGMA_VERIFIED";
   icon.dataset.sharedModelOutput="false";
  }
 }
 // A held model may not invent an arrow.
 return icon;
}
function approvedLegendBadge(state){
 const visual=window.HockeyOSBioTrendVisualV36;
 const sigma=projection?.conditionalFormatting?.sampleStandardDeviation;
 if(!visual?.createBadge||!num(sigma)||sigma<=0)return null;
 const examples={Cold:-2.35,Cool:-1.4,Neutral:0,Warm:0.75,Hot:1.35};
 const z=examples[state.name];
 if(!num(z))return null;
 const el=visual.createBadge(document,{zScore:z,sigma,sourceValue:z*sigma},state.name,false);
 if(el)el.dataset.iconSource="APPROVED_BIO_ARTWORK_LEGEND_EXAMPLE";
 return el;
}
function shortPlayerName(raw){
 if(typeof raw!=="string"||!raw.includes(","))return String(raw);
 const [surname,...rest]=raw.split(",");
 const given=rest.join(",").trim(),full=given+" "+surname.trim();
 if(full.length<=17)return full;
 return (surname.trim()==="Provenzano"?given.slice(0,2):given.slice(0,1))+". "+surname.trim();
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
 const body=$("projection-rows");body.replaceChildren();
 if(!latestHTOActuals)return;
 const players=Array.from(latestHTOActuals.players.values()).sort((a,b)=>a.name.localeCompare(b.name));
 for(const p of players){
  const tr=node("tr"),name=node("td","team player");
  name.append(node("span","name",cleanName(p.name)),node("span","mobile-name",p.name.startsWith("Unknown,")?"Unverified entry":shortPlayerName(p.name)));
  tr.append(name);
  for(const [k,label] of [["gp","GP"],["g","G"],["a","A"],["pts","PTS"]])tr.append(makeTD(p[k],"actual-only",label));
  tr.append(makeTD(p.gp>0?(p.pts/p.gp).toFixed(2):String.fromCharCode(8212),"rate","P/G"),makeTD("Held","muted","TREND"));body.append(tr);
 }
 pager("projection-pager",players.length,pageSize("projection"),0,()=>{});
}
document.querySelectorAll("[data-group]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.group;projectionPage=0;drawProjection()}));
function drawLegend(){
 const box=$("trend-legend");box.replaceChildren();
 const adaptive=window.HockeyOSAdaptiveTrendV365;
 const items=adaptive?.legend(document,dispersion,projection,window.HockeyOSBioTrendVisualV36)||[];
 if(!items.length){
  box.append(node("span","home-key-label","Approved Bio artwork - workbook five-category examples (adaptive scale held):"));
  for(const state of states){
   const holder=node("span","home-trend-key");
   const icon=approvedLegendBadge(state);
   if(icon){
    icon.classList.add("home-trend-badge","home-trend-legend-badge");
    icon.querySelector("svg.bio-trend-direction-arrow")?.setAttribute("aria-hidden","true");
    holder.append(icon);
   }
   holder.append(node("span","",state.name));
   box.append(holder);
  }
  const newcomer=node("span","home-trend-key");
  const rookie=window.HockeyOSBioTrendVisualV36?.createBadge?.(document,{zScore:0},"Neutral",true);
  if(rookie){
   rookie.classList.add("home-trend-badge","home-trend-legend-badge");
   rookie.querySelector("svg.bio-trend-direction-arrow")?.setAttribute("aria-hidden","true");
   newcomer.append(rookie);
  }
  newcomer.append(node("span","","New / no career comparison"));
  box.append(newcomer);
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
 if(projectionLoading)return;projectionLoading=true;
 const button=$("projection-refresh");if(button)button.disabled=true;
 try{
  const f=await fetchJSON("player-actuals-hourly.json"),age=Date.now()-Date.parse(f.asOf);
  const valid=f.schema==="brave-hc-hto-player-actuals/v1"&&f.status==="VERIFIED_HTO_CURRENT"&&f.season==="W2026/27"&&Number.isSafeInteger(f.teamGP)&&f.teamGP>0&&Number.isFinite(age)&&age>=0&&age<=86400000&&Array.isArray(f.players)&&f.players.length===f.playerCount&&new Set(f.players.map(p=>p.name)).size===f.playerCount&&f.players.every(p=>typeof p.name==="string"&&p.name.trim()&&[p.gp,p.g,p.a,p.pts].every(Number.isSafeInteger)&&p.gp>=0&&p.gp<=f.teamGP&&p.g>=0&&p.a>=0&&p.g+p.a===p.pts)&&f.players.reduce((s,p)=>s+p.g,0)===f.teamGF&&f.players.reduce((s,p)=>s+p.a,0)===f.teamAssists&&f.players.reduce((s,p)=>s+p.pts,0)===f.teamPlayerPoints;
  if(!valid)throw Error("Actuals source unavailable or outdated");
  latestHTOActuals={gp:f.teamGP,asOf:f.asOf,players:new Map(f.players.map(p=>[p.name,p]))};
  set("proj-games",f.teamGP);set("proj-total",String.fromCharCode(8212));set("projection-state","HTO ACTUALS CURRENT | FORECAST HELD");
  set("projection-note","Verified HTO scoring through "+f.teamGP+" games. Forecasts, projected ranking and trend labels are withheld pending model reconciliation.");
  set("projection-source","Official HTO current-season statistics | "+dateText(f.asOf));
  set("projection-refresh-status","HTO "+f.teamGP+" GP | "+dateText(f.asOf));drawProjection();
 }catch(e){
  if(!latestHTOActuals){$("projection-rows").replaceChildren();set("proj-games",String.fromCharCode(8212));}
  set("proj-total",String.fromCharCode(8212));set("projection-state","SOURCE HELD | FORECAST HELD");
  set("projection-note",latestHTOActuals?"Current source unavailable. Last verified actuals shown, dated "+dateText(latestHTOActuals.asOf)+".":"Verified current actuals unavailable. Forecasts withheld.");
  set("projection-refresh-status","Source check held; retry available");
 }finally{projectionLoading=false;if(button)button.disabled=false;}
}
if(panel==="standings")loadStandings();
if(panel==="projection"){
 $("projection-refresh").addEventListener("click",()=>void loadProjection());
 window.setInterval(()=>{if(!document.hidden)void loadProjection();},240000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)void loadProjection();});
 window.addEventListener("focus",()=>void loadProjection());
 void loadProjection();
}
})();
