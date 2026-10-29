/* The Bio reads the exact source-defined 5Arrows thresholds and row trend from the
 * shared homepage BravesRegularSeasonProjection feed; no parallel trend calculation.
 * Preserves home-premium.js five workbook categories and source thresholds.
 * Bio visual arrow orientation/color is a continuous σ-based readout centered on zero. */
(function(root,factory){
 'use strict';
 const engine=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;
 if(root)root.HockeyOSBioProjectionTrend=engine;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const n=x=>typeof x==='number'&&Number.isFinite(x);
 const states=Object.freeze([
  Object.freeze({name:'Cold',description:'Strong decline',rotate:180,color:'#217fd4',symbol:'↓'}),
  Object.freeze({name:'Cool',description:'Moderate decline',rotate:135,color:'#79bdec',symbol:'↘'}),
  Object.freeze({name:'Neutral',description:'Middle range',rotate:90,color:'#ffffff',symbol:'→'}),
  Object.freeze({name:'Warm',description:'Moderate rise',rotate:45,color:'#dc7383',symbol:'↗'}),
  Object.freeze({name:'Hot',description:'Strong rise',rotate:0,color:'#f0344d',symbol:'↑'})
 ]);
 function classify(row,projection){
  if(!row||projection?.schema!=='brave-hc-workbook-projection/v1'||
     projection.model!=='BravesRegularSeasonProjection')return Object.freeze({status:'HELD',reason:'MODEL_SOURCE_NOT_VERIFIED'});
  if(row.trendInputs?.firstSeasonOrNoCareer===true)
   return Object.freeze({status:'ROOKIE',label:'Rookie · no established career comparison',symbol:'ROOKIE'});
  const thresholds=projection.conditionalFormatting?.arrowIconSet?.thresholds;
  if(projection.conditionalFormatting?.arrowIconSet?.type!=='5Arrows'||!n(row.trend)||
     !thresholds||!['AB100','AB99','AB97','AB96'].every(k=>n(thresholds[k])))
   return Object.freeze({status:'HELD',reason:'WORKBOOK_TREND_NOT_VERIFIED'});
  const {AB100,AB99,AB97,AB96}=thresholds;
  if(!(AB100<AB99&&AB99<AB97&&AB97<AB96))return Object.freeze({status:'HELD',reason:'INVALID_TREND_THRESHOLDS'});
  const i=row.trend<AB100?0:row.trend<AB99?1:row.trend<AB97?2:row.trend<AB96?3:4;
  const state=states[i];
  const c=row.trendInputs?.careerScoringRate,m=row.trendInputs?.projectedScoringRate;
  return Object.freeze({status:'VERIFIED_MODEL_TREND',...state,index:i,
   relativeChange:row.trend,careerRate:n(c)?c:null,modelComponentRate:n(m)?m:null,
   label:state.name,
   modelCurrent:projection.modelCurrent===true&&projection.projectionComplete===true});
 }

 // Directional arrow: 0 is ALWAYS horizontal. Every result below zero points
 // down; every positive result points up. Standard deviation measures how
 // steeply and how strongly to color the arrow. It does not change the five
 // original category thresholds or their original workbook classification.
 function directionalArrow(row,projection){
  const result=classify(row,projection);
  if(result.status!=='VERIFIED_MODEL_TREND')
   return Object.freeze({status:result.status==='ROOKIE'?'ROOKIE':'HELD',
     reason:result.reason||result.label||'NO_VERIFIED_CAREER_TREND'});
  const cf=projection?.conditionalFormatting,th=cf?.arrowIconSet?.thresholds;
  const sigma=cf?.sampleStandardDeviation;
  if(!n(sigma)||sigma<=0||!th)return Object.freeze({status:'HELD',reason:'WORKBOOK_SIGMA_UNVERIFIED'});
  const near=(a,b)=>Math.abs(a-b)<=Math.max(1e-8,Math.abs(b)*1e-5);
  // Original Excel thresholds: -2σ, -1σ, +0.5σ and +1σ.
  if(!near(th.AB100,-2*sigma)||!near(th.AB99,-sigma)||
     !near(th.AB97,.5*sigma)||!near(th.AB96,sigma))
   return Object.freeze({status:'HELD',reason:'WORKBOOK_SIGMA_THRESHOLD_MISMATCH'});
  const z=result.relativeChange/sigma;
  if(!n(z))return Object.freeze({status:'HELD',reason:'NONFINITE_STANDARDIZED_TREND'});
  // Visual-only continuous angle: ±2σ maps to ±60°, with extremities capped.
  // 0° = horizontal right; a negative z tilts down and a positive z tilts up.
  const angleDegrees=Math.max(-60,Math.min(60,z*30));
  const lo='#dce6ee',cool='#217fd4',warm='#f0344d';
  const interp=(a,b,t)=>{
    const f=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    const A=f(a),B=f(b),v=Math.max(0,Math.min(1,t));
    return '#'+A.map((x,i)=>Math.round(x+(B[i]-x)*v).toString(16).padStart(2,'0')).join('');
  };
  const color=z<0?interp(lo,cool,Math.abs(z)/2):z>0?interp(lo,warm,z/2):lo;
  return Object.freeze({status:'VERIFIED_STANDARD_DEVIATION_ARROW',
    zScore:z,sigma,angleDegrees,renderRotationDegrees:-angleDegrees,
    zeroDegrees:0,direction:z<0?'BELOW':z>0?'ABOVE':'AT',
    sourceValue:result.relativeChange,category:result.name,
    originalCategoryColor:result.color,color,
    capped:Math.abs(z)>=2});
 }

 return {states,classify,directionalArrow};
});
