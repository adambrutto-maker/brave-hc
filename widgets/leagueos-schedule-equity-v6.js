/* BruTTech LeagueOS Scheduling Equity V6.
 * Independent public-source audit of observed start times, opponents and gaps.
 * No official fixture moves, facility bookings, team preferences or player data.
 */
(function(){"use strict";
const INPUT="./leagueos_schedule_equity_public_v6.json";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=x=>typeof x==="number"?x.toLocaleString("en-CA"):"—";
const signed=x=>typeof x==="number"?(x>0?"+":"")+x.toFixed(1):"—";
const pct=x=>typeof x==="number"?(x*100).toFixed(0)+"%":"—";
const clock=x=>typeof x==="number"?(String(Math.floor(Math.round(x)/60)%24).padStart(2,"0")+":"+String(Math.round(x)%60).padStart(2,"0")):"—";
const nights=["Sunday","Tuesday","Wednesday","Thursday"];
const key=t=>t.league_id+":"+t.team_id;
let data=null,loading=false,error="",night="all",division="all",term="",chosen=null;
function sourceTeam(t){return "https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid="+t.league_id+"&teamid="+t.team_id+"&page_type=Adult"}
const panel=(title,caption,content)=>'<section class="panel equity-panel"><div class="panelhead"><div><h2>'+title+'</h2>'+(caption?'<p>'+caption+'</p>':'')+'</div></div>'+content+'</section>';
const eligible=()=>data?.teams.filter(t=>night==="all"||t.night===night)||[];
const divisions=()=>[...new Set(eligible().map(t=>t.division))].sort((a,b)=>a.localeCompare(b));
const listing=()=>eligible().filter(t=>division==="all"||t.division===division)
 .filter(t=>!term||t.team_name.toLowerCase().includes(term.toLowerCase()))
 .sort((a,b)=>{
 const dif=(b.stats.late_share_minus_division_pp??-999)-(a.stats.late_share_minus_division_pp??-999);
 return a.division.localeCompare(b.division)||dif||a.team_name.localeCompare(b.team_name)
 });
const selected=()=>data?.teams.find(t=>key(t)===chosen)||null;
function metrics(){
 const c=data.coverage,r=data.randomization;
 const bits=[
 ["Teams in source",c.league_team_seasons,"Four current competition nights"],
 ["Verified game references",c.accepted_source_game_references,c.source_rec_completed+" completed · "+c.source_rec_future+" upcoming at capture"],
 ["Start-time allocation reviews",r.exploratory_reviews,"No cases met the exploratory screen"],
 ["Opponent-strength context",data.flag_counts.HIGHER_ESTIMATED_OPPONENT_STRENGTH_CONTEXT||0,"Descriptive only; not a fairness verdict"]
 ];
 return '<div class="equity-metrics">'+bits.map(x=>'<div><small>'+x[0]+'</small><strong>'+num(x[1])+'</strong><em>'+x[2]+'</em></div>').join('')+'</div>';
}
function topFilters(){
 return '<div class="equity-filters"><label class="field">League night<select id="equity-night"><option value="all">All nights</option>'+
 nights.map(n=>'<option value="'+n+'" '+(night===n?"selected":"")+'>'+n+'</option>').join('')+'</select></label>'+
 (night==="all"?'':('<label class="field">Division<select id="equity-division"><option value="all">All divisions</option>'+
 divisions().map(n=>'<option value="'+esc(n)+'" '+(division===n?"selected":"")+'>'+esc(n)+'</option>').join('')+'</select></label>'+
 '<label class="field">Find team<input id="equity-search" type="search" maxlength="80" value="'+esc(term)+'" placeholder="Team name…"></label>'))+
 '</div>';
}
function nightCards(){
 return panel("Select a league night","Start-time patterns are compared within a night, not directly across different competitions.",
 '<div class="equity-nights">'+nights.map(n=>{
 const v=data.night_baselines[n],teams=data.teams.filter(t=>t.night===n).length;
 return '<button class="equity-night" type="button" data-equity-night="'+n+'"><strong>'+n+'</strong>'+
 '<span>'+teams+' teams · '+v.observed_game_ids+' verified games</span>'+
 '<small>10 PM+ starts: '+pct(v.late_after_22_share)+' of published fixtures</small>'+
 '<b>Review exposures ›</b></button>';
 }).join('')+'</div>'+
 '<div class="equity-explain"><strong>What this analysis measures</strong><p>Published start times, repeated opponents, game-date gaps and available pregame opponent ratings. The 1,800-pass exploratory comparison keeps opponents and dates fixed while swapping published time slots within the same night and program. It does not construct a feasible replacement schedule.</p></div>');
}
function teamTable(){
 const rows=listing();
 const shown=rows.slice(0,90);
 if(!shown.length)return '<div class="equity-empty">No team records match. Select another division or clear your search.</div>';
 return '<div class="equity-tablewrap"><table class="equity-table"><thead><tr><th>Team</th>'+
 '<th class="num">Games</th><th class="num">10 PM+ starts</th><th class="num">Repeat share</th><th></th></tr></thead><tbody>'+
 shown.map(t=>{
 const s=t.stats;
 return '<tr class="'+(key(t)===chosen?"selected":"")+'"><td><button type="button" data-equity-team="'+esc(key(t))+'" class="equity-team-button">'+esc(t.team_name)+'</button><small>'+esc(t.division)+'</small></td>'+
 '<td class="num">'+num(s.accepted)+'</td>'+
 '<td class="num">'+num(s.late_after_22)+' ('+pct(s.late_after_22_share)+')</td>'+
 '<td class="num">'+pct(s.repeat_share)+'</td>'+
 '<td><button class="btn small" data-equity-team="'+esc(key(t))+'" type="button">Details ›</button></td></tr>';
 }).join('')+'</tbody></table></div>'+
 (rows.length>shown.length?'<p class="source">Showing 90 team records. Narrow the division to see the others.</p>':'');
}
function resultsList(){
 return panel("Observed team schedules","All figures are taken from the archived public fixture window; they are not current league commitments.",
 '<div id="equity-table-container">'+teamTable()+'</div>');
}
function stat(label,v,help=""){
 return '<div class="equity-stat"><small>'+label+'</small><strong>'+v+'</strong>'+(help?'<em>'+help+'</em>':'')+'</div>';
}
function detail(){
 const t=selected();
 if(!t)return panel("Inspect a team","Select a team from the results to understand its source exposure.",
 '<div class="equity-empty">Choose <b>Details</b> beside a team. No schedule fairness conclusions will be assigned automatically.</div>');
 const s=t.stats,r=t.randomized_slot_reference;
 let hour='';
 if(r){
  hour='<div class="equity-comparison"><strong>Start-time allocation check</strong>'+
  '<div class="equity-comparison-line"><span>Observed average start</span><b>'+clock(r.observed_avg_start_minutes)+'</b></div>'+
  '<div class="equity-comparison-line"><span>Same-date/program randomized reference</span><b>'+clock(r.shuffled_reference_minutes)+'</b></div>'+
  '<div class="equity-comparison-line"><span>Observed difference</span><b>'+signed(r.observed_minus_shuffled_minutes)+' minutes</b></div>'+
  '<p>Exploratory two-sided p = '+r.two_sided_exploratory_p.toFixed(3)+', adjusted q = '+r.q_bh_start.toFixed(3)+
  '. This is a conditional comparison, not an official fairness ruling. '+(r.exploratory_source_review?'An unusual slot allocation merits human source review.':'This does not meet the provisional statistical review threshold.')+'</p></div>';
 }else hour='<div class="equity-muted">There are not enough same-program source records to calculate a meaningful start-time comparison.</div>';
 const opp=s.opponent_elo_minus_division;
 const context=opp===null||typeof opp!=="number"?'Insufficient connected opponent history':
 (opp>0?'+':'')+opp.toFixed(1)+' pregame Elo points vs division median';
 const lens=s.opponent_pregame_elo_samples>=4?'('+s.opponent_pregame_elo_samples+' usable prior-rated matches)':'(small prior-rated sample)';
 const peer=s.late_share_minus_division_pp;
 const signal=t.flags.includes("HIGHER_ESTIMATED_OPPONENT_STRENGTH_CONTEXT");
 return panel(esc(t.team_name),esc(t.night)+' · '+esc(t.division),
 '<div class="equity-source-row"><strong>Observed source window</strong><span>'+s.played+' results · '+s.published_upcoming+' upcoming at archive capture</span></div>'+
 '<div class="equity-stats">'+stat("Starts at 10 PM or later",num(s.late_after_22)+' of '+num(s.accepted),pct(s.late_after_22_share)+' of games')+
 stat("Compared with division peers",peer===null?"Not enough peers":signed(peer)+' pp',"Positive = greater late-start share")+
 stat("Unique opponents",num(s.unique_opponents),"In published fixture window")+
 stat("Repeat fixtures",num(s.repeat_games_beyond_first),pct(s.repeat_share)+' of all games')+
 stat("Shortest observed date gap",s.shortest_gap_days===null?"Unknown":num(s.shortest_gap_days)+' days',"Other leagues or unrecorded games not included")+
 stat("Published doubleheader dates",num(s.doubleheader_dates),"No inference about other sports or practices")+'</div>'+
 hour+
 '<div class="equity-comparison"><strong>Opponent strength exposure</strong>'+
 '<div class="equity-comparison-line"><span>Source pregame opponent rating</span><b>'+esc(context)+'</b></div>'+
 '<p>'+esc(lens)+' Ratings were calculated before each published game result was applied. They are not comparable across disconnected divisions or league nights, and cannot be used to declare a league unfair.</p>'+
 (signal?'<p><b>Additional research context:</b> This team faced stronger-rated opponents than the median of sufficiently sampled teams in its published division.</p>':'')+'</div>'+
 '<p class="source">Source captured '+esc(data.source_snapshot)+'. Its unpublished preferences, agreed rink commitments and missing season fixtures are unknown. No team has been reassigned or game rescheduled.</p>'+
 '<a class="btn small" href="'+sourceTeam(t)+'" rel="noopener noreferrer" target="_blank">Original team source ↗</a>');
}
function scope(){
 const model=data.randomization;
 return '<details class="equity-scope"><summary>Methodology and source limitations</summary><div>'+
 '<p>All 401 accepted game records are reconciled through published team schedules. The 10 unresolved records are excluded. The snapshot captures only the window visible on 2026-11-16.</p>'+
 '<p>'+esc(model.model)+'</p>'+
 '<p>Simulation: '+num(model.simulation_count)+' permutations; '+num(model.team_seasons_eligible)+' eligible team records, '+num(model.games_with_both_model_teams_and_same_program)+' within-program game references. A scheduling fairness test requires authorized team preferences and rink/official constraints.</p>'+
 '<p>Late start is a descriptive 22:00 local cutoff, not a rulebook violation or accepted league preference threshold. More repeated matchups do not automatically imply unequal competition.</p>'+
 '<p>No age eligibility, signed game sheets, complete ice inventory, referee schedules or official club requests are connected. Any findings must be checked by league staff.</p>'+
 '</div></details>';
}
function render(){
 const el=$("#league-schedule-equity-mount");if(!el)return;
 if(error){el.innerHTML='<div class="callout warn">'+esc(error)+' <button type="button" class="btn small" id="equity-retry">Retry</button></div>';return}
 if(!data){el.innerHTML='<div class="panel loader">Loading source-qualified scheduling evidence…</div>';return}
 el.innerHTML=metrics()+topFilters()+(night==="all"?nightCards():
 '<div class="equity-layout"><div class="stack">'+resultsList()+'</div><div class="stack"><div id="equity-detail">'+detail()+'</div></div></div>')+
 scope()+'<p class="disclaimer">Independent LeagueOS source audit. Game results, start times and roster divisions are published snapshots, not official SVHL operational approvals or evidence that rink time is free. No production changes are made here.</p>';
}
async function load(){
 if(loading)return;loading=true;
 try{
  const res=await fetch(INPUT,{cache:"no-cache"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const x=await res.json();
  if(x.schema!=="bruttech-leagueos-schedule-equity-v6"||x.teams?.length!==96||x.coverage?.accepted_source_game_references!==401||x.randomization?.simulation_count!==1800)throw Error("Unexpected archive schema");
  data=x;error="";
 }catch(e){error="Scheduling equity data could not be loaded: "+e.message}
 finally{loading=false;render()}
}
function openNight(n){night=nights.includes(n)?n:"all";division="all";term="";chosen=null;render()}
function openTeam(k){if(!eligible().some(t=>key(t)===k))return;
 chosen=k;
 const table=$("#equity-table-container");if(table)table.innerHTML=teamTable();
 const det=$("#equity-detail");if(det){det.innerHTML=detail();if(window.innerWidth<1000)det.scrollIntoView({behavior:"smooth",block:"start"})}
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.equityNight){openNight(b.dataset.equityNight);return}
 if(b.dataset.equityTeam){openTeam(b.dataset.equityTeam);return}
 if(b.id==="equity-retry"){error="";data=null;load()}
});
document.addEventListener("change",e=>{
 const x=e.target;
 if(x.id==="equity-night"){openNight(x.value);return}
 if(x.id==="equity-division"){division=x.value;chosen=null;render();return}
});
document.addEventListener("input",e=>{
 const x=e.target;
 if(x.id==="equity-search"){term=x.value;chosen=null;
  const t=$("#equity-table-container");if(t)t.innerHTML=teamTable();
  const det=$("#equity-detail");if(det)det.innerHTML=detail();
 }
});
window.LeagueOSScheduleEquity={
 mount(){render();if(!data&&!loading)load()},
 openNight(n){if(data)openNight(n)},
 status(){return{loaded:Boolean(data),teams:data?.teams.length||0}}
};
})();
