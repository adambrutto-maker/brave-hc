"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const root=path.resolve(__dirname,"../widgets");
const read=x=>JSON.parse(fs.readFileSync(path.join(root,x),"utf8"));
const model=require("../widgets/roster-era-strength.js");
const league=read("league-intelligence.json"),
 roster=read("svhl-roster-intelligence.json"),
 archive=read("historical-svhl-standings.json");
const before=[JSON.stringify(league),JSON.stringify(roster),JSON.stringify(archive)];
const idx=model.archiveIndex(archive);
assert.equal(idx.size,191,"source-qualified archival adult Sunday team-season index");
assert.ok(![...idx.values()].some(x=>/VAHL|YOT|oldtimers|NYO/i.test(x.division)));
const all=model.allTeams(league,roster,archive);
assert.equal(all.length,22);
assert.equal(new Set(all.map(t=>t.teamId)).size,22);
assert.equal(all.reduce((n,x)=>n+x.rosterCount,0),348);
const braves=all.find(x=>x.name==="Braves HC");
assert.equal(braves.rosterCount,21);
assert.ok(braves.historicalLinkedGP>0&&braves.rosteredHistoricalIDs>0);
assert.ok(braves.historicalComparisonSupported);
assert.equal(braves.unverifiedAttendance,true);
assert.equal(braves.winProbability,null);
assert.equal(braves.historicalDivisionTierCalibrated,false);
assert.ok(braves.rosterEraScoringReferencePPG>=0);
assert.ok(braves.rosterEraScoringReferencePPG!==braves.currentlyPlayedPPG);
assert.match(model.teamNote(braves),/History-informed roster scoring reference/);
assert.match(model.teamNote(braves),/CURRENT-ROSTER HISTORY RESEARCH/);
assert.match(model.teamNote(braves),/2016\/17/);
assert.match(model.teamNote(braves),/not a confirmed next-game participant/);
assert.throws(()=>model.teamNote({...braves,winProbability:0.6}),/ROSTER_ERA_REPORT_NOT_ADMITTED/);
assert.equal(braves.currentTeamDescriptor,league.teams.find(t=>t.leagueName==="Braves HC").strengthContext.contextIndex);
const noHistory=all.filter(t=>!t.historicalComparisonSupported);
assert.ok(noHistory.length>0,"missing historical roster must be an explicit unknown");
for(const t of noHistory)if(t.rosteredHistoricalIDs===0){
 assert.equal(t.rosterEraScoringReferencePPG,t.currentlyPlayedPPG,
  "No historical roster evidence must not improve or penalize player scoring reference");
}
assert.ok(braves.players.every(p=>p.referenceHistoryPseudoGames<=8));
for(const t of all){
 assert.ok(t.currentlyPlayedPPG===null||t.currentlyPlayedPPG>=0);
 assert.ok(t.historicalCurrentPlayerCoverage>=0&&t.historicalCurrentPlayerCoverage<=100);
 assert.ok(t.players.length===t.rosterCount);
 for(const p of t.players)for(const obs of p.history){
  assert.ok(idx.has(obs.leagueId+"|"+obs.sourceTeamId));
  assert.equal(obs.division,idx.get(obs.leagueId+"|"+obs.sourceTeamId).division);
  assert.ok(obs.recencyWeight>0&&obs.recencyWeight<=1);
  assert.ok(!/VAHL/i.test(obs.division));
 }
}
const ageR=roster.teams.flatMap(t=>t.players).flatMap(p=>p.previousOfficialObservations)
 .find(x=>x.season==="Sunday Winter 2016/17");
assert.ok(ageR,"archive has an actual current roster player linked back to 2016/17");
const player=roster.teams.flatMap(t=>t.players).find(x=>x.previousOfficialObservations.includes(ageR));
const older=model.playerEvidence(player,idx).history.find(x=>x.season==="Sunday Winter 2016/17");
assert.ok(older.recencyWeight<0.2,"2016–17 should be substantially discounted");
const splits=[4,4,6,8];let off=0;
const groups=splits.map((size,i)=>({key:"g"+i,capacity:size,ids:all.slice(off,off+=size).map(x=>x.teamId)}));
const results=model.forGroups(all,groups);
assert.equal(results.length,4);
assert.equal(results.reduce((n,x)=>n+x.capacity,0),22);
assert.match(model.groupNote(all,groups),/not established/i);
assert.match(model.groupNote(all,groups),/CURRENT-ROSTER ERA DIVISION RESEARCH/);
assert.ok(results.every(x=>x.sourceTeamIds.length===x.capacity));
assert.ok(results.every(x=>x.meanEraScoringReferencePPG===null||x.meanEraScoringReferencePPG>=0));
assert.throws(()=>model.forGroups(all,[...groups,groups[0]]),/GROUP_ROSTER_TEAM_ID_UNVERIFIED/);
assert.throws(()=>model.forGroups(all,groups.slice(0,3)),/NOT_ALL_CURRENT_CLUBS_IN_GROUPS/);
assert.throws(()=>model.archiveIndex({...archive,status:"UNVERIFIED"}),/ARCHIVE_NOT_ADMITTED/);
assert.throws(()=>model.teamEvidence(league,roster,archive,"VAHL Division"),/CURRENT_TEAM_OUT_OF_SCOPE/);
assert.deepEqual([JSON.stringify(league),JSON.stringify(roster),JSON.stringify(archive)],before,
 "model must not change verified official feed, roster or archive");
for(const html of ["league-intelligence.html","division-fit-lab.html"]){
 const h=fs.readFileSync(path.join(root,html),"utf8");
 assert.match(h,/roster-era-strength\.js\?v=/);
 assert.match(h,/roster-era-view\.js\?v=/);
 assert.match(h,/roster-era-view\.css\?v=/);
}
console.log("ROSTER_ERA_MODEL_PASS",{currentTeams:all.length,currentPlayers:348,
 historicalQualifiedTeamEntries:idx.size,returningHistoricalTeamSources:braves.historicalSourceTeams,
 zeroHistoryTeams:noHistory.map(x=>x.name),season2017Weight:older.recencyWeight});
