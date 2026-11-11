'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {assessFreshness}=require('./lib/hockeyos_sync_freshness');
function fixture(){
 return {
  verifiedHtoObservedAt:'2026-10-20T10:00:00Z',
  stagePreparedAt:'2026-10-20T10:15:00Z',
  checkPerformedAt:'2026-10-20T10:45:00Z',
  officialObservationVerified:true
 };
}
test('verified recent HTO readback + recent stage can pass input time window, never write gate',()=>{
 const result=assessFreshness(fixture());
 assert.equal(result.status,'FRESHNESS_PASS_INPUT_ONLY');
 assert.equal(result.sourceAgeMinutes,45);
 assert.equal(result.stageAgeMinutes,30);
 assert.deepEqual(result.holds,[]);
 assert.equal(result.writeAuthorized,false);
 assert.equal(result.awardPublicationAuthorized,false);
 assert.equal(result.refreshTaskChangeAuthorized,false);
});
test('staging generated just now never rescues an old HTO observation',()=>{
 const x=fixture();
 x.verifiedHtoObservedAt='2026-10-19T10:00:00Z';
 x.stagePreparedAt='2026-10-20T10:44:00Z';
 const result=assessFreshness(x);
 assert.equal(result.status,'FRESHNESS_HOLD');
 assert.deepEqual(result.holds,['HTO_READBACK_STALE']);
 assert.equal(result.writeAuthorized,false);
});
test('recent HTO is insufficient if the reconciled stage is stale',()=>{
 const x=fixture();
 x.verifiedHtoObservedAt='2026-10-20T09:30:00Z';
 x.stagePreparedAt='2026-10-20T09:35:00Z';
 x.checkPerformedAt='2026-10-20T11:20:00Z';
 const result=assessFreshness(x);
 assert.equal(result.status,'FRESHNESS_HOLD');
 assert.ok(result.holds.includes('RECONCILED_STAGE_STALE'));
});
test('source observation time unknown must hold even when stage timestamp is current',()=>{
 const x=fixture();
 delete x.verifiedHtoObservedAt;
 const result=assessFreshness(x);
 assert.equal(result.status,'FRESHNESS_HOLD');
 assert.equal(result.holds[0],'HTO_OFFICIAL_READBACK_NOT_VERIFIED_OR_MISSING');
});
test('an unattributed readback timestamp cannot count as verified HTO',()=>{
 const x=fixture();
 x.officialObservationVerified=false;
 assert.equal(assessFreshness(x).status,'FRESHNESS_HOLD');
});
test('a staging file future timestamp fails closed',()=>{
 const x=fixture();
 x.stagePreparedAt='2026-10-20T10:55:00Z';
 assert.equal(assessFreshness(x).status,'FRESHNESS_INVALID');
});
test('source readback newer than staging timestamp fails closed',()=>{
 const x=fixture();
 x.stagePreparedAt='2026-10-20T09:55:00Z';
 assert.equal(assessFreshness(x).status,'FRESHNESS_INVALID');
});
test('nonexistent calendar date, missing timezone, invalid time all fail',()=>{
 for(const invalid of ['2026-02-31T10:00:00Z','2026-10-20T99:00:00Z',
    '2026-10-20T10:00:00','2026-10-20 10:00:00Z','2026-10-20T10:00:00+14:30']){
  const x=fixture();
  x.checkPerformedAt=invalid;
  assert.equal(assessFreshness(x).status,'FRESHNESS_INVALID',invalid);
 }
});
test('explicit different timezone offsets are accepted when absolute times agree',()=>{
 const x=fixture();
 x.verifiedHtoObservedAt='2026-10-20T06:00:00-04:00';
 x.stagePreparedAt='2026-10-20T12:15:00+02:00';
 assert.equal(assessFreshness(x).status,'FRESHNESS_PASS_INPUT_ONLY');
});
test('unsupported custom freshness policy always fails closed',()=>{
 for(const value of [0,-1,0.1,'90',NaN]){
  const x=fixture();x.maxSourceAgeMinutes=value;
  assert.equal(assessFreshness(x).status,'FRESHNESS_INVALID');
 }
});
test('missing check time is not inferred from this computer or from HTO stage creation',()=>{
 const x=fixture();delete x.checkPerformedAt;
 assert.equal(assessFreshness(x).status,'FRESHNESS_INVALID');
});
