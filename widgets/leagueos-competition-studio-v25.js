/* Original BruTTech LeagueOS / HockeyOS V25.
 * Commissioner decisions: continuous research; at most two approved realignment
 * windows; final lock. Schedule draft has NO booked dates, rinks or ice rights.
 * HockeyOS: actual HTO stats with clearly labelled owner-model projections.
 */
(function(){"use strict";
const REFS=[
 "./leagueos-roster-player-projections-v25.json",
 "./leagueos-division-lifecycle-v25.json",
 "./hockeyos-player-projections-v25.json",
 "./leagueos-competitive-balance-backtest-v25.json",
 "./leagueos-coach-division-context-v25.json"];
const KEY="leagueos-v25-commissioner-policy-draft";
const NIGHTS=["Sunday","Tuesday","Wednesday","Thursday"];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'" :"&#39;"}[c]));
const round=(x,n=1)=>Number.isFinite(x)?x.toFixed(n):"—";
const $=sel=>document.querySelector(sel);
let forecasts=null,lifecycle=null,hto=null,backtest=null,coachContext=null,promise=null,preview=false,notice="";
const defaultPolicy={seasonRegularWeeks:24,firstReviewAfterWeek:5,
 secondReviewAfterWeek:12,reviewWindows:2,
 minimumFullWeeksBetweenFinalChangeAndPlayoffs:6};
let selectedWeek=9,policy=loadPolicy();
function policyValid(p){
 if(!p||![p.seasonRegularWeeks,p.firstReviewAfterWeek,p.secondReviewAfterWeek,
  p.minimumFullWeeksBetweenFinalChangeAndPlayoffs,p.reviewWindows].every(Number.isInteger))
  return false;
 const length=p.seasonRegularWeeks,first=p.firstReviewAfterWeek,final=
  p.reviewWindows===2?p.secondReviewAfterWeek:first;
 return length>=12&&length<=40&&first>=3&&first<length&&
  [1,2].includes(p.reviewWindows)&&p.secondReviewAfterWeek>first&&
  p.secondReviewAfterWeek<length&&
  p.minimumFullWeeksBetweenFinalChangeAndPlayoffs>=3&&
  p.minimumFullWeeksBetweenFinalChangeAndPlayoffs<=12&&
  final<=length-p.minimumFullWeeksBetweenFinalChangeAndPlayoffs;
}
function loadPolicy(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||"null");
  if(x&&x.status==="BROWSER_LOCAL_DRAFT_NOT_LEAGUE_POLICY"&&policyValid(x.policy))
   return x.policy;
 }catch(_){}
 return {...defaultPolicy};
}
function stageAt(w,p=policy){
 if(!policyValid(p)||!Number.isInteger(w)||w<1)throw Error("Invalid competition policy/week");
 const final=p.reviewWindows===2?p.secondReviewAfterWeek:p.firstReviewAfterWeek;
 let state="MONITOR_STRENGTH_ONLY";
 if(w===p.firstReviewAfterWeek)state="WEEK5_STYLE_WINDOW_REVIEW_POSSIBLE";
 else if(p.reviewWindows===2&&w===final)state="HALFWAY_FINAL_REVIEW_POSSIBLE";
 else if(w>final)state="DIVISION_PLACEMENT_LOCKED_TO_PLAYOFFS";
 return{week:w,state,reviewWindowOpen:state.endsWith("_POSSIBLE"),
  requiresLeagueAuthorization:true,realignmentAllowedInDemo:false,
  lockActive:w>final,finalLockAfterWeek:final};
}
function roundRobin(ids,roundIndex){
 if(!Array.isArray(ids)||ids.length<4||ids.length>10||new Set(ids).size!==ids.length)
  throw Error("Source-qualified group of 4–10 unique teams required");
 const rr=[...ids];if(rr.length%2)rr.push(null);
 const n=rr.length,cycle=n-1;
 for(let turn=0;turn<roundIndex%cycle;turn++)rr.splice(1,0,rr.pop());
 const matches=[];
 for(let i=0;i<n/2;i++){
  const a=rr[i],b=rr[n-1-i];if(a==null||b==null)continue;
  const reverse=(Math.floor(roundIndex/cycle)+i)%2===1;
  matches.push({home:reverse?b:a,away:reverse?a:b});
 }
 return matches;
}
function allDraftGames(l,p=policy){
 if(!policyValid(p))throw Error("Invalid draft policy");
 const lock=p.reviewWindows===2?p.secondReviewAfterWeek:p.firstReviewAfterWeek;
 const entries=[];
 for(const n of l.nights)for(const g of n.proposedGroups){
  if(g.teamIds.length<4||g.teamIds.length>10)continue;
  for(let week=lock+1;week<=p.seasonRegularWeeks;week++){
   const pairs=roundRobin(g.teamIds,week-lock-1);
   for(const match of pairs)entries.push({
    week,night:n.night,leagueId:n.leagueId,groupName:g.name,
    groupId:g.id,homeTeamId:match.home,awayTeamId:match.away,
    date:null,time:null,rink:null,facilityInventoryConfirmed:false,
    schedulePublished:false,officialChange:false,
    status:"UNSLOTTED_BROWSER_LOCAL_SCENARIO"});
  }
 }
 return entries;
}
function validate(f,l,t,b,c){
 if(!f||f.schema!=="bruttech-leagueos-roster-player-projections/v25"||
 f.status!=="PUBLIC_DERIVED_PROJECTION_RESEARCH_NOT_OFFICIAL_STATISTICS"||
 f.officialDivisionsChanged!==false||f.officialStandingsChanged!==false||
 f.officialPlayerStatsChanged!==false||f.privateWorkbookPlayerRecordsIncluded!==false||
 !Array.isArray(f.teams)||f.teams.length!==96||!Array.isArray(f.players)||
 f.counts.estimatedSkaterProjections!==f.players.length||
 f.counts.sourceRatedTeams!==96||
 f.counts.crossNightExactPlayerIDs<50)
 throw Error("Roster research not source qualified");
 if(!l||l.schema!=="bruttech-leagueos-division-lifecycle-and-schedule-preview/v25"||
 l.status!=="PUBLIC_DEMO_ADVISORY_SCHEDULE_NOT_PUBLISHED"||
 l.officialApprovalAvailable!==false||l.officialDivisionModified!==false||
 l.officialScheduleModified!==false||l.officialStandingsModified!==false||
 l.policy?.firstReviewAfterWeek!==5||
 l.policy?.pointsCarryToNewDivision!==true||
 l.summary?.sourceModeledTeams!==96||l.summary?.publishedFutureSourceFixtureReferences<120||
 l.summary?.scheduledIceSlots!==0||!Array.isArray(l.teamPlacements)||
 l.teamPlacements.length!==96||!Array.isArray(l.unslottedMatchupDraft)||
 !l.memorialBranding?.some(b=>b.id==="cristillo-memorial-identity"&&
  b.anchorCurrentTeamId===13679&&b.strengthLevel===null))
 throw Error("Commissioner lifecycle or naming authority missing");
 if(!t||t.schema!=="bruttech-hockeyos-source-qualified-player-projections/v25"||
 t.officialRecordEdited!==false||t.rawCoachCareerRatesPublished!==false||
 t.privateWorkbookOrFormulaRowsPublished!==false||
 t.identityBindingAuthorized!==false||!Array.isArray(t.players)||
 t.players.length!==t.counts.publishedPlayers||t.counts.sourceHTOSkaters<20||
 !Number.isInteger(t.sourceOfficialTeamGP)||t.sourceOfficialTeamGP<1)
 throw Error("HockeyOS projection source or private notes safety invalid");
 if(!b||b.schema!=="bruttech-leagueos-historic-competitive-balance-validation/v25"||
  b.status!=="RETROSPECTIVE_PREQUENTIAL_ELO_CALIBRATION_NOT_CAUSAL_DIVISION_EFFECT"||
  b.noGameLevelRowsPublished!==true||b.noPlayerIDsPublished!==true||
  b.noOfficialLeagueChanges!==true||b.coverage?.eligiblePost35DayGames<15000||
  b.sourceArchiveSHA256!==f.sourceModels.historicalArchiveSourceSHA256||
  b.deploymentGate?.rosterScenarioPredictiveGainProven!==false||
  b.deploymentGate?.calibratedDivisionMoveBenefitProven!==false||
  b.riskBuckets?.BALANCED_MATCHUP_FORECAST?.games<10000||
  b.riskBuckets?.MODERATE_MISMATCH_FORECAST?.games<1000||
  !Array.isArray(b.moderateVsBalancedLeagueSeasonClusterBootstrap95PP))
  throw Error("Historical retrospective backtest source not qualified");
 if(!c||c.schema!=="bruttech-leagueos-coach-historical-division-context/v25"||
  c.status!=="COACH_RECORDED_BRAVE_HC_HISTORICAL_STRENGTH_NOT_SVHL_APPROVED"||
  c.officialLeagueStrengthApproved!==false||
  c.privatePlayerRowsPublished!==false||c.sourceWorkbookCopied!==false||
  c.sourceNotesCopied!==false||
  c.privateWorkbookSourceDigest!==t.workbookSourceSha256||
  c.counts?.historicalDivisionSeasonLabels!==26||
  c.counts?.historicalBraveGamesWithStrengthLabels!==168||
  c.counts?.officialApprovedLabels!==0)
  throw Error("Private coach context aggregation failed source/privacy boundary");
 const ids=new Set();
 for(const team of f.teams){
  const key=team.leagueId+":"+team.teamId;
  if(ids.has(key)||!NIGHTS.includes(team.night)||
   !team.sourceCurrentDivision||
   !["A","B","C","D","UNRATED"].includes(team.provisionalABCD)||
   team.provisionalBandOfficial!==false||
   !Number.isFinite(team.currentResultStrength)||
   !Number.isFinite(team.projectedScenarioStrength))
  throw Error("Projected team source or tier invalid");
  ids.add(key);
 }
 const assigned=new Set();
 for(const n of l.nights){
  for(const g of n.proposedGroups)for(const id of g.teamIds){
   const key=n.leagueId+":"+id;
   if(assigned.has(key)||!ids.has(key))throw Error("Proposed team membership not conserved");
   assigned.add(key);
  }
 }
 if(assigned.size!==96)throw Error("Proposed competition assignments incomplete");
 if(!policyValid(defaultPolicy))throw Error("Product stage policy invalid");
 return{f,l,t,b,c};
}
function load(){
 if(!promise)promise=Promise.all(REFS.map(u=>fetch(u,{cache:"no-store"}).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);return r.json()
 }))).then(([f,l,t,b,c])=>{validate(f,l,t,b,c);forecasts=f;lifecycle=l;hto=t;backtest=b;coachContext=c;return{f,l,t,b,c}})
 .catch(err=>{promise=null;forecasts=null;lifecycle=null;hto=null;backtest=null;coachContext=null;throw err});
 return promise;
}
function teamMap(){return new Map(forecasts.teams.map(x=>[x.leagueId+":"+x.teamId,x]))}
function padTrend(value){
 if(!Number.isFinite(value))return "—";
 return value>0?"+"+round(value,2):round(value,2);
}
function evidenceRows(){
 const group=teamMap();
 return NIGHTS.map(night=>{
  const records=forecasts.teams.filter(t=>t.night===night);
  const proposals=lifecycle.nights.find(n=>n.night===night);
  const moves=proposals?.competitiveGroupChangeCandidateCount||0;
  const avg=records.reduce((s,t)=>s+t.projectedGoalsForPerGame,0)/records.length;
  const held=records.filter(t=>t.rosterQuality!=="SOURCE_QUALIFIED_PUBLIC_SKATERS").length;
  return '<tr><td><b>'+esc(night)+'</b><small>'+records.length+' source-rated teams</small></td>'+
  '<td><strong>'+esc(proposals?.currentGroups.map(g=>g.teamIds.length).join(" / "))+'</strong></td>'+
  '<td><strong>'+esc(proposals?.proposedGroups.map(g=>g.teamIds.length).join(" / "))+'</strong></td>'+
  '<td><b>'+round(avg,2)+'</b> goals/game · scenario</td>'+
  '<td>'+(held?'<span class="v25-hold">'+held+' roster holds</span>':
   '<span class="v25-reviewed">All current roster sources qualified</span>')+'</td>'+
  '<td><button type="button" data-v25-inspect="'+esc(night)+'">View teams</button></td></tr>';
 }).join("");
}
function shortTable(night){
 const pool=teamMap(),records=forecasts.teams.filter(t=>t.night===night)
 .sort((a,b)=>b.projectedScenarioStrength-a.projectedScenarioStrength);
 return '<div class="v25-team-table-wrap"><table><thead><tr><th>Team</th>'+
 '<th>Current division</th><th>Model A–D</th><th>Past roster P/GP</th>'+
 '<th>Now GF/G</th><th>Proj. GF/G</th><th>Trend</th><th>Evidence</th></tr></thead><tbody>'+
 records.map(t=>{
  const trend=t.currentGoalsForPerGame===null?null:
   t.projectedGoalsForPerGame-t.currentGoalsForPerGame;
  const badge=t.provisionalABCD==="UNRATED"?"v25-hold":"v25-grade grade-"+t.provisionalABCD;
  return '<tr><td><strong>'+esc(t.teamName)+'</strong>'+
  (t.teamId===13679?'<small class="v25-cristillo">Cristillo memorial naming retained</small>':'')+
  '</td><td>'+esc(t.sourceCurrentDivision)+'</td>'+
  '<td><span class="'+badge+'">'+esc(t.provisionalABCD)+'</span></td>'+
  '<td>'+round(t.historicalRosterPointsPerAppearance,2)+'</td>'+
  '<td>'+round(t.currentGoalsForPerGame,2)+'</td>'+
  '<td><b>'+round(t.projectedGoalsForPerGame,2)+'</b></td>'+
  '<td>'+padTrend(trend)+'</td><td>'+esc(t.forecastConfidence)+
  (t.rosterQuality!=="SOURCE_QUALIFIED_PUBLIC_SKATERS"?' · held':'')+
  '</td></tr>';
 }).join("")+'</tbody></table></div>';
}
function validationEvidence(){
 const b=backtest;
 const balanced=b.riskBuckets.BALANCED_MATCHUP_FORECAST;
 const moderate=b.riskBuckets.MODERATE_MISMATCH_FORECAST;
 const r=b.overall,ci=b.moderateVsBalancedLeagueSeasonClusterBootstrap95PP;
 return '<section class="v25-evidence-validation"><header><span>HISTORIC SOURCE BACKTEST</span>'+
 '<h3>Does the strength indicator distinguish mismatched games?</h3>'+
 '<p>'+b.coverage.eligiblePost35DayGames.toLocaleString('en-CA')+
 ' reciprocal results predicted before each game was incorporated, from 116 archived league seasons. Retrospective comparison, not a guarantee.</p></header>'+
 '<div class="v25-evidence-kpis">'+[
  ['Predicted balanced',''+round(balanced.sourceBlowoutRate*100,1)+'%',
   balanced.games.toLocaleString('en-CA')+' actual games with a 5+ goal blowout rate'],
  ['Predicted moderate mismatch',''+round(moderate.sourceBlowoutRate*100,1)+'%',
   moderate.games.toLocaleString('en-CA')+' historical games with a 5+ goal blowout rate'],
  ['Model improvement vs neutral',''+round(r.eloVsNeutralRelativeImprovementPct,1)+'%',
   'Lower retrospective Brier error, not a promise of fewer blowouts']
 ].map(([label,num,note])=>'<div><small>'+esc(label)+'</small><strong>'+esc(num)+'</strong><span>'+esc(note)+'</span></div>').join('')+
 '</div><p class="v25-validation-note">Observed moderate-minus-balanced blowout difference: '+
 round(b.moderateVsBalancedObservedBlowoutGapPP,2)+' percentage points'+
 ' (league-season cluster bootstrap 95% interval '+round(ci[0],2)+'–'+round(ci[1],2)+' pp). '+
 'Strongly mismatched games numbered only '+b.riskBuckets.STRONG_MISMATCH_FORECAST.games+
 ', too few for a reliable separate claim. League scheduling and roster changes could explain some differences. '+
 '<b>The additional player/roster adjustment has not yet demonstrated an independent predictive gain.</b></p></section>';
}
function coachHistoryEvidence(){
 const c=coachContext;
 const levels=c.levels.filter(g=>g.sourceObservedGames>0);
 return '<details class="v25-coach-history"><summary>'+
 '<strong>Founder workbook: 26 recorded A–D division-season labels, 168 historical Brave H.C. games</strong>'+
 '<small>Open the privately derived aggregate. These labels are coach evidence, not official league strength-level approvals.</small>'+
 '</summary><div class="v25-coach-strength-grid">'+levels.map(g=>
 '<div><span>Coach-recorded '+g.level+' level</span><strong>'+
 g.sourceObservedGames+' games</strong><small>'+
 g.sourceTeamRecord.wins+'–'+g.sourceTeamRecord.losses+'–'+g.sourceTeamRecord.ties+
 ' W–L–T · '+round(g.pointsShare*100,1)+'% points share</small></div>').join('')+
 '</div><p>Cristillo first appears in the coach history as a D-level division for Winter 2025/26. '+
 'Its memorial name remains independent of its future competitive grade. '+
 'Historical goal totals are not comparable between all Summer and Winter game lengths without duration verification.</p></details>';
}
function groupRecommendations(){
 const source=teamMap();
 return '<section class="v25-group-recommendations"><header><span>DECISION-READY TEAM GROUPINGS</span>'+
 '<h3>Proposed A–D competitive groups by league night</h3>'+
 '<p>All nights are shown. Group memberships come from the experimental source-connected roster model; '+
 'A–D is a relative research band within each comparable competition pool, not an officially assigned tier across nights. Expand a group to inspect each team.</p></header>'+
 '<div class="v25-night-groups">'+lifecycle.nights.map(n=>{
  const grouped=n.proposedGroups;
  return '<section class="v25-night-group"><div class="v25-night-group-header"><strong>'+
   esc(n.night)+'</strong><span>'+n.sourceTeamCount+' model-rated teams · '+
   grouped.length+' proposed groups</span></div>'+
   '<div class="v25-groups-grid">'+grouped.map(g=>{
    const teams=g.teamIds.map(id=>source.get(n.leagueId+':'+id)).filter(Boolean);
    const isHeld=lifecycle.schedulingHolds.some(h=>h.groupId===g.id);
    const match=String(g.band||'').match(/Band\s+([A-D])/);
    const band=match?match[1]:null;
    const isCristillo=g.brandingAuthority==='SIMULATED_MEMORIAL_LINEAGE';
    const means=teams.length?
      teams.reduce((a,t)=>a+t.projectedGoalsForPerGame,0)/teams.length:null;
    return '<article class="v25-group-card'+(isHeld?' is-held':'')+'">'+
      '<div class="v25-group-top"><span>'+
      (isHeld?'SOURCE HOLD':band?'PROVISIONAL '+band:'RESEARCH GROUP')+
      '</span><strong>'+esc(g.name)+'</strong><small>'+
      g.teamIds.length+' teams · '+esc(g.program)+'</small></div>'+
      '<div class="v25-group-stat"><span>Projected goals/game</span><b>'+
      round(means,2)+'</b></div>'+
      (isCristillo?'<p class="v25-group-memorial">Memorial identity follows Brave H.C. in this scenario; league approval required</p>':'')+
      (isHeld?'<p class="v25-group-memorial">Disconnected or undersized source group. No automatic move is authorized.</p>':'')+
      '<details><summary>Teams & why they fit</summary><div class="v25-group-team-list">'+
      teams.map(t=>'<div><b>'+esc(t.teamName)+'</b>'+
       '<span>Model '+esc(t.provisionalABCD)+' · Results rating '+round(t.currentResultStrength,0)+
       ' · Roster signal '+(t.projectedRosterScenarioDeltaElo>=0?'+':'')+
       round(t.projectedRosterScenarioDeltaElo,1)+'</span>'+
       '<small>Past roster P/appearance '+round(t.historicalRosterPointsPerAppearance,2)+
       ' | Current GF/game '+round(t.currentGoalsForPerGame,2)+
       ' | Projected GF/game '+round(t.projectedGoalsForPerGame,2)+
       ' | Confidence '+esc(t.forecastConfidence)+'</small></div>').join('')+
      '</div></details></article>';
   }).join('')+'</div></section>';
 }).join('')+'</div><p class="v25-validation-note">Proposed groups are a planning scenario. '+
 'No actual team has been moved, and results-based strength plus roster construction '+
 'should be independently tested before competitive placement decisions become automatic.</p></section>';
}
function lifePolicyUI(){
 const stages=stageAt(selectedWeek,policy),locked=stages.lockActive;
 const firstText=policy.firstReviewAfterWeek===5?"Official published SVHL review point":
  "Proposed alternative — league rule amendment needed";
 const msg=locked?"FINAL LOCK ACTIVE · No new realignment. Continue monitoring only.":
  stages.reviewWindowOpen?
   "REVIEW WINDOW · Settled scores and an authorized commissioner decision required.":
   "MONITOR · Updated strength information does not automatically move teams.";
 return '<section class="v25-policy"><div class="v25-section-head"><div><span>COMMISSIONER CONTROL</span>'+
 '<h3>Two alignment windows. One playoff-stable second half.</h3><p>Automatic analysis runs after settled games; actual movement occurs only at approved review windows.</p></div>'+
 '<span class="v25-policy-tag">LOCAL WHAT-IF POLICY</span></div>'+
 '<div class="v25-stage-line"><span>Review after week <strong>'+policy.firstReviewAfterWeek+
 '</strong></span><span>Final alignment after week <strong>'+
 (policy.reviewWindows===2?policy.secondReviewAfterWeek:policy.firstReviewAfterWeek)+
 '</strong></span><span>Division lock through playoffs <strong>'+
 (locked?'ACTIVE':'PLANNED')+'</strong></span></div>'+
 '<div class="v25-policy-inputs">'+
 '<label>Season regular weeks<input type="number" min="12" max="40" id="v25-season-length" value="'+policy.seasonRegularWeeks+'"></label>'+
 '<label>First review after week<input type="number" min="3" max="25" id="v25-first-week" value="'+policy.firstReviewAfterWeek+'"></label>'+
 '<label>Final review after week<input type="number" min="4" max="38" id="v25-final-week" value="'+policy.secondReviewAfterWeek+'"></label>'+
 '<label>Review windows<select id="v25-count-windows"><option value="2"'+
 (policy.reviewWindows===2?' selected':'')+'>Two (recommended)</option>'+
 '<option value="1"'+(policy.reviewWindows===1?' selected':'')+'>One final review</option></select></label>'+
 '<label>Simulate current week<input type="number" min="1" max="44" id="v25-current-week" value="'+selectedWeek+'"></label>'+
 '<button type="button" id="v25-save-policy">Apply local scenario</button></div>'+
 '<div class="v25-stage-status'+(locked?' locked':'')+'"><strong>'+esc(msg)+'</strong><small>'+
 esc(firstText)+' · 24-week regular-season example is not an official fixture calendar. '+
 'SVHL rulebook carries existing league points when a team changes division; the proposed halftime division lock is an added product policy.</small></div>'+
 '<div class="v25-source-note"><a target="_blank" rel="noopener noreferrer" href="'+esc(lifecycle.rulebookSource)+'">Official SVHL rulebook §2.7.2 ↗</a>'+
 '<span>Roster freeze at halfway and division freeze are different rules.</span></div></section>';
}
function memCard(){
 const b=lifecycle.memorialBranding.find(x=>x.id==="cristillo-memorial-identity");
 const br=forecasts.teams.find(x=>x.leagueId===570&&x.teamId===13679);
 const assigned=lifecycle.nights.find(x=>x.night==="Sunday")?.proposedGroups.find(g=>
  g.teamIds.includes(13679));
 return '<section class="v25-memorial"><div class="v25-memorial-initial">C</div>'+
 '<div><span>LEGACY DIVISION IDENTITY</span><h4>'+esc(b.displayName)+
 '</h4><p>Recorded with Braves H.C. in Winter 2025/26 and Winter 2026/27. In this planning simulation the memorial name follows the anchored team, not a fixed A–D skill level.</p>'+
 '<small>Current model band: '+esc(br?.provisionalABCD)+' · proposed group: '+
 esc(assigned?.name||"Source review required")+
 ' · future name-transfer requires league approval</small></div></section>';
}
function schedulePreview(){
 const cases=lifecycle.scheduleImpact;
 const c=lifecycle.summary,week=stageAt(selectedWeek,policy),draft=allDraftGames(lifecycle);
 const n=selectedNight;
 const sample=draft.filter(x=>x.night===n).slice(0,12);
 const lookup=teamMap();
 const conflicts=cases.filter(x=>x.modelCandidateImpact==="CROSS_GROUP_FIXTURE_REVIEW_IF_LEAGUE_REALIGNS");
 const noName=t=>lookup.get(t)?.teamName||"Source team "+t.split(":").pop();
 return '<section class="v25-schedule"><div class="v25-section-head"><div><span>SCHEDULE IMPACT · NOT BOOKED</span>'+
 '<h3>Proposed divisions generate the next matchup draft</h3>'+
 '<p>Published fixtures stay intact until the league approves revisions. Only hypothetical, unslotted matchups are generated here.</p></div>'+
 '<span class="v25-policy-tag">'+c.publishedFutureSourceFixtureReferences+' public future references</span></div>'+
 '<div class="v25-review-kpis">'+[
  ["Published future games",c.publishedFutureSourceFixtureReferences],
  ["Would cross proposed divisions",c.crossDivisionSourceMatchupsForCommissionerReview],
  ["Draft matchup pairings",draft.length],
  ["Booked ice slots",0]
 ].map(([name,v])=>'<div><span>'+esc(name)+'</span><b>'+v+'</b></div>').join("")+'</div>'+
 '<div class="v25-schedule-toolbar"><label>Preview league night<select id="v25-schedule-night">'+
 NIGHTS.map(n=>'<option value="'+n+'"'+(n===selectedNight?' selected':'')+'>'+n+'</option>').join("")+
 '</select></label><button type="button" id="v25-generate">Regenerate unslotted draft</button>'+
 '<button type="button" id="v25-export">Export commissioner review package</button></div>'+
 (preview?'<div class="v25-preview-list"><h4>'+esc(n)+
 ' · sample post-lock matchups</h4>'+
 sample.map(x=>'<div><strong>Week '+x.week+'</strong> <span>'+esc(noName(x.leagueId+":"+x.homeTeamId))+
 ' vs '+esc(noName(x.leagueId+":"+x.awayTeamId))+'</span>'+
 '<small>'+esc(x.groupName)+' · date/time/rink unassigned</small></div>').join("")+
 '</div>':'<p class="v25-preview-placeholder">Generate a draft to view weekly pairings. Ice allocation, home/away rules and actual release remain with the facility and commissioner.</p>')+
 '<details><summary>Inspect the first five future fixtures that would need review</summary>'+
 '<div class="v25-conflicts">'+conflicts.slice(0,5).map(f=>
 '<div><b>'+esc(f.date)+' · '+esc(f.night)+'</b><span>'+
 esc(noName(f.leagueId+":"+f.homeTeamId))+' vs '+
 esc(noName(f.leagueId+":"+f.awayTeamId))+'</span>'+
 '<small>Source #'+f.gameId+' remains unchanged · cross-division review only</small></div>').join("")+
 '</div></details><p class="v25-schedule-boundary">No original SVHL schedule entry was rescheduled, cancelled, booked or approved. Every proposed slot remains undated and unassigned. Early/late time equity is enforced only after an authorized ice inventory is connected.</p></section>';
}
let selectedNight="Sunday";
function leagueUI(){
 const root=$("#leagueos-v25-competition-studio");if(!root||!forecasts||!lifecycle)return;
 root.innerHTML='<section class="v25-league"><div class="v25-head"><div>'+
 '<span>LEAGUEOS / COMPETITIVE FAIRNESS ENGINE</span><h3>Player detail in. Clear division decisions out.</h3>'+
 '<p>Source-qualified individual history, current roster output, scoring regression and opponent results feed a research-only team projection. A–D bands are relative within each night and connected competition pool—not official league classifications.</p></div>'+
 '<div class="v25-head-note"><strong>COMPETITIVE INTEGRITY</strong><small>Designed to reduce mismatched games, not guarantee a blowout-free season.</small></div></div>'+
 '<div class="v25-top-metrics">'+[
 ["Rated teams",forecasts.counts.sourceRatedTeams],
 ["Projected players",forecasts.counts.estimatedSkaterProjections],
 ["With prior player history",forecasts.counts.sourcePlayerIDsWithHistoricalStats],
 ["Cross-night verified player IDs",forecasts.counts.crossNightExactPlayerIDs]
 ].map(([label,value])=>'<div><span>'+esc(label)+'</span><b>'+value+'</b></div>').join("")+'</div>'+
 '<div class="v25-scan-legend"><span><i class="v25-dot"></i> PAST · verified player-season evidence</span>'+
 '<span><i class="v25-dot"></i> CURRENT · published team results</span>'+
 '<span><i class="v25-dot"></i> PROJECTED · modelled future performance</span></div>'+
 '<div class="v25-decision-table"><div class="v25-section-head"><div><span>ALL FOUR NIGHTS</span>'+
 '<h3>Current setup vs recommended strength groups</h3>'+
 '<p>Roster-aware analysis changes '+forecasts.counts.scenarioMovedTeamsVsResultsOnly+
 ' experimental team placements compared with the results-only scenario. No official moves occurred.</p></div></div>'+
 '<div class="v25-wide"><table><thead><tr><th>Night</th><th>Current sizes</th><th>Recommended sizes</th>'+
 '<th>Expected team scoring</th><th>Source confidence</th><th>Teams</th></tr></thead><tbody>'+
 evidenceRows()+'</tbody></table></div>'+
 '<div id="v25-team-drilldown" class="v25-drilldown" hidden></div></div>'+
 validationEvidence()+coachHistoryEvidence()+groupRecommendations()+
 memCard()+lifePolicyUI()+schedulePreview()+
 (notice?'<p class="v25-notice" role="status">'+esc(notice)+'</p>':"")+
 '<p class="v25-disclaimer">Individual G/A/PTS forecasts use empirical-Bayes scoring-rate shrinkage, historical public exact-player-ID continuity, and a hypothetical 24-week season. Goalie ability, signed attendance, approved cross-night tiers and independent prospective validation are not yet available. The resulting A–D labels are research-only relative bands, not official classifications or guaranteed future results.</p></section>';
 if(expandedNight)expandNight(expandedNight);
}
let expandedNight=null;
function expandNight(n){
 if(!NIGHTS.includes(n))return;
 expandedNight=n;
 const el=$("#v25-team-drilldown");if(!el)return;
 el.hidden=false;
 el.innerHTML='<header><h4>'+esc(n)+' — individual team performance signals</h4>'+
 '<p>Past roster source scoring, current verified goals per game and projected output. Rankings are relative within compatible competition components.</p></header>'+
 shortTable(n);
}
function page(route){
 if(route==="team-projections")
  return '<section id="hockeyos-v25-projections" class="v25-hockeyos v25-root">'+
   '<div class="v25-loading"><h2>Validating Brave H.C. player forecasts…</h2>'+
   '<p>Official HTO actuals and a controlled coach research baseline are being checked.</p></div></section>';
 return "";
}
function teamUI(){
 const root=$("#hockeyos-v25-projections");if(!root||!hto)return;
 const sorted=hto.players.slice().sort((a,b)=>b.projectedSeasonPoints-a.projectedSeasonPoints||
   a.displayName.localeCompare(b.displayName));
 root.innerHTML='<div class="v25-team-heading"><span>HOCKEYOS / BRAVE H.C.</span>'+
 '<h2>Player trends and projected goals, assists & points</h2>'+
 '<p>HTO-published current results blended with your historical workbook projection approach. Season totals are model estimates for a 24-game regular-season example, not official future results. Source snapshot: '+
 esc(hto.sourcePublicCapturedAt.slice(0,10))+
 '. Winter/Summer historical rate normalization is not certified for these workbook priors.</p></div>'+
 '<div class="v25-top-metrics">'+[
  ["Current verified team GP",hto.sourceOfficialTeamGP],
  ["Skater projections",hto.counts.publishedPlayers],
  ["Matched coach baselines",hto.counts.playersWithCoachBaseline],
  ["Unmatched coach baselines",hto.counts.unmatchedSourcePlayers]
 ].map(([label,value])=>'<div><span>'+esc(label)+'</span><b>'+value+'</b></div>').join("")+'</div>'+
 '<div class="v25-wide"><table><thead><tr><th>Player</th><th>Actual GP</th><th>Actual G–A–PTS</th>'+
 '<th>Projected GP</th><th>Proj. G</th><th>Proj. A</th><th>Proj. PTS</th><th>Confidence</th></tr></thead><tbody>'+
 sorted.map(x=>'<tr><td><strong>'+esc(x.displayName)+'</strong>'+
 '<small>#'+esc(x.jersey)+' · '+esc(x.position||"Position unverified")+'</small></td>'+
 '<td>'+x.sourceGP+'</td><td>'+x.sourceG+'–'+x.sourceA+'–'+x.sourcePts+'</td>'+
 '<td>'+round(x.projectedSeasonGP,1)+'</td><td>'+round(x.projectedSeasonG,1)+'</td>'+
 '<td>'+round(x.projectedSeasonA,1)+'</td><td><b>'+round(x.projectedSeasonPoints,1)+'</b></td>'+
 '<td>'+esc(x.confidence)+'</td></tr>').join("")+'</tbody></table></div>'+
 '<div class="v25-source-notice"><strong>Source and confidentiality boundary</strong><p>'+
 hto.counts.playersWithCoachBaseline+' source player rows have an exact same-team name-and-jersey prior match. '+hto.counts.unmatchedSourcePlayers+' currently published players use public-source-only priors. No private scouting notes, birth dates, contact details or original workbook formulas were published. Model uncertainty is indicative, and official source statistics remain separate.</p>'+
 '<button type="button" data-go="team-stats">Official HTO statistics</button>'+
 '<button type="button" data-go="team-results">Official game results</button></div>';
}
function mount(route){
 if(route==="team-projections"){
  const el=$("#hockeyos-v25-projections");if(!el)return;
  load().then(()=>{if(el.isConnected)teamUI()}).catch(()=>{
   if(el.isConnected)el.innerHTML='<div class="v25-failed">Player forecasts unavailable: source verification failed. Open official HTO statistics instead.</div>';
  });return;
 }
 if(route==="league-division-plan"){
  const el=$("#leagueos-v25-competition-studio");if(!el)return;
  load().then(()=>{if(el.isConnected)leagueUI()}).catch(()=>{
   if(el.isConnected)el.innerHTML='<div class="v25-failed">Strength and scheduling review held because source verification failed.</div>';
  });
 }
}
function exportPackage(){
 if(!forecasts||!lifecycle||!policyValid(policy))return;
 const payload={
  schema:"bruttech-leagueos-commissioner-local-review/v25",
  generatedAt:new Date().toISOString(),status:"LOCAL_DEMO_DRAFT_NOT_APPROVED",
  selectedWeek,policy,officialLeagueAction:false,
  frozenPublishedSourceFixtureCount:lifecycle.summary.publishedFutureSourceFixtureReferences,
  crossDivisionFixtureReviewCount:lifecycle.summary.crossDivisionSourceMatchupsForCommissionerReview,
  memorialNaming:lifecycle.memorialBranding,teamPlacements:lifecycle.teamPlacements,
  sourceSHA256:lifecycle.sourceHashes,generatedMatchups:allDraftGames(lifecycle,policy),
  rulebookSection:"SVHL 2.7.2 — first alignment after week 5; halfway division lock is additional proposed policy",
  venueInventoryVerified:false,officialDatesAssigned:false,
  commissionerAuthPresent:false};
 const b=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),
 url=URL.createObjectURL(b),a=document.createElement("a");
 a.href=url;a.download="LeagueOS_V25_Division_Schedule_Review_DRAFT.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 notice="Export created locally. No league approval, schedule or standings were changed.";
 leagueUI();
}
document.addEventListener("click",ev=>{
 const b=ev.target.closest("button");
 if(!b||!$("#leagueos-v25-competition-studio"))return;
 if(b.dataset.v25Inspect){
  expandNight(b.dataset.v25Inspect);
  $("#v25-team-drilldown")?.scrollIntoView({behavior:"smooth",block:"start"});
 }else if(b.id==="v25-generate"){preview=true;notice="Unslotted research matchups regenerated; no ice time booked.";leagueUI()}
 else if(b.id==="v25-export"){exportPackage()}
 else if(b.id==="v25-save-policy"){
  const value=id=>Number($("#"+id)?.value);
  const next={seasonRegularWeeks:value("v25-season-length"),
   firstReviewAfterWeek:value("v25-first-week"),
   secondReviewAfterWeek:value("v25-final-week"),
   reviewWindows:value("v25-count-windows"),
   minimumFullWeeksBetweenFinalChangeAndPlayoffs:6};
  if(!policyValid(next)){notice="Invalid review windows. Keep the final lock at least six weeks before playoffs.";return leagueUI()}
  const week=value("v25-current-week");
  if(!Number.isInteger(week)||week<1||week>next.seasonRegularWeeks+4){
   notice="Current week must be within the season plus four review weeks.";return leagueUI()}
  policy=next;selectedWeek=week;
  try{localStorage.setItem(KEY,JSON.stringify({status:"BROWSER_LOCAL_DRAFT_NOT_LEAGUE_POLICY",policy}));notice="Local policy example saved. Official SVHL week-5 rule remains unchanged."}
  catch(_){notice="Browser storage denied; policy remains session-only."}
  preview=false;leagueUI();
 }
});
document.addEventListener("change",ev=>{
 if(ev.target.id==="v25-schedule-night"&&NIGHTS.includes(ev.target.value)){
  selectedNight=ev.target.value;leagueUI()
 }
});
window.LeagueOSCompetitionV25={mount,page,_test:{validate,policyValid,stageAt,roundRobin,allDraftGames,
 getForecaster:()=>forecasts,getLifecycle:()=>lifecycle,getHockey:()=>hto,
 getBacktest:()=>backtest,getCoachContext:()=>coachContext}};
})();