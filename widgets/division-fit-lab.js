"use strict";
(()=>{
 const el=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined&&value!==null)x.textContent=String(value);return x};
 const put=(parent,tag,cls,value)=>{const node=el(tag,cls,value);parent.append(node);return node};
 const q=id=>document.getElementById(id);
 const num=(v,n=1)=>Number.isFinite(v)?v.toFixed(n):"unavailable";
 let analysis=null,stability=null,activeScenario="CURRENT",verifiedGameInfoBySourceKey=null;
 function metric(parent,value,description){
  const node=el("div","metric");
  put(node,"span","number",value);
  put(node,"small","",description);
  parent.append(node);
 }
 function renderTeamHistory(){
  const grid=q("weekly-team-history");grid.replaceChildren();
  if(!stability)return;
  const team=stability.trajectories.find(x=>String(x.sourceTeamId)===
    q("stability-team-filter").value);
  if(!team){
   put(grid,"p","small","No accepted team history for this source identifier.");return;
  }
  for(const point of [...team.series].reverse()){
   const card=el("article","week-card");
   put(card,"strong","",point.week+" · "+num(point.contextIndex)+"/100");
   put(card,"small","","Adult research rank #"+point.rank+
     " · research band "+point.band+" · "+point.gp+
     " source-verified completed games");
   put(card,"small","",point.divisionNow+" · source observed "+
     new Date(point.observedAtUTC).toLocaleString("en-CA"));
   const bar=el("div","barline"),fill=el("span");
   fill.style.width=Math.max(0,Math.min(100,point.contextIndex))+"%";
   bar.append(fill);card.append(bar);grid.append(card);
  }
  if(team.observedWeeks===1){
   const note=put(grid,"p","small baseline","Baseline only: no verified second week exists. "+
     "No improving, declining, stable or reshuffled-band claim.");
  }else{
   const delta=team.latestChange;
   put(grid,"p","small","Latest week-to-week index change "+
     (delta.indexDelta>=0?"+":"")+num(delta.indexDelta)+
     " points; rank movement "+(delta.rankChange>=0?"+":"")+delta.rankChange+
     "; band crossed: "+(delta.crossedResearchBand?"yes":"no")+
     ". Descriptive only, not a performance prediction.");
  }
 }
 function renderStability(){
  const status=q("weekly-stability-status"),metrics=q("weekly-stability-metrics");
  metrics.replaceChildren();
  if(!stability){status.textContent="Weekly source stability unavailable.";return}
  status.textContent=stability.completeObservedWeeks+" source-verified week(s) "+
    "from "+stability.earliestVerifiedWeek+" to "+stability.latestVerifiedWeek+
    "; "+stability.poolTeamCount+" adult teams tracked. "+
    (stability.state==="SOURCE_BACKED_BASELINE_ONLY"?
      "BASELINE ONLY — no week-to-week movement is yet measurable.": 
      "Observed changes available; still a provisional descriptive model.");
  metric(metrics,stability.completeObservedWeeks,"complete source-backed adult weeks");
  metric(metrics,stability.lastTransition?.bandCrossings??"Not yet measurable",
    "clubs crossing research bands in latest observed transition");
  metric(metrics,stability.lastTransition?.meanAbsoluteScoreChange===undefined?
    "Not yet measurable":num(stability.lastTransition.meanAbsoluteScoreChange,2),
    "mean absolute index movement, latest observed transition");
  metric(metrics,stability.latestWeekBandRetention===null?"Not yet measurable":
    num(stability.latestWeekBandRetention)+"%",
    "research-band retention over latest source-observed interval");
  q("weekly-stability-caveat").textContent=stability.disclaimer+
    (stability.incompleteWeeksHeld.length?
     " "+stability.incompleteWeeksHeld.length+" incomplete source week(s) held; none interpolated.":"")+
    " "+stability.researchBandMeaning;
  q("stability-band-note").textContent="Fixed group capacities: "+
    stability.bandCapacities.join(" / ")+". The research bands have NO official division authority.";
  const selector=q("stability-team-filter");selector.replaceChildren();
  for(const t of [...stability.trajectories].sort((a,b)=>a.name.localeCompare(b.name))){
   const option=el("option","",t.name);option.value=String(t.sourceTeamId);
   selector.append(option);
  }
  const brave=stability.trajectories.find(x=>x.name==="Brave H.C."||
    x.name==="Braves HC");
  selector.value=String(brave?.sourceTeamId||stability.trajectories[0].sourceTeamId);
  selector.addEventListener("change",renderTeamHistory);
  renderTeamHistory();
  const transitions=q("weekly-transitions");transitions.replaceChildren();
  if(!stability.transitions.length){
   const p=put(transitions,"p","small",
      "No second accepted weekly observation. HockeyOS will show actual movement only when a later verified source week is published.");
   p.classList.add("baseline");
   return;
  }
  for(const x of [...stability.transitions].reverse().slice(0,8)){
   const card=el("article","week-card");
   put(card,"strong","",x.from+" → "+x.to);
   put(card,"small","",x.bandCrossings+" / "+x.teamsCompared+
     " research-band crossings · "+x.rankChanges+" adult rank changes");
   put(card,"small","",num(x.meanAbsoluteScoreChange,2)+
     " average absolute context-index change · "+x.officialDivisionChanges+
     " changes in published adult division");
   if(x.skippedCalendarWeeks)
    put(card,"small","warning",x.skippedCalendarWeeks+
      " unsampled calendar week(s) between these two source observations.");
   transitions.append(card);
  }
 }
 function source(){
  const metrics=q("source-metrics");metrics.replaceChildren();
  metric(metrics,analysis.adultPoolTeamCount,"teams in eligible adult research pool");
  metric(metrics,analysis.gameGraph.verifiedGamesInPool,"verified completed pool games");
  metric(metrics,analysis.gameGraph.crossCurrentDivisionGames,"games connecting present divisions");
  metric(metrics,analysis.weekCount,"real weekly source observation(s)");
  q("source-note").textContent="Source observed "+
   new Date(analysis.sourceAsOf).toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"})+
   ". "+analysis.gameGraph.verifiedGamesInPool+" adult-pool source-confirmed completed games. "+
   "Only Fazzari, Cristillo and Remax are represented. Other competitions are outside this report; source records are unchanged." ;
 }
 function videoBridgeReadiness(){
  const status=q("video-readiness-status"),metrics=q("video-bridge-metrics");
  metrics.replaceChildren();
  try{
   if(!window.BraveVideoStrengthEvidence)
    throw Error("SOURCE_QUALIFIED_VIDEO_INTAKE_NOT_INSTALLED");
   const bridge=window.BraveVideoStrengthEvidence.opponentBridgeInventory(analysis);
   metric(metrics,bridge.adultTeamCount,"adult SVHL teams with confirmed source IDs");
   metric(metrics,bridge.crossCurrentDivisionGames,"source games between current divisions");
   metric(metrics,bridge.teamsWithCrossDivisionEvidence,"teams with observed cross-division opponents");
   metric(metrics,bridge.teamsWithoutCrossDivisionEvidence,"teams without direct cross-division game evidence");
   status.textContent="INSUFFICIENT_VIDEO — no independently accepted actual-play feature rates or calibrated video-strength rating. "+
    "The "+bridge.crossCurrentDivisionGames+" source-confirmed cross-current-division games are opponent/context bridges only; "+
    "the existing Division Fit indexes and all scenarios remain unchanged.";
   q("video-bridge-caveat").textContent=bridge.caveat+
    " No VAHL team is included. Camera, era, source rights, moving-play coverage, opponent tier and independent QA remain gating conditions.";
  }catch(error){
   status.textContent="INSUFFICIENT_VIDEO — video source bridge held: "+error.message+
     ". Existing division research continues unchanged; no team performance is inferred.";
  }
 }
 async function loadOfficialGameIDBridges(){
  const r=await fetch("./svhl-official-game-id-bridges.json",{cache:"no-store"});
  if(!r.ok)throw Error("SOURCE_QUALIFIED_GAMEINFO_ID_MAP_UNAVAILABLE");
  const official=await r.json();
  if(!window.BraveVideoStrengthEvidence)
    throw Error("SOURCE_QUALIFIED_VIDEO_EVIDENCE_ADAPTER_UNAVAILABLE");
  const verified=window.BraveVideoStrengthEvidence.officialGameIdentityCoverage(
    analysis,official);
  // The existing adapter verified every official ID, team side, score, page
  // URL and hash against all 54 source-paired games before this reference view.
  verifiedGameInfoBySourceKey=new Map(official.games.map(g=>[g.sourceGameKey,g]));
  if(verifiedGameInfoBySourceKey.size!==verified.sourceGameIDsVerified)
   throw Error("SCENARIO_GAME_SOURCE_INDEX_DUPLICATED");
  if(!window.BraveDivisionLayoutView?.setOfficialGameInfoSource)
   throw Error("LAYOUT_OFFICIAL_GAME_SOURCE_VIEW_MISSING");
  window.BraveDivisionLayoutView.setOfficialGameInfoSource(analysis,official);
  renderScenarioGameSources();
  // This only upgrades the source-linked identity/evidence LABEL, never a team rating.
  // Default remains actual cross-division matches; the source-only inventory can
  // also show every exact official GameInfo ID (including within-division games).
  const sourceMatches=[...official.games].sort(
    (a,b)=>a.date.localeCompare(b.date)||a.officialGameId-b.officialGameId);
  const list=q("video-bridge-games-list"),scope=q("gameinfo-scope-filter"),
    search=q("gameinfo-source-search"),count=q("gameinfo-source-count");
  const renderSourceMatches=()=>{
   const query=search.value.trim().toLocaleLowerCase();
   const filtered=sourceMatches.filter(g=>
     (scope.value==="ALL"||
      (scope.value==="CROSS"?g.crossCurrentDivision:!g.crossCurrentDivision))&&
     (!query||[g.date,g.homeTeamName,g.awayTeamName,String(g.officialGameId)]
       .some(v=>String(v).toLocaleLowerCase().includes(query))));
   list.replaceChildren();
   for(const g of filtered){
    const card=el("article","week-card");
    put(card,"strong","",g.date+" · "+g.homeTeamName+" vs "+g.awayTeamName);
    put(card,"small","",g.publishedFinalGoals.join("-")+
      " · official SVHL game #"+g.officialGameId+" · "+
      g.currentDivisionPair.join(" / ")+
      (g.crossCurrentDivision?" · cross-current-division":" · within-current-division"));
    if(g.scoringEventAdmission==="HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION")
     put(card,"small","warning","Official result confirmed; individual player scoring sheet held");
    const link=put(card,"a","small","Inspect source GameInfo");
    link.href=g.officialGameInfoURL;link.target="_blank";
    link.rel="noopener noreferrer";
    list.append(card);
   }
   if(!filtered.length)put(list,"p","small","No verified GameInfo matches meet these filters.");
   count.textContent=filtered.length+" of "+sourceMatches.length+
     " exact official GameInfo IDs displayed · "+
     verified.verifiedCrossDivisionIDs+" cross-current-division games in full source";
  };
  scope.onchange=renderSourceMatches;
  search.oninput=renderSourceMatches;
  renderSourceMatches();
  const detail=q("video-bridge-games");
  detail.hidden=sourceMatches.length===0;
  detail.querySelector("summary").textContent=
    "Inspect "+sourceMatches.length+" verified official GameInfo matches ("+
    verified.verifiedCrossDivisionIDs+" cross-current-division)";
  metric(q("video-bridge-metrics"),verified.sourceGameIDsVerified,
    "official GameInfo game IDs verified in this pool");
  q("video-readiness-status").textContent=
    "INSUFFICIENT_VIDEO — "+verified.sourceGameIDsVerified+
    " of "+analysis.gameGraph.verifiedGamesInPool+
    " source-confirmed games now have exact official GameInfo IDs; "+
    verified.verifiedCrossDivisionIDs+" connect current divisions. "+
    verified.scorerHeldOfficialGames+" games retain player scoring evidence holds. "+
    "No independent actual-play strength, calibrated tier rating or division assignment authorized.";
 }
 function connections(){
  const grid=q("cross-division-links");grid.replaceChildren();
  const cross=analysis.gameGraph.links.filter(p=>p.crossDivision);
  for(const pair of cross){
   const card=el("article","link-card");
   put(card,"strong","",pair.divisionPair.join(" ↔ "));
   put(card,"p","small",pair.games+" source-verified games between teams currently assigned to these two divisions.");
   put(card,"small","",num(pair.meanAbsoluteGoalMargin,2)+
       " average absolute goal margin in those completed meetings (not a forecast)");
   grid.append(card);
  }
  if(!cross.length)put(grid,"p","small","No verified cross-division games in the selected adult comparison pool.");
 }
 function renderScenarioGameSources(){
  const detail=q("scenario-game-sources"),list=q("scenario-game-list"),
   count=q("scenario-game-count");
  list.replaceChildren();
  if(!verifiedGameInfoBySourceKey){
   detail.hidden=true;
   count.textContent="Official GameInfo identity evidence unavailable; no source game is inferred.";
   return;
  }
  const chosen=analysis.scenarios.find(s=>s.code===activeScenario);
  if(!chosen){detail.hidden=true;return;}
  const assign=new Map(chosen.groups.flatMap(g=>g.ids.map(id=>[id,g.label])));
  const games=analysis.gameGraph.verifiedMatches.map(game=>{
   const verified=verifiedGameInfoBySourceKey.get(game.sourceGameKey);
   if(!verified)throw Error("SCENARIO_OFFICIAL_GAME_ID_SOURCE_MISSING");
   const a=assign.get(game.teamIds[0]),b=assign.get(game.teamIds[1]);
   if(!a||!b)throw Error("SCENARIO_TEAM_MEMBERSHIP_UNVERIFIED");
   return {verified,groupA:a,groupB:b,sameGroup:a===b};
  }).sort((a,b)=>b.verified.date.localeCompare(a.verified.date)||
        a.verified.officialGameId-b.verified.officialGameId);
  const same=games.filter(g=>g.sameGroup).length;
  if(games.length!==verifiedGameInfoBySourceKey.size||
     same!==chosen.evidence.observedSameGroupGames)
   throw Error("SCENARIO_GAME_COUNTS_NOT_MATCHING_VERIFIED_SOURCE");
  count.textContent=games.length+" verified official GameInfo IDs · "+same+
   " observed games between teams grouped together in this "+chosen.title+
   " view · "+(games.length-same)+" across the displayed groups.";
  for(const {verified:g,groupA,groupB,sameGroup} of games){
   const card=el("article","week-card");
   put(card,"strong","",g.date+" · "+g.homeTeamName+" vs "+g.awayTeamName+
      " · "+g.publishedFinalGoals.join("-"));
   put(card,"small","",("Official GameInfo #"+g.officialGameId+" · "+
      (sameGroup?"SAME selected group: "+groupA:
        "ACROSS selected groups: "+groupA+" / "+groupB))+
      (chosen.code==="CURRENT"?" · actual current membership":
        " · HYPOTHETICAL membership only"));
   if(g.scoringEventAdmission==="HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION")
    put(card,"small","warning","Official team result source-confirmed; individual scoring events held");
   const link=put(card,"a","small","Inspect exact SVHL GameInfo");
   link.href=g.officialGameInfoURL;
   link.target="_blank";link.rel="noopener noreferrer";
   list.append(card);
  }
  detail.hidden=false;
 }
 function renderScenario(){
  const chosen=analysis.scenarios.find(s=>s.code===activeScenario);
  const original=analysis.scenarios.find(s=>s.code==="CURRENT");
  const options=q("scenario-options");options.replaceChildren();
  for(const s of analysis.scenarios){
   const button=el("button","scenario");button.type="button";
   button.setAttribute("aria-pressed",String(s.code===activeScenario));
   button.setAttribute("aria-label",s.title+" — dispersion "+s.dispersion+", "+s.movedTeams+" hypothetical moves");
   put(button,"strong","",s.title);
   put(button,"span","number",num(s.dispersion,2));
   put(button,"small","","within-group dispersion of descriptive index (lower is mathematically closer)");
   put(button,"small","",s.movedTeams+" clubs differently grouped · "+
     (s.kind==="ACTUAL_SOURCE_ASSIGNMENTS"?"real published assignments":"UNAPPROVED EXPERIMENT"));
   button.addEventListener("click",()=>{activeScenario=s.code;renderScenario()});
   options.append(button);
  }
  q("scenario-info").textContent=chosen.code==="CURRENT"?
   "Current official source grouping; reference dispersion "+num(original.dispersion,2)+
     ". No team transfers are implied.":
   "Research sandbox only: descriptive dispersion "+num(chosen.dispersion,2)+" versus "+num(original.dispersion,2)+
   " in the current divisions. "+chosen.movedTeams+" possible re-groupings. "+
   chosen.limitation+" Not a league recommendation, team movement approval or win prediction.";
  const evidence=chosen.evidence;
  const box=q("scenario-evidence");box.replaceChildren();
  metric(box,evidence.observedSameGroupGames,"real completed games between teams grouped together in this view");
  metric(box,evidence.observedAcrossGroupGames,"real games between teams assigned to different groups in this view");
  metric(box,num(100*evidence.observedPairingCoverage,1)+"%",
      "possible in-group team pairings represented by at least one result");
  metric(box,evidence.percentTwoGoalOrCloser===null?"unavailable":num(evidence.percentTwoGoalOrCloser,1)+"%",
      "games decided by two goals or fewer, among observed in-group meetings");
  q("scenario-evidence-caution").textContent=
     "Only "+evidence.observedSameGroupGames+" of "+analysis.gameGraph.verifiedGamesInPool+
     " completed games tested this hypothetical same-group membership. "+
     "These games occurred under the actual historic schedules, not the hypothetical divisions. "+
     evidence.sampleWarning;
  const grid=q("division-groups");grid.replaceChildren();
  const lookup=new Map(analysis.teams.map(t=>[t.sourceTeamId,t]));
  for(const group of chosen.groups){
   const card=el("article","group");
   put(card,"strong","",group.label);
   put(card,"p","small",group.capacity+" teams · context "+
     num(group.minIndex)+"–"+num(group.maxIndex)+
     " · mean "+num(group.meanIndex)+
     " · spread "+num(group.range));
   const teamRows=group.ids.map(id=>lookup.get(id)).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
   for(const t of teamRows){
    const row=el("div","team-row");
    const name=el("div");
    put(name,"span","",t.name);
    if(chosen.code!=="CURRENT")put(name,"small","",t.divisionNow+" (actual)");
    row.append(name);
    const strength=el("div","value");
    put(strength,"strong","",num(t.score)+"/100");
    put(strength,"small","",t.gp+" verified games");
    row.append(strength);card.append(row);
   }
   grid.append(card);
  }
  renderScenarioGameSources();
 }
 function readiness(){
  const ready=analysis.readiness;
  q("gate-summary").textContent=analysis.status==="EXPLORATORY_ONLY_INSUFFICIENT_SEASON_EVIDENCE"?
    "Not ready for a formal division proposal. These are early research scenarios only. "+
    "Existing assignments remain authoritative.":
    "Initial numeric thresholds met, but human evaluation and league consultation are still mandatory. "+
    "No automatic recommendation is issued.";
  const checks=q("readiness-checks");checks.replaceChildren();
  const rows=[
   {label:"Weekly evidence",count:analysis.weekCount,target:ready.minWeeks,unit:"accepted weeks"},
   {label:"Sufficient team-game coverage",count:analysis.playedTen,target:Math.ceil(analysis.adultPoolTeamCount*ready.minCoverage),
    unit:"teams with at least "+ready.minGames+" games"},
   {label:"Cross-division evidence",count:analysis.gameGraph.crossCurrentDivisionGames,
    target:ready.minCrossGames,unit:"unique reciprocal cross-division games"}
  ];
  for(const r of rows){
   const section=el("div","rule");
   const head=el("div","row");
   put(head,"strong","",r.label);put(head,"span","small",r.count+" / "+r.target+" "+r.unit);
   section.append(head);
   const bar=el("div","bar"),fill=el("span");
   fill.style.width=Math.min(100,Math.max(0,100*r.count/r.target))+"%";
   bar.append(fill);section.append(bar);
   put(section,"small","",r.count>=r.target?"Minimum observed; not an approval":"Still collecting source-supported evidence");
   checks.append(section);
  }
  const other=el("p","small");
  other.textContent="Required beyond numbers: "+ready.humanFactors.join("; ")+".";
  checks.append(other);
 }
 function historical(){
  const metrics=q("historical-metrics");metrics.replaceChildren();
  const h=analysis.historical;
  metric(metrics,h.matchedGameComparisons,"Brave H.C. old games matched to archived team-season records");
  metric(metrics,h.matchedSeasonTeams,"qualified historical team-season links");
  metric(metrics,h.heldComparisons===null?"Not loaded":h.heldComparisons,
   "historical comparisons still held for source review");
  metric(metrics,h.sameCurrentTeamClaims,"historical identities automatically promoted to today's roster");
  q("historical-note").textContent=h.note+
   " These archived games support historical division context; they are NOT added to the 2026/27 score. "+
   "Absence of a historical link does not establish that opponents never met.";
 }
 function report(){
  const s=analysis.scenarios.find(s=>s.code===activeScenario);
  const original=analysis.scenarios.find(s=>s.code==="CURRENT");
  const lines=[
   "BRAVE H.C. | HOCKEYOS DIVISION FIT RESEARCH",
   "INTERNAL RESEARCH — NOT A DIVISION REALIGNMENT RECOMMENDATION",
   ...(window.BraveDivisionLayoutView?
     [window.BraveDivisionLayoutView.researchText()]:[]),
   "Current source: "+analysis.sourceReferences.league,
   "Official league snapshot checked: "+analysis.sourceAsOf,
   "Scope: "+analysis.adultPoolTeamCount+" adult-pool teams in "+analysis.poolDivisions.join(", "),
   "Other competitions excluded from this adult-only report: "+analysis.separateLeagueRecordsExcluded+" separate source records.",
   "Completed source-confirmed games in pool: "+analysis.gameGraph.verifiedGamesInPool,
   "Of those, "+analysis.gameGraph.crossCurrentDivisionGames+
      " were between teams NOW in different divisions; divisions at time of each game not inferred.",
   "Latest weekly observations: "+analysis.weekCount,
   ...(stability?[
     "WEEKLY SOURCE STABILITY: "+stability.state+
        " across "+stability.completeObservedWeeks+" complete weeks.",
     "Weekly index movement: "+(stability.lastTransition?
        num(stability.lastTransition.meanAbsoluteScoreChange,2)+
        " mean absolute points, "+stability.lastTransition.bandCrossings+
        " band crossings across "+stability.lastTransition.teamsCompared+" same official team IDs":
        "NOT MEASURABLE — one source-backed baseline only."),
     "Team research-band stability is not real league assignment evidence; "+
        stability.incompleteWeeksHeld.length+" incomplete weeks held. No missing weeks imputed.",
     "Stability readiness: "+(stability.dataReadyForHumanReview?
        "source-history minimum met, human evaluation still required":
        "NOT READY FOR DIVISION RECOMMENDATION")
   ]:[]),
   "Games coverage: "+analysis.playedTen+"/"+analysis.adultPoolTeamCount+" adult teams with >=10 games.",
   "CURRENT group dispersion (descriptive): "+num(original.dispersion,2),
   "VIEWED SCENARIO: "+s.title+"; dispersion "+num(s.dispersion,2)+
       "; "+s.movedTeams+" hypothetical moves; "+s.kind,
   "Actual head-to-head evidence for VIEWED grouping: "+s.evidence.observedSameGroupGames+
      " prior completed games would fall within those hypothetical groups, "+
      s.evidence.observedAcrossGroupGames+" across groups. "+
      s.evidence.observedUniqueSameGroupPairings+"/"+s.evidence.allPossibleSameGroupPairings+
      " possible in-group team pairings have a verified result.",
   "Observed games within selected groups decided by at most two goals: "+
      s.evidence.twoGoalOrCloserGames+"/"+s.evidence.observedSameGroupGames+
      "; mean observed absolute goal margin "+
      num(s.evidence.meanObservedGoalMargin,2)+".",
   "CRITICAL: those games occurred under real schedules. This is NOT a simulated matchup, inferred result or proof of a better division.",
   ...s.groups.map(g=>g.label+" | "+g.capacity+" clubs | descriptive range "+
       num(g.minIndex)+"–"+num(g.maxIndex)+
       " | teams "+g.ids.map(id=>analysis.teams.find(t=>t.sourceTeamId===id)?.name||"unresolved").join(", ")),
   "Historic source-matched Brave H.C. games: "+analysis.historical.matchedGameComparisons+
      " across "+analysis.historical.matchedSeasonTeams+" season-team records.",
   "Historic comparisons held: "+analysis.historical.heldComparisons+
      ". No past roster/franchise continuity is inferred.",
   "Status: "+analysis.status+"; proposalReady = FALSE",
   "Evidence gate: "+analysis.readiness.reason,
   "Unresolved review: "+analysis.readiness.humanFactors.join("; "),
   "Scoring limitations: this index is descriptive, editorially weighted, early-sample and NOT a calibrated win probability.",
   "Source-game and team IDs are source-specific; no HTO player assignments, workbook or official league records have been edited.",
   "Copying this note is not league submission or approval."
  ];
  return lines.join("\n");
 }
 async function init(){
  try{
   if(!window.BraveDivisionFit)throw Error("Division model unavailable");
   const [leagueR,historyR]=await Promise.all([
    fetch("./league-intelligence.json",{cache:"no-store"}),
    fetch("./brave-historical-verified-games.json",{cache:"no-store"})
   ]);
   if(!leagueR.ok)throw Error("Source-qualified league results unavailable");
   const league=await leagueR.json();
   const hist=historyR.ok?await historyR.json():null;
   analysis=window.BraveDivisionFit.analyze(league,hist);
   if(!window.BraveWeeklyStability)throw Error("Weekly stability module not installed");
   stability=window.BraveWeeklyStability.analyze(league);
   if(!window.BraveDivisionLayoutView)throw Error("Flexible division layout module missing");
   window.BraveDivisionLayoutView.init(analysis);
   source();connections();videoBridgeReadiness();renderScenario();renderStability();readiness();historical();
   loadOfficialGameIDBridges().catch(error=>{
    verifiedGameInfoBySourceKey=null;
    window.BraveDivisionLayoutView?.clearOfficialGameInfoSource?.();
    renderScenarioGameSources();
    const status=q("video-readiness-status");
    if(status.textContent.includes("INSUFFICIENT_VIDEO"))
     status.textContent+=" Official GameInfo ID crosswalk held: "+error.message+
       ". Original results and division scenarios remain unchanged.";
   });
   q("notice").textContent=analysis.proposalReady?
     "Research source verified; proposal held for human review.":
     "Source verified. Preliminary research only — no division changes recommended.";
   q("copy-research").addEventListener("click",async()=>{
    if(!navigator.clipboard?.writeText){q("copy-feedback").textContent="Clipboard unavailable in this browser.";return}
    try{await navigator.clipboard.writeText(report());q("copy-feedback").textContent="Internal evidence note copied; it has not been submitted."}
    catch(_){q("copy-feedback").textContent="Clipboard permission not granted."}
   });
   q("print-research").addEventListener("click",()=>window.print());
   // The optional player-roster evidence never gates accepted team standings.
   try{
    const rosterR=await fetch("./svhl-roster-intelligence.json",{cache:"no-store"});
    if(!rosterR.ok)throw Error("public roster-season source unavailable");
    const roster=await rosterR.json();
    window.BraveDivisionLayoutView.setRosterSource(league,roster);
   }catch(error){
    q("layout-roster-source-status").textContent="Roster evidence held: "+error.message+
      ". Grouping suggestions remain based only on admitted team/game results.";
   }
  }catch(error){
   q("notice").textContent="Research source held: "+error.message+
     ". No team grouping is displayed without qualified sources.";
  }
 }
 init();
})();