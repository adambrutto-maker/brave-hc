'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const timeline=require('../widgets/player-form-cross-season-v367.json');
const current=require('../widgets/player-form-appearances-v364.json');
const model=require('../widgets/player-bio-form-model-v364.js');
const players=[
 {id:'354060',name:'Justin Carosi',rate:0.9,seasons:['W2026/27','W2025/26'],level:'COLD'},
 {id:'738846',name:'Stephane Saindon',rate:1.2,seasons:['W2026/27','W2025/26'],level:'COOL'},
 {id:'356089',name:'Stefano Ardizzi',rate:0.9,seasons:['W2026/27','W2025/26','W2024/25']},
 {id:'769343',name:'Nolan Atkins',held:true}
];
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,content)=>{
  if(err){res.writeHead(404);return res.end('Not found')}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(content);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const successes=[],failures=[];
 try{
  for(const width of [320,390,625,1280]){
   for(const example of players){
    const page=await browser.newPage({viewport:{width,height:950}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    try{
     await page.goto(origin+'/widgets/player-bio.html?playerID='+example.id+'&embed=1',{waitUntil:'domcontentloaded',timeout:20000});
     await page.locator('#bioTabs button[data-bio-view="trends"]').click();
     await page.locator('#bioRecentFormGrid .bio-form-card').first().waitFor({timeout:14000});
     const data=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('#bioRecentFormGrid .bio-form-card')];
      const c=cards.map(el=>({
       title:el.querySelector('.bio-form-title')?.textContent,
       value:el.querySelector('.bio-form-value')?.textContent,
       source:el.dataset.sourceStatus,
       icon:el.querySelector('.v365-adaptive')?.dataset.visualLevel||null,
       cross:el.dataset.crossSeason,
       tooltip:el.title,
       note:el.querySelector('.bio-form-label:last-child')?.textContent
      }));
      return{c,status:document.querySelector('#bioRecentFormStatus')?.textContent,
       overflow:document.documentElement.scrollWidth>innerWidth+1,
       sourceVersion:[...document.scripts].some(s=>s.src.includes('player-bio-form-v364.js?v=3.6.7'))};
     });
     assert.equal(data.c.length,5);
     assert.match(data.status,/previous seasons and playoffs/);
     assert.equal(data.sourceVersion,true);
     assert.equal(data.overflow,false);
     const last10=data.c[4],last5=data.c[3];
     if(example.held){
      assert.equal(last10.source,'HELD');
      assert.equal(last10.icon,null);
      assert.equal(last10.cross,'false');
      assert.ok(Number.isNaN(Number(last10.value)));
     }else{
      const expected=model.getCrossSeasonWindow(timeline,current,example.id,10);
      assert.equal(expected.status,'VERIFIED');
      assert.equal(last10.source,'VERIFIED');
      assert.equal(last10.value,example.rate.toFixed(2));
      assert.equal(last10.cross,'true');
      assert.deepEqual(expected.sourceSeasons,example.seasons);
      assert.ok(last10.tooltip.includes(example.seasons.at(-1)));
      assert.ok(last10.tooltip.includes(expected.oldestDate));
      assert.ok(last10.tooltip.includes(expected.newestDate));
      assert.match(last10.note,/verified Brave H.C. appearances/);
      if(example.level)assert.equal(last10.icon,example.level);
      assert.equal(last5.source,'VERIFIED');
     }
     if(width===390&&example.id==='354060'&&process.env.BRAVE_ENG61_SHOTS)
      await page.screenshot({path:path.join(process.env.BRAVE_ENG61_SHOTS,'ENG61-cross-season-last10-390.png'),fullPage:true});
     assert.deepEqual(errors,[]);
     successes.push({width,id:example.id,name:example.name,last10:{value:last10.value,source:last10.source,icon:last10.icon}});
    }catch(e){failures.push({width,id:example.id,name:example.name,error:e.message});}
    finally{await page.close()}
   }
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 console.log('ENG61_CROSS_SEASON_V367_BROWSER',JSON.stringify({pass:successes.length,failures,examples:successes.filter(x=>x.width===390)}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
