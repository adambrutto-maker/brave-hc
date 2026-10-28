/* HockeyOS Player Bio premium layer — actual historical bars, adjustable Pts/GP,
   one-source native projection and separately gated experimental goalie model.
   Does not alter HTO Stats, official records, Awards, or private coaching content.
*/
(async function(){
'use strict';
const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const fmt=x=>num(x)?x.toLocaleString('en-CA',{maximumFractionDigits:2}):'—';
const date=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?new Date(n).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'America/Toronto'}):'unavailable';};
const build=(tag,text,klass)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=String(text);return n;};
const svg=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;};
const honestSource=x=>x&&typeof x==='object';
const state={active:'all',rate:'actual',filter:'all',player:null,renderCount:0};
let sources={};
const getJSON=async path=>{const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),8000);
  try{const r=await fetch('./'+path,{cache:'no-store',signal:timeout.signal});if(!r.ok)throw Error('unavailable');return await r.json();}
  finally{clearTimeout(timer);}
};
const fetches=Promise.allSettled(['player-career-insights.json','projection.json','league-game-formats.json','player-actuals.json','goalie-roster.json','opponent-intelligence.json','goalie-projection-verified-inputs.json','svhl-upcoming.json'].map(getJSON));
const playerID=()=>String($('playerChoice')?.value||new URLSearchParams(location.search).get('playerID')||'');
const identity=id=>window.BravePlayerLinks?.identityById(Number(id))||null;
const profileIdFromName=name=>{
  const href=window.BravePlayerLinks?.profileUrl(name);
  if(!href)return null;
  try{return new URL(href).searchParams.get('playerID');}catch{return null;}
};
function setMetrics(el,values){
  el.replaceChildren();
  for(const [label,value] of values){
    const item=build('div',undefined,'bio-metric');
    item.append(build('div',value,'value'),build('div',label,'label'));
    el.append(item);
  }
}
function sourceLabel(text){$('bioModelContext').textContent=text;}
function renderView(){
  const views={all:['bioSpotlight','bioProjectionSection','bioGoalieSection','bioOpponentSection','leadershipSection','systemSection'],
    production:['bioSpotlight','bioProjectionSection','bioGoalieSection'],
    trends:['bioSpotlight','bioGoalieSection','bioOpponentSection'],
    goaltending:['bioGoalieSection','bioOpponentSection'],
    coaching:['systemSection','bioOpponentSection']};
  for(const button of $('bioTabs').querySelectorAll('button[data-bio-view]')){
    const active=button.dataset.bioView===state.active;
    button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
  }
  for(const id of ['bioSpotlight','bioProjectionSection','bioGoalieSection','bioOpponentSection','leadershipSection','systemSection']){
    const el=$(id);if(!el)continue;
    // Keep source-verified leadership visibility and actual role availability.
    const missingRole=(id==='bioGoalieSection'&&!state.isGoalie)||(id==='bioSpotlight'&&!state.isSkater);
    const wrongRole=id==='bioProjectionSection'&&!state.isSkater;
    const sourceLeadership=id==='leadershipSection'&&!state.hasLeadership;
    el.hidden=missingRole||wrongRole||sourceLeadership||!views[state.active].includes(id);
  }
  if($('bioTabs').querySelector('button[data-bio-view="goaltending"]')){
    const b=$('bioTabs').querySelector('button[data-bio-view="goaltending"]');
    b.hidden=!state.isGoalie;
  }
}
function setupTabs(){
  const bar=$('bioTabs');
  bar.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-bio-view]');
    if(!btn||btn.hidden)return;
    state.active=btn.dataset.bioView;renderView();
  });
  bar.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...bar.querySelectorAll('button[data-bio-view]:not([hidden])')];
    let index=buttons.findIndex(b=>b===document.activeElement);if(index<0)return;
    event.preventDefault();
    if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;
    else index=(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[index].focus();buttons[index].click();
  });
  for(const group of ['bioRateModes','bioSeasonModes']){
    $(group).addEventListener('click',event=>{
      const btn=event.target.closest('button[data-mode]');
      if(!btn)return;
      if(group==='bioRateModes')state.rate=btn.dataset.mode;
      else state.filter=btn.dataset.mode;
      for(const b of $(group).querySelectorAll('button[data-mode]')){
        b.setAttribute('aria-pressed',String(b.dataset.mode===btn.dataset.mode));
      }
      renderChart();
    });
  }
}
function historicalRate(row){
  if(!num(row.GP)||row.GP<=0||![row.G,row.A,row.Pts].every(num)||Math.abs(row.G+row.A-row.Pts)>1e-9)return null;
  if(state.rate==='actual')return row.Pts/row.GP;
  const config=sources.formats;
  const normal=window.HockeyOSPerformanceNormalization;
  if(config?.schema!==normal?.SCHEMA)return null;
  // Native HTO archive season rows combine game types. No rate until source and scope are reconciled.
  const target=state.rate==='winter'?'brave-winter-32':'brave-summer-48';
  const result=normal.normalizeHistorical(row,config,{role:'skater',
    seasonKey:row.Season,gameType:'ALL_HTO_GAME_TYPES',targetFormatId:target});
  return result.status==='VERIFIED_EQUIVALENT'?result.equivalent.pointsPerGame:null;
}
function seasonMatches(row){
  return state.filter==='all'||String(row.Season||'').toLowerCase().startsWith(state.filter);
}
function shortName(label){
  const s=String(label);
  let m=/^Summer\s+(\d{4})/.exec(s);
  if(m)return 'S'+m[1].slice(-2);
  m=/^Winter\s+(\d{4})\/(\d{4})/.exec(s);
  if(m)return 'W'+m[1].slice(-2)+'/'+m[2].slice(-2);
  return s.slice(0,10);
}
function describeSeason(row,rate){
  $('bioChartDetail').replaceChildren();
  const title=build('strong',row.Season||'Historical season');
  const details=build('span',' · Actual: '+fmt(row.G)+' G, '+fmt(row.A)+' A, '+fmt(row.Pts)+' PTS in '+fmt(row.GP)+' GP. ');
  const rateText=build('span',num(rate)?'Pts/GP ('+state.rate+'): '+rate.toFixed(2)+'.':'Adjusted Pts/GP: source verification pending.');
  $('bioChartDetail').append(title,details,rateText);
}
function renderChart(){
  const p=sources.career?.players?.[state.player];
  const seg=p?.segments?.find(s=>s.kind==='skater');
  const rows=(seg?.seasons||[]).filter(seasonMatches);
  const chart=$('bioComboChart');
  chart.replaceChildren();
  const ready=rows.filter(r=>[r.G,r.A,r.Pts,r.GP].every(num));
  if(!rows.length||!ready.length){
    chart.append(build('p','No source-qualified skater season totals for this filter.','bio-inactive-note'));
    $('bioChartDetail').textContent='Historical scoring chart unavailable for this role.';
    $('bioChartSource').textContent='HTO career archive · '+date(sources.career?.capturedAt);
    return;
  }
  const rates=rows.map(historicalRate);
  const high=Math.max(1,...rows.filter(r=>num(r.G)&&num(r.A)).map(r=>r.G+r.A));
  const maxRate=Math.max(.25,...rates.filter(num));
  const maxG=Math.ceil(high*1.12),maxR=Math.max(.5,maxRate*1.18);
  const width=850,height=300,left=50,right=52,top=23,bottom=64,
        plotW=width-left-right,plotH=height-top-bottom,baseline=height-bottom;
  const x=i=>left+(i+.5)*plotW/rows.length;
  const yCount=v=>baseline-(v/maxG)*plotH,yRate=v=>baseline-(v/maxR)*plotH;
  const picture=svg('svg',{viewBox:'0 0 850 300',role:'img',
    'aria-label':'Actual goals and assists as season bars, and '+state.rate+' points per game as a separate-axis line'});
  picture.append(svg('title',{},'Actual seasonal goals and assists, with independently scaled points-per-game trend'));
  for(let tick=0;tick<=4;tick++){
    const level=tick/4,py=baseline-level*plotH;
    picture.append(svg('line',{x1:left,x2:width-right,y1:py,y2:py,stroke:'#294d69','stroke-width':1}));
    picture.append(svg('text',{x:left-8,y:py+4,fill:'#b6cada','text-anchor':'end','font-size':11},String(Math.round(level*maxG))));
    picture.append(svg('text',{x:width-right+9,y:py+4,fill:'#add8ea','font-size':11},(level*maxR).toFixed(2)));
  }
  picture.append(svg('text',{x:left,y:13,fill:'#bdcedf','font-size':11},'Goals + assists (actual)'));
  picture.append(svg('text',{x:width-right,y:13,fill:'#a5d7e8','font-size':11,'text-anchor':'end'},'Pts/GP ('+state.rate+')'));
  const barW=Math.max(7,Math.min(25,plotW/rows.length*.6));
  const marks=[];
  function addInteractive(node,i,rate){
    node.setAttribute('data-bio-point',String(i));node.setAttribute('tabindex','0');
    node.setAttribute('role','button');node.setAttribute('aria-label',
      rows[i].Season+' actual goals/assists and '+(num(rate)?state.rate+' points per game':'unavailable adjusted rate'));
    node.addEventListener('click',()=>describeSeason(rows[i],rate));
    node.addEventListener('focus',()=>describeSeason(rows[i],rate));
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();describeSeason(rows[i],rate);}});
    return node;
  }
  let segment=[];
  function flush(){if(segment.length>1)picture.append(svg('polyline',{
    points:segment.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#a8d9ea','stroke-width':3.3,
    'stroke-linejoin':'round','stroke-linecap':'round'}));segment=[];}
  rows.forEach((row,i)=>{
    const xc=x(i),rate=rates[i];
    if(num(row.G)&&num(row.A)){
      const gy=yCount(row.G), total=yCount(row.G+row.A);
      const goal=svg('rect',{x:xc-barW/2,y:gy,width:barW,height:Math.max(.1,baseline-gy),
        fill:'#c7445d',rx:1});
      const assist=svg('rect',{x:xc-barW/2,y:total,width:barW,
        height:Math.max(.1,gy-total),fill:'#d8b36c',rx:1});
      picture.append(addInteractive(goal,i,rate),addInteractive(assist,i,rate));
      if(row.G===0&&row.A===0)picture.append(addInteractive(svg('circle',{cx:xc,cy:baseline-2,r:3.4,fill:'#d9b978'}),i,rate));
    }
    if(num(rate)){segment.push([xc,yRate(rate)]);marks.push({i,xc,yy:yRate(rate),rate});}
    else flush();
    const every=Math.max(1,Math.ceil(rows.length/9));
    if(i%every===0||i===rows.length-1)picture.append(svg('text',{
      x:xc,y:baseline+22,fill:'#b5c9da','font-size':Math.max(9,rows.length>18?9:11),
      'text-anchor':'middle'},shortName(row.Season)));
  });
  flush();
  for(const m of marks){
    picture.append(addInteractive(svg('circle',{cx:m.xc,cy:m.yy,r:4.5,fill:'#a8d9ea',stroke:'#0b233b','stroke-width':1.5}),m.i,m.rate));
  }
  chart.append(picture);
  const first=rows.length-1;describeSeason(rows[first],rates[first]);
  $('bioChartSource').textContent='Official HTO career archive captured '+date(sources.career?.capturedAt)+
    ' · Raw goals/assists never change · '+(state.rate==='actual'?'Unadjusted rate.':
    rates.some(num)?'Game-duration class verified for 18 original Master Schedule seasons; HTO source totals remain unchanged.':'No qualified adjusted rate for the selected seasons; raw bars remain.');
  $('bioRateStatus').textContent=state.rate==='actual'?'Actual Pts/GP = recorded points ÷ games played.':
    rates.some(num)?'Verified game-duration equivalents only; official scoring bars remain raw.':
    'The '+state.rate+' rate line is held until historic per-season/game-scope duration mapping is verified. Raw bars remain visible.';
}
function validateProjection(p){
  if(!p||p.schema!=='brave-hc-workbook-projection/v1'||p.model!=='BravesRegularSeasonProjection'||
    !Array.isArray(p.players)||!p.season||!p.publicationStatus)return null;
  const result=new Map();
  for(const row of p.players){
    if(!row||typeof row.name!=='string'||![row.gp,row.g,row.a,row.pts,row.ptsPerGame].every(num)||
       Math.abs(row.g+row.a-row.pts)>.001)return null;
    const id=profileIdFromName(row.name);
    if(id){if(result.has(id))return null;result.set(id,row);}
  }
  return result;
}
function renderSkaterProjection(){
  const section=$('bioProjectionSection');
  const target=$('bioProjectionCards');target.replaceChildren();
  const projection=sources.projection;
  const profiles=validateProjection(projection);
  const row=profiles?.get(state.player);
  if(!profiles){
    $('bioProjectionState').textContent='Shared homepage model data could not be verified. No substitute forecast generated.';
    sourceLabel('Model source unavailable');
    return;
  }
  if(!row){
    $('bioProjectionState').textContent='No model-published projection is available for this verified player. This is not a prediction of zero.';
    sourceLabel(projection.season+' · model '+date(projection.exportedAt));
    return;
  }
  const provisional=projection.modelCurrent!==true||projection.projectionComplete!==true;
  $('bioProjectionState').textContent=provisional?
    'Provisional scenario · model reconciliation pending. These are the SAME workbook-derived figures as the homepage, not certified current-season totals.':
    'Reconciled workbook-derived season forecast, separate from official actuals.';
  setMetrics(target,[['Projected GP',fmt(row.gp)],['Projected G',fmt(row.g)],['Projected A',fmt(row.a)],
      ['Projected PTS',fmt(row.pts)],['Model Pts/GP',num(row.ptsPerGame)?row.ptsPerGame.toFixed(3):'—']]);
  sourceLabel('Source: BravesRegularSeasonProjection · '+projection.season+' · '+date(projection.exportedAt)+
   ' · Workbook baseline '+fmt(projection.sourceInputs?.workbookRecordedTeamGP)+' team GP / HTO inputs '+fmt(projection.sourceInputs?.htoRecordedTeamGP)+' team GP');
  const act=sources.actuals;
  if(act?.schema==='brave-hc-hto-player-actuals/v1'&&act.status==='VERIFIED_HTO_CURRENT'&&act.season===projection.season){
    const vals=(act.players||[]).filter(a=>profileIdFromName(a.name)===state.player);
    $('bioProjectionActual').textContent=vals.length===1?
      'Separate verified HTO actuals as of '+date(act.asOf)+': '+vals[0].gp+' GP · '+vals[0].g+' G · '+vals[0].a+' A · '+vals[0].pts+' PTS.':
      'No separate verified current HTO skater totals for this profile.';
  }else $('bioProjectionActual').textContent='Current HTO skater actuals unavailable; scenario values are not actuals.';
  $('bioProjectionOpponent').textContent='Opponent adjustment: not applied. Source-qualified opponent history is available, but a predictive coefficient has not been independently validated. The homepage workbook model is unchanged.';
}
function renderGoalie(){
  const box=$('bioGoalieCards');
  box.replaceChildren();
  const player=sources.career?.players?.[state.player];
  const seg=player?.segments?.find(s=>s.kind==='goalie');
  if(!seg){$('bioGoalieStatus').textContent='No verified goalie role statistics for this player.';return;}
  const total=seg.total||{};
  const seasons=Array.isArray(seg.seasons)?seg.seasons:[];
  const latest=seasons.filter(s=>/^Winter 2026\/2027$/.test(s.Season)).at(-1);
  const r=sources.roster;
  const rosterQualified=Array.isArray(r?.currentConfirmed)&&r.currentConfirmed.some(x=>profileIdFromName(x.name)===state.player);
  $('bioGoalieState').textContent=rosterQualified?'Current goalie roster verified · projection still under development.':
    'Historical or rental goalie · no verified future-start entitlement.';
  setMetrics(box,[['Career appearances',fmt(total.GP)],['Career wins',fmt(total.W)],['Career GA/game',fmt(total.GAA)],
    ['2026/27 appearances',latest&&num(latest.GP)?fmt(latest.GP):'—'],
    ['2026/27 GA/game',latest&&num(latest.GAA)?fmt(latest.GAA):'—']]);
  const currentTotal=sources.actuals?.teamGP;
  const approved=sources.goalieVerified;
  const model=window.BraveGoalieProjection;
  let result=null;
  if(model&&approved?.schema==='hockeyos-verified-goalie-projection-inputs/v1'&&
     approved.players?.[state.player]&&approved.season==='W2026/27'){
    result=model.forecast(approved.players[state.player]);
  }
  if(result?.status==='EXPERIMENTAL_SCENARIO'){
    $('bioGoalieStatus').textContent='Experimental, non-certified goalie scenario. Historical attendance, current results and remaining scheduled games are blended; opponent context is descriptive only.';
    const list=[['Expected starts',fmt(result.forecast.starts)],['Expected wins',fmt(result.forecast.wins)],
      ['Projected GA/game',fmt(result.forecast.goalsAgainstPerAppearance)]];
    for(const [label,value] of list){const n=build('div',undefined,'bio-metric');
      n.append(build('div',value,'value'),build('div',label,'label'));box.append(n);}
  }else{
    $('bioGoalieStatus').textContent='Goalie projection model is implemented but numerical release is held. Current goalie starts, team-game coverage and verified historical attendance denominators must reconcile before projected starts, wins or GAA are shown.';
  }
  $('bioGoalieSource').textContent='Archived official HTO goalie observations · '+date(player.capturedAt||sources.career?.capturedAt)+
   '. Career totals and 2026/27 observations are raw. The existing goalie schedule lists confirmed assignments separately; future attendance is not implied by a roster name.';
  renderGoalieTrend(seasons);
  $('bioGoalieOpponent').textContent='Upcoming-opponent context can refine the new goalie model only after independently accepted opponent identity, lineup, past sample and calibrated predictive effects. The current public opponent index is descriptive only.';
}

