/* LeagueOS V12 — source-qualified division health / opponent exposure case.
 * Demo only: public aggregate standings, model review and reciprocal game evidence.
 * This module never changes the official league, HockeyOS/HTO or facility systems.
 */
(function(){"use strict";
const INPUTS={ops:"./svhl-public-four-nights-v2.json",model:"./leagueos_division_alignment_public_v2.json",fixtures:"./leagueos-source-qualified-current-fixtures-v4.json"};
const NIGHTS=["Sunday","Tuesday","Wednesday","Thursday"];
const state={night:"Sunday",division:"The Cristillo Division",focus:13679,peerA:13708,peerB:13730,showRepeat:false};
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dec=(n,nplaces=1)=>Number(n||0).toFixed(nplaces);
const pct=(n)=>Math.round(100*(Number(n)||0))+"%";
const stamp="Nov 16, 2026";
let dataset=null,pending=null,error="";
function safeGameUrl(url){return /^https:\/\/leagues\.sportsvillage\.ca\/gameinfo\.aspx\?/i.test(url||"")?url:""}
function safeLeagueUrl(night){const id=dataset?.ops?.league_nights.find(x=>x.night===night)?.league_id;
return id===570||id===568||id===567||id===569?"https://leagues.sportsvillage.ca/Leagues.aspx?leagueid="+id+"&page_type=Adult&sc=HOCKEY":""}
function validate(d){
 if(d.ops?.schema!=="bruttech-svhl-public-operations/v2"||!Array.isArray(d.ops.standings)||!Array.isArray(d.ops.league_nights)||d.ops.league_nights.length!==4)throw Error("Public operations source unavailable");
 if(d.model?.schema!=="bruttech-division-alignment-research/v2"||!Array.isArray(d.model.teams)||d.model.teams.length!==96)throw Error("Division research schema differs");
 if(d.fixtures?.schema!=="bruttech-svhl-current-fixture-window/v4"||!Array.isArray(d.fixtures.fixtures)||d.fixtures.counts?.total!==411)throw Error("Partial fixture registry schema differs");
 if(!d.ops.league_nights.find(n=>n.league_id===570&&n.night==="Sunday"))throw Error("Sunday source league unavailable");
 return d
}
async function load(){if(dataset)return dataset;if(pending)return pending;
pending=Promise.all(Object.entries(INPUTS).map(async([k,url])=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error(k+" HTTP "+r.status);return[k,await r.json()]}))
.then(x=>{dataset=validate(Object.fromEntries(x));error="";render();return dataset}).catch(e=>{error=String(e);pending=null;render();return null});return pending
}
function divisions(){if(!dataset)return[];const night=state.night;
 const from=dataset.ops.standings.filter(x=>x.night===night&&x.division&&!/x-?playoff/i.test(x.division)).map(x=>x.division);
 return[...new Set(from)].sort((a,b)=>a.localeCompare(b))
}
function records(){if(!dataset)return[];return dataset.ops.standings.filter(x=>x.night===state.night&&x.division===state.division)}
function modelRow(team){return dataset?.model?.teams.find(x=>x.league_id===team.league_id&&x.team_id===team.team_id)||null}
function leagueRecords(){const src=records();return src.map(x=>{
const m=modelRow(x);
return{...x,gd:x.gf-x.ga,gdpg:x.gp?(x.gf-x.ga)/x.gp:0,rate:x.gp?x.pts/(2*x.gp):0,sourceModel:m}
}).sort((a,b)=>b.rate-a.rate||b.pts-a.pts||b.gd-a.gd||a.team.localeCompare(b.team))}
function currentFocus(all){return all.find(x=>x.team_id===state.focus)||all.at(-1)||null}
function headToHead(a,b){if(!a||!b)return[];
return dataset.fixtures.fixtures.filter(x=>x.league_id===a.league_id&&x.night===a.night&&
 ((x.home_team_id===a.team_id&&x.away_team_id===b.team_id)||(x.away_team_id===a.team_id&&x.home_team_id===b.team_id))
 ).sort((x,y)=>x.date.localeCompare(y.date)).map(x=>{
 let gf=null,ga=null;
 if(x.status==="COMPLETED_SOURCE_VERIFIED"&&x.scores&&Number.isInteger(x.scores.home)&&Number.isInteger(x.scores.away)){
  const home=x.home_team_id===a.team_id;gf=home?x.scores.home:x.scores.away;ga=home?x.scores.away:x.scores.home;
 }
 return{id:x.game_id,date:x.date,clock:x.time,status:x.status,score:gf===null?null:gf+"–"+ga,gf,ga,url:safeGameUrl(x.official_game_url),sourceCount:x.source_count||0}
});
}
function futureGames(team){return dataset.fixtures.fixtures.filter(x=>x.league_id===team.league_id&&x.status==="FUTURE_RECIPROCAL_FIXTURE"&&(x.home_team_id===team.team_id||x.away_team_id===team.team_id))
.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))}
function gameList(gs,a){return gs.map(g=>{
 const peer=g.home_team_id===a.team_id?g.away:g.home;
 return '<div class="v12-next-row"><div><strong>'+esc(g.date)+' · '+esc(g.time)+'</strong><small>vs '+esc(peer)+' · '+esc(g.rink||"Rink unconfirmed")+'</small></div>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+esc(safeGameUrl(g.official_game_url)||safeLeagueUrl(a.night))+'">Source game record ↗</a></div>';
}).join("")}
const select=(id,items,active,nameFn=x=>x)=>'<select id="'+id+'">'+items.map(v=>'<option value="'+esc(String(v.id??v))+'"'+(String(v.id??v)===String(active)?" selected":"")+'>'+esc(nameFn(v))+'</option>').join("")+'</select>';
function render(){const root=$("#league-division-review-mount");if(!root)return;
if(!dataset){root.innerHTML='<section class="panel v12-loading"><h2>Loading published division records</h2><p>'+esc(error||"Reading the league snapshot and opponent history…")+'</p></section>';if(!pending)load();return}
let divs=divisions();if(!divs.includes(state.division))state.division=divs[0]||"";
const all=leagueRecords(),focus=currentFocus(all);if(!focus){root.innerHTML='<section class="panel">No published team records for that division in this source snapshot.</section>';return}
state.focus=focus.team_id;
const candidates=all.filter(x=>x.team_id!==focus.team_id),choices=candidates.slice().sort((a,b)=>b.rate-a.rate||a.team.localeCompare(b.team));
let peerA=choices.find(x=>x.team_id===state.peerA)||choices[0]||null;
let peerB=choices.find(x=>x.team_id===state.peerB&&x.team_id!==peerA?.team_id)||choices.find(x=>x.team_id!==peerA?.team_id)||null;
state.peerA=peerA?.team_id||null;state.peerB=peerB?.team_id||null;
const size=all.length,high=all[0],low=all.at(-1),diffRate=high&&low?high.rate-low.rate:0;
const source=dataset.ops.league_nights.find(x=>x.night===state.night)||{};
const sampleGames=dataset.fixtures.fixtures.filter(g=>g.league_id===focus.league_id&&g.status==="COMPLETED_SOURCE_VERIFIED"&&(g.home_team_id===focus.team_id||g.away_team_id===focus.team_id)).length;
let html='<div class="v12-review">'+
 '<div class="v12-source-strip"><strong>Published standings snapshot · '+stamp+'</strong><span>Full season schedule not connected · No official division changes</span>'+
 '<a href="'+esc(safeLeagueUrl(state.night))+'" target="_blank" rel="noopener noreferrer">Official league source ↗</a></div>'+
 '<section class="panel v12-chooser"><div class="v12-panel-heading"><h2>Choose a league division</h2><p>The demo can review every current night. Start with The Cristillo Division to examine the published imbalance.</p></div>'+
 '<div class="v12-choose-grid"><label class="field">League night'+select("v12-night",NIGHTS,state.night)+'</label>'+
 '<label class="field">Division'+select("v12-division",divs.map(x=>({id:x,name:x})),state.division,x=>x.name)+'</label>'+
 '<label class="field">Team to examine'+select("v12-focus",all.map(x=>({id:x.team_id,name:x.team})),state.focus,x=>x.name)+'</label></div></section>'+
 '<div class="v12-metrics"><div><small>Division teams</small><strong>'+size+'</strong><span>Captured public standings</span></div>'+
 '<div><small>Top-to-bottom points rate gap</small><strong>'+Math.round(diffRate*100)+' pp</strong><span>'+esc(high?.team||"—")+' vs '+esc(low?.team||"—")+'</span></div>'+
 '<div><small>'+esc(focus.team)+' record</small><strong>'+focus.w+'–'+focus.l+'–'+focus.t+'</strong><span>'+focus.pts+' points · '+(focus.gd>=0?"+":"")+focus.gd+' goal difference</span></div></div>';

 const standingsSection='<section class="panel v12-standings"><div class="v12-panel-heading"><h2>Whole-division comparison</h2><p>Compare every team before discussing a placement change. This avoids treating one club’s results as the whole league.</p></div>'+
 '<div class="lc-tablewrap"><table class="lc-table"><thead><tr><th>Team</th><th>W–L–T</th><th>Pts rate</th><th>Goal diff./game</th><th>Published goals</th></tr></thead><tbody>'+
 all.map(x=>'<tr class="'+(x.team_id===focus.team_id?"v12-focus-row":"")+'"><td><b>'+esc(x.team)+'</b></td><td>'+x.w+'–'+x.l+'–'+x.t+'</td><td><div class="v12-pct-cell"><span>'+pct(x.rate)+'</span><i style="--pct:'+Math.round(x.rate*100)+'%"></i></div></td>'+
 '<td class="'+(x.gdpg>=0?"v12-positive":"v12-negative")+'">'+(x.gdpg>0?"+":"")+dec(x.gdpg,2)+'</td><td>'+x.gf+' for / '+x.ga+' against</td></tr>').join("")+'</tbody></table></div>'+
 '<p class="v12-table-caption">Points rate = earned standings points ÷ maximum available points (2 × games played). The snapshot may differ from cached versions of the public page; use the exact capture date.</p></section>';

 if(candidates.length){
  const peerNames=all.map(x=>({id:x.team_id,name:x.team}));
  html+='<section class="panel v12-matchups"><div class="v12-panel-heading"><h2>Compare repeated opponent exposure</h2><p>Select any two teams in this division. Head-to-head results come from reciprocal published game records, not a predicted score.</p></div>'+
  '<div class="v12-matchup-choices"><label class="field">First comparison'+select("v12-peer-a",peerNames.filter(x=>x.id!==focus.team_id),state.peerA,x=>x.name)+'</label>'+
  '<label class="field">Second comparison'+select("v12-peer-b",peerNames.filter(x=>x.id!==focus.team_id&&x.id!==state.peerA),state.peerB,x=>x.name)+'</label></div>'+
  '<div class="v12-peer-grid">'+[peerA,peerB].filter(Boolean).map(x=>{
   const games=headToHead(focus,x),known=games.filter(g=>g.score!==null),recent=known.at(-1);
   return '<article class="v12-peer"><div class="v12-peer-heading"><div><small>Comparison team</small><h3>'+esc(x.team)+'</h3></div><strong>'+x.w+'–'+x.l+'–'+x.t+'</strong></div>'+
   '<div class="v12-peer-metrics"><span><b>'+pct(x.rate)+'</b> points rate</span><span><b>'+(x.gdpg>=0?"+":"")+dec(x.gdpg,2)+'</b> goals/game differential</span></div>'+
   '<div class="v12-peer-h2h"><b>'+esc(focus.team)+' head-to-head</b><strong>'+(recent?esc(recent.score):"No completed matchup in capture")+'</strong>'+
   '<small>'+(recent?"Most recent: "+esc(recent.date)+" · from "+known.length+" captured completed game(s)":"No result should be invented")+'</small></div>'+
   (recent&&recent.url?'<a href="'+esc(recent.url)+'" target="_blank" rel="noopener noreferrer">View published game result ↗</a>':'')+
   '</article>'
  }).join("")+'</div>'+
  '<label class="v12-repeat-check"><input type="checkbox" id="v12-repeat"'+(state.showRepeat?' checked':'')+'><span><b>Illustrate one more meeting with each comparison team</b><small>This does not create or confirm future games.</small></span></label>'+
  (state.showRepeat?'<div class="v12-scenario-note"><strong>Illustrative rematch exposure: 2 additional matchups</strong><p>A further game against '+esc(peerA?.team||"—")+' and '+esc(peerB?.team||"—")+' would repeat these opponent pairings. No dates, scores, ice assignments or outcomes are assumed; the commissioner would review competitive balance across the entire division.</p></div>':'')+'</section>';
 }
 html+=standingsSection;
 const next=futureGames(focus);
 html+='<section class="panel v12-next"><div class="v12-panel-heading"><h2>Next games visible in the capture</h2><p>Only source-verified published fixtures are listed. Later rematches are not confirmed by the available fixture window.</p></div>'+
 (next.length?'<div class="v12-next-list">'+gameList(next.slice(0,4),focus)+'</div>':'<p class="v12-none">No future fixture is visible in this partial snapshot. That is not evidence there are no future games.</p>')+
 '<p class="v12-table-caption">Current fixture registry: '+dataset.fixtures.counts.future+' upcoming reciprocal entries across four nights, captured '+esc(dataset.fixtures.captured_date||"Nov 16, 2026")+'. A source gap is not a league scheduling decision.</p></section>'+
 '<section class="panel v12-review-next"><div><h2>What should a commissioner review?</h2><p>Look at every club’s results, the strength of its opponents, repeat matchup exposure and the impact of a proposed move on all affected teams. The existing LeagueOS model provides research signals; it does not make a placement decision.</p></div>'+
 '<div class="v12-review-buttons"><button type="button" class="btn primary" data-go="league-alignment">View division analysis</button><button type="button" class="btn" data-go="league-fairness">Whole-division fairness</button><button type="button" class="btn" data-go="league-decisions">Commissioner decision review</button>'+
 '<button type="button" class="btn" id="v12-export">Export review evidence</button></div>'+
 '<details class="v12-evidence"><summary>Source quality, model limits and review controls <span aria-hidden="true">⌄</span></summary>'+
 '<p>Public league standing rows '+size+' · '+sampleGames+' completed games for selected team in reciprocal fixture registry. Division model output is research only and depends on connected within-night results, not inferred player identities.</p>'+
 '<p>Model for '+esc(focus.team)+': '+(focus.sourceModel?'margin-adjusted research rating '+dec(focus.sourceModel.adjusted_rating,0)+'; expected same-division point-equivalent outcome share '+pct(focus.sourceModel.expected_same_division_win_share)+'; priority '+esc(focus.sourceModel.priority||"Monitor"):'no validated rating for this row')+'. These are NOT league-approved forecasts or realignment instructions.</p>'+
 '<p>Official schedules, rink rights, registration, player eligibility and commissioner authorization are not connected. Historical labels, source disagreements and pending result holds must remain visible.</p></details></section>'+
 '</div>';
 root.innerHTML=html
}
function exportReview(){
 if(!dataset)return;const all=leagueRecords(),focus=currentFocus(all),a=all.find(x=>x.team_id===state.peerA),b=all.find(x=>x.team_id===state.peerB);
 const data={schema:"bruttech-leagueos-division-review-v12",not_official:true,snapshot:dataset.ops.generated_at,public_fixture_capture:dataset.fixtures.captured_date,
 league_id:focus?.league_id||null,night:state.night,division:state.division,team_focus:focus?.team||null,all_teams:all.map(x=>({team:x.team,w:x.w,l:x.l,t:x.t,gp:x.gp,pts:x.pts,gf:x.gf,ga:x.ga,goals_diff_per_game:x.gdpg,points_rate:x.rate})),
 peers:[a,b].filter(Boolean).map(x=>({team:x.team,head_to_head:headToHead(focus,x)})),illustrative_repeat_each:state.showRepeat?1:0,authorities:{standings:"public-source-snapshot",matches:"reciprocal-official-scores",model:"research-only",schedule:"partial-never-booked"}};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),aTag=document.createElement("a");aTag.href=url;aTag.download="leagueos-division-review-demo-v12.json";document.body.append(aTag);aTag.click();aTag.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
