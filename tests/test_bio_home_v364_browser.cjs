'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(b);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const results=[],failures=[];
 try{
 for(const width of [320,390,625,1280]){
  for(const [id,expected,original] of [['354060','NEUTRAL','Neutral'],['738846','COOL','Neutral']]){
   const page=await browser.newPage({viewport:{width,height:950}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   try{
    await page.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1',{waitUntil:'domcontentloaded'});
    await page.locator('#bioProjectionTrend .v36-badge').waitFor({timeout:15000});
    await page.locator('#bioRecentFormGrid .bio-form-card').first().waitFor({timeout:15000});
    const a=await page.evaluate(()=>{
     const section=document.querySelector('#bioProjectionSection');
     const blocks=[...section.children].map(e=>e.id||e.className);
     const trend=document.querySelector('#bioProjectionTrend');
     const badge=trend.querySelector('.v36-badge');
     const cards=[...document.querySelectorAll('#bioRecentFormGrid .bio-form-card')].map(e=>({
      title:e.querySelector('.bio-form-title').textContent,
      value:e.querySelector('.bio-form-value').textContent,
      held:e.dataset.sourceStatus==='HELD',
      icon:e.querySelector('.v36-badge')?.dataset.visualLevel||''
     }));
     const first=trend.querySelector('.bio-trend-main')?.textContent;
     const detail=document.querySelector('#bioProjectionTrendDetail').textContent;
     const info=document.querySelector('#bioRecentFormStatus').textContent;
     return {
      blocks,level:trend.dataset.visualLevel,workbook:trend.dataset.trendState,
      badgeLevel:badge.dataset.visualLevel,word:first,detail,cards,info,
      currentVisible:!document.querySelector('#bioSeasonCurrent').hidden,
      overflow:document.documentElement.scrollWidth>innerWidth+1
     };
    });
    assert.equal(a.blocks[0],'bio-projection-hero');
    assert.equal(a.blocks[1],'bioCareerModelStrip');
    assert.equal(a.blocks[2],'bioProjectionSummarySlot');
    assert.equal(a.level,expected);
    assert.equal(a.badgeLevel,expected);
    assert.equal(a.workbook,original,'workbook category is not rewritten');
    assert.ok(a.word.startsWith(expected+' · '),'display copy agrees with icon');
    assert.match(a.detail,/Original workbook category:/);
    assert.equal(a.cards.length,5,'career, current, last 3/5/10');
    assert.equal(a.cards[0].title,'CAREER');
    assert.equal(a.cards[0].held,false,'published historical career baseline shown');
    assert.equal(a.cards[1].title,'CURRENT SEASON');
    assert.equal(a.cards[1].held,false,'actual HTO season rate shown');
    assert.deepEqual(a.cards.slice(2).map(c=>c.title),['LAST 3 GAMES','LAST 5 GAMES','LAST 10 GAMES']);
    assert.ok(a.cards.slice(2).every(c=>c.value==='—'&&c.held),'no invented recent appearances or P/GP');
    assert.match(a.info,/source-verified/);
    assert.equal(a.overflow,false,'Bio horizontal overflow');
    assert.deepEqual(errors,[],'Bio runtime errors');
    if(width===390&&id==='738846'&&process.env.BRAVE_V364_SCREENSHOT_DIR)
     await page.screenshot({path:path.join(process.env.BRAVE_V364_SCREENSHOT_DIR,'bio-v364-stephane-390.png'),fullPage:true});
    results.push({width,surface:'bio',id,level:a.level,career:a.cards[0].value,current:a.cards[1].value});
   }catch(e){failures.push({width,id,surface:'bio',error:e.message});}
   finally{await page.close();}
  }
  const page=await browser.newPage({viewport:{width,height:940}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  try{
   await page.goto(origin+'/widgets/home-panels.html?panel=projection',{waitUntil:'domcontentloaded'});
   await page.locator('#projection-rows tr:not(.details)').first().waitFor({timeout:15000});
   await page.locator('#trend-legend .home-trend-key').first().waitFor({timeout:15000});
   const h=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('#projection-rows tr:not(.details)')];
    const find=name=>{
      const row=rows.find(r=>r.textContent.includes(name));
      const button=row?.querySelector('.trend-button');
      return {word:button?.querySelector('.home-level-word')?.textContent,
        icon:button?.querySelector('.v36-badge')?.dataset.visualLevel,
        source:button?.dataset.workbookCategory,button};
    };
    const stephane=find('Stephane Saindon');
    const alex=find('Alex Pagnotta');
    const legend=[...document.querySelectorAll('#trend-legend .home-trend-key')].map(n=>({
      word:n.textContent,icon:n.querySelector('.v36-badge')?.dataset.visualLevel
    }));
    const shell=document.querySelector('.shell'),table=document.querySelector('.projection-table');
    return {players:rows.length,stephane:{word:stephane.word,icon:stephane.icon,source:stephane.source},
      alex:{word:alex.word,icon:alex.icon,source:alex.source},legend,
      shellOverflow:shell.scrollWidth>shell.clientWidth+1,tableOverflow:table.scrollWidth>table.clientWidth+1,
      legacyArrows:document.querySelectorAll('.trend-svg').length};
   });
   assert.equal(h.players,22);
   assert.equal(h.stephane.word,'COOL');
   assert.equal(h.stephane.icon,'COOL');
   assert.equal(h.stephane.source,'Neutral');
   assert.equal(h.alex.word,'BLAZING');
   assert.deepEqual(h.legend.map(x=>x.word),['FROZEN','COLD','COOL','NEUTRAL','WARM','HOT','BLAZING']);
   assert.ok(h.legend.every(x=>x.word===x.icon),'legend and all 7 badges match');
   assert.equal(h.legacyArrows,0,'old home fixed arrows fully replaced');
   assert.equal(h.shellOverflow,false,'home shell overflow');
   assert.equal(h.tableOverflow,false,'home table overflow');
   assert.deepEqual(errors,[],'home script errors');
   if(width===390&&process.env.BRAVE_V364_SCREENSHOT_DIR)
    await page.screenshot({path:path.join(process.env.BRAVE_V364_SCREENSHOT_DIR,'home-v364-trend-390.png'),fullPage:true});
   results.push({width,surface:'home',stephane:h.stephane,alex:h.alex});
  }catch(e){failures.push({width,surface:'home',error:e.message});}
  finally{await page.close();}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 console.log('BIO_HOME_V364_QA',JSON.stringify({passed:results.length,failures,examples:results.filter(x=>x.width===390)}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