function renderGoalieTrend(seasons){
  const target=$('bioGoalieTrend'),detail=$('bioGoalieDetail');target.replaceChildren();
  const rows=seasons.filter(r=>num(r.GP)&&r.GP>0&&(num(r.W)||num(r.GAA)));
  if(!rows.length){
    target.append(build('p','Insufficient source-qualified goalie seasons for a trend chart.','bio-inactive-note'));
    detail.textContent='No verified historical trend points available.';return;
  }
  const width=850,height=275,left=49,right=55,top=22,bottom=56;
  const b=height-bottom,w=width-left-right,h=b-top;
  const maxW=Math.max(1,...rows.filter(r=>num(r.W)).map(r=>r.W));
  const maxGAA=Math.max(1,...rows.filter(r=>num(r.GAA)).map(r=>r.GAA));
  const x=i=>left+(i+.5)*w/rows.length;
  const yWins=v=>b-v/(maxW*1.18)*h;
  const yGaa=v=>b-v/(maxGAA*1.18)*h;
  const picture=svg('svg',{viewBox:'0 0 850 275',role:'img',
   'aria-label':'Published goalie wins in gold and published goals-against average in blue, by season'});
  picture.append(svg('title',{},'Historical goalie wins (actual) and goals-against average (actual)'));
  for(let t=0;t<=4;t++){
    const y=b-t*h/4;
    picture.append(svg('line',{x1:left,x2:width-right,y1:y,y2:y,stroke:'#294d69','stroke-width':1}));
    picture.append(svg('text',{x:left-8,y:y+4,fill:'#b7cbdc','font-size':11,'text-anchor':'end'},String(Math.round(t*maxW*1.18/4))));
    picture.append(svg('text',{x:width-right+7,y:y+4,fill:'#a7d8e8','font-size':11},(t*maxGAA*1.18/4).toFixed(1)));
  }
  picture.append(svg('text',{x:left,y:13,fill:'#dbc183','font-size':11},'Wins (actual)'));
  picture.append(svg('text',{x:width-right,y:13,fill:'#a7d8e8','font-size':11,'text-anchor':'end'},'GAA (actual)'));
  const segments=[],dots=[],barW=Math.max(8,Math.min(25,w/rows.length*.55));
  const describe=(i)=>{
    const r=rows[i];detail.textContent=r.Season+' | '+fmt(r.GP)+' appearances | '+(num(r.W)?fmt(r.W):'Unreported')+
      ' wins | '+(num(r.GAA)?fmt(r.GAA):'Unreported')+' recorded GAA. Missing wins are not zero.';
  };
  const interactive=(n,i)=>{
    n.setAttribute('tabindex','0');n.setAttribute('role','button');
    n.setAttribute('aria-label',rows[i].Season+' goalie performance, select details');
    n.addEventListener('click',()=>describe(i));n.addEventListener('focus',()=>describe(i));
    n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();describe(i);}});
    return n;
  };
  rows.forEach((r,i)=>{
    const xc=x(i);
    if(num(r.W)&&r.W>0)picture.append(interactive(svg('rect',{x:xc-barW/2,y:yWins(r.W),width:barW,height:b-yWins(r.W),fill:'#d1ac68',rx:2}),i));
    if(num(r.GAA))dots.push({x:xc,y:yGaa(r.GAA),i});
    const skip=Math.max(1,Math.ceil(rows.length/9));
    if(i%skip===0||i===rows.length-1)picture.append(svg('text',{x:xc,y:b+20,'text-anchor':'middle',fill:'#b9cddc','font-size':10},shortName(r.Season)));
  });
  if(dots.length>1)picture.append(svg('polyline',{points:dots.map(d=>d.x+','+d.y).join(' '),stroke:'#a6d9ea','stroke-width':3,fill:'none','stroke-linejoin':'round'}));
  for(const d of dots)picture.append(interactive(svg('circle',{cx:d.x,cy:d.y,r:5,fill:'#a8d9ea',stroke:'#0b233b','stroke-width':1.5}),d.i));
  target.append(picture);describe(rows.length-1);
}
function renderOpponents(){
  const box=$('bioOpponentCards');box.replaceChildren();
  const fixtures=sources.upcoming,history=sources.opponent;
  if(fixtures?.schema!=='brave-hc-svhl-schedule/v1'||!Array.isArray(fixtures.games)){
    box.append(build('p','Upcoming opponent schedule is temporarily unavailable.','bio-inactive-note'));
    $('bioOpponentSource').textContent='Opponent adjustments are not applied to player or goalie forecasts.';return;
  }
  const verified=fixtures.games.filter(g=>g&&g.htoSyncStatus==='MATCH'&&typeof g.opponent==='string'&&
    /^\d{4}-\d{2}-\d{2}$/.test(g.date)).slice(0,4);
  if(!verified.length){
    box.append(build('p','No source-matched upcoming fixtures in this schedule snapshot.','bio-inactive-note'));
  }
  for(const game of verified){
    const item=build('article',undefined,'bio-matchup');
    const dateText=date(game.date+'T12:00:00Z');
    item.append(build('div',dateText,'bio-match-date'),build('div',game.opponent,'bio-match-name'));
    const h=history?.status==='PUBLIC_VERIFIED_SOURCE_IDENTITY'&&Array.isArray(history.teams)
      ?history.teams.find(t=>t.name===game.opponent):null;
    const r=h?.regularSeason;
    let note='No verified prior head-to-head record under this opponent identity.';
    if(r&&[r.gp,r.w,r.l,r.t].every(num)&&r.w+r.l+r.t===r.gp&&r.gp>0){
      note='Brave H.C. regular-season history: '+r.w+' W - '+r.l+' L - '+r.t+' T ('+r.gp+' GP)';
    }
    item.append(build('p',note,'bio-match-note'));
    box.append(item);
  }
  $('bioOpponentSource').textContent='SVHL schedule checked '+date(fixtures.checkedAt)+
    ' | Opponent archive '+date(history?.asOf)+
    ' | Historical head-to-head is context only. No uncalibrated matchup multiplier has been applied.';
  const first=verified[0];
  $('bioCoachingContext').textContent=first?
    'Next verified fixture: '+date(first.date+'T12:00:00Z')+' vs '+first.opponent+
    '. Coach-approved game assignments are not available on this public page; no role or attendance is assumed.':
    'No verified upcoming game. Individual lineup assignments remain private until coach-approved.';
}

