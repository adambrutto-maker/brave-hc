'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE||'puppeteer');
const root=path.resolve(__dirname,'..');
const ledger=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-highlights-ledger.json'),'utf8'));
assert.equal(ledger.schema,'brave-hc-player-highlights/v1');
assert.equal(ledger.players['354054'].items.length,16);
assert.equal(ledger.players['354060'].items.length,25);
assert.equal(ledger.players['354054'].items.filter(x=>x.sourceEmphasis).length,3);
assert.equal(ledger.players['354060'].items.filter(x=>x.sourceEmphasis).length,2);
assert.ok(ledger.players['354054'].items.some(x=>x.sourceText.includes('Decidation')&&x.displayText.includes('Dedication')));
assert.equal(ledger.players['354060'].items[0].sourceText,'300 Game Club - September 20, 2026');
const server=http.createServer((req,res)=>{
 const fn=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,'');
 if(fn==='widgets/awards-participants.json'&&req.headers['x-qa-block']){res.writeHead(404);return res.end('unavailable')}
 const f=path.resolve(root,fn);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(f,(err,data)=>{
  if(err){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png'})[path.extname(f)]||'text/plain');
  res.end(data);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const host='http://127.0.0.1:'+server.address().port+'/widgets/player-highlights.html';
 const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [id,expected,stat,marker] of [
   [354054,16,'0','300 Game Club'],
   [354060,25,'3','Hart Award'],
   [776208,0,'5.00','No approved career highlights']
  ]){
   const p=await b.newPage();await p.setViewport({width:355,height:780});
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   const resp=await p.goto(host+'?playerID='+id,{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>!document.getElementById('notice').textContent.includes('Loading'),{timeout:10000});
   const a=await p.evaluate(()=>({
    name:document.getElementById('playerName').textContent,
    summary:[...document.querySelectorAll('#careerSummary .ph-number')].map(x=>x.textContent),
    initiallyVisible:document.querySelectorAll('#legacy .ph-event').length,
    stats:document.getElementById('form').innerText,
    available:document.getElementById('legacy').textContent,
    notice:document.getElementById('notice').innerText,
    overflow:document.documentElement.scrollWidth>innerWidth+4,
    button:!document.getElementById('expand').hidden
   }));
   assert.equal(resp.status(),200);
   assert.ok(a.available.includes(marker),id+' legacy content');
   if(expected>7){
    assert.equal(a.initiallyVisible,7);assert.equal(a.button,true);
    await p.click('#expand');
    const all=await p.$$eval('#legacy .ph-event',e=>e.length);
    assert.equal(all,expected);
   }else assert.equal(a.initiallyVisible,0);
   assert.ok(a.stats.includes(stat),id+' stats '+a.stats);
   assert.equal(a.overflow,false);assert.deepEqual(errors,[]);
   console.log('PLAYER_HIGHLIGHTS_QA_PASS',JSON.stringify({id,name:a.name,legacy:expected,visible:a.initiallyVisible,summary:a.summary,errors}));
   await p.close();
  }
  const newPlayer=await b.newPage();
  await newPlayer.goto(host+'?playerID=999999999',{waitUntil:'domcontentloaded'});
  await newPlayer.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Identity not verified'));
  const blocked=await newPlayer.evaluate(()=>({title:document.getElementById('playerName').textContent,legacy:document.getElementById('legacy').innerText}));
  assert.ok(blocked.legacy.includes('not yet verified'));console.log('UNREGISTERED_PLAYER_FAIL_CLOSED_PASS',JSON.stringify(blocked));
  await newPlayer.close();
  const missing=await b.newPage();await missing.setRequestInterception(true);
  missing.on('request',r=>r.url().includes('awards-participants.json')?r.respond({status:404,body:'not found'}):r.continue());
  await missing.goto(host+'?playerID=354060',{waitUntil:'domcontentloaded'});
  await missing.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Partial data'));
  const noFeed=await missing.evaluate(()=>({legacy:document.querySelectorAll('#legacy .ph-event').length,form:document.querySelector('#form').innerText}));
  assert.equal(noFeed.legacy,7);assert.ok(noFeed.form.includes('unavailable'));console.log('MISSING_STATS_FEED_FAILS_SAFE_PASS',JSON.stringify(noFeed));
  await missing.close();
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
