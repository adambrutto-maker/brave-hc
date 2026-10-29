'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=require('../widgets/player-career-insights.json');
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+u.pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,body)=>{if(e)return res.writeHead(404).end();
   res.setHeader('Content-Type',mime[path.extname(f)]||'text/plain');res.end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const errors=[],screens=process.env.BRAVE_QA_SCREENSHOTS;
 try{
  for(const [id,kind] of [['354060','skater'],['354055','goalie'],['354057','dual']]){
   const p=await browser.newPage({viewport:{width:390,height:920}});
   p.on('pageerror',e=>errors.push(id+': '+e.message));
   await p.goto(base+'/widgets/player-bio.html?playerID='+id+'&embed=1');
   await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:14000});
   assert.equal(await p.locator('#playerName').innerText(),career.players[id].name);
   assert.equal(await p.locator('#bioTabs .bio-tab-label').count(),3);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   if(kind!=='goalie'){
     await p.click('#bioTabs button[data-bio-view="trends"]');
     const chart=p.locator('#bioComboChart svg');
     assert.equal(await chart.count(),1,'source scoring graph');
     assert.equal(await p.locator('[data-bar-label="G"]').count()>0,true);
     assert.equal(await p.locator('[data-bar-label="A"]').count()>0,true);
     const labels=await p.locator('[data-rate-label]').allTextContents();
     assert.ok(labels.length>0&&labels.every(v=>/^\d+\.\d{2}$/.test(v)),
      'points-per-game labels present and at two decimals');
     const main=p.locator('[data-series="selected-points-per-game"]');
     assert.equal(await main.count(),1,'distinct main P/GP line');
     assert.equal(await main.getAttribute('stroke'),'#6de1ff','main P/GP line distinct from gold assists');
     assert.equal(await p.locator('#bioRateModes button[data-mode="actual"]').innerText(),'All · actual');
     await p.click('#bioOverlayModes');
     assert.equal(await p.$eval('#bioOverlayModes',e=>e.getAttribute('aria-pressed')),'true');
     assert.equal(await p.locator('#bioOverlayLegend .bio-overlay-key').count(),3);
     assert.equal(await p.locator('[data-series="comparison-points-per-game"]').count()>0,true);
     const oldBarCount=await p.locator('#bioComboChart rect').count();
     await p.click('#bioRateModes button[data-mode="winter"]');
     assert.equal(await p.locator('#bioComboChart rect').count(),oldBarCount);
     assert.equal(await p.locator('[data-series="selected-points-per-game"]').getAttribute('stroke'),'#54ead2');
     await p.click('#bioOverlayModes');
     await p.click('#bioRateModes button[data-mode="actual"]');
   }
   const cards=await p.locator('#bioProjectionCards .bio-metric-icon').count();
   if(id==='354060'){
     await p.click('#bioTabs button[data-bio-view="production"]');
     assert.equal(cards,5,'full-season forecast source cards preserved');
     assert.equal(await p.locator('#bioProjectionFull').evaluate(e=>e.open),false,'only source detail collapsed');
     assert.match(await p.locator('#bioProjectionHeadline').textContent(),/Full regular-season projection/);
     assert.match(await p.locator('.bio-forecast-kicker').innerText(),/FULL-SEASON ESTIMATE/);
     assert.match(await p.locator('#bioProjectionTrend').innerText(),/Projected season-finish trend vs career/);
     assert.equal(await p.locator('#bioProjectionCards .bio-stat-icon').count(),5);
     assert.equal(await p.locator('#bioProjectionCards .bio-metric-icon').first().locator('.value').innerText(),'23');
   }
   await p.click('#bioTabs button[data-bio-view="trends"]');
   if(kind!=='goalie'){
     assert.equal(await p.locator('#bioDevelopmentChart svg').count(),1);
     assert.ok(await p.locator('[data-trend-point-label]').count()>0);
     assert.ok(await p.locator('#bioDevelopmentGrid .bio-stat-icon').count()>=2);
   }
   await p.click('#bioTabs button[data-bio-view="coaching"]');
   assert.equal(await p.locator('#bioOpponentSection').isVisible(),true);
   assert.equal(await p.locator('#bioPositionModes button').count(),6);
   assert.equal(await p.locator('#bioOpponentCards .bio-matchup').count(),0,'no generic upcoming-opponent card');
   assert.equal(await p.locator('#leadershipSection').isVisible(),false,'leadership belongs in Milestones');
   if(kind==='goalie'){
     assert.equal(await p.$eval('#bioPositionModes button[data-position="G"]',e=>e.getAttribute('aria-pressed')),'true');
   }else{
     assert.match(await p.locator('#bioCoachSource').innerText(),/not the player’s current/);
     await p.click('#bioPositionModes button[data-position="C"]');
     assert.match(await p.locator('#bioPositionResponse').innerText(),/Center/);
     assert.match(await p.locator('#bioPositionResponse').innerText(),/middle lane/i);
   }
   assert.match(await p.locator('#bioCoachReviewScope').textContent(),/coach-approved/i);
   if(screens)await p.screenshot({path:path.join(screens,'bio-v27-'+kind+'-coaching.png'),fullPage:true});
   await p.click('#bioTabs button[data-bio-view="production"]');
   if(screens)await p.screenshot({path:path.join(screens,'bio-v27-'+kind+'-production.png'),fullPage:true});
   await p.close();
  }
  for(const width of [320,625,1280]){
    const p=await browser.newPage({viewport:{width,height:900}});
    p.on('pageerror',e=>errors.push('width '+width+': '+e.message));
    await p.goto(base+'/widgets/player-bio.html?playerID=354060&embed=1');
    await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'width '+width+' overflow');
    assert.equal(await p.locator('#bioProjectionCards .bio-metric-icon').count(),5);
    if(screens)await p.screenshot({path:path.join(screens,'bio-v27-'+width+'.png'),fullPage:true});
    await p.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',players:3,widths:[320,390,625,1280],
    chart:['actual G/A bar totals','source rate labels','blue/teal/violet P/GP overlay'],
    projection:'full five-card season-end visualization',coaching:'general positional system only',errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>server.close());
