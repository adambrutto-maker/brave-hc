/* HockeyOS Goalie projection model v0.1. Distinct from BravesRegularSeasonProjection.
   Borrows its attendance-history and increasing current-season weight principles.
   No winner/win probability is verified by descriptive opponent-strength data.
   This module is model-only. Source-check gates must pass before publication.
*/
(function(root,factory) {
  'use strict';
  const engine=Object.freeze(factory());
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;
  if(root)root.BraveGoalieProjection=engine;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const HOLD=reason=>Object.freeze({status:'HELD',reason,projected:false});
  const integer=x=>Number.isSafeInteger(x)&&x>=0;
  const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
  const validRecord=x=>x&&[x.gp,x.w,x.l,x.t,x.ga].every(integer)&&
      x.w+x.l+x.t===x.gp;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function forecast(settings){
    if(!settings||settings.sourceVerified!==true||settings.currentSourceVerified!==true)
      return HOLD('SOURCE_RECONCILIATION_REQUIRED');
    const {seasonGames,teamGamesPlayed,current,history}=settings;
    if(!integer(seasonGames)||seasonGames<1||!integer(teamGamesPlayed)||
       teamGamesPlayed>seasonGames||!validRecord(current)||current.gp>teamGamesPlayed)
      return HOLD('CURRENT_TEAM_OR_GOALIE_RECORD_INVALID');
    if(!Array.isArray(history)||!history.length||
       !history.every(r=>validRecord(r)&&integer(r.teamGames)&&r.teamGames>=r.gp&&r.teamGames>0))
      return HOLD('HISTORIC_ATTENDANCE_DENOMINATOR_MISSING');
    const priorGP=history.reduce((n,r)=>n+r.gp,0);
    const priorGames=history.reduce((n,r)=>n+r.teamGames,0);
    const priorWins=history.reduce((n,r)=>n+r.w,0);
    const priorGA=history.reduce((n,r)=>n+r.ga,0);
    if(priorGP<1||priorGames<1)return HOLD('PRIOR_GOALIE_APPEARANCES_MISSING');
    const completion=teamGamesPlayed/seasonGames;
    const currentWeight=completion,historyWeight=1-completion;
    const priorAttendance=priorGP/priorGames;
    const currentAttendance=teamGamesPlayed?current.gp/teamGamesPlayed:priorAttendance;
    const share=clamp(historyWeight*priorAttendance+currentWeight*currentAttendance,0,1);
    const futureGames=seasonGames-teamGamesPlayed;
    const confirmed=settings.confirmedFutureStarts??0;
    if(!integer(confirmed)||confirmed>futureGames||
       (confirmed>0&&settings.confirmedStartsVerified!==true))
      return HOLD('FUTURE_STARTS_NOT_VERIFIED');
    const forecastFutureStarts=clamp(Math.max(confirmed,share*futureGames),0,futureGames);
    const seasonStarts=current.gp+forecastFutureStarts;
    const pastRate=priorWins/priorGP;
    const currentRate=current.gp?current.w/current.gp:pastRate;
    const winRate=clamp(historyWeight*pastRate+currentWeight*currentRate,0,1);
    const priorGAperGame=priorGA/priorGP;
    const currentGAperGame=current.gp?current.ga/current.gp:priorGAperGame;
    const forecastGAperGame=historyWeight*priorGAperGame+currentWeight*currentGAperGame;
    const projectedWins=current.w+forecastFutureStarts*winRate;
    const projectedGA=current.ga+forecastFutureStarts*forecastGAperGame;
    const projectedGAA=seasonStarts?projectedGA/seasonStarts:null;
    // Descriptive public opponent context has no validated outcome-prediction coefficient.
    const opponentContext=settings.opponentContext;
    const contextStatus=opponentContext&&opponentContext.sourceVerified===true
      ? 'DESCRIPTIVE_ONLY_NOT_APPLIED_TO_MODEL' : 'OPPONENT_CONTEXT_UNAVAILABLE';
    return Object.freeze({
      status:'EXPERIMENTAL_SCENARIO',projected:true,model:'GOALIE_ATTENDANCE_FORM_WEIGHTED_V0_1',
      forecastAsOf:settings.asOf||null,
      sourceGames:teamGamesPlayed,seasonGames,
      actual:Object.freeze({gp:current.gp,w:current.w,l:current.l,t:current.t,ga:current.ga}),
      forecast:Object.freeze({starts:seasonStarts,wins:projectedWins,goalsAgainst:projectedGA,
        goalsAgainstPerAppearance:projectedGAA}),
      rates:Object.freeze({historicalAttendance:priorAttendance,currentAttendance,
        projectedAttendance:share,historyWeight,currentWeight,
        previousGoalsAgainstPerAppearance:priorGAperGame,currentGoalsAgainstPerAppearance:currentGAperGame,
        futureWinRate:winRate}),
      opponentContextStatus:contextStatus,
      calibration:'UNVALIDATED_GOALIE_PILOT_NOT_AN_OFFICIAL_FORECAST',
      sourceScope:'HISTORIC_TEAM_GAME_DENOMINATORS_REQUIRED; PLAYOFF_GAMES_EXCLUDED'
    });
  }
  return {forecast};
});