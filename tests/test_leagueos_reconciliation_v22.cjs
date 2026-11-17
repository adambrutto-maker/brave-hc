/* Original BruTTech V22 source-integrity / negative assertions, no official writes. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),
 path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../widgets");
const payload=JSON.parse(fs.readFileSync(path.join(root,"leagueos-reconciliation-v22.json"),"utf8"));
const raw=fs.readFileSync(path.join(root,"leagueos-reconciliation-v22.js"),"utf8");
const storage={getItem:()=>null,setItem:()=>{}};
const env={window:{},document:{addEventListener:()=>{}},console,localStorage:storage};
vm.runInNewContext(raw,env,{filename:"leagueos-reconciliation-v22.js"});
const mod=env.window.LeagueOSReconciliationV22._test;
const clone=()=>JSON.parse(JSON.stringify(payload));
const cases=cat=>payload.cases.filter(c=>c.category===cat);
test("source artifact validates its schema, authority and unmodified input",()=>{
 const text=JSON.stringify(payload);
 assert.equal(mod.validate(payload),payload);
 assert.equal(JSON.stringify(payload),text);
 assert.equal(payload.mode,"PUBLIC_DEMO_SOURCE_REVIEW_ONLY");
 assert.equal(payload.authenticatedReviewAvailable,false);
});
test("full public SVHL registry evidence remains 411, with 335 complete, 66 future and 10 holds",()=>{
 assert.equal(payload.counts.leagueRegistry,411);
 assert.equal(payload.counts.completedLeague,335);
 assert.equal(payload.counts.futureLeague,66);
 assert.equal(payload.counts.heldLeague,10);
 assert.equal(335+66+10,411);
});
test("only eight cross-system public parity cases; 16 review holds stay held",()=>{
 assert.equal(payload.counts.observedPublicParity,8);
 assert.equal(payload.counts.reviewQueue,16);
 assert.equal(payload.cases.length,24);
 assert.equal(payload.cases.filter(c=>c.reviewRequired).length,16);
 assert.equal(payload.cases.filter(c=>!c.reviewRequired).length,8);
});
test("seven exact completed cross-source observations retain unapproved mapping",()=>{
 const records=cases("PUBLIC_COMPLETED_PARITY_OBSERVED");
 assert.equal(records.length,7);
 for(const c of records){
  assert.equal(c.scoreParity,true);
  assert.equal(c.matchedBy,"EXACT_LITERAL_TUPLE");
  assert.equal(c.crossSystemIdBinding,"NOT_OFFICIALLY_AUTHORIZED");
  assert.equal(c.officialWriteAllowed,false);
  assert.ok(c.htoGameId&&c.leagueGameId);
 }
});
test("Nov 22 upcoming HTO #3375686 matches source 128129 only as observed public parity",()=>{
 const rows=cases("PUBLIC_FUTURE_PARITY_OBSERVED");
 assert.equal(rows.length,1);
 const p=rows[0];
 assert.equal(p.htoGameId,"3375686");assert.equal(p.leagueGameId,128129);
 assert.equal(p.date,"2026-11-22");assert.equal(p.time,"20:00");
 assert.equal(p.rinkParity,true);
 assert.equal(p.supplementalStatus,"MATCH");
 assert.equal(p.reviewRequired,false);
 assert.equal(p.crossSystemIdBinding,"NOT_OFFICIALLY_AUTHORIZED");
});
test("Sep 27 Mohawks punctuation discrepancy is explicitly held, not silently joined",()=>{
 const rows=cases("NAME_ALIAS_REVIEW_HOLD");
 assert.equal(rows.length,1);
 const c=rows[0];assert.equal(c.leagueGameId,127728);
 assert.equal(c.htoGameId,"3356178");
 assert.equal(c.matchedBy,"CONTROLLED_ALIAS_REVIEW_ONLY");
 assert.equal(c.scoreParity,true);
 assert.equal(c.reviewRequired,true);
 assert.equal(c.opponent,"Mohawks HC");
 assert.match(c.explanation,/identity needs source confirmation/);
});
test("Dec 6 proposal reuses already-completed Nov 1 HTO ID; blocked",()=>{
 const rows=cases("HISTORICAL_HTO_ID_REUSED_HOLD");
 assert.equal(rows.length,1);
 const c=rows[0];
 assert.equal(c.date,"2026-12-06");
 assert.equal(c.htoGameId,"3375683");
 assert.equal(c.referencedHtoGameDate,"2026-11-01");
 assert.equal(c.referencedHtoGameStatus,"COMPLETED_HTO_BOX_SCORE");
 assert.equal(c.leagueGameId,null);
 assert.equal(c.priority,"CRITICAL");
 assert.equal(c.reviewRequired,true);
});
test("four future supplemental assignments have neither confirmed HTO ID nor canonical fixture",()=>{
 const rows=cases("SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD");
 assert.equal(rows.length,4);
 assert.deepEqual(rows.map(c=>c.date).sort(),["2026-11-29","2026-12-13","2026-12-20","2026-12-27"]);
 assert.ok(rows.every(c=>c.htoGameId===null&&c.leagueGameId===null&&c.reviewRequired));
});
test("all ten unresolved past 0:0 league source rows have no accepted final score",()=>{
 const rows=cases("LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD");
 assert.equal(rows.length,10);
 assert.ok(rows.every(c=>c.caseType==="UNRESOLVED_LEAGUE_RESULT"&&
 c.leagueScore===null&&c.htoScore===null&&c.reviewRequired));
 assert.ok(rows.some(c=>c.night==="Sunday"));
 assert.ok(rows.some(c=>c.night==="Tuesday"));
 assert.ok(rows.some(c=>c.night==="Thursday"));
});
test("source provenance includes bounded SHA-256 and separate capture dates",()=>{
 for(const s of ["league","hto","upcoming"]){
  assert.match(payload.inputs[s].sha256,/^[a-f0-9]{64}$/);
  assert.match(payload.inputs[s].file,/\.json$/);
  assert.ok(payload.inputs[s].capturedAt);
 }
 assert.equal(payload.inputs.league.capturedAt,"2026-11-16");
});
test("trusted public links are host-restricted and not javascript or lookalike domains",()=>{
 for(const c of payload.cases)for(const link of c.links)assert.ok(mod.allowedLink(link.href),link.href);
 for(const u of ["javascript:alert(1)","https://leagues.sportsvillage.ca.evil.test/gameinfo.aspx?x=1",
  "http://leagues.sportsvillage.ca/gameinfo.aspx?gameid=1",
  "https://www.htosports.com.evil.test/teams/default.asp?p=stats",
  "https://example.com","https://leagues.sportsvillage.ca/gameinfo.aspx?<script>"])
  assert.equal(mod.allowedLink(u),false,u);
});
test("review filter never hides held cases by treating local note as approval",()=>{
 const rows=mod.filterCases(payload,{view:"review",query:"",night:"all",priority:"all"});
 assert.equal(rows.length,16);
 assert.ok(rows.every(c=>c.reviewRequired));
});
test("public parity filter only shows non-authorized observed evidence",()=>{
 const rows=mod.filterCases(payload,{view:"observed",query:"",night:"all",priority:"all"});
 assert.equal(rows.length,8);
 assert.ok(rows.every(c=>!c.reviewRequired&&c.crossSystemIdBinding==="NOT_OFFICIALLY_AUTHORIZED"));
});
test("future and league hold filters are independently useful",()=>{
 assert.equal(mod.filterCases(payload,{view:"proposals",query:"",night:"all",priority:"all"}).length,5);
 assert.equal(mod.filterCases(payload,{view:"league",query:"",night:"all",priority:"all"}).length,10);
 assert.equal(mod.filterCases(payload,{view:"pilot",query:"",night:"all",priority:"all"}).length,9);
});
test("case search supports exact HTO IDs and strict opponent strings",()=>{
 const q=mod.filterCases(payload,{view:"all",query:"3375683",night:"all",priority:"all"});
 assert.ok(q.length>=2);
 assert.ok(q.some(c=>c.id.includes("proposal:2026-12-06")));
 const m=mod.filterCases(payload,{view:"all",query:"mohawks",night:"all",priority:"all"});
 assert.ok(m.length>=2);
});
test("critical filter finds the historical ID reuse collision",()=>{
 const q=mod.filterCases(payload,{view:"review",query:"",night:"all",priority:"CRITICAL"});
 assert.equal(q.length,1);
 assert.equal(q[0].category,"HISTORICAL_HTO_ID_REUSED_HOLD");
});
test("all cases have unique source-stable IDs and no official write capability",()=>{
 assert.equal(new Set(payload.cases.map(c=>c.id)).size,payload.cases.length);
 assert.ok(payload.cases.every(c=>c.officialWriteAllowed===false));
 assert.ok(payload.cases.every(c=>c.crossSystemIdBinding==="NOT_OFFICIALLY_AUTHORIZED"));
});
test("tampering with an officialWriteAllowed bit fails the source gate",()=>{
 const x=clone();x.cases[0].officialWriteAllowed=true;
 assert.throws(()=>mod.validate(x),/Reconciliation case failed validation/);
 const y=clone();y.authenticatedReviewAvailable=true;
 assert.throws(()=>mod.validate(y),/authority\/schema/);
});
test("case status cannot be promoted by deleting HOLD without reclassification evidence",()=>{
 const x=clone();x.cases.find(c=>c.reviewRequired).reviewRequired=false;
 assert.throws(()=>mod.validate(x),/source hold cannot be relabeled/);
});
test("tampered totals, duplicates, and untrusted links fail validation",()=>{
 const a=clone();a.counts.reviewQueue--;
 assert.throws(()=>mod.validate(a),/Source evidence counts inconsistent/);
 const b=clone();b.cases[0].id=b.cases[1].id;
 assert.throws(()=>mod.validate(b),/Reconciliation case failed validation/);
 const c=clone();c.cases[0].links[0].href="https://evil.example/";
 assert.throws(()=>mod.validate(c),/Reconciliation case failed validation/);
});
test("derived parity labels cannot hide changed score or future HTO state",()=>{
 const a=clone(),match=a.cases.find(c=>c.category==="PUBLIC_COMPLETED_PARITY_OBSERVED");
 match.htoScore.club+=1;
 assert.throws(()=>mod.validate(a),/Completed public parity cannot bypass source evidence/);
 const b=clone(),future=b.cases.find(c=>c.category==="PUBLIC_FUTURE_PARITY_OBSERVED");
 future.htoState="COMPLETED_HTO_BOX_SCORE";
 assert.throws(()=>mod.validate(b),/Future public parity cannot bypass HTO preview evidence/);
 const c=clone(),alias=c.cases.find(c=>c.category==="NAME_ALIAS_REVIEW_HOLD");
 alias.matchedBy="EXACT_LITERAL_TUPLE";
 assert.throws(()=>mod.validate(c),/Name alias requires original held source evidence/);
 const e=clone(),reused=e.cases.find(c=>c.category==="HISTORICAL_HTO_ID_REUSED_HOLD");
 reused.referencedHtoGameDate=reused.date;
 assert.throws(()=>mod.validate(e),/Historical ID reuse cannot be hidden/);
});
test("held 0–0 cannot be forged into official W-L-T",()=>{
 const x=clone(),hold=x.cases.find(c=>c.caseType==="UNRESOLVED_LEAGUE_RESULT");
 hold.leagueScore={club:0,opponent:0};
 assert.throws(()=>mod.validate(x),/Held 0-0 source must never be scored/);
});
test("local review storage tolerates corrupt data and rejects unsafe statuses",()=>{
 const get=(x)=>({getItem:()=>x});
 assert.equal(Object.keys(mod.storageSnapshot(get("{broken"))).length,0);
 assert.equal(Object.keys(mod.storageSnapshot(get(JSON.stringify({version:99,notes:{a:{}}})))).length,0);
 const good={version:1,notes:{
  "case-valid":{status:"source_needed",note:"Review source",sourceDigest:["a","b","c"].map(x=>x.repeat(64)).join("|")},
  "case-invalid":{status:"approved",note:"Not allowed",sourceDigest:["a","b","c"].map(x=>x.repeat(64)).join("|")}
 }};
 const snapshot=mod.storageSnapshot(get(JSON.stringify(good)));
 assert.equal(Object.keys(snapshot).length,1);
 assert.equal(snapshot["case-valid"].status,"source_needed");
});
test("browser-local notes are revision-bound to all three source inputs",()=>{
 const a=mod.reviewDigest(payload),different=clone();
 assert.equal(a.split("|").length,3);
 assert.equal(a.split("|")[0],payload.inputs.league.sha256);
 different.inputs.hto.sha256="b".repeat(64);
 assert.notEqual(mod.reviewDigest(different),a);
 different.inputs.hto.sha256=payload.inputs.hto.sha256;
 different.inputs.upcoming.sha256="c".repeat(64);
 assert.notEqual(mod.reviewDigest(different),a);
});
test("no source outputs include private signoff authority, payments or standings mutations",()=>{
 assert.equal(payload.mode,"PUBLIC_DEMO_SOURCE_REVIEW_ONLY");
 assert.equal(payload.officialWriteAllowed,false);
 assert.equal(payload.authenticatedReviewAvailable,false);
 assert.ok(payload.cases.every(c=>c.sourceWarning&&!c.sourceWarning.includes("APPROVED BY COMMISSIONER")));
});
