'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),career=require('../widgets/player-career-insights.json');
const ct={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('content-type',ct[path.extname(file)]||'text/plain');res.end(b)});
});
const format=()=>{
 const game={id:900001,gameDate:'2099-10-31',puckDropUTC:'2099-11-01T01:15:00Z',
  rolloverAtUTC:'2099-11-01T02:15:00Z',opponent:'Synthetic QA Opponent',
  rink:'Synthetic Rink',eventURL:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&gameID=900001'};
 const countdown={schema:'brave-hc-upcoming-countdown/v1',team:'Brave H.C.',games:[game]};
 const cells={},choices=Object.keys(career.players).filter(id=>id!=='354060'&&id!=='354055').slice(0,13);
 const order=['C7','D7','E7','C8','D8','E8','C9','D9','E9','C12','D12','C13','D13','C14','D14','D16'];
 let index=0;
 for(const cell of order){
  if(cell==='D9'){cells[cell]='-';continue;}
  const playerId=cell==='D8'?'354060':cell==='D16'?'354055':choices[index++];
  const name=career.players[playerId].name;
  cells[cell]={playerId,name,jersey:'#'+(index+1)};
 }
 const approved={
  schema:'hockeyos-game-night-lineup-public/v1',status:'MANAGER_APPROVED_PUBLIC_LINEUP',
  fixture:{id:game.id,gameDate:game.gameDate,opponent:game.opponent,puckDropUTC:game.puckDropUTC},
  publication:{managerApproved:true,authorizedForPublic:true,approvedAt:'2026-10-28T18:00:00.000Z',
   approvalId:'SYNTHETIC_PROPOSED_MANAGER_QA_001',evidenceFingerprint:'SYNTHETIC_QA_EVIDENCE_SHA_NOT_REAL_001',
   outboundMessagesSent:0},
  evidence:{sourceVerified:true,identitiesReconciled:true,currentGameVersion:true,
   goalieBookingVerified:true,sourceHeldReason:null,excelOVRParityVerified:false},
  template:{sheet:'Lines',cardRange:'G5:J16',
   masterWorkbookSHA256:'0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154',
   originalExcelRenderAccepted:true,sourcePlayerBindingsVerified:true},
  cells,averages:{}
 };
 return {countdown,approved};
};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const problems=[];
 try{
  const {countdown,approved}=format();
  const p=await browser.newPage({viewport:{width:390,height:950}});
  p.on('pageerror',e=>problems.push(e.message));
  let current={schema:'hockeyos-game-night-lineup-public/v1',status:'AWAITING_MANAGER_APPROVAL'};
  await p.route('**/countdown.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(countdown)}));
  await p.route('**/game-night-lineup-public.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(current)}));
  const url='http://127.0.0.1:'+server.address().port+'/widgets/player-bio.html?playerID=354060&embed=1';
  await p.goto(url);
  await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
  await p.click('#bioTabs button[data-bio-view="coaching"]');
  assert.equal(await p.locator('#bioApprovedGameAssignment').isVisible(),false);
  assert.match(await p.locator('#bioCoachSource').innerText(),/not the player’s current/i);
  current=approved;
  await p.reload();
  await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
  await p.click('#bioTabs button[data-bio-view="coaching"]');
  assert.equal(await p.locator('#bioApprovedGameAssignment').isVisible(),true);
  assert.match(await p.locator('#bioApprovedGameRole').innerText(),/LINE 2 · C/);
  assert.match(await p.locator('#bioApprovedGameFixture').innerText(),/Synthetic QA Opponent/);
  assert.equal(await p.$eval('#bioPositionModes button[data-position="C"]',x=>x.getAttribute('aria-pressed')),'true');
  assert.doesNotMatch(await p.locator('#bioPositionResponse').innerText(),/Test Player|Synthetic QA Opponent|opposing winger/i);
  assert.match(await p.locator('#bioCoachSource').innerText(),/verified, manager-approved public lineup/i);
  assert.equal(await p.locator('#leadershipSection').isVisible(),false);
  current={schema:'hockeyos-game-night-lineup-public/v1',status:'AWAITING_MANAGER_APPROVAL'};
  await p.reload();await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
  await p.click('#bioTabs button[data-bio-view="coaching"]');
  assert.equal(await p.locator('#bioApprovedGameAssignment').isVisible(),false,'lineup approval withdrawal removes assignment');
  assert.deepEqual(problems,[]);
  console.log(JSON.stringify({status:'PASS',playerId:'354060',managerApprovedAssignment:'LINE 2 · C',
   dataSource:'SYNTHETIC_QA_ONLY',unapprovedHidden:true,withdrawalFailsClosed:true,
   publicPrivateSeparation:true,problems},null,2));
  await p.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>server.close());
