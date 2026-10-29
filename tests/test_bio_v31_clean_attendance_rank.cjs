'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const engine=require('../widgets/player-bio-attendance-rank-v31.js');
const sourceSha='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
const season=engine.workbookEligibleSeason;
const realCareer=require('../widgets/player-career-insights.json');
assert.equal(engine.MIN_GP.skater,10);
assert.equal(engine.MIN_GP.goalie,8);
test('Master Workbook FT uses contested games, CU/DI uses player appearance opportunities',()=>{
 assert.deepEqual(season('FT',24,28),{gp:24,eligible:28,percent:24/28*100});
 assert.deepEqual(season('CU',6,28),{gp:6,eligible:6,percent:100});
 assert.deepEqual(season('DI',2,28),{gp:2,eligible:2,percent:100});
 assert.equal(season('CU',0,28),null,'No call-up opportunity must not be misrepresented as zero attendance');
 assert.equal(season('DI',0,28),null,'No drop-in opportunity must not be misrepresented as zero attendance');
 assert.equal(season('SCR',4,28),null,'Unknown roster statuses held');
 assert.equal(season('FT',29,28),null,'Player cannot appear more often than team contested games');
});
const make=(entries)=>({
 schema:'brave-hc-workbook-roster-adjusted-attendance/v1',
 status:'PREVIEW_ONLY_SOURCE_RECONCILIATION_PENDING',
 sourceMasterSHA256:sourceSha,
 authority:'Master Workbook RosterStatusBySeason cumulative GP / eligible games',
 rosterHistoryMatchedHTOPlayers:Object.keys(entries).length,
 players:Object.fromEntries(Object.entries(entries).map(([id,{role='skater',gp,eligible,seasonPct}])=>[id,{
  roles:[role],
  career:{gp,eligibleGames:eligible,percent:100*gp/eligible,status:'WORKBOOK_SOURCE_PARITY'},
  season:seasonPct==null?{status:'HELD_INCOMPLETE_CURRENT_ROSTER_OR_GOALIE_SOURCE'}:{
    status:'PROVISIONAL_HTO_CURRENT_WORKBOOK_ROSTER_CLASSIFICATION',
    gp:seasonPct,eligibleGames:5,percent:100*seasonPct/5,teamGames:5
  }
 }]))
});
test('Career database rank requires a substantial number of real games',()=>{
 const ledger=make({one:{gp:10,eligible:10},two:{gp:30,eligible:40},three:{gp:9,eligible:9}});
 const a=engine.rankAttendance(ledger,'one','skater');
 assert.equal(a.status,'QUALIFIED');assert.equal(a.rank,1);assert.equal(a.qualified,2);
 assert.equal(a.percent,100);assert.equal(a.gp,10);assert.equal(a.eligible,10);
 const low=engine.rankAttendance(ledger,'three','skater');
 assert.equal(low.status,'UNQUALIFIED');assert.equal(low.qualified,2);
 assert.equal(engine.rankAttendance({...ledger,sourceMasterSHA256:'bad'},'one','skater').status,'SOURCE_HELD');
});
test('Skater and goalie roles have separate ranking cohorts and GP minima',()=>{
 const ledger=make({goal1:{role:'goalie',gp:8,eligible:8},goal2:{role:'goalie',gp:9,eligible:12},
  skater:{gp:10,eligible:12}});
 const r=engine.rankAttendance(ledger,'goal1','goalie');
 assert.equal(r.rank,1);assert.equal(r.qualified,2);
 assert.equal(engine.rankAttendance(ledger,'skater','skater').qualified,1);
 assert.equal(engine.rankAttendance(ledger,'goal1','skater').status,'NO_WORKBOOK_PARITY');
});
test('Current percentage preserves source-qualified provisional status',()=>{
 const ledger=make({skater:{gp:25,eligible:27,seasonPct:4},goalie:{role:'goalie',gp:8,eligible:9}});
 const r=engine.seasonAttendance(ledger,'skater');
 assert.equal(r.status,'PROVISIONAL');assert.equal(r.percent,80);
 assert.equal(r.gp,4);assert.equal(r.eligible,5);
 assert.equal(engine.seasonAttendance(ledger,'goalie').status,'CURRENT_SEASON_HELD');
});
test('HTO career event-rate ranking keeps small samples out and respects tie breaks',()=>{
 const players={
 a:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:30,POTG:5,G:20,A:20,Pts:40,PPG:2,SHG:0,GWG:3,GTG:2,PIM:10}}]},
 b:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:28,POTG:6,G:15,A:5,Pts:20,PPG:3,SHG:1,GWG:0,GTG:0,PIM:0}}]},
 c:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:2,POTG:2,G:2,A:0,Pts:2,PPG:2,SHG:0,GWG:2,GTG:1,PIM:0}}]},
 d:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'goalie',total:{GP:9,POTG:3,PIM:2}}]}
 };
 const archive={schema:'brave-hc-player-career-insights/v1',players};
 const a=engine.rankMetric(archive,'a','skater','Player of Game / GP');
 assert.equal(a.status,'QUALIFIED');assert.equal(a.rank,2);assert.equal(a.qualified,2);
 assert.equal(engine.rankMetric(archive,'c','skater','Player of Game / GP').status,'UNQUALIFIED');
 assert.equal(engine.rankMetric(archive,'d','goalie','Player of Game / GP').qualified,1);
 assert.equal(engine.rankMetric(archive,'b','skater','Penalty minutes / GP').rank,1,'Lower PIM is the better discipline rank');
 assert.equal(engine.rankMetric(archive,'a','skater','Power-play goal share').qualified,2);
 assert.equal(engine.rankMetric(archive,'d','goalie','Power-play goal share'),null);
});
test('one Summer-season-sized 10-GP floor and scoring denominators keep 1-goal cases unranked',()=>{
 const list={
  strong:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:10,Pts:5,G:3,A:2,PPG:1,SHG:0,GWG:1,GTG:0,POTG:1,PIM:5}}]},
  lowPts:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:11,Pts:4,G:4,A:0,PPG:0,SHG:0,GWG:1,GTG:0,POTG:0,PIM:5}}]},
  lowGoals:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:12,Pts:8,G:2,A:6,PPG:1,SHG:0,GWG:0,GTG:0,POTG:0,PIM:1}}]},
  tooShort:{status:'VERIFIED_PROFILE_CAREER_SUM_PARITY',segments:[{kind:'skater',total:{GP:9,Pts:20,G:10,A:10,PPG:9,SHG:0,GWG:2,GTG:1,POTG:2,PIM:0}}]}
 };
 const a={schema:'brave-hc-player-career-insights/v1',players:list};
 const g=engine.rankMetric(a,'strong','skater','Goal share of points');
 assert.equal(g.status,'QUALIFIED');assert.equal(g.minimumGP,10);assert.equal(g.minimumDenominator,5);
 assert.equal(g.qualified,2,'4-point low denominator cannot gain a misleading top share rank');
 assert.equal(engine.rankMetric(a,'lowPts','skater','Goal share of points').status,'UNQUALIFIED');
 const pp=engine.rankMetric(a,'strong','skater','Power-play goal share');
 assert.equal(pp.status,'QUALIFIED');assert.equal(pp.minimumDenominator,3);
 assert.equal(pp.qualified,2,'Two goals is too few for a special-teams share rank');
 assert.equal(engine.rankMetric(a,'lowGoals','skater','Power-play goal share').status,'UNQUALIFIED');
 assert.equal(engine.rankMetric(a,'tooShort','skater','Player of Game / GP').status,'UNQUALIFIED');
});
test('real HTO archive ranks only players with verified metrics and 10+ skater GP',()=>{
 const players=Object.entries(realCareer.players);
 const min=engine.MIN_GP.skater;
 const qualified=players.filter(([id,p])=>p.status==='VERIFIED_PROFILE_CAREER_SUM_PARITY'&&
   (p.segments||[]).some(s=>s.kind==='skater'&&s.total?.GP>=min));
 assert.ok(qualified.length>=40,'At least 40 source-qualified 10-GP skaters in the current archive');
 const justin=engine.rankMetric(realCareer,'354060','skater','Player of Game / GP');
 const withPOTG=qualified.filter(([id,p])=>{
  const t=p.segments.find(s=>s.kind==='skater').total;
  return Number.isFinite(t.POTG)&&t.POTG>=0&&t.POTG<=t.GP;
 });
 assert.equal(justin.qualified,withPOTG.length);
 assert.ok(Math.abs(justin.value-53/303)<1e-12);
 const goalshare=engine.rankMetric(realCareer,'354060','skater','Goal share of points');
 const withFivePoints=qualified.filter(([id,p])=>p.segments.some(s=>s.kind==='skater'&&
  Number.isFinite(s.total?.G)&&s.total.G>=0&&Number.isFinite(s.total?.Pts)&&s.total.Pts>=5));
 assert.equal(goalshare.qualified,withFivePoints.length);
 assert.equal(goalshare.minimumDenominator,5);
});
test('Private-source exact parity can be checked locally without shipping player attendance to GitHub CI',()=>{
 const file=process.env.BRAVE_PRIVATE_ATTENDANCE_SHADOW;
 if(!file)return;
 const raw=require('node:fs').readFileSync(file,'utf8');
 const report=JSON.parse(raw);
 assert.equal(report.masterSHA256,sourceSha);
 assert.equal(report.allMatched.length,101);
 assert.ok(report.allMatched.every(r=>r.cachedGap===null||r.cachedGap<1e-8));
 const justin=report.allMatched.find(r=>r.id==='354060');
 const stephen=report.allMatched.find(r=>r.id==='354055');
 assert.ok(Math.abs(justin.rosterAdjustedPct-90.782122905)<1e-6);
 assert.ok(Math.abs(stephen.rosterAdjustedPct-81.984334203)<1e-6);
});
