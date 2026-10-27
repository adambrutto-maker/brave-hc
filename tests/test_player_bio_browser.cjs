'use strict';
// Local-only browser regression: never opens or edits HTO or an authenticated tab.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-career-insights.json')));
const leadership=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-bio-leadership.json')));
const actuals=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-actuals.json')));
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const results=[],errors=[];
 async function pageFor(query,overrides={}){
  const p=await browser.newPage({viewport:{width:358,height:800}});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   const key=path.basename(url.pathname);
   if(Object.hasOwn(overrides,key)){const value=overrides[key];return route.fulfill({status:value===null?503:200,contentType:'application/json',body:value===null?'unavailable':JSON.stringify(value)});}
   return route.continue();
  });
  await p.goto(origin+'/widgets/player-bio.html'+query);await p.waitForFunction(()=>!document.getElementById('loadState').textContent.includes('Loading'));
  return p;
 }
 try{
  const p=await pageFor('?playerID=354054&embed=1');
  for(const [id,data] of Object.entries(career.players)){
   await p.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1');
   await p.waitForSelector('#profileContent:not([hidden])');
   const state=await p.evaluate(()=>({name:document.querySelector('#playerName').textContent,leadership:[...document.querySelectorAll('#leadership .entry')].map(x=>x.textContent),link:document.querySelector('#officialLink').href,overflow:document.documentElement.scrollWidth>innerWidth+1,open:document.querySelector('#seasonChartsDetails').open,gameHidden:document.querySelector('#gameTrendsSection').hidden,chooserVisible:getComputedStyle(document.querySelector('header>.controls')).display!=='none',text:document.body.innerText}));
   assert.equal(state.name,data.name,id+' identity');assert.ok(state.link.includes('playerID='+id));
   assert.deepEqual(state.leadership,leadership.items.filter(r=>String(r.htoPlayerID)===id).map(r=>r.text));
   assert.equal(state.overflow,false,id+' overflow');assert.equal(state.open,false);assert.equal(state.gameHidden,true);assert.equal(state.chooserVisible,false);
   assert.ok(!/NaN|Infinity|private, source-only accepted/.test(state.text));
   results.push({id,name:data.name});
  }
  await p.close();
  for(const width of [320,390,625,1280]){
   const m=await pageFor('?playerID=354060&embed=1');await m.setViewportSize({width,height:800});
   await m.click('a[href="#chartsSection"]');assert.equal(await m.$eval('#seasonChartsDetails',e=>e.open),true);
   await m.selectOption('#chartSeasonFilter','summer');assert.ok(await m.$eval('#careerCharts',e=>e.querySelectorAll('svg').length)>0);
   assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await m.selectOption('#chartSeasonFilter','winter');await m.locator('.bio-chart-inspector-select').first().selectOption({index:0});
   assert.ok((await m.locator('.bio-chart-selected').first().textContent()).includes('Winter'));
   if(process.env.BRAVE_QA_SCREENSHOTS){await m.click('a[href="#careerSection"]');await m.$eval('#seasonChartsDetails',e=>e.open=false);await m.screenshot({path:path.join(process.env.BRAVE_QA_SCREENSHOTS,'bio-'+width+'.png'),fullPage:true});}
   await m.close();
  }
  const mixed=await pageFor('?playerID=354057');assert.ok(await mixed.locator('#roleChoice option').count()>1);await mixed.selectOption('#roleChoice','1');assert.equal(await mixed.textContent('#c1'),'W');await mixed.selectOption('#playerChoice','354054');assert.equal(await mixed.textContent('#c1'),'G');assert.equal(await mixed.locator('#leadership .entry').count(),4);await mixed.selectOption('#playerChoice','');assert.equal(await mixed.$eval('#profileContent',e=>e.hidden),true);assert.ok(!mixed.url().includes('playerID='));await mixed.close();
  for(const query of ['?playerID=999999999&embed=1','?embed=1','?playerID=0354054&embed=1','?playerID=3.54054e5&embed=1']){
   const invalid=await pageFor(query);assert.match(await invalid.textContent('#loadState'),/does not identify/);assert.equal(await invalid.$eval('#profileContent',e=>e.hidden),true);await invalid.close();
  }
  for(const key of ['player-career-insights.json','player-actuals.json','player-bio-leadership.json']){
   const missing=await pageFor('?playerID=354054&embed=1',{[key]:null});
   if(key.includes('career')){assert.equal(await missing.$eval('#profileContent',e=>e.hidden),true);assert.equal(await missing.$eval('#retryLoad',e=>e.hidden),false);}
   else {assert.equal(await missing.$eval('#profileContent',e=>e.hidden),false);if(key.includes('actuals')){assert.equal(await missing.locator('#leadership .entry').count(),4);assert.match(await missing.textContent('#loadState'),/temporarily unavailable/);}else assert.match(await missing.textContent('#leadership'),/temporarily unavailable/);}
   await missing.close();
  }
  const spoof=structuredClone(career);spoof.players['354054'].name='Wrong Person';const bad=await pageFor('?playerID=354054&embed=1',{'player-career-insights.json':spoof});assert.equal(await bad.$eval('#profileContent',e=>e.hidden),true);await bad.close();
  for(const malformed of ['unknown status','invalid segments']){
   const feed=structuredClone(career),profile=Object.values(feed.players).find(p=>p.status==='NO_PUBLISHED_STATS');
   if(malformed==='unknown status')profile.status='UNVERIFIED';else profile.segments={};
   const invalid=await pageFor('?playerID=354054&embed=1',{'player-career-insights.json':feed});
   assert.equal(await invalid.$eval('#profileContent',e=>e.hidden),true,malformed);
   assert.match(await invalid.textContent('#loadState'),/could not load/);await invalid.close();
  }
  const recovery=await pageFor('?playerID=354060&embed=1',{'player-actuals.json':null});
  assert.equal(await recovery.$eval('#retryLoad',e=>e.hidden),false);
  await recovery.route('**/player-actuals.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(actuals)}));
  await recovery.click('#retryLoad');await recovery.waitForSelector('#profileContent:not([hidden])');
  assert.equal(await recovery.$eval('#retryLoad',e=>e.hidden),true);
  assert.equal(await recovery.locator('#currentCards .stat').count(),4);
  assert.equal(await recovery.textContent('#playerName'),'Justin Carosi');await recovery.close();
  const badLeadership=structuredClone(leadership);badLeadership.items.push(null);const bl=await pageFor('?playerID=354054&embed=1',{'player-bio-leadership.json':badLeadership});assert.match(await bl.textContent('#leadership'),/temporarily unavailable/);await bl.close();
  const zero=structuredClone(actuals);zero.players.find(p=>/Carosi/.test(p.name)).gp=0;const zp=await pageFor('?playerID=354060&embed=1',{'player-actuals.json':zero});assert.ok(!/NaN|Infinity/.test(await zp.textContent('#analysis')));await zp.close();
  const charts=await pageFor('?playerID=354054');
  const gaps=await charts.evaluate(()=>{
   const box=document.querySelector('#careerCharts');window.BraveBioCharts.draw(box,{kind:'skater',seasons:[{Season:'Summer 2020',Pts:2,GP:1,G:1,A:1},{Season:'Winter 2020/2021',GP:1},{Season:'Summer 2021',Pts:3,GP:1,G:2,A:1}]});
   return [...box.querySelectorAll('.bio-chart-card')].at(-1).querySelectorAll('[data-row-index]').length;
  });assert.equal(gaps,1,'Cumulative series cannot resume after missing data');await charts.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',identities:results.length,responsiveWidths:[320,390,625,1280],leadershipEntries:leadership.items.length,cases:['all identities','all tenure rows','no overflow','chart navigation and filters','mixed roles and chooser reset','invalid/missing/noncanonical IDs','career failure','current failure','leadership failure','identity spoof','unknown career status','malformed career segments','retry recovery','malformed leadership','zero GP','cumulative gap'],pageErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
