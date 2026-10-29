/* HockeyOS ENG61 — source-gated percentage/dispersion arrow presentation.
   Five adaptive display labels never rewrite the original workbook 5Arrows. */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSAdaptiveTrendV365=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const positive=n=>finite(n)&&n>0;
 const LEVELS=Object.freeze(['COLD','COOL','NEUTRAL','WARM','HOT']);
 const SCHEMA='hockeyos-team-career-relative-dispersion/v1';
 const hold=reason=>Object.freeze({status:'HELD',reason});
 const almost=(a,b)=>Math.abs(a-b)<=Math.max(1e-8,Math.abs(b)*1e-5);
 let uniqueId=0;
 function validate(doc,projection){
  if(!doc||doc.schema!==SCHEMA||doc.version!=='3.6.5'||
   !['HISTORICAL_REFERENCE_ONLY','LIVE_DYNAMIC_VERIFIED'].includes(doc.status))
   return hold('DISPERSION_DOCUMENT_UNVERIFIED');
  if(!projection||projection.schema!=='brave-hc-workbook-projection/v1'||
     projection.model!=='BravesRegularSeasonProjection'||
     projection.season!==doc.model?.sourceSeason||
     projection.exportedAt!==doc.model?.projectionExportedAt||
     (projection.workbookSourceHash||null)!==(doc.model.workbookSourceHash||null))
   return hold('DISPERSION_PROJECTION_SNAPSHOT_MISMATCH');
  const provisional=projection.modelCurrent!==true||projection.projectionComplete!==true;
  if(doc.model.provisional!==provisional||
    (doc.status==='LIVE_DYNAMIC_VERIFIED'&&provisional)||
    (doc.status==='HISTORICAL_REFERENCE_ONLY'&&!provisional))
   return hold('DYNAMIC_MODEL_RECONCILIATION_MISMATCH');
  const h=doc.historical,e=doc.effective;
  if(h?.status!=='HISTORICAL_REFERENCE_VERIFIED'||
     h.effectiveSample?.independentPlayers<12||
     h.effectiveSample?.qualifiedPlayerSeasons<60||
     !positive(h.dispersion)||!positive(e?.dispersion)||!positive(e?.lowerScaleBound)||
     !positive(e?.upperScaleBound)||e.lowerScaleBound>e.upperScaleBound||
     !finite(e.weight)||e.weight<0||e.weight>.8||
     !positive(h.multipliers?.neutral)||!positive(h.multipliers?.cold)||!positive(h.multipliers?.hot))
   return hold('DYNAMIC_DISPERSION_EVIDENCE_INVALID');
  const t=e.thresholds;
  if(!positive(t?.neutral)||!positive(t?.cold)||!positive(t?.hot)||
     !(t.neutral<t.cold&&t.neutral<t.hot)||
     !almost(t.neutral,h.multipliers.neutral*e.dispersion)||
     !almost(t.cold,h.multipliers.cold*e.dispersion)||
     !almost(t.hot,h.multipliers.hot*e.dispersion)||
     e.dispersion<e.lowerScaleBound-1e-9||e.dispersion>e.upperScaleBound+1e-9)
   return hold('DYNAMIC_THRESHOLD_PARITY_FAILED');
  if(doc.status==='HISTORICAL_REFERENCE_ONLY'&&
     (!almost(e.dispersion,h.dispersion)||e.weight!==0||doc.current?.status!=='HELD'))
   return hold('HISTORICAL_FALLBACK_INCONSISTENT');
  if(doc.status==='LIVE_DYNAMIC_VERIFIED'&&
    (doc.current?.status!=='CURRENT_VERIFIED'||!positive(doc.current.qualifiedPlayers)||
     !finite(doc.current.dispersion)||!almost(e.weight,doc.current.confidence)||
     !almost(e.dispersion,Math.min(e.upperScaleBound,Math.max(e.lowerScaleBound,
       (1-e.weight)*h.dispersion+e.weight*doc.current.dispersion)))))
   return hold('LIVE_DISPERSION_RECONCILIATION_FAILED');
  return Object.freeze({status:'VERIFIED',mode:doc.status,scale:e.dispersion,
    thresholds:Object.freeze({...t}),weight:e.weight,
    provisional,sourceDate:doc.generatedAt,
    samplePlayers:h.effectiveSample.independentPlayers,
    sourceForecast:projection.exportedAt});
 }
 function angleFromPercentage(percentage,dispersion){
  if(!finite(percentage)||!positive(dispersion))return null;
  return 90-(180/Math.PI)*Math.atan(percentage/dispersion);
 }
 function levelFor(percentage,thresholds){
  if(!finite(percentage)||!positive(thresholds?.neutral)||
     !positive(thresholds?.cold)||!positive(thresholds?.hot)||
     !(thresholds.neutral<thresholds.cold&&thresholds.neutral<thresholds.hot))return null;
  if(percentage<=-thresholds.cold)return 'COLD';
  if(percentage< -thresholds.neutral)return 'COOL';
  if(percentage<=thresholds.neutral)return 'NEUTRAL';
  if(percentage<thresholds.hot)return 'WARM';
  return 'HOT';
 }
 function classify(row,projection,doc){
  if(row?.trendInputs?.firstSeasonOrNoCareer===true)return Object.freeze({status:'ROOKIE'});
  const ready=validate(doc,projection);
  if(ready.status!=='VERIFIED')return ready;
  const m=row?.trendInputs?.projectedScoringRate;
  const career=row?.trendInputs?.careerScoringRate;
  if(!finite(row?.trend)||!positive(career)||!finite(m)||m<0||
     Math.abs(row.trend-(m/career-1))>5e-6)
   return hold('INDIVIDUAL_SOURCE_TREND_COMPONENT_MISMATCH');
  const pct=row.trend,level=levelFor(pct,ready.thresholds),
    angle=angleFromPercentage(pct,ready.scale);
  if(!level||angle===null)return hold('INDIVIDUAL_ADAPTIVE_CALCULATION_FAILED');
  return Object.freeze({status:'VERIFIED',level,percentage:pct,angle,
    dispersion:ready.scale,thresholds:ready.thresholds,mode:ready.mode,
    sourceForecast:ready.sourceForecast,
    provisional:ready.provisional});
 }
 function compareRate(rate,careerRate,doc,projection){
  const ready=validate(doc,projection);
  if(ready.status!=='VERIFIED')return ready;
  if(!finite(rate)||rate<0||!positive(careerRate))return hold('FORM_COMPARISON_SOURCE_UNQUALIFIED');
  const pct=rate/careerRate-1;
  return Object.freeze({status:'VERIFIED',level:levelFor(pct,ready.thresholds),
   percentage:pct,angle:angleFromPercentage(pct,ready.scale),
   dispersion:ready.scale,mode:ready.mode,formOnly:true});
 }
 function badge(doc,reading,visual,kind='PROJECTION'){
  if(!doc||reading?.status!=='VERIFIED'||!visual?.compute||!visual?.badgeMarkup||
      !LEVELS.includes(reading.level))return null;
  const ratio=reading.percentage/reading.dispersion;
  const base=visual.compute(ratio);
  const neutral=reading.level==='NEUTRAL';
  const s=neutral?{
    ...base,angle:reading.angle,cold:false,hot:false,intensity:0,
    accent:'#edf5fc',rim:'#9aafbc',upper:'#304b5b',lower:'#162935',
    lit:'#7f96a8',visualName:'NEUTRAL'
  }:{...base,angle:reading.angle,visualName:reading.level,
    cold:reading.percentage<0,hot:reading.percentage>0};
  const mount=doc.createElement('div'),id='btAdaptive365'+(++uniqueId);
  mount.innerHTML=visual.badgeMarkup(s,id,78);
  const el=mount.firstElementChild;
  const rotor=el.querySelector('.v36-arrow-rotor');
  rotor?.removeAttribute('data-z-score');el.removeAttribute('data-source-z-score');
  rotor?.setAttribute('data-percent-angle',String(reading.angle));
  el.dataset.visualLevel=reading.level;
  el.dataset.adaptiveMode=reading.mode||'HISTORICAL_REFERENCE_ONLY';
  el.dataset.percentage=String(reading.percentage);
  el.dataset.dispersion=String(reading.dispersion);
  el.dataset.angleConvention='0_UP_90_RIGHT_180_DOWN';
  el.dataset.sourceType=kind;
  el.classList.add('v365-adaptive');
  const arrow=el.querySelector('svg.bio-trend-direction-arrow');
  if(arrow){
   arrow.setAttribute('aria-label',
     reading.level+' · '+(reading.percentage*100).toFixed(2)+
     '% career-relative '+kind.toLowerCase()+'; '+reading.angle.toFixed(2)+
     ' degrees (0 up, 90 right, 180 down). '+
     (reading.mode==='LIVE_DYNAMIC_VERIFIED'?'Verified current team scale.':'Historical reference scale; current forecast provisional.'));
  }
  return el;
 }
 function rookieBadge(doc,visual){
  const el=visual?.createBadge?.(doc,{zScore:0},'Neutral',true);
  if(el){el.dataset.visualLevel='ROOKIE';el.dataset.adaptiveMode='NO_CAREER_COMPARISON';}
  return el||null;
 }
 function legend(doc,dispersion,projection,visual){
  const ready=validate(dispersion,projection);
  if(ready.status!=='VERIFIED')return [];
  const t=ready.thresholds;
  const scenarios=[
   {level:'COLD',p:-t.cold*1.12},
   {level:'COOL',p:-(t.cold+t.neutral)/2},
   {level:'NEUTRAL',p:0},
   {level:'WARM',p:(t.hot+t.neutral)/2},
   {level:'HOT',p:t.hot*1.12}
  ];
  return scenarios.map(x=>{
   const reading={status:'VERIFIED',percentage:x.p,level:levelFor(x.p,t),
    dispersion:ready.scale,angle:angleFromPercentage(x.p,ready.scale),
    mode:ready.mode};
   const icon=badge(doc,reading,visual,'LEGEND');
   if(!icon||reading.level!==x.level)throw Error('ADAPTIVE_LEGEND_LEVEL_ERROR');
   return {level:x.level,badge:icon};
  });
 }
 return {SCHEMA,LEVELS,validate,angleFromPercentage,levelFor,classify,
  compareRate,badge,rookieBadge,legend};
});
