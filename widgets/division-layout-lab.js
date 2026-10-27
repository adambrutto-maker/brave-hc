/* HockeyOS capacity-flexible division layout viewer. Research only. */
(function(){
 "use strict";
 const q=id=>document.getElementById(id);
 const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
 const add=(p,tag,cls,value)=>{const x=make(tag,cls,value);p.append(x);return x};
 const as=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):"unavailable";
 let study=null,focus="BALANCE",shape=null;
 function sorted(){
  return study?.choices[focus]||[];
 }
 function selected(){
  return sorted().find(x=>x.shapeId===shape)||sorted()[0];
 }
 function paint(){
  if(!study)return;
  const options=q("layout-design-options"),result=q("layout-proposal-groups");
  options.replaceChildren();result.replaceChildren();
  const shapes=sorted(),current=shapes.find(x=>x.divisionCount===3);
  const chosen=selected(),leading=shapes[0];
  if(!chosen || chosen.groups.some(group=>group.capacity%2!==0) ||
     chosen.groups.flatMap(group=>group.ids).length!==study.adultTeams)
    throw Error("Division layout must retain every team and have even-sized divisions");
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
    chosen.shapeId.split("-").join(" / ")+" — "+chosen.divisionCount+" draft research divisions";
  q("layout-proposal-comparison").textContent="Within-group descriptive dispersion "+
    as(chosen.dispersion)+"; "+chosen.sameGroupObservedGames+" of "+
    study.sourceAdultGames+" source-confirmed games occurred between clubs now grouped together "+
    "in this hypothetical layout ("+as(100*chosen.directPairCoverage,1)+
    "% of possible within-group pairings have a verified matchup). "+
    "Observed 2-goal-or-closer games: "+chosen.twoGoalOrCloserObserved+
    " of "+chosen.sameGroupObservedGames+". "+
    "At least "+chosen.movement.newResearchGroupsNeeded+
    " NEW division(s) would need to be administered beyond the current three."+
    " One complete round-robin would involve "+chosen.prospectiveOneRoundRobinGames+
    " distinct within-division pairings; that is a scheduling quantity, not a published schedule.";
  const team=new Map(study.teams.map(t=>[t.sourceTeamId,t]));
  chosen.groups.forEach((group,i)=>{
   const card=make("article","group");
   add(card,"strong","",group.label+" · "+group.capacity+" teams");
   add(card,"p","small","Descriptive index "+as(group.min,1)+"–"+
     as(group.max,1)+"; average "+as(group.average,1)+
     "; within-group spread "+as(group.spread,1));
   for(const id of group.ids){
    const t=team.get(id);
    if(!t)continue;
    const row=make("div","team-row"),info=make("div");
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
    "This algorithm ranks contiguous bands of CURRENT smoothed source index scores. "+
    "Source-recorded opponents, past score margins and earlier seasons inform evidence warnings, "+
    "not fabricated future matchups or assumed roster continuity. "+
    "A four-team division offers only three distinct opponents in one round robin, "+
    "whereas a six-team division offers five and an eight-team division offers seven. "+
    "Ice allocation, age/roster mix, registration, scheduling and league rules still require independent review.";
 }
 function textProposal(){
  if(!study)return "";
  const chosen=selected(),leader=sorted()[0];
  const team=new Map(study.teams.map(t=>[t.sourceTeamId,t]));
  return [
   "HOCKEYOS / BRAVE H.C. — DIVISION STRUCTURE RESEARCH DRAFT",
   "STATUS: PROVISIONAL MODEL PROPOSAL; NOT APPROVED OR SUBMITTED",
   "Data accepted: "+study.sourceAsOf+"; "+study.adultTeams+" adult Sunday teams.",
   "Source: Fazzari, Cristillo and Remax ONLY. Other leagues excluded.",
   "MANDATORY: each division must have an EVEN number of teams; permitted sizes 4, 6 and 8.",
   "Research focus: "+focus,
   "TOP-RANKED STRUCTURE BY THIS OBJECTIVE: "+leader.shapeId.split("-").join("+"),
   "SELECTED DRAFT: "+chosen.shapeId.split("-").join("+"),
   "Descriptive rating spread (RMSE within groups): "+as(chosen.dispersion),
   "Proposed number of research divisions: "+chosen.divisionCount+
      "; new groups above current three: "+chosen.movement.newResearchGroupsNeeded,
   "Hypothetical teams changing grouping: "+chosen.movement.hypotheticalDifferentGroupCount+
      " (label-matched maximum-retention comparison only).",
   "Historical matchup evidence: "+chosen.sameGroupObservedGames+
      " past verified games within proposed group membership, out of "+
      study.sourceAdultGames+" pool games.",
   "Observed pair coverage "+chosen.sameGroupSourcePairings+"/"+
      chosen.possibleGroupPairings+" possible group pairings.",
   "One complete round robin would schedule "+chosen.prospectiveOneRoundRobinGames+
      " distinct group matchups (not an official calendar).",
   ...chosen.groups.map((g,i)=>[
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
 function init(analysis){
  if(!window.BraveDivisionArchitect)throw Error("Division architect module unavailable");
  study=window.BraveDivisionArchitect.run(analysis);
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
  q("layout-design-status").textContent=study.exploredShapes+
    " valid even-sized patterns for "+study.adultTeams+
    " adult teams. Allowed division team counts: 4, 6 or 8.";
  paint();
 }
 window.BraveDivisionLayoutView=Object.freeze({init,researchText:textProposal,getSelected:selected});
})();
