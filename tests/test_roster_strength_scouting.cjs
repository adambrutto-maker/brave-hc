"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const model=require("../widgets/roster-strength-scouting.js");
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets",p),"utf8"));
const l=read("league-intelligence.json"),r=read("svhl-roster-intelligence.json");
const clone=o=>JSON.parse(JSON.stringify(o));
const tests=[
 ["Admits official 22 current teams, public playerIDs and complete source-season manifest",()=>{
  assert.equal(model.valid(l,r),true);
  assert.equal(r.currentTeams,22);
  assert.equal(r.sourceHistoricalTeamsRead,191);
  assert.equal(r.playerSeasonObservations,3222);
  assert.equal(r.currentPlayerObservations,348);
  assert.equal(r.historicalLeagueIds.length,7);
 }],
 ["No raw name-based cross-season identity joins admitted",()=>{
  const team=r.teams.find(x=>x.name==="Mid Ice Crisis");
  assert.equal(team.rosterCount,19);
  const p=team.players.find(x=>x.name==="Rocchetti, Michael");
  assert.ok(p.previousOfficialObservations.length>0);
  assert.ok(p.previousOfficialObservations.every(x=>
    x.source.includes("playerid="+p.playerId)));
  assert.equal(r.identityBasis,"EXACT_OFFICIAL_PLAYER_ID_PER_ROSTER_SEASON_NOT_NAMES");
 }],
 ["Verified opponent history and roster construction are separate from actual standings",()=>{
  const x=model.analyze(l,r,"Mid Ice Crisis");
  assert.equal(x.rosterCount,19);assert.equal(x.priorLinkedIds,11);
  assert.equal(x.experiencedCount,10);
  assert.equal(x.topTwoShare,.333);
  const team=l.teams.find(t=>t.leagueName==="Mid Ice Crisis");
  const division=l.teams.filter(t=>t.divisionNow===team.divisionNow);
  const average=Number((division.reduce((n,t)=>n+t.strengthContext.contextIndex,0)/
     division.length).toFixed(1));
  assert.equal(x.strengthContextIndex,team.strengthContext.contextIndex);
  assert.equal(x.divisionContextMean,average);
  assert.equal(x.withinDivisionGap,Number((x.strengthContextIndex-average).toFixed(1)));
  assert.equal(x.noCurrentGameDayAttendanceEvidence,true);
  assert.equal(x.noWinProbability,true);
 }],
 ["Cross-division observations are reciprocal and sample-cautioned rather than strength-equated",()=>{
  const b=model.bridge(l),groups=b.groups;
  const leagueGames=require("../widgets/division-fit-model.js").analyze(l).gameGraph;
  assert.equal(b.verifiedAdultGames,leagueGames.verifiedGamesInPool);
  assert.equal(b.verifiedCrossDivisionGames,leagueGames.crossCurrentDivisionGames);
  assert.deepEqual(groups.map(x=>x.teams),[6,8,8]);
  assert.equal(groups.reduce((n,g)=>n+g.crossRecord.w,0),
    groups.reduce((n,g)=>n+g.crossRecord.l,0),
    "cross-division winners and losers reciprocally balance");
  assert.equal(groups.reduce((n,g)=>n+g.crossDivisionGames,0),
    2*b.verifiedCrossDivisionGames);
  assert.ok(b.note.includes("losing record"));
 }],
 ["Current player production is a prioritized cue, not an attendance or position claim",()=>{
  const x=model.analyze(l,r,"Mid Ice Crisis");
  assert.equal(x.highPriority[0].name,"Packowski, Mike");
  assert.equal(x.highPriority[0].pts,7);
  assert.equal(x.highPriority[0].previous.gp,0);
  assert.ok(x.highPriority.every(p=>p.availabilityVerified===false));
  assert.ok(x.highPriority.every(p=>p.profileUrl.startsWith(
    "https://leagues.sportsvillage.ca/playerinfo.aspx")));
 }],
 ["Historical player IDs permit transfers without adopting franchise aliases",()=>{
  const x=model.analyze(l,r,"Mid Ice Crisis");
  assert.ok(x.skaters.some(p=>p.previous.priorTeams.length>0));
  assert.equal(x.skaters.length,x.activeListedWithGP);
  assert.equal(x.teamPreviousWinterQualified,
    l.teams.find(t=>t.leagueName==="Mid Ice Crisis").previousWinter?.association===
    "ROSTER_ID_CONTINUITY_CONFIRMED");
 }],
 ["Weak win percentage in strong tier never converts into a fictitious favorable matchup",()=>{
  const x=model.analyze(l,r,"Braves HC");
  assert.ok(Number.isFinite(x.strengthContextIndex));
  assert.ok(x.divisionBridge.crossDivisionGames>0);
  assert.ok(x.note.includes("weak record in a higher tier"));
  assert.ok(!Object.keys(x).includes("winProbability"));
  assert.equal(x.noWinProbability,true);
 }],
 ["WhatsApp copy includes source uncertainty and role-specific but not named assignments by default",()=>{
  const x=model.analyze(l,r,"Mid Ice Crisis"),t=model.message(x);
  assert.ok(t.includes("Packowski, Mike")&&t.includes("Ieraci, Vito"));
  assert.ok(t.includes("F1 pressures carrier outside"));
  assert.ok(t.includes("not a future")||t.includes("No future goals")||
    t.includes("no outcome simulation")||t.includes("no future"));
  assert.ok(t.includes("availability")||t.includes("attendance"));
  assert.ok(!t.includes("Braves opponent wins 80%"));
 }],
 ["Explicit planning assignment remains flagged as unconfirmed",()=>{
  const x=model.analyze(l,r,"Mid Ice Crisis");
  const message=model.message(x,["PLANNED ONLY — Packowski, Mike: Brave H.C. Carosi, Justin; F1 press outside. Verify actual lineup."]);
  assert.ok(message.includes("PLANNED ONLY"));
  assert.ok(message.includes("Verify actual lineup"));
  assert.ok(!message.includes("Approved by league"));
 }],
 ["Forged opposing player ID / profile URL are refused",()=>{
  const x=clone(r);
  x.teams[0].players[0].profileUrl="https://example.com";
  assert.throws(()=>model.valid(l,x),/PLAYER_STATS_OR_IDENTITY_INVALID/);
  const y=clone(r);
  y.teams[0].players[1].playerId=y.teams[0].players[0].playerId;
  assert.throws(()=>model.valid(l,y),/PLAYER_STATS_OR_IDENTITY_INVALID/);
 }],
 ["One wrong older-season player source ID is not accepted",()=>{
  const x=clone(r),t=x.teams.find(y=>y.name==="Mid Ice Crisis");
  const p=t.players.find(y=>y.previousOfficialObservations.length);
  p.previousOfficialObservations[0].source=
   p.previousOfficialObservations[0].source.replace("playerid="+p.playerId,"playerid=99999999");
  assert.throws(()=>model.valid(l,x),/PREVIOUS_SEASON_PLAYER_ID_NOT_LINKED/);
 }],
 ["Source-stat inconsistency cannot be represented as independently verified scoring",()=>{
  const x=clone(r);x.teams[0].players[0].pts+=1;
  assert.throws(()=>model.valid(l,x),/PLAYER_SOURCE_ARITHMETIC_INVALID/);
 }],
 ["Rejected mismatched team or separate league cannot sneak into adult strength model",()=>{
  const bad=clone(r);bad.teams[0].name="Invented Franchise";
  assert.throws(()=>model.valid(l,bad),/TEAM_SOURCE_ID_OR_COUNT_INVALID/);
  assert.throws(()=>model.analyze(l,r,"Philadelphia"),/OUTSIDE_ADULT_COMPETITION/);
 }],
 ["Official league source and new roster dataset remain immutable across scouting",()=>{
  const a=JSON.stringify(l),b=JSON.stringify(r);
  model.analyze(l,r,"Mid Ice Crisis");model.analyze(l,r,"Other Way");
  assert.equal(JSON.stringify(l),a);assert.equal(JSON.stringify(r),b);
 }]
];
let failed=0;for(const [name,fn] of tests){
 try{fn();console.log("PASS",name)}catch(e){failed++;console.error("FAIL",name,e.stack)}
}
if(failed)process.exitCode=2;else console.log("ROSTER_SOURCE_SCOUTING_TESTS_PASS",tests.length);
