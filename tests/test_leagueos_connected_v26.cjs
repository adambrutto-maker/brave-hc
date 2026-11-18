/* V26 fictional Connected LeagueOS / TeamOS / HockeyOS contract and interaction tests.
 * Security contract: only fictitious browser-local records; no official writes.
 */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const seed=JSON.parse(fs.readFileSync(path.join(root,"leagueos-connected-fictional-v26.json"),"utf8"));
const env={window:{},document:{addEventListener:()=>{}},localStorage:{getItem:()=>null},
 console};
vm.runInNewContext(fs.readFileSync(path.join(root,"leagueos-connected-demo-v26.js"),"utf8"),
 env,{filename:"leagueos-connected-demo-v26.js"});
const api=env.window.LeagueOSConnectedV26._test;
const clone=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b)=>assert.deepEqual(clone(a),b);
const apply=(state,action,args={},ms=1763424000000)=>api.applyAction(state,seed,action,args,ms);
const want=(state,action,args={},ms)=>{const r=apply(state,action,args,ms);assert.equal(r.ok,true,action+": "+r.message);return r.state};
test("approved source brief retained and fictional seed identifies five product/safety boundaries",()=>{
 assert.equal(api.validateSeed(seed),seed);
 assert.equal(seed.mode,"FICTIONAL_BROWSER_LOCAL_PRODUCT_WALKTHROUGH_ONLY");
 assert.equal(seed.authorization.authenticatedUsers,false);
 assert.equal(seed.authorization.officialScheduleWrite,false);
 assert.equal(seed.authorization.paymentProcessing,false);
 assert.equal(seed.authorization.scoreSheetSignature,false);
 assert.equal(seed.authorization.verifiableQRToken,false);
 assert.equal(seed.authorization.liveLeagueMessaging,false);
 assert.equal(seed.plannedServices.realAccountLogin,"NOT_CONNECTED");
});
test("24 fictional source teams with independent StrengthAssessment and DivisionInstance",()=>{
 assert.equal(seed.teams.length,24);
 assert.equal(new Set(seed.teams.map(t=>t.id)).size,24);
 equal(seed.divisionInstancesCurrent.map(g=>g.teamIds.length),[12,12]);
 assert.ok(seed.teams.every(t=>t.fictional&&t.strengthAssessment.approved===false));
 assert.ok(seed.divisionInstancesCurrent.every(d=>!Object.hasOwn(d,"strengthLevel")));
});
test("default recommended A North 8, A South 9, D Recreational 7; no artificial B/C",()=>{
 const p=api.recommend(seed);
 equal(p.groups.map(g=>g.name),["A North","A South","D Recreational"]);
 equal(p.groups.map(g=>g.teamIds.length),[8,9,7]);
 equal(p.groups.map(g=>g.strengthLevel),["A","A","D"]);
 assert.equal(p.heldTeams,0);
 assert.equal(p.gradeCounts.A,17);assert.equal(p.gradeCounts.D,7);
 assert.equal(p.gradeCounts.B,0);assert.equal(p.gradeCounts.C,0);
 assert.ok(p.groups.every(g=>g.strengthAssessmentApproved===false&&
  g.divisionInstanceStatus==="UNAPPROVED_FICTIONAL_PROPOSAL"));
});
test("fictional target size may change number of A divisions without inventing grades",()=>{
 const p=api.recommend(seed,{targetSize:6});
 equal(p.groups.map(g=>g.teamIds.length),[5,6,6,7]);
 assert.equal(p.groups.filter(g=>g.strengthLevel==="A").length,3);
 assert.equal(p.groups.filter(g=>g.strengthLevel==="D").length,1);
 assert.equal(p.groups.some(g=>["B","C"].includes(g.strengthLevel)),false);
});
test("fictional what-if A->D retains all source teams and changes eight/eight/eight",()=>{
 const p=api.recommend(seed,{targetSize:9,overrides:{"FIC-A-01":"D"}});
 equal(p.groups.map(g=>g.teamIds.length),[8,8,8]);
 assert.equal(p.heldTeams,0);
 const all=p.groups.flatMap(g=>g.teamIds);
 assert.equal(new Set(all).size,24);
});
test("single fictional B team is held instead of inventing a one-team B division",()=>{
 const p=api.recommend(seed,{targetSize:9,overrides:{"FIC-A-01":"B"}});
 assert.equal(p.holds.length,1);assert.equal(p.holds[0].grade,"B");
 assert.equal(p.heldTeams,1);
 assert.equal(p.groups.some(g=>g.strengthLevel==="B"),false);
 assert.equal(p.ratedTeams+p.heldTeams,24);
});
test("group proposal rejects unsupported target, team IDs, and grades",()=>{
 assert.throws(()=>api.recommend(seed,{targetSize:4}),/five|5–10/);
 assert.throws(()=>api.recommend(seed,{overrides:{"not-real":"A"}}),/Invalid/);
 assert.throws(()=>api.recommend(seed,{overrides:{"FIC-A-01":"Z"}}),/Invalid/);
});
test("mixed original divisions have higher fictional strength mismatch than new same-grade groups",()=>{
 const current=api.strengthMismatch(seed,seed.divisionInstancesCurrent.map(g=>g.teamIds));
 const next=api.strengthMismatch(seed,api.recommend(seed).groups.map(g=>g.teamIds));
 assert.ok(current>next*2,"Expected a clearly more balanced fictional 17 A, seven D illustration");
});
test("round robin fixture draft has unique participation per week and no arena bookings",()=>{
 const p=api.recommend(seed),games=api.scheduleDraft(seed,p,13,2);
 assert.equal(games.length,22); // 11 games/week for 8+9+7; byes remain explicit
 const ids=new Set(seed.teams.map(t=>t.id));
 for(const game of games){
  assert.equal(game.date,null);assert.equal(game.rink,null);assert.equal(game.time,null);
  assert.equal(game.status,"FICTIONAL_UNSLOTTED_DRAFT");
  assert.equal(game.officialScheduleWrite,false);
  assert.ok(ids.has(game.homeTeamId)&&ids.has(game.awayTeamId));
  assert.notEqual(game.homeTeamId,game.awayTeamId);
 }
 for(const week of [13,14]){
  const participants=new Set();
  for(const game of games.filter(x=>x.week===week)){
   assert.ok(!participants.has(game.homeTeamId));
   assert.ok(!participants.has(game.awayTeamId));
   participants.add(game.homeTeamId);participants.add(game.awayTeamId);
  }
  assert.equal(participants.size,22); // one bye in each odd division
 }
});
test("local blank state is read-only and valid for the independent fictional seed",()=>{
 const s=api.newState();
 assert.equal(api.validateState(s,seed),true);
 assert.equal(s.decision.status,"UNREVIEWED");
 assert.equal(s.publication.status,"NOT_PUBLISHED");
 assert.equal(s.player.receipt,null);
 assert.equal(s.gameDay.attestation,null);
});
test("week five commissioner review and fictional public plan remain separate approvals",()=>{
 let s=api.newState();
 s=want(s,"REVIEW");
 assert.equal(s.decision.status,"SIMULATED_REVIEWED");
 assert.equal(s.publication.status,"NOT_PUBLISHED");
 assert.equal(s.audit[0].official,false);
 s=want(s,"PUBLISH");
 assert.equal(s.publication.status,"FICTIONAL_PUBLIC_PREVIEW");
 equal(s.publication.divisions.map(x=>x.teamIds.length),[8,9,7]);
 assert.equal(api.validateState(s,seed),true);
});
test("no official division decision may occur at weeks 6, 11 or 13+",()=>{
 for(const week of [6,11,13,22]){
  let s=want(api.newState(),"WEEK",{week});
  assert.equal(apply(s,"REVIEW").ok,false);
  assert.equal(apply(s,"PUBLISH").ok,false);
 }
});
test("second midseason review can revise fictional week-five publication, then locks",()=>{
 let s=want(api.newState(),"REVIEW");
 s=want(s,"PUBLISH");
 s=want(s,"WEEK",{week:12});
 s=want(s,"TARGET",{target:6});
 assert.equal(s.publication.version,1);
 assert.equal(s.decision.status,"UNREVIEWED");
 s=want(s,"REVIEW");assert.equal(s.decision.version,2);
 s=want(s,"PUBLISH");
 assert.equal(s.publication.version,2);
 equal(s.publication.divisions.map(g=>g.teamIds.length),[5,6,6,7]);
 s=want(s,"WEEK",{week:13});
 assert.equal(apply(s,"TARGET",{target:9}).ok,false);
 assert.equal(apply(s,"GRADE",{teamId:"FIC-A-02",grade:"D"}).ok,false);
 assert.equal(apply(s,"REVIEW").ok,false);
});
test("insufficient single B group cannot be commissioner-reviewed automatically",()=>{
 let s=want(api.newState(),"GRADE",{teamId:"FIC-A-01",grade:"B"});
 assert.equal(apply(s,"REVIEW").ok,false);
});
test("captain reminders and spare goalie poll do not contact external users",()=>{
 let s=want(api.newState(),"REMIND");
 s=want(s,"GOALIE_POLL");
 assert.equal(s.captain.reminders,1);
 assert.equal(s.captain.goaliePoll,"OPEN_FOR_DEMO");
 assert.equal(s.audit.every(x=>x.official===false),true);
});
test("team artwork is pending until a separate fictional league approval",()=>{
 let s=want(api.newState(),"LOGO_SUBMIT",{choice:"Wolf Crest",colour:"Teal"});
 assert.equal(s.captain.logoStatus,"PENDING_DEMO_MODERATION");
 assert.equal(s.captain.approvedLogo,null);
 s=want(s,"LOGO_APPROVE");
 assert.equal(s.captain.logoStatus,"APPROVED_FICTIONAL");
 equal(s.captain.approvedLogo,{name:"Wolf Crest",colour:"Teal"});
 assert.equal(api.validateState(s,seed),true);
});
test("invalid logo or fabricated moderator state is rejected",()=>{
 assert.equal(apply(api.newState(),"LOGO_APPROVE").ok,false);
 assert.equal(apply(api.newState(),"LOGO_SUBMIT",{choice:"https://evil.test/logo",colour:"Navy"}).ok,false);
 const fake=api.newState();fake.captain.logoStatus="APPROVED_FICTIONAL";
 fake.captain.approvedLogo={name:"Phishing",colour:"Navy"};
 assert.equal(api.validateState(fake,seed),false);
});
test("captain question and commissioner reply are local with length checks",()=>{
 let s=want(api.newState(),"ASK_LEAGUE",{text:"When does the final review become locked?"});
 s=want(s,"REPLY",{text:"This demo locks after week twelve."});
 assert.equal(s.captain.requestStatus,"FICTIONAL_RESOLVED");
 assert.equal(s.captain.reply,"This demo locks after week twelve.");
 assert.equal(apply(s,"REPLY",{text:"another"}).ok,false);
 assert.equal(apply(api.newState(),"ASK_LEAGUE",{text:"x"}).ok,false);
});
test("player registration, waiver, receipt require sequence and charge zero",()=>{
 let s=api.newState();
 assert.equal(apply(s,"WAIVER").ok,false);
 assert.equal(apply(s,"RECEIPT").ok,false);
 s=want(s,"REGISTER");s=want(s,"WAIVER");s=want(s,"RECEIPT");
 assert.equal(s.player.registration,"FICTIONAL_REGISTRATION_RECORDED");
 assert.equal(s.player.receipt.reference,"FIC-NOCHARGE-001");
 assert.equal(s.player.receipt.amountCharged,0);
 assert.equal(s.player.receipt.processor,"NONE");
 assert.equal(api.validateState(s,seed),true);
});
test("no upgrade gates core RSVP; fictional response is shared between roles",()=>{
 let s=want(api.newState(),"RSVP",{response:"IN"});
 assert.equal(s.player.rsvp,"IN");
 assert.equal(s.captain.reminders,0);
 assert.equal(apply(s,"RSVP",{response:"INVALID"}).ok,false);
});
test("QR check-in is denied without fictional registration, waiver and IN response",()=>{
 let s=want(api.newState(),"QR_ISSUE",{},1000);
 assert.equal(apply(s,"QR_SCAN",{},2000).ok,false);
 s=want(s,"REGISTER",{},2000);s=want(s,"WAIVER",{},2100);
 assert.equal(apply(s,"QR_SCAN",{},2200).ok,false);
 s=want(s,"RSVP",{response:"IN"},2300);
 assert.equal(apply(s,"QR_SCAN",{},2400).ok,true);
});
test("expired QR and replay are blocked; scorekeeper review does not sign a game sheet",()=>{
 let s=api.newState(),t=1763424000000;
 s=want(s,"REGISTER",{},t);s=want(s,"WAIVER",{},t);
 s=want(s,"RSVP",{response:"IN"},t);
 s=want(s,"QR_ISSUE",{},t);
 assert.equal(apply(s,"QR_SCAN",{},t+180000).ok,false);
 s=want(s,"QR_SCAN",{},t+1000);
 assert.equal(s.gameDay.attestation.status,"ATTENDANCE_PENDING_SCOREKEEPER_REVIEW");
 assert.equal(apply(s,"QR_SCAN",{},t+2000).ok,false);
 s=want(s,"SCOREKEEPER_REVIEW",{},t+2200);
 assert.equal(s.gameDay.attestation.status,"FICTIONAL_SCOREKEEPER_REVIEWED_NOT_SIGNED");
 assert.equal(s.gameDay.attestation.officialSignature,false);
 assert.equal(apply(s,"SCOREKEEPER_REVIEW",{},t+2300).ok,false);
});
test("manual exception never claims verified attendance or official signed eligibility",()=>{
 const s=want(api.newState(),"MANUAL_EXCEPTION");
 assert.equal(s.gameDay.manualException.status,"OFFLINE_EXCEPTION_PENDING_MANUAL_REVIEW");
 assert.equal(s.gameDay.manualException.officialSignature,false);
 assert.equal(s.gameDay.attestation,null);
 assert.equal(apply(s,"MANUAL_EXCEPTION").ok,false);
});
test("browser-local forged charges, signatures, approvals and event actors fail closed",()=>{
 const mutations=[
  s=>{s.player.receipt={kind:"SAMPLE_RECEIPT_NO_CHARGE",amountCharged:25,processor:"NONE",reference:"FIC-NOCHARGE-001"}},
  s=>{s.gameDay.attestation={status:"FICTIONAL_SCOREKEEPER_REVIEWED_NOT_SIGNED",
   gameId:seed.fictitiousGame.id,playerId:"FIC-PLAYER-01",officialSignature:true}},
  s=>{s.audit.push({actor:"OFFICIAL_REFEREE",action:"SIGNED",at:new Date().toISOString(),official:true})},
  s=>{s.publication={status:"FICTIONAL_PUBLIC_PREVIEW",divisions:seed.divisionInstancesCurrent}},
 ];
 for(const change of mutations){
  const s=api.newState();change(s);
  assert.equal(api.validateState(s,seed),false);
 }
});
test("invalid saved browser state is ignored and a fresh fictional story is restored",()=>{
 const s=api.newState();s.player.receipt={kind:"SAMPLE_RECEIPT_NO_CHARGE",
  reference:"FIC-NOCHARGE-001",amountCharged:200,processor:"NONE"};
 const storage={getItem:()=>JSON.stringify(s)};
 const restored=api.restored(seed,storage);
 assert.equal(restored.player.receipt,null);
 assert.equal(restored.audit.length,0);
 assert.equal(api.restored(seed,{getItem:()=>"{broken"}).version,1);
});
test("real Cristillo identity is referenced separately, not assigned to fictional A–D division",()=>{
 const ref=seed.permanentNameReference;
 assert.equal(ref.label,"The Cristillo Division");
 assert.equal(ref.brandIndependentOfStrength,true);
 assert.equal(ref.anchorLeagueId,570);
 assert.equal(ref.anchorTeamId,13679);
 assert.equal(ref.scope,"REAL_SOURCE_RESEARCH_REFERENCE_SEPARATE_FROM_FICTIONAL_TENANT");
 assert.ok(api.recommend(seed).groups.every(g=>!g.name.includes("Cristillo")));
});
test("fictional reset clears all simulated submissions and keeps source model unchanged",()=>{
 let s=want(api.newState(),"REGISTER");
 s=want(s,"RSVP",{response:"IN"});
 const fresh=want(s,"RESET");
 assert.equal(fresh.player.registration,"NOT_REGISTERED");
 assert.equal(fresh.player.rsvp,"PENDING");
 assert.equal(fresh.audit.length,0);
 assert.equal(seed.authorization.officialScheduleWrite,false);
});
