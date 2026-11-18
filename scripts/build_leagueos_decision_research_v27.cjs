/* LeagueOS V27: strict public summary of existing retrospective result research.
 * Does not derive game outcomes, publish player IDs, or make causal claims.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../widgets");
const source="leagueos-competitive-balance-backtest-v25.json";
const bytes=fs.readFileSync(path.join(root,source));
const b=JSON.parse(bytes.toString("utf8"));
const need=(ok,reason)=>{if(!ok)throw Error("V27_VALIDATION_HOLD: "+reason)};
need(b.schema==="bruttech-leagueos-historic-competitive-balance-validation/v25"&&
 b.status==="RETROSPECTIVE_PREQUENTIAL_ELO_CALIBRATION_NOT_CAUSAL_DIVISION_EFFECT"&&
 b.noGameLevelRowsPublished===true&&b.noPlayerIDsPublished===true&&
 b.noOfficialLeagueChanges===true,"Untrusted historical study");
need(b.methods?.causalWarning?.includes("NOT proof")&&
 b.methods?.playerInput?.includes("UNVALIDATED")&&
 b.coverage?.eligiblePost35DayGames>=14000&&
 b.coverage?.blowoutDefinition==="Absolute certified final goal margin >= 5"&&
 b.overall?.games===b.coverage.eligiblePost35DayGames,
 "No qualified outcome or study boundary");
const balanced=b.riskBuckets?.BALANCED_MATCHUP_FORECAST,
 moderate=b.riskBuckets?.MODERATE_MISMATCH_FORECAST,
 strong=b.riskBuckets?.STRONG_MISMATCH_FORECAST;
need(balanced?.games>=10000&&moderate?.games>=1000&&
 strong?.games<50&&b.strongMismatchBucketSampleSufficient===false&&
 balanced.games+moderate.games+strong.games===b.overall.games,
 "Insufficient historical risk cohort coverage");
need([balanced,moderate,strong].every(x=>x.sourceBlowout5>=0&&
 x.sourceBlowoutRate>=0&&x.sourceBlowoutRate<=1&&
 Math.abs(x.sourceBlowout5/x.games-x.sourceBlowoutRate)<.001),
 "Outcome rates contradict certified source");
const round=x=>Math.round(x*10000)/10000;
const out={
 schema:"bruttech-leagueos-commissioner-research-context/v27",
 publishedAt:"2026-11-17",
 status:"RETROSPECTIVE_OBSERVATIONAL_RESEARCH_SEPARATE_FROM_FICTIONAL_PLACEMENT",
 sourceFile:source,sourceSHA256:crypto.createHash("sha256").update(bytes).digest("hex"),
 sourceLeagueSeasons:b.coverage.leagueSeasons,
 eligibleCompletedGames:b.overall.games,
 fiveGoalMarginDefinition:b.coverage.blowoutDefinition,
 historicalModelType:"PRE_GAME_RESULT_ONLY_ELO_NOT_PLAYER_ROSTER_OR_OFFICIAL_DIVISION_ASSIGNMENT",
 cohorts:{
  balanced:{games:balanced.games,sourceFiveGoalRate:round(balanced.sourceBlowoutRate)},
  moderate:{games:moderate.games,sourceFiveGoalRate:round(moderate.sourceBlowoutRate)}
 },
 observedRateGapPP:Math.round((moderate.sourceBlowoutRate-balanced.sourceBlowoutRate)*10000)/100,
 notSufficientStrongMismatchSample:strong.games,
 causalEvidence:false,incrementalRosterProjectionValidated:false,
 noFictionalOutcomesInStudy:true,noLeagueChanges:true,
 displayPolicy:{
  label:"Historical relationship — not a forecast of this demo",
  warning:"These were previously observed outcomes on rated historical matchups, NOT proof that realigning divisions would lower blowouts.",
  prohibits:"Do not multiply this study's rates by the 24 fictional teams, claim causation, or predict exact blowout reductions.",
  sourceDisclosure:"Source-qualified public SVHL archive; results-only prequential Elo and bounded cohort coverage."
 }
};
need(Math.abs(out.observedRateGapPP-b.moderateVsBalancedObservedBlowoutGapPP)<.1,
 "Historical study gap does not reconcile");
const dest=path.join(root,"leagueos-decision-research-v27.json");
fs.writeFileSync(dest,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({status:out.status,sourceSHA256:out.sourceSHA256.slice(0,16),
 games:out.eligibleCompletedGames,balanced:out.cohorts.balanced,
 moderate:out.cohorts.moderate,gapPP:out.observedRateGapPP,
 officialWrites:0,output:dest},null,2));