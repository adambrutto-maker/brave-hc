'use strict';
/* Full 109-identity narrow Bio V3.1 preview acceptance: source and role separation.
   This cannot deploy or edit HTO, and uses only local, published repository assets. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const archive=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-career-insights.json'),'utf8'));
const identities=Object.entries(archive.players);
assert.equal(identities.length,109);
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);return res.end('Unavailable');}
 res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'text/plain');res.end(data);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 let passed=0,held=0,actual=0,roleless=0,goalie=0,skater=0;
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:320,height:820}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  for(const [id,profile] of identities){
   const response=await page.goto(origin+'/widgets/player-bio-v31-review.html?playerID='+id+'&embed=1',{waitUntil:'domcontentloaded',timeout:20000});
   assert.equal(response.status(),200,id+' returned HTTP failure');
   await page.locator('#bioTabs:not([hidden])').waitFor({timeout:15000});
   await page.waitForFunction(()=>{const x=document.getElementById('bioCurrentBadge');return x&&['ACTUAL','SOURCE HELD'].includes(x.textContent.trim());},{timeout:10000});
   const a=await page.evaluate(()=>({
    tabLabels:Array.from(document.querySelectorAll('#bioTabs [data-bio-view] .bio-tab-label')).map(x=>x.textContent.trim()),
    currentVisible:!document.getElementById('bioSeasonCurrent').hidden,
    historicVisible:!document.getElementById('bioSpotlight').hidden,
    coachingVisible:!document.getElementById('bioOpponentSection').hidden,
    currentBadge:document.getElementById('bioCurrentBadge').textContent.trim(),
    currentMetrics:document.querySelectorAll('#bioCurrentActuals .bio-outlook-stat').length,
    forecastValues:document.querySelectorAll('#bioProjectionCards .bio-metric').length,
    forecastVisible:!document.getElementById('bioProjectionSection').hidden,
    headerNameHidden:!document.getElementById('playerName').getClientRects().length,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    correctID:document.getElementById('playerChoice').value===new URLSearchParams(location.search).get('playerID'),
    sourceHeld:document.getElementById('bioCurrentBadge').getAttribute('data-held')==='true'
   }));
   assert.deepEqual(a.tabLabels,['Season Outlook','Career Trends','Coaching'],id);
   assert.ok(a.correctID&&a.headerNameHidden&&!a.overflow&&a.currentVisible&&!a.historicVisible&&!a.coachingVisible,id+' collection fault: '+JSON.stringify(a));
   if(a.currentBadge==='ACTUAL'){assert.equal(a.currentMetrics,5,id+' actual count');actual++;}
   else{assert.equal(a.currentMetrics,0,id+' held actual metrics must be empty');held++;}
   const roleKinds=(profile.segments||[]).map(s=>s.kind);
   if(!roleKinds.length){roleless++;assert.equal(a.forecastVisible,false,id+' no profile must not get forecast');}
   if(roleKinds.includes('goalie')&&!roleKinds.includes('skater')){goalie++;assert.equal(a.forecastVisible,false,id+' goalie forecast remains held');}
   if(roleKinds.includes('skater')){
     skater++;
     assert.equal(a.forecastVisible,true,id+' skater needs a visible forecast or held state');
     if(a.forecastValues===0){
       assert.equal(await page.locator('#bioProjectionHold').isVisible(),true,id+' no forecast tile');
       assert.equal(await page.locator('#bioForecastBadge').innerText(),'SOURCE HELD',id+' missing model source badge');
       assert.equal(await page.locator('#bioProjectionSummarySlot').isVisible(),false,id+' no invented trend');
     }else{
       assert.equal(a.forecastValues,5,id+' verified model fields');
       assert.equal(await page.locator('#bioProjectionHold').isVisible(),false,id+' valid model should not be held');
     }
   }
   await page.locator('[data-bio-view="trends"]').click();
   assert.equal(await page.locator('#bioDevelopmentSection').isVisible(),true,id+' career trends');
   await page.locator('[data-bio-view="coaching"]').click();
   assert.equal(await page.locator('#bioOpponentSection').isVisible(),true,id+' coaching');
   await page.locator('[data-bio-view="production"]').click();
   assert.equal(await page.locator('#bioSeasonCurrent').isVisible(),true,id+' outlook returns');
   passed++;
   if(passed%20===0)console.log('BIO_V31_SWEEP_PROGRESS',JSON.stringify({passed,total:109,actual,held,roleless,goalie,skater}));
  }
  assert.deepEqual(errors,[],'Browser page errors across all profiles');
  assert.equal(passed,109);
  console.log('BIO_V31_ALL_IDENTITIES_PASS',JSON.stringify({passed,actual,held,roleless,goalie,skater,errors:errors.length}));
  await page.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
