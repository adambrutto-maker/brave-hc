'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE||'puppeteer');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const key=decodeURIComponent((req.url||'').split('?')[0]).replace(/^\/+/,'');
 const fn=path.resolve(root,key);
 if(!fn.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(fn,(err,body)=>{
  if(err){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.html':'text/html','.png':'image/png'})[path.extname(fn)]||'text/plain');
  res.end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port+'/widgets/player-highlights.html?playerID=';
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [id,name] of [[354054,'Adam Brutto'],[354060,'Justin Carosi'],[776208,'Dev Leong']]){
   for(const width of [355,580]){
    const page=await browser.newPage(),errors=[];
    await page.setViewport({width,height:1350});
    page.on('pageerror',e=>errors.push(e.message));
    const resp=await page.goto(base+id,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Existing career achievements'),{timeout:12000});
    const result=await page.evaluate(()=>{
     const body=document.body,heading=document.querySelector('#playerName'),meta=document.querySelector('#playerSub'),icons=[...document.querySelectorAll('.ph-symbol')].map(x=>x.textContent);
     return {
      h:body.scrollHeight,viewport:innerHeight,w:document.documentElement.scrollWidth,screen:innerWidth,
      name:heading.textContent,titleLinks:heading.querySelectorAll('a').length,
      subtitle:meta.textContent,
      seasonAboveLegacy:document.querySelector('section[aria-label="Current-season statistics"]').compareDocumentPosition(document.querySelector('section[aria-label="Recorded career highlights"]')) & Node.DOCUMENT_POSITION_FOLLOWING,
      icons,stats:document.querySelector('#form').innerText.slice(0,260),
      mojibake:/[Ââð�]/.test(body.innerText),
      shows:document.querySelectorAll('#legacy .ph-event').length
     };
    });
    assert.equal(resp.status(),200);assert.equal(result.name,name);assert.equal(result.titleLinks,0);
    assert.ok(result.seasonAboveLegacy,'Current form must precede highlights');
    assert.equal(result.mojibake,false,'Mojibake remained in rendered text');
    assert.ok(result.subtitle.includes('·'));
    assert.equal(result.w<=result.screen+4,true,'Horizontal overflow');
    assert.ok(result.h<=1350,'Scrollbar in initial recommended iframe '+id+' / '+width+': '+result.h);
    if(id===354054)assert.deepEqual(result.icons.slice(0,4),['AWD','CLUB','CLUB','CAP']);
    if(id===354060)assert.equal(result.icons[0],'CLUB');
    if(id===354054 || id===354060){
      await page.click('#expand');
      const expanded=await page.evaluate(()=>({
        count:document.querySelectorAll('#legacy .ph-event').length,
        cups:[...document.querySelectorAll('#legacy .ph-event.ph-champion .ph-symbol')].map(x=>x.textContent)
      }));
      assert.equal(expanded.count,id===354054?16:25);
      assert.equal(expanded.cups.length,id===354054?3:2);
      assert.ok(expanded.cups.every(x=>x==='CUP'));
    }
    assert.deepEqual(errors,[]);
    console.log('PROFILE_DISPLAY_V2_PASS',JSON.stringify({id,width,height:result.h,icons:result.icons.slice(0,7),stats:result.stats,errors}));
    await page.close();
   }
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
