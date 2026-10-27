"use strict";
(()=>{
 const el=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined&&value!==null)x.textContent=String(value);return x};
 const put=(parent,tag,cls,value)=>{const node=el(tag,cls,value);parent.append(node);return node};
 const q=id=>document.getElementById(id);
 const num=(v,n=1)=>Number.isFinite(v)?v.toFixed(n):"unavailable";
 let analysis=null,activeScenario="CURRENT";
 function metric(parent,value,description){
  const node=el("div","metric");
  put(node,"span","number",value);
  put(node,"small","",description);
  parent.append(node);
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
   "Current source: "+analysis.sourceReferences.league,
   "Official league snapshot checked: "+analysis.sourceAsOf,
   "Scope: "+analysis.adultPoolTeamCount+" adult-pool teams in "+analysis.poolDivisions.join(", "),
   "Other competitions excluded from this adult-only report: "+analysis.separateLeagueRecordsExcluded+" separate source records.",
   "Completed source-confirmed games in pool: "+analysis.gameGraph.verifiedGamesInPool,
   "Of those, "+analysis.gameGraph.crossCurrentDivisionGames+
      " were between teams NOW in different divisions; divisions at time of each game not inferred.",
   "Latest weekly observations: "+analysis.weekCount,
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
   source();connections();renderScenario();readiness();historical();
   q("notice").textContent=analysis.proposalReady?
     "Research source verified; proposal held for human review.":
     "Source verified. Preliminary research only — no division changes recommended.";
   q("copy-research").addEventListener("click",async()=>{
    if(!navigator.clipboard?.writeText){q("copy-feedback").textContent="Clipboard unavailable in this browser.";return}
    try{await navigator.clipboard.writeText(report());q("copy-feedback").textContent="Internal evidence note copied; it has not been submitted."}
    catch(_){q("copy-feedback").textContent="Clipboard permission not granted."}
   });
   q("print-research").addEventListener("click",()=>window.print());
  }catch(error){
   q("notice").textContent="Research source held: "+error.message+
     ". No team grouping is displayed without qualified sources.";
  }
 }
 init();
})();