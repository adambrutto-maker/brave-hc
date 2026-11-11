'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {classify,parse,runCLI}=require('../scripts/hockeyos_publisher_shadow_health');

const LOCAL='5753979f1547094fbe229f643af5c0b0360bbc6a';
const REMOTE='43dcf0f86dcf30ef02952d93998ad92c2c021a5f';
const ORIGIN='https://github.com/adambrutto-maker/brave-hc.git';
const DIGEST='f'.repeat(64);
function controller(noChange=true){
 return {started:'2026-10-20T11:31:00Z',finished:'2026-10-20T11:31:27Z',
  allStagesSuccessful:true,stages:{
   read_hto:{outcome:'PASS'},
   reconcile_game_boxes:{outcome:'PASS'},
   countdown:{outcome:'PASS',stdoutTail:noChange?'COUNTDOWN_SCHEDULE_UNCHANGED ageHours 7.0':'COUNTDOWN_SCHEDULE_PUBLISHED'},
   projections:{outcome:'PASS',stdoutTail:'HTO_MODEL_NO_CHANGE {"hourAge":7.0}'}
  }
 };
}
function evidence(){
 return {localSha:LOCAL,remoteSha:REMOTE,expectedLocalSha:LOCAL,
  expectedRemoteSha:REMOTE,clean:true,origin:ORIGIN,
  controller:controller(),taskExitCode:0,controllerSha256:DIGEST};
}
test('actual 07:31 task EXIT=0 still yields historical Git divergence not recovered',()=>{
 const result=classify(evidence());
 assert.equal(result.status,'PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED');
 assert.equal(result.collectorHealthy,true);
 assert.equal(result.hourlyTaskReportedSuccessful,true);
 assert.equal(result.countdownLocallyUnchanged,true);
 assert.equal(result.projectionLocallyUnchanged,true);
 assert.equal(result.websitePublicationVerified,false);
 assert.equal(result.writeAuthorized,false);
});
test('remote SHA moves: stop until new reviewer-approved Git ancestry pair',()=>{
 const result=classify({...evidence(),remoteSha:'9'.repeat(40)});
 assert.equal(result.status,'PUBLISHER_RECOVERY_HOLD');
 assert.equal(result.reason,'REVIEWED_COMMIT_PAIR_CHANGED');
 assert.equal(result.publisherRepaired,false);
});
test('active local SHA moves: do not blindly accept a new local history',()=>{
 const result=classify({...evidence(),localSha:'9'.repeat(40)});
 assert.equal(result.reason,'REVIEWED_COMMIT_PAIR_CHANGED');
});
test('missing controller SHA, dirty publisher, invalid origin, bad SHA all hold',()=>{
 assert.equal(classify({...evidence(),controllerSha256:null}).reason,'MISSING_CONTROLLER_EVIDENCE_HASH');
 assert.equal(classify({...evidence(),clean:false}).reason,'ACTIVE_PUBLISHER_DIRTY');
 assert.equal(classify({...evidence(),origin:'https://example.com/test.git'}).reason,'UNEXPECTED_PUBLISHER_ORIGIN');
 assert.equal(classify({...evidence(),remoteSha:'unverified'}).reason,'UNVERIFIED_COMMIT_IDENTITY');
});
test('even equal Git SHA is NOT remote website publication proof',()=>{
 const r=classify({...evidence(),localSha:REMOTE,expectedLocalSha:REMOTE});
 assert.equal(r.reason,'CANDIDATE_GIT_PAIR_ALIGNED_REQUIRES_INDEPENDENT_PUBLICATION_PROOF');
 assert.equal(r.publisherRepaired,false);
});
test('operator must give exact expected SHA pair, task exit and separated report path',()=>{
 assert.throws(()=>parse(['--task-exit','0']),/Missing mandatory option/);
 const args=['--publisher','/pub','--controller','/record.json',
  '--expected-local',LOCAL,'--expected-remote',REMOTE,
  '--task-exit','0','--receipt','/safe/receipt.json'];
 assert.equal(parse(args)['--task-exit'],'0');
 assert.throws(()=>parse([...args,'--unexpected','x']),/Unexpected option/);
 assert.throws(()=>parse([...args.slice(0,9),'foo',...args.slice(10)]));
});
test('safe local shadow runner uses read-only Git commands and refuses overwrite',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hockeyos-shadow-fixture-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const pub=path.join(tmp,'publisher'),safe=path.join(tmp,'audit');
 fs.mkdirSync(path.join(pub,'.git'),{recursive:true});
 fs.mkdirSync(safe);
 const control=path.join(tmp,'last.json'),out=path.join(safe,'shadow.json');
 fs.writeFileSync(control,JSON.stringify(controller()));
 const saved=cp.execFileSync,seen=[];
 cp.execFileSync=(binary,args)=>{
  assert.equal(binary,'git');
  seen.push(args);
  if(args.includes('rev-parse'))return LOCAL+'\n';
  if(args.includes('status'))return '';
  if(args.includes('get-url'))return ORIGIN+'\n';
  if(args.includes('ls-remote'))return REMOTE+'\trefs/heads/main\n';
  throw Error('Unexpected Git verb in shadow monitor');
 };
 t.after(()=>{cp.execFileSync=saved});
 const args=['--publisher',pub,'--controller',control,'--expected-local',LOCAL,
  '--expected-remote',REMOTE,'--task-exit','0','--receipt',out];
 assert.equal(runCLI(args),0);
 const audit=JSON.parse(fs.readFileSync(out,'utf8'));
 assert.equal(audit.status,'PUBLISHER_HISTORY_DIVERGED_NOT_REPAIRED');
 assert.equal(audit.noGitWriteCommands,true);
 assert.ok(seen.length===4);
 assert.equal(fs.readdirSync(path.join(pub,'.git')).length,0);
 assert.throws(()=>runCLI(args),/exists/);
});
test('report path inside active publisher is explicitly blocked before Git calls',t=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hockeyos-shadow-path-'));
 t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 const pub=path.join(tmp,'pub');
 fs.mkdirSync(path.join(pub,'.git'),{recursive:true});
 const controllerPath=path.join(tmp,'controller.json');
 fs.writeFileSync(controllerPath,JSON.stringify(controller()));
 const args=['--publisher',pub,'--controller',controllerPath,
 '--expected-local',LOCAL,'--expected-remote',REMOTE,
 '--task-exit','0','--receipt',path.join(pub,'unauthorized.json')];
 assert.throws(()=>runCLI(args),/overlaps the active publisher/);
 assert.equal(fs.existsSync(path.join(pub,'unauthorized.json')),false);
});
