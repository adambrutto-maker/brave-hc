"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..", "..");
const ledger = JSON.parse(fs.readFileSync(path.join(root,"widgets","brave-official-forfeit-results.json"),"utf8"));
const helper = require(path.join(root,"widgets","brave-official-forfeit-results.js"));
let checks=0;
const test=(title,fn)=>{fn();console.log("PASS",title);checks++};
test("Schema and reciprocal sources",()=>assert.equal(helper.validateLedger(ledger),true));
test("All four are league final 1-0 forfeit wins",()=>{
 const pairs=[[2148155,"Winter_2024/2025"],[2215007,"Winter_2025/2026"],
 [2215009,"Winter_2025/2026"],[2215012,"Winter_2025/2026"]];
 for(const [id,season] of pairs){
  const g=helper.getCanonicalForfeit(ledger,season,id);
  assert.deepEqual(g.officialTeamFinal,{braves:1,opponent:0,result:"W"});
  assert.equal(g.playedOnIce,false);
  assert.deepEqual(g.onIcePlayerStatisticsContribution,{gp:0,goals:0,assists:0});
  assert.equal(g.sourceHTODisplay.bravesGoals,0);
  assert.equal(g.sourceHTODisplay.opponentGoals,0);
 }
});
test("Visitor 0-1 is scored 1-0 for Brave H.C.",()=>{
 for(const id of [2215007,2215012]){
  const g=ledger.forfeits.find(x=>x.htoGameId===id);
  assert.equal(g.bravesHomeAway,"VISITOR");
  assert.deepEqual(g.leagueHomeAwayScore,{home:0,visitor:1});
  assert.equal(helper.getCanonicalForfeit(ledger,g.season,id).officialTeamFinal.braves,1);
 }
});
test("No transformation of played matches",()=>{
 assert.equal(helper.getCanonicalForfeit(ledger,"Winter_2024/2025",2148133),null);
});
test("No input ledger mutation",()=>{
 const before=JSON.stringify(ledger);
 helper.getCanonicalForfeit(ledger,"Winter_2025/2026",2215009);
 assert.equal(JSON.stringify(ledger),before);
});
test("Reject reversed home/visitor interpretation",()=>{
 const bad=structuredClone(ledger);
 bad.forfeits.find(x=>x.htoGameId===2215007).leagueCanonicalTeamScore={braves:0,opponent:1,outcome:"L"};
 assert.throws(()=>helper.validateLedger(bad),/Official forfeit validation failed/);
});
test("Reject synthetic player statistics",()=>{
 const bad=structuredClone(ledger);
 bad.forfeits[0].countsInOnIceGoalOrAssistStats=true;
 assert.throws(()=>helper.validateLedger(bad),/Official forfeit validation failed/);
});
test("Reject loss of original HTO source custody",()=>{
 const bad=structuredClone(ledger);
 bad.forfeits[0].sourceCheck.originalHTOBoxscore.rawDisplay.bravesGoals=1;
 assert.throws(()=>helper.getCanonicalForfeit(bad,"Winter_2024/2025",2148155),/Official forfeit validation failed/);
});
test("Reject wrong season or duplicate exact-game ID",()=>{
 const bad=structuredClone(ledger);
 bad.forfeits[1].htoGameId=bad.forfeits[0].htoGameId;
 assert.throws(()=>helper.validateLedger(bad),/Official forfeit validation failed/);
});
test("Separate played-game goals and SVHL awarded forfeits",()=>{
 const first=helper.getSeasonGoalAccounting(ledger,"Winter_2024/2025");
 const next=helper.getSeasonGoalAccounting(ledger,"Winter_2025/2026");
 assert.equal(first.playedGameGoalsFor,73);
 assert.equal(first.awardedAdministrativeGoalsFor,1);
 assert.equal(first.officialLeagueStandingsGoalsFor,74);
 assert.equal(next.playedGameGoalsFor,81);
 assert.equal(next.awardedAdministrativeGoalsFor,3);
 assert.equal(next.officialLeagueStandingsGoalsFor,84);
 assert.equal(next.officialTeamGoalsAgainst,82);
 assert.equal(first.awardedGoalsExcludedFromPlayerStats,true);
 assert.equal(helper.getSeasonGoalAccounting(ledger,"Winter_2026/2027"),null);
});
test("Reject double-counted awarded goals or distorted official standings",()=>{
 const corrupt=structuredClone(ledger);
 corrupt.seasonScoringDomains.seasons[0].playedGameGoalsFor=74;
 assert.throws(()=>helper.validateLedger(corrupt),/Official forfeit validation failed/);
 const bad=structuredClone(ledger);
 bad.seasonScoringDomains.seasons[1].awardedAdministrativeGoalsFor=4;
 assert.throws(()=>helper.getSeasonGoalAccounting(bad,"Winter_2025/2026"),/Official forfeit validation failed/);
});
console.log("OFFICIAL_FORFEIT_NODE_QA_PASS",checks,"/ 11");
