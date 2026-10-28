'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE || 'puppeteer');
const root=path.resolve(__dirname,'..');
// Approved HTO record baseline from 2026-10-20: fail on unreviewed source count changes.
const expect={records:460,awards:146};
const familySpec=JSON.parse(fs.readFileSync(path.join(root,'docs/261028_RCD05_Records_Stat_Family_Order_Spec.json'),'utf8'));
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,'');
 const full=path.resolve(root,name);
 if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(full,(err,b)=>{
  if(err){res.writeHead(404);return res.end()}
  const ext=path.extname(full);
  res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png'})[ext]||'text/plain');
  res.end(b);
 });
});
(async()=>{
 for(const type of Object.keys(expect)){
 const data=JSON.parse(fs.readFileSync(path.join(root,'widgets','history-'+type+'.json'),'utf8'));
 assert.equal(data.entryCount,expect[type]);
 assert.equal(data.groups.reduce((s,g)=>s+g.items.length,0),expect[type]);
 assert.ok(data.groups.every(g=>g.category&&g.items.length));
 }
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port+'/widgets/history.html';
 const browser=await puppeteer.launch({headless:true,
    ...(process.env.BRAVE_CHROME_BIN?{executablePath:process.env.BRAVE_CHROME_BIN}:{}),
    args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:358,height:760}]){
    const page=await browser.newPage();await page.setViewport(viewport);
    const errors=[];page.on('pageerror',x=>errors.push(x.message));
    const r=await page.goto(address+'?view=records',{waitUntil:'domcontentloaded'});
    assert.equal(r.status(),200);
    await page.waitForFunction(()=>document.getElementById('totalItems')?.textContent==='460');
    let v=await page.evaluate(()=>({
      entries:document.querySelectorAll('.history-group li').length,groups:document.querySelectorAll('.history-group').length,
      marked:[...document.querySelectorAll('a.brave-player-link')].filter(a=>a.textContent==='Mark Pastore').slice(0,1).map(a=>a.href),
      summer:[...document.querySelectorAll('li[data-hto-season="Summer_2015"] a.brave-player-link')].filter(a=>a.textContent==='Mark Pastore').map(a=>a.href),
      incorrectlyWinterScoped:document.querySelectorAll('li[data-hto-season^="Winter_"]').length,
      total:document.getElementById('totalItems').textContent,
      width:document.documentElement.scrollWidth,viewport:innerWidth,
      official:document.getElementById('official').href
    }));
    assert.equal(v.entries,460);assert.equal(v.groups,109);
    const categoryOrder=await page.evaluate(()=>[...new Set([...document.querySelectorAll('.history-group .history-category')]
      .map(el=>el.textContent.split(' · ')[0]))]);
    assert.deepEqual(categoryOrder,[...familySpec.individual_order,...familySpec.team_order],
      'HTO Records history widget category grouping must follow official Summer/Winter logical stat families');
    assert.ok(v.marked[0]?.includes('playerID=354061'));assert.ok(v.official.includes('p=records'));
    assert.ok(v.summer.some(x=>x.includes('viewseas=Summer_2015')),'verified summer record did not deep link');
    assert.equal(v.incorrectlyWinterScoped,0,'ambiguous winter year must not be inferred');
    assert.ok(v.width<=v.viewport+4,'horizontal overflow '+JSON.stringify(viewport)+' '+v.width);
    await page.type('#historySearch','Mark Pastore');
    await page.waitForFunction(()=>+document.getElementById('visibleItems').textContent>0);
    let found=await page.evaluate(()=>+document.getElementById('visibleItems').textContent.replace(/,/g,''));
    assert.ok(found>0&&found<460,'Search broken '+found);
    await page.click('#awardsTab');
    await page.waitForFunction(()=>document.getElementById('totalItems')?.textContent==='146');
    v=await page.evaluate(()=>({
     entries:document.querySelectorAll('.history-group li').length,
     groups:document.querySelectorAll('.history-group').length,
     official:document.getElementById('official').href,
     alumni:[...document.querySelectorAll('a.brave-player-link')].filter(a=>a.textContent==='Mark Pastore').slice(0,1).map(a=>a.href),
     summer:[...document.querySelectorAll('li[data-hto-season="Summer_2015"] a.brave-player-link')].filter(a=>a.textContent==='Mark Pastore').map(a=>a.href),
     width:document.documentElement.scrollWidth,viewport:innerWidth
    }));
    assert.equal(v.entries,146);assert.equal(v.groups,20);assert.ok(v.official.includes('p=awards'));
    assert.ok(v.alumni[0]?.includes('playerID=354061'));assert.ok(v.width<=v.viewport+4);
    assert.ok(v.summer.some(x=>x.includes('viewseas=Summer_2015')),'verified summer award did not deep link');
    assert.deepEqual(errors,[]);
    console.log('HISTORY_COMPANION_PASS',JSON.stringify({viewport,records:460,awards:146,searchResults:found,errors}));
    await page.close();
  }
  // Deliberately suppress optional season evidence: the archive and career
  // hyperlinks must still render, with no unsupported season-specific claims.
  const degraded=await browser.newPage();
  await degraded.setRequestInterception(true);
  degraded.on('request',r=>r.url().includes('history-player-seasons.json')?r.respond({status:404,body:'not found'}):r.continue());
  await degraded.goto(address+'?view=records',{waitUntil:'domcontentloaded'});
  await degraded.waitForFunction(()=>document.getElementById('totalItems')?.textContent==='460');
  const fallback=await degraded.evaluate(()=>({items:document.querySelectorAll('.history-group li').length,seasonLinks:document.querySelectorAll('[data-hto-season]').length,carosi:window.BravePlayerLinks?.profileUrl('Justin Carosi')}));
  assert.equal(fallback.items,460);assert.equal(fallback.seasonLinks,0);assert.ok(fallback.carosi.includes('playerID=354060'));
  console.log('HISTORY_SEASON_EVIDENCE_FALLBACK_PASS',JSON.stringify(fallback));
  await degraded.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
