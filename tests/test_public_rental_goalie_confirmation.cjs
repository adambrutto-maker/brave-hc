'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../widgets');
const pub=JSON.parse(fs.readFileSync(path.join(root,'game-centre-lineup-public.json'),'utf8'));
const js=fs.readFileSync(path.join(root,'game-centre-next.js'),'utf8');
const sel=vm.runInNewContext('('+js.slice(js.indexOf('function publicWorkingEntry('),js.indexOf('let lineupLoadVersion=')).trim()+')',{
 allowedPdfPath:p=>/^\.\/assets\/lineups\/[\w-]+\.pdf$/.test(p)
});
const e=pub.publishedWorkingCard;
const fix={id:e.fixtureId,opponent:e.opponent,gameDate:e.gameDate,puckDropUTC:e.puckDropUTC,rolloverAtUTC:e.expiresAt};
const now=Date.parse(e.publishedAt)+1000;
const check=(item={},model={})=>sel({...pub,publishedWorkingCard:{...e,...item},...model},fix,now);

test('manager-confirmed Stephen Logue is game-bound but lineup remains preliminary',()=>{
 assert.equal(e.fixtureId,3375685);
 assert.equal(e.gameDate,'2026-11-15');
 assert.equal(e.opponent,'Sugo Sundays');
 assert.equal(e.goalieConfirmed,true);
 assert.equal(e.managerConfirmedGoalie.name,'Stephen Logue');
 assert.equal(e.managerConfirmedGoalie.number,'70');
 assert.equal(e.managerConfirmedGoalie.source,'MANAGER_DIRECT_CONFIRMATION');
 assert.equal(e.managerConfirmedGoalie.status,'CONFIRMED_FOR_FIXTURE');
 assert.equal(e.managerConfirmedGoalie.fixtureId,3375685);
 assert.equal(e.rentalGoalie,null);
 assert.equal(e.managerLineupStatus,'PRELIMINARY_TEAM_LINEUP');
 assert.equal(e.managerFinalReplacementAuthorized,false);
 assert.equal(e.unconfirmedNamesMarked,true);
 assert.equal(sel(pub,fix,now),e);
});

test('a missing, mismatched or unverified manager-confirmed goalie fails closed',()=>{
 assert.equal(check({managerConfirmedGoalie:null}),null);
 for(const patch of [
  {source:'UNVERIFIED'},{status:'AVAILABLE_NOT_CONFIRMED'},{name:''},{name:'B'},
  {number:'?'},{fixtureId:999},{gameDate:'2026-11-22'},
  {puckDropUTC:'2026-11-23T01:00:00Z'},{confirmedAtUTC:'invalid'},
  {confirmedAtUTC:new Date(Date.parse(e.publishedAt)+1000).toISOString()}
 ]){
   assert.equal(check({managerConfirmedGoalie:{...e.managerConfirmedGoalie,...patch}}),null,JSON.stringify(patch));
 }
 assert.equal(check({unconfirmedNamesMarked:false}),null);
 assert.equal(check({goalieConfirmed:null}),null);
 assert.equal(check({goalieConfirmed:false}),null);
 assert.equal(check({goalieConfirmed:false,managerConfirmedGoalie:null}).goalieConfirmed,false);
});

test('legacy GoalieUp rental game-bound release remains valid and strictly verified',()=>{
 const rental={
  source:'GOALIEUP_CONFIRMATION_EMAIL',status:'RENTAL_CONFIRMED',name:'Test Rental Goalie',number:'0',
  fixtureId:e.fixtureId,gameDate:e.gameDate,puckDropUTC:e.puckDropUTC,confirmedAtUTC:e.publishedAt
 };
 assert.ok(check({rentalGoalie:rental,managerConfirmedGoalie:null}));
 assert.equal(check({rentalGoalie:{...rental,source:'WHATSAPP_POLL'},managerConfirmedGoalie:null}),null);
 assert.equal(check({rentalGoalie:{...rental,number:'70'},managerConfirmedGoalie:null}),null);
 assert.equal(check({rentalGoalie:rental,managerConfirmedGoalie:e.managerConfirmedGoalie}),null);
});

test('preliminary card never implies final approval and expires on fixture rollover',()=>{
 assert.equal(pub.approved,null);
 assert.equal(pub.status,'BLANK_PENDING_APPROVAL');
 assert.equal(pub.weeklyAutoPublishEnabled,false);
 assert.equal(pub.privateWhatsAppPollDataPublished,false);
 assert.equal(e.state,'PUBLIC_WORKING_LINEUP');
 assert.equal(e.authorizedForPublic,true);
 assert.equal(check({}, {approved:{fake:true}}),null);
 assert.equal(sel(pub,fix,Date.parse(e.expiresAt)),null);
 assert.equal(sel(pub,{...fix,id:fix.id+1},now),null);
 for(const key of ['attendanceSnapshot','fullTimers','callupsConfirmed','confirmedSkaters']){
  assert.equal(Object.hasOwn(e,key),false);
 }
});

test('public manifest contains no private WhatsApp poll or email payload',()=>{
 assert.equal(Object.hasOwn(pub,'attendanceSnapshot'),false);
 const raw=fs.readFileSync(path.join(root,'game-centre-lineup-public.json'),'utf8');
 for(const term of ['adam.brutto@gmail.com','goalieup.com/upcoming','voterJid','voterPhone','privateChatId'])
  assert.equal(raw.includes(term),false);
});
