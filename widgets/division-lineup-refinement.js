/* Brave H.C. HockeyOS — optional, bounded evidence-aware lineup refinement.
 * Deterministic research on accepted source IDs. Never changes official league divisions. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveLineupRefinement=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const SCHEMA="brave-hc-division-lineup-refinement/v1";
 const ALLOWED=new Set([4,5,6,7,8]);
 const MODES=new Set(["BALANCE","PRACTICAL","CONTINUITY"]);
 const need=(test,reason)=>{if(!test)throw Error("REFINEMENT_SOURCE_HOLD:"+reason)};
 const round=(v,n=3)=>Number(v.toFixed(n));
 function validateInputs(analysis,proposal,mode){
  need(analysis?.schema==="brave-hc-division-fit-research/v1"&&
    analysis.proposalReady===false&&
    Array.isArray(analysis.poolDivisions)&&analysis.poolDivisions.length===3&&
    Array.isArray(analysis.teams)&&analysis.teams.length===analysis.adultPoolTeamCount&&
    Array.isArray(analysis.gameGraph?.verifiedMatches)&&
    analysis.gameGraph.verifiedMatches.length===analysis.gameGraph.verifiedGamesInPool,
    "ACCEPTED_ADULT_MODEL_MISSING");
  need(MODES.has(mode)&&proposal?.objective===mode&&Array.isArray(proposal.groups)&&
    proposal.groups.length===proposal.divisionCount,"UNAPPROVED_OBJECTIVE");
  const expected=new Set(analysis.teams.map(t=>t.sourceTeamId));
  need(expected.size===analysis.teams.length&&analysis.teams.every(t=>
    Number.isFinite(t.score)&&t.score>=0&&t.score<=100&&
    analysis.poolDivisions.includes(t.divisionNow)),"ADULT_IDS_OR_SCORE_INVALID");
  const seen=new Set(),odd=proposal.groups.filter(g=>g.capacity%2!==0).length;
  for(const g of proposal.groups){
   need(ALLOWED.has(g.capacity)&&g.ids?.length===g.capacity,"ILLEGAL_DIVISION_CAPACITY");
   for(const id of g.ids){
    need(expected.has(id)&&!seen.has(id),"SOURCE_TEAM_MISSING_OR_DUPLICATED");
    seen.add(id);
   }
  }
  need(seen.size===expected.size&&odd===expected.size%2,
    "PARITY_OR_ROSTER_COVERAGE_INVALID");
  const gameKeys=new Set();
  for(const g of analysis.gameGraph.verifiedMatches){
   need(Array.isArray(g.teamIds)&&g.teamIds.length===2&&
     g.teamIds.every(id=>seen.has(id))&&
     Number.isFinite(g.absoluteGoalMargin)&&g.absoluteGoalMargin>=0 &&
     typeof g.sourceGameKey==="string"&&!gameKeys.has(g.sourceGameKey),
     "SOURCE_GAME_DUPLICATE_OR_INVALID");
   gameKeys.add(g.sourceGameKey);
  }
 }
 function movements(groups,teams,actualNames){
  // Maximum one-to-one overlap of hypothetical groups with currently published
  // divisions, assigning unmatched groups the status "new division".
  const official=actualNames.map(n=>new Set(teams.filter(t=>t.divisionNow===n)
    .map(t=>t.sourceTeamId)));
  let best=-1;
  const memo=new Map();
  function walk(i,mask){
   if(i===groups.length)return 0;
   const key=i+"|"+mask;
   if(memo.has(key))return memo.get(key);
   let value=walk(i+1,mask); // newly introduced group
   for(let j=0;j<official.length;j++)if(!(mask&(1<<j))){
    const matches=groups[i].ids.filter(id=>official[j].has(id)).length;
    value=Math.max(value,matches+walk(i+1,mask|(1<<j)));
   }
   memo.set(key,value);
   return value;
  }
  best=walk(0,0);
  return {unchangedMembershipMax:best,
    hypotheticalDifferentGroupCount:teams.length-best,
    newResearchGroupsNeeded:Math.max(0,groups.length-actualNames.length)};
 }
 function evaluate(groups,analysis,mode){
  const source=new Map(analysis.teams.map(t=>[t.sourceTeamId,t]));
  const membership=new Map();let total=0,squares=0;
  for(const [i,g] of groups.entries()){
   need(ALLOWED.has(g.capacity)&&g.ids.length===g.capacity,"GROUP_CAPACITY_CHANGED");
   const scores=g.ids.map(id=>{
    need(source.has(id)&&!membership.has(id),"INVALID_REFINEMENT_TEAM");
    membership.set(id,i);return source.get(id).score;
   });
   const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
   squares+=scores.reduce((n,v)=>n+(v-avg)**2,0);
   total+=scores.length;
  }
  need(total===source.size,"REFINEMENT_SOURCE_ROSTER_LOST");
  const matchups=analysis.gameGraph.verifiedMatches.filter(g=>
    membership.get(g.teamIds[0])===membership.get(g.teamIds[1]));
  const pairs=new Set(matchups.map(g=>g.teamIds.join("|")));
  const possible=groups.reduce((n,g)=>n+g.capacity*(g.capacity-1)/2,0);
  const moved=movements(groups,analysis.teams,analysis.poolDivisions);
  const dispersion=Math.sqrt(squares/total);
  const coverage=pairs.size/possible;
  // SAME assumptions as source Division Architect: editorial penalties, not a
  // trained probability of winning, an official league policy, or a game simulation.
  const extras=Math.max(0,groups.length-3),changed=moved.hypotheticalDifferentGroupCount;
  const objective=mode==="BALANCE"?dispersion:
    mode==="PRACTICAL"?dispersion+2*extras+1.2*(1-coverage)+0.06*changed:
    dispersion+3*extras+0.22*changed+0.8*(1-coverage);
  return {objective:round(objective,6),dispersion:round(dispersion,3),
    directPairCoverage:round(coverage,4),
    sourceVerifiedSameGroupGames:matchups.length,
    verifiedSameGroupPairings:pairs.size,possibleSameGroupPairings:possible,
    observedCloseGames:matchups.filter(g=>g.absoluteGoalMargin<=2).length,
    sourceAdultGames:analysis.gameGraph.verifiedMatches.length,movement:moved};
 }
 function cloneGroups(groups){return groups.map(g=>({
   key:g.key,label:g.label,capacity:g.capacity,ids:[...g.ids]
 }));}
 function refine(analysis,proposal,mode=proposal?.objective){
  validateInputs(analysis,proposal,mode);
  const base=cloneGroups(proposal.groups);
  let current=cloneGroups(base),starting=evaluate(current,analysis,mode),score=starting;
  const teamMap=new Map(analysis.teams.map(t=>[t.sourceTeamId,t]));
  const changes=[];let iterations=0,evaluations=0;
  // Best-improvement swap search, with bounded candidate count and no duplicate
  // moves. The official season-team IDs stay constant and every capacity stays fixed.
  const MAX_SWAPS=6,EPSILON=0.002;
  for(let turn=0;turn<MAX_SWAPS;turn++){
   iterations++;let best=null;
   for(let i=0;i<current.length;i++)for(let j=i+1;j<current.length;j++)
    for(let a=0;a<current[i].ids.length;a++)for(let b=0;b<current[j].ids.length;b++){
     const trial=cloneGroups(current),idA=trial[i].ids[a],idB=trial[j].ids[b];
     trial[i].ids[a]=idB;trial[j].ids[b]=idA;
     const metric=evaluate(trial,analysis,mode);evaluations++;
     const improvement=score.objective-metric.objective;
     const ordered=[Math.min(idA,idB),Math.max(idA,idB)].join("|");
     if(improvement>EPSILON&&(!best||
       improvement>best.gain+1e-8||
       (Math.abs(improvement-best.gain)<1e-8&&ordered<best.ordered))){
      best={metric,trial,gain:improvement,ordered,idA,idB,from:i,to:j};
     }
    }
   if(!best)break;
   current=best.trial;score=best.metric;
   changes.push({left:teamMap.get(best.idA).name,right:teamMap.get(best.idB).name,
     originalGroupLeft:base[best.from].label,originalGroupRight:base[best.to].label,
     indexGain:round(best.gain,4),
     sourceIds:[best.idA,best.idB]});
  }
  const coverage=new Set(current.flatMap(g=>g.ids));
  need(coverage.size===analysis.teams.length &&
    current.every(g=>g.ids.length===g.capacity&&ALLOWED.has(g.capacity))&&
    current.filter(g=>g.capacity%2!==0).length===analysis.teams.length%2&&
    score.objective<=starting.objective+1e-8,
    "IMPROVEMENT_CAPACITY_OR_OBJECTIVE_HOLD");
  const chosen=changes.length>0?"SWAP_REFINED":"NO_ADMISSIBLE_IMPROVEMENT";
  return {schema:SCHEMA,status:"BOUNDED_SOURCE_OBSERVED_RESEARCH_NOT_OFFICIAL",
    objectiveMode:mode,sourceAsOf:analysis.sourceAsOf,sourceWeeks:analysis.weekCount,
    acceptedAdultTeamCount:analysis.teams.length,allowedCapacities:[4,5,6,7,8],
    proposedSizePattern:proposal.shapeId,oddDivisionsRequired:analysis.teams.length%2,
    original:starting,refined:score,improvement:round(starting.objective-score.objective,4),
    state:chosen,groups:current,swaps:changes,turnsEvaluated:iterations,
    candidateSwapsEvaluated:evaluations,searchLimit:MAX_SWAPS,
    officialAssignmentsChanged:false,leagueSubmissionReady:false,
    notes:[
      "This is a deterministic bounded local swap search, NOT an exhaustive global optimization.",
      "Source matches enter only as retrospective pair-coverage; absent matchups are unknown rather than predicted losses.",
      "Teams retain verified source-team IDs and the original divisions stay unchanged outside this research view.",
      "Current adult source may contain only one accepted week; resulting lineups are provisional.",
      "The objective uses documented editorial penalties, not league-approved policy or calibrated win probabilities."
    ]};
 }
 return Object.freeze({schema:SCHEMA,refine,evaluate});
});
