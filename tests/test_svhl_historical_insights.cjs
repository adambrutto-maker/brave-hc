"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",n),"utf8"));
const model=require("../widgets/league-insights.js");
const league=read("league-intelligence.json");
const archive=read("historical-svhl-standings.json");
const links=read("brave-historical-verified-games.json");
const tests=[
 ["Source archives remain separated from current identities",()=>{
   assert.doesNotThrow(()=>model.verify(league,archive));
   assert.equal(archive.seasons.length,6);
   assert.equal(archive.competitiveTeamSeasonEntries,175);
   assert.equal(archive.publishedPersonalRosterData,false);
   assert.ok(archive.identityRule.includes("not verified"));
 }],
 ["Simple Maplewolves summary agrees with current 2026/27 source",()=>{
   const info=model.plain(league,archive,"Maplewolves",links);
   const current=league.teams.find(x=>x.leagueName==="Maplewolves");
   assert.deepEqual(info.record,current.record);
   assert.equal(info.gfPerGame,current.record.gf/current.record.gp);
   assert.equal(info.gaPerGame,current.record.ga/current.record.gp);
   assert.equal(info.score,current.strengthContext.contextIndex);
   assert.equal(info.historicalH2H.gp,current.bravesMatchHistory.bravesAllTime.gp);
   assert.ok(info.evidence.includes("early sample"));
 }],
 ["Historical same-name appearances do not create automatic franchise links",()=>{
   const info=model.plain(league,archive,"Maplewolves",links);
   assert.ok(info.exactHistoricalNameObservations.length>0);
   assert.ok(info.exactHistoricalNameObservations.every(x=>
      x.identity==="SAME_DISPLAY_NAME_ONLY_ROSTER_CONTINUITY_NOT_VERIFIED"));
   assert.ok(info.sourceMatchedOldGameSeasons.every(x=>
      x.caution==="VERIFIED_SEASON_GAMES_NOT_VERIFIED_CURRENT_FRANCHISE_CONTINUITY"));
 }],
 ["Private-stage paired Brave matches are published as season-scoped only",()=>{
   assert.equal(links.matchedGameCount,79);
   assert.equal(links.heldGameComparisons,24);
   assert.equal(links.sourcePrivacy,"TEAM_SEASON_AND_SCORES_ONLY_NO_PLAYER_DATA");
   assert.ok(links.teamSeasons.every(x=>x.continuousFranchiseNotVerified===true));
   assert.ok(links.teamSeasons.every(x=>x.games.length===x.bravesRecord.gp));
 }],
 ["Cross-division history preserves each original division and source season",()=>{
   const history=model.divisionHistoricalBridges(links);
   assert.ok(history.length>2);
   assert.equal(history.reduce((n,x)=>n+x.games,0),links.matchedGameCount);
   assert.ok(history.every(x=>x.w+x.l+x.t===x.games && x.source.startsWith("https://leagues.sportsvillage.ca/")));
 }],
 ["Current league balance covers all competitive teams, not placeholders",()=>{
   const review=model.divisionReview(league,archive);
   assert.equal(review.groups.length,league.currentDivisionCount);
   assert.equal(review.groups.reduce((n,x)=>n+x.teams,0),review.eligibleTeams);
   assert.equal(review.eligibleTeams,26);
   assert.ok(review.groups.every(x=>x.avgGames>=0 && x.spread>=0));
   assert.ok(review.groups.every(x=>x.crossDivisionGameRows>=0));
 }],
 ["Not enough weekly games means no formal division recommendation",()=>{
   const review=model.divisionReview(league,archive);
   assert.equal(review.proposalReady,false);
   assert.equal(review.status,"EARLY_RESEARCH_NOT_A_DIVISION_RECOMMENDATION");
   assert.ok(review.rationale.includes("four weekly observations"));
 }],
 ["Weekly base has no invented change from an unavailable prior week",()=>{
   const braves=model.plain(league,archive,"Braves HC",links);
   assert.equal(braves.weekly.count,1);
   assert.equal(braves.weekly.delta,null);
   assert.equal(braves.weekly.latest.team.contextIndex,
       league.teams.find(t=>t.leagueName==="Braves HC").strengthContext.contextIndex);
 }],
 ["Invalid historical source fails closed without affecting live league source",()=>{
   const copy=JSON.parse(JSON.stringify(archive));
   copy.status="INVENTED";
   assert.throws(()=>model.plain(league,copy,"Maplewolves",links),/LEAGUE_INSIGHTS_HOLD/);
   assert.doesNotThrow(()=>model.verify(league,archive));
 }],
 ["Unverified current team names cannot be invented",()=>{
   assert.throws(()=>model.plain(league,archive,"Some New Team",links),/TEAM_NOT_FOUND/);
 }]
];
let failures=0;
for(const [title,fn] of tests)try{fn();console.log("PASS",title)}catch(e){failures++;console.error("FAIL",title,e.stack)}
if(failures)process.exitCode=2;
else console.log("HISTORICAL_DIVISION_INSIGHTS_PASS",tests.length);
