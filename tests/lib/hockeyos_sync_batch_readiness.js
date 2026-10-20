'use strict';
/**
 * HockeyOS dual control: independent data-parity and temporal provenance.
 *
 * A clean historical workbook reconciliation MUST NOT be treated as an
 * approved live hourly workbook update. No Excel writer or host actions.
 */
const {evaluate}=require('./hockeyos_award_sync_preflight');
const {assessFreshness}=require('./hockeyos_sync_freshness');
function assessPreparedBatch({inputManifest,freshnessEvidence}={}){
 const parity=evaluate(inputManifest);
 const freshness=assessFreshness(freshnessEvidence);
 const parityPass=parity.status==='RAW_INPUT_PREFLIGHT_PASS_RELEASE_HOLD';
 const sourceRecent=freshness.status==='FRESHNESS_PASS_INPUT_ONLY';
 let status;
 if(!parityPass)status='SOURCE_INTEGRITY_FAIL_HOLD';
 else if(!sourceRecent)status='SOURCE_PARITY_PASS_FRESHNESS_HOLD';
 else status='INPUT_CHECKS_PASS_AWARD_FORMULA_RELEASE_HOLD';
 return {
  schema:'hockeyos-awards-input-parity-and-freshness-gate/v1',
  status,
  rawInputParityStatus:parity.status,
  sourceFreshnessStatus:freshness.status,
  sourceRecordCount:parity.sourceRecordCount||null,
  decisions:parity.decisions||null,
  sourceErrors:parity.errors||[],
  temporalHolds:freshness.holds||[],
  overallHolds:[...(parity.holds||[]),...(freshness.holds||[])],
  qualifiesForAwardRatingPublication:false,
  qualifiesForHourlyWorkbookWrite:false,
  // There is intentionally no path from these QA booleans to an action.
  writeAuthorized:false,
  originalWorkbookModified:false,
  taskModified:false
 };
}
module.exports={assessPreparedBatch};
