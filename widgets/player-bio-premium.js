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
const state={active:'production',rate:'actual',filter:'recent',player:null,renderCount:0,analysis:null};
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
  const sections={
    all:['bioSpotlight','bioAdvancedSection','bioDevelopmentSection','bioProjectionSection','bioGoalieSection','bioOpponentSection','leadershipSection','systemSection'],
    production:['bioSpotlight','bioAdvancedSection','bioProjectionSection'],
    goaltending:['bioGoalieSection','bioAdvancedSection'],
    trends:['bioDevelopmentSection'],
    coaching:['bioOpponentSection','systemSection']
  };
  const visible=sections[state.active]||[];
  const bar=$('bioTabs');
  for(const btn of bar.querySelectorAll('button[data-bio-view]')){
    const key=btn.dataset.bioView;
    btn.hidden=(key==='production'&&!state.isSkater)||(key==='goaltending'&&!state.isGoalie);
    const chosen=key===state.active&&!btn.hidden;
    btn.setAttribute('aria-selected',String(chosen));btn.tabIndex=chosen?0:-1;
  }
  bar.classList.toggle('bio-dual-role',Boolean(state.isGoalie&&state.isSkater));
  for(const id of ['bioSpotlight','bioAdvancedSection','bioDevelopmentSection','bioProjectionSection',
                   'bioGoalieSection','bioOpponentSection','leadershipSection','systemSection']){
    const el=$(id);if(!el)continue;
    const missingRole=(id==='bioGoalieSection'&&!state.isGoalie)||
      (['bioSpotlight','bioProjectionSection'].includes(id)&&!state.isSkater);
    const leadershipMissing=id==='leadershipSection'&&!state.hasLeadership;
    el.hidden=missingRole||leadershipMissing||!visible.includes(id);
  }
}
function setupTabs(){
  const studio=$('bioStudio');
  // Preserve published HTO leadership/system content but place it inside one Milestone-style collection.
  studio.append($('leadershipSection'),$('systemSection'));
  const bar=$('bioTabs');
  bar.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-bio-view]');
    if(!btn||btn.hidden)return;
    state.active=btn.dataset.bioView;
    if(state.isGoalie&&state.isSkater&&state.player){
      const profile=sources.career?.players?.[state.player];
      if(profile){renderAdvancedMetrics(profile);renderDevelopment(profile);}
    }
    renderView();
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
  return ['recent','all'].includes(state.filter)||
     String(row.Season||'').toLowerCase().startsWith(state.filter);
}
function shortName(label){
  const s=String(label);
  let m=/^Summer\s+(\d{4})/.exec(s);
  if(m)return 'S'+m[1].slice(-2);
  m=/^Winter\s+(\d{4})\/(\d{4})/.exec(s);
  if(m)return window.innerWidth<=480?'W'+m[1].slice(-2):'W'+m[1].slice(-2)+'/'+m[2].slice(-2);
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
  const matching=(seg?.seasons||[]).filter(seasonMatches);
  const rows=state.filter==='recent'?matching.slice(-8):matching;
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
  const compact=window.innerWidth<=480;
  const width=compact?365:850,height=compact?248:300;
  const left=compact?32:50,right=compact?42:52,top=compact?29:23,bottom=compact?49:64;
  const plotW=width-left-right,plotH=height-top-bottom,baseline=height-bottom;
  const x=i=>left+(i+.5)*plotW/rows.length;
  const yCount=v=>baseline-(v/maxG)*plotH,yRate=v=>baseline-(v/maxR)*plotH;
  const picture=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img',
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
  const barW=Math.max(compact?9:7,Math.min(compact?20:25,plotW/rows.length*.62));
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
      x:xc,y:baseline+22,fill:'#b5c9da','font-size':compact?10:Math.max(9,rows.length>18?9:11),
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
    rates.some(num)?(state.rate==='winter'?'32-minute Winter-equivalent points per game.':'48-minute Summer-equivalent points per game.')+' Goals and assists remain actual.':
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
    'Provisional scenario · model reconciliation pending. Same workbook forecast as the homepage; not certified current-season totals.':
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
  setMetrics(box,[
    ['2026/27 recorded appearances',latest&&num(latest.GP)?fmt(latest.GP):'Unavailable'],
    ['2026/27 GA / appearance',latest&&num(latest.GAA)?fmt(latest.GAA):'Unavailable']
  ]);
  const currentTotal=sources.actuals?.teamGP;
  const approved=sources.goalieVerified;
  const model=window.BraveGoalieProjection;
  let result=null;
  if(model&&approved?.schema==='hockeyos-verified-goalie-projection-inputs/v1'&&
     approved.publicationGate?.state==='GOALIE_HISTORICAL_CURRENT_PARITY_ACCEPTED'&&
     approved.publicationGate?.releaseAuthorized===true&&
     typeof approved.publicationGate?.independentEvidenceId==='string'&&
     approved.publicationGate.independentEvidenceId.length>12&&
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
    $('bioGoalieStatus').textContent='Numerical goalie forecast held pending source verification. No projected wins or GAA are shown.';
  }
  $('bioGoalieSource').textContent='Archived official HTO goalie observations · '+date(player.capturedAt||sources.career?.capturedAt)+
   '. Career totals and 2026/27 observations are raw. The existing goalie schedule lists confirmed assignments separately; future attendance is not implied by a roster name.';
  renderGoalieTrend(seasons);
  $('bioGoalieOpponent').textContent='Upcoming-opponent context can refine the new goalie model only after independently accepted opponent identity, lineup, past sample and calibrated predictive effects. The current public opponent index is descriptive only.';
}

