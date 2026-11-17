/**
 * LeagueOS V25 — original exact-ID empirical Bayes player/roster projections.
 * Numerical public research scenario, not a certified future G/A/P outcome or official tier.
 * Does NOT ingest private workbook player names or scouting.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets");
const read=n=>{const b=fs.readFileSync(path.join(ROOT,n));return{file:n,sha256:crypto.createHash("sha256").update(b).digest("hex"),d:JSON.parse(b)}};
const src={
 model:read("leagueos-division-recommendations-v23.json"),
 prior:read("leagueos-player-history-priors-v25.json"),
 roster:read("leagueos-cross-night-player-bridge-v23.json"),
 registry:read("leagueos-source-qualified-current-fixtures-v4.json"),
 discovery:read("leagueos-fixture-discovery-v24.json")
};
const need=(cond,why)=>{if(!cond)throw Error("V25_PLAYER_PROJECTION_HOLD: "+why)};
const P=src.prior.d,M=src.model.d,R=src.roster.d,G=src.registry.d;
const settledPath=path.join(ROOT,"leagueos-settled-delta-v23.json");
const settled=fs.existsSync(settledPath)?read("leagueos-settled-delta-v23.json"):null;
const staleHistoricalRosterBaseline=P.sourceCurrentRosterSHA256!==src.roster.sha256;
need(M.schema==="bruttech-leagueos-night-division-recommendations/v23"&&M.teams.length===96,
  "Source competition rating index");
need(P.schema==="bruttech-leagueos-historical-public-player-priors/v25"&&
 P.status==="SOURCE_QUALIFIED_HISTORIC_PUBLIC_FACTS"&&P.rawArchivePublished===false&&
 P.noNamesAddressesAgesOrContactData===true&&P.counts.distinctCurrentPlayerIDs>=1200&&
 /^[a-f0-9]{64}$/.test(P.sourceCurrentRosterSHA256),
 "Source historical priors missing valid exact-ID baseline");
need(R.schema==="bruttech-leagueos-cross-night-public-player-bridge/v23"&&
 R.status==="PUBLIC_CURRENT_ROSTER_FACTS_NOT_LEAGUE_ELIGIBILITY"&&
 R.counts.sourceTeams===96&&R.teams.length===96&&
 R.counts.qualifiedCurrentPlayerObservations>=1300&&
 R.counts.qualifiedTeams>=88&&R.counts.heldTeams<=8&&
 R.counts.qualifiedTeams+R.counts.heldTeams===96&&R.playerIdentity.includes("EXACT"),
 "Current public roster completeness threshold failed");
need(G.counts.total===411&&G.counts.completed===335,"Source current game baseline changed");
const clamp=(x,low,high)=>Math.min(high,Math.max(low,x));
const round=(x,n=2)=>Math.round(x*10**n)/10**n;
const PROJECTION_SEASON_WEEKS=24; // explicitly hypothetical, not exact official schedule
const allModel=new Map(M.teams.map(x=>[x.leagueId+":"+x.teamId,x]));
const live=new Map(R.teams.map(x=>[x.league_id+":"+x.team_id,x]));
const history=new Map(P.players.map(x=>[x.playerId,x]));
need(allModel.size===96&&live.size===96&&history.size===P.players.length,
 "Source team or player identity duplicate");
const qualifiedPlayerRows=R.teams.flatMap(t=>t.status==="PUBLIC_FACTS_QUALIFIED"?t.players:[]);
const leagueMean={
 G:qualifiedPlayerRows.reduce((n,p)=>n+p.g,0)/qualifiedPlayerRows.reduce((n,p)=>n+p.gp,0),
 A:qualifiedPlayerRows.reduce((n,p)=>n+p.a,0)/qualifiedPlayerRows.reduce((n,p)=>n+p.gp,0)
};
need(leagueMean.G>0&&leagueMean.A>0,"No source mean from current qualified roster");
const scored=new Map();
function accumulate(id,gf,ga){
 if(!allModel.has(id))return;
 const x=scored.get(id)||{GP:0,GF:0,GA:0};
 x.GP++;x.GF+=gf;x.GA+=ga;scored.set(id,x);
}
for(const g of G.fixtures){
 if(g.status!=="COMPLETED_SOURCE_VERIFIED"||!g.scores)continue;
 if(!Number.isInteger(g.scores.home)||!Number.isInteger(g.scores.away))continue;
 accumulate(g.league_id+":"+g.home_team_id,g.scores.home,g.scores.away);
 accumulate(g.league_id+":"+g.away_team_id,g.scores.away,g.scores.home);
}
if(settled){
 const delta=settled.d;
 need(delta.schema==="bruttech-leagueos-settled-results/v23"&&
   delta.status==="RECIPROCAL_SETTLED_GAMES_ONLY"&&
   delta.officialRecordsEdited===false&&delta.baseFixtureSha256===src.registry.sha256&&
   Array.isArray(delta.games),"Post-game source delta not source-qualified");
 const oldId=new Map(G.fixtures.map(g=>[g.league_id+":"+g.game_id,g]));
 const seen=new Set();
 for(const g of delta.games){
  const key=g.leagueId+":"+g.gameId;
  need(!seen.has(key),"Duplicate settled game ID");
  seen.add(key);
  need(Number.isInteger(g.homeGoals)&&Number.isInteger(g.awayGoals)&&
    g.homeGoals>=0&&g.awayGoals>=0&&g.homeGoals+g.awayGoals>0&&
    g.recipientCoverage==="RECIPROCAL_TEAM_SCHEDULES_VERIFIED"&&
    Number.isInteger(g.homeTeamId)&&Number.isInteger(g.awayTeamId)&&
    /^\d{4}-\d{2}-\d{2}$/.test(g.date),
    "Unqualified settled numeric result");
  const match=oldId.get(key);
  if(match){
   need(match.status==="FUTURE_RECIPROCAL_FIXTURE"&&match.date===g.date&&
    match.home_team_id===g.homeTeamId&&match.away_team_id===g.awayTeamId,
    "Reconciled source result does not match previous future fixture");
  }else{
   need(g.sourceOrigin==="DISCOVERY_V24"&&
    src.discovery.d.candidates.some(c=>c.league_id===g.leagueId&&c.game_id===g.gameId&&
      c.home_team_id===g.homeTeamId&&c.away_team_id===g.awayTeamId&&
      !c.missingFromCurrentSource),
    "New completed result must match exact registered V24 source discovery");
  }
  accumulate(g.leagueId+":"+g.homeTeamId,g.homeGoals,g.awayGoals);
  accumulate(g.leagueId+":"+g.awayTeamId,g.awayGoals,g.homeGoals);
 }
}
const pairsByNight=new Map();
for(const t of M.teams){
 const key=t.night+"|"+t.program+"|"+t.component;
 if(!pairsByNight.has(key))pairsByNight.set(key,[]);
 pairsByNight.get(key).push(t);
}
const playerBridges=new Map();
for(const b of R.bridges){
 if(!b.samePlayerIdDirectPublicEvidence)continue;
 playerBridges.set(b.playerId,b);
}
function priorRate(p,metric){
 const recent=metric==="G"?p.recent3YearGoalRate:p.recent3YearAssistRate;
 const career=metric==="G"?p.careerGoalRate:p.careerAssistRate;
 if(p.recent3YearGP>=8&&Number.isFinite(recent)&&Number.isFinite(career))
  return .70*recent+.30*career;
 if(Number.isFinite(career))return career;
 return null;
}
function forecastPlayer(p,team,teamGames){
 const past=history.get(p.id)||{historyGP:0,historyRows:0};
 need(Number.isInteger(p.gp)&&p.gp>=0&&p.g+p.a===p.pts,
  "Public current skater arithmetic or appearances not qualified");
 const oldGP=past.historyGP;
 const eligiblePrior=oldGP>=3;
 const pseudoGames=eligiblePrior?clamp(Math.sqrt(oldGP)*1.55,4,14):6;
 const gPrior=eligiblePrior?priorRate(past,"G"):null;
 const aPrior=eligiblePrior?priorRate(past,"A"):null;
 const gBase=Number.isFinite(gPrior)?gPrior:leagueMean.G;
 const aBase=Number.isFinite(aPrior)?aPrior:leagueMean.A;
 const currentGP=Math.max(0,p.gp);
 const goalRate=(p.g+pseudoGames*gBase)/(currentGP+pseudoGames);
 const assistRate=(p.a+pseudoGames*aBase)/(currentGP+pseudoGames);
 const remaining=Math.max(0,PROJECTION_SEASON_WEEKS-teamGames);
 const participation=clamp((p.gp+1.8)/(Math.max(teamGames,1)+3),.07,1);
 const futureGP=remaining*participation;
 const fullGP=p.gp+futureGP;
 const fullGoals=p.g+futureGP*goalRate;
 const fullAssists=p.a+futureGP*assistRate;
 const ppg=goalRate+assistRate;
 const historicalPPG=Number.isFinite(gPrior)&&Number.isFinite(aPrior)?gPrior+aPrior:null;
 const trend=historicalPPG!==null&&historicalPPG>.03?
   clamp((p.pts/Math.max(1,p.gp)-historicalPPG)/historicalPPG,-2,2):null;
 const quality=currentGP>=5&&oldGP>=15?"HIGH":
  currentGP>=3&&oldGP>=8?"MEDIUM":"LOW";
 const intervals={goals80:[round(Math.max(0,fullGoals-1.28*Math.sqrt(Math.max(1,fullGoals))),1),
   round(fullGoals+1.28*Math.sqrt(Math.max(1,fullGoals)),1)],
  assists80:[round(Math.max(0,fullAssists-1.28*Math.sqrt(Math.max(1,fullAssists))),1),
   round(fullAssists+1.28*Math.sqrt(Math.max(1,fullAssists)),1)]};
 const bridge=playerBridges.get(p.id),nightLinks=bridge?.nightCount??1;
 return{playerId:p.id,leagueId:team.leagueId,teamId:team.teamId,
   sourceGP:p.gp,sourceGoals:p.g,sourceAssists:p.a,sourcePoints:p.pts,
   historyGP:past.historyGP,historyRows:past.historyRows,
   historicalArchiveAsOfSourceBaseline:staleHistoricalRosterBaseline?'HISTORY_PRIORS_SNAPSHOT_PRECEDES_CURRENT_ROSTER':'HISTORY_PRIORS_CURRENT_ROSTER_MATCH',
   publishedRoleGPOnly:true,
   impliedAttendance:round(participation,3),
   goalsPerAppearance:round(goalRate,3),assistsPerAppearance:round(assistRate,3),
   projectedFinalGP:round(fullGP,1),
   projectedFullSeasonGoals:round(fullGoals,1),
   projectedFullSeasonAssists:round(fullAssists,1),
   projectedFullSeasonPoints:round(fullGoals+fullAssists,1),
   projectedPointsPerAppearance:round(ppg,2),
   trendPercent:trend===null?null:round(trend*100,1),
   projectionIntervals80:intervals,notCalibratedIntervals:true,
   crossNightExactPlayerID:nightLinks>1,
   crossNightQualifiedCount:nightLinks,
   historicalStrengthLevelsApproved:false,
   confidence:quality,
   projectionState:"ILLUSTRATIVE_REGRESSION_NOT_OFFICIAL_SOURCE"};
}
const teams=[],allPlayers=[];
for(const team of M.teams){
 const key=team.leagueId+":"+team.teamId,cur=live.get(key),s=scored.get(key)||{GP:0,GF:0,GA:0};
 need(cur&&cur.night===team.night&&cur.program===team.program,"Team current roster/source scope mismatch");
 const researchGP=team.playedGames,teamGP=Math.max(researchGP,s.GP);
 need(Number.isInteger(researchGP)&&researchGP>=0&&s.GP>=0,
  "Source model and public result game counts invalid");
 // Existing source model and game registry cover slightly different public windows.
 // Only verified reciprocal scores count toward goals; record source parity explicitly.
 const players=cur.status==="PUBLIC_FACTS_QUALIFIED"?
  cur.players.filter(x=>x.gp>0).map(x=>forecastPlayer(x,team,teamGP)):[];
 const noGPSourceRows=cur.status==="PUBLIC_FACTS_QUALIFIED"?
  cur.players.filter(x=>x.gp===0).length:0;
 allPlayers.push(...players);
 const totals=players.reduce((a,b)=>{
  a.g+=b.projectedFullSeasonGoals;a.a+=b.projectedFullSeasonAssists;
  a.gp+=b.projectedFinalGP;
  a.currentG+=b.sourceGoals;
  a.currentA+=b.sourceAssists;
  a.futureRosterGoals+=b.goalsPerAppearance*b.impliedAttendance;
  return a;
 },{g:0,a:0,gp:0,currentG:0,currentA:0,futureRosterGoals:0});
 const group=pairsByNight.get(team.night+"|"+team.program+"|"+team.component)||[];
 const scoredPool=group.map(x=>scored.get(x.leagueId+":"+x.teamId))
  .filter(x=>x&&x.GP>0);
 const poolMeanGF=scoredPool.length?
  scoredPool.reduce((s,x)=>s+x.GF,0)/scoredPool.reduce((s,x)=>s+x.GP,0):3.8;
 const poolMeanGA=scoredPool.length?
  scoredPool.reduce((s,x)=>s+x.GA,0)/scoredPool.reduce((s,x)=>s+x.GP,0):3.8;
 const gNow=s.GP?s.GF/s.GP:null,gaNow=s.GP?s.GA/s.GP:null;
 const bGames=4;
 const baseGF=(s.GF+poolMeanGF*bGames)/(s.GP+bGames);
 const baseGA=(s.GA+poolMeanGA*bGames)/(s.GP+bGames);
 const expRosterFutureGoals=totals.futureRosterGoals;
 const observedRosterGPerTeamGame=teamGP?
  totals.currentG/teamGP:expRosterFutureGoals;
 const relativeRosterChange=cur.status==="PUBLIC_FACTS_QUALIFIED"&&observedRosterGPerTeamGame>.35?
  clamp((expRosterFutureGoals-observedRosterGPerTeamGame)/
    observedRosterGPerTeamGame,-.25,.25):0;
 // Only a bounded *scenario* signal. No official tier claim and no blind historical transfer.
 const scenarioRosterGoalEffect=cur.status==="PUBLIC_FACTS_QUALIFIED"?
  clamp(.24*relativeRosterChange,-.06,.06):0;
 const expectedGF=baseGF*(1+scenarioRosterGoalEffect);
 const expectedGA=baseGA;
 const proposedLift=cur.status==="PUBLIC_FACTS_QUALIFIED"?
   clamp((expectedGF-baseGF)*20,-15,15):0;
 const rookie=players.filter(x=>x.historyGP<3).length;
 const historical=players.map(x=>history.get(x.playerId))
  .filter(h=>h&&h.historyGP>0&&Number.isFinite(h.careerGoalRate)&&Number.isFinite(h.careerAssistRate));
 const historicalGP=historical.reduce((s,x)=>s+x.historyGP,0);
 const historyRateG=historicalGP?historical.reduce((s,x)=>s+x.historyGP*x.careerGoalRate,0)/historicalGP:null;
 const historyRateA=historicalGP?historical.reduce((s,x)=>s+x.historyGP*x.careerAssistRate,0)/historicalGP:null;
 const reliable=players.filter(x=>x.confidence!=="LOW").length;
 const continuity=players.length?
  players.filter(x=>x.historyGP>=10).length/players.length:0;
 const projectionRecord={
  leagueId:team.leagueId,teamId:team.teamId,teamName:team.name,
  night:team.night,program:team.program,component:team.component,
  sourceCurrentDivision:team.sourceDivision,sourceTeamGames:teamGP,
  originalResearchModelGP:researchGP,sourceResultGP:s.GP,
  modelVsResultGPAligned:s.GP===researchGP,
  actualGF:s.GF,actualGA:s.GA,
  currentGoalsForPerGame:gNow===null?null:round(gNow,2),
  currentGoalsAgainstPerGame:gaNow===null?null:round(gaNow,2),
  expectedRemainingGames:Math.max(0,PROJECTION_SEASON_WEEKS-teamGP),
  projectedGoalsForPerGame:round(expectedGF,2),
  projectedGoalsAgainstPerGame:round(expectedGA,2),
  projectedFullSeasonGF:round(s.GF+(PROJECTION_SEASON_WEEKS-teamGP)*expectedGF,1),
  projectedFullSeasonGA:round(s.GA+(PROJECTION_SEASON_WEEKS-teamGP)*expectedGA,1),
  projectedCurrentRosterGoals:round(totals.g,1),
  projectedCurrentRosterAssists:round(totals.a,1),
  projectedCurrentRosterPoints:round(totals.g+totals.a,1),
  projectedPlayersWithEvidence:players.length,
  zeroAppearanceRosterRowsHeld:noGPSourceRows,
  historicContinuityFraction:round(continuity,3),
  historicalRosterSourceGP:historicalGP,
  historicalRosterGPerAppearance:historyRateG===null?null:round(historyRateG,3),
  historicalRosterAPerAppearance:historyRateA===null?null:round(historyRateA,3),
  historicalRosterPointsPerAppearance:historicalGP?round(historyRateG+historyRateA,3):null,
  crossNightPlayers:players.filter(x=>x.crossNightExactPlayerID).length,
  archivedHistoryNotAvailablePlayerCount:players.filter(x=>x.historyGP===0).length,
  forecastHighOrMediumConfidencePlayers:reliable,
  newWithoutHistoryPlayers:rookie,
  scoringConcentrationTopTwo:team.scoringConcentrationTopTwo,
  priorSourceRosterSamples:team.priorRosterSamples,
  currentResultStrength:team.resultAdjustedRating,
  projectedScenarioStrength:round(team.resultAdjustedRating+proposedLift,1),
  projectedRosterScenarioDeltaElo:round(proposedLift,1),
  lateGoalEnvironmentUncertainty:!s.GP,
  goaliePerformanceModelQualified:false,
  identityAndEligibilityVerified:false,
  rosterQuality:cur.status==="PUBLIC_FACTS_QUALIFIED"?"SOURCE_QUALIFIED_PUBLIC_SKATERS":
    "ROSTER_SOURCE_HELD_NO_PLAYER_FORECAST",
  forecastConfidence:cur.status!=="PUBLIC_FACTS_QUALIFIED"?"LOW":
     reliable>=Math.ceil(players.length*.5)&&s.GP>=5?"MEDIUM":"LOW",
  modelUse:"EXPERIMENTAL_ROSTER_CONSTRUCTION_SCENARIO_NOT_VALIDATED_OFFICIAL_TIER",
  playerIds:players.map(x=>x.playerId)
 };
 teams.push(projectionRecord);
}
need(teams.length===96&&
  teams.reduce((a,t)=>a+t.projectedPlayersWithEvidence,0)===allPlayers.length,
  "Team-to-player projection preservation failed");
const indexes=new Map(teams.map(t=>[t.leagueId+":"+t.teamId,t]));
const groups=[];
for(const n of M.nights)for(const pool of n.pools){
 const eligible=pool.status!=="SOURCE_QUALITY_HOLD_KEEP_CURRENT";
 const members=pool.current.flatMap(g=>g.teamIds);
 const rated=members.map(id=>indexes.get(n.leagueId+":"+id));
 need(rated.every(x=>x&&x.component===pool.component&&x.night===n.night),
   "Experimental roster scenario mismatched team component");
 const sizes=pool.recommendedDivisionSizes;
 const ranked=rated.slice().sort((a,b)=>b.projectedScenarioStrength-a.projectedScenarioStrength||
   a.teamId-b.teamId);
 const proposal=[];
 let i=0;
 for(let groupNumber=0;groupNumber<sizes.length;groupNumber++){
  const subset=ranked.slice(i,i+sizes[groupNumber]);i+=sizes[groupNumber];
  proposal.push({groupKey:pool.key+"|v25|"+(groupNumber+1),
   name:pool.proposed[groupNumber]?.provisionalLabel??("Competitive Band "+String.fromCharCode(65+groupNumber)),
   sourceTeamIds:subset.map(x=>x.teamId),
   sourceTeamNames:subset.map(x=>x.teamName),
   meanProjectedRating:round(subset.reduce((s,x)=>s+x.projectedScenarioStrength,0)/subset.length,1)});
 }
 need(i===rated.length,"Experimental proposed group sizes do not conserve team membership");
 const accepted=eligible?proposal:pool.proposed.map(g=>({
  groupKey:g.key+"|source-held",name:g.provisionalLabel,
  sourceTeamIds:[...g.teams],sourceTeamNames:[...g.teamNames],
  meanProjectedRating:g.averageRelativeRating
 }));
 const originalM=new Map(pool.proposed.flatMap((g,i)=>g.teams.map(id=>[id,i])));
 const newM=new Map(accepted.flatMap((g,i)=>g.sourceTeamIds.map(id=>[id,i])));
 const changes=[...originalM.keys()].filter(id=>originalM.get(id)!==newM.get(id)).length;
 groups.push({night:n.night,leagueId:n.leagueId,program:pool.program,component:pool.component,
  poolKey:pool.key,sourceGroupSizes:pool.currentDivisionSizes,
  v23ResultsOnlySizes:pool.recommendedDivisionSizes,
  v25RosterAwareSizes:accepted.map(x=>x.sourceTeamIds.length),
  status:eligible?"EXPERIMENTAL_ROSTER_AWARE_RESEARCH":"SOURCE_HOLD_KEEP_CURRENT",
  changedMembershipCountComparedToResultsOnly:eligible?changes:0,
  officialLeagueRealignmentAllowed:false,
  groups:accepted});
}
// Research-only A-D team bands are relative to each night/program's exact
// connected game component. They must not be represented as approved absolute tiers.
for(const n of M.nights)for(const pool of n.pools){
 const members=teams.filter(t=>t.night===n.night&&t.program===pool.program&&t.component===pool.component)
  .sort((a,b)=>b.projectedScenarioStrength-a.projectedScenarioStrength||a.teamId-b.teamId);
 for(let i=0;i<members.length;i++){
  const t=members[i],percentile=(i+.5)/members.length;
  t.provisionalABCD=members.length<4?"UNRATED":percentile<=.25?"A":
    percentile<=.5?"B":percentile<=.75?"C":"D";
  t.provisionalBandScope="WITHIN_NIGHT_PROGRAM_AND_CONNECTED_RESULT_GRAPH_ONLY";
  t.provisionalBandOfficial=false;
 }
}
const comparisons=[];
for(const bridge of R.bridges){
 const obs=bridge.observations.filter(o=>o.program==="Open"&&o.gp>0);
 if(new Set(obs.map(o=>o.night)).size<2)continue;
 for(let i=0;i<obs.length;i++)for(let j=i+1;j<obs.length;j++){
  const a=obs[i],b=obs[j];
  if(a.night===b.night)continue;
  comparisons.push({nightPair:[a.night,b.night].sort().join(" ↔ "),
    exactPlayerId:bridge.playerId,
    normalizedSourceRateDifference:round(
      Math.log((a.pts+1)/(a.gp+2))-Math.log((b.pts+1)/(b.gp+2)),3),
    sourceComparabilityApproved:false,appliedNumericTierEffect:0});
 }
}
const counts={
 sourceRatedTeams:teams.length,
 historicalPriorSnapshotOlderThanCurrentRoster:staleHistoricalRosterBaseline,
 acceptedNewSettledGames: Number(settled?.d?.games?.length||0),
 currentTeamPages:R.teams.length,
 qualifiedCurrentTeamRosters:teams.filter(x=>x.rosterQuality==="SOURCE_QUALIFIED_PUBLIC_SKATERS").length,
 estimatedSkaterProjections:allPlayers.length,
 sourcePlayerIDsWithHistoricalStats:P.counts.playerIDsWithPriorSourceSeasons,
 sourcePlayerIDsWithoutHistory:P.counts.playerIDsWithoutPriorSourceSeasons,
 sourceQualifiedHistoricalStatRows:P.counts.totalAcceptedHistoricalStatRows,
 crossNightExactPlayerIDs:R.bridges.length,
 measuredCrossNightPairwiseObservations:comparisons.length,
 rosterAwareGroups:groups.length,
 scenarioMovedTeamsVsResultsOnly:groups.reduce((n,x)=>n+x.changedMembershipCountComparedToResultsOnly,0),
 unsupportedGoalieModels:96
};
const doc={
 schema:"bruttech-leagueos-roster-player-projections/v25",
 snapshotUtc:new Date().toISOString(),
 status:"PUBLIC_DERIVED_PROJECTION_RESEARCH_NOT_OFFICIAL_STATISTICS",
 projectionSeason:"Winter 2026/27",
 projectionRegularWeeks:PROJECTION_SEASON_WEEKS,
 seasonLengthAuthority:"DEMONSTRATION_WHAT_IF_CONFIG_NOT_OFFICIAL_LEAGUE_LENGTH",
 officialDivisionsChanged:false,officialStandingsChanged:false,
 officialPlayerStatsChanged:false,officialRosterChanged:false,
 privateWorkbookPlayerRecordsIncluded:false,
 sourceModels:{
  currentSource:src.roster.file,gameSource:src.registry.file,
  historicalSource:src.prior.file,divisionSource:src.model.file,
  ...(settled?{settledSource:settled.file,settledSourceSHA256:settled.sha256}:{}),
  historicalPriorBaselineRosterSHA256:P.sourceCurrentRosterSHA256,
  historicalArchiveSourceSHA256:P.sourceArchiveSHA256,
  exactSourceSHA256:Object.fromEntries(Object.entries(src).map(([k,v])=>[k,v.sha256]))
 },
 methodology:{
  playerStats:"Exact public SVHL player IDs; current GP/G/A/points, eligible archive stats from Winter 2011/12 onward",
  model:"Empirical Bayes additive G/A rates with 4–14 source-prior pseudo-GP and current attendance shrinkage; new IDs without archival priors use qualified public league mean",
  historicalDivisionExperience:"Retained as contextual evidence, unapproved official A–D tier",
  playerConfidence:"Reported LOW/MEDIUM/HIGH based on qualified current and prior GP",
  goalsAssistsPoints:"Full-season indicative counts including published current values, not guaranteed performance or official source updates",
  scoringOutput:"Show current record, roster-aware future goal environment and projected G/A/P with uncertainty",
  rosterScenario:"Bounded +/-6% projected GF scenario signal, limited to +/-15 Elo; research-only, not an approved relative division tier",
  crossNight:"70 exact public cross-night player IDs measured; numerical tier transfer weight zero pending division-level approvals and prospective validation",
  goalieAndSignedAttendance:"Goalie statistics and signed game-sheet identities not verified at uniform quality, therefore no invented goalie ability/attendance",
  uncertainty:"80% descriptive Poisson-style bands are NOT independently calibrated predictive intervals",
  divisionGroupSize:"Retain V23 validated group sizes and connected program boundaries; experimentally reorder teams by bounded roster scenario rating",
  externalValidation:"Required before automatic league decisions, commercial performance claims or official schedules"
 },
 counts,leagueMeanGoalsPerAppearance:round(leagueMean.G,4),
 leagueMeanAssistsPerAppearance:round(leagueMean.A,4),
 teams,players:allPlayers,experimentalDivisionGroups:groups,
 crossNightPairwiseResearch:comparisons
};
fs.writeFileSync(path.join(ROOT,"leagueos-roster-player-projections-v25.json"),JSON.stringify(doc,null,2)+"\n");
console.log(JSON.stringify({status:doc.status,counts,scenarios:groups.map(x=>({
 night:x.night,pool:x.poolKey,movedTeams:x.changedMembershipCountComparedToResultsOnly,
 status:x.status})),brave:teams.find(x=>x.teamName==="Braves HC")},null,2));
