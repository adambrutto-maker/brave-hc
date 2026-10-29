'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),qa=process.env.BRAVE_QA_SCREENSHOTS||null;
const legacy=require('../widgets/player-highlights-ledger.json');
const leadership=require('../widgets/player-bio-leadership.json');
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,body)=>{
  if(e)return res.writeHead(404).end();
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css',
    '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'text/plain');
  res.end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 const errors=[],receipts=[],groups=[...new Set(leadership.items.map(x=>String(x.htoPlayerID)))];
 const open=async(id,width=390)=>{
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',e=>errors.push(id+': '+e.message));
  await page.goto(origin+'/widgets/player-highlights.html?playerID='+id);
  await page.locator('#profileSource a').waitFor({timeout:16000});
  await page.locator('#lockerHonors').click();
  return page;
 };
 try{
  for(const id of groups){
    const page=await open(id);
    const recorded=leadership.items.filter(x=>String(x.htoPlayerID)===id);
    const n=recorded.length;
    const filter=page.locator('#honorsFilters .ph-honors-filter').filter({hasText:'Leadership'});
    assert.equal(await filter.count(),1,id+' category visible');
    assert.match(await filter.innerText(),new RegExp('Leadership \\('+String(n+legacy.players[id].items.filter(x=>x.category==='leadership').length+(id==='354058'?1:0))+'\\)'));
    await filter.click();
    const entries=await page.locator('#honorsGrid .ph-honor-card').allTextContents();
    for(const row of recorded){
      assert.ok(entries.some(x=>x.includes(row.text.split(' - ')[0])&&x.includes(row.text.split(' - ')[1])),
        id+' missing '+row.text);
    }
    if(id==='525407'){
      assert.equal(n,1);
      assert.equal(entries.length,1);
      assert.match(entries[0],/Team Captain/);
      assert.match(entries[0],/2018 to 2019/);
      assert.match(entries[0],/Public HTO Bio leadership history/);
      assert.match(await page.locator('#honorsGrid img').first().getAttribute('alt'),/captain/i);
      if(qa)await page.screenshot({path:path.join(qa,'dylan-brennan-captain-highlights-candidate.png'),fullPage:true});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' mobile overflow');
    receipts.push({playerID:id,player:legacy.players[id].name,publishedServiceTenures:n,leadershipFilter:true});
    await page.close();
  }
  const base=legacy.players['525407'].items.length;
  const unavailable=await browser.newPage({viewport:{width:355,height:900}});
  unavailable.on('pageerror',e=>errors.push('unavailable: '+e.message));
  await unavailable.route('**/player-bio-leadership.json',r=>r.abort());
  await unavailable.goto(origin+'/widgets/player-highlights.html?playerID=525407');
  await unavailable.locator('#profileSource a').waitFor();
  await unavailable.locator('#lockerHonors').click();
  assert.equal(await unavailable.locator('#honorsFilters .ph-honors-filter').filter({hasText:'Leadership'}).count(),0);
  await unavailable.locator('#lockerAll').click();
  assert.ok((await unavailable.textContent('#allSection')).includes('Hart Award'));
  await unavailable.close();
  const fake=structuredClone(leadership);
  fake.items.find(x=>x.player==='Dylan Brennan').htoPlayerID=354285;
  const spoof=await browser.newPage({viewport:{width:355,height:900}});
  spoof.on('pageerror',e=>errors.push('spoof: '+e.message));
  await spoof.route('**/player-bio-leadership.json',r=>r.fulfill({status:200,
    contentType:'application/json',body:JSON.stringify(fake)}));
  await spoof.goto(origin+'/widgets/player-highlights.html?playerID=525407');
  await spoof.locator('#profileSource a').waitFor();
  await spoof.locator('#lockerHonors').click();
  assert.equal(await spoof.locator('#honorsFilters .ph-honors-filter').filter({hasText:'Leadership'}).count(),0);
  await spoof.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',serviceRows:leadership.items.length,distinctLeaders:groups.length,
    dylanCaptain:'Team Captain - 2018 to 2019',sourceOutagePreserved:true,
    forgedCaptainHeld:true,identityReceipts:receipts,pageErrors:errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
