/* LeagueOS Commissioner Decision Desk V3.
 * Independent review prototype. Public team-level aggregates only.
 * All notes, review stages and local revision trail are browser-local and
 * mutable; they do NOT constitute an official or tamper-evident league record.
 * No authenticated commissioner authority, official division reassignment,
 * roster eligibility decision, ice booking, or schedule update.
 */
(function(){"use strict";
const MODEL="./leagueos_division_alignment_public_v2.json";
const PACKAGES="./leagueos-balanced-division-packages-v3.json";
const PUBLIC_FIXTURES="./svhl-public-four-nights-v2.json";
const STORAGE="bruttech-leagueos-commissioner-cases-v3-261116";
const OLD_NOTES="bruttech-leagueos-alignment-review-drafts-v2-261116";
const RULES="https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf";
const MAX_REVS=80;
const CHECKS=[
 {id:"game_evidence",label:"Game results and opponent evidence",hint:"Check the source match coverage, connected divisions and any held game results"},
 {id:"roster_eligibility",label:"Roster and game-sheet eligibility",hint:"Public GP is not proof of signed participation or a valid player registration"},
 {id:"realignment_rules",label:"Rulebook timing and carried points",hint:"Check the official fifth-week realignment framework, team points and season-specific instructions"},
 {id:"rink_schedule",label:"Rink assignments and remaining fixtures",hint:"The public sample does not include full contracted ice inventory or rescheduling feasibility"},
 {id:"team_consultation",label:"Team and league consultation",hint:"Capture communications, affected opponents and authorized stakeholder review"}
];
const STATUSES=[
 ["draft","Draft — collecting evidence"],
 ["needs-evidence","Needs additional evidence"],
 ["for-discussion","Prepared for league discussion"],
 ["no-change","No placement change proposed"]
];
const REVIEW_STATES=[
 ["not-reviewed","Not reviewed"],
 ["needs-league","Needs league confirmation"],
 ["reviewed-demo","Discussed in prototype"]
];
const $=x=>document.querySelector(x);
const esc=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=x=>typeof x==="number"?x.toLocaleString("en-CA"):"—";
const num=x=>typeof x==="number"?x.toFixed(2):"—";
const pct=x=>typeof x==="number"?(x*100).toFixed(0)+"%":"—";
const signed=x=>typeof x==="number"?(x>0?"+":"")+x.toFixed(1):"—";
const fetchJSON=async path=>{const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error(path+" returned HTTP "+r.status);return r.json()};
const blank=()=>({phase:"draft",checks:Object.fromEntries(CHECKS.map(x=>[x.id,"not-reviewed"])),notes:"",reviewerAlias:"",revisions:[],modifiedAt:null,sourceModelAt:null});
function saved(){
 try{
  const o=JSON.parse(localStorage.getItem(STORAGE)||"null");
  return o?.schema==="bruttech-commissioner-local-case-records/v3"&&o.cases&&typeof o.cases==="object"?o:{schema:"bruttech-commissioner-local-case-records/v3",cases:{}};
 }catch(e){return{schema:"bruttech-commissioner-local-case-records/v3",cases:{}}}
}
const store=saved();
let data=null,packages=null,fixtures=null,loading=false,error="",selected=null,view="packages",draft=blank(),lastToast="";
let cases=[],activeStep=1;
const teamIndex=new Map();
function toast(msg){lastToast=msg;const t=$("#decision-toast");if(t){t.textContent=msg;t.hidden=false}}
function buildCases(){
 if(!data||!packages)return;
 const valid=[];
 const sourceTeam=new Map(data.teams.map(x=>[x.league_id+":"+x.team_id,x]));
 for(const p of packages.balanced_packages){
  if(p.type!=="TWO_WAY_SAME_NIGHT_REVIEW"||p.teams?.length!==2||p.night!=="Wednesday")continue;
  const t1=sourceTeam.get(p.league_id+":"+p.teams[0].id),t2=sourceTeam.get(p.league_id+":"+p.teams[1].id);
  if(!t1||!t2||t1.night!==p.night||t2.night!==p.night)continue;
  if(!p.teams.every(t=>{const x=sourceTeam.get(p.league_id+":"+t.id);return x&&x.division===t.from&&x.priority==="Review"&&x.program==="Open"&&x.standings_source_valid!==false}))continue;
  if(p.source_cross_division_fixtures<3||t1.component_id!==t2.component_id)continue;
  valid.push({id:p.case_id,kind:"package",night:p.night,priority:"Review",title:p.teams.map(t=>t.name).join(" ↔ "),
    source:p,participants:[t1,t2],stats:p.current_division_sizes});
 }
 for(const t of data.teams.filter(x=>x.priority==="Review"||x.priority==="Watch")){
  if(t.standings_source_valid===false){
   valid.push({id:"SOURCE-"+t.league_id+"-"+t.team_id,kind:"source",night:t.night,
    priority:"Watch",title:t.team_name,source:t,participants:[t]});
   continue;
  }
  valid.push({id:"SINGLE-"+t.league_id+"-"+t.team_id,kind:"single",night:t.night,
   priority:t.priority,title:t.team_name,source:t,participants:[t]});
 }
 cases=valid;
}
function findCase(id){return cases.find(c=>c.id===id)||null}
function getCase(){return findCase(selected)}
function savedCase(id){return store.cases[id]||null}
function initialDraft(id){
 const prev=savedCase(id),start=blank();
 if(findCase(id)?.kind==="source")start.phase="needs-evidence";
 return prev?{...start,...JSON.parse(JSON.stringify(prev)),checks:{...start.checks,...prev.checks}}:start;
}
function selectCase(id){
 if(!findCase(id))return;
 selected=id;draft=initialDraft(id);activeStep=1;lastToast="";render();
 const detail=$("#decision-workspace");if(detail&&window.innerWidth<850)detail.scrollIntoView({behavior:"smooth",block:"start"});
}
function formatHuman(n){return n==="Review"?"Review":n==="Watch"?"Watch":"Monitor"}
function groups(){
 return {packages:cases.filter(x=>x.kind==="package"),single:cases.filter(x=>x.kind==="single"&&x.priority==="Review"),
         watch:cases.filter(x=>x.kind==="single"&&x.priority==="Watch"),
         source:cases.filter(x=>x.kind==="source")};
}
function rowCase(c){
 const isSelected=c.id===selected,stored=savedCase(c.id);
 const ref=c.kind==="source"?"Published standings require correction":c.kind==="package"?(c.source.aggregate_balance_gain_percentage_points+" pp combined balance change"):(pct(c.source.expected_same_division_win_share)+" indicative peer share");
 return '<button type="button" class="desk-case-row '+(isSelected?"chosen":"")+'" data-desk-case="'+esc(c.id)+'" aria-current="'+isSelected+'">'+
 '<span class="desk-case-name">'+esc(c.title)+'</span><span class="desk-case-meta">'+esc(c.night)+' · '+(c.kind==="source"?"Source correction":c.kind==="package"?"Paired exchange":formatHuman(c.priority))+'</span>'+
 '<span class="desk-case-footer"><span>'+esc(ref)+'</span>'+(stored?'<strong>Saved v'+stored.revisionNo+'</strong>':'')+'</span></button>';
}
function caseList(){
 const g=groups();
 const group=tab=>{
  if(tab==="packages")return["Paired options",g.packages,"Two-team exchanges retain division sizes"];
  if(tab==="single")return["Individual reviews",g.single,"Examine source-supported single-team comparisons"];
  if(tab==="source")return["Source corrections",g.source,"Disputed standings need league data confirmation"];
  return["Source watchlist",g.watch,"Monitoring only; no automatic transfers"];
 };
 const [title,arr,sub]=group(view);
 const tabbar='<div class="desk-segment">'+[
  ["packages","Paired "+g.packages.length],
  ["single","Individual "+g.single.length],
  ["watch","Watch "+g.watch.length],
  ["source","Source "+g.source.length]
 ].map(([k,label])=>'<button type="button" class="'+(view===k?"active":"")+'" data-desk-view="'+k+'">'+label+'</button>').join("")+'</div>';
 return '<div class="desk-case-browser">'+tabbar+'<div class="desk-browser-heading"><strong>'+title+'</strong><small>'+sub+'</small></div>'+
 '<div class="desk-case-items">'+(arr.length?arr.map(rowCase).join(""):'<div class="desk-empty">No eligible cases in this group. Not every league has enough connected evidence for an exchange.</div>')+'</div></div>';
}
function countBox(){
 const g=groups(),pending=Object.keys(store.cases).length;
 return '<div class="desk-metrics">'+[
 [String(groups().packages.length),"Source-connected exchanges","Paired Wednesday cases"],
 [String(g.single.length),"Stronger team reviews","Across current league nights"],
 [String(g.watch.length+g.source.length),"Watch and source holds","Source-quality checks included"],
 [String(pending),"Local review records","Not submitted to SVHL"]
 ].map(x=>'<div><small>'+x[1]+'</small><strong>'+x[0]+'</strong><em>'+x[2]+'</em></div>').join("")+'</div>';
}
function packageEvidence(c){
 const p=c.source;
 const teams=p.teams.map(t=>
 '<div class="desk-exchange-team"><strong>'+esc(t.name)+'</strong>'+
 '<small>'+esc(t.from)+' → '+esc(t.to)+'</small>'+
 '<div class="desk-statline"><span>Peer matchup estimate</span><b>'+pct(t.current_fit)+' → '+pct(t.comparison_fit)+'</b></div>'+
 '<div class="desk-statline"><span>Gap improvement</span><b>+'+num(t.fit_gain_pp)+' pp</b></div>'+
 '<div class="desk-statline"><span>Matched results</span><b>'+val(t.source_matches)+'</b></div>'+
 '<div class="desk-statline"><span>Published earlier PTS/GP</span><b>'+num(t.prior_pts_gp_median)+'</b></div>'+
 '<a href="'+esc(t.source_team_url)+'" rel="noopener noreferrer" target="_blank">Source team record ↗</a></div>'
 ).join("");
 const counts=Object.entries(p.current_division_sizes).map(([name,n])=>'<div class="desk-statline"><span>'+esc(name)+'</span><b>'+val(n)+' teams before and after</b></div>').join("");
 return '<div class="desk-package"><div class="desk-research-heading"><strong>Two-team exchange — source comparison only</strong><small>'+esc(p.night)+' · '+p.source_cross_division_fixtures+' cross-division fixture connections</small></div>'+
 '<div class="desk-exchange-grid">'+teams+'</div>'+
 '<div class="desk-size-details">'+counts+'</div>'+
 '<p>Because the two teams exchange places, both divisions keep the same number of teams. '+num(p.aggregate_balance_gain_percentage_points)+' percentage points is the combined change in the model’s balance-gap measure, not an expected improvement in league win rates.</p>'+
 '</div>';
}
function singleEvidence(c){
 const t=c.source,comp=t.comparisons||[];
 const opts=comp.filter(x=>x.source_connection==="DIRECT_CROSS_DIVISION_GAMES"&&x.bridge_games>=3&&x.connected_peer_teams>=3);
 const first=opts.length?opts[0]:null;
 return '<div class="desk-package"><div class="desk-research-heading"><strong>'+esc(t.team_name)+'</strong>'+
 '<small>'+esc(t.night)+' · '+esc(t.division)+' · '+val(t.source_games)+' matched games</small></div>'+
 '<div class="desk-info-grid">'+[
  ["Published record",val(t.w)+"–"+val(t.l)+"–"+val(t.t)],
  ["Indicative same-division share",pct(t.expected_same_division_win_share)],
  ["Goal differential / game",num(t.goal_diff_per_game)],
  ["Prior roster median PTS/GP",num(t.prior_roster_points_per_game)]
 ].map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>'+
 (t.source_notes?.length?'<div class="desk-warning">'+t.source_notes.map(x=>'<p>'+esc(x)+'</p>').join("")+'</div>':"")+
 (first?'<div class="desk-scenario-block"><strong>Source-connected comparison: '+esc(first.target_division)+'</strong>'+
 '<p>Indicative peer share '+pct(t.expected_same_division_win_share)+' → '+pct(first.expected_win_share)+'; '+first.bridge_games+' cross-division fixtures. Single-team moves would change division sizes and require schedule checks.</p></div>':
 '<p class="desk-muted">No alternate division meets the current connection and evidence thresholds. Review the team’s existing matchups without assuming another placement.</p>')+
 '<a href="https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid='+encodeURIComponent(t.league_id)+'&amp;teamid='+encodeURIComponent(t.team_id)+'&amp;page_type=Adult" target="_blank" rel="noopener noreferrer">Original team record ↗</a>'+
 '</div>';
}
function impact(c){
 const f=fixtures?.games||[];
 const entries=[];
 for(const g of f){
  const side=c.participants.find(t=>t.night===g.night&&(g.home===t.team_name||g.away===t.team_name));
  if(side)entries.push({date:g.date,time:g.time,rink:g.rink,home:g.home,away:g.away,night:g.night,source:g.source_url});
 }
 entries.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const noFixtures=entries.length===0;
 const rows=entries.slice(0,5).map(x=>'<div class="desk-fixture"><b>'+esc(x.date)+' · '+esc(x.time)+' · '+esc(x.rink)+'</b><small>'+esc(x.home)+' vs '+esc(x.away)+'</small></div>').join("");
 const source=(fixtures?.league_nights||[]).find(x=>x.night===c.night);
 return '<div class="desk-impact-grid"><div><small>Facility ice allocation</small><strong>Unknown</strong><span>Booking system not connected</span></div>'+
 '<div><small>Complete remaining schedule</small><strong>Not connected</strong><span>Current public schedule window only</span></div>'+
 '<div><small>Published fixture references</small><strong>'+entries.length+'</strong><span>Not a full season calendar</span></div></div>'+
 (noFixtures?'<p class="desk-muted">No relevant fixture was captured in the currently published limited schedule window. This does not mean there are no fixtures, empty rink slots or no conflicts.</p>':
 '<div class="desk-fixtures">'+rows+'</div>')+
 '<p class="desk-muted">An actual movement must review opponent pairings, contracted rink blocks, league nights, referees, remaining games, standing carryover and communications.</p>'+
 (source?'<a href="'+esc(source.source_url)+'" target="_blank" rel="noopener noreferrer">Open official '+esc(c.night)+' schedule ↗</a>':"");
}
function checkpoints(){
 return '<div class="desk-gate-list">'+CHECKS.map(ch=>{
 const value=draft.checks[ch.id]||"not-reviewed";
 return '<div class="desk-gate"><div><strong>'+esc(ch.label)+'</strong><small>'+esc(ch.hint)+'</small></div>'+
 '<label><span>Documentation status</span><select data-desk-check="'+ch.id+'">'+REVIEW_STATES.map(([v,label])=>
 '<option value="'+v+'" '+(value===v?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select></label></div>';
 }).join("")+'</div>';
}
function statusRows(){
 const complete=CHECKS.filter(x=>draft.checks[x.id]==="reviewed-demo").length;
 return '<div class="desk-gate-summary"><strong>'+complete+' of '+CHECKS.length+' subjects discussed in this local review</strong>'+
 '<span>Official verification remains outstanding regardless of these selections. The demo cannot attest to player signatures, ice contracts or commissioner approval.</span></div>';
}
function revisionLog(c){
 const a=savedCase(c.id)?.revisions||[];
 if(!a.length)return '<p class="desk-muted">No local revisions yet. Save a review draft to start its browser-only record.</p>';
 return a.slice().reverse().slice(0,15).map(h=>
 '<div class="desk-log-entry"><strong>Draft revision '+h.number+'</strong><span>'+esc(h.at)+'</span><small>'+esc(h.summary)+'</small></div>').join("");
}
function compareSaved(c){
 return {
  schema:"bruttech-leagueos-commissioner-case/v3",
  researchOnly:true,
  noOfficialAuthority:true,
  caseId:c.id,
  caseType:c.kind,
  title:c.title,
  night:c.night,
  teams:c.participants.map(t=>({name:t.team_name,league_id:t.league_id,source_team_id:t.team_id,division:t.division})),
  sourceModelAt:data?.created_at,
  sourcePackageAt:packages?.generated_at,
  phase:draft.phase,
  checks:{...draft.checks},
  notes:String(draft.notes||"").slice(0,1600),
  reviewerAlias:String(draft.reviewerAlias||"").slice(0,60)
 };
}
function saveCase(){
 const c=getCase();if(!c)return;
 const collisions=preparedCaseConflicts(c);
 if(draft.phase==="for-discussion"&&collisions.length){
  toast("Another prepared exchange contains one of these teams. Resolve the overlapping case before marking this one for league discussion.");return;
 }
 const older=savedCase(c.id),current=compareSaved(c);
 const revNo=(older?.revisionNo||0)+1;
 const history=Array.isArray(older?.revisions)?older.revisions.slice(-MAX_REVS+1):[];
 const changed=[];
 if(!older)changed.push("Case created");
 else{
  if(current.phase!==older.phase)changed.push("Stage: "+older.phase+" → "+current.phase);
  if(current.notes!==older.notes)changed.push("Review note updated");
  if(current.reviewerAlias!==older.reviewerAlias)changed.push("Reviewer alias updated");
  for(const ck of CHECKS)if(current.checks[ck.id]!==older.checks?.[ck.id])changed.push(ck.label+": "+current.checks[ck.id]);
 }
 if(!changed.length)changed.push("Review snapshot saved without field changes");
 history.push({number:revNo,at:new Date().toISOString(),summary:changed.join("; ").slice(0,550)});
 const o={...current,revisionNo:revNo,modifiedAt:new Date().toISOString(),revisions:history};
 store.cases[c.id]=o;
 try{localStorage.setItem(STORAGE,JSON.stringify(store));toast("Draft revision "+revNo+" saved on this device.");}
 catch(e){toast("Browser storage unavailable. Export the case for a local copy.");return}
 draft={...blank(),...o,checks:{...o.checks}};render();
}
function download(text,name,type){
 const blob=new Blob([text],{type:type||"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportCase(){
 const c=getCase();if(!c)return;
 const item=compareSaved(c),record=savedCase(c.id);
 const value={...item,revisionNo:record?.revisionNo||0,revisions:record?.revisions||[],
  source:{"modelSchema":data?.schema,"packageSchema":packages?.schema,"fixtureWindow":fixtures?.source_qualifier||"NOT_LOADED"},
  exportedAt:new Date().toISOString()};
 download(JSON.stringify(value,null,2),"LeagueOS_Decision_Review_"+c.id+".json");
 toast("Local review exported. Nothing sent to SVHL.");
}
function exportAll(){
 const cases=Object.values(store.cases);
 const o={schema:store.schema,notOfficial:true,exportedAt:new Date().toISOString(),
  cases:cases.map(c=>({...c,researchOnly:true}))};
 download(JSON.stringify(o,null,2),"LeagueOS_Commissioner_Review_Docket.json");
 toast("Local review docket exported; this is not a league decision register.");
}
function copyBrief(){
 const c=getCase();if(!c)return;
 const summary=[
 "LeagueOS — commissioner review draft (NOT OFFICIAL)",
 c.kind==="package"?"Paired exchange comparison: "+c.title:"Team review: "+c.title,
 "League night: "+c.night,
 c.kind==="package"?"Source interdivision fixtures: "+c.source.source_cross_division_fixtures:
   "Matched games: "+c.source.source_games,
 c.kind==="package"?"Combined balance-gap improvement: "+c.source.aggregate_balance_gain_percentage_points+" percentage points":
   "Current indicative peer matchup share: "+pct(c.source.expected_same_division_win_share),
 "Internal draft stage: "+draft.phase,
 "Documentation statuses: "+CHECKS.map(x=>x.label+" = "+(draft.checks[x.id]||"not-reviewed")).join("; "),
 "Notes: "+(draft.notes||""),
 "No authenticated league approval, roster eligibility or facility booking evidence; no live changes performed."
 ].join("\n");
 if(!navigator.clipboard?.writeText)return toast("Clipboard unavailable in this browser.");
 navigator.clipboard.writeText(summary).then(()=>toast("Draft summary copied.")).catch(()=>toast("Clipboard copy was blocked."));
}
function phases(){
 return '<div class="desk-stage"><div class="desk-stage-head"><strong>Case review stage</strong><span>Draft only</span></div>'+
 '<label class="field">Working status<select id="desk-stage-select">'+STATUSES.map(([v,lab])=>
 '<option value="'+v+'" '+(v===draft.phase?"selected":"")+'>'+esc(lab)+'</option>').join("")+'</select></label>'+
 '<p>No “approve” action exists in this prototype. The record can be prepared for an authorized commissioner discussion, never applied here.</p></div>';
}
function sourceEvidence(c){
 const t=c.source;
 return '<div class="desk-package"><div class="desk-research-heading"><strong>Published standings need correction</strong>'+
 '<small>'+esc(t.night)+' · '+esc(t.division)+'</small></div>'+
 '<div class="desk-warning"><strong>Source data hold</strong><p>This source record contains an invalid published wins/losses value or inconsistent game count. No competitive placement comparison is permitted while this discrepancy is unresolved.</p>'+
 (t.source_notes||[]).map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>'+
 '<div class="desk-info-grid">'+
 '<div><small>Competitive record</small><strong>Not reliable</strong></div>'+
 '<div><small>Matched source games</small><strong>'+val(t.source_games)+'</strong></div>'+
 '<div><small>Team/division</small><strong>'+esc(t.division)+'</strong></div>'+
 '<div><small>Required next action</small><strong>Confirm original standings</strong></div>'+
 '</div><p>Retain the original published values in the source archive. Request a correction or an official interpretation before building a comparative scenario.</p>'+
 '<a href="https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid='+encodeURIComponent(t.league_id)+'&amp;teamid='+encodeURIComponent(t.team_id)+'&amp;page_type=Adult" target="_blank" rel="noopener noreferrer">Original published team page ↗</a></div>';
}
function preparedCaseConflicts(c){
 if(c?.kind!=="package")return [];
 const own=new Set(c.participants.map(t=>t.league_id+":"+t.team_id));
 return Object.values(store.cases).filter(rec=>rec&&rec.caseId!==c.id&&rec.caseType==="package"&&
 rec.phase==="for-discussion"&&(rec.teams||[]).some(t=>own.has(t.league_id+":"+t.source_team_id)));
}
function caseDetail(){
 const c=getCase();
 if(!c)return '<div class="panel desk-no-case">Choose a case to review.</div>';
 const collisions=preparedCaseConflicts(c);
 return '<div class="desk-case-header"><div><small>'+esc(c.night)+' · '+(c.kind==="source"?"Source correction hold":c.kind==="package"?"Two-team exchange research":"Individual team review")+'</small>'+
 '<h2>'+esc(c.title)+'</h2><p>Published-source evidence and workflow checks. Not an official recommendation.</p></div>'+
 '<div class="desk-case-header-actions"><button class="btn" type="button" id="desk-copy-brief">Copy summary</button>'+
 '<button class="btn" type="button" id="desk-export-case">Export case</button></div></div>'+
 (collisions.length?'<div class="desk-warning"><strong>Overlapping prepared cases</strong><p>'+esc(collisions.map(x=>x.title).join("; "))+' already includes one or more of these teams. Prepare only one overlapping exchange for league discussion.</p></div>':"")+
 '<nav class="desk-step-nav" aria-label="Review steps">'+[
 ['1','Evidence'],['2','Schedule'],['3','Checks'],['4','Decision']
 ].map(([n,label])=>'<button type="button" data-desk-step="'+n+'" class="'+(activeStep===Number(n)?'active':'')+'" aria-current="'+(activeStep===Number(n))+'"><span>'+n+'</span>'+label+'</button>').join('')+'</nav>'+
 '<div class="desk-step-grid"><section class="desk-subpanel '+(activeStep===1?"active":"")+'"><div class="desk-heading"><span class="desk-stepnum">1</span><div><strong>Compare the evidence</strong><small>Source-connected competitive fit and roster context</small></div></div>'+
 (c.kind==="package"?packageEvidence(c):c.kind==="source"?sourceEvidence(c):singleEvidence(c))+'</section>'+
 '<section class="desk-subpanel '+(activeStep===2?"active":"")+'"><div class="desk-heading"><span class="desk-stepnum">2</span><div><strong>Check schedule impact</strong><small>Visible fixtures are not full rink inventory</small></div></div>'+
 impact(c)+'</section>'+
 '<section class="desk-subpanel '+(activeStep===3?"active":"")+'"><div class="desk-heading"><span class="desk-stepnum">3</span><div><strong>Document league prerequisites</strong><small>Sign-offs and eligibility must be established outside this prototype</small></div></div>'+
 '<div class="desk-rule-note"><strong>Rule 2.7.2</strong><span>Use the published SVHL rulebook to verify realignment timing and treatment of accumulated points; current league policy must be confirmed before action.</span><a href="'+RULES+'" target="_blank" rel="noopener noreferrer">Open rulebook ↗</a></div>'+
 checkpoints()+statusRows()+'</section>'+
 '<section class="desk-subpanel '+(activeStep===4?"active":"")+'"><div class="desk-heading"><span class="desk-stepnum">4</span><div><strong>Record the discussion</strong><small>Saved locally, with a non-tamper-evident revision trail</small></div></div>'+
 phases()+
 '<div class="desk-notes-grid"><label class="field">Reviewer alias (optional)<input id="desk-reviewer" maxlength="60" autocomplete="off" placeholder="Example: League Review 01" value="'+esc(draft.reviewerAlias)+'"></label>'+
 '<label class="field">Decision rationale / outstanding questions<textarea id="desk-review-notes" maxlength="1600" rows="5" placeholder="Record what evidence is missing and why this option is being reviewed.">'+esc(draft.notes)+'</textarea></label></div>'+
 '<div class="desk-save-row"><button class="btn primary" type="button" id="desk-save">Save local review revision</button>'+
 '<span>Official approval, roster updates and rescheduling are disabled.</span></div>'+
 '<details class="desk-history"><summary>Local revision history ('+(savedCase(c.id)?.revisions.length||0)+')</summary>'+
 revisionLog(c)+'</details></section></div>'+
 '<div class="desk-step-controls">'+(activeStep>1?'<button class="btn" type="button" data-desk-step="'+(activeStep-1)+'">← Previous</button>':'<span></span>')+
 (activeStep<4?'<button class="btn primary" type="button" data-desk-step="'+(activeStep+1)+'">Next: '+(['Evidence','Schedule','Checks','Decision'][activeStep])+' →</button>':
 '<span class="desk-last-step">Save the review; actual approval is not available.</span>')+'</div>';
}
function render(){
 const mount=$("#league-decisions-mount");if(!mount)return;
 if(error){mount.innerHTML='<div class="callout warn">'+esc(error)+' <button class="btn" type="button" id="desk-retry">Retry</button></div>';return}
 if(!data||!packages){mount.innerHTML='<div class="panel loader">Loading the source-qualified commissioner review scenarios…</div>';return}
 mount.innerHTML=countBox()+
 '<div class="desk-guard"><strong>Independent review preview.</strong> The prototype has no official authority to move teams, validate roster signatures, change ice allocations or approve division realignment. Nothing is shared automatically.</div>'+
 '<div class="desk-container"><aside class="desk-case-col">'+caseList()+
 '<div class="desk-case-secondary"><strong>Review records on this device</strong><small>'+Object.keys(store.cases).length+' saved cases. Drafts can be exported for discussion; they do not sync between browsers.</small>'+
 '<button class="btn small" type="button" id="desk-export-docket" '+(Object.keys(store.cases).length?"":"disabled")+'>Export all saved reviews</button></div></aside>'+
 '<div class="desk-workspace" id="decision-workspace">'+caseDetail()+'</div></div>'+
 '<p class="disclaimer">Public records captured from SVHL are a partial source snapshot. These comparisons are research estimates, not guaranteed game outcomes or official division classifications. The review log is browser-local and can be modified; a production audit log would require authenticated roles and server-side controls.</p>'+
 '<div id="decision-toast" role="status" class="desk-toast" '+(lastToast?"":"hidden")+'>'+esc(lastToast)+'</div>';
}
async function start(){
 if(loading||data)return;
 loading=true;render();
 try{
  const [m,p]=await Promise.all([fetchJSON(MODEL),fetchJSON(PACKAGES)]);
  if(m.schema!=="bruttech-division-alignment-research/v2"||m.teams?.length!==96)throw Error("Alignment source schema not accepted");
  if(p.schema!=="bruttech-division-balanced-scenarios/v3"||p.balanced_packages?.length<1)throw Error("Balanced package source schema not accepted");
  data=m;packages=p;
  try{
   fixtures=await fetchJSON(PUBLIC_FIXTURES);
   if(fixtures.schema!=="bruttech-svhl-public-operations/v2")fixtures=null;
  }catch(e){fixtures=null}
  buildCases();
  if(!selected||!findCase(selected)){
   selected=cases.find(x=>x.kind==="package")?.id||cases[0]?.id||null;
   draft=initialDraft(selected);
  }
  error="";
 }catch(e){error="Could not load decision data: "+e.message}
 finally{loading=false;render()}
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.deskCase){selectCase(b.dataset.deskCase);return}
 if(b.dataset.deskStep){activeStep=Number(b.dataset.deskStep);render();const el=$("#decision-workspace");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
 if(b.dataset.deskView){
  view=b.dataset.deskView;
  const list=groups()[view]||[];
  if(!list.some(c=>c.id===selected)){
   const first=list[0];selected=first?.id||null;draft=selected?initialDraft(selected):blank();activeStep=1;
  }
  lastToast="";render();return
 }
 if(b.id==="desk-save"){saveCase();return}
 if(b.id==="desk-export-case"){exportCase();return}
 if(b.id==="desk-export-docket"){exportAll();return}
 if(b.id==="desk-copy-brief"){copyBrief();return}
 if(b.id==="desk-retry"){error="";data=null;packages=null;start();return}
});
document.addEventListener("change",e=>{
 const x=e.target;
 if(x.dataset.deskCheck){draft.checks[x.dataset.deskCheck]=x.value;
  const summary=$("#decision-workspace .desk-gate-summary");if(summary)summary.outerHTML=statusRows();
  return}
 if(x.id==="desk-stage-select"){draft.phase=x.value;return}
});
document.addEventListener("input",e=>{
 const x=e.target;if(x.id==="desk-review-notes")draft.notes=x.value;
 if(x.id==="desk-reviewer")draft.reviewerAlias=x.value;
});
window.LeagueOSDecisionDesk={
 mount(){render();if(!data)start()},
 openCase(id){if(data&&findCase(id)){selectCase(id);return true}
  selected=id;return false},
 getStatus(){return{loaded:Boolean(data),cases:cases.length,saved:Object.keys(store.cases).length}}
};
})();
