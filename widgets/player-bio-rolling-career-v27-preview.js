/* HockeyOS player Bio — past-only career scoring-rate comparisons.
 * Never infer missing source rows as zero, leak future seasons into rolling means,
 * or write derived rates to HTO statistics, Records, Awards or the Master Workbook.
 */
(function(root,factory){
  'use strict';
  const normal=(typeof module!=='undefined'&&module.exports)
    ? require('./player-performance-normalization.js')
    : root?.HockeyOSPerformanceNormalization;
  const api=Object.freeze(factory(normal));
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.HockeyOSBioRollingCareer=api;
})(typeof window!=='undefined'?window:null,function(normal){
  'use strict';
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  function seasonOrder(season){
    if(typeof season!=='string')return null;
    const a=/^Summer (\d{4})$/.exec(season);
    if(a)return Number(a[1])*2;
    const b=/^Winter (\d{4})\/(\d{4})$/.exec(season);
    if(b&&Number(b[2])===Number(b[1])+1)return Number(b[1])*2+1;
    return null;
  }
  function period(row,config,basis){
    if(!row||typeof row.Season!=='string'||!count(row.GP)||
       !count(row.G)||!count(row.A)||!count(row.Pts)||row.Pts!==row.G+row.A||
       (row.GP===0&&row.Pts>0))
      return Object.freeze({status:'HELD',reason:'SCORING_ROW_NOT_COMPLETE'});
    if(row.GP===0)return Object.freeze({status:'NO_APPEARANCE',gp:0,pts:0,rate:null});
    if(basis==='actual')return Object.freeze({status:'VERIFIED',gp:row.GP,pts:row.Pts,rate:row.Pts/row.GP});
    const target=basis==='winter'?'brave-winter-32':basis==='summer'?'brave-summer-48':null;
    if(!target||!normal?.normalizeHistorical)return Object.freeze({status:'HELD',reason:'INVALID_COMPARISON_BASIS'});
    const output=normal.normalizeHistorical(row,config,{role:'skater',seasonKey:row.Season,
      gameType:'ALL_HTO_GAME_TYPES',targetFormatId:target});
    if(output.status!=='VERIFIED_EQUIVALENT')return Object.freeze({status:'HELD',reason:'SEASON_FORMAT_NOT_VERIFIED'});
    return Object.freeze({status:'VERIFIED',gp:row.GP,pts:output.equivalent.Pts,
      rate:output.equivalent.pointsPerGame});
  }
  function calculate(rows,config,basis){
    if(!Array.isArray(rows)||!['actual','winter','summer'].includes(basis))
      return Object.freeze({status:'HELD',reason:'SOURCE_OR_BASIS_INVALID'});
    const mapped=rows.map((row,index)=>({row,order:seasonOrder(row?.Season),index}));
    if(mapped.some(x=>x.order===null))return Object.freeze({status:'HELD',reason:'SEASON_CHRONOLOGY_NOT_VERIFIED'});
    mapped.sort((a,b)=>a.order-b.order||a.index-b.index);
    if(new Set(mapped.map(x=>x.row.Season)).size!==mapped.length)
      return Object.freeze({status:'HELD',reason:'DUPLICATE_SEASON_ROWS'});
    let priorPoints=0,priorGP=0,tainted=false;
    const entries=[];
    for(const x of mapped){
      // Prior value is computed BEFORE adding the season whose rate is being compared.
      const priorRate=priorGP>0&&!tainted?priorPoints/priorGP:null;
      const priorSampleGP=tainted?null:priorGP;
      const current=period(x.row,config,basis);
      const currentRate=current.status==='VERIFIED'?current.rate:null;
      entries.push(Object.freeze({
        season:x.row.Season,
        seasonOrder:x.order,
        priorRate,
        priorSampleGP,
        currentRate,
        difference:finite(currentRate)&&finite(priorRate)?currentRate-priorRate:null,
        currentStatus:current.status,
        priorStatus:tainted?'EARLIER_SOURCE_INCOMPLETE':priorGP===0?'NO_PRIOR_CAREER_SAMPLE':'VERIFIED_PRIOR_CAREER'
      }));
      if(current.status==='VERIFIED'){
        priorPoints+=current.pts;priorGP+=current.gp;
      }else if(current.status!=='NO_APPEARANCE'){
        // Do not silently skip a scoring season whose statistics are missing.
        tainted=true;
      }
    }
    const fullCareerRate=priorGP>0&&!tainted?priorPoints/priorGP:null;
    return Object.freeze({status:'SOURCE_CALCULATED',basis,
      entries:Object.freeze(entries),fullCareerRate,
      complete:!tainted,
      scope:'ALL_PUBLISHED_GAME_TYPES_BY_SEASON',
      methodology:'Prior completed seasons, GP-weighted; source-normalized to the chosen view. Current season excluded.'});
  }
  return {seasonOrder,period,calculate};
});