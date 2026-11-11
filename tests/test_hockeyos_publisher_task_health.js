'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {auditTaskPublisher}=require('../scripts/hockeyos_publisher_task_health');
const OLD='5753979f1547094fbe229f643af5c0b0360bbc6a';
const REMOTE='43dcf0f86dcf30ef02952d93998ad92c2c021a5f';
function data(){
 return {
  taskExitCode:0,localSha:OLD,remoteSha:REMOTE,
  localIsAncestorOfRemote:false,remoteIsAncestorOfLocal:false,
  controller:{started:'2026-10-20T05:31:00Z',finished:'2026-10-20T05:31:25Z',
   allStagesSuccessful:true,stages:{
    read_hto:{outcome:'PASS'},
    reconcile_game_boxes:{outcome:'PASS'},
    countdown:{outcome:'PASS',stdoutTail:'COUNTDOWN_SCHEDULE_UNCHANGED ageHours 1.0'},
    projections:{outcome:'PASS',stdoutTail:'HTO_MODEL_NO_CHANGE {"players":22}'}
   }}
 };
}
test('real 01:31 scenario: all 8 tasks PASS but publisher remains DIVERGED',()=>{
 const r=auditTaskPublisher(data());
 assert.equal(r.status,'PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED');
 assert.equal(r.flags.readHtoPass,true);
 assert.equal(r.flags.gameReconciliationPass,true);
 assert.equal(r.flags.taskSuccess,true);
 assert.equal(r.flags.countdownLocalNoChange,true);
 assert.equal(r.flags.projectionLocalNoChange,true);
 assert.equal(r.flags.publisherGitAligned,false);
 assert.equal(r.healthGreen,false);
 assert.equal(r.websitePublicationVerified,false);
 assert.equal(r.publisherRepairAuthorized,false);
 assert.equal(r.workbookWriteAuthorized,false);
 assert.ok(r.issues.includes('TASK_EXIT_ZERO_CANNOT_CLEAR_GIT_DIVERGENCE'));
});
test('failed push produces degraded outcome even when HTO collector works',()=>{
 const x=data();x.taskExitCode=2;
 x.controller.allStagesSuccessful=false;
 x.controller.stages.countdown={outcome:'FAILED',stdoutTail:'git push rejected non-fast-forward'};
 x.controller.stages.projections={outcome:'FAILED',stdoutTail:'git push rejected'};
 const r=auditTaskPublisher(x);
 assert.equal(r.status,'PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED');
 assert.equal(r.flags.taskSuccess,false);
 assert.equal(r.flags.readHtoPass,true);
});
test('remote ahead clean fast forward still requires external review',()=>{
 const x=data();x.localIsAncestorOfRemote=true;
 assert.equal(auditTaskPublisher(x).status,'PUBLISHER_REMOTE_AHEAD_NOT_REPAIRED');
});
test('unpublished local commit cannot be mistaken for site status',()=>{
 const x=data();x.remoteIsAncestorOfLocal=true;
 assert.equal(auditTaskPublisher(x).status,'PUBLISHER_UNPUBLISHED_LOCAL_COMMITS');
});
test('same SHA and green stages still do not certify hosted data without remote proof',()=>{
 const x=data();x.localSha=REMOTE;
 x.controller.stages.countdown={outcome:'PASS',stdoutTail:'COUNTDOWN_SCHEDULE_PUBLISHED'};
 const r=auditTaskPublisher(x);
 assert.equal(r.status,'GIT_HEAD_ALIGNED_STAGE_RESULTS_ONLY');
 assert.equal(r.flags.countdownPublished,true);
 assert.equal(r.websitePublicationVerified,false);
 assert.equal(r.workbookWriteAuthorized,false);
});
test('missing ancestry, invalid commit SHA or malformed stage receipt hold closed',()=>{
 const x=data();delete x.localIsAncestorOfRemote;
 assert.equal(auditTaskPublisher(x).status,'HEALTH_EVIDENCE_HOLD');
 const y=data();y.remoteSha='unknown';
 assert.equal(auditTaskPublisher(y).status,'HEALTH_EVIDENCE_HOLD');
 const z=data();delete z.controller.stages.countdown;
 assert.equal(auditTaskPublisher(z).status,'HEALTH_EVIDENCE_HOLD');
});
test('absent task run evidence can never become a green pass',()=>{
 const r=auditTaskPublisher();
 assert.equal(r.status,'HEALTH_EVIDENCE_HOLD');
 assert.equal(r.healthGreen,false);
 assert.equal(r.websitePublicationVerified,false);
});
