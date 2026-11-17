/* Independent V18 contract tests. No network calls or HTO access. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const dir=path.resolve(__dirname,"../widgets");
function harness(file,stored={}){
 const data=new Map(Object.entries(stored)),listeners={};
 const storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v))};
 const scope={window:{},document:{addEventListener:(n,f)=>{listeners[n]=f;}},
   localStorage:storage,console,fetch(){throw Error("No network calls permitted in unit tests")}};
 vm.runInNewContext(fs.readFileSync(path.join(dir,file),"utf8"),scope,{filename:file});
 return{api:scope.window,storage,listeners,data};
}
const scorerFile="leagueos-native-scorer-v15.js",bridgeFile="leagueos-team-bridge-v18.js";
const makeFixture=()=>({game_id:128129,status:"FUTURE_RECIPROCAL_FIXTURE",
 night:"Sunday",home:"Braves HC",away:"Dateline Predators",date:"2026-11-22",time:"20:00",rink:"A"});
const draft=(result={home:2,away:1,decision:"regulation",saved:true})=>({
 result,events:[
  {kind:"goal",side:"home",jersey:"19",assists:["8","27"],time:"10:00"},
  {kind:"goal",side:"home",jersey:"19",assists:[],time:"09:00"},
  {kind:"goal",side:"away",jersey:"41",assists:[],time:"08:00"},
  {kind:"shot",side:"home",jersey:"19",time:"07:00"},
  {kind:"penalty",side:"home",jersey:"27",penalty:2,time:"05:00"}
 ],teamStats:{home:{ppo:2,ppg:1},away:{ppo:2,ppg:1}}
});
test("saved Brave demo result qualifies using exact fixture evidence",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 const x=b.qualify(makeFixture(),draft());
 assert.equal(x.fixture.game_id,128129);assert.equal(x.side,"home");
 assert.equal(x.eventReview.code,"EVENT_COUNTS_MATCH");
 assert.equal(x.power.ppPercent,50);assert.equal(x.power.pkPercent,50);
 assert.equal(x.players.find(p=>p.jersey==="19").pts,2);
 assert.equal(x.players.find(p=>p.jersey==="8").a,1);
 assert.equal(x.players.find(p=>p.jersey==="27").pim,2);
});
test("unsaved scores and completed official games are never treated as imports",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 assert.equal(b.qualify(makeFixture(),draft({home:2,away:1,saved:false})),null);
 assert.equal(b.qualify({...makeFixture(),status:"COMPLETED_SOURCE_VERIFIED"},draft()),null);
 assert.equal(b.qualify({...makeFixture(),home:"Other Club"},draft()),null);
 assert.equal(b.qualify(makeFixture(),draft({home:-1,away:2,saved:true})),null);
});
test("conflicting goal detail and final result are reported, not overridden",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 const d=draft({...draft().result,home:3});
 const r=b.reconcile(d);
 assert.equal(r.code,"EVENT_CONFLICT");assert.equal(r.match,false);
});
test("explicit zero opportunities stays zero; missing input stays unknown",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 const z=b.powerPlaySummary({teamStats:{home:{ppo:0,ppg:0},away:{ppo:null,ppg:null}}},"home");
 assert.equal(z.ppo,0);assert.equal(z.ppg,0);assert.equal(z.ppPercent,null);
 const blank=b.powerPlaySummary({teamStats:{home:{},away:{}}},"home");
 assert.equal(blank.ppo,null);assert.equal(blank.ppg,null);assert.equal(blank.pkPercent,null);
});
test("team special-teams inputs validate power-play goals against opportunities and score",()=>{
 const s=harness(scorerFile).api.LeagueOSNativeScorerV15._test;
 const score={home:2,away:1};
 assert.equal(s.teamStatsValidation({home:{ppo:2,ppg:1},away:{ppo:0,ppg:0}},score),"");
 assert.match(s.teamStatsValidation({home:{ppo:0,ppg:1},away:{ppo:null,ppg:null}},score),/cannot exceed opportunities/);
 assert.match(s.teamStatsValidation({home:{ppo:4,ppg:3},away:{ppo:null,ppg:null}},score),/final goal total/);
 assert.match(s.teamStatsValidation({home:{ppo:null,ppg:-1},away:{ppo:null,ppg:null}},score),/whole number/);
});
test("same-total, swapped-team goals still produce a conflict magnitude",()=>{
 const d={version:15,night:"Sunday",fixtureId:128129,
  drafts:{"128129":{events:[{kind:"goal",side:"home"},{kind:"goal",side:"home"}],
    result:{home:0,away:2,decision:"regulation",saved:true},changes:[]}}};
 const s=harness(scorerFile,{"leagueos-v15-scorer-demo":JSON.stringify(d)}).api.LeagueOSNativeScorerV15._test;
 const c=s.resultComparison({home:0,away:2});assert.equal(c.status,"UNRECONCILED_EVENTS");assert.equal(c.unlinked,4);
});
test("post-save goal correction invalidates saved score before TeamOS can display it",()=>{
 const d={version:15,night:"Sunday",fixtureId:128129,
  drafts:{"128129":{events:[{kind:"goal",side:"home"}],changes:[],
    result:{home:1,away:0,decision:"regulation",saved:true,reviewed:true}}}};
 const h=harness(scorerFile,{"leagueos-v15-scorer-demo":JSON.stringify(d)});
 const s=h.api.LeagueOSNativeScorerV15._test;
 s.log("ADD",{id:"new-goal"});
 assert.equal(s.draft().result.saved,false);
 assert.equal(s.draft().result.reviewed,false);
 assert.ok(h.data.get("leagueos-v15-scorer-demo").includes('"saved":false'));
});
test("anonymous or malicious jersey strings never turn into verified player identities",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 const players=b.playerRows({events:[
  {kind:"goal",side:"home",jersey:"<img src=x>",assists:["8","8","19"]},
  {kind:"goal",side:"home",jersey:"19",assists:["19","8"]}
 ]},"home");
 assert.equal(players.some(p=>p.jersey.includes("<")),false);
 assert.equal(players.find(p=>p.jersey==="8").a,2);
 assert.equal(players.find(p=>p.jersey==="19").g,1);
});
test("malformed local-storage snapshots fail closed",()=>{
 const b=harness(bridgeFile).api.LeagueOSTeamBridgeV18._test;
 assert.equal(Object.keys(b.storageSnapshot({getItem:()=>"{bad-json"})).length,0);
 assert.equal(Object.keys(b.storageSnapshot({getItem:()=>JSON.stringify({version:14,drafts:{"1":{}}})})).length,0);
});
