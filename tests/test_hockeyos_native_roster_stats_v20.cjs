/* HockeyOS V20 pure public-source integrity tests. No network or official writes. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),
 path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../widgets");
const data=JSON.parse(fs.readFileSync(path.join(root,"hockeyos-hto-current-v20.json"),"utf8"));
const scope={window:{},document:{addEventListener:()=>{}},console};
vm.runInNewContext(fs.readFileSync(path.join(root,"hockeyos-native-roster-stats-v20.js"),"utf8"),
 scope,{filename:"hockeyos-native-roster-stats-v20.js"});
const engine=scope.window.HockeyOSNativeV20._test;
const clone=()=>JSON.parse(JSON.stringify(data));
test("source schema, authority and aggregate parity pass without modifying input",()=>{
 const before=JSON.stringify(data);
 assert.equal(engine.validate(data),data);assert.equal(JSON.stringify(data),before);
 assert.equal(data.sourceReadOnly,true);assert.equal(data.officialRecordEdited,false);
});
test("23 named skaters, five goalies and 28 roster entries; HTO team rows isolated",()=>{
 assert.equal(data.counts.roster,28);assert.equal(data.counts.skaters,23);assert.equal(data.counts.goalies,5);
 assert.equal(data.counts.sourceSkaterRowsIncludingTeamTotal,24);
 assert.equal(data.counts.sourceGoalieRowsIncludingTeamTotal,6);
 assert.equal(data.teamTotals.skaters.name,"Team Stats");
 assert.equal(data.teamTotals.goalies.name,"Team Stats");
 assert.ok(!data.skaters.some(p=>p.name==="Team Stats"));
 assert.ok(!data.goalies.some(p=>p.name==="Team Stats"));
});
test("team scoring sum is source-authoritative, never doubled",()=>{
 assert.equal(data.skaters.reduce((a,p)=>a+p.points,0),61);
 assert.equal(data.teamTotals.skaters.points,61);
 assert.equal(data.teamTotals.skaters.goals,23);
 assert.equal(data.teamTotals.skaters.assists,38);
 assert.equal(data.goalies.reduce((a,p)=>a+p.goalsAgainst,0),41);
 assert.equal(data.teamTotals.goalies.goalsAgainst,41);
});
test("roster has no direct source profile IDs, so no guess by name or jersey",()=>{
 assert.equal(data.counts.rosterWithoutPlayerId,28);
 assert.ok(data.roster.every(p=>p.htoPlayerId===null&&p.profileUrl===null));
 assert.ok(data.roster.some(p=>p.jersey===null));
 assert.ok(data.roster.some(p=>p.jersey===0));
});
test("skater and goalie player links use only directly visible HTO IDs",()=>{
 for(const p of [...data.skaters,...data.goalies]){
  assert.match(p.htoPlayerId,/^\d+$/);
  assert.match(p.profileUrl,new RegExp("playerID="+p.htoPlayerId+"$"));
 }
 assert.equal(data.counts.skatersWithoutPlayerId,0);
 assert.equal(data.counts.goaliesWithoutPlayerId,0);
});
test("roster name search and original position filter remain source literal",()=>{
 const found=engine.filteredRoster(data,"carosi");
 assert.ok(found.length>=1);assert.ok(found.every(x=>x.name.toLowerCase().includes("carosi")));
 const goalies=engine.filteredRoster(data,"","goalies");
 assert.ok(goalies.length>=1);assert.ok(goalies.every(x=>engine.rosterIsGoalie(x)));
 const skaters=engine.filteredRoster(data,"","skaters");
 assert.ok(skaters.every(x=>!engine.rosterIsGoalie(x)));
 assert.equal(goalies.length+skaters.length,28);
});
test("stat sorting, role separation and score fields are faithfully preserved",()=>{
 const skaters=engine.filteredStats(data,"skaters","","points");
 assert.equal(skaters[0].points,Math.max(...data.skaters.map(x=>x.points)));
 assert.ok(skaters.every(p=>p.goals+p.assists===p.points));
 const g=engine.filteredStats(data,"goalies","","gp");
 assert.ok(g.every((x,i)=>i===0||g[i-1].gp>=x.gp));
 const lowGaa=engine.filteredStats(data,"goalies","","gaa");
 assert.ok(lowGaa.every((x,i)=>i===0||lowGaa[i-1].gaa<=x.gaa));
});
test("PPG means verified power play goals; not points per game",()=>{
 assert.ok(data.skaters.some(p=>p.ppg>0));
 const player=data.skaters.find(p=>p.ppg>0);
 assert.ok(player.ppg<=player.goals);
 assert.ok(Number.isFinite(player.pointsPerGame));
 assert.match(data.fieldNotes.ppg,/power-play goals/i);
});
test("source naming differences are NOT silently reconciled into identity",()=>{
 assert.ok(data.roster.some(p=>p.name==="Provenzano, Mario"));
 assert.ok(data.skaters.some(p=>p.name==="Provenzano, Michael"));
 assert.equal(data.roster.find(p=>p.name==="Provenzano, Mario").htoPlayerId,null);
});
test("tampered source URL and changed season fail closed",()=>{
 const x=clone();x.sources.stats="https://fake.example/stats";
 assert.throws(()=>engine.validate(x),/HTO source URLs/);
 const y=clone();y.seasonKey="Winter_2027/2028";
 assert.throws(()=>engine.validate(y),/authority or schema/);
});
test("duplicate or forged player IDs never produce a certified source",()=>{
 const x=clone();x.skaters[1].htoPlayerId=x.skaters[0].htoPlayerId;
 x.skaters[1].profileUrl=x.skaters[0].profileUrl;
 assert.throws(()=>engine.validate(x),/Duplicate verified HTO ID/);
 const y=clone();y.roster[0].profileUrl="https://danger.example/steal";
 assert.throws(()=>engine.validate(y),/Unverified profile link/);
});
test("team aggregate cannot masquerade as a new player or double totals",()=>{
 const x=clone();x.skaters.push(x.teamTotals.skaters);
 x.counts.skaters+=1;x.counts.sourceSkaterRowsIncludingTeamTotal+=1;
 assert.throws(()=>engine.validate(x),/Invalid player row/);
 const y=clone();y.teamTotals.skaters.points+=1;
 assert.throws(()=>engine.validate(y),/aggregate totals disagree/);
});
test("malformed statistics and malicious string values trigger a source hold",()=>{
 const x=clone();x.skaters[0].pim="<img src=x onerror=alert(1)>";
 assert.throws(()=>engine.validate(x),/Invalid source integer/);
 const y=clone();y.goalies[0].gaa=-0.5;
 assert.throws(()=>engine.validate(y),/Invalid official goaltender/);
 const z=clone();z.counts.skaters=240;
 assert.throws(()=>engine.validate(z),/Row count inconsistency/);
});
test("published zero and absent jersey remain distinct",()=>{
 const named=data.roster.filter(p=>p.jersey===null);
 assert.ok(named.length>=1);
 assert.notEqual(named[0].jersey,0);
 assert.ok(data.roster.some(p=>p.jersey===0));
});
