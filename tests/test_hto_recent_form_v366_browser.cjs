'use strict';
// Separate browser acceptance for verified 3/5/10 HTO appearance gates.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const ledger=require('../widgets/player-form-appearances-v364.json');
const cross=require('../widgets/player-form-cross-season-v367.json');
const actuals=require('../widgets/player-actuals-hourly.json');
const model=require('../widgets/player-bio-form-model-v364.js');
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(f,(e,data)=>{
  if(e){res.writeHead(404);return res.end('not found')}
  res.setHeader('Content-Type',mime[path.extname(f)]||'text/plain');
  res.end(data);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const observed=[],failures=[];
 async function inspect(playerID,width,variant){
  const page=await browser.newPage({viewport:{width,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname.endsWith('/player-form-appearances-v364.json')){
    if(variant==='missing')return route.fulfill({status:404,body:'missing'});
    if(variant==='corrupt'){
     const bad=structuredClone(ledger);
     bad.players[playerID].games[0].pts+=1;
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bad)});
    }
   }
   if(url.pathname.endsWith('/player-form-cross-season-v367.json')){
    if(variant==='missing-cross')return route.fulfill({status:404,body:'missing'});
    if(variant==='corrupt-cross'){
     const bad=structuredClone(cross);bad.players[playerID].games[0].pts+=1;
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bad)});
    }
   }
   return route.continue();
  });
  try{
   await page.goto(origin+'/widgets/player-bio.html?playerID='+playerID+'&embed=1',{waitUntil:'domcontentloaded',timeout:18000});
   await page.locator('#bioTabs button[data-bio-view="trends"]').click();
   await page.locator('#bioRecentFormGrid .bio-form-card').first().waitFor({timeout:14000});
   const cards=await page.locator('#bioRecentFormGrid .bio-form-card').evaluateAll(list=>list.map(el=>({
    title:el.querySelector('.bio-form-title').textContent,
    value:el.querySelector('.bio-form-value').textContent,
    status:el.dataset.sourceStatus,
    badge:el.querySelector('.v365-adaptive')?.dataset.visualLevel||null,
    desc:el.querySelector('.bio-form-label:last-child')?.textContent
   })));
   assert.deepEqual(cards.map(x=>x.title),['CAREER','CURRENT SEASON','LAST 3 GAMES','LAST 5 GAMES','LAST 10 GAMES']);
   assert.equal(cards[0].status,'VERIFIED');
   assert.equal(cards[1].status,'VERIFIED');
   const native=ledger.players[playerID],official=actuals.players.find(x=>x.name===native.name);
   assert.ok(native&&official,'native source identity');
   for(const [i,n] of [3,5,10].entries()){
    const card=cards[i+2];
    const across=variant==='real'?
      model.getCrossSeasonWindow(cross,ledger,playerID,n):{status:'HELD'};
    const currentOnly=['real','missing-cross','corrupt-cross'].includes(variant)?
      model.getRecentWindow(ledger,playerID,ledger.season,official,n):{status:'HELD'};
    const expected=across.status==='VERIFIED'?across:currentOnly;
    assert.equal(card.status,expected.status,'Last '+n+' source-gate');
    if(expected.status==='VERIFIED'){
     assert.equal(card.value,expected.rate.toFixed(2));
     assert.ok(card.badge,'verified P/GP must use five-level icon');
    }else{
     assert.ok(Number.isNaN(Number(card.value)),'not-qualified P/GP must display unavailable');
     assert.equal(card.badge,null);
    }
   }
   assert.deepEqual(errors,[]);
   if(playerID==='354060'&&width===390&&variant==='real'&&process.env.BRAVE_ENG61_SHOTS)
     await page.screenshot({path:path.join(process.env.BRAVE_ENG61_SHOTS,'ENG61-verified-last3-last5-390.png'),fullPage:true});
   observed.push({playerID,width,variant,windows:cards.slice(2).map(x=>({label:x.title,status:x.status,value:x.value,badge:x.badge}))});
  }catch(err){failures.push({playerID,width,variant,error:err.message})}
  finally{await page.close()}
 }
 try{
  await inspect('354060',390,'real');
  await inspect('738846',390,'real');
  await inspect('354060',625,'real');
  await inspect('354060',390,'corrupt');
  await inspect('354060',390,'missing');
  await inspect('354060',390,'missing-cross');
  await inspect('354060',390,'corrupt-cross');
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 console.log('ENG61_V366_RECENT_HTO_BROWSER_QA',JSON.stringify({passed:observed.length,failures,examples:observed.filter(x=>x.width===390)}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
