/* LeagueOS V12 comprehensive commissioner feature directory.
 * Source-qualified, browser-local demonstrators are distinguished from proposed/unimplemented integrations.
 * The V10 primary nav stays deliberately unchanged.
 */
(function(){"use strict";
const $=s=>document.querySelector(s),esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sections=[
 {name:"Games, teams and league administration",description:"Core public-source and browser-local workflows already built for the demonstration.",items:[
  ["Game calendar","Browse source-qualified game dates, rinks, teams and result status.","league-schedule","Working source view"],
  ["Team directory","Explore published team-season records separated by competition night.","league-teams","Working source view"],
  ["Divisions and standings","Compare public standings across each night and division.","league-divisions","Working source view"],
  ["Digital game sheets","Interactive scorer-box prototype with event entry and draft review.","league-scoring","Interactive draft"],
  ["Team registration","Interactive team and roster draft, up to 20 rows.","league-registration","Interactive draft"],
  ["Rulebook and reviews","Search selected league-rule summaries and prepare a proposed clarification.","league-rules","Interactive draft"]]},
 {name:"Season scheduling, playoff management and rink use",description:"Real schedule-pattern and result logic, with proposed operations clearly marked as unapproved.",items:[
  ["Fair season scheduler","Rotate early/late game times; compare games by rink and export a CSV.","league-planner","Working scenario"],
  ["Arena operations & referee staffing","Four-rink day board, two shared Zambonis, referee/timekeeper assignments and linked HockeyOS demo schedule changes.","league-operations","Working scenario"],
  ["Playoff ladder","Historical-format series, round robin, wildcards, consolation and print-ready ladders.","league-playoffs","Working scenario"],
  ["Knockout sandbox","Simple bracket, seed movement and direct score-driven advancement.","league-bracket-sandbox","Working scenario"],
  ["Scheduling audit","Review source-based start times, game gaps and fairness evidence.","league-schedule-equity","Source research"],
  ["Dated ice evidence","Validate fictional or redacted ice blocks and exclude known conflicts.","league-inventory","Interactive draft"],
  ["Rink requests","Prepare non-booking ice-use inquiries and identify unknown availability.","league-ice","Interactive draft"]]},
 {name:"Competitive balance, history and intelligence",description:"The part of LeagueOS that can examine repeated mismatches while respecting every team in the division.",items:[
  ["Division health and opponent exposure","Cristillo review case with all clubs, sourced results and rematch scenarios.","league-division-review","Source research · demo case"],
  ["Division alignment","Source-backed strength comparisons and potential review candidates.","league-alignment","Research review"],
  ["Whole-division fairness","Assess how potential changes affect other clubs, not only two teams.","league-fairness","Research review"],
  ["Commissioner decision desk","Review source-qualified division proposals with explicit human gates.","league-decisions","Research review"],
  ["Season history","Explore Winter 2011/12–2026/27 historical league records.","league-history","Source research"],
  ["League intelligence","Existing analytics, opponent intelligence and auditing workspaces.","league-analysis","Working research links"]]},
 {name:"Commercial systems and future official controls",description:"These screens explain the intended product scope. They are not connected to official services.",items:[
  ["Payments and receipts","Deposits, instalments and team balances; no live payment processor.","league-payments","Proposed integration"],
  ["Player eligibility and movement","Fictional checklist for source identity, call-ups and commissioner review; no live authorization.","league-eligibility-preview","UI concept · not connected"],
  ["Discipline and video review","Fictional incident workflow, evidence governance and appeal pathway; no live cases or video.","league-discipline-preview","UI concept · not connected"],
  ["Referee and facility authorization","Fictional scheduling gate with historical time-pattern evidence; no referee roster or booked ice.","league-officials-preview","UI concept · not connected"]]}
];
function kind(x){
 if(!x[2]||/^(?:Proposed|Planned|UI concept)/.test(x[3]))return"planned";
 if(/source|research/i.test(x[3]))return"research";
 return"demo";
}
let activeFilter="all",searchText="";
function filterCatalog(){
 const root=$("#league-feature-hub-mount");if(!root)return;
 let visible=0;
 for(const item of root.querySelectorAll(".v13-catalog-group .v12-feature-entry[data-v13-kind]")){
  const term=item.textContent.toLowerCase(),allowed=(activeFilter==="all"||item.dataset.v13Kind===activeFilter)&&(!searchText||term.includes(searchText));
  item.classList.toggle("v13-feature-hidden",!allowed);if(allowed)visible++;
 }
 for(const group of root.querySelectorAll(".v13-catalog-group")){
  group.classList.toggle("v13-feature-hidden",!group.querySelector(".v12-feature-entry:not(.v13-feature-hidden)"))
 }
 for(const b of root.querySelectorAll("[data-v13-feature-filter]")){
  const selected=b.dataset.v13FeatureFilter===activeFilter;
  b.setAttribute("aria-pressed",String(selected));b.classList.toggle("selected",selected)
 }
 const status=root.querySelector("#v13-visible-count");if(status)status.textContent=visible+" of "+sections.reduce((sum,g)=>sum+g.items.length,0)+" catalog entries shown"+(visible===0?" · Try a broader search":"");
}
function entry(x){return x[2]?'<button type="button" class="v12-feature-entry" data-v13-kind="'+kind(x)+'" data-go="'+esc(x[2])+'"><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small><span>'+esc(x[3])+' · Open</span></button>':
 '<div class="v12-feature-entry" data-v13-kind="'+kind(x)+'" role="group" aria-label="'+esc(x[0])+' is planned and not available"><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small><span>'+esc(x[3])+'</span></div>'}
function mount(){const root=$("#league-feature-hub-mount");if(!root)return;
root.innerHTML='<div class="v12-feature-hub"><div class="v12-feature-intro"><h2>Your complete LeagueOS workspace</h2><p>Every area has a clear destination, including three new UI concepts for future official controls. Concept pages are not connected operational systems.</p></div>'+
'<section class="v12-catalog-section v12-tour"><div class="v13-feature-tour-head"><div><h2>Explore the commissioner workflow</h2><p>Follow the four practical workflows below, then review the full suite. Or use the guided five-step tour to move between them.</p></div><button type="button" class="btn primary" data-v13-start>Start 5-step guided demo</button></div><div class="v12-feature-grid">'+
[["1. Published game","Check a sourced game and its rink.","league-schedule","Step 1"],
["2. Fair schedule","Generate a historically informed, early/late-balanced plan.","league-planner","Step 2"],
["3. Playoff ladder","Record demonstration results and watch teams advance.","league-playoffs","Step 3"],
["4. Division health","Compare all teams in a real source-qualified imbalance case.","league-division-review","Step 4"]].map(entry).join('')+'</div></section>'+
'<div class="v13-feature-controls"><label class="field v13-feature-search">Find a LeagueOS feature<input id="v13-feature-search" type="search" placeholder="Try registration, discipline, playoffs, payments…" maxlength="90" value="'+esc(searchText)+'"></label>'+
 '<div class="v13-feature-toggle" role="group" aria-label="Filter feature readiness"><button type="button" data-v13-feature-filter="all">All · 23</button><button type="button" data-v13-feature-filter="demo">Interactive</button><button type="button" data-v13-feature-filter="research">Research &amp; source</button><button type="button" data-v13-feature-filter="planned">Proposal / planned</button></div>'+
 '<p id="v13-visible-count" class="v13-feature-count" role="status" aria-live="polite"></p></div>'+
sections.map(group=>'<section class="v12-catalog-section v13-catalog-group"><h2>'+esc(group.name)+'</h2><p>'+esc(group.description)+'</p>'+
'<div class="v12-feature-grid">'+group.items.map(entry).join('')+'</div></section>').join('')+
'<p class="v12-hub-foot">The league archive and fixtures are dated public-source snapshots, not authoritative real-time feeds. Browser-local drafts are never official registrations, score sheets, bookings, eligibility decisions, disciplinary determinations or financial transactions. Brave H.C. TeamOS/HTO continues to operate separately.</p></div>';filterCatalog();
}
document.addEventListener("input",e=>{if(e.target.id!=="v13-feature-search")return;searchText=e.target.value.trim().toLowerCase();filterCatalog()});
document.addEventListener("click",e=>{const btn=e.target.closest("[data-v13-feature-filter]");if(!btn||!$("#league-feature-hub-mount"))return;activeFilter=btn.dataset.v13FeatureFilter;filterCatalog()});
window.LeagueOSFeatureHubV12={mount,status(){return{groups:sections.length,listed:sections.reduce((n,s)=>n+s.items.length,0),linked:sections.reduce((n,s)=>n+s.items.filter(x=>x[2]).length,0),planned:sections.reduce((n,s)=>n+s.items.filter(x=>/^UI concept/.test(x[3])||!x[2]).length,0)}},_test:{catalog:sections,kind,filterCatalog}};
})();
