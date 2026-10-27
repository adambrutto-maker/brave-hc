"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path"),crypto=require("node:crypto");
const build=require("../scripts/build_svhl_official_game_id_bridges.cjs").build;
const root=path.resolve(__dirname,"../widgets");
const input=x=>fs.readFileSync(path.join(root,x));
const doc=x=>JSON.parse(input(x).toString("utf8"));
const official=doc("svhl-player-game-570.json");
const league=doc("league-intelligence.json");
const normalizedSourceSHA=buf=>crypto.createHash("sha256").update(
 buf.toString("utf8").split(String.fromCharCode(13,10)).join(String.fromCharCode(10)),"utf8").digest("hex");
const opts={sourceHashPolicy:"UTF8_LF_GIT_BLOB",
 leagueJSONSHA256:normalizedSourceSHA(input("league-intelligence.json")),
 seasonJSONSHA256:normalizedSourceSHA(input("svhl-player-game-570.json"))
};
const copy=x=>JSON.parse(JSON.stringify(x));
const good=()=>build(league,official,opts);
const tests=[
 ["Official GameInfo IDs identify all 54 source-only adult matchups without score changes",()=>{
  const bridge=good();
  assert.equal(bridge.officialGames,54);
  assert.equal(bridge.crossCurrentDivisionGames,19);
  assert.equal(bridge.teams,22);
  assert.equal(bridge.fullScoringSheetEvents,52);
  assert.equal(bridge.heldPlayerScoringGames,2);
  assert.equal(bridge.games.length,54);
  assert.equal(new Set(bridge.games.map(g=>g.officialGameId)).size,54);
  assert.ok(bridge.games.every(g=>Number.isInteger(g.officialGameId)&&g.officialGameId>0&&
   /^[a-f0-9]{64}$/.test(g.officialGameInfoPageSHA256)&&
   g.officialGameInfoURL.includes("gameid="+g.officialGameId)));
  assert.equal(bridge.leagueRatingsChanged,false);
  assert.equal(bridge.officialDivisionAssignmentsChanged,false);
  assert.equal(bridge.videoStrengthCalibrated,false);
 }],
 ["GameInfo official IDs are not evidence of scoring-player admission",()=>{
  const bridge=good();
  const held=bridge.games.filter(g=>g.scoringEventAdmission==="HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION");
  assert.equal(held.length,2);
  assert.ok(held.every(g=>g.originalOfficialScoreOverwritten===false&&g.videoPerformanceMeasurements===null));
  assert.equal(bridge.independentAcceptedForHistoricalPlayerCorrections,false);
 }],
 ["Every source key maps to identical reciprocal home and away official scores",()=>{
  const bridge=good();
  const byTeam=new Map(league.teams.map(t=>[t.sourceTeamId,t]));
  for(const game of bridge.games){
   const home=byTeam.get(game.homeTeamId),away=byTeam.get(game.awayTeamId);
   assert.ok(home.completedGames.some(g=>g.date===game.date&&
    g.opponent===away.leagueName&&g.gf===game.publishedFinalGoals[0]&&
    g.ga===game.publishedFinalGoals[1]));
   assert.ok(away.completedGames.some(g=>g.date===game.date&&
    g.opponent===home.leagueName&&g.gf===game.publishedFinalGoals[1]&&
    g.ga===game.publishedFinalGoals[0]));
  }
 }],
 ["The committed crosswalk is deterministic and source hashes match current raw files",()=>{
  const built=good();
  assert.deepEqual(built,doc("svhl-official-game-id-bridges.json"));
  assert.equal(built.sourceHashBytePolicy,"UTF8_LF_GIT_BLOB");
  assert.equal(built.originalSourceSHA256.leagueIntelligenceJSON,opts.leagueJSONSHA256);
  assert.equal(built.originalSourceSHA256.officialGameInfoSeasonJSON,opts.seasonJSONSHA256);
 }],
 ["A swapped official game score fails before export",()=>{
  const s=copy(official);s.games[0].homeGoals+=1;
  assert.throws(()=>build(league,s,opts),/OFFICIAL_GAMEINFO_MATCHUP_OR_FINAL_SCORE_MISMATCH/);
 }],
 ["Duplicated game page or distinct-ID same-day rematch is held",()=>{
  const s=copy(official);
  s.games.push({...s.games[0],gameId:999999,
    source:"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid=999999&page_type=Adult"});
  assert.throws(()=>build(league,s,opts),/DUPLICATE_GAME_ID_OR_SAME_DAY_REMATCH/);
  const dup=copy(official);dup.games[1].gameId=dup.games[0].gameId;
  dup.games[1].source=dup.games[0].source;
  assert.throws(()=>build(league,dup,opts),/DUPLICATE_GAME_ID_OR_SAME_DAY_REMATCH/);
 }],
 ["Changed team ID cannot silently be mapped by a similar team name",()=>{
  const s=copy(official);s.games[0].homeTeamId=999999;
  assert.throws(()=>build(league,s,opts),/OFFICIAL_GAMEINFO_LINEAGE_OR_SCORE_NOT_QUALIFIED/);
 }],
 ["Official score held scorer events remain within the source only",()=>{
  const s=copy(official);s.games[0].status="RECONCILED_PLAYER_GOALS";
  assert.throws(()=>build(league,s,opts),/OFFICIAL_GAMEINFO_LINEAGE_OR_SCORE_NOT_QUALIFIED/);
 }],
 ["League side reversal or alias mismatch cannot silently change official scores",()=>{
  const l=copy(league);
  const original=official.games[0],team=l.teams.find(t=>t.sourceTeamId===original.homeTeamId);
  const row=team.completedGames.find(r=>r.date===original.date&&r.gf===original.homeGoals&&r.ga===original.awayGoals);
  assert.ok(row);
  row.gf+=1; row.ga-=1;
  assert.throws(()=>build(l,official,opts),/SOURCE_GAME_PARITY_FAILED|RECIPROCAL_OFFICIAL_RESULT_CONFLICT|OFFICIAL_SCORE_TEAM_SIDE_NOT_RECONCILED/);
 }],
 ["Current source revision and original page SHA must be explicit",()=>{
  const l=copy(league);l.currentSourceDataConcordant=false;
  assert.throws(()=>build(l,official,opts),/ADMITTED_OFFICIAL_SOURCE_REQUIRED/);
  assert.throws(()=>build(league,official,{leagueJSONSHA256:"x",seasonJSONSHA256:"y"}),/ORIGINAL_SOURCE_BYTE_HASHES_REQUIRED/);
 }]
];
for(const [name,fn] of tests){fn();console.log("PASS "+name)}
console.log(JSON.stringify({status:"OFFICIAL_GAME_ID_BRIDGE_NEGATIVE_TESTS_PASS",tests:tests.length}));
