/* HockeyOS — actual weekly stability, no fabricated intermediate weeks. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveWeeklyStability=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const SCHEMA="brave-hc-adult-weekly-stability/v1";
 const scope=typeof module!=="undefined"&&module.exports?
   require("./adult-league-scope.js"):window.BraveAdultLeagueScope;
 const need=(test,message)=>{if(!test)throw Error("STABILITY_HOLD:"+message)};
 const round=(x,n=1)=>Number(x.toFixed(n));
 const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
 const completeDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
   !Number.isNaN(new Date(v+"T00:00:00Z").getTime());
 function ranking(rows,capacity){
  const sorted=[...rows].sort((a,b)=>b.contextIndex-a.contextIndex||
     a.leagueName.localeCompare(b.leagueName));
  need(capacity.reduce((n,v)=>n+v,0)===sorted.length,"BAND_CAPACITY_MISMATCH");
  const map=new Map();let i=0;
  sorted.forEach((t,idx)=>{
   while(idx>=capacity.slice(0,i+1).reduce((n,v)=>n+v,0))i++;
   map.set(t.sourceTeamId,{rank:idx+1,band:i+1});
  });
  return map;
 }
 function analyze(league){
  need(league?.schema==="brave-hc-league-intelligence/public-v1" &&
    league.currentSourceDataConcordant===true &&
    league.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" &&
    league.strengthModel?.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
    league.strengthModel.probabilityOfWinning===false &&
    league.weeklyLedger?.schema==="brave-hc-svhl-weekly-context/v1" &&
    Array.isArray(league.weeklyLedger.weeks) &&
    league.weeklyLedger.weeksRecorded===league.weeklyLedger.weeks.length,
    "PUBLIC_WEEKLY_LEDGER_UNQUALIFIED");
  const sourceTeams=scope.teams(league),ids=new Set(sourceTeams.map(x=>x.sourceTeamId));
  need(sourceTeams.length>=12&&sourceTeams.length<=40 &&
    ids.size===sourceTeams.length,"ADULT_POOL_INVALID");
  const divisions=scope.divisions(league);
  need(divisions.length===3&&divisions.reduce((n,d)=>n+
    sourceTeams.filter(t=>t.divisionNow===d.name).length,0)===sourceTeams.length,
    "ADULT_DIVISION_SCOPE_CHANGED");
  const byId=new Map(sourceTeams.map(t=>[t.sourceTeamId,t]));
  const ordered=[...divisions].map(d=>{
    const scores=sourceTeams.filter(t=>t.divisionNow===d.name)
      .map(t=>t.strengthContext.contextIndex);
    need(scores.every(Number.isFinite),"SOURCE_SCORE_UNRATED");
    return {name:d.name,count:scores.length,average:mean(scores)};
  }).sort((a,b)=>b.average-a.average||a.name.localeCompare(b.name));
  const capacities=ordered.map(d=>d.count);
  // Band labels are fixed-capacity research buckets, not league assignments.
  const observed=[],skipped=[],snapshots=league.weeklyLedger.weeks;
  const originalTimes=snapshots.map(w=>new Date(w.observedAtUTC).getTime());
  need(originalTimes.every(Number.isFinite),"WEEKLY_TIMESTAMP_INVALID");
  for(const [idx,w] of snapshots.entries()){
   need(completeDate(w.weekStartToronto) &&
      (idx===0||w.weekStartToronto>snapshots[idx-1].weekStartToronto) &&
      originalTimes[idx]<=new Date(league.asOf).getTime() &&
      (idx===0||originalTimes[idx]>originalTimes[idx-1]),
      "SOURCE_WEEK_CHRONOLOGY_INVALID");
   const found=new Map();let malformed=false;
   for(const row of w.teams||[]){
    if(!ids.has(row.sourceTeamId))continue;
    need(!found.has(row.sourceTeamId),"DUPLICATED_WEEK_TEAM_ID");
    if(row.leagueName!==byId.get(row.sourceTeamId).leagueName ||
       !Number.isFinite(row.contextIndex) || row.contextIndex<0 ||
       row.contextIndex>100 || !Number.isInteger(row.gp) || row.gp<0 ||
       !scope.divisionsList.includes(row.divisionNow))
      malformed=true;
    found.set(row.sourceTeamId,row);
   }
   if(malformed){skipped.push({week:w.weekStartToronto,reason:"SOURCE_TEAM_SCOPE_OR_SCORE_INVALID"});continue;}
   if(found.size!==ids.size){
    skipped.push({week:w.weekStartToronto,reason:"INCOMPLETE_ADULT_TEAM_COHORT",
      admittedTeams:found.size,expectedTeams:ids.size});
    continue;
   }
   const rows=[...found.values()],placement=ranking(rows,capacities);
   observed.push({weekStartToronto:w.weekStartToronto,observedAtUTC:w.observedAtUTC,
     sourceSHA256:w.sourceSHA256,teamCount:rows.length,
     rows:rows.map(t=>({...t,...placement.get(t.sourceTeamId)}))});
  }
  need(observed.length>=1,"NO_COMPLETE_VERIFIED_WEEK");
  const latest=observed.at(-1);
  need(latest.weekStartToronto===snapshots.at(-1).weekStartToronto,"LATEST_ADULT_WEEK_INCOMPLETE");
  for(const t of latest.rows){
   const current=byId.get(t.sourceTeamId);
   need(t.gp===current.record.gp &&
      t.divisionNow===current.divisionNow &&
      Math.abs(t.contextIndex-current.strengthContext.contextIndex)<0.0000001,
      "LATEST_WEEK_CURRENT_SOURCE_DIVERGENCE");
  }
  const trajectories=sourceTeams.map(t=>{
   const points=observed.map(w=>{
    const row=w.rows.find(x=>x.sourceTeamId===t.sourceTeamId);
    return {week:w.weekStartToronto,observedAtUTC:w.observedAtUTC,
      contextIndex:row.contextIndex,rank:row.rank,band:row.band,
      divisionNow:row.divisionNow,gp:row.gp};
   });
   const first=points[0],last=points.at(-1);
   const deltas=points.slice(1).map((x,i)=>({
     from:points[i].week,to:x.week,
     indexDelta:round(x.contextIndex-points[i].contextIndex),
     rankChange:points[i].rank-x.rank,
     crossedResearchBand:x.band!==points[i].band,
     changedRealDivision:x.divisionNow!==points[i].divisionNow
   }));
   const lastDelta=deltas.at(-1)||null;
   const peak=round(Math.max(...points.map(x=>x.contextIndex))-
     Math.min(...points.map(x=>x.contextIndex)));
   const changes=deltas.filter(x=>x.crossedResearchBand).length;
   return {sourceTeamId:t.sourceTeamId,name:t.displayName,
     divisionNow:last.divisionNow,latestScore:last.contextIndex,
     latestRank:last.rank,latestBand:last.band,gp:last.gp,
     observedWeeks:points.length,firstWeek:first.week,lastWeek:last.week,
     indexRange:points.length>=2?peak:null,latestChange:lastDelta,
     bandCrossings:points.length>=2?changes:null,
     series:points,confidence:points.length===1?"BASELINE_ONLY":
       points.length<4?"EARLY_OBSERVED_TREND":"HISTORY_AVAILABLE_REVIEW_ONLY"};
  });
  const transitions=observed.slice(1).map((w,i)=>{
   const past=observed[i],idsA=new Map(past.rows.map(x=>[x.sourceTeamId,x]));
   const changes=w.rows.map(x=>({now:x,prior:idsA.get(x.sourceTeamId)}));
   const gap=Math.round((Date.parse(w.weekStartToronto)-Date.parse(past.weekStartToronto))/604800000);
   need(gap>=1,"WEEKLY_OBSERVATION_GAP_INVALID");
   return {from:past.weekStartToronto,to:w.weekStartToronto,
     weeksBetweenSnapshots:gap,skippedCalendarWeeks:Math.max(0,gap-1),
     teamsCompared:changes.length,
     bandCrossings:changes.filter(({now,prior})=>now.band!==prior.band).length,
     rankChanges:changes.filter(({now,prior})=>now.rank!==prior.rank).length,
     officialDivisionChanges:changes.filter(({now,prior})=>now.divisionNow!==prior.divisionNow).length,
     meanAbsoluteScoreChange:round(mean(changes.map(({now,prior})=>
       Math.abs(now.contextIndex-prior.contextIndex))),2),
     maxAbsoluteScoreChange:round(Math.max(...changes.map(({now,prior})=>
       Math.abs(now.contextIndex-prior.contextIndex))),2)};
  });
  const lastTransition=transitions.at(-1)||null;
  const positive=trajectories.filter(x=>x.latestChange?.indexDelta>0)
    .sort((a,b)=>b.latestChange.indexDelta-a.latestChange.indexDelta).slice(0,5);
  const declining=trajectories.filter(x=>x.latestChange?.indexDelta<0)
    .sort((a,b)=>a.latestChange.indexDelta-b.latestChange.indexDelta).slice(0,5);
  const teamsWithTen=sourceTeams.filter(t=>t.record.gp>=10).length;
  const final=observed.length,coverage=round(teamsWithTen/sourceTeams.length,3);
  return {schema:SCHEMA,state:final===1?"SOURCE_BACKED_BASELINE_ONLY":
    final<4?"PROVISIONAL_WEEKLY_CHANGE":"MULTI_WEEK_REVIEW_EVIDENCE",
    sourceAsOf:league.asOf,poolTeamCount:sourceTeams.length,
    originalSourceWeekCount:snapshots.length,completeObservedWeeks:final,
    incompleteWeeksHeld:skipped,earliestVerifiedWeek:observed[0].weekStartToronto,
    latestVerifiedWeek:latest.weekStartToronto,
    bandCapacities:capacities,
    researchBandMeaning:"Fixed capacities derived from current three adult groups, ranked by source index. Not official divisions, promotion tiers or win probabilities.",
    trajectories:trajectories.sort((a,b)=>a.latestRank-b.latestRank),
    transitions,lastTransition,
    lastWeekImprovers:positive,lastWeekDecliners:declining,
    verifiedBandMovement:transitions.length?
      transitions.reduce((n,x)=>n+x.bandCrossings,0):null,
    latestWeekBandRetention:lastTransition?
      round(100*(lastTransition.teamsCompared-lastTransition.bandCrossings)/
       lastTransition.teamsCompared,1):null,
    completedGameCoverage:{teamsAtLeastTen:teamsWithTen,allTeams:sourceTeams.length,
       share:coverage,sourceWeeks:final},
    dataReadyForHumanReview:final>=4&&coverage>=0.75 &&
       skipped.length===0&&transitions.every(x=>x.skippedCalendarWeeks===0),
    recommendationIssued:false,
    disclaimer:final<2?"Only one accepted weekly observation exists. No rise, decline, stable tier, turnover rate or week-to-week skill claim is supported.":
      "Changes compare real source-captured index snapshots, not game outcome predictions; shifts can reflect opposition and model inputs as well as actual results.",
    limitations:["A calendar week without a verified source snapshot cannot be filled or interpolated.",
      "Same-name historical franchise matches do not establish current roster continuity.",
      "Band labels and cutoff changes are research constructs, not official league movement.",
      "The current week is mutable until the next Monday and prior closed weeks are immutable.",
      "A stable index does not prove the club has played against equally matched opponents."],
    sourceReadOnly:true};
 }
 return Object.freeze({schema:SCHEMA,analyze});
});
