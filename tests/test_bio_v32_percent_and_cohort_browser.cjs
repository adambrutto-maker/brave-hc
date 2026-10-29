'use strict';
/* V3.2 focused mobile acceptance: each per-100 legacy rate must be a true
 * percent of actual GP, including the older More analytics dropdown.
 * Bracket denominators describe the verified eligible cohort, not every roster name.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const career=require('../widgets/player-career-insights.json');
const engine=require('../widgets/player-bio-attendance-rank-v31.js');
const srv=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end('missing')}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(b)});
});
(async()=>{
 await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const origin='http://127.0.0.1:'+srv.address().port;
 try{
  for(const width of [320,390,625]){
   for(const [id,role] of [['354060','skater'],['354055','goalie']]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1',{waitUntil:'domcontentloaded'});
    await page.locator('#bioTabs:not([hidden])').waitFor({timeout:16000});
    await page.locator('[data-bio-view="trends"]').click();
    await page.locator('#bioExtendedAnalytics summary').click();
    await page.locator('#bioExtendedAnalytics[open]').waitFor({timeout:10000});
    const profile=career.players[id],total=profile.segments.find(s=>s.kind===role).total;
    const expected=(total.POTG/total.GP*100).toFixed(1)+'%';
    const card=page.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Player of Game / GP'});
    await card.first().waitFor({timeout:12000});
    assert.equal(await card.locator('.bio-extended-value').innerText(),expected,'new GP-percent card');
    assert.match(await card.locator('.bio-extended-basis').innerText(),new RegExp(total.POTG+' POTG / '+total.GP+' recorded GP'));
    const rank=engine.rankMetric(career,id,role,'Player of Game / GP');
    assert.equal(rank.status,'QUALIFIED','historical player rank expected');
    assert.equal(await card.locator('.bio-extended-rank').innerText(),'#'+rank.rank+'/'+rank.qualified);
    assert.match(await card.locator('.bio-extended-rank').getAttribute('title'),new RegExp(engine.MIN_GP[role]+'\\+ career GP'));
    const cutoff=await page.locator('#bioRankCriteria').innerText();
    assert.match(cutoff,/skaters 10\+ GP/);
    assert.match(cutoff,/goalies 8\+ GP/);
    await page.locator('#bioOtherMetrics summary').click();
    const extra=page.locator('#bioSecondaryMetrics .bio-extra-metric').filter({hasText:'Player of Game / '});
    assert.equal(await extra.count(),1,'legacy card must use one percent of actual GP');
    assert.equal(await extra.locator('strong').innerText(),expected,'legacy POTG percentage');
    const otherText=await page.locator('#bioOtherMetrics').innerText();
    assert.doesNotMatch(otherText,/per 100|per hundred/i,'obsolete per-100 text must be gone');
    if(role==='goalie'&&Number.isFinite(total.SHO)){
      const shut=page.locator('#bioSecondaryMetrics .bio-extra-metric').filter({hasText:'Shutouts / goalie GP'});
      assert.equal(await shut.locator('strong').innerText(),(total.SHO/total.GP*100).toFixed(1)+'%');
    }
    if(role==='skater'){
      const goal=page.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Goal share of points'});
      const expectedRank=engine.rankMetric(career,id,'skater','Goal share of points');
      assert.equal(expectedRank.minimumGP,10);
      assert.equal(expectedRank.minimumDenominator,5);
      assert.equal(await goal.locator('.bio-extended-rank').innerText(),'#'+expectedRank.rank+'/'+expectedRank.qualified);
      assert.match(await goal.locator('.bio-extended-rank').getAttribute('title'),/at least 5 Pts/);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.deepEqual(errors,[]);
    console.log('BIO_V32_GP_PERCENT_PASS',JSON.stringify({width,id,role,potg:total.POTG,gp:total.GP,percent:expected,rank:'#'+rank.rank+'/'+rank.qualified,noPer100:true}));
    await page.close();
   }
  }
 }finally{await browser.close();await new Promise(ok=>srv.close(ok))}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
