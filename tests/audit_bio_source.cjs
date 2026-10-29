'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const c=require(path.join(root,'widgets/player-career-insights.json'));
const f=require(path.join(root,'widgets/league-game-formats.json'));
let counts={players:0,skater:0,goalie:0,dual:0,validSkaterSeason:0,invalidSkaterSeason:0,validGoalieSeason:0,goalieMissingOutcome:0,goalieMissingGA:0,unmappedSkaterSeason:0,situational:{},skaterDistinctSeasons:new Set()};
const sampled=[];
for(const [id,p] of Object.entries(c.players)){
 counts.players++;
 const ss=p.segments?.find(s=>s.kind==='skater'),gs=p.segments?.find(s=>s.kind==='goalie');
 if(ss)counts.skater++;if(gs)counts.goalie++;if(ss&&gs)counts.dual++;
 for(const r of ss?.seasons||[]){
  counts.skaterDistinctSeasons.add(r.Season);
  if([r.GP,r.G,r.A,r.Pts].every(v=>Number.isSafeInteger(v)&&v>=0) && r.G+r.A===r.Pts)counts.validSkaterSeason++;else{counts.invalidSkaterSeason++;if(sampled.length<4)sampled.push({id,name:p.name,row:r});}
  if(!f.seasonBindings?.[r.Season+'::ALL_HTO_GAME_TYPES'])counts.unmappedSkaterSeason++;
  for(const key of ['PPG','SHG','GWG','GTG','PIM','+/-','POTG'])if(Number.isFinite(r[key]))counts.situational[key]=(counts.situational[key]||0)+1;
 }
 for(const r of gs?.seasons||[]){
  if([r.GP,r.GA].every(v=>Number.isSafeInteger(v)&&v>=0))counts.validGoalieSeason++;else counts.goalieMissingGA++;
  if(![r.W,r.L,r.T].every(v=>Number.isSafeInteger(v)&&v>=0))counts.goalieMissingOutcome++;
 }
}
counts.skaterDistinctSeasons=[...counts.skaterDistinctSeasons];
console.log(JSON.stringify({counts,sampled},null,2));
