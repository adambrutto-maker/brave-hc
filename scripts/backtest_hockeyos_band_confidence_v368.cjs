'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const builder=require('./hockeyos-dispersion-v365.cjs');
// Local pure fit: never invoke the legacy backtest's CLI on import.
function fit(samples){
 const groups={};for(const row of samples)(groups[row.id]??=[]).push(row.pct);
 const entries=Object.entries(groups),pairs=[],neg=[],pos=[];
 for(const [id,percentages] of entries){
  const w=1/percentages.length;
  for(const value of percentages){
   pairs.push({value:Math.abs(value),weight:w});
   if(value<0)neg.push({value:-value,weight:w});
   if(value>0)pos.push({value,weight:w});
  }
 }
 const q=builder.quantile,wq=builder.weightedQuantile;
 const d=q(entries.map(([id,v])=>q(v.map(Math.abs),.5)),.5);
 const n=wq(pairs,.25),c=wq(neg,.5),h=wq(pos,.5);
 if(!d||!n||!c||!h||n>=c||n>=h)return null;
 return {players:entries.length,observations:samples.length,
  scale:d,thresholds:{neutral:n,cold:c,hot:h}};
}
const adaptive=require('../widgets/hockeyos-adaptive-trend-v365.js');
const projection=require('../widgets/projection.json');
const doc=require('../widgets/hockeyos-team-dispersion-v365.json');
function count(rows,t){
 const c={COLD:0,COOL:0,NEUTRAL:0,WARM:0,HOT:0};
 for(const r of rows){
  const level=adaptive.levelFor(r.pct??r.trend,t);
  if(!level)throw Error('UNQUALIFIED_BAND_COUNT');
  c[level]++;
 }
 return c;
}
function report(){
 if(adaptive.validate(doc,projection).status!=='VERIFIED')throw Error('UNQUALIFIED_MODEL_REFERENCE');
 const history=builder.historical(require('../widgets/player-career-insights.json'),
   require('../widgets/league-game-formats.json'),projection.season);
 const all=history.records;
 const currentRows=projection.players.filter(x=>x.trendInputs?.firstSeasonOrNoCareer!==true&&
   typeof x.trend==='number'&&Number.isFinite(x.trend));
 const fixed={neutral:.05,cold:.15,hot:.15};
 const old={neutral:history.reference.neutralAbs,
  cold:history.reference.coldAbs,hot:history.reference.hotAbs};
 const now=doc.effective.thresholds;
 const folds=[];
 for(const [period,year] of [['pre-2020',2020],['pre-2023',2023],['pre-2024',2024],['pre-2025',2025]]){
  const t=year*2;
  const train=all.filter(x=>x.seasonKey<t),test=all.filter(x=>x.seasonKey>=t);
  const fitted=fit(train);
  if(!fitted||fitted.players<12||train.length<40||test.length<10)continue;
  const threshold=adaptive.thresholdsFor(fitted.scale);
  folds.push({period,trainPlayerCount:fitted.players,
   trainingSeasonObservations:train.length,holdoutSeasonObservations:test.length,
   trainDerivedD:fitted.scale,neutralWidth:threshold.neutral,outer:threshold.hot,
   proposedBands:count(test,threshold),olderPercentileBands:count(test,fitted.thresholds),
   fixedBands:count(test,fixed)});
 }
 const cases=currentRows.map(r=>{
  const state=adaptive.classify(r,projection,doc);
  if(state.status!=='VERIFIED')throw Error('SOURCE_PLAYER_UNQUALIFIED_'+r.name);
  return {name:r.name,sourcePct:r.trend,level:state.level,
    angle:state.angle,verifiedGp:state.evidence.verifiedGP,
    gpEvidenceTier:state.evidence.tier,sharedModelOutput:state.evidence.sharedZeroScoringOutput};
 });
 const result={
  schema:'hockeyos-eng61-v368-band-calibration-review/v1',
  source:{projectionExportedAt:projection.exportedAt,
   projectionSHA256:doc.model.projectionCanonicalHashSHA256,
   historicalPlayers:history.reference.effectiveSample.independentPlayers,
   qualifiedPlayerSeasons:all.length},
  status:doc.status,forecastCurrent:projection.modelCurrent,
  method:'Neutral within 5 degrees of 90 with 3.5 percent maximum; outer extremes half dispersion with 20 percent maximum, fixed around zero.',
  thresholds:{effectiveD:doc.effective.dispersion,
   neutral:now.neutral,negativeCold:-now.cold,positiveHot:now.hot,
   capNeutral:.035,capExtremes:.20,multiplier:.5,angleHalfWidth:5},
  evaluation:{historicalPercentileReference:old,
   provisionalFixedReference:fixed,
   proposedCurrentBands:count(currentRows,now),
   percentileCurrentBands:count(currentRows,old),
   fixedCurrentBands:count(currentRows,fixed),
   temporalHistoricalDescriptiveFolds:folds,
   limitations:'Completed historical player-seasons are not comparable out-of-sample in-season forecast predictions. Counts are descriptive and do not establish predictive accuracy.'},
  sourceConfidence:{
   officialPlayerCount:doc.playerEvidence.officialPlayerCount,
   gpSampleTiers:doc.playerEvidence.sampleSizeTiers,
   sharedZeroScoringModelPlayers:doc.playerEvidence.sharedZeroScoringOutputs,
   sourceAuthority:doc.playerEvidence.sourceAuthority,
   meaning:'Official game appearance count and shared-source assumptions, not probability of forecast accuracy.'},
  playerExamples:cases,
  policy:'An entire verified team may be HOT or COLD; no normalization about current group median, no percentile quotas.',
  sourceWorkbookModified:false,archiveModified:false,
  currentUpdateHeldReason:doc.current.status==='HELD'?doc.current.reason:null
 };
 return result;
}
const output=report();
const file=path.join(root,'docs/261030_ENG61_Narrow_Neutral_Confidence_Calibration_v368.json');
const raw=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--check')){
 if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==raw)throw Error('V368_CALIBRATION_REPORT_STALE');
}
if(process.argv.includes('--write'))fs.writeFileSync(file,raw);
console.log(JSON.stringify({policy:output.method,source:output.source,
 thresholds:output.thresholds,counts:output.evaluation.proposedCurrentBands,
 folds:output.evaluation.temporalHistoricalDescriptiveFolds.length,
 confidence:output.sourceConfidence,
 mode:output.status,write:process.argv.includes('--write')}));
module.exports={report};
