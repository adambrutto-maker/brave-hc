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
 function officialUrl(url){
  try{const u=new URL(url);return u.protocol==='https:'&&
    ['htosports.com','www.htosports.com','leagues.sportsvillage.ca'].includes(u.hostname);
  }catch{return false}
 }
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
      !/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(g.date)||!Number.isFinite(Date.parse(g.date))||
      g.appeared!==true||g.verification!==GAME_VERIFIED||
      !officialUrl(g.sourceUrl)||
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
 const CROSS_SCHEMA='brave-hc-hto-cross-season-player-appearances/v1';
 const CROSS_VERIFIED='VERIFIED_SEASON_SCOPED_CROSS_SEASON_APPEARANCES';
 const HISTORICAL_GAME_VERIFIED='OFFICIAL_HISTORICAL_BOX_SCORE_ROW_AND_SEASON_GP_PARITY_VERIFIED';
 const isDate=s=>typeof s==='string'&&/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(s)&&
   !Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().startsWith(s);
 const sameId=(x,id)=>String(x)===String(id);
 const officialGameUrl=(url,id)=>{
  try{
   const u=new URL(url);
   return u.protocol==='https:'&&['www.htosports.com','htosports.com'].includes(u.hostname)&&
    u.pathname==='/teams/default.asp'&&
    u.searchParams.get('u')==='BRAVESHOCKEY'&&u.searchParams.get('p')==='boxscore'&&
    sameId(u.searchParams.get('gameID'),id);
  }catch{return false}
 };
 const seasonFromLabel=label=>{
  const m=/^(Winter|Summer) (20[0-9]{2})(?:\/(20[0-9]{2}))?$/.exec(label||'');
  if(!m)return null;
  if(m[1]==='Winter'&&Number(m[3])!==Number(m[2])+1)return null;
  return (m[1]==='Winter'?'W':'S')+m[2]+(m[3]?'/'+m[3].slice(-2):'');
 };
 function getCrossSeasonWindow(cross,current,id,windowSize){
  if(![3,5,10].includes(windowSize))return fail('INVALID_WINDOW');
  if(cross?.schema!==CROSS_SCHEMA||cross.status!==CROSS_VERIFIED||
     current?.schema!==SCHEMA||current.status!==VERIFIED||
     cross.season!==current.season||cross.asOf!==current.asOf||
     cross.currentSource?.asOf!==current.asOf||
     !Array.isArray(cross.currentSource?.gameIds)||
     !Array.isArray(current.coverage?.verifiedGameIds)||
     cross.currentSource.gameIds.length!==current.coverage.verifiedGameIds.length||
     !cross.currentSource.gameIds.every((v,i)=>v===current.coverage.verifiedGameIds[i])||
     cross.currentSource.verifiedGP!==current.coverage.verifiedSkaterAppearances)
   return fail('CROSS_SEASON_SOURCE_OR_CURRENT_SNAPSHOT_MISMATCH');
  const p=cross.players?.[String(id)];
  if(!p||!sameId(p.playerId,id)||!Array.isArray(p.games)||p.games.length>10||
     !count(p.currentVerifiedGP))return fail('CROSS_SEASON_PLAYER_SOURCE_UNVERIFIED');
  const currentPerson=current.players?.[String(id)];
  if(currentPerson){
   if(!count(currentPerson.gp)||p.currentVerifiedGP!==currentPerson.gp||
      !Array.isArray(currentPerson.games)||currentPerson.games.length!==currentPerson.gp)
    return fail('CROSS_SEASON_CURRENT_PLAYER_PARITY');
  }else if(p.currentVerifiedGP!==0)return fail('CROSS_SEASON_CURRENT_PLAYER_ABSENT');
  const currentById=new Map((currentPerson?.games||[]).map(g=>[g.gameId,g]));
  if(currentById.size!==(currentPerson?.games||[]).length)
   return fail('DUPLICATE_CURRENT_GAME_SOURCE');
  const eligibleHistorical=new Map();
  for(const [label,season] of Object.entries(cross.sourceSeasons||{})){
   if(season?.status==='VERIFIED_INDEX_COMPLETE'&&
      [32,48].includes(season.formatMinutes)&&
      Array.isArray(season.playedGameSources)&&
      season.playedGameSources.length===season.playedGames){
    const code=seasonFromLabel(label);
    const indexed=new Map(season.playedGameSources.map(g=>[g.id,g]));
    if(code&&indexed.size===season.playedGameSources.length)
      eligibleHistorical.set(code,{minutes:season.formatMinutes,games:indexed});
   }
  }
  const seen=new Set();let prev=null;
  const games=[];
  for(const g of p.games){
   const stamp=String(g?.date||'')+'T'+String(g?.time||'');
   if(!Number.isSafeInteger(g?.gameId)||g.gameId<=0||seen.has(g.gameId)||
      !isDate(g.date)||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(g.time)||
      !officialGameUrl(g.sourceUrl,g.gameId)||g.appeared!==true||
      !['Regular Season','Playoffs'].includes(g.phase)||
      ![32,48].includes(g.minutes)||![g.g,g.a,g.pts].every(count)||
      g.g+g.a!==g.pts)
    return fail('CROSS_SEASON_GAME_OR_SCORING_PROOF_INVALID');
   if(prev!==null&&stamp>prev)return fail('CROSS_SEASON_GAME_CHRONOLOGY_INVALID');
   prev=stamp;seen.add(g.gameId);
   if(g.season===current.season){
    const known=currentById.get(g.gameId);
    if(g.verification!==GAME_VERIFIED||g.minutes!==32||
       !known||known.date!==g.date||known.g!==g.g||
       known.a!==g.a||known.pts!==g.pts||
       !officialGameUrl(known.sourceUrl,known.gameId))
     return fail('CURRENT_GAME_CROSS_SEASON_SOURCE_MISMATCH');
   }else{
    const season=eligibleHistorical.get(g.season);
    const indexGame=season?.games?.get(g.gameId);
    if(g.verification!==HISTORICAL_GAME_VERIFIED||season?.minutes!==g.minutes||
       !indexGame||indexGame.date!==g.date||indexGame.time!==g.time||
       indexGame.phase!==g.phase)
      return fail('HISTORICAL_GAME_SEASON_DATE_OR_DURATION_UNVERIFIED');
   }
   games.push(g);
  }
  const actualCurrentInSlice=games.filter(g=>g.season===current.season).length;
  if(actualCurrentInSlice!==Math.min(p.currentVerifiedGP,10))
   return fail('CROSS_SEASON_CURRENT_GAME_COVERAGE_INVALID');
  if(games.length<windowSize)return fail('INSUFFICIENT_VERIFIED_BRAVE_APPEARANCES');
  const last=games.slice(0,windowSize);
  const points=last.reduce((n,g)=>n+g.pts,0);
  const eqPoints=last.reduce((n,g)=>n+g.pts*(32/g.minutes),0);
  return Object.freeze({
   status:'VERIFIED',gp:windowSize,pts:points,rate:points/windowSize,
   winterEquivalentRate:eqPoints/windowSize,
   sourceSeasons:[...new Set(last.map(g=>g.season))],
   includesPriorSeason:last.some(g=>g.season!==current.season),
   includesPlayoffs:last.some(g=>g.phase==='Playoffs'),
   oldestDate:last.at(-1).date,newestDate:last[0].date,
   gameIds:last.map(g=>g.gameId),asOf:cross.asOf,
   basis:'LAST_N_VERIFIED_BRAVE_HTO_PLAYER_APPEARANCES_ACROSS_SEASONS'
  });
 }
 return {SCHEMA,VERIFIED,GAME_VERIFIED,getRecentWindow,currentRate,compare,
  CROSS_SCHEMA,CROSS_VERIFIED,HISTORICAL_GAME_VERIFIED,getCrossSeasonWindow};
});
