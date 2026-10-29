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
const fmtRate=x=>num(x)?x.toFixed(2):'Unavailable';
// Whole-GP presentation only; the published workbook model preserves full numeric precision.
const fmtProjectedGP=x=>num(x)?String(Math.round(x)):'Unavailable';
const date=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?new Date(n).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'America/Toronto'}):'unavailable';};
const build=(tag,text,klass)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(text!==undefined)n.textContent=String(text);return n;};
const svg=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;};
const honestSource=x=>x&&typeof x==='object';
const state={active:'production',rate:'actual',filter:'recent',baseline:'rolling',compare:false,coachingPosition:null,player:null,renderCount:0,analysis:null};
let sources={};
const getJSON=async path=>{const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),8000);
  try{const r=await fetch('./'+path,{cache:'no-store',signal:timeout.signal});if(!r.ok)throw Error('unavailable');return await r.json();}
  finally{clearTimeout(timer);}
};
const fetches=Promise.allSettled(['player-career-insights.json','projection.json','league-game-formats.json','player-actuals.json','goalie-roster.json','opponent-intelligence.json','goalie-projection-verified-inputs.json','svhl-upcoming.json','player-bio-season-titles.json','game-night-lineup-public.json','countdown.json'].map(getJSON));
const playerID=()=>String($('playerChoice')?.value||new URLSearchParams(location.search).get('playerID')||'');
const identity=id=>window.BravePlayerLinks?.identityById(Number(id))||null;
const profileIdFromName=name=>{
  const href=window.BravePlayerLinks?.profileUrl(name);
  if(!href)return null;
  try{return new URL(href).searchParams.get('playerID');}catch{return null;}
};
// Self-contained SVG icons use a shared visual system with milestone cards.
const metricIcon=kind=>{
  const el=svg('svg',{viewBox:'0 0 24 24',class:'bio-stat-icon',
    fill:'none',stroke:'currentColor','stroke-width':1.75,'stroke-linecap':'round',
    'stroke-linejoin':'round','aria-hidden':'true'});
  const draw=(tag,attrs)=>el.append(svg(tag,attrs));
  if(/GP|appearances|starts/i.test(kind)){
    draw('rect',{x:3,y:5,width:18,height:16,rx:2});
    draw('path',{d:'M7 3V7M17 3V7M3 10H21M8 15H10M14 15H16'});
  }else if(/^Projected G$|Goal scoring/i.test(kind)){
    for(const r of [9,5,1.8])draw('circle',{cx:12,cy:12,r});
  }else if(/Projected A|Assists/i.test(kind)){
    draw('circle',{cx:6,cy:15,r:2.5});draw('circle',{cx:18,cy:7,r:2.5});
    draw('path',{d:'M8.6 14L15.3 8.2M11.9 6H15.5V10'});
  }else if(/PTS|point/i.test(kind)&&!/Pts\/GP/i.test(kind)){
    draw('path',{d:'M12 2L15 9L22 9L16.5 13.5L18.5 21L12 17L5.5 21L7.5 13.5L2 9L9 9Z'});
  }else if(/Pts\/GP|rate|GA\/game/i.test(kind)){
    draw('path',{d:'M3 20H21M4 16L10 10L14 13L20 5M16 5H20V9'});
  }else{
    draw('circle',{cx:12,cy:12,r:9});draw('path',{d:'M12 7V12L16 15'});
  }
  return el;
};
function setMetrics(el,values,iconic=false){
  el.replaceChildren();
  for(const [label,value] of values){
    const item=build('article',undefined,iconic?'bio-metric bio-metric-icon':'bio-metric');
    if(iconic)item.append(metricIcon(label));
    const copy=build('div',undefined,iconic?'bio-metric-copy':'bio-metric-plain');
    copy.append(build('div',value,'value'),build('div',label,'label'));
    item.append(copy);el.append(item);
  }
}
function sourceLabel(text){$('bioModelContext').textContent=text;}
function renderView(){
  const sections={
    production:['bioSeasonCurrent','bioProjectionSection'],
    trends:['bioSpotlight','bioAdvancedSection','bioDevelopmentSection','bioGoalieSection'],
    coaching:['bioOpponentSection']
  };
  const visible=sections[state.active]||[];
  const bar=$('bioTabs');
  for(const btn of bar.querySelectorAll('button[data-bio-view]')){
    const key=btn.dataset.bioView;
    const chosen=key===state.active;
    btn.setAttribute('aria-selected',String(chosen));btn.tabIndex=chosen?0:-1;
  }
  // Exactly three main tabs for skaters, goalies, and dual-role profiles.
  for(const id of ['bioSeasonCurrent','bioSpotlight','bioAdvancedSection','bioDevelopmentSection','bioProjectionSection',
                   'bioGoalieSection','bioOpponentSection','leadershipSection','systemSection']){
    const el=$(id);if(!el)continue;
    const missingRole=(id==='bioGoalieSection'&&!state.isGoalie)||
      (['bioSpotlight','bioProjectionSection'].includes(id)&&!state.isSkater);
    const leadershipMissing=id==='leadershipSection'&&!state.hasLeadership;
    el.hidden=missingRole||leadershipMissing||!visible.includes(id);
  }
  $('bioProjectionSummarySlot').hidden=!state.isSkater||!state.hasProjection;
}
function setupTabs(){
  const studio=$('bioStudio');
  // Leadership remains in the authoritative Milestones collection, never repeated in Bio Coaching.
  const bar=$('bioTabs');
  bar.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-bio-view]');
    if(!btn||btn.hidden)return;
    state.active=btn.dataset.bioView;
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
  $('bioPositionModes').addEventListener('click',event=>{
    const btn=event.target.closest('button[data-position]');
    if(!btn)return;
    const role=btn.dataset.position;
    if(!window.HockeyOSBioCoachingRoles?.positions[role])return;
    state.coachingPosition=role;
    renderCoachingPosition();
  });
  $('bioOverlayModes').addEventListener('click',()=>{
    state.compare=!state.compare;
    $('bioOverlayModes').setAttribute('aria-pressed',String(state.compare));
    $('bioOverlayHint').textContent=state.compare?'All source-qualified P/GP lines, shared right axis':
      'One line selected · additional formats optional';
    renderChart();
  });
  $('bioCareerComparisonModes').addEventListener('click',event=>{
    const button=event.target.closest('button[data-mode]');
    if(!button||!['rolling','fixed','off'].includes(button.dataset.mode))return;
    state.baseline=button.dataset.mode;
    for(const b of $('bioCareerComparisonModes').querySelectorAll('button[data-mode]')){
      b.setAttribute('aria-pressed',String(b.dataset.mode===state.baseline));
    }
    renderChart();
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
      if(group==='bioSeasonModes'){
        const more=$('bioMoreSeasonFilters');
        more.querySelector('summary').textContent=state.filter==='winter'?'Winter only':state.filter==='summer'?'Summer only':'More';
        more.open=false;
      }
      renderChart();
      if(group==='bioRateModes'&&state.player){
        const player=sources.career?.players?.[state.player];
        if(player)renderAdvancedMetrics(player);
      }
    });
  }
}
function historicalRateFor(row,basis){
  if(!num(row.GP)||row.GP<=0||![row.G,row.A,row.Pts].every(num)||Math.abs(row.G+row.A-row.Pts)>1e-9)return null;
  if(basis==='actual')return row.Pts/row.GP;
  const config=sources.formats;
  const normal=window.HockeyOSPerformanceNormalization;
  if(config?.schema!==normal?.SCHEMA)return null;
  // Native HTO archive season rows combine game types. No rate until source and scope are reconciled.
  const target=basis==='winter'?'brave-winter-32':'brave-summer-48';
  const result=normal.normalizeHistorical(row,config,{role:'skater',
    seasonKey:row.Season,gameType:'ALL_HTO_GAME_TYPES',targetFormatId:target});
  return result.status==='VERIFIED_EQUIVALENT'?result.equivalent.pointsPerGame:null;
}
function historicalRate(row){return historicalRateFor(row,state.rate);}
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
function titleMarks(season){
  const verified=sources.titles;
  if(!verified||verified.schema!=='hockeyos-verified-season-scoring-titles/v1'||
     verified.sourcePolicy!=='EXPLICIT_PUBLIC_HTO_HONORS_ONLY_NO_STAT_RANK_INFERENCE'||
     verified.heldCount!==0||!verified.sourceHashes?.native||!verified.sourceHashes?.history)return [];
  const candidate=verified.players?.[state.player]?.[season];
  if(!Array.isArray(candidate))return [];
  const seen=new Set(),accepted=[];
  for(const award of candidate){
    if(!award||!['goalTitle','pointsTitle'].includes(award.type)||seen.has(award.type)||
       !Array.isArray(award.sourceTypes)||!award.sourceTypes.length||
       !award.sourceTypes.every(t=>['NATIVE_HTO_HIGHLIGHTS','PUBLIC_HTO_AWARDS_HISTORY'].includes(t)))continue;
    seen.add(award.type);
    accepted.push({type:award.type,label:award.type==='goalTitle'?'Rocket Richard — goal-scoring title':'Art Ross — points title'});
  }
  return accepted;
}
function renderAwardKey(rows){
  const host=$('bioAwardKey');
  host.replaceChildren();
  const found=new Set(rows.flatMap(row=>titleMarks(row.Season).map(item=>item.type)));
  host.hidden=found.size===0;
  for(const [type,abbreviation,title] of [
     ['goalTitle','RR','Rocket Richard'],
     ['pointsTitle','AR','Art Ross']
  ]){
    if(!found.has(type))continue;
    const legend=build('span',undefined,'bio-award-key-item');
    legend.append(build('span',abbreviation,'bio-award-gold'),
      build('span',title));
    host.append(legend);
  }
}
function describeSeason(row,rate,reference){
  const host=$('bioChartDetail');
  host.replaceChildren();
  const awards=titleMarks(row.Season);
  const summary=build('div',undefined,'bio-season-summary');
  summary.append(build('strong',row.Season||'Historical season'));
  summary.append(build('span',' · '+(num(row.G)?fmt(row.G):'—')+'G · '+
      (num(row.A)?fmt(row.A):'—')+'A · '+(num(row.GP)?fmt(row.GP):'—')+
      'GP · '+(num(rate)?rate.toFixed(2)+' P/GP':'P/GP unavailable')));
  host.append(summary);
  if(num(reference)&&num(rate)){
    const diff=rate-reference;
    const comparable=state.baseline==='fixed'?'full-career pace':'prior-career pace';
    const verb=Math.abs(diff)<.005?'At':diff>0?'Above':'Below';
    const result=Math.abs(diff)<.005?'':(' by '+Math.abs(diff).toFixed(2)+' P/GP');
    host.append(build('span',verb+' '+comparable+result+
      ' · benchmark '+reference.toFixed(2)+' P/GP','bio-chart-benchmark-detail'));
  }
  if(awards.length){
    const badges=build('div',undefined,'bio-season-awards');
    for(const award of awards){
      const badge=build('span',undefined,'bio-season-award bio-season-award-gold');
      badge.append(build('span',award.type==='goalTitle'?'RR':'AR','bio-award-letter'),
        build('span',award.label));
      badges.append(badge);
    }
    host.append(badges);
    host.append(build('span',
      'Award titles are published HTO honors; chart totals may include a different game-type scope.',
      'bio-award-caveat'));
  }
}
function renderChart(){
  const p=sources.career?.players?.[state.player];
  const seg=p?.segments?.find(s=>s.kind==='skater');
  const matching=(seg?.seasons||[]).filter(seasonMatches);
  const rows=state.filter==='recent'?matching.slice(-8):matching;
  const chart=$('bioComboChart');
  chart.replaceChildren();
  $('bioAwardKey').hidden=true;
  $('bioAwardKey').replaceChildren();
  $('bioCareerComparisonLegend').hidden=true;
  const ready=rows.filter(r=>[r.G,r.A,r.Pts,r.GP].every(num));
  if(!rows.length||!ready.length){
    chart.append(build('p','No source-qualified skater season totals for this filter.','bio-inactive-note'));
    $('bioChartDetail').textContent='Historical scoring chart unavailable for this role.';
    $('bioChartSource').textContent='HTO career archive · '+date(sources.career?.capturedAt);
    return;
  }
  const rates=rows.map(historicalRate);
  const otherModes=['actual','winter','summer'].filter(mode=>mode!==state.rate);
  const overlays=state.compare?Object.fromEntries(otherModes.map(mode=>
    [mode,rows.map(row=>historicalRateFor(row,mode))])):{};
  const career=window.HockeyOSBioRollingCareer?.calculate(
    seg?.seasons||[],sources.formats,state.rate);
  const bySeason=new Map(career?.status==='SOURCE_CALCULATED'?
    career.entries.map(item=>[item.season,item]):[]);
  const benchmarks=rows.map(row=>state.baseline==='off'?null:
    state.baseline==='fixed'?career?.fullCareerRate??null:
    bySeason.get(row.Season)?.priorRate??null);
  const referenceVisible=benchmarks.some(num);
  $('bioCareerComparisonLegend').hidden=!referenceVisible;
  $('bioCareerComparisonLegendLabel').textContent=state.baseline==='fixed'?
    'Full-career P/GP (retrospective)':'Rolling prior-career P/GP';
  const high=Math.max(1,...rows.filter(r=>num(r.G)&&num(r.A)).map(r=>r.G+r.A));
  const maxRate=Math.max(.25,...rates.filter(num),...benchmarks.filter(num),
    ...Object.values(overlays).flat().filter(num));
  const maxG=Math.ceil(high*1.12),maxR=Math.max(.5,maxRate*1.18);
  const compact=window.innerWidth<=480;
  const width=compact?365:850,height=compact?248:300;
  const left=compact?32:50,right=compact?57:65,top=compact?29:23,bottom=compact?49:64;
  const plotW=width-left-right,plotH=height-top-bottom,baseline=height-bottom;
  const x=i=>left+(i+.5)*plotW/rows.length;
  const yCount=v=>baseline-(v/maxG)*plotH,yRate=v=>baseline-(v/maxR)*plotH;
  const picture=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img',
    'aria-label':'Actual goals and assists as season bars, and '+state.rate+' points per game as a separate-axis line'});
  picture.append(svg('title',{},'Actual goals and assists (left Y-axis) with separately scaled points per game (right Y-axis)'));
  picture.append(svg('line',{x1:width-right,x2:width-right,y1:top,y2:baseline,
    stroke:'#91d7ee','stroke-width':1.3,'data-axis':'pts-per-game'}));
  for(let tick=0;tick<=4;tick++){
    const level=tick/4,py=baseline-level*plotH;
    picture.append(svg('line',{x1:left,x2:width-right,y1:py,y2:py,stroke:'#294d69','stroke-width':1}));
    picture.append(svg('text',{x:left-8,y:py+4,fill:'#b6cada','text-anchor':'end','font-size':11},String(Math.round(level*maxG))));
    picture.append(svg('line',{x1:width-right,y1:py,x2:width-right+4,y2:py,
      stroke:'#91d7ee','stroke-width':1}));
    picture.append(svg('text',{x:width-4,y:py+4,fill:'#dcf5ff','font-size':compact?12:12,
      'font-weight':700,'text-anchor':'end','data-axis-tick':'pts-per-game'},(level*maxR).toFixed(2)));
  }
  picture.append(svg('text',{x:left,y:13,fill:'#bdcedf','font-size':11},'Goals + assists (actual)'));
  picture.append(svg('text',{x:width-4,y:13,fill:'#d9f4ff','font-size':12,
    'font-weight':750,'text-anchor':'end'},'Pts/GP'));
  const barW=Math.max(compact?9:7,Math.min(compact?20:25,plotW/rows.length*.62));
  const marks=[];
  const modeColors={actual:'#6de1ff',winter:'#54ead2',summer:'#caa4ff'};
  const primaryColor=modeColors[state.rate];
  // Historical season labels are colored against a VERIFIED prior-career
  // benchmark only. This is not the separate workbook projection hot/cold arrow.
  const seasonBand=(rate,benchmark)=>!num(rate)||!num(benchmark)?'unknown':
    rate>benchmark+.005?'above':rate<benchmark-.005?'below':'at';
  const bandLabelColor={above:'#ff748a',below:'#74baff',at:'#eaf4fd',unknown:'#eaf4fd'};
  function addInteractive(node,i,rate){
    node.setAttribute('data-bio-point',String(i));node.setAttribute('tabindex','0');
    node.setAttribute('role','button');node.setAttribute('aria-label',
      rows[i].Season+' actual goals/assists and '+(num(rate)?state.rate+' points per game':'unavailable adjusted rate'));
    node.addEventListener('click',()=>describeSeason(rows[i],rate,benchmarks[i]));
    node.addEventListener('focus',()=>describeSeason(rows[i],rate,benchmarks[i]));
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();describeSeason(rows[i],rate,benchmarks[i]);}});
    return node;
  }
  let segment=[];
  function flush(){
    if(segment.length>1)picture.append(svg('polyline',{
      points:segment.map(p=>p.join(',')).join(' '),fill:'none',stroke:primaryColor,
      'stroke-width':3.7,'stroke-linejoin':'round','stroke-linecap':'round',
      'data-series':'selected-points-per-game','data-selected-basis':state.rate}));
    segment=[];
  }
  const labelStroke={'paint-order':'stroke',stroke:'#0a263d','stroke-width':3,
    'stroke-linejoin':'round'};
  const barLabels=rows.length<=12;
  const barLabelY=new Map();
  rows.forEach((row,i)=>{
    const xc=x(i),rate=rates[i];
    if(num(row.G)&&num(row.A)){
      const gy=yCount(row.G), total=yCount(row.G+row.A);
      const goal=svg('rect',{x:xc-barW/2,y:gy,width:barW,height:Math.max(.1,baseline-gy),
        fill:'#c7445d',rx:1});
      const assist=svg('rect',{x:xc-barW/2,y:total,width:barW,
        height:Math.max(.1,gy-total),fill:'#d8b36c',rx:1});
      picture.append(addInteractive(goal,i,rate),addInteractive(assist,i,rate));
      if(barLabels){
        const font=compact?9.3:11;
        const positions=[];
        if(row.G>0){
          const gY=baseline-gy>=14?(baseline+gy)/2+3:baseline-6;
          picture.append(svg('text',{x:xc,y:gY,'text-anchor':'middle',
            'font-size':font,'font-weight':850,fill:'#fff7fa',
            'data-bar-label':'G','data-season':row.Season,...labelStroke},String(row.G)));
          positions.push(gY);
        }
        if(row.A>0){
          const aY=gy-total>=14?(gy+total)/2+3:total-6;
          picture.append(svg('text',{x:xc,y:aY,'text-anchor':'middle',
            'font-size':font,'font-weight':850,fill:'#fff9e8',
            'data-bar-label':'A','data-season':row.Season,...labelStroke},String(row.A)));
          positions.push(aY);
        }
        barLabelY.set(i,positions);
      }
      if(row.G===0&&row.A===0)picture.append(addInteractive(svg('circle',{cx:xc,cy:baseline-2,r:3.4,fill:'#d9b978'}),i,rate));
    }
    if(num(rate)){segment.push([xc,yRate(rate)]);marks.push({i,xc,yy:yRate(rate),rate});}
    else flush();
    const every=Math.max(1,Math.ceil(rows.length/9));
    if(i%every===0||i===rows.length-1)picture.append(svg('text',{
      x:xc,y:baseline+22,fill:'#b5c9da','font-size':compact?10:Math.max(9,rows.length>18?9:11),
      'text-anchor':'middle'},shortName(row.Season)));
    const awards=titleMarks(row.Season);
    awards.forEach((award,j)=>{
      // Show source-approved Rocket Richard/Art Ross as separate gold RR/AR medals.
      // In dense Career views badges shrink and retain full accessible titles.
      const crowded=rows.length>12,yy=baseline+37,
        dx=awards.length===2?(j===0?(crowded?-4.5:-7):(crowded?4.5:7)):0;
      const group=addInteractive(svg('g',{'data-award-type':award.type,
        'data-award-season':row.Season}),i,rate);
      group.setAttribute('aria-label',row.Season+': '+award.label+'. Open season details');
      group.append(svg('title',{},award.label+' · '+row.Season));
      group.append(svg('circle',{cx:xc+dx,cy:yy,r:crowded?5.0:7.0,
        fill:'#75532a',stroke:'#efcd88','stroke-width':1.15}));
      group.append(svg('text',{x:xc+dx,y:yy+2.6,'text-anchor':'middle',
        fill:'#fff2cb','font-size':crowded?5.5:6.7,'font-weight':900},
        award.type==='goalTitle'?'RR':'AR'));
      picture.append(group);
    });
  });
  // Optional multiple rate lines, each with its own color and distinct
  // stroke pattern on ONE source-qualified points-per-game Y axis. Raw
  // goals/assists bars remain unmodified.
  if(state.compare){
    for(const mode of otherModes){
      const ratesForMode=overlays[mode]||[],pts=[];
      const append=()=>{
        if(pts.length>1)picture.append(svg('polyline',{points:pts.join(' '),
          fill:'none',stroke:modeColors[mode],'stroke-width':1.9,
          'stroke-dasharray':mode==='winter'?'6 4':'2 4',
          'stroke-linecap':'round','stroke-linejoin':'round',
          'data-series':'comparison-points-per-game','data-comparison-basis':mode}));
        pts.length=0;
      };
      ratesForMode.forEach((value,i)=>{
        if(num(value)){pts.push(x(i).toFixed(2)+','+yRate(value).toFixed(2));}
        else append();
      });
      append();
    }
  }
  const legend=$('bioOverlayLegend');
  legend.replaceChildren();legend.hidden=!state.compare;
  if(state.compare){
    for(const mode of ['actual','winter','summer']){
      const key=build('span',mode==='actual'?'Actual P/GP':mode==='winter'?'Winter-eq P/GP':'Summer-eq P/GP',
        'bio-overlay-key');
      key.style.setProperty('--key-color',modeColors[mode]);
      key.dataset.mode=mode;key.dataset.active=String(mode===state.rate);
      legend.append(key);
    }
  }
  // Compare current season P/GP to the rate entering that season, never future
  // seasons. A separate optional full-career line is clearly labelled retrospective.
  if(referenceVisible){
    const segments=[],pts=[];
    function addSegment(){
      if(pts.length>=2){
        picture.append(svg('polyline',{points:pts.join(' '),fill:'none',
          stroke:'#e2e9f2','stroke-width':2,'stroke-dasharray':'5 4',
          'stroke-linecap':'round','data-series':state.baseline==='fixed'?'fixed-career-average':'rolling-prior-career-average'}));
        segments.push(pts.length);
      }
      pts.length=0;
    }
    for(let i=0;i<rows.length;i++){
      const value=benchmarks[i];
      if(num(value)){
        const xc=x(i),cy=yRate(value);
        pts.push(xc.toFixed(2)+','+cy.toFixed(2));
        if(pts.length===1){
          picture.append(svg('circle',{cx:xc,cy,r:2.4,
            fill:'#e2e9f2','data-comparison-season':rows[i].Season}));
        }
      }else addSegment();
    }
    addSegment();
  }
  flush();
  for(const m of marks){
    const band=seasonBand(m.rate,benchmarks[m.i]);
    picture.append(addInteractive(svg('circle',{cx:m.xc,cy:m.yy,r:4.4,
      fill:primaryColor,stroke:'#0b233b','stroke-width':1.5,
      'data-rate-point':state.rate,'data-performance':band}),m.i,m.rate));
    const show=rows.length<=12||m.i%2===0||m.i===rows.length-1;
    if(show){
      const rawRow=rows[m.i],barYs=barLabelY.get(m.i)||[];
      const candidates=[m.yy-13,m.yy+21,m.yy-27,m.yy+33];
      const near=(y,arr)=>arr.reduce((min,b)=>Math.min(min,Math.abs(y-b)),999);
      const bounded=y=>Math.max(top+16,Math.min(baseline-10,y));
      const possible=candidates.map(y=>bounded(y));
      const y=possible.sort((a,b)=>{
        const score=y=>{
          const distance=near(y,barYs);
          const penalty=distance<14?100-(distance*6):0;
          return penalty+Math.abs(y-m.yy)*.35;
        };
        return score(a)-score(b);
      })[0];
      const widthLabel=compact?31:35,heightLabel=16;
      picture.append(svg('rect',{x:m.xc-widthLabel/2,y:y-12,
        width:widthLabel,height:heightLabel,rx:4,
        fill:'#0e2c43',stroke:primaryColor,'stroke-width':.8,
        'data-rate-chip':state.rate,'data-season':rawRow.Season}));
      picture.append(svg('text',{x:m.xc,y,
        'font-size':compact?10.1:11.5,'font-weight':900,'text-anchor':'middle',
        fill:bandLabelColor[band],'data-rate-label':state.rate,
        'data-performance':band,'data-season':rawRow.Season,...labelStroke},m.rate.toFixed(2)));
    }
  }
  chart.append(picture);
  renderAwardKey(rows);
  const first=rows.length-1;describeSeason(rows[first],rates[first],benchmarks[first]);
  $('bioChartSource').textContent='Rolling prior career uses ONLY earlier complete, GP-weighted seasons; the current season is never included in its own benchmark. Fixed full-career is retrospective. Unknown prior results hold the comparison. '+ 'Official HTO career archive captured '+date(sources.career?.capturedAt)+
    ' · Raw goals/assists never change · '+(state.rate==='actual'?'Unadjusted rate.':
    rates.some(num)?'Game-duration class verified for 18 original Master Schedule seasons; HTO source totals remain unchanged.':'No qualified adjusted rate for the selected seasons; raw bars remain.');
  $('bioRateStatus').textContent=state.rate==='actual'?'Actual points per game':
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
function paintProjectionTrend(row,projection){
  const host=$('bioProjectionTrend'),detail=$('bioProjectionTrendDetail');
  host.replaceChildren();detail.textContent='';
  host.dataset.trendState='HELD';
  host.className='bio-trend-summary';
  const result=window.HockeyOSBioProjectionTrend?.classify(row,projection)||{status:'HELD'};
  if(result.status==='VERIFIED_MODEL_TREND'){
    host.dataset.trendState=result.name;
    host.classList.add('bio-trend-ready','bio-trend-'+result.name.toLowerCase());
    const direction=window.HockeyOSBioProjectionTrend?.directionalArrow(row,projection);
    if(direction?.status==='VERIFIED_STANDARD_DEVIATION_ARROW'){
      host.dataset.trendDirection=direction.direction;
      const graphic=svg('svg',{viewBox:'0 0 100 64',class:'bio-trend-direction-arrow',role:'img',
        'aria-label':result.name+' · '+direction.zScore.toFixed(2)+
          ' standard deviations; '+direction.direction.toLowerCase()+' career baseline'});
      graphic.append(svg('title',{},'Career performance '+(result.relativeChange*100).toFixed(1)+
        '%, '+direction.zScore.toFixed(2)+' standard deviations from zero.'));
      const angle=direction.renderRotationDegrees.toFixed(3);
      const arrowShape='M11 25H60V14L89 32L60 50V39H11Z';
      const group=svg('g',{transform:'rotate('+angle+' 50 32)',
        'data-arrow-angle':direction.angleDegrees.toFixed(4),
        'data-z-score':direction.zScore.toFixed(4)});
      group.append(svg('path',{d:arrowShape,fill:'#061a2d',stroke:'#93aac1',
        'stroke-width':3.8,'stroke-linejoin':'round',opacity:.8}));
      group.append(svg('path',{d:arrowShape,fill:direction.color,
        stroke:'#eff6fc','stroke-width':.9,'stroke-linejoin':'round'}));
      group.append(svg('path',{d:'M19 30H58',fill:'none',stroke:'#ffffff',
        'stroke-opacity':.38,'stroke-width':2,'stroke-linecap':'round'}));
      graphic.append(group);host.append(graphic);
    }
    const label=build('div',undefined,'bio-trend-copy');
    const signed=(result.relativeChange>0?'+':'')+(result.relativeChange*100).toFixed(1)+'%';
    label.append(build('strong',result.name+' · '+signed,'bio-trend-main'),
      build('span','Projected season-finish trend vs career · '+
        (result.modelCurrent?'model reconciled':'provisional workbook model'),'bio-trend-minor'));
    host.append(label);
    detail.textContent='Original workbook trend: '+result.name+
       '. Historical career regular-season scoring rate '+
       (num(result.careerRate)?fmtRate(result.careerRate):'unavailable')+
       ' P/GP; projected scoring-rate component '+
       (num(result.modelComponentRate)?fmtRate(result.modelComponentRate):'unavailable')+
       ' P/GP; career relative change '+signed+
       '. The model trend component is distinct from the displayed full-season projected P/GP.';
  }else{
    host.dataset.trendState=result.status;
    const label=build('div',undefined,'bio-trend-copy');
    if(result.status==='ROOKIE'){
      // Founder-approved rookie state: white horizontal neutral symbol, not a
      // calculated trend. No angle, z-score, % change or invented career baseline.
      const graphic=svg('svg',{viewBox:'0 0 100 64',class:'bio-trend-direction-arrow',
        role:'img','aria-label':'Neutral display marker for rookie year; no established career comparison'});
      const shape='M11 25H60V14L89 32L60 50V39H11Z';
      graphic.append(svg('path',{d:shape,fill:'#f7fbff',stroke:'#91a7b8',
        'stroke-width':1.5,'stroke-linejoin':'round','data-rookie-neutral':'true'}));
      host.append(graphic);
      label.append(build('strong','Neutral · Rookie Year','bio-trend-main'),
        build('span','No career baseline · forecast remains provisional','bio-trend-minor'));
      detail.textContent='Neutral rookie display state only. No model career baseline or statistical comparison is available.';
    }else{
      label.append(build('strong','Career trend unavailable','bio-trend-main'),
        build('span','The workbook trend is not source verified','bio-trend-minor'));
      detail.textContent='No verified workbook career trend. No arrow or comparison has been inferred.';
    }
    host.append(label);
  }
}

