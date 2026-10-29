'use strict';
/* Five-iteration Bio V3.3 browser acceptance. No HTO writes or live deployment.
 * Source-observed career share != personal scoring composition != GP-rate rank.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),archive=require('../widgets/player-career-insights.json');
const engine=require('../widgets/player-bio-alltime-share-v33.js');
const mime={'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);return res.end('Unavailable')}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(bytes);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 let scenarios=0;
 try{
  for(const width of [320,390,625,1280]){
   for(const [id,role] of [['354060','skater'],['354055','goalie'],['354057','skater'],['354043','skater']]){
    const p=await browser.newPage({viewport:{width,height:910}}),errors=[];
    p.on('pageerror',err=>errors.push(err.message));
    await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await p.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await p.locator('#bioTabs:not([hidden])').waitFor({timeout:18000});
    await p.locator('[data-bio-view="trends"]').click();
    await p.locator('#bioExtendedAnalytics>summary').click();
    await p.locator('#bioExtendedAnalytics[open]').waitFor({state:'visible',timeout:14000});
    const actual=engine.analyzePlayer(archive,id,role);
    assert.equal(actual.status,'SOURCE_CALCULATED',id);
    const cards=p.locator('#bioHistoricalShareGrid .bio-v33-card');
    assert.equal(await cards.count(),actual.primary.length,id+' primary all-time category count');
    for(const m of actual.primary){
     const card=p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="'+m.metric+'"]');
     assert.equal(await card.count(),1);
     assert.equal(await card.locator('.bio-v33-rank').innerText(),'#'+m.rank+'/'+m.qualified);
     assert.ok((await card.locator('.bio-v33-basis').innerText()).includes(m.value.toLocaleString('en-CA')));
     assert.match(await card.locator('.bio-v33-rank').getAttribute('title'),/historical HTO identities checked/);
     assert.match(await card.locator('.bio-v33-rank').getAttribute('title'),/Missing data not counted as zero/);
    }
    assert.match(await p.locator('#bioShareSource').innerText(),/109 HTO profiles checked · Oct 20, 2026 · reported totals only/,
     'Historical scope, source date and incomplete-metric disclosure all visible');
    const all=actual.metrics.length;
    if(actual.additional.length){
     await p.locator('#bioSharesMore').click();
     assert.equal(await cards.count(),all,id+' expanded categories');
     assert.equal(await p.locator('#bioSharesMore').getAttribute('aria-expanded'),'true');
     await p.locator('#bioSharesMore').click();
     assert.equal(await cards.count(),actual.primary.length);
    }else assert.equal(await p.locator('#bioSharesMore').isVisible(),false);
    assert.equal(await p.locator('#bioAttendanceHold').isVisible(),true);
    assert.equal(await p.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Career roster-adjusted attendance'}).count(),0);
    assert.equal(await p.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Season roster-adjusted attendance'}).count(),0);
    const rates=await p.locator('#bioExtendedMetrics .bio-extended-label').allInnerTexts();
    assert.ok(!rates.some(s=>/Goal share of points|Assist share of points|Career hat tricks|Career wins|Career shutouts/.test(s)),
      'No repeated personal composition or all-time count card in rate panel');
    if(id==='354060'){
     const goal=p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="G"]');
     assert.equal(await goal.locator('.bio-v33-value').innerText(),'10.9%');
     assert.equal(await goal.locator('.bio-v33-rank').innerText(),'#1/57');
     const potg=p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="POTG"]');
     assert.equal(await potg.locator('.bio-v33-value').innerText(),'10.8%');
     assert.equal(await potg.locator('.bio-v33-rank').innerText(),'#2/55');
     const old=p.locator('#bioOtherMetrics');
     await old.locator('summary').click();
     assert.equal(await p.locator('#bioSecondaryMetrics .bio-extra-metric').count(),3);
     assert.match(await p.locator('#bioScoringMix').innerText(),/Goals 41%/);
     assert.doesNotMatch(await p.locator('#bioSecondaryMetrics').innerText(),/Player of Game|Penalty minutes|Share of actual career points from goals/);
     const count=await p.locator('#bioExtendedMetrics .bio-extended-label').filter({hasText:'Player of Game / GP'}).count();
     assert.equal(count,1,'One GP-percent source card only');
    }
    if(id==='354055'){
     assert.equal(await p.locator('#bioOtherMetrics').isVisible(),false,'No duplicate goaltending analytics panel');
     const wins=p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="W"]');
     assert.equal(await wins.locator('.bio-v33-value').innerText(),'76.5%');
     assert.equal(await wins.locator('.bio-v33-rank').innerText(),'#1/11');
     assert.equal(await p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="SHO"] .bio-v33-value').innerText(),'85.7%');
    }
    if(id==='354043'){
     assert.equal(await p.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="G"]').count(),0,
       'No invented 0-goal share for a missing HTO historical field');
    }
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No overflow '+width+'/'+id);
    assert.deepEqual(errors,[],'No client-side JS errors '+width+'/'+id);
    scenarios++;
    console.log('BIO_V33_CONTENT_PASS',JSON.stringify({id,width,role,primary:actual.primary.length,total:all}));
    await p.close();
   }
  }
  assert.equal(scenarios,16);
  // A missing new all-time calculator must hold rather than invent leaderboard percentages.
  const fail=await browser.newPage({viewport:{width:390,height:900}});
  await fail.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await fail.route('**/player-bio-alltime-share-v33.js',r=>r.fulfill({status:404,body:'Unavailable'}));
  await fail.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1');
  await fail.locator('#bioTabs:not([hidden])').waitFor({timeout:15000});
  await fail.locator('[data-bio-view="trends"]').click();
  await fail.locator('#bioExtendedAnalytics>summary').click();
  await fail.waitForTimeout(350);
  assert.equal(await fail.locator('#bioHistoricalShareGrid .bio-v33-card').count(),0);
  assert.match(await fail.locator('#bioShareSource').innerText(),/held/i);
  console.log('BIO_V33_MISSING_RANK_ENGINE_HELD_PASS');
  await fail.close();
  for(const optional of ['projection.json','league-game-formats.json']){
   const lost=await browser.newPage({viewport:{width:390,height:900}}),err=[];
   lost.on('pageerror',e=>err.push(e.message));
   await lost.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await lost.route('**/'+optional,r=>r.fulfill({status:404,body:'Unavailable'}));
   await lost.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1',{waitUntil:'domcontentloaded'});
   await lost.locator('#bioTabs:not([hidden])').waitFor({timeout:15000});
   await lost.locator('[data-bio-view="trends"]').click();
   await lost.locator('#bioExtendedAnalytics>summary').click();
   await lost.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="G"]').waitFor({state:'visible',timeout:9000});
   assert.equal(await lost.locator('#bioHistoricalShareGrid .bio-v33-card').count(),6,
     'Verified career-share evidence must survive absent optional '+optional);
   assert.equal(await lost.locator('#bioHistoricalShareGrid .bio-v33-card[data-metric="G"] .bio-v33-value').innerText(),'10.9%');
   assert.deepEqual(err,[],'Unrelated source failure must not crash UI');
   console.log('BIO_V33_INDEPENDENT_SOURCE_PASS',optional);
   await lost.close();
  }
  console.log('BIO_V33_ALL_CONTENT_QA_PASS',JSON.stringify({scenarios,sourceHeld:true,archiveProfiles:109,optionalSourcesFailClosed:2}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
