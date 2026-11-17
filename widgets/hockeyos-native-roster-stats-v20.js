/* BruTTech HockeyOS V20 — original native views for public source-verified facts.
   All statistics are HTO published ACTUALS (dated snapshot), no HTO code reused.
   No HTO IDs inferred from roster names or jersey numbers. */
(function(){"use strict";
const ASSET="./hockeyos-hto-current-v20.json";
const SOURCE="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=";
const SCHEMA="bruttech-hockeyos-hto-public-current/v20";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={rosterSearch:"",rosterPosition:"all",rosterView:"list",
 statsSearch:"",statsRole:"skaters",statsSort:"points"};
let dataPromise=null,source=null,validationError="";
function fail(message){throw Error("V20 source hold: "+message)}
function validate(data){
 if(!data||data.schema!==SCHEMA||data.team!=="Brave H.C."||data.seasonKey!=="Winter_2026/2027"||
   data.scope!=="PUBLIC_HTO_CURRENT_SEASON"||data.sourceReadOnly!==true||
   data.officialRecordEdited!==false||data.publishedAs!=="DATED_PUBLIC_SNAPSHOT_NOT_LIVE")
  fail("Unexpected authority or schema");
 if(!Array.isArray(data.roster)||!Array.isArray(data.skaters)||!Array.isArray(data.goalies)||
    !data.counts||!data.teamTotals?.skaters||!data.teamTotals?.goalies)fail("Missing required records");
 if(data.counts.roster!==data.roster.length||data.counts.skaters!==data.skaters.length||
    data.counts.goalies!==data.goalies.length)fail("Row count inconsistency");
 if(data.counts.sourceSkaterRowsIncludingTeamTotal!==data.skaters.length+1||
    data.counts.sourceGoalieRowsIncludingTeamTotal!==data.goalies.length+1)fail("Aggregate counts inconsistent");
 if(!Number.isFinite(Date.parse(data.sourceCapturedAt)))fail("Capture timestamp unavailable");
 if(data.sources?.roster!==SOURCE+"roster"||data.sources?.stats!==SOURCE+"stats")
  fail("HTO source URLs changed unexpectedly");
 if(data.teamTotals.skaters.name!=="Team Stats"||data.teamTotals.goalies.name!=="Team Stats")
  fail("Team aggregates not verified");
 const verifyRow=(row,withProfile)=>{
  if(!row||typeof row.name!=="string"||!row.name.trim()||row.name==="Team Stats"||
     (row.jersey!==null&&(!Number.isInteger(row.jersey)||row.jersey<0||row.jersey>999)))
    fail("Invalid player row");
  if(row.htoPlayerId===null&&row.profileUrl!==null)fail("Unverified profile link");
  if(row.htoPlayerId!==null){
   if(!/^\d{4,10}$/.test(row.htoPlayerId)||
      row.profileUrl!==SOURCE+"profile&playerID="+row.htoPlayerId)
    fail("Unverified HTO player identity link");
  }
  if(withProfile&&(!Number.isInteger(row.gp)||row.gp<0))fail("Invalid appearance value");
 };
 const wholeFields=(row,fields)=>{
  for(const k of fields)if(!Number.isInteger(row[k])||row[k]<0)
    fail("Invalid source integer: "+k);
 };
 data.roster.forEach(row=>verifyRow(row,false));
 data.skaters.forEach(row=>{
  verifyRow(row,true);
  wholeFields(row,["gp","goals","assists","points","ppg","gtg","gwg","pim","hatTricks","playerOfGame"]);
  if(!Number.isInteger(row.plusMinus)||!Number.isFinite(row.pointsPerGame)||row.pointsPerGame<0||
     row.goals+row.assists!==row.points||row.ppg>row.goals||
     row.gtg>row.goals||row.gwg>row.goals)fail("Invalid official skater totals");
 });
 data.goalies.forEach(row=>{
  verifyRow(row,true);
  wholeFields(row,["gp","wins","losses","goalsAgainst","playerOfGame"]);
  if(!Number.isInteger(row.plusMinus)||!Number.isFinite(row.gaa)||row.gaa<0||
     !Number.isFinite(row.winPercentage)||row.winPercentage<0||row.winPercentage>1||
     row.wins+row.losses>row.gp)fail("Invalid official goaltender totals");
 });
 const unique=rows=>{
  const ids=rows.map(r=>r.htoPlayerId).filter(Boolean);
  if(ids.length!==new Set(ids).size)fail("Duplicate verified HTO ID");
 };
 unique(data.roster);unique(data.skaters);unique(data.goalies);
 const sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0);
 if(sum(data.skaters,"goals")!==data.teamTotals.skaters.goals||
    sum(data.skaters,"assists")!==data.teamTotals.skaters.assists||
    sum(data.skaters,"points")!==data.teamTotals.skaters.points||
    sum(data.goalies,"goalsAgainst")!==data.teamTotals.goalies.goalsAgainst)
    fail("Individual and HTO team aggregate totals disagree");
 if(data.counts.skatersWithoutPlayerId!==data.skaters.filter(r=>!r.htoPlayerId).length||
    data.counts.goaliesWithoutPlayerId!==data.goalies.filter(r=>!r.htoPlayerId).length||
    data.counts.rosterWithoutPlayerId!==data.roster.filter(r=>!r.htoPlayerId).length)
    fail("HTO ID evidence coverage changed");
 return data;
}
function load(){
 if(!dataPromise)dataPromise=fetch(ASSET,{cache:"no-store"})
   .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
   .then(x=>{source=validate(x);validationError="";return source})
   .catch(e=>{dataPromise=null;source=null;validationError=String(e);throw e});
 return dataPromise;
}
function dateLabel(iso){
 return new Date(iso).toLocaleDateString("en-CA",{timeZone:"America/Toronto",
  month:"short",day:"numeric",year:"numeric"});
}
function link(label,url){
 return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' <span aria-hidden="true">↗</span></a>';
}
function identityLink(row){
 return row.htoPlayerId&&row.profileUrl?
   link(row.name,row.profileUrl):'<strong>'+esc(row.name)+'</strong>';
}
function signed(v){return v>0?"+"+v:String(v)}
function whole(v){return Number.isInteger(v)?String(v):"—"}
function rate(v,places){return Number.isFinite(v)?v.toFixed(places):"—"}
function surnameInitials(name){
 const parts=String(name).split(",").map(x=>x.trim());
 const words=(parts[1]||parts[0]||"").split(/\s+/).filter(Boolean);
 return ((words[0]?.[0]||"")+(parts[0]?.[0]||"")).toUpperCase().slice(0,2)||"HC";
}
function rosterIsGoalie(row){
 return String(row.position||"").split(/[\/·\s-]+/).includes("G");
}
function filteredRoster(d,search="",position="all",sort="number"){
 const q=String(search).trim().toLowerCase();
 const rows=d.roster.filter(p=>(position==="all"||(position==="goalies"?rosterIsGoalie(p):!rosterIsGoalie(p)))&&
  (!q||[p.name,String(p.jersey??""),p.position||""].some(x=>x.toLowerCase().includes(q))));
 return rows.slice().sort((a,b)=>(sort==="name"?a.name.localeCompare(b.name):
  (a.jersey??999)-(b.jersey??999)||a.name.localeCompare(b.name)));
}
function filteredStats(d,role="skaters",search="",sort="points"){
 const q=String(search).trim().toLowerCase();
 const rows=role==="goalies"?d.goalies:d.skaters;
 const filtered=rows.filter(p=>!q||[p.name,String(p.jersey??""),p.position||""].some(x=>x.toLowerCase().includes(q)));
 const allowed=role==="goalies"?
  ["gp","wins","losses","goalsAgainst","gaa","playerOfGame","name"]:
  ["points","goals","assists","gp","ppg","pim","plusMinus","playerOfGame","name"];
 const key=allowed.includes(sort)?sort:role==="goalies"?"gp":"points";
 return filtered.slice().sort((a,b)=>key==="name"?a.name.localeCompare(b.name):
  key==="gaa"?(a[key]-b[key]||b.gp-a.gp||a.name.localeCompare(b.name)):
  (b[key]-a[key]||b.gp-a.gp||a.name.localeCompare(b.name)));
}
function heading(route,d){
 const title=route==="team-roster"?"Team roster":"Team statistics";
 const detail=route==="team-roster"?
 "Current listed players, positions and jersey numbers from the public HTO roster.":
 "Official HTO skater and goalie actuals, with the team aggregate kept separate from individual players.";
 return '<div class="v20-heading"><div><small>HOCKEYOS / BRAVE H.C. / '+esc(d.season)+'</small>'+
 '<h2>'+title+'</h2><p>'+detail+'</p></div>'+
 '<div class="v20-source-card"><span>PUBLIC SOURCE SNAPSHOT</span><strong>'+esc(dateLabel(d.sourceCapturedAt))+
 '</strong><small>Not live · No HTO data edited</small></div></div>';
}
function sourceBar(d,type){
 return '<div class="v20-source-bar"><span>Source: HomeTeamsONLINE · '+esc(d.season)+
 ' · Captured '+esc(dateLabel(d.sourceCapturedAt))+'</span>'+
 link("Open official "+(type==="roster"?"roster":"statistics"),d.sources[type])+'</div>';
}
function filterBar(){
 return '<div class="v20-controls"><label class="v20-search-label">Search current roster'+
 '<input id="v20-roster-search" type="search" autocomplete="off" placeholder="Player name, # or position" value="'+esc(state.rosterSearch)+'"></label>'+
 '<div class="v20-positions" role="group" aria-label="Published roster position">'+
 [["all","All players"],["skaters","Skaters"],["goalies","Listed G"]].map(([id,t])=>
 '<button type="button" data-v20-pos="'+id+'" aria-pressed="'+(state.rosterPosition===id)+'"'+
 (state.rosterPosition===id?' class="active"':'')+'>'+t+'</button>').join("")+'</div>'+
 '<div class="v20-view-toggle" role="group" aria-label="Roster display">'+
 [["list","List"],["cards","Cards"]].map(([id,t])=>'<button type="button" data-v20-view="'+id+
 '" aria-pressed="'+(state.rosterView===id)+'"'+(state.rosterView===id?' class="active"':'')+'>'+t+'</button>').join("")+
 '</div></div>';
}
function rosterView(d){
 return '<section class="v20-shell">'+heading("team-roster",d)+
 '<div class="v20-roster-top"><div><b>'+d.roster.length+'</b><span>Listed players</span></div>'+
 '<p>Roster entries without a directly published player ID remain unlinked. Jersey numbers of 0 and unassigned numbers are shown exactly as published.</p></div>'+
 filterBar()+'<div id="v20-list-results" class="v20-list-results" aria-live="polite"></div>'+
 '<div class="v20-bottom-note">Roster and statistics are separate official HTO source lists. A roster listing does not establish games played, eligibility or attendance. Direct official player-profile links appear only when supplied by the original source.</div>'+
 sourceBar(d,"roster")+'</section>';
}
function rosterRows(d){
 const rows=filteredRoster(d,state.rosterSearch,state.rosterPosition);
 const content=rows.length?rows.map(p=>{
  const name=esc(p.name),role=esc(p.position||"Not specified"),
  number=p.jersey===null?"—":whole(p.jersey);
  const card='<article class="v20-roster-card"><div class="v20-avatar" aria-hidden="true">'+
  esc(surnameInitials(p.name))+'</div><div class="v20-player-detail"><strong>'+name+
  '</strong><small>'+role+'</small></div><b>#'+number+'</b></article>';
  const tr='<tr><td class="v20-num">'+number+'</td><td><strong>'+name+
  '</strong></td><td>'+role+'</td></tr>';
  return{card,tr};
 }):[];
 return '<div class="v20-resultcount">'+rows.length+' of '+d.roster.length+
 ' roster entries'+(state.rosterPosition!=="all"?' · filtered by listed position':'')+'</div>'+
 (rows.length?(state.rosterView==="cards"?
  '<div class="v20-card-grid">'+content.map(x=>x.card).join("")+'</div>':
  '<div class="v20-table-scroll"><table class="v20-roster-table"><thead><tr><th>Jersey</th><th>Player</th><th>Published position</th></tr></thead><tbody>'+
  content.map(x=>x.tr).join("")+'</tbody></table></div>'):
 '<p class="v20-empty">No matching roster entries. Adjust your search or position filter.</p>');
}
function statTabs(){
 return '<div class="v20-role-tabs" role="tablist" aria-label="Player statistics role">'+
 [["skaters","Skaters"],["goalies","Goaltenders"]].map(([id,t])=>
 '<button type="button" role="tab" data-v20-role="'+id+'" aria-selected="'+(state.statsRole===id)+
 '"'+(state.statsRole===id?' class="active"':'')+'>'+t+'</button>').join("")+'</div>';
}
function statOptions(){
 const options=state.statsRole==="skaters"?
 [["points","Points"],["goals","Goals"],["assists","Assists"],["gp","Games played"],["ppg","Power-play goals"],["pim","Penalty minutes"],["plusMinus","Plus/minus"],["playerOfGame","Player of game"],["name","Name"]]:
 [["gp","Games played"],["wins","Wins"],["gaa","Lowest GAA"],["losses","Losses"],["goalsAgainst","Goals against"],["playerOfGame","Player of game"],["name","Name"]];
 return options.map(([v,l])=>'<option value="'+v+'"'+(state.statsSort===v?' selected':'')+'>'+l+'</option>').join("");
}
function statsSummary(d){
 const totals=state.statsRole==="goalies"?d.teamTotals.goalies:d.teamTotals.skaters;
 const metrics=state.statsRole==="goalies"?
  [["Team GP",whole(totals.gp)],["Wins",whole(totals.wins)],["Goals against",whole(totals.goalsAgainst)],["GAA",rate(totals.gaa,2)]]:
  [["Team GP",whole(totals.gp)],["Goals",whole(totals.goals)],["Assists",whole(totals.assists)],["Power-play goals",whole(totals.ppg)]];
 return '<div class="v20-aggregate"><strong>Official Team Stats totals</strong><div class="v20-metrics">'+metrics.map(([l,v])=>
 '<div><span>'+esc(l)+'</span><b>'+esc(v)+'</b></div>').join("")+'</div>'+
 '<small>Team Stats is one aggregate row in HTO, not an additional player. Totals are never added to individual production.</small></div>';
}
function statsView(d){
 return '<section class="v20-shell">'+heading("team-stats",d)+statTabs()+
 statsSummary(d)+'<div class="v20-stats-info"><strong>Published actuals · '+esc(d.season)+'</strong>'+
 '<p>PPG means <b>power-play goals</b>. Pts/GP and GAA reproduce the displayed HTO source values. Analytical adjustments, projections and awards remain separate.</p></div>'+
 '<div class="v20-controls"><label class="v20-search-label">Search players'+
 '<input type="search" id="v20-stats-search" autocomplete="off" placeholder="Name, jersey or position" value="'+esc(state.statsSearch)+'"></label>'+
 '<label class="v20-sort-label">Sort by<select id="v20-stats-sort">'+statOptions()+'</select></label></div>'+
 '<div id="v20-list-results" class="v20-list-results" aria-live="polite"></div>'+
 '<div class="v20-bottom-note">Source profile links use verified HTO player IDs. The current season snapshot is not live; official changes appear here only after a new reviewed source refresh. The same individual may legitimately appear as both skater and goaltender.</div>'+
 sourceBar(d,"stats")+'</section>';
}
function playerCard(p,role){
 const isGoalie=role==="goalies";
 const cells=isGoalie?[["GP",p.gp],["W",p.wins],["L",p.losses],["GA",p.goalsAgainst],["GAA",rate(p.gaa,2)],["POTG",p.playerOfGame]]:
 [["GP",p.gp],["G",p.goals],["A",p.assists],["PTS",p.points],["PPG",p.ppg],["+/−",signed(p.plusMinus)]];
 return '<article class="v20-stat-card"><div class="v20-stat-head"><div><span class="v20-jersey">#'+(p.jersey===null?"—":p.jersey)+'</span>'+
 '<div class="v20-name">'+identityLink(p)+'</div></div><span class="v20-position">'+esc(p.position|| (isGoalie?"Goalie":""))+'</span></div>'+
 '<div class="v20-stat-grid">'+cells.map(([l,v])=>'<div><small>'+l+'</small><b>'+esc(v)+'</b></div>').join("")+'</div></article>';
}
function statRows(d){
 const role=state.statsRole,rows=filteredStats(d,role,state.statsSearch,state.statsSort);
 const headings=role==="goalies"?["#","Player","GP","W","L","GA","GAA","POTG","+/-","Win %"]:
 ["#","Player","Pos","GP","G","A","PTS","Pts/GP","PPG","GTG","GWG","PIM","+/-","HAT","POTG"];
 const row=(p)=>{
  const vals=role==="goalies"?
   [p.jersey??"—",identityLink(p),p.gp,p.wins,p.losses,p.goalsAgainst,rate(p.gaa,2),
    p.playerOfGame,signed(p.plusMinus),rate(p.winPercentage,3)]:
   [p.jersey??"—",identityLink(p),p.position||"—",p.gp,p.goals,p.assists,p.points,
    rate(p.pointsPerGame,2),p.ppg,p.gtg,p.gwg,p.pim,signed(p.plusMinus),p.hatTricks,p.playerOfGame];
  return '<tr>'+vals.map((v,i)=>'<td'+(i===1?' class="v20-playername"':'')+'>'+(i===1?v:esc(v))+'</td>').join("")+'</tr>';
 };
 return '<div class="v20-resultcount">'+rows.length+" of "+
 (role==="goalies"?d.goalies.length:d.skaters.length)+
 ' published '+(role==="goalies"?"goaltender":"skater")+' player records</div>'+
 (rows.length?'<div class="v20-table-scroll v20-stats-scroll"><table class="v20-stats-table"><thead><tr>'+
 headings.map(h=>'<th'+(h==="PPG"?' title="Official power-play goals, not points per game"':'')+'>'+esc(h)+'</th>').join("")+
 '</tr></thead><tbody>'+rows.map(row).join("")+'</tbody></table></div>'+
 '<div class="v20-stat-cards">'+rows.map(p=>playerCard(p,role)).join("")+'</div>':
 '<p class="v20-empty">No matching published player statistics. Update the search or role.</p>');
}
function fillRows(d,route){
 const node=$("#v20-list-results");if(!node)return;
 node.innerHTML=route==="team-roster"?rosterRows(d):statRows(d);
}
function page(route){
 const isRoster=route==="team-roster";
 return '<section class="v20-root" id="hockeyos-native-v20-mount" data-route="'+route+'" aria-live="polite">'+
 '<div class="v20-loading"><span>HOCKEYOS / '+(isRoster?"ROSTER":"STATISTICS")+'</span>'+
 '<h2>'+ (isRoster?"Team roster":"Team statistics")+'</h2>'+
 '<p>Validating the public HTO source snapshot and individual player records…</p></div></section>';
}
function mount(route){
 if(route==="team-home"){
  load().then(d=>showLeaders(d)).catch(()=>showLeaders(null));return;
 }
 if(!["team-roster","team-stats"].includes(route))return;
 const root=$("#hockeyos-native-v20-mount");
 if(!root)return;
 load().then(d=>{
  if(!root.isConnected||root.dataset.route!==route)return;
  root.innerHTML=route==="team-roster"?rosterView(d):statsView(d);
  fillRows(d,route);
 }).catch(()=>{
  if(!root.isConnected)return;
  root.innerHTML='<div class="v20-source-fail"><strong>Official public source snapshot unavailable.</strong>'+
  '<p>HockeyOS is holding these statistics instead of showing unverified rows.</p>'+
  link("Open official roster",SOURCE+"roster")+' · '+link("Open official stats",SOURCE+"stats")+'</div>';
 });
}
function showLeaders(d){
 const root=$("#hockeyos-v20-leaders");if(!root)return;
 if(!d){root.innerHTML='<p>Player source data not verified. Open official HTO statistics.</p>';return}
 const leaders=filteredStats(d,"skaters","","points").slice(0,4);
 const items=leaders.map(p=>'<div class="v20-leader"><span class="v20-leader-name">'+identityLink(p)+
 '</span><b>'+esc(p.points)+'</b><small>PTS</small></div>').join("");
 root.innerHTML='<div class="v20-leader-list">'+items+'</div>'+
 '<small>Official HTO actuals · '+esc(dateLabel(d.sourceCapturedAt))+'</small>';
}
document.addEventListener("input",e=>{
 const el=e.target;if(!$("#hockeyos-native-v20-mount"))return;
 if(el.id==="v20-roster-search"){
  state.rosterSearch=el.value;if(source)fillRows(source,"team-roster");
 } else if(el.id==="v20-stats-search"){
  state.statsSearch=el.value;if(source)fillRows(source,"team-stats");
 }
});
document.addEventListener("change",e=>{
 if(e.target.id==="v20-stats-sort"){
  state.statsSort=e.target.value;if(source)fillRows(source,"team-stats");
 }
});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||!$("#hockeyos-native-v20-mount"))return;
 if(b.dataset.v20Pos){state.rosterPosition=b.dataset.v20Pos;mount("team-roster");return}
 if(b.dataset.v20View){state.rosterView=b.dataset.v20View;mount("team-roster");return}
 if(b.dataset.v20Role){
  state.statsRole=b.dataset.v20Role;state.statsSort=state.statsRole==="goalies"?"gp":"points";
  mount("team-stats");
 }
});
window.HockeyOSNativeV20={page,mount,_test:{validate,filteredRoster,filteredStats,rosterIsGoalie,
 getState:()=>({...state}),dateLabel}};
})();
