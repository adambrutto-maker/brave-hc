'use strict';

/**
 * Brave H.C. publisher recovery decision engine — PURE, NO GIT OR NETWORK.
 *
 * Outputs an operator REVIEW PLAN, never a push/merge/FF approval.
 * The pre-existing publisher is a DIFFERENT local worktree; this helper has
 * no access to it. In particular, a non-overlapping file list is not a reason
 * to bypass Git ancestry or website approval.
 */
const HEX=/^[0-9a-f]{40}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ALLOWED=new Set(['widgets/countdown.json','widgets/projection.json','widgets/standings.json']);
const MAX_AGE_MINUTES=90;

function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
function countdownSignature(data){
 if(!data||data.schema!=='brave-hc-upcoming-countdown/v1'
    ||!Array.isArray(data.games))return null;
 return JSON.stringify(canonical({
  schema:data.schema,team:data.team,season:data.season,
  sourceAuthority:data.sourceAuthority,sourceURL:data.sourceURL,
  timezone:data.timezone,sourcePages:data.sourcePages,
  rolloverPolicy:data.rolloverPolicy,games:data.games
 }));
}
function timestamp(v){
 if(typeof v!=='string'||!ISO.test(v))return null;
 const dt=new Date(v);
 if(!Number.isFinite(dt.valueOf()))return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.slice(0,10)))return null;
 const [y,m,d]=v.slice(0,10).split('-').map(Number);
 if(m<1||m>12||d<1||d>31)return null;
 const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
 return dt.getTime();
}
function output(status,decisions,holds,extra={}){
 return {
  schema:'brave-hc-publisher-review-preflight/v1',
  status,decisions,holds,...extra,
  productionPushAuthorized:false,
  branchRewriteAuthorized:false,
  workbookWriteAuthorized:false,
  localPublisherModified:false,
  safeToDeploy:false
 };
}
function review({
 localSha,remoteSha,commonBaseSha,
 localWorkingTreeClean,localIsAncestorOfRemote,remoteIsAncestorOfLocal,
 checkedAt,candidates
}={}){
 const issues=[];
 if(!HEX.test(localSha||'')||!HEX.test(remoteSha||'')||!HEX.test(commonBaseSha||''))
  issues.push('UNVERIFIED_GIT_COMMIT_IDENTITY');
 if(localWorkingTreeClean!==true)issues.push('LOCAL_PUBLISHER_WORKTREE_NOT_CLEAN');
 if(typeof localIsAncestorOfRemote!=='boolean'||typeof remoteIsAncestorOfLocal!=='boolean')
  issues.push('GIT_ANCESTRY_UNVERIFIED');
 if(timestamp(checkedAt)===null)issues.push('CHECK_TIME_INVALID');
 if(!Array.isArray(candidates))issues.push('CANDIDATE_MANIFEST_ABSENT');
 if(issues.length)return output('HOLD_INVALID_RECOVERY_EVIDENCE',[],issues);

 const divergence=localSha!==remoteSha&&!localIsAncestorOfRemote&&!remoteIsAncestorOfLocal;
 if(divergence)return output('HOLD_DIVERGED_HISTORY',[],
  ['LOCAL_AND_REMOTE_BRANCHES_HAVE_DIFFERENT_UNPUBLISHED_HISTORY'],
  {localSha,remoteSha,commonBaseSha,
   recovery:'Preserve both histories and use a separate fresh-main REVIEW branch'});
 if(localSha!==remoteSha&&localIsAncestorOfRemote)
  return output('HOLD_PUBLISHER_FAST_FORWARD_REQUIRED',[],
   ['REMOTE_MAIN_AHEAD_OF_LOCAL_PUBLISHER'],
   {localSha,remoteSha,commonBaseSha,
    recovery:'Only after a separate controlled safety review may an operator fast-forward a clean publisher'});
 if(localSha!==remoteSha&&remoteIsAncestorOfLocal)
  return output('HOLD_UNPUBLISHED_LOCAL_COMMITS',[],
   ['UNPUBLISHED_LOCAL_COMMITS_REQUIRE_INDEPENDENT_REVIEW'],
   {localSha,remoteSha,commonBaseSha});
 if(localSha!==remoteSha)
  return output('HOLD_UNCERTAIN_GIT_ANCESTRY',[],['CANNOT_PROVE_SAFE_GIT_RELATIONSHIP']);

 const seen=new Set(),decisions=[],holds=[],now=timestamp(checkedAt);
 for(const item of candidates){
  if(!item||typeof item!=='object'||typeof item.path!=='string'
    ||!ALLOWED.has(item.path)||seen.has(item.path)){
   holds.push('INVALID_DUPLICATE_OR_OUT_OF_SCOPE_FILE');
   continue;
  }
  seen.add(item.path);
  if(typeof item.semanticSameAsPublished!=='boolean'){
   holds.push(item.path+': SEMANTIC_DIFF_UNVERIFIED');continue;
  }
  if(item.semanticSameAsPublished){
   decisions.push({path:item.path,decision:'NO_MATERIAL_UPDATE_NO_TIMESTAMP_COMMIT'});
   continue;
  }
  const observed=timestamp(item.sourceObservedAt);
  const verified=item.sourceObservationVerified===true;
  if(observed===null||!verified){
   decisions.push({path:item.path,decision:'HOLD_SOURCE_PROVENANCE'});
   holds.push(item.path+': SOURCE_PROVENANCE_NOT_ATTESTED');continue;
  }
  const age=(now-observed)/60000;
  if(age< -2||age>MAX_AGE_MINUTES){
   decisions.push({path:item.path,decision:'HOLD_SOURCE_FRESHNESS'});
   holds.push(item.path+': SOURCE_AGE_OUT_OF_POLICY');continue;
  }
  if(item.outputStatus!=='VERIFIED_FOR_REVIEW'){
   decisions.push({path:item.path,decision:'HOLD_OUTPUT_STATUS'});
   holds.push(item.path+': MODEL_OR_PROVIDER_RELEASE_STATE_INCOMPLETE');continue;
  }
  decisions.push({path:item.path,decision:'REVIEW_CANDIDATE_ONLY',
   sourceAgeMinutes:Math.round(age*10)/10});
 }
 return output(holds.length?'HOLD_CANDIDATES_REQUIRE_REVIEW':'NO_UNSAFE_PUBLISH_STEP',
  decisions,holds,{localSha,remoteSha,commonBaseSha});
}
module.exports={review,countdownSignature};
