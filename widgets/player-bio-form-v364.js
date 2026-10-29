/* HockeyOS V3.6.4 â€” scoring form with strict full-appearance evidence gates.
   Career and current-season HTO sources may be published independently of the
   held last-3/5/10 game windows. Never convert missing events to zero games. */
(async function(){
 'use strict';
 const section=document.getElementById('bioRecentFormSection');
 if(!section)return;
 const grid=document.getElementById('bioRecentFormGrid');
 const status=document.getElementById('bioRecentFormStatus');
 const model=window.HockeyOSBioFormV364;
 const visual=window.HockeyOSBioTrendVisualV36;
 const adaptive=window.HockeyOSAdaptiveTrendV365;
 const resolver=window.BravePlayerLinks?.profileUrl;
 const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const iso=d=>{const t=Date.parse(d||'');return Number.isFinite(t)?
   new Date(t).toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'}):'source date unavailable'};
 const asID=name=>{
  if(typeof resolver!=='function'||typeof name!=='string')return null;
  try{return new URL(resolver(name)).searchParams.get('playerID');}catch{return null;}
 };
 let sources=null;
 const get=async name=>{const r=await fetch('./'+name,{cache:'no-store'});if(!r.ok)throw Error('source unavailable');return r.json();};
 function card(title,result,desc,trend=null,baseline=false){
  const el=document.createElement('article');el.className='bio-form-card';
  const accepted=result?.status==='VERIFIED';
  el.dataset.sourceStatus=accepted?'VERIFIED':'HELD';
  const h=document.createElement('strong');h.className='bio-form-title';h.textContent=title;
  const value=document.createElement('strong');value.className='bio-form-value';
  value.textContent=accepted?result.rate.toFixed(2):'â€”';
  const unit=document.createElement('span');unit.className='bio-form-label';unit.textContent='PTS / GP';
  const badgeBox=document.createElement('div');
  badgeBox.className='bio-form-badge-slot';
  let badge=null;
  if(baseline&&accepted&&trend?.status==='VERIFIED'){
   badge=adaptive?.badge(document,{status:'VERIFIED',level:'NEUTRAL',percentage:0,
     angle:90,dispersion:trend.dispersion,mode:trend.mode},visual,'CAREER_BASELINE');
   if(badge){badge.classList.add('bio-form-icon');badge.querySelector('svg')?.setAttribute('aria-label','Career comparison baseline');}
  }else if(accepted&&trend?.status==='VERIFIED'){
   badge=adaptive?.badge(document,trend,visual,'FORM_NOT_WORKBOOK');
   if(badge)badge.classList.add('bio-form-icon');
  }
  if(badge)badgeBox.append(badge);
  else{const hold=document.createElement('span');hold.className='bio-form-held-icon';
    hold.textContent='â€”';hold.setAttribute('aria-label',accepted?'Comparison not available':'No verified scoring rate');badgeBox.append(hold);}
  const level=document.createElement('span');level.className='bio-form-level';
  level.textContent=baseline?'BASELINE':badge?.dataset.visualLevel||
    (accepted?'COMPARISON HELD':'SOURCE HELD');
  const note=document.createElement('small');note.className='bio-form-label';note.textContent=desc;
  el.append(h,value,unit,badgeBox,level,note);grid.append(el);
 }
 function render(){
  const id=String(document.getElementById('playerChoice')?.value||
    new URLSearchParams(location.search).get('playerID')||'');
  grid.replaceChildren();
  if(!id||!sources){status.textContent='Waiting for source-qualified player profile.';return;}
  const {projection,feed,career,appearances,dispersion}=sources;
  const identity=career?.players?.[id];
  const match=identity?.status==='VERIFIED_PROFILE_CAREER_SUM_PARITY'&&
    window.BravePlayerLinks?.identityById(Number(id))?.name===identity.name;
  const candidates=projection?.players?.filter(p=>asID(p.name)===id)||[];
  const forecast=projection?.schema==='brave-hc-workbook-projection/v1'&&
    projection.model==='BravesRegularSeasonProjection'&&match&&candidates.length===1?candidates[0]:null;
  const careerRate=forecast?.trendInputs?.firstSeasonOrNoCareer!==true&&
    good(forecast?.trendInputs?.careerScoringRate)&&forecast.trendInputs.careerScoringRate>0?
    forecast.trendInputs.careerScoringRate:null;
  const calibrated=adaptive?.validate(dispersion,projection);
  const reference=careerRate!==null;
  const baseline=reference?{status:'VERIFIED',rate:careerRate}:{status:'HELD'};
  card('CAREER',baseline,reference?'Historical Winter-equivalent comparison pace':'Career comparison unavailable',
    calibrated?.status==='VERIFIED'?{status:'VERIFIED',dispersion:calibrated.scale,mode:calibrated.mode}:null,true);
  const rows=match&&feed?.schema==='brave-hc-hto-player-actuals/v1'&&
     feed.status==='VERIFIED_HTO_CURRENT'&&Array.isArray(feed.players)?
     feed.players.filter(p=>asID(p.name)===id):[];
  const observation=rows.length===1?rows[0]:null;
  const current=observation?model?.currentRate(observation,feed.teamGP):{status:'HELD'};
  const compareResult=(r)=>reference&&r?.status==='VERIFIED'?
    adaptive?.compareRate(r.rate,careerRate,dispersion,projection)||{status:'HELD'}:{status:'HELD'};
  card('CURRENT SEASON',current,current?.status==='VERIFIED'?
     current.gp+' verified GP Â· HTO '+iso(feed.asOf):'Current HTO rate unavailable',compareResult(current));
  for(const count of [3,5,10]){
   const r=observation?model?.getRecentWindow(appearances,id,feed.season,observation,count):{status:'HELD'};
   card('LAST '+count+' GAMES',r,r?.status==='VERIFIED'?
      count+' individually verified appearances':
      'Awaiting complete game-appearance log',compareResult(r));
  }
  status.textContent='Current season: official HTO individual season totals. '+
     'Career reference: published Winter-equivalent history. '+
     'Last 3 / 5 / 10 P/GP are held until each game, including zero-point appearances, is source-verified. '+
     'Adaptive trend badges use qualified team career-relative dispersion and describe rates, not official workbook classifications or lineup recommendations. '+
     (calibrated?.mode==='HISTORICAL_REFERENCE_ONLY'?'Historical-reference calibration; current model reconciliation held.':'');
 }
 try{
  const results=await Promise.allSettled([
   get('player-career-insights.json'),get('projection.json'),
   get('player-actuals-hourly.json'),get('player-form-appearances-v364.json'),
     get('hockeyos-team-dispersion-v365.json')
  ]);
  sources={career:results[0].status==='fulfilled'?results[0].value:null,
    projection:results[1].status==='fulfilled'?results[1].value:null,
    feed:results[2].status==='fulfilled'?results[2].value:null,
    appearances:results[3].status==='fulfilled'?results[3].value:null,
     dispersion:results[4].status==='fulfilled'?results[4].value:null};
  render();
  document.getElementById('playerChoice')?.addEventListener('change',()=>setTimeout(render,0));
  const main=document.getElementById('profileContent');
  if(main)new MutationObserver(()=>{if(!main.hidden)render()}).observe(main,{attributes:true,attributeFilter:['hidden']});
 }catch(e){grid.replaceChildren();status.textContent='Recent scoring form unavailable: verified sources could not be loaded.';}
})();
