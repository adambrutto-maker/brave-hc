const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const scout=require("../widgets/league-scouting.js");
const source=JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets/league-intelligence.json"),"utf8"));
const clone=v=>JSON.parse(JSON.stringify(v));
const cases=[
 ["covers each current Cristillo opponent exactly once",()=>{
  const names=scout.cristilloOpponents(source).map(x=>x.leagueName);
  const expected=source.teams.filter(x=>x.divisionNow==="The Cristillo Division"&&x.leagueName!=="Braves HC")
   .map(x=>x.leagueName).sort();
  assert.deepEqual([...names].sort(),expected);
  assert.equal(names.length,expected.length);
 }],
 ["Maplewolves source stats and approved head-to-head remain separate",()=>{
  const b=scout.build(source,"Maplewolves");
  const t=source.teams.find(x=>x.leagueName==="Maplewolves");
  const brave=source.teams.find(x=>x.leagueName==="Braves HC");
  assert.deepEqual(b.rec,t.record);
  assert.equal(b.gfRate,t.record.gf/t.record.gp);
  assert.equal(b.gaRate,t.record.ga/t.record.gp);
  assert.deepEqual(b.bravesH2H.record,t.bravesMatchHistory.bravesAllTime);
  assert.equal(b.context,t.strengthContext.contextIndex);
  assert.equal(b.bravesComparison.bravesIndex,brave.strengthContext.contextIndex);
  assert.equal(b.bravesComparison.difference,Number((b.context-b.bravesComparison.bravesIndex).toFixed(1)));
  assert.equal(b.noUpcomingFixtureVerified,true);
 }],
 ["recent fixtures must be source-provided, descending and at most five",()=>{
  const b=scout.build(source,"Maplewolves");
  const t=source.teams.find(x=>x.leagueName==="Maplewolves");
  assert.equal(b.recent.length,Math.min(5,t.completedGames.length));
  assert.ok(b.recent.every(x=>t.completedGames.some(y=>y.date===x.date &&
    y.opponent===x.opponent&&y.gf===x.gf&&y.ga===x.ga&&y.result===x.result)));
  assert.ok(b.recent.every((x,i,a)=>i===0||a[i-1].date>=x.date));
 }],
 ["WhatsApp brief accurately cites evidence and source boundaries",()=>{
  const b=scout.build(source,"Maplewolves"),message=scout.format(b);
  assert.ok(message.includes(b.rec.w+"–"+b.rec.l+"–"+b.rec.t+" in "+b.rec.gp+" GP"));
  assert.ok(message.includes(b.rec.gf+" GF / "+b.rec.ga+" GA"));
  assert.ok(message.includes(b.context.toFixed(1)+"/100"));
  assert.ok(message.includes(b.bravesH2H.record.w+"–"+b.bravesH2H.record.l+
    "–"+b.bravesH2H.record.t+" in "+b.bravesH2H.record.gp+" GP"));
  assert.ok(message.includes("No upcoming fixture or game date is asserted"));
  assert.ok(message.includes("NOT win probabilities"));
  assert.ok(message.includes("HTO Brave H.C. game verification may be ahead"));
 }],
 ["game-day WhatsApp message uses only source-reconciled scheduled fixture",()=>{
  const schedule=JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets/svhl-upcoming.json"),"utf8"));
  const game=schedule.games.find(g=>g.htoSyncStatus==="MATCH" &&
    source.teams.some(t=>t.leagueName.toLowerCase().replace(/[^a-z0-9]/g,"")===
        g.opponent.toLowerCase().replace(/[^a-z0-9]/g,"")));
  assert.ok(game,"accepted source contains at least one HTO synchronized SVHL game");
  const team=source.teams.find(t=>t.leagueName.toLowerCase().replace(/[^a-z0-9]/g,"")===
    game.opponent.toLowerCase().replace(/[^a-z0-9]/g,""));
  const b=scout.build(source,team.leagueName);
  const preview="https://www.hometeamsonline.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&sportsHQ=BRAVESHOCKEY&gameID="+game.htoGameId;
  const message=scout.format(b,{fixture:{...game,checkedAt:schedule.checkedAt,htoUrl:preview}});
  assert.ok(message.includes("VERIFIED GAME-DAY SCOUTING"));
  assert.ok(message.includes(game.date+" at "+game.time+" ET"));
  assert.ok(message.includes(game.rink)&&message.includes(game.side.toUpperCase()));
  assert.ok(message.includes("HTO synchronized game ID: "+game.htoGameId));
  assert.ok(message.includes("Goalie assignment:"));
  assert.ok(message.includes(b.rec.gf+" GF / "+b.rec.ga+" GA"));
  assert.ok(!message.includes("No upcoming fixture or game date is asserted"),
    "game-day version must not contradict its verified fixture");
 }],
 ["mismatched game-day opponent or HTO ID fails closed",()=>{
  const game={date:"2026-11-01",time:"20:15",opponent:"Mid Ice Crisis",
   rink:"D Rink",side:"away",
   fixtureSignature:"2026-11-01|20:15|Mid Ice Crisis|D Rink|away",
   checkedAt:"2026-10-26T20:00:00+00:00",
   htoSyncStatus:"MATCH",htoGameId:"3375683",assignmentKey:"hto:3375683",
   htoUrl:"https://www.hometeamsonline.com/teams/default.asp?gameID=3375683"};
  const b=scout.build(source,"Maplewolves");
  assert.throws(()=>scout.format(b,{fixture:game}),/SCOUT_SOURCE_HOLD/);
  game.opponent="Maplewolves";
  game.fixtureSignature="2026-11-01|20:15|Maplewolves|D Rink|away";
  game.assignmentKey="hto:INVALID";
  assert.throws(()=>scout.format(b,{fixture:game}),/SCOUT_SOURCE_HOLD/);
 }],
 ["no h2h means unavailable, not invented zero record",()=>{
  const d=clone(source);
  const t=d.teams.find(t=>t.leagueName==="Maplewolves");
  t.bravesMatchHistory={state:"NO_VERIFIED_BRAVES_MATCH_HISTORY"};
  const b=scout.build(d,t.leagueName);
  assert.equal(b.bravesH2H,null);
  assert.ok(scout.format(b).includes("no approved verified matchup"));
 }],
 ["self team is labeled baseline, not Braves versus Braves",()=>{
  const b=scout.build(source,"Braves HC");
  assert.equal(b.isBraves,true);assert.equal(b.bravesComparison,null);
  assert.equal(b.bravesH2H,null);
  assert.ok(scout.format(b).includes("Brave H.C. league-source baseline"));
 }],
 ["zero completed games cannot imply GF/GP, GA/GP or future results",()=>{
  const d=clone(source),t=d.teams.find(x=>x.leagueName==="Maplewolves");
  t.record={gp:0,w:0,l:0,t:0,pts:0,gf:0,ga:0};
  t.gamesConfirmed=0;t.completedGames=[];
  t.strengthContext={status:"INSUFFICIENT_COMPLETED_GAMES",contextIndex:null,
    currentForm:null,scheduleDifficulty:null,confidence:"NO_CURRENT_GAMES"};
  const b=scout.build(d,"Maplewolves");
  assert.equal(b.gfRate,null);assert.equal(b.gaRate,null);
  assert.equal(b.recent.length,0);assert.equal(b.context,null);
  assert.ok(scout.format(b).includes("Recent verified results (0 of 0): none recorded"));
 }],
 ["tampered GP or source status must fail closed",()=>{
  const d=clone(source),t=d.teams.find(x=>x.leagueName==="Maplewolves");
  t.gamesConfirmed+=1;
  assert.throws(()=>scout.build(d,"Maplewolves"),/SCOUT_SOURCE_HOLD/);
  d.teams.find(x=>x.leagueName==="Maplewolves").gamesConfirmed-=1;
  d.currentSourceDataConcordant=false;
  assert.throws(()=>scout.build(d,"Maplewolves"),/SCOUT_SOURCE_HOLD/);
 }],
 ["no source team can be silently invented or changed by rendering",()=>{
  const before=JSON.stringify(source);
  assert.throws(()=>scout.build(source,"Fictional Next Sunday"),/SCOUT_SOURCE_HOLD/);
  for(const t of source.teams)scout.build(source,t.leagueName);
  assert.equal(JSON.stringify(source),before);
 }]
];
let failed=0;
for(const [name,test] of cases){
 try{test();console.log("PASS",name)}
 catch(error){failed++;console.error("FAIL",name,error.stack||error)}
}
if(failed)process.exitCode=2;
else console.log("SCOUTING_SOURCE_TESTS_PASS",cases.length);
