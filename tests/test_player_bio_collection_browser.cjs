'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=require('../widgets/player-career-insights.json');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,body)=>{
  if(err)return res.writeHead(404).end();
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain');
  res.end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRAVE_CHROMIUM_PATH});
 const errors=[],checks=[],screens=process.env.BRAVE_QA_SCREENSHOTS;
 async function open(id,width=390){
  const page=await browser.newPage({viewport:{width,height:850}});
  page.on('pageerror',e=>errors.push(id+' : '+e.message));
  await page.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1');
  await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:14000});
  return page;
 }
 try{
  // Verify the same compact Trophy Room collection pattern on skater, goalie, and mixed-role profiles.
  for(const [id,kind,expectedNav] of [['354060','skater',4],['354055','goalie',4],['354057','mixed',5]]){
   const page=await open(id);
   const state=await page.evaluate(()=>({
      lab:document.querySelectorAll('#bioStudio').length,
      name:document.querySelector('#playerName').textContent,
      sourceVisible:document.querySelector('#sourceSection')!==null,
      navVisible:[...document.querySelectorAll('#bioTabs button[data-bio-view]:not([hidden])')].map(x=>x.textContent.trim()),
      mainContainer:getComputedStyle(document.querySelector('#bioStudio')).borderTopColor,
      oldStats:getComputedStyle(document.querySelector('#careerSection')).display,
      scroll:document.documentElement.scrollWidth>innerWidth+1,
      insightCount:document.querySelectorAll('#bioAdvancedGrid .bio-insight-tile').length
   }));
   assert.equal(state.lab,1);
   assert.equal(state.name,career.players[id].name);
   assert.equal(state.scroll,false,'no overflow '+id);
   assert.equal(state.oldStats,'none','no redundant stats table '+id);
   assert.equal(state.navVisible.length,expectedNav);
   assert.ok(state.insightCount>0,'analytics tiles '+id);
   assert.equal(state.sourceVisible,true);
   if(kind==='skater'){
     assert.equal(await page.$eval('#bioSpotlight',e=>e.hidden),false);
     assert.equal(await page.$eval('#bioOpponentSection',e=>e.hidden),true);
     assert.ok(await page.locator('#bioScoringMix .bio-split-track').count()===1);
     const bars=await page.locator('#bioComboChart rect').count();
     await page.click('#bioRateModes button[data-mode="winter"]');
     assert.equal(await page.locator('#bioComboChart rect').count(),bars);
     await page.click('#bioRateModes button[data-mode="summer"]');
     assert.equal(await page.locator('#bioComboChart rect').count(),bars);
     await page.click('#bioRateModes button[data-mode="actual"]');
     await page.click('#bioTabs button[data-bio-view="trends"]');
     assert.equal(await page.$eval('#bioDevelopmentSection',e=>e.hidden),false);
     assert.ok(await page.locator('#bioDevelopmentChart svg').count()>0,'qualified season trends');
     if(screens)await page.screenshot({path:path.join(screens,'bio-collection-v2-trends-390.png'),fullPage:true});
     await page.click('#bioTabs button[data-bio-view="coaching"]');
     assert.equal(await page.$eval('#bioOpponentSection',e=>e.hidden),false);
     assert.equal(await page.locator('#bioOpponentCards .bio-matchup:visible').count(),2);
     if(screens)await page.screenshot({path:path.join(screens,'bio-collection-v2-gameplan-390.png'),fullPage:true});
     await page.click('#bioOpponentMore');
     assert.equal(await page.locator('#bioOpponentCards .bio-matchup:visible').count(),4);
     assert.equal(await page.$eval('#bioTeamSystem',e=>e.open),false);
     await page.click('#bioTabs button[data-bio-view="all"]');
     assert.equal(await page.$eval('#bioSpotlight',e=>e.hidden),false);
     assert.equal(await page.$eval('#bioOpponentSection',e=>e.hidden),false);
   }
   if(kind==='mixed'){
     await page.click('#bioTabs button[data-bio-view="goaltending"]');
     assert.match(await page.locator('#bioAdvancedGrid').innerText(),/Winter-equivalent GA/i,'dual-role goalie indicators');
     await page.click('#bioTabs button[data-bio-view="production"]');
     assert.match(await page.locator('#bioAdvancedGrid').innerText(),/Winter-equivalent points/i,'dual-role skater indicators');
   }
   if(kind==='goalie'){
     assert.equal(await page.$eval('#bioSpotlight',e=>e.hidden),true);
     assert.equal(await page.$eval('#bioGoalieSection',e=>e.hidden),false);
     assert.equal(await page.locator('#bioGoalieCards .bio-metric').count(),2);
     assert.match(await page.textContent('#bioGoalieStatus'),/held/i);
     assert.ok(await page.locator('#bioGoalieTrend svg').count()>0);
     if(screens)await page.screenshot({path:path.join(screens,'bio-collection-v2-goalie-390.png'),fullPage:true});
     await page.click('#bioTabs button[data-bio-view="trends"]');
     assert.equal(await page.$eval('#bioDevelopmentSection',e=>e.hidden),false);
   }
   checks.push({id,kind,nav:state.navVisible.length,analytics:state.insightCount});
   await page.close();
  }
  // Visual and accessibility validation across supported embed widths.
  for(const width of [320,390,625,1280]){
   const p=await open('354060',width);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'width '+width);
   const buttons=await p.locator('#bioTabs button[data-bio-view]:visible').count();
   assert.equal(buttons,4);
   const top=await p.locator('#bioStudio').boundingBox(),header=await p.locator('#bioTabs').boundingBox();
   assert.ok(top&&header&&header.width>250);
   if(screens)await p.screenshot({path:path.join(screens,'bio-collection-v2-'+width+'.png'),fullPage:true});
   await p.close();
  }
  // Source-poor profile must fail closed, not display false zero-rate career analytics.
  const missing=await open('354043');
  assert.equal(await missing.locator('#bioAdvancedGrid .bio-inactive-note').count(),1);
  assert.ok(!/NaN|Infinity/.test(await missing.locator('#bioStudio').innerText()));
  await missing.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',profiles:checks,widths:[320,390,625,1280],errors,sourcePoorHeld:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>server.close());
