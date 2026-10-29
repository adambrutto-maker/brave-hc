'use strict';
/* Bio V3.1 visual and source separation acceptance. Preview only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const archive=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-career-insights.json'),'utf8'));
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(f,(err,b)=>{if(err){res.writeHead(404);return res.end('Missing')}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'text/plain');
 res.end(b);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,
  headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390,625,1280]){
   for(const [id,kind] of [[354060,'skater'],[354055,'goalie']]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const url=origin+'/widgets/player-bio.html?embed=1&playerID='+id;
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.locator('#bioTabs:not([hidden])').waitFor({timeout:15000});
    await page.locator('#bioCurrentBadge').getByText(kind==='skater'?'ACTUAL':'SOURCE HELD').waitFor({timeout:12000});
    const labels=await page.locator('#bioTabs [data-bio-view] .bio-tab-label').allInnerTexts();
    assert.deepEqual(labels,['Season Outlook','Career Trends','Coaching']);
    assert.equal(await page.locator('#bioTabs [data-bio-view]').count(),3);
    assert.equal(await page.locator('#bioSeasonCurrent').isVisible(),true);
    assert.equal(await page.locator('#bioSpotlight').isVisible(),false,'Historic chart is not displayed under Season Outlook');
    assert.equal(await page.locator('#bioOpponentSection').isVisible(),false);
    assert.equal(await page.locator('.brave-outlook-title').innerText(),'Player Intelligence');
    assert.equal(await page.locator('#playerName').isVisible(),false,'Do not repeat native HTO player identity');
    assert.equal(await page.locator('.brave-outlook-header img').isVisible(),true);
    const current=await page.locator('#bioCurrentActuals .bio-outlook-stat').count();
    if(kind==='skater'){
     assert.equal(current,5);
     const vals=await page.locator('#bioCurrentActuals .bio-outlook-value').allInnerTexts();
     assert.deepEqual(vals,['5','4','1','5','1.00']);
     const model=await page.locator('#bioProjectionCards .value').allInnerTexts();
     assert.deepEqual(model,['23','13','11','24','1.06']);
     assert.equal(await page.locator('#bioCareerModelRate').innerText(),'1.14');
     assert.match(await page.locator('#bioCareerModelBasis').innerText(),/Summer \+ Winter history.*Winter-equivalent/);
     const order=await page.evaluate(()=>['bioSeasonCurrent','bioCareerModelStrip','bioProjectionCards','bioProjectionSummarySlot'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return {id,y:Math.round(r.top),bottom:Math.round(r.bottom)};
     }));
     for(let i=1;i<order.length;i++)assert.ok(order[i].y>=order[i-1].bottom-3,
      'Outlook order incorrect '+JSON.stringify(order));
     assert.equal(await page.locator('#bioForecastBadge').innerText(),'PROVISIONAL');
     assert.equal(await page.locator('#bioProjectionTrend').isVisible(),true);
     const arrow=await page.locator('#bioProjectionSummarySlot').evaluate(el=>el.classList.contains('bio-career-arrow-panel'));
     assert.equal(arrow,true,'Separate tinted trend interpretation panel');
    }else{
     assert.equal(current,0,'No invented goalie current-season metrics');
     assert.match(await page.locator('#bioCurrentStatus').innerText(),/pending.*goalie source/i);
     assert.equal(await page.locator('#bioProjectionSection').isVisible(),false);
    }
    await page.locator('[data-bio-view="trends"]').click();
    assert.equal(await page.locator('#bioSeasonCurrent').isVisible(),false);
    assert.equal(await page.locator('#bioDevelopmentSection').isVisible(),true);
    assert.equal(await page.locator('#bioSpotlight').isVisible(),kind==='skater');
    assert.equal(await page.locator('#bioGoalieSection').isVisible(),kind==='goalie');
    await page.locator('#bioExtendedAnalytics summary').click();
    await page.locator('#bioExtendedMetrics .bio-extended-stat').first().waitFor({timeout:10000});
    const ranks=await page.locator('#bioExtendedMetrics .bio-extended-rank').count();
    assert.ok(ranks>=1,'Qualified historical advanced rate has a rank chip');
    const rosterCareer=page.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Career roster-adjusted attendance'});
    assert.equal(await rosterCareer.count(),0,'Unreleased private attendance is a concise hold note, not a placeholder card');
    assert.equal(await page.locator('#bioAttendanceHold').isVisible(),true,'Source-held attendance never published');
    await page.locator('[data-bio-view="coaching"]').click();
    assert.equal(await page.locator('#bioOpponentSection').isVisible(),true);
    assert.equal(await page.locator('#bioTacticBoard [data-marker]').count(),8);
    assert.equal(await page.locator('#bioVideoPlaybook .playbook-card').count(),3);
    assert.equal(await page.locator('#bioVideoPlaybook iframe').count(),0);
    await page.locator('#bioTacticNext').click();await page.waitForTimeout(740);
    assert.equal(await page.locator('#bioTacticStep').innerText(),'STEP 2/4');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Responsive overflow '+width);
    assert.deepEqual(errors,[],'Browser JS page errors');
    console.log('BIO_V31_PASS',JSON.stringify({width,id,kind,tabs:3,sourceCorrect:true,ranks,inkBoard:8}));
    await page.close();
   }
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err);process.exitCode=1;});
