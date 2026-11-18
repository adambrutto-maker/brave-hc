/**
 * LeagueOS V25 — competition review windows, memorial division lineage and
 * schedule-impact/matchup drafts. Fully original BruTTech implementation.
 * Not an official policy amendment, ice booking, schedule publication or approval.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const read=n=>{const b=fs.readFileSync(path.join(ROOT,n));return{data:JSON.parse(b),sha256:crypto.createHash("sha256").update(b).digest("hex"),file:n}};
const model=read("leagueos-division-recommendations-v23.json");
const roster=read("leagueos_division_alignment_public_v2.json");
const registry=read("leagueos-source-qualified-current-fixtures-v4.json");
const discovery=read("leagueos-fixture-discovery-v24.json");
const settledPath=path.join(ROOT,"leagueos-settled-delta-v23.json");
const settled=fs.existsSync(settledPath)?read("leagueos-settled-delta-v23.json"):null;
const forecast=read("leagueos-roster-player-projections-v25.json");
const need=(x,s)=>{if(!x)throw Error("V25_SOURCE_HOLD: "+s)};
need(model.data.schema==="bruttech-leagueos-night-division-recommendations/v23"&&
 model.data.overview.modeledTeams===96&&model.data.nights.length===4,
 "No 96-team research assignments");
need(registry.data.counts.total===411&&discovery.data.counts.newCandidateCount>=61&&
 discovery.data.officialRecordsEdited===false,"Future source fixture coverage incomplete");
need(roster.data.teams.length===96,"No source points/standings data");
const settledIds=new Set();
if(settled){
 need(settled.data.schema==="bruttech-leagueos-settled-results/v23"&&
  settled.data.status==="RECIPROCAL_SETTLED_GAMES_ONLY"&&
  settled.data.officialRecordsEdited===false&&
  settled.data.baseFixtureSha256===registry.sha256&&
  Array.isArray(settled.data.games),"Untrusted newly settled source");
 for(const game of settled.data.games){
  const id=game.leagueId+":"+game.gameId;
  need(!settledIds.has(id),"Duplicate settled source ID");
  settledIds.add(id);
 }
}
need(forecast.data.schema==="bruttech-leagueos-roster-player-projections/v25"&&
 forecast.data.counts.sourceRatedTeams===96&&forecast.data.experimentalDivisionGroups.length===9,
 "No source-qualified roster-aware placement scenario");
const researchPool=new Map(forecast.data.experimentalDivisionGroups.map(p=>[p.poolKey,p]));
const names=["Sunday","Tuesday","Wednesday","Thursday"];
const memorial={id:"cristillo-memorial-identity",displayName:"The Cristillo Division",
 kind:"MEMORIAL_DIVISION_NAME",nameSinceSeason:"Winter 2025/26",
 continuityEvidence:[
  {leagueId:547,season:"Winter 2025/26",sourceTeamId:13157,name:"Braves HC",division:"The Cristillo Division"},
  {leagueId:570,season:"Winter 2026/27",sourceTeamId:13679,name:"Braves HC",division:"The Cristillo Division"}
 ],anchorCurrentTeamId:13679,anchorNight:"Sunday",anchorLeagueId:570,
 defaultBrandPolicy:"FOLLOW_NAMED_ANCHOR_TEAM_IN_SIMULATION",
 leagueApproval:"NAME_FOLLOWS_TEAM_POLICY_NOT_CONFIRMED_BY_LEAGUE",
 strengthLevel:null,levelRelation:"BRAND_HAS_NO_INHERENT_A_TO_D_STRENGTH",
 changingGroupNameChangesOfficialSource:false,
 note:"User-attested intent; historical public records show the name in 2025/26 and 2026/27. Future movement/name transfer needs commissioner approval."};
const defaultPolicy={
 seasonRegularWeeks:24,firstReviewAfterWeek:5,secondReviewAfterWeek:12,
 finalLockAfterWeek:12,reviewWindows:2,
 minimumFullWeeksBetweenFinalChangeAndPlayoffs:6,
 afterLockAction:"MONITOR_REPORT_ONLY_NO_REALIGNMENTS",
 effectiveScheduleWeekAfterFirst:6,effectiveScheduleWeekAfterFinal:13,
 pointsCarryToNewDivision:true,
 pointsCarrySource:"SVHL Rule Book section 2.7.2",
 rostersFreezeAtHalfway:true,rosterFreezeIsNotDivisionFreeze:true,
 seasonWeeksSource:"DEMONSTRATION_CONFIGURATION_NOT_VERIFIED_OFFICIAL_SCHEDULE",
 rulebookAuthority:"https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf",
 rulebookRequirement:"DIVISION_REALIGNMENT_AT_END_OF_FIFTH_WEEK",
 finalLockPolicyAuthority:"PRODUCT_RECOMMENDATION_REQUIRES_LEAGUE_ADOPTION",
 configurableByFutureAuthenticatedCommissioner:true,
 noReassignmentWithinLastThreeWeeks:true,
 requiresAuthorizedCommissionerApproval:true,
 noStaticDemoOfficialActions:true
};
function evaluatePolicy(p){
 const raw=[p.seasonRegularWeeks,p.firstReviewAfterWeek,p.secondReviewAfterWeek,
  p.minimumFullWeeksBetweenFinalChangeAndPlayoffs,p.reviewWindows];
 if(raw.some(v=>!Number.isInteger(v)))throw Error("Invalid integer season-policy field");
 const [length,first,second,buffer,windows]=raw;
 if(length<12||length>40||first<3||first>=length||
    second<=first||second>=length-buffer||buffer<3||buffer>12||
    ![1,2].includes(windows))throw Error("Review windows cannot encroach on final playoff lock");
 const last=windows===2?second:first;
 if(last>length-buffer)throw Error("Published final lock would be too close to the playoffs");
 return{seasonRegularWeeks:length,firstReviewAfterWeek:first,secondReviewAfterWeek:second,
  finalLockAfterWeek:last,minimumFullWeeksBetweenFinalChangeAndPlayoffs:buffer,
  reviewWindows:windows,pointsCarryToNewDivision:true};
}
evaluatePolicy(defaultPolicy);
function stageAt(week,p=defaultPolicy){
 evaluatePolicy(p);
 if(!Number.isInteger(week)||week<1||week>p.seasonRegularWeeks+4)throw Error("Unknown week");
 const final=p.reviewWindows===2?p.secondReviewAfterWeek:p.firstReviewAfterWeek;
 let stage="BEFORE_FIRST_WINDOW";
 if(week===p.firstReviewAfterWeek)stage="FIRST_WINDOW_REVIEW_SETTLED_RESULTS_REQUIRED";
 if(week>p.firstReviewAfterWeek&&week<final)stage="BETWEEN_WINDOWS_RECOMMENDATIONS_ONLY";
 if(p.reviewWindows===2&&week===final)stage="FINAL_WINDOW_REVIEW_SETTLED_RESULTS_REQUIRED";
 if(week>final)stage="FINAL_DIVISION_LOCK_ACTIVE";
 return{week,stage,anyOfficialRealignmentPermitted:stage.includes("WINDOW_REVIEW"),
  awaitingVerifiedWeekEnd:stage.includes("WINDOW_REVIEW"),
  requiresCommissionerApproval:stage.includes("WINDOW_REVIEW"),
  noLateMoves:stage==="FINAL_DIVISION_LOCK_ACTIVE",
  forecastOnlyOtherwise:!stage.includes("WINDOW_REVIEW"),
  finalLockWeek:final};
}
function roundRobin(ids,weekIndex){
 const teams=[...ids],players=teams.length;
 need(players>=4&&players<=10&&new Set(teams).size===players,"Invalid published candidate group");
 const cycle=[...teams];
 if(cycle.length%2)cycle.push(null);
 const rounds=cycle.length-1;
 const offset=weekIndex%rounds;
 // fixed first team; rotate remaining. Repeat cycles alternate home side.
 for(let r=0;r<offset;r++)cycle.splice(1,0,cycle.pop());
 const pairs=[];
 for(let i=0;i<cycle.length/2;i++){
  const a=cycle[i],b=cycle[cycle.length-1-i];
  if(a==null||b==null)continue;
  const reverse=(Math.floor(weekIndex/rounds)+i)%2===1;
  pairs.push({homeTeamId:reverse?b:a,awayTeamId:reverse?a:b});
 }
 return pairs;
}
const perTeam=new Map(roster.data.teams.map(t=>[t.league_id+":"+t.team_id,t]));
need(perTeam.size===96,"Duplicate qualified source team");
const states=[];
const proposalByTeam=new Map();
const currentByTeam=new Map();
const groupSets=[];
for(const n of model.data.nights){
 need(names.includes(n.night)&&n.pools.length>0,"Unexpected night");
 const currentGroups=n.pools.flatMap(pool=>pool.current.map(g=>({
  name:g.name,teamIds:g.teamIds,program:pool.program,sourceComponent:pool.component,poolKey:pool.key})));
 const proposedGroups=n.pools.flatMap(pool=>{
  const research=researchPool.get(pool.key);
  need(research&&research.leagueId===n.leagueId&&research.program===pool.program&&
    research.component===pool.component,
    "Experimental scenario does not match exact source competition pool");
  return research.groups.map(g=>({
   id:g.groupKey,band:g.name,
   name:g.sourceTeamIds.includes(memorial.anchorCurrentTeamId)&&n.night==="Sunday"?
    memorial.displayName:g.name,
   brandingAuthority:g.sourceTeamIds.includes(memorial.anchorCurrentTeamId)&&n.night==="Sunday"?
    "SIMULATED_MEMORIAL_LINEAGE":"PROVISIONAL_MODEL_BAND",
   teamIds:g.sourceTeamIds,program:pool.program,sourceComponent:pool.component,
   poolKey:pool.key
  }));
 });
 for(const g of currentGroups)for(const id of g.teamIds){
  need(!currentByTeam.has(n.leagueId+":"+id),"Source team in multiple current groups");
  currentByTeam.set(n.leagueId+":"+id,{group:g.name,program:g.program,pool:g.poolKey});
 }
 for(const g of proposedGroups)for(const id of g.teamIds){
  need(!proposalByTeam.has(n.leagueId+":"+id),"Source team in multiple proposals");
  proposalByTeam.set(n.leagueId+":"+id,{group:g.name,program:g.program,pool:g.poolKey,
    groupId:g.id,band:g.band});
 }
 const movedTeams=n.pools.flatMap(p=>p.proposed.flatMap(g=>g.teams
   .filter(id=>currentByTeam.has(n.leagueId+":"+id)&&
      currentByTeam.get(n.leagueId+":"+id).group!==g.name)));
 states.push({night:n.night,leagueId:n.leagueId,currentGroups,proposedGroups,
  sourceTeamCount:n.sourceTeamCount,competitiveGroupChangeCandidateCount:movedTeams.length});
 groupSets.push(...proposedGroups.map(g=>({...g,night:n.night,leagueId:n.leagueId})));
}
need(currentByTeam.size===96&&proposalByTeam.size===96,"Source memberships cannot change");
const original=registry.data.fixtures.filter(f=>f.status==="FUTURE_RECIPROCAL_FIXTURE"&&
 !settledIds.has(f.league_id+":"+f.game_id));
const newcandidates=discovery.data.candidates.filter(g=>
 g.status==="NEW_FUTURE_RECIPROCAL"&&!g.missingFromCurrentSource);
const candidateIndex=new Set(original.map(g=>g.league_id+":"+g.game_id));
for(const x of newcandidates)need(!candidateIndex.has(x.league_id+":"+x.game_id),
 "New discovery duplicates canonical future source");
const sourceFuture=[
 ...original.map(f=>({leagueId:f.league_id,gameId:f.game_id,night:f.night,date:f.date,
  timeLocal:f.time,homeTeamId:f.home_team_id,awayTeamId:f.away_team_id,
  rink:f.rink??null,rinkVerified:Boolean(f.rink_verified_by_home_schedule),
  sourceUrl:f.official_game_url,sourceOrigin:"CANONICAL_20261116"})),
 ...newcandidates.map(f=>({leagueId:f.league_id,gameId:f.game_id,night:f.night,date:f.date,
  timeLocal:f.time,homeTeamId:f.home_team_id,awayTeamId:f.away_team_id,
  rink:null,rinkVerified:false,sourceUrl:f.officialGameUrl,
  sourceOrigin:"NEW_RECIPROCAL_FUTURE_V24"}))
];
const impacts=sourceFuture.map(f=>{
 const h=proposalByTeam.get(f.leagueId+":"+f.homeTeamId),
 a=proposalByTeam.get(f.leagueId+":"+f.awayTeamId);
 const eligible=!!h&&!!a&&h.program===a.program;
 return{...f,
  modelCandidateImpact:!eligible?"SOURCE_TEAM_UNRATED_OR_PROGRAM_HOLD":
   h.groupId===a.groupId?"PRESERVE_SOURCE_MATCHUP_WITHIN_CANDIDATE_GROUP":
    "CROSS_GROUP_FIXTURE_REVIEW_IF_LEAGUE_REALIGNS",
  hypotheticalNewGroupHome:h?.group||null,hypotheticalNewGroupAway:a?.group||null,
  newOfficialGameDate:null,sourceFixtureCancelled:false,
  officialSourceUnchanged:true,needsConfirmedIceBeforeNewSchedule:true
 };
});
const scheduleDraft=[],schedulingHolds=[];
for(const g of groupSets){
 if(g.teamIds.length<4||g.teamIds.length>10){
  schedulingHolds.push({groupId:g.id,night:g.night,teamCount:g.teamIds.length,
   reason:"SOURCE_FRAGMENT_NOT_A_PLAYABLE_APPROVED_DIVISION"});continue;
 }
 for(let week=defaultPolicy.finalLockAfterWeek+1;week<=defaultPolicy.seasonRegularWeeks;week++){
  const round=week-defaultPolicy.finalLockAfterWeek-1;
  for(const pair of roundRobin(g.teamIds,round)){
   scheduleDraft.push({week,night:g.night,program:g.program,leagueId:g.leagueId,
    candidateGroupId:g.id,provisionalGroup:g.name,
    homeTeamId:pair.homeTeamId,awayTeamId:pair.awayTeamId,
    slotDate:null,slotTime:null,rink:null,
    sourcePublishedGameId:null,
    status:"UNSLOTTED_DRAFT_MATCHUP_NOT_BOOKED",
    requiresFacilityIceConfirmation:true,
    requiresDivisionApproval:true,
    schedulingFairnessPolicy:"EARLY_LATE_ROTATION_REQUIRED_AFTER_ICE_BLOCK_ALLOCATION"});
  }
 }
}
const points=roster.data.teams.map(t=>{
 const key=t.league_id+":"+t.team_id;
 const current=currentByTeam.get(key),next=proposalByTeam.get(key);
 need(current&&next,"Team qualified standings missing proposed group");
 const good=Number.isInteger(t.pts)&&t.pts>=0&&t.standings_source_valid;
 return{leagueId:t.league_id,teamId:t.team_id,name:t.team_name,night:t.night,
  originalDivision:t.division,currentGroup:current.group,proposedGroup:next.group,
  groupId:next.groupId,program:t.program,
  carriedPointsOnApprovedMove:good?t.pts:null,
  pointsStatus:good?"PUBLISHED_STANDINGS_CONDITIONAL_CARRY":"STANDINGS_SOURCE_HOLD",
  sourcePointsWereModified:false
 };
});
const output={
 schema:"bruttech-leagueos-division-lifecycle-and-schedule-preview/v25",
 status:"PUBLIC_DEMO_ADVISORY_SCHEDULE_NOT_PUBLISHED",
 asOfDate:"2026-11-17",asOfSeason:"Winter 2026/27",
 rulebookSource:defaultPolicy.rulebookAuthority,
 officialSourceRule:"WEEK_5_REALIGNMENT_WITH_POINTS_CARRIED",
 finalLockPolicySource:"USER_REQUESTED_PRODUCT_POLICY_NOT_SVHL_RULEBOOK",
 seasonWeekAssumption:"DEMO_24_WEEK_REGULAR_SEASON_NOT_AN_OFFICIAL_SCHEDULE",
 officialApprovalAvailable:false,
 scenarioSource:"V25_EXPERIMENTAL_ROSTER_AWARE_WITH_RESULTS_BASELINE_NOT_LEAGUE_VALIDATED",
 officialScheduleModified:false,officialDivisionModified:false,
 officialStandingsModified:false,
 sourceHashes:{model:model.sha256,ratings:roster.sha256,
  canonicalFixtures:registry.sha256,discovery:discovery.sha256,
  rosterAwareForecast:forecast.sha256,
  ...(settled?{settledSource:settled.sha256}:{})},
 policy:defaultPolicy,memorialBranding:[memorial],
 nights:states,teamPlacements:points,
 scheduleImpact:impacts,schedulingHolds,unslottedMatchupDraft:scheduleDraft,
 summary:{sourceModeledTeams:96,sourceNights:4,
  proposedGroups:groupSets.length,officialDivisionChanges:0,
  publishedFutureSourceFixtureReferences:sourceFuture.length,
  sourceMatchupsUnaffectedBySimulation:impacts.filter(x=>
   x.modelCandidateImpact==="PRESERVE_SOURCE_MATCHUP_WITHIN_CANDIDATE_GROUP").length,
  crossDivisionSourceMatchupsForCommissionerReview:impacts.filter(x=>
   x.modelCandidateImpact==="CROSS_GROUP_FIXTURE_REVIEW_IF_LEAGUE_REALIGNS").length,
  teamOutsideModeledOrProgramHold:impacts.filter(x=>
   x.modelCandidateImpact==="SOURCE_TEAM_UNRATED_OR_PROGRAM_HOLD").length,
  unslottedDraftMatchups:scheduleDraft.length,schedulingHeldGroups:schedulingHolds.length,
  scheduledIceSlots:0,
  officialScheduleChangeActions:0,
  memorialContinuityEvidenceSeasonCount:2,
  sourceVerifiedSettledGamesExcludedFromFuture:settledIds.size}
};
fs.writeFileSync(path.join(ROOT,"leagueos-division-lifecycle-v25.json"),JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({status:output.status,summary:output.summary,
 policy:output.policy,memorial:output.memorialBranding[0].displayName,
 firstScheduleDraft:output.unslottedMatchupDraft.slice(0,2)},null,2));
