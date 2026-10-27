/* Brave H.C. HockeyOS — individual public GameInfo scoring reconciliation.
 * Fetch only the selected season's source evidence. No inferred attendance,
 * off-site writes, hidden identity matching or correction of source totals. */
(function(){"use strict";
 const $=id=>document.getElementById(id);
 const node=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;
   if(content!==undefined)x.textContent=String(content);return x};
 const add=(parent,tag,cls,content)=>{const x=node(tag,cls,content);parent.append(x);return x};
 const ok=(test,reason)=>{if(!test)throw Error("GAME_AUDIT_HOLD:"+reason)};
 let index=null,team=null,player=null,season=null,detail=null,pending=0,participation=null;
 const cache=new Map();
 const sourceStatus=s=>{const el=$("audit-source-status");el.textContent=s};
 const teamPlayers=t=>index.currentPlayers.filter(p=>p.currentTeamId===Number(t));
 const seasonFor=(leagueId,teamId)=>Number(leagueId)+"|"+Number(teamId);
 function coverage(){
  const metrics=$("audit-coverage");metrics.replaceChildren();
  const years=Object.values(index.seasons);
  const values=[
   [years.length,"official winter season sources audited"],
   [years.reduce((n,s)=>n+s.completedGames,0),"reciprocal completed game sheets inspected"],
   [years.reduce((n,s)=>n+s.fullScoringGames,0),"goal-event sheets matching official score"],
   [years.reduce((n,s)=>n+s.partialScoringGames,0),"game sheets with held player scoring"],
   [index.currentRosterPlayers,"current listed roster players"],
   [years[0]?.sourceCurrentSnapshotMatches??"N/A","current game sheets matching accepted league results"]
  ];
  for(const [v,label] of values){
   const card=node("article","metric");
   add(card,"strong","",v);add(card,"small","",label);
   metrics.append(card);
  }
  const current=index.seasons["570"];
  const extra=current?current.completedGames-current.sourceCurrentSnapshotMatches:0;
  $("audit-cover-note").textContent="Source league results accepted "+
    new Date(index.acceptedLeagueAsOf).toLocaleString("en-CA")+
    ". Public player source captured "+new Date(index.rosterAsOf).toLocaleString("en-CA")+
    ". "+(current?
     current.sourceCurrentSnapshotMatches+" current-season GameInfo sheets matched the league snapshot AT AUDIT CAPTURE; "+
     extra+" additional sheets were outside that earlier snapshot (they may already appear in a more recent accepted league feed). ":"")+
    "Games played and penalty minutes are NOT independently verified by scoring events. Published season totals are never silently changed.";
 }
 function teams(){
  const target=$("audit-team"),groups=[...new Set(index.currentPlayers.map(p=>p.currentTeamId))];
  const names=new Map(index.currentPlayers.map(p=>[p.currentTeamId,p.currentTeamName]));
  target.replaceChildren();
  groups.sort((a,b)=>names.get(a).localeCompare(names.get(b)));
  for(const id of groups){
   const o=node("option","",names.get(id));o.value=String(id);target.append(o);
  }
  const query=new URLSearchParams(location.search);
  const requested=query.get("team");
  const found=groups.find(x=>names.get(x)===requested);
  const initial=found??groups.find(x=>names.get(x)==="Mid Ice Crisis")??groups[0];
  target.value=String(initial);
  target.addEventListener("change",renderTeam);
  $("audit-player").addEventListener("change",renderPlayer);
  $("audit-season").addEventListener("change",renderSeason);
  $("audit-copy").addEventListener("click",copyCurrent);
 }
 function renderTeam(){
  const current=Number($("audit-team").value),all=teamPlayers(current);
  team=current;
  const selected=$("audit-player");selected.replaceChildren();
  all.sort((a,b)=>a.name.localeCompare(b.name));
  for(const p of all){
   const opt=node("option","",p.name);opt.value=String(p.playerId);
   selected.append(opt);
  }
  const requested=Number(new URLSearchParams(location.search).get("playerId"));
  const first=all.find(x=>x.playerId===requested)||
   [...all].sort((a,b)=>(
    b.seasonEvidence[0].observedFullGameEvents.pts-
    a.seasonEvidence[0].observedFullGameEvents.pts))[0];
  if(first)selected.value=String(first.playerId);
  return renderPlayer();
 }
 function renderPlayer(){
  const pid=Number($("audit-player").value);
  player=index.currentPlayers.find(p=>p.currentTeamId===team&&p.playerId===pid);
  const selector=$("audit-season");selector.replaceChildren();
  if(!player)return;
  for(const s of player.seasonEvidence){
   const opt=node("option","",s.leagueId+" · "+s.teamName+
     (s.leagueId===570?" (current)":" (archived)"));
   opt.value=seasonFor(s.leagueId,s.teamId);selector.append(opt);
  }
  selector.selectedIndex=0;
  return renderSeason();
 }
 function getYear(lid){
  const source=index.seasons[String(lid)]?.source;
  ok(source==="./svhl-player-game-"+lid+".json","UNAPPROVED_SEASON_URL");
  if(!cache.has(lid))cache.set(lid,fetch(source,{cache:"no-store"}).then(async r=>{
    ok(r.ok,"SEASON_SOURCE_UNAVAILABLE");
    const data=await r.json();
    ok(data.schema==="brave-hc-svhl-season-individual-game-evidence/v1"&&
      data.leagueId===lid&&data.leagueAssignmentsOrPlayerTotalsWritten===false&&
      data.summary.completedReciprocalGameSheets===index.seasons[String(lid)].completedGames&&
      data.summary.fullGoalSheetGames===index.seasons[String(lid)].fullScoringGames,
      "SEASON_COUNTS_OR_SOURCE_UNQUALIFIED");
    return data;
  }).catch(e=>{cache.delete(lid);throw e}));
  return cache.get(lid);
 }
 async function renderSeason(){
  const seq=++pending;
  const raw=$("audit-season").value;
  if(!raw||!player)return;
  const [lid,tid]=raw.split("|").map(Number);
  ok(Number.isInteger(lid)&&Number.isInteger(tid),"INVALID_GAME_SEASON_SELECTION");
  $("audit-selection-status").textContent="Checking season-scoped game sheets…";
  for(const id of ["audit-player-metrics","audit-event-list","audit-team-table","audit-held-games"])
   $(id).replaceChildren();
  try{
   const data=await getYear(lid);
   if(seq!==pending)return;
   const teamPage=data.teams.find(t=>t.sourceTeamId===tid);
   const reported=teamPage?.playerSeasonSummaries.find(p=>p.playerId===player.playerId);
   ok(reported&&teamPage&&reported.name&&reported.published&&
     reported.gpStatus==="CANNOT_VERIFY_GAME_APPEARANCE_FROM_GOAL_EVENT_SHEET",
     "TEAM_PLAYER_GAME_EVIDENCE_NOT_ADMITTED");
   season={lid,tid};detail={source:data,team:teamPage,player:reported};
   renderDetails();
  }catch(error){
   if(seq!==pending)return;
   $("audit-selection-status").textContent="GAME-LEVEL EVIDENCE HELD: "+error.message+
     ". No season total has been corrected or inferred.";
  }
 }
 function renderDetails(){
  const r=detail.player,y=detail.source,t=detail.team;
  ok(window.BravePlayerParticipationEvidence,"PARTICIPATION_MODEL_MISSING");
  participation=window.BravePlayerParticipationEvidence.analyze(index,y,t.sourceTeamId,r.playerId);
  $("audit-selection-status").textContent=player.name+" · "+t.name+
   " · official league season "+y.leagueId+
   " · "+t.fullyScoredGameSheets+" full source sheets, "+
   t.partiallyScoredGameSheets+" partial (within selected adult team scope).";
  const metrics=$("audit-player-metrics");metrics.replaceChildren();
  const m=[
   [r.published.g+" G / "+r.published.a+" A","published player season totals"],
   [r.observedFullGameEvents.g+" G / "+r.observedFullGameEvents.a+" A",
     "from fully score-matched GameInfo sheets"],
   [r.deltaPublishedMinusObserved.g+" G / "+r.deltaPublishedMinusObserved.a+" A",
     "published minus source-observed scoring"],
   [r.registeredSeasonGP,"published season GP (NOT game-sheet verified)"],
   [participation.provenScoringInvolvementGames,
     "distinct verified games with source-linked goals or assists — participation LOWER BOUND"],
   [participation.sourceContradiction?"Source contradiction":
     participation.otherPublishedGPNotGameVerified,
     "published GP without score-event participation proof — NOT absences"]
  ];
  for(const [v,label] of m){
   const card=node("article","metric");add(card,"strong","",v);
   add(card,"small","",label);metrics.append(card);
  }
  $("audit-player-caution").textContent=
   (r.status==="RECONCILED_GOALS_ASSISTS_ON_SOURCE_COMPLETE_EVENTS"?
    "Source game events match this player's published goals and assists within an admitted complete team-season scope. ":
    r.status==="OBSERVED_EVENTS_MATCH_PUBLISHED_TOTALS_COVERAGE_PARTIAL"?
      "Published G/A currently match observed events, but some game coverage is incomplete; this is NOT fully verified. ":
      "Difference or incomplete source game sheets: do NOT replace the published season totals. ")+
   "GameInfo goal scorers are linked to official player IDs. Assists were credited only when an exact UNIQUE team-roster name could be matched. "+
   "A scoring sheet cannot establish every appearance, penalty minute, player position or why a player did not score.";
  $("audit-scoring-attendance").textContent=participation.note+
    " The lower bound includes only admitted goal scorers or unique-team-name assistants from final-score-matched sheets."+
    (participation.sourceContradiction?
      " WARNING: scoring-linked appearances exceed published GP; source conflict held.":
      " Missing source scoring events cannot establish that a player did not dress.");
  const proof=$("audit-scoring-game-proofs");proof.replaceChildren();
  if(!participation.scoringEvidenceGames.length)
    add(proof,"p","small","No admitted scoring-game appearance is observed. This does NOT mean zero games played.");
  for(const observedGame of participation.scoringEvidenceGames){
    const card=node("article","game-card");
    add(card,"strong","",observedGame.date+" · Game #"+observedGame.gameId);
    add(card,"small","",observedGame.goalEvents+" source goal(s), "+
      observedGame.admittedAssistEvents+" uniquely linked assist(s). One game counts only once as an appearance lower bound.");
    const link=add(card,"a","small","Official GameInfo proof");
    link.href=observedGame.officialUrl;link.target="_blank";link.rel="noopener noreferrer";
    proof.append(card);
  }
  const out=$("audit-event-list");out.replaceChildren();
  const events=[...r.events].sort((a,b)=>b.date.localeCompare(a.date)||
    b.gameId-a.gameId||a.period-b.period);
  if(!events.length)add(out,"p","small",
   "No credited scoring event found on admitted complete GameInfo sheets. This does not establish that the player missed the games.");
  for(const event of events){
   const card=node("article","game-card");
   const currentGame=y.games.find(g=>g.gameId===event.gameId);
   add(card,"strong","",event.date+" · "+
     (event.credited==="GOAL"?"Goal":"Assist (exact-name roster match)"));
   add(card,"small","","Official game #"+event.gameId+
    " · period "+event.period+" · "+event.time+
    (currentGame?.sourceCurrentLeagueSnapshotAgreement==="NOT_IN_ACCEPTED_CURRENT_SNAPSHOT"?
      " · NOT YET IN ACCEPTED HOCKEYOS LEAGUE SNAPSHOT":""));
   const source=add(card,"a","small","Official Sports Village GameInfo");
   source.href=event.gameSource;source.target="_blank";source.rel="noopener noreferrer";
   out.append(card);
  }
  const table=$("audit-team-table");table.replaceChildren();
  const tbl=node("table"),head=node("thead"),tr=node("tr");
  for(const text of ["Player","Published G/A","Game-sheet G/A","Evidence"])add(tr,"th","",text);
  head.append(tr);tbl.append(head);
  const body=node("tbody");
  for(const p of [...t.playerSeasonSummaries].sort((a,b)=>b.published.pts-a.published.pts||
    a.name.localeCompare(b.name))){
   const row=node("tr"),name=node("td");
   const button=node("button","player-button",p.name);
   button.type="button";button.addEventListener("click",()=>{
    const chosen=index.currentPlayers.find(x=>x.currentTeamId===team&&x.playerId===p.playerId);
    if(chosen){$("audit-player").value=String(chosen.playerId);renderPlayer();}
    else $("audit-selection-status").textContent="This archived teammate is not among current team members. "+
       "Historical source totals remain viewable but cannot be joined to a current player by name.";
   });
   name.append(button);row.append(name);
   add(row,"td","",p.published.g+"/"+p.published.a);
   add(row,"td","",p.observedFullGameEvents.g+"/"+p.observedFullGameEvents.a);
   add(row,"td",p.status.startsWith("RECONCILED_")?"ok":"hold",
    p.status.startsWith("RECONCILED_")?"Fully matched":
    p.status.startsWith("OBSERVED_EVENTS_MATCH")?"Partial coverage":"Difference/held");
   body.append(row);
  }
  tbl.append(body);table.append(tbl);
  $("audit-held-explanation").textContent=t.fullyScoredGameSheets+" completed scoring sheets passed score parity; "+
   t.partiallyScoredGameSheets+" scoring sheets did not. "+
   "A game outside the archived adult-scope team directory can also block a complete season assertion. "+
   "Registered GP and penalty minutes remain unverified.";
  const held=$("audit-held-games");held.replaceChildren();
  const games=y.games.filter(g=>g.homeTeamId===season.tid||g.awayTeamId===season.tid);
  const unresolved=games.filter(g=>g.status!=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY");
  if(!unresolved.length)add(held,"p","small",
    "No incomplete GameInfo sheet for this selected source team in this admitted season. Season totals still require full schedule-scope coverage.");
  for(const g of unresolved.slice(0,15)){
   const card=node("article","game-card");
   add(card,"strong","hold","Official game #"+g.gameId+" · "+g.date+" — partial scoring");
   add(card,"small","","Published final "+g.homeGoals+"–"+g.awayGoals+
     "; "+g.partialSheetGoalCount+" linked scorer events captured. Excluded from accepted game-level G/A totals.");
   const link=add(card,"a","small","Review source GameInfo");
   link.href=g.source;link.target="_blank";link.rel="noopener noreferrer";
   held.append(card);
  }
 }
 async function copyCurrent(){
  const status=$("audit-copy-status");
  if(!detail){status.textContent="No verified game-season selected.";return}
  if(!navigator.clipboard?.writeText){status.textContent="Clipboard unavailable.";return}
  const p=detail.player,y=detail.source,t=detail.team;
  const lines=[
   "BRAVE H.C. HOCKEYOS — OFFICIAL INDIVIDUAL GAME SCORING AUDIT",
   "PLAYER: "+player.name+" | Official player ID: "+player.playerId,
   "Team-season: "+t.name+" | league "+y.leagueId,
   "Published season total G/A: "+p.published.g+"/"+p.published.a+
    " | published GP "+p.registeredSeasonGP+" (NOT game-sheet verified).",
   "Source score-complete GameInfo G/A: "+
    p.observedFullGameEvents.g+"/"+p.observedFullGameEvents.a,
   "Difference (published minus admitted events) G/A: "+
    p.deltaPublishedMinusObserved.g+"/"+p.deltaPublishedMinusObserved.a,
   "Evidence: "+p.status+". Team game-sheet coverage: "+t.fullyScoredGameSheets+
    " full, "+t.partiallyScoredGameSheets+" partial.",
   ...p.events.map(e=>e.date+" | Official #"+e.gameId+" period "+e.period+
    " "+e.time+" "+e.credited+" | "+e.gameSource),
   "SCORING GAME PARTICIPATION LOWER BOUND: "+participation.provenScoringInvolvementGames+
    " distinct verified GameInfo games with scored goals or admitted assists.",
   "PUBLISHED GP WITHOUT INDIVIDUAL GAME ATTENDANCE PROOF: "+
    participation.otherPublishedGPNotGameVerified+
    "; these are NOT absence records or verified nonscoring appearances.",
   "SCORING-BASED PARTICIPATION CONFLICT: "+(participation.sourceContradiction?"YES — review required":"No lower-bound contradiction observed"),
   "No inferred full GP, PIM or dressing; unresolved sheets and source timing can prevent complete agreement. Published official statistics have NOT been overwritten."
  ];
  try{await navigator.clipboard.writeText(lines.join("\n"));
      status.textContent="Source-scoped game audit copied. No message has been sent.";}
  catch(_){status.textContent="Clipboard permission not granted.";}
 }
 async function init(){
  try{
   ok(window.BravePlayerParticipationEvidence,"PARTICIPATION_MODULE_MISSING");
   const response=await fetch("./svhl-player-game-index.json",{cache:"no-store"});
   ok(response.ok,"INDEX_NOT_PUBLISHED");
   const doc=await response.json();
   ok(doc.schema==="brave-hc-svhl-game-reconciliation-index/v1"&&
      doc.status==="SEASON_SCOPED_PARTIAL_PLAYER_GAME_EVENT_EVIDENCE"&&
      doc.registeredGPVerified===false&&doc.seasonStatsOverwritten===false&&
      doc.currentTeamCount===22&&doc.currentPlayers?.length===doc.currentRosterPlayers&&
      doc.goalsQualification==="SCORE_MATCHED_GAME_EVENT_OFFICIAL_PLAYER_ID_ONLY",
      "INDEX_SOURCE_SCOPE_INVALID");
   index=doc;coverage();teams();
   sourceStatus("Official GameInfo sources captured "+new Date(doc.capturedUTC).toLocaleString("en-CA")+
     " · "+doc.sourceSeasonCount+" historical season(s). Scoring validation is separate from published player appearances.");
   await renderTeam();
   try{
     const r=await fetch("./svhl-penalty-source-coverage.json",{cache:"no-store"});
     ok(r.ok,"PENALTY_SOURCE_COVERAGE_NOT_PUBLISHED");
     const source=await r.json();
     const proof=window.BravePlayerParticipationEvidence.penaltySource(source);
     const area=$("audit-penalty-coverage-metrics");area.replaceChildren();
     for(const [value,label] of [
      [proof.sampledGames,"official game sheets independently sampled"],
      [proof.seasons,"official seasons checked"],
      ["None recorded","populated penalty rows found in sampled sheets"],
      ["Unverified","actual penalties, penalty minutes and game appearances"]]){
      const card=node("article","metric");add(card,"strong","",value);add(card,"small","",label);area.append(card);
     }
     $("audit-penalty-coverage-status").textContent=proof.message;
   }catch(error){
     $("audit-penalty-coverage-status").textContent=
       "Penalty coverage held: "+error.message+
       ". No zero-PIM, full attendance or penalty identity claim is made.";
   }
  }catch(error){
   sourceStatus("GAME-LEVEL SOURCE HELD: "+error.message+
     ". Player totals are not independently verified or corrected.");
  }
 }
 init();
})();