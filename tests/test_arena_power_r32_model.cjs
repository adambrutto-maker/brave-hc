const assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../widgets"),m=require(path.join(root,"arena-power-r32-core.js"));
const fit=require(path.join(root,"division-fit-model.js")),stability=require(path.join(root,"weekly-strength-stability.js"));
const league=JSON.parse(fs.readFileSync(path.join(root,"league-intelligence.json"),"utf8"));
const teams=m.verify(league),cal=m.calibration(teams),ranks=m.ranked(teams,cal);
assert.equal(teams.length,22);assert.equal(ranks.length,22);
assert.equal(new Set(ranks.map(x=>x.team.sourceTeamId)).size,22);
assert.equal(ranks[0].team.leagueName,"Degenerates");
assert.equal(ranks[21].team.leagueName,"Maplewolves");
assert.equal(ranks[0].score,100);assert.equal(ranks[21].score,50);
assert.equal(m.relative(cal.median,cal),75);
assert.equal(m.relative(NaN,cal),null);assert.equal(m.relative(null,cal),null);
assert.equal(m.relative(30,cal),null);assert.equal(m.relative(105,cal),null);
assert.equal(m.relative(42,{min:42,median:42,max:42}),75);
assert.equal(m.rates(teams.find(x=>x.leagueName==="Braves HC")).ptsPerGame,.4);
assert.equal(m.badge(cal.min,cal).background,"#1768b8");
assert.equal(m.badge(cal.median,cal).background,"#f4f7fc");
assert.equal(m.badge(cal.max,cal).background,"#c91f43");
for(let i=50;i<=100;i+=.125){
 const raw=i<=75?cal.min+(i-50)*(cal.median-cal.min)/25:cal.median+(i-75)*(cal.max-cal.median)/25;
 const b=m.badge(raw,cal);
 assert.ok(b.contrast>=4.5,"badge contrast below 4.5 at "+i);
 assert.ok(Number.isFinite(b.score));
}
for(const team of teams){
 const s=m.splitByOpponentCurrentDivision(team,teams,league.teams);
 assert.equal(s.status,"VERIFIED_CURRENT_OPPONENT_DIVISIONS",team.leagueName);
 assert.equal(s.games+s.excludedGames,team.record.gp);
 assert.equal(s.groups.reduce((sum,g)=>sum+g.gp,0),s.games);
 assert.equal(s.groups.reduce((sum,g)=>sum+g.gf,0)+
  (team.leagueName==="Big Bastones"?1:0),team.record.gf,"goal parity "+team.leagueName);
 assert.ok(m.gamesVerified(team),team.leagueName);
 const form=m.formEvidence(team,league);
 assert.equal(form.status,"HELD");assert.equal(form.category,null);
 assert.equal(form.divisionRelativeForm,null);assert.equal(form.leagueRelativeForm,null);
 assert.equal(form.sourceWeeks,1);
 const compare=m.comparator(team,teams,cal);
 assert.ok(compare.divisionRank>=1&&compare.leagueRank>=1);
 assert.ok(compare.leagueCount===22);
}
const big=teams.find(x=>x.leagueName==="Big Bastones");
assert.equal(m.splitByOpponentCurrentDivision(big,teams,league.teams).excludedGames,1);
const sugo=teams.find(x=>x.leagueName==="Sugo Sundays");
const move=m.membership(sugo,league);
assert.equal(move.status,"OBSERVED_MOVEMENT");assert.equal(move.events.length,1);
assert.equal(move.actualBeforeAfterSupported,false);
assert.equal(move.events[0].effectiveDateNotVerified,true);
const divisions=m.divisionSummary(teams);
assert.deepEqual(divisions.map(d=>d.clubCount),[6,8,8]);
const analysis=fit.analyze(league);
assert.equal(analysis.proposalReady,false);
assert.equal(analysis.status,"EXPLORATORY_ONLY_INSUFFICIENT_SEASON_EVIDENCE");
assert.equal(analysis.adultPoolTeamCount,22);
assert.equal(analysis.weekCount,1);
assert.ok(Array.isArray(analysis.scenarios));
const week=stability.analyze(league);
assert.equal(week.completeObservedWeeks,1);
assert.equal(week.dataReadyForHumanReview,false);
const bad=JSON.parse(JSON.stringify(league));
bad.teams.find(x=>x.leagueName==="Braves HC").strengthContext.contextIndex=null;
assert.throws(()=>m.verify(bad),/ARENA_R32_HELD/);
const receipt={status:"PASS",checkedAt:new Date().toISOString(),
 cohort:teams.length,leagueMin:cal.min,leagueMedian:cal.median,leagueMax:cal.max,
 badgeSamples:[m.badge(cal.min,cal),m.badge(cal.median,cal),m.badge(cal.max,cal)],
 formWeeks:week.completeObservedWeeks,divisionModel:analysis.status,
 proposalReady:analysis.proposalReady,movementEvents:league.movementLedger.events.length,
 excludedOutOfScopeGameCount:1,independentlyCheckedTeams:teams.length};
const out=path.resolve(__dirname,"../docs/QA_ArenaR32_Model.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(receipt,null,2));
console.log("ARENA_R32_SOURCE_MODEL_PASS",JSON.stringify(receipt).slice(0,1200));
