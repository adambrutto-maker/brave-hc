/* BruTTech LeagueOS V27 — independently authored decision-ready commissioner report.
   Fictional 24-team simulation remains separate from observed historical evidence.
   No official team movement, schedule mutation, player registration or ice booking.
*/
(function(){"use strict";
const SOURCE="./leagueos-decision-research-v27.json";
const ALLOWED_THRESHOLDS=[250,300,400];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=x=>Number.isFinite(x)?(100*x).toFixed(1)+"%":"—";
const fixed=x=>Number.isFinite(x)?x.toFixed(1):"—";
const clone=x=>JSON.parse(JSON.stringify(x));
let source=null,loadPromise=null,current=null,threshold=300,downloadNotice="";
const allById=s=>new Map(s.teams.map(t=>[t.id,t]));
function validateEvidence(x){
 if(!x||x.schema!=="bruttech-leagueos-commissioner-research-context/v27"||
  x.status!=="RETROSPECTIVE_OBSERVATIONAL_RESEARCH_SEPARATE_FROM_FICTIONAL_PLACEMENT"||
  !/^[a-f0-9]{64}$/.test(x.sourceSHA256||"")||
  x.sourceFile!=="leagueos-competitive-balance-backtest-v25.json"||
  x.eligibleCompletedGames<14000||x.sourceLeagueSeasons<100||
  x.cohorts?.balanced?.games<10000||x.cohorts?.moderate?.games<1000||
  !(x.cohorts.balanced.sourceFiveGoalRate>0&&x.cohorts.balanced.sourceFiveGoalRate<1)||
  !(x.cohorts.moderate.sourceFiveGoalRate>0&&x.cohorts.moderate.sourceFiveGoalRate<1)||
  !Number.isFinite(x.observedRateGapPP)||
  x.causalEvidence!==false||x.incrementalRosterProjectionValidated!==false||
  x.noFictionalOutcomesInStudy!==true||x.noLeagueChanges!==true||
  x.notSufficientStrongMismatchSample>=50||
  !x.displayPolicy?.warning?.includes("NOT proof")||
  Math.abs(100*(x.cohorts.moderate.sourceFiveGoalRate-
    x.cohorts.balanced.sourceFiveGoalRate)-x.observedRateGapPP)>.15)
  throw Error("Historical risk evidence has not passed source/provenance controls");
 return x;
}
function withinGroup(s,groups,limit=300){
 if(!ALLOWED_THRESHOLDS.includes(limit))throw Error("Invalid rating-gap scenario threshold");
 const teams=allById(s);
 let pairs=0,sum=0,flags=0;
 const seen=new Set();
 for(const group of groups){
  if(!Array.isArray(group)||group.length<1||group.length>24)throw Error("Invalid competition grouping");
  for(const id of group){
   if(!teams.has(id)||seen.has(id))throw Error("Unknown or duplicate fictional team");
   seen.add(id);
  }
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
   const a=teams.get(group[i]),b=teams.get(group[j]);
   if(!Number.isFinite(a.strengthAssessment.score)||!Number.isFinite(b.strengthAssessment.score))
    throw Error("Fictional assessment score missing");
   const gap=Math.abs(a.strengthAssessment.score-b.strengthAssessment.score);
   sum+=gap;pairs++;
   if(gap>=limit)flags++;
  }
 }
 return{teamsCovered:seen.size,pairs,meanGap:pairs?Math.round(sum/pairs*10)/10:null,
  highGapPairs:flags,highGapFraction:pairs?flags/pairs:null,threshold:limit};
}
function report(s,state,rec,limit=300){
 if(!s||s.schema!=="bruttech-sportsos-connected-fictional-tenant/v26"||
  s.authorization?.officialScheduleWrite!==false||
  s.authorization?.paymentProcessing!==false||
  s.teams?.length!==24||!state||!rec||
  ![5,12].includes(s.season.reviewWeek===5?s.season.reviewWeek:0)||
  s.season.finalLockAfterWeek!==12)
  throw Error("Fictional commissioner source failed safety gates");
 if(!ALLOWED_THRESHOLDS.includes(limit))throw Error("Invalid reviewer scenario threshold");
 const currentGroups=s.divisionInstancesCurrent,
  proposalGroups=rec.groups;
 const currentPair=withinGroup(s,currentGroups.map(x=>x.teamIds),limit);
 const proposedPair=withinGroup(s,proposalGroups.map(x=>x.teamIds),limit);
 const accepted=new Set(proposalGroups.flatMap(x=>x.teamIds));
 const held=new Set(rec.holds.flatMap(x=>x.teamIds));
 if(accepted.size!==rec.ratedTeams||held.size!==rec.heldTeams||
  [...accepted].some(id=>held.has(id))||accepted.size+held.size!==s.teams.length)
  throw Error("Team conservation and hold classification failed");
 const origin=new Map(currentGroups.flatMap(g=>g.teamIds.map(id=>[id,g.name])));
 const destination=new Map(proposalGroups.flatMap(g=>g.teamIds.map(id=>[id,g.name])));
 const teams=s.teams.map(t=>({
  id:t.id,name:t.name,sourceGroup:origin.get(t.id)||null,
  proposedGroup:destination.get(t.id)||null,
  strengthGrade:state.overrides[t.id]||t.strengthAssessment.level,
  fictionalScore:t.strengthAssessment.score,
  held:held.has(t.id),
  hypotheticalMove:!held.has(t.id)&&origin.get(t.id)!==destination.get(t.id)
 }));
 const moved=teams.filter(t=>t.hypotheticalMove);
 const game=s.fictitiousGame,home=destination.get(game.homeTeamId),
  away=destination.get(game.awayTeamId);
 const fixtureWithin=home&&home===away;
 const weeks=s.season;
 const week=state.currentWeek,locked=week>weeks.finalLockAfterWeek,
  inReviewWindow=[weeks.reviewWeek,weeks.finalReviewWeek].includes(week);
 const ready=inReviewWindow&&!locked&&held.size===0&&proposedPair.teamsCovered===24;
 const twoWeekDrafts=held.size?0:2*proposalGroups.reduce((n,g)=>n+Math.floor(g.teamIds.length/2),0);
 if(!held.size&&twoWeekDrafts!==22&&rec.groups.map(g=>g.teamIds.length).join(",")==="8,9,7")
  throw Error("Unslotted fictional schedule preview inconsistent");
 const recommended=proposedPair.teamsCovered===24&&held.size===0;
 const planStatus=locked?"FINAL_DIVISION_LOCK_MONITOR_ONLY":
  held.size?"EVIDENCE_HOLD_UNDERSIZED_GROUP":
  ready?"FICTIONAL_COMMISSIONER_REVIEW_WINDOW":"MONITOR_DRAFT_AWAIT_REVIEW_WINDOW";
 return{
  schema:"bruttech-leagueos-commissioner-decision-report/v27",
  status:"FICTIONAL_DECISION_SUPPORT_UNAPPROVED",
  tenant:s.tenant.name,season:s.season.name,
  sourceKind:"ALL_24_TEAMS_AND_STRENGTH_SCORES_FICTIONAL",
  threshold:limit,week,
  current:{groupCount:currentGroups.length,groupSizes:currentGroups.map(x=>x.teamIds.length),
   ...currentPair},
  proposed:{groupCount:proposalGroups.length,groupSizes:proposalGroups.map(x=>x.teamIds.length),
   ...proposedPair},
  modeledImprovement:{
   meanWithinDivisionGapReduction:currentPair.meanGap!==null&&proposedPair.meanGap!==null?
    Math.round((currentPair.meanGap-proposedPair.meanGap)*10)/10:null,
   percentHighGapShareReduction:currentPair.highGapFraction!==null&&proposedPair.highGapFraction!==null?
    Math.round((currentPair.highGapFraction-proposedPair.highGapFraction)*1000)/10:null,
   isFictionalScoreProxyOnly:true,notForecastOfBlowouts:true
  },
  movement:{hypotheticalMoveCount:moved.length,teams:teams,
   realLeagueMovements:0,sourceRegistrationChanges:0},
  holds:clone(rec.holds),
  schedule:{sourceFictionalGameId:game.id,existingGameStillWithinGroup:Boolean(fixtureWithin),
   existingGameStatus:"FICTIONAL_REFERENCE_UNCHANGED",
   twoWeekDraftMatchups:twoWeekDrafts,
   changedLiveFixtures:0,allocatedIceSlots:0,earlyLateBalanceCalculated:false,
   iceInventory:"NOT_CONNECTED"},
  gates:{currentWeek:week,reviewWindow:inReviewWindow,finalLockActive:locked,
   readyForFictionalReview:ready,reviewRecordedInBrowser:state.decision.status==="SIMULATED_REVIEWED",
   fictionalPublicPreview:state.publication.status==="FICTIONAL_PUBLIC_PREVIEW",
   permittedAction:planStatus,officialApproval:false,officialPublication:false,
   sourceRules:"SVHL section 2.7.2 supports week-5 review and points carry; final midseason lock is a product proposal."},
  comparisonReady:recommended,
  noOfficialWrites:true,noCausalPrediction:true
 };
}
function pill(label,v,detail){
 return '<div class="v27-metric"><small>'+esc(label)+'</small><strong>'+esc(v)+
  '</strong><span>'+esc(detail)+'</span></div>';
}
function card(report){
 const r=report,im=r.modeledImprovement,gate=r.gates;
 const moved=r.movement.teams.filter(t=>t.hypotheticalMove);
 const held=r.movement.teams.filter(t=>t.held);
 const gradeCounts=Object.fromEntries(["A","B","C","D"].map(g=>[g,0]));
 for(const t of r.movement.teams)gradeCounts[t.strengthGrade]++;
 const unlocked=gate.readyForFictionalReview;
 return '<section class="v27-commissioner" aria-label="V27 commissioner decision evidence">'+
 '<header class="v27-heading"><div><span>V27 · COMMISSIONER DECISION REPORT</span>'+
 '<h4>Current competition. Proposed groups. Decision consequences.</h4>'+
 '<p>A concise review of the 24 invented teams—not a forecast of real game outcomes.</p></div>'+
 '<b class="v27-state">'+(gate.finalLockActive?"DIVISIONS LOCKED":
 r.holds.length?"SOURCE HOLD":unlocked?"REVIEW WINDOW":"MONITORING")+'</b></header>'+
 '<div class="v27-scoreline">'+
 pill("Mean team-score gap",fixed(r.current.meanGap)+" → "+fixed(r.proposed.meanGap),
  "Within-division rating-gap proxy; lower is closer")+
 pill("Large-gap pair share",pct(r.current.highGapFraction)+" → "+pct(r.proposed.highGapFraction),
  "Flag threshold "+r.threshold+" fictional score units")+
 pill("Groups",r.current.groupCount+" → "+r.proposed.groupCount,
  r.current.groupSizes.join("/")+" current · "+r.proposed.groupSizes.join("/")+" proposed")+
 pill("Teams needing review",String(r.movement.hypotheticalMoveCount)+"/24",
  r.holds.length+" held outside playable recommendations")+
 '</div>'+
 '<div class="v27-action-row"><label>Compare rating gaps at '+
 '<select data-v27-threshold aria-label="Fictional team rating gap threshold">'+
 ALLOWED_THRESHOLDS.map(n=>'<option value="'+n+'"'+(n===threshold?' selected':'')+'>'+
 n+' score points</option>').join("")+'</select></label>'+
 '<button type="button" data-v27-export>Export local decision report</button>'+
 '<span>'+esc(gate.sourceRules)+'</span></div>'+
 '<div class="v27-cards">'+
 '<div class="v27-decision"><h5>Competition impact</h5><strong>'+
 (r.comparisonReady?"Candidate groupings reduce fictional score disparity.":
 "Recommendation held pending an adequate competition group.")+'</strong>'+
 '<p>'+r.current.pairs+' current versus '+r.proposed.pairs+
 ' proposed possible within-group team pairings. These are different pair sets, not verified game results. '+
 (im.meanWithinDivisionGapReduction!==null?
 "Mean model-score gap decreases by "+fixed(im.meanWithinDivisionGapReduction)+" points.":"")+
 '</p><small>Grades: '+Object.entries(gradeCounts).map(([g,n])=>g+" "+n).join(" · ")+
 ' · Missing B/C divisions are not invented.</small></div>'+
 '<div class="v27-decision"><h5>Operational impact</h5><strong>'+
 r.schedule.twoWeekDraftMatchups+' unslotted hypothetical matchups</strong>'+
 '<p>Current fictional example game '+(r.schedule.existingGameStillWithinGroup?
 "remains within one recommended group.":"would cross two proposed groups and needs human review.")+
 ' Zero ice slots booked; early/late allocation cannot be checked without a real venue inventory.</p>'+
 '<small>Original fixture references unchanged · no referee assignments or player eligibility decisions</small></div>'+
 '</div>'+
 '<div class="v27-gate"><strong>'+(
  gate.finalLockActive?"Final placement lock active — no new division moves allowed.":
  r.holds.length?"A team lacks an adequate group: halt commissioner review.":
  unlocked?"Window open: commissioner can review the fictional recommendation.":
  "Weekly analysis continues; a division move must wait for an approved review window.")+
 '</strong><small>Week '+gate.currentWeek+' · simulated week-5 review / final midseason review · '+
 (gate.reviewRecordedInBrowser?"Local review recorded. ":"No commissioner review recorded. ")+
 (gate.fictionalPublicPreview?"Fictional public preview updated.":"Fictional public preview not published.")+
 ' There is no authenticated approval or league scheduling API.</small></div>'+
 '<details class="v27-movements"><summary>Inspect all 24 team placements and evidence holds</summary>'+
 '<div class="v27-table-wrap"><table><thead><tr><th>Fictional team</th><th>Source division</th>'+
 '<th>Proposed division</th><th>Strength</th><th>Disposition</th></tr></thead><tbody>'+
 r.movement.teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td>'+esc(t.sourceGroup)+'</td>'+
 '<td>'+esc(t.proposedGroup||"Not assigned")+'</td><td>'+esc(t.strengthGrade)+'</td>'+
 '<td>'+esc(t.held?"HOLD":t.hypotheticalMove?"REVIEW MOVE":"RETAIN")+'</td></tr>').join("")+
 '</tbody></table></div></details>'+
 (downloadNotice?'<p class="v27-notice" role="status">'+esc(downloadNotice)+'</p>':"")+
 '<div class="v27-research" id="leagueos-v27-historical-context"><b>Historical risk context</b>'+
 '<p>Validating aggregate source evidence; it is not used to convert this fictional example into a claimed reduction in blowouts.</p></div>'+
 '</section>';
}
function research(e){
 if(!e)return '<b>Historical evidence unavailable</b><p>Do not infer game outcomes from the fictional score-gap model.</p>';
 return '<b>Observed historical association — separate from this fictional scenario</b>'+
 '<p>Across '+e.eligibleCompletedGames.toLocaleString("en-CA")+
 ' eligible previously completed public-source games, the model-labelled balanced cohort recorded '+
 pct(e.cohorts.balanced.sourceFiveGoalRate)+' five-goal-margin games ('+
 e.cohorts.balanced.games.toLocaleString("en-CA")+' games), compared with '+
 pct(e.cohorts.moderate.sourceFiveGoalRate)+' in the moderately mismatched cohort ('+
 e.cohorts.moderate.games.toLocaleString("en-CA")+' games).</p>'+
 '<small><strong>Not causal:</strong> This does not establish that the proposed divisions would reduce blowouts, nor validate added player/roster projection accuracy. No current arena placement or official game result was changed.</small>';
}
function paint(){
 const root=document.getElementById("leagueos-v27-decision-report");
 if(!root||!current)return;
 const r=report(current.s,current.state,current.rec,threshold);
 root.innerHTML=card(r);
 const target=root.querySelector("#leagueos-v27-historical-context");
 if(target)target.innerHTML=research(source);
}
function mount(s,state,rec){
 const root=document.getElementById("leagueos-v27-decision-report");
 if(!root)return;
 current={s,state,rec};paint();
 if(!loadPromise)loadPromise=fetch(SOURCE,{cache:"no-store"}).then(r=>{
  if(!r.ok)throw Error("Research source HTTP "+r.status);
  return r.json();
 }).then(x=>{source=validateEvidence(x);return source}).catch(_=>{
  source=null;return null;
 });
 loadPromise.then(()=>{if(root.isConnected&&current)paint()});
}
function exportReport(){
 if(!current)return;
 const r=report(current.s,current.state,current.rec,threshold);
 const data={...r,exportedAt:new Date().toISOString(),
  research:source?{status:source.status,sourceSHA256:source.sourceSHA256,
   eligibleCompletedGames:source.eligibleCompletedGames,
   observedCohortRates:source.cohorts,causalEvidence:false}:null,
  approvalAuthority:"NONE_BROWSER_ONLY",officialLeagueWriteAllowed:false};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;
 link.download="LeagueOS_V27_Commissioner_Decision_Report_FICTIONAL.json";
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
 downloadNotice="Fictional decision package exported locally. No division, standings or schedule published.";
 paint();
}
document.addEventListener("change",event=>{
 if(event.target?.matches?.("[data-v27-threshold]")){
  const n=Number(event.target.value);
  if(ALLOWED_THRESHOLDS.includes(n)){threshold=n;paint()}
 }
});
document.addEventListener("click",event=>{
 if(event.target?.closest?.("[data-v27-export]")&&
  document.getElementById("leagueos-v27-decision-report"))exportReport();
});
window.LeagueOSDecisionV27={mount,_test:{validateEvidence,withinGroup,report,
  getEvidence:()=>source,getThreshold:()=>threshold}};
})();