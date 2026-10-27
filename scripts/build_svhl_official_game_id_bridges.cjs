#!/usr/bin/env node
"use strict";
/* A deterministic official-game-identity crosswalk for current adult SVHL.
 * READ ONLY. Connects the EXISTING legacy date/team-pair graph to official
 * GameInfo IDs without changing scores, division indices or player events.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const fit=require("../widgets/division-fit-model.js");
const hex=/^[a-f0-9]{64}$/;
// Git stores source JSON with LF, while Windows may check out CRLF.
// Hash the canonical UTF-8 Git-blob bytes, not local worktree line endings.
const gitBlobSHA256=buf=>crypto.createHash("sha256").update(
  buf.toString("utf8").split(String.fromCharCode(13,10)).join(String.fromCharCode(10)),"utf8").digest("hex");
const need=(p,r)=>{if(!p)throw Error("OFFICIAL_GAME_BRIDGE_HOLD:"+r)};
const key=(date,a,b)=>[date,Math.min(a,b),Math.max(a,b)].join("|");
function build(league,season,opts){
 need(league?.schema==="brave-hc-league-intelligence/public-v1"&&
      league.currentSourceDataConcordant===true&&league.leagueId===570&&
      season?.schema==="brave-hc-svhl-season-individual-game-evidence/v1"&&
      season.leagueId===570&&season.leagueAssignmentsOrPlayerTotalsWritten===false&&
      season.status==="SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS"&&
      Array.isArray(season.games)&&Array.isArray(season.teams),
      "ADMITTED_OFFICIAL_SOURCE_REQUIRED");
 need(opts&&opts.sourceHashPolicy==="UTF8_LF_GIT_BLOB"&&
      hex.test(opts.leagueJSONSHA256||"")&&hex.test(opts.seasonJSONSHA256||""),
      "ORIGINAL_SOURCE_BYTE_HASHES_REQUIRED");
 const analysis=fit.analyze(league);
 const poolTeams=new Map(analysis.teams.map(t=>[t.sourceTeamId,t]));
 const sourceTeams=new Map(season.teams.map(t=>[t.sourceTeamId,t]));
 need(poolTeams.size===analysis.adultPoolTeamCount&&
      sourceTeams.size===season.teams.length&&
      analysis.adultPoolTeamCount===season.teams.length&&
      [...poolTeams.keys()].every(id=>sourceTeams.has(id)),
      "CURRENT_TEAM_DIRECTORY_NOT_EQUAL_TO_OFFICIAL_GAMEINFO");
 const graph=new Map(analysis.gameGraph.verifiedMatches.map(g=>[g.sourceGameKey,g]));
 need(graph.size===analysis.gameGraph.verifiedGamesInPool&&
      analysis.gameGraph.reciprocalPairsVerified===true&&
      analysis.gameGraph.identityPolicy==="DATE_AND_UNORDERED_TEAM_PAIR_NO_OFFICIAL_GAME_ID",
      "UNVERIFIED_CURRENT_ADULT_PAIR_GRAPH");
 const sourceGames=new Map(),ids=new Set(),records=[];
 for(const game of season.games){
   need(Number.isSafeInteger(game.gameId)&&game.gameId>0&&
        game.leagueId===570&&Number.isSafeInteger(game.homeTeamId)&&
        Number.isSafeInteger(game.awayTeamId)&&
        poolTeams.has(game.homeTeamId)&&poolTeams.has(game.awayTeamId)&&
        game.homeTeamId!==game.awayTeamId&&
        /^20\d{2}-\d{2}-\d{2}$/.test(game.date)&&
        Number.isSafeInteger(game.homeGoals)&&game.homeGoals>=0&&
        Number.isSafeInteger(game.awayGoals)&&game.awayGoals>=0&&
        hex.test(game.sourcePageSHA256)&&
        ["FULL_GAME_GOAL_EVENTS_SCORE_PARITY",
         "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"].includes(game.status)&&
        game.source==="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid="+
          game.gameId+"&page_type=Adult",
        "OFFICIAL_GAMEINFO_LINEAGE_OR_SCORE_NOT_QUALIFIED");
   const pairKey=key(game.date,game.homeTeamId,game.awayTeamId);
   need(!ids.has(game.gameId)&&!sourceGames.has(pairKey),
        "DUPLICATE_GAME_ID_OR_SAME_DAY_REMATCH_REQUIRES_DISTINCT_SOURCE_GAME_KEY");
   ids.add(game.gameId);sourceGames.set(pairKey,game);
 }
 need(sourceGames.size===graph.size&&sourceGames.size===season.summary.completedReciprocalGameSheets&&
      season.summary.fullGoalSheetGames+season.summary.partialGoalSheetGames===sourceGames.size,
      "GAMEINFO_COVERAGE_DOES_NOT_EQUAL_SOURCE_PAIR_GRAPH");
 const leagueTeams=new Map(league.teams.map(t=>[t.sourceTeamId,t]));
 for(const [pairKey,source] of sourceGames){
   const entry=graph.get(pairKey);
   need(entry&&entry.date===source.date&&
        entry.teamIds[0]===Math.min(source.homeTeamId,source.awayTeamId)&&
        entry.teamIds[1]===Math.max(source.homeTeamId,source.awayTeamId)&&
        entry.absoluteGoalMargin===Math.abs(source.homeGoals-source.awayGoals),
        "OFFICIAL_GAMEINFO_MATCHUP_OR_FINAL_SCORE_MISMATCH");
   for(const [ownId,oppId,goalsFor,goalsAgainst] of [
      [source.homeTeamId,source.awayTeamId,source.homeGoals,source.awayGoals],
      [source.awayTeamId,source.homeTeamId,source.awayGoals,source.homeGoals]
   ]){
      const own=leagueTeams.get(ownId),opp=leagueTeams.get(oppId);
      need(own&&opp&&
        (own.completedGames||[]).filter(g=>g.date===source.date&&
            g.opponent===opp.leagueName&&g.gf===goalsFor&&g.ga===goalsAgainst).length===1,
        "OFFICIAL_SCORE_TEAM_SIDE_NOT_RECONCILED");
   }
   const home=poolTeams.get(source.homeTeamId);
   const away=poolTeams.get(source.awayTeamId);
   need(entry.sameCurrentDivision===(home.divisionNow===away.divisionNow)&&
        entry.divisionPair.join("|")===
          [home.divisionNow,away.divisionNow].sort().join("|"),
        "CURRENT_DIVISION_LINK_MISMATCH");
   records.push({
     officialLeagueId:570,officialGameId:source.gameId,sourceGameKey:pairKey,
     date:source.date,
     homeTeamId:source.homeTeamId,awayTeamId:source.awayTeamId,
     homeTeamName:home.leagueName,awayTeamName:away.leagueName,
     publishedFinalGoals:[source.homeGoals,source.awayGoals],
     officialGameInfoURL:source.source,officialGameInfoPageSHA256:source.sourcePageSHA256,
     currentDivisionPair:[home.divisionNow,away.divisionNow].sort(),
     crossCurrentDivision:!entry.sameCurrentDivision,
     scoringEventAdmission:source.status==="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"?
       "FULL_GOAL_EVENTS_SCORE_PARITY":"HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION",
     originalOfficialScoreOverwritten:false,
     videoPerformanceMeasurements:null
   });
 }
 const ordered=records.sort((a,b)=>a.officialGameId-b.officialGameId);
 const cross=ordered.filter(x=>x.crossCurrentDivision);
 const full=ordered.filter(x=>x.scoringEventAdmission==="FULL_GOAL_EVENTS_SCORE_PARITY").length;
 need(cross.length===analysis.gameGraph.crossCurrentDivisionGames&&
      full===season.summary.fullGoalSheetGames&&
      ordered.length-full===season.summary.partialGoalSheetGames,
      "OFFICIAL_MATCHUP_CROSS_LINK_OR_PLAYER_EVENT_PARITY_MISMATCH");
 return {
  schema:"brave-hc-svhl-current-official-game-id-bridge/v1",
  status:"OFFICIAL_GAMEINFO_IDENTITY_MATCHED_NO_RATING_OR_STATS_WRITE",
  policy:"EXACT_SOURCE_GAME_ID_AND_TEAM_SIDE_SCORES_IN_SVHL_570_ONLY",
  leagueId:570,sourceLeagueAsOf:league.asOf,
  sourceGameInfoCapturedUTC:season.capturedUTC,
  sourceHashBytePolicy:"UTF8_LF_GIT_BLOB",
  originalSourceSHA256:{leagueIntelligenceJSON:opts.leagueJSONSHA256,
     officialGameInfoSeasonJSON:opts.seasonJSONSHA256},
  teams:poolTeams.size,officialGames:ordered.length,
  crossCurrentDivisionGames:cross.length,
  fullScoringSheetEvents:full,
  heldPlayerScoringGames:ordered.length-full,
  allSourceGameKeysOfficiallyMatched:true,
  sourceGameIDsStable:true,
  leagueRatingsChanged:false,officialDivisionAssignmentsChanged:false,
  videoStrengthCalibrated:false,independentAcceptedForHistoricalPlayerCorrections:false,
  uncertainty:[
   "Official game ID and reciprocal score prove this game identity, not player attendance, penalties or video eligibility.",
   "Current division membership may not reflect the league's historical division at the game date.",
   "Cross-division games are observed opponent bridges, not division equivalence, rating calibration or predicted outcomes.",
   "This match join does not override existing held scorer/roster GameInfo events or create new official scoring statistics."
  ],
  games:ordered
 };
}
function main(){
 const argv=process.argv.slice(2),checkOnly=argv.includes("--check");
 const root=path.resolve(__dirname,"..");
 const paths=["league-intelligence.json","svhl-player-game-570.json"]
   .map(x=>path.join(root,"widgets",x));
 const buffers=paths.map(x=>fs.readFileSync(x));
 const sources=buffers.map(buf=>JSON.parse(buf.toString("utf8")));
 const result=build(...sources,{
   sourceHashPolicy:"UTF8_LF_GIT_BLOB",
   leagueJSONSHA256:gitBlobSHA256(buffers[0]),
   seasonJSONSHA256:gitBlobSHA256(buffers[1])
 });
 const serialized=JSON.stringify(result,null,2)+"\n";
 const dest=path.join(root,"widgets","svhl-official-game-id-bridges.json");
 if(checkOnly){
   need(fs.existsSync(dest)&&fs.readFileSync(dest,"utf8")===serialized,
        "CHECK_ONLY_SOURCE_BRIDGE_SNAPSHOT_NOT_REPRODUCIBLE");
 }else fs.writeFileSync(dest,serialized);
 console.log(JSON.stringify({status:"OFFICIAL_IDENTITY_CROSSWALK_PASS",
  mode:checkOnly?"CHECK_ONLY":"CREATED_SOURCE_ONLY",teams:result.teams,
  officialGames:result.officialGames,crossCurrentDivisionGames:result.crossCurrentDivisionGames,
  heldPlayerScoringGames:result.heldPlayerScoringGames,
  publisherWrites:false,officialStatisticsModified:false}));
}
if(require.main===module)main();
module.exports={build};
