/* HockeyOS rostered-player strength evidence by exact player ID, archived season and source team.
   Separate current form, historical cohort production and archival division context.
   Historical division names are NOT tier-equivalent and no win model is inferred. */
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveRosterEraStrength=api;
})(typeof window==="undefined"?globalThis:window,function(){
 "use strict";
 const need=(ok,m)=>{if(!ok)throw Error("ROSTER_ERA_HOLD:"+m)};
 const ADULT=["Fazzari Partners","The Cristillo Division","Remax Division"];
 const rate=(p,g)=>g>0?Number((p/g).toFixed(3)):null;
 const round=(x,n=1)=>Number(x.toFixed(n));
 function archiveIndex(archive){
  need(archive?.schema==="brave-hc-svhl-historical-divisions/v1"&&
   archive.status==="OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED"&&
   Array.isArray(archive.seasons),"ARCHIVE_NOT_ADMITTED");
  const records=new Map(),divisions=new Map(),observed=new Set();
  for(const season of archive.seasons){
   need(Number.isInteger(season.leagueId)&&Array.isArray(season.divisions)&&
    season.sourceSHA256?.match(/^[a-f0-9]{64}$/),"SEASON_SOURCE_INVALID");
   for(const division of season.divisions){
    if(division.category!=="COMPETITIVE_SUNDAY_DIVISION"||
       /VAHL|oldtimers|NYO|YOT/i.test(division.name))continue;
    const rows=(division.teams||[]).filter(t=>t.gp>0).map(t=>({
     ...t,winPct:(t.w+.5*t.t)/t.gp
    }));
    if(rows.length<3)continue;
    const ordered=[...rows].sort((a,b)=>b.winPct-a.winPct||b.pts-a.pts||
      a.seasonTeamId-b.seasonTeamId);
    for(const t of rows){
     const key=season.leagueId+"|"+t.seasonTeamId;
     need(!records.has(key)&&Number.isInteger(t.seasonTeamId)&&
       ["gp","w","l","t","gf","ga"].every(k=>Number.isInteger(t[k])&&t[k]>=0),
       "ARCHIVAL_TEAM_DUPLICATE_OR_INVALID");
     const rank=ordered.findIndex(x=>x.seasonTeamId===t.seasonTeamId)+1;
     records.set(key,{season:season.season,leagueId:season.leagueId,
      division:division.name,teamName:t.name,sourceTeamId:t.seasonTeamId,
      gp:t.gp,winPct:round(t.winPct,3),rank,divisionTeams:rows.length,
      relativeDivisionPosition:round(100*(rows.length-rank)/(rows.length-1),1),
      source:season.source,sourceSHA256:season.sourceSHA256});
    }
    divisions.set(season.leagueId+"|"+division.name,rows.length);
    observed.add(season.leagueId);
   }
  }
  need(observed.size>=5&&records.size>=140,"HISTORICAL_ADULT_SOURCE_TOO_SMALL");
  return records;
 }
 function yearOf(season){
  const m=String(season).match(/(20\d{2})\/(\d{2})/);
  return m?2000+Number(m[2]):null;
 }
 function playerEvidence(player,idx,seasonEnd=2026){
  const currentValid=player.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT";
  const history=[],held=[];
  const used=new Set();
  for(const obs of player.previousOfficialObservations||[]){
   const key=obs.leagueId+"|"+obs.sourceTeamId,meta=idx.get(key);
   if(!meta){held.push({leagueId:obs.leagueId,sourceTeamId:obs.sourceTeamId,
     reason:"OUTSIDE_QUALIFIED_ARCHIVAL_ADULT_DIVISION"});continue;}
   need(obs.division===meta.division&&obs.season===meta.season &&
     obs.statStatus==="PUBLISHED_ARITHMETICALLY_CONSISTENT"&&
     obs.pts===obs.g+obs.a&&Number.isInteger(obs.gp)&&obs.gp>=0&&
     !used.has(key),"ARCHIVAL_PLAYER_SEASON_MISMATCH_OR_DUPLICATE");
   used.add(key);
   const year=yearOf(obs.season);
   need(year!==null&&year<=seasonEnd,"ARCHIVE_YEAR_INVALID");
   const weight=Math.pow(0.82,Math.max(0,seasonEnd-year));
   if(obs.gp>0)history.push({
    leagueId:obs.leagueId,season:obs.season,team:meta.teamName,
    division:meta.division,sourceTeamId:obs.sourceTeamId,teamWinPct:meta.winPct,
    teamRank:meta.rank,divisionTeams:meta.divisionTeams,
    relativeDivisionPosition:meta.relativeDivisionPosition,
    gp:obs.gp,pts:obs.pts,g:obs.g,a:obs.a,
    ppg:rate(obs.pts,obs.gp),recencyWeight:round(weight,4),
    source:obs.source
   });
  }
  const sum=(arr,k)=>arr.reduce((z,x)=>z+x[k],0);
  const weightGP=history.reduce((n,h)=>n+h.gp*h.recencyWeight,0);
  const weightPts=history.reduce((n,h)=>n+h.pts*h.recencyWeight,0);
  const priorReferenceGP=Math.min(8,weightGP/5);
  const priorReferencePPG=rate(weightPts,weightGP);
  const scoringReferencePPG=player.gp>0&&currentValid?
   rate(player.pts+(priorReferencePPG??0)*priorReferenceGP,player.gp+priorReferenceGP):null;
  return {playerId:player.playerId,name:player.name,jersey:player.jersey,
   currentGP:player.gp,currentPoints:player.pts,currentPPG:currentValid?rate(player.pts,player.gp):null,
   scoringReferencePPG,referenceHistoryPseudoGames:round(priorReferenceGP,2),
   priorGP:sum(history,"gp"),priorPoints:sum(history,"pts"),
   priorPPG:rate(sum(history,"pts"),sum(history,"gp")),
   recencyWeightedPPG:rate(weightPts,weightGP),
   effectivePriorGP:round(weightGP,1),history,
   sourceHeld:held,rosteredNotGameDayConfirmed:true,
   isReturningActive:player.gp>0&&history.length>0};
 }
 function teamEvidence(league,roster,archive,leagueName){
  const scope=typeof module!=="undefined"&&module.exports?
   require("./roster-strength-scouting.js"):window.BraveRosterIntelligence;
  need(scope.valid(league,roster),"SOURCE_ROSTER_NOT_QUALIFIED");
  const idx=archiveIndex(archive),t=league.teams.find(t=>t.leagueName===leagueName);
  need(t&&ADULT.includes(t.divisionNow),"CURRENT_TEAM_OUT_OF_SCOPE");
  const team=roster.teams.find(x=>x.sourceTeamId===t.sourceTeamId);
  need(team,"CURRENT_ROSTER_TEAM_MISSING");
  const all=team.players.map(p=>playerEvidence(p,idx)),
    currentlyPlayed=all.filter(p=>p.currentGP>0),
    returners=currentlyPlayed.filter(p=>p.history.length>0),
    allWithHistory=all.filter(p=>p.history.length>0);
  const weighted=(arr,rateKey,weightKey)=>{
   const good=arr.filter(p=>p[rateKey]!==null&&p[weightKey]>0);
   const sum=good.reduce((n,p)=>n+p[rateKey]*p[weightKey],0);
   const denominator=good.reduce((n,p)=>n+p[weightKey],0);
   return denominator?round(sum/denominator,3):null;
  };
  const currentRosterPPG=weighted(currentlyPlayed,"currentPPG","currentGP");
  const rosterEraReferencePPG=weighted(currentlyPlayed,"scoringReferencePPG","currentGP");
  // Match only the current players who are linked to archival player IDs.
  const returningNowPPG=weighted(returners,"currentPPG","currentGP");
  const returningPastPPG=weighted(returners,"recencyWeightedPPG","effectivePriorGP");
  const allPriorPPG=weighted(allWithHistory,"recencyWeightedPPG","effectivePriorGP");
  const observations=allWithHistory.flatMap(x=>x.history);
  const divTeamPositions=observations.reduce((out,h)=>{
   const key=h.leagueId+"|"+h.sourceTeamId;
   if(!out.has(key))out.set(key,h);
   return out;
  },new Map());
  const teamPositions=[...divTeamPositions.values()].map(x=>x.relativeDivisionPosition);
  const positions=teamPositions.length?
   round(teamPositions.reduce((a,b)=>a+b,0)/teamPositions.length,1):null;
  const teamCount=new Set(observations.map(o=>o.leagueId+"|"+o.sourceTeamId)).size;
  const observedSeasons=new Set(observations.map(x=>x.leagueId)).size;
  const historicalFullCoverage=currentlyPlayed.length?
   returners.length/currentlyPlayed.length:0;
  return {schema:"hockeyos-current-rostered-player-era-evidence/v1",
   name:t.leagueName,division:t.divisionNow,teamId:t.sourceTeamId,
   currentTeamDescriptor:t.strengthContext?.status==="SOURCE_SUPPORTED_DESCRIPTIVE_CONTEXT"?
    t.strengthContext.contextIndex:null,
   currentGames:t.gamesConfirmed,rosterCount:all.length,
   currentPlayedCount:currentlyPlayed.length,currentlyPlayedPPG:currentRosterPPG,
   rosterEraScoringReferencePPG:rosterEraReferencePPG,
   returningPlayedCount:returners.length,rosteredHistoricalIDs:allWithHistory.length,
   currentReturningPPG:returningNowPPG,recencyWeightedHistoricalReturningPPG:returningPastPPG,
   allListedHistoricalPPG:allPriorPPG,
   historicalLinkedGP:allWithHistory.reduce((n,x)=>n+x.priorGP,0),
   historicalSourceTeams:teamCount,historicalSeasons:observedSeasons,
   priorTeamWithinDivisionPosition:positions,
   historicalCurrentPlayerCoverage:round(100*historicalFullCoverage,1),
   historicalComparisonSupported:returners.length>=4&&
    returners.reduce((n,x)=>n+x.effectivePriorGP,0)>=30,
   confidence:historicalFullCoverage>=.6&&t.gamesConfirmed>=10?
    "BROAD_ROSTER_EVIDENCE":"EARLY_OR_PARTIAL_ROSTER_EVIDENCE",
   players:all,sourceRosterCaptureUTC:roster.asOf,sourceLeagueAsOf:league.asOf,
   sourceArchiveUTC:archive.capturedUTC,unverifiedAttendance:true,winProbability:null,
   historicalDivisionTierCalibrated:false,
   note:"Historical official player-ID performance is linked to the CURRENT roster and weighted by season recency; archived team rank shows only performance inside its own division. Different divisions/years are NOT established as equal strength; this is offensive-production context, not a calibrated talent rating, defensive measure or win forecast."};
 }
 function allTeams(league,roster,archive){
  const list=league.teams.filter(t=>ADULT.includes(t.divisionNow));
  need(list.length===22,"ADULT_TEAM_COHORT_CHANGED");
  return list.map(t=>teamEvidence(league,roster,archive,t.leagueName));
 }
 function forGroups(reports,groups){
  const byId=new Map(reports.map(x=>[x.teamId,x])),seen=new Set();
  need(Array.isArray(groups)&&groups.length>=2&&groups.length<=6,"GROUP_LAYOUT_MISSING");
  const out=groups.map(group=>{
   const teams=group.ids.map(id=>{
    need(byId.has(id)&&!seen.has(id),"GROUP_ROSTER_TEAM_ID_UNVERIFIED");seen.add(id);
    return byId.get(id);
   });
   const known=teams.filter(t=>t.historicalComparisonSupported);
   const mean=(arr,k)=>arr.length?round(arr.reduce((s,t)=>s+t[k],0)/arr.length,2):null;
   return {groupKey:group.key,capacity:group.capacity,
    supportedTeams:known.length,teamsWithoutSupportedHistory:teams.length-known.length,
    meanCurrentRosterPPG:mean(teams.filter(t=>t.currentlyPlayedPPG!==null),"currentlyPlayedPPG"),
    meanEraScoringReferencePPG:mean(teams.filter(t=>t.rosterEraScoringReferencePPG!==null),
      "rosterEraScoringReferencePPG"),
    meanHistoricalReturningPPG:mean(known.filter(t=>t.recencyWeightedHistoricalReturningPPG!==null),
      "recencyWeightedHistoricalReturningPPG"),
    sourceTeamIds:teams.map(t=>t.teamId),
    caveat:"Historical scoring differs by opponent/division/era; do not use as an optimized rating or claim equal strength tiers."};
  });
  need(seen.size===22&&byId.size===22,"NOT_ALL_CURRENT_CLUBS_IN_GROUPS");
  return out;
 }
 function teamNote(r){
  need(r?.schema==="hockeyos-current-rostered-player-era-evidence/v1"&&
   r.winProbability===null&&!r.historicalDivisionTierCalibrated,
   "ROSTER_ERA_REPORT_NOT_ADMITTED");
  return [
   "BRAVE H.C. | CURRENT-ROSTER HISTORY RESEARCH — NOT AN OPPONENT PREDICTION",
   "Source current team: "+r.name+" | "+r.division,
   "Source descriptive team context: "+(Number.isFinite(r.currentTeamDescriptor)?
     r.currentTeamDescriptor+"/100":"unavailable")+
     "; "+r.currentGames+" current verified completed games.",
   "Current listed roster: "+r.rosterCount+"; played this season: "+r.currentPlayedCount+
    "; published current roster points/game: "+r.currentlyPlayedPPG+".",
   "History-informed roster scoring reference: "+r.rosterEraScoringReferencePPG+
    " P/GP per current active player (historical contribution capped at 8 pseudo-games "+
    "per rostered player and discounted by age). This is NOT a forecast.",
   "Same active currently rostered historical IDs: "+r.returningPlayedCount+
    "; their current points/game "+r.currentReturningPPG+
    "; their recency-weighted previous-season points/game "+
    (r.historicalComparisonSupported?r.recencyWeightedHistoricalReturningPPG:
      "HELD — insufficient comparable historical data")+".",
   "All currently rostered players with archived ID links: "+r.rosteredHistoricalIDs+
    "; archived source team-seasons "+r.historicalSourceTeams+
    "; archived counted player appearances "+r.historicalLinkedGP+
    " (published GP totals; multiple team registrations may overlap).",
   "Past source teams' mean relative finish within their own divisions: "+
    (r.priorTeamWithinDivisionPosition===null?"unavailable":
     r.priorTeamWithinDivisionPosition+" percentile-like position /100")+
    ". NOT evidence that the historical division tiers were equal.",
   "Old data weighting: each season weighted 0.82 per year farther back from 2025/26; "+
    "2016/17 observations remain eligible but receive less weight.",
   "CRITICAL: registered player is not a confirmed next-game participant. "+
    "Official historical scoring is not independently audited game-by-game. "+
    "No defensive strength, inter-era division tier calibration or winning odds are inferred.",
   "League source "+r.sourceLeagueAsOf+"; roster source "+r.sourceRosterCaptureUTC+
    "; archive "+r.sourceArchiveUTC+"."
  ].join("\n");
 }
 function groupNote(reports,groups){
  const values=forGroups(reports,groups);
  return [
   "HOCKEYOS | CURRENT-ROSTER ERA DIVISION RESEARCH — NOT REALIGNMENT APPROVAL",
   "Current adult Sunday teams "+reports.length+"; proposals use all 22 verified source IDs.",
   ...values.map((x,i)=>"Research division "+(i+1)+" ("+x.capacity+" teams): "+
    "current roster player points/game mean "+
    (x.meanCurrentRosterPPG===null?"unavailable":x.meanCurrentRosterPPG)+
    "; historical-informed roster reference "+
    (x.meanEraScoringReferencePPG===null?"unavailable":x.meanEraScoringReferencePPG)+
    "; returning cohort recency-weighted archival points/game "+
    (x.meanHistoricalReturningPPG===null?"unavailable":x.meanHistoricalReturningPPG)+
    "; "+x.supportedTeams+" teams with sufficient historical cohort evidence, "+
    x.teamsWithoutSupportedHistory+" held."),
   "Archive spans the official linked 2016/17–2025/26 winter seasons with gaps.",
   "Cross-division and cross-era competitive tier quality is NOT established. "+
    "Past team standings are within-division context; no forecast, official assignments "+
    "or calibrated player-strength weight.",
   "No roster availability or actual game-night lineup verified."
  ].join("\n");
 }
 return Object.freeze({archiveIndex,playerEvidence,teamEvidence,allTeams,forGroups,teamNote,groupNote});
});