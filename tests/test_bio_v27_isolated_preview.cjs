'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,body)=>{if(e)return res.writeHead(404).end();
 res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(body)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRAVE_CHROMIUM_PATH});
 const errors=[],missing=[],receipt=[];
 try{
  for(const [id,role] of [['354060','skater'],['354055','goalie'],['525407','historical']]){
   const page=await browser.newPage({viewport:{width:390,height:900}});
   page.on('pageerror',e=>errors.push(id+' '+e.message));
   page.on('response',r=>{if(/\.(?:js|css)(?:\?.*)?$/.test(r.url())&&r.status()>=400)missing.push({id,url:new URL(r.url()).pathname,status:r.status()})});
   const url='http://127.0.0.1:'+server.address().port+'/widgets/player-bio-v27-preview.html?playerID='+id+'&embed=1';
   const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(resp.status(),200);
   await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:25000});
   assert.equal(await page.locator('#bioV27ReviewBanner').isVisible(),true);
   assert.match(await page.locator('#bioV27ReviewBanner').innerText(),/REVIEW ONLY/);
   assert.equal(await page.locator('#bioTabs .bio-tab-label').count(),3);
   assert.equal(await page.locator('#bioApprovedGameAssignment').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(role==='skater'){
    assert.ok((await page.locator('[data-bar-label]').count())>0);
    assert.ok((await page.locator('[data-rate-label]').count())>0);
    assert.equal(await page.locator('#bioProjectionCards .bio-metric-icon').count(),5);
    await page.locator('#bioTabs button[data-bio-view="coaching"]').click();
    for(const pos of ['C','RW','LW','LD','RD'])assert.equal(await page.locator('#bioPositionModes button[data-position="'+pos+'"]').count(),1);
    await page.locator('#bioPositionModes button[data-position="RW"]').click();
    assert.match(await page.locator('#bioPositionResponse').innerText(),/Right Wing/);
   }
   if(role==='goalie'){
    await page.locator('#bioTabs button[data-bio-view="coaching"]').click();
    assert.equal(await page.locator('#bioPositionModes button[data-position="G"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#bioApprovedGameAssignment').isVisible(),false);
   }
   receipt.push({id,role,status:'PASS',lineup:'HELD',preview:true});
   await page.close();
  }
  const manifest=require('../widgets/game-night-lineup-public-v27-preview.json');
  assert.equal(manifest.status,'AWAITING_MANAGER_APPROVAL');
  assert.deepEqual(errors,[]);
  assert.deepEqual(missing,[]);
  console.log(JSON.stringify({status:'PASS',preview:'BIO_V27_ISOLATED',profiles:receipt,errors,missingAssets:missing},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
