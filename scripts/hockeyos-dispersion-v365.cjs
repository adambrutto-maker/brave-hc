'use strict';
// ENG CHAT 61 — read-only historical team career-relative dispersion and
// source-gated current model calibration. Never mutates workbook/player sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),WD=path.join(ROOT,'widgets');
const read=name=>JSON.parse(fs.readFileSync(path.join(WD,name),'utf8'));
const int=n=>Number.isSafeInteger(n)&&n>=0;
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
const quantile=(v,q)=>{
 const a=v.filter(numeric).sort((x,y)=>x-y);
 if(!a.length||q<0||q>1)return null;
 const t=(a.length-1)*q,i=Math.floor(t),j=Math.ceil(t);
 return a[i]+(a[j]-a[i])*(t-i);
};
const median=v=>quantile(v,.5);
const weightedQuantile=(pairs,q)=>{
 const a=pairs.filter(x=>numeric(x.value)&&positive(x.weight)).sort((a,b)=>a.value-b.value);
 if(!a.length||q<0||q>1)return null;
 const total=a.reduce((sum,r)=>sum+r.weight,0);
 const target=q*total;let cumulative=0;
 for(const item of a){cumulative+=item.weight;if(cumulative>=target)return item.value;}
 return a[a.length-1].value;
};
function seasonKey(season){
 const m=/^(Winter|Summer) ([0-9]{4})(?:\/([0-9]{4}))?$/.exec(season||'');
 if(!m)return null;
 if(m[1]==='Winter'&&Number(m[3])!==Number(m[2])+1)return null;
 if(m[1]==='Summer'&&m[3])return null;
 return Number(m[2])*2+(m[1]==='Summer'?1:0);
}
function historical(archive,formats,activeSeason){
 const audit={profiles:0,skaters:0,verifiedSeasonRows:0,qualifiedObservations:0,
  exclusions:{invalidSeason:0,incompleteScoring:0,unverifiedDuration:0,insufficientPriorCareer:0,insufficientSeasonGP:0,tinyPriorRate:0},
  playerSamples:0};
 if(archive?.schema!=='brave-hc-player-career-insights/v1'||
  archive?.sourceAuthority!=='NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK'||
  formats?.schema!=='hockeyos-league-game-formats/v1'||
  formats?.configurationStatus!=='REFERENCE_FORMATS_AND_18_MASTER_SCHEDULE_SEASON_BINDINGS_VERIFIED')
  throw Error('HISTORICAL_SOURCES_UNVERIFIED');
 const currentKey=seasonKey(activeSeason.startsWith('W')?
  'Winter '+activeSeason.slice(1,5)+'/20'+activeSeason.slice(-2):
  'Summer '+activeSeason.slice(1));
 if(currentKey===null)throw Error('ACTIVE_SEASON_INVALID');
 const records=[],byPlayer={};
 for(const [id,profile] of Object.entries(archive.players||{})){
  audit.profiles++;
  if(profile.status!=='VERIFIED_PROFILE_CAREER_SUM_PARITY')continue;
  const seg=profile.segments?.find(x=>x.kind==='skater');
  if(!seg)continue;
  audit.skaters++;
  const history=[],seen=new Set();
  const seasons=(seg.seasons||[]).filter(x=>x.Team==='Brave H.C.').slice()
   .sort((a,b)=>(seasonKey(a.Season)??Infinity)-(seasonKey(b.Season)??Infinity));
  for(const row of seasons){
   const key=seasonKey(row.Season);
   if(key===null||key>=currentKey||seen.has(key)){audit.exclusions.invalidSeason++;continue;}
   seen.add(key);
   if(!int(row.GP)||!int(row.G)||!int(row.A)||!int(row.Pts)||row.G+row.A!==row.Pts||
      (row.GP===0&&row.Pts>0)){audit.exclusions.incompleteScoring++;continue;}
   const binding=formats.seasonBindings?.[row.Season+'::ALL_HTO_GAME_TYPES'];
   const format=formats.formats?.[binding?.formatId];
   const mins=format?.regulationGameMinutes;
   if(binding?.verificationStatus!=='VERIFIED'||
      format?.verificationStatus!=='VERIFIED'||!positive(mins)){
    audit.exclusions.unverifiedDuration++;continue;
   }
   if(row.GP===0)continue;
   audit.verifiedSeasonRows++;
   const ptsWinter=row.Pts*32/mins,priorGP=history.reduce((sum,x)=>sum+x.gp,0);
   const priorPts=history.reduce((sum,x)=>sum+x.ptsWinter,0);
   const priorRate=priorGP?priorPts/priorGP:0;
   if(row.GP<5)audit.exclusions.insufficientSeasonGP++;
   else if(priorGP<20||history.length<2)audit.exclusions.insufficientPriorCareer++;
   else if(priorRate<.20)audit.exclusions.tinyPriorRate++;
   else{
    const pct=(ptsWinter/row.GP)/priorRate-1;
    const obs={id,name:profile.name,season:row.Season,seasonKey:key,gp:row.GP,
      priorGP,priorSeasons:history.length,priorRate,
      sourceRate:ptsWinter/row.GP,pct};
    records.push(obs);(byPlayer[id]??=[]).push(obs);audit.qualifiedObservations++;
   }
   history.push({gp:row.GP,ptsWinter});
  }
 }
 const nplayers=Object.keys(byPlayer).length;
 const perPlayer=Object.entries(byPlayer).map(([id,rows])=>{
  const p=rows.map(r=>r.pct);
  return {id,name:rows[0].name,n:rows.length,medianAbs:median(p.map(Math.abs)),
    q25Abs:quantile(p.map(Math.abs),.25),meanSigned:median(p),nSeasonRows:rows.length};
 });
 const ds=perPlayer.map(x=>x.medianAbs);
 const weightedAbs=[],weightedNegative=[],weightedPositive=[];
 for(const [id,rows] of Object.entries(byPlayer)){
  const w=1/rows.length;
  for(const r of rows){
   weightedAbs.push({value:Math.abs(r.pct),weight:w});
   if(r.pct<0)weightedNegative.push({value:-r.pct,weight:w});
   if(r.pct>0)weightedPositive.push({value:r.pct,weight:w});
  }
 }
 if(nplayers<12||records.length<60)throw Error('HISTORICAL_SAMPLE_TOO_SMALL');
 const dispersion=median(ds);
 const neutralAbs=weightedQuantile(weightedAbs,.25);
 const coldAbs=weightedQuantile(weightedNegative,.5);
 const hotAbs=weightedQuantile(weightedPositive,.5);
 if(!positive(dispersion)||!positive(neutralAbs)||!positive(coldAbs)||!positive(hotAbs)||
   !(neutralAbs<coldAbs&&neutralAbs<hotAbs))
  throw Error('HISTORICAL_THRESHOLDS_INVALID');
 const minScale=quantile(ds,.10),maxScale=quantile(ds,.90);
 const gpMedian=median(records.map(x=>x.gp));
 const ref={status:'HISTORICAL_REFERENCE_VERIFIED',method:'MEDIAN_OF_PLAYER_MEDIAN_ABS_PERCENT_CHANGES',
  effectiveSample:{independentPlayers:nplayers,qualifiedPlayerSeasons:records.length,
    seasonGPMin:5,priorCareerGPMin:20,priorCareerSeasonsMin:2,careerRateMinPtsGP:.20,
    sourceGameTypes:'PUBLISHED_ALL_HTO_GAME_TYPES',normalizeMinutes:32},
  dispersion,neutralAbs,coldAbs,hotAbs,
  multipliers:{neutral:neutralAbs/dispersion,cold:coldAbs/dispersion,hot:hotAbs/dispersion},
  historicalScaleBounds:{min:minScale,max:maxScale},
  playerWeightedQuantiles:{absP25:neutralAbs,negativeAbsP50:coldAbs,positiveAbsP50:hotAbs},
  medianQualifyingSeasonGP:gpMedian,sourceCapturedAt:archive.capturedAt,
  sourceBasis:'Qualified completed HTO skater seasons mapped to verified winter-equivalent game minutes; not historical forecast snapshots.',
  audit};
 return {reference:ref,perPlayer,records};
}
function current(projection,feed,reference,now=new Date()){
 const held=reason=>({status:'HELD',reason,weight:0,qualifiedPlayers:0});
 if(projection?.modelCurrent!==true||projection?.projectionComplete!==true)
  return held('FORECAST_PROVISIONAL_OR_UNRECONCILED');
 if(feed?.schema!=='brave-hc-hto-player-actuals/v1'||feed.status!=='VERIFIED_HTO_CURRENT'||
    projection.season!==feed.season||!int(feed.teamGP)||feed.teamGP<5||
    !Array.isArray(feed.players))return held('LIVE_ACTUALS_UNVERIFIED');
 const recorded=projection.sourceInputs?.htoRecordedTeamGP;
 if(!int(recorded)||recorded!==feed.teamGP)return held('FORECAST_ACTUAL_TEAM_GP_MISMATCH');
 const stamp=Date.parse(feed.asOf||''),future=stamp-now.getTime();
 if(!Number.isFinite(stamp)||future>5*60*1000||now.getTime()-stamp>7*24*3600000)
  return held('CURRENT_SOURCE_STALE_OR_FUTURE');
 const actual=new Map();for(const p of feed.players){
  if(typeof p.name!=='string'||actual.has(p.name)||![p.gp,p.g,p.a,p.pts].every(int)||
     p.g+p.a!==p.pts||p.gp>feed.teamGP||(p.gp===0&&p.pts>0))
    return held('LIVE_PLAYER_SOURCE_PARITY_FAILED');
  actual.set(p.name,p);
 }
 if(!Array.isArray(projection.players)||projection.players.length<8)return held('PROJECTED_COHORT_UNQUALIFIED');
 const known=projection.players.filter(p=>p.trendInputs?.firstSeasonOrNoCareer!==true&&
  positive(p.trendInputs?.careerScoringRate));
 const minGP=Math.min(7,Math.max(4,Math.ceil(feed.teamGP*.35)));
 const rows=[];let gpSum=0;const seen=new Set();
 for(const p of known){
  if(typeof p.name!=='string'||seen.has(p.name))return held('DUPLICATE_MODEL_PLAYER');
  seen.add(p.name);
  const a=actual.get(p.name),c=p.trendInputs?.careerScoringRate,
   m=p.trendInputs?.projectedScoringRate;
  if(!a||a.gp<minGP||c<.2||(!numeric(m)||m<0)||!numeric(p.trend))continue;
  if(Math.abs(p.trend-(m/c-1))>5e-6)continue;
  rows.push({name:p.name,gp:a.gp,pct:p.trend});gpSum+=a.gp;
 }
 const coverage=known.length?rows.length/known.length:0;
 if(rows.length<6||coverage<.4)return held('LIVE_ELIGIBILITY_INSUFFICIENT');
 const values=rows.map(x=>x.pct),D=median(values.map(Math.abs));
 if(!numeric(D))return held('LIVE_DISPERSION_NOT_FINITE');
 const priorEquivalent=Math.max(1,reference.medianQualifyingSeasonGP*5);
 const confidence=Math.min(.8,(gpSum/(gpSum+priorEquivalent))*Math.min(1,rows.length/8));
 return {status:'CURRENT_VERIFIED',dispersion:D,
  teamMedianDirection:median(values),playerToPlayerMAD:median(values.map(x=>Math.abs(x-median(values)))),
  qualifiedPlayers:rows.length,eligiblePlayers:known.length,qualifiedPlayerGP:gpSum,
  minimumPlayerGP:minGP,playerCoverage:coverage,confidence,weight:confidence,
  sourceAsOf:feed.asOf,teamGP:feed.teamGP,
  evidenceScope:'QUALIFIED_RECONCILED_CURRENT_MODEL_PERCENT_TRENDS',qualifiedNames:rows.map(x=>x.name)};
}
function build(options={}){
 const now=options.now||new Date();
 const p=options.projection||read('projection.json');
 const a=options.archive||read('player-career-insights.json');
 const formats=options.formats||read('league-game-formats.json');
 const feed=options.actual||read('player-actuals-hourly.json');
 if(p.schema!=='brave-hc-workbook-projection/v1'||p.model!=='BravesRegularSeasonProjection')
  throw Error('PROJECTION_SOURCE_INVALID');
 const hist=historical(a,formats,p.season);
 const cur=current(p,feed,hist.reference,now);
 const H=hist.reference;
 const scale=cur.status==='CURRENT_VERIFIED'?
  Math.min(H.historicalScaleBounds.max,Math.max(H.historicalScaleBounds.min,
    (1-cur.confidence)*H.dispersion+cur.confidence*cur.dispersion)):H.dispersion;
 const boundaries={neutral:H.multipliers.neutral*scale,
  cold:H.multipliers.cold*scale,hot:H.multipliers.hot*scale};
 if(!(positive(scale)&&boundaries.neutral<boundaries.cold&&boundaries.neutral<boundaries.hot))
  throw Error('DYNAMIC_BOUNDS_INVALID');
 const sha=crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
 const status=cur.status==='CURRENT_VERIFIED'?'LIVE_DYNAMIC_VERIFIED':'HISTORICAL_REFERENCE_ONLY';
 return {schema:'hockeyos-team-career-relative-dispersion/v1',version:'3.6.5',
  status,calibrationStatus:'HISTORICAL_SEASON_DERIVED_NOT_FORECAST_BACKTEST_VALIDATED',
  generatedAt:cur.status==='CURRENT_VERIFIED'?feed.asOf:p.exportedAt,model:{
   sourceSeason:p.season,projectionExportedAt:p.exportedAt,
   workbookSourceHash:p.workbookSourceHash||null,projectionCanonicalHashSHA256:sha,
   provisional:p.modelCurrent!==true||p.projectionComplete!==true,
   sourceWorkbookPreserved:true,sourcePlayerTrendsPreserved:true,
   fiveCategoryWorkbookModelPreserved:true},
  definitions:{
   typicalCareerDeviation:'Median absolute signed player career-relative change, expressed as a decimal percentage.',
   playerToPlayerDispersion:'Median absolute deviation of qualified player percentages around team median.',
   signedTeamDirection:'Median qualified player signed career-relative percentage; never subtracted from player percentages.',
   effectiveDispersion:'Historical reference adjusted by verified current source confidence; bounded by historical player-scale quantiles.'
  },
  historical:H,
  current:cur,
  effective:{dispersion:scale,weight:cur.status==='CURRENT_VERIFIED'?cur.confidence:0,
   lowerScaleBound:H.historicalScaleBounds.min,upperScaleBound:H.historicalScaleBounds.max,
   referenceMode:status,
   thresholds:boundaries,
   orientation:'0_UP_90_RIGHT_180_DOWN',
   angleFormula:'90 - 180/Math.PI * atan(p / effectiveDispersion)',
   sourceModelIndependentOfStandardDeviation:true
  },
  qualification:{history:'PREVIOUS_SEASONS_ONLY_WITH_CAREER_BASELINE',
   current:'RECONCILED_FORECAST_AND_LIVE_ACTUALS_ONLY',
   avoidsRepeatedLowGPDeltas:true,
   currentUpdateHeldReason:cur.status==='CURRENT_VERIFIED'?null:cur.reason},
  audit:{eligibleHistoricalPlayers:H.effectiveSample.independentPlayers,
   historicalObservations:H.effectiveSample.qualifiedPlayerSeasons,
   historicalExamples:hist.perPlayer.slice(0,5).map(x=>({id:x.id,name:x.name,n:x.n,medianAbs:x.medianAbs})),
   excludedHistorical:H.audit.exclusions},
  sourceFiles:['projection.json','player-career-insights.json','league-game-formats.json','player-actuals-hourly.json']};
}
if(require.main===module){
 const out=build();
 const fp=path.join(WD,'hockeyos-team-dispersion-v365.json');
 if(process.argv.includes('--check')){
  if(!fs.existsSync(fp)||JSON.stringify(read('hockeyos-team-dispersion-v365.json'))!==JSON.stringify(out))
   throw Error('DISPERSION_SOURCE_SNAPSHOT_STALE');
 }
 if(process.argv.includes('--write')){
  if(fs.existsSync(fp)){
   const old=read('hockeyos-team-dispersion-v365.json');
   if(old.status==='LIVE_DYNAMIC_VERIFIED'&&out.status!=='LIVE_DYNAMIC_VERIFIED'){
    console.log(JSON.stringify({status:'HELD_RETAIN_PREVIOUS_LIVE_SNAPSHOT',
      reason:out.current.reason}));process.exit(0);
   }
  }
  fs.writeFileSync(fp,JSON.stringify(out,null,2)+'\n');
 }
 console.log(JSON.stringify({status:out.status,historical:out.historical.dispersion,
  current:out.current.status,weight:out.effective.weight,
  thresholds:out.effective.thresholds,sample:out.historical.effectiveSample,
  sourceHash:out.model.projectionCanonicalHashSHA256,write:process.argv.includes('--write')}));
}
module.exports={build,historical,current,quantile,weightedQuantile,seasonKey};
