/* LeagueOS V15 native scouting room.
 * Uses existing public four-night results, source-qualified alignment model,
 * and the pre-existing season-scoped game-event proof logic, not new inference.
 */
(function(){"use strict";
const $=s=>document.querySelector(s),safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const URLS={ops:"./svhl-public-four-nights-v2.json",model:"./leagueos_division_alignment_public_v2.json",index:"./svhl-player-game-index.json",season:"./svhl-player-game-570.json"};
const nights=["Sunday","Tuesday","Wednesday","Thursday"];
let data={},pending={},errors={},tab="pulse",night="Sunday",division="",teamId=null,playerTeamId=null,playerId=null;
const teamOf=n=>data.model?.teams.filter(t=>t.night===n)||[];
const divisions=n=>[...new Set(teamOf(n).map(t=>t.division))].sort();
const gamesOf=n=>data.ops?.games.filter(g=>g.night===n)||[];
const rating=x=>Math.round(x?.adjusted_rating||0).toLocaleString("en-CA");
function option(v,label,chosen){return'<option value="'+safe(String(v))+'"'+(String(v)===String(chosen)?' selected':'')+'>'+safe(label)+'</option>'}
function validate(key,val){if(key==="ops"&&val?.schema!=="bruttech-svhl-public-operations/v2")throw Error("Unrecognized source league operations");if(key==="model"&&(val?.schema!=="bruttech-division-alignment-research/v2"||val.teams?.length!==96))throw Error("Unrecognized strength research model");if(key==="index"&&(val?.schema!=="brave-hc-svhl-game-reconciliation-index/v1"||val.registeredGPVerified!==false||val.currentPlayers?.length!==348))throw Error("Unqualified player audit index");if(key==="season"&&(val?.schema!=="brave-hc-svhl-season-individual-game-evidence/v1"||val.leagueId!==570||val.leagueAssignmentsOrPlayerTotalsWritten!==false))throw Error("Unqualified season event evidence");return val}
async function load(key){if(data[key])return data[key];if(pending[key])return pending[key];pending[key]=fetch(URLS[key],{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error(key+" HTTP "+r.status);return validate(key,await r.json())}).then(x=>{data[key]=x;errors[key]="";pending[key]=null;render();return x}).catch(e=>{errors[key]=String(e);pending[key]=null;render();return null});return pending[key]}
function ensure(){load("ops");load("model");if(tab==="players"){load("index");load("season")}}
function cardTitle(k,h,p){return'<div class="v15-panel-header"><span>'+k+'</span><h3>'+h+'</h3><p>'+p+'</p></div>'}
function pulse(){
 const ops=data.ops,model=data.model;if(!ops||!model)return loadingState(["ops","model"]);
 const teams=teamOf(night),divs=divisions(night),fixtures=gamesOf(night);
 const totals=teams.reduce((acc,x)=>{acc.games+=x.source_games||0;return acc},{games:0});
 const stronger=teams.slice().filter(x=>Number.isFinite(x.adjusted_rating)).sort((a,b)=>b.adjusted_rating-a.adjusted_rating);
 const top=stronger[0],bottom=stronger.at(-1);
 const league=ops.league_nights.find(x=>x.night===night);
 const rated=stronger.filter(x=>x.standing_gp>=3);
 return'<div class="v15-scout-panels"><div class="v15-night-picker" role="group" aria-label="Competition night">'+nights.map(n=>'<button type="button" data-v15-night="'+n+'" aria-pressed="'+(n===night)+'" class="'+(n===night?"selected":"")+'">'+n.toUpperCase()+'</button>').join("")+'</div>'+
 '<div class="v15-scout-metrics"><div><small>TEAMS IN MODEL</small><strong>'+teams.length+'</strong><span>Source-based team-season IDs</span></div>'+
 '<div><small>COMPETITIVE DIVISIONS</small><strong>'+divs.length+'</strong><span>Night-specific groupings</span></div>'+
 '<div><small>PUBLISHED FIXTURE ROWS</small><strong>'+fixtures.length+'</strong><span>Nov 16 snapshot, partial</span></div>'+
 '<div><small>TEAM-GAME OBSERVATIONS</small><strong>'+totals.games+'</strong><span>Research counts, not unique fixtures</span></div></div>'+
 '<section class="v15-scout-panel">'+cardTitle("01 / THE LEAGUE","DIVISION STRENGTH","Side-by-side source-qualified ratings. The rating measures descriptive opponent-adjusted strength, not a chance of winning.")+
 '<div class="v15-division-lanes">'+divs.map(name=>{
 const rows=teams.filter(x=>x.division===name).sort((a,b)=>b.adjusted_rating-a.adjusted_rating);
 const median=model.division_summaries.find(x=>x.league_id===rows[0]?.league_id&&x.name===name)?.median_rating;
 const max=Math.max(...rows.map(x=>x.adjusted_rating)),min=Math.min(...rows.map(x=>x.adjusted_rating));
 return'<div class="v15-division-lane"><div><strong>'+safe(name)+'</strong><small>'+rows.length+' team records · median '+rating({adjusted_rating:median})+'</small></div>'+
 '<div class="v15-division-bar"><i style="width:'+Math.max(10,Math.min(100,Math.round((max-min+40)/300*100)))+'%"></i></div><span>'+Math.round(max-min)+' rating spread</span></div>'
 }).join("")+'</div></section>'+
 '<section class="v15-scout-panel">'+cardTitle("02 / SCOUTING SNAPSHOT","TEAM POWER BOARD","Ranked within the selected competition night using the already published research model.")+
 '<div class="v15-scout-rankings">'+rated.slice(0,12).map((t,i)=>
 '<button type="button" data-v15-choose-team="'+t.team_id+'"><b>'+String(i+1).padStart(2,"0")+'</b><span><strong>'+safe(t.team_name)+'</strong><small>'+safe(t.division)+' · '+(t.w||0)+'–'+(t.l||0)+'–'+(t.t||0)+'</small></span><em>'+rating(t)+'</em></button>').join("")+'</div>'+
 '<div class="v15-scout-links"><button type="button" class="btn" data-go="league-division-review">Division health</button><button type="button" class="btn" data-go="league-alignment">Division fit analysis</button><button type="button" class="btn" data-go="league-history">Season archive</button></div></section>'+
 '<p class="v15-scout-source">Source captured '+safe(league?.captured_at||ops.generated_at)+'. The models are advisory only, with no automatic team moves or prediction of future results.</p></div>'
}
function fit(){
 const model=data.model;if(!model)return loadingState(["model"]);
 const ds=divisions(night);if(!ds.includes(division))division=ds[0]||"";
 const rows=teamOf(night).filter(x=>x.division===division).sort((a,b)=>b.adjusted_rating-a.adjusted_rating);
 if(!rows.some(x=>x.team_id===teamId))teamId=rows[0]?.team_id||null;
 const target=rows.find(x=>x.team_id===teamId),min=Math.min(...rows.map(x=>x.adjusted_rating)),max=Math.max(...rows.map(x=>x.adjusted_rating));
 const allPeer=teamOf(night),alternatives=target?.comparisons?.filter(x=>x.eligible_for_proposal)||[];
 return'<div class="v15-scout-panel v16-fit-lab"><div class="v16-fit-header"><span class="v16-eyebrow">SCOUTING ROOM / DIVISION FIT</span><h2>Where does this club fit?</h2><p>Select a league night, division and team. The strength board updates using the established opponent-adjusted research model.</p></div>'+
 '<div class="v16-fit-nights" role="group" aria-label="League night">'+nights.map(n=>'<button type="button" data-v16-fit-night="'+n+'" aria-pressed="'+(n===night)+'" class="'+(n===night?'selected':'')+'">'+n.toUpperCase()+'</button>').join("")+'</div>'+
 '<div class="v16-fit-divisions" role="group" aria-label="Division selection">'+ds.map(n=>{
   const clubs=teamOf(night).filter(x=>x.division===n);
   return'<button type="button" data-v16-fit-division="'+safe(n)+'" class="'+(n===division?'selected':'')+'" aria-pressed="'+(n===division)+'"><strong>'+safe(n)+'</strong><small>'+clubs.length+' teams</small></button>'
 }).join("")+'</div>'+
 '<div class="v16-fit-clubs"><span class="v16-eyebrow">CHOOSE A CLUB</span><div role="group" aria-label="Choose team for division fit">'+rows.map(x=>'<button type="button" data-v16-fit-club="'+x.team_id+'" aria-pressed="'+(x.team_id===teamId)+'" class="'+(x.team_id===teamId?'selected':'')+'"><span>'+safe(x.team_name)+'</span><b>'+Math.round(x.adjusted_rating)+'</b></button>').join("")+'</div></div>'+
 '<details class="v16-fit-settings"><summary>⚙ Detailed filters & source settings</summary><div class="v15-native-filters"><label>Competition night<select id="v15-scout-night">'+nights.map(n=>option(n,n,night)).join("")+'</select></label>'+
 '<label>Current division<select id="v15-scout-division">'+ds.map(n=>option(n,n,division)).join("")+'</select></label>'+
 '<label>Club<select id="v15-scout-team">'+rows.map(x=>option(x.team_id,x.team_name,teamId)).join("")+'</select></label></div></details>'+

 (target?'<div class="v15-fit-hero"><div><span>OPPONENT-ADJUSTED RESEARCH RATING</span><strong>'+rating(target)+'</strong><small>'+safe(target.team_name)+' · '+safe(target.division)+'</small></div>'+
 '<div><span>DIVISION PEER MEDIAN</span><strong>'+rating({adjusted_rating:target.division_peer_median_rating})+'</strong><small>Descriptive model only</small></div>'+
 '<div><span>RATING DISTANCE</span><strong>'+((target.adjusted_rating-target.division_peer_median_rating)>=0?"+":"")+Math.round(target.adjusted_rating-target.division_peer_median_rating)+'</strong><small>Compared with own-division median</small></div></div>':'')+
 '<div class="v15-fit-chart">'+rows.map(x=>'<div class="v15-fit-row"><span>'+safe(x.team_name)+'</span><div><i style="width:'+Math.max(5,Math.min(100,Math.round((x.adjusted_rating-min+25)/(max-min+50)*100)))+'%"></i></div><strong>'+rating(x)+'</strong></div>').join("")+'</div>'+
 (target?'<div class="v15-fit-evidence"><strong>Readiness: '+safe(target.priority||"Review")+'</strong><p>'+safe(target.source_sample_grade||"Source coverage limited")+' · '+safe(target.confidence||"See underlying evidence")+'. The same source team ID is used throughout; changes require commissioner review.</p>'+
 '<div class="v15-fit-alternatives">'+alternatives.slice(0,3).map(x=>'<span>'+safe(x.target_division)+' · +'+Math.round((x.relative_balance_gain||0)*100)+' pp scenario difference</span>').join("")+'</div></div>':'')+
 '<div class="v15-scout-links"><button class="btn primary" data-go="league-alignment" type="button">Open full division analysis</button><button class="btn" data-go="league-fairness" type="button">Whole-division impact</button><button class="btn" data-go="league-decisions" type="button">Commissioner review</button></div>'+
 '<p class="v15-scout-source">No automatic moves. All candidate comparisons require connected source games, roster/eligibility checks and scheduling impact review.</p></div>'
}
function audit(){
 const index=data.index,season=data.season;
 if(!index||!season)return loadingState(["index","season"]);
 const ts=season.teams.map(x=>({id:x.sourceTeamId,name:x.name})).sort((a,b)=>a.name.localeCompare(b.name));
 if(!ts.some(t=>t.id===playerTeamId))playerTeamId=ts[0]?.id||null;
 const team=season.teams.find(x=>x.sourceTeamId===playerTeamId),ps=team?.playerSeasonSummaries||[];
 if(!ps.some(p=>p.playerId===playerId))playerId=ps[0]?.playerId||null;
 const person=ps.find(p=>p.playerId===playerId);
 let proof=null,held="";
 if(person&&window.BravePlayerParticipationEvidence){try{proof=window.BravePlayerParticipationEvidence.analyze(index,season,playerTeamId,playerId)}catch(e){held=String(e)}}
 return'<div class="v15-scout-panel">'+cardTitle("PLAYER EVIDENCE / HISTORICAL SOURCE AUDIT","CHECK THE GAME SHEET","Trace a published scoring event back to source game evidence. Scoring events prove only a *minimum* number of appearances—not full games played or penalty minutes.")+
 '<div class="v15-audit-banner"><b>SUNDAY-ONLY HISTORICAL EVIDENCE</b><span>Captured Oct 27, 2026. Not current eligibility, attendance or a validated player identity across names.</span></div>'+
 '<div class="v15-native-filters"><label>Published Sunday club<select id="v15-audit-team">'+ts.map(x=>option(x.id,x.name,playerTeamId)).join("")+'</select></label>'+
 '<label>Published player-scoring record<select id="v15-audit-player">'+ps.map(x=>option(x.playerId,x.name,playerId)).join("")+'</select></label></div>'+
 (proof?'<div class="v15-scout-metrics"><div><small>PUBLISHED SEASON GP</small><strong>'+proof.publishedSeasonGP+'</strong><span>Not game-verified</span></div>'+
 '<div><small>PROVEN SCORING INVOLVEMENT</small><strong>'+proof.provenScoringInvolvementGames+'</strong><span>Minimum confirmed games</span></div>'+
 '<div><small>GAMES WITHOUT PROVEN SCORING</small><strong>'+proof.otherPublishedGPNotGameVerified+'</strong><span>Not evidence of absence</span></div>'+
 '<div><small>SOURCE SCORING EVENTS</small><strong>'+proof.eventRoleCount+'</strong><span>Goal/assist role evidence</span></div></div>'+
 '<div class="v15-audit-evidence"><h4>LINKED GAME EVIDENCE</h4>'+
 (proof.scoringEvidenceGames.length?proof.scoringEvidenceGames.slice(0,20).map(g=>'<div><span>'+safe(g.date)+'</span><strong>Game '+g.gameId+' · '+g.goalEvents+' goals / '+g.admittedAssistEvents+' admitted assists</strong>'+
 (/^https:\/\/leagues\.sportsvillage\.ca\/gameinfo\.aspx/i.test(g.officialUrl||"")?'<a href="'+safe(g.officialUrl)+'" target="_blank" rel="noopener noreferrer">Official game ↗</a>':'')+'</div>').join(""):'<p>No admitted scoring-event games for this record. This does not mean the player did not play.</p>')+'</div>':
 '<div class="v15-audit-banner"><b>UNRESOLVED SOURCE EVIDENCE</b><p>'+safe(held||"No qualified scoring-event comparison available for the selected record.")+'</p></div>')+
 '<div class="v15-scout-links"><button type="button" class="btn" data-go="league-rules">Eligibility rules</button><button type="button" class="btn" data-go="league-eligibility-preview">Eligibility UI concept</button><button type="button" class="btn" data-go="league-teams">Teams</button></div>'+
 '<p class="v15-scout-source">The existing evidence model is limited to exact official player ID/game associations and cautiously matched unique assists. No claim about full GP, attendance, PIM or current eligibility is made.</p></div>'
}
function loadingState(keys){const bad=keys.filter(k=>errors[k]);return'<div class="v15-native-loading"><strong>'+(bad.length?"SOURCE HELD":"LOADING VERIFIED RECORDS")+'</strong><p>'+safe(bad.length?bad.map(k=>errors[k]).join("; "):"Reading source-qualified public data…")+'</p>'+(bad.length?'<button type="button" class="btn" id="v15-intel-retry">Retry source read</button>':'')+'</div>'}
function render(){
 const root=$("#league-native-intelligence-mount");if(!root)return;
 root.innerHTML='<div class="v15-native-intelligence"><div class="v15-console-header"><div><span>LEAGUE OFFICE / SCOUTING ROOM</span><h2>KNOW YOUR LEAGUE.</h2><p>Compare real club records and historical evidence with the same research tools behind Division Fit and the whole-division review.</p></div><b>RESEARCH MODE</b></div>'+
 '<div class="v15-game-nav" role="tablist" aria-label="League intelligence modules">'+[
 ["pulse","LEAGUE PULSE"],["fit","DIVISION FIT"],["players","PLAYER AUDIT"]].map(([key,title])=>'<button role="tab" type="button" data-v15-intel-tab="'+key+'" class="'+(tab===key?"selected":"")+'" aria-selected="'+(tab===key)+'">'+title+'</button>').join("")+'</div>'+
 (tab==="pulse"?pulse():tab==="fit"?fit():audit())+'</div>';
}
document.addEventListener("click",e=>{if(!$("#league-native-intelligence-mount"))return;const b=e.target.closest("button");if(!b)return;
if(b.dataset.v15IntelTab){tab=b.dataset.v15IntelTab;ensure();render();return}
if(b.dataset.v16FitNight){night=b.dataset.v16FitNight;division="";teamId=null;render();return}
if(b.dataset.v16FitDivision){division=b.dataset.v16FitDivision;teamId=null;render();return}
if(b.dataset.v16FitClub){teamId=Number(b.dataset.v16FitClub);render();return}

if(b.dataset.v15Night){night=b.dataset.v15Night;division="";teamId=null;render();return}
if(b.dataset.v15ChooseTeam){tab="fit";teamId=Number(b.dataset.v15ChooseTeam);const found=data.model?.teams.find(x=>x.team_id===teamId);if(found){night=found.night;division=found.division}render();return}
if(b.id==="v15-intel-retry"){for(const k of Object.keys(errors))errors[k]="";ensure();render();return}
});
document.addEventListener("change",e=>{if(!$("#league-native-intelligence-mount"))return;const t=e.target;
if(t.id==="v15-scout-night"){night=t.value;division="";teamId=null;render()}
if(t.id==="v15-scout-division"){division=t.value;teamId=null;render()}
if(t.id==="v15-scout-team"){teamId=Number(t.value);render()}
if(t.id==="v15-audit-team"){playerTeamId=Number(t.value);playerId=null;render()}
if(t.id==="v15-audit-player"){playerId=Number(t.value);render()}
});
window.LeagueOSNativeIntelligenceV15={mount(){render();ensure()},status(){return{mode:tab,night,loaded:{ops:!!data.ops,model:!!data.model,index:!!data.index,season:!!data.season},authority:"RESEARCH_ONLY",officialWrites:0}},_test:{source:()=>data,teamOf,divisions,fit,audit,validate}};
})();