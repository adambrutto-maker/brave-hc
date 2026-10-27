/* ENG59 HOS-IP-09 | read-only Video Intelligence evidence consumer.
 * This is NOT an action detector, rating engine, media loader, or publisher.
 * No video/media bytes are imported. Existing league/roster ranking untouched.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.BraveVideoStrengthEvidence=api;
})(typeof window==="undefined"?globalThis:window,function(){"use strict";
 const SCHEMA="HOCKEYOS_SHARED_VIDEO_OBSERVATION_V0_1";
 const SHADOW="HOCKEYOS_VIDEO_CONSUMER_SHADOW_PROJECTION_V0_1";
 const FEATURE="HOCKEYOS_SCOUT_VIDEO_FEATURE_EVIDENCE_V0_1";
 const STATUS="INSUFFICIENT_VIDEO";
 const hex=/^[a-f0-9]{64}$/;
 const need=(ok,why)=>{if(!ok)throw Error("VIDEO_STRENGTH_SOURCE_HOLD:"+why)};
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 const hash=s=>typeof s==="string"&&hex.test(s);
 const nonEmpty=s=>typeof s==="string"&&s.trim().length>0;
 const shortHold=(reasons,source)=>({
  status:STATUS,videoScore:null,videoScoreUsedInDivisionFit:false,
  acceptedPerformanceMeasurements:0,qualifiedObservedSeconds:0,
  opponentCalibration:"NOT_CALIBRATED",eligibleForRealignment:false,
  sourceClass:"DEVELOPER_OR_UNQUALIFIED_VIDEO_EVIDENCE",
  reasons:[...new Set(reasons)].sort(),source
 });
 function pilot(candidate,shadow,sourceHashes){
  need(candidate?.schema===SCHEMA&&shadow?.schema===SHADOW&&
    Number.isSafeInteger(candidate.game_id)&&candidate.game_id>0&&
    candidate.game_id===shadow.game_id,"SHARED_PILOT_SCHEMA_OR_GAME_MISMATCH");
  need(sourceHashes&&hash(sourceHashes.observationJsonSHA256)&&
    shadow.input_sha256===sourceHashes.observationJsonSHA256,
    "SHADOW_OBSERVATION_FILE_HASH_NOT_BOUND");
  need(candidate.source_originals_modified===false&&
    candidate.evidence_level==="OUTPUT_ONLY_DEVELOPER_CONTRACT_FIXTURE_NOT_INDEPENDENT_QA"&&
    shadow.release_mode==="READ_ONLY_SHADOW_NO_PRODUCTION"&&
    shadow.public_content_written===false&&shadow.official_stats_written===false,
    "SHARED_PILOT_ORIGINALS_OR_AUTHORITY_VIOLATED");
  need(sourceHashes&&Object.keys(candidate.source_sha256||{}).length>=2&&
    Object.entries(candidate.source_sha256).every(([k,v])=>
      hash(v)&&sourceHashes[k]===v),"SHARED_PILOT_SOURCE_HASH_MISMATCH");
  need(Array.isArray(candidate.events)&&candidate.events.length===candidate.event_count&&
    candidate.events.length>0,"SHARED_PILOT_EVENT_COUNT_INVALID");
  need(shadow.division_strength&&
    shadow.division_strength.video_coverage_status===STATUS&&
    shadow.division_strength.team_strength_video_score===null&&
    shadow.division_strength.per_opportunity_rates===null&&
    shadow.division_strength.eligible_play_feature_events===0&&
    shadow.division_strength.opponent_division_calibration==="NOT_CALIBRATED"&&
    shadow.division_strength.formal_realignment_eligible===false,
    "UNSUPPORTED_PILOT_STRENGTH_PROMOTION");
  const ids=new Set(),counts={};
  for(const event of candidate.events){
   need(nonEmpty(event.EventID)&&!ids.has(event.EventID)&&
     event.GameID===candidate.game_id&&
     event.LeagueID==="SVHL-570"&&
     event.VideoSourceRole==="PRIVATE_ORIGINAL_LIVEBARN_PANO"&&
     nonEmpty(event.SourceEventID)&&
     nonEmpty(event.Date)&&nonEmpty(event.EventFamily)&&
     ["ASSISTED","MANUAL_LEDGER","AUTOMATED"].includes(event.Source)&&
     ["INFERRED","OBSERVED_SOURCE_ONLY","UNCERTAIN"].includes(event.EvidenceClass)&&
     event.IndependentAVAccepted===false&&
     event.StrengthEligible===false&&event.StrengthSignal===null&&
     event.StatExportEligible===false&&
     event.PlayerID===null,"PROVISIONAL_EVENT_MUST_NOT_BECOME_PLAYER_OR_STRENGTH_FACT");
   ids.add(event.EventID);
   counts[event.EventFamily]=(counts[event.EventFamily]||0)+1;
   const links=event.EvidenceInputSHA256;
   need(links&&Object.keys(links).length>=1&&
     Object.entries(links).every(([key,value])=>
       hash(value)&&Object.values(sourceHashes).includes(value)),
       "SOURCE_EVENT_HASH_NOT_IN_ARCHIVED_INPUTS");
  }
  need(counts.GOAL===10&&counts.PENALTY===4&&counts.SAVE_CANDIDATE===1&&
    Object.keys(counts).length===3&&
    shadow.video_studio?.goal_candidate_count===counts.GOAL&&
    shadow.video_studio?.penalties_video_unmapped===counts.PENALTY&&
    shadow.video_studio?.save_operator_candidate_count===counts.SAVE_CANDIDATE&&
    shadow.broadcast_formula?.virtual_camera_target==="PANO_SAFE_FALLBACK"&&
    shadow.broadcast_formula.auto_reframing_eligible===false,
    "SHARED_SOURCE_EVENT_OR_CONSUMER_DIVERGENCE");
  return {...shortHold([
    "NO_INDEPENDENTLY_ACCEPTED_ACTUAL_PLAY_FEATURE_EVENTS",
    "NO_OPPONENT_TIER_AND_CROSS_DIVISION_EMPIRICAL_CALIBRATION",
    "NO_ACCEPTED_SOURCE_VIDEO_COVERAGE_DENOMINATOR",
    "VIDEO_STUDIO_SCOREBOARD_CUES_NOT_TEAM_PERFORMANCE_EVENTS"
   ],{gameId:candidate.game_id,leagueId:"SVHL-570",sourceHashes:{...sourceHashes}}),
   inspectedEventCandidates:candidate.events.length,candidateEventFamilies:counts,
   originalScoreboardCueCount:counts.GOAL,
   acceptance:"DEVELOPER_OUTPUT_ONLY_NOT_INDEPENDENT_QA"
  };
 }
 // Future-provider packages only: strictly prove source, coverage and calibration
 // BEFORE proposing independent evaluation. Even a complete package NEVER returns a
 // rating or changes division-fit scores. No default thresholds are invented.
 function featureReadiness(pkg,acceptedPolicy){
  need(pkg?.schema===FEATURE&&pkg?.leagueScope==="SVHL_ADULT_SUNDAY"&&
    pkg.officialLeague==="SVHL"&&pkg.vaHLIncluded===false&&
    pkg.readOnly===true&&pkg.publicStatsWritten===false&&
    pkg.authorizedDivisionRealignment===false&&
    Array.isArray(pkg.games)&&Array.isArray(pkg.features),
    "FUTURE_VIDEO_PACKAGE_NOT_SOURCE_QUALIFIED");
  const reasons=[],s=(reason)=>reasons.push(reason);
  const teamIds=new Set();
  const unique=new Set(),observedGames=new Set(),opponents=new Set();
  let observedSeconds=0;
  for(const g of pkg.games){
   need(Number.isSafeInteger(g.gameId)&&g.gameId>0&&
     Number.isSafeInteger(g.sourceTeamId)&&g.sourceTeamId>0&&
     Number.isSafeInteger(g.opponentTeamId)&&g.opponentTeamId>0&&
     g.opponentTeamId!==g.sourceTeamId&&
     Number.isSafeInteger(g.leagueId)&&g.leagueId>0&&
     g.officialLeague==="SVHL"&&g.vaHLIncluded===false&&
     nonEmpty(g.season)&&nonEmpty(g.division)&&
     hash(g.officialGameSourceSHA256)&&
     hash(g.videoSourceSHA256)&&
     nonEmpty(g.sourceVideoRole)&&nonEmpty(g.videoRightsClass)&&
     nonEmpty(g.rinkCameraCalibrationId)&&
     nonEmpty(g.eraKey)&&nonEmpty(g.rosterEpochKey)&&
     integer(g.observedMovingPlaySeconds)&&
     typeof g.observedCameraCoverageFraction==="number"&&
     g.observedCameraCoverageFraction>=0&&g.observedCameraCoverageFraction<=1&&
     ["ACCEPTED","HELD","UNVERIFIED"].includes(g.sourceReviewStatus)&&
     typeof g.independentQA==="boolean"&&
     typeof g.rightsToUseInScouting==="boolean"&&
     typeof g.opponentStrengthSourceQualified==="boolean",
     "FUTURE_SOURCE_GAME_LINEAGE_MALFORMED");
   const key=g.leagueId+"|"+g.gameId+"|"+g.sourceTeamId;
   need(!unique.has(key),"SOURCE_GAME_TEAM_DOUBLE_COUNT");
   unique.add(key);
   teamIds.add(g.sourceTeamId);
   if(g.sourceReviewStatus==="ACCEPTED"&&g.independentQA&&
      g.rightsToUseInScouting&&g.opponentStrengthSourceQualified){
      observedGames.add(key);opponents.add(g.opponentTeamId);
      observedSeconds+=g.observedMovingPlaySeconds;
   }else s("GAME_SOURCE_QA_RIGHTS_OR_OPPONENT_UNVERIFIED");
  }
  if(teamIds.size!==1)s("TEAM_COHORT_ID_NOT_STABLE");
  if(pkg.games.length===0)s("NO_GAME_VIDEO_EVIDENCE");
  if(pkg.features.length===0)s("NO_ELIGIBLE_HOCKEY_EVENT_MEASUREMENTS");
  let validFeatureCount=0;
  const featureIDs=new Set();
  const categories=new Set([
   "CONTROLLED_ENTRY","CONTROLLED_EXIT","OFFENSIVE_PRESSURE","SCORING_CHANCE",
   "SHOT_ATTEMPT","SHOT_ON_GOAL","DEFENSIVE_RETRIEVAL","BLOCK","RUSH_SUPPRESSION",
   "TAKEAWAY","GIVEAWAY","TRANSITION","GOALIE_SAVE","REBOUND_CONTROL","PENALTY_PRESSURE"
  ]);
  for(const f of pkg.features){
   need(nonEmpty(f.eventId)&&!featureIDs.has(f.eventId)&&
     categories.has(f.family)&&
     Number.isSafeInteger(f.gameId)&&f.gameId>0&&
     Number.isSafeInteger(f.leagueId)&&f.leagueId>0&&
     Number.isSafeInteger(f.sourceTeamId)&&f.sourceTeamId>0&&
     ["OBSERVED","INFERRED","UNCERTAIN"].includes(f.evidenceClass)&&
     ["MANUAL","ASSISTED","AUTOMATED"].includes(f.source)&&
     hash(f.videoSourceSHA256)&&hash(f.sourceEventSHA256)&&
     nonEmpty(f.detectorVersion)&&
     typeof f.independentAccepted==="boolean"&&
     typeof f.teamIdentityVerified==="boolean"&&
     typeof f.timestampWindowVerified==="boolean"&&
     typeof f.opportunityDenominatorVerified==="boolean"&&
     integer(f.opportunities)&&integer(f.eventCount)&&
     f.eventCount<=f.opportunities&&
     typeof f.confidenceLowerBound==="number"&&
     f.confidenceLowerBound>=0&&f.confidenceLowerBound<=1,
     "VIDEO_FEATURE_MISSING_SOURCE_OR_OPPORTUNITY_EVIDENCE");
   featureIDs.add(f.eventId);
   const g=pkg.games.find(g=>g.gameId===f.gameId&&g.leagueId===f.leagueId&&
      g.sourceTeamId===f.sourceTeamId&&g.videoSourceSHA256===f.videoSourceSHA256);
   need(g,"VIDEO_FEATURE_UNLINKED_TO_QUALIFIED_GAME_SOURCE");
   if(f.independentAccepted&&f.teamIdentityVerified&&
      f.timestampWindowVerified&&f.opportunityDenominatorVerified&&
      g.sourceReviewStatus==="ACCEPTED"&&g.independentQA&&
      g.rightsToUseInScouting&&g.opponentStrengthSourceQualified)validFeatureCount++;
   else s("FEATURE_SOURCE_IDENTITY_TIMING_DENOMINATOR_OR_QA_UNVERIFIED");
  }
  const policy=acceptedPolicy;
  if(!policy||policy.schema!=="HOCKEYOS_VIDEO_STRENGTH_ACCEPTED_COVERAGE_POLICY_V0_1"||
     policy.independentApproval!==true||!nonEmpty(policy.reviewReceiptId)||
     !hash(policy.sourceSHA256)||!integer(policy.minimumObservedMovingPlaySeconds)||
     !integer(policy.minimumQualifiedGames)||!integer(policy.minimumDistinctOpponents)||
     typeof policy.minimumCameraCoverageFraction!=="number"||
     policy.minimumCameraCoverageFraction<=0||
     policy.minimumCameraCoverageFraction>1){
      s("INDEPENDENTLY_APPROVED_VIDEO_COVERAGE_THRESHOLDS_ABSENT");
  }else{
   if(observedSeconds<policy.minimumObservedMovingPlaySeconds||
      observedGames.size<policy.minimumQualifiedGames||
      opponents.size<policy.minimumDistinctOpponents||
      pkg.games.some(g=>g.observedCameraCoverageFraction<
        policy.minimumCameraCoverageFraction))
      s("SAMPLE_MINUTES_OPPONENTS_GAMES_OR_CAMERA_COVERAGE_INSUFFICIENT");
  }
  if(validFeatureCount===0)s("NO_INDEPENDENTLY_QUALIFIED_ACTUAL_PLAY_MEASUREMENTS");
  if(!pkg.calibration||pkg.calibration.independentAccepted!==true||
     pkg.calibration.heldOutGamesPassed!==true||
     pkg.calibration.crossDivisionBridgesVerified!==true||
     pkg.calibration.opponentTierSourceVerified!==true||
     pkg.calibration.seasonEraHoldoutPassed!==true||
     pkg.calibration.teamContinuityQualified!==true||
     pkg.calibration.rinkCameraBiasAssessed!==true||
     pkg.calibration.confidenceReliabilityAccepted!==true||
     !nonEmpty(pkg.calibration.evaluationReceiptId)||
     !hash(pkg.calibration.inputEvidenceSHA256))
    s("CROSS_TIER_OPPONENT_ERA_CAMERA_AND_HELDOUT_CALIBRATION_NOT_ACCEPTED");
  const qualified=reasons.length===0;
  return {
    status:qualified?"READY_FOR_SEPARATE_INDEPENDENT_STRENGTH_EVALUATION":STATUS,
    videoScore:null,videoScoreUsedInDivisionFit:false,
    qualifiedObservedSeconds:observedSeconds,
    independentCandidateFeatures:validFeatureCount,
    qualifiedGameCount:observedGames.size,
    distinctOpponentCount:opponents.size,
    eligibleForRealignment:false,
    opponentCalibration:qualified?"QA_EVIDENCE_READY_NOT_RATED":"NOT_CALIBRATED",
    reasons:[...new Set(reasons)].sort()
  };
 }
 // Reuse the existing accepted game graph. An edge links current divisions;
 // it is NOT evidence that the divisions were equivalent on game date.
 function opponentBridgeInventory(existing){
  need(existing?.schema==="brave-hc-division-fit-research/v1"&&
    existing.originalLeagueId===570&&
    existing.gameGraph?.reciprocalPairsVerified===true&&
    Array.isArray(existing.gameGraph.verifiedMatches)&&
    Array.isArray(existing.teams)&&existing.teams.length===existing.adultPoolTeamCount&&
    Array.isArray(existing.poolDivisions)&&
    existing.poolDivisions.length===3&&
    !existing.poolDivisions.some(x=>/VAHL/i.test(x)),
    "HISTORICAL_GAME_BRIDGE_UNVERIFIED");
  const teamIDs=new Map(existing.teams.map(t=>[t.sourceTeamId,t]));
  need(teamIDs.size===existing.teams.length&&
    existing.teams.every(t=>existing.poolDivisions.includes(t.divisionNow)),
    "ADULT_TEAM_ID_OR_DIVISION_SCOPE_CHANGED");
  const byTeam=new Map(existing.teams.map(t=>[t.sourceTeamId,{
    sourceTeamId:t.sourceTeamId,name:t.name,divisionNow:t.divisionNow,
    allVerifiedGames:0,crossCurrentDivisionGames:0,
    opponentIDs:new Set(),crossDivisionOpponentIDs:new Set(),
    sourceGameKeys:new Set()
  }]));
  const keys=new Set();
  const bridgeByPair=new Map();
  for(const game of existing.gameGraph.verifiedMatches){
   need(typeof game.sourceGameKey==="string"&&!keys.has(game.sourceGameKey)&&
     Array.isArray(game.teamIds)&&game.teamIds.length===2&&
     game.teamIds.every(id=>teamIDs.has(id))&&game.teamIds[0]!==game.teamIds[1]&&
     typeof game.sameCurrentDivision==="boolean"&&
     Array.isArray(game.divisionPair)&&game.divisionPair.length===2&&
     game.divisionPair.every(d=>existing.poolDivisions.includes(d)),
     "CROSS_DIVISION_GAME_NOT_SOURCE_QUALIFIED");
   keys.add(game.sourceGameKey);
   const a=teamIDs.get(game.teamIds[0]),b=teamIDs.get(game.teamIds[1]);
   need(game.sameCurrentDivision===(a.divisionNow===b.divisionNow)&&
     [...game.divisionPair].sort().join("|")===
       [a.divisionNow,b.divisionNow].sort().join("|"),
     "SOURCE_GAME_DIVISION_MEMBERSHIP_DISAGREES");
   const cross=!game.sameCurrentDivision;
   for(const [own,opp] of [[a,b],[b,a]]){
    const s=byTeam.get(own.sourceTeamId);
    need(!s.sourceGameKeys.has(game.sourceGameKey),"RECIPROCAL_GAME_DUPLICATION");
    s.sourceGameKeys.add(game.sourceGameKey);
    s.allVerifiedGames++;
    s.opponentIDs.add(opp.sourceTeamId);
    if(cross){
     s.crossCurrentDivisionGames++;
     s.crossDivisionOpponentIDs.add(opp.sourceTeamId);
    }
   }
   if(cross){
    const key=[a.divisionNow,b.divisionNow].sort().join(" / ");
    const bucket=bridgeByPair.get(key)||{
      divisions:[a.divisionNow,b.divisionNow].sort(),
      games:0,distinctTeamPairKeys:new Set(),sourceGameKeys:[]};
    bucket.games++;
    bucket.sourceGameKeys.push(game.sourceGameKey);
    bucket.distinctTeamPairKeys.add(
      [a.sourceTeamId,b.sourceTeamId].sort((x,y)=>x-y).join("|"));
    bridgeByPair.set(key,bucket);
   }
  }
  need(keys.size===existing.gameGraph.verifiedGamesInPool&&
    [...byTeam.values()].reduce((s,t)=>s+t.crossCurrentDivisionGames,0)===
     existing.gameGraph.crossCurrentDivisionGames*2&&
    [...bridgeByPair.values()].reduce((s,v)=>s+v.games,0)===
     existing.gameGraph.crossCurrentDivisionGames,
    "CROSS_DIVISION_GAME_BRIDGE_COUNT_MISMATCH");
  const teams=[...byTeam.values()].map(t=>({
   sourceTeamId:t.sourceTeamId,name:t.name,divisionNow:t.divisionNow,
   allVerifiedGames:t.allVerifiedGames,
   distinctOpponentTeams:t.opponentIDs.size,
   crossCurrentDivisionGames:t.crossCurrentDivisionGames,
   distinctCrossDivisionOpponents:t.crossDivisionOpponentIDs.size
  })).sort((a,b)=>a.sourceTeamId-b.sourceTeamId);
  return {
    schema:"HOCKEYOS_SCOUT_VIDEO_OPPONENT_BRIDGE_INVENTORY_V0_1",
    status:"SOURCE_QUALIFIED_MATCHUPS_NOT_VIDEO_OR_TIER_CALIBRATION",
    originalLeagueId:570,divisionContext:"CURRENT_MEMBERSHIP_NOT_HISTORICAL_TIER",
    adultTeamCount:teams.length,
    eligibleAdultDivisions:[...existing.poolDivisions],
    verifiedPoolGames:keys.size,
    crossCurrentDivisionGames:existing.gameGraph.crossCurrentDivisionGames,
    teamsWithCrossDivisionEvidence:teams.filter(t=>t.crossCurrentDivisionGames>0).length,
    teamsWithoutCrossDivisionEvidence:teams.filter(t=>t.crossCurrentDivisionGames===0).length,
    divisionPairBridges:[...bridgeByPair.values()].map(p=>({
      divisions:p.divisions,observedGames:p.games,
      distinctTeamPairs:p.distinctTeamPairKeys.size,
      sourceGameKeys:p.sourceGameKeys.sort()
    })).sort((a,b)=>b.observedGames-a.observedGames||
      a.divisions.join("|").localeCompare(b.divisions.join("|"))),
    teams,opponentTierEquivalenceVerified:false,
    videoStrengthCalibrated:false,officialDivisionRealignmentAllowed:false,
    caveat:"Current-division links describe observed historical games, not tier-adjusted team talent; preserve era, schedule selection, opponent quality and source identity uncertainty."
  };
 }
 // Source-only join to exact official GameInfo IDs. No performance-rating use.
 // To audit original file hashes, CI rebuilds the bridge byte for byte.
 function officialGameIdentityCoverage(existing,official){
  const inventory=opponentBridgeInventory(existing);
  need(official?.schema==="brave-hc-svhl-current-official-game-id-bridge/v1"&&
    official.status==="OFFICIAL_GAMEINFO_IDENTITY_MATCHED_NO_RATING_OR_STATS_WRITE"&&
    official.policy==="EXACT_SOURCE_GAME_ID_AND_TEAM_SIDE_SCORES_IN_SVHL_570_ONLY"&&
    official.sourceHashBytePolicy==="UTF8_LF_GIT_BLOB"&&
    official.leagueId===existing.originalLeagueId&&
    official.teams===inventory.adultTeamCount&&
    official.officialGames===inventory.verifiedPoolGames&&
    official.crossCurrentDivisionGames===inventory.crossCurrentDivisionGames&&
    official.allSourceGameKeysOfficiallyMatched===true&&
    official.sourceGameIDsStable===true&&
    official.leagueRatingsChanged===false&&
    official.officialDivisionAssignmentsChanged===false&&
    official.videoStrengthCalibrated===false&&
    official.independentAcceptedForHistoricalPlayerCorrections===false&&
    /^[a-f0-9]{64}$/.test(official.originalSourceSHA256?.leagueIntelligenceJSON||"")&&
    /^[a-f0-9]{64}$/.test(official.originalSourceSHA256?.officialGameInfoSeasonJSON||"")&&
    Array.isArray(official.games)&&official.games.length===inventory.verifiedPoolGames,
    "OFFICIAL_GAME_ID_MAP_NOT_SOURCE_ADMITTED");
  const graph=new Map(existing.gameGraph.verifiedMatches.map(g=>[g.sourceGameKey,g]));
  const uniqueKeys=new Set(),uniqueIDs=new Set();
  let cross=0,partial=0;
  for(const g of official.games){
   const original=graph.get(g.sourceGameKey);
   need(Number.isSafeInteger(g.officialGameId)&&g.officialGameId>0&&
     !uniqueIDs.has(g.officialGameId)&&!uniqueKeys.has(g.sourceGameKey)&&
     original&&g.date===original.date&&
     Array.isArray(g.publishedFinalGoals)&&g.publishedFinalGoals.length===2&&
     g.publishedFinalGoals.every(x=>Number.isSafeInteger(x)&&x>=0)&&
     Math.abs(g.publishedFinalGoals[0]-g.publishedFinalGoals[1])===original.absoluteGoalMargin&&
     g.homeTeamId!==g.awayTeamId&&
     original.teamIds[0]===Math.min(g.homeTeamId,g.awayTeamId)&&
     original.teamIds[1]===Math.max(g.homeTeamId,g.awayTeamId)&&
     g.crossCurrentDivision===!original.sameCurrentDivision&&
     JSON.stringify(g.currentDivisionPair)===JSON.stringify(original.divisionPair)&&
     g.officialGameInfoURL===
       "https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid=570&gameid="+
       g.officialGameId+"&page_type=Adult"&&
     /^[a-f0-9]{64}$/.test(g.officialGameInfoPageSHA256)&&
     g.originalOfficialScoreOverwritten===false&&
     g.videoPerformanceMeasurements===null&&
     ["FULL_GOAL_EVENTS_SCORE_PARITY",
      "HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION"].includes(g.scoringEventAdmission),
     "OFFICIAL_GAME_ID_LINK_SCORE_OR_SOURCE_HASH_UNQUALIFIED");
   uniqueKeys.add(g.sourceGameKey);uniqueIDs.add(g.officialGameId);
   if(g.crossCurrentDivision)cross++;
   if(g.scoringEventAdmission==="HELD_PLAYER_SCORING_NOT_SEASON_ADMISSION")partial++;
  }
  need(uniqueKeys.size===graph.size&&cross===inventory.crossCurrentDivisionGames&&
    partial===official.heldPlayerScoringGames&&
    uniqueKeys.size-partial===official.fullScoringSheetEvents,
    "OFFICIAL_ID_LINK_COVERAGE_OR_SCORER_HOLD_PARITY");
  return {schema:"HOCKEYOS_SCOUT_GAME_ID_JOIN_STATUS_V0_1",
    status:"OFFICIAL_SOURCE_GAME_IDS_VERIFIED_VIDEO_INSUFFICIENT",
    sourceGameIDsVerified:uniqueIDs.size,
    verifiedCrossDivisionIDs:cross,
    scorerHeldOfficialGames:partial,
    sourceInputHashes:official.originalSourceSHA256,
    videoStrengthStatus:STATUS,teamRating:null,
    ratingAppliedToExistingLeague:false,
    opponentTierEquivalenceAccepted:false,
    realignmentApproved:false,
    reason:"Official GameInfo identity is reconciled; actual moving-play evidence and independent tier calibration are still unavailable."};
 }
 function overlayExistingDivisionFit(baseAnalysis,videoEvidence){
  need(baseAnalysis&&Array.isArray(baseAnalysis.scenarios)&&
      Array.isArray(baseAnalysis.teams||baseAnalysis.teamProfiles) ,
      "EXISTING_DIVISION_FIT_MISSING");
  need(videoEvidence&&["INSUFFICIENT_VIDEO",
    "READY_FOR_SEPARATE_INDEPENDENT_STRENGTH_EVALUATION"].includes(videoEvidence.status)&&
    videoEvidence.videoScore===null&&
    videoEvidence.videoScoreUsedInDivisionFit===false&&
    videoEvidence.eligibleForRealignment===false,
    "UNAPPROVED_VIDEO_RATING_OR_DIVISION_AUTHORITY");
  return {baseAnalysis,videoEvidenceStatus:videoEvidence.status,
    videoStrengthScore:null,legacyDivisionFitUnchanged:true,
    videoEvidenceOnlyForSeparateResearch:true};
 }
 return Object.freeze({pilot,featureReadiness,opponentBridgeInventory,officialGameIdentityCoverage,overlayExistingDivisionFit,
   constants:Object.freeze({SCHEMA,SHADOW,FEATURE,STATUS})});
});
