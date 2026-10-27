/* HockeyOS scored-game participation lower bounds; never total GP or PIM. */
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BravePlayerParticipationEvidence=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const SCHEMA="brave-hc-player-participation-evidence/v1";
 const need=(yes,reason)=>{if(!yes)throw Error("PARTICIPATION_SOURCE_HOLD:"+reason)};
 function analyze(index,year,teamId,playerId){
  need(index?.schema==="brave-hc-svhl-game-reconciliation-index/v1" &&
   index.registeredGPVerified===false && index.seasonStatsOverwritten===false &&
   year?.schema==="brave-hc-svhl-season-individual-game-evidence/v1" &&
   String(year.leagueId) in index.seasons &&
   year.leagueAssignmentsOrPlayerTotalsWritten===false &&
   index.seasons[String(year.leagueId)].completedGames===year.games.length,
   "SEASON_INDEX_NOT_ADMITTED");
  const team=year.teams.find(t=>t.sourceTeamId===teamId);
  need(team&&Array.isArray(team.playerSeasonSummaries),"SOURCE_TEAM_SEASON_MISSING");
  const p=team.playerSeasonSummaries.find(v=>v.playerId===playerId);
  need(p && p.gpStatus==="CANNOT_VERIFY_GAME_APPEARANCE_FROM_GOAL_EVENT_SHEET" &&
    Number.isInteger(p.registeredSeasonGP)&&p.registeredSeasonGP>=0&&
    Array.isArray(p.events),"UNVERIFIED_SOURCE_PLAYER");
  const gameById=new Map(year.games.map(g=>[g.gameId,g]));
  need(gameById.size===year.games.length,"DUPLICATE_GAME_SOURCE_ID");
  const known=new Map();
  for(const event of p.events){
   const game=gameById.get(event.gameId);
   need(game && game.status==="FULL_GAME_GOAL_EVENTS_SCORE_PARITY" &&
    [game.homeTeamId,game.awayTeamId].includes(teamId) &&
    event.date===game.date&&event.gameSource===game.source&&
    event.gamePageSHA256===game.sourcePageSHA256 &&
    ["GOAL","ASSIST_EXACT_UNIQUE_NAME"].includes(event.credited),
    "EVENT_NOT_PROVEN_FOR_SAME_TEAM_GAME");
   if(!known.has(event.gameId))known.set(event.gameId,{
    gameId:event.gameId,date:event.date,officialUrl:game.source,
    sourceSHA256:game.sourcePageSHA256,goalEvents:0,admittedAssistEvents:0
   });
   const evidence=known.get(event.gameId);
   if(event.credited==="GOAL")evidence.goalEvents++;
   else evidence.admittedAssistEvents++;
  }
  const observed=[...known.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.gameId-b.gameId);
  const scored=observed.length,registered=p.registeredSeasonGP;
  const discrepancy=scored>registered;
  return {schema:SCHEMA,status:discrepancy?
     "SOURCE_DISCREPANCY_MINIMUM_EXCEEDS_PUBLISHED_GP":
     "AT_LEAST_SCORING_GAMES_NOT_TOTAL_ATTENDANCE",
    leagueId:year.leagueId,teamId,playerId,name:p.name,
    publishedSeasonGP:registered,provenScoringInvolvementGames:scored,
    otherPublishedGPNotGameVerified:Math.max(0,registered-scored),
    sourceContradiction:discrepancy,
    scoringEvidenceGames:observed,eventRoleCount:p.events.length,
    teamSourceGames:team.reciprocalSourceGames,
    scoreCompleteTeamGames:team.fullyScoredGameSheets,
    incompleteTeamGameSheets:team.partiallyScoredGameSheets,
    seasonAttendanceFullyVerified:false,
    playedWithoutScoringNotObservable:true,
    didNotScoreDoesNotProveAbsence:true,
    publicationOverrideAuthorized:false,
    penaltyMinutesFromScoringSheets:null,
    note:discrepancy?
     "More distinct score-linked games than published season GP: public source contradiction. Do not adjust GP or invent attendance.":
     "At least this many distinct GameInfo sheets contain an officially linked goal or uniquely admitted assist for the player. Other published GP are NOT disproved, verified, or considered absences."};
 }
 function penaltySource(sample){
  need(sample?.schema==="brave-hc-svhl-penalty-table-source-coverage/v1"&&
    sample.status==="SAMPLED_PENALTY_TABLES_SOURCE_UNPOPULATED"&&
    sample.penaltyGPVerified===false&&sample.seasonPIMReconciled===false&&
    Array.isArray(sample.leagues)&&sample.leagues.length>=8&&
    sample.totalGamesSampled>=100&&
    sample.totalPopulatedPenaltyRows===0&&
    Array.isArray(sample.games)&&sample.games.length===sample.totalGamesSampled,
    "PENALTY_COVERAGE_SOURCE_NOT_QUALIFIED");
  const ids=new Set();
  for(const item of sample.games){
   const k=item.leagueId+"|"+item.gameId;
   need(!ids.has(k)&&Number.isInteger(item.leagueId)&&Number.isInteger(item.gameId)&&
    item.gameId>0&&item.sourcePageSHA256?.match(/^[a-f0-9]{64}$/)&&
    item.source==="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid="+
     item.leagueId+"&gameid="+item.gameId+"&page_type=Adult"&&
    item.periodTablesFound===4&&item.populatedPenaltyRows===0,
    "PENALTY_SAMPLE_ID_OR_TABLE_UNQUALIFIED");
   ids.add(k);
  }
  return {sampledGames:sample.totalGamesSampled,seasons:sample.leagues.length,
   recordedPenaltyRowsFound:0,
   message:"Penalty period tables were present but had no populated rows in this sampled subset. This is missing reporting evidence, NOT proof of zero penalties or zero PIM. Attendance cannot be inferred."};
 }
 return Object.freeze({schema:SCHEMA,analyze,penaltySource});
});