function renderGoalieTrend(seasons){
  const target=$('bioGoalieTrend'),detail=$('bioGoalieDetail');target.replaceChildren();
  const rows=seasons.filter(r=>num(r.GP)&&r.GP>0&&(num(r.W)||num(r.GAA))).slice(-8);
  if(!rows.length){
    target.append(build('p','Insufficient source-qualified goalie seasons for a trend chart.','bio-inactive-note'));
    detail.textContent='No verified historical trend points available.';return;
  }
  const compact=window.innerWidth<=480;
  const width=compact?365:850,height=compact?240:275;
  const left=compact?31:49,right=compact?40:55,top=compact?28:22,bottom=compact?45:56;
  const b=height-bottom,w=width-left-right,h=b-top;
  const maxW=Math.max(1,...rows.filter(r=>num(r.W)).map(r=>r.W));
  const maxGAA=Math.max(1,...rows.filter(r=>num(r.GAA)).map(r=>r.GAA));
  const x=i=>left+(i+.5)*w/rows.length;
  const yWins=v=>b-v/(maxW*1.18)*h;
  const yGaa=v=>b-v/(maxGAA*1.18)*h;
  const picture=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img',
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
  const more=$('bioOpponentMore');
  more.hidden=verified.length<=2;
  box.classList.remove('bio-opponents-expanded');
  more.setAttribute('aria-expanded','false');more.textContent='View '+(verified.length-2)+' more games';
  more.onclick=()=>{
    const expanded=box.classList.toggle('bio-opponents-expanded');
    more.setAttribute('aria-expanded',String(expanded));
    more.textContent=expanded?'Show next 2 games':'View '+(verified.length-2)+' more games';
  };
  $('bioOpponentSource').textContent='SVHL schedule checked '+date(fixtures.checkedAt)+
    ' | Opponent archive '+date(history?.asOf)+
    ' | Historical head-to-head is context only. No uncalibrated matchup multiplier has been applied.';
  const first=verified[0];
  $('bioCoachingContext').textContent=first?
    'Next verified fixture: '+date(first.date+'T12:00:00Z')+' vs '+first.opponent+
    '. Coach-approved game assignments are not available on this public page; no role or attendance is assumed.':
    'No verified upcoming game. Individual lineup assignments remain private until coach-approved.';
}


