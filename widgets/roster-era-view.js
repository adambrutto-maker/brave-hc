/* Rostered players: current source form, historical same-player ID scoring and
   archived opponent-division context. Deliberately no invented cross-era tier strength. */
(()=>{"use strict";
 const $=id=>document.getElementById(id);
 if(!window.BraveRosterEraStrength)return;
 const model=window.BraveRosterEraStrength;
 const p=(tag,cls,text)=>{const x=document.createElement(tag);
  if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
 const fmt=n=>Number.isFinite(n)?n.toFixed(2):"Not established";
 const past=n=>Number.isFinite(n)?n.toFixed(1)+"%":"Not established";
 const note="Historical team standings describe success inside the original division, "+
   "NOT a universal ranking of division skill. Verified player IDs prove identity continuity, "+
   "not next-game attendance, position, defensive ability or comparable opponent difficulty.";
 async function sources(){
  const files=["./league-intelligence.json","./svhl-roster-intelligence.json",
    "./historical-svhl-standings.json"];
  const responses=await Promise.all(files.map(f=>fetch(f,{cache:"no-store"})));
  if(responses.some(x=>!x.ok))throw Error("Independent league/roster/archive source unavailable");
  return Promise.all(responses.map(r=>r.json()));
 }
 function box(label,value,extra){
  const root=p("div","era-stat");root.append(
   p("span","era-stat-label",label),
   p("strong","era-stat-value",value),
   p("small","era-stat-extra",extra));
  return root;
 }
 function statGrid(){return p("div","era-stat-grid")}
 function printOpponent(host,report){
  host.replaceChildren();
  host.append(p("div","era-kicker","ROSTERED PLAYER EVIDENCE · SINCE 2016/17"),
    p("h3","","Current strength and historical roster strength"));
  const grid=statGrid();
  grid.append(
   box("Current team context",Number.isFinite(report.currentTeamDescriptor)?
     report.currentTeamDescriptor.toFixed(1)+"/100":"Not rated",
     report.currentGames+" verified games; descriptive, not a win probability"),
   box("Current roster production",fmt(report.currentlyPlayedPPG)+" P/GP",
     report.currentPlayedCount+" roster players with published games"),
   box("Historical-informed scoring reference",fmt(report.rosterEraScoringReferencePPG)+" P/GP",
     "Current player scoring blended with verified historical player-ID rates; 8 prior pseudo-games maximum. Research only."),
   box("Returning players' current form",fmt(report.currentReturningPPG)+" P/GP",
     report.returningPlayedCount+" current active and historically ID-linked players"),
   box("Same returning players historically",
     report.historicalComparisonSupported?fmt(report.recencyWeightedHistoricalReturningPPG)+" P/GP":"Insufficient comparable history",
     "Archived scoring weighted toward recent seasons, same player-ID cohort")
  );
  host.append(grid);
  const level=p("p","era-context",
   report.rosteredHistoricalIDs+" / "+report.rosterCount+
   " currently listed players have archived adult Sunday source evidence; "+
   report.historicalLinkedGP+" recorded earlier appearances across "+
   report.historicalSourceTeams+" source team-seasons. "+
   "Previous team finishing strength inside its original division: "+
   past(report.priorTeamWithinDivisionPosition)+
   " average relative position across linked earlier source teams. "+
   "This is NOT proof of how strong those historical divisions were.");
  host.append(level);
  if(!report.historicalComparisonSupported){
   host.append(p("p","era-held",
    "Historical-vs-current scoring comparison held: fewer than 4 returning "+
    "currently active players or fewer than 30 recency-weighted historical games."));
  }
  const details=p("details","era-detail");
  details.append(p("summary","","View every rostered player's verified seasons"));
  details.append(p("p","era-context",note));
  const scroll=p("div","era-scrolling");
  const table=p("table","era-table");const head=p("thead"),tr=p("tr");
  for(const t of ["Current rostered player","Now GP / P","Prior GP / P","Prior recency-weighted P/GP","Archived teams and divisions"]){
   tr.append(p("th","",t));
  }
  head.append(tr);table.append(head);
  const body=p("tbody");
  for(const player of [...report.players].sort((a,b)=>b.priorGP-a.priorGP||b.currentPoints-a.currentPoints)){
   const row=p("tr");
   row.append(
    p("td","",player.name),
    p("td","",player.currentGP+" / "+player.currentPoints),
    p("td","",player.priorGP+" / "+player.priorPoints),
    p("td","",fmt(player.recencyWeightedPPG))
   );
   const cell=p("td");if(!player.history.length)cell.textContent="No qualified archived ID records";
   else for(const h of player.history){
    const line=p("div","era-past-row");
    const link=p("a","",h.season+" · "+h.division+
      " · "+h.team+" ("+h.teamRank+"/"+h.divisionTeams+" in division; "+
      h.pts+" P / "+h.gp+" GP)");
    link.href=h.source;link.target="_blank";link.rel="noopener noreferrer";
    line.append(link);cell.append(line);
   }
   row.append(cell);body.append(row);
  }
  table.append(body);scroll.append(table);details.append(scroll);
  host.append(details);
  const copy=p("button","era-copy","Copy this roster-history research note");
  copy.type="button";
  const copyStatus=p("p","era-context");copyStatus.setAttribute("role","status");
  copy.addEventListener("click",async()=>{
   try{
    if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
    await navigator.clipboard.writeText(model.teamNote(report));
    copyStatus.textContent="Source-qualified research copied; nothing sent.";
   }catch(_){copyStatus.textContent="Copy unavailable; browser permission may be required.";}
  });
  host.append(copy,copyStatus);
  host.append(p("p","era-context",
   "Source snapshots: current league "+report.sourceLeagueAsOf+
   "; roster "+report.sourceRosterCaptureUTC+
   "; archive "+report.sourceArchiveUTC+". "+report.note));
 }
 function printDivision(host,reports){
  host.replaceChildren();
  host.append(p("div","era-kicker","RESEARCH ONLY · SOURCE-ID LINKED ROSTERS"),
    p("h3","","Does the proposed division mix account for its current players' past performance?"),
    p("p","era-context",
     "Compare current team context and the same CURRENTLY ROSTERED players' recorded older scoring. "+
     "Historical division quality is not yet calibrated across eras; player and team indices are "+
     "separate signals, never a simulated result or automatic optimizer weight."));
  const proposed=$("layout-proposal-groups"),groups=[];
  for(const [i,card] of [...proposed.querySelectorAll(".group")].entries()){
   const ids=[...card.querySelectorAll(".team-row[data-source-team-id]")]
     .map(row=>Number(row.dataset.sourceTeamId));
   if(ids.length)groups.push({key:"source-layout-"+i,ids,capacity:ids.length});
  }
  if(!groups.length){host.append(p("p","era-held","Waiting for verified division assignments…"));return;}
  let summaries;try{summaries=model.forGroups(reports,groups)}
  catch(e){host.append(p("p","era-held","Proposed roster context held: "+e.message));return;}
  const groupBox=p("div","era-group-grid");
  for(const [i,g] of summaries.entries()){
   const card=p("article","era-group");
   card.append(p("strong","","Research division "+(i+1)+" · "+g.capacity+" clubs"),
    p("p","","Current player scoring average: "+fmt(g.meanCurrentRosterPPG)+
      " P/GP. History-informed reference: "+fmt(g.meanEraScoringReferencePPG)+
      " P/GP. Returning players' archived scoring average: "+
      fmt(g.meanHistoricalReturningPPG)+" P/GP."),
    p("small","",g.supportedTeams+" clubs have sufficient comparable historical evidence; "+
      g.teamsWithoutSupportedHistory+" do not. Equal tier quality is not assumed."));
   groupBox.append(card);
  }
  host.append(groupBox);
  const groupCopy=p("button","era-copy","Copy the full roster-era division research note");
  groupCopy.type="button";
  const groupStatus=p("p","era-context");groupStatus.setAttribute("role","status");
  groupCopy.addEventListener("click",async()=>{
   try{
    if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
    await navigator.clipboard.writeText(model.groupNote(reports,groups));
    groupStatus.textContent="Source-qualified division research copied; nothing sent.";
   }catch(_){groupStatus.textContent="Copy unavailable; browser permission may be required.";}
  });
  host.append(groupCopy,groupStatus);
  const details=p("details","era-detail");details.append(
    p("summary","","Compare all 22 teams' current and historical roster evidence"));
  const scroll=p("div","era-scrolling"),table=p("table","era-table");
  const th=p("tr");for(const k of ["Current club","Current division","Current context /100",
    "Current roster P/GP","Same returning players prior P/GP","Players with historical IDs",
    "Archived team rank within its own division"]){th.append(p("th","",k));}
  const head=p("thead");head.append(th);table.append(head);
  const tbody=p("tbody");
  for(const t of [...reports].sort((a,b)=>a.division.localeCompare(b.division)||a.name.localeCompare(b.name))){
   const tr=p("tr");
   for(const v of [t.name,t.division,
     Number.isFinite(t.currentTeamDescriptor)?t.currentTeamDescriptor.toFixed(1):"N/A",
     fmt(t.currentlyPlayedPPG),
     t.historicalComparisonSupported?fmt(t.recencyWeightedHistoricalReturningPPG):"Insufficient",
     t.rosteredHistoricalIDs+"/"+t.rosterCount,past(t.priorTeamWithinDivisionPosition)])
    tr.append(p("td","",v));
   tbody.append(tr);
  }
  table.append(tbody);scroll.append(table);details.append(scroll);
  host.append(details,p("p","era-context",note));
 }
 if($("profile-title")){
  const host=p("section","era-panel");host.id="os-era-roster-strength";
  host.setAttribute("aria-label","Source-verified current player and historical player strength");
  const anchor=$("os-opponent-snapshot")||$("profile-metrics");
  anchor?.after(host);
  sources().then(([league,roster,archive])=>{
   const render=()=>{
    const name=$("team-filter")?.value;if(!name)return;
    try{printOpponent(host,model.teamEvidence(league,roster,archive,name))}
    catch(e){host.replaceChildren(p("p","era-held","Historical roster insight held: "+e.message));}
   };
   $("team-filter").addEventListener("change",render);
   new MutationObserver(render).observe($("profile-title"),{childList:true});
   render();
  }).catch(e=>host.replaceChildren(p("p","era-held","Historical roster evidence unavailable: "+e.message)));
 }else if($("layout-proposal-groups")){
  const host=p("section","era-panel");host.id="os-era-division-strength";
  $("os-team-details")?.after(host);
  sources().then(([league,roster,archive])=>{
   const reports=model.allTeams(league,roster,archive);
   const original=$("layout-proposal-groups");
   let scheduled=false;
   const render=()=>{scheduled=false;printDivision(host,reports);};
   const schedule=()=>{if(!scheduled){scheduled=true;queueMicrotask(render);}};
   new MutationObserver(schedule).observe(original,{childList:true});
   render();
  }).catch(e=>host.replaceChildren(p("p","era-held","Division roster-era evidence held: "+e.message)));
 }
})();