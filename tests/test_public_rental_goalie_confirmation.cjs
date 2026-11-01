'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../widgets');
const pub=JSON.parse(fs.readFileSync(path.join(root,'game-centre-lineup-public.json'),'utf8'));
const js=fs.readFileSync(path.join(root,'game-centre-next.js'),'utf8');
const sel=vm.runInNewContext('('+js.slice(js.indexOf('function publicWorkingEntry('),js.indexOf('let lineupLoadVersion=')).trim()+')',{
 allowedPdfPath:p=>/^\.\/assets\/lineups\/[\w-]+\.pdf$/.test(p)
});
const e=pub.publishedWorkingCard;
const fix={id:e.fixtureId,opponent:e.opponent,gameDate:e.gameDate,puckDropUTC:e.puckDropUTC,rolloverAtUTC:e.expiresAt};
const now=Date.parse(e.publishedAt)+1000;
const check=(item,model={})=>sel({...pub,publishedWorkingCard:{...e,...item},...model},fix,now);
test('GoalieUp email-bound rental booking permits #0 only in same current working fixture',()=>{
 assert.equal(e.goalieConfirmed,true);
 assert.equal(e.rentalGoalie.name,'Brian Haspel');
 assert.equal(e.rentalGoalie.number,'0');
 assert.equal(e.rentalGoalie.status,'RENTAL_CONFIRMED');
 assert.equal(e.rentalGoalie.source,'GOALIEUP_CONFIRMATION_EMAIL');
 assert.equal(e.rentalGoalie.fixtureId,3375683);
 assert.equal(e.rentalGoalie.confirmedAtUTC,'2026-11-01T14:58:55Z');
 assert.equal(sel(pub,fix,now),e);
});
test('unverified goalie claim cannot release without exact provenance and fixture match',()=>{
 for(const value of [null,{}, {source:'WHATSAPP_POLL',status:'RENTAL_CONFIRMED',name:'Brian Haspel',number:'0',fixtureId:e.fixtureId,gameDate:e.gameDate,puckDropUTC:e.puckDropUTC,confirmedAtUTC:e.rentalGoalie.confirmedAtUTC}])
  assert.equal(check({rentalGoalie:value}),null);
 for(const patch of [
  {source:'UNVERIFIED'},{status:'AVAILABLE_NOT_CONFIRMED'},{name:''},{name:'B'},{number:'1'},{fixtureId:999},
  {gameDate:'2026-11-02'},{puckDropUTC:'2026-11-03T01:15:00Z'},{confirmedAtUTC:'invalid'},{confirmedAtUTC:'2026-11-04T00:00:00Z'}
 ]) assert.equal(check({rentalGoalie:{...e.rentalGoalie,...patch}}),null,JSON.stringify(patch));
 assert.equal(check({goalieConfirmed:null}),null);
 assert.equal(check({goalieConfirmed:false}),null);
 assert.equal(check({goalieConfirmed:false,rentalGoalie:null}).goalieConfirmed,false);
});
test('rental booking never implies official final manager or game sheet approval',()=>{
 assert.equal(pub.approved,null);
 assert.equal(pub.status,'BLANK_PENDING_APPROVAL');
 assert.equal(pub.weeklyAutoPublishEnabled,false);
 assert.equal(pub.privateWhatsAppPollDataPublished,false);
 assert.equal(e.state,'PUBLIC_WORKING_LINEUP');
 assert.equal(e.authorizedForPublic,true);
 assert.equal(check({}, {approved:{fake:true}}),null);
 assert.equal(sel(pub,fix,Date.parse(e.expiresAt)),null);
 assert.equal(sel(pub,{...fix,id:fix.id+1},now),null);
 assert.equal(e.totalSkaters,14);
 assert.equal(e.fullTimers,12);
 assert.equal(e.callupsConfirmed,2);
});
test('public manifest preserves seven-field anonymous attendance poll and no private email contents',()=>{
 const keys=Object.keys(pub.attendanceSnapshot).sort();
 assert.deepEqual(keys,['checkedAt','fixtureId','gameDate','opponent','partTimersAvailable','puckDropUTC','skatersIndicatingIn']);
 assert.equal(pub.attendanceSnapshot.skatersIndicatingIn,10);
 const raw=fs.readFileSync(path.join(root,'game-centre-lineup-public.json'),'utf8');
 for(const term of ['1a1979ee9d7e9153','adam.brutto@gmail.com','$40.00','goalieup.com/upcoming'])
  assert.equal(raw.includes(term),false);
});
