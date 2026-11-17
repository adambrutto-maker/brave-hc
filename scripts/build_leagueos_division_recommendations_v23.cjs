/* LeagueOS V23 — original deterministic four-night placement-scenario engine.
   Source-qualified public results, exact player-ID continuity and explicit official-tier holds.
   Never edits league divisions, team rosters, schedules or standings. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets"),sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const sourceFiles={
 model:"leagueos_division_alignment_public_v2.json",
 roster:"leagueos-cross-night-player-bridge-v23.json",
 historical:"svhl-roster-intelligence.json",
 tiers:"leagueos-division-strength-levels-v23.json",
 registry:"leagueos-source-qualified-current-fixtures-v4.json",
 settled:"leagueos-settled-delta-v23.json"
};
function load(file,optional=false){
 const f=path.join(root,file);
 if(!fs.existsSync(f)){if(optional)return null;throw Error("Missing V23 source: "+file)}
 const raw=fs.readFileSync(f);
 return{sha256:sha(raw),document:JSON.parse(raw.toString("utf8")),file};
}
const src={};for(const [k,v] of Object.entries(sourceFiles))src[k]=load(v,k==="settled");
const m=src.model.document,r=src.roster.document,t=src.tiers.document,l=src.registry.document,historical=src.historical.document;
const need=(v,msg)=>{if(!v)throw Error("V23 SOURCE HOLD: "+msg)};
need(m.schema==="bruttech-division-alignment-research/v2"&&
 m.status==="RESEARCH_ONLY_SOURCE_QUALIFIED_NOT_SVHL_APPROVED"&&
 m.teams.length===96&&m.validation?.roster_prior_selected===false,"Source rating/model contract");
need(r.schema==="bruttech-leagueos-cross-night-public-player-bridge/v23"&&
 r.status==="PUBLIC_CURRENT_ROSTER_FACTS_NOT_LEAGUE_ELIGIBILITY"&&
 r.counts.sourceTeams===96&&r.teams.length===96&&
 r.counts.qualifiedTeams===r.teams.filter(x=>x.status==="PUBLIC_FACTS_QUALIFIED").length&&
 r.counts.heldTeams===r.teams.filter(x=>x.status==="SOURCE_HOLD").length&&
 r.counts.qualifiedTeams>=88&&r.counts.heldTeams<=8&&
 r.counts.crossNightPlayerIDsWithPublishedGP===r.bridges.length&&
 r.sourceModelSha256===src.model.sha256,"Cross-night player qualification");
need(historical.schema==="brave-hc-public-svhl-roster-seasons/v1"&&
 historical.status==="SOURCE_LINKED_OFFICIAL_ROSTER_SEASON_OBSERVATIONS",
 "Exact historical player source unavailable");
need(historical.sourceLeagueId===570&&Array.isArray(historical.teams)&&historical.teams.length===22,
 "Historical source scope is not the 22-team Sunday pool");
need(t.schema==="bruttech-leagueos-division-strength-governance/v23"&&
 t.status==="LEAGUE_ASSIGNMENT_REQUIRED"&&t.officialChanges===false&&
 t.assignments.length===15&&t.assignments.every(a=>a.level===null&&a.approval==="UNASSIGNED"),
 "League-assigned tier contract / authorization");
need(l.schema==="bruttech-svhl-current-fixture-window/v4"&&l.counts?.total===411&&
 l.counts.completed===335&&l.counts.future===66&&l.counts.held===10,"Settled registry baseline");
const tiers=new Map(t.assignments.map(a=>[a.key,a]));
need(tiers.size===t.assignments.length,"Duplicate official tier contract");
const allTeams=new Map(m.teams.map(x=>[x.league_id+":"+x.team_id,x]));
need(allTeams.size===96,"Duplicate team source identifier");
const rosterByTeam=new Map(r.teams.map(x=>[x.league_id+":"+x.team_id,x]));
need(rosterByTeam.size===96,"Roster entry omitted");
for(const team of m.teams){
 const key=[team.league_id,team.program,team.division].join("|");
 need(tiers.has(key),"Division lacks governed strength-level entry: "+key);
 const rec=rosterByTeam.get(team.league_id+":"+team.team_id);
 need(rec&&rec.night===team.night&&rec.division===team.division&&rec.program===team.program,
  "Team roster identity mismatched");
 need(Number.isInteger(team.source_games)&&team.source_games>=0&&
  Number.isFinite(team.adjusted_rating)&&
  ["Open","Masters","Separate program"].includes(team.program)&&
  (!team.standings_source_valid||team.standing_gp===team.w+team.l+team.t),
  "Unqualified team result/performance index");
}
const settled=src.settled?.document||null,delta=new Map();
if(settled){
 need(settled.schema==="bruttech-leagueos-settled-results/v23"&&
  settled.status==="RECIPROCAL_SETTLED_GAMES_ONLY"&&
  settled.baseFixtureSha256===src.registry.sha256&&
  Array.isArray(settled.games)&&settled.officialRecordsEdited===false,
  "Daily settled game evidence not qualified");
 for(const g of settled.games){
  need(Number.isInteger(g.leagueId)&&Number.isInteger(g.gameId)&&
   Number.isInteger(g.homeTeamId)&&Number.isInteger(g.awayTeamId)&&
   Number.isInteger(g.homeGoals)&&Number.isInteger(g.awayGoals)&&
   g.homeGoals>=0&&g.awayGoals>=0&&g.homeGoals+g.awayGoals>0&&
   g.recipientCoverage==="RECIPROCAL_TEAM_SCHEDULES_VERIFIED"&&
   /^[0-9a-f]{64}$/.test(g.homeSourceSha256)&&/^[0-9a-f]{64}$/.test(g.awaySourceSha256),
   "Unqualified daily settled game");
  const key=g.leagueId+":"+g.gameId;
  need(!delta.has(key),"Duplicate daily result");delta.set(key,g);
 }
}
const rank=team=>{
 // Source Elo is not comparable across disconnected components or league nights.
 // New individually verified reciprocal scores apply to ratings without altering historical model.
 return team.adjusted_rating;
};
const rankings=new Map(m.teams.map(team=>[team.league_id+":"+team.team_id,rank(team)]));
const applied=new Set();
if(delta.size){
 const all=new Map(l.fixtures.map(x=>[x.league_id+":"+x.game_id,x]));
 for(const g of [...delta.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.gameId-b.gameId)){
  const f=all.get(g.leagueId+":"+g.gameId);
  need(f&&f.status==="FUTURE_RECIPROCAL_FIXTURE"&&f.date===g.date&&
   f.home_team_id===g.homeTeamId&&f.away_team_id===g.awayTeamId&&
   allTeams.has(g.leagueId+":"+g.homeTeamId)&&
   allTeams.has(g.leagueId+":"+g.awayTeamId),"Daily settled game cannot be mapped to accepted source team");
  const keyH=g.leagueId+":"+g.homeTeamId,keyA=g.leagueId+":"+g.awayTeamId;
  const h=allTeams.get(keyH),a=allTeams.get(keyA);
  need(h.program===a.program&&h.component_id===a.component_id&&h.night===a.night,
   "Result cannot bridge unrelated competition components");
  const preH=rankings.get(keyH),preA=rankings.get(keyA);
  const homeExpect=1/(1+Math.pow(10,(preA-preH)/400));
  const homeActual=g.homeGoals>g.awayGoals?1:g.homeGoals<g.awayGoals?0:.5;
  const marginFactor=1+Math.min(Math.abs(g.homeGoals-g.awayGoals),5)*.06;
  const shift=Math.max(-22,Math.min(22,18*marginFactor*(homeActual-homeExpect)));
  rankings.set(keyH,preH+shift);rankings.set(keyA,preA-shift);
  applied.add(g.leagueId+":"+g.gameId);
 }
}
const byTeamPlayer=new Map();
const crossNightIds=new Set(r.bridges.map(x=>x.playerId));
for(const tr of r.teams){
 const active=tr.players.filter(p=>p.gp>0);
 const totalPts=active.reduce((s,p)=>s+p.pts,0),scorers=active.slice().sort((a,b)=>b.pts-a.pts);
 byTeamPlayer.set(tr.league_id+":"+tr.team_id,{
  totalRosterRows:tr.players.length,qualified:tr.status==="PUBLIC_FACTS_QUALIFIED",
  heldPlayerRows:tr.heldPlayerRows||0,
  publishedGPPlayers:active.length,
  crossNightIDs:active.filter(p=>crossNightIds.has(p.id)).length,
  crossNightPoints:active.filter(p=>crossNightIds.has(p.id)).reduce((s,p)=>s+p.pts,0),
  topTwoPointShare:totalPts?Math.round(scorers.slice(0,2).reduce((a,p)=>a+p.pts,0)/totalPts*1000)/1000:null
 });
}
function expectedMismatch(a,b){
 const p=1/(1+Math.pow(10,(b-a)/400));
 return 100*Math.abs(p-.5); // model-based *pairwise matchup imbalance*, not empirical win-rate prediction.
}
function quality(groups,teamRatings){
 let total=0,weighted=0,variance=0;
 const rows=groups.map(g=>{
  const ratings=g.map(x=>teamRatings.get(x.team_id));
  need(ratings.every(Number.isFinite),"Group contains unrated team");
  let sum=0,pairs=0;
  for(let i=0;i<ratings.length;i++)for(let j=i+1;j<ratings.length;j++){
   sum+=expectedMismatch(ratings[i],ratings[j]);pairs++;
  }
  const gap=pairs?sum/pairs:50;
  weighted+=sum;total+=pairs;
  const mean=ratings.reduce((x,y)=>x+y,0)/ratings.length;
  variance+=ratings.reduce((s,z)=>s+(z-mean)**2,0);
  return{gap:Math.round(gap*100)/100,mean:Math.round(mean*10)/10,
   span:Math.round((Math.max(...ratings)-Math.min(...ratings))*10)/10,
   size:g.length,pairs};
 });
 const spread=total?weighted/total:50;
 return {pairGap:Math.round(spread*100)/100,
  objective:Math.round((spread+
    Math.max(0,groups.length-1)*1.9+
    groups.reduce((n,g)=>n+(g.length<=4?1.7:0)+(g.length%2?0.35:0)+(g.length>=9?1.2:0),0))*100)/100,
  withinGroupRatingDispersion:Math.round((variance/groups.reduce((s,g)=>s+g.length,0))*100)/100,
  groups:rows};
}
function partitions(total,min=4,max=10){
 const results=[];
 function back(rem,current){
  if(rem===0){if(current.length>=1&&current.length<=5)results.push([...current]);return}
  if(current.length>=5)return;
  for(let n=min;n<=max&&n<=rem;n++){
   if(current.length&&n<current[current.length-1])continue; // unique multisets
   current.push(n);back(rem-n,current);current.pop();
  }
 }
 back(total,[]);
 return results;
}
function partitionsOrdered(sorted,capacities){
 const distinct=[],seen=new Set();
 // For <=5 groups we only need reversed/fwd partition orders to test orientation;
 // within component, strict strength-contiguous ordering guards evidence comparable placement.
 function rec(rem,seq){
  if(!rem.length){
   const key=seq.join(",");if(!seen.has(key)){seen.add(key);distinct.push([...seq])}
   return;
  }
  const choices=new Set(rem);
  for(const n of choices)rec(rem.filter((_,i)=>i!==rem.indexOf(n)),[...seq,n]);
 }
 rec(capacities,[]);
 return distinct.map(s=>{
  let ix=0;return s.map(n=>{const group=sorted.slice(ix,ix+n);ix+=n;return group})
 });
}
function compareCurrentVsOptimized(pool){
 const groupsMap=new Map();
 for(const team of pool){
  if(!groupsMap.has(team.division))groupsMap.set(team.division,[]);
  groupsMap.get(team.division).push(team);
 }
 const current=[...groupsMap.entries()].sort(([a],[b])=>a.localeCompare(b));
 const ratings=new Map(pool.map(x=>[x.team_id,rankings.get(x.league_id+":"+x.team_id)]));
 const nowQuality=quality(current.map(x=>x[1]),ratings);
 const crossComponentDivision=pool.some(x=>m.teams.some(y=>y.league_id===x.league_id&&y.program===x.program&&y.division===x.division&&y.component_id!==x.component_id));
 const invalid=pool.filter(x=>crossComponentDivision||!x.standings_source_valid||
   x.source_games<5||rosterByTeam.get(x.league_id+":"+x.team_id).status!=="PUBLIC_FACTS_QUALIFIED");
 const total=pool.length;
 if(invalid.length||total<4||new Set(pool.map(x=>x.program)).size!==1){
  return {status:"SOURCE_QUALITY_HOLD_KEEP_CURRENT",current,proposed:current.map(x=>x[1]),
   nowQuality,afterQuality:nowQuality,improvement:0,invalid:invalid.map(x=>({id:x.team_id,name:x.team_name,
    reason:crossComponentDivision?"DIVISION_SPANS_DISCONNECTED_SOURCE_COMPONENTS":!x.standings_source_valid?"STANDINGS_NOT_VERIFIED":
     x.source_games<5?"INSUFFICIENT_COMPLETED_GAMES":"ROSTER_SOURCE_HELD"}))};
 }
 const sorted=pool.slice().sort((a,b)=>ratings.get(b.team_id)-ratings.get(a.team_id)||a.team_id-b.team_id);
 let best={score:Infinity,groups:null,quality:null,pattern:null};
 const patterns=partitions(total).filter(parts=>Math.abs(parts.length-current.length)<=1);
 for(const sizes of patterns){
  for(const proposed of partitionsOrdered(sorted,sizes)){
   const q=quality(proposed,ratings);
   const movePenalty=0.12*Math.abs(proposed.length-current.length);
   const score=q.objective+movePenalty;
   if(score<best.score-1e-8){
    best={score,groups:proposed,quality:q,pattern:sizes};
   }
  }
 }
 need(best.groups,"No feasible competitive partition");
 const improvement=Math.round((nowQuality.objective-best.quality.objective)*100)/100;
 const recommended=improvement>=0.65;
 return{status:recommended?"PROVISIONAL_COMPETITIVE_REALIGNMENT":"CURRENT_GROUPS_RETAINED_NO_MATERIAL_GAIN",
  current,proposed:recommended?best.groups:current.map(x=>x[1]),
  nowQuality,afterQuality:recommended?best.quality:nowQuality,
  improvement:recommended?improvement:0,
  candidateImprovement:improvement,
  alternativeSizes:best.pattern,invalid:[],
  modelCaveat:"Pairwise proxy uses current source rating only; prior player and cross-night evidence are sensitivity and confidence, not proven additive strength."};
}
const nights=["Sunday","Tuesday","Wednesday","Thursday"];
const poolRows=[],nightRows=[];
const historicalByTeam=new Map(historical.teams.map(x=>[x.sourceTeamId,x]));
need(historicalByTeam.size===22,"Duplicated historical source team identities");
function exactPriorDivisionExposure(team){
 if(team.night!=="Sunday")return {source:"FOUR_NIGHT_PRIOR_ROSTER_SUMMARY_ONLY",
  exactHistoryPlayerIds:0,historicalPlayerSeasons:0,divisions:[]};
 const historicalTeam=historicalByTeam.get(team.team_id);
 if(!historicalTeam)return{source:"NO_EXACT_ARCHIVED_SUNDAY_TEAM",
  exactHistoryPlayerIds:0,historicalPlayerSeasons:0,divisions:[]};
 const current=rosterByTeam.get(team.league_id+":"+team.team_id);
 const currentIDs=new Set(current.players.filter(x=>x.gp>0).map(x=>String(x.id)));
 const groups=new Map(),hasHistory=new Set();
 for(const player of historicalTeam.players||[]){
  if(!currentIDs.has(String(player.playerId)))continue;
  for(const prior of player.previousOfficialObservations||[]){
   if(prior.statStatus!=="PUBLISHED_ARITHMETICALLY_CONSISTENT"||
      !Number.isInteger(prior.gp)||prior.gp<=0||
      !Number.isInteger(prior.pts)||prior.pts<0||
      typeof prior.division!=="string"||!prior.division.trim()||
      typeof prior.season!=="string"||!prior.season.trim())continue;
   const key=prior.season+"|"+prior.division;
   if(!groups.has(key))groups.set(key,{season:prior.season,division:prior.division,
     players:new Set(),observedGP:0,observedPoints:0});
   const group=groups.get(key);
   group.players.add(String(player.playerId));group.observedGP+=prior.gp;
   group.observedPoints+=prior.pts;
   hasHistory.add(String(player.playerId));
  }
 }
 const divisions=[...groups.values()].map(x=>({
  season:x.season,division:x.division,exactCurrentPlayerIds:x.players.size,
  observedGP:x.observedGP,observedPoints:x.observedPoints,
  approvedHistoricalDivisionTier:null}))
  .sort((a,b)=>b.exactCurrentPlayerIds-a.exactCurrentPlayerIds||b.observedGP-a.observedGP)
  .slice(0,10);
 return{source:"EXACT_CURRENT_SVHL_PLAYER_ID_ARCHIVED_SUNDAY_DIVISION_CONTEXT",
  exactHistoryPlayerIds:hasHistory.size,
  historicalPlayerSeasons:[...groups.values()].reduce((n,x)=>n+x.players.size,0),
  divisions,sourceRosterCapturedAt:historical.asOf,
  officialTierKnown:false};
}
const allTeamsForExport=new Map();
for(const team of m.teams){
 const pr=byTeamPlayer.get(team.league_id+":"+team.team_id);
 const key=team.league_id+":"+team.team_id;
 allTeamsForExport.set(key,{
  teamId:team.team_id,leagueId:team.league_id,name:team.team_name,night:team.night,
  program:team.program,sourceDivision:team.division,component:team.component_id,
  resultAdjustedRating:Math.round(rankings.get(key)*10)/10,
  playedGames:team.source_games,uniqueOpponents:team.unique_opponents,
  sourceStandingsValid:team.standings_source_valid,
  priorRosterSamples:team.roster_prior_samples,priorRosterHistoryFraction:team.prior_roster_history_pct,
  rosterPriorRelativeScoring:team.prior_roster_relative_scoring,
  crossNightRosterIDs:pr.crossNightIDs,qualifiedPlayerGP:pr.publishedGPPlayers,
  scoringConcentrationTopTwo:pr.topTwoPointShare,rosterQualified:pr.qualified,
  archivedDivisionEvidence:exactPriorDivisionExposure(team)
 });
}
for(const night of nights){
 const teamSet=m.teams.filter(x=>x.night===night);
 const poolMap=new Map();
 for(const x of teamSet){
  const key=x.program+"|"+x.component_id;
  if(!poolMap.has(key))poolMap.set(key,[]);
  poolMap.get(key).push(x);
 }
 const nightPools=[];
 for(const [key,pool] of [...poolMap.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
  const [program,component]=key.split("|"),v=compareCurrentVsOptimized(pool);
  const outGroups=v.proposed.map((rows,i)=>{
   const members=rows.map(x=>allTeamsForExport.get(x.league_id+":"+x.team_id));
   const groupsFrom=[...new Set(members.map(x=>x.sourceDivision))];
   return {key:night+"|"+key+"|"+(i+1),
    provisionalBand:i+1,provisionalLabel:"Competitive Band "+String.fromCharCode(65+i),
    sourceComponents:[Number(component)],sourceCurrentDivisions:groupsFrom,
    sourceTeamCount:members.length,
    averageRelativeRating:Math.round(members.reduce((n,x)=>n+x.resultAdjustedRating,0)/members.length*10)/10,
    historicalRosterSampleCount:members.reduce((n,x)=>n+(x.priorRosterSamples||0),0),
    crossNightPlayerBridgeIDs:members.reduce((n,x)=>n+x.crossNightRosterIDs,0),
    officialAssignedTier:null,rankingOnlyWithinPool:true,
    teams:members.map(x=>x.teamId),teamNames:members.map(x=>x.name),
    sourceTierState:"LEAGUE_ASSIGNMENT_REQUIRED"};
  });
  const current=v.current.map(([name,rows])=>({
   name,sourceTeamCount:rows.length,
   currentTier:tierFor(rows[0]),teamIds:rows.map(x=>x.team_id),
   teamNames:rows.map(x=>x.team_name),
   ratingMean:Math.round(rows.reduce((s,x)=>s+rankings.get(x.league_id+":"+x.team_id),0)/rows.length*10)/10}));
  function tierFor(t){
   const key=[t.league_id,t.program,t.division].join("|");
   return tiers.get(key)?.level??null;
  }
  const scenario={key:night+"|"+key,night,program,component:Number(component),
    sourceTeamCount:pool.length,sourceVerifiedGames:pool.reduce((n,x)=>n+x.source_games,0),
    status:v.status,reviewRequired:true,
    current,proposed:outGroups,
    currentMeanPairwiseMismatchPP:v.nowQuality.pairGap,
    proposedMeanPairwiseMismatchPP:v.afterQuality.pairGap,
    currentObjective:v.nowQuality.objective,proposedObjective:v.afterQuality.objective,
    relativeObjectiveGain:v.improvement,optimisticCandidateGain:v.candidateImprovement??null,
    currentDivisionSizes:current.map(x=>x.sourceTeamCount),
    recommendedDivisionSizes:outGroups.map(x=>x.sourceTeamCount),
    verifiedCurrentPlayerObservations:pool.reduce((n,x)=>n+byTeamPlayer.get(x.league_id+":"+x.team_id).publishedGPPlayers,0),
    qualifyingRosterHistorySamples:pool.reduce((n,x)=>n+(x.roster_prior_samples||0),0),
    sourceHolds:v.invalid,
    pairingPolicy:"Only this same-night, same-program, exact source-game component; no cross-night team relocations.",
    competitiveNote:"Model-derived provisional proposal, NOT a league-approved placement or finalized fixture/ice plan."};
  nightPools.push(scenario);poolRows.push(scenario);
 }
 const n=m.night_coverage[night];
 need(n&&teamSet.length===n.teams,"Night source-covered count mismatch");
 nightRows.push({night,leagueId:n.league_id,sourceTeamCount:teamSet.length,
  reportedStandingsTeamCount:null,
  currentDivisions:nightPools.flatMap(p=>p.current.map(c=>({name:c.name,count:c.sourceTeamCount,program:p.program}))),
  proposedDivisions:nightPools.flatMap(p=>p.proposed.map(c=>({name:c.provisionalLabel,count:c.sourceTeamCount,program:p.program,pool:p.key}))),
  pools:nightPools,
  sourceBridgePlayerIDs:[...new Set(r.bridges.filter(x=>x.observations.some(o=>o.night===night)).map(x=>x.playerId))].length,
  priorSampleCount:teamSet.reduce((n,x)=>n+(x.roster_prior_samples||0),0)});
}
const currentTeamKeys=new Set(m.teams.map(x=>x.league_id+":"+x.team_id));
const proposalTeamKeys=poolRows.flatMap(p=>p.proposed.flatMap(g=>g.teams.map(id=>p.key.split("|")[0]+"|"+id)));
need(proposalTeamKeys.length===96,"Not every current source team in proposal");
const allRatings=[...allTeamsForExport.values()];
const bridgePairs=new Map();
for(const p of r.bridges){
 const obs=p.observations.filter(o=>o.program==="Open"&&o.gp>0&&o.g+o.a===o.pts);
 for(let i=0;i<obs.length;i++)for(let j=i+1;j<obs.length;j++){
  const a=obs[i],b=obs[j];if(a.night===b.night)continue;
  const key=[a.night+"|"+a.division,b.night+"|"+b.division].sort().join(" ↔ ");
  if(!bridgePairs.has(key))bridgePairs.set(key,{pair:key,ids:new Set(),clubs:new Set(),observations:0,smoothedDiffs:[]});
  const x=bridgePairs.get(key);
  x.ids.add(p.playerId);x.clubs.add(a.league_id+":"+a.team_id);x.clubs.add(b.league_id+":"+b.team_id);
  x.observations++;
  const ra=(a.pts+1)/(a.gp+4),rb=(b.pts+1)/(b.gp+4);
  x.smoothedDiffs.push(Math.max(-Math.log(3),Math.min(Math.log(3),Math.log(ra/rb))));
 }
}
const bridgeRows=[...bridgePairs.values()].map(b=>{
 const eligible=b.ids.size>=3&&b.clubs.size>=4;
 const mean=b.smoothedDiffs.reduce((s,x)=>s+x,0)/b.smoothedDiffs.length;
 return{pair:b.pair,exactSourcePlayerIds:b.ids.size,
  independentSourceClubs:b.clubs.size,
  eligibleEvidenceForTierCalibration:eligible,
  smoothedPointsPerGameLogGap:Math.round(mean*1000)/1000,
  status:eligible?"HISTORICAL_ROLE_AND_TIER_VALIDATION_REQUIRED":"INSUFFICIENT_BRIDGE_COVERAGE",
  appliedToPlacementModel:false};
}).sort((a,b)=>b.exactSourcePlayerIds-a.exactSourcePlayerIds||a.pair.localeCompare(b.pair));
const output={
 schema:"bruttech-leagueos-night-division-recommendations/v23",
 generatedAt:new Date().toISOString(),sourcePublishedAt:m.created_at,
 status:"SOURCE_QUALIFIED_RESEARCH_NOT_LEAGUE_APPROVED",
 dailyRefreshStatus:delta.size?"NEW_RECIPROCAL_SETTLED_SOURCE_EVIDENCE_APPLIED":
   "NO_NEW_RECIPROCAL_SETTLED_GAME_SOURCE",
 verifiedNewSettledGames:delta.size,
 sourceAuthority:"Public SVHL reciprocal games and standings; exact public player ID roster facts",
 leagueAssignmentAuthority:"LEAGUE_OFFICIAL_APPROVAL_REQUIRED",
 officialCompetitionChanged:false,officialStandingsChanged:false,
 decision:"PROVISIONAL_FOR_COMMISSIONER_REVIEW_ONLY",
 tiersState:"ALL_OFFICIAL_DIVISION_STRENGTH_LEVELS_UNASSIGNED",
 policy:{
  strengthBasis:"Results-only margin-adjusted Elo within source-connected league-night component; optional verified recent settled game updates",
  sideSignals:"Current roster scoring concentration, exact cross-night player ID observations, previous winter roster samples, and exact archived Sunday player-ID division experience. Other nights use historical roster aggregates only.",
  crossNightCalibration:"All current exact player links are analyzed but numeric cross-night strength transfer is HELD until league-assigned comparable division tiers and validation exist",
  rosterWeightInPlacement:0,crossNightWeightInPlacement:0,
  reasonForZeroWeights:"Source model prospective validation did not demonstrate meaningful independent improvement over results-only; do not invent calibrated player impact",
  tierAssignments:"League must assign effective-dated, program-scoped strength levels to each division through authorized governance; public draft picker cannot authorize them",
  currentModelComponents:"Same-night, same-program and source-connected component only; no Masters/Open/Separate program mixing",
  uncertainty:"Estimated matchup parity is an internal pairwise model proxy, not a calibrated future win probability",
  outcomeEligibility:"Only final reciprocal source-qualified fixtures affect the numeric rating; 0-0 holds and future games never count as settled",
  groupSizePolicy:"Evaluate 4–10 team groups, allow size and division-count changes of at most one per source-connected pool, penalize odd/small/oversized groups and avoid nonmaterial changes",
  operationsHold:"Facility capacity, number of available ice sheets, season scheduling rules, cross-division playoff format and commissioner approval are not connected"},
 sources:{
  model:{file:src.model.file,sha256:src.model.sha256,capturedAt:m.created_at},
  roster:{file:src.roster.file,sha256:src.roster.sha256,capturedAt:r.createdAt},
  historical:{file:src.historical.file,sha256:src.historical.sha256,capturedAt:historical.asOf},
  tiers:{file:src.tiers.file,sha256:src.tiers.sha256,approvedAssignments:0},
  fixtures:{file:src.registry.file,sha256:src.registry.sha256,capturedAt:l.captured_date},
  ...(src.settled?{settled:{file:src.settled.file,sha256:src.settled.sha256,verifiedGames:delta.size}}:{})},
 overview:{
  leagueNights:nights.length,
  modeledTeams:96,rosterQualifiedTeams:r.counts.qualifiedTeams,heldRosterTeams:r.counts.heldTeams,
  crossNightVerifiedPlayerIDs:r.counts.crossNightPlayerIDsWithPublishedGP,
  playerObservations:r.counts.qualifiedCurrentPlayerObservations,
  crossNightComparisonPairs:bridgeRows.length,
  sundayTeamPlayerHistoryLinks:allRatings.reduce((n,x)=>n+(x.archivedDivisionEvidence?.exactHistoryPlayerIds||0),0),
  sourceModeledDivisionCount:t.assignments.length,
  officialApprovedTiers:0,
  programsProtected:["Masters","Separate program"],
  nightModeledTeamCounts:Object.fromEntries(nightRows.map(n=>[n.night,n.sourceTeamCount])),
  poolRecommendations:poolRows.filter(x=>x.status==="PROVISIONAL_COMPETITIVE_REALIGNMENT").length,
  heldPools:poolRows.filter(x=>x.status==="SOURCE_QUALITY_HOLD_KEEP_CURRENT").length,
  verifiedNewSettledGames:delta.size
 },
 bridgeEvidence:{
  sourceIdentityBasis:"Exact public SVHL playerID across nights only, not player name",
  crossNightCurrentPlayerIds:r.bridges.length,
  crossProgramIds:r.counts.crossProgramBridgeIDs,
  divisionPairEvidence:bridgeRows,
  numericTierCalibrationEnabled:false
 },
 nights:nightRows,
 teams:allRatings
};
const outFile=path.join(root,"leagueos-division-recommendations-v23.json");
fs.writeFileSync(outFile,JSON.stringify(output,null,2)+"\n");
console.log(JSON.stringify({
 status:"V23_PROVISIONAL_NIGHT_DIVISION_RECOMMENDATIONS_DERIVED",
 overview:output.overview,
 proposals:poolRows.map(x=>({night:x.night,program:x.program,component:x.component,
  sourceTeamCount:x.sourceTeamCount,currentSizes:x.currentDivisionSizes,
  proposedSizes:x.recommendedDivisionSizes,gapBefore:x.currentMeanPairwiseMismatchPP,
  gapAfter:x.proposedMeanPairwiseMismatchPP,improvement:x.relativeObjectiveGain,status:x.status})),
 sourceSha:Object.fromEntries(Object.entries(output.sources).map(([k,v])=>[k,v.sha256.slice(0,12)])),
 output:outFile,officialChanges:false
},null,2));
