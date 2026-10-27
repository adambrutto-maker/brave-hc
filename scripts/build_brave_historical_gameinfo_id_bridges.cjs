#!/usr/bin/env node
"use strict";
/* ENG59 HIS-06: existing 79 Brave source-matched older-season games -> exact
 * Sports Village GameInfo IDs and SHA. No implicit current franchise identity,
 * no player event admission and no changes to historical match stats/ratings.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const need=(x,s)=>{if(!x)throw Error("HISTORICAL_GAMEINFO_ID_BRIDGE_HOLD:"+s)};
const hex=/^[0-9a-f]{64}$/;
const gitSourceHash=buf=>crypto.createHash("sha256").update(
  buf.toString("utf8").split(String.fromCharCode(13,10)).join(String.fromCharCode(10))
).digest("hex");
const BRAVES_NAMES=new Set(["Braves H.C.","Brave H.C.","Braves H/C","Braves HC"]);
const seasonIDs=new Set([494,512,531,547]);
const uniqueKey=(lid,gid)=>lid+"|"+gid;
function build(links,seasons,sourceHashes){
 need(links?.schema==="brave-hc-source-matched-historical-team-seasons/v1"&&
   links.status==="DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED"&&
   links.currentContextNotModified===true&&
   Array.isArray(links.teamSeasons)&&
   links.teamSeasons.length===links.matchedTeamSeasonGroups&&
   links.matchedGameCount===79&&links.matchedTeamSeasonGroups===35&&
   links.teamSeasons.reduce((n,g)=>n+g.games.length,0)===79&&
   links.heldGameComparisons>=0&&
   links.teamSeasons.every(g=>g.continuousFranchiseNotVerified===true),
   "HISTORICAL_DUAL_SOURCE_79_GAME_PROOF_REQUIRED");
 need(sourceHashes&&hex.test(sourceHashes.historicalVerifiedJSON)&&
   Object.keys(sourceHashes.seasons||{}).length===seasonIDs.size&&
   [...seasonIDs].every(id=>hex.test(sourceHashes.seasons[id])),
   "SOURCE_BYTES_OR_COVERAGE_HASHES_MISSING");
 need(Object.keys(seasons).length===seasonIDs.size&&
   [...seasonIDs].every(id=>seasons[id]?.leagueId===id&&
     seasons[id].schema==="brave-hc-svhl-season-individual-game-evidence/v1"&&
     seasons[id].leagueAssignmentsOrPlayerTotalsWritten===false&&
     seasons[id].status==="SOURCE_GAME_EVENT_EVIDENCE_WITH_EXPLICIT_PARTIAL_HOLDS"),
   "UNADMITTED_SEASON_GAMEINFO_EVIDENCE");
 const bySeason={},games=[],seen=new Set(),seenGroups=new Set(),meta=[];
 let totalHeld=0;
 for(const id of seasonIDs){
  const season=seasons[id],teamById=new Map(season.teams.map(t=>[t.sourceTeamId,t]));
  need(teamById.size===season.teams.length&&
   new Set(season.games.map(g=>g.gameId)).size===season.games.length&&
   season.games.length===season.summary.completedReciprocalGameSheets,
   "SEASON_TEAM_GAME_SOURCE_DUPLICATE_OR_SCOPE_UNVERIFIED");
  bySeason[id]={source:season,teams:teamById};
 }
 for(const group of links.teamSeasons){
  const lid=group.officialLeagueId,sourceInfo=bySeason[lid];
  need(sourceInfo&&
    Number.isSafeInteger(group.officialTeamSeasonId)&&group.officialTeamSeasonId>0&&
    typeof group.season==="string"&&group.season&&
    typeof group.officialTeamName==="string"&&group.officialTeamName&&
    hex.test(group.officialTeamPageSHA256)&&
    group.officialTeamPage===
     "https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid="+lid+
      "&teamid="+group.officialTeamSeasonId+"&page_type=Adult"&&
    sourceInfo.teams.get(group.officialTeamSeasonId)?.name===group.officialTeamName&&
    sourceInfo.teams.get(group.officialTeamSeasonId)?.sourceTeamPageSHA256===
      group.officialTeamPageSHA256,
    "HISTORICAL_OFFICIAL_OPPONENT_ID_OR_TEAM_PAGE_SOURCE_DISAGREEMENT");
  const key=lid+"|"+group.officialTeamSeasonId;
  need(!seenGroups.has(key),"DUPLICATE_HISTORICAL_TEAM_SEASON_GROUP");
  seenGroups.add(key);
  const outcome={gp:0,w:0,l:0,t:0,gf:0,ga:0};
  for(const observed of group.games){
   need(/^20\d\d-\d\d-\d\d$/.test(observed.date)&&
      Number.isSafeInteger(observed.gf)&&observed.gf>=0&&
      Number.isSafeInteger(observed.ga)&&observed.ga>=0&&
      ["W","L","T"].includes(observed.result)&&
      observed.result===(observed.gf>observed.ga?"W":observed.gf<observed.ga?"L":"T"),
      "INCONSISTENT_SOURCE_MATCHED_BRAVES_GAME_SCORE");
   const candidate=sourceInfo.source.games.filter(g=>g.date===observed.date&&
     [g.homeTeamId,g.awayTeamId].includes(group.officialTeamSeasonId)&&
     ((g.homeTeamId===group.officialTeamSeasonId&&
        g.homeGoals===observed.ga&&g.awayGoals===observed.gf)||
      (g.awayTeamId===group.officialTeamSeasonId&&
        g.awayGoals===observed.ga&&g.homeGoals===observed.gf)));
   need(candidate.length===1,"NO_UNIQUE_GAMEINFO_ID_FOR_HISTORICAL_MATCH");
   const g=candidate[0],gameKey=uniqueKey(lid,g.gameId);
   need(!seen.has(gameKey)&&
     Number.isSafeInteger(g.gameId)&&g.gameId>0&&
     g.source==="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid="+lid+
       "&gameid="+g.gameId+"&page_type=Adult"&&
     hex.test(g.sourcePageSHA256),
     "DUPLICATED_OR_UNQUALIFIED_HISTORICAL_GAMEINFO_ID");
   seen.add(gameKey);
   const braveTeamId=g.homeTeamId===group.officialTeamSeasonId?
      g.awayTeamId:g.homeTeamId;
   const braves=sourceInfo.teams.get(braveTeamId);
   need(braves&&BRAVES_NAMES.has(braves.name)&&braves.sourceTeamPageSHA256&&
     hex.test(braves.sourceTeamPageSHA256)&&
     sourceInfo.teams.has(g.homeTeamId)&&sourceInfo.teams.has(g.awayTeamId),
     "SOURCE_BRAVES_HISTORICAL_TEAM_ID_UNVERIFIED");
   const status=g.status;
   need(["FULL_GAME_GOAL_EVENTS_SCORE_PARITY",
     "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"].includes(status),
     "HISTORICAL_GAMEINFO_SCORING_SHEET_STATE_UNSUPPORTED");
   if(status!=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY")totalHeld++;
   outcome.gp++;outcome[observed.result.toLowerCase()]++;
   outcome.gf+=observed.gf;outcome.ga+=observed.ga;
   games.push({
     season:group.season,leagueId:lid,gameId:g.gameId,date:observed.date,
     braveSourceTeamId:braveTeamId,braveSourceTeamName:braves.name,
     opponentTeamId:group.officialTeamSeasonId,opponentName:group.officialTeamName,
     historicalDivisionContext:group.officialDivision,
     braveGF:observed.gf,braveGA:observed.ga,braveResult:observed.result,
     officialHomeTeamId:g.homeTeamId,officialAwayTeamId:g.awayTeamId,
     publishedFinalHomeAway:[g.homeGoals,g.awayGoals],
     sourceGameInfoURL:g.source,sourceGameInfoSHA256:g.sourcePageSHA256,
     sourceOpponentTeamPageURL:group.officialTeamPage,
     sourceOpponentTeamPageSHA256:group.officialTeamPageSHA256,
     scorerEventEvidenceStatus:status==="FULL_GAME_GOAL_EVENTS_SCORE_PARITY"?
       "OFFICIAL_GOAL_SHEET_SCORE_PARITY":"HELD_PLAYER_GOAL_EVENT_SHEET",
     currentRosterContinuityVerified:false,playerGPVerified:false,
     videoObservationAccepted:false,scoutingIndexModified:false
   });
  }
  need(["gp","w","l","t","gf","ga"].every(k=>outcome[k]===group.bravesRecord[k]),
    "HISTORICAL_GROUP_BRAVES_WLT_SCORE_PARITY_FAILURE");
  meta.push({leagueId:lid,opponentTeamId:group.officialTeamSeasonId,
    opponentName:group.officialTeamName,season:group.season,games:outcome.gp});
 }
 need(seen.size===links.matchedGameCount&&games.length===79&&
   meta.length===links.matchedTeamSeasonGroups&&totalHeld===4,
   "HISTORICAL_MATCHED_GAMEINFO_ID_OR_SCORER_HOLD_COUNT_CHANGED");
 games.sort((a,b)=>b.date.localeCompare(a.date)||a.leagueId-b.leagueId||a.gameId-b.gameId);
 const years=[...seasonIDs].sort((a,b)=>b-a);
 return {
   schema:"brave-hc-historical-source-matched-gameinfo-ids/v1",
   status:"HISTORICAL_EXACT_GAMEINFO_IDS_SOURCE_QUALIFIED_PLAYER_STATS_HELD_SEPARATELY",
   sourceHashBytePolicy:"UTF8_LF_GIT_BLOB",
   originalSourceSHA256:{historicalMatchedLinks:sourceHashes.historicalVerifiedJSON,
     officialGameInfoSeasons:sourceHashes.seasons},
   reviewedSeasons:years,matchedHistoricalGames:games.length,
   sourceTeamSeasonOpponentGroups:meta.length,
   fullGoalScoringSourceGames:games.length-totalHeld,
   heldScorerEventSourceGames:totalHeld,
   historicalComparisonsStillHeld:links.heldGameComparisons,
   historicalFranchiseContinuityInferred:false,
   originalHistoricalH2HModified:false,
   officialSourceOrPlayerDataWritten:false,
   videoTeamRatingProduced:false,independentScorerCorrectionsAccepted:false,
   games,opponentSeasonGroups:meta,
   caveat:"Historical GameInfo source IDs verify exact dated outcomes and opponents, not current roster continuity, player attendance, or unreviewed goal attribution. Division names are historical descriptors, not calibrated strength tiers. Held scoring-event sheets are never admitted as player stats."
 };
}
function main(){
 const root=path.resolve(__dirname,"..");
 const officialIds=[494,512,531,547],inputs={};
 for(const lid of officialIds)inputs[lid]=fs.readFileSync(
   path.join(root,"widgets","svhl-player-game-"+lid+".json"));
 const hist=fs.readFileSync(path.join(root,"widgets","brave-historical-verified-games.json"));
 const seasons=Object.fromEntries(officialIds.map(id=>[id,JSON.parse(inputs[id])]));
 const result=build(JSON.parse(hist),seasons,{historicalVerifiedJSON:gitSourceHash(hist),
   seasons:Object.fromEntries(officialIds.map(id=>[id,gitSourceHash(inputs[id])]))});
 const dest=path.join(root,"widgets","brave-historical-gameinfo-ids.json");
 const out=JSON.stringify(result,null,2)+"\n";
 if(process.argv.includes("--check")){
  need(fs.existsSync(dest)&&fs.readFileSync(dest,"utf8")===out,
   "CHECK_ONLY_GAMEINFO_HISTORICAL_SOURCE_NOT_REPRODUCIBLE");
 }else fs.writeFileSync(dest,out,"utf8");
 console.log(JSON.stringify({status:"HISTORICAL_GAMEINFO_EXACT_MATCH_PASS",
  games:result.matchedHistoricalGames,groups:result.sourceTeamSeasonOpponentGroups,
  heldPlayerScoring:result.heldScorerEventSourceGames,
  checkOnly:process.argv.includes("--check"),
  writesOriginalSource:false,joinsToCurrentStrength:false}));
}
if(require.main===module)main();
module.exports={build,gitSourceHash};
