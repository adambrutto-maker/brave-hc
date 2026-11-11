'use strict';

/**
 * Read-only publisher health classification. The Windows scheduler reports
 * whether an orchestration process exited 0. It does NOT prove that
 * GitHub Pages received new JSON or that a divergent local history healed.
 *
 * Pure function: cannot read local tasks, Git, remote HTO or write anything.
 */
const SHA=/^[a-f0-9]{40}$/i;
const STAGES=['read_hto','reconcile_game_boxes','countdown','projections'];
function auditTaskPublisher({controller,taskExitCode,localSha,remoteSha,
  localIsAncestorOfRemote,remoteIsAncestorOfLocal}={}){
 const flags={readHtoPass:false,gameReconciliationPass:false,
   publisherGitAligned:false,taskSuccess:false,countdownPublished:false,
   projectionPublished:false,countdownLocalNoChange:false,
   projectionLocalNoChange:false};
 const issues=[];
 if(!SHA.test(localSha||'')||!SHA.test(remoteSha||''))
   issues.push('MISSING_OR_INVALID_PUBLISHER_COMMIT_SHA');
 if(!controller||typeof controller!=='object'||!controller.stages)
   issues.push('NO_CONTROLLER_STAGE_EVIDENCE');
 if(!Number.isInteger(taskExitCode))
   issues.push('TASK_EXIT_CODE_UNVERIFIED');
 if(typeof localIsAncestorOfRemote!=='boolean'||typeof remoteIsAncestorOfLocal!=='boolean')
   issues.push('GIT_ANCESTRY_NOT_VERIFIED');
 if(issues.length)return {
   status:'HEALTH_EVIDENCE_HOLD',
   issues,flags,
   healthGreen:false,websitePublicationVerified:false,
   workbookWriteAuthorized:false,publisherRepairAuthorized:false};
 for(const stage of STAGES){
  if(!controller.stages[stage]||typeof controller.stages[stage].outcome!=='string')
   issues.push('MISSING_CONTROLLER_STAGE_'+stage);
 }
 if(issues.length)return {
   status:'HEALTH_EVIDENCE_HOLD',issues,flags,healthGreen:false,
   websitePublicationVerified:false,workbookWriteAuthorized:false,publisherRepairAuthorized:false};
 flags.readHtoPass=controller.stages.read_hto.outcome==='PASS';
 flags.gameReconciliationPass=controller.stages.reconcile_game_boxes.outcome==='PASS';
 flags.taskSuccess=taskExitCode===0&&controller.allStagesSuccessful===true;
 flags.publisherGitAligned=localSha===remoteSha;
 const countdown=String(controller.stages.countdown.stdoutTail||'');
 const projection=String(controller.stages.projections.stdoutTail||'');
 flags.countdownLocalNoChange=controller.stages.countdown.outcome==='PASS'
   &&/COUNTDOWN_SCHEDULE_UNCHANGED/.test(countdown);
 flags.projectionLocalNoChange=controller.stages.projections.outcome==='PASS'
   &&/HTO_MODEL_NO_CHANGE/.test(projection);
 flags.countdownPublished=controller.stages.countdown.outcome==='PASS'
   &&/COUNTDOWN_SCHEDULE_PUBLISHED/.test(countdown);
 flags.projectionPublished=controller.stages.projections.outcome==='PASS'
   &&/HTO_MODEL_PUBLISHED/.test(projection);
 const diverged=!flags.publisherGitAligned
   &&!localIsAncestorOfRemote&&!remoteIsAncestorOfLocal;
 const remoteAhead=!flags.publisherGitAligned&&localIsAncestorOfRemote&&!remoteIsAncestorOfLocal;
 const localAhead=!flags.publisherGitAligned&&remoteIsAncestorOfLocal&&!localIsAncestorOfRemote;
 let status;
 if(diverged)status='PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED';
 else if(remoteAhead)status='PUBLISHER_REMOTE_AHEAD_NOT_REPAIRED';
 else if(localAhead)status='PUBLISHER_UNPUBLISHED_LOCAL_COMMITS';
 else if(!flags.taskSuccess)status='SCHEDULED_REFRESH_FAILED_OR_DEGRADED';
 else if(flags.publisherGitAligned)status='GIT_HEAD_ALIGNED_STAGE_RESULTS_ONLY';
 else status='PUBLISHER_GIT_RELATIONSHIP_UNVERIFIED';
 if(diverged)issues.push('TASK_EXIT_ZERO_CANNOT_CLEAR_GIT_DIVERGENCE');
 if(flags.countdownLocalNoChange||flags.projectionLocalNoChange)
  issues.push('LOCAL_NO_CHANGE_IS_NOT_WEBSITE_PUBLICATION');
 if(!flags.readHtoPass||!flags.gameReconciliationPass)
  issues.push('HTO_OR_GAME_EVIDENCE_FAILED');
 return {
  status,issues,flags,
  localSha,remoteSha,taskExitCode,
  controllerStarted:controller.started||null,
  controllerFinished:controller.finished||null,
  healthGreen:status==='GIT_HEAD_ALIGNED_STAGE_RESULTS_ONLY',
  websitePublicationVerified:false, // Always needs independent remote commit/site readback.
  originalAwardWorkbookRecalculated:false,
  workbookWriteAuthorized:false,
  publisherRepairAuthorized:false,
  explanation:'Scheduled process PASS and local NO_CHANGE do not prove website refresh or Git history repair.'
 };
}
module.exports={auditTaskPublisher};
