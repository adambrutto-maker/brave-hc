/* HockeyOS Bio V3.6.4 — source-gated current scoring form.
   No game appearance or zero-point game is inferred from partial scoring sheets. */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSBioFormV364=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCHEMA='brave-hc-individual-verified-appearances/v1';
 const VERIFIED='VERIFIED_COMPLETE_PLAYER_APPEARANCES';
 const GAME_VERIFIED='OFFICIAL_APPEARANCE_AND_BOX_SCORE_VERIFIED';
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const count=n=>Number.isSafeInteger(n)&&n>=0;
 const fail=(reason)=>Object.freeze({status:'HELD',reason});
 function getRecentWindow(source,id,season,actual,windowSize){
  if(![3,5,10].includes(windowSize))return fail('INVALID_WINDOW');
  if(!source||source.schema!==SCHEMA||source.status!==VERIFIED ||
     source.season!==season||typeof source.asOf!=='string'||!Number.isFinite(Date.parse(source.asOf)))
   return fail('FULL_APPEARANCE_LOG_UNVERIFIED');
  if(!actual||![actual.gp,actual.g,actual.a,actual.pts].every(count)||
     actual.g+actual.a!==actual.pts)return fail('CURRENT_TOTALS_UNVERIFIED');
  const p=source.players?.[String(id)];
  if(!p||String(p.playerId)!==String(id)||!count(p.gp)||p.gp!==actual.gp||
     !count(p.pts)||p.pts!==actual.pts||!Array.isArray(p.games)||
     p.games.length!==actual.gp)return fail('PLAYER_APPEARANCES_NOT_COMPLETE');
  const ids=new Set(),games=[];
  for(const g of p.games){
   if(!Number.isSafeInteger(g.gameId)||g.gameId<=0||ids.has(g.gameId)||
      !/^20\\d{2}-\\d{2}-\\d{2}$/.test(g.date)||!Number.isFinite(Date.parse(g.date))||
      g.appeared!==true||g.verification!==GAME_VERIFIED||
      typeof g.sourceUrl!=='string'||!/^https:\\/\\/(www\\.)?(htosports\\.com|leagues\\.sportsvillage\\.ca)\\//i.test(g.sourceUrl)||
      ![g.g,g.a,g.pts].every(count)||g.g+g.a!==g.pts)
    return fail('GAME_APPEARANCE_OR_SCORING_PROOF_INVALID');
   ids.add(g.gameId);games.push(g);
  }
  if(games.reduce((n,g)=>n+g.pts,0)!==actual.pts||
     games.reduce((n,g)=>n+g.g,0)!==actual.g||
     games.reduce((n,g)=>n+g.a,0)!==actual.a)
   return fail('SEASON_SCORING_TOTALS_DISAGREE');
  games.sort((a,b)=>b.date.localeCompare(a.date)||b.gameId-a.gameId);
  if(games.length<windowSize)return fail('INSUFFICIENT_VERIFIED_APPEARANCES');
  const last=games.slice(0,windowSize);
  return Object.freeze({status:'VERIFIED',gp:windowSize,pts:last.reduce((n,g)=>n+g.pts,0),
    rate:last.reduce((n,g)=>n+g.pts,0)/windowSize,
    gameIds:last.map(g=>g.gameId),asOf:source.asOf,
    basis:'COMPLETE_VERIFIED_INDIVIDUAL_APPEARANCES'});
 }
 function currentRate(row,teamGP){
  if(!row||![row.gp,row.g,row.a,row.pts,teamGP].every(count)||
    teamGP<=0||row.gp>teamGP||row.g+row.a!==row.pts||(!row.gp&&row.pts))
   return fail('CURRENT_HTO_TOTALS_UNQUALIFIED');
  if(!row.gp)return fail('NO_RECORDED_APPEARANCES');
  return Object.freeze({status:'VERIFIED',gp:row.gp,pts:row.pts,rate:row.pts/row.gp});
 }
 function compare(rate,careerRate,sigma,visual){
  if(!positive(careerRate)||!Number.isFinite(rate)||rate<0||
     !positive(sigma)||!visual?.visualLevelFromRelativeChange)return fail('COMPARISON_BASIS_UNQUALIFIED');
  const change=rate/careerRate-1;
  const level=visual.visualLevelFromRelativeChange(change,sigma);
  return level?Object.freeze({status:'VERIFIED',relativeChange:change,level}):fail('TREND_LEVEL_UNAVAILABLE');
 }
 return {SCHEMA,VERIFIED,GAME_VERIFIED,getRecentWindow,currentRate,compare};
});
