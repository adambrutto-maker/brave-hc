/* BruTTech LeagueOS V24: read-only source expansion and effective-dated tier history readiness.
 * Independently authored UI; no HTO or SVHL mutations or authenticated approvals.
 */
(function(){"use strict";
const FILES=["./leagueos-fixture-discovery-v24.json","./leagueos-strength-level-history-v24.json"];
const NIGHTS=["Sunday","Tuesday","Wednesday","Thursday"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")?
 new Date(s+"T12:00:00Z").toLocaleDateString("en-CA",{timeZone:"UTC",month:"short",day:"numeric",year:"numeric"}):"Date held";
const clock=s=>typeof s==="string"&&/^\d\d:\d\d$/.test(s)?
  (Number(s.slice(0,2))%12||12)+":"+s.slice(3)+(Number(s.slice(0,2))>=12?" PM":" AM"):"Time held";
const allowed=new Set(["NEW_FUTURE_RECIPROCAL","NEW_RECIPROCAL_SETTLED",
 "NEW_PAST_ZERO_ZERO_HOLD","NEW_SAME_DAY_SCORE_HOLD","SOURCE_MISSING_REVIEW_HOLD"]);
const safeHref=c=>{
 const expected="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid="+c.league_id+
  "&gameid="+c.game_id+"&page_type=Adult";
 return c.officialGameUrl===expected?expected:null;
};
let evidence=null,history=null,promise=null;
function validate(d,h){
 if(!d||d.schema!=="bruttech-leagueos-four-night-fixture-discovery/v24"||
 d.status!=="READ_ONLY_CANDIDATE_SOURCE_NOT_LEAGUE_APPROVED"||
 d.officialRecordsEdited!==false||d.noAvailableIceInference!==true||
 !/^[a-f0-9]{64}$/.test(d.baseFixtureSha256||"")||
 !d.counts||d.counts.sourceNights!==4||d.counts.sourcePagesHeld!==0||
 !Array.isArray(d.candidates)||!Array.isArray(d.teamDirectory)||!Array.isArray(d.unratedTeams)||
 d.counts.newCandidateCount!==d.candidates.length||
 d.counts.currentLeagueTeams!==d.teamDirectory.length||
 d.counts.currentLeagueTeams<102||d.counts.sourcePagesAccepted!==d.teamDirectory.length||
 d.counts.unratedByCurrentDivisionModel!==d.unratedTeams.length)
  throw Error("V24 public fixture source not qualified");
 if(!h||h.schema!=="bruttech-leagueos-strength-level-history/v24"||
 h.status!=="PUBLIC_DIVISION_HISTORY_NO_APPROVED_LEVELS"||
 h.sourceReadonly!==true||h.officialChanges!==false||
 h.officialApprovalsConnected!==false||!Array.isArray(h.currentDivisions)||
 !Array.isArray(h.historicalEvidence)||!Array.isArray(h.officialAssignmentEvents)||
 h.officialAssignmentEvents.length!==0||h.counts.currentDivisions!==h.currentDivisions.length||
 h.counts.historicalDivisionSeasonLabels!==h.historicalEvidence.length||
 h.counts.officialCurrentAssignments!==0||h.counts.officialHistoricalAssignments!==0||
 h.currentDivisions.some(x=>x.officialStrengthLevel!==null||
   x.approvalStatus!=="CURRENT_LEVEL_UNASSIGNED")||
 h.historicalEvidence.some(x=>x.officialAssignedStrengthLevel!==null||
   x.permittedToCalibrateCrossNight!==false))
  throw Error("V24 public tier history not authorized");
 const model=window.LeagueOSDivisionV23?._test?.getSource?.();
 if(model&&model.sources?.tiers?.sha256!==h.sourceSha256?.currentTiers)
  throw Error("Current tier source revision does not match");
 const members=new Map(),keys=new Set();
 for(const t of d.teamDirectory){
  const key=t.leagueId+":"+t.teamId;
  if(members.has(key)||!NIGHTS.includes(t.night)||!t.name||!t.division)
   throw Error("Unverified team directory");
  members.set(key,t);
 }
 for(const f of d.candidates){
  const key=f.league_id+":"+f.game_id,done=f.status==="NEW_RECIPROCAL_SETTLED";
  if(keys.has(key)||!allowed.has(f.status)||!NIGHTS.includes(f.night)||
   !/^\d{4}-\d{2}-\d{2}$/.test(f.date||"")||
   f.officialWriteAllowed!==false||f.reciprocal!==true||f.sourceCount!==2||
   f.statusEvidence!=="EXACT_TWO_TEAM_SOURCE_GAME_ID_PARITY"||
   !safeHref(f)||f.home_team_id===f.away_team_id||
   !members.has(f.league_id+":"+f.home_team_id)||
   !members.has(f.league_id+":"+f.away_team_id)||
   (done&&(!Number.isInteger(f.homeGoals)||!Number.isInteger(f.awayGoals)||
     f.homeGoals+f.awayGoals<=0))||
   (!done&&(f.homeGoals!==null||f.awayGoals!==null)))
    throw Error("Discovered source game ID, teams or result not verified");
  keys.add(key);
 }
 for(const x of d.unratedTeams)
  if(!members.has(x.leagueId+":"+x.teamId)||
   x.status!=="NO_VERIFIED_COMPARABLE_TEAM_RATING")
   throw Error("Unrated team outside exact source directory");
 return{discovery:d,history:h};
}
function load(){
 if(!promise)promise=Promise.all(FILES.map(file=>
  fetch(file,{cache:"no-store"}).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);return r.json();
  }))).then(([d,h])=>{validate(d,h);evidence=d;history=h;return{d,h}})
  .catch(e=>{promise=null;evidence=null;history=null;throw e});
 return promise;
}
function fixtureRows(d){
 const directory=new Map(d.teamDirectory.map(x=>[x.leagueId+":"+x.teamId,x]));
 return NIGHTS.map(night=>{
  const cases=d.candidates.filter(x=>x.night===night);
  const days=[...new Set(cases.map(x=>x.date))].sort();
  return '<div class="v24-night-source"><h4>'+night+' <small>'+cases.length+
   ' additional game IDs</small></h4>'+
   (days.length?days.map(day=>{
    const games=cases.filter(x=>x.date===day);
    return '<details><summary>'+esc(date(day))+' · '+games.length+
     ' reciprocal source listing'+(games.length===1?"":"s")+'</summary>'+
     '<div class="v24-source-games">'+games.map(g=>{
      const home=directory.get(g.league_id+":"+g.home_team_id)?.name||"Unverified";
      const away=directory.get(g.league_id+":"+g.away_team_id)?.name||"Unverified";
      return '<div class="v24-game-row"><div><strong>'+esc(home)+' vs '+esc(away)+
       '</strong><small>'+esc(clock(g.time))+' · Source game #'+g.game_id+'</small></div>'+
       '<span>'+esc(g.status.replaceAll("_"," ").toLowerCase())+'</span>'+
       '<a href="'+esc(safeHref(g))+'" target="_blank" rel="noopener noreferrer">Public game page ↗</a></div>';
     }).join("")+'</div></details>';
   }).join(""):'<p>No additional source-listed games found for this night.</p>')+'</div>';
 }).join("");
}
function fixtureView(d){
 const n=d.counts;
 return '<section class="v24-panel"><header><span>V24 · SOURCE EXPANSION</span>'+
 '<h3>Newly published fixture coverage</h3><p>Current public game IDs are matched across both team schedules. New entries are held out of numerical ratings until their final scores settle.</p></header>'+
 '<div class="v24-kpis">'+[
 ["Canonical baseline",411,"Nov 16 reference"],
 ["Additional source games",n.newCandidateCount,"Exact reciprocal game IDs"],
 ["Total observed game IDs",n.sourceGameIDsObserved,"Four league nights"],
 ["Public team pages",n.currentLeagueTeams,"Current source directory"],
 ].map(([label,num,note])=>'<div><span>'+esc(label)+'</span><b>'+num+'</b><small>'+esc(note)+'</small></div>').join("")+'</div>'+
 '<div class="v24-metrics"><span><b>'+n.currentNewFuture+'</b> newly published future games</span>'+
 '<span><b>'+n.newSettled+'</b> settled results newly found</span>'+
 '<span><b>'+n.unratedByCurrentDivisionModel+'</b> unrated current standings teams</span></div>'+
 '<details class="v24-details"><summary><strong>Inspect newly discovered game IDs</strong>'+
 '<small>Exact original source links; no inferred rink availability or official fixture acceptance</small></summary>'+
 fixtureRows(d)+'</details>'+
 '<details class="v24-details"><summary><strong>Inspect '+d.unratedTeams.length+
 ' teams not in the 96-team model</strong><small>These have public standings presence but no qualified comparable team rating</small></summary>'+
 '<div class="v24-unrated-grid">'+d.unratedTeams.map(x=>
 '<div><b>'+esc(x.name)+'</b><small>'+esc(x.night)+' · '+esc(x.division)+
 ' · team #'+x.teamId+'</small></div>').join("")+'</div></details>'+
 '<p class="v24-warning">The daily engine now recognizes these additional fixture IDs, but only exact-ID, two-team verified final results can change ratings after the Toronto game date. Zero–zero placeholders, conflicting scores and unsupported teams remain held.</p></section>';
}
function historyView(h){
 return '<section class="v24-panel"><header><span>V24 · LEAGUE DIVISION STRENGTH GOVERNANCE</span>'+
 '<h3>Official strength history readiness</h3>'+
 '<p>Separate model-derived competitive bands from league-assigned, effective-dated division levels.</p></header>'+
 '<div class="v24-metrics">'+[
 ["Current divisions",h.counts.currentDivisions],
 ["Historical division-season labels",h.counts.historicalDivisionSeasonLabels],
 ["Officially approved strength levels",0]
 ].map(([label,num])=>'<span><b>'+num+'</b> '+esc(label)+'</span>').join("")+'</div>'+
 '<div class="v24-tier-gate"><strong>League authorization remains required</strong>'+
 '<p>Each level must have a program, division, effective dates, league approver, decision reference and change history. No sponsor name or player statistic supplies an official historical level.</p></div>'+
 '<details class="v24-details"><summary><strong>Historical source divisions awaiting classification</strong>'+
 '<small>Archived Sunday player-ID coverage summarized without player identity publication</small></summary>'+
 '<div class="v24-history-scroll"><table><thead><tr><th>Season</th><th>Division</th>'+
 '<th>Source player IDs</th><th>Official classification</th></tr></thead><tbody>'+
 h.historicalEvidence.map(x=>'<tr><td>'+esc(x.season)+'</td><td>'+esc(x.division)+
 '</td><td>'+x.exactPlayerIdSourceCoverage+'</td><td>Unassigned</td></tr>').join("")+
 '</tbody></table></div></details>'+
 '<p class="v24-warning">Division-level drafts below are browser-local requests, not official assignments. Cross-night numeric strength calibration remains disabled until an authorized, dated tier history and prospective validation exist.</p></section>';
}
function mount(){
 const a=document.getElementById("leagueos-v24-fixture-coverage"),
 b=document.getElementById("leagueos-v24-strength-history");
 if(!a&&!b)return;
 load().then(()=>{
  if(a?.isConnected)a.innerHTML=fixtureView(evidence);
  if(b?.isConnected)b.innerHTML=historyView(history);
 }).catch(()=>{
  const blocked='<section class="v24-hold"><b>Source data withheld</b>'+
   '<p>Current fixture or division-strength evidence failed validation; no unverified records are displayed.</p></section>';
  if(a?.isConnected)a.innerHTML=blocked;
  if(b?.isConnected)b.innerHTML=blocked;
 });
}
window.LeagueOSCoverageV24={mount,_test:{validate,safeHref,getDiscovery:()=>evidence,getHistory:()=>history}};
})();