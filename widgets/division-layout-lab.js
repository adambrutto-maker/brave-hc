/* HockeyOS capacity-flexible division layout viewer. Research only. */
(function(){
 "use strict";
 const q=id=>document.getElementById(id);
 const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 const add=(p,tag,cls,value)=>{const x=make(tag,cls,value);p.append(x);return x};
 const as=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):"unavailable";
 let study=null,accepted=null,focus="BALANCE",shape=null,method="INDEX_BANDS";
 let sourceRosterEvidence=null,sourceLeagueData=null;
 const refinedCache=new Map();
 function sorted(){
  return study?.choices[focus]||[];
 }
 function selected(){
  return sorted().find(x=>x.shapeId===shape)||sorted()[0];
 }
 function refinementFor(proposal){
  const key=focus+"|"+proposal.shapeId;
  if(!refinedCache.has(key)){
   if(!window.BraveLineupRefinement)throw Error("Verified lineup refinement module not installed");
   refinedCache.set(key,window.BraveLineupRefinement.refine(accepted,proposal,focus));
  }
  return refinedCache.get(key);
 }
 function activePlacement(){
  const proposed=selected();
  if(!proposed)return null;
  const refinement=refinementFor(proposed);
  const groups=method==="REFINED"?refinement.groups:proposed.groups;
  return {proposed,refinement,groups,
    metrics:method==="REFINED"?refinement.refined:refinement.original};
 }
 function paint(){
  if(!study)return;
  const options=q("layout-design-options"),result=q("layout-proposal-groups");
  options.replaceChildren();result.replaceChildren();
  const shapes=sorted(),current=shapes.find(x=>x.divisionCount===3);
  const chosen=selected(),leading=shapes[0];
  const placement=activePlacement(),refined=placement.refinement;
  const shown=placement.metrics,groups=placement.groups;
  const groupRosterSource=sourceRosterEvidence&&window.BraveRosterDivisionContext?
    window.BraveRosterDivisionContext.summarize(sourceLeagueData,sourceRosterEvidence,groups):null;
  const groupRosterMap=new Map((groupRosterSource?.groups||[]).map(x=>[x.groupKey,x]));
  const rosterStatus=q("layout-roster-source-status");
  if(rosterStatus)rosterStatus.textContent=groupRosterSource?
    "Supplementary public roster evidence: "+groupRosterSource.teamCount+
    " current source teams, "+groupRosterSource.sourceHistoricalPlayerSeasons+
    " player-season observations, captured "+new Date(groupRosterSource.sourceRosterCaptureUTC).toLocaleString("en-CA")+
    ". Player availability and accuracy NOT verified; no numerical roster weight in grouping objective.":
    "Historical player roster context not available. Division optimization uses source-qualified games and index only.";
  const expectedOdd=study.adultTeams%2;
  if(!chosen ||
     chosen.groups.filter(group=>group.capacity%2!==0).length!==expectedOdd ||
     chosen.groups.some(group=>!window.BraveDivisionArchitect.allowedSizes.includes(group.capacity)) ||
     chosen.groups.flatMap(group=>group.ids).length!==study.adultTeams ||
     new Set(chosen.groups.flatMap(group=>group.ids)).size!==study.adultTeams)
    throw Error("Division layout must retain every team and satisfy parity of total enrollment");
  const swapBox=q("layout-refinement-swaps");swapBox.replaceChildren();
  const selectedRefinement=method==="REFINED";
  const objectiveGain=refined.improvement;
  q("layout-refinement-indicator").textContent=selectedRefinement?
    (refined.swaps.length?refined.swaps.length+" tested swap(s) applied":
     "No admissible improvement"):"Original ranked-band lineup";
  q("layout-refinement-detail").textContent=
    "Selected "+focus.toLowerCase()+" objective: "+as(refined.original.objective,3)+
    " before vs "+as(refined.refined.objective,3)+" after up to "+
    refined.searchLimit+" non-predictive swaps; improvement "+as(objectiveGain,3)+
    ". Source-verified in-group completed games: "+
    refined.original.sourceVerifiedSameGroupGames+" before / "+
    refined.refined.sourceVerifiedSameGroupGames+" after. "+
    "Hypothetical clubs reassigned: "+
    refined.original.movement.hypotheticalDifferentGroupCount+" before / "+
    refined.refined.movement.hypotheticalDifferentGroupCount+" after. "+
    "Lower is a better editorial objective—not proof of better future games.";
  if(selectedRefinement){
   if(!refined.swaps.length)add(swapBox,"p","small",
     "No pair swap improved the selected source-qualified objective. Existing band assignments remain unchanged.");
   for(const change of refined.swaps){
    const card=make("article","week-card");
    add(card,"strong","",change.left+" ↔ "+change.right);
    add(card,"small","","Source-linked team IDs "+change.sourceIds.join(" / ")+
      " · objective improvement "+as(change.indexGain,3));
    swapBox.append(card);
   }
  }
  q("layout-proposed-recommendation").textContent=
    "Model-first research proposal: "+leading.shapeId.split("-").join(" + ")+" teams in "+
      leading.divisionCount+" divisions. "+(focus==="BALANCE"?
      "This has the tightest CURRENT descriptive rating spread; smaller groups tend to reduce this mathematically.":
      focus==="PRACTICAL"?
      "This balances rating spread with transparent penalties for extra divisions, reassignments and limited prior head-to-head evidence.":
      "This prioritizes fewer division changes and greater continuity, while still considering rating spread.")+
      " The model does NOT prove any arrangement will deliver closer games.";
  for(const entry of shapes){
   const button=make("button","scenario layout-option");
   button.type="button";button.setAttribute("aria-pressed",String(entry.shapeId===chosen.shapeId));
   button.setAttribute("data-shape",entry.shapeId);
   add(button,"strong","",entry.shapeId.split("-").join(" + ")+" teams · "+entry.divisionCount+" divisions");
   add(button,"span","number",as(entry.dispersion,2));
   add(button,"small","","rating spread (lower = tighter)");
   add(button,"small","",entry.sameGroupObservedGames+" actual games link teams within these research divisions"+
     " · "+entry.movement.hypotheticalDifferentGroupCount+" possible assignment changes");
   add(button,"small","",entry.shapeId===leading.shapeId?
       "HIGHEST-RANKED BY SELECTED OBJECTIVE":"Alternative structure");
   button.addEventListener("click",()=>{shape=entry.shapeId;paint()});
   options.append(button);
  }
  q("layout-proposal-label").textContent="Viewing "+
    chosen.shapeId.split("-").join(" / ")+" — "+chosen.divisionCount+
    " research divisions ("+(expectedOdd?
     "exactly one odd-size division":"every division even-sized")+")";
  q("layout-proposal-comparison").textContent=(selectedRefinement?
    "Source-ID swap-refined lineup. ":"Original ranked-band lineup. ")+
    "Within-group descriptive dispersion "+as(shown.dispersion)+
    "; "+(selectedRefinement?shown.sourceVerifiedSameGroupGames:chosen.sameGroupObservedGames)+" of "+
    study.sourceAdultGames+" source-confirmed games occurred between clubs now grouped together "+
    "in this hypothetical layout ("+as(100*shown.directPairCoverage,1)+
    "% of possible within-group pairings have a verified matchup). "+
    "Observed 2-goal-or-closer games: "+
      (selectedRefinement?shown.observedCloseGames:chosen.twoGoalOrCloserObserved)+
    " of "+(selectedRefinement?shown.sourceVerifiedSameGroupGames:chosen.sameGroupObservedGames)+". "+
    "At least "+chosen.movement.newResearchGroupsNeeded+
    " NEW division(s) would need to be administered beyond the current three."+
    " One complete round-robin would involve "+chosen.prospectiveOneRoundRobinGames+
    " distinct within-division pairings; that is a scheduling quantity, not a published schedule.";
  const team=new Map(study.teams.map(t=>[t.sourceTeamId,t]));
  groups.forEach((group,i)=>{
   const card=make("article","group");
   add(card,"strong","",group.label+" · "+group.capacity+" teams");
   const groupScores=group.ids.map(id=>team.get(id).score),
      lowest=Math.min(...groupScores),highest=Math.max(...groupScores),
      groupMean=groupScores.reduce((a,b)=>a+b,0)/groupScores.length;
   add(card,"p","small","Descriptive index "+as(lowest,1)+"–"+
     as(highest,1)+"; average "+as(groupMean,1)+
     "; within-group spread "+as(highest-lowest,1));
   const rosterGroup=groupRosterMap.get(group.key);
   if(rosterGroup){
    add(card,"p","small","Source roster construction (supplementary, NOT scored): "+
      rosterGroup.avgRosteredPlayers+" listed players/team; "+
      rosterGroup.avgHistoricallyExperienced+" with 10+ archived GP/team; "+
      rosterGroup.avgLinkedPriorPlayerIDs+" with earlier official IDs/team. "+
      "Mean top-two points share: "+
      (rosterGroup.meanTopTwoPointShare===null?"unavailable":
         (rosterGroup.meanTopTwoPointShare*100).toFixed(1)+"%")+
      ". Not a confirmed game-night lineup.");
   }
   for(const id of group.ids){
    const t=team.get(id);
    if(!t)continue;
    const row=make("div","team-row"),info=make("div");
    row.dataset.sourceTeamId=String(id);
    add(info,"span","",t.name);
    add(info,"small","",t.divisionNow+" (current)");
    row.append(info);
    const value=make("div","value");
    add(value,"strong","",as(t.score,1)+"/100");
    add(value,"small","",t.gp+" verified games");
    row.append(value);card.append(row);
   }
   result.append(card);
  });
  const warnings=q("layout-caveat");
  warnings.textContent="PROVISIONAL MODEL PROPOSAL ONLY. Current data has "+
    study.admittedWeeks+" accepted weekly observation(s). "+
    "The initial lineup uses contiguous score bands; optional refinement tests "+
    "actual source-ID pair swaps under the selected editorial objective. "+
    "Source-recorded opponents, past score margins and earlier seasons inform evidence warnings, "+
    "not fabricated future matchups or assumed roster continuity. "+
    "A four-team division offers only three distinct opponents in one round robin, "+
    "whereas a six-team division offers five and an eight-team division offers seven. "+
    "Ice allocation, age/roster mix, registration, scheduling and league rules still require independent review.";
 }
 function textProposal(){
  if(!study)return "";
  const placement=activePlacement(),chosen=placement.proposed,
    leader=sorted()[0],refinement=placement.refinement,
    sourceMetric=placement.metrics,groups=placement.groups;
  const team=new Map(study.teams.map(t=>[t.sourceTeamId,t]));
  return [
   "HOCKEYOS / BRAVE H.C. — DIVISION STRUCTURE RESEARCH DRAFT",
   "STATUS: PROVISIONAL MODEL PROPOSAL; NOT APPROVED OR SUBMITTED",
   "Data accepted: "+study.sourceAsOf+"; "+study.adultTeams+" adult Sunday teams.",
   "Source: Fazzari, Cristillo and Remax ONLY. Other leagues excluded.",
   "MANDATORY: for EVEN overall team total, every division has 4, 6 or 8 teams. For ODD overall team total, exactly ONE division has 5 or 7 teams and every other division has 4, 6 or 8.",
   "Research focus: "+focus,
   "TOP-RANKED STRUCTURE BY THIS OBJECTIVE: "+leader.shapeId.split("-").join("+"),
   "SELECTED DRAFT: "+chosen.shapeId.split("-").join("+"),
   "Team placement method: "+(method==="REFINED"?
      "BOUNDED EVIDENCE-AWARE SOURCE-ID SWAP REFINEMENT":"CONTIGUOUS SOURCE SCORE-RANKED BANDS"),
   "Editorial objective: "+as(refinement.original.objective,3)+" initial / "+
      as(refinement.refined.objective,3)+" source-ID refined; improvement "+as(refinement.improvement,3),
   "Descriptive rating spread (RMSE within groups): "+as(sourceMetric.dispersion),
   ...(sourceRosterEvidence&&window.BraveRosterDivisionContext?
      [ "ROSTER BUILD EVIDENCE: public official player IDs over "+
        sourceRosterEvidence.playerSeasonObservations+" roster-season observations.",
        ...window.BraveRosterDivisionContext.summarize(sourceLeagueData,sourceRosterEvidence,groups)
         .groups.map(g=>g.groupKey+": "+g.avgHistoricallyExperienced+
          " source players per club with 10+ archived GP, "+g.avgLinkedPriorPlayerIDs+
          " with exact-linked prior player IDs, "+(g.meanTopTwoPointShare===null?
          "unavailable":(g.meanTopTwoPointShare*100).toFixed(1)+"%")+
          " mean two-player point concentration. ROSTER INDICATORS NOT WEIGHTED.")
      ]:[]) ,
   "Proposed number of research divisions: "+chosen.divisionCount+
      "; new groups above current three: "+chosen.movement.newResearchGroupsNeeded,
   "Hypothetical teams changing grouping: "+sourceMetric.movement.hypotheticalDifferentGroupCount+
      " (label-matched maximum-retention comparison only).",
   "Historical matchup evidence: "+(method==="REFINED"?
      sourceMetric.sourceVerifiedSameGroupGames:chosen.sameGroupObservedGames)+
      " past verified games within proposed group membership, out of "+
      study.sourceAdultGames+" pool games.",
   "Observed pair coverage "+
      (method==="REFINED"?sourceMetric.verifiedSameGroupPairings:chosen.sameGroupSourcePairings)+"/"+
      chosen.possibleGroupPairings+" possible group pairings.",
   "Refinement search: "+refinement.candidateSwapsEvaluated+
      " pair candidates evaluated; "+refinement.swaps.length+
      " improving pair swaps admitted; bounded at "+refinement.searchLimit+".",
   ...refinement.swaps.map(x=>"SOURCE-ID TEAM SWAP: "+x.left+" / "+x.right+
      " (objective gain "+as(x.indexGain,3)+")"),
   "One complete round robin would schedule "+chosen.prospectiveOneRoundRobinGames+
      " distinct group matchups (not an official calendar).",
   ...groups.map((g,i)=>[
    "RESEARCH DIVISION "+(i+1)+" — "+g.capacity+" teams; index "+
      as(g.min,1)+"–"+as(g.max,1),
    ...g.ids.map(id=>{const t=team.get(id);return "  "+t.name+" ("+
      t.divisionNow+" currently; "+as(t.score,1)+"/100; "+
      t.gp+" accepted games)";})
   ]).flat(),
   "CAUTIONS: One source week; not a stable team-skill tier, opponent prediction or league decision.",
   "Extra division counts may create additional administrative workload, different opponent variety and ice scheduling requirements.",
   "Objective uses stated editorial weighting for operations and historical coverage; coefficients are NOT league-endorsed or statistically calibrated.",
   "No user authorization to change official assignments, send league communications, or rewrite Master Workbook.",
   "ADDITIONAL ACTION REQUIRED: validate rosters, head-to-head competitiveness, ice slots, team consultation and four+ actual weekly observations."
  ].join("\n");
 }
 function previewEnrollment(total){
  const container=q("layout-total-patterns"),summary=q("layout-total-preview-status");
  if(!container||!summary)return;
  container.replaceChildren();
  const count=Number(total),patterns=window.BraveDivisionArchitect.patterns(count);
  summary.textContent="Hypothetical size planning for "+count+" adult teams: "+
    patterns.length+" legal combinations. "+
    (count%2===0?"All divisions even-sized.":
      "Exactly ONE 5- or 7-team division; all others even-sized.")+
    (count===study.adultTeams?
      " Source-backed club assignments are available above.":
      " CAPACITY PLANNING ONLY: no clubs are added, removed or assigned.");
  for(const sizes of patterns){
   const card=make("div","week-card");
   add(card,"strong","",sizes.join(" + ")+" = "+count+" teams");
   add(card,"small","",sizes.length+" divisions · "+
      sizes.filter(n=>n%2!==0).length+" odd-sized division(s)");
   container.append(card);
  }
 }
 function setRosterSource(league,roster){
  if(!window.BraveRosterDivisionContext)throw Error("Roster division evidence module unavailable");
  window.BraveRosterIntelligence.valid(league,roster);
  sourceLeagueData=league;sourceRosterEvidence=roster;
  if(study)paint();
 }
 function init(analysis){
  if(!window.BraveDivisionArchitect)throw Error("Division architect module unavailable");
  study=window.BraveDivisionArchitect.run(analysis);
  accepted=analysis;refinedCache.clear();
  const placementSelector=q("layout-placement-mode");
  if(placementSelector){
    placementSelector.value=method;
    placementSelector.addEventListener("change",()=>{
      method=placementSelector.value;
      if(!["INDEX_BANDS","REFINED"].includes(method))
        throw Error("Invalid lineup placement method");
      paint();
    });
  }
  focus="BALANCE";shape=study.leading[focus];
  const modes=q("layout-design-focus");modes.replaceChildren();
  for(const mode of study.modes){
   const o=make("option","",mode.label);o.value=mode.code;
   modes.append(o);
  }
  modes.value=focus;
  modes.addEventListener("change",value=>{
   focus=value.target.value;shape=study.leading[focus];paint();
  });
  q("layout-copy").addEventListener("click",async()=>{
   try{
    if(!navigator.clipboard?.writeText)throw Error("Clipboard not available");
    await navigator.clipboard.writeText(textProposal());
    q("layout-copy-result").textContent="Provisional draft copied. It has not been submitted.";
   }catch(_){q("layout-copy-result").textContent="Could not copy; check clipboard permission."}
  });
  const planned=q("layout-total-preview");
  if(planned){
   planned.replaceChildren();
   const counts=[study.adultTeams-1,study.adultTeams,study.adultTeams+1]
     .filter(count=>count>=12&&count<=48);
   for(const count of counts){
    const option=make("option","",count+" teams"+(count===study.adultTeams?
      " — accepted current source":" — hypothetical only"));
    option.value=String(count);planned.append(option);
   }
   planned.value=String(study.adultTeams);
   planned.addEventListener("change",()=>previewEnrollment(planned.value));
   previewEnrollment(study.adultTeams);
  }
  q("layout-design-status").textContent=study.exploredShapes+
    " valid parity-constrained patterns for "+study.adultTeams+" verified adult teams."+
    (study.oddDivisionRequired?" Exactly one 5/7-team division required.":
      " All divisions have even team counts.");
  paint();
 }
 window.BraveDivisionLayoutView=Object.freeze({init,setRosterSource,researchText:textProposal,getSelected:selected});
})();
