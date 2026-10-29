'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const analyzer=require('../widgets/player-bio-advanced.js');
const cfg=require('../widgets/league-game-formats.json');
const real=require('../widgets/player-career-insights.json');
const format=(s,v)=>analyzer.factor(s,cfg,v);
test('all 18 supported HTO historical season formats are source-mapped for Winter and Summer',()=>{
 const seasons=new Set();
 for(const player of Object.values(real.players))for(const seg of player.segments||[])for(const row of seg.seasons||[])seasons.add(row.Season);
 assert.equal(seasons.size,18);
 for(const name of seasons){
   assert.ok(format(name,'winter')>0,name);
   assert.ok(format(name,'summer')>0,name);
 }
 assert.equal(format('Summer 2013','winter'),2/3);
 assert.equal(format('Winter 2013/2014','summer'),1.5);
 assert.equal(format('Summer 2040','winter'),null);
});
test('source-verified skater analysis across all 109 HTO profiles without invented values',()=>{
 let skaters=0,incomplete=0,held=0;
 for(const player of Object.values(real.players)){
  const seg=player.segments?.find(s=>s.kind==='skater');
  if(!seg)continue;skaters++;
  const before=JSON.stringify(seg);
  const r=analyzer.skater(seg,cfg);
  if(r.status==='HELD'){held++;continue;}
  assert.equal(r.kind,'skater');
  assert.ok(r.coverage.complete<=r.coverage.total);
  assert.ok(r.coverage.mapped<=r.coverage.complete);
  if(r.coverage.excluded>0){incomplete++;assert.equal(r.overview.winterPtsPerGP,null);}
  for(const k of ['verifiedSeasonWinterPtsPerGP','verifiedSeasonWinterGoalsPerGP','verifiedSeasonWinterAssistsPerGP']){
   if(r.overview[k]!==null)assert.ok(Number.isFinite(r.overview[k])&&r.overview[k]>=0);
  }
  for(const [k,n] of Object.entries(r.situational))if(n!==null)assert.ok(Number.isFinite(n),player.name+' '+k);
  assert.equal(JSON.stringify(seg),before);
 }
 assert.ok(skaters>=80);
 assert.ok(incomplete+held>0,'historic incomplete observations must be excluded or held');
});
test('skater normalized rate is games-played weighted, Summer/Winter totals and records unchanged',()=>{
 const seg={kind:'skater',total:{GP:10,G:5,A:5,Pts:10,PPG:1,PIM:8,GWG:1,POTG:2},seasons:[
  {Season:'Summer 2013',GP:5,G:3,A:2,Pts:5},
  {Season:'Winter 2013/2014',GP:5,G:2,A:3,Pts:5}
 ]};
 const before=JSON.stringify(seg);
 const result=analyzer.skater(seg,cfg);
 assert.equal(result.coverage.complete,2);
 assert.ok(Math.abs(result.overview.verifiedSeasonWinterPtsPerGP-(5*2/3+5)/10)<1e-12);
 assert.ok(Math.abs(result.overview.winterPtsPerGP-(5*2/3+5)/10)<1e-12);
 assert.equal(result.overview.rawPtsPerGP,1);
 assert.equal(result.situational.powerPlayShare,1/5);
 assert.equal(result.situational.penaltyMinutesPerGP,.8);
 assert.equal(result.situational.playerOfGameRateGP,.2,'Two POTG awards in ten actual GP = 20%');
 assert.equal(JSON.stringify(seg),before);
});
test('a missing HTO G/A row is never imputed as zero or used to claim career adjusted average',()=>{
 const seg={kind:'skater',total:{GP:7,G:1,A:2,Pts:3},seasons:[
  {Season:'Summer 2013',GP:2},
  {Season:'Winter 2013/2014',GP:5,G:1,A:2,Pts:3}
 ]};
 const r=analyzer.skater(seg,cfg);
 assert.equal(r.coverage.excluded,1);
 assert.equal(r.overview.winterPtsPerGP,null);
 assert.equal(r.overview.verifiedSeasonWinterPtsPerGP,.6);
});
test('season development compares independent three-season groups of 5+ GP only',()=>{
 const seg={kind:'skater',total:{GP:60,G:15,A:15,Pts:30},seasons:[
  ['Summer 2013',5],['Winter 2013/2014',5],['Summer 2014',5],
  ['Winter 2014/2015',10],['Summer 2015',10],['Winter 2015/2016',10]
 ].map(([Season,GP],i)=>({Season,GP,G:GP/5,A:GP/5,Pts:GP/5*2}))};
 const r=analyzer.skater(seg,cfg);
 assert.equal(r.development.recentSeasons.length,3);
 assert.equal(r.development.previousSeasons.length,3);
 assert.ok(Number.isFinite(r.development.pctDifference));
 assert.equal(r.overview.peak.gp>=5,true);
});
test('goalie metrics do not infer missing wins, save percentage, shots or shutouts',()=>{
 const seg={kind:'goalie',total:{GP:5,GA:15},seasons:[{Season:'Summer 2013',GP:5,GA:15}]};
 const r=analyzer.goalie(seg,cfg);
 assert.equal(r.overview.winPointsPct,null);
 assert.equal(r.overview.shutoutRateGP,null);
 assert.equal(r.overview.verifiedWinterGAperAppearance,2);
 assert.equal(r.overview.publishedActualGAA,3);
 assert.ok(!Object.hasOwn(r.overview,'savePercentage'));
});
test('verified POTG and shutout frequency use true game fractions, never a per-100 display unit',()=>{
 const justin=real.players['354060'].segments.find(s=>s.kind==='skater');
 const r=analyzer.skater(justin,cfg);
 assert.equal(justin.total.POTG,53);
 assert.equal(justin.total.GP,303);
 assert.ok(Math.abs(r.situational.playerOfGameRateGP-53/303)<1e-12);
 assert.ok(!Object.hasOwn(r.situational,'playerOfGamePer100'));
 const stephen=real.players['354055'].segments.find(s=>s.kind==='goalie');
 const g=analyzer.goalie(stephen,cfg);
 assert.equal(stephen.total.POTG,56);
 assert.equal(stephen.total.GP,262);
 assert.ok(Math.abs(g.overview.playerOfGameRateGP-56/262)<1e-12);
 assert.ok(g.overview.shutoutRateGP===null||g.overview.shutoutRateGP<=1);
});
test('real goalie archive is source-qualified and missing outcome fields remain unknown',()=>{
 let goalies=0,held=0;
 for(const p of Object.values(real.players)){
  const seg=p.segments?.find(s=>s.kind==='goalie');if(!seg)continue;goalies++;
  const before=JSON.stringify(seg);
  const r=analyzer.goalie(seg,cfg);
  if(r.status==='HELD'){held++;continue;}
  assert.ok(r.overview.verifiedWinterGAperAppearance>=0);
  if(r.overview.winPointsPct!==null)assert.ok(r.overview.winPointsPct>=0&&r.overview.winPointsPct<=1);
  assert.equal(JSON.stringify(seg),before);
 }
 assert.ok(goalies>=15);
});
test('strict unknown formats and inconsistent source values hold',()=>{
 assert.equal(analyzer.skater({kind:'skater',seasons:[{Season:'Winter 2050/2051',GP:0,G:0,A:0,Pts:0}]},cfg).status,'HELD');
 assert.equal(analyzer.factor('Winter 2050/2051',cfg,'winter'),null);
 assert.equal(analyzer.skater({kind:'goalie',seasons:[]},cfg).status,'HELD');
});
