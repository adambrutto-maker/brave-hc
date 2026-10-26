/* Brave H.C. League Intelligence: only source-admitted public data. */
"use strict";
(()=>{
 const q=id=>document.getElementById(id);
 const el=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined&&value!==null)x.textContent=String(value);return x};
 const text=(parent,tag,cls,value)=>{const x=el(tag,cls,value);parent.append(x);return x};
 const pct=v=>Number.isFinite(v)?(v*100).toFixed(1)+"%":"—";
 const dec=v=>Number.isFinite(v)?(v>0?"+":"")+v.toFixed(2):"—";
 const record=x=>x?(x.w+"–"+x.l+"–"+x.t):"—";
 const date=s=>{try{return new Date(s+"T12:00:00").toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"})}catch(_){return s}};
 let data=null,selected=null;
 function trusted(doc){
  return doc?.schema==="brave-hc-league-intelligence/public-v1" &&
   doc.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" &&
   doc.currentSourceDataConcordant===true &&
   doc.strengthModel?.schema==="svhl-schedule-adjusted-context/v1" &&
   doc.strengthModel.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
   doc.strengthModel.probabilityOfWinning===false &&
   doc.trendLedger?.schema==="brave-hc-svhl-context-trend-ledger/v1" &&
   doc.trendLedger.sourceScope==="ACCEPTED_PUBLIC_SNAPSHOT_CHANGES_NOT_PREDICTED_FORM" &&
   Array.isArray(doc.trendLedger.teams) &&
   doc.trendLedger.trackedTeams===doc.trendLedger.teams.length &&
   doc.trendLedger.observationsRecorded===doc.trendLedger.teams.reduce((n,g)=>n+g.observations.length,0) &&
   doc.currentDivisionCount>=4 &&
   Array.isArray(doc.divisions)&&Array.isArray(doc.teams)&&
   doc.currentLeagueTeamCount===doc.teams.length &&
   doc.movementLedger?.schema==="brave-hc-svhl-division-movement-ledger/v1" &&
   Array.isArray(doc.movementLedger.events) &&
   Array.isArray(doc.movementLedger.incomingCristilloReports) &&
   doc.movementLedger.eventsRecorded===doc.movementLedger.events.length &&
   doc.verifiedReciprocalCompletedGames>=40 &&
   new Set(doc.teams.map(x=>x.sourceTeamId)).size===doc.teams.length &&
   doc.teams.every(x=>x.leagueName&&x.displayName&&x.divisionNow&&
        x.record?.gp===x.gamesConfirmed &&
        x.record.gp===x.completedGames?.length &&
        x.strengthContext?.status &&
        (x.record.gp===0 ? x.strengthContext.contextIndex===null :
         Number.isFinite(x.strengthContext.contextIndex)));
 }
 function tile(parent,value,caption){
  const card=el("div","metric");text(card,"span","",value);text(card,"small","",caption);parent.append(card);
 }
 function context(parent,title,description){
  const card=el("div","outline");text(card,"h3","",title);text(card,"p","small",description);parent.append(card);
 }
 function setup(){
  const timestamp=new Date(data.asOf);
  q("source-status").textContent="SVHL official sources checked "+
   (Number.isNaN(timestamp.getTime())?data.asOf:timestamp.toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"}))+
   " · every reported nonzero result confirmed from both teams";
  const info=q("overview");info.replaceChildren();
  tile(info,data.currentDivisionCount,"Competitive divisions");
  tile(info,data.currentLeagueTeamCount,"Team entries, including playoff placeholder");
  tile(info,data.verifiedReciprocalCompletedGames,"Verified completed matchups");
  tile(info,data.priorSeasonRosterContinuityQualifiedCount,"Prior-winter roster-supported team links");
  const divisions=q("division-filter");divisions.replaceChildren();divisions.add(new Option("All competitive divisions","all"));
  for(const x of data.divisions)divisions.add(new Option(x.name+(x.competitive?"":" · playoff placeholder"),x.name));
  const teams=q("team-filter");teams.replaceChildren();
  for(const x of [...data.teams].sort((a,b)=>a.displayName.localeCompare(b.displayName)))
   teams.add(new Option(x.displayName+" · "+x.divisionNow,x.leagueName));
 }
 function movement(){
  const history=data.movementLedger;
  const moves=q("movement-rows"),arrivals=q("incoming-rows");
  moves.replaceChildren();arrivals.replaceChildren();
  q("movement-summary").textContent=history.eventsRecorded+" observed changes · "+
   history.incomingCristilloEventsRecorded+" incoming Cristillo";
  const ordered=[...history.events].sort((a,b)=>b.firstObservedAt.localeCompare(a.firstObservedAt));
  for(const x of ordered.slice(0,12)){
   const card=el("article","move-card");
   text(card,"strong","",x.leagueName==="Braves HC"?"Brave H.C.":x.leagueName);
   const from=x.fromDivision||"Prior division not established";
   const to=x.toDivision||"Left current league directory";
   text(card,"p","flow",from+" → "+to);
   text(card,"p","minor","Observed between "+new Date(x.lastObservedAt).toLocaleDateString("en-CA")+
    " and "+new Date(x.firstObservedAt).toLocaleDateString("en-CA")+
    " · effective date unknown");
   const present=data.teams.some(t=>t.sourceTeamId===x.sourceTeamId);
   if(present){
    const button=text(card,"button","","View team profile");
    button.type="button";
    button.addEventListener("click",()=>{
     q("division-filter").value="all";
     const team=data.teams.find(t=>t.sourceTeamId===x.sourceTeamId);
     choose(team.leagueName);
     q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
    });
   }
   moves.append(card);
  }
  if(!ordered.length)text(moves,"p","tiny","No change between verified league membership snapshots yet.");
  const incoming=[...history.incomingCristilloReports].reverse();
  for(const x of incoming.slice(0,8)){
   const card=el("article","move-card");
   const now=data.teams.find(t=>t.sourceTeamId===x.sourceTeamId);
   text(card,"strong","",x.displayName);
   text(card,"p","flow",x.fromDivision||"Previous division not established by earlier snapshot");
   const prior=x.previousWinter;
   const had=x.currentRecordAtFirstDetection;
   text(card,"p","small","At first observation: "+record(had)+
    " · "+had.gf+" GF / "+had.ga+" GA · opponents' current mean WIN% "+
    pct(x.opponentDifficultyAtFirstDetection)+".");
   const against=x.opponentsFacedAtFirstDetection.map(g=>g.opponent+
    " ("+g.result+" "+g.gf+"-"+g.ga+")");
   text(card,"p","small","Competition faced: "+(against.join("; ")||"No verified previous fixtures"));
   if(prior)text(card,"p","small","Prior winter: "+prior.division+" · "+record(prior.record)+
         " · "+prior.officialRosterSharedIDs+" shared official roster IDs.");
   const h=x.bravesHistoryAtFirstDetection;
   text(card,"p","small",h?.state==="SOURCE_VERIFIED_H2H"?
     "Brave H.C. history: "+record(h.bravesAllTime)+" over "+h.bravesAllTime.gp+" verified games.":
     "Brave H.C.: no approved historical meeting.");
   // Compare source-qualified team contexts, not projected game outcomes.
   const brave=data.teams.find(t=>t.leagueName==="Braves HC");
   const incomingScore=now?.strengthContext;
   const braveScore=brave?.strengthContext;
   if(Number.isFinite(incomingScore?.contextIndex)&&Number.isFinite(braveScore?.contextIndex)){
    const difference=incomingScore.contextIndex-braveScore.contextIndex;
    text(card,"p","small strength-explain","Current SVHL context: "+
      now.displayName+" "+incomingScore.contextIndex.toFixed(1)+"/100 vs Brave H.C. "+
      braveScore.contextIndex.toFixed(1)+"/100 ("+
      (difference>0?"+":"")+difference.toFixed(1)+" index points).");
    text(card,"p","small","Form "+incomingScore.currentForm.toFixed(1)+" vs "+
      braveScore.currentForm.toFixed(1)+"; schedule difficulty "+
      incomingScore.scheduleDifficulty.toFixed(1)+" vs "+
      braveScore.scheduleDifficulty.toFixed(1)+". "+
      now.gamesConfirmed+" vs "+brave.gamesConfirmed+
      " league-verified games. Descriptive only, not a win probability.");
   }else{
    text(card,"p","small","Current Brave H.C. comparison unavailable without verified games for both clubs.");
   }
   if(now){
    const button=text(card,"button","","View updated team profile");
    button.type="button";button.addEventListener("click",()=>{
     q("division-filter").value="all";choose(now.leagueName);
     q("profile-title").scrollIntoView({block:"start",behavior:"smooth"});
    });
   }
   arrivals.append(card);
  }
  if(!incoming.length)text(arrivals,"p","tiny","No incoming Cristillo team detected in retained source snapshots.");
  q("movement-source").textContent=history.eventsRecorded+
   " dated source observations retained. "+history.departedTeamProfilesRetained+
   " complete departed-league profiles archived. Old results are never replaced by division-name assumptions.";
 }
 function table(){
  const choice=q("division-filter").value;
  const cards=data.teams.filter(t=>choice==="all"?
    data.divisions.some(x=>x.name===t.divisionNow&&x.competitive):t.divisionNow===choice);
  const byContext=q("sort-field").value==="context";
  cards.sort((a,b)=>byContext?
    ((b.strengthContext?.contextIndex??-1)-(a.strengthContext?.contextIndex??-1) ||
     b.record.gp-a.record.gp || a.displayName.localeCompare(b.displayName)):
    ((b.winPct??-1)-(a.winPct??-1) || b.record.pts-a.record.pts ||
     (b.goalDiffPerGame??-99)-(a.goalDiffPerGame??-99)||a.displayName.localeCompare(b.displayName)));
  const body=q("league-rows");body.replaceChildren();
  for(const x of cards){
   const row=el("tr");row.tabIndex=0;row.dataset.team=x.leagueName;
   if(selected===x.leagueName)row.classList.add("active");
   const name=el("td");text(name,"span","team",x.displayName);text(name,"span","minor",x.divisionNow);row.append(name);
   for(const k of ["gp","w","l","t","pts","gf","ga"])text(row,"td","score",x.record[k]);
   text(row,"td","score",pct(x.winPct));
   text(row,"td","score",dec(x.goalDiffPerGame));
   text(row,"td","score",pct(x.opponentCurrentWinPctAverage));
   text(row,"td","context-score",x.strengthContext.contextIndex===null?"—":x.strengthContext.contextIndex.toFixed(1));
   text(row,"td","score",x.strengthContext.rank===null?"—":"#"+x.strengthContext.rank);
   row.addEventListener("click",()=>choose(x.leagueName));
   row.addEventListener("keydown",event=>{
    if(event.key==="Enter"||event.key===" "){event.preventDefault();choose(x.leagueName)}
   });
   body.append(row);
  }
  if(!cards.length){
   const row=el("tr"),cell=el("td","","No qualified teams in this division");
   cell.colSpan=13;row.append(cell);body.append(row);
  }
 }
 function renderTrend(team){
  const summary=q("trend-summary"),grid=q("trend-rows");grid.replaceChildren();
  const group=data.trendLedger.teams.find(x=>x.sourceTeamId===team.sourceTeamId);
  const observations=group?.observations||[];
  if(!observations.length){
   summary.textContent="No verified historical context observations are available.";
   return;
  }
  const last=observations[observations.length-1];
  if(observations.length===1){
   summary.textContent="Baseline only: first accepted observation "+
    new Date(last.observedAtUTC).toLocaleDateString("en-CA")+
    ". No measured trend yet; unchanged daily refreshes are not counted as improvement or decline.";
  }else{
   const prior=observations[observations.length-2];
   const a=last.contextIndex,b=prior.contextIndex;
   const change=Number.isFinite(a)&&Number.isFinite(b)?
     "Index "+(a-b>0?"+":"")+(a-b).toFixed(1)+" since prior material observation":
     "Comparison unavailable for an unrated team";
   summary.textContent=observations.length+" accepted material observations. "+
    change+". Recorded snapshots show changes in verified standings or context, not future outcomes.";
  }
  for(const p of observations.slice(-6).reverse()){
   const item=el("div","trend-point");
   text(item,"strong","",p.contextIndex===null?"Unrated":p.contextIndex.toFixed(1)+"/100");
   text(item,"span","","GP "+p.record.gp+" · "+record(p.record)+" · "+p.divisionNow);
   text(item,"small","","Observed "+new Date(p.observedAtUTC).toLocaleString("en-CA",
    {dateStyle:"medium",timeStyle:"short"})+
    " · "+p.confidence.replace(/_/g," ").toLowerCase());
   grid.append(item);
  }
 }
 function profile(){
  const x=data.teams.find(item=>item.leagueName===selected);
  if(!x)return;
  q("profile-title").textContent=x.displayName;
  q("profile-division").textContent=x.divisionNow+" · "+x.gamesConfirmed+" reciprocal completed fixtures";
  q("team-official-link").href=x.source;
  const panel=q("profile-metrics");panel.replaceChildren();
  context(panel,"Current 2026/27",record(x.record)+" · "+x.record.gf+
          " GF / "+x.record.ga+" GA · "+pct(x.winPct)+" win percentage");
  context(panel,"Competition faced",
          "Opponents' current mean WIN%: "+pct(x.opponentCurrentWinPctAverage)+
          ". "+x.gamesVsTeamsNowInOtherDivisions+" of "+x.gamesConfirmed+
          " games were against teams now in other divisions.");
  context(panel,"Goal difference",
          (x.record.gf-x.record.ga>0?"+":"")+(x.record.gf-x.record.ga)+
          " this season · "+dec(x.goalDiffPerGame)+" per game");
  const strength=q("strength-metrics");strength.replaceChildren();
  const score=x.strengthContext;
  if(score?.status==="SOURCE_SUPPORTED_DESCRIPTIVE_CONTEXT"){
   context(strength,"Current form",score.currentForm.toFixed(1)+"/100 · official results with neutral smoothing");
   context(strength,"Schedule difficulty",score.scheduleDifficulty.toFixed(1)+"/100 · opponent record with each direct result removed");
   context(strength,"Qualified previous winter",score.priorWinterForm===null?
     "Not roster-verified · prior results excluded from index":
     score.priorWinterForm.toFixed(1)+"/100 · previous season weighted 15%");
   const weights=score.weights;
   q("strength-method").textContent="Context index "+score.contextIndex.toFixed(1)+
    "/100 · "+(score.rank===null?"unranked playoff placeholder":"#"+score.rank+" among competitive teams")+
    " · "+score.confidence.replace(/_/g," ").toLowerCase()+
    " · "+(weights.currentForm*100).toFixed(0)+"% current form, "+
    (weights.scheduleDifficulty*100).toFixed(0)+"% schedule difficulty, "+
    (weights.previousWinterForm*100).toFixed(0)+"% qualified prior winter. "+
    "Neutral four-game smoothing; descriptive only, NOT win probability. "+
    "Brave H.C. historical matchups do not contribute to the index.";
  }else{
   context(strength,"Not rated","No completed games available or not a competitive division.");
   q("strength-method").textContent="Index unavailable: insufficient verified competitive game evidence.";
  }
  renderTrend(x);
  const prior=q("prior-summary");prior.replaceChildren();
  if(x.previousWinter){
   const p=x.previousWinter;
   context(prior,"Previous Winter 2025/26 · "+p.division,
     record(p.record)+" · "+p.record.gf+" GF / "+p.record.ga+" GA · "+
     pct(p.winPct)+". Linked by "+p.officialRosterSharedIDs+" matching official player IDs ("+
     pct(p.rosterContinuityShare)+" of smaller roster). Results stay separate from this winter.");
   const link=text(prior,"a","sourcelink","Official previous-winter team record");
   link.href=p.sourceUrl;link.target="_blank";link.rel="noopener noreferrer";
  }else text(prior,"p","tiny","Previous-winter franchise identity has not been roster-verified. No cross-season record has been merged.");
  const his=q("braves-history");his.replaceChildren();
  const history=x.bravesMatchHistory;
  if(history?.state==="SOURCE_VERIFIED_H2H"){
   const h=history.bravesAllTime;
   context(his,"Brave H.C. head-to-head history",record(h)+" across "+h.gp+
      " all-time verified games · "+h.gf+" GF / "+h.ga+" GA. Scope: "+
      history.sourceScope.replace(/_/g," ").toLowerCase()+".");
  }else if(history?.state==="SELF_TEAM_NOT_APPLICABLE"){
   context(his,"Brave H.C.","Own club — a self-matchup record does not apply.");
  }else context(his,"Brave H.C. head-to-head history","No verified Master Workbook/HTO matchup was admitted for this exact or approved identity.");
  const body=q("fixture-rows");body.replaceChildren();
  const games=[...x.completedGames].sort((a,b)=>b.date.localeCompare(a.date));
  for(const g of games){
   const tr=el("tr");
   text(tr,"td","",date(g.date)+" · "+g.opponent);
   text(tr,"td","small",g.opponentCurrentDivision);
   const status=text(tr,"td",g.result==="W"?"positive":g.result==="L"?"negative":"",g.result);
   status.style.fontWeight="900";
   text(tr,"td","",g.gf);text(tr,"td","",g.ga);body.append(tr);
  }
  if(!games.length){
   const tr=el("tr"),td=el("td","","No source-verified completed matchup recorded");
   td.colSpan=5;tr.append(td);body.append(tr);
  }
  q("profile-source").textContent="Official source: "+x.source+
   ". Opponent division names are current at capture, not necessarily their division when each game was played.";
 }
 function choose(name){selected=name;q("team-filter").value=name;table();profile()}
 async function init(){
  try{
   const response=await fetch("./league-intelligence.json",{cache:"no-store"});
   if(!response.ok)throw Error("Source not yet published");
   const result=await response.json();
   if(!trusted(result))throw Error("Published league-source agreement not validated");
   data=result;setup();movement();
   const name=new URLSearchParams(location.search).get("team");
   selected=data.teams.some(x=>x.leagueName===name)?name:
    data.teams.some(x=>x.leagueName==="Maplewolves")?"Maplewolves":"Braves HC";
   q("division-filter").addEventListener("change",table);
   q("sort-field").addEventListener("change",table);
   q("team-filter").addEventListener("change",event=>choose(event.target.value));
   table();profile();
  }catch(e){
   q("source-status").textContent="SOURCE HELD: "+e.message+". Historical identities or strength figures were not guessed.";
   q("source-status").style.color="#ffa6af";
   q("profile-title").textContent="Verified league source unavailable";
  }
 }
 init();
})();
