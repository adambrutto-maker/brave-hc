/* BruTTech LeagueOS: neutral, public-source historical archive explorer.
   Aggregates only. No player names, personal IDs, league writes, HTO writes or inferred availability.
*/
(function(){"use strict";
const ROOT="./",IN="leagueos-public-archive-overview-v1.json";
const DAYS=["Sunday","Tuesday","Wednesday","Thursday","Friday"];
const cache={index:null,teams:{}};
const st={night:"all",league:null,division:"all",search:"",selected:null,busy:false,error:""};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=n=>typeof n==="number"?n.toLocaleString("en-CA"):"—";
const pct=n=>typeof n==="number"?Math.round(n*100)+"%":"—";
const fixed=n=>typeof n==="number"?n.toFixed(2):"—";
const neg=n=>typeof n==="number"?(n>0?"+":"")+n.toFixed(2):"—";
const nl=n=>DAYS.includes(n)?n:null;
const idOf=t=>t.l+":"+t.id;
const sourceLink=(lid,tid)=>"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid="+encodeURIComponent(lid)+"&teamid="+encodeURIComponent(tid)+"&page_type=Adult";
async function getJSON(path){
 const r=await fetch(ROOT+path,{cache:"no-cache"});
 if(!r.ok)throw Error("Could not load "+path+" (HTTP "+r.status+")");
 return r.json();
}
function seasonsForNight(){return cache.index?cache.index.seasons.filter(x=>x.night===st.night).slice().sort((a,b)=>b.l-a.l):[]}
function defaultLeague(){return seasonsForNight()[0]?.l??null}
function season(){return cache.index?.seasons.find(x=>x.l===st.league)}
function selectedDivisionGroups(){
 if(!cache.index||!st.league)return [];
 return cache.index.divisions.filter(x=>x.l===st.league&&x.competitive)
 .sort((a,b)=>a.d.localeCompare(b.d));
}
function teamData(){return cache.teams[st.night]?.team_seasons||[]}
function teamsNow(){
 const search=st.search.trim().toLocaleLowerCase();
 return teamData().filter(t=>t.l===st.league&&!t.special)
  .filter(t=>st.division==="all"||t.d===st.division)
  .filter(t=>!search||t.n.toLocaleLowerCase().includes(search))
  .sort((a,b)=>a.d.localeCompare(b.d)||b.pts-a.pts||b.gdpg-a.gdpg||a.n.localeCompare(b.n));
}
function panel(title,sub,content,attr=""){return '<section class="panel" '+attr+'><div class="panelhead"><div><h2>'+title+'</h2><p>'+sub+'</p></div></div>'+content+'</section>'}
function cardCount(label,value,detail){return '<div class="metric"><small>'+label+'</small><strong>'+esc(value)+'</strong><em>'+detail+'</em></div>'}
function overview(){
 const i=cache.index;
 return '<div class="hist-stats">'+cardCount("Archived league seasons",number(i.counts.league_seasons),"Winter 2011/12 onward")+
 cardCount("Standings-team entries",number(i.counts.standing_team_entries),"Whole-league source coverage")+
 cardCount("Matched game results",number(i.counts.reciprocal_games),"Both team sources agree")+
 cardCount("Published player IDs",number(i.counts.published_player_ids),"Not verified unique people")+'</div>'+
 panel("Choose a league night","Each competition is kept separate; historical ratings cannot be compared across different nights.",
 '<div class="hist-night-grid">'+i.nights.map(n=>'<button type="button" class="hist-night-card" data-hist-night="'+esc(n.night)+'"><span class="hist-night-name">'+esc(n.night)+'</span>'+
 '<span class="hist-night-sub">'+number(n.seasons)+' archived seasons</span><span class="hist-night-metrics">'+number(n.standing_teams)+' teams · '+number(n.games)+' games</span><span class="hist-open">View history ›</span></button>').join("")+'</div>')+
 panel("How the division analysis uses this archive","Historical match results and roster composition can inform placement—not override the commissioner.",
 '<div class="hist-process"><div><strong>Results</strong><span>Verified games, opponents, goal difference and division history</span></div>'+
 '<div><strong>Rosters</strong><span>Aggregated scoring rates and verified published-ID continuity</span></div>'+
 '<div><strong>Review</strong><span>Evidence, confidence and a human decision before any realignment</span></div></div>'+
 '<p class="source">The archive contains '+number(i.counts.held_game_records)+' held game records. Apparent 0–0 placeholders are not treated as results. No individual player records are published in this view.</p>');
}
function filterbar(){
 const arr=seasonsForNight();
 const groups=selectedDivisionGroups();
 return '<div class="hist-filterbar"><div class="hist-filter-row">'+
 '<label class="field"><span>League night</span><select id="hist-night"><option value="all">All nights</option>'+DAYS.map(n=>'<option value="'+n+'" '+(st.night===n?"selected":"")+'>'+n+'</option>').join("")+'</select></label>'+
 (st.night==="all"?"":'<label class="field"><span>Season</span><select id="hist-season">'+arr.map(x=>'<option value="'+x.l+'" '+(x.l===st.league?"selected":"")+'>'+esc(x.cycle+" "+x.period)+'</option>').join("")+'</select></label>')+
 (st.night==="all"?"":'<label class="field"><span>Division</span><select id="hist-division"><option value="all">All competitive divisions</option>'+groups.map(x=>'<option value="'+esc(x.d)+'" '+(st.division===x.d?"selected":"")+'>'+esc(x.d)+'</option>').join("")+'</select></label>')+
 '</div></div>';
}
function seasonHeader(){
 const s=season();if(!s)return "";
 return '<div class="hist-season-note"><div><strong>'+esc(s.label)+'</strong><small>'+number(s.teams)+' competitive standings teams · '+number(s.divisions)+' divisions · '+number(s.games)+' matched results</small></div>'+
 '<a class="btn small" href="'+esc(s.link)+'" target="_blank" rel="noopener noreferrer">Original SVHL archive ↗</a></div>';
}
function divisionSummary(){
 const groups=selectedDivisionGroups();
 const data=groups.filter(g=>st.division==="all"||g.d===st.division);
 if(!data.length)return "";
 const rows=data.map(g=>{
 const note=g.sampled>=3?"Range "+fixed(g.ppg_range)+" points/game":"Insufficient played sample";
 return '<div class="hist-division-row"><div><strong>'+esc(g.d)+'</strong><small>'+g.teams+' teams · '+note+'</small></div>'+
 '<span>'+fixed(g.median_ppg)+' <small>median PPG</small></span></div>';
 });
 return panel("Division balance","Same-night standings only. Ranges describe differences; they are not placement orders.",rows.join("")+
 '<div class="source">PPG = standings points ÷ games played. Teams with fewer than four games are excluded from spread calculations.</div>');
}
function teamRows(){
 const teams=teamsNow();
 const items=teams.slice(0,85);
 let html='<div class="hist-table-wrap"><table class="hist-table"><thead><tr><th>Team</th><th class="num">GP</th><th class="num">PTS</th><th class="num">Goal diff./game</th><th class="num">Roster context</th><th></th></tr></thead><tbody>';
 if(!items.length)html+='<tr><td colspan="6" class="hist-empty">No matching team records. Try another season, division or name.</td></tr>';
 for(const t of items){
 const label=t.prior_player_samples>=3?fixed(t.prior_scoring)+" prior PPG":"Limited history";
 const mark=t.review?"<span class=\"hist-review-flag\">Review</span>":"";
 const selected=st.selected===idOf(t);
 html+='<tr class="'+(selected?"hist-selected":"")+'"><td><button type="button" class="hist-team-trigger" data-hist-team="'+esc(idOf(t))+'">'+esc(t.n)+'</button><small class="hist-team-sub">'+esc(t.d)+'</small></td>'+
 '<td class="num">'+number(t.gp)+'</td><td class="num">'+number(t.pts)+'</td>'+
 '<td class="num">'+neg(t.gdpg)+'</td><td class="num">'+label+'</td>'+
 '<td class="hist-action-cell"><button type="button" class="btn small" data-hist-team="'+esc(idOf(t))+'">Details ›</button>'+mark+'</td></tr>';
 }
 html+='</tbody></table></div>';
 if(teams.length>items.length)html+='<p class="source">Showing '+items.length+' of '+teams.length+' matching records. Narrow the division or search for a team.</p>';
 return html;
}
function tableSection(){
 return panel("Team performance","Choose a team for results, player-scoring context and possible historical links.",
 '<div class="hist-search"><label class="field"><span>Find a team on this night</span><input id="hist-team-search" type="search" maxlength="85" placeholder="Search by team name…" value="'+esc(st.search)+'"></label><span>Season statistics are source snapshots</span></div>'+
 '<div id="hist-team-table">'+teamRows()+'</div>');
}
function selectedDetail(){
 const t=teamData().find(x=>idOf(x)===st.selected);
 if(!t)return panel("Inspect a team","Select a team from the standings table to examine the available evidence.",
 '<div class="hist-empty">Select <strong>Details</strong> in a team row to review its season and roster-context indicators.</div>');
 const src=sourceLink(t.l,t.id);
 const prev=cache.index.continuity.filter(x=>x.to===t.l&&x.b===t.id).sort((a,b)=>b.shared-a.shared).slice(0,4);
 const sameName=teamData().filter(x=>x.l!==t.l&&x.n.toLocaleLowerCase()===t.n.toLocaleLowerCase()&&!x.special)
 .sort((a,b)=>b.l-a.l).slice(0,5);
 const labels=[
 ["Team record",number(t.w)+"–"+number(t.lost)+"–"+number(t.tie)],
 ["Points/game",fixed(t.ppg)],
 ["Goals for / against",number(t.gf)+" / "+number(t.ga)],
 ["Goal difference/game",neg(t.gdpg)],
 ["Matched source games",number(t.source_games)],
 ["Published player IDs",number(t.roster_ids)],
 ["Players with earlier source IDs",number(t.prev_ids)],
 ["Current median PTS/GP",fixed(t.median_scoring)],
 ["Prior median PTS/GP",fixed(t.prior_scoring)],
 ["Prior-rate qualifying players",number(t.prior_player_samples)]
 ];
 let html='<div class="hist-detail-stats">'+labels.map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
 if(typeof t.rating==="number"){
 html+='<div class="hist-research-box"><div><strong>Opponent-adjusted research rating</strong><span>'+fixed(t.rating)+' · '+number(t.rating_games)+' matched games</span></div>'+
 '<p>Research-only, calibrated within this league night. '+(t.review?"Flagged for a commissioner evidence review; not a direction to move this team.":"No placement flag from this prototype; not a final divisional decision.")+'</p></div>';
 }
 html+='<div class="hist-lineage"><strong>Possible previous-season teams</strong>';
 if(prev.length){
  html+=prev.map(x=>'<div class="hist-link-row"><span>'+esc(x.old)+' <small>Previous '+esc(x.night)+' season</small></span><span>'+x.shared+' shared source IDs · '+pct(x.overlap)+' overlap</span></div>').join('');
 }else html+='<p>No qualifying published-ID continuity candidate found for this team in an earlier '+esc(st.night)+' season.</p>';
 html+='</div>';
 if(sameName.length){
 html+='<div class="hist-lineage"><strong>Earlier matching team names</strong><p>Exact name matches are not proof of one continuing franchise.</p>'+
 sameName.map(x=>'<div class="hist-link-row"><span>'+esc(x.n)+'</span><span>'+esc(cache.index.seasons.find(s=>s.l===x.l)?.cycle||"")+' '+esc(cache.index.seasons.find(s=>s.l===x.l)?.period||"")+'</span></div>').join('')+'</div>';
 }
 html+='<a class="btn small" target="_blank" rel="noopener noreferrer" href="'+esc(src)+'">Open original published team page ↗</a>'+
 '<p class="source">Scoring medians are player-season points/game from public source aggregates. Prior-period context uses exact published player IDs and available earlier records; it does not establish actual same-person identity where source IDs changed. Participation and playoff eligibility require signed game sheets.</p>';
 return panel(esc(t.n),"Published "+esc(st.night)+" team-season evidence · "+esc(season()?.cycle+" "+season()?.period),html);
}
function selectedView(){
 const s=season(),td=teamData();
 if(!s)return panel("No season selected","Select a league night to continue.","");
 const current=td.filter(t=>t.l===st.league&&!t.special);
 if(!current.length)return panel("Season source data unavailable","The selected night archive has not finished loading.",
 '<div class="hist-empty">No team rows were found. Use another season or retry.</div>');
 return seasonHeader()+'<div class="hist-insight-layout"><div class="stack">'+
 divisionSummary()+tableSection()+'</div><div class="stack"><div id="hist-team-detail">'+selectedDetail()+'</div>'+
 panel("How to interpret placement evidence","A commissioner can review the indicators before any real-world decision.",
 '<div class="hist-process vertical"><div><strong>Competitive results</strong><span>Opponent-adjusted results and goal margin inside this league night</span></div>'+
 '<div><strong>Roster composition</strong><span>Prior source scoring and player continuity, with sample-size limits</span></div>'+
 '<div><strong>Final decision</strong><span>Human review of game sheets, scheduling and eligibility; no automatic moves</span></div></div>')+'</div></div>';
}
function render(){
 const target=$("#league-history-mount");if(!target)return;
 if(st.error){target.innerHTML='<div class="callout warn">'+esc(st.error)+' <button type="button" class="btn small" id="hist-retry">Retry</button></div>';return}
 if(!cache.index){target.innerHTML='<div class="panel loader">Loading the source-qualified league archive…</div>';return}
 if(st.night!=="all"&&!cache.teams[st.night]){target.innerHTML=filterbar()+'<div class="panel loader">Loading '+esc(st.night)+' team history…</div>';return}
 target.innerHTML=filterbar()+(st.night==="all"?overview():selectedView())+
 '<p class="disclaimer">Independent BruTTech prototype using source-qualified public SVHL archives. These are published snapshots, not the league’s authoritative approval system. Individual player identities, eligibility decisions and official division transfers remain outside this demonstration.</p>';
}
async function loadIndex(){
 if(cache.index)return;
 if(st.busy)return;
 st.busy=true;
 try{
  const o=await getJSON(IN);
  if(o.schema!=="bruttech-leagueos-public-history/v1"||o.seasons?.length!==118||o.divisions?.length!==542)throw Error("Unexpected archive data schema");
  cache.index=o;st.error="";
 }catch(e){st.error="Historical archive is temporarily unavailable: "+e.message}
 finally{st.busy=false;render()}
}
async function loadNight(n){
 if(!nl(n)||cache.teams[n])return;
 if(st.busy)return;
 st.busy=true;render();
 try{
  const file="leagueos-public-archive-teams-"+n.toLowerCase()+"-v1.json";
  const o=await getJSON(file);
  if(o.schema!=="bruttech-leagueos-public-team-aggregates/v1"||o.night!==n||!Array.isArray(o.team_seasons))throw Error("Unexpected team archive schema");
  cache.teams[n]=o;st.error="";
 }catch(e){st.error="Cannot load this league night: "+e.message}
 finally{st.busy=false;render()}
}
async function chooseNight(n){
 st.night=nl(n)||"all";st.search="";st.selected=null;st.division="all";st.league=st.night==="all"?null:defaultLeague();
 render();if(st.night!=="all")await loadNight(st.night);
}
function chooseSeason(lid){const num=Number(lid);if(!seasonsForNight().some(x=>x.l===num))return;st.league=num;st.division="all";st.search="";st.selected=null;render()}
function chooseDivision(div){st.division=div;st.selected=null;render()}
function selectTeam(key){st.selected=key;const p=$("#hist-team-detail");if(p){p.innerHTML=selectedDetail();p.scrollIntoView({behavior:"smooth",block:"nearest"})}const container=$("#hist-team-table");if(container)container.innerHTML=teamRows()}
function updateSearch(q){st.search=q;st.selected=null;const el=$("#hist-team-table");if(el)el.innerHTML=teamRows();const detail=$("#hist-team-detail");if(detail)detail.innerHTML=selectedDetail()}
document.addEventListener("click",e=>{
 const el=e.target.closest("button");if(!el)return;
 if(el.hasAttribute("data-hist-night")){chooseNight(el.getAttribute("data-hist-night"));return}
 if(el.hasAttribute("data-hist-team")){selectTeam(el.getAttribute("data-hist-team"));return}
 if(el.id==="hist-retry"){st.error="";cache.index=null;loadIndex();return}
});
document.addEventListener("change",e=>{
 const el=e.target;
 if(el.id==="hist-night"){chooseNight(el.value);return}
 if(el.id==="hist-season"){chooseSeason(el.value);return}
 if(el.id==="hist-division"){chooseDivision(el.value);return}
});
document.addEventListener("input",e=>{
 if(e.target.id==="hist-team-search")updateSearch(e.target.value)
});
window.LeagueOSHistory={
 mount(){
  render();
  if(!cache.index){loadIndex();return}
  if(st.night!=="all"&&!cache.teams[st.night])loadNight(st.night);
 },
 openNight(n){if(nl(n))chooseNight(n)}
};
})();
