/* LeagueOS Division Alignment V2: Commissioner research review surface.
   Public aggregated team statistics only. All review decisions local browser drafts.
   No official move, payment, eligibility, roster or schedule writes.
*/
(function(){"use strict";
const DATA="./leagueos_division_alignment_public_v2.json";
const DRAFT_KEY="bruttech-leagueos-alignment-review-drafts-v2-261116";
const SOURCE_RULES="https://www.sportsvillage.ca/wp-content/uploads/2024/09/Rule-Book.pdf";
const DAYS=["All nights","Sunday","Tuesday","Wednesday","Thursday"];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=(x,unit="")=>typeof x==="number"?x.toLocaleString("en-CA")+unit:"—";
const fixed=x=>typeof x==="number"?x.toFixed(2):"—";
const prob=x=>typeof x==="number"?(x*100).toFixed(0)+"%":"—";
const prefix=x=>x>0?"+":"";
const diff=x=>typeof x==="number"?prefix(x)+x.toFixed(2):"—";
const idOf=t=>t.night+":"+t.league_id+":"+t.team_id;
let data=null,failed="",busy=false,selected="",filterNight="All nights",filterStatus="Review",filterDivision="All divisions",query="",target="current",note="",notice="",lastNotice=0;
const panel=(name,desc,body,extra="")=>'<section class="panel align-panel"><div class="panelhead"><div><h2>'+esc(name)+'</h2>'+(desc?'<p>'+esc(desc)+'</p>':"")+'</div>'+extra+'</div>'+body+'</section>';
const allDrafts=()=>{try{const x=JSON.parse(localStorage.getItem(DRAFT_KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}};
let drafts=allDrafts();
function persist(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));toast("Review draft saved on this device only.");return true}catch(e){toast("Browser storage unavailable. Use Export instead.");return false}}
function toast(s){notice=s;lastNotice=Date.now();const x=$("#align-toast");if(x){x.textContent=s;x.hidden=false}}
function visible(){
 if(!data)return[];
 const q=query.trim().toLocaleLowerCase();
 return data.teams.filter(t=>(filterNight==="All nights"||t.night===filterNight)&&
 (filterStatus==="All teams"||t.priority===filterStatus)&&
 (filterDivision==="All divisions"||t.division===filterDivision)&&
 (!q||t.team_name.toLocaleLowerCase().includes(q))).
 sort((a,b)=>({"Review":0,"Watch":1,"Monitor":2}[a.priority]-{"Review":0,"Watch":1,"Monitor":2}[b.priority])||
 a.night.localeCompare(b.night)||a.division.localeCompare(b.division)||a.team_name.localeCompare(b.team_name));
}
function divisionsForNight(){
 if(!data)return [];
 const set=new Set(data.teams.filter(t=>filterNight==="All nights"||t.night===filterNight).map(t=>t.division));
 return [...set].sort((a,b)=>a.localeCompare(b));
}
function selectedTeam(){return data?.teams.find(t=>idOf(t)===selected)||null}
function relatedDraft(t){return drafts.find(d=>d.key===idOf(t))}
function choiceList(t){
 const opts=[{value:"current",text:"Keep current placement — request review"}];
 for(const x of t.comparisons||[]){
  opts.push({value:x.target_division,text:"Compare: "+x.target_division+
   " ("+prob(x.expected_win_share)+" indicative matchup balance)"});
 }
 return opts;
}
function nightMetric(n){const ts=data.teams.filter(t=>n==="All nights"||t.night===n);
 const cc={Review:0,Watch:0,Monitor:0};ts.forEach(t=>cc[t.priority]++);
 return {total:ts.length,review:cc.Review,watch:cc.Watch,monitor:cc.Monitor}}
function summary(){
 const n=nightMetric(filterNight);
 return '<div class="align-summary" aria-label="Research summary">'+
 '<div><small>Teams evaluated</small><strong>'+n.total+'</strong></div>'+
 '<div><small>For commissioner review</small><strong>'+n.review+'</strong></div>'+
 '<div><small>Source watchlist</small><strong>'+n.watch+'</strong></div>'+
 '<div><small>Saved local review drafts</small><strong>'+drafts.length+'</strong></div>'+
 '</div>';
}
function filters(){
 const nights=DAYS.map(n=>'<option value="'+esc(n)+'" '+(filterNight===n?"selected":"")+'>'+esc(n)+'</option>').join("");
 const statuses=["Review","Watch","All teams"].map(k=>'<option value="'+k+'" '+(filterStatus===k?"selected":"")+'>'+k+'</option>').join("");
 const divs=["All divisions",...divisionsForNight()].map(k=>'<option value="'+esc(k)+'" '+(filterDivision===k?"selected":"")+'>'+esc(k)+'</option>').join("");
 return '<div class="align-filterbar"><div class="align-fields">'+
 '<label class="field">League night<select id="align-night">'+nights+'</select></label>'+
 '<label class="field">Show<select id="align-status">'+statuses+'</select></label>'+
 '<label class="field">Division<select id="align-division">'+divs+'</select></label>'+
 '<label class="field">Find team<input id="align-search" maxlength="90" type="search" placeholder="Team name…" value="'+esc(query)+'"></label>'+
 '</div></div>';
}
function tableRows(){
 const filtered=visible().slice(0,105);
 if(!filtered.length)return '<p class="align-empty">No teams match these filters. Try All teams or another league night.</p>';
 let s='<div class="align-table-wrap"><table><thead><tr><th>Team</th><th>Division</th><th>Evidence</th><th>Peer matchups</th><th></th></tr></thead><tbody>';
 for(const t of filtered){
 const active=selected===idOf(t),label=t.priority;
 const fit=prob(t.expected_same_division_win_share),reviewed=Boolean(relatedDraft(t));
 s+='<tr class="'+(active?"align-active":"")+'">'+
 '<td><button type="button" class="align-team-link" data-align-team="'+esc(idOf(t))+'">'+esc(t.team_name)+'</button><small>'+esc(t.night)+' · '+val(t.source_games)+' matched games</small></td>'+
 '<td>'+esc(t.division)+'</td>'+
 '<td><span class="align-status '+label.toLowerCase()+'">'+label+'</span>'+ (reviewed?'<span class="align-saved">Draft saved</span>':'')+'</td>'+
 '<td><strong>'+fit+'</strong><small>Expected share vs division peers</small></td>'+
 '<td><button class="btn small" type="button" data-align-team="'+esc(idOf(t))+'">Review ›</button></td></tr>';
 }
 s+='</tbody></table></div>';
 if(visible().length>105)s+='<p class="source">Showing 105 records. Narrow your filters to inspect more teams.</p>';
 return s;
}
function listing(){
 const count=visible().length;
 return panel("Teams to assess",count+' matching team records · Model indicators are advisory, not decisions',
 '<div id="align-rows">'+tableRows()+'</div>');
}
function evid(t){
 const ss=t.source_notes||[],prior=t.roster_prior_samples;
 return '<div class="align-evidence-grid">'+
 '<div><small>Adjusted rating</small><strong>'+fixed(t.adjusted_rating)+'</strong></div>'+
 '<div><small>Peer median rating</small><strong>'+fixed(t.division_peer_median_rating)+'</strong></div>'+
 '<div><small>Actual game record</small><strong>'+val(t.w)+'–'+val(t.l)+'–'+val(t.t)+'</strong></div>'+
 '<div><small>Goal difference / game</small><strong>'+diff(t.goal_diff_per_game)+'</strong></div>'+
 '<div><small>Opponent match sample</small><strong>'+val(t.source_games)+' games</strong></div>'+
 '<div><small>Distinct opponents</small><strong>'+val(t.unique_opponents)+'</strong></div>'+
 '<div><small>Last four match share</small><strong>'+prob(t.last_four_win_share)+'</strong></div>'+
 '<div><small>Published roster PTS / GP</small><strong>'+fixed(t.prior_roster_points_per_game)+'</strong></div>'+
 '<div><small>Earlier roster G / GP</small><strong>'+fixed(t.prior_roster_goals_per_game)+'</strong></div>'+
 '<div><small>Earlier roster A / GP</small><strong>'+fixed(t.prior_roster_assists_per_game)+'</strong></div>'+
 '</div>'+
 '<p class="source">Historical scoring summaries cover '+val(prior)+' published roster IDs with earlier usable statistics ('+prob(t.prior_roster_history_pct)+' of this source roster). They are supporting context, not confirmed game-day participation.</p>'+
 (ss.length?'<div class="align-holds"><strong>Evidence limitations</strong>'+ss.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'');
}
function compare(t){
 let s='<div class="align-current"><span>Current division</span><strong>'+esc(t.division)+'</strong><span>'+prob(t.expected_same_division_win_share)+' expected matchup share</span></div>';
 const comp=t.comparisons||[];
 if(!comp.length)s+='<div class="align-empty">No adequately connected alternative division is supported by the source data. Keep the team under review rather than inventing a transfer.</div>';
 else{
 s+='<div class="align-alt-list">'+comp.map(c=>
 '<div class="align-alt-row"><div><strong>'+esc(c.target_division)+'</strong><small>'+val(c.bridge_games)+' direct cross-division games · '+val(c.connected_peer_teams)+' connected peers</small></div>'+
 '<span>'+prob(c.expected_win_share)+'</span></div>').join('')+'</div>';
 s+='<p class="source">Comparisons require the same game-network component, at least three cross-division fixtures and compatible program category. They are illustrative—no forecast against a specific future opponent.</p>';
 }
 return s;
}
function scenario(t,selectedTarget){
 if(selectedTarget==="current")return '<div class="align-scenario-muted"><strong>Review current placement</strong><small>No transfer selected. The team would stay in its current division unless the league approves a separate change.</small></div>';
 const other=(t.comparisons||[]).find(x=>x.target_division===selectedTarget);
 if(!other)return '<div class="align-scenario-muted">No valid source-supported comparison selected.</div>';
 const divisions=data?.division_summaries||[];
 const initial=divisions.find(d=>d.league_id===t.league_id&&d.name===t.division);
 const proposed=divisions.find(d=>d.league_id===t.league_id&&d.name===selectedTarget);
 return '<div class="align-scenario"><strong>What-if only: '+esc(selectedTarget)+'</strong>'+
 '<div class="align-scenario-pair"><span>Current division size</span><b>'+val(initial?.teams)+' → '+(typeof initial?.teams==="number"?initial.teams-1:"—")+'</b></div>'+
 '<div class="align-scenario-pair"><span>Comparison division size</span><b>'+val(proposed?.teams)+' → '+(typeof proposed?.teams==="number"?proposed.teams+1:"—")+'</b></div>'+
 '<div class="align-scenario-pair"><span>Expected matchup share</span><b>'+prob(t.expected_same_division_win_share)+' → '+prob(other.expected_win_share)+'</b></div>'+
 '<div class="align-scenario-pair"><span>Balance gap improvement</span><b>'+typeofPctPoints(other.relative_balance_gain)+'</b></div>'+
 '<div class="align-scenario-pair"><span>Inter-division game evidence</span><b>'+val(other.bridge_games)+' cross-division fixtures</b></div>'+
 '<p>Roster eligibility, ice allocation, revised opponents and accumulated-points treatment need separate official review. This calculation changes nothing.</p></div>';
}
function typeofPctPoints(x){return typeof x==="number"?(x>0?"+":"")+(x*100).toFixed(1)+" points":"—";}
function selectedDetail(){
 const t=selectedTeam();
 if(!t)return panel("Evidence review","Select a team from the list to inspect its proposed competitive balance.",
 '<div class="align-empty">Select Review beside a team to see its opponent-adjusted results, roster history, comparisons and safeguards.</div>');
 const review=relatedDraft(t);
 const warning=t.priority==="Review"?"Review evidence with the commissioner":t.priority==="Watch"?"Source-data watchlist":"No material imbalance trigger in this snapshot";
 const sources=t.program!=="Open"?"This is a separately governed competition. Any transfer needs a specific eligibility and program review.":null;
 const options=choiceList(t),validChoice=options.some(x=>x.value===target);
 if(!validChoice)target=review?.comparison||"current";
 if(!options.some(x=>x.value===target))target="current";
 return panel(t.team_name,t.night+' · '+t.division,
 '<div class="align-proposed"><span class="align-status '+t.priority.toLowerCase()+'">'+t.priority+'</span><strong>'+esc(warning)+'</strong>'+
 '<p>'+esc(t.direction)+' · '+esc(t.confidence)+'</p></div>'+
 '<div class="align-prob"><span>Current division: indicative matchup share</span><strong>'+prob(t.expected_same_division_win_share)+'</strong>'+
 '<div class="align-fitbar"><span style="width:'+((t.expected_same_division_win_share??.5)*100)+'%"></span></div>'+
 '<small>50% represents balanced matchups; this is a model indicator, not a guaranteed win percentage.</small></div>'+
 '<details class="align-detail-drop" open><summary>Why is this team flagged?</summary>'+evid(t)+'</details>'+
 '<details class="align-detail-drop" open><summary>Compare possible competition groups</summary>'+compare(t)+'</details>'+
 (sources?'<div class="align-holds">'+esc(sources)+'</div>':'')+
 '<div class="align-draft"><h3>Commissioner review draft</h3>'+
 '<label class="field">Comparison to discuss<select id="align-target">'+options.map(x=>'<option value="'+esc(x.value)+'" '+(target===x.value?"selected":"")+'>'+esc(x.text)+'</option>').join("")+'</select></label>'+
 '<div id="align-scenario">'+scenario(t,target)+'</div>'+
 '<label class="field">Review notes<textarea id="align-note" maxlength="1400" rows="4" placeholder="What should the league review before making a decision?">'+esc(note||review?.note||"")+'</textarea></label>'+
 '<div class="align-actions"><button id="align-save" class="btn primary" type="button">Save review draft</button>'+
 '<button id="align-copy-one" class="btn" type="button">Copy evidence summary</button></div>'+
 '<p class="source">Drafts remain on this device. No official records or league schedules are changed.</p></div>'+
 '<div class="align-source"><a target="_blank" rel="noopener noreferrer" href="https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid='+t.league_id+'&amp;teamid='+t.team_id+'&amp;page_type=Adult">Original public SVHL team page ↗</a></div>');
}
function rules(){
 return '<details class="align-policy" open><summary>Decision safeguards</summary>'+
 '<div class="align-policy-grid"><div><strong>League governance</strong><span>SVHL Rule 2.7.2 specifies realignment after week five and carrying accumulated points forward. No software action here changes a standing.</span></div>'+
 '<div><strong>Protected programs</strong><span>Masters and separately administered program placement require authorized eligibility checks; publicly listed rosters are not signed game sheets.</span></div>'+
 '<div><strong>Evidence thresholds</strong><span>Require reciprocal results, source completeness and real cross-division bridges before comparing a destination. A missing connection means abstain.</span></div></div>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+SOURCE_RULES+'">Read official SVHL rulebook ↗</a></details>';
}
function draftSection(){
 if(!drafts.length)return '<div class="align-empty">No saved commissioner review drafts. Select a team and save a review note to build one.</div>';
 return '<div class="align-drafts">'+drafts.map(d=>
 '<div class="align-draft-row"><div><strong>'+esc(d.team)+'</strong><small>'+esc(d.night)+' · '+esc(d.currentDivision)+
 ' · '+(d.comparison==="current"?"Current placement review":"Compare with "+esc(d.comparison))+'</small></div>'+
 '<button type="button" class="btn small" data-align-delete="'+esc(d.key)+'">Remove</button></div>').join("")+'</div>';
}
function controlPanel(){
 return '<div class="align-tools"><button id="align-queue" class="btn" type="button">Review drafts ('+drafts.length+')</button>'+
 '<button id="align-export" class="btn" type="button" '+(!drafts.length?"disabled":"")+'>Export drafts</button></div>'+
 '<section class="align-queue-panel" id="align-queue-panel" hidden>'+
 panel("Locally saved review drafts","Not submitted to SVHL or anyone else",draftSection())+'</section>';
}
function render(){
 const el=$("#league-alignment-mount");if(!el)return;
 if(failed){el.innerHTML='<div class="callout warn">'+esc(failed)+' <button class="btn small" id="align-retry" type="button">Retry</button></div>';return}
 if(!data){el.innerHTML='<div class="panel loader">Loading source-qualified division evidence…</div>';return}
 el.innerHTML=summary()+filters()+
 '<div class="align-layout"><div class="stack">'+listing()+controlPanel()+'</div>'+
 '<div class="stack"><div id="align-detail">'+selectedDetail()+'</div>'+
 panel("Model performance","Rolling predictions using only games that had already been played",
 '<div class="align-validation"><div><small>Matches tested</small><strong>'+val(data.validation.matches_tested)+'</strong></div>'+
 '<div><small>Baseline Brier error</small><strong>'+fixed(data.validation.brier_reference_half)+'</strong></div>'+
 '<div><small>Results-model error</small><strong>'+fixed(data.validation.brier_result_only)+'</strong></div></div>'+
 '<p class="source">Lower Brier error is better. Historical roster seeding has not demonstrated enough extra accuracy to influence the placement rating. It is shown as supporting context only.</p>')+
 '</div></div>'+rules()+'<p class="disclaimer">Independent LeagueOS research prototype. Public source snapshots may be incomplete. All commissioner decisions, division reallocations, eligibility checks and revised schedules require authorized league controls, not this preview.</p>'+
 '<div id="align-toast" role="status" class="align-toast" '+(notice?"":"hidden")+'>'+esc(notice)+'</div>';
}
async function load(){
 if(busy||data)return;busy=true;failed="";render();
 try{
  const r=await fetch(DATA,{cache:"no-cache"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const x=await r.json();
  if(x.schema!=="bruttech-division-alignment-research/v2"||x.teams?.length!==96||!x.night_coverage)throw Error("Unexpected source model schema");
  data=x;failed="";
 }catch(e){failed="The research model could not be loaded: "+e.message}
 finally{busy=false;render()}
}
function selectTeam(key){
 if(!data?.teams.some(t=>idOf(t)===key))return;
 selected=key;target=relatedDraft(selectedTeam())?.comparison||"current";
 note=relatedDraft(selectedTeam())?.note||"";const list=$("#align-rows");if(list)list.innerHTML=tableRows();
 const detail=$("#align-detail");if(detail){detail.innerHTML=selectedDetail();if(window.innerWidth<1000)detail.scrollIntoView({behavior:"smooth",block:"start"})}
}
function saveDraft(){
 const t=selectedTeam();if(!t)return;
 const choice=choiceList(t).find(x=>x.value===target);
 if(!choice)target="current";
 const record={key:idOf(t),team:t.team_name,night:t.night,league_id:t.league_id,team_id:t.team_id,
 currentDivision:t.division,comparison:target,priority:t.priority,
 sourceMatches:t.source_games,adjustedRating:t.adjusted_rating,expectedMatchShare:t.expected_same_division_win_share,
 sourceModel:"bruttech-division-alignment-research/v2",note:note.trim().slice(0,1400),
 savedAt:new Date().toISOString(),status:"LOCAL_DRAFT_ONLY"};
 drafts=drafts.filter(d=>d.key!==record.key);drafts.push(record);persist();render();
}
function textEvidence(t){
 const c=(t.comparisons||[]).find(x=>x.target_division===target);
 return "LeagueOS Division Alignment Research — DRAFT ONLY\n"+
 "Night: "+t.night+"\nTeam: "+t.team_name+"\nCurrent division: "+t.division+
 "\nSource results: "+t.source_games+" matched games / "+t.unique_opponents+" opponents"+
 "\nRating: "+fixed(t.adjusted_rating)+" (same-night research)\nPeer matchup share: "+prob(t.expected_same_division_win_share)+
 "\nRecord: "+t.w+"–"+t.l+"–"+t.t+"\nGoal difference/game: "+diff(t.goal_diff_per_game)+
 "\nPrior PTS/GP median: "+fixed(t.prior_roster_points_per_game)+
 "\nPrior roster coverage: "+val(t.roster_prior_samples)+" qualifying published IDs"+
 (c?"\nResearch comparator: "+c.target_division+" ("+prob(c.expected_win_share)+" fit; "+c.bridge_games+" direct bridge games)":"\nComparator: none source-supported")+
 "\nReview notes: "+note.trim()+
 "\nHuman commissioner approval and eligibility/scheduling checks required. Not an official SVHL recommendation.";
}
function copy(t){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).then(()=>toast("Evidence summary copied.")).catch(()=>toast("Clipboard blocked."));else toast("Clipboard unavailable.")}
function download(){
 if(!drafts.length)return;
 const data=JSON.stringify({schema:"bruttech-leagueos-local-alignment-drafts/v1",notOfficial:true,exportedAt:new Date().toISOString(),drafts},null,2);
 const blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="LeagueOS_Division_Review_Drafts_"+new Date().toISOString().slice(0,10)+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast("Drafts exported. Nothing submitted.");
}
document.addEventListener("click",e=>{
 const x=e.target.closest("button");if(!x)return;
 if(x.dataset.alignTeam){selectTeam(x.dataset.alignTeam);return}
 if(x.dataset.alignDelete){drafts=drafts.filter(d=>d.key!==x.dataset.alignDelete);persist();render();const q=$("#align-queue-panel");if(q)q.hidden=false;return}
 if(x.id==="align-retry"){failed="";data=null;load();return}
 if(x.id==="align-save"){saveDraft();return}
 if(x.id==="align-copy-one"){const t=selectedTeam();if(t)copy(textEvidence(t));return}
 if(x.id==="align-export"){download();return}
 if(x.id==="align-queue"){const q=$("#align-queue-panel");if(q){q.hidden=!q.hidden;if(!q.hidden)q.scrollIntoView({behavior:"smooth",block:"nearest"})}return}
});
document.addEventListener("change",e=>{
 const x=e.target;
 if(x.id==="align-night"){filterNight=x.value;filterDivision="All divisions";query="";selected="";note="";target="current";render();return}
 if(x.id==="align-status"){filterStatus=x.value;selected="";note="";target="current";render();return}
 if(x.id==="align-division"){filterDivision=x.value;selected="";note="";target="current";render();return}
 if(x.id==="align-target"){target=x.value;const el=$("#align-scenario"),t=selectedTeam();if(el&&t)el.innerHTML=scenario(t,target);return}
});
document.addEventListener("input",e=>{
 const x=e.target;
 if(x.id==="align-search"){query=x.value;const rows=$("#align-rows");if(rows)rows.innerHTML=tableRows();return}
 if(x.id==="align-note")note=x.value;
});
window.LeagueOSAlignment={
 mount(){render();if(!data)load()},
 openNight(n){if(DAYS.includes(n)){filterNight=n;selected="";filterStatus="Review";filterDivision="All divisions";query="";render()}}
};
})();
