'use strict';

/**
 * HockeyOS hourly publisher — READ-ONLY, independent shadow check.
 *
 * Refuses a false green task. The caller supplies an approved exact pair
 * of local/remote commits and an independently verified task exit. This
 * command uses only Git metadata reads (rev-parse, status, remote get-url,
 * ls-remote). It never fetches, commits, merges, pushes, resets, alters the
 * hourly scheduler, contacts HTO, or touches the Master Workbook.
 *
 * Audit receipts may be written ONLY to a separate, existing folder.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const {auditTaskPublisher} = require('./hockeyos_publisher_task_health');

const SHA=/^[a-f0-9]{40}$/i;
const EXPECTED_ORIGIN='https://github.com/adambrutto-maker/brave-hc.git';
function safeInside(child,parent){
 return child===parent||child.startsWith(parent+path.sep);
}
function sha(data){
 return crypto.createHash('sha256').update(data).digest('hex');
}
function hold(reason,proof={}){
 return {schema:'hockeyos-publisher-shadow-health/v1',
  status:'PUBLISHER_RECOVERY_HOLD',reason,...proof,
  publisherRepaired:false,publicationVerified:false,
  originalWorkbookModified:false,schedulerModified:false,
  writeAuthorized:false};
}
function classify({localSha,remoteSha,expectedLocalSha,expectedRemoteSha,
  origin,clean,controller,taskExitCode,controllerSha256}={}){
 if(!SHA.test(localSha||'')||!SHA.test(remoteSha||'')
    ||!SHA.test(expectedLocalSha||'')||!SHA.test(expectedRemoteSha||''))
  return hold('UNVERIFIED_COMMIT_IDENTITY');
 if(origin!==EXPECTED_ORIGIN)return hold('UNEXPECTED_PUBLISHER_ORIGIN');
 if(clean!==true)return hold('ACTIVE_PUBLISHER_DIRTY');
 if(localSha!==expectedLocalSha||remoteSha!==expectedRemoteSha)
  return hold('REVIEWED_COMMIT_PAIR_CHANGED',{
   localSha,remoteSha,expectedLocalSha,expectedRemoteSha});
 if(localSha===remoteSha)
  return hold('CANDIDATE_GIT_PAIR_ALIGNED_REQUIRES_INDEPENDENT_PUBLICATION_PROOF',
   {localSha,remoteSha});
 if(typeof controllerSha256!=='string'||!/^[a-f0-9]{64}$/i.test(controllerSha256))
  return hold('MISSING_CONTROLLER_EVIDENCE_HASH');
 const result=auditTaskPublisher({
  controller,taskExitCode,localSha,remoteSha,
  localIsAncestorOfRemote:false,remoteIsAncestorOfLocal:false
 });
 return {
  schema:'hockeyos-publisher-shadow-health/v1',
  status:result.status,controllerSha256,
  localSha,remoteSha,taskExitCode,
  collectorHealthy:result.flags.readHtoPass&&result.flags.gameReconciliationPass,
  hourlyTaskReportedSuccessful:result.flags.taskSuccess,
  countdownLocallyUnchanged:result.flags.countdownLocalNoChange,
  projectionLocallyUnchanged:result.flags.projectionLocalNoChange,
  websitePublicationVerified:false,
  publisherRepaired:false,originalWorkbookModified:false,
  schedulerModified:false,writeAuthorized:false,
  reviewerRequired:true,
  diagnostics:result.issues,
  note:'A success exit code or unchanged widget is not proof of a repaired divergent Git publisher.'
 };
}
function parse(args){
 const options={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i],value=args[i+1];
  if(!key?.startsWith('--')||value===undefined||options[key])
   throw Error('Unknown, duplicate or incomplete option');
  options[key]=value;
 }
 const required=['--publisher','--controller','--expected-local',
  '--expected-remote','--task-exit','--receipt'];
 if(required.some(k=>!options[k]))throw Error('Missing mandatory option');
 if(Object.keys(options).some(k=>!required.includes(k)))throw Error('Unexpected option');
 if(!/^\d{1,3}$/.test(options['--task-exit']))
  throw Error('Task exit must be explicitly verified integer');
 return options;
}
function git(repo,...args){
 const result=cp.execFileSync('git',['-C',repo,...args],{
  encoding:'utf8',timeout:10000,
  env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'}
 });
 return result.trim();
}
function runCLI(argv){
 const options=parse(argv);
 const publisher=path.resolve(options['--publisher']);
 const controllerPath=path.resolve(options['--controller']);
 const receiptPath=path.resolve(options['--receipt']);
 if(!fs.statSync(publisher).isDirectory()||!fs.existsSync(path.join(publisher,'.git')))
  throw Error('No authorized publisher checkout');
 if(!fs.statSync(controllerPath).isFile())
  throw Error('Missing controller receipt');
 if(fs.existsSync(receiptPath))
  throw Error('Audit receipt exists; refuse overwrite');
 if(!fs.statSync(path.dirname(receiptPath)).isDirectory())
  throw Error('Audit destination folder absent');
 if(safeInside(receiptPath,publisher)||
    safeInside(publisher,receiptPath)||
    receiptPath===controllerPath)
  throw Error('Audit output overlaps the active publisher or evidence');
 if(!SHA.test(options['--expected-local'])||!SHA.test(options['--expected-remote']))
  throw Error('Commit identity not approved');
 const raw=fs.readFileSync(controllerPath);
 const controller=JSON.parse(raw.toString('utf8'));
 const localSha=git(publisher,'rev-parse','HEAD');
 const clean=git(publisher,'status','--porcelain')==='';
 const origin=git(publisher,'remote','get-url','origin');
 let remoteSha='invalid';
 if(origin===EXPECTED_ORIGIN)
  remoteSha=git(publisher,'-c','credential.interactive=never',
    'ls-remote','origin','refs/heads/main').split(/\s+/)[0];
 const report=classify({
  localSha,remoteSha,
  expectedLocalSha:options['--expected-local'],
  expectedRemoteSha:options['--expected-remote'],
  clean,origin,controller,
  taskExitCode:Number(options['--task-exit']),
  controllerSha256:sha(raw)
 });
 const receipt={
  ...report,
  observedAt:new Date().toISOString(),
  controllerFile:controllerPath,
  publisherGitDirectory:publisher,
  taskExitSource:'OPERATOR_VERIFIED_TASK_SCHEDULER_EXIT_NOT_INFERRED',
  noGitWriteCommands:true,noHTOFetch:true,
  noPublishingActions:true
 };
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8',flag:'wx'});
 process.stdout.write(JSON.stringify({
  status:receipt.status,reason:receipt.reason||null,
  collectorHealthy:receipt.collectorHealthy||false,
  hourlyTaskReportedSuccessful:receipt.hourlyTaskReportedSuccessful||false,
  publisherRepaired:false,
  receipt:receiptPath
 })+'\n');
 return receipt.status==='PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED'?0:2;
}
if(require.main===module){
 try{process.exitCode=runCLI(process.argv.slice(2));}
 catch(err){process.stderr.write('PUBLISHER_SHADOW_HOLD '+String(err.message).slice(0,220)+'\n');process.exitCode=2;}
}
module.exports={classify,parse,runCLI};