function percent(value,decimals=0){return num(value)?(value*100).toFixed(decimals)+'%':'Unavailable';}
function decimal(value,dp=2){return num(value)?value.toFixed(dp):'Unavailable';}
function insight(container,title,value,description){
  const tile=build('article',undefined,'bio-insight-tile');
  tile.append(build('div',value,'bio-insight-value'),build('div',title,'bio-insight-title'),
    build('div',description,'bio-insight-description'));
  container.append(tile);
}
function extra(container,label,value){
  if(value===null||value===undefined||value==='Unavailable')return;
  const tile=build('div',undefined,'bio-extra-metric');
  tile.append(build('strong',value),build('span',label));container.append(tile);
}
function renderAdvancedMetrics(player){
  const engine=window.HockeyOSBioAdvanced;
  const wanted=state.active==='goaltending'?'goalie':state.isSkater?'skater':'goalie';
  const seg=player?.segments?.find(s=>s.kind===wanted);
  const target=$('bioAdvancedGrid'),more=$('bioSecondaryMetrics');
  target.replaceChildren();more.replaceChildren();
  const result=engine&&seg?(seg.kind==='skater'?engine.skater(seg,sources.formats):engine.goalie(seg,sources.formats)):null;
  const split=$('bioScoringMix');split.replaceChildren();split.hidden=true;
  state.analysis=result;
  if(!result||result.status!=='VERIFIED_DERIVED'){
    target.append(build('p','Detailed rates are unavailable from the verified historical source. Missing fields have not been counted as zero.','bio-inactive-note'));
    $('bioOtherMetrics').hidden=true;
    $('bioAdvancedSource').textContent='Published HTO historical archive · '+date(sources.career?.capturedAt);
    return;
  }
  const o=result.overview,c=result.coverage;
  $('bioCollectionCount').textContent=c.complete+' / '+c.total+' seasons';
  $('bioCollectionSub').textContent='Choose a collection · '+c.complete+' source-qualified '+(seg.kind==='goalie'?'goalie':'scoring')+' seasons';
  if(result.kind==='skater'){
    insight(target,'Winter-equivalent points / GP',decimal(o.winterPtsPerGP??o.verifiedSeasonWinterPtsPerGP),
      (o.winterPtsPerGP===null?'Verified seasons only · ':'All published scoring seasons · ')+'32-minute basis');
    insight(target,'Scoring mix',percent(o.goalsShare),
      'Share of actual career points from goals');
    insight(target,'Peak season',o.peak?decimal(o.peak.rate):'Unavailable',
      o.peak?o.peak.season+' · adjusted Pts/GP · 5+ GP':'No 5+ GP verified season');
    insight(target,'Recent 3-season average',result.development?decimal(result.development.recent):'Unavailable',
      result.development?'Winter-equivalent Pts/GP · 5+ GP per season':'Requires six 5+ GP seasons');

    if(num(o.goalsShare)){
      const share=o.goalsShare;
      split.hidden=false;
      split.append(build('div','Recorded scoring composition','bio-split-heading'));
      const labels=build('div',undefined,'bio-split-labels');
      labels.append(build('span','Goals '+percent(share)),
        build('span','Assists '+percent(1-share)));
      split.append(labels);
      const track=build('div',undefined,'bio-split-track');
      const goal=build('span',undefined,'bio-split-goals');
      const assist=build('span',undefined,'bio-split-assists');
      goal.style.width=(share*100).toFixed(2)+'%';
      assist.style.width=((1-share)*100).toFixed(2)+'%';
      track.append(goal,assist);split.append(track);
    }
    extra(more,'Goal scoring / GP · Winter equivalent (qualified seasons)',decimal(o.verifiedSeasonWinterGoalsPerGP));
    extra(more,'Assists / GP · Winter equivalent (qualified seasons)',decimal(o.verifiedSeasonWinterAssistsPerGP));
    extra(more,'Goals that were power-play goals · published career',percent(result.situational.powerPlayShare,1));
    extra(more,'Goals that were game-winners · published career',percent(result.situational.gameWinnersShare,1));
    extra(more,'Goals that were short-handed · published career',percent(result.situational.shortHandedShare,1));
    extra(more,'Penalty minutes per actual game · published career',decimal(result.situational.penaltyMinutesPerGP));
    extra(more,'Player of the Game awards per 100 actual GP',decimal(result.situational.playerOfGamePer100,1));
    const pm=result.situational.plusMinusPerGP;
    extra(more,'Published +/- per actual appearance · context only',
      pm===null?'Unavailable':(pm>=0?'+':'')+pm.toFixed(2));
  }else{
    insight(target,'Winter-equivalent GA / appearance',
      decimal(o.careerWinterGAperAppearance??o.verifiedWinterGAperAppearance),
      o.careerWinterGAperAppearance===null?'Verified seasons only':'32-minute game-length basis');
    insight(target,'Recorded win-point rate',percent(o.winPointsPct,1),
      'Wins + half ties / actual goalie GP');
    insight(target,'Shutouts per 100 appearances',decimal(o.shutoutPer100,1),
      'Verified career shutouts / recorded GP');
    insight(target,'Best 5+ GP season',o.peak?decimal(o.peak.rate):'Unavailable',
      o.peak?o.peak.season+' · Winter-eq GA/appearance':'No qualifying goalie season');
    extra(more,'Actual recorded goals against per appearance',decimal(o.publishedActualGAA));
    extra(more,'Player of the Game awards per 100 goalie GP',decimal(o.playerOfGamePer100,1));
  }
  $('bioOtherMetrics').hidden=more.children.length===0;
  $('bioAdvancedSource').textContent='HTO career archive '+date(sources.career?.capturedAt)+
     ' · '+c.complete+'/'+c.total+' seasons with complete core values'+
     (c.excluded?' · '+c.excluded+' incomplete season(s) excluded, not zeroed':'')+
     ' · Rates are analysis only, not records.';
}
function renderDevelopment(player){
  const target=$('bioDevelopmentGrid'),pane=$('bioDevelopmentChart');
  target.replaceChildren();pane.replaceChildren();
  const result=state.analysis;
  if(!result||result.status!=='VERIFIED_DERIVED'){
    pane.append(build('p','Development comparisons require verified historical rate data.','bio-inactive-note'));
    $('bioDevelopmentSource').textContent='No estimates were substituted for missing values.';return;
  }
  const isGoalie=result.kind==='goalie',o=result.overview,d=result.development,unit=isGoalie?'GA / appearance':'Pts / GP';
  insight(target,'Recent three seasons',d?decimal(d.recent):'Unavailable',
    d?'Winter-equivalent '+unit+' · 5+ GP each':'Requires six qualifying seasons');
  insight(target,'Previous three seasons',d?decimal(d.previous):'Unavailable',
    d?'Previous three qualifying seasons':'Historical sample insufficient');
  insight(target,isGoalie?'Lowest season GA rate':'Highest season scoring rate',
    o.peak?decimal(o.peak.rate):'Unavailable',
    o.peak?o.peak.season+' · 5+ GP':'5+ GP season needed');
  if(!isGoalie)insight(target,'Middle-half season range',
    o.middleHalf?decimal(o.middleHalf[0])+'–'+decimal(o.middleHalf[1]):'Unavailable',
    'Winter-equivalent Pts/GP · seasons with 5+ GP');
  else insight(target,'Change in recent GA rate',
    d?((d.difference>0?'+':'')+d.difference.toFixed(2)):'Unavailable',
    'Recent minus earlier · lower GA rate is better');
  const seg=player?.segments?.find(s=>s.kind===(isGoalie?'goalie':'skater'));
  const engine=window.HockeyOSBioAdvanced;
  const rows=(seg?.seasons||[]).filter(row=>Number.isSafeInteger(row.GP)&&row.GP>=5)
    .map(row=>({...row,normalized:engine.rate([row],isGoalie?'GA':'Pts','winter',sources.formats)}))
    .filter(row=>num(row.normalized)).slice(-8);
  if(rows.length<2){
    pane.append(build('p','At least two qualifying historical seasons are needed for a trend line.','bio-inactive-note'));
  }else{
    pane.append(build('p',(isGoalie?'Goals against':'Scoring')+' · last '+rows.length+' qualifying seasons (Winter equivalent)','bio-subhead'));
    const width=window.innerWidth<=480?330:680,height=132,left=16,right=13,top=20,bottom=30,
      plotW=width-left-right,plotH=height-top-bottom;
    const vals=rows.map(r=>r.normalized),high=Math.max(...vals),low=Math.min(...vals);
    const span=Math.max(.25,high-low),max=high+span*.18,min=Math.max(0,low-span*.18);
    const x=i=>left+(rows.length===1?0:(i/(rows.length-1))*plotW);
    const y=v=>height-bottom-(v-min)/(max-min||1)*plotH;
    const picture=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img',
      'aria-label':(isGoalie?'Goalie goals against per appearance':'Skater scoring points per appearance')+' by qualified season, Winter equivalent'});
    picture.append(svg('title',{},'Normalized season progression: '+rows.map(r=>r.Season+' '+r.normalized.toFixed(2)).join('; ')));
    picture.append(svg('line',{x1:left,x2:width-right,y1:height-bottom,y2:height-bottom,stroke:'#375d77'}));
    picture.append(svg('polyline',{points:rows.map((r,i)=>x(i)+','+y(r.normalized)).join(' '),fill:'none',
      stroke:'#a8d9ea','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
    rows.forEach((r,i)=>{
      picture.append(svg('circle',{cx:x(i),cy:y(r.normalized),r:4.5,fill:'#f1cb88',stroke:'#0b233b','stroke-width':1.5}));
      picture.append(svg('text',{x:x(i),y:height-bottom+17,'text-anchor':'middle',fill:'#c4d8e8',
        'font-size':window.innerWidth<=480?10:12},shortName(r.Season)));
    });
    pane.append(picture);
  }
  $('bioDevelopmentSource').textContent='Qualified season = 5+ recorded appearances. Winter-equivalent '+
    unit+' compares verified 32/48-minute formats; no opponent-strength adjustment or player ranking is implied.';
}

function renderPlayer(){
  if($('profileContent').hidden)return;
  const pid=playerID(),p=sources.career?.players?.[pid];
  if(!p||!identity(pid)||identity(pid).name!==p.name)return;
  const changing=state.player!==pid;
  state.player=pid;
  state.isSkater=p.segments?.some(s=>s.kind==='skater')||false;
  state.isGoalie=p.segments?.some(s=>s.kind==='goalie')||false;
  state.hasLeadership=Boolean($('leadership')?.querySelector('.entry'));
  if(changing){
    state.active=state.isSkater?'production':state.isGoalie?'goaltending':'all';
    state.rate='actual';state.filter='recent';
    for(const group of ['bioRateModes','bioSeasonModes']){
      const current=group==='bioRateModes'?state.rate:state.filter;
      for(const b of $(group).querySelectorAll('button[data-mode]')){
        b.setAttribute('aria-pressed',String(b.dataset.mode===current));
      }
    }
  }
  $('bioTabs').hidden=false;document.body.classList.add('bio-premium-ready');
  $('playerMeta').textContent='Advanced performance · Development · Game preparation';
  $('bioContext').textContent='HTO verified player #'+pid+' · '+(state.isGoalie&&state.isSkater?'Dual role':state.isGoalie?'Goaltender':'Skater');
  $('bioSpotlight').hidden=!state.isSkater;
  if(state.isSkater)renderChart();
  if(state.isSkater)renderSkaterProjection();
  if(state.isGoalie)renderGoalie();
  renderAdvancedMetrics(p);
  renderDevelopment(p);
  renderOpponents();
  if(!state.isGoalie&&state.active==='goaltending')state.active='production';
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
