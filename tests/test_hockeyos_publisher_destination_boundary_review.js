'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluateDestination,normalizeWindows}=
 require('../scripts/hockeyos_publisher_destination_boundary_review');

const SHA='43dcf0f86dcf30ef02952d93998ad92c2c021a5f';
const ROOT='D:\\BruTTech\\Products\\HockeyOS';
function evidence(){
 return {
  targetPath:ROOT+'\\261020_HTO_Publisher_Recovery_Review\\Clean_Main_Candidate',
  approvedCandidatePath:ROOT+'\\261020_HTO_Publisher_Recovery_Review\\Clean_Main_Candidate',
  oldPublisherPath:ROOT+'\\HTO_Widget_Public_GitHub_Staging_20261016',
  originalWorkbookRoot:ROOT+'\\Reference Implementations\\Brave H.C\\01 Team Records',
  expectedCandidateSha:SHA,actualCandidateSha:SHA,remoteMainSha:SHA,
  candidateBranch:'main',
  gitOrigin:'https://github.com/adambrutto-maker/brave-hc.git',
  workingTreeClean:true,
  reparsePointsIndependentlyInspected:false,
  reviewerCredentialsIndependentlyControlled:false
 };
}
test('unverified independent Windows reparse and reviewer identity must hold',()=>{
 const r=evaluateDestination(evidence());
 assert.equal(r.status,'HOLD_EVIDENCE_REQUIREMENTS');
 assert.ok(r.holds.includes('WINDOWS_REPARSE_OR_SYMLINK_PATH_NOT_INDEPENDENTLY_VERIFIED'));
 assert.ok(r.holds.includes('INDEPENDENT_GITHUB_REVIEWER_CREDENTIALS_NOT_VERIFIED'));
 assert.equal(r.writeAuthorized,false);
});
test('even all self-reported checks never authorize a production writer',()=>{
 const data=evidence();
 data.reparsePointsIndependentlyInspected=true;
 data.reviewerCredentialsIndependentlyControlled=true;
 const r=evaluateDestination(data);
 assert.equal(r.status,'REVIEW_CANDIDATE_BOUNDARY_ONLY');
 assert.equal(r.writeAuthorized,false);
 assert.equal(r.publisherActivationAuthorized,false);
 assert.equal(r.securityApproved,false);
});
test('old publisher and workbook tree are protected regardless of requested approved path',()=>{
 for(const path of [
  evidence().oldPublisherPath,
  evidence().oldPublisherPath+'\\widgets\\projection.json',
  evidence().originalWorkbookRoot,
  evidence().originalWorkbookRoot+'\\261001_Brave_HC_Master_Workbook.xlsx'
 ]){
  const data=evidence();data.targetPath=path;data.approvedCandidatePath=path;
  assert.equal(evaluateDestination(data).status,'HOLD_PROTECTED_ORIGINAL_PATH',path);
 }
});
test('target folder must exactly match approved reviewed candidate, not any sibling',()=>{
 const data=evidence();
 data.targetPath=ROOT+'\\Other_Directory';
 assert.equal(evaluateDestination(data).status,'HOLD_DESTINATION_NOT_APPROVED');
});
test('Windows casing, slash forms and dot segments are canonicalized',()=>{
 const data=evidence();
 data.targetPath=data.approvedCandidatePath.toUpperCase()
  .replace(/\\/g,'/')+'/../Clean_Main_Candidate';
 assert.equal(evaluateDestination(data).status,'HOLD_EVIDENCE_REQUIREMENTS');
});
test('relative paths, UNC/device paths and missing values fail closed',()=>{
 for(const path of [
  null,'','..\\Clean_Main_Candidate','Clean_Main_Candidate',
  '\\\\server\\share\\repo','\\\\?\\D:\\repo','/tmp/repo'
 ]){
  const data=evidence();data.targetPath=path;
  assert.equal(evaluateDestination(data).status,'HOLD_DESTINATION_INVALID',String(path));
 }
});
test('head ref changes cannot be accepted because the remote SHA is stale',()=>{
 const data=evidence();
 data.remoteMainSha='a'.repeat(40);
 assert.equal(evaluateDestination(data).status,'HOLD_BRANCH_REF_DRIFT');
 data.remoteMainSha=SHA;data.actualCandidateSha='b'.repeat(40);
 assert.equal(evaluateDestination(data).status,'HOLD_BRANCH_REF_DRIFT');
});
test('untrusted repo origin, branch name and dirty checkout block review',()=>{
 const data=evidence();data.gitOrigin='https://attacker.invalid/repo.git';
 assert.ok(evaluateDestination(data).holds.includes('UNVERIFIED_GIT_REMOTE'));
 data.gitOrigin=evidence().gitOrigin;data.candidateBranch='qa';
 assert.ok(evaluateDestination(data).holds.includes('CANDIDATE_BRANCH_NOT_MAIN'));
 data.candidateBranch='main';data.workingTreeClean=false;
 assert.ok(evaluateDestination(data).holds.includes('CANDIDATE_DIRTY'));
});
test('cannot replace approved source checkout path by altering case or traversal',()=>{
 const data=evidence();
 data.targetPath=ROOT+'\\261020_HTO_Publisher_Recovery_Review\\..\\HTO_Widget_Public_GitHub_Staging_20261016';
 data.approvedCandidatePath=data.targetPath;
 assert.equal(evaluateDestination(data).status,'HOLD_PROTECTED_ORIGINAL_PATH');
});
