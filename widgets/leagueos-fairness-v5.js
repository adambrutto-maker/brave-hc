/* LeagueOS Fairness Audit V5 — commissioner-facing source-qualified research.
   Aggregate team data only; no server writes, identity or eligibility decisions.
*/
(function(){"use strict";
const BASE="./",FILES={
 cases:"leagueos_whole_division_fairness_public_v5.json",
 quality:"leagueos_fairness_quality_public_v5.json"};
const $=q=>document.querySelector(q);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=x=>typeof x==="number"?x.toLocaleString("en-CA"):"—";
const fixed=x=>typeof x==="number"?x.toFixed(2):"—";
const signed=x=>typeof x==="number"?(x>0?"+":"")+x.toFixed(2):"—";
const pct=x=>typeof x==="number"?(x*100).toFixed(0)+"%":"—";
const abs=x=>Math.abs(x);
let model=null,quality=null,selected=null,loading=false,error="",feedback="";
const panel=(h,sub,content)=>'<section class="panel fair-panel"><div class="panelhead"><div><h2>'+h+'</h2>'+(sub?'<p>'+sub+'</p>':"")+'</div></div>'+content+'</section>';
const linkToCase=(id)=>'<button type="button" class="btn" data-fair-decision="'+esc(id)+'">Open commissioner review ↗</button>';
function getCase(){return model?.cases.find(x=>x.case_id===selected)||null}
function metrics(){
 const q=quality,m=model;
 return '<div class="fair-metrics">'+
 [['Exchanges studied',m.cases.length,'Source-connected Wednesday cases'],
 ['Supported realignments',0,'No move has passed all evidence gates'],
 ['Historical games',q.source.past_games,'Winter 2011/12 onward'],
 ['Uncertainty holds',q.whole_division.with_uncertainty_crossing_no_improvement,'Range includes no improvement']
 ].map(([name,n,description])=>'<div><small>'+name+'</small><strong>'+val(n)+'</strong><em>'+description+'</em></div>').join('')+'</div>';
}
function caseSummary(c){
 const x=c.posterior_strength_conditional_on_source_games;
 const old=(c.swap||[]).map(t=>t.name).join(" ↔ ");
 const on=c.case_id===selected;
 return '<button type="button" class="fair-case '+(on?"selected":"")+'" data-fair-case="'+esc(c.case_id)+'" aria-current="'+on+'">'+
 '<span class="fair-case-heading">'+esc(old)+'</span><span class="fair-case-context">'+esc(c.night)+' · '+c.teams_considered+' teams assessed</span>'+
 '<span class="fair-case-outcome"><strong>'+signed(x.central_parity_gain_pp)+' pp</strong><span>All-team mismatch reduction</span></span>'+
 '<span class="fair-case-evidence">Uncertainty range: '+signed(x.model_sensitivity_10_50_90[0])+' to '+signed(x.model_sensitivity_10_50_90[2])+' pp</span>'+
 '<span class="fair-case-bottom"><span>Evidence incomplete · no movement proposed</span><span>Review ›</span></span></button>';
}
function mainList(){
 return panel("Four exchange studies","The results for every club in both divisions matter—not just the two moving teams.",
 '<div class="fair-case-list">'+model.cases.map(caseSummary).join('')+'</div>'+
 '<p class="source">These are the four existing source-connected Wednesday proposals. Other nights lack defensible equivalent paired-exchange evidence; that does not mean those divisions are already fair.</p>');
}
function uncertaintyPlot(x){
 const lo=x.model_sensitivity_10_50_90[0],mid=x.model_sensitivity_10_50_90[1],hi=x.model_sensitivity_10_50_90[2];
 const min=-2.5,max=3.5;
 const pos=v=>100*Math.max(0,Math.min(1,(v-min)/(max-min)));
 const a=pos(lo),b=pos(hi),c=pos(mid),zero=pos(0);
 return '<div class="fair-spectrum" role="img" aria-label="Conditional model sensitivity from '+signed(lo)+' to '+signed(hi)+' percentage points; median '+signed(mid)+'; zero means no improvement.">'+
 '<span class="fair-spectrum-label left">Could worsen</span><span class="fair-spectrum-label right">Could improve</span>'+
 '<div class="fair-spectrum-track"><i class="fair-spectrum-zero" style="left:'+zero+'%"></i>'+
 '<span class="fair-spectrum-band" style="left:'+a+'%;width:'+Math.max(2,b-a)+'%"></span>'+
 '<b class="fair-spectrum-center" style="left:'+c+'%"></b></div>'+
 '<div class="fair-spectrum-ticks"><span>-2.5 pp</span><strong>0</strong><span>+3.5 pp</span></div></div>';
}
function movedRows(c){
 const p=c.swap;
 return '<div class="fair-moved">'+p.map(t=>
 '<div class="fair-moved-row"><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.from)+' → '+esc(t.to)+'</small></div>'+
 '<div><span>Earlier published PTS/GP</span><strong>'+fixed(t.prior_pts_gp_median)+'</strong></div></div>').join('')+'</div>';
}
function communityEffects(c){
 const peer=c.peers;
 const rows=peer.member_impact.filter(x=>x.improvement_pp!==null).slice()
 .sort((a,b)=>a.improvement_pp-b.improvement_pp);
 const changed=rows.filter(x=>x.moved),stay=rows.filter(x=>!x.moved);
 const more=stay.filter(x=>x.improvement_pp<-.5).slice(0,7);
 const less=stay.filter(x=>x.improvement_pp>.5).slice(0,7);
 return '<div class="fair-peer-counts">'+
 '<div><small>All affected teams</small><strong>'+c.teams_considered+'</strong></div>'+
 '<div><small>Teams with less-balanced matchups</small><strong>'+peer.worse_by_more_than_half_point+'</strong></div>'+
 '<div><small>Unchanged teams made less balanced</small><strong>'+peer.nonmoving_teams_worse_by_half_point+'</strong></div></div>'+
 '<div class="fair-peer-two">'+
 '<div><h4>Unchanged teams facing a worse balance</h4>'+
 (more.length?more.map(x=>'<div class="fair-peer-row"><strong>'+esc(x.name)+'</strong><span>'+signed(x.improvement_pp)+' pp</span></div>').join(''):
 '<p>No unchanged teams cross this illustrative 0.5-point threshold.</p>')+'</div>'+
 '<div><h4>Unchanged teams gaining balance</h4>'+
 (less.length?less.map(x=>'<div class="fair-peer-row"><strong>'+esc(x.name)+'</strong><span>'+signed(x.improvement_pp)+' pp</span></div>').join(''):
 '<p>No unchanged teams cross this illustrative 0.5-point threshold.</p>')+'</div></div>'+
 '<p class="source">Positive means a smaller estimated mismatch gap for that team; negative means a larger gap. These are hypothetical averages over possible opponents—not the actual future schedule.</p>';
}
function selectedDetail(){
 const c=getCase();if(!c)return panel("Select a study","Choose a research case to inspect its impact.","");
 const x=c.posterior_strength_conditional_on_source_games;
 const range=x.model_sensitivity_10_50_90;
 const originalV3=(()=>{const name=c.swap.map(t=>t.name).join(" ↔ ");return ["Brewhawks ↔ Julian's Spartans","Brewhawks ↔ PPG","Roadrunners ↔ Julian's Spartans","Roadrunners ↔ PPG"].indexOf(name)>=0})()
 return panel("Whole-division consequences","What this case means for the two divisions—not just the moved teams.",
 '<div class="fair-detail-head"><div><strong>'+esc(c.swap.map(t=>t.name).join(" ↔ "))+'</strong>'+
 '<span>Wednesday · '+c.source_cross_division_games+' verified cross-division game connections</span></div>'+
 '<span class="fair-hold">Evidence hold</span></div>'+
 '<div class="fair-main-result"><small>Estimated net reduction in matchup mismatch</small>'+
 '<strong>'+signed(x.central_parity_gain_pp)+' <span>percentage points</span></strong>'+
 '<p>Across all possible pairings of the '+c.teams_considered+' teams in the two affected divisions.</p></div>'+
 uncertaintyPlot(x)+
 '<div class="fair-range-caption"><strong>Uncertainty sensitivity: '+signed(range[0])+' to '+signed(range[2])+' pp</strong>'+
 '<small>In '+pct(x.fraction_of_model_draws_with_gain)+' of conditional model draws, the swap improves the mismatch measure. This is not a validated real-world probability of success.</small></div>'+
 '<div class="fair-decision"><strong>Current decision: do not recommend a move</strong>'+
 '<p>The uncertainty range crosses zero. Source roster and complete schedule/ice information are not sufficient to validate a realignment.</p></div>'+
 movedRows(c)+
 '<details class="fair-effect" open><summary>How could other teams be affected?</summary>'+
 communityEffects(c)+'</details>'+
 '<details class="fair-effect"><summary>Model assumptions and alternative settings</summary>'+
 '<div class="fair-settings">'+x.prior_sensitivity.map(r=>
 '<div><span>Prior strength SD '+r.prior_sd+'</span><strong>'+signed(r.net_parity_improvement_pp)+' pp</strong></div>').join('')+'</div>'+
 '<p>Results vary with model regularization. These sensitivity checks cannot replace independent season validation.</p></details>'+
 '<div class="fair-case-actions">'+linkToCase(c.case_id)+
 '<button type="button" class="btn" id="fair-copy">Copy research summary</button></div>'+
 '<p class="source">'+c.known_schedule?.upcoming_fixture_refs+' published upcoming game records touch this research case. Rink feasibility and full-season schedules are not verified. No game or team has been moved.</p>');
}
function qualitySection(){
 const q=quality;
 const v=q.historical_validation,w=q.week_five,c=q.cross_night;
 return '<details class="fair-quality"><summary>Model accuracy and source coverage</summary>'+
 '<div class="fair-quality-inner"><div class="fair-quality-grid">'+
 '<div><small>Methods compared</small><strong>'+v.models_compared+'</strong><span>Historically tuned before the 2026 analysis</span></div>'+
 '<div><small>Validation games</small><strong>'+val(v.validation_games)+'</strong><span>2024–2025 chronological outcomes</span></div>'+
 '<div><small>New / old log loss</small><strong>'+fixed(v.chosen_logloss)+' / '+fixed(v.old_logloss)+'</strong><span>Lower is better; improvement is modest</span></div>'+
 '<div><small>2026 retrospective difference</small><strong>'+fixed(v.retrospective_2026_chosen_logloss)+' / '+fixed(v.retrospective_2026_v2_logloss)+'</strong><span>231 games; not a prospective test</span></div>'+
 '<div><small>Week-five follow-up test</small><strong>'+val(w.validation_games)+'</strong><span>Historical future-game forecasts; current sample is small</span></div>'+
 '<div><small>Usable multi-night source-ID overlaps</small><strong>'+val(c.source_ids_with_usable_stats)+'</strong><span>Moderate scoring correlation '+fixed(c.normalized_scoring_correlation)+'; not calibrated night strength</span></div>'+
 '</div>'+
 '<div class="fair-quality-rule"><strong>What the model cannot yet establish</strong>'+
 '<p>It cannot verify player eligibility, source-ID identity across changed registrations, referee performance, age-division rules, complete schedules, ice allocations or equivalent skill levels across different league nights.</p>'+
 '<p>The current 2026/27 results have been examined previously. All uncertainty ranges are conditional model sensitivity—not certified future probabilities.</p></div></div></details>';
}
function coverage(){
 const nights=model.night_components;
 return '<details class="fair-quality"><summary>League-night comparison boundaries</summary>'+
 '<div class="fair-quality-inner"><div class="fair-night-lines">'+
 ["Sunday","Tuesday","Wednesday","Thursday"].map(n=>{
 const x=nights[n];
 return '<div><strong>'+esc(n)+'</strong><span>'+x.teams+' teams · '+x.source_games+' matched source games · '+x.components+' disconnected result group'+(x.components===1?"":"s")+'</span></div>';
 }).join('')+'</div>'+
 '<p class="source">No comparisons are generated between disconnected result networks or different league nights. Tuesday has an additional standings/game reconciliation gap; all paths to an official division change remain restricted.</p></div></details>';
}
function overview(){
 return metrics()+
 '<div class="fair-brief"><strong>The fairness finding</strong><p>All four historical pair-exchange scenarios show modest average benefit when evaluated across every team. But their uncertainty ranges include worsening overall balance. The system therefore recommends <b>additional review, not realignment.</b></p></div>'+
 '<div class="fair-layout"><div class="stack">'+mainList()+'</div>'+
 '<div class="stack"><div id="fair-detail">'+selectedDetail()+'</div></div></div>'+
 qualitySection()+coverage()+
 '<p class="disclaimer">BruTTech independent research prototype. Public source aggregate models are not official SVHL division approvals, win forecasts, signed game-sheet eligibility or authoritative ice bookings. No production records are changed by this screen.</p>'+
 '<div class="fair-toast" id="fair-toast" role="status" '+(feedback?"":"hidden")+'>'+esc(feedback)+'</div>';
}
function render(){
 const mount=$("#league-fairness-mount");if(!mount)return;
 if(error){mount.innerHTML='<section class="callout warn">'+esc(error)+' <button type="button" class="btn small" id="fair-retry">Retry</button></section>';return}
 if(!model||!quality){mount.innerHTML='<section class="panel loader">Loading whole-division research evidence…</section>';return}
 mount.innerHTML=overview();
}
async function load(){
 if(loading)return;
 loading=true;
 try{
  const [m,q]=await Promise.all([fetch(BASE+FILES.cases,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("Whole-division model unavailable");return r.json()}),
   fetch(BASE+FILES.quality,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("Validation report unavailable");return r.json()})]);
  if(m.schema!=="bruttech-leagueos-whole-division-fairness/v5"||m.cases?.length!==4)throw Error("Incorrect fairness model schema");
  if(q.schema!=="bruttech-leagueos-fairness-quality/v5"||q.whole_division?.cases_studied!==4)throw Error("Incorrect model validation schema");
  model=m;quality=q;error="";
  if(!m.cases.some(c=>c.case_id===selected))selected=m.cases[0].case_id;
 }catch(e){error="Fairness evidence is currently unavailable: "+e.message}
 finally{loading=false;render()}
}
function summaryText(c){
 const x=c.posterior_strength_conditional_on_source_games;
 return "LeagueOS Whole-Division Fairness Research V5 — NOT AN OFFICIAL MOVE\n"+
 "Case: "+c.swap.map(t=>t.name+" ("+t.from+" to "+t.to+")").join("; ")+"\n"+
 "Population analyzed: "+c.teams_considered+" teams in two Wednesday divisions\n"+
 "Estimated whole-group mismatch reduction: "+signed(x.central_parity_gain_pp)+" pp\n"+
 "Conditional model sensitivity 10–90 range: "+signed(x.model_sensitivity_10_50_90[0])+
 " to "+signed(x.model_sensitivity_10_50_90[2])+" pp\n"+
 "Fraction of conditional model draws with improvement: "+pct(x.fraction_of_model_draws_with_gain)+
 " — NOT a validated likelihood of real-world success\n"+
 "Unchanged teams made less balanced (>0.5 pp): "+c.peers.nonmoving_teams_worse_by_half_point+"\n"+
 "Source cross-division games: "+c.source_cross_division_games+"\n"+
 "Decision: EVIDENCE HOLD; no team move recommended by the research\n"+
 "Requires commissioner judgment, signed game sheets, official points carryover, full schedule and facility ice verification.";
}
function copy(text){
 if(!navigator.clipboard?.writeText){feedback="Clipboard unavailable.";render();return}
 navigator.clipboard.writeText(text).then(()=>{feedback="Research summary copied.";render()}).catch(()=>{feedback="Clipboard permission blocked.";render()});
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.fairCase){selected=b.dataset.fairCase;feedback="";render();if(window.innerWidth<1000)$("#fair-detail")?.scrollIntoView({behavior:"smooth",block:"start"});return}
 if(b.id==="fair-retry"){error="";model=null;quality=null;load();return}
 if(b.id==="fair-copy"){const c=getCase();if(c)copy(summaryText(c));return}
 if(b.dataset.fairDecision){
  const id=b.dataset.fairDecision;
  window.LeagueOSDecisionDesk?.openCase?.(id);
  const link=document.querySelector('[data-go="league-decisions"]');
  if(link)link.click();
 }
});
window.LeagueOSFairness={mount(){render();if(!model&&!loading)load()},getStatus(){return{loaded:Boolean(model),cases:model?.cases?.length||0}}};
})();
