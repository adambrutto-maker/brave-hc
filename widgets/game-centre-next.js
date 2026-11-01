/* Brave H.C. Game Centre r3 — public, source-qualified Sunday league analysis.
   Public identities, source-verified scorelines and manager-approved lineup only.
   Existing external full reports remain authoritative; no messaging, writes or forecasts.
*/
(function(){
"use strict";
const root=document.getElementById("game-centre");if(!root)return;
const $=id=>document.getElementById(id);
const n=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined&&str!==null)e.textContent=String(str);return e};
const set=(id,s)=>{$(id).textContent=s};
const fmt=(x,opts={})=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",...opts}).format(new Date(x));
const shortDate=day=>fmt(day+"T12:00:00Z",{timeZone:"UTC",month:"short",day:"numeric"});
const when=day=>fmt(day+"T12:00:00Z",{timeZone:"UTC",weekday:"short",month:"short",day:"numeric"});
const age=iso=>{const t=Date.parse(iso||"");return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):Infinity};
const hockeyPercent=x=>!Number.isFinite(x)?"—":x.toFixed(3).replace(/^0(?=\.)/,"");
const rate=(x,den)=>Number.isFinite(x)&&Number.isInteger(den)&&den>0?x/den:null;
const rateText=x=>Number.isFinite(x)?x.toFixed(2):"—";
const signedRateText=x=>Number.isFinite(x)?(x>0?"+":"")+x.toFixed(2):"—";
const number=(x,dec=0)=>Number.isFinite(x)?x.toFixed(dec):"—";
const clean=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const ADULT=["Fazzari Partners","The Cristillo Division","Remax Division"];
const LABEL={"Fazzari Partners":"Fazzari Division","The Cristillo Division":"Cristillo Division","Remax Division":"Remax Division"};
const lineupGroups=[
 {title:"FORWARDS",rows:[
  [["C7","LW"],["D7","C"],["E7","RW"]],
  [["C8","LW"],["D8","C"],["E8","RW"]],
  [["C9","LW"],["D9","C"],["E9","RW"]]]},
 {title:"DEFENCE",rows:[
  [["C12","LD"],["D12","RD"]],
  [["C13","LD"],["D13","RD"]],
  [["C14","LD"],["D14","RD"]]]},
 {title:"GOALTENDER",rows:[ [["D16","G"]] ]}
];
const state={standings:null,league:null,upcoming:null,schedule:null,assign:null,history:null,lineup:null,playerProfiles:null,
 division:"The Cristillo Division",opponent:null,rankIndex:0,rankTeam:null,
 calibration:null,rankSortKey:"strength",rankSortDirection:"desc",lineupPdf:null,
 approvedBlankHashCache:null};
