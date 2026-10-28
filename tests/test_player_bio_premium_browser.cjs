'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-career-insights.json')));
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,data)=>{if(err)return res.writeHead(404).end();
  const type={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.html':'text/html'};
  res.writeHead(200,{'Content-Type':type[path.extname(f)]||'text/plain'}).end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH,headless:true});
 const problems=[],ids=Object.keys(career.players),screens=process.env.BRAVE_QA_SCREENSHOTS;
 try{
   for(const [i,id] of ids.entries()){
    const page=await browser.newPage({viewport:{width:i%2?390:358,height:900},deviceScaleFactor:1});
    page.on('pageerror',err=>problems.push(id+': '+err.message));
    await page.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1');
    await page.waitForSelector('#profileContent:not([hidden])');
    await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),{timeout:10000}).catch(()=>{});
    const status=await page.evaluate(()=>({
     ready:document.body.classList.contains('bio-premium-ready'),
     name:document.querySelector('#playerName').textContent,
     overflow:document.documentElement.scrollWidth>innerWidth+1,
     bars:document.querySelectorAll('#bioComboChart rect').length,
     tabs:getComputedStyle(document.querySelector('#bioTabs')).display,
     legacy:getComputedStyle(document.querySelector('#careerSection')).display,
     projection:document.querySelector('#bioProjectionState').textContent,
     goalie:document.querySelector('#bioGoalieStatus').textContent,
     opponent:document.querySelector('#bioOpponentCards').children.length,
     chartShown:!document.querySelector('#bioSpotlight').hidden,
     goalieShown:!document.querySelector('#bioGoalieSection').hidden
    }));
    assert.ok(status.ready,'not ready '+id);
    assert.equal(status.name,career.players[id].name,id+' identity');
    assert.equal(status.overflow,false,id+' overflow');
    assert.equal(status.legacy,'none','duplicate stats '+id);
    assert.notEqual(status.tabs,'none','tabs missing '+id);
    if(id==='354060'||id==='354054') {
      assert.ok(status.chartShown);
      assert.ok(status.opponent>=1);
      assert.match(status.projection,/Provisional|model|projection/i);
    }
    if(id==='354055') {
      assert.ok(status.goalieShown);
      assert.equal(status.chartShown,false,'goalies must not see empty skater chart');
      assert.match(status.goalie,/held|experimental/i);
    }
    if(screens&&['354054','354055','354060'].includes(id)){
      await page.screenshot({path:path.join(screens,'bio-premium-'+id+'.png'),fullPage:true});
    }
    await page.close();
   }
   // Compare actual vs winter adjusted line, preserving historical bars.
   const page=await browser.newPage({viewport:{width:390,height:840}});
   await page.goto(origin+'/widgets/player-bio.html?playerID=354054&embed=1');
   await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
   const bars=await page.locator('#bioComboChart rect').count();
   await page.click('button[data-mode="winter"]');
   assert.equal(await page.locator('#bioComboChart rect').count(),bars);
   assert.match(await page.textContent('#bioRateStatus'),/verified game-duration equivalents/i);
   assert.ok((await page.locator('#bioComboChart circle').count())>0,'winter-adjusted trend visible');
   if(screens)await page.screenshot({path:path.join(screens,'bio-adjusted-winter-354054.png'),fullPage:true});
   await page.click('button[data-mode="summer"]');
   assert.match(await page.textContent('#bioRateStatus'),/verified game-duration equivalents/i);
   if(screens)await page.screenshot({path:path.join(screens,'bio-adjusted-summer-354054.png'),fullPage:true});
   assert.equal(await page.locator('#bioComboChart rect').count(),bars);
   await page.click('button[data-bio-view="coaching"]');
   assert.equal(await page.$eval('#systemSection',e=>e.hidden),false);
   assert.equal(await page.$eval('#bioSpotlight',e=>e.hidden),true);
   await page.close();
   for(const width of [320,625,1280]){
     const desktop=await browser.newPage({viewport:{width,height:950}});
     desktop.on('pageerror',err=>problems.push('responsive '+width+': '+err.message));
     await desktop.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1');
     await desktop.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
     assert.equal(await desktop.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+width);
     assert.equal(await desktop.$eval('#bioSpotlight',e=>e.hidden),false);
     assert.ok(await desktop.locator('#bioComboChart svg').count()>=1);
     if(screens&&width===1280)await desktop.screenshot({path:path.join(screens,'bio-premium-desktop-354060.png'),fullPage:true});
     await desktop.close();
   }
   // A manually staged goalie file cannot bypass independent source parity and release gates.
   const forged=await browser.newPage({viewport:{width:390,height:820}});
   const forgedData={schema:'hockeyos-verified-goalie-projection-inputs/v1',season:'W2026/27',
     players:{'354055':{sourceVerified:true,currentSourceVerified:true,seasonGames:24,teamGamesPlayed:5,
       current:{gp:2,w:1,l:1,t:0,ga:7},history:[{gp:12,w:6,l:6,t:0,ga:40,teamGames:24}]}}};
   await forged.route('**/goalie-projection-verified-inputs.json',r=>r.fulfill({status:200,
      contentType:'application/json',body:JSON.stringify(forgedData)}));
   await forged.goto(origin+'/widgets/player-bio.html?playerID=354055&embed=1');
   await forged.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'));
   assert.match(await forged.textContent('#bioGoalieStatus'),/held/i);
   assert.equal(await forged.locator('#bioGoalieCards .bio-metric').count(),5);
   await forged.close();
   assert.deepEqual(problems,[]);
   console.log(JSON.stringify({status:'PASS',playerProfiles:ids.length,issues:problems,formats:['Actual','Winter equivalent','Summer equivalent'],screenshots:!!screens},null,2));
 }finally{await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;}).finally(()=>server.close());
