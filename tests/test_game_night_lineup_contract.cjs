'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const contract=require('../widgets/game-night-lineup-contract.js');
const source=require('../widgets/countdown.json');
const hidden=require('../widgets/game-night-lineup-public.json');
const now='2026-10-28T20:00:00.000Z',g=source.games[0];
const slots=()=>{
 let id=10001;return Object.fromEntries(contract.CELLS.map(k=>[k,k==='D9'?'-':{
  playerId:String(id++),name:'Test Player '+(id-1),jersey:'#'+(id-10000)
 }]));
};
const record=()=>({
 schema:'hockeyos-game-night-lineup-public/v1',
 status:'MANAGER_APPROVED_PUBLIC_LINEUP',
 fixture:{id:g.id,gameDate:g.gameDate,puckDropUTC:g.puckDropUTC,opponent:g.opponent},
 template:{sheet:'Lines',cardRange:'G5:J16',masterWorkbookSHA256:contract.WORKBOOK_SHA,
  originalExcelRenderAccepted:true,sourcePlayerBindingsVerified:true},
 publication:{managerApproved:true,authorizedForPublic:true,
  approvedAt:'2026-10-28T18:00:00.000Z',
  approvalId:'FOUNDERS_APPROVAL_QA_ONLY_001',evidenceFingerprint:'EXAMPLE_QA_EVIDENCE_FINGERPRINT_SHA_001',
  outboundMessagesSent:0},
 evidence:{sourceVerified:true,identitiesReconciled:true,currentGameVersion:true,
  goalieBookingVerified:true,sourceHeldReason:null,excelOVRParityVerified:false},
 cells:slots(),averages:{wingpair_1:null,wingpair_2:null,wingpair_3:null,
  defence_1:null,defence_2:null,defence_3:null}
});
const identity=id=>({name:'Test Player '+id});
test('Original Excel card mapping is exactly 16 authorized input cells and third centre dash',()=>{
 assert.equal(contract.GRID.length,7);assert.equal(contract.CELLS.length,16);
 assert.deepEqual(contract.CELLS,[
  'C7','D7','E7','C8','D8','E8','C9','D9','E9',
  'C12','D12','C13','D13','C14','D14','D16']);
 assert.equal(contract.dashed.D9,'-');
 assert.equal(contract.WORKBOOK_SHA,'0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154');
});
test('Home default is blank and no private named-vote or unapproved player data is in public JSON',()=>{
 assert.equal(hidden.status,'AWAITING_MANAGER_APPROVAL');
 assert.equal(Object.hasOwn(hidden,'cells'),false);
 assert.equal(Object.hasOwn(hidden,'players'),false);
 assert.equal(Object.hasOwn(hidden,'namedVotes'),false);
 assert.equal(Object.hasOwn(hidden,'nativePollIDs'),false);
 assert.equal(hidden.privacy.namedPollVotesPublished,false);
 const view=contract.confirm(hidden,source,identity,now);
 assert.equal(view.status,'PUBLICATION_HELD');
 assert.equal(view.approved,false);
 assert.ok(contract.CELLS.every(k=>view.slots[k]==='-'));
 assert.equal(view.managerApproved,false);assert.equal(view.publicNamedPollVotes,false);
});
test('Matches only next verified official HTO game, not a different game or stale card',()=>{
 assert.equal(contract.currentFixture(source,now).id,g.id);
 assert.equal(contract.currentFixture(source,'2026-11-02T02:16:00Z').id,source.games[1].id);
 const incorrect=record();incorrect.fixture.id=source.games[1].id;
 assert.equal(contract.confirm(incorrect,source,identity,now).reason,'LINEUP_GAME_ID_OR_DATE_CONFLICT');
 const old=record();
 assert.equal(contract.confirm(old,source,identity,'2026-11-02T02:16:00Z').status,'PUBLICATION_HELD');
});
test('No public lineup from attendance Yes, incomplete polls, unknown manager signoff or stale evidence',()=>{
 const variants=[
  {status:'PRIVATE_DRAFT_MANIFEST_READY'},
  {publication:{...record().publication,managerApproved:false}},
  {publication:{...record().publication,authorizedForPublic:false}},
  {publication:{...record().publication,approvalId:'X'}},
  {evidence:{...record().evidence,goalieBookingVerified:false}},
  {evidence:{...record().evidence,sourceHeldReason:'POLL_UNAUTHENTICATED'}},
  {evidence:{...record().evidence,currentGameVersion:false}},
  {template:{...record().template,originalExcelRenderAccepted:false}},
  {template:{...record().template,cardRange:'L33:AK53'}}
 ];
 for(const variant of variants){
  const input={...record(),...variant};
  const out=contract.confirm(input,source,identity,now);
  assert.equal(out.status,'PUBLICATION_HELD',JSON.stringify(variant));
  assert.ok(contract.CELLS.every(k=>out.slots[k]==='-'));
 }
});
test('Approved source-verified card can populate only approved manager assignments',()=>{
 const doc=record();
 const lookup=id=>({name:'Test Player '+id});
 const result=contract.confirm(doc,source,lookup,now);
 assert.equal(result.status,'MANAGER_APPROVED_PUBLIC_LINEUP');
 assert.equal(result.approved,true);
 assert.equal(result.slots.D9,'-');
 assert.equal(result.managerApproved,true);
 assert.equal(result.slots.C7.name,'Test Player 10001');
 assert.equal(result.averages.wingpair_1,'-');
 assert.equal(result.publicNamedPollVotes,false);
 const player=contract.assignmentForPlayer(result,doc.cells.D8.playerId);
 assert.equal(player.position,'C');
 assert.equal(player.unit,'LINE 2');
 assert.equal(player.gameId,g.id);
 assert.equal(player.coachingInstructionPublished,false);
 assert.equal(contract.assignmentForPlayer(result,'999999999'),null);
 assert.equal(contract.assignmentForPlayer(contract.confirm(hidden,source,lookup,now),'10001'),null);
});
test('A duplicate, invented third centre or mismatched source player is never rendered',()=>{
 const lookup=id=>({name:'Test Player '+id});
 const dup=record();dup.cells.D8=dup.cells.C7;
 assert.equal(contract.confirm(dup,source,lookup,now).reason,'PLAYER_IDENTITY_CONFLICT');
 const center=record();center.cells.D9={playerId:'99221',name:'Test Player 99221',jersey:'#89'};
 assert.equal(contract.confirm(center,source,lookup,now).reason,'THIRD_CENTRE_MUST_BE_DASH');
 const unknown=record();unknown.cells.D16.name='Invented Goalie';
 assert.equal(contract.confirm(unknown,source,lookup,now).reason,'PLAYER_IDENTITY_CONFLICT');
 const invalid=record();delete invalid.cells.D16;
 assert.equal(contract.confirm(invalid,source,lookup,now).reason,'EXACT_16_WORKBOOK_INPUT_CELLS_NOT_PRESENT');
});
test('Line OVR is unavailable unless exact workbook calculation is approved',()=>{
 const doc=record();doc.averages.wingpair_1=83;
 const out=contract.confirm(doc,source,id=>({name:'Test Player '+id}),now);
 assert.equal(out.status,'PUBLICATION_HELD');
 assert.equal(out.reason,'LINEUP_OVR_NOT_WORKBOOK_VERIFIED');
 const approved=record();approved.averages.wingpair_1=83;approved.evidence.excelOVRParityVerified=true;
 assert.equal(contract.confirm(approved,source,id=>({name:'Test Player '+id}),now).averages.wingpair_1,'83');
});
