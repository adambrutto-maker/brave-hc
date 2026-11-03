/* Brave H.C. HockeyOS: public, source-qualified opponent player intelligence.
   Brave H.C. actuals MUST come from HTO; this module never reads their SVHL stats.
   SVHL "PPG" on player profiles means power-play GOALS, not points per game.
*/
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveOpponentPlayers=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const ADULT=new Set(["Fazzari Partners","The Cristillo Division","Remax Division"]);
 const fields=["gp","g","a","pts","pim"];
 const special=["ppGoals","ppAssists","pkGoals","pkAssists","gameWinningGoals","gameTyingGoals"];
 const need=(ok,why)=>{if(!ok)throw Error("OPPONENT_PLAYERS_SOURCE_HOLD:"+why)};
 const number=n=>Number.isInteger(n)&&n>=0;
 const url=(lid,tid,pid)=>"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid="+lid+
   "&teamid="+tid+"&playerid="+pid+"&page_type=Adult";
 const limited=(x,ageDays=14,now=new Date())=>{
  const t=new Date(x),age=now.getTime()-t.getTime();
  return Number.isFinite(age)&&age>=-900000&&age<=ageDays*86400000;
 };
 function validate(feed,league,now=new Date()){
  need(feed?.schema==="brave-hc-opponent-player-intelligence/public-v1"&&
       feed.status==="SOURCE_QUALIFIED_DESCRIPTIVE_OPPONENT_PLAYER_INTELLIGENCE"&&
       feed.sourceLeagueId===570&&feed.svhlBravePlayerStatsPublished===false&&
       feed.VAHLExcluded===true&&feed.completePlayerGameAttendanceVerified===false&&
       feed.sourceAuthority?.braveHC==="HTO_ONLY"&&
       feed.sourceAuthority?.opponents==="SVHL_PUBLIC_TEAMINFO_AND_PLAYERINFO",
       "AUTHORITY_SCHEMA_OR_SOURCE_BOUNDARY");
  need(league?.schema==="brave-hc-svhl-standings/v1"||
       league?.schema==="brave-hc-league-intelligence/public-v1",
       "LEAGUE_CONTEXT_UNAVAILABLE");
  need(limited(feed.capturedAt,14,now),"PLAYER_CAPTURE_STALE_OR_FUTURE");
  const leagueTeams=league.teams;
  const current=new Map(leagueTeams
   .filter(t=>t.name!=="Braves HC"&&t.leagueName!=="Braves HC"&&
    (t.divisionNow ? ADULT.has(t.divisionNow) : true))
   .map(t=>[t.sourceTeamId??t.teamId,t]));
  // The standings-only feed has no ID; require full league intelligence.
  need(league.schema==="brave-hc-league-intelligence/public-v1"&&current.size===21,
       "FULL_VERIFIED_ADULT_LEAGUE_TEAM_ID_REQUIRED");
  need(feed.teamCount===21&&feed.teams?.length===21&&
       new Set(feed.teams.map(t=>t.sourceTeamId)).size===21,
       "CURRENT_TEAM_COVERAGE");
  let count=0,hist=0,extra=0;
  for(const team of feed.teams){
   const official=current.get(team.sourceTeamId);
   need(official&&official.leagueName===team.name&&
        official.divisionNow===team.division&&ADULT.has(team.division)&&
        team.sourceTeamId!==13679&&
        team.playerCount===team.players?.length,
        "TEAM_IDENTITY_AND_ROSTER_CHANGED");
   const ids=new Set();
   for(const p of team.players){
    need(number(p.playerId)&&p.playerId>0&&!ids.has(p.playerId)&&
         p.profileUrl===url(570,team.sourceTeamId,p.playerId)&&
         fields.every(k=>number(p[k]))&&
         ["PUBLISHED_ARITHMETICALLY_CONSISTENT","SOURCE_CONFLICT_HOLD"]
          .includes(p.sourceStatus)&&
         (p.sourceStatus==="SOURCE_CONFLICT_HOLD"||p.pts===p.g+p.a)&&
         p.nextGameAttendanceVerified===false, "PLAYER_COUNT_IDENTITY_OR_ATTENDANCE");
    ids.add(p.playerId);
    count++;
    if(p.specialtyStats!==null){
     need(p.specialtyStatus==="PROFILE_VERIFIED"&&
          special.every(k=>number(p.specialtyStats[k]))&&
          p.specialtyStats.ppGoals<=p.g&&p.specialtyStats.pkGoals<=p.g&&
          p.specialtyStats.ppAssists<=p.a&&p.specialtyStats.pkAssists<=p.a&&
          p.specialtyStats.gameWinningGoals<=p.g&&
          p.specialtyStats.gameTyingGoals<=p.g,
          "SPECIALTY_PROFILE_ARITHMETIC");
     extra++;
    }else need(["PROFILE_HELD","NOT_YET_CAPTURED"].includes(p.specialtyStatus),
               "MISSING_SPECIALTY_STATUS");
    const keys=new Set();
    for(const h of p.priorSeasonTeamObservations||[]){
     const key=h.leagueId+"|"+h.teamId;
     need(h.leagueId!==570&&number(h.teamId)&&
          number(h.gp)&&number(h.g)&&number(h.a)&&number(h.pts)&&number(h.pim)&&
          h.profileUrl===url(h.leagueId,h.teamId,p.playerId)&&
          h.sourceStatus!=="HTO_ACTUAL"&&
          (h.sourceStatus==="SOURCE_CONFLICT_HOLD"||
           h.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"&&h.pts===h.g+h.a)&&
          !keys.has(key)&&typeof h.nameMatch==="boolean",
          "PRIOR_SEASON_SOURCE_BOUNDARY_OR_IDENTITY");
     keys.add(key);hist++;
    }
   }
  }
  need(count===feed.playerCount&&hist===feed.linkedPriorPlayerSeasonTeamObservations&&
       extra===feed.currentSpecialtyProfilesVerified,"PLAYER_COVERAGE_COUNT_DRIFT");
  return true;
 }
 function playerStats(p){
  const qualified=p.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT";
  const history=(p.priorSeasonTeamObservations||[]).filter(h=>
   h.nameMatch===true&&h.sourceStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT");
  const priorLatest=history.find(h=>h.gp>0)||null;
  return {playerId:p.playerId,name:p.name,jersey:p.jersey,profileUrl:p.profileUrl,
   positionAsPublished:p.positionAsPublished,
   current:qualified?{gp:p.gp,g:p.g,a:p.a,pts:p.pts,pim:p.pim,
    ptsPerReportedGP:p.gp?Number((p.pts/p.gp).toFixed(2)):null}:null,
   priorLatest:priorLatest&&{season:priorLatest.season,teamName:priorLatest.teamName,
    gp:priorLatest.gp,g:priorLatest.g,a:priorLatest.a,pts:priorLatest.pts,
    ptsPerReportedGP:Number((priorLatest.pts/priorLatest.gp).toFixed(2)),
    sourceUrl:priorLatest.profileUrl},
   pastObservations:history.length,heldPriorObservations:
    (p.priorSeasonTeamObservations||[]).length-history.length,
   special:p.specialtyStatus==="PROFILE_VERIFIED"?p.specialtyStats:null,
   sourceStatus:p.sourceStatus};
 }
 function team(qualifiedFeed,teamId){
  const source=qualifiedFeed.teams.find(t=>t.sourceTeamId===teamId);
  if(!source)return null;
  const players=source.players.map(playerStats);
  const active=players.filter(p=>p.current&&p.current.gp>0)
   .sort((a,b)=>b.current.pts-a.current.pts||
    b.current.g-a.current.g||b.current.gp-a.current.gp||
    a.name.localeCompare(b.name));
  return {sourceTeamId:source.sourceTeamId,name:source.name,division:source.division,
    sourceUrl:source.sourceUrl,playerCount:players.length,activeReported:active.length,
    players,leaders:active.slice(0,6),capturedAt:qualifiedFeed.capturedAt,
    note:qualifiedFeed.confidenceNotice};
 }
 return Object.freeze({validate,team,playerStats});
});
