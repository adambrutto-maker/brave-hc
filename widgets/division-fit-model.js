/* HockeyOS league balancing research — deterministic, descriptive, read-only. */
(function(root,factory){
 "use strict";
 const model=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=model;
 else root.BraveDivisionFit=model;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 // This is only the adult Sunday hockey competition, not other leagues.
 const POLICY=typeof module!=="undefined"&&module.exports?require("./adult-league-scope.js"):window.BraveAdultLeagueScope;
 const POOL=POLICY.divisionsList;
 const SCHEMA="brave-hc-division-fit-research/v1";
 const need=(ok,m)=>{if(!ok)throw Error("DIVISION_FIT_HOLD:"+m)};
 const round=(v,n=1)=>Number(v.toFixed(n));
 const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
 function validate(doc,history=null){
  need(doc?.schema==="brave-hc-league-intelligence/public-v1" &&
    doc.status==="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" &&
    doc.currentSourceDataConcordant===true &&
    doc.leagueId===570 &&
    doc.strengthModel?.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
    doc.strengthModel.probabilityOfWinning===false &&
    doc.weeklyLedger?.schema==="brave-hc-svhl-weekly-context/v1" &&
    Array.isArray(doc.weeklyLedger.weeks) &&
    doc.weeklyLedger.weeks.length===doc.weeklyLedger.weeksRecorded &&
    Array.isArray(doc.teams) && Array.isArray(doc.divisions),
    "UNQUALIFIED_PUBLIC_SOURCE");
  const divisions=new Set(doc.divisions.filter(d=>d.competitive).map(d=>d.name));
  need(POOL.every(d=>divisions.has(d)),"TARGET_ADULT_DIVISIONS_NOT_FOUND");
  need(new Set(doc.teams.map(t=>t.sourceTeamId)).size===doc.teams.length &&
    new Set(doc.teams.map(t=>t.leagueName)).size===doc.teams.length,
    "DUPLICATED_CURRENT_TEAM_ID");
  for(const t of doc.teams){
   need(t.record?.gp===t.completedGames?.length &&
       t.record.gp===t.strengthContext?.completedGames &&
       t.record.gp===t.record.w+t.record.l+t.record.t,
       "SOURCE_GAME_PARITY_FAILED");
  }
  if(history){
   need(history.schema==="brave-hc-source-matched-historical-team-seasons/v1" &&
    history.status==="DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED" &&
    history.currentContextNotModified===true &&
    Array.isArray(history.teamSeasons) &&
    history.teamSeasons.length===history.matchedTeamSeasonGroups &&
    history.teamSeasons.every(t=>t.continuousFranchiseNotVerified===true) &&
    history.teamSeasons.reduce((n,g)=>n+g.games.length,0)===history.matchedGameCount,
    "HISTORICAL_LINK_PROOF_INVALID");
  }
  return true;
 }
 function pool(doc){
  const teams=doc.teams.filter(t=>POOL.includes(t.divisionNow));
  const scores=teams.map(t=>t.strengthContext?.contextIndex);
  need(teams.length>=12 && teams.length<=40 && scores.every(v=>Number.isFinite(v)&&v>=0&&v<=100),
    "INSUFFICIENT_ADULT_POOL_CONTEXT");
  return teams;
 }
 function gameGraph(doc,teams){
  const byName=new Map(doc.teams.map(t=>[t.leagueName,t]));
  const ids=new Set(teams.map(t=>t.sourceTeamId));
  const seen=new Map(),sourceSides=new Map(),games=[],pairs=new Map();
  for(const team of teams){
   for(const g of team.completedGames){
    const opponent=byName.get(g.opponent);
    need(opponent && opponent.sourceTeamId!==team.sourceTeamId,"UNKNOWN_VERIFIED_OPPONENT");
    if(!ids.has(opponent.sourceTeamId))continue; // separate competition excluded
    const lo=Math.min(team.sourceTeamId,opponent.sourceTeamId);
    const hi=Math.max(team.sourceTeamId,opponent.sourceTeamId);
    const goals=team.sourceTeamId===lo?[g.gf,g.ga]:[g.ga,g.gf];
    const key=[g.date,lo,hi].join("|");
    // Without official game IDs, a repeated same-team/date/opponent row may
    // be a doubleheader. Never silently merge that second game into the first.
    const sides=sourceSides.get(key)||new Set();
    need(!sides.has(team.sourceTeamId),"AMBIGUOUS_SAME_DAY_PAIR_NO_SOURCE_GAME_ID");
    sides.add(team.sourceTeamId);sourceSides.set(key,sides);
    if(seen.has(key)){
     need(seen.get(key)===goals.join("-"),"RECIPROCAL_OFFICIAL_RESULT_CONFLICT");
     continue;
    }
    seen.set(key,goals.join("-"));
    const same=team.divisionNow===opponent.divisionNow;
    const divisions=[team.divisionNow,opponent.divisionNow].sort();
    const result={sourceGameKey:key,date:g.date,teamIds:[lo,hi],
      // Exact reciprocal final score ordered by ascending season-team ID.
      // A matching margin alone can hide a different final or swapped winner.
      scoreBySourceTeamId:[...goals],
      divisionPair:divisions,sameCurrentDivision:same,
      absoluteGoalMargin:Math.abs(g.gf-g.ga)};
    games.push(result);
    const pairKey=divisions.join(" / ");
    if(!pairs.has(pairKey))pairs.set(pairKey,{divisionPair:divisions,
       games:0,goalMarginSum:0,crossDivision:!same});
    const p=pairs.get(pairKey);p.games++;p.goalMarginSum+=result.absoluteGoalMargin;
   }
  }
  need([...sourceSides.values()].every(s=>s.size===2),
    "RECIPROCAL_SOURCE_GAME_SIDE_MISSING");
  const result=[...pairs.values()].map(p=>({
    ...p,meanAbsoluteGoalMargin:round(p.goalMarginSum/p.games,2)
  })).sort((a,b)=>b.games-a.games||a.divisionPair.join("|").localeCompare(b.divisionPair.join("|")));
  const cross=games.filter(g=>!g.sameCurrentDivision).length;
  return {verifiedGamesInPool:games.length,crossCurrentDivisionGames:cross,
    reciprocalPairsVerified:true,
    identityPolicy:"DATE_AND_UNORDERED_TEAM_PAIR_NO_OFFICIAL_GAME_ID",
    identityLimitation:"Same-day rematches require distinct official game IDs; ambiguous rows are held rather than merged.",
    withinCurrentDivisionGames:games.length-cross,links:result,verifiedMatches:games,
    caveat:"Divisions mean each team's CURRENT assignment; they may have differed on the game date. Cross-division links are schedule evidence, not team skill predictions."};
 }
 function statsFor(groups,teamById){
  const results=groups.map(g=>{
   const scored=g.ids.map(id=>teamById.get(id)?.strengthContext?.contextIndex);
   need(scored.every(Number.isFinite) && scored.length>0,"GROUP_MEMBERSHIP_UNRATED");
   const mean=avg(scored);
   return {key:g.key,label:g.label,capacity:g.ids.length,
    ids:[...g.ids],meanIndex:round(mean),
    minIndex:round(Math.min(...scored)),
    maxIndex:round(Math.max(...scored)),
    range:round(Math.max(...scored)-Math.min(...scored)),
    meanAbsoluteDifference:round(avg(scored.map(x=>Math.abs(x-mean))),2),
    squaredResidualSum:round(scored.reduce((n,x)=>n+(x-mean)**2,0),3)};
  });
  const total=results.reduce((n,g)=>n+g.capacity,0);
  return {groups:results,dispersion:round(Math.sqrt(results.reduce((n,g)=>n+g.squaredResidualSum,0)/total),2),
    meanAbsoluteDeviation:round(results.reduce((n,g)=>n+g.meanAbsoluteDifference*g.capacity,0)/total,2)};
 }
 function candidateSets(doc,teams){
  const byId=new Map(teams.map(t=>[t.sourceTeamId,t]));
  const divisions=POOL.map(d=>({
    key:d,label:d,ids:teams.filter(t=>t.divisionNow===d).map(t=>t.sourceTeamId)
  }));
  const current=statsFor(divisions,byId);
  const order=[...divisions].sort((a,b)=>
   b.ids.reduce((n,id)=>n+byId.get(id).strengthContext.contextIndex,0)/b.ids.length-
   a.ids.reduce((n,id)=>n+byId.get(id).strengthContext.contextIndex,0)/a.ids.length ||
   a.label.localeCompare(b.label));
  const sorted=[...teams].sort((a,b)=>
   b.strengthContext.contextIndex-a.strengthContext.contextIndex ||
   a.leagueName.localeCompare(b.leagueName));
  let offset=0;
  const banded=order.map((x,i)=>{
   const ids=sorted.slice(offset,offset+x.ids.length).map(t=>t.sourceTeamId);
   offset+=ids.length;
   return {key:"RESEARCH_BAND_"+(i+1),
           label:"Research band "+(i+1)+" (capacity "+ids.length+")",ids};
  });
  const sortedStats=statsFor(banded,byId);
  // Swap-only sandbox: capacities preserved; limit to two pairs so the
  // alternative remains a modest perturbation, not a wholesale resort.
  let partial=divisions.map(g=>({...g,ids:[...g.ids]}));
  let currentCost=statsFor(partial,byId).dispersion;
  const swapped=[];
  const used=new Set();
  for(let iter=0;iter<2;iter++){
   let best=null;
   for(let i=0;i<partial.length;i++)for(let j=i+1;j<partial.length;j++){
    for(let a=0;a<partial[i].ids.length;a++)for(let b=0;b<partial[j].ids.length;b++){
     const id1=partial[i].ids[a],id2=partial[j].ids[b];
     if(used.has(id1)||used.has(id2))continue;
     const test=partial.map(g=>({...g,ids:[...g.ids]}));
     test[i].ids[a]=id2;test[j].ids[b]=id1;
     const trial=statsFor(test,byId).dispersion;
     const saving=round(currentCost-trial,4);
     if(saving>0.01 &&
         (!best || saving>best.saving+0.000001 ||
           (Math.abs(saving-best.saving)<0.000001 &&
             (id1+"|"+id2)<best.order)))
        best={i,j,a,b,id1,id2,trial,saving,order:id1+"|"+id2};
    }
   }
   if(!best)break;
   partial[best.i].ids[best.a]=best.id2;
   partial[best.j].ids[best.b]=best.id1;
   swapped.push({teams:[best.id1,best.id2],comparisonGain:best.saving});
   used.add(best.id1);used.add(best.id2);
   currentCost=best.trial;
  }
  const swapStats=statsFor(partial,byId);
  const moved=(groups)=>{
   const original=new Map(divisions.flatMap(g=>g.ids.map(id=>[id,g.key])));
   const asgn=new Map(groups.flatMap(g=>g.ids.map(id=>[id,g.key])));
   return [...original.keys()].filter(id=>original.get(id)!==asgn.get(id)).length;
  };
  // Banded groups intentionally have different labels: membership retention
  // should compare ranks by band against current team origin, not label keys.
  const retained=banded.reduce((n,g,i)=>{
   const sourceDivision=order[i].key;
   return n+g.ids.filter(id=>byId.get(id).divisionNow===sourceDivision).length;
  },0);
  return [
   {code:"CURRENT",title:"Current divisions",kind:"ACTUAL_SOURCE_ASSIGNMENTS",
     ...current,movedTeams:0,swaps:0,groups:current.groups},
   {code:"LIMITED",title:"Two-pair swap test",kind:"WHAT_IF_UNAPPROVED",
     ...swapStats,movedTeams:moved(partial),swaps:swapped.length,
     changedPairs:swapped,
     limitation:"At most two non-repeating pair swaps. This mathematical experiment ignores scheduling and roster permissions."},
   {code:"BANDED",title:"Sorted score bands",kind:"WHAT_IF_UNAPPROVED",
     ...sortedStats,movedTeams:teams.length-retained,swaps:null,
     limitation:"Capacity-preserving grouping by descriptive score alone; not viable without scheduling, opponent, roster and league review."}
  ];
 }

 function scenarioEvidence(groups,verifiedGames){
  const assigned=new Map();
  for(const group of groups){
   for(const id of group.ids){
    need(!assigned.has(id),"SCENARIO_TEAM_ASSIGNED_TWICE");
    assigned.set(id,group.key);
   }
  }
  const within=[],outside=[],uniquePairs=new Set();
  for(const game of verifiedGames){
   const a=assigned.get(game.teamIds[0]),b=assigned.get(game.teamIds[1]);
   need(a!==undefined&&b!==undefined,"EVIDENCE_TEAM_MISSING_FROM_SCENARIO");
   if(a===b){
    within.push(game);
    uniquePairs.add(game.teamIds.join("|"));
   }else outside.push(game);
  }
  const possiblePairs=groups.reduce((n,g)=>n+g.ids.length*(g.ids.length-1)/2,0);
  const close=within.filter(g=>g.absoluteGoalMargin<=2).length;
  const decidedByOne=within.filter(g=>g.absoluteGoalMargin<=1).length;
  const big=within.filter(g=>g.absoluteGoalMargin>=5).length;
  return {
   observedSameGroupGames:within.length,observedAcrossGroupGames:outside.length,
   observedUniqueSameGroupPairings:uniquePairs.size,
   allPossibleSameGroupPairings:possiblePairs,
   observedPairingCoverage:round(possiblePairs?uniquePairs.size/possiblePairs:0,3),
   twoGoalOrCloserGames:close,oneGoalOrCloserGames:decidedByOne,
   fivePlusGoalMarginGames:big,
   percentTwoGoalOrCloser:within.length?round(100*close/within.length,1):null,
   meanObservedGoalMargin:within.length?round(avg(within.map(g=>g.absoluteGoalMargin)),2):null,
   sampleWarning:"Retrospective evidence only: a game played between clubs currently assigned to one hypothetical group is not a prediction of future group performance. Small samples and selection effects remain."
  };
 }
 function historySummary(history,teams){
  if(!history)return {matchedGameComparisons:0,matchedSeasonTeams:0,heldComparisons:null,
    sameCurrentTeamClaims:0};
  const names=new Set(teams.map(t=>t.leagueName.trim().toLowerCase()));
  const exact=history.teamSeasons.filter(s=>names.has(s.officialTeamName.trim().toLowerCase()));
  return {matchedGameComparisons:history.matchedGameCount,
   matchedSeasonTeams:history.matchedTeamSeasonGroups,
   heldComparisons:history.heldGameComparisons,
   observedExactNameOverlaps:exact.length,
   sameCurrentTeamClaims:0,
   note:"Old game results are proof of historical competition by season, not proof of current team continuity or a score adjustment."};
 }
 function analyze(doc,history=null){
  validate(doc,history);
  const teams=pool(doc),graph=gameGraph(doc,teams);
  const weeks=doc.weeklyLedger.weeks.length;
  const playedTen=teams.filter(t=>t.record.gp>=10).length;
  const qualification=weeks>=4 && playedTen/teams.length>=0.75 &&
    graph.crossCurrentDivisionGames>=4;
  const snapshots=doc.weeklyLedger.weeks.map(w=>({
    weekStartToronto:w.weekStartToronto,verifiedTeamEntries:w.teams.length,
    asOf:w.observedAtUTC
  }));
  return {schema:SCHEMA,sourceAsOf:doc.asOf,
   originalLeagueId:doc.leagueId,
   status:qualification?"SOURCE_COVERAGE_MINIMUM_MET_HUMAN_REVIEW_REQUIRED":
       "EXPLORATORY_ONLY_INSUFFICIENT_SEASON_EVIDENCE",
   proposalReady:false, // hard gate: cannot automatically issue a league proposal
   sourceGameCount:doc.verifiedReciprocalCompletedGames,
   poolDivisions:POOL,adultPoolTeamCount:teams.length,
   separateLeagueRecordsExcluded:doc.teams.length-teams.length,
   weekCount:weeks,playedTen,readiness:{
     minWeeks:4,minGames:10,minCoverage:.75,minCrossGames:4,
     coverage:round(playedTen/teams.length,3),
     minimumsMet:qualification,
     humanFactors:["Verified roster continuity","Fixture scheduling and ice-time capacity",
       "Promotion/relegation policy","Competitive fairness within actual matchups",
       "League consultation and consent"],
     reason:qualification?
       "Numeric source coverage achieved. This remains a review exercise—not a league-approved reassignment.":
       "Too early for reassignment: collect 4 weeks, at least 10 games for 75% of the adult pool, and 4 verified cross-division games before reviewing scenarios."
   },
   gameGraph:graph,scenarios:candidateSets(doc,teams).map(s=>({
     ...s,evidence:scenarioEvidence(s.groups,graph.verifiedMatches)
   })),
   teams:teams.map(t=>({sourceTeamId:t.sourceTeamId,name:t.displayName,
      leagueName:t.leagueName,divisionNow:t.divisionNow,
      gp:t.record.gp,score:t.strengthContext.contextIndex,
      confidence:t.strengthContext.confidence,form:t.strengthContext.currentForm,
      scheduleDifficulty:t.strengthContext.scheduleDifficulty})),
   weeklySource:snapshots,
   historical:historySummary(history,teams),
   notes:["Only actual verified current-season games affect the underlying rating.",
     "Scenario dispersion measures within-group spread of an editorial descriptive index, not true opponent equality.",
     "Observed same-group head-to-head coverage and actual goal margins describe prior matches only; no score simulation or counterfactual outcomes.",
     "Research scenarios are sandbox examples; no assignment is made and current groups remain authoritative.",
     "Only Fazzari, Cristillo and Remax teams are within adult Sunday research scope.",
     "Cross-division source connections reflect CURRENT division membership, which may differ from the division when the game was played."],
   sourceReferences:{league:doc.source,historical:history?.teamSeasons[0]?.officialTeamPage||null}};
 }
 return Object.freeze({schema:SCHEMA,poolDivisions:POOL,validate,gameGraph,
   candidateSets,analyze});
});
