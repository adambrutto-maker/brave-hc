'use strict';

/**
 * Separate time/provenance gate for an hourly HTO-to-HockeyOS workbook pipeline.
 * PURE. No filesystem, network, Excel, or clock reads.
 *
 * A file's local staging/write time is NOT proof that HTO was refreshed.
 * The caller must supply an attributable VERIFIED HTO readback timestamp
 * independently of the stage creation time, as well as the run check time.
 * Passing freshness NEVER authorizes any Excel write or award release.
 */
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
function parseMoment(x){
 if(typeof x!=='string'||!ISO.test(x))return null;
 const m=x.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
 const [year,month,day,hour,min,sec]=m.slice(1).map(Number);
 if(month<1||month>12||day<1||day>31||hour>23||min>59||sec>59)return null;
 const dt=new Date(Date.UTC(year,month-1,day));
 if(dt.getUTCFullYear()!==year||dt.getUTCMonth()!==month-1||dt.getUTCDate()!==day)return null;
 const offset=x.match(/([+-])(\d{2}):(\d{2})$/);
 if(offset&&(Number(offset[2])>14||Number(offset[3])>59||
    (Number(offset[2])===14&&Number(offset[3])!==0)))return null;
 const n=Date.parse(x);
 return Number.isFinite(n)?n:null;
}
function hold(status,reason,extra={}){
 return {status,holds:[reason],...extra,readiness:'NOT_READY',
  writeAuthorized:false,awardPublicationAuthorized:false,refreshTaskChangeAuthorized:false};
}
function assessFreshness({
 verifiedHtoObservedAt,stagePreparedAt,checkPerformedAt,
 officialObservationVerified=false,
 maxSourceAgeMinutes=90,maxStageAgeMinutes=90,futureToleranceMinutes=2
}={}){
 const checked=parseMoment(checkPerformedAt);
 if(checked===null)return hold('FRESHNESS_INVALID','CHECK_TIME_MISSING_OR_INVALID');
 const source=parseMoment(verifiedHtoObservedAt);
 if(source===null||!officialObservationVerified)
  return hold('FRESHNESS_HOLD','HTO_OFFICIAL_READBACK_NOT_VERIFIED_OR_MISSING');
 const stage=parseMoment(stagePreparedAt);
 if(stage===null)return hold('FRESHNESS_HOLD','STAGE_PREPARED_AT_MISSING_OR_INVALID');
 if(!Number.isInteger(maxSourceAgeMinutes)||maxSourceAgeMinutes<1||
    !Number.isInteger(maxStageAgeMinutes)||maxStageAgeMinutes<1||
    !Number.isInteger(futureToleranceMinutes)||futureToleranceMinutes<0||
    futureToleranceMinutes>10)
  return hold('FRESHNESS_INVALID','TIME_POLICY_INVALID');
 const sourceAge=(checked-source)/60000;
 const stageAge=(checked-stage)/60000;
 const gap=(stage-source)/60000;
 const measurements={
  sourceAgeMinutes:Math.round(sourceAge*100)/100,
  stageAgeMinutes:Math.round(stageAge*100)/100,
  stageAfterSourceMinutes:Math.round(gap*100)/100,
  evidence:{verifiedHtoObservedAt,stagePreparedAt,checkPerformedAt},
  maxSourceAgeMinutes,maxStageAgeMinutes
 };
 if(sourceAge< -futureToleranceMinutes||stageAge< -futureToleranceMinutes||
    gap< -futureToleranceMinutes)
  return hold('FRESHNESS_INVALID','IMPOSSIBLE_OR_FUTURE_TIMESTAMP_ORDER',measurements);
 const reasons=[];
 if(sourceAge>maxSourceAgeMinutes)reasons.push('HTO_READBACK_STALE');
 if(stageAge>maxStageAgeMinutes)reasons.push('RECONCILED_STAGE_STALE');
 return {status:reasons.length?'FRESHNESS_HOLD':'FRESHNESS_PASS_INPUT_ONLY',
  holds:reasons,...measurements,
  readiness:reasons.length?'NOT_READY':'INPUT_TIME_WINDOW_ONLY',
  writeAuthorized:false,awardPublicationAuthorized:false,refreshTaskChangeAuthorized:false};
}
module.exports={assessFreshness};