function renderSkaterProjection(){
  const section=$('bioProjectionSection');
  state.hasProjection=false;
  const target=$('bioProjectionCards');target.replaceChildren();
  const hold=$('bioProjectionHold');hold.hidden=true;
  $('bioCareerModelStrip').hidden=true;
  $('bioForecastBadge').textContent='SOURCE HELD';
  $('bioForecastBadge').dataset.provisional='true';
  const projection=sources.projection;
  const profiles=validateProjection(projection);
  const row=profiles?.get(state.player);
  if(!profiles){
    hold.hidden=false;hold.textContent='No verified projection source is available.';
    $('bioProjectionState').textContent='Shared homepage model data could not be verified. No substitute forecast generated.';
    $('bioProjectionHeadline').textContent='Forecast unavailable';
    paintProjectionTrend(null,null);
    sourceLabel('Model source unavailable');
    return;
  }
  if(!row){
    hold.hidden=false;hold.textContent='No forecast published for this player.';
    $('bioProjectionState').textContent='No model-published projection is available for this verified player. This is not a prediction of zero.';
    $('bioProjectionHeadline').textContent='No model-published forecast for this player';
    paintProjectionTrend(null,projection);
    sourceLabel(projection.season+' · model '+date(projection.exportedAt));
    return;
  }
  state.hasProjection=true;
  const baseline=$('bioCareerModelStrip');
  const careerRate=row.trendInputs?.careerScoringRate;
  const established=typeof careerRate==='number'&&Number.isFinite(careerRate)&&careerRate>=0&&row.trendInputs?.firstSeasonOrNoCareer!==true;
  if(established){
    baseline.hidden=false;
    $('bioCareerModelRate').textContent=fmtRate(careerRate);
    $('bioCareerModelBasis').textContent='Summer + Winter history · '+(String(projection.season).startsWith('S')?'Summer':'Winter')+'-equivalent';
  }
  const provisional=projection.modelCurrent!==true||projection.projectionComplete!==true;
  paintProjectionTrend(row,projection);
  $('bioForecastBadge').textContent=provisional?'PROVISIONAL':'MODEL CURRENT';
  $('bioForecastBadge').dataset.provisional=String(provisional);
  $('bioProjectionHeadline').textContent='Full regular-season projection · '+
    (provisional?'source reconciliation pending':'workbook model')+
    ' · separate from the player’s actual season-to-date rate.';
  $('bioProjectionState').textContent=provisional?
    'Provisional scenario · model reconciliation pending. Same workbook forecast as the homepage; not certified current-season totals.':
    'Reconciled workbook-derived season forecast, separate from official actuals.';
  setMetrics(target,[['GP',fmtProjectedGP(row.gp)],['G',fmt(row.g)],['A',fmt(row.a)],
      ['PTS',fmt(row.pts)],['PTS/GP',fmtRate(row.ptsPerGame)]],true);
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
    ['2026/27 GA / appearance',latest&&num(latest.GAA)?fmtRate(latest.GAA):'Unavailable']
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
    const list=[['Expected starts',fmtProjectedGP(result.forecast.starts)],['Expected wins',fmt(result.forecast.wins)],
      ['Projected GA/game',fmtRate(result.forecast.goalsAgainstPerAppearance)]];
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
    if(num(r.W)&&r.W>0){
      picture.append(interactive(svg('rect',{x:xc-barW/2,y:yWins(r.W),width:barW,height:b-yWins(r.W),fill:'#d1ac68',rx:2}),i));
      picture.append(svg('text',{x:xc,y:Math.max(top+11,yWins(r.W)-7),
        'text-anchor':'middle',fill:'#f2dba5','font-size':10,
        'font-weight':850,'data-goalie-wins-label':r.Season},String(r.W)));
    }
    if(num(r.GAA))dots.push({x:xc,y:yGaa(r.GAA),i});
    const skip=Math.max(1,Math.ceil(rows.length/9));
    if(i%skip===0||i===rows.length-1)picture.append(svg('text',{x:xc,y:b+20,'text-anchor':'middle',fill:'#b9cddc','font-size':10},shortName(r.Season)));
  });
  if(dots.length>1)picture.append(svg('polyline',{points:dots.map(d=>d.x+','+d.y).join(' '),stroke:'#a6d9ea','stroke-width':3,fill:'none','stroke-linejoin':'round'}));
  for(const d of dots){
    picture.append(interactive(svg('circle',{cx:d.x,cy:d.y,r:5,fill:'#a8d9ea',stroke:'#0b233b','stroke-width':1.5}),d.i));
    picture.append(svg('text',{x:d.x,y:d.y>top+25?d.y-12:d.y+18,
      fill:'#d7f3ff','text-anchor':'middle','font-size':9.3,'font-weight':850,
      'paint-order':'stroke',stroke:'#09233a','stroke-width':3,
      'data-goalie-gaa-label':rows[d.i].Season},rows[d.i].GAA.toFixed(2)));
  }
  target.append(picture);describe(rows.length-1);
}
function renderCoachingPosition(){
  const bank=window.HockeyOSBioCoachingRoles;
  const target=$('bioPositionResponse'),controls=$('bioPositionModes');
  target.replaceChildren();
  for(const btn of controls.querySelectorAll('button[data-position]')){
    const chosen=btn.dataset.position===state.coachingPosition;
    btn.setAttribute('aria-pressed',String(chosen));
    btn.classList.toggle('selected',chosen);
  }
  const role=bank?.explore(state.coachingPosition);
  if(role?.status!=='GENERAL_TEAM_STRATEGY_ONLY'){
    const empty=build('div',undefined,'bio-role-prompt');
    empty.append(build('strong','Choose a position to explore','bio-role-heading'),
      build('p','C · RW · LW · LD · RD. These are general positional responsibilities, not verified player assignments.','bio-role-subtitle'));
    target.append(empty);return;
  }
  const heading=build('div',undefined,'bio-role-header');
  heading.append(build('strong',role.code+' · '+role.title,'bio-role-heading'),
    build('span',role.area,'bio-role-subtitle'));
  target.append(heading);
  const grid=build('div',undefined,'bio-role-guidance-grid');
  for(const [key,title] of [['withPuck','With the puck'],['withoutPuck','Without the puck'],['transition','Recovery and transition']]){
    const card=build('article',undefined,'bio-coach-instruction');
    card.append(build('span',title,'bio-coach-instruction-title'),
      build('p',role[key],'bio-coach-instruction-body'));
    grid.append(card);
  }
  target.append(grid);
  target.append(build('div','Coaching cue: '+role.cue,'bio-role-cue'));
}
function renderCoaching(){
  const bank=window.HockeyOSBioCoachingRoles;
  const controls=$('bioPositionModes');controls.replaceChildren();
  if(bank?.sourceScope!=='GENERAL_1_2_2_TEAM_FRAMEWORK_NO_PRIVATE_COACHING'){
    $('bioPositionResponse').textContent='General team framework temporarily unavailable.';
    $('bioCoachSource').textContent='No player-specific instructions were inferred.';
    return;
  }
  const allowed=['C','RW','LW','LD','RD','G'];
  for(const code of allowed){
    const item=bank.positions[code];
    if(!item)continue;
    const btn=build('button',code,'bio-position-button');
    btn.type='button';btn.dataset.position=code;btn.title=item.title;
    btn.setAttribute('aria-pressed',String(code===state.coachingPosition));
    controls.append(btn);
  }
  const isGoalieOnly=state.isGoalie&&!state.isSkater;
  const lineage=window.BraveGameNightContract;
  const lookup=window.BravePlayerLinks?.identityById;
  const approved=lineage?.confirm(sources.gameLineup,sources.gameCountdown,
    typeof lookup==='function'?id=>lookup(Number(id)):null,new Date().toISOString());
  const assignment=lineage?.assignmentForPlayer(approved,state.player)||null;
  const assignmentCard=$('bioApprovedGameAssignment');
  assignmentCard.hidden=!assignment;
  if(assignment){
    $('bioApprovedGameRole').textContent='GAME-NIGHT ASSIGNMENT · '+assignment.unit+' · '+assignment.position;
    $('bioApprovedGameFixture').textContent=assignment.gameDate+' vs. '+assignment.opponent;
    state.coachingPosition=assignment.position;
  }
  // Being a verified goalie is sufficient to show general goalie instruction.
  // A skater's exact C/W/D game-night position is NOT source verified here.
  if(state.coachingPosition===null&&isGoalieOnly)state.coachingPosition='G';
  renderCoachingPosition();
  $('bioCoachSource').textContent=assignment?
    'The position shown above comes from a verified, manager-approved public lineup. These coaching tips remain general, not personal instructions.':
    isGoalieOnly?'Verified HTO goalie role · these are general tips, not a game-night assignment.':
    'Public HTO career data verifies skater status, not the player’s current C/RW/LW/LD/RD assignment.';
  $('bioCoachingContext').textContent='Team strategy: Brave H.C. 1–2–2. Opponent-player assignments require matched game data and a coach-approved lineup.';
  $('coachingState').textContent='Individualized skill plans, position history, opponent-specific clips and reviewed video require private authenticated, coach-approved development records. No personal coaching is published here.';
}
function percent(value,decimals=0){return num(value)?(value*100).toFixed(decimals)+'%':'Unavailable';}
function decimal(value,dp=2){return num(value)?value.toFixed(dp):'Unavailable';}
function insight(container,title,value,description){
  const tile=build('article',undefined,'bio-insight-tile');
  tile.append(metricIcon(title),build('div',value,'bio-insight-value'),build('div',title,'bio-insight-title'),
    build('div',description,'bio-insight-description'));
  container.append(tile);
}
function extra(container,label,value){
  if(value===null||value===undefined||value==='Unavailable')return;
  const tile=build('div',undefined,'bio-extra-metric');
  tile.append(metricIcon(label),build('strong',value),build('span',label));container.append(tile);
}
function renderAdvancedMetrics(player){
  const engine=window.HockeyOSBioAdvanced;
  const wanted=state.active==='goaltending'?'goalie':state.isSkater?'skater':'goalie';
  const seg=player?.segments?.find(s=>s.kind===wanted);
  const target=$('bioAdvancedGrid'),more=$('bioSecondaryMetrics');
  target.replaceChildren();more.replaceChildren();
  target.classList.remove('one-stat');
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
    // The headline rate uses the SAME Actual / Winter / Summer time basis as
    // the chart's Pts/GP line. Never show a Winter-only career value next to
    // an Actual chart without an explicit basis change.
    const rolling=window.HockeyOSBioRollingCareer?.calculate(
      seg.seasons||[],sources.formats,state.rate);
    const full=rolling?.status==='SOURCE_CALCULATED'&&rolling.complete&&
      num(rolling.fullCareerRate);
    const candidate=engine.verifiedSeasons(seg,'skater').valid
      .filter(r=>num(engine.factor(r.Season,sources.formats,state.rate)));
    const verifiedRate=engine.rate(candidate,'Pts',state.rate,sources.formats);
    const shownRate=full?rolling.fullCareerRate:verifiedRate;
    const basisLabel=state.rate==='actual'?'actual':
      state.rate==='winter'?'Winter-equivalent':'Summer-equivalent';
    const gameLength=state.rate==='winter'?' · 32-minute basis':
      state.rate==='summer'?' · 48-minute basis':'';
    insight(target,full?'Career scoring pace':'Verified-season scoring pace',
      decimal(shownRate),
      (full?'All source-complete seasons':'Available complete-scoring seasons only')+
      ' · '+basisLabel+' P/GP'+gameLength);
    extra(more,'Share of actual career points from goals',percent(o.goalsShare));
    // This belongs in the Trends collection, not a duplicate Overview tile.

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
    extra(more,'Recorded shutouts per 100 goalie appearances',decimal(o.shutoutPer100,1));
    extra(more,'Actual recorded goals against per appearance',decimal(o.publishedActualGAA));
    extra(more,'Player of the Game awards per 100 goalie GP',decimal(o.playerOfGamePer100,1));
  }
  target.classList.toggle('one-stat',target.querySelectorAll('.bio-insight-tile').length===1);
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
      const cx=x(i),cy=y(r.normalized);
      picture.append(svg('circle',{cx,cy,r:4.5,fill:'#f1cb88',stroke:'#0b233b','stroke-width':1.5}));
      const above=cy>top+24;
      picture.append(svg('text',{x:cx,y:above?cy-11:cy+17,
        'text-anchor':'middle','font-weight':900,fill:'#f4e8cd',
        'font-size':window.innerWidth<=480?10.5:12,
        'data-trend-point-label':r.Season,
        'paint-order':'stroke',stroke:'#0b263e','stroke-width':3},r.normalized.toFixed(2)));
      picture.append(svg('text',{x:cx,y:height-bottom+17,'text-anchor':'middle',fill:'#c4d8e8',
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
    $('bioProjectionFull').open=false;
    $('bioMoreSeasonFilters').open=false;
    $('bioMoreSeasonFilters').querySelector('summary').textContent='More';
    state.active='production';
    state.rate='actual';state.filter='recent';state.baseline='rolling';state.compare=false;state.coachingPosition=null;
    $('bioOverlayModes').setAttribute('aria-pressed','false');
    $('bioOverlayHint').textContent='One line selected · additional formats optional';
    for(const b of $('bioCareerComparisonModes').querySelectorAll('button[data-mode]')){
      b.setAttribute('aria-pressed',String(b.dataset.mode===state.baseline));
    }
    for(const group of ['bioRateModes','bioSeasonModes']){
      const current=group==='bioRateModes'?state.rate:state.filter;
      for(const b of $(group).querySelectorAll('button[data-mode]')){
        b.setAttribute('aria-pressed',String(b.dataset.mode===current));
      }
    }
  }
  $('bioTabs').hidden=false;document.body.classList.add('bio-premium-ready');
  $('playerMeta').textContent='Season Outlook · Career Trends · Coaching';
  $('bioContext').textContent='HTO verified player #'+pid+' · '+(state.isGoalie&&state.isSkater?'Dual role':state.isGoalie?'Goaltender':'Skater');
  $('bioSpotlight').hidden=!state.isSkater;
  if(state.isSkater)renderChart();
  if(state.isSkater)renderSkaterProjection();
  if(state.isGoalie)renderGoalie();
  renderAdvancedMetrics(p);
  renderDevelopment(p);
  renderCoaching();
  if(!['production','trends','coaching'].includes(state.active))state.active='production';
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
  upcoming:inputs[7].status==='fulfilled'?inputs[7].value:null,
  titles:inputs[8].status==='fulfilled'?inputs[8].value:null,
  gameLineup:inputs[9].status==='fulfilled'?inputs[9].value:null,
  gameCountdown:inputs[10].status==='fulfilled'?inputs[10].value:null};
setupTabs();
const content=$('profileContent');
// Only source-approved PUBLIC game-night assignments are refreshed. WhatsApp
// named votes and private lineup drafts never enter this public Bio process.
let lineupRefreshActive=false;
async function refreshGameNightLineup(){
  // Bio-only track: no installed Game Night contract or approved assignment feed.
  if(!window.BraveGameNightContract)return;
  if(lineupRefreshActive)return;
  lineupRefreshActive=true;
  try{
    const result=await Promise.allSettled([
      getJSON('game-night-lineup-public.json'),getJSON('countdown.json')
    ]);
    sources.gameLineup=result[0].status==='fulfilled'?result[0].value:null;
    sources.gameCountdown=result[1].status==='fulfilled'?result[1].value:null;
    if(!content.hidden&&state.player)renderCoaching();
  }catch{
    sources.gameLineup=null;
    if(!content.hidden&&state.player)renderCoaching();
  }finally{lineupRefreshActive=false;}
}
setInterval(refreshGameNightLineup,60_000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshGameNightLineup();});
window.addEventListener('focus',refreshGameNightLineup);
const observer=new MutationObserver(()=>{if(!content.hidden)renderPlayer();});
observer.observe(content,{attributes:true,attributeFilter:['hidden']});
$('playerChoice').addEventListener('change',()=>setTimeout(renderPlayer,0));
if(!content.hidden)renderPlayer();
})();
