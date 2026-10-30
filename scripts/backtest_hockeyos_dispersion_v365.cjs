'use strict';
// Historical folds are descriptive calibration checks, not validated forecasts.
// Training folds must precede holdout seasons chronologically.
const fs=require('node:fs'),path=require('node:path');
const b=require('./hockeyos-dispersion-v365.cjs');
const adaptive=require('../widgets/hockeyos-adaptive-trend-v365.js');
const p=require('../widgets/projection.json');
const historical=b.historical(
 require('../widgets/player-career-insights.json'),
 require('../widgets/league-game-formats.json'),p.season);
const rows=historical.records;
const median=b.quantile;
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
 const d=median(entries.map(([id,v])=>median(v.map(Math.abs),.5)),.5);
 const n=b.weightedQuantile(pairs,.25),c=b.weightedQuantile(neg,.5),
       h=b.weightedQuantile(pos,.5);
 if(!d||!n||!c||!h||n>=c||n>=h)return null;
 return {players:entries.length,observations:samples.length,
  scale:d,thresholds:{neutral:n,cold:c,hot:h},
  ratios:{neutral:n/d,cold:c/d,hot:h/d}};
}
function categorize(samples,thresholds){
 const count={COLD:0,COOL:0,NEUTRAL:0,WARM:0,HOT:0};
 for(const row of samples)count[adaptive.levelFor(row.pct,thresholds)]++;
 return count;
}
const candidates={
 fixed:{neutral:.05,cold:.15,hot:.15},
 historical:{
  neutral:historical.reference.neutralAbs,
  cold:historical.reference.coldAbs,
  hot:historical.reference.hotAbs},
 hybrid:{
  neutral:.05,cold:historical.reference.coldAbs,
  hot:historical.reference.hotAbs}
};
const folds=[];
for(const [label,key] of [['pre-2020',2020*2],['pre-2023',2023*2],['pre-2024',2024*2],['pre-2025',2025*2]]){
 const train=rows.filter(r=>r.seasonKey<key),
  holdout=rows.filter(r=>r.seasonKey>=key);
 const model=fit(train);
 if(!model||model.players<12||train.length<40||holdout.length<10)continue;
 folds.push({trainingCutoff:label,trainingPlayers:model.players,
  trainingObservations:model.observations,holdoutObservations:holdout.length,
  trainedScale:model.scale,trainedThresholds:model.thresholds,
  heldOutBandCounts:categorize(holdout,model.thresholds),
  fixedBandCounts:categorize(holdout,candidates.fixed),
  absoluteDifferenceFromFinal:{
   neutral:Math.abs(model.thresholds.neutral-candidates.historical.neutral),
   cold:Math.abs(model.thresholds.cold-candidates.historical.cold),
   hot:Math.abs(model.thresholds.hot-candidates.historical.hot)}
 });
}
const teamGP=require('../widgets/player-actuals-hourly.json').teamGP;
const sample=historical.reference;
const out={
 schema:'hockeyos-dispersion-descriptive-historical-validation/v1',
 producedFrom:'HTO published completed season rows and verified league duration bindings',
 scopeNotice:'Historical completed-season performance variability is not a forecast-error backtest; no complete historical forecast snapshots are claimed.',
 activeTeamGP:teamGP,
 historical:{independentPlayers:sample.effectiveSample.independentPlayers,
  qualifiedObservations:sample.effectiveSample.qualifiedPlayerSeasons,
  medianPlayerMedianAbs:sample.dispersion,
  equalPlayerWeightedThresholds:{...candidates.historical},
  medianGP:sample.medianQualifyingSeasonGP},
 current:{status:'UNRECONCILED_FORECAST_NOT_ADMITTED',qualifiedGPUsed:0},
 candidateThresholds:candidates,
 presentProvisionalPlayers:p.players.filter(r=>!r.trendInputs?.firstSeasonOrNoCareer&&typeof r.trend==='number')
  .map(r=>({name:r.name,pct:r.trend,
   historicalLabel:adaptive.levelFor(r.trend,candidates.historical),
   fixedLabel:adaptive.levelFor(r.trend,candidates.fixed)})),
 folds,
 interpretation:[
  'Source-driven thresholds may differ from prior seven-level labels; no player is forced into an expected category.',
  'Per-player median historical deviations give each qualifying player one vote in the reference scale.',
  'Equal-player weighted absolute/negative/positive quantiles determine the descriptive five-level boundaries.',
  'Current calibration remains held while projection is provisional or model-source parity is incomplete.',
  'No model predictive skill or dynamic current form has been established by these season-level folds.'
 ]
};
if(process.argv.includes('--write')){
 const file=path.resolve(__dirname,'../docs/261029_ENG61_Historical_Dispersion_Backtest_v1.json');
 fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
}
console.log(JSON.stringify({folds:folds.map(x=>({label:x.trainingCutoff,train:x.trainingObservations,holdout:x.holdoutObservations,
  bands:x.heldOutBandCounts})),
 historical:out.historical,current:out.current,
 write:process.argv.includes('--write')}));
module.exports={fit,categorize};
