'use strict';

/**
 * HockeyOS release review: Windows publisher destination boundary.
 *
 * This is a pure decision tool. It does not read Windows paths, Git, accounts,
 * credentials or branch state itself. A caller MUST obtain and independently
 * attest real paths/ref states; caller-supplied booleans cannot constitute
 * Security approval. It never permits writes or production activation.
 */
const ntpath=require('node:path').win32;
const SHA=/^[a-f0-9]{40}$/i;
const EXPECTED_ORIGIN='https://github.com/adambrutto-maker/brave-hc.git';
function normalizeWindows(path){
 if(typeof path!=='string'||!path||!ntpath.isAbsolute(path)||
    path.startsWith('\\\\')||path.startsWith('//')||path.startsWith('\\\\?\\')||
    path.startsWith('\\\\.\\'))return null;
 const normalized=ntpath.normalize(path).replace(/[\\/]+$/,'');
 if(!/^[A-Za-z]:\\/.test(normalized))return null;
 return normalized.toLowerCase();
}
function inside(candidate,root){
 return candidate===root||candidate.startsWith(root+'\\');
}
function result(status,holds,details={}){
 return {
  schema:'hockeyos-publisher-destination-boundary-review/v1',
  status,holds,...details,
  writeAuthorized:false,
  publisherActivationAuthorized:false,
  githubMainUpdateAuthorized:false,
  workbookWriteAuthorized:false,
  securityApproved:false
 };
}
function evaluateDestination({
 targetPath,approvedCandidatePath,oldPublisherPath,originalWorkbookRoot,
 expectedCandidateSha,actualCandidateSha,remoteMainSha,
 candidateBranch,gitOrigin,workingTreeClean,
 reparsePointsIndependentlyInspected=false,
 reviewerCredentialsIndependentlyControlled=false
}={}){
 const refs=[targetPath,approvedCandidatePath,oldPublisherPath,originalWorkbookRoot].map(normalizeWindows);
 const [target,approved,old,workbook]=refs;
 if(refs.some(x=>x===null))
  return result('HOLD_DESTINATION_INVALID',['MISSING_OR_NONABSOLUTE_WINDOWS_PATH']);
 if(inside(target,old)||inside(target,workbook)||inside(approved,old)||
    inside(approved,workbook))
  return result('HOLD_PROTECTED_ORIGINAL_PATH',['OLD_PUBLISHER_OR_MASTER_WORKBOOK_PATH']);
 if(target!==approved)
  return result('HOLD_DESTINATION_NOT_APPROVED',['TARGET_DIFFERS_FROM_REVIEWED_CANDIDATE']);
 if(!SHA.test(expectedCandidateSha||'')||!SHA.test(actualCandidateSha||'')||
    !SHA.test(remoteMainSha||''))
  return result('HOLD_REF_PROOF_MISSING',['INVALID_GIT_SHA']);
 if(actualCandidateSha!==expectedCandidateSha||actualCandidateSha!==remoteMainSha)
  return result('HOLD_BRANCH_REF_DRIFT',['CANDIDATE_OR_REMOTE_MAIN_CHANGED']);
 const holds=[];
 if(candidateBranch!=='main')holds.push('CANDIDATE_BRANCH_NOT_MAIN');
 if(gitOrigin!==EXPECTED_ORIGIN)holds.push('UNVERIFIED_GIT_REMOTE');
 if(workingTreeClean!==true)holds.push('CANDIDATE_DIRTY');
 if(reparsePointsIndependentlyInspected!==true)
  holds.push('WINDOWS_REPARSE_OR_SYMLINK_PATH_NOT_INDEPENDENTLY_VERIFIED');
 if(reviewerCredentialsIndependentlyControlled!==true)
  holds.push('INDEPENDENT_GITHUB_REVIEWER_CREDENTIALS_NOT_VERIFIED');
 // Even if a caller asserts all checks, its self-report is NOT an
 // authenticated independent review and may not become release authority.
 return result(holds.length?'HOLD_EVIDENCE_REQUIREMENTS':'REVIEW_CANDIDATE_BOUNDARY_ONLY',
  holds,{targetWindowsPath:target,headCommit:actualCandidateSha,
   requiresSeparateAuthenticatedReviewerAttestation:true});
}
module.exports={evaluateDestination,normalizeWindows};
