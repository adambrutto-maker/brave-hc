/* LeagueOS V22 — original public-source reconciliation pilot and browser-local review desk.
   No official HTO/SVHL API, records, standings or approval capability. */
(function(){"use strict";
const ASSET="./leagueos-reconciliation-v22.json",SCHEMA="bruttech-leagueos-public-reconciliation/v22",
 KEY="leagueos-v22-personal-demo-review-v1";
const CATEGORIES={
 PUBLIC_COMPLETED_PARITY_OBSERVED:{label:"Completed · public parity",tone:"matched"},
 PUBLIC_FUTURE_PARITY_OBSERVED:{label:"Future · public parity",tone:"matched"},
 NAME_ALIAS_REVIEW_HOLD:{label:"Name identity review",tone:"review"},
 HISTORICAL_HTO_ID_REUSED_HOLD:{label:"Historical HTO ID reuse",tone:"critical"},
 SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD:{label:"HTO fixture not confirmed",tone:"review"},
 SUPPLEMENTAL_UNVERIFIED_HTO_REFERENCE_HOLD:{label:"Unverified HTO reference",tone:"critical"},
 SOURCE_MATCH_MISSING_HOLD:{label:"HTO counterpart missing",tone:"review"},
 STATE_CONFLICT_HOLD:{label:"Completed status conflict",tone:"critical"},
 RESULT_CONFLICT_HOLD:{label:"Final score conflict",tone:"critical"},
 VENUE_CONFLICT_HOLD:{label:"Rink assignment conflict",tone:"review"},
 HTO_WITHOUT_LEAGUE_FIXTURE_HOLD:{label:"League counterpart missing",tone:"review"},
 LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD:{label:"Unresolved past result",tone:"review"}
};
const FILTERS=[
 ["review","Needs review"],["all","All cases"],["observed","Public parity"],
 ["proposals","Future proposals"],["league","League result holds"],["pilot","Brave H.C. pilot"]
];
const NOTES_STATUS=[
 ["unreviewed","Unreviewed"],["investigating","Investigating"],["source_needed","Source evidence needed"],
 ["note_recorded","Internal note recorded"]
];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
const dateLabel=iso=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||""))return String(iso||"Not dated");
 return new Date(iso+"T12:00:00Z").toLocaleDateString("en-CA",
  {timeZone:"UTC",month:"short",day:"numeric",year:"numeric"});
};
const timeLabel=t=>{
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t||""))return "Time unverified";
 const h=Number(t.slice(0,2));return (h%12||12)+":"+t.slice(3)+(h>=12?" PM":" AM");
};
const matchTypes=["BRAVE_MATCHUP","SUPPLEMENTAL_FUTURE_PROPOSAL","UNRESOLVED_LEAGUE_RESULT","HTO_UNPAIRED"];
function allowedLink(u){
 if(typeof u!=="string"||u.length>1024)return false;
 return /^https:\/\/leagues\.sportsvillage\.ca\/(?:gameinfo\.aspx|Leagues\.aspx)\?(?:[^<>"'\\\s]|&amp;)+$/i.test(u)||
  /^https:\/\/www\.htosports\.com\/teams\/default\.asp\?(?:[^<>"'\\\s]|&amp;)+$/i.test(u);
}
function validate(d){
 if(!d||d.schema!==SCHEMA||d.mode!=="PUBLIC_DEMO_SOURCE_REVIEW_ONLY"||
 d.scope!=="BRAVE_HC_CROSS_SOURCE_PILOT_AND_LEAGUE_ZERO_ZERO_HOLDS"||
 d.officialWriteAllowed!==false||d.authenticatedReviewAvailable!==false||
 d.state!=="DATED_PUBLIC_SOURCE_REVIEW_NOT_LIVE_SYNC"||!Array.isArray(d.cases)||
 !d.counts||!d.inputs||!d.sourceLinks||!d.comparisonPolicy||
 !Number.isFinite(Date.parse(d.createdAt)))throw Error("Invalid reconciliation authority/schema");
 for(const source of ["league","hto","upcoming"]){
  const s=d.inputs[source];
  if(!s||!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isFinite(Date.parse(s.capturedAt))&&
   !/^\d{4}-\d{2}-\d{2}$/.test(s.capturedAt))throw Error("Missing source fingerprint "+source);
 }
 if(!allowedLink(d.sourceLinks.officialLeague)||!allowedLink(d.sourceLinks.officialHto))
  throw Error("Untrusted official source link");
 const ids=new Set();
 for(const c of d.cases){
  if(!c||typeof c.id!=="string"||c.id.length>150||ids.has(c.id)||
   !matchTypes.includes(c.caseType)||!Object.prototype.hasOwnProperty.call(CATEGORIES,c.category)||
   !["CRITICAL","HIGH","MEDIUM","LOW","INFO"].includes(c.priority)||
   typeof c.reviewRequired!=="boolean"||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||
   !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.time)||
   c.officialWriteAllowed!==false||c.crossSystemIdBinding!=="NOT_OFFICIALLY_AUTHORIZED"||
   !Array.isArray(c.links)||!c.links.every(x=>x&&typeof x.label==="string"&&
    x.label.length<80&&allowedLink(x.href))||
   typeof c.explanation!=="string"||c.explanation.length>500)
    throw Error("Reconciliation case failed validation");
  const held=c.category.endsWith("_HOLD");
  if(c.reviewRequired!==held)throw Error("A source hold cannot be relabeled as approved");
  if(c.htoGameId!==null&&!/^\d{6,9}$/.test(c.htoGameId))
   throw Error("Source ID invalid");
  if(c.leagueGameId!==null&&(!Number.isInteger(c.leagueGameId)||c.leagueGameId<1))
   throw Error("League game ID invalid");
  if(c.caseType==="UNRESOLVED_LEAGUE_RESULT"&&(c.leagueScore!==null||c.htoScore!==null))
   throw Error("Held 0-0 source must never be scored");
  if(c.category==="PUBLIC_COMPLETED_PARITY_OBSERVED"&&
    (c.caseType!=="BRAVE_MATCHUP"||c.matchedBy!=="EXACT_LITERAL_TUPLE"||
     c.scoreParity!==true||!c.leagueScore||!c.htoScore||
     c.leagueScore.club!==c.htoScore.club||
     c.leagueScore.opponent!==c.htoScore.opponent||
     c.leagueState!=="COMPLETED_SOURCE_VERIFIED"||
     c.htoState!=="COMPLETED_HTO_BOX_SCORE"||!c.htoGameId))
     throw Error("Completed public parity cannot bypass source evidence");
  if(c.category==="PUBLIC_FUTURE_PARITY_OBSERVED"&&
    (c.caseType!=="BRAVE_MATCHUP"||c.matchedBy!=="EXACT_LITERAL_TUPLE"||
     c.leagueScore!==null||c.htoScore!==null||c.rinkParity!==true||
     c.leagueState!=="FUTURE_RECIPROCAL_FIXTURE"||
     c.htoState!=="SCHEDULED_HTO_PREVIEW_AT_CAPTURE"||!c.htoGameId))
     throw Error("Future public parity cannot bypass HTO preview evidence");
  if(c.category==="NAME_ALIAS_REVIEW_HOLD"&&
    (c.matchedBy!=="CONTROLLED_ALIAS_REVIEW_ONLY"||c.scoreParity!==true||
     !c.htoGameId||c.htoState!=="COMPLETED_HTO_BOX_SCORE"))
     throw Error("Name alias requires original held source evidence");
  if(c.category==="HISTORICAL_HTO_ID_REUSED_HOLD"&&
    (c.caseType!=="SUPPLEMENTAL_FUTURE_PROPOSAL"||
     c.referencedHtoGameStatus!=="COMPLETED_HTO_BOX_SCORE"||
     !/^\d{4}-\d{2}-\d{2}$/.test(c.referencedHtoGameDate||"")||
     c.referencedHtoGameDate===c.date||!c.htoGameId||c.leagueGameId!==null))
     throw Error("Historical ID reuse cannot be hidden or relabeled");
  ids.add(c.id);
 }
 const total=d.cases.length,holds=d.cases.filter(c=>c.reviewRequired).length;
 const category=n=>d.cases.filter(c=>c.category===n).length;
 const parity=category("PUBLIC_COMPLETED_PARITY_OBSERVED")+category("PUBLIC_FUTURE_PARITY_OBSERVED");
 if(d.counts.totalCases!==total||d.counts.reviewQueue!==holds||
  d.counts.observedPublicParity!==parity||holds+parity!==total||
  d.counts.completedExact!==category("PUBLIC_COMPLETED_PARITY_OBSERVED")||
  d.counts.futureExact!==category("PUBLIC_FUTURE_PARITY_OBSERVED")||
  d.counts.heldNameAlias!==category("NAME_ALIAS_REVIEW_HOLD")||
  d.counts.heldReusedHtoId!==category("HISTORICAL_HTO_ID_REUSED_HOLD")||
  d.counts.heldFutureNoHto!==category("SUPPLEMENTAL_FUTURE_HTO_MISSING_HOLD")||
  d.counts.heldZeroZero!==category("LEAGUE_UNRESOLVED_ZERO_ZERO_HOLD")||
  d.counts.completedLeague+d.counts.futureLeague+d.counts.heldLeague!==d.counts.leagueRegistry)
  throw Error("Source evidence counts inconsistent");
 return d;
}
function storageSnapshot(store=localStorage){
 try{
  const raw=JSON.parse(store.getItem(KEY)||"null");
  if(!raw||raw.version!==1||typeof raw.notes!=="object"||raw.notes===null||
   Array.isArray(raw.notes))return {};
  return Object.fromEntries(Object.entries(raw.notes).filter(([id,item])=>
   typeof id==="string"&&id.length<150&&
   item&&NOTES_STATUS.some(x=>x[0]===item.status)&&
   typeof item.note==="string"&&item.note.length<=800&&
   typeof item.sourceDigest==="string"&&/^[a-f0-9]{64}(?:\|[a-f0-9]{64}){2}$/.test(item.sourceDigest)));
 }catch(_){return {}}
}
let source=null,pending=null,loadError="",filters={view:"review",query:"",night:"all",priority:"all"},
 selectedId=null,notes=storageSnapshot(),toastMessage="";
function getCase(id){return source?.cases.find(x=>x.id===id)||null}
function reviewDigest(d){return ["league","hto","upcoming"].map(k=>d.inputs[k].sha256).join("|")}
function getNote(c){
 const n=notes[c.id];return n&&n.sourceDigest===reviewDigest(source)?n:null;
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify({version:1,notes}));return true}
 catch(_){return false}
}
function filterCases(d,opts=filters){
 const q=String(opts.query||"").toLowerCase().trim();
 return d.cases.filter(c=>{
  if(opts.view==="review"&&!c.reviewRequired)return false;
  if(opts.view==="observed"&&c.reviewRequired)return false;
  if(opts.view==="proposals"&&c.caseType!=="SUPPLEMENTAL_FUTURE_PROPOSAL")return false;
  if(opts.view==="league"&&c.caseType!=="UNRESOLVED_LEAGUE_RESULT")return false;
  if(opts.view==="pilot"&&c.caseType!=="BRAVE_MATCHUP")return false;
  if(opts.night!=="all"&&c.night!==opts.night)return false;
  if(opts.priority!=="all"&&c.priority!==opts.priority)return false;
  if(q&&![
   c.id,c.date,c.home,c.away,c.opponent||"",c.night,c.category,
   String(c.leagueGameId??""),String(c.htoGameId??"")
  ].some(x=>String(x||"").toLowerCase().includes(q)))return false;
  return true;
 });
}
function sourceStamp(d){
 return '<div class="v22-source-strip"><div><strong>PUBLIC SOURCE COMPARISON · NOT LIVE</strong><span>SVHL '+
 esc(dateLabel(d.inputs.league.capturedAt))+' · HTO '+esc(dateLabel(d.inputs.hto.capturedAt.slice(0,10)))+
 ' · supplemental '+esc(dateLabel(d.inputs.upcoming.capturedAt.slice(0,10)))+
 '</span></div><details><summary>Source provenance & limitations</summary>'+
 '<p>Snapshots are dated and independently compared. A public match does not authorize cross-system ID binding, official scheduling, score edits or standings changes.</p>'+
 '<div class="v22-fingerprints">'+["league","hto","upcoming"].map(k=>'<div><b>'+esc(k)+'</b> '+
 esc(d.inputs[k].file)+' · SHA-256 '+esc(d.inputs[k].sha256.slice(0,16))+'…</div>').join("")+'</div>'+
 '<p>Sources: '+link("SVHL league",d.sourceLinks.officialLeague)+' '+link("HTO Brave H.C.",d.sourceLinks.officialHto)+'</p></details></div>';
}
function link(label,href){
 return allowedLink(href)?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+
 esc(label)+' <span aria-hidden="true">↗</span></a>':"";
}
function summary(d){
 const n=d.counts;
 return '<div class="v22-kpis">'+
 [["Registry fixtures",n.leagueRegistry,"335 completed · 66 future · 10 held"],
  ["Public parity",n.observedPublicParity,n.completedExact+" completed · "+n.futureExact+" upcoming"],
  ["Needs source review",n.reviewQueue,"No official approvals recorded"],
  ["Critical HTO reference",n.heldReusedHtoId,"Historical ID reused in a future proposal"]
 ].map(([label,value,note],i)=>'<div class="v22-kpi'+(i===3?' v22-alert-kpi':'')+'"><span>'+
 esc(label)+'</span><b>'+value+'</b><small>'+esc(note)+'</small></div>').join("")+'</div>';
}
function header(d){
 return '<div class="v22-heading"><div><span>LEAGUEOS / COMMISSIONER OFFICE / SOURCE CONTROL</span>'+
 '<h2>Schedule reconciliation</h2><p>Compare public SVHL fixture evidence with Brave H.C. HTO game IDs. Keep unresolved differences visible without changing official games.</p></div>'+
 '<div class="v22-state">REVIEW-ONLY DEMONSTRATION<small>Browser notes · no authenticated approval</small></div></div>'+
 summary(d)+sourceStamp(d);
}
function critical(d){
 const collision=d.cases.find(c=>c.category==="HISTORICAL_HTO_ID_REUSED_HOLD");
 if(!collision)return "";
 return '<div class="v22-critical"><div class="v22-critical-icon">!</div><div><span>CRITICAL SOURCE DISCREPANCY</span>'+
 '<strong>December 6 fixture reuses an already-completed HTO game ID</strong>'+
 '<p>The supplemental '+esc(dateLabel(collision.date))+' proposal lists '+esc(collision.opponent)+
 ' and references HTO #'+esc(collision.htoGameId)+', already completed on '+
 esc(dateLabel(collision.referencedHtoGameDate))+
 '. This is a held source conflict, not a confirmed rematch or reschedule.</p></div>'+
 '<button type="button" data-v22-open="'+esc(collision.id)+'">Review evidence</button></div>';
}
function controls(d){
 return '<div class="v22-tabs" role="group" aria-label="Source case view">'+
 FILTERS.map(([id,label])=>'<button type="button" data-v22-tab="'+id+'" aria-pressed="'+(filters.view===id)+
 '"'+(filters.view===id?' class="active"':'')+'>'+label+'</button>').join("")+'</div>'+
 '<div class="v22-filters"><label>Search source records<input id="v22-search" type="search" autocomplete="off" value="'+
 esc(filters.query)+'" placeholder="Game ID, club, date or issue"></label>'+
 '<label>League night<select id="v22-night">'+[["all","Every night"],["Sunday","Sunday"],["Tuesday","Tuesday"],
 ["Wednesday","Wednesday"],["Thursday","Thursday"]].map(([k,label])=>'<option value="'+k+'"'+
 (filters.night===k?' selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
 '<label>Priority<select id="v22-priority">'+[["all","All priorities"],["CRITICAL","Critical"],["HIGH","High"],
 ["MEDIUM","Medium"],["INFO","Informational"]].map(([k,label])=>'<option value="'+k+'"'+
 (filters.priority===k?' selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
 '<button type="button" data-v22-export class="v22-export">Export local review notes</button></div>';
}
function badge(c){
 const meta=CATEGORIES[c.category];
 return '<span class="v22-case-label '+meta.tone+'">'+esc(meta.label)+'</span>';
}
function caseLabel(c){
 if(c.caseType==="UNRESOLVED_LEAGUE_RESULT")return c.home+" vs "+c.away;
 return "Brave H.C. vs "+c.opponent;
}
function caseListRows(d){
 const rows=filterCases(d);
 if(!rows.length)return '<div class="v22-empty">No cases match these filters. Clearing a filter does not change the source gate.</div>';
 return rows.map(c=>{
  const n=getNote(c),selected=c.id===selectedId;
  return '<button type="button" data-v22-open="'+esc(c.id)+'" class="v22-case-row'+
   (selected?' selected':'')+'" aria-pressed="'+selected+'"><span class="v22-case-main">'+
   '<small>'+esc(dateLabel(c.date))+' · '+esc(timeLabel(c.time))+' · '+esc(c.night||"Unknown night")+'</small>'+
   '<strong>'+esc(caseLabel(c))+'</strong>'+
   '<small class="v22-case-ids">SVHL '+esc(c.leagueGameId??"No canonical ID")+
   ' / HTO '+esc(c.htoGameId||"No confirmed ID")+'</small></span>'+
   '<span class="v22-case-state">'+badge(c)+
   '<small>'+(n?'Local note: '+esc(NOTES_STATUS.find(x=>x[0]===n.status)?.[1]||"Recorded"):
    c.reviewRequired?'Source review required':'Public parity observed')+'</small></span>'+
   '<span class="v22-open-arrow" aria-hidden="true">›</span></button>';
 }).join("");
}
function details(d){
 const c=getCase(selectedId);if(!c)return '<div class="v22-select"><strong>Select a source case</strong><p>Inspect the independent evidence, discrepancies and original source links before adding local review notes.</p></div>';
 const n=getNote(c),status=n?.status||"unreviewed",note=n?.note||"";
 const pairs=[
 ["Source case ID",c.id],["Classification",CATEGORIES[c.category].label],
 ["Date / time",dateLabel(c.date)+" · "+timeLabel(c.time)],
 ["League/night",(c.leagueId??"—")+" / "+(c.night||"—")],
 ["League game ID",c.leagueGameId??"Not in canonical registry"],
 ["HTO game ID",c.htoGameId??"Not confirmed"],
 ["League source status",c.leagueState||"—"],
 ["HTO source status",c.htoState||"—"],
 ["Opposing teams",c.home+" / "+c.away],
 ["Venue · league",c.rinkLeague||"Not verified"],
 ["Venue · HTO",c.rinkHto||"Not verified"],
 ["Join basis",c.matchedBy||"Not applicable"]
 ];
 const score=x=>x===null?"Not published":x.club+"–"+x.opponent;
 return '<div class="v22-detail-head"><span>CASE EVIDENCE · '+esc(c.priority)+'</span><h3>'+
 esc(caseLabel(c))+'</h3>'+badge(c)+'</div>'+
 '<div class="v22-findings"><strong>Why this case is classified this way</strong><p>'+esc(c.explanation)+'</p></div>'+
 '<div class="v22-evidence-list">'+pairs.map(([label,value])=>'<div><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>').join("")+
 '<div><span>Final score · SVHL</span><b>'+esc(score(c.leagueScore))+'</b></div>'+
 '<div><span>Final score · HTO</span><b>'+esc(score(c.htoScore))+'</b></div>'+
 '</div>'+
 (c.referencedHtoGameDate?'<div class="v22-reused"><strong>Historical reference collision</strong>'+
 '<p>HTO #'+esc(c.htoGameId)+' is already dated '+esc(dateLabel(c.referencedHtoGameDate))+
 ' and cannot be accepted as a new future fixture ID.</p></div>':"")+
 '<div class="v22-source-links">'+c.links.map(x=>link(x.label,x.href)).join("")+
 (["PUBLIC_COMPLETED_PARITY_OBSERVED","PUBLIC_FUTURE_PARITY_OBSERVED"].includes(c.category)&&c.htoGameId?
  '<button type="button" data-go="team-game-'+esc(c.htoGameId)+'">Open HockeyOS source record</button>':"")+
 '</div>'+
 '<section class="v22-local-review"><h4>My browser-local review note</h4>'+
 '<p>Notes cannot resolve source holds, approve games, update standings or send messages to any league.</p>'+
 '<label>Working status<select id="v22-note-status">'+NOTES_STATUS.map(([id,label])=>
  '<option value="'+id+'"'+(id===status?' selected':'')+'>'+label+'</option>').join("")+'</select></label>'+
 '<label>Evidence to follow up<textarea id="v22-note-text" maxlength="800" rows="4" placeholder="Record a source question or what still needs verification.">'+
 esc(note)+'</textarea></label>'+
 '<div class="v22-review-actions"><button type="button" data-v22-save>Save local note</button>'+
 '<small>Stored on this browser only; evidence and classifications do not change.</small></div>'+
 '</section>'+
 '<p class="v22-boundary">'+esc(c.sourceWarning||"Source evidence is read-only.")+'</p>';
}
function page(){
 return '<div id="leagueos-reconciliation-v22" class="v22-root" aria-live="polite">'+
 '<div class="v22-loading">Checking dated SVHL and HTO source evidence…</div></div>';
}
function load(){
 if(!pending)pending=fetch(ASSET,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(data=>{source=validate(data);loadError="";return source})
  .catch(e=>{source=null;pending=null;loadError=String(e);throw e});
 return pending;
}
function render(){
 const root=$("#leagueos-reconciliation-v22");if(!root||!source)return;
 if(selectedId&&!getCase(selectedId))selectedId=null;
 const visible=filterCases(source);
 if(!selectedId||!visible.some(c=>c.id===selectedId))selectedId=visible[0]?.id||null;
 root.innerHTML=header(source)+critical(source)+controls(source)+
  '<div class="v22-workspace"><section class="v22-list-panel"><header><strong>Review cases</strong><span>'+
   visible.length+' shown / '+source.cases.length+' total · '+source.counts.reviewQueue+' source holds</span></header>'+
   '<div class="v22-case-list">'+caseListRows(source)+'</div></section>'+
   '<aside class="v22-detail-panel">'+details(source)+'</aside></div>'+
  (toastMessage?'<p class="v22-message" role="status">'+esc(toastMessage)+'</p>':"")+
  '<div class="v22-footer"><strong>DATA AND APPROVAL BOUNDARY</strong><p>Source parity is an observation, not a legally authorized cross-system linkage. No approval, roster eligibility, HTO editor, league schedule or official game data changes are possible from this public demo.</p></div>';
}
function mount(){
 const root=$("#leagueos-reconciliation-v22");if(!root)return;
 load().then(()=>{if(root.isConnected)render()}).catch(()=>{
  if(root.isConnected)root.innerHTML='<div class="v22-failed"><h3>Reconciliation evidence unavailable</h3>'+
  '<p>LeagueOS held this screen because source validation failed. Do not infer game results from missing data.</p>'+
  link("Original league source","https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY")+
  '</div>';
 });
}
function refreshPreserveFocus(){
 const active=document.activeElement,id=active?.id;
 const input=id==="v22-search"&&typeof active.selectionStart==="number";
 const cursor=input?{start:active.selectionStart,end:active.selectionEnd}:null;
 render();
 if(input){const next=document.getElementById(id);if(next){
  next.focus({preventScroll:true});next.setSelectionRange(
   Math.min(cursor.start,next.value.length),Math.min(cursor.end,next.value.length));
 }}
}
function saveNote(){
 const c=getCase(selectedId);if(!c)return;
 const el=$("#v22-note-text"),status=$("#v22-note-status")?.value||"unreviewed";
 const text=el?.value||"";
 if(!NOTES_STATUS.some(x=>x[0]===status)||text.length>800){
  toastMessage="Review note is invalid or exceeds 800 characters.";render();return;
 }
 notes[c.id]={status,note:text,sourceDigest:reviewDigest(source),savedAt:new Date().toISOString()};
 toastMessage=persist()?"Saved in this browser. Source case remains unchanged.":
  "Browser storage blocked; local note could not be saved.";
 render();
}
function exportReview(){
 if(!source)return;
 const entries=source.cases.map(c=>({id:c.id,category:c.category,
  reviewRequired:c.reviewRequired,localNote:getNote(c)||null}));
 const output={schema:"bruttech-leagueos-local-review-export/v22",
  exportedAt:new Date().toISOString(),sourceRevision:reviewDigest(source),
  sourceRevisions:Object.fromEntries(["league","hto","upcoming"].map(k=>[k,source.inputs[k].sha256])),
  officialApproval:false,officialWriteAllowed:false,
  limitation:"Browser-local observations; no HTO or SVHL authorization",
  cases:entries};
 const blob=new Blob([JSON.stringify(output,null,2)],{type:"application/json"});
 const href=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=href;a.download="LeagueOS_V22_Local_Review_Notes.json";document.body.append(a);
 a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
 toastMessage="Local review notes exported. Nothing was sent to the league.";render();
}
document.addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button||!$("#leagueos-reconciliation-v22"))return;
 if(button.dataset.v22Open){
  const next=getCase(button.dataset.v22Open);if(!next)return;
  selectedId=next.id;toastMessage="";render();
  $(".v22-detail-panel")?.scrollIntoView({block:"nearest",behavior:"instant"});
 }else if(button.dataset.v22Tab){
  if(!FILTERS.some(x=>x[0]===button.dataset.v22Tab))return;
  filters.view=button.dataset.v22Tab;selectedId=null;toastMessage="";render();
 }else if(button.hasAttribute("data-v22-save"))saveNote();
 else if(button.hasAttribute("data-v22-export"))exportReview();
});
document.addEventListener("change",e=>{
 if(!$("#leagueos-reconciliation-v22"))return;
 if(e.target.id==="v22-night"){filters.night=e.target.value;selectedId=null;render()}
 else if(e.target.id==="v22-priority"){filters.priority=e.target.value;selectedId=null;render()}
});
document.addEventListener("input",e=>{
 if(!$("#leagueos-reconciliation-v22"))return;
 if(e.target.id==="v22-search"){
  filters.query=e.target.value;selectedId=null;refreshPreserveFocus();
 }
});
window.LeagueOSReconciliationV22={page,mount,_test:{
 validate,filterCases,allowedLink,storageSnapshot,reviewDigest,
 getState:()=>({...filters,selectedId}),getSource:()=>source
}};
})();