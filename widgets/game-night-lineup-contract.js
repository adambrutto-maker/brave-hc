/* Brave H.C. exact-lineage Game Night card — PUBLIC release gate.
 * Source visual: original Master Workbook Lines!G5:J16.
 * Source mapping: attendance_automation_v0_1/exact_workbook_lineup_template.py
 * PUBLIC browser never consumes unapproved WhatsApp named votes or private
 * manager drafts. No final starting line or goalie is inferred from an RSVP.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.BraveGameNightContract=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const WORKBOOK_SHA='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
 const GRID=Object.freeze([
  Object.freeze({id:'wingpair_1',label:'LINE 1',kind:'forward',cells:Object.freeze(['C7','D7','E7'])}),
  Object.freeze({id:'wingpair_2',label:'LINE 2',kind:'forward',cells:Object.freeze(['C8','D8','E8'])}),
  Object.freeze({id:'wingpair_3',label:'LINE 3',kind:'forward',cells:Object.freeze(['C9','D9','E9'])}),
  Object.freeze({id:'defence_1',label:'D PAIR 1',kind:'defence',cells:Object.freeze(['C12','D12'])}),
  Object.freeze({id:'defence_2',label:'D PAIR 2',kind:'defence',cells:Object.freeze(['C13','D13'])}),
  Object.freeze({id:'defence_3',label:'D PAIR 3',kind:'defence',cells:Object.freeze(['C14','D14'])}),
  Object.freeze({id:'goalie',label:'GOALTENDER',kind:'goalie',cells:Object.freeze(['D16'])})
 ]);
 const CELLS=Object.freeze([...new Set(GRID.flatMap(g=>g.cells))]);
 const dashed=Object.freeze(Object.fromEntries(CELLS.map(k=>[k,'-'])));
 const clean=s=>typeof s==='string'&&s.length<125&&s.trim()===s;
 const safeAt=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
 const sourceHold=(reason,game)=>Object.freeze({
  status:'PUBLICATION_HELD',reason,approved:false,fixture:game||null,
  sourceTemplate:'Lines!G5:J16',
  slots:dashed,averages:Object.freeze({}),
  managerApproved:false,publicNamedPollVotes:false
 });
 function currentFixture(countdown,atISO){
  if(countdown?.schema!=='brave-hc-upcoming-countdown/v1'||
     !Array.isArray(countdown.games)||countdown.team!=='Brave H.C.'||
     !countdown.games.length)return null;
  const at=Date.parse(atISO);
  if(!Number.isFinite(at))return null;
  return countdown.games.filter(g=>Number.isSafeInteger(g.id)&&
    typeof g.puckDropUTC==='string'&&typeof g.rolloverAtUTC==='string'&&
    Number.isFinite(Date.parse(g.puckDropUTC))&&Number.isFinite(Date.parse(g.rolloverAtUTC))&&
    Date.parse(g.rolloverAtUTC)-Date.parse(g.puckDropUTC)===3600000&&
    typeof g.opponent==='string'&&g.opponent.length>=3&&
    typeof g.gameDate==='string'&&/^\d{4}-\d\d-\d\d$/.test(g.gameDate)&&
    Date.parse(g.rolloverAtUTC)>at)
   .sort((a,b)=>a.puckDropUTC.localeCompare(b.puckDropUTC))[0]||null;
 }
 function confirm(feed,countdown,identityById,atISO){
  const game=currentFixture(countdown,atISO);
  if(!game)return sourceHold('COUNTDOWN_GAME_NOT_VERIFIED');
  if(feed?.schema!=='hockeyos-game-night-lineup-public/v1')
    return sourceHold('PUBLICATION_SOURCE_NOT_VERIFIED',game);
  if(feed.status!=='MANAGER_APPROVED_PUBLIC_LINEUP')
    return sourceHold(feed.status==='AWAITING_MANAGER_APPROVAL'?'AWAITING_MANAGER_APPROVAL':'PUBLICATION_NOT_AUTHORIZED',game);
  if(feed.publication?.authorizedForPublic!==true||
     feed.publication?.managerApproved!==true||
     feed.publication?.outboundMessagesSent!==0||
     !safeAt(feed.publication.approvedAt)||
     !clean(feed.publication.approvalId)||feed.publication.approvalId.length<15||
     !clean(feed.publication.evidenceFingerprint)||feed.publication.evidenceFingerprint.length<20)
    return sourceHold('MANAGER_PUBLIC_APPROVAL_NOT_VERIFIED',game);
  if(feed.evidence?.sourceVerified!==true||
     feed.evidence?.identitiesReconciled!==true||
     feed.evidence?.currentGameVersion===false||
     feed.evidence?.goalieBookingVerified!==true||
     feed.evidence?.sourceHeldReason!==null)
    return sourceHold('POLL_ROSTER_OR_GOALIE_SOURCE_NOT_VERIFIED',game);
  if(feed.template?.sheet!=='Lines'||feed.template?.cardRange!=='G5:J16'||
     feed.template?.masterWorkbookSHA256!==WORKBOOK_SHA||
     feed.template?.originalExcelRenderAccepted!==true||
     feed.template?.sourcePlayerBindingsVerified!==true)
    return sourceHold('ORIGINAL_WORKBOOK_TEMPLATE_NOT_VERIFIED',game);
  if(feed.fixture?.id!==game.id||feed.fixture.gameDate!==game.gameDate||
     feed.fixture.puckDropUTC!==game.puckDropUTC||
     feed.fixture.opponent!==game.opponent)
    return sourceHold('LINEUP_GAME_ID_OR_DATE_CONFLICT',game);
  const cells=feed.cells;
  if(!cells||Object.keys(cells).length!==CELLS.length||!CELLS.every(k=>Object.hasOwn(cells,k)))
    return sourceHold('EXACT_16_WORKBOOK_INPUT_CELLS_NOT_PRESENT',game);
  if(cells.D9!=='-')return sourceHold('THIRD_CENTRE_MUST_BE_DASH',game);
  if(typeof identityById!=='function')return sourceHold('OFFICIAL_HTO_PLAYER_IDS_UNAVAILABLE',game);
  let seen=new Set();let centers=0;let goalie=false;
  const slots={};
  for(const cell of CELLS){
    const x=cells[cell];
    if(x==='-'){slots[cell]='-';continue;}
    if(!x||typeof x!=='object'||!clean(x.name)||!/^[1-9]\d{4,10}$/.test(String(x.playerId||''))||
       !(/^#[1-9]\d{0,2}$/.test(x.jersey||'')||x.jersey===null))
      return sourceHold('INVALID_OR_UNVERIFIED_SLOT',game);
    const id=String(x.playerId),record=identityById(Number(id));
    if(!record||record.name!==x.name||seen.has(id))return sourceHold('PLAYER_IDENTITY_CONFLICT',game);
    seen.add(id);
    slots[cell]=Object.freeze({playerId:id,name:x.name,jersey:x.jersey||null});
    if(['D7','D8'].includes(cell))centers++;
    if(cell==='D16')goalie=true;
  }
  if(centers!==2||!goalie)return sourceHold('TWO_CENTRES_AND_BOOKED_GOALIE_REQUIRED',game);
  const av={};
  const expected=['wingpair_1','wingpair_2','wingpair_3','defence_1','defence_2','defence_3'];
  for(const k of expected){
    const value=feed.averages?.[k];
    av[k]=typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=100?
      String(value):'-';
    if(av[k]!=='-'&&feed.evidence.excelOVRParityVerified!==true)
      return sourceHold('LINEUP_OVR_NOT_WORKBOOK_VERIFIED',game);
  }
  const publishedAt=feed.publication.approvedAt;
  if(Date.parse(publishedAt)>Date.parse(atISO))return sourceHold('FUTURE_APPROVAL_TIMESTAMP',game);
  return Object.freeze({status:'MANAGER_APPROVED_PUBLIC_LINEUP',approved:true,fixture:game,
    slots:Object.freeze(slots),averages:Object.freeze(av),
    managerApproved:true,publicNamedPollVotes:false,approvedAt:publishedAt,
    approvalId:feed.publication.approvalId,
    evidenceFingerprint:feed.publication.evidenceFingerprint,
    sourceTemplate:'Lines!G5:J16'});
 }
 function assignmentForPlayer(result,playerId){
  if(result?.status!=='MANAGER_APPROVED_PUBLIC_LINEUP'||!result.approved)return null;
  const id=String(playerId);
  if(!/^[1-9]\d+$/.test(id))return null;
  const roleMap={C7:'LW',D7:'C',E7:'RW',C8:'LW',D8:'C',E8:'RW',C9:'LW',
    E9:'RW',C12:'LD',D12:'RD',C13:'LD',D13:'RD',C14:'LD',D14:'RD',D16:'G'};
  const hit=Object.entries(result.slots||{}).find(([,x])=>x&&x!=='-'&&x.playerId===id);
  if(!hit)return null;
  const [cell]=hit;
  const group=GRID.find(g=>g.cells.includes(cell));
  return Object.freeze({status:'MANAGER_APPROVED_PUBLIC_ASSIGNMENT',
    gameId:result.fixture.id,gameDate:result.fixture.gameDate,
    opponent:result.fixture.opponent,
    position:roleMap[cell],unit:group.label,cell,
    approvalId:result.approvalId,
    evidenceFingerprint:result.evidenceFingerprint,
    coachingInstructionPublished:false});
 }
 return {WORKBOOK_SHA,GRID,CELLS,dashed,currentFixture,confirm,assignmentForPlayer};
});
