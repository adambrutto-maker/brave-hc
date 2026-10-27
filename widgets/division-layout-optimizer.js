/* HockeyOS Division Architect: capacity-flexible research, no fixture prediction. */
(function(root,factory){
 "use strict";
 const engine=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=engine;
 else root.BraveDivisionArchitect=engine;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const SCHEMA="brave-hc-adult-division-architect/v1";
 const ALLOWED=Object.freeze([4,6,8]);
 const FOCUSES=Object.freeze(["BALANCE","PRACTICAL","CONTINUITY"]);
 const need=(pass,reason)=>{if(!pass)throw Error("DIVISION_ARCHITECT_HOLD:"+reason)};
 const round=(x,n=2)=>Number(x.toFixed(n));
 function patterns(total,limit=6){
  need(Number.isInteger(total)&&total>=12&&total<=48,"INVALID_ADULT_POOL_SIZE");
  const results=[];
  function search(remaining,from,array){
   if(remaining===0){
    if(array.length>=2&&array.length<=limit)results.push([...array]);return;
   }
   for(let i=from;i<ALLOWED.length;i++){
    const n=ALLOWED[i];
    if(n>remaining||array.length>=limit)continue;
    array.push(n);search(remaining-n,i,array);array.pop();
   }
  }
  search(total,0,[]);
  need(results.length>0,"NO_SUPPORTED_4_6_8_PARTITION");
  return results.sort((a,b)=>a.length-b.length||
   a.join("-").localeCompare(b.join("-")));
 }
 function permutations(capacities){
  const result=[],used=new Set();
  function walk(partial,left){
   if(!left.length){result.push([...partial]);return}
   const seen=new Set();
   for(let i=0;i<left.length;i++){
    if(seen.has(left[i]))continue;seen.add(left[i]);
    partial.push(left[i]);walk(partial,left.filter((_,j)=>j!==i));partial.pop();
   }
  }
  walk([],capacities);return result;
 }
 function calc(groups,ranked,verified){
  const byId=new Map(ranked.map(x=>[x.sourceTeamId,x])),assignment=new Map();
  let squared=0,total=0,mad=0;
  const sections=[];
  for(const [index,g] of groups.entries()){
   const scores=g.ids.map(id=>{
    need(byId.has(id),"UNQUALIFIED_TEAM_ID");return byId.get(id).score;
   });
   need(scores.length===g.capacity&&ALLOWED.includes(g.capacity),"UNSUPPORTED_GROUP_SIZE");
   const mean=scores.reduce((a,b)=>a+b,0)/scores.length;
   const sq=scores.reduce((n,x)=>n+(x-mean)**2,0);
   squared+=sq;mad+=scores.reduce((n,x)=>n+Math.abs(x-mean),0);total+=scores.length;
   for(const id of g.ids){
    need(!assignment.has(id),"DUPLICATE_SCENARIO_TEAM");
    assignment.set(id,index);
   }
   sections.push({...g,average:round(mean,1),
     min:round(Math.min(...scores),1),max:round(Math.max(...scores),1),
     spread:round(Math.max(...scores)-Math.min(...scores),1)});
  }
  need(assignment.size===ranked.length,"SOURCE_TEAM_OMITTED");
  const within=verified.filter(g=>assignment.get(g.teamIds[0])===assignment.get(g.teamIds[1]));
  const samePairs=new Set(within.map(g=>g.teamIds.join("|")));
  const possible=groups.reduce((n,g)=>n+g.capacity*(g.capacity-1)/2,0);
  const close=within.filter(g=>g.absoluteGoalMargin<=2).length;
  return {groups:sections,dispersion:round(Math.sqrt(squared/total),2),
    meanAbsoluteIndexDeviation:round(mad/total,2),
    sameGroupObservedGames:within.length,
    acrossGroupObservedGames:verified.length-within.length,
    sameGroupSourcePairings:samePairs.size,possibleGroupPairings:possible,
    directPairCoverage:round(samePairs.size/possible,4),
    twoGoalOrCloserObserved:close,
    meanObservedGoalMargin:within.length?
      round(within.reduce((n,g)=>n+g.absoluteGoalMargin,0)/within.length,2):null,
    prospectiveOneRoundRobinGames:possible,
    proofNotice:"Observed results are retrospective; changing groups does not simulate unplayed outcomes."};
 }
 // Match hypothetical research groups to prior actual divisions only for an
 // attribution count. These labels never replace published division names.
 function movement(groups,ranked,originalDivisions){
  const actual=originalDivisions.map(d=>({
    name:d,ids:new Set(ranked.filter(t=>t.divisionNow===d).map(x=>x.sourceTeamId))
  }));
  let best=-1;
  function assign(index,used,matchCount){
   if(index===groups.length){best=Math.max(best,matchCount);return}
   // A created group can have no original division label.
   assign(index+1,used,matchCount);
   for(let i=0;i<actual.length;i++){
    if(used.has(i))continue;
    const overlap=groups[index].ids.filter(id=>actual[i].ids.has(id)).length;
    used.add(i);assign(index+1,used,matchCount+overlap);used.delete(i);
   }
  }
  assign(0,new Set(),0);
  return {unchangedMembershipMax:best,
    hypotheticalDifferentGroupCount:ranked.length-best,
    newResearchGroupsNeeded:Math.max(0,groups.length-originalDivisions.length)};
 }
 function score(config,mode){
  // Explicit policy weights, not statistically fitted predictive weights.
  const extra=config.groups.length-3,uncovered=1-config.directPairCoverage;
  const changed=config.movement.hypotheticalDifferentGroupCount;
  if(mode==="BALANCE")return config.dispersion;
  if(mode==="PRACTICAL")
   return config.dispersion+2.0*extra+1.2*uncovered+0.06*changed;
  return config.dispersion+3.0*extra+0.22*changed+0.8*uncovered;
 }
 function run(analysis){
  need(analysis?.schema==="brave-hc-division-fit-research/v1" &&
    analysis.status && analysis.proposalReady===false &&
    Array.isArray(analysis.teams) && analysis.teams.length===analysis.adultPoolTeamCount &&
    Array.isArray(analysis.gameGraph?.verifiedMatches) &&
    analysis.gameGraph.verifiedMatches.length===analysis.gameGraph.verifiedGamesInPool &&
    Array.isArray(analysis.poolDivisions) && analysis.poolDivisions.length===3 &&
    !analysis.teams.some(t=>!analysis.poolDivisions.includes(t.divisionNow)),
    "CURRENT_ADULT_RESEARCH_SOURCE_INVALID");
  const ranked=[...analysis.teams].sort((a,b)=>b.score-a.score||
    a.leagueName.localeCompare(b.leagueName));
  need(new Set(ranked.map(t=>t.sourceTeamId)).size===ranked.length &&
    ranked.every(t=>Number.isFinite(t.score)&&t.score>=0&&t.score<=100),
    "ADULT_SOURCE_TEAM_RATINGS_INVALID");
  const comps=patterns(ranked.length),layouts=[];
  for(const capacities of comps){
   const variants=[];
   for(const arrangement of permutations(capacities)){
    let start=0;
    const groups=arrangement.map((n,i)=>{
      const ids=ranked.slice(start,start+n).map(t=>t.sourceTeamId);
      start+=n;
      return {key:"CANDIDATE_"+(i+1),
        label:"Research Division "+(i+1),capacity:n,ids};
    });
    const observed=calc(groups,ranked,analysis.gameGraph.verifiedMatches);
    const moved=movement(groups,ranked,analysis.poolDivisions);
    variants.push({...observed,movement:moved,capacitySequence:arrangement,
      scores:Object.fromEntries(FOCUSES.map(mode=>[mode,round(score({
         ...observed,movement:moved},mode),3)]))});
   }
   const winners={};
   for(const mode of FOCUSES){
    const sorted=[...variants].sort((a,b)=>a.scores[mode]-b.scores[mode]||
      a.movement.hypotheticalDifferentGroupCount-
      b.movement.hypotheticalDifferentGroupCount||
      a.capacitySequence.join("-").localeCompare(b.capacitySequence.join("-")));
    winners[mode]=sorted[0];
   }
   layouts.push({shapeId:capacities.join("-"),divisionCount:capacities.length,
     capacities:[...capacities],permutationsEvaluated:variants.length,
     ...Object.fromEntries(FOCUSES.map(mode=>[mode,winners[mode]]))});
  }
  const choices={};
  for(const mode of FOCUSES){
   choices[mode]=layouts.map(layout=>({
    shapeId:layout.shapeId,divisionCount:layout.divisionCount,
    ...layout[mode],objective:mode,objectiveScore:layout[mode].scores[mode]
   })).sort((a,b)=>a.objectiveScore-b.objectiveScore||
       a.divisionCount-b.divisionCount||a.shapeId.localeCompare(b.shapeId));
  }
  const output={schema:SCHEMA,status:"PROVISIONAL_RESEARCH_LAYOUTS_NOT_LEAGUE_APPROVED",
    sourceAsOf:analysis.sourceAsOf,adultTeams:ranked.length,
    admittedWeeks:analysis.weekCount,
    sourceAdultGames:analysis.gameGraph.verifiedGamesInPool,
    historicalBravesComparisons:analysis.historical.matchedGameComparisons,
    exploredShapes:layouts.length,layouts,choices,
    leading: Object.fromEntries(FOCUSES.map(mode=>[mode,choices[mode][0].shapeId])),
    modes:[
      {code:"BALANCE",label:"Tightest rating balance",
       description:"Minimizes within-group dispersion only; smaller divisions often win mechanically."},
      {code:"PRACTICAL",label:"Balanced plus league operations",
       description:"Adds stated costs for each added division, reshuffling and missing past head-to-head evidence."},
      {code:"CONTINUITY",label:"Least disruptive design",
       description:"Adds greater costs for reassignments and new division administration."}
    ],
    researchOnly:true,officialDivisionsChanged:false,
    proposedForDiscussion:true,readyForLeagueSubmission:false,
    sourceLimitations:[
      "Only the current source-qualified adult Sunday index is optimized.",
      "The algorithm searches all permutations of legal 4/6/8 size patterns; within each pattern it assigns CONTIGUOUS score-ranked bands. It does not prove a global fair-scheduling optimum.",
      "A lower dispersion with more divisions can be a mathematical artifact of smaller groups.",
      "The exact objective penalties are editorial research preferences, not learned or league-approved coefficients.",
      "Additional divisions require league ice-time, scheduling, round-robin, promotion/relegation and registration checks.",
      "Retrospective game coverage is not a prediction of future head-to-head competitiveness.",
      "Only actual source weeks inform stability; one accepted week cannot establish reliable tiers.",
      "No VAHL or playoff-placeholder clubs are eligible for these adult Sunday groupings."
    ]};
  need(choices.PRACTICAL.length===comps.length&&
    choices.BALANCE.length===comps.length&&
    layouts.every(l=>l.capacities.reduce((a,b)=>a+b,0)===ranked.length),
    "MODEL_LAYOUT_CAPACITY_QA");
  return output;
 }
 return Object.freeze({schema:SCHEMA,allowedSizes:ALLOWED,focuses:FOCUSES,patterns,run});
});
