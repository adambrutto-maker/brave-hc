"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const weekly=require("../widgets/weekly-strength-stability.js");
const source=JSON.parse(fs.readFileSync(path.join(__dirname,"../widgets/league-intelligence.json"),"utf8"));
const copy=o=>JSON.parse(JSON.stringify(o));
function addSyntheticWeek(original,{weekNumber=1,boosts=[],omitId=null,move=null}={}){
 const doc=copy(original),first=original.weeklyLedger.weeks.at(-1);
 const nextDate=new Date(Date.parse(first.observedAtUTC)+7*weekNumber*86400000);
 const stamp=nextDate.toISOString();
 const monday=new Date(Date.parse(first.weekStartToronto+"T00:00:00Z")+7*weekNumber*86400000)
   .toISOString().slice(0,10);
 const rows=first.teams.map(x=>({...x}));
 for(const {id,score} of boosts){
  const t=rows.find(x=>x.sourceTeamId===id);
  assert.ok(t,"Synthetic QA source ID not found");t.contextIndex=score;
  const current=doc.teams.find(x=>x.sourceTeamId===id);
  current.strengthContext.contextIndex=score;
 }
 if(move){
  const t=rows.find(x=>x.sourceTeamId===move.id);
  assert.ok(t);t.divisionNow=move.to;
  doc.teams.find(x=>x.sourceTeamId===move.id).divisionNow=move.to;
 }
 if(omitId!==null){
  const p=rows.findIndex(x=>x.sourceTeamId===omitId);
  assert.ok(p>=0);rows.splice(p,1);
 }
 doc.asOf=stamp;
 doc.weeklyLedger.weeks.push({
   weekStartToronto:monday,observedAtUTC:stamp,sourceSHA256:"f".repeat(64),teams:rows
 });
 doc.weeklyLedger.weeksRecorded=doc.weeklyLedger.weeks.length;
 return doc;
}
const tests=[
 ["Current one-week release has no claimed band, index or skill trend",()=>{
   const a=weekly.analyze(source);
   assert.equal(a.state,"SOURCE_BACKED_BASELINE_ONLY");
   assert.equal(a.completeObservedWeeks,1);
   assert.equal(a.poolTeamCount,22);
   assert.deepEqual(a.transitions,[]);
   assert.equal(a.lastTransition,null);
   assert.equal(a.latestWeekBandRetention,null);
   assert.equal(a.verifiedBandMovement,null);
   assert.ok(a.trajectories.every(t=>t.latestChange===null &&
     t.indexRange===null&&t.bandCrossings===null));
   assert.equal(a.dataReadyForHumanReview,false);
   assert.equal(a.recommendationIssued,false);
 }],
 ["One synthetic next-week observation allows measured source differences",()=>{
   const braves=source.teams.find(t=>t.leagueName==="Braves HC");
   const simulated=addSyntheticWeek(source,{boosts:[{id:braves.sourceTeamId,score:62}]});
   const a=weekly.analyze(simulated);
   assert.equal(a.completeObservedWeeks,2);
   assert.equal(a.transitions.length,1);
   assert.equal(a.state,"PROVISIONAL_WEEKLY_CHANGE");
   const brave=a.trajectories.find(x=>x.sourceTeamId===braves.sourceTeamId);
   assert.equal(brave.latestScore,62);
   assert.equal(brave.latestChange.indexDelta,25.5);
   assert.ok(brave.latestChange.rankChange>0);
   assert.equal(brave.series.length,2);
   assert.ok(a.lastTransition.bandCrossings>=1);
   assert.equal(a.dataReadyForHumanReview,false);
 }],
 ["Four source-shaped QA weeks remain research-only, not fake current data",()=>{
   let doc=copy(source);
   for(let i=1;i<=3;i++)doc=addSyntheticWeek(doc,{weekNumber:1});
   const a=weekly.analyze(doc);
   assert.equal(a.completeObservedWeeks,4);
   assert.equal(a.transitions.length,3);
   assert.ok(a.transitions.every(t=>t.bandCrossings===0 && t.meanAbsoluteScoreChange===0));
   assert.equal(a.verifiedBandMovement,0);
   assert.equal(a.latestWeekBandRetention,100);
   assert.equal(a.dataReadyForHumanReview,false); // no actual ten-game team evidence
   assert.equal(source.weeklyLedger.weeks.length,1);
 }],
 ["A missing calendar week is disclosed rather than interpolated",()=>{
   const a=weekly.analyze(addSyntheticWeek(source,{weekNumber:2}));
   assert.equal(a.completeObservedWeeks,2);
   assert.equal(a.transitions.length,1);
   assert.equal(a.transitions[0].weeksBetweenSnapshots,2);
   assert.equal(a.transitions[0].skippedCalendarWeeks,1);
   assert.deepEqual(a.trajectories[0].series.map(x=>x.week),
     ["2026-10-26","2026-11-09"]);
   assert.equal(a.dataReadyForHumanReview,false);
 }],
 ["Missing teammate in latest weekly capture blocks misleading adult comparison",()=>{
   const id=source.teams.find(t=>t.leagueName==="Braves HC").sourceTeamId;
   const d=addSyntheticWeek(source,{omitId:id});
   assert.throws(()=>weekly.analyze(d),/LATEST_ADULT_WEEK_INCOMPLETE/);
 }],
 ["Malformed weekly team numeric score is held without fake fallback",()=>{
   const d=copy(source);
   const braves=d.weeklyLedger.weeks[0].teams.find(t=>t.leagueName==="Braves HC");
   braves.contextIndex="38";
   assert.throws(()=>weekly.analyze(d),/NO_COMPLETE_VERIFIED_WEEK/);
 }],
 ["Source team identity change under the same current identifier is held",()=>{
   const d=addSyntheticWeek(source);
   const brave=d.weeklyLedger.weeks.at(-1).teams.find(t=>t.leagueName==="Braves HC");
   brave.leagueName="Invented Franchise";
   assert.throws(()=>weekly.analyze(d),/LATEST_ADULT_WEEK_INCOMPLETE/);
 }],
 ["Out-of-order weekly records are not accepted",()=>{
   const d=addSyntheticWeek(source);d.weeklyLedger.weeks[1].weekStartToronto="2026-10-26";
   assert.throws(()=>weekly.analyze(d),/SOURCE_WEEK_CHRONOLOGY_INVALID/);
 }],
 ["Publishing a previous current-week record for a new week fails parity",()=>{
   const d=addSyntheticWeek(source);
   d.weeklyLedger.weeks.at(-1).teams.find(t=>t.leagueName==="Braves HC").gp+=1;
   assert.throws(()=>weekly.analyze(d),/LATEST_WEEK_CURRENT_SOURCE_DIVERGENCE/);
 }],
 ["Cross-division movement is counted only on actual recorded weeks",()=>{
   const id=source.teams.find(t=>t.leagueName==="Maplewolves").sourceTeamId;
   const d=addSyntheticWeek(source,{move:{id,to:"Remax Division"}});
   const a=weekly.analyze(d);
   const row=a.trajectories.find(t=>t.sourceTeamId===id);
   assert.equal(row.latestChange.changedRealDivision,true);
   assert.equal(a.transitions[0].officialDivisionChanges,1);
 }],
 ["VAHL teams remain outside weekly ranking and cannot alter adult denominators",()=>{
   const d=copy(source);
   const va=d.weeklyLedger.weeks[0].teams.find(t=>t.divisionNow==="VAHL Division");
   va.contextIndex=99.9;
   const a=weekly.analyze(d);
   assert.equal(a.poolTeamCount,22);
   assert.ok(a.trajectories.every(t=>t.name!=="Philadelphia"));
 }],
 ["Analysis is fully read-only and deterministic on same source",()=>{
   const before=JSON.stringify(source);
   assert.deepEqual(weekly.analyze(source),weekly.analyze(source));
   assert.equal(JSON.stringify(source),before);
 }]
];
let failures=0;
for(const [label,fn] of tests)try{fn();console.log("PASS",label)}
catch(e){failures++;console.error("FAIL",label,e.stack||e)}
if(failures)process.exitCode=2;
else console.log("WEEKLY_STABILITY_SOURCE_TESTS_PASS",tests.length);