document.addEventListener("change",e=>{
 const t=e.target;if(!$("#league-division-review-mount"))return;
 if(t.id==="v12-night"){state.night=t.value;state.division=divisions()[0]||"";state.focus=null;state.peerA=null;state.peerB=null;state.showRepeat=false;render()}
 else if(t.id==="v12-division"){state.division=t.value;state.focus=null;state.peerA=null;state.peerB=null;state.showRepeat=false;render()}
 else if(t.id==="v12-focus"){state.focus=Number(t.value);state.peerA=null;state.peerB=null;state.showRepeat=false;render()}
 else if(t.id==="v12-peer-a"){state.peerA=Number(t.value);if(state.peerA===state.peerB)state.peerB=null;render()}
 else if(t.id==="v12-peer-b"){state.peerB=Number(t.value);render()}
 else if(t.id==="v12-repeat"){state.showRepeat=t.checked;render()}
});
document.addEventListener("click",e=>{if(e.target.closest("#v12-export")&&$("#league-division-review-mount"))exportReview()});
window.LeagueOSDivisionReviewV12={mount(){render();if(!dataset&&!pending)load()},status(){return{loaded:!!dataset,error,night:state.night,division:state.division,team:state.focus,sourceWrites:0}},_test:{getData:()=>dataset,standings:leagueRecords,headToHead,futureGames,change(x){Object.assign(state,x);render()},safeGameUrl}};
})();
