/* The Bio reads the exact source-defined 5Arrows thresholds and row trend from the
 * shared homepage BravesRegularSeasonProjection feed; no parallel trend calculation.
 * Icons and rotations reproduce home-premium.js's established states. */
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
   return Object.freeze({status:'NEW',label:'No comparable career scoring baseline',symbol:'NEW'});
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
 return {states,classify};
});
