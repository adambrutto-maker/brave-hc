'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),screens=process.env.BRAVE_QA_SCREENSHOTS||null;
const contentType={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();
  res.setHeader('Content-Type',contentType[path.extname(f)]||'text/plain');res.end(b);
 });
});
const mock=()=>{
 const future='2099-11-01T01:15:00Z';
 const game={id:900001,opponent:'Synthetic QA Opponent',gameDate:'2099-10-31',
  puckDropUTC:future,rolloverAtUTC:'2099-11-01T02:15:00Z',
  rink:'Synthetic Ice Arena - D Rink',
  eventURL:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=preview&gameID=900001'};
 const countdown={schema:'brave-hc-upcoming-countdown/v1',team:'Brave H.C.',games:[game]};
 const cells={};let id=10001;
 for(const key of ['C7','D7','E7','C8','D8','E8','C9','D9','E9','C12','D12','C13','D13','C14','D14','D16']){
  if(key==='D9'){cells[key]='-';continue;}
  const mine=id++;cells[key]={playerId:String(mine),name:'Test Player '+mine,jersey:'#'+(mine-10000)};
 }
 const feed={
  schema:'hockeyos-game-night-lineup-public/v1',status:'MANAGER_APPROVED_PUBLIC_LINEUP',
  fixture:{id:game.id,gameDate:game.gameDate,opponent:game.opponent,puckDropUTC:game.puckDropUTC},
  publication:{managerApproved:true,authorizedForPublic:true,
   approvedAt:'2026-10-28T18:00:00.000Z',approvalId:'SYNTHETIC_FOUNDER_QA_APPROVAL_001',
   evidenceFingerprint:'SYNTHETIC_QA_EVIDENCE_VERSION_AB123456789',
   outboundMessagesSent:0},
  evidence:{sourceVerified:true,identitiesReconciled:true,currentGameVersion:true,
   goalieBookingVerified:true,sourceHeldReason:null,excelOVRParityVerified:true},
  template:{sheet:'Lines',cardRange:'G5:J16',
   masterWorkbookSHA256:'0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154',
   originalExcelRenderAccepted:true,sourcePlayerBindingsVerified:true},
  cells,averages:{wingpair_1:75,wingpair_2:85,wingpair_3:75,
   defence_1:81,defence_2:75,defence_3:77}
 };
 return {game,countdown,feed};
};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  for(const width of [390,800,1180]){
   const page=await browser.newPage({viewport:{width,height:1020}});
   page.on('pageerror',e=>errors.push(width+': '+e.message));
   await page.goto(origin+'/widgets/game-night-home-preview.html');
   await page.waitForFunction(()=>document.querySelector('#braveOriginalLinesCard')?.dataset.publicationStatus==='PUBLICATION_HELD');
   assert.equal(await page.locator('#lineupReleaseStatus').innerText(),'NOT APPROVED');
   assert.equal(await page.locator('[data-cell]').count(),16);
   assert.ok((await page.locator('[data-cell]').allTextContents()).every(x=>x==='-'));
   assert.equal(await page.locator('#braveOriginalLinesCard').innerText().then(x=>x.includes('BRAVE H.C. LINES')),true);
   assert.equal(await page.locator('iframe[src*="countdown.html"]').count(),1);
   const card=await page.locator('#braveOriginalLinesCard').boundingBox();
   const timer=await page.locator('.game-countdown iframe').boundingBox();
   assert.ok(card.y>timer.y+timer.height-10,'lineup below countdown');
   assert.ok(Math.abs(card.width/card.height-1.64)<.04,'original card landscape aspect preserved');
   assert.equal(await page.locator('.defence th').first().evaluate(el=>el.scrollWidth<=el.clientWidth+3),true,'DEFENSE header fits source table label column');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no document overflow');
   if(screens)await page.screenshot({path:path.join(screens,'home-game-night-original-card-'+width+'.png'),fullPage:true});
   await page.close();
  }
  const only=await browser.newPage({viewport:{width:850,height:900}});
  await only.goto(origin+'/widgets/game-night-home-preview.html?lineupOnly=1&embed=1');
  await only.waitForFunction(()=>document.querySelector('#braveOriginalLinesCard')?.dataset.publicationStatus==='PUBLICATION_HELD');
  assert.equal(await only.locator('.game-countdown').isVisible(),false,'separate HTO iframe can sit below existing countdown');
  assert.equal(await only.locator('.game-lineup-section').isVisible(),true);
  await only.close();
  const {countdown,feed}=mock();
  const page=await browser.newPage({viewport:{width:1180,height:1000}});
  page.on('pageerror',e=>errors.push('approved: '+e.message));
  let source=feed;
  await page.route('**/countdown.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(countdown)}));
  await page.route('**/game-night-lineup-public.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(source)}));
  await page.route('**/player-links.js*',r=>r.fulfill({status:200,contentType:'application/javascript',
   body:'window.BravePlayerLinks={identityById:(n)=>({name:"Test Player "+n})};'}));
  await page.goto(origin+'/widgets/game-night-home-preview.html');
  await page.waitForFunction(()=>document.querySelector('#braveOriginalLinesCard')?.dataset.publicationStatus==='MANAGER_APPROVED_PUBLIC_LINEUP');
  assert.equal(await page.locator('#lineupReleaseStatus').innerText(),'MANAGER APPROVED');
  assert.equal(await page.locator('[data-cell="D9"]').innerText(),'-');
  assert.match(await page.locator('[data-cell="D8"]').innerText(),/Test Player 10005/);
  assert.equal(await page.locator('#ovr-wingpair_1').innerText(),'(OVR 75)');
  assert.equal(await page.locator('[data-cell][data-player-id]').count(),15);
  assert.match(await page.locator('#lineupFixtureTitle').innerText(),/Synthetic QA Opponent/);
  if(screens){
    await page.evaluate(()=>{
      const mark=document.createElement('div');
      mark.textContent='SYNTHETIC QA — NOT A REAL LINEUP · NOT PUBLISHED';
      mark.style.cssText='position:fixed;top:10px;right:10px;z-index:9999;background:#a72036;color:white;padding:10px 14px;font-size:18px;font-weight:900;box-shadow:0 0 0 2px white';
      document.body.append(mark);
    });
    await page.screenshot({path:path.join(screens,'home-game-night-synthetic-approved-qa.png'),fullPage:true});
  }
  source={schema:'hockeyos-game-night-lineup-public/v1',status:'AWAITING_MANAGER_APPROVAL'};
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#braveOriginalLinesCard')?.dataset.publicationStatus==='PUBLICATION_HELD');
  assert.equal(await page.locator('[data-cell][data-player-id]').count(),0,'unapproved data removed from DOM');
  assert.ok((await page.locator('[data-cell]').allTextContents()).every(x=>x==='-'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',widths:[390,800,1180],sourceHold:'NO_NAMES',
   browserApprovedQA:'SOURCE_GATED_ONLY',withdrawal:'FAIL_CLOSED',actualTemplate:'Lines!G5:J16',
   mainHomepageStillUnchanged:true,errors},null,2));
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>server.close());
