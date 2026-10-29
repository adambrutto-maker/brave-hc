'use strict';
/* Negative source tests: no made-up actuals, forecast, goalie rates or attendance. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(b)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 try{
  const badActuals=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-actuals-hourly.json'),'utf8'));
  badActuals.players.find(p=>p.name==='Carosi, Justin').gp=badActuals.teamGP+2;
  const cases=[
   {name:'ACTUAL_FEED_MISSING',route:'**/player-actuals-hourly.json',mode:'missing',actual:false,forecast:true},
   {name:'ACTUAL_GP_EXCEEDS_TEAM',route:'**/player-actuals-hourly.json',mode:'tampered',actual:false,forecast:true},
   {name:'FORECAST_MISSING',route:'**/projection.json',mode:'missing',actual:true,forecast:false}
  ];
  for(const c of cases){
   const page=await browser.newPage({viewport:{width:320,height:850}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await page.route(c.route,r=>c.mode==='missing'?r.fulfill({status:404,contentType:'text/plain',body:'Unavailable'}):
     r.fulfill({contentType:'application/json',body:JSON.stringify(badActuals)}));
   await page.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1',{waitUntil:'domcontentloaded'});
   await page.locator('#bioTabs:not([hidden])').waitFor({timeout:15000});
   await page.waitForTimeout(200);
   assert.equal(await page.locator('#bioCurrentBadge').innerText(),c.actual?'ACTUAL':'SOURCE HELD',c.name);
   assert.equal(await page.locator('#bioCurrentActuals .bio-outlook-stat').count(),c.actual?5:0,c.name);
   const model=page.locator('#bioProjectionCards .bio-metric');
   assert.equal(await model.count(),c.forecast?5:0,c.name);
   assert.equal(await page.locator('#bioProjectionHold').isVisible(),!c.forecast,c.name+' held tile');
   assert.equal(await page.locator('#bioProjectionSummarySlot').isVisible(),c.forecast,c.name+' no fabricated career arrow');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.deepEqual(errors,[],c.name);
   console.log('BIO_V31_SOURCE_HOLD_PASS',c.name);
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
