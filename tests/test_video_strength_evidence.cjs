"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const model=require("../widgets/video-strength-evidence.js");
const division=require("../widgets/division-fit-model.js");
const widgets=path.join(__dirname,"../widgets");
const read=(name)=>JSON.parse(fs.readFileSync(path.join(widgets,name),"utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
const H="a".repeat(64),J="b".repeat(64),K="c".repeat(64);
function pilot(){
 const candidate={schema:model.constants.SCHEMA,game_id:363,
  source_originals_modified:false,
  evidence_level:"OUTPUT_ONLY_DEVELOPER_CONTRACT_FIXTURE_NOT_INDEPENDENT_QA",
  event_count:15,source_sha256:{ledger:H,automatic_index:J,operator_review:K},
  events:[]};
 let id=0;
 for(const [family,count] of [["GOAL",10],["PENALTY",4],["SAVE_CANDIDATE",1]]){
  for(let n=0;n<count;n++){
   candidate.events.push({EventID:"SYNTHETIC_FIXTURE_"+(++id),
     SourceEventID:"SYNTHETIC_"+id,GameID:363,LeagueID:"SVHL-570",
     Date:"2026-10-25",VideoSourceRole:"PRIVATE_ORIGINAL_LIVEBARN_PANO",
     EventFamily:family,EventSubtype:"FAKE_ONLY",
     Source:family==="PENALTY"?"MANUAL_LEDGER":"ASSISTED",
     EvidenceClass:family==="PENALTY"?"OBSERVED_SOURCE_ONLY":"INFERRED",
     IndependentAVAccepted:false,StrengthEligible:false,StrengthSignal:null,
     StatExportEligible:false,PlayerID:null,
     EvidenceInputSHA256:{ledger:H}});
  }
 }
 const shadow={schema:model.constants.SHADOW,game_id:363,input_sha256:"d".repeat(64),
  release_mode:"READ_ONLY_SHADOW_NO_PRODUCTION",public_content_written:false,
  official_stats_written:false,
  division_strength:{video_coverage_status:"INSUFFICIENT_VIDEO",
    team_strength_video_score:null,per_opportunity_rates:null,
    eligible_play_feature_events:0,opponent_division_calibration:"NOT_CALIBRATED",
    formal_realignment_eligible:false},
  video_studio:{goal_candidate_count:10,penalties_video_unmapped:4,
    save_operator_candidate_count:1},
  broadcast_formula:{virtual_camera_target:"PANO_SAFE_FALLBACK",
    auto_reframing_eligible:false}};
 return {candidate,shadow,hashes:{ledger:H,automatic_index:J,operator_review:K,
   observationJsonSHA256:"d".repeat(64)}};
}
function featurePackage(){
 return {schema:model.constants.FEATURE,leagueScope:"SVHL_ADULT_SUNDAY",
  officialLeague:"SVHL",vaHLIncluded:false,readOnly:true,
  publicStatsWritten:false,authorizedDivisionRealignment:false,
  games:[{gameId:1,sourceTeamId:45,opponentTeamId:46,leagueId:570,
    officialLeague:"SVHL",vaHLIncluded:false,season:"Winter 2026/27",
    division:"The Cristillo Division",officialGameSourceSHA256:H,
    videoSourceSHA256:J,sourceVideoRole:"RIGHTS_APPROVED_SEGMENT",
    videoRightsClass:"AUTHORIZED_EVIDENCE_ONLY",rinkCameraCalibrationId:"SYNTHETIC_RINK1",
    eraKey:"SYNTH_2026",rosterEpochKey:"SYNTH_TEAM45",
    observedMovingPlaySeconds:3600,observedCameraCoverageFraction:.95,
    sourceReviewStatus:"ACCEPTED",independentQA:true,
    rightsToUseInScouting:true,opponentStrengthSourceQualified:true}],
  features:[{eventId:"SYNTH_FAKE_ENTRY01",family:"CONTROLLED_ENTRY",
    gameId:1,leagueId:570,sourceTeamId:45,
    evidenceClass:"OBSERVED",source:"ASSISTED",
    videoSourceSHA256:J,sourceEventSHA256:K,
    detectorVersion:"SYNTHETIC_VALIDATION_NOT_REAL",independentAccepted:true,
    teamIdentityVerified:true,timestampWindowVerified:true,
    opportunityDenominatorVerified:true,opportunities:20,eventCount:10,
    confidenceLowerBound:.91}],
  calibration:{independentAccepted:true,heldOutGamesPassed:true,
    crossDivisionBridgesVerified:true,opponentTierSourceVerified:true,
    seasonEraHoldoutPassed:true,teamContinuityQualified:true,
    rinkCameraBiasAssessed:true,confidenceReliabilityAccepted:true,
    evaluationReceiptId:"FICTIONAL_ONLY",inputEvidenceSHA256:K}};
}
function policy(){
 return {schema:"HOCKEYOS_VIDEO_STRENGTH_ACCEPTED_COVERAGE_POLICY_V0_1",
  independentApproval:true,reviewReceiptId:"FICTIONAL_APPROVAL",
  sourceSHA256:H,minimumObservedMovingPlaySeconds:2400,
  minimumQualifiedGames:1,minimumDistinctOpponents:1,
  minimumCameraCoverageFraction:.9};
}
const tests=[
 ["Realistic developer pilot fails closed without any video strength",()=>{
  const {candidate,shadow,hashes}=pilot();
  const r=model.pilot(candidate,shadow,hashes);
  assert.equal(r.status,"INSUFFICIENT_VIDEO");
  assert.equal(r.inspectedEventCandidates,15);
  assert.equal(r.candidateEventFamilies.GOAL,10);
  assert.equal(r.acceptedPerformanceMeasurements,0);
  assert.equal(r.videoScore,null);
  assert.equal(r.eligibleForRealignment,false);
 }],
 ["Rejects mismatched GameID and crossed source hashes",()=>{
  const x=pilot();x.shadow.game_id=999;
  assert.throws(()=>model.pilot(x.candidate,x.shadow,x.hashes),/SHARED_PILOT_SCHEMA_OR_GAME_MISMATCH/);
  const y=pilot();y.hashes.operator_review="0".repeat(64);
  assert.throws(()=>model.pilot(y.candidate,y.shadow,y.hashes),/SHARED_PILOT_SOURCE_HASH_MISMATCH/);
 }],
 ["Requires exact hash binding between observation JSON and projection",()=>{
  const x=pilot();x.shadow.input_sha256="f".repeat(64);
  assert.throws(()=>model.pilot(x.candidate,x.shadow,x.hashes),/SHADOW_OBSERVATION_FILE_HASH_NOT_BOUND/);
 }],
 ["Never permits a scoreboard cue to be counted as a qualified goal",()=>{
  const x=pilot();x.candidate.events[0].StrengthEligible=true;
  assert.throws(()=>model.pilot(x.candidate,x.shadow,x.hashes),/PROVISIONAL_EVENT_MUST_NOT_BECOME_PLAYER_OR_STRENGTH_FACT/);
  const y=pilot();y.candidate.events[1].PlayerID=123;
  assert.throws(()=>model.pilot(y.candidate,y.shadow,y.hashes),/PROVISIONAL_EVENT_MUST_NOT_BECOME_PLAYER_OR_STRENGTH_FACT/);
  const z=pilot();z.shadow.division_strength.team_strength_video_score=75;
  assert.throws(()=>model.pilot(z.candidate,z.shadow,z.hashes),/UNSUPPORTED_PILOT_STRENGTH_PROMOTION/);
 }],
 ["Rejects duplicate events and source-event provenance mismatch",()=>{
  const x=pilot();x.candidate.events[1].EventID=x.candidate.events[0].EventID;
  assert.throws(()=>model.pilot(x.candidate,x.shadow,x.hashes),/PROVISIONAL_EVENT_MUST_NOT_BECOME_PLAYER_OR_STRENGTH_FACT/);
  const y=pilot();y.candidate.events[1].EvidenceInputSHA256.ledger="e".repeat(64);
  assert.throws(()=>model.pilot(y.candidate,y.shadow,y.hashes),/SOURCE_EVENT_HASH_NOT_IN_ARCHIVED_INPUTS/);
 }],
 ["Feature coverage missing approved thresholds remains insufficient not zero",()=>{
  const r=model.featureReadiness(featurePackage(),null);
  assert.equal(r.status,"INSUFFICIENT_VIDEO");
  assert.equal(r.videoScore,null);
  assert.ok(r.reasons.includes("INDEPENDENTLY_APPROVED_VIDEO_COVERAGE_THRESHOLDS_ABSENT"));
  assert.equal(r.eligibleForRealignment,false);
 }],
 ["Unaccepted actual-play observations are held as experimental",()=>{
  const p=featurePackage();p.games[0].independentQA=false;
  p.features[0].independentAccepted=false;
  const r=model.featureReadiness(p,policy());
  assert.equal(r.status,"INSUFFICIENT_VIDEO");
  assert.ok(r.reasons.includes("GAME_SOURCE_QA_RIGHTS_OR_OPPONENT_UNVERIFIED"));
  assert.equal(r.independentCandidateFeatures,0);
 }],
 ["No unverifiable denominator or inferred opponent strength",()=>{
  const p=featurePackage();p.features[0].opportunityDenominatorVerified=false;
  const r=model.featureReadiness(p,policy());
  assert.equal(r.status,"INSUFFICIENT_VIDEO");
  assert.equal(r.independentCandidateFeatures,0);
  const q=featurePackage();q.games[0].opponentStrengthSourceQualified=false;
  assert.equal(model.featureReadiness(q,policy()).status,"INSUFFICIENT_VIDEO");
 }],
 ["Minimums are policy-owned, not invented by ENG59",()=>{
  const p=featurePackage();
  const accepted=policy();accepted.minimumQualifiedGames=4;
  const r=model.featureReadiness(p,accepted);
  assert.equal(r.status,"INSUFFICIENT_VIDEO");
  assert.ok(r.reasons.includes("SAMPLE_MINUTES_OPPONENTS_GAMES_OR_CAMERA_COVERAGE_INSUFFICIENT"));
 }],
 ["Synthetic fully signed conditions yield only review readiness, never a rating",()=>{
  const r=model.featureReadiness(featurePackage(),policy());
  assert.equal(r.status,"READY_FOR_SEPARATE_INDEPENDENT_STRENGTH_EVALUATION");
  assert.equal(r.videoScore,null);
  assert.equal(r.videoScoreUsedInDivisionFit,false);
  assert.equal(r.eligibleForRealignment,false);
 }],
 ["Rejects VAHL, duplicate games and forged video source",()=>{
  const p=featurePackage();p.vaHLIncluded=true;
  assert.throws(()=>model.featureReadiness(p,policy()),/FUTURE_VIDEO_PACKAGE_NOT_SOURCE_QUALIFIED/);
  const q=featurePackage();q.games.push(clone(q.games[0]));
  assert.throws(()=>model.featureReadiness(q,policy()),/SOURCE_GAME_TEAM_DOUBLE_COUNT/);
  const v=featurePackage();v.features[0].videoSourceSHA256=H;
  assert.throws(()=>model.featureReadiness(v,policy()),/VIDEO_FEATURE_UNLINKED_TO_QUALIFIED_GAME_SOURCE/);
 }],
 ["Existing actual source division model is byte-for-byte unchanged by overlay",()=>{
  const league=read("league-intelligence.json");
  const history=read("brave-historical-verified-games.json");
  const baseline=division.analyze(league,history);
  const before=JSON.stringify(baseline);
  const shadow=model.pilot(...Object.values(pilot()));
  const overlay=model.overlayExistingDivisionFit(baseline,shadow);
  assert.equal(JSON.stringify(baseline),before);
  assert.equal(overlay.baseAnalysis,baseline);
  assert.deepEqual(overlay.baseAnalysis.scenarios,baseline.scenarios);
  assert.equal(overlay.videoEvidenceStatus,"INSUFFICIENT_VIDEO");
  assert.equal(overlay.videoStrengthScore,null);
  assert.equal(overlay.legacyDivisionFitUnchanged,true);
 }],
 ["Verified adult competition bridge inventory reuses existing game graph",()=>{
  const baseline=division.analyze(read("league-intelligence.json"),
    read("brave-historical-verified-games.json"));
  const before=JSON.stringify(baseline);
  const inventory=model.opponentBridgeInventory(baseline);
  assert.equal(inventory.status,
    "SOURCE_QUALIFIED_MATCHUPS_NOT_VIDEO_OR_TIER_CALIBRATION");
  assert.equal(inventory.adultTeamCount,22);
  assert.equal(inventory.verifiedPoolGames,baseline.gameGraph.verifiedGamesInPool);
  assert.equal(inventory.crossCurrentDivisionGames,
    baseline.gameGraph.crossCurrentDivisionGames);
  assert.equal(inventory.teamsWithCrossDivisionEvidence+
    inventory.teamsWithoutCrossDivisionEvidence,22);
  assert.equal(inventory.divisionPairBridges.reduce((s,x)=>s+x.observedGames,0),
    baseline.gameGraph.crossCurrentDivisionGames);
  assert.equal(inventory.divisionPairBridges.every(x=>x.distinctTeamPairs<=x.observedGames),true);
  assert.equal(inventory.opponentTierEquivalenceVerified,false);
  assert.equal(inventory.videoStrengthCalibrated,false);
  assert.equal(inventory.officialDivisionRealignmentAllowed,false);
  assert.equal(JSON.stringify(baseline),before);
 }],
 ["Refuses duplicate matches and invented cross-division identities",()=>{
  const baseline=division.analyze(read("league-intelligence.json"),
    read("brave-historical-verified-games.json"));
  const d=clone(baseline);
  d.gameGraph.verifiedMatches.push(clone(d.gameGraph.verifiedMatches[0]));
  assert.throws(()=>model.opponentBridgeInventory(d),/CROSS_DIVISION_GAME_NOT_SOURCE_QUALIFIED/);
  const e=clone(baseline);
  e.gameGraph.verifiedMatches[0].sameCurrentDivision=
    !e.gameGraph.verifiedMatches[0].sameCurrentDivision;
  assert.throws(()=>model.opponentBridgeInventory(e),/SOURCE_GAME_DIVISION_MEMBERSHIP_DISAGREES/);
  const f=clone(baseline);f.poolDivisions[1]="VAHL Division";
  assert.throws(()=>model.opponentBridgeInventory(f),/HISTORICAL_GAME_BRIDGE_UNVERIFIED/);
 }],
 ["All current adult games now have exact officially confirmed game IDs",()=>{
  const baseline=division.analyze(read("league-intelligence.json"),
    read("brave-historical-verified-games.json"));
  const official=read("svhl-official-game-id-bridges.json");
  const original=JSON.stringify(baseline);
  const result=model.officialGameIdentityCoverage(baseline,official);
  assert.equal(result.status,"OFFICIAL_SOURCE_GAME_IDS_VERIFIED_VIDEO_INSUFFICIENT");
  assert.equal(result.sourceGameIDsVerified,54);
  assert.equal(result.verifiedCrossDivisionIDs,19);
  assert.equal(result.scorerHeldOfficialGames,2);
  assert.equal(result.videoStrengthStatus,"INSUFFICIENT_VIDEO");
  assert.equal(result.teamRating,null);
  assert.equal(result.ratingAppliedToExistingLeague,false);
  assert.equal(result.realignmentApproved,false);
  assert.equal(JSON.stringify(baseline),original);
 }],
 ["Official game IDs refuse altered matchup, duplicate, or unsupported goal admission",()=>{
  const baseline=division.analyze(read("league-intelligence.json"),
    read("brave-historical-verified-games.json"));
  const original=read("svhl-official-game-id-bridges.json");
  const tampered=clone(original);
  tampered.games[0].officialGameId=tampered.games[1].officialGameId;
  assert.throws(()=>model.officialGameIdentityCoverage(baseline,tampered),
    /OFFICIAL_GAME_ID_LINK_SCORE_OR_SOURCE_HASH_UNQUALIFIED/);
  const wrong=clone(original);
  wrong.games[0].publishedFinalGoals[0]+=1;
  assert.throws(()=>model.officialGameIdentityCoverage(baseline,wrong),
    /OFFICIAL_GAME_ID_LINK_SCORE_OR_SOURCE_HASH_UNQUALIFIED/);
  const forged=clone(original);
  forged.games[0].videoPerformanceMeasurements={pressure:99};
  assert.throws(()=>model.officialGameIdentityCoverage(baseline,forged),
    /OFFICIAL_GAME_ID_LINK_SCORE_OR_SOURCE_HASH_UNQUALIFIED/);
  const removed=clone(original);removed.games.pop();
  assert.throws(()=>model.officialGameIdentityCoverage(baseline,removed),
    /OFFICIAL_GAME_ID_MAP_NOT_SOURCE_ADMITTED/);
 }],
 ["No video number can be pushed into existing scenario rating",()=>{
  const baseline=division.analyze(read("league-intelligence.json"),
    read("brave-historical-verified-games.json"));
  const v=model.pilot(...Object.values(pilot()));
  v.videoScore=83;
  assert.throws(()=>model.overlayExistingDivisionFit(baseline,v),/UNAPPROVED_VIDEO_RATING_OR_DIVISION_AUTHORITY/);
 }]
];
for(const [name,fn] of tests){fn();console.log("PASS "+name)}
console.log(JSON.stringify({status:"VIDEO_STRENGTH_EVIDENCE_READ_ONLY_QA_PASS",
 tests:tests.length,originalDivisionModelUnchanged:true,noAutomatedRating:true}));
