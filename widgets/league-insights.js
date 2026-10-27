/* Source-qualified, plain-language League Intelligence; no prediction or roster identity guesses. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveLeagueInsights=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const COMP="COMPETITIVE_SUNDAY_DIVISION";
 const norm=x=>String(x||"").trim().toLowerCase();
 const exact=(x,y)=>norm(x)===norm(y); // no punctuation/identity merging across seasons
 const limit=(v,n=1)=>Number.isFinite(v)?v.toFixed(n):"unavailable";
 const need=(ok,s)=>{if(!ok)throw Error("LEAGUE_INSIGHTS_HOLD:"+s)};
 function verify(league,archive){
  need(league?.schema==="brave-hc-league-intelligence/public-v1" &&
    league.currentSourceDataConcordant===true &&
    league.strengthModel?.type==="DESCRIPTIVE_NOT_PREDICTIVE" &&
    league.strengthModel.probabilityOfWinning===false &&
    Array.isArray(league.teams) && Array.isArray(league.divisions) &&
    league.weeklyLedger?.schema==="brave-hc-svhl-weekly-context/v1" &&
    Array.isArray(league.weeklyLedger.weeks) &&
    league.weeklyLedger.weeks.length===league.weeklyLedger.weeksRecorded,
    "CURRENT_LEAGUE_NOT_QUALIFIED");
  need(archive?.schema==="brave-hc-svhl-historical-divisions/v1" &&
    archive.status==="OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED" &&
    archive.sourceScope==="OFFICIAL_SEASON_STANDINGS_NOT_CROSS_SEASON_TEAM_IDENTITY" &&
    archive.publishedPersonalRosterData===false &&
    Array.isArray(archive.seasons) && archive.seasons.length===archive.seasonsCollected &&
    archive.seasons.length>=1,"HISTORICAL_ARCHIVE_NOT_QUALIFIED");
 }
 function historicalNames(archive,teamName){
  const matches=[];
  for(const season of archive.seasons)for(const division of season.divisions){
   if(division.category!==COMP)continue;
   for(const record of division.teams)
    if(exact(record.name,teamName))
     matches.push({season:season.season,leagueId:season.leagueId,
       division:division.name,name:record.name,source:season.source,
       record:{gp:record.gp,w:record.w,l:record.l,t:record.t,gf:record.gf,ga:record.ga},
       identity:"SAME_DISPLAY_NAME_ONLY_ROSTER_CONTINUITY_NOT_VERIFIED"});
  }
  return matches;
 }
 function verifiedSeasonNames(links,name){
  if(!links)return [];
  return links.teamSeasons.filter(g=>exact(g.officialTeamName,name))
   .map(g=>({season:g.season,division:g.officialDivision,
     count:g.bravesRecord.gp,bravesRecord:g.bravesRecord,
     officialSource:g.officialTeamPage,
     caution:"VERIFIED_SEASON_GAMES_NOT_VERIFIED_CURRENT_FRANCHISE_CONTINUITY"}));
 }
 function divisionHistoricalBridges(links){
  if(!links)return [];
  const group=new Map();
  for(const item of links.teamSeasons){
   const k=item.season+"|"+item.officialDivision;
   if(!group.has(k))group.set(k,{season:item.season,
     division:item.officialDivision,games:0,w:0,l:0,t:0,
     gf:0,ga:0,opponents:[],source:item.officialTeamPage});
   const a=group.get(k),r=item.bravesRecord;
   a.games+=r.gp;a.w+=r.w;a.l+=r.l;a.t+=r.t;a.gf+=r.gf;a.ga+=r.ga;
   a.opponents.push(item.officialTeamName);
  }
  return [...group.values()].sort((a,b)=>b.season.localeCompare(a.season)||
     b.games-a.games||a.division.localeCompare(b.division));
 }
 function weekly(league,team){
  const series=league.weeklyLedger.weeks.map(w=>({
    week:w.weekStartToronto,asOf:w.observedAtUTC,
    team:w.teams.find(x=>x.sourceTeamId===team.sourceTeamId)
  })).filter(w=>w.team);
  const latest=series.at(-1),prior=series.length>=2?series.at(-2):null;
  const delta=latest&&prior&&Number.isFinite(latest.team.contextIndex)&&
    Number.isFinite(prior.team.contextIndex)?
    Number((latest.team.contextIndex-prior.team.contextIndex).toFixed(1)):null;
  return {count:series.length,latest,previous:prior,delta,points:series};
 }
 function plain(league,archive,name,links=null){
  verify(league,archive);
  const team=league.teams.find(x=>x.leagueName===name);
  need(Boolean(team),"TEAM_NOT_FOUND");
  const r=team.record,s=team.strengthContext;
  need(Number.isInteger(r.gp)&&r.gp>=0&&r.gp===team.completedGames.length,
    "RECORD_NOT_RECONCILED");
  const gf=r.gp?r.gf/r.gp:null,ga=r.gp?r.ga/r.gp:null;
  const history=team.bravesMatchHistory?.state==="SOURCE_VERIFIED_H2H"?
    team.bravesMatchHistory.bravesAllTime:null;
  const weeks=weekly(league,team);
  const prior=team.previousWinter;
  return {
   name:team.displayName,leagueName:team.leagueName,division:team.divisionNow,
   record:r,gfPerGame:gf,gaPerGame:ga,
   scored:gf===null?"No completed games to assess.":"Scores "+limit(gf,2)+" goals per game.",
   conceded:ga===null?"Defensive record not established.":"Allows "+limit(ga,2)+" goals per game.",
   form:"Verified current season: "+r.w+" wins, "+r.l+" losses, "+r.t+" ties in "+r.gp+" games.",
   evidence:r.gp<5?"Very early sample — comparison is provisional.":
     r.gp<10?"Limited sample — more games are needed.":"Larger sample, but this remains a descriptive comparison.",
   score:Number.isFinite(s.contextIndex)?s.contextIndex:null,
   confidence:s.confidence,schedule:s.scheduleDifficulty,
   crossDivMatches:team.gamesVsTeamsNowInOtherDivisions,
   crosses:"Played "+team.gamesVsTeamsNowInOtherDivisions+" of "+r.gp+
     " games against teams now in other divisions; those matches help connect the league.",
   historicalH2H:history,
   officialPreviousWinter:prior?{
     source:prior.sourceUrl,division:prior.division,
     record:prior.record,identityEvidence:"OFFICIAL_PLAYER_ID_ROSTER_CONTINUITY_CONFIRMED"}:null,
   exactHistoricalNameObservations:historicalNames(archive,team.leagueName),
   sourceMatchedOldGameSeasons:verifiedSeasonNames(links,team.leagueName),
   weekly:weeks,
   date:league.asOf,
   caution:"Rating is descriptive, not a win probability. Same-name historical teams are not assumed to be the same roster."
  };
 }
 function divisionReview(league,archive){
  verify(league,archive);
  const scope=typeof module!=="undefined"&&module.exports?require("./adult-league-scope.js"):window.BraveAdultLeagueScope;
  const groups=scope.divisions(league).map(d=>{
   const teams=league.teams.filter(t=>t.divisionNow===d.name);
   const indices=teams.map(t=>t.strengthContext?.contextIndex).filter(Number.isFinite);
   const sorted=[...indices].sort((a,b)=>a-b);
   const mean=indices.length?indices.reduce((a,b)=>a+b,0)/indices.length:null;
   const spread=sorted.length>=2?sorted.at(-1)-sorted[0]:null;
   const avgGP=teams.length?teams.reduce((n,t)=>n+t.record.gp,0)/teams.length:0;
   return {division:d.name,teams:teams.length,ranked:indices.length,
      meanIndex:mean===null?null:Number(mean.toFixed(1)),
      lowest:sorted.length?sorted[0]:null,highest:sorted.length?sorted.at(-1):null,
      spread:spread===null?null:Number(spread.toFixed(1)),
      avgGames:Number(avgGP.toFixed(1)),
      crossDivisionGameRows:teams.reduce((n,t)=>n+t.gamesVsTeamsNowInOtherDivisions,0),
      historicalBraveLinks:teams.filter(t=>t.bravesMatchHistory?.state==="SOURCE_VERIFIED_H2H").length,
      interpretation:avgGP<5?
       "Early season — not enough games for a defensible division change.":
       spread===null?"Insufficient rated teams.":spread>=20?
       "Wide descriptive ratings spread; review head-to-head and lineup continuity.":"Ratings are closer; verify actual matchup competitiveness."};
  });
  const eligible=scope.teams(league);
  const enough=eligible.filter(t=>t.record.gp>=10).length;
  const observedWeeks=league.weeklyLedger.weeks.length;
  const proposalReady=eligible.length>0 && enough/eligible.length>=.75 && observedWeeks>=4;
  return {groups,eligibleTeams:eligible.length,atLeastTenGames:enough,
   weeksObserved:observedWeeks,historicalSeasons:archive.seasons.length,
   proposalReady,status:proposalReady?"EVIDENCE_THRESHOLD_MET_REVIEW_REQUIRED":
    "EARLY_RESEARCH_NOT_A_DIVISION_RECOMMENDATION",
   rationale:proposalReady?
    "Enough initial coverage to begin a reviewed division proposal. Still require league consultation, current roster evidence and fixture fairness assessment.":
    "Division changes are not recommended yet. Wait for at least four weekly observations and ten current games for 75% of competitive teams before proposing a grouping.",
   method:"Descriptive source-qualified context only. Group averages and spreads do not compare division strength as a calibrated skill scale."};
 }
 return Object.freeze({verify,plain,weekly,divisionReview,historicalNames,verifiedSeasonNames,divisionHistoricalBridges});
});