function nextFixture(){return state.upcoming?.games?.find(g=>Date.now()<Date.parse(g.rolloverAtUTC))||null}
function selectTab(tab){
 for(const button of root.querySelectorAll(".tabs button")){
  const selected=button.dataset.tab===tab;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;
 }
 for(const panel of root.querySelectorAll(".tab-panel"))panel.hidden=panel.dataset.name!==tab;
}
for(const [i,button] of [...root.querySelectorAll(".tabs button")].entries()){
 button.addEventListener("click",()=>selectTab(button.dataset.tab));
 button.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
  e.preventDefault();const btns=[...root.querySelectorAll(".tabs button")];
  const at=e.key==="Home"?0:e.key==="End"?btns.length-1:(i+(e.key==="ArrowLeft"?btns.length-1:1))%btns.length;
  btns[at].focus();selectTab(btns[at].dataset.tab);
 });
}
const validRecord=r=>!!(r&&["gp","w","l","t","pts","gf","ga"].every(k=>Number.isInteger(r[k])&&r[k]>=0)&&r.w+r.l+r.t===r.gp);
function verifyStandings(x){
 if(x?.schema!=="brave-hc-svhl-standings/v1"||x.division!=="Cristillo"||!Array.isArray(x.teams)||x.teams.length!==8||
    x.teams.some(t=>!t.name||!validRecord(t)||!Number.isFinite(t.winPct)))throw Error("Cristillo standings source not verified");
 return x;
}
function verifyLeague(x){
 if(x?.schema!=="brave-hc-league-intelligence/public-v1"||
    x.status!=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED"||
    x.currentSourceDataConcordant!==true||!Array.isArray(x.teams)||!Array.isArray(x.divisions))throw Error("SVHL current-league proof missing");
 const eligible=x.teams.filter(t=>ADULT.includes(t.divisionNow));
 if(eligible.length!==22||eligible.some(t=>!Number.isInteger(t.sourceTeamId)||!validRecord(t.record)||!Array.isArray(t.completedGames)))throw Error("Adult Sunday data incomplete");
 return x;
}
function verifyUpcoming(x){if(x?.schema!=="brave-hc-upcoming-countdown/v1"||x.team!=="Brave H.C."||!Array.isArray(x.games))throw Error("HTO fixture invalid");return x}
function verifySchedule(x){if(x?.schema!=="brave-hc-svhl-schedule/v1"||!Array.isArray(x.games))throw Error("SVHL fixtures missing");return x}
function verifyAssignments(x){if(x?.schema!=="brave-hc-goalie-assignments/v1"||!x.assignments)throw Error("Goalie confirmations missing");return x}
function verifyHistory(x){if(x?.schema!=="brave-hc-opponent-intelligence/v1"||x.publishable!==true||x.status!=="PUBLIC_VERIFIED_SOURCE_IDENTITY"||!Array.isArray(x.teams))throw Error("Verified opponent ledger unavailable");return x}
async function fetchJSON(name){const r=await fetch("./"+name,{cache:"no-store"});if(!r.ok)throw Error(name+" HTTP "+r.status);return r.json()}
function eligibleTeams(){return state.league?.teams.filter(t=>ADULT.includes(t.divisionNow))||[]}
function byName(name){return eligibleTeams().find(t=>clean(t.leagueName)===clean(name)||clean(t.displayName)===clean(name))}
function calibrateSunday(teams){
 const scores=teams.map(t=>t.strengthContext?.contextIndex).filter(Number.isFinite).sort((a,b)=>a-b);
 if(scores.length<2)return null;
 const min=scores[0],max=scores.at(-1),mid=Math.floor(scores.length/2);
 const median=scores.length%2===0?(scores[mid-1]+scores[mid])/2:scores[mid];
 return Object.freeze({count:scores.length,min,median,max,
  sourceAsOf:state.league?.asOf||null,
  status:min===max?"ALL_SCORES_EQUAL":"SOURCE_COHORT_CALIBRATED"});
}
function calibratedValue(raw,anchors=state.calibration){
 if(!Number.isFinite(raw)||!anchors||!Number.isFinite(anchors.min)||!Number.isFinite(anchors.median)||!Number.isFinite(anchors.max))return null;
 const {min,median,max}=anchors;
 if(raw<min||raw>max)return null;
 if(min===max)return 75;
 if(raw<=median){
  if(median===min)return 75; // no distinct below-median observed cohort values
  return Math.min(100,Math.max(50,50+25*(raw-min)/(median-min)));
 }
 if(max===median)return 75;
 return Math.min(100,Math.max(50,75+25*(raw-median)/(max-median)));
}
const relativeStrength=team=>calibratedValue(team?.strengthContext?.contextIndex);
const relativeText=team=>rateTextOne(relativeStrength(team));
const rateTextOne=x=>Number.isFinite(x)?x.toFixed(1):"—";
function gameStreak(team,standingsRecord){
 if(!team||!Array.isArray(team.completedGames)||!validRecord(team.record))return null;
 const a=team.completedGames;
 if(a.length!==team.record.gp||team.record.gp===0)return null;
 const counts={W:0,L:0,T:0},dates=new Set();
 for(const g of a){
  if(!g||!["W","L","T"].includes(g.result)||!/^\d{4}-\d\d-\d\d$/.test(g.date)||
     !Number.isInteger(g.gf)||!Number.isInteger(g.ga)||g.gf<0||g.ga<0||(g.result==="W"&&g.gf<=g.ga)||(g.result==="L"&&g.gf>=g.ga)||(g.result==="T"&&g.gf!==g.ga))return null;
  counts[g.result]++;
  if(dates.has(g.date+"|"+g.opponent))return null;dates.add(g.date+"|"+g.opponent);
 }
 if(counts.W!==team.record.w||counts.L!==team.record.l||counts.T!==team.record.t)return null;
 if(standingsRecord&&Object.keys(counts).some((k)=>counts[k]!==standingsRecord[{W:"w",L:"l",T:"t"}[k]]))return null;
 const ordered=[...a].sort((x,y)=>y.date.localeCompare(x.date)),kind=ordered[0].result;
 let length=0;for(const g of ordered){if(g.result!==kind)break;length++}
 return {kind,length,label:(kind==="W"?"Won ":kind==="L"?"Lost ":"Tied ")+length};
}
function effectiveDivision(div){
 const row=$("division-heading"),patch=$("division-patch"),identity=patch.closest(".division-identity");
 row.textContent=LABEL[div]||div;identity.classList.toggle("no-patch",div!=="The Cristillo Division");
 $("division-description").textContent=div==="The Cristillo Division"?"SVHL Sunday Winter · Andrew Cristillo dedication":"SVHL Sunday Winter · Official published division";
}
function selectDivisions(){
 if(!state.league)return;
 const s=$("division-select"),prior=state.division;s.replaceChildren();
 for(const name of ADULT){const o=n("option",null,LABEL[name]);o.value=name;s.append(o)}
 s.value=ADULT.includes(prior)?prior:"The Cristillo Division";
}
$("division-select").addEventListener("change",v=>{state.division=v.target.value;drawStandings()});
function pointsPct(t,raw){
 const p=t.gp>0?(t.w+.5*t.t)/t.gp:null;
 if(!Number.isFinite(p))return null;
 if(t.gp>0&&Math.abs(p-(t.w+.5*t.t)/t.gp)>0.02)return null;
 return p;
}
function drawStandings(){
 if(!state.standings||!state.league)return;
 effectiveDivision(state.division);
 const current=state.division==="The Cristillo Division";
 const rows=current?state.standings.teams.map(r=>({name:r.name,record:r,winPct:r.winPct,league:byName(r.name)})):
  eligibleTeams().filter(t=>t.divisionNow===state.division).map(t=>({name:t.leagueName,record:t.record,winPct:t.winPct,league:t}));
 const sorted=rows.sort((a,b)=>b.record.pts-a.record.pts||b.record.w-a.record.w||
   ((b.record.gf-b.record.ga)-(a.record.gf-a.record.ga))||a.name.localeCompare(b.name));
 const tbody=$("standings-rows");tbody.replaceChildren();
 for(const row of sorted){
  const {record:r,league:l}=row,tr=n("tr",clean(row.name)===clean("Braves HC")?"brave":null);
  const streak=gameStreak(l,current?r:null),p=pointsPct(r,row.winPct);
  const cells=[
   ["Team",row.name],["GP",r.gp],["W-L-T",r.w+"-"+r.l+"-"+r.t],["Pts",r.pts],
   ["Win %",hockeyPercent(p)],["GF",r.gf],["GA",r.ga],["Streak",streak?streak.label:"—"]
  ];
  for(const [i,[label,value]] of cells.entries()){
   const cell=n("td",i===7&&streak?"streak-"+({"W":"win","L":"loss","T":"tie"}[streak.kind]):null,value);
   cell.dataset.label=label;tr.append(cell);
  }
  tbody.append(tr);
 }
 const stamp=state.division==="The Cristillo Division"?state.standings.capturedAt:state.league.asOf;
 const warning=age(stamp)>36?"Update check due · ":"";
 set("standings-status",warning+sorted.length+" clubs · "+(current?"Cristillo official table":"SVHL verified current-season table")+" · "+fmt(stamp,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET");
}
function time12(t){
 if(typeof t!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return "TBD";
 const [hour,min]=t.split(":").map(Number);
 return (hour%12||12)+":"+String(min).padStart(2,"0")+(hour>=12?" PM":" AM");
}
function drawGoalies(){
 if(!state.schedule||!state.assign)return;
 const games=state.schedule.games.filter(g=>Date.parse(g.date+"T23:59:00-05:00")>=Date.now()).slice(0,4);
 const body=$("goalie-rows");body.replaceChildren();
 for(const g of games){
  const matched=g.htoSyncStatus==="MATCH"&&!g.requiresGoalieReconfirmation;
  const goalie=matched?(state.assign.assignments[g.assignmentKey]||"TBD"):"TBD";
  const tr=n("tr"),first=n("td");first.append(n("span","date",when(g.date)),n("span","opp",g.opponent),n("span","tiny",(g.rink||"Rink TBD")+" · "+(g.side==="home"?"Home":"Away")));
  tr.append(first,n("td",null,time12(g.time)),n("td",goalie==="TBD"?"pending":null,goalie));body.append(tr);
 }
 if(!games.length){const tr=n("tr"),td=n("td",null,"No current verified fixture");td.colSpan=3;tr.append(td);body.append(tr)}
 const stamp=state.schedule.checkedAt;
 set("goalie-status",(age(stamp)>36?"Schedule check overdue · ":"")+"SVHL fixtures checked "+fmt(stamp,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" ET · Unconfirmed goalies: TBD");
}
const blankPdf="./assets/lineups/brave-hc-blank-original-card.pdf";
const pdfCache=new Map();
function allowedPdfPath(path){
 return typeof path==="string"&&/^\.\/assets\/lineups\/[a-z0-9][a-z0-9_/-]*\.pdf$/.test(path)&&!path.includes("..");
}
async function pdfIntegrity(entry){
 if(!entry||!allowedPdfPath(entry.url)||typeof entry.sha256!=="string"||!/^[a-f0-9]{64}$/.test(entry.sha256))return false;
 const key=entry.url+"|"+entry.sha256;
 if(pdfCache.has(key))return pdfCache.get(key);
 const pending=(async()=>{
  const response=await fetch(entry.url,{cache:"no-store"});
  if(!response.ok)return false;
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<15000||bytes.byteLength>3000000)return false;
  const magic=new TextDecoder().decode(bytes.slice(0,5));
  if(magic!=="%PDF-")return false;
  if(!crypto?.subtle)return false;
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  const sha=[...digest].map(b=>b.toString(16).padStart(2,"0")).join("");
  return sha===entry.sha256;
 })().catch(()=>false);
 pdfCache.set(key,pending);
 return pending;
}
async function pngPreviewIntegrity(entry){
 const url=entry?.previewImage,sha=entry?.previewSHA256;
 if(typeof url!=="string"||!/^\.\/assets\/lineups\/[a-z0-9][a-z0-9_-]*\.png$/.test(url)||
    typeof sha!=="string"||!/^[a-f0-9]{64}$/.test(sha))return false;
 const key=url+"|"+sha;
 if(pdfCache.has(key))return pdfCache.get(key);
 const work=(async()=>{
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)return false;
  const data=await response.arrayBuffer(),bytes=new Uint8Array(data);
  if(bytes.length<5000||bytes.length>3000000||
     bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)return false;
  if(!crypto?.subtle)return false;
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
  return [...digest].map(b=>b.toString(16).padStart(2,"0")).join("")===sha;
 })().catch(()=>false);
 pdfCache.set(key,work);return work;
}
function verifyPdfManifest(x){
 if(x?.schema!=="brave-hc-game-centre-public-lineup-pdf/v1"||
    x.sourceWorkbookSHA256!=="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"||
    x.blank?.sourceRange!=="Lines!G5:J16"||x.blank?.pageCount!==1||
    x.blank?.publicBlankTemplateApproved!==true||x.blank?.containsPlayerNames!==false||
    !allowedPdfPath(x.blank.url)||x.weeklyAutoPublishEnabled!==false||
    x.privateWhatsAppPollDataPublished!==false)throw Error("Public lineup PDF manifest not verified");
 return x;
}
function validApprovedPdf(feed,profiles,manifest){
 const fix=nextFixture(),approved=manifest?.approved;
 if(!fix||manifest?.status!=="MANAGER_APPROVED_PUBLIC_LINEUP"||!approved)return false;
 if(approved.authorizedForPublic!==true||approved.managerApproved!==true||
    approved.fixtureId!==fix.id||approved.gameDate!==fix.gameDate||
    approved.opponent!==fix.opponent||
    approved.sourceRange!=="Lines!G5:J16"||
    !allowedPdfPath(approved.url)||!approved.sha256||!approved.approvalId||
    !approved.evidenceFingerprint||approved.outboundMessagesSent!==0)return false;
 if(!window.BraveGameNightContract||!feed||!profiles||profiles.schema!=="brave-hc-player-career-insights/v1"||
    profiles.sourceAuthority!=="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK")return false;
 const profile=id=>{
  const p=profiles.players?.[String(id)];
  return p&&p.status==="VERIFIED_PROFILE_CAREER_SUM_PARITY"?{name:p.name}:null;
 };
 const result=window.BraveGameNightContract.confirm(feed,state.upcoming,profile,new Date().toISOString());
 return result?.approved===true&&result.fixture.id===fix.id&&
   result.approvalId===approved.approvalId&&result.evidenceFingerprint===approved.evidenceFingerprint;
}
// Only roster-level counts are public; this summary cannot supply names or approve a PDF.
function attendanceForFixture(s,fix,now){
 if(!s||!fix||s.fixtureId!==fix.id||s.opponent!==fix.opponent||s.gameDate!==fix.gameDate||s.puckDropUTC!==fix.puckDropUTC)return null;
 const checked=Date.parse(s.checkedAt),start=Date.parse(fix.puckDropUTC);
 if(!Number.isFinite(checked)||!Number.isFinite(start)||checked>now||now>=start||now-checked>48*3600000)return null;
 for(const v of [s.skatersIndicatingIn,s.partTimersAvailable])if(!Number.isInteger(v)||v<0||v>100)return null;
 return {skaters:s.skatersIndicatingIn,available:s.partTimersAvailable,checked:s.checkedAt};
}
function drawAttendanceSummary(manifest,fix){
 const host=$("lineup-attendance");if(!host)return;
 host.hidden=true;host.replaceChildren();
 if(manifest?.status!=="BLANK_PENDING_APPROVAL"||manifest.approved!=null)return;
 const s=attendanceForFixture(manifest.attendanceSnapshot,fix,Date.now());if(!s)return;
 host.append(n("div","eyebrow","PREGAME AVAILABILITY"),n("h4",null,s.skaters+" skater"+(s.skaters===1?"":"s")+" indicated in"),
  n("p",null,s.available+" part-timer"+(s.available===1?"":"s")+" available if called. Not included in the skater count."),
  n("p","source-note","Checked "+fmt(s.checked,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})+" Toronto time. These are attendance responses, not assigned lines."));
 host.hidden=false;
}
// Explicit manager release of this game?s skater card is separate from a final lineup or goalie booking.
function publicWorkingEntry(m,fix,now){
 const e=m?.publishedWorkingCard;
 if(!fix||!e||!Number.isSafeInteger(fix.id)||m.approved!=null||m.status!=="BLANK_PENDING_APPROVAL"||m.weeklyAutoPublishEnabled!==false||m.privateWhatsAppPollDataPublished!==false)return null;
 if(e.state!=="PUBLIC_WORKING_LINEUP"||e.authorizedForPublic!==true||e.sourceRange!=="Lines!G5:J16"||e.fixtureId!==fix.id||e.opponent!==fix.opponent||e.gameDate!==fix.gameDate||e.puckDropUTC!==fix.puckDropUTC||e.expiresAt!==fix.rolloverAtUTC)return null;
 // A confirmed rental goalie is supported only with a game-bound booking confirmation.
 // This DOES NOT convert the working card into an official league-approved lineup.
 if(e.goalieConfirmed!==false&&e.goalieConfirmed!==true)return null;
 if(e.goalieConfirmed===true){
  const g=e.rentalGoalie;
  if(!g||g.source!=="GOALIEUP_CONFIRMATION_EMAIL"||g.status!=="RENTAL_CONFIRMED"||
     typeof g.name!=="string"||!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{2,80}$/.test(g.name)||
     g.number!=="0"||g.fixtureId!==fix.id||g.gameDate!==fix.gameDate||g.puckDropUTC!==fix.puckDropUTC||
     typeof g.confirmedAtUTC!=="string"||!Number.isFinite(Date.parse(g.confirmedAtUTC))||
     Date.parse(g.confirmedAtUTC)>Date.parse(e.publishedAt)||
     Date.parse(g.confirmedAtUTC)>=Date.parse(fix.puckDropUTC))return null;
 }else if(e.rentalGoalie!=null)return null;
 const pub=Date.parse(e.publishedAt),end=Date.parse(e.expiresAt);if(![now,pub,end].every(Number.isFinite)||now<pub||now>=end)return null;
 const h=/^[a-f0-9]{64}$/;if(![e.sha256,e.previewSHA256,e.sourceSha256].every(v=>typeof v==='string'&&h.test(v))||e.sourceSha256!==m.workingCard?.sha256)return null;
 if(!allowedPdfPath(e.url)||!e.url.endsWith('-'+fix.gameDate+'-working.pdf')||e.previewImage!==e.url.slice(0,-4)+'.png')return null;
 return e;
}
let lineupLoadVersion=0,workingExpiryTimer=null;
async function drawLineup(){
 const version=++lineupLoadVersion,fix=nextFixture();
 set("lineup-fixture",fix?"Next: "+when(fix.gameDate)+" · "+fix.opponent:"Next fixture awaiting official HTO verification");
 const manifest=state.lineupPdf;
 drawAttendanceSummary(manifest,fix);
 const released=root.dataset.publicWorkingLineup==="1"?publicWorkingEntry(manifest,fix,Date.now()):null;
 window.BraveManagerWorkingCard?.update(released?null:manifest,fix);
 if(workingExpiryTimer!==null)clearTimeout(workingExpiryTimer);workingExpiryTimer=null;
 if(released)workingExpiryTimer=setTimeout(()=>void drawLineup(),Math.min(2147483000,Math.max(10,Date.parse(released.expiresAt)-Date.now()+10)));
 const frame=$("lineup-pdf-frame"),preview=$("lineup-pdf-preview"),print=$("lineup-print"),open=$("lineup-open");
 const block=()=>{frame.removeAttribute("src");preview.removeAttribute("src");preview.hidden=true;for(const a of [print,open]){a.removeAttribute("href");a.setAttribute("aria-disabled","true");a.tabIndex=-1}};
 block();
 if(!manifest){set("lineup-notice","Checking the original workbook-derived blank PDF…");return}
 let entry=released||manifest.blank;
 let approved=false;
 if(validApprovedPdf(state.lineup,state.playerProfiles,manifest)){
  if(await pdfIntegrity(manifest.approved)){entry=manifest.approved;approved=true}
 }
 if(!await pdfIntegrity(entry)){if(version===lineupLoadVersion)set("lineup-notice","Printable lineup temporarily unavailable. Source or PDF integrity check failed.");return}
 const previewVerified=await pngPreviewIntegrity(entry);
 if(version!==lineupLoadVersion)return;
 const url=entry.url;
 frame.src=url+"#view=FitH&toolbar=0&navpanes=0";
 const goalieNotice=released?.goalieConfirmed===true?"Rental goalie #"+released.rentalGoalie.number+" "+released.rentalGoalie.name+" confirmed (GoalieUp)":"Goalie unconfirmed";
 if(previewVerified){preview.alt=released?"Working skater lineup vs "+fix.opponent+"; "+goalieNotice+". Open the PDF to read or print the assignments.":approved?"Approved lineup card":"Blank original lineup card";preview.src=entry.previewImage;preview.hidden=false}
 frame.title=released?"Working skater lineup vs "+fix.opponent:approved?"Official lineup card":"Blank original lineup card";
 for(const a of [print,open]){a.href=url;a.removeAttribute("aria-disabled");a.tabIndex=0}
 set("lineup-notice",approved?
   "Official manager-approved lineup PDF · "+when(fix.gameDate)+" vs "+fix.opponent:
   released?"Working lineup vs "+fix.opponent+" | "+goalieNotice+". Open or print the filled card below.":
   "Blank original Brave H.C. card · lineup pending manager approval. Print or open the one-page PDF; do not use historical player sheets.");
}

function miniMetric(label,value){const box=n("div","tile");box.append(n("strong",null,value),n("span",null,label));return box}
function renderOpponent(){
 const card=$("opponent-card"),name=state.opponent;
 card.replaceChildren();if(!state.league||!name)return;
 const t=byName(name);
 if(!t){card.append(n("p",null,"No source-verified current team profile for that selection."));return;}
 const strengths=t.strengthContext||{},r=t.record;
 const top=n("div","opp-title"),title=n("div");
 const next=nextFixture();
 title.append(n("div","eyebrow",next&&clean(next.opponent)===clean(t.leagueName)?"NEXT VERIFIED OPPONENT":"SUNDAY LEAGUE SCOUTING"));
 title.append(n("h3",null,t.displayName||t.leagueName),n("p",null,LABEL[t.divisionNow]||t.divisionNow));
 top.append(title,n("span","badge-rank",Number.isInteger(adultRank(t))?"Sunday #"+adultRank(t):"Rating held"));card.append(top);
 const grid=n("div","bio-style-metrics");
 const streak=gameStreak(t);
 for(const [label,val] of [
  ["Relative /100",relativeText(t)],
  ["W-L-T",r.w+"-"+r.l+"-"+r.t],
  ["Goals /game",r.gp?number(r.gf/r.gp,1):"—"],
  ["Against /game",r.gp?number(r.ga/r.gp,1):"—"]])grid.append(miniMetric(label,val));
 card.append(grid);
 const summary=r.gp?
  t.displayName+" have scored "+number(r.gf/r.gp,1)+" goals per game and allowed "+number(r.ga/r.gp,1)+
  ". "+(streak?"Their latest run is "+streak.label.toLowerCase()+". ":"")+
  "These are completed-game trends, not a predicted score.":
  "Not enough verified current games for a form assessment.";
 card.append(n("p","opp-read",summary));
 card.append(n("div","mini-head","RECENT RESULTS"));
 const ul=n("ul","mini-list");
 const last=[...(t.completedGames||[])].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 for(const g of last){ul.append(n("li",null,shortDate(g.date)+" · "+({"W":"Won","L":"Lost","T":"Tied"}[g.result]||"Result")+" "+g.gf+"–"+g.ga+" vs "+g.opponent))}
 if(!last.length)ul.append(n("li",null,"Verified recent results not available"));
 card.append(ul);
 const history=state.history?.teams.find(x=>clean(x.name)===clean(t.leagueName));
 const hh=n("div","history"),header=n("div","mini-head","BRAVE H.C. HEAD-TO-HEAD");
 hh.append(header);
 if(history&&["VERIFIED_EXACT_NAME","VERIFIED_HISTORICAL_NAME_VARIANT"].includes(history.verification)&&
   history.regularSeason&&Number.isInteger(history.regularSeason.gp)){
  const q=history.regularSeason;
  hh.append(n("p",null,q.gp+" verified regular-season meetings · "+q.w+" wins, "+q.l+" losses, "+q.t+" ties."));
 }else hh.append(n("p",null,"No exact, verified historical matchup linked to this source team."));
 card.append(hh);
 card.append(n("p","source-note","Relative Sunday strength is a 50–100 cohort display of the unchanged HockeyOS source index; "+(strengths.confidence==="LIMITED_SAMPLE"?"small sample · early-season evidence":"source-qualified snapshot")+
  " · not a win probability. Opponent division and historical franchise identities are not presumed interchangeable."));
 $("opponent-details-link").href="./league-intelligence.html?team="+encodeURIComponent(t.leagueName);
}
function selectOpponentOptions(){
 const selector=$("opponent-select"),teams=eligibleTeams();
 if(!teams.length)return;
 const next=nextFixture();
 const options=[...teams].sort((a,b)=>a.divisionNow.localeCompare(b.divisionNow)||a.leagueName.localeCompare(b.leagueName));
 const previous=state.opponent;
 selector.replaceChildren();
 for(const t of options){const o=n("option",null,t.leagueName+" · "+LABEL[t.divisionNow]);o.value=t.leagueName;selector.append(o)}
 const initial=teams.find(x=>clean(x.leagueName)===clean(previous))?.leagueName||
  teams.find(x=>next&&clean(x.leagueName)===clean(next.opponent))?.leagueName||"Mid Ice Crisis";
 state.opponent=initial;selector.value=initial;renderOpponent();
}
$("opponent-select").addEventListener("change",e=>{state.opponent=e.target.value;renderOpponent()});
function rankRows(){
 // Accepted HockeyOS context scores are unchanged. Re-number ranks across
 // the 22 competitive adult Sunday teams ONLY (exclude VAHL and x-playoff).
 return eligibleTeams().sort((a,b)=>{
  const ar=a.strengthContext?.contextIndex,br=b.strengthContext?.contextIndex;
  if(Number.isFinite(ar)&&Number.isFinite(br))return br-ar||a.leagueName.localeCompare(b.leagueName);
  if(Number.isFinite(ar))return -1;if(Number.isFinite(br))return 1;
  return a.leagueName.localeCompare(b.leagueName);
 });
}
function adultRank(t){
 const i=rankRows().findIndex(x=>x.sourceTeamId===t.sourceTeamId);
 return i<0?null:i+1;
}
const sortableKeys=new Set(["rank","team","division","strength","gp","ptsPerGame","gfPerGame","gaPerGame","gdPerGame","streak"]);
const sortedRates=team=>{
 const r=team.record,streak=gameStreak(team);
 return {rank:adultRank(team),team:team.leagueName,division:LABEL[team.divisionNow],
  strength:relativeStrength(team),gp:r.gp,ptsPerGame:rate(r.pts,r.gp),
  gfPerGame:rate(r.gf,r.gp),gaPerGame:rate(r.ga,r.gp),
  gdPerGame:rate(r.gf-r.ga,r.gp),
  streak:streak?streak.kind==="W"?streak.length:streak.kind==="L"?-streak.length:0:null,
  streakLabel:streak?.label||"—"};
};
function rankedSortValue(team,key){return sortedRates(team)[key]}
function sortRankings(){
 const key=state.rankSortKey,dir=state.rankSortDirection==="asc"?1:-1;
 return [...rankRows()].sort((a,b)=>{
  const av=rankedSortValue(a,key),bv=rankedSortValue(b,key);
  if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
  let diff=0;
  if(typeof av==="string"&&typeof bv==="string")diff=av.localeCompare(bv,"en",{sensitivity:"base"});
  else if(Number.isFinite(av)&&Number.isFinite(bv))diff=av-bv;
  if(diff)return diff*dir;
  return a.sourceTeamId-b.sourceTeamId; // source-ID tie-break, stable
 });
}
function setRankSort(key,dir){
 if(!sortableKeys.has(key)||!["asc","desc"].includes(dir))return;
 state.rankSortKey=key;state.rankSortDirection=dir;state.rankIndex=0;
 const select=$("rank-sort-select");if(select)select.value=key+":"+dir;
 for(const th of root.querySelectorAll(".ranking-table thead th")){
  const active=th.querySelector("button")?.dataset.rankSort===key;
  th.setAttribute("aria-sort",active?(dir==="asc"?"ascending":"descending"):"none");
 }
 drawRankings();
}
for(const button of root.querySelectorAll("[data-rank-sort]")){
 button.addEventListener("click",()=>{
  const key=button.dataset.rankSort;
  const defaultDir=["rank","team","division","gaPerGame"].includes(key)?"asc":"desc";
  const dir=state.rankSortKey===key?(state.rankSortDirection==="desc"?"asc":"desc"):defaultDir;
  setRankSort(key,dir);
 });
}
$("rank-sort-select").addEventListener("change",e=>{
 const [key,dir]=e.target.value.split(":");setRankSort(key,dir);
});
function rankingCell(label,value){
 const td=n("td",null,value);td.dataset.label=label;return td;
}
function renderRankCard(team){
 const m=sortedRates(team),article=n("article","ranking-card"+(clean(team.leagueName)===clean("Braves HC")?" brave":""));
 article.setAttribute("role","listitem");
 const header=n("div","ranking-card-head"),left=n("div"),right=n("div","ranking-card-score");
 left.append(n("strong",null,"#"+m.rank+" · "+m.team),n("span",null,m.division));
 right.append(n("b",null,rateTextOne(m.strength)),n("span",null,"REL. STRENGTH"));
 header.append(left,right);article.append(header);
 const stats=n("div","ranking-rate-grid");
 for(const [lab,v] of [["Pts/GP",rateText(m.ptsPerGame)],["GF/GP",rateText(m.gfPerGame)],
  ["GA/GP",rateText(m.gaPerGame)],["GD/GP",signedRateText(m.gdPerGame)]]){
  const tile=n("div","ranking-rate"),strong=n("strong",null,v);
  tile.append(strong,n("small",null,lab));stats.append(tile);
 }
 article.append(stats);
 const foot=n("div","ranking-card-foot");
 foot.append(n("span",null,m.gp+" GP"),n("span",m.streak>0?"streak-win":m.streak<0?"streak-loss":"streak-tie",m.streakLabel));
 article.append(foot);
 return article;
}
function drawRankings(){
 if(!state.league)return;
 const all=sortRankings(),size=window.innerWidth<=400?3:window.innerWidth<=900?4:8,pages=Math.ceil(all.length/size);
 state.rankIndex=Math.min(Math.max(0,state.rankIndex),pages-1);
 const batch=all.slice(state.rankIndex*size,(state.rankIndex+1)*size);
 const body=$("rankings-rows"),list=$("ranking-mobile-list");body.replaceChildren();list.replaceChildren();
 for(const team of batch){
  const m=sortedRates(team),tr=n("tr",clean(team.leagueName)===clean("Braves HC")?"brave":null);
  const vals=[["Rank",m.rank],["Club",m.team],["Division",m.division],
   ["Strength",rateTextOne(m.strength)],["GP",m.gp],["Pts/GP",rateText(m.ptsPerGame)],
   ["GF/GP",rateText(m.gfPerGame)],["GA/GP",rateText(m.gaPerGame)],
   ["GD/GP",signedRateText(m.gdPerGame)],["Streak",m.streakLabel]];
  for(const [name,value] of vals)tr.append(rankingCell(name,value));
  body.append(tr);list.append(renderRankCard(team));
 }
 $("rank-prev").disabled=state.rankIndex===0;$("rank-next").disabled=state.rankIndex===pages-1;
 set("rank-page","Page "+(state.rankIndex+1)+" / "+pages);
 const calib=state.calibration,tag=calib?.status==="ALL_SCORES_EQUAL"?" (all source indices tied)":"";
 set("rankings-status",all.length+" adult Sunday clubs · rate statistics per completed game · relative strength "+
  "50 / 75 / 100 anchored to source minimum, median and maximum"+tag+
  " · "+shortDate(state.league.asOf.slice(0,10))+". Not win odds.");
}
$("rank-prev").addEventListener("click",()=>{state.rankIndex--;drawRankings()});
$("rank-next").addEventListener("click",()=>{state.rankIndex++;drawRankings()});
function drawRankTeam(){
 const target=$("rank-team-detail"),team=byName(state.rankTeam);
 target.replaceChildren();if(!team)return;
 const q=team.strengthContext||{},r=team.record,m=sortedRates(team);
 target.append(n("h4",null,team.leagueName+" · "+LABEL[team.divisionNow]));
 target.append(n("p",null,"Relative strength "+rateTextOne(m.strength)+"/100 · Sunday rank #"+m.rank+
  " · "+r.gp+" GP · "+r.w+"-"+r.l+"-"+r.t+" W-L-T · "+m.streakLabel));
 const g=n("div","research-rate-grid");
 for(const [name,val] of [["Pts/GP",rateText(m.ptsPerGame)],["GF/GP",rateText(m.gfPerGame)],
  ["GA/GP",rateText(m.gaPerGame)],["GD/GP",signedRateText(m.gdPerGame)]]){
  const tile=n("div","ranking-rate");
  tile.append(n("strong",null,val),n("small",null,name));g.append(tile);
 }
 target.append(g);
 target.append(n("p","muted","Underlying HockeyOS context index: "+rateTextOne(q.contextIndex)+
   ". This display is calibrated only relative to this snapshot's eligible Sunday cohort. "+
   (q.confidence==="LIMITED_SAMPLE"?"Limited sample.":"Verified season sample.")));
 const section=n("div","mini-head","RESULTS AGAINST TEAMS NOW IN EACH DIVISION");target.append(section);
 const groups=new Map(ADULT.map(name=>[name,[]]));
 for(const game of team.completedGames||[])if(groups.has(game.opponentCurrentDivision))groups.get(game.opponentCurrentDivision).push(game);
 for(const [division,games] of groups){
  if(!games.length)continue;
  const record={W:0,L:0,T:0};
  games.forEach(x=>{if(Object.hasOwn(record,x.result))record[x.result]++});
  const gf=games.reduce((v,g)=>v+g.gf,0),ga=games.reduce((v,g)=>v+g.ga,0);
  target.append(n("p",null,LABEL[division]+": "+record.W+" W · "+record.L+" L · "+record.T+" T · "+
   rateText(gf/games.length)+" GF/GP · "+rateText(ga/games.length)+" GA/GP ("+games.length+" verified games)"));
 }
 target.append(n("p","source-note","Groups use opponents' CURRENT listed divisions; a team's division when games occurred may differ."));
}
function drawMovement(){
 const box=$("division-movements");box.replaceChildren();
 const movement=state.league?.movementLedger;
 if(!movement||!Array.isArray(movement.events)){box.append(n("p",null,"No verified division-change ledger available."));return}
 if(!movement.events.length){box.append(n("p",null,"No observed division changes recorded yet."));return}
 for(const e of [...movement.events].slice(-4).reverse()){
  const line=n("div","movement-row");
  line.append(n("strong",null,e.leagueName||"Team"),n("div",null,
  e.fromDivision?(LABEL[e.fromDivision]||e.fromDivision)+" → "+(LABEL[e.toDivision]||e.toDivision):
   "First observed in "+(LABEL[e.toDivision]||e.toDivision)+" · prior division not established"));
  const observed=e.firstObservedAt?shortDate(e.firstObservedAt.slice(0,10)):"date pending";
  line.append(n("small",null,"Detected by "+observed+" · official effective date unverified"));
  box.append(line);
 }
}
function selectRankOptions(){
 const s=$("rank-team-select"),all=rankRows();s.replaceChildren();
 for(const t of all){const o=n("option",null,t.leagueName+" · "+LABEL[t.divisionNow]);o.value=t.leagueName;s.append(o)}
 const found=all.find(t=>t.leagueName===state.rankTeam)?.leagueName||all.find(t=>clean(t.leagueName)===clean("Braves HC"))?.leagueName||all[0]?.leagueName;
 state.rankTeam=found||null;s.value=found||"";drawRankTeam();
}
$("rank-team-select").addEventListener("change",e=>{state.rankTeam=e.target.value;drawRankTeam()});
function refreshLeagueInfo(){
 if(!state.league)return;
 state.calibration=calibrateSunday(eligibleTeams());
 if(state.calibration){
  const {min,median,max,count,sourceAsOf}=state.calibration;
  set("calibration-status",count+" competitive Sunday clubs · raw HockeyOS anchors "+min.toFixed(2)+" / "+median.toFixed(2)+" / "+max.toFixed(2)+
   " map to relative 50 / 75 / 100. Source: "+shortDate(sourceAsOf.slice(0,10))+". Display-only calibration, not Award Races ratings or win odds.");
 }
 selectDivisions();drawStandings();selectOpponentOptions();drawRankings();selectRankOptions();drawMovement();
}
async function updateData(){
 const jobs=[
  fetchJSON("standings.json").then(verifyStandings).then(t=>{state.standings=t;drawStandings()}).catch(()=>{set("standings-status","Cristillo official standings temporarily unavailable. Check the league website.")}),
  fetchJSON("league-intelligence.json").then(verifyLeague).then(t=>{state.league=t;refreshLeagueInfo()}).catch(()=>{set("rankings-status","Sunday power rankings withheld: verified league evidence unavailable.")}),
  fetchJSON("countdown.json").then(verifyUpcoming).then(t=>{state.upcoming=t;selectOpponentOptions();drawLineup()}).catch(()=>{state.upcoming=null;void drawLineup();set("lineup-notice","No verified current fixture. Lineup remains blank.")}),
  fetchJSON("svhl-upcoming.json").then(verifySchedule).then(t=>{state.schedule=t;drawGoalies()}).catch(()=>{set("goalie-status","SVHL schedule unavailable. Check the official league page.")}),
  fetchJSON("goalie-assignments.json").then(verifyAssignments).then(t=>{state.assign=t;drawGoalies()}).catch(()=>{set("goalie-status","Published goaltender confirmation unavailable.")}),
  fetchJSON("opponent-intelligence.json").then(verifyHistory).then(t=>{state.history=t;renderOpponent()}).catch(()=>{renderOpponent()}),
  fetchJSON("game-night-lineup-public-v27-preview.json").then(t=>{state.lineup=t;drawLineup()}).catch(()=>{drawLineup()}),
  fetchJSON("player-career-insights.json").then(t=>{state.playerProfiles=t;drawLineup()}).catch(()=>{drawLineup()}),
  fetchJSON("game-centre-lineup-public.json").then(verifyPdfManifest).then(t=>{state.lineupPdf=t;drawLineup()}).catch(()=>{state.lineupPdf=null;drawLineup();set("lineup-notice","Public lineup manifest not verified; printable PDF withheld.")})
 ];
 await Promise.allSettled(jobs);
}
// HTO Text Area may size the iframe to actual tab content using a strict
// parent-side origin/source guard. This sends no player or private data.
function publishHeight(){
 const height=Math.ceil(root.getBoundingClientRect().height)+10;
 if(window.parent!==window&&height>=450&&height<=2200){
  window.parent.postMessage({type:"brave-hc.gamecentre.height",version:1,height},"*");
 }
}
if(typeof ResizeObserver==="function")new ResizeObserver(publishHeight).observe(root);
window.addEventListener("load",publishHeight);
drawLineup();
updateData();
setInterval(updateData,5*60*1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)updateData()});
window.BraveGameCentreTest=Object.freeze({validRecord,gameStreak,verifyLeague,time12,rankRows,ADULT,pointsPct,calibrateSunday,calibratedValue,hockeyPercent,rate,allowedPdfPath,verifyPdfManifest,sortedRates,sortRankings});
})();