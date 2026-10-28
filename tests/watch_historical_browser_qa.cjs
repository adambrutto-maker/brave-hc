'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE || 'puppeteer-core');
const root=path.resolve(__dirname,'..');
const chromium=process.env.BRAVE_CHROME_BIN;
if(!chromium)throw Error('BRAVE_CHROME_BIN_REQUIRED');
const service=http.createServer((req,res)=>{
  const name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,''),full=path.resolve(root,name);
  if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  fs.readFile(full,(err,data)=>{
    if(err){res.writeHead(404);return res.end()}
    const ext=path.extname(full);
    res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png'})[ext]||'text/plain');
    res.end(data);
  });
});
async function wait(page,selector,expected){
  await page.waitForFunction((s,v)=>{
    const text=document.querySelector(s)?.textContent||'';
    return text.includes(v);
  },{timeout:9000},selector,expected);
}
(async()=>{
 await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+service.address().port+'/widgets/';
 const browser=await puppeteer.launch({headless:true,executablePath:chromium,args:['--no-sandbox','--disable-background-networking']});
 try{
  for(const width of [1280,358]){
   const page=await browser.newPage();await page.setViewport({width,height:800});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const r=await page.goto(base+'watch-v2.html',{waitUntil:'domcontentloaded'});
   assert.equal(r.status(),200);
   await wait(page,'#state','Historical only');
   const result=await page.evaluate(()=>({
     entries:[...document.querySelectorAll('#milestones article.entry')].map(x=>x.textContent),
     notice:document.getElementById('notice').textContent,
     streaks:document.getElementById('streaks').textContent,
     state:document.getElementById('state').textContent,
     width:document.documentElement.scrollWidth,viewport:innerWidth
   }));
   assert.equal(result.entries.length,2);
   assert.ok(result.entries.some(v=>v.includes('Michael Provenzano')&&v.includes('50 Point Club')));
   assert.ok(result.entries.some(v=>v.includes('Justin Carosi')&&v.includes('300 Game Club')));
   assert.match(result.notice,/workbook is not current/i);
   assert.match(result.streaks,/not certified/i);
   assert.ok(result.width<=result.viewport+4,JSON.stringify(result));
   assert.deepEqual(errors,[]);
   console.log('FULL_WATCH_HISTORY_QA_PASS',JSON.stringify({width,count:result.entries.length,errors}));
   await page.close();
  }
  const compact=await browser.newPage();await compact.setViewport({width:358,height:680});
  const compactErrors=[];compact.on('pageerror',e=>compactErrors.push(e.message));
  const cr=await compact.goto(base+'home-panels.html?panel=watch&embed=1',{waitUntil:'domcontentloaded'});
  assert.equal(cr.status(),200);
  await compact.waitForFunction(()=>document.getElementById('watch')?.hidden===false);
  const part=await compact.evaluate(()=>({
    heading:document.querySelector('#watch h1')?.textContent||'',
    note:document.querySelector('#watch .note')?.textContent||'',
    links:[...document.querySelectorAll('#watch a[href]')].map(x=>x.getAttribute('href')),
    width:document.documentElement.scrollWidth,viewport:innerWidth
  }));
  // Current milestone news is under Hot Stove, not the removed home Watch list.
  // The original dated Watch remains source-locked in its historical page.
  assert.match(part.heading,/Milestones in Hot Stove/);
  assert.match(part.note,/Career milestones and achievements now belong with the latest game stories/);
  assert(part.links.some(x=>x.includes('hot-stove.html')));
  assert(part.links.some(x=>x.includes('history.html?view=records')));
  assert.ok(part.width<=part.viewport+4,JSON.stringify(part));
  assert.deepEqual(compactErrors,[]);
  console.log('COMPACT_HOT_STOVE_MILESTONE_REDIRECT_PASS',JSON.stringify({heading:part.heading,width:part.width,errors:compactErrors}));
  await compact.close();
  const degraded=await browser.newPage();await degraded.setRequestInterception(true);
  degraded.on('request',req=>req.url().includes('history-records-legacy-558.json')?req.respond({status:404,body:'not available'}):req.continue());
  await degraded.goto(base+'watch-v2.html',{waitUntil:'domcontentloaded'});
  await wait(degraded,'#notice','Historical milestones withheld');
  assert.equal(await degraded.evaluate(()=>document.querySelectorAll('#milestones article.entry').length),0);
  console.log('NO_HTO_RECORDS_FAIL_CLOSED_PASS');
  await degraded.close();
 }finally{await browser.close()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>service.close());
