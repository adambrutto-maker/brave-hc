/* HockeyOS positive personal streaks — source-qualified consecutive PLAYER
 * appearances across game types / seasons. No cold, slump or invented zero
 * appearances; this engine ships held until complete official game logs exist.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.HockeyOSPositiveStreaks=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const hold=reason=>Object.freeze({status:'HELD',reason,publicRecordsWritten:false});
 const nat=x=>Number.isSafeInteger(x)&&x>=0;
 const match=x=>typeof x==='string'&&/^[1-9]\d{4,12}$/.test(x);
 function evaluate(source,playerId){
  const id=String(playerId||'');
  if(!match(id)||source?.schema!=='hockeyos-verified-player-appearance-log/v1'||
    source?.status!=='ALL_OFFICIAL_PLAYER_APPEARANCES_VERIFIED'||
    source.playerId!==id||
    source.coverage!=='PLAYER_CAREER_ALL_PUBLISHED_GAME_TYPES'||
    !Array.isArray(source.games)||!nat(source.gamesPlayed)||source.games.length!==source.gamesPlayed)
   return hold('COMPLETE_PLAYER_APPEARANCE_HISTORY_NOT_VERIFIED');
  const unique=new Set(),games=[];
  for(const row of source.games){
   if(!match(String(row?.htoGameId||''))||row.appearanceConfirmed!==true||
      row.finalScoreVerified!==true||!nat(row.g)||!nat(row.a)||!nat(row.pts)||
      row.pts!==row.g+row.a||!/^20\d{2}-\d\d-\d\d$/.test(row.date||'')||
      !['REGULAR','PLAYOFF','SUMMER_REGULAR','SUMMER_PLAYOFF'].includes(row.gameType)||
      typeof row.season!=='string'||row.season.length<5||
      unique.has(String(row.htoGameId)))return hold('GAME_APPEARANCE_OR_OUTCOME_INCOMPLETE');
   unique.add(String(row.htoGameId));
   games.push(row);
  }
  games.sort((a,b)=>a.date.localeCompare(b.date)||Number(a.htoGameId)-Number(b.htoGameId));
  if(games.some((g,i)=>i>0&&g.date<games[i-1].date))
   return hold('GAME_ORDER_NOT_VERIFIED');
  const result={};
  for(const [key,pred] of [['points',row=>row.pts>0],['goals',row=>row.g>0],['assists',row=>row.a>0]]){
   let active=[],best=[],endRun=()=>{
    if(active.length>best.length)best=active.slice();
    active=[];
   };
   for(const g of games){if(pred(g))active.push(g);else endRun();}
   endRun();
   result[key]=Object.freeze({
    length:best.length,
    positiveStreak:best.length>=2,
    startGameId:best.length>=2?String(best[0].htoGameId):null,
    endGameId:best.length>=2?String(best[best.length-1].htoGameId):null,
    startDate:best.length>=2?best[0].date:null,
    endDate:best.length>=2?best[best.length-1].date:null,
    crossesSeasons:best.length>=2?new Set(best.map(x=>x.season)).size>1:false,
    crossesGameTypes:best.length>=2?new Set(best.map(x=>x.gameType)).size>1:false
   });
  }
  return Object.freeze({status:'VERIFIED_POSITIVE_STREAKS',playerId:id,
   sourceDate:source.sourceDate||null,scope:source.coverage,
   points:result.points,goals:result.goals,assists:result.assists,
   publicRecordsWritten:false,negativeStreaksPublished:false,
   note:'Consecutive verified player appearances, including permitted season/playoff boundaries. These are profile analytics, not official club record-book awards.'});
 }
 return {evaluate};
});