function renderPlayer(){
  if($('profileContent').hidden)return;
  const pid=playerID(),p=sources.career?.players?.[pid];
  if(!p||!identity(pid)||identity(pid).name!==p.name)return;
  state.player=pid;
  state.isSkater=p.segments?.some(s=>s.kind==='skater')||false;
  state.isGoalie=p.segments?.some(s=>s.kind==='goalie')||false;
  state.hasLeadership=!$('leadershipSection')?.hidden;
  $('bioTabs').hidden=false;document.body.classList.add('bio-premium-ready');
  $('playerMeta').textContent='Player intelligence · Advanced trends · '+(state.isGoalie?'Goaltending · ':'')+'Club service';
  $('bioContext').textContent='HTO verified player #'+pid+' · '+(state.isGoalie&&state.isSkater?'Dual role':state.isGoalie?'Goaltender':'Skater');
  $('bioSpotlight').hidden=!state.isSkater;
  if(state.isSkater)renderChart();
  if(state.isSkater)renderSkaterProjection();
  if(state.isGoalie)renderGoalie();
  renderOpponents();
  if(!state.isGoalie&&state.active==='goaltending')state.active='all';
  renderView();
}
const inputs=await fetches;
sources={career:inputs[0].status==='fulfilled'?inputs[0].value:null,
  projection:inputs[1].status==='fulfilled'?inputs[1].value:null,
  formats:inputs[2].status==='fulfilled'?inputs[2].value:null,
  actuals:inputs[3].status==='fulfilled'?inputs[3].value:null,
  roster:inputs[4].status==='fulfilled'?inputs[4].value:null,
  opponent:inputs[5].status==='fulfilled'?inputs[5].value:null,
  goalieVerified:inputs[6].status==='fulfilled'?inputs[6].value:null,
  upcoming:inputs[7].status==='fulfilled'?inputs[7].value:null};
setupTabs();
const content=$('profileContent');
const observer=new MutationObserver(()=>{if(!content.hidden)renderPlayer();});
observer.observe(content,{attributes:true,attributeFilter:['hidden']});
$('playerChoice').addEventListener('change',()=>setTimeout(renderPlayer,0));
if(!content.hidden)renderPlayer();
})();
