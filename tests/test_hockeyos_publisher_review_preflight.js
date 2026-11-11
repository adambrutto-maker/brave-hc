'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {review,countdownSignature}=require('../scripts/hockeyos_publisher_review_preflight');

const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
function sample(){return {
 localSha:A,remoteSha:A,commonBaseSha:A,
 localWorkingTreeClean:true,localIsAncestorOfRemote:true,remoteIsAncestorOfLocal:true,
 checkedAt:'2026-10-20T05:00:00Z',
 candidates:[]
};}
test('exact observed divergent publisher history stays HOLD despite disjoint file paths',()=>{
 const v=sample();
 v.localSha='5753979f1547094fbe229f643af5c0b0360bbc6a';
 v.remoteSha='43dcf0f86dcf30ef02952d93998ad92c2c021a5f';
 v.commonBaseSha='8065e1d906d231c57e8d15da2c17fe77d384d844';
 v.localIsAncestorOfRemote=false;v.remoteIsAncestorOfLocal=false;
 v.candidates=[{path:'widgets/countdown.json',semanticSameAsPublished:true}];
 const r=review(v);
 assert.equal(r.status,'HOLD_DIVERGED_HISTORY');
 assert.equal(r.decisions.length,0);
 assert.equal(r.productionPushAuthorized,false);
 assert.equal(r.branchRewriteAuthorized,false);
});
test('outdated clean local publisher can only receive a separately reviewed FF',()=>{
 const v=sample();v.localSha=A;v.remoteSha=B;
 v.localIsAncestorOfRemote=true;v.remoteIsAncestorOfLocal=false;
 const r=review(v);
 assert.equal(r.status,'HOLD_PUBLISHER_FAST_FORWARD_REQUIRED');
 assert.equal(r.safeToDeploy,false);
});
test('unpublished local commit can never automatically push to production',()=>{
 const v=sample();v.localSha=A;v.remoteSha=B;
 v.localIsAncestorOfRemote=false;v.remoteIsAncestorOfLocal=true;
 assert.equal(review(v).status,'HOLD_UNPUBLISHED_LOCAL_COMMITS');
});
test('timestamp-only countdown regeneration does not produce material update',()=>{
 const game={id:1,gameDate:'2026-10-25',puckDrop:'2026-10-25T18:15:00-04:00'};
 const a={schema:'brave-hc-upcoming-countdown/v1',team:'Brave H.C.',season:'W2026/27',
  generatedAt:'2026-10-19T00:00:00Z',games:[game]};
 const b={...a,generatedAt:'2026-10-20T00:00:00Z'};
 assert.equal(countdownSignature(a),countdownSignature(b));
 const r=review({...sample(),candidates:[{
  path:'widgets/countdown.json',semanticSameAsPublished:true,
  sourceObservedAt:'2026-10-01T00:00:00Z',sourceObservationVerified:false
 }]});
 assert.equal(r.status,'NO_UNSAFE_PUBLISH_STEP');
 assert.equal(r.decisions[0].decision,'NO_MATERIAL_UPDATE_NO_TIMESTAMP_COMMIT');
 assert.equal(r.productionPushAuthorized,false);
});
test('countdown schedule changes are material even if generatedAt is identical',()=>{
 const a={schema:'brave-hc-upcoming-countdown/v1',team:'Brave H.C.',games:[{id:1}]};
 const b={...a,games:[{id:2}]};
 assert.notEqual(countdownSignature(a),countdownSignature(b));
});
test('invalid or missing Git ancestry fails closed',()=>{
 const v=sample();delete v.localIsAncestorOfRemote;
 assert.equal(review(v).status,'HOLD_INVALID_RECOVERY_EVIDENCE');
 assert.equal(review({...sample(),localWorkingTreeClean:false}).status,'HOLD_INVALID_RECOVERY_EVIDENCE');
});
test('out-of-scope generated file never authorized',()=>{
 const r=review({...sample(),candidates:[{path:'widgets/awards-races.json',semanticSameAsPublished:false}]});
 assert.equal(r.status,'HOLD_CANDIDATES_REQUIRE_REVIEW');
 assert.equal(r.productionPushAuthorized,false);
});
test('a verified fresh output remains a REVIEW candidate only',()=>{
 const r=review({...sample(),candidates:[{
  path:'widgets/standings.json',semanticSameAsPublished:false,
  sourceObservedAt:'2026-10-20T04:31:00Z',sourceObservationVerified:true,
  outputStatus:'VERIFIED_FOR_REVIEW'
 }]});
 assert.equal(r.status,'NO_UNSAFE_PUBLISH_STEP');
 assert.equal(r.decisions[0].decision,'REVIEW_CANDIDATE_ONLY');
 assert.equal(r.productionPushAuthorized,false);
});
test('stale source or incomplete model release is held despite current Git history',()=>{
 const r=review({...sample(),candidates:[
  {path:'widgets/projection.json',semanticSameAsPublished:false,
   sourceObservedAt:'2026-10-20T04:31:00Z',sourceObservationVerified:true,
   outputStatus:'HTO_MODEL_RECONCILIATION_PENDING'},
  {path:'widgets/standings.json',semanticSameAsPublished:false,
   sourceObservedAt:'2026-10-19T20:31:00Z',sourceObservationVerified:true,
   outputStatus:'VERIFIED_FOR_REVIEW'}
 ]});
 assert.equal(r.status,'HOLD_CANDIDATES_REQUIRE_REVIEW');
 assert.deepEqual(r.decisions.map(x=>x.decision),
  ['HOLD_OUTPUT_STATUS','HOLD_SOURCE_FRESHNESS']);
});
test('invalid source time and missing attestation cannot be substituted with generation time',()=>{
 const r=review({...sample(),candidates:[{
  path:'widgets/projection.json',semanticSameAsPublished:false,
  sourceObservedAt:'2026-10-20T04:50:00Z',sourceObservationVerified:false,
  outputStatus:'VERIFIED_FOR_REVIEW'
 }]});
 assert.equal(r.decisions[0].decision,'HOLD_SOURCE_PROVENANCE');
});
test('candidate duplicated paths or dirty publisher cannot pass',()=>{
 const v=sample();
 v.candidates=[
 {path:'widgets/countdown.json',semanticSameAsPublished:true},
 {path:'widgets/countdown.json',semanticSameAsPublished:true}];
 assert.equal(review(v).status,'HOLD_CANDIDATES_REQUIRE_REVIEW');
 v.localWorkingTreeClean=false;
 assert.equal(review(v).status,'HOLD_INVALID_RECOVERY_EVIDENCE');
});
test('invalid UTC check time or time traveling output fails closed',()=>{
 assert.equal(review({...sample(),checkedAt:'tomorrow'}).status,'HOLD_INVALID_RECOVERY_EVIDENCE');
 const r=review({...sample(),candidates:[{
 path:'widgets/projection.json',semanticSameAsPublished:false,
 sourceObservedAt:'2026-10-20T07:00:00Z',sourceObservationVerified:true,
 outputStatus:'VERIFIED_FOR_REVIEW'
 }]});
 assert.equal(r.decisions[0].decision,'HOLD_SOURCE_FRESHNESS');
});
