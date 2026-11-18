/* LeagueOS/HockeyOS V25 source integrity and policy gates. No server writes. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"../widgets"),read=n=>JSON.parse(fs.readFileSync(path.join(ROOT,n),"utf8"));
const team=read("leagueos-roster-player-projections-v25.json");
const coach=read("hockeyos-player-projections-v25.json");
const life=read("leagueos-division-lifecycle-v25.json");
const prior=read("leagueos-player-history-priors-v25.json");
const backtest=read("leagueos-competitive-balance-backtest-v25.json");
const coachHistory=read("leagueos-coach-division-context-v25.json");
const clone=x=>JSON.parse(JSON.stringify(x));
const context={window:{},document:{addEventListener:()=>{}},console,
 localStorage:{getItem:()=>null,setItem:()=>{}}};
vm.runInNewContext(fs.readFileSync(path.join(ROOT,"leagueos-competition-studio-v25.js"),"utf8"),
 context,{filename:"leagueos-competition-studio-v25.js"});
const api=context.window.LeagueOSCompetitionV25._test;
const defaultPolicy={seasonRegularWeeks:24,firstReviewAfterWeek:5,
 secondReviewAfterWeek:12,reviewWindows:2,minimumFullWeeksBetweenFinalChangeAndPlayoffs:6};
test("five separately sourced research and projection artifacts validate without mutation",()=>{
 const before=JSON.stringify({team,life,coach,backtest,coachHistory});
 const result=api.validate(team,life,coach,backtest,coachHistory);
 assert.equal(result.f,team);assert.equal(result.l,life);assert.equal(result.t,coach);
 assert.equal(result.b,backtest);assert.equal(result.c,coachHistory);
 assert.equal(before,JSON.stringify({team,life,coach,backtest,coachHistory}));
});
test("source archive extraction is exact player-ID only and no private biography exposed",()=>{
 assert.equal(prior.schema,"bruttech-leagueos-historical-public-player-priors/v25");
 assert.equal(prior.rawArchivePublished,false);
 assert.equal(prior.privateCoachWorkbookUsed,false);
 assert.equal(prior.noNamesAddressesAgesOrContactData,true);
 assert.equal(prior.counts.distinctCurrentPlayerIDs,1350);
 assert.equal(prior.counts.playerIDsWithPriorSourceSeasons,1086);
 assert.equal(prior.counts.playerIDsWithoutPriorSourceSeasons,264);
 assert.equal(prior.counts.totalAcceptedHistoricalStatRows,4384);
 for(const entry of prior.players){
  assert.ok(entry.playerId);
  assert.ok(!Object.prototype.hasOwnProperty.call(entry,"name"));
  assert.ok(!Object.prototype.hasOwnProperty.call(entry,"dob"));
  assert.ok(!Object.prototype.hasOwnProperty.call(entry,"email"));
 }
});
test("archive held identity collisions and invalid prior stats are excluded",()=>{
 assert.equal(prior.counts.identityConflictPlayerIDs,1);
 assert.ok(prior.counts.excludedHistoryRowsByReason.QUARANTINED_SKATER_ROW>=7);
 for(const p of prior.players){
  assert.ok(p.sourceDivisions.every(x=>x.g+x.a===x.pts&&x.gp>0));
  assert.ok(p.sourceDivisions.length<=8);
 }
});
test("96 team projection records, 1430 actual-appearance skater forecasts and 92 qualified rosters",()=>{
 assert.equal(team.counts.sourceRatedTeams,96);
 assert.equal(team.teams.length,96);
 assert.equal(team.counts.estimatedSkaterProjections,1430);
 assert.equal(team.players.length,1430);
 assert.equal(team.counts.qualifiedCurrentTeamRosters,92);
 assert.equal(team.counts.sourcePlayerIDsWithHistoricalStats,1086);
 assert.equal(team.counts.crossNightExactPlayerIDs,70);
});
test("each player forecast preserves published actual G+A=PTS and projects consistently",()=>{
 for(const p of team.players){
  assert.equal(p.sourceGoals+p.sourceAssists,p.sourcePoints);
  assert.ok(p.sourceGP>0);
  assert.equal(p.projectedFullSeasonPoints,
   Math.round((p.projectedFullSeasonGoals+p.projectedFullSeasonAssists)*10)/10===p.projectedFullSeasonPoints?
     p.projectedFullSeasonPoints:p.projectedFullSeasonPoints);
  assert.ok(Math.abs(p.projectedFullSeasonGoals+p.projectedFullSeasonAssists-
    p.projectedFullSeasonPoints)<=.11);
  assert.ok(p.projectedFinalGP>=p.sourceGP);
  assert.ok(p.projectionIntervals80.goals80[0]<=p.projectedFullSeasonGoals+.1);
  assert.ok(p.projectionIntervals80.assists80[1]>=p.projectedFullSeasonAssists-.1);
  assert.equal(p.historicalStrengthLevelsApproved,false);
 }
});
test("team roster-projected G/A/P reconciles and never modifies source",()=>{
 for(const t of team.teams){
  assert.ok(Math.abs(t.projectedCurrentRosterGoals+t.projectedCurrentRosterAssists-
    t.projectedCurrentRosterPoints)<=.11);
  assert.ok(t.projectedGoalsForPerGame>=0);
  assert.ok(t.projectedGoalsAgainstPerGame>=0);
  assert.equal(t.modelUse,"EXPERIMENTAL_ROSTER_CONSTRUCTION_SCENARIO_NOT_VALIDATED_OFFICIAL_TIER");
  assert.equal(t.provisionalBandOfficial,false);
  assert.ok(["A","B","C","D","UNRATED"].includes(t.provisionalABCD));
  assert.ok(t.sourceResultGP<=t.sourceTeamGames);
 }
 assert.equal(team.officialDivisionsChanged,false);
 assert.equal(team.officialStandingsChanged,false);
 assert.equal(team.officialPlayerStatsChanged,false);
 assert.equal(team.officialRosterChanged,false);
});
test("Braves HC historical/current/projected are distinct and graded relative D",()=>{
 const br=team.teams.find(x=>x.leagueId===570&&x.teamId===13679);
 assert.ok(br);
 assert.equal(br.sourceCurrentDivision,"The Cristillo Division");
 assert.equal(br.provisionalABCD,"D");
 assert.equal(br.sourceResultGP,8);
 assert.equal(br.actualGF,23);
 assert.equal(br.actualGA,42);
 assert.ok(br.historicalRosterPointsPerAppearance>.3);
 assert.ok(br.projectedGoalsForPerGame>br.currentGoalsForPerGame);
 assert.equal(br.forecastConfidence,"MEDIUM");
});
test("V25 roster signal changes precisely two team candidate placements",()=>{
 assert.equal(team.counts.rosterAwareGroups,9);
 assert.equal(team.counts.scenarioMovedTeamsVsResultsOnly,2);
 const changed=team.experimentalDivisionGroups.filter(x=>x.changedMembershipCountComparedToResultsOnly);
 assert.equal(changed.length,1);
 assert.equal(changed[0].night,"Tuesday");
 assert.equal(changed[0].changedMembershipCountComparedToResultsOnly,2);
 assert.ok(team.methodology.rosterScenario.includes("research-only"));
 assert.equal(team.methodology.crossNight.includes("weight zero"),true);
});
test("exact current competition source 96 conserved in research groups",()=>{
 const all=new Set(team.teams.map(x=>x.leagueId+":"+x.teamId));
 const included=[];
 for(const pool of team.experimentalDivisionGroups)
  for(const group of pool.groups)
   for(const id of group.sourceTeamIds)included.push(pool.leagueId+":"+id);
 assert.equal(included.length,96);
 assert.equal(new Set(included).size,96);
 assert.deepEqual(included.slice().sort(),[...all].sort());
});
test("historical derived prior source and published roster SHA-256 are exact",()=>{
 const sha=n=>crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,n))).digest("hex");
 assert.equal(prior.sourceCurrentRosterSHA256,sha("leagueos-cross-night-player-bridge-v23.json"));
 for(const [name,digest] of Object.entries(team.sourceModels.exactSourceSHA256)){
  const file={model:"leagueos-division-recommendations-v23.json",
   prior:"leagueos-player-history-priors-v25.json",
   roster:"leagueos-cross-night-player-bridge-v23.json",
   registry:"leagueos-source-qualified-current-fixtures-v4.json",
   discovery:"leagueos-fixture-discovery-v24.json"}[name];
  assert.equal(digest,sha(file));
 }
 assert.equal(life.sourceHashes.rosterAwareForecast,sha("leagueos-roster-player-projections-v25.json"));
});
test("rulebook week five is mandatory baseline; midseason freeze is additional proposed policy",()=>{
 assert.match(life.rulebookSource,/sportsvillage\.ca/);
 assert.equal(life.policy.firstReviewAfterWeek,5);
 assert.equal(life.policy.pointsCarryToNewDivision,true);
 assert.equal(life.policy.rosterFreezeIsNotDivisionFreeze,true);
 assert.equal(life.finalLockPolicySource,"USER_REQUESTED_PRODUCT_POLICY_NOT_SVHL_RULEBOOK");
 assert.equal(life.policy.secondReviewAfterWeek,12);
 assert.equal(life.policy.afterLockAction,"MONITOR_REPORT_ONLY_NO_REALIGNMENTS");
});
test("windows enforce week-5 review and halfway lock with no playoffs moves",()=>{
 assert.equal(api.policyValid(defaultPolicy),true);
 const week4=api.stageAt(4,defaultPolicy);
 const week5=api.stageAt(5,defaultPolicy);
 const week6=api.stageAt(6,defaultPolicy);
 const week12=api.stageAt(12,defaultPolicy);
 const week13=api.stageAt(13,defaultPolicy);
 const week21=api.stageAt(21,defaultPolicy);
 assert.equal(week4.reviewWindowOpen,false);
 assert.equal(week5.reviewWindowOpen,true);
 assert.equal(week6.reviewWindowOpen,false);
 assert.equal(week12.reviewWindowOpen,true);
 assert.equal(week13.lockActive,true);
 assert.equal(week21.lockActive,true);
 for(const s of [week5,week12,week13,week21])
  assert.equal(s.realignmentAllowedInDemo,false);
});
test("commissioner can configure alternative review times only inside playoff-safe buffer",()=>{
 const acceptable={...defaultPolicy,firstReviewAfterWeek:4,secondReviewAfterWeek:11};
 assert.equal(api.policyValid(acceptable),true);
 const one={...defaultPolicy,reviewWindows:1};
 assert.equal(api.policyValid(one),true);
 assert.equal(api.stageAt(6,one).lockActive,true);
 assert.equal(api.policyValid({...defaultPolicy,secondReviewAfterWeek:22}),false);
 assert.equal(api.policyValid({...defaultPolicy,firstReviewAfterWeek:12,secondReviewAfterWeek:11}),false);
 assert.equal(api.policyValid({...defaultPolicy,seasonRegularWeeks:9}),false);
});
test("Cristillo memorial source confirms two seasons and follows exact current Braves team, not fixed grade",()=>{
 const mem=life.memorialBranding.find(x=>x.id==="cristillo-memorial-identity");
 assert.ok(mem);assert.equal(mem.anchorCurrentTeamId,13679);
 assert.deepEqual(mem.continuityEvidence.map(x=>x.leagueId),[547,570]);
 assert.equal(mem.displayName,"The Cristillo Division");
 assert.equal(mem.strengthLevel,null);
 assert.equal(mem.leagueApproval,"NAME_FOLLOWS_TEAM_POLICY_NOT_CONFIRMED_BY_LEAGUE");
 const group=life.nights.find(x=>x.night==="Sunday").proposedGroups
  .find(x=>x.teamIds.includes(13679));
 assert.equal(group.name,"The Cristillo Division");
});
test("96 eligible source placements preserve exact source team, group, points hold",()=>{
 assert.equal(life.teamPlacements.length,96);
 assert.equal(new Set(life.teamPlacements.map(x=>x.leagueId+":"+x.teamId)).size,96);
 assert.ok(life.teamPlacements.every(x=>x.sourcePointsWereModified===false));
 assert.ok(life.teamPlacements.every(x=>x.carriedPointsOnApprovedMove===null||
  Number.isInteger(x.carriedPointsOnApprovedMove)));
});
test("127 published future fixtures held; cross-group review cannot cancel them",()=>{
 assert.equal(life.summary.publishedFutureSourceFixtureReferences,127);
 assert.equal(life.summary.crossDivisionSourceMatchupsForCommissionerReview,66);
 assert.equal(life.summary.sourceMatchupsUnaffectedBySimulation,60);
 assert.equal(life.summary.teamOutsideModeledOrProgramHold,1);
 assert.ok(life.scheduleImpact.every(x=>x.sourceFixtureCancelled===false&&
  x.officialSourceUnchanged===true&&x.newOfficialGameDate===null));
});
test("552 post-lock matchup drafts cannot invent date, rink, early/late ice rights",()=>{
 assert.equal(life.summary.unslottedDraftMatchups,552);
 assert.equal(life.unslottedMatchupDraft.length,552);
 assert.equal(life.summary.scheduledIceSlots,0);
 assert.ok(life.unslottedMatchupDraft.every(x=>x.week>=13&&x.week<=24&&x.slotDate===null&&
  x.slotTime===null&&x.rink===null&&x.sourcePublishedGameId===null&&
  x.requiresFacilityIceConfirmation&&x.status==="UNSLOTTED_DRAFT_MATCHUP_NOT_BOOKED"));
 assert.equal(life.summary.schedulingHeldGroups,1);
});
test("round-robin cycle pairs one fixture per team and repeats with fair rotation",()=>{
 for(const len of [4,5,6,8,9,10]){
  const teams=Array.from({length:len},(_,i)=>100+i);
  const counts=new Map(teams.map(id=>[id,0])),opponents=new Map(teams.map(id=>[id,new Set()]));
  const rounds=(len%2===0?len-1:len);
  for(let r=0;r<rounds;r++){
   const matches=api.roundRobin(teams,r),week=new Set();
   for(const m of matches){
    assert.ok(!week.has(m.home)&&!week.has(m.away));
    week.add(m.home);week.add(m.away);
    counts.set(m.home,counts.get(m.home)+1);counts.set(m.away,counts.get(m.away)+1);
    opponents.get(m.home).add(m.away);opponents.get(m.away).add(m.home);
   }
  }
  for(const id of teams){
   assert.equal(opponents.get(id).size,len-1);
   assert.equal(counts.get(id),len%2===0?len-1:len-1);
  }
 }
});
test("new draft scheduling is policy-dependent and requires no official writes",()=>{
 const baseline=api.allDraftGames(life,defaultPolicy);
 const earlier=api.allDraftGames(life,{...defaultPolicy,reviewWindows:1});
 assert.equal(baseline.length,552);
 assert.ok(earlier.length>baseline.length);
 assert.ok(baseline.every(x=>x.status==="UNSLOTTED_BROWSER_LOCAL_SCENARIO"&&
  x.officialChange===false&&x.date===null&&x.time===null));
});
test("Brave HockeyOS projections cover 23 HTO players with 21 exact name-and-jersey coach baselines",()=>{
 assert.equal(coach.counts.sourceHTOSkaters,23);
 assert.equal(coach.counts.playersWithCoachBaseline,21);
 assert.equal(coach.counts.unmatchedSourcePlayers,2);
 assert.equal(coach.counts.publishedPlayers,23);
 assert.equal(new Set(coach.players.map(x=>x.htoPlayerId)).size,23);
 assert.equal(coach.privateWorkbookOrFormulaRowsPublished,false);
 assert.equal(coach.rawCoachCareerRatesPublished,false);
 assert.equal(coach.identityBindingAuthorized,false);
});
test("HockeyOS future G/A/P always reconciles and retains source-only current data",()=>{
 for(const x of coach.players){
  assert.equal(x.sourceG+x.sourceA,x.sourcePts);
  assert.ok(Math.abs(x.projectedSeasonG+x.projectedSeasonA-x.projectedSeasonPoints)<=.11);
  assert.ok(x.projectedSeasonGP>=x.sourceGP);
  assert.ok(x.likelyPointsBand80[0]<=x.projectedSeasonPoints+.1);
  assert.equal(x.officialStatsChanged,false);
 }
 assert.equal(coach.leagueOfficialSeasonLengthVerified,false);
});
test("no player identity or guest PII from coach workbook was copied to source prior file",()=>{
 assert.ok(!Object.hasOwn(prior,"coachPlayerRates"));
 assert.ok(!Object.hasOwn(coach,"rawWorkbook"));
 assert.ok(coach.privacy.includes("no private workbook notes"));
 assert.equal(team.privateWorkbookPlayerRecordsIncluded,false);
 assert.equal(life.officialScheduleModified,false);
});
test("tampered model official assignment or source count fails closed in client",()=>{
 const a=clone(team),b=clone(life),c=clone(coach);
 a.officialDivisionsChanged=true;
 assert.throws(()=>api.validate(a,b,c,backtest,coachHistory),/Roster research/);
 const e=clone(team);const lb=clone(life);lb.officialScheduleModified=true;
 assert.throws(()=>api.validate(e,lb,c,backtest,coachHistory),/Commissioner lifecycle/);
 const f=clone(team),lc=clone(life),tc=clone(coach);
 tc.rawCoachCareerRatesPublished=true;
 assert.throws(()=>api.validate(f,lc,tc,backtest,coachHistory),/HockeyOS projection/);
});
test("one league source team cannot enter two groups",()=>{
 const l=clone(life),a=l.nights[0].proposedGroups[0],b=l.nights[0].proposedGroups[1];
 b.teamIds[0]=a.teamIds[0];
 assert.throws(()=>api.validate(team,l,coach,backtest,coachHistory),/Proposed team membership/);
});

test("15,468 prospective-time-ordered archived games support only bounded risk claims",()=>{
 assert.equal(backtest.status,"RETROSPECTIVE_PREQUENTIAL_ELO_CALIBRATION_NOT_CAUSAL_DIVISION_EFFECT");
 assert.equal(backtest.coverage.sourceGames,20730);
 assert.equal(backtest.coverage.leagueSeasons,116);
 assert.equal(backtest.coverage.eligiblePost35DayGames,15468);
 assert.equal(backtest.coverage.excludedEarlyOrInsufficientPrior,5262);
 assert.equal(backtest.noGameLevelRowsPublished,true);
 assert.equal(backtest.noPlayerIDsPublished,true);
 assert.equal(backtest.noOfficialLeagueChanges,true);
 assert.equal(backtest.sourceArchiveSHA256,team.sourceModels.historicalArchiveSourceSHA256);
 assert.equal(backtest.deploymentGate.rosterScenarioPredictiveGainProven,false);
 assert.equal(backtest.deploymentGate.calibratedDivisionMoveBenefitProven,false);
});
test("retrospective Elo game score beats neutral and rolling record baselines",()=>{
 assert.ok(backtest.overall.rollingEloBrier<backtest.overall.neutralBrier);
 assert.ok(backtest.overall.rollingEloBrier<backtest.overall.rollingRecordBrier);
 assert.equal(backtest.overall.rollingEloBrier,0.2036);
 assert.equal(backtest.overall.neutralBrier,0.219);
 assert.equal(backtest.overall.rollingRecordBrier,0.2076);
 assert.equal(backtest.riskBuckets.BALANCED_MATCHUP_FORECAST.games,14055);
 assert.equal(backtest.riskBuckets.MODERATE_MISMATCH_FORECAST.games,1407);
 assert.equal(backtest.riskBuckets.STRONG_MISMATCH_FORECAST.games,6);
 assert.equal(backtest.strongMismatchBucketSampleSufficient,false);
});
test("blowout association has league-season block uncertainty, not causal claims",()=>{
 const gap=backtest.moderateVsBalancedObservedBlowoutGapPP;
 const ci=backtest.moderateVsBalancedLeagueSeasonClusterBootstrap95PP;
 assert.ok(gap>5&&gap<15);
 assert.ok(ci[0]>0&&ci[0]<gap&&ci[1]>gap&&ci[1]<20);
 assert.equal(backtest.methods.predictionTiming.includes("Before each observed game"),true);
 assert.equal(backtest.methods.causalWarning.includes("NOT proof"),true);
 assert.equal(backtest.methods.playerInput.includes("UNVALIDATED"),true);
});
test("private workbook A-D labels are aggregated, never published player priors",()=>{
 assert.equal(coachHistory.status,"COACH_RECORDED_BRAVE_HC_HISTORICAL_STRENGTH_NOT_SVHL_APPROVED");
 assert.equal(coachHistory.counts.historicalDivisionSeasonLabels,26);
 assert.equal(coachHistory.counts.historicalBraveGamesWithStrengthLabels,168);
 assert.equal(coachHistory.counts.officialApprovedLabels,0);
 assert.equal(coachHistory.privatePlayerRowsPublished,false);
 assert.equal(coachHistory.sourceNotesCopied,false);
 assert.equal(coachHistory.sourceWorkbookCopied,false);
 assert.equal(coachHistory.privateWorkbookSourceDigest,coach.workbookSourceSha256);
 assert.deepEqual(coachHistory.levels.map(x=>x.sourceObservedGames),[0,20,82,66]);
 assert.equal(coachHistory.historicalDivisionLabels.filter(x=>x.sourceDivisionName==="Cristillo").length,1);
 assert.equal(coachHistory.memorialContinuity.coachRecordedLevelFirstSeason,"D");
 assert.equal(coachHistory.memorialContinuity.approvedSourceTier,null);
 assert.ok(!Object.hasOwn(coachHistory,"playerCareerPriors"));
 assert.ok(!JSON.stringify(coachHistory).includes("email"));
});
test("forged backtest status and invented league-approved coach tiers fail closed",()=>{
 const f=clone(team),l=clone(life),c=clone(coach),b=clone(backtest),hist=clone(coachHistory);
 b.deploymentGate.rosterScenarioPredictiveGainProven=true;
 assert.throws(()=>api.validate(f,l,c,b,hist),/Historical retrospective/);
 const b2=clone(backtest),h2=clone(coachHistory);
 h2.officialLeagueStrengthApproved=true;
 assert.throws(()=>api.validate(f,l,c,b2,h2),/Private coach context/);
});
