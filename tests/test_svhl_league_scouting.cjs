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
  assert.equal(names.length,7);
 }],
 ["Maplewolves source stats and approved head-to-head remain separate",()=>{
  const b=scout.build(source,"Maplewolves");
  assert.equal(b.rec.gp,4);assert.equal(b.rec.gf,9);assert.equal(b.rec.ga,17);
  assert.equal(b.gfRate,2.25);assert.equal(b.gaRate,4.25);
  assert.equal(b.bravesH2H.record.gp,10);
  assert.equal(b.bravesH2H.record.w,3);
  assert.equal(b.bravesH2H.record.l,6);
  assert.equal(b.bravesH2H.record.t,1);
  assert.equal(b.context,37.2);assert.equal(b.bravesComparison.bravesIndex,36.5);
  assert.equal(b.bravesComparison.difference,0.7);
  assert.equal(b.noUpcomingFixtureVerified,true);
 }],
 ["recent fixtures must be source-provided, descending and at most five",()=>{
  const b=scout.build(source,"Maplewolves");
  assert.equal(b.recent.length,4);
  assert.deepEqual(b.recent.map(x=>x.opponent).sort(),
   ["Primary Auto","Butcher Brothers","Mighty Drunks","Young Guns"].sort());
  assert.ok(b.recent.every((x,i,a)=>i===0||a[i-1].date>=x.date));
 }],
 ["WhatsApp brief accurately cites evidence and source boundaries",()=>{
  const b=scout.build(source,"Maplewolves"),message=scout.format(b);
  assert.ok(message.includes("0–4–0 in 4 GP"));
  assert.ok(message.includes("9 GF / 17 GA"));
  assert.ok(message.includes("37.2/100"));
  assert.ok(message.includes("3–6–1 in 10 GP"));
  assert.ok(message.includes("No upcoming fixture or game date is asserted"));
  assert.ok(message.includes("NOT win probabilities"));
  assert.ok(message.includes("HTO Brave H.C. game verification may be ahead"));
 }],
 ["no h2h means unavailable, not invented zero record",()=>{
  const t=source.teams.find(t=>t.bravesMatchHistory?.state==="NO_VERIFIED_BRAVES_MATCH_HISTORY");
  assert.ok(t);
  const b=scout.build(source,t.leagueName);
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
