/* LeagueOS V23: original multi-night divisions recommendations dashboard.
   All four nights visible by default. No league writes, approvals or claimed forecast.
   Official division-tier selections remain browser-local drafts until league authorization.
*/
(function(){"use strict";
const RECOMMENDATIONS="./leagueos-division-recommendations-v23.json";
const TIERS="./leagueos-division-strength-levels-v23.json";
const KEY="leagueos-v23-tier-drafts-browser-local";
const NIGHTS=["Sunday","Tuesday","Wednesday","Thursday"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
const safeNumber=v=>Number.isFinite(v)?String(v):"—";
const fmt=v=>Number.isFinite(v)?v.toFixed(2):"—";
const day=x=>{try{return new Date(x).toLocaleDateString("en-CA",{timeZone:"America/Toronto",month:"short",day:"numeric",year:"numeric"})}catch(_){return "Unverified"}};
const nameSafe=s=>String(s||"").replace(/[^a-z0-9]+/ig,"-");
let data=null,tiers=null,promise=null,message="";
const activeExpanded=new Set();
function validate(d,t){
 if(!d||d.schema!=="bruttech-leagueos-night-division-recommendations/v23"||
  d.status!=="SOURCE_QUALIFIED_RESEARCH_NOT_LEAGUE_APPROVED"||
  d.officialCompetitionChanged!==false||d.officialStandingsChanged!==false||
  d.decision!=="PROVISIONAL_FOR_COMMISSIONER_REVIEW_ONLY"||
  d.leagueAssignmentAuthority!=="LEAGUE_OFFICIAL_APPROVAL_REQUIRED"||
  d.tiersState!=="ALL_OFFICIAL_DIVISION_STRENGTH_LEVELS_UNASSIGNED"||
  d.policy?.rosterWeightInPlacement!==0||d.policy?.crossNightWeightInPlacement!==0||
  d.bridgeEvidence?.numericTierCalibrationEnabled!==false||
  !Array.isArray(d.nights)||d.nights.length!==4||!Array.isArray(d.teams)||
  d.teams.length!==96||d.overview?.modeledTeams!==96||
  d.overview?.officialApprovedTiers!==0||d.overview?.crossNightVerifiedPlayerIDs<60)
   throw Error("Source qualification or read-only authority invalid");
 if(!t||t.schema!=="bruttech-leagueos-division-strength-governance/v23"||
  t.status!=="LEAGUE_ASSIGNMENT_REQUIRED"||t.officialChanges!==false||
  !Array.isArray(t.assignments)||t.assignments.length!==15||
  t.assignments.some(x=>x.level!==null||x.approval!=="UNASSIGNED"))
   throw Error("League strength levels are not officially authorized");
 for(const name of NIGHTS){
  const n=d.nights.find(x=>x.night===name);
  if(!n||!Array.isArray(n.pools))throw Error("League night missing: "+name);
  const current=n.pools.flatMap(x=>x.current.flatMap(y=>y.teamIds));
  const proposed=n.pools.flatMap(x=>x.proposed.flatMap(y=>y.teams));
  if(current.length!==n.sourceTeamCount||proposed.length!==n.sourceTeamCount||
   new Set(current).size!==current.length||new Set(proposed).size!==proposed.length||
   current.slice().sort().join(",")!==proposed.slice().sort().join(","))
   throw Error("Division plan does not conserve official source team pool");
  if(n.pools.some(x=>![
   "PROVISIONAL_COMPETITIVE_REALIGNMENT","CURRENT_GROUPS_RETAINED_NO_MATERIAL_GAIN",
   "SOURCE_QUALITY_HOLD_KEEP_CURRENT"].includes(x.status)||
   !["Open","Masters","Separate program"].includes(x.program)||
   x.reviewRequired!==true||!x.current?.length||!x.proposed?.length))
   throw Error("Unqualified competition group");
 }
 const ids=d.teams.map(x=>x.leagueId+":"+x.teamId);
 if(new Set(ids).size!==96)throw Error("Duplicate source team identity");
 if(!d.sources?.tiers?.sha256||!d.sources?.model?.sha256||!d.sources?.historical?.sha256)throw Error("Source hashes missing");
 return {recommendations:d,tiers:t};
}
function readDraft(store=localStorage){
 try{const s=JSON.parse(store.getItem(KEY)||"null");
  if(!s||s.version!==1||!s.sourceTierDigest||typeof s.drafts!=="object"||Array.isArray(s.drafts))return null;
  return s;
 }catch(_){return null}
}
function load(){
 if(!promise)promise=Promise.all([RECOMMENDATIONS,TIERS].map(url=>
  fetch(url,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})))
  .then(([d,t])=>{validate(d,t);data=d;tiers=t;return d}).catch(err=>{promise=null;data=null;tiers=null;throw err});
 return promise;
}
function download(str,filename){
 const b=new Blob([str],{type:"application/json"}),url=URL.createObjectURL(b),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function teamMap(){return new Map(data.teams.map(t=>[t.leagueId+":"+t.teamId,t]))}
function statsRow(team){
 const prior=team.priorRosterSamples||0,bridges=team.crossNightRosterIDs||0;
 const archive=team.archivedDivisionEvidence;
 const archival=archive?.exactHistoryPlayerIds>0?
  ' · '+esc(archive.exactHistoryPlayerIds)+' archived player-ID histories'+
  ' ('+esc(archive.divisions.slice(0,2).map(x=>x.division).join(', '))+')':'';
 return '<span class="v23-team"><b>'+esc(team.name)+'</b>'+
 '<small>Relative rating '+esc(safeNumber(team.resultAdjustedRating))+
 ' · '+esc(team.playedGames)+' source games'+
 (prior?' · '+esc(prior)+' prior roster observations':'')+
 (bridges?' · '+esc(bridges)+' cross-night players':'')+
 (team.rosterQualified?'':' · roster evidence held')+archival+'</small></span>';
}
function originalCard(group,pool,byId){
 return '<div class="v23-division-card current"><div class="v23-card-head">'+
 '<div><span>CURRENT SOURCE DIVISION</span><strong>'+esc(group.name)+'</strong></div>'+
 '<b>'+group.sourceTeamCount+' teams</b></div>'+
 '<details><summary>Show '+group.sourceTeamCount+' current teams</summary>'+
 '<div class="v23-team-list">'+group.teamIds.map(id=>statsRow(byId.get(pool.leagueId+":"+id)||
 byId.get(data.nights.find(x=>x.night===pool.night).leagueId+":"+id))).join("")+'</div></details></div>';
}
function proposedCard(group,pool,byId){
 const total=group.sourceTeamCount,ids=group.teams;
 return '<div class="v23-division-card proposed"><div class="v23-card-head">'+
 '<div><span>PROVISIONAL STRENGTH GROUP · NOT LEAGUE TIER</span><strong>'+
 esc(group.provisionalLabel)+'</strong></div><b>'+total+' teams</b></div>'+
 '<div class="v23-card-metrics"><span>Rating mean <b>'+esc(group.averageRelativeRating)+
 '</b></span><span>Prior roster observations <b>'+group.historicalRosterSampleCount+
 '</b></span><span>Cross-night player registrations <b>'+group.crossNightPlayerBridgeIDs+
 '</b></span></div><div class="v23-team-list">'+ids.map(id=>
 statsRow(byId.get(data.nights.find(x=>x.night===pool.night).leagueId+":"+id))).join("")+
 '</div></div>';
}
function poolCard(pool,byId){
 const strong=pool.status==="PROVISIONAL_COMPETITIVE_REALIGNMENT";
 const hold=pool.status==="SOURCE_QUALITY_HOLD_KEEP_CURRENT";
 const note=hold?"Source hold: do not realign until evidence is verified.":
  strong?"Candidate competitive realignment; requires league and facility review.":
  "No material fairness gain established; existing structure retained.";
 return '<section class="v23-pool '+(hold?'on-hold':'')+'"><header class="v23-pool-head">'+
 '<div><span>'+esc(pool.program)+' · Connected competitive pool '+pool.component+'</span>'+
 '<h4>'+pool.sourceTeamCount+' teams · '+pool.current.length+' current group(s)</h4>'+
 '<p>'+esc(note)+'</p></div><span class="v23-state'+(strong?' candidate':'')+'">'+
 (strong?'COMPETITIVE PROPOSAL':hold?'EVIDENCE HOLD':'KEEP CURRENT')+'</span></header>'+
 '<div class="v23-comparison"><div class="v23-col"><h5>CURRENT DIVISIONS <small>'+
 pool.currentDivisionSizes.join(" / ")+'</small></h5>'+
 pool.current.map(g=>originalCard(g,pool,byId)).join("")+'</div>'+
 '<div class="v23-col"><h5>RECOMMENDED DIVISIONS <small>'+pool.recommendedDivisionSizes.join(" / ")+'</small></h5>'+
 pool.proposed.map(g=>proposedCard(g,pool,byId)).join("")+'</div></div>'+
 '<div class="v23-pool-metrics"><div><span>Current model pairwise mismatch</span><b>'+
 fmt(pool.currentMeanPairwiseMismatchPP)+' pp</b></div><div><span>Proposed model mismatch</span><b>'+
 fmt(pool.proposedMeanPairwiseMismatchPP)+' pp</b></div><div><span>Relative objective change</span><b>'+
 (pool.relativeObjectiveGain>0?'-':'')+fmt(pool.relativeObjectiveGain)+
 '</b></div><div><span>Roster evidence</span><b>'+
 pool.verifiedCurrentPlayerObservations+' current-GP players</b></div></div>'+
 (pool.sourceHolds?.length?'<div class="v23-pool-hold"><b>Held source records</b>: '+
 pool.sourceHolds.map(x=>esc(x.name)+" ("+esc(x.reason)+")").join("; ")+'</div>':'')+
 '<p class="v23-method-note">Lower matchup mismatch is a rating-model parity proxy—not a validated future win probability. Source-connected component and protected program are preserved. Any proposed groups require ice-time, playoff and official division-level approval.</p></section>';
}
function nightCard(n,byId){
 return '<section class="v23-night" id="v23-'+n.night.toLowerCase()+'"><header class="v23-night-heading">'+
 '<div><span>LEAGUE NIGHT • '+esc(n.night.toUpperCase())+'</span><h3>'+esc(n.night)+
 ' division plan</h3><p>'+n.sourceTeamCount+' modeled teams · '+
 n.currentDivisions.length+' current source group(s) · '+n.proposedDivisions.length+
 ' provisional group(s)</p></div><div class="v23-night-bridge">'+
 '<b>'+n.sourceBridgePlayerIDs+'</b><small>exact-ID players appearing on other nights</small></div></header>'+
 n.pools.map(p=>poolCard(p,byId)).join("")+'</section>';
}
function headline(){
 const x=data.overview;
 return '<div class="v23-title"><div><span>LEAGUEOS · AUTOMATIC DIVISION PLANNING</span>'+
 '<h2>Current vs recommended divisions</h2>'+
 '<p>All four league nights, shown immediately—no filters required. The engine compares verified results, team histories, current roster construction and exact player-ID links between nights.</p></div>'+
 '<div class="v23-status"><strong>PROVISIONAL ENGINE OUTPUT</strong><small>League approval and ice feasibility outstanding</small></div></div>'+
 '<div class="v23-kpis">'+[
 ["Source-modeled teams",x.modeledTeams,"96/102 public standings teams; six outside the rated source set"],
 ["Cross-night player IDs",x.crossNightVerifiedPlayerIDs,"Exact public IDs with recorded games"],
 ["Candidate pool changes",x.poolRecommendations,"Not official league relocations"],
 ["Held source pools",x.heldPools,"Insufficient or disconnected evidence"],
 ].map(([label,value,note])=>'<div><span>'+esc(label)+'</span><b>'+value+'</b><small>'+esc(note)+'</small></div>').join("")+'</div>'+
 '<div class="v23-refresh"><div><strong>Post-game refresh gate</strong><p>'+
 (data.dailyRefreshStatus==="NO_NEW_RECIPROCAL_SETTLED_GAME_SOURCE"?
 "No newly verified reciprocal results beyond the accepted source window. The last validated recommendation remains in place.":
 "Newly verified reciprocal final results have been incorporated without altering published official results.")+
 '</p></div><div><small>Source model: '+esc(day(data.sourcePublishedAt))+
 '</small><small>Cross-night roster capture: '+esc(day(data.sources.roster.capturedAt))+
 '</small><small>Newly settled source games: '+data.verifiedNewSettledGames+'</small></div></div>';
}
function allNightsAtGlance(){
 return '<section class="v23-at-glance"><header><strong>All four nights — current versus recommended</strong>'+
 '<small>Click a night to inspect the complete team assignments. Not an official league realignment.</small></header>'+
 '<div class="v23-at-glance-scroll"><table><thead><tr><th>Night</th><th>Current division sizes</th>'+
 '<th>Provisional sizes</th><th>Connected source status</th><th>Review</th></tr></thead><tbody>'+
 data.nights.map(n=>{
  const current=n.pools.map(p=>p.program+' '+p.currentDivisionSizes.join('/')).join(' · ');
  const proposed=n.pools.map(p=>p.program+' '+p.recommendedDivisionSizes.join('/')).join(' · ');
  const changes=n.pools.filter(p=>p.status==="PROVISIONAL_COMPETITIVE_REALIGNMENT").length,
   holds=n.pools.filter(p=>p.status==="SOURCE_QUALITY_HOLD_KEEP_CURRENT").length;
  return '<tr><td><strong>'+esc(n.night)+'</strong><small>'+n.sourceTeamCount+' teams</small></td>'+
   '<td>'+esc(current)+'</td><td>'+esc(proposed)+'</td><td>'+
   (changes?changes+' proposed change(s)':'No material change')+
   (holds?' · '+holds+' source hold(s)':'')+'</td><td><button type="button" data-v23-jump="'+
   n.night.toLowerCase()+'">Open teams</button></td></tr>';
 }).join('')+'</tbody></table></div></section>';
}
function tierPanel(){
 const state=readDraft(),current=state?.sourceTierDigest===data.sources.tiers.sha256?
 state.drafts:{},stale=state&&state.sourceTierDigest!==data.sources.tiers.sha256;
 const rows=NIGHTS.flatMap(night=>tiers.assignments.filter(a=>a.night===night).map(a=>
 '<div class="v23-tier-row"><div><b>'+esc(a.division)+'</b>'+
 '<small>'+esc(night)+' · '+esc(a.program)+' · '+a.currentSourceTeamCount+
 ' registered source teams</small></div><span>Official: not assigned</span>'+
 '<label>Working draft<select data-v23-tier="'+esc(a.key)+'">'+
 '<option value="">Unassigned</option>'+tiers.assignmentLevels.map(level=>
 '<option value="'+level.level+'"'+(String(current?.[a.key]??"")===String(level.level)?' selected':'')+
 '>'+level.level+' · '+esc(level.label)+'</option>').join("")+'</select></label></div>')).join("");
 return '<details class="v23-tier-panel"><summary><span>LEAGUE STRENGTH CLASSIFICATIONS</span>'+
 '<strong>Division-level assignments needed (15 official levels unassigned)</strong>'+
 '<small>Expand to set local draft tiers for league approval. Drafts do not alter the engine or any league record.</small></summary>'+
 (stale?'<p class="v23-tier-hold">A prior tier draft belongs to an older source revision and has been held.</p>':"")+
 '<p>The league must assign effective-dated levels with a consistent policy for each program. Masters and Separate program use their own protection rules; team names or public player points cannot grant eligibility.</p>'+
 '<div class="v23-tier-list">'+rows+'</div>'+
 '<div class="v23-tier-action"><button type="button" data-v23-save-tiers>Save local tier drafts</button>'+
 '<button type="button" data-v23-export-tiers>Export league assignment proposal</button>'+
 '<span>Local evidence only · no official tier approval</span></div></details>';
}
function crossNightEvidence(){
 const b=data.bridgeEvidence;
 const selected=b.divisionPairEvidence.slice(0,15);
 return '<details class="v23-evidence"><summary><span>CROSS-NIGHT PLAYER ANALYSIS</span>'+
 '<strong>'+b.crossNightCurrentPlayerIds+' exact player-ID bridges across four nights</strong>'+
 '<small>Current records cover '+data.overview.playerObservations+
 ' qualified player observations and '+data.overview.sundayTeamPlayerHistoryLinks+
 ' exact Sunday team-player links to historic divisions. Calibration waits for approved comparable division tiers.</small></summary>'+
 '<p>Shared published player IDs allow differences in individual points/game across nights to be examined. The same person can have different teammates, roles and minutes; strength cannot be transferred numerically without cohort validation and official tier assignments. One cross-program ID is held from automatic comparisons.</p>'+
 '<div class="v23-bridge-table"><table><thead><tr><th>Source division pair</th><th>Exact IDs</th><th>Clubs</th><th>Evidence</th></tr></thead><tbody>'+
 selected.map(pair=>'<tr><td>'+esc(pair.pair)+'</td><td>'+pair.exactSourcePlayerIds+
 '</td><td>'+pair.independentSourceClubs+'</td><td>'+
 (pair.eligibleEvidenceForTierCalibration?"Tier validation required":"Insufficient independent bridges")+
 '</td></tr>').join("")+'</tbody></table></div>'+
 '<p>Player-based strength transfers have weight <strong>zero</strong> in the published recommendation until prospective validation demonstrates an actual improvement over results-only grouping. Historical roster observations are used as contextual evidence, not an invented skill-rating label.</p></details>';
}
function footer(){
 return '<div class="v23-disclosure"><strong>RECOMMENDATION AND AUTHORITY BOUNDARY</strong>'+
 '<p>Division configurations are competition hypotheses; no source roster, league tier, game schedule, playoff, HTO record, payment or official standings is edited. Source current-state coverage is limited to 96 rated teams, and the 15 current divisions have no approved strength-level assignments. The engine never mixes Masters/Open/Separate programs or disconnected game components without approved comparability evidence.</p></div>';
}
function render(){
 const root=$("#leagueos-division-plan-v23");if(!root||!data||!tiers)return;
 const byId=teamMap();
 root.innerHTML=headline()+allNightsAtGlance()+
 '<nav class="v23-jump" aria-label="League nights">'+NIGHTS.map(n=>
 '<button type="button" data-v23-jump="'+n.toLowerCase()+'">'+n+' division plan</button>').join("")+'</nav>'+
 tierPanel()+crossNightEvidence()+data.nights.map(n=>nightCard(n,byId)).join("")+
 (message?'<p class="v23-message" role="status">'+esc(message)+'</p>':"")+footer();
}
function page(){
 return '<div class="v23-root" id="leagueos-division-plan-v23" aria-live="polite">'+
 '<div class="v23-loading"><h2>Checking verified four-night division evidence…</h2>'+
 '<p>The recommendation engine will not invent tier assignments or source game results.</p></div></div>';
}
function mount(){
 const root=$("#leagueos-division-plan-v23");if(!root)return;
 load().then(()=>{if(root.isConnected)render()}).catch(()=>{if(root.isConnected){
  root.innerHTML='<div class="v23-failed"><h3>Division planning evidence unavailable</h3>'+
  '<p>The current source model or its league authority boundary is unverified. No placements are displayed.</p></div>';
 }});
}
function saveTierDrafts(){
 const fields=[...document.querySelectorAll("[data-v23-tier]")];
 const allowed=new Set(tiers.assignmentLevels.map(x=>String(x.level)));
 const allowedKeys=new Set(tiers.assignments.map(x=>x.key));
 const drafts={};
 for(const e of fields){const key=e.dataset.v23Tier;
  if(!allowedKeys.has(key)||e.value&& !allowed.has(e.value)){message="Invalid tier proposal rejected.";render();return}
  if(e.value)drafts[key]=Number(e.value);
 }
 try{localStorage.setItem(KEY,JSON.stringify({version:1,sourceTierDigest:data.sources.tiers.sha256,
  savedAt:new Date().toISOString(),status:"LOCAL_DRAFT_NOT_LEAGUE_APPROVED",drafts}));
  message="Tier proposals saved in this browser. The official league tiers remain unassigned.";
 }catch(_){message="Browser storage unavailable; no tier draft was saved."}
 render();
 const panel=document.querySelector(".v23-tier-panel");if(panel)panel.open=true;
}
function exportTierDrafts(){
 const draft=readDraft();
 const rowDraft=draft?.sourceTierDigest===data.sources.tiers.sha256?draft.drafts:{};
 const out={schema:"bruttech-leagueos-strength-level-proposal/v23",
  createdAt:new Date().toISOString(),
  approval:"NOT_APPROVED_BROWSER_ONLY",officialWriteAllowed:false,
  sourceTierSHA256:data.sources.tiers.sha256,
  levelDefinitions:tiers.assignmentLevels,assignmentRequests:tiers.assignments.map(a=>({
   key:a.key,leagueId:a.leagueId,night:a.night,division:a.division,program:a.program,
   proposedLevel:rowDraft[a.key]??null,approvedLevel:null,approval:"UNASSIGNED"}))};
 download(JSON.stringify(out,null,2),"LeagueOS_V23_Draft_Division_Strength_Levels.json");
 message="Local draft export created. No league tier was officially assigned.";render();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||!$("#leagueos-division-plan-v23"))return;
 if(b.dataset.v23Jump){document.getElementById("v23-"+b.dataset.v23Jump)?.scrollIntoView({block:"start",behavior:"smooth"});}
 else if(b.hasAttribute("data-v23-save-tiers"))saveTierDrafts();
 else if(b.hasAttribute("data-v23-export-tiers"))exportTierDrafts();
});
window.LeagueOSDivisionV23={page,mount,_test:{validate,readDraft,expectedSourceTeams:96,
 getSource:()=>data,getTiers:()=>tiers}};
})();