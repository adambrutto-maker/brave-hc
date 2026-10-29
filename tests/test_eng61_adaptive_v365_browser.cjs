'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Blocked');}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(b);});
});
const proposal=require('../widgets/projection.json'),disp=require('../widgets/hockeyos-team-dispersion-v365.json');
const adapt=require('../widgets/hockeyos-adaptive-trend-v365.js');
const cases=[
 {id:'354060',name:'Carosi, Justin',display:'NEUTRAL',source:'Neutral'},
 {id:'738846',name:'Saindon, Stephane',display:'NEUTRAL',source:'Neutral'},
 {id:'354045',name:'Provenzano, Mario',display:'COOL',source:'Cool'},
 {id:'354058',name:'Pagnotta, Alex',display:'WARM',source:'Hot'}
];
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const results=[],failures=[];
 try{
  for(const width of [320,390,625,1280]){
   for(const x of cases){
    const page=await browser.newPage({viewport:{width,height:920}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
    try{
     await page.goto(base+'/widgets/player-bio.html?playerID='+x.id+'&embed=1',{waitUntil:'domcontentloaded',timeout:18000});
     await page.locator('#bioProjectionTrend .v365-adaptive').waitFor({timeout:17000});
     const b=await page.evaluate(()=>{
      const h=document.querySelector('#bioProjectionTrend');
      const e=h.querySelector('.v365-adaptive');
      const arrow=e.querySelector('.v36-arrow-shape');
      const m=arrow.getScreenCTM();
      const tip=new DOMPoint(50,29).matrixTransform(m);
      const ctr=new DOMPoint(50,50).matrixTransform(m);
      return{word:h.querySelector('.bio-trend-main').textContent,
       label:h.dataset.visualLevel,source:h.dataset.trendState,modelMode:e.dataset.adaptiveMode,
       pct:Number(e.dataset.percentage),angle:Number(e.dataset.deg),
       rotAngle:Number(e.querySelector('.v36-arrow-rotor').dataset.arrowAngle),
       tipDeltaX:tip.x-ctr.x,tipDeltaY:tip.y-ctr.y,
       panel:document.querySelector('#bioProjectionSummarySlot').dataset.panelTone,
       order:[...document.querySelector('#bioProjectionSection').children].map(n=>n.id||n.className),
       overflow:document.documentElement.scrollWidth>innerWidth+1};
     });
     const expected=adapt.classify(proposal.players.find(p=>p.name===x.name),proposal,disp);
     assert.equal(b.source,x.source);assert.equal(b.label,x.display);
     assert.ok(b.word.startsWith(x.display+' · '));
     assert.ok(Math.abs(b.angle-expected.angle)<1e-6);
     assert.ok(Math.abs(b.angle-b.rotAngle)<1e-8);
     assert.equal(b.modelMode,'HISTORICAL_REFERENCE_ONLY');
     assert.equal(b.panel,x.display.toLowerCase());
     assert.deepEqual(b.order.slice(0,3),['bio-projection-hero','bioCareerModelStrip','bioProjectionSummarySlot']);
     if(b.pct<0)assert.ok(b.tipDeltaY>1,'negative arrowhead must be below center');
     if(b.pct>0)assert.ok(b.tipDeltaY< -1,'positive arrowhead must be above center');
     assert.equal(b.overflow,false);
     assert.deepEqual(errors,[]);
     if(width===390&&x.id==='738846'&&process.env.BRAVE_ENG61_SHOTS)
      await page.screenshot({path:path.join(process.env.BRAVE_ENG61_SHOTS,'ENG61-bio-stephane-390.png'),fullPage:true});
     await page.locator('#bioTabs button[data-bio-view="trends"]').click();
     await page.locator('#bioTeamDispersion .team-dispersion-grid').waitFor({timeout:12000});
     await page.locator('#bioRecentFormGrid .bio-form-card').first().waitFor({timeout:12000});
     const trend=await page.evaluate(()=>{
      const ds=document.querySelector('#bioTeamDispersion');
      const cards=[...document.querySelectorAll('#bioRecentFormGrid .bio-form-card')].map(x=>({status:x.dataset.sourceStatus,value:x.querySelector('.bio-form-value').textContent}));
      return {dsStatus:ds.dataset.status,thresholds:ds.textContent,cardData:cards,
       currentVisible:!document.querySelector('#bioRecentFormSection').hidden};
     });
     assert.equal(trend.dsStatus,'HISTORICAL_REFERENCE_ONLY');
     assert.match(trend.thresholds,/Current model update held/);
     assert.equal(trend.cardData.length,5);
     assert.ok(trend.cardData.slice(2).every(c=>c.status==='HELD'&&Number.isNaN(Number(c.value))));
     assert.equal(trend.currentVisible,true);
     results.push({width,surface:'bio',name:x.name,word:b.label,angle:b.angle});
    }catch(e){failures.push({width,surface:'bio',id:x.id,reason:e.message});}
    finally{await page.close();}
   }
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   try{
    await page.goto(base+'/widgets/home-panels.html?panel=projection',{waitUntil:'domcontentloaded'});
    await page.locator('#trend-legend .home-trend-key').first().waitFor({timeout:15000});
    const h=await page.evaluate(()=>{
     const rows=[...document.querySelectorAll('#projection-rows tr:not(.details)')];
     const player=name=>{const r=rows.find(x=>x.textContent.includes(name));
      const b=r?.querySelector('.v365-adaptive');return {
       word:r?.querySelector('.home-level-word')?.textContent,
       level:b?.dataset.visualLevel,
       angle:b?.dataset.deg,
       source:r?.querySelector('.trend-button')?.dataset.workbookCategory};};
     const shell=document.querySelector('.shell');
     const table=document.querySelector('.projection-table');
     return{total:rows.length,legend:[...document.querySelectorAll('#trend-legend .home-trend-key')].map(x=>x.textContent),
      stephane:player('Stephane Saindon'),alex:player('Alex Pagnotta'),
      dsStatus:document.querySelector('#homeTeamDispersion').dataset.status,
      overflow:shell.scrollWidth>shell.clientWidth+1,
      tableOverflow:table.scrollWidth>table.clientWidth+1};
    });
    assert.equal(h.total,22);assert.deepEqual(h.legend,['COLD','COOL','NEUTRAL','WARM','HOT']);
    assert.equal(h.stephane.word,'NEUTRAL');assert.equal(h.stephane.source,'Neutral');
    assert.equal(h.alex.word,'WARM');assert.equal(h.alex.source,'Hot');
    assert.equal(h.dsStatus,'HISTORICAL_REFERENCE_ONLY');
    assert.equal(h.overflow,false);assert.equal(h.tableOverflow,false);
    assert.deepEqual(errors,[]);
    if(width===390&&process.env.BRAVE_ENG61_SHOTS)
     await page.screenshot({path:path.join(process.env.BRAVE_ENG61_SHOTS,'ENG61-home-390.png'),fullPage:true});
    results.push({width,surface:'home',stephane:h.stephane,alex:h.alex});
   }catch(e){failures.push({width,surface:'home',reason:e.message});}
   finally{await page.close();}
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 console.log('ENG61_ADAPTIVE_BROWSER_QA',JSON.stringify({passed:results.length,failures,examples:results.filter(x=>x.width===390)}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
