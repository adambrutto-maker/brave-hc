/* HockeyOS Game Centre R3.2 Arena — compact full-source leaderboard + scouting.
 * Read-only public source and research models; no production/writing actions.
 */
(function(){
 "use strict";
 const arena=document.getElementById("arena-r32"),api=window.HockeyOSArenaR32;
 if(!arena||!api)return;
 const $=id=>document.getElementById(id);
 const n=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined&&value!==null)e.textContent=String(value);return e};
 const put=(el,tag,cls,value)=>{const x=n(tag,cls,value);el.append(x);return x};
 const stats=(v,positive=false)=>!Number.isFinite(v)?"—":(positive&&v>0?"+":"")+v.toFixed(2);
 const text=(id,value)=>{$(id).textContent=String(value)};
 const names=api.LABEL;
 const state={league:null,source:null,anchors:null,ratings:[],selectedId:null,view:"board",sort:"strength",division:"ALL",
  fitModel:null,stability:null,loaded:false};
 const rankOf=t=>state.ratings.find(x=>x.team.sourceTeamId===t.sourceTeamId)?.rank||null;
 const selected=()=>state.source?.find(x=>x.sourceTeamId===state.selectedId)||null;
 function setView(view){
  if(!["board","team","fit"].includes(view))return;
  state.view=view;
  for(const button of arena.querySelectorAll("[data-arena-tab]")){
   const on=button.dataset.arenaTab===view;
   button.classList.toggle("arena-active",on);
   if(on)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
  }
  for(const section of arena.querySelectorAll("[data-arena-view]"))section.hidden=section.dataset.arenaView!==view;
  if(state.loaded){
   if(view==="team")renderTeam();
   if(view==="fit")renderFit();
  }
 }
 function strengthNode(t,large=false){
  const b=api.badge(t.strengthContext.contextIndex,state.anchors);
  const node=n("span",large?"arena-rating arena-rating-large":"arena-rating",Number.isFinite(b.score)?b.score.toFixed(1):"—");
  node.style.backgroundColor=b.background;node.style.color=b.text;
  node.setAttribute("aria-label",(Number.isFinite(b.score)?b.score.toFixed(1)+" out of 100. ":"Unrated. ")+b.label);
  node.title="Relative Sunday strength · "+b.label;
  return node;
 }
 function sortRows(source){
  const sorted=[...source],sort=state.sort;
  sorted.sort((a,b)=>{
   if(sort==="team")return a.leagueName.localeCompare(b.leagueName,"en",{sensitivity:"base"})||a.sourceTeamId-b.sourceTeamId;
   if(sort==="ptsPerGame")return (api.rates(b).ptsPerGame??-Infinity)-(api.rates(a).ptsPerGame??-Infinity)||
     rankOf(a)-rankOf(b);
   if(sort==="goalDiffPerGame")return (api.rates(b).gdPerGame??-Infinity)-(api.rates(a).gdPerGame??-Infinity)||
     rankOf(a)-rankOf(b);
   return rankOf(a)-rankOf(b);
  });
  return sorted;
 }
 function renderBoard(){
  if(!state.loaded)return;
  let rows=state.division==="ALL"?state.source:state.source.filter(t=>t.divisionNow===state.division);
  rows=sortRows(rows);
  const area=$("arena-board-rows");area.replaceChildren();
  for(const t of rows){
   const rank=rankOf(t),r=api.rates(t);
   const item=n("div","arena-item");
   item.setAttribute("role","listitem");
   const button=n("button","arena-row"+(t.leagueName==="Braves HC"?" arena-braves":""));
   button.type="button";button.dataset.teamId=String(t.sourceTeamId);
   button.setAttribute("aria-label","Open "+t.leagueName+" team view, Sunday rank "+rank+
    ", relative strength "+api.safe(api.relative(t.strengthContext.contextIndex,state.anchors),1));
   put(button,"span","arena-rank",("#"+String(rank).padStart(2,"0")));
   const id=n("span","arena-name");
   put(id,"strong","arena-name-main",t.leagueName);
   const under=n("span","arena-name-under");
   put(under,"span","arena-name-division",names[t.divisionNow]+" Division");
   id.append(under);button.append(id);
   const rate1=n("span","arena-mini-rate arena-pts");
   put(rate1,"strong",null,stats(r.ptsPerGame));
   put(rate1,"small",null,"PTS/G");
   button.append(rate1);
   const rate2=n("span","arena-mini-rate arena-gd");
   put(rate2,"strong",null,stats(r.gdPerGame,true));
   put(rate2,"small",null,"GD/G");
   button.append(rate2);
   button.append(strengthNode(t));
   button.addEventListener("click",()=>{state.selectedId=t.sourceTeamId;
    $("arena-team-select").value=String(t.sourceTeamId);setView("team")});
   item.append(button);area.append(item);
  }
  text("arena-board-status",rows.length+" of "+state.source.length+
   " verified adult Sunday clubs · snapshot "+new Date(state.league.asOf).toLocaleDateString("en-CA",{timeZone:"America/Toronto",month:"short",day:"numeric"})+
   " · 50 / 75 / 100 relative strength");
 }
 function metric(label,value){const x=n("div","arena-metric");
  put(x,"strong",null,value);put(x,"small",null,label);return x}
 function section(title){const x=n("section","arena-panel");
  put(x,"h4","arena-panel-title",title);return x}
 function renderTeam(){
  const box=$("arena-team-profile"),team=selected();box.replaceChildren();
  if(!team||!state.loaded){put(box,"p","arena-alert","No verified team profile selected.");return}
  const comparison=api.comparator(team,state.source,state.anchors),r=api.rates(team);
  const profile=n("div","arena-team-hero");
  const t=n("div","arena-team-identity");
  put(t,"div","arena-kicker","TEAM SELECTION · ROSTER INTELLIGENCE");
  put(t,"h4",null,team.leagueName);
  put(t,"small",null,names[team.divisionNow]+" Division · "+team.record.gp+" GP · source identity #"+team.sourceTeamId);
  profile.append(t,strengthNode(team,true));box.append(profile);
  const positions=n("div","arena-position-grid");
  positions.append(metric("SUNDAY RANK","#"+comparison.leagueRank+" / "+comparison.leagueCount));
  positions.append(metric("DIVISION RANK","#"+comparison.divisionRank+" / "+comparison.divisionCount));
  const leagueDelta=comparison.relativeToLeague,divisionDelta=comparison.relativeToDivision;
  positions.append(metric("VS SUNDAY MIDPOINT",(leagueDelta>=0?"+":"")+leagueDelta.toFixed(1)));
  positions.append(metric("VS DIVISION MIDPOINT",(divisionDelta>=0?"+":"")+divisionDelta.toFixed(1)));
  box.append(positions);
  const performance=section("SEASON SNAPSHOT · VERIFIED GAMES");
  const metrics=n("div","arena-stats-four");
  for(const [lab,value] of [["PTS/G",stats(r.ptsPerGame)],["GF/G",stats(r.gfPerGame)],
   ["GA/G",stats(r.gaPerGame)],["GD/G",stats(r.gdPerGame,true)]])metrics.append(metric(lab,value));
  performance.append(metrics);
  const streak=api.streak(team);
  put(performance,"p","arena-small",team.record.w+" W · "+team.record.l+" L · "+team.record.t+
   " T · "+team.record.pts+" standings points · "+(streak?streak.label:"Streak not verified"));
  box.append(performance);
  const form=api.formEvidence(team,state.league),formSection=section("ICE & FIRE · RECENT TEAM FORM");
  const stateLine=n("div","arena-form-state");
  put(stateLine,"span","arena-form-hold","FORM · WATCH");
  put(stateLine,"strong",null,form.recentGames+" recent verified games · "+
   form.recentRecord.W+" W / "+form.recentRecord.L+" L / "+form.recentRecord.T+" T");
  formSection.append(stateLine);
  const legend=n("div","arena-form-legend");
  for(const [lab,cls] of [["COLD","cold"],["COOL","cool"],["EVEN","even"],["WARM","warm"],["HOT","hot"]])
   put(legend,"span","arena-form-"+cls,lab);
  formSection.append(legend);
  put(formSection,"p","arena-small",
   form.sourceWeeks+" accepted Sunday strength week(s). No validated team Hot/Cold rating until longitudinal, opponent-adjusted division and league comparison evidence meets its gates.");
  box.append(formSection);
  const split=api.splitByOpponentCurrentDivision(team,state.source,state.league.teams);
  const splitPanel=section("DIVISION SPLITS · OPPONENTS' CURRENT DIVISIONS");
  if(split.status!=="VERIFIED_CURRENT_OPPONENT_DIVISIONS"){
   put(splitPanel,"p","arena-alert","Division splits held: "+split.reason);
  }else{
   for(const x of split.groups){
    const row=n("div","arena-split-row");
    const group=n("div","arena-split-name");
    put(group,"strong",null,names[x.division]+" opponents");
    put(group,"small",null,x.gp+" GP · "+x.w+"-"+x.l+"-"+x.t);
    row.append(group);
    const rate=n("div","arena-split-values");
    put(rate,"strong",null,stats(x.ptsPerGame)+" PTS/G");
    put(rate,"span",null,stats(x.gfPerGame)+" GF/G · "+stats(x.gaPerGame)+" GA/G");
    row.append(rate);splitPanel.append(row);
   }
   put(splitPanel,"p","arena-caution",(split.excludedGames?split.excludedGames+" verified game(s) against clubs outside Fazzari/Cristillo/Remax are excluded from these splits. ":"")+"These games are grouped by opponents' CURRENT divisions, not the team's division on the game date. They are not evidence of a transfer's effect.");
  }
  box.append(splitPanel);
  const moves=api.membership(team,state.league),movePanel=section("DIVISION MOVEMENT · REAL-WORLD EVIDENCE");
  if(!moves.events.length){put(movePanel,"p","arena-small","No source-observed division reassignment for this team in the current movement ledger.");}
  for(const ev of moves.events){
   const from=ev.fromDivision?names[ev.fromDivision]||ev.fromDivision:"Previous division unverified";
   const to=names[ev.toDivision]||ev.toDivision;
   put(movePanel,"p","arena-move-strong",from+" → "+to);
   put(movePanel,"p","arena-small",
    "Detected between source observations "+new Date(ev.lastObservedAt).toLocaleDateString("en-CA",{month:"short",day:"numeric"})+
    " and "+new Date(ev.firstObservedAt).toLocaleDateString("en-CA",{month:"short",day:"numeric"})+
    ". Official effective date not verified.");
   put(movePanel,"p","arena-caution","Actual performance before versus after the division change: HELD until dated assignment evidence and qualified game samples are available.");
  }
  box.append(movePanel);
  const link=n("a","arena-scout-link","Full opponent / team scouting ↗");
  link.href="./league-intelligence.html?team="+encodeURIComponent(team.leagueName);
  link.target="_blank";link.rel="noopener noreferrer";box.append(link);
 }
 function tile(label,value,sub){const el=n("div","arena-division-tile");
  put(el,"div","arena-tile-ey",label);put(el,"strong","arena-division-mean",value);put(el,"small",null,sub);return el}
 function renderFit(){
  const box=$("arena-fit-divisions"),watch=$("arena-fit-watch"),moves=$("arena-fit-moves");
  box.replaceChildren();watch.replaceChildren();moves.replaceChildren();
  if(!state.loaded){text("arena-fit-status","League analysis unavailable");return}
  const summaries=api.divisionSummary(state.source);
  for(const s of summaries){
   const card=n("div","arena-division-card");
   const desc=n("div","arena-division-id");
   put(desc,"strong",null,names[s.division]+" Division");
   put(desc,"small",null,s.clubCount+" clubs · official current assignment");
   card.append(desc);
   card.append(tile("SOURCE INDEX AVG",api.safe(s.mean,1),
     "Range "+api.safe(s.min,1)+"–"+api.safe(s.max,1)));
   box.append(card);
  }
  const analysis=state.fitModel,ready=analysis?.readiness;
  const hold=analysis&&analysis.proposalReady===false;
  const msg=hold?"RESEARCH ONLY · NOT READY FOR MOVEMENT RECOMMENDATIONS":
   "Division placement evidence unavailable; no promotion or relegation claims.";
  text("arena-fit-status",msg);
  const research=section("RESEARCH WATCH · WHAT-IF SCENARIOS");
  if(!analysis){
   put(research,"p","arena-alert","No accepted Division Fit model; official placements stay unchanged.");
  }else{
   put(research,"p","arena-small",
    analysis.weekCount+" / "+ready.minWeeks+" verified weeks · "+
    analysis.playedTen+" of "+analysis.adultPoolTeamCount+" teams have ≥"+ready.minGames+
    " games · "+analysis.gameGraph.crossCurrentDivisionGames+" / "+
    ready.minCrossGames+" cross-current-division matches. "+
    "Human review remains necessary even after minimums are met.");
   const scen=analysis.scenarios.find(x=>x.code==="LIMITED");
   if(scen&&scen.changedPairs?.length){
    put(research,"div","arena-kicker","EXPERIMENTAL TWO-PAIR SWAP MODEL · NO OFFICIAL EFFECT");
    const ids=new Map(state.source.map(t=>[t.sourceTeamId,t]));
    for(const pair of scen.changedPairs){
     const [a,b]=pair.teams.map(id=>ids.get(id));
     if(!a||!b)continue;
     const line=n("div","arena-whatif");
     const label=n("div");
     put(label,"strong",null,a.leagueName+" ↔ "+b.leagueName);
     put(label,"small",null,names[a.divisionNow]+" ⇄ "+names[b.divisionNow]);
     line.append(label);
     put(line,"span","arena-math",api.safe(pair.comparisonGain,2)+" research spread");
     research.append(line);
    }
    put(research,"p","arena-caution",
     "The model tests mathematical spread, not next-game outcomes, official promotions or permission to move. Current memberships remain the only official assignments.");
   }else put(research,"p","arena-small","No source-qualified hypothetical pair swap is shown.");
  }
  watch.append(research);
  const evidence=section("OBSERVED MOVEMENTS");
  const events=state.league?.movementLedger?.events;
  if(!Array.isArray(events)||!events.length)put(evidence,"p","arena-small","No verified source-observed move has yet been recorded.");
  else for(const ev of events){
   const row=n("div","arena-observed");
   put(row,"strong",null,ev.leagueName);
   put(row,"span",null,(ev.fromDivision?names[ev.fromDivision]:"Previous division unverified")+
    " → "+(names[ev.toDivision]||ev.toDivision));
   put(row,"small",null,"Observed in source captures; effective date unverified · before/after performance held");
   evidence.append(row);
  }
  moves.append(evidence);
  const legend=section("WHAT THE MODEL CAN AND CANNOT SAY");
  put(legend,"p","arena-small",
   "These scores describe source-qualified competitive context. Overlapping division strengths, limited game samples, opponent difficulty, ice-time capacity and roster continuity all matter. No reassignment is made or proposed as official.");
  moves.append(legend);
 }
 function bind(){
  for(const button of arena.querySelectorAll("[data-arena-tab]")){
   button.addEventListener("click",()=>setView(button.dataset.arenaTab));
  }
  $("arena-back").addEventListener("click",()=>setView("board"));
  $("arena-division-filter").addEventListener("change",e=>{state.division=e.target.value;renderBoard()});
  $("arena-sort").addEventListener("change",e=>{state.sort=e.target.value;renderBoard()});
  $("arena-team-select").addEventListener("change",e=>{state.selectedId=Number(e.target.value);renderTeam()});
 }
 async function boot(){
  bind();
  try{
   const response=await fetch("./league-intelligence.json",{cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const league=await response.json(),teams=api.verify(league),anchors=api.calibration(teams);
   if(!anchors)throw Error("Strength anchors unavailable");
   state.league=league;state.source=teams;state.anchors=anchors;
   state.ratings=api.ranked(teams,anchors);state.selectedId=teams.find(t=>t.leagueName==="Braves HC")?.sourceTeamId||state.ratings[0].team.sourceTeamId;
   if(window.BraveDivisionFit?.analyze){
    try{state.fitModel=window.BraveDivisionFit.analyze(league)}catch(e){state.fitModel=null}
   }
   if(window.BraveWeeklyStability?.analyze){
    try{state.stability=window.BraveWeeklyStability.analyze(league)}catch(e){state.stability=null}
   }
   const sel=$("arena-team-select");sel.replaceChildren();
   for(const row of state.ratings){
    const o=n("option",null,row.team.leagueName+" · "+names[row.team.divisionNow]);
    o.value=String(row.team.sourceTeamId);sel.append(o);
   }
   sel.value=String(state.selectedId);
   state.loaded=true;
   renderBoard();
   // Content outside current tab is populated only on user action to minimize
   // HTO iframe height and avoid exposing research claims without selection.
  }catch(e){
   text("arena-board-status","Power Rankings held: verified adult Sunday source unavailable.");
   text("arena-board-rows","Verified Sunday team data could not be loaded. Use League Intelligence for official context.");
   text("arena-fit-status","Division research held until qualified source is available.");
  }
 }
 window.HockeyOSArenaR32UI=Object.freeze({getState:()=>({
  loaded:state.loaded,view:state.view,teamCount:state.source?.length||0,
  selectedId:state.selectedId,weekCount:state.league?.weeklyLedger?.weeksRecorded||0,
  fitReady:state.fitModel?.proposalReady??false,
  fitStatus:state.fitModel?.status||"HELD",
  allScores:state.ratings.map(x=>x.score),sourceAsOf:state.league?.asOf||null}),
  setView,renderBoard,renderTeam,renderFit});
 boot();
})();
