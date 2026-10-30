/* Brave H.C. Game Centre — HTO public embed.
 * Read-only source composition. Existing countdown, goalie schedule, standings and
 * HockeyOS opponent intelligence remain authoritative standalone destinations.
 * Manager drafts, private availability, unverified predictions never appear.
 */
(function(){
'use strict';
const root=document.getElementById('game-centre');if(!root)return;
const $=id=>document.getElementById(id);
let data={};
const node=(name,cls,value)=>{const e=document.createElement(name);if(cls)e.className=cls;if(value!=null)e.textContent=String(value);return e;};
const fmt=(date,opts)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',...opts}).format(new Date(date));
const when=(date)=>fmt(date+'T12:00:00Z',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'});
function age(iso){const t=Date.parse(iso||'');return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):Infinity;}
function text(id,value){$(id).textContent=value;}
function select(group,tab){
 const list=[...root.querySelectorAll('.tabs[data-group="'+group+'"] button')];
 if(!list.some(b=>b.dataset.tab===tab))return;
 list.forEach(b=>{const selected=b.dataset.tab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
 root.querySelectorAll('.tab-panel[data-group="'+group+'"]').forEach(p=>{p.hidden=p.dataset.name!==tab;});
}
for(const tablist of root.querySelectorAll('.tabs')){
 const group=tablist.dataset.group,buttons=[...tablist.querySelectorAll('button')];
 buttons.forEach((b,i)=>{
  b.addEventListener('click',()=>select(group,b.dataset.tab));
  b.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?buttons.length-1:1))%buttons.length;
   buttons[n].focus();select(group,buttons[n].dataset.tab);
  });
 });
}
async function load(name){const res=await fetch('./'+name,{cache:'no-store'});if(!res.ok)throw Error(name+': HTTP '+res.status);return res.json();}
function verifySchedule(x){if(x?.schema!=='brave-hc-svhl-schedule/v1'||!Array.isArray(x.games)||x.games.some(g=>!g.date||!g.time||!g.assignmentKey||!g.opponent))throw Error('SVHL schedule schema');return x;}
function verifyAssignments(x){if(x?.schema!=='brave-hc-goalie-assignments/v1'||!x.assignments||typeof x.assignments!=='object')throw Error('Published goalie assignments');return x;}
function verifyStandings(x){if(x?.schema!=='brave-hc-svhl-standings/v1'||x.division!=='Cristillo'||!Array.isArray(x.teams)||!x.teams.length||x.teams.some(t=>!Number.isInteger(t.gp)||!Number.isInteger(t.pts)||!t.name))throw Error('SVHL standings schema');return x;}
function verifyUpcoming(x){if(x?.schema!=='brave-hc-upcoming-countdown/v1'||x.team!=='Brave H.C.'||!Array.isArray(x.games)||x.rolloverPolicy?.offsetMinutesAfterPuckDrop!==60)throw Error('HTO next-game source schema');return x;}
function verifyIntelligence(x){if(x?.schema!=='brave-hc-opponent-intelligence/v1'||x.publishable!==true||x.status!=='PUBLIC_VERIFIED_SOURCE_IDENTITY'||!Array.isArray(x.teams))throw Error('Public opponent history source');return x;}
function nextHTO(games){return games.find(g=>Date.now()<Date.parse(g.rolloverAtUTC));}
function confirmStatus(game,assign){
 const goalie=assign.assignments[game.assignmentKey]||'TBD';
 const reconfirm=game.requiresGoalieReconfirmation&&assign.scheduleConfirmations?.[game.assignmentKey]!==game.fixtureSignature;
 const matched=game.htoSyncStatus==='MATCH'&&!reconfirm;
 return {goalie:matched?goalie:'TBD',note:matched?'':'HTO / SVHL review pending'};
}
function drawGoalies(schedule,assign){
 const upcoming=schedule.games.filter(g=>new Date(g.date+'T23:59:00-05:00').getTime()>=Date.now()).slice(0,3);
 const body=$('goalie-rows');body.replaceChildren();
 if(!upcoming.length){const row=node('tr');const cell=node('td',null,'Upcoming games pending official league confirmation.');cell.colSpan=3;row.append(cell);body.append(row);}
 for(const game of upcoming){
  const tr=node('tr'),first=node('td'),date=node('span','date',when(game.date)),opp=node('span','opp',game.opponent);
  const rink=node('span','tiny',(game.rink||'Rink pending')+' · '+(game.side==='home'?'Home':'Away'));
  first.append(date,opp,rink);
  const time=node('td',null,game.time||'TBD');
  const {goalie,note}=confirmStatus(game,assign);
  const third=node('td',goalie==='TBD'?'pending':null,goalie);
  if(note)third.append(node('span','tiny',note));
  tr.append(first,time,third);body.append(tr);
 }
 const checked=schedule.checkedAt?fmt(schedule.checkedAt,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'unavailable';
 const hours=age(schedule.checkedAt);
 text('goalie-status',(!Number.isFinite(hours)||hours>36?'Verification overdue — confirm with SVHL. ':'')+'League fixtures checked '+checked+' ET · Unconfirmed goalies shown as TBD.');
}
function drawStandings(s){
 // Homepage snapshot: leaders plus Brave H.C. Full authoritative division remains one click away.
 const top=s.teams.slice(0,3),brave=s.teams.find(t=>t.name==='Braves HC'||t.name==='Brave H.C.');
 const visible=brave&&!top.includes(brave)?[...top,brave]:top;
 const body=$('standings-rows');body.replaceChildren();
 for(const team of visible){
  const tr=node('tr',/braves? h\.?c\.?/i.test(team.name)?'brave':null);
  for(const value of [team.name,team.gp,team.w+'-'+team.l+'-'+team.t,team.pts])tr.append(node('td',null,value));
  body.append(tr);
 }
 const stamp=s.capturedAt?fmt(s.capturedAt,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'unavailable';
 text('standings-status',(age(s.capturedAt)>36?'League verification overdue · ':'')+'Top 3 and Braves shown · '+s.teams.length+' teams total · SVHL '+stamp+' ET.');
}
function drawOpponent(state){
 const out=$('opponent-card');out.replaceChildren();
 const game=nextHTO(state.upcoming.games);
 const link=$('opponent-details-link');link.href='./league-intelligence.html';
 if(!game){
  out.append(node('p',null,'No upcoming HTO fixture currently verified. Consult the official HTO schedule.'));return;
 }
 const current=state.standings.teams.find(t=>t.name.toLowerCase()===game.opponent.toLowerCase());
 const htoDate=game.gameDate,leagueGame=state.schedule.games.find(g=>g.htoGameId===String(game.id));
 const concordant=leagueGame?.date===htoDate&&leagueGame?.opponent?.toLowerCase()===game.opponent.toLowerCase()&&leagueGame.htoSyncStatus==='MATCH';
 if(!concordant){out.append(node('p',null,'HTO and SVHL fixture identity require review. Use the official schedules before game-day preparation.'));return;}
 link.href='./league-intelligence.html?team='+encodeURIComponent(game.opponent);
 out.append(node('div','stamp','NEXT VERIFIED HTO FIXTURE'));
 out.append(node('h3',null,'Brave H.C. vs '+game.opponent));
 out.append(node('p',null,when(htoDate)+' · '+fmt(game.puckDropUTC,{hour:'numeric',minute:'2-digit'})+' ET · '+game.rink));
 if(current){
  const grid=node('div','opponent-grid');
  for(const [value,label] of [[current.gp,'League GP'],[current.w+'-'+current.l+'-'+current.t,'W-L-T'],[current.pts,'League pts']]){
   const cell=node('div');cell.append(node('strong',null,value),node('span',null,label));grid.append(cell);
  }
  out.append(grid);
  out.append(node('p',null,'Current Cristillo Division figures are from the official published SVHL standings, not a predicted result.'));
 } else out.append(node('p',null,'No verified current standings row matches this exact scheduled opponent name.'));
 const history=state.history.teams.find(t=>t.name.toLowerCase()===game.opponent.toLowerCase());
 if(history&&history.verification==='VERIFIED_EXACT_NAME'&&history.regularSeason&&Number.isInteger(history.regularSeason.gp)){
  const h=node('div','history');
  h.append(node('div','stamp','HISTORICAL BRAVE H.C. MATCHUPS · EXACT NAME ONLY'));
  const r=history.regularSeason;
  h.append(node('p',null,r.gp+' verified regular-season meeting(s): '+r.w+' W · '+r.l+' L · '+r.t+' T. Historical evidence is separate from the current league standings; franchise continuity is not assumed.'));
  out.append(h);
 }else{
  const h=node('div','history');
  h.append(node('p',null,'Historical Brave H.C. head-to-head evidence is not confirmed under this exact opponent identity. No past record is inferred.'));
  out.append(h);
 }
}
function drawLineupStatus(x){
 // Never expose player names or approval pipeline contents from this source.
 const supported=x&&x.schema==='hockeyos-game-night-lineup-public/v1';
 text('lineup-notice',supported&&x.status==='AWAITING_MANAGER_APPROVAL'?
 'Public lineup awaiting manager approval. Named attendance votes, unapproved availability and manager drafts remain private.':
 'No lineup has been admitted to the public publication contract. Check the official roster for listed team members.');
}
let refreshing=false;
async function refresh(){
 if(refreshing)return;
 refreshing=true;
 // Shared requests, independent publication paths: one slow optional feed must not block core game details.
 const schedule=load('svhl-upcoming.json').then(verifySchedule);
 const assignment=load('goalie-assignments.json').then(verifyAssignments);
 const standings=load('standings.json').then(verifyStandings);
 const upcoming=load('countdown.json').then(verifyUpcoming);
 const history=load('opponent-intelligence.json').then(verifyIntelligence);
 const lineup=load('game-night-lineup-public-v27-preview.json');
 const jobs=[
  Promise.all([schedule,assignment]).then(([s,a])=>{data.schedule=s;data.assign=a;drawGoalies(s,a)}).catch(()=>{
   if(!data.schedule){text('goalie-status','Published goalie data unavailable. Check the official SVHL schedule.');$('goalie-rows').replaceChildren();}
  }),
  standings.then(s=>{data.standings=s;drawStandings(s)}).catch(()=>{
   if(!data.standings){text('standings-status','Verified standings temporarily unavailable. Use the official league table.');$('standings-rows').replaceChildren();}
  }),
  Promise.all([schedule,standings,upcoming,history]).then(([s,t,u,h])=>{data.upcoming=u;data.history=h;drawOpponent({schedule:s,standings:t,upcoming:u,history:h})}).catch(()=>{
   if(!data.upcoming)$('opponent-card').replaceChildren(node('p',null,'Opponent data temporarily unavailable. Verify game identity in the official HTO and SVHL schedules.'));
  }),
  lineup.then(drawLineupStatus).catch(()=>{text('lineup-notice','Public game-night lineup not available. Private manager drafts and attendance remain withheld.')})
 ];
 await Promise.allSettled(jobs);
 refreshing=false;
}
window.BraveGameCentreTest=Object.freeze({verifySchedule,verifyStandings,verifyUpcoming,confirmStatus,nextHTO});
refresh();
setInterval(refresh,15*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
