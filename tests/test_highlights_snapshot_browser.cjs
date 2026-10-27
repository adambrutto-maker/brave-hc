'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-career-insights.json')));
const feed=JSON.parse(fs.readFileSync(path.join(root,'widgets/awards-participants.json')));
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const errors=[];let visibleSnapshots=0;
 try{
  const page=await browser.newPage({viewport:{width:320,height:850}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  for(const [id,p] of Object.entries(career.players)){
   await page.goto(origin+'/widgets/player-highlights.html?playerID='+id);
   await page.locator('#profileSource a').waitFor();
   assert.equal(await page.textContent('#playerName'),p.name);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' overflow');
   assert.ok(!(await page.textContent('body')).includes('Current GAA'));
   if(await page.isVisible('#currentSection')){
    visibleSnapshots++;
    const date=new Date(feed.sourceReference.htoReadback).toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'});
    assert.equal(await page.textContent('#currentSection h2'),'Season snapshot · '+date);
    const link=page.locator('#currentSection a');
    assert.equal(new URL(await link.getAttribute('href'),origin+'/widgets/').searchParams.get('playerID'),id);
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.match(await page.textContent('#currentSection'),/separate historical snapshot/);
   }
  }
  assert.ok(visibleSnapshots>0);
  await page.goto(origin+'/widgets/player-highlights.html?playerID=849369');
  await page.locator('#profileSource a').waitFor();
  assert.match(await page.textContent('#form'),/Snapshot GAA/);
  const invalid=structuredClone(feed);invalid.sourceReference.htoReadback='invalid';
  await page.route('**/awards-participants.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(invalid)}));
  await page.goto(origin+'/widgets/player-highlights.html?playerID=354060');
  await page.locator('#profileSource a').waitFor();
  assert.equal(await page.isVisible('#currentSection'),false);
  assert.equal(await page.isVisible('#legacySection'),true);
  assert.ok(await page.locator('#legacy .ph-event').count()>0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',identities:Object.keys(career.players).length,visibleSnapshots,mobileWidth:320,invalidDateWithheld:true,legacyPreserved:true,pageErrors:errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
