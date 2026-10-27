/* HockeyOS: public player-ID roster evidence and division-tier bridge.
  Not a game-day lineup, team placement order, win forecast or official edit. */
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveRosterIntelligence=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const DIV=["Fazzari Partners","The Cristillo Division","Remax Division"];
 const need=(ok,why)=>{if(!ok)throw Error("ROSTER_SCOUT_HOLD:"+why)};
 const total=(arr,k)=>arr.reduce((n,x)=>n+(typeof k==="function"?k(x):x[k]),0);
 const per=(v,gp)=>gp>0?Number((v/gp).toFixed(3)):null;
 const profileUrl=(lid,tid,pid)=>"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid="+
  lid+"&teamid="+tid+"&playerid="+pid+"&page_type=Adult";
 function valid(league,roster){
  need(league?.schema==="brave-hc-league-intelligence/public-v1" &&
   league.currentSourceDataConcordant===true &&
   league.strengthModel?.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
   league.strengthModel.probabilityOfWinning===false &&
   roster?.schema==="brave-hc-public-svhl-roster-seasons/v1" &&
   roster.status==="SOURCE_LINKED_OFFICIAL_ROSTER_SEASON_OBSERVATIONS" &&
   roster.sourceLeagueId===570 &&
   roster.identityBasis==="EXACT_OFFICIAL_PLAYER_ID_PER_ROSTER_SEASON_NOT_NAMES" &&
   roster.statTreatment==="PUBLISHED_COUNT_DATA_NOT_RECONCILED_TO_INDIVIDUAL_GAME_LOGS" &&
   roster.lineupAvailability==="NOT_VERIFIED_BY_SEASON_ROSTER" &&
   roster.originalWorkbookWritten===false &&
   roster.playerPrivacy==="PUBLIC_SPORTS_VILLAGE_PROFILE_STATS_ONLY_NO_PERSONAL_CONTACTS" &&
   roster.currentTeams===22&&Array.isArray(roster.teams)&&roster.teams.length===22,
   "SOURCE_NOT_ADMITTED");
  const eligible=league.teams.filter(t=>DIV.includes(t.divisionNow));
  need(eligible.length===22,"CURRENT_SCOPE_CHANGED");
  const sourceIds=new Map(eligible.map(t=>[t.sourceTeamId,t]));
  const unique=new Set();
  for(const team of roster.teams){
   const official=sourceIds.get(team.sourceTeamId);
   need(official&&official.leagueName===team.name&&official.divisionNow===team.division &&
    !unique.has(team.sourceTeamId)&&team.leagueId===570&&
    team.sourceSHA256?.match(/^[a-f0-9]{64}$/)&&
    team.sourceUrl==="https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid="+
     team.sourceTeamId+"&page_type=Adult" &&
    team.rosterCount===team.players.length,"TEAM_SOURCE_ID_OR_COUNT_INVALID");
   unique.add(team.sourceTeamId);
   const seen=new Set();
   for(const p of team.players){
    need(Number.isInteger(p.playerId)&&p.playerId>0&&!seen.has(p.playerId)&&
      p.profileUrl===profileUrl(570,team.sourceTeamId,p.playerId) &&
      p.name&&Array.isArray(p.previousOfficialObservations)&&
      Number.isInteger(p.gp)&&p.gp>=0&&
      ["g","a","pts"].every(k=>Number.isInteger(p[k])&&p[k]>=0)&&
      ["PUBLISHED_ARITHMETICALLY_CONSISTENT","SOURCE_CONFLICT_HOLD"].includes(p.statStatus),
      "PLAYER_STATS_OR_IDENTITY_INVALID");
    seen.add(p.playerId);
    if(p.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT")
     need(p.pts===p.g+p.a,"PLAYER_SOURCE_ARITHMETIC_INVALID");
    for(const h of p.previousOfficialObservations)
     need(roster.historicalLeagueIds.includes(h.leagueId)&&
       h.source===profileUrl(h.leagueId,h.sourceTeamId,p.playerId)&&
       Number.isInteger(h.gp)&&h.gp>=0&&
       ["PUBLISHED_ARITHMETICALLY_CONSISTENT","SOURCE_CONFLICT_HOLD"].includes(h.statStatus),
       "PREVIOUS_SEASON_PLAYER_ID_NOT_LINKED");
   }
  }
  return true;
 }
 function bridge(league){
  const teams=league.teams.filter(t=>DIV.includes(t.divisionNow));
  const byName=new Map(teams.map(t=>[t.leagueName,t]));
  const byId=new Map(teams.map(t=>[t.sourceTeamId,t]));
  const games=new Map();
  for(const team of teams)for(const g of team.completedGames){
   const other=byName.get(g.opponent);if(!other)continue;
   const lo=Math.min(team.sourceTeamId,other.sourceTeamId),
    hi=Math.max(team.sourceTeamId,other.sourceTeamId);
   const goals=team.sourceTeamId===lo?[g.gf,g.ga]:[g.ga,g.gf];
   const key=g.date+"|"+lo+"|"+hi;
   if(games.has(key)){need(games.get(key).goals.join("-")===goals.join("-"),
    "RECIPROCAL_GOAL_CONFLICT");continue;}
   games.set(key,{ids:[lo,hi],date:g.date,goals});
  }
  need(games.size>=20,"INSUFFICIENT_COMPLETED_PAIR_SOURCE");
  const groups=DIV.map(name=>{
   const own=teams.filter(t=>t.divisionNow===name);
   const external=[...games.values()].filter(g=>{
    const a=byId.get(g.ids[0]),b=byId.get(g.ids[1]);
    return a.divisionNow!==b.divisionNow &&
      (a.divisionNow===name||b.divisionNow===name);
   });
   let w=0,l=0,t=0,gf=0,ga=0;
   for(const game of external){
    const a=byId.get(game.ids[0]);
    const goals=a.divisionNow===name?game.goals:[game.goals[1],game.goals[0]];
    gf+=goals[0];ga+=goals[1];
    if(goals[0]>goals[1])w++;else if(goals[0]<goals[1])l++;else t++;
   }
   const scores=own.map(x=>x.strengthContext.contextIndex).filter(Number.isFinite);
   return {division:name,teams:own.length,
    descriptiveMean:scores.length?Number((total(scores,x=>x)/scores.length).toFixed(1)):null,
    crossDivisionGames:external.length,
    crossRecord:{w,l,t,gf,ga},
    goalDifferencePerGame:per(gf-ga,external.length),
    limitedSample:external.length<5};
  });
  const cross=total(groups,x=>x.crossDivisionGames)/2;
  return {verifiedAdultGames:games.size,verifiedCrossDivisionGames:cross,
   groups,sourceQualification:"RECIPROCAL_OFFICIAL_COMPLETED_GAMES_CURRENT_DIVISION_LABELS",
   note:"A losing record in a stronger division cannot be equated with a team in a weaker division. Cross-division records are direct evidence, but schedules and samples are nonrandom and still limited."};
 }
 function previous(p){
  const good=p.previousOfficialObservations.filter(h=>
   h.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"&&h.gp>0);
  const gp=total(good,"gp"),points=total(good,"pts");
  return {seasons:new Set(good.map(x=>x.leagueId)).size,
   gp,points,pointsPerGame:per(points,gp),
   priorTeams:[...new Set(good.map(x=>x.teamName))],
   duplicateSeasonTeamMayOvercount:new Set(good.map(x=>x.leagueId)).size<good.length};
 }
 function analyze(league,roster,leagueName){
  valid(league,roster);
  const t=league.teams.find(x=>x.leagueName===leagueName);
  need(t&&DIV.includes(t.divisionNow),"OUTSIDE_ADULT_COMPETITION");
  const source=roster.teams.find(x=>x.sourceTeamId===t.sourceTeamId);
  need(source,"MISSING_MATCHED_TEAM_ROSTER");
  const skaters=source.players.filter(x=>x.statStatus===
    "PUBLISHED_ARITHMETICALLY_CONSISTENT"&&x.gp>0)
    .map(x=>({...x,previous:previous(x),ptsPerGame:per(x.pts,x.gp),
      goalScoringCue:x.g>=2,playmakingCue:x.a>=2,
      availabilityVerified:false,positionVerified:!!x.positionAsPublished}))
    .sort((a,b)=>b.pts-a.pts||b.g-a.g||b.gp-a.gp||
     a.name.localeCompare(b.name));
  const pts=total(skaters,"pts");
  const div=bridge(league);
  const group=div.groups.find(x=>x.division===t.divisionNow);
  const tierMean=group.descriptiveMean;
  return {schema:"brave-hc-source-qualified-roster-scout/v1",
   name:t.leagueName,teamId:t.sourceTeamId,division:t.divisionNow,
   officialSource:source.sourceUrl,sourceLeagueAsOf:league.asOf,
   sourceRosterCaptureUTC:roster.asOf,
   rosterCount:source.rosterCount,activeListedWithGP:skaters.length,
   sourcePublishedRosterPoints:pts,
   topTwoShare:pts?Number((total(skaters.slice(0,2),"pts")/pts).toFixed(3)):null,
   experiencedCount:skaters.filter(x=>x.previous.gp>=10).length,
   priorLinkedIds:skaters.filter(x=>x.previous.seasons>=1).length,
   multiWinterPlayers:skaters.filter(x=>x.previous.seasons>=2).length,
   skaters,highPriority:skaters.slice(0,5),
   strengthContextIndex:t.strengthContext.contextIndex,
   withinDivisionGap:Number((t.strengthContext.contextIndex-tierMean).toFixed(1)),
   divisionContextMean:tierMean,divisionBridge:group,
   leagueBridge:div,
   historicalBravesMatchup:t.bravesMatchHistory?.state==="SOURCE_VERIFIED_H2H"?
    t.bravesMatchHistory.bravesAllTime:null,
   teamPreviousWinterQualified:t.previousWinter?.association==="ROSTER_ID_CONTINUITY_CONFIRMED",
   noCurrentGameDayAttendanceEvidence:true,
   noWinProbability:true,
   note:"Official player IDs corroborate historical season identity, not attendance at the next game. Player counts are published totals, not independently checked scoring events. Source dates and scoreboards may differ. A team with a weak record in a higher tier may still be stronger than a high-win club in a lower tier."};
 }
 function message(report,assignments=[]){
  need(report?.schema==="brave-hc-source-qualified-roster-scout/v1"&&Array.isArray(assignments),
    "UNVERIFIED_SCOUT_REPORT");
  const b=report.divisionBridge;
  return ["BRAVE H.C. — ROSTER AND DIVISION-AWARE OPPONENT SCOUT",
   "Opponent: "+report.name+" | "+report.division,
   "Strength context "+report.strengthContextIndex+"/100, "+
    (report.withinDivisionGap>0?"+":"")+report.withinDivisionGap+
    " versus division mean "+report.divisionContextMean+
    ". Descriptive only; no win odds.",
   "Actual cross-division bridge: "+b.crossDivisionGames+" verified games, "+
    b.crossRecord.w+"W–"+b.crossRecord.l+"L–"+b.crossRecord.t+
    "T (current division labels). "+
    (b.limitedSample?"LIMITED CROSS-DIVISION SAMPLE.":"Descriptive source sample only."),
   "Roster source: "+report.rosterCount+" listed players, "+
    report.activeListedWithGP+" with published GP, "+
    report.priorLinkedIds+" with earlier official player-ID records, "+
    report.experiencedCount+" with at least 10 earlier source games.",
   "Top two scoring-share: "+(report.topTwoShare===null?"unavailable":
     (report.topTwoShare*100).toFixed(1)+"%")+" of published player points.",
   "Scouting priorities: verify presence and position before using:",
   ...report.highPriority.slice(0,4).map((p,i)=>(i+1)+". "+
    p.name+" #"+p.jersey+": "+p.g+"G "+p.a+"A, "+p.gp+
    " public current GP; "+p.previous.gp+" past-source GP. "+
    (p.goalScoringCue?"Protect inside shooting lane. ":"Maintain inside positioning. ")+
    (p.playmakingCue?"Deny middle passing lanes.":"Guide puck toward boards.")),
   ...assignments,
   "Base system: F1 pressures carrier outside; strong winger seals inside pass; weak winger guards far lane; defenders hold inside and protect slot.",
   "SOURCE LIMITS: No game-day availability or position inferred from an archived season roster; historical player counts may contain inaccuracies; no outcome simulation.",
   "Official team: "+report.officialSource,
   "Source standings: "+report.sourceLeagueAsOf+
    " | roster captured "+report.sourceRosterCaptureUTC
  ].join("\n");
 }
 return Object.freeze({valid,analyze,bridge,message});
});
