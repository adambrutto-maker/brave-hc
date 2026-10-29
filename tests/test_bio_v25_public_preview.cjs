'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),career=require('../widgets/player-career-insights.json'),
model=require('../widgets/projection.json'),mimes={'.html':'text/html','.js':'text/javascript','.json':'application/json',
'.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,body)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',mimes[path.extname(f)]||'text/plain');res.end(body)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,
  headless:true,args:['--no-sandbox']});
 const errors=[],checks=[],assets=new Map();
 async function open(id,width){
  const page=await browser.newPage({viewport:{width,height:880}});
  page.on('pageerror',e=>errors.push(id+' JS '+e.message));
  page.on('response',r=>{
   if(r.url().startsWith(origin)&&r.status()>=400&&
      !(r.status()===404&&r.url().endsWith('/widgets/goalie-projection-verified-inputs.json')))
    errors.push(id+' HTTP '+r.status()+' '+r.url());
  });
  const resp=await page.goto(origin+'/widgets/player-bio-v25-preview.html?playerID='+id+'&embed=1',
   {waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(resp.status(),200,'preview route');
  await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:25000});
  return page;
 }
 try{
  const ids=Object.keys(career.players);
  assert.equal(ids.length,109);
  const page=await browser.newPage({viewport:{width:390,height:880}});
  page.on('pageerror',e=>errors.push('roster '+e.message));
  for(let i=0;i<ids.length;i++){
   const id=ids[i];
   await page.goto(origin+'/widgets/player-bio-v25-preview.html?playerID='+id+'&embed=1',{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:24000});
   assert.equal(await page.locator('#playerName').textContent(),career.players[id].name,'HTO identity '+id);
   assert.equal(await page.locator('#bioTabs button[data-bio-view]').count(),3,id+' three collections');
   if((i+1)%25===0)console.log('PREVIEW_109_PROFILE_PROGRESS',i+1);
  }
  await page.close();
  for(const [id,width] of [['354060',320],['354060',390],['354060',1280],
   ['354055',390],['525407',390]]){
   const p=await open(id,width);
   assert.equal(await p.locator('#bioPreviewBanner').isVisible(),true,'not the live Bio label');
   assert.equal(await p.locator('#playerName').textContent(),career.players[id].name);
   const tabs=(await p.locator('#bioTabs button .bio-tab-label').allTextContents()).map(x=>x.trim());
   assert.deepEqual(tabs,['Production','Trends','Coaching']);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' horizontal overflow '+width);
   const ga=await p.locator('#bioComboChart rect').count();
   if(id==='354060'){
    assert.ok(ga>=6,'Justin actual goals/assists bar history intact');
    const ticks=await p.locator('#bioComboChart [data-axis-tick="pts-per-game"]').allTextContents();
    assert.equal(ticks.length,5);
    assert.ok(ticks.every(x=>/^\d+\.\d{2}$/.test(x)),'Pts/GP right axis 2 decimal ticks');
    assert.equal(await p.locator('#bioAdvancedGrid .bio-insight-tile').count(),1,'no context-free peak tile');
    assert.doesNotMatch(await p.locator('#bioAdvancedGrid').innerText(),/Peak season/i);
    assert.ok(await p.locator('#bioComboChart [data-series="rolling-prior-career-average"]').count()>=1,
      'past-only career reference visible');
    await p.locator('#bioRateModes button[data-mode="winter"]').click();
    assert.equal(await p.locator('#bioComboChart rect').count(),ga,'raw G/A unchanged after normalize');
    await p.locator('#bioRateModes button[data-mode="actual"]').click();
    if((model.players||[]).some(x=>x.name==='Carosi, Justin')){
      assert.equal(await p.locator('#bioProjectionSummarySlot').isVisible(),true,'source qualified model preview');
      const full=p.locator('#bioProjectionFull');
      await full.locator('summary').click();
      const value=await p.locator('#bioProjectionCards .bio-metric').first().locator('.value').textContent();
      assert.match(value,/^\d+\.\d$/,'GP 1 decimal');
      await full.locator('summary').click();
      assert.equal(await full.evaluate(x=>x.open),false,'preview screenshot should use compact default');
    }
   }
   if(id==='354055'){
    assert.equal(await p.locator('#bioGoalieSection').isVisible(),true,'goalie role preserved');
    assert.match(await p.locator('#bioGoalieStatus').textContent(),/held/i);
   }
   if(id==='525407'){
    assert.equal(await p.locator('#playerName').textContent(),'Dylan Brennan');
    assert.ok(await p.locator('#bioTabs button').count()===3);
   }
   if(process.env.BRAVE_QA_SCREENSHOTS&&id==='354060'&&width===390)
    await p.screenshot({path:path.join(process.env.BRAVE_QA_SCREENSHOTS,'bio-v25-safe-public-preview.png'),fullPage:true});
   checks.push({id,name:career.players[id].name,width,status:'PASS'});
   await p.close();
  }
  assert.deepEqual(errors,[]);
  const base=fs.readFileSync(path.join(root,'widgets/player-bio.html'),'utf8');
  assert.ok(!base.includes('player-bio-v25-preview.css')&&!base.includes('bioPreviewBanner'),
    'production Bio HTML unchanged');
  const previews=fs.readFileSync(path.join(root,'widgets/player-bio-v25-preview.html'),'utf8');
  assert.match(previews,/noindex,nofollow/);
  assert.match(previews,/Design review preview/);
  assert.match(previews,/player-bio-premium-v25-preview\.js/);
  console.log(JSON.stringify({status:'PASS',identities:ids.length,preview:checks,
    scope:'ISOLATED_PUBLIC_DESIGN_PREVIEW_NO_HTO_EDITOR_OR_OFFICIAL_WIDGET_CHANGE',errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
