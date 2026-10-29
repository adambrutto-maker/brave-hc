/* HockeyOS ENG61 — auditable team career-relative dispersion panel.
   Historical-only outputs are never mislabeled as live current form. */
(async function(){
 'use strict';
 const targets=[
  document.getElementById('bioTeamDispersion'),
  document.getElementById('homeTeamDispersion')
 ].filter(Boolean);
 if(!targets.length)return;
 const label=(value)=>typeof value==='number'&&Number.isFinite(value)?
  (value*100).toFixed(1)+'%':'—';
 const signed=value=>typeof value==='number'&&Number.isFinite(value)?
  (value>=0?'+':'')+(value*100).toFixed(1)+'%':'—';
 const mk=(tag,cls,txt)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;return el;
 };
 function draw(target,doc,projection){
  target.replaceChildren();
  const test=window.HockeyOSAdaptiveTrendV365?.validate(doc,projection);
  if(test?.status!=='VERIFIED'){
   target.dataset.status='HELD';
   const summary=document.getElementById('homeTeamDispersionSummary');
   if(target.id==='homeTeamDispersion'&&summary)summary.textContent='Team Dispersion · Source Held';
   target.append(mk('p','team-dispersion-source-held',
     'Team Dispersion source held: '+(test?.reason||'calibration unavailable')+
     '. No adaptive labels have been inferred.'));
   return;
  }
  const historical=doc.historical,current=doc.current,effective=doc.effective;
  const currentValid=current?.status==='CURRENT_VERIFIED';
  target.dataset.status=doc.status;
  const homeSummary=document.getElementById('homeTeamDispersionSummary');
  if(target.id==='homeTeamDispersion'&&homeSummary)
    homeSummary.textContent='Team Dispersion '+label(doc.effective.dispersion)+' · '+
      (doc.status==='HISTORICAL_REFERENCE_ONLY'?'Historical reference (current held)':'Live-qualified adaptive scale');
  target.dataset.dispersion=String(effective.dispersion);
  const top=mk('div','team-dispersion-top');
  top.append(mk('strong','team-dispersion-title','Team Career-Relative Dispersion'));
  const state=mk('span','team-dispersion-state',
    currentValid?'LIVE MODEL RECONCILED':'HISTORICAL REFERENCE ONLY');
  state.dataset.live=String(currentValid);top.append(state);target.append(top);
  const grid=mk('div','team-dispersion-grid');
  const cards=[
   ['Historical typical deviation',label(historical.dispersion),'30 qualified historical players, player-balanced'],
   ['Current typical deviation',currentValid?label(current.dispersion):'—',
    currentValid?'Qualified verified current forecasts':'Held: forecast provisional or unreconciled'],
   ['Current player spread',currentValid?label(current.playerToPlayerMAD):'—',
    'Median deviation from the current team median'],
   ['Team direction',currentValid?signed(current.teamMedianDirection):'—',
    'Signed median relative to individual career baselines'],
   ['Effective display scale',label(effective.dispersion),
    currentValid?'Confidence-weighted historical + current':'Historical reference, no current weight'],
   ['Qualified current cohort',currentValid?current.qualifiedPlayers+' players':'—',
    currentValid?current.qualifiedPlayerGP+' verified player GP':'Current team calibration held']
  ];
  for(const [name,value,detail] of cards){
   const card=mk('article','team-dispersion-metric');
   card.append(mk('span','team-dispersion-label',name),
     mk('strong','team-dispersion-value',value),mk('small','team-dispersion-detail',detail));
   grid.append(card);
  }
  target.append(grid);
  const t=effective.thresholds;
  target.append(mk('p','team-dispersion-boundaries',
    'Adaptive bands: COLD ≤ '+signed(-t.cold)+' · COOL · NEUTRAL '+signed(-t.neutral)+
    ' to '+signed(t.neutral)+' · WARM · HOT ≥ '+signed(t.hot)+'.'));
  const status=mk('p','team-dispersion-provenance',
    'Evidence: '+historical.effectiveSample.independentPlayers+' independent players / '+
    historical.effectiveSample.qualifiedPlayerSeasons+' historical player-seasons. '+
    'Current update weight '+Math.round(effective.weight*100)+'%. '+
    'Last source snapshot '+(doc.generatedAt||'unavailable')+'. '+
    'Historical completed seasons are not certified in-season forecast backtests. '+
    (currentValid?'Current forecast accepted.':'Current model update held: '+(current?.reason||'source unavailable')+'.'));
  target.append(status);
 }
 try{
  const [projectionResponse,dispersionResponse]=await Promise.all([
   fetch('./projection.json',{cache:'no-store'}),
   fetch('./hockeyos-team-dispersion-v365.json',{cache:'no-store'})
  ]);
  if(!projectionResponse.ok||!dispersionResponse.ok)throw Error('SOURCE_UNAVAILABLE');
  const [projection,doc]=await Promise.all([projectionResponse.json(),dispersionResponse.json()]);
  targets.forEach(t=>draw(t,doc,projection));
 }catch(err){
  targets.forEach(t=>{
   t.dataset.status='HELD';t.replaceChildren(mk('p','team-dispersion-source-held',
    'Team Dispersion held: verified source artifacts are unavailable.'));
  });
 }
})();
