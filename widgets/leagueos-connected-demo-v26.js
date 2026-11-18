/* BruTTech SportsOS V26 — original FICTIONAL connected demo, browser-local only.
 * No real registration/payment/attendance/QR auth, publishing, official game sheets,
 * SVHL/HTO mutations, external messaging, uploaded logos, or operator approval.
 */
(function(){"use strict";
const SOURCE="./leagueos-connected-fictional-v26.json";
const STORE="bruttech-sportsos-fictional-connected-demo-v26";
const ROLES=["commissioner","captain","player","rink","public"];
const TITLES={commissioner:"Commissioner",captain:"TeamOS Captain",player:"HockeyOS Player",
 rink:"At the rink",public:"Public league site"};
const GRADES=["A","B","C","D"];
const $=q=>document.querySelector(q);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=x=>Number.isFinite(x)?x.toLocaleString("en-CA"):"—";
const date=ms=>new Date(ms).toISOString();
const clone=x=>JSON.parse(JSON.stringify(x));
const sourceStatus="FICTIONAL_BROWSER_LOCAL_PRODUCT_WALKTHROUGH_ONLY";
let seed=null,state=null,loading=null,activeRole="commissioner",notice="";
function validateSeed(s){
 if(!s||s.schema!=="bruttech-sportsos-connected-fictional-tenant/v26"||
  s.mode!==sourceStatus||s.teams?.length!==24||
  s.acceptance?.fictionalTeamCount!==24||s.authorization?.authenticatedUsers!==false||
  s.authorization?.officialScheduleWrite!==false||s.authorization?.paymentProcessing!==false||
  s.authorization?.realTimeCrossDeviceSync!==false||s.authorization?.scoreSheetSignature!==false||
  s.authorization?.verifiableQRToken!==false||s.authorization?.realLogoUpload!==false||
  s.authorization?.liveLeagueMessaging!==false||
  s.strengthAssessmentPolicy?.levels?.join("|")!=="A|B|C|D"||
  s.fictionalRoster?.length!==3||
  s.divisionInstancesCurrent?.length!==2||
  s.fictitiousGame?.officialGameId!==null||
  s.plannedServices?.paymentProcessor!=="NOT_CONNECTED")
  throw Error("Fictional tenant and source authority contract invalid");
 const teams=new Map(),counts={A:0,B:0,C:0,D:0};
 for(const t of s.teams){
  if(teams.has(t.id)||!t.fictional||!GRADES.includes(t.strengthAssessment?.level)||
   t.strengthAssessment.approved!==false||
   !Number.isFinite(t.strengthAssessment.score)||t.program!=="Open"||t.night!=="Sunday")
   throw Error("Unapproved or duplicated fictional team");
  teams.set(t.id,t);counts[t.strengthAssessment.level]++;
 }
 if(counts.A!==17||counts.B!==0||counts.C!==0||counts.D!==7)
  throw Error("Illustrative demo requires 17 A, 7 D and absent B/C");
 const originals=s.divisionInstancesCurrent.flatMap(x=>x.teamIds);
 if(originals.length!==24||new Set(originals).size!==24||
  originals.some(x=>!teams.has(x)))throw Error("Current division identity invalid");
 if(s.fictionalRoster.some(p=>!p.fictional||p.teamId!==s.captainTeamId)||
  !teams.has(s.captainTeamId)||s.fictitiousGame.homeTeamId!==s.captainTeamId)
  throw Error("Fictional roster and game identity do not reconcile");
 if(s.permanentNameReference?.brandIndependentOfStrength!==true||
  s.permanentNameReference.anchorTeamId!==13679||
  s.fictionalLeaguePolicy?.sourceWeekFiveRealignment!==true||
  s.fictionalLeaguePolicy?.actualSVHLMidseasonDivisionLock!==false)
  throw Error("Memorial, source rulebook or proposed lock authority missing");
 return s;
}
function recommend(s,options={}){
 validateSeed(s);
 const target=Number(options.targetSize??9),overrides=options.overrides||{};
 if(!Number.isInteger(target)||target<5||target>10)throw Error("Fictional group target must be 5–10 teams");
 const map=new Map(s.teams.map(t=>[t.id,t]));
 for(const [id,grade] of Object.entries(overrides)){
  if(!map.has(id)||!GRADES.includes(grade))throw Error("Invalid research-only grade override");
 }
 const byGrade={A:[],B:[],C:[],D:[]};
 for(const t of s.teams)byGrade[overrides[t.id]||t.strengthAssessment.level].push(t);
 const groups=[],holds=[];
 const nameFor=(grade,n,count)=>{
  if(grade==="A"&&count===2)return n===0?"A North":"A South";
  if(grade==="A"&&count===3)return ["A North","A Central","A South"][n];
  if(grade==="D"&&count===1)return "D Recreational";
  if(count===1)return grade+" Competitive";
  return grade+" Region "+(n+1);
 };
 for(const grade of GRADES){
  const list=byGrade[grade].sort((a,b)=>b.strengthAssessment.score-a.strengthAssessment.score||
   a.id.localeCompare(b.id)),n=list.length;
  if(!n)continue; // Missing grades do not create empty or artificial divisions
  if(n<4){holds.push({grade,teamIds:list.map(x=>x.id),reason:"BELOW_FOUR_TEAM_MINIMUM"});continue}
  let size=Math.ceil(n/target);
  size=Math.max(size,Math.ceil(n/10));
  while(size>1&&Math.floor(n/size)<4)size--;
  if(size<1||Math.floor(n/size)<4||Math.ceil(n/size)>10)
   throw Error("No valid division-size solution for strength band "+grade);
  const lower=Math.floor(n/size),remainder=n%size;
  let pos=0;
  for(let i=0;i<size;i++){
   const count=lower+(i>=size-remainder?1:0),subset=list.slice(pos,pos+count);
   pos+=count;
   groups.push({id:"FIC-NEW-"+grade+"-"+(i+1),name:nameFor(grade,i,size),
    strengthLevel:grade,strengthAssessmentApproved:false,
    divisionInstanceStatus:"UNAPPROVED_FICTIONAL_PROPOSAL",teamIds:subset.map(x=>x.id),
    averageStrength:Math.round(subset.reduce((a,t)=>a+t.strengthAssessment.score,0)/subset.length)});
  }
 }
 const unique=groups.flatMap(g=>g.teamIds),held=holds.flatMap(h=>h.teamIds);
 if(unique.length+held.length!==24||
  new Set([...unique,...held]).size!==24)throw Error("Fictional team membership not conserved");
 return {groups,holds,gradeCounts:Object.fromEntries(GRADES.map(g=>[g,byGrade[g].length])),
  ratedTeams:unique.length,heldTeams:held.length,target};
}
function strengthMismatch(s,groupIds){
 const index=new Map(s.teams.map(t=>[t.id,t.strengthAssessment.score]));
 let sum=0,pairs=0;
 for(const ids of groupIds)for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  sum+=Math.abs(index.get(ids[i])-index.get(ids[j]));pairs++;
 }
 return pairs?Math.round(sum/pairs):0;
}
function roundRobin(ids,round=0){
 if(ids.length<4||ids.length>10||new Set(ids).size!==ids.length||round<0)
  throw Error("Unverified fictional division membership");
 const circle=[...ids];if(circle.length%2)circle.push(null);
 const turns=circle.length-1;
 for(let i=0;i<round%turns;i++)circle.splice(1,0,circle.pop());
 const result=[];
 for(let i=0;i<circle.length/2;i++){
  const a=circle[i],b=circle[circle.length-1-i];
  if(a===null||b===null)continue;
  const reverse=(Math.floor(round/turns)+i)%2===1;
  result.push({home:reverse?b:a,away:reverse?a:b});
 }
 return result;
}
function scheduleDraft(s,plan,weekStart=13,rounds=2){
 if(!Number.isInteger(weekStart)||weekStart<1||rounds<1||rounds>4)throw Error("Invalid draft week");
 const games=[];
 for(const g of plan.groups)for(let r=0;r<rounds;r++){
  for(const m of roundRobin(g.teamIds,r)){
   games.push({id:"FIC-DRAFT-"+g.id+"-"+r+"-"+m.home,
    week:weekStart+r,divisionId:g.id,divisionName:g.name,
    homeTeamId:m.home,awayTeamId:m.away,
    date:null,time:null,rink:null,
    status:"FICTIONAL_UNSLOTTED_DRAFT",
    officialScheduleWrite:false,facilityInventoryVerified:false});
  }
 }
 return games;
}
function newState(){
 return {version:1,source:"FICTIONAL_BROWSER_LOCAL_PRODUCT_WALKTHROUGH_ONLY",
  targetSize:9,currentWeek:5,overrides:{},
  decision:{status:"UNREVIEWED",version:0,proposed:null},
  publication:{status:"NOT_PUBLISHED",divisions:[]},
  captain:{goaliePoll:"NOT_OPEN",reminders:0,logoChoice:"",logoColour:"Navy",
   logoStatus:"NOT_SUBMITTED",approvedLogo:null,request:"",requestStatus:"NONE",reply:""},
  player:{registration:"NOT_REGISTERED",waiver:false,receipt:null,rsvp:"PENDING"},
  gameDay:{token:null,expiresAt:0,attestation:null,manualException:null},
  audit:[]};
}
function validPlan(groups,source){
 if(!Array.isArray(groups)||groups.length<1||groups.length>8)return false;
 const known=new Set(source.teams.map(x=>x.id)),seen=new Set();
 for(const g of groups){
  if(typeof g.id!=="string"||!/^FIC-NEW-[ABCD]-[1-9]\d?$/.test(g.id)||
   !GRADES.includes(g.strengthLevel)||g.strengthAssessmentApproved!==false||
   g.divisionInstanceStatus!=="UNAPPROVED_FICTIONAL_PROPOSAL"||
   typeof g.name!=="string"||g.name.length>50||
   !Array.isArray(g.teamIds)||g.teamIds.length<4||g.teamIds.length>10||
   !Number.isFinite(g.averageStrength))return false;
  for(const id of g.teamIds){
   if(!known.has(id)||seen.has(id))return false;seen.add(id);
  }
 }
 return seen.size===24;
}
function validateState(s,source){
 if(!s||s.version!==1||s.source!==sourceStatus||
  !Number.isInteger(s.targetSize)||s.targetSize<5||s.targetSize>10||
  !Number.isInteger(s.currentWeek)||s.currentWeek<1||s.currentWeek>28||
  !s.overrides||typeof s.overrides!=="object"||Array.isArray(s.overrides)||
  !s.decision||!["UNREVIEWED","SIMULATED_REVIEWED"].includes(s.decision.status)||
  !Number.isInteger(s.decision.version)||s.decision.version<0||s.decision.version>25||
  !s.publication||!["NOT_PUBLISHED","FICTIONAL_PUBLIC_PREVIEW"].includes(s.publication.status)||
  !Array.isArray(s.publication.divisions)||
  !s.captain||!["NOT_OPEN","OPEN_FOR_DEMO"].includes(s.captain.goaliePoll)||
  !Number.isInteger(s.captain.reminders)||s.captain.reminders<0||s.captain.reminders>99||
  !["NOT_SUBMITTED","PENDING_DEMO_MODERATION","APPROVED_FICTIONAL"].includes(s.captain.logoStatus)||
  !["Navy","Teal","Gold"].includes(s.captain.logoColour)||
  typeof s.captain.request!=="string"||s.captain.request.length>180||
  typeof s.captain.reply!=="string"||s.captain.reply.length>180||
  !["NONE","PENDING_DEMO_REPLY","FICTIONAL_RESOLVED"].includes(s.captain.requestStatus)||
  !s.player||!["NOT_REGISTERED","FICTIONAL_REGISTRATION_RECORDED"].includes(s.player.registration)||
  !["PENDING","IN","OUT","UNSURE"].includes(s.player.rsvp)||
  typeof s.player.waiver!=="boolean"||!s.gameDay||
  (s.player.waiver&&s.player.registration!=="FICTIONAL_REGISTRATION_RECORDED")||
  (s.player.receipt&&(s.player.receipt.kind!=="SAMPLE_RECEIPT_NO_CHARGE"||
    s.player.receipt.amountCharged!==0||s.player.receipt.processor!=="NONE"||
    s.player.receipt.reference!=="FIC-NOCHARGE-001"))||
  (s.captain.logoStatus==="APPROVED_FICTIONAL"&&
    (!s.captain.approvedLogo||
     !["Wolf Crest","Arrow Crest","Shield Crest"].includes(s.captain.approvedLogo.name)||
     !["Navy","Teal","Gold"].includes(s.captain.approvedLogo.colour)))||
  (s.captain.logoStatus!=="APPROVED_FICTIONAL"&&s.captain.approvedLogo!==null)||
  !Number.isFinite(s.gameDay.expiresAt)||s.gameDay.expiresAt<0||
  (s.gameDay.token!==null&&(typeof s.gameDay.token!=="string"||
    !s.gameDay.token.startsWith("FIC-QR-"+source.fictitiousGame.id)))||
  (s.gameDay.attestation&&(s.gameDay.attestation.gameId!==source.fictitiousGame.id||
    s.gameDay.attestation.playerId!==source.fictionalRoster[0].id||
    s.gameDay.attestation.officialSignature!==false||
    !["ATTENDANCE_PENDING_SCOREKEEPER_REVIEW",
      "FICTIONAL_SCOREKEEPER_REVIEWED_NOT_SIGNED"].includes(s.gameDay.attestation.status)))||
  (s.gameDay.manualException&&(s.gameDay.manualException.gameId!==source.fictitiousGame.id||
    s.gameDay.manualException.officialSignature!==false||
    s.gameDay.manualException.status!=="OFFLINE_EXCEPTION_PENDING_MANUAL_REVIEW"))||
  !Array.isArray(s.audit)||s.audit.length>80||
  s.audit.some(a=>typeof a.action!=="string"||a.action.length>64||
   typeof a.at!=="string"||a.at.length>40||a.official!==false||
   !/^FICTIONAL_(COMMISSIONER|CAPTAIN|PLAYER|RINK)$/.test(a.actor)))
  return false;
 try{
  const current=recommend(source,{targetSize:s.targetSize,overrides:s.overrides});
  if(s.decision.status==="SIMULATED_REVIEWED"&&
   (!validPlan(s.decision.proposed,source)||
    JSON.stringify(s.decision.proposed)!==JSON.stringify(current.groups)))return false;
  if(s.decision.status==="UNREVIEWED"&&s.decision.proposed!==null)return false;
  if(s.publication.status==="FICTIONAL_PUBLIC_PREVIEW"&&
    (!validPlan(s.publication.divisions,source)||
     !Number.isInteger(s.publication.version)||
     s.publication.version<1||s.publication.version>s.decision.version))return false;
  if(s.publication.status==="NOT_PUBLISHED"&&s.publication.divisions.length)return false;
  return true;
 }catch(_){return false}
}
function restored(s,store=localStorage){
 try{const raw=store.getItem(STORE);
  if(!raw)return newState();
  const parsed=JSON.parse(raw);
  if(!validateState(parsed,s))throw Error("Untrusted local story revision");
  return parsed;
 }catch(_){return newState()}
}
function eventLog(x,role,action,now,detail=""){
 x.audit.push({index:x.audit.length+1,at:date(now),actor:"FICTIONAL_"+role.toUpperCase(),
  action,detail:String(detail).slice(0,150),official:false});
 x.audit=x.audit.slice(-75);
}
function applyAction(existing,s,action,args={},now=Date.now()){
 const x=clone(existing);
 if(!validateState(x,s))return{ok:false,state:existing,message:"Story state failed source validation"};
 const failed=msg=>({ok:false,state:existing,message:msg});
 const done=(role,code,msg,details="")=>{eventLog(x,role,code,now,details);return{ok:true,state:x,message:msg}};
 const group=()=>recommend(s,{targetSize:x.targetSize,overrides:x.overrides});
 const reviewWindow=()=>x.currentWeek===s.season.reviewWeek||x.currentWeek===s.season.finalReviewWeek;
 const locked=()=>x.currentWeek>s.season.finalLockAfterWeek;
 switch(action){
  case "TARGET":{
   if(locked())return failed("Final playoff placement lock is active; only research monitoring remains.");
   const size=Number(args.target);
   if(!Number.isInteger(size)||size<5||size>10)return failed("Choose a valid target size from five to ten.");
   x.targetSize=size;x.decision={status:"UNREVIEWED",version:x.decision.version,proposed:null};
   return done("commissioner","RECOMMENDATION_RECALCULATED","Fictional grouping recalculated; commissioner review remains required.");
  }
  case "GRADE":{
   if(locked())return failed("Final playoff placement lock prevents another realignment.");
   const id=String(args.teamId||""),grade=String(args.grade||"");
   if(!s.teams.some(t=>t.id===id)||!GRADES.includes(grade))return failed("Unknown team or grade.");
   x.overrides[id]=grade;
   const outcome=group();
   x.decision={status:"UNREVIEWED",version:x.decision.version,proposed:null};
   return done("commissioner","STRENGTH_WHAT_IF_EDITED",
    outcome.holds.length?"Research-grade change creates an undersized group hold.":"Research-grade what-if recalculated.",
    id+" "+grade);
  }
  case "WEEK":{
   const w=Number(args.week);
   if(!Number.isInteger(w)||w<1||w>28)return failed("Choose a valid season week.");
   x.currentWeek=w;
   return done("commissioner","WEEK_SIMULATED",w>12?
    "Final division lock active; only monitoring is permitted.":"Fictional week updated.",String(w));
  }
  case "REVIEW":{
   if(!reviewWindow()||locked())return failed("Division review is permitted only at the simulated week-5 or midseason window.");
   const rec=group();
   if(rec.holds.length)return failed("Under-strength groups require source/league review before a complete plan can proceed.");
   x.decision={status:"SIMULATED_REVIEWED",version:x.decision.version+1,
    proposed:rec.groups};
   return done("commissioner","RECOMMENDATION_REVIEWED_DEMO",
    "Commissioner review logged only in this browser. Not an official league approval.");
  }
  case "PUBLISH":{
   if(x.decision.status!=="SIMULATED_REVIEWED"||!reviewWindow()||locked())
    return failed("A current review-window draft is required. No live publication permission exists.");
   x.publication={status:"FICTIONAL_PUBLIC_PREVIEW",
    divisions:clone(x.decision.proposed),version:x.decision.version};
   return done("commissioner","FICTIONAL_PUBLIC_VIEW_UPDATED",
    "The fictional league public view now reflects the simulated review, not real SVHL standings.");
  }
  case "REMIND":{
   x.captain.reminders=Math.min(99,x.captain.reminders+1);
   return done("captain","RSVP_REMINDER_PREVIEWED","Reminder logged in this browser; no message was delivered.");
  }
  case "GOALIE_POLL":{
   x.captain.goaliePoll="OPEN_FOR_DEMO";
   return done("captain","FICTIONAL_GOALIE_POLL_OPENED","Spare-goalie poll displayed; no actual player was contacted.");
  }
  case "LOGO_SUBMIT":{
   const choice=String(args.choice||""),colour=String(args.colour||"");
   if(!["Wolf Crest","Arrow Crest","Shield Crest"].includes(choice)||
      !["Navy","Teal","Gold"].includes(colour))return failed("Choose one of the fictional artwork presets.");
   x.captain.logoChoice=choice;x.captain.logoColour=colour;
   x.captain.logoStatus="PENDING_DEMO_MODERATION";x.captain.approvedLogo=null;
   return done("captain","LOGO_SUBMITTED_FOR_DEMO_REVIEW",
    "Fictional artwork submitted for commissioner review; no file uploaded or public logo changed.");
  }
  case "LOGO_APPROVE":{
   if(x.captain.logoStatus!=="PENDING_DEMO_MODERATION")return failed("No fictional brand submission is awaiting review.");
   x.captain.logoStatus="APPROVED_FICTIONAL";
   x.captain.approvedLogo={name:x.captain.logoChoice,colour:x.captain.logoColour};
   return done("commissioner","LOGO_APPROVED_IN_FICTIONAL_TENANT",
    "Approved only inside this browser's fictional public page.");
  }
  case "ASK_LEAGUE":{
   const message=String(args.text||"").trim();
   if(message.length<8||message.length>180)return failed("Enter an eight-to-180-character fictional league question.");
   x.captain.request=message;x.captain.requestStatus="PENDING_DEMO_REPLY";x.captain.reply="";
   return done("captain","FICTIONAL_LEAGUE_QUESTION","Question saved locally; nothing was sent to an arena.");
  }
  case "REPLY":{
   const reply=String(args.text||"").trim();
   if(x.captain.requestStatus!=="PENDING_DEMO_REPLY"||reply.length<4||reply.length>180)
    return failed("A pending request and four-to-180-character reply are required.");
   x.captain.reply=reply;x.captain.requestStatus="FICTIONAL_RESOLVED";
   return done("commissioner","FICTIONAL_QUESTION_REPLY","Demo league response is visible in TeamOS.");
  }
  case "REGISTER":{
   x.player.registration="FICTIONAL_REGISTRATION_RECORDED";
   return done("player","FICTIONAL_REGISTRATION","Registration state recorded only for the invented player.");
  }
  case "WAIVER":{
   if(x.player.registration!=="FICTIONAL_REGISTRATION_RECORDED")return failed("Record the fictional registration first.");
   x.player.waiver=true;
   return done("player","FICTIONAL_WAIVER_ACKNOWLEDGED","Acknowledgement recorded as a mock; no legal waiver was signed.");
  }
  case "RECEIPT":{
   if(!x.player.waiver)return failed("Complete the fictional registration and waiver demonstration first.");
   x.player.receipt={reference:"FIC-NOCHARGE-001",kind:"SAMPLE_RECEIPT_NO_CHARGE",
    amountCharged:0,processor:"NONE",at:date(now)};
   return done("player","SAMPLE_RECEIPT_GENERATED","Sample no-charge receipt created; no payment was accepted.");
  }
  case "RSVP":{
   const r=String(args.response||"");
   if(!["IN","OUT","UNSURE"].includes(r))return failed("Choose In, Out or Unsure.");
   x.player.rsvp=r;
   return done("player","FICTIONAL_RSVP_"+r,"Demo player response updated; no outside notification sent.");
  }
  case "QR_ISSUE":{
   // Illustrative token; never cryptographically secure or scannable.
   const value="FIC-QR-"+s.fictitiousGame.id+"-"+String(now).slice(-7);
   x.gameDay.token=value;x.gameDay.expiresAt=now+3*60*1000;
   return done("rink","FICTIONAL_QR_ISSUED","Three-minute game-scoped demonstration code issued locally.");
  }
  case "QR_SCAN":{
   if(x.player.registration!=="FICTIONAL_REGISTRATION_RECORDED"||!x.player.waiver||
      x.player.rsvp!=="IN")return failed("Roster, fictional registration, waiver and In RSVP are required.");
   if(!x.gameDay.token||now>=x.gameDay.expiresAt)return failed("Game-scoped demo code is missing or expired.");
   if(x.gameDay.attestation)return failed("Duplicate check-in blocked: one attendance attestation per fictional game.");
   x.gameDay.attestation={playerId:s.fictionalRoster[0].id,gameId:s.fictitiousGame.id,
    token:x.gameDay.token,createdAt:date(now),status:"ATTENDANCE_PENDING_SCOREKEEPER_REVIEW",
    officialSignature:false};
   return done("rink","FICTIONAL_QR_ATTENDANCE_RECORDED",
    "Attendance pending scorekeeper review. This is not a signed game sheet.");
  }
  case "MANUAL_EXCEPTION":{
   if(x.gameDay.manualException)return failed("A manual exception is already awaiting fictional review.");
   x.gameDay.manualException={gameId:s.fictitiousGame.id,playerId:s.fictionalRoster[0].id,
    at:date(now),status:"OFFLINE_EXCEPTION_PENDING_MANUAL_REVIEW",officialSignature:false};
   return done("rink","OFFLINE_EXCEPTION_RECORDED",
    "Manual exception held for review; no roster eligibility or game-sheet signoff inferred.");
  }
  case "SCOREKEEPER_REVIEW":{
   if(!x.gameDay.attestation||x.gameDay.attestation.status!=="ATTENDANCE_PENDING_SCOREKEEPER_REVIEW")
    return failed("A fictional pending attendance attestation is required.");
   x.gameDay.attestation.status="FICTIONAL_SCOREKEEPER_REVIEWED_NOT_SIGNED";
   return done("rink","SCOREKEEPER_REVIEW_SIMULATED",
    "Pending attendance reviewed locally; no official referee signature was generated.");
  }
  case "RESET":return{ok:true,state:newState(),message:"Fictional story reset in this browser."};
  default:return failed("Unsupported or unauthorized action.");
 }
}
function progress(s){
 const out=[];
 if(s.decision.status==="SIMULATED_REVIEWED")out.push("Group review");
 if(s.publication.status==="FICTIONAL_PUBLIC_PREVIEW")out.push("Fictional public plan");
 if(s.captain.goaliePoll==="OPEN_FOR_DEMO")out.push("Goalie poll");
 if(s.captain.logoStatus==="APPROVED_FICTIONAL")out.push("Fictional crest");
 if(s.player.rsvp!=="PENDING")out.push("RSVP");
 if(s.gameDay.attestation)out.push("Game check-in");
 return out;
}
function downloadStory(s){const body={schema:"bruttech-v26-fictional-demo-handoff/v1",exportedAt:date(Date.now()),
  source:"FICTIONAL_BROWSER_ONLY",tenantId:seed.tenant.id,officialActions:0,bankCharges:0,
  actualRegistration:false,realSignatures:false,storyState:s};
 const blob=new Blob([JSON.stringify(body,null,2)],{type:"application/json"}),
 url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="BruTTech_SportsOS_V26_Fictional_Demo_Receipt.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function sourceNote(){
 return '<p class="v26-source">FICTIONAL DEMO / THIS BROWSER ONLY · No real authentication, money movement, signed waivers, game-sheet signatures, notifications, file uploads, SVHL/HTO writes, facility scheduling or official league approval.</p>';
}
function flag(label,detail,kind=""){
 return '<span class="v26-flag '+esc(kind)+'"><b>'+esc(label)+'</b><small>'+esc(detail)+'</small></span>';
}
function summary(){
 const rec=recommend(seed,{targetSize:state.targetSize,overrides:state.overrides});
 return '<div class="v26-overview-kpis">'+[
  ["Fictional teams",24,"17 A, seven D initially"],
  ["Candidate divisions",rec.groups.length,"Not league-approved"],
  ["Confirmed payments",0,"No payment processor"],
  ["Official actions",0,"Browser-local simulation only"]
 ].map(([label,v,desc])=>'<div><span>'+label+'</span><b>'+v+'</b><small>'+desc+'</small></div>').join("")+'</div>';
}
function commissioner(){
 const rec=recommend(seed,{targetSize:state.targetSize,overrides:state.overrides});
 const past=seed.divisionInstancesCurrent.map(g=>({name:g.name,teams:g.teamIds.length})),
 proposed=rec.groups;
 const available=[seed.season.reviewWeek,seed.season.finalReviewWeek].includes(state.currentWeek);
 const locked=state.currentWeek>seed.season.finalLockAfterWeek;
 const ratio=Number((strengthMismatch(seed,past.map(g=>seed.divisionInstancesCurrent.find(x=>x.name===g.name).teamIds))/
   Math.max(1,strengthMismatch(seed,rec.groups.map(x=>x.teamIds)))).toFixed(2));
 const brand=state.captain;
 return '<section class="v26-workbench"><div class="v26-section-label">LEAGUEOS / COMMISSIONER DESK</div>'+
 '<h3>Current divisions vs recommended competitive groups</h3>'+
 '<p>StrengthAssessment describes fictional A–D team ability. DivisionInstance stores an actual season grouping, name and standings identity. Missing B or C teams do not create artificial B/C divisions.</p>'+
 '<div class="v26-two-cols"><div class="v26-division-list"><h4>Current fictional setup</h4>'+
 past.map(g=>'<div><strong>'+esc(g.name)+'</strong><span>'+g.teams+' teams · mixed strength</span></div>').join("")+
 '</div><div class="v26-division-list recommended"><h4>Engine scenario · unapproved</h4>'+
 proposed.map(g=>'<details><summary><strong>'+esc(g.name)+'</strong><span>'+g.teamIds.length+
 ' teams · '+g.strengthLevel+' assessment</span></summary><p>'+
 g.teamIds.map(id=>esc(seed.teams.find(t=>t.id===id)?.name)).join(" · ")+
 '</p></details>').join("")+
 (rec.holds.length?'<p class="v26-warning">Source held: '+rec.holds.map(x=>x.grade+' · '+x.teamIds.length+' team(s) below minimum').join("; ")+'</p>':'')+
 '</div></div>'+
 '<div class="v26-ratio">'+
 flag("Current model spread","Mixed divisions · fictional benchmark")+
 flag("Relative source score spread",ratio+'× (illustrative only)')+
 flag("Grades with zero teams",GRADES.filter(g=>!rec.gradeCounts[g]).join(", ")||"None")+
 '</div>'+
 '<div id="leagueos-v27-decision-report" aria-live="polite"></div>'+
 '<div class="v26-form-row"><label>Target teams per division<select id="v26-target">'+
 [6,7,8,9,10].map(v=>'<option value="'+v+'"'+(v===state.targetSize?' selected':'')+'>'+v+' teams</option>').join("")+
 '</select></label><button type="button" data-v26-action="TARGET">Recalculate hypothetical groups</button>'+
 '<label>Try a fictional roster-grade change<select id="v26-grade-team">'+seed.teams.slice(0,6).map(t=>
 '<option value="'+t.id+'">'+esc(t.name)+'</option>').join("")+'</select></label>'+
 '<label>Research grade<select id="v26-grade"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>'+
 '<button type="button" data-v26-action="GRADE">Apply what-if grade</button></div>'+
 '<div class="v26-review-gate"><h4>Review windows and playoff lock</h4><p>The source rulebook provides for realignment after week 5 with points carried. A final midseason division lock is an additional policy scenario, not a published SVHL rule.</p>'+
 '<div class="v26-form-row"><label>Simulated week<select id="v26-week">'+
 [1,4,5,6,10,12,13,18,22].map(w=>'<option value="'+w+'"'+(state.currentWeek===w?' selected':'')+'>Week '+w+'</option>').join("")+
 '</select></label><button type="button" data-v26-action="WEEK">Set simulated week</button>'+
 '<button type="button" data-v26-action="REVIEW"'+(!available||locked||!!rec.holds.length?' disabled':'')+'>Record fictional commissioner review</button>'+
 '<button type="button" data-v26-action="PUBLISH"'+(state.decision.status!=="SIMULATED_REVIEWED"||!available||locked?' disabled':'')+'>Update fictional public site</button></div>'+
 '<div class="v26-gate-status">'+flag(locked?"FINAL LOCK":"MONITOR / REVIEW",locked?
 "After week 12, no division changes":"Window only after week 5 and at halftime",locked?"warn":"")+
 flag("Commissioner review",state.decision.status)+
 flag("Public fiction preview",state.publication.status)+'</div></div>'+
 '<section class="v26-subsection"><h4>Proposed game schedule impact</h4><p>Games update as a draft only. Official fixtures stay untouched; dates, rinks, referees and early/late fairness cannot be assigned without verified ice inventory.</p>'+
 '<div class="v26-schedule-sample">'+scheduleDraft(seed,rec,13,2).slice(0,5).map(g=>
 '<div><strong>Week '+g.week+' · '+esc(g.divisionName)+'</strong><span>'+
 esc(seed.teams.find(t=>t.id===g.homeTeamId)?.name)+' vs '+
 esc(seed.teams.find(t=>t.id===g.awayTeamId)?.name)+
 '</span><small>No date, rink or booking</small></div>').join("")+'</div>'+
 '<small>'+scheduleDraft(seed,rec,13,2).length+' fictional unslotted matchups across two weeks.</small></section>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Team brand moderation</h4><p>Pending artwork: '+esc(brand.logoStatus)+
 (brand.logoChoice?' · '+esc(brand.logoChoice)+' / '+esc(brand.logoColour):'')+
 '</p><button type="button" data-v26-action="LOGO_APPROVE"'+(brand.logoStatus!=="PENDING_DEMO_MODERATION"?' disabled':'')+'>Approve fictional crest for public preview</button></section>'+
 '<section class="v26-subsection"><h4>Captain request queue</h4><p>'+esc(brand.request||"No fictional question submitted")+
 '</p><p>Status: '+esc(brand.requestStatus||"NONE")+'</p>'+
 '<label>Local league-office response<textarea id="v26-commissioner-reply" maxlength="180" rows="2" placeholder="Fictional decision rationale"></textarea></label>'+
 '<button type="button" data-v26-action="REPLY"'+(brand.requestStatus!=="PENDING_DEMO_REPLY"?' disabled':'')+'>Record fictional reply</button></section></div>'+
 '<div class="v26-research-link"><button type="button" data-go="league-division-plan">Open verified V25 division research</button>'+
 '<small>Real source research is separate from this invented tenant.</small></div></section>';
}
function captain(){
 const c=state.captain,rs=state.player.rsvp;
 const checked=state.gameDay.attestation?.status||"NO_CHECK_IN";
 return '<section class="v26-workbench"><div class="v26-section-label">TEAMOS / CAPTAIN WORKSPACE</div>'+
 '<h3>Harbour Wolves · fictional game-night desk</h3><p>TeamOS Core includes roster, availability and team communications. Advanced scouting and video may be optional; registration and participation must not depend on upgrades.</p>'+
 '<div class="v26-overview-kpis">'+[
 ["Fictional roster",3,"No real player contacts"],
 ["RSVP response",rs,"Live only in this browser"],
 ["Spare goalie poll",c.goaliePoll==="OPEN_FOR_DEMO"?"OPEN":"NOT OPEN","No messages sent"],
 ["Game attendance",checked.includes("REVIEWED")?"REVIEWED":state.gameDay.attestation?"PENDING":"NONE","Not an official sheet"]
 ].map(([name,value,desc])=>'<div><span>'+esc(name)+'</span><b>'+esc(value)+'</b><small>'+esc(desc)+'</small></div>').join("")+'</div>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Availability and no-show awareness</h4>'+
 seed.fictionalRoster.map(p=>'<div class="v26-player-row"><b>'+esc(p.name)+' · '+esc(p.position)+'</b>'+
 '<span>'+(p.id===seed.fictionalRoster[0].id?esc(rs):"Awaiting fictional response")+'</span></div>').join("")+
 '<button type="button" data-v26-action="REMIND">Preview no-show reminder</button>'+
 '<p>'+c.reminders+' reminder previews logged · no text/email/WhatsApp delivered</p></section>'+
 '<section class="v26-subsection"><h4>Spare-goalie call-up poll</h4><p>Status: '+esc(c.goaliePoll)+
 '</p><button type="button" data-v26-action="GOALIE_POLL">Open fictional spare-goalie poll</button>'+
 '<p>Actual player eligibility, signed roster, registration and call-up contact must be verified by a connected league.</p></section></div>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Team logo request · moderated</h4>'+
 '<p>A sample artwork choice is not a real uploaded file or a rights clearance.</p>'+
 '<div class="v26-form-row"><label>Fictional crest<select id="v26-logo-choice"><option>Wolf Crest</option><option>Arrow Crest</option><option>Shield Crest</option></select></label>'+
 '<label>Colour<select id="v26-logo-colour"><option>Navy</option><option>Teal</option><option>Gold</option></select></label>'+
 '<button type="button" data-v26-action="LOGO_SUBMIT">Submit sample for commissioner review</button></div>'+
 '<p>Moderation: '+esc(c.logoStatus)+'</p></section>'+
 '<section class="v26-subsection"><h4>Ask the league office</h4>'+
 '<label>Fictional team question<textarea id="v26-captain-question" maxlength="180" rows="3" placeholder="Could we clarify the next division review?"></textarea></label>'+
 '<button type="button" data-v26-action="ASK_LEAGUE">Save local league question</button>'+
 '<p>Status: '+esc(c.requestStatus||"NONE")+'</p>'+
 (c.reply?'<p class="v26-reply">League-office fictional reply: '+esc(c.reply)+'</p>':"")+
 '</section></div><p class="v26-workflow-note">To continue: open HockeyOS Player to record RSVP, then inspect the shared captain desk again. Only this browser is synchronized.</p></section>';
}
function player(){
 const p=state.player,g=seed.fictitiousGame,reg=p.registration==="FICTIONAL_REGISTRATION_RECORDED";
 return '<section class="v26-workbench"><div class="v26-section-label">HOCKEYOS CORE / FICTIONAL PLAYER HOME</div>'+
 '<h3>Alex Example · one personal hockey home</h3>'+
 '<p>Upcoming invented game: Harbour Wolves vs Summit Foxes · '+esc(g.date)+' · '+
 esc(g.localTime)+' · '+esc(g.rink)+'. The schedule is a fiction, not a real arena booking.</p>'+
 '<div class="v26-overview-kpis">'+[
 ["Registration",reg?"DEMO REGISTERED":"NOT REGISTERED","No real registration"],
 ["Waiver",p.waiver?"MOCK WAIVER":"NOT SIGNED","Not a legal signature"],
 ["Payment",p.receipt?"SAMPLE $0":"NOT CONNECTED","No charge or bank processor"],
 ["Availability",p.rsvp,"Not delivered outside this browser"]
 ].map(([label,value,note])=>'<div><span>'+esc(label)+'</span><b>'+esc(value)+'</b><small>'+esc(note)+'</small></div>').join("")+'</div>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Registration, waiver, payment status</h4>'+
 '<p>Registration and waiver are examples, not actual sign-in or accepted league consent.</p>'+
 '<button type="button" data-v26-action="REGISTER"'+(reg?' disabled':'')+'>Record fictional registration</button>'+
 '<button type="button" data-v26-action="WAIVER"'+(!reg||p.waiver?' disabled':'')+'>Acknowledge mock waiver</button>'+
 '<button type="button" data-v26-action="RECEIPT"'+(!p.waiver?' disabled':'')+'>Generate no-charge example receipt</button>'+
 (p.receipt?'<p class="v26-receipt">Sample '+esc(p.receipt.reference)+' · $0.00 charged · no transaction or real receipt</p>':'')+
 '</section><section class="v26-subsection"><h4>Game RSVP and team notices</h4>'+
 '<div class="v26-form-row">'+["IN","OUT","UNSURE"].map(v=>
 '<button type="button" data-v26-action="RSVP" data-v26-value="'+v+'"'+
 (p.rsvp===v?' class="v26-selected"':'')+'>'+ (v==="IN"?"In":v==="OUT"?"Out":"Unsure")+'</button>').join("")+
 '</div><p>Captain reminder previews: '+state.captain.reminders+
 '. Goalie poll: '+esc(state.captain.goaliePoll)+'.</p>'+
 (state.captain.reply?'<p>Latest fictional league reply: '+esc(state.captain.reply)+'</p>':'')+
 '</section></div>'+
 '<div class="v26-core-optional"><div><h4>Included HockeyOS Core</h4><p>Participation, schedule, RSVP, official basic statistics, registration/waiver status and league notices.</p>'+
 '<button type="button" data-go="team-stats">Browse separate real-source HTO stats</button></div>'+
 '<div><h4>Optional advanced research</h4><p>Historic/player projections, scouting, video and modelled progression—never required to register or attend.</p>'+
 '<button type="button" data-go="team-projections">Open existing HockeyOS projections</button></div></div></section>';
}
function qrGraphic(token){
 if(!token)return '<div class="v26-qr-placeholder">No fictional game code issued</div>';
 const h=Array.from(token).reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,7);
 let tiles="";
 for(let i=0;i<121;i++){
  const row=Math.floor(i/11),col=i%11,eye=(row<3&&col<3)||(row<3&&col>7)||(row>7&&col<3);
  const cell=eye?true:((h>>>((i*7)%25))&1)===1;
  tiles+='<i class="'+(cell?'on':'')+'"></i>';
 }
 return '<div class="v26-qr-demo" aria-label="Decorative unscannable fictional QR pattern">'+tiles+
 '</div><small>Decorative example only — not a scannable or authenticated QR code</small>';
}
function rink(){
 const q=state.gameDay,a=q.attestation,m=q.manualException,now=Date.now();
 const active=q.token&&now<q.expiresAt;
 return '<section class="v26-workbench"><div class="v26-section-label">GAME DAY / RINK WORKFLOW</div>'+
 '<h3>Simulate game-scoped attendance</h3><p>QR attendance needs real identity, game entitlement, a short-lived signed token, replay defence, offline exceptions and separately authorized game-sheet approval. This page demonstrates those states without implementing the security service.</p>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Fictional game code</h4>'+qrGraphic(q.token)+
 '<p class="v26-token"><code>'+esc(q.token||"NOT_ISSUED")+'</code></p>'+
 '<p>Local code status: '+(active?"issued · expires in this session":q.token?"expired":"not issued")+'</p>'+
 '<button type="button" data-v26-action="QR_ISSUE">Issue a three-minute sample game code</button>'+
 '<button type="button" data-v26-action="QR_SCAN">Simulate player scan</button></section>'+
 '<section class="v26-subsection"><h4>Roster/eligibility crosscheck</h4>'+
 '<div class="v26-player-row"><b>Fictional registration</b><span>'+esc(state.player.registration)+'</span></div>'+
 '<div class="v26-player-row"><b>Mock waiver</b><span>'+(state.player.waiver?"Acknowledged":"Missing")+'</span></div>'+
 '<div class="v26-player-row"><b>RSVP</b><span>'+esc(state.player.rsvp)+'</span></div>'+
 '<div class="v26-player-row"><b>Attendance</b><span>'+esc(a?.status||"Not checked in")+'</span></div>'+
 '<button type="button" data-v26-action="MANUAL_EXCEPTION">Record offline exception for review</button>'+
 '<button type="button" data-v26-action="SCOREKEEPER_REVIEW"'+
 (!a||a.status!=="ATTENDANCE_PENDING_SCOREKEEPER_REVIEW"?' disabled':'')+
 '>Simulate scorekeeper review (not signoff)</button>'+
 (m?'<p>Offline exception: '+esc(m.status)+'</p>':'')+'</section></div>'+
 '<p class="v26-warning">Even after a simulated scan or scorekeeper review, attendance does not become an official referee-signed game sheet. A real QR backend, identity verification and audit service are not connected.</p></section>';
}
function publicPage(){
 const p=state.publication,c=state.captain,groups=p.status==="FICTIONAL_PUBLIC_PREVIEW"?p.divisions:null;
 return '<section class="v26-workbench"><div class="v26-section-label">PUBLIC LEAGUE SITE / FICTIONAL TENANT</div>'+
 '<h3>Northstar Adult Hockey League · public preview</h3>'+
 '<p>This public-facing scenario reflects only simulated, browser-local decisions and moderated sample artwork. It is not affiliated with or published to SVHL.</p>'+
 '<div class="v26-two-cols"><section class="v26-subsection"><h4>Season divisions and standings identity</h4>'+
 (groups?groups.map(g=>'<div class="v26-player-row"><b>'+esc(g.name)+
 '</b><span>'+g.teamIds.length+' teams · grade '+esc(g.strengthLevel)+
 ' · fictional publication</span></div>').join(""):
 '<p>Original fictional divisions remain visible. Commissioner review has not been published to this browser.</p>'+
 seed.divisionInstancesCurrent.map(g=>'<div class="v26-player-row"><b>'+esc(g.name)+
 '</b><span>'+g.teamIds.length+' teams</span></div>').join(""))+
 '</section><section class="v26-subsection"><h4>Team artwork moderation</h4>'+
 (c.logoStatus==="APPROVED_FICTIONAL"?
 '<div class="v26-public-logo"><div class="v26-logo '+esc(c.approvedLogo.colour.toLowerCase())+'">HW</div>'+
 '<strong>'+esc(c.approvedLogo.name)+'</strong><span>Approved in this fictional browser only</span></div>':
 '<p>Harbour Wolves: approved artwork not yet available; any submitted logo remains hidden from the fictional public site.</p>')+
 '<h4>Case resolution</h4><p>'+esc(c.requestStatus||"NONE")+
 (c.reply?' · '+esc(c.reply):"")+'</p></section></div>'+
 '<div class="v26-legacy"><strong>Division identity is independent of competitive level.</strong>'+
 '<p>The Cristillo Division is preserved as a separate memorial-naming example in the source-qualified V25 research. A–D labels here describe only fictional strength assessments and never rename that real division.</p>'+
 '<button type="button" data-go="league-division-plan">Open separate LeagueOS strength research</button></div></section>';
}
function audit(){
 const latest=state.audit.slice(-40).reverse();
 return '<details class="v26-audit"><summary>Browser-local audit & walkthrough evidence · '+state.audit.length+' actions</summary>'+
 '<p>No server audit exists; these fictional actions are saved on this device only.</p>'+
 (latest.length?latest.map(a=>'<div><b>'+esc(a.action)+'</b><span>'+esc(a.actor)+
 ' · '+esc(a.at)+'</span><small>'+esc(a.detail||"No additional details")+'</small></div>').join(""):
 '<p>No fictional actions logged.</p>')+
 '<div class="v26-form-row"><button type="button" data-v26-action="EXPORT">Export fictional handoff JSON</button>'+
 '<button type="button" data-v26-action="RESET">Reset fictional story</button></div></details>';
}
function render(){
 const root=$("#leagueos-connected-demo-v26");if(!root||!seed||!state)return;
 const pc=progress(state);
 root.innerHTML='<div class="v26-app">'+
 '<section class="v26-head"><span>SPORTSOS / CONNECTED PRODUCT EXPERIENCE • V26</span>'+
 '<h2>One league. Captains, players, game day and public league—connected.</h2>'+
 '<p>Fictional Northstar Adult Hockey League sandbox—not Brave H.C. or SVHL data. Complete a connected walkthrough, then inspect the separate real source-qualified V25 research. All demo actions stay in this browser.</p>'+
 '<div class="v26-progress">'+(pc.length?pc.map(x=>'<span>'+esc(x)+'</span>').join(""):"No fictional workflow steps completed yet")+'</div></section>'+
 summary()+
 '<nav class="v26-steps" aria-label="Connected demo roles">'+ROLES.map((role,i)=>
 '<button type="button" data-v26-role="'+role+'"'+(activeRole===role?' aria-current="step"':'')+
 '><span>'+String(i+1).padStart(2,"0")+'</span><strong>'+TITLES[role]+'</strong></button>').join("")+'</nav>'+
 (notice?'<p class="v26-notice" role="status">'+esc(notice)+'</p>':'')+
 (activeRole==="commissioner"?commissioner():activeRole==="captain"?captain():
 activeRole==="player"?player():activeRole==="rink"?rink():publicPage())+
 '<div class="v26-next"><span>Next in the connected journey</span><button type="button" data-v26-next>'+
 (ROLES.indexOf(activeRole)===4?"Return to commissioner":"Continue to "+TITLES[ROLES[(ROLES.indexOf(activeRole)+1)%5]])+'</button></div>'+
 audit()+sourceNote()+'</div>';
 if(activeRole==="commissioner")window.LeagueOSDecisionV27?.mount(seed,state,
   recommend(seed,{targetSize:state.targetSize,overrides:state.overrides}));
}
function page(route){
 return '<div class="v26-root" id="leagueos-connected-demo-v26" data-v26-route="'+esc(route||"")+'">'+
 '<section class="v26-loading"><h2>Preparing the fictional LeagueOS + HockeyOS journey…</h2>'+
 '<p>All five roles are simulated; no authenticated league account is being opened.</p></section></div>';
}
function mount(route){
 const root=$("#leagueos-connected-demo-v26");if(!root)return;
 activeRole=route==="team-connected-demo"?"captain":"commissioner";
 if(!loading)loading=fetch(SOURCE,{cache:"no-store"}).then(r=>{
  if(!r.ok)throw Error("HTTP "+r.status);return r.json();
 }).then(x=>{seed=validateSeed(x);return seed}).catch(e=>{
  seed=null;loading=null;throw e;
 });
 loading.then(x=>{if(!root.isConnected)return;state=restored(x);render()}).catch(()=>{
  if(root.isConnected)root.innerHTML='<section class="v26-failed"><h2>Fictional demo source unavailable</h2>'+
   '<p>The seed, identities or role boundaries failed validation. No workflow actions are available.</p></section>';
 });
}
function persist(){
 try{localStorage.setItem(STORE,JSON.stringify(state));return true}catch(_){return false}
}
document.addEventListener("click",event=>{
 const b=event.target.closest("button");
 if(!b||!$("#leagueos-connected-demo-v26")||!seed||!state)return;
 if(b.dataset.v26Role){
  if(!ROLES.includes(b.dataset.v26Role))return;
  activeRole=b.dataset.v26Role;notice="";render();return;
 }
 if(b.hasAttribute("data-v26-next")){
  activeRole=ROLES[(ROLES.indexOf(activeRole)+1)%ROLES.length];notice="";render();return;
 }
 const action=b.dataset.v26Action;if(!action)return;
 if(action==="EXPORT"){downloadStory(state);notice="Fictional local handoff exported; no server action.";render();return}
 const args={};
 if(action==="TARGET")args.target=$("#v26-target")?.value;
 if(action==="GRADE"){args.teamId=$("#v26-grade-team")?.value;args.grade=$("#v26-grade")?.value}
 if(action==="WEEK")args.week=$("#v26-week")?.value;
 if(action==="LOGO_SUBMIT"){args.choice=$("#v26-logo-choice")?.value;args.colour=$("#v26-logo-colour")?.value}
 if(action==="ASK_LEAGUE")args.text=$("#v26-captain-question")?.value;
 if(action==="REPLY")args.text=$("#v26-commissioner-reply")?.value;
 if(action==="RSVP")args.response=b.dataset.v26Value;
 const r=applyAction(state,seed,action,args,Date.now());
 state=r.state;notice=r.message;
 if(r.ok&&!persist())notice+=" Browser storage unavailable; this session only.";
 render();
});
window.LeagueOSConnectedV26={page,mount,_test:{validateSeed,recommend,strengthMismatch,roundRobin,
 scheduleDraft,newState,validateState,restored,applyAction,getState:()=>state,getSeed:()=>seed,
 storeKey:STORE}};
})();