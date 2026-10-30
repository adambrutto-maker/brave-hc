'use strict';
/* PR-only browser test. Never changes official HTO records or profile editors. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-bio-coaching-library-v28-preview.json'),'utf8'));
assert.equal(manifest.schema,'brave-hc-coaching-reference-library/v2');
assert.equal(manifest.resources.length,6);
assert.equal(manifest.status,'REVIEW_ONLY_EXTERNAL_RESOURCE_PAGES');
assert.ok(!JSON.stringify(manifest).includes('youtubeId'));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'text/plain');
  res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390]){
   for(const playerID of [354060,354055]){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const privateAttendanceFile=process.env.BRAVE_PRIVATE_ATTENDANCE_PREVIEW;
    if(privateAttendanceFile){
      const privateAttendance=fs.readFileSync(privateAttendanceFile,'utf8');
      await page.route('**/player-bio-attendance-verified-v30-preview.json',r=>r.fulfill({contentType:'application/json',body:privateAttendance}));
    }
    const response=await page.goto(origin+'/widgets/player-bio-v28-coaching-preview.html?playerID='+playerID+'&embed=1',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.locator('[data-bio-view="coaching"]').click();
    await page.locator('#playbookCount').getByText('6 RESOURCES').waitFor({timeout:15000});
    assert.equal(await page.locator('#bioTacticBoard [data-marker]').count(),8);
    assert.equal(await page.locator('#bioTacticStep').innerText(),'STEP 1/4');
    await page.locator('#bioTacticNext').click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('#bioTacticStep').innerText(),'STEP 2/4');
    await page.locator('[data-tactic="breakout"]').click();
    assert.match(await page.locator('#bioTacticCaption').innerText(),/Defence retrieves/);
    await page.locator('#bioTacticPlay').click();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#bioTacticStep').innerText(),'STEP 2/4');
    await page.locator('#bioTacticPlay').click();
    await page.locator('#bioTacticReset').click();
    assert.equal(await page.locator('#bioTacticStep').innerText(),'STEP 1/4');
    assert.equal(await page.locator('#playbookList .playbook-card').count(),3);
    await page.locator('#playbookFilters button').filter({hasText:'Skills'}).click();
    assert.equal(await page.locator('#playbookList .playbook-card').count(),1);
    await page.locator('#playbookFilters button').filter({hasText:'All'}).click();
    await page.locator('#playbookList .playbook-more').click();
    assert.equal(await page.locator('#playbookList .playbook-card').count(),6);
    assert.equal(await page.locator('#playbookList .playbook-watch').count(),6);
    assert.equal(await page.locator('#playbookList iframe').count(),0,'External video embeds removed');
    const links=await page.locator('#playbookList .playbook-watch').evaluateAll(nodes=>nodes.map(x=>({href:x.href,target:x.target,rel:x.rel})));
    assert.ok(links.every(x=>x.href.startsWith('https://')&&x.target==='_blank'&&x.rel.includes('noopener')));
    await page.locator('[data-bio-view="trends"]').click();
    await page.locator('#bioExtendedAnalytics summary').click();
    await page.locator('#bioExtendedMetrics .bio-extended-stat').first().waitFor({timeout:8000});
    const advanced=await page.locator('#bioExtendedMetrics .bio-extended-stat').count();
    assert.ok(advanced>=4,'Expected derived stats for verified career data');
    const careerAttCard=page.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Career roster-adjusted attendance'});
    const seasonAttCard=page.locator('#bioExtendedMetrics .bio-extended-stat').filter({hasText:'Season roster-adjusted attendance'});
    assert.equal(await careerAttCard.count(),1);
    assert.equal(await seasonAttCard.count(),1);
    if(privateAttendanceFile){
      const expected=playerID===354060?{career:'90.8%',rank:'#12/36'}:{career:'82.0%',rank:'#4/6'};
      assert.equal(await careerAttCard.locator('.bio-extended-value').innerText(),expected.career,'Workbook score');
      assert.equal(await careerAttCard.locator('.bio-extended-rank').innerText(),expected.rank,'Roster-adjusted rank');
      if(playerID===354060){
        assert.equal(await seasonAttCard.locator('.bio-extended-value').innerText(),'100.0%','Current FT appearances / contested team games');
        assert.match(await seasonAttCard.locator('.bio-extended-basis').innerText(),/5 \/ 5 eligible/);
      }else{
        assert.equal(await seasonAttCard.locator('.bio-extended-value').innerText(),'—','Goalie current source held');
      }
    }else{
      assert.equal(await careerAttCard.locator('.bio-extended-value').innerText(),'—','No private attendance publication until approved');
      assert.equal(await careerAttCard.locator('.bio-extended-rank').count(),0,'No invented attendance ranking');
    }
    assert.ok(await page.locator('#bioExtendedMetrics .bio-extended-rank').count()>=1,
      'Source-qualified HTO event rates receive ranking chips');
    assert.equal(await page.locator('#bioExtendedMetrics .bio-extended-rank').first().evaluate(el=>getComputedStyle(el).position),'absolute');
    const rateCards=await page.locator('#bioExtendedMetrics .bio-extended-stat').evaluateAll(cards=>
      cards.map(c=>({
        label:c.querySelector('.bio-extended-label')?.textContent.trim(),
        value:c.querySelector('.bio-extended-value')?.textContent.trim(),
        basis:c.querySelector('.bio-extended-basis')?.textContent.trim()
      })));
    assert.ok(!rateCards.some(c=>/per 100/i.test(c.label)),'Legacy per-100 labels removed');
    const gpEvent=(label,pct,num,den)=>{
      const item=rateCards.find(c=>c.label===label);
      assert.ok(item,'Expected '+label);
      assert.equal(item.value,pct.toFixed(1)+'%','Percentage of actual GP');
      assert.ok(item.basis.includes(String(num))&&item.basis.includes(String(den)+' recorded GP'),
        'Show raw event count and GP for small samples');
    };
    if(playerID===354060){
      gpEvent('Game-winning goals / GP',16/303*100,16,303);
      gpEvent('Game-tying goals / GP',8/303*100,8,303);
      gpEvent('Player of Game / GP',53/303*100,53,303);
    }else{
      gpEvent('Player of Game / GP',56/262*100,56,262);
    }
    assert.ok(rateCards.some(c=>c.label==='Penalty minutes / GP'&&c.value.indexOf('%')===-1),
      'PIM remains a minutes-per-appearance rate, not a percentage');
    await page.locator('[data-bio-view="production"]').click();
    if(playerID===354060){
     await page.locator('#bioCareerModelRate').getByText('1.14').waitFor({timeout:8000});
     assert.match(await page.locator('#bioCareerModelBasis').innerText(),/Winter-equivalent/);
     assert.equal((await page.locator('#bioProjectionCards .value').first().innerText()).trim(),'23','Projected GP displayed as a whole number');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'mobile overflow');
    assert.deepEqual(errors,[],'no page errors');
    console.log('BIO_V29_SOURCE_PLAYBOOK_PASS',JSON.stringify({width,playerID,resources:6,rinkScenarios:3,advanced,normalizedModelBaseline:true,noEmbeds:true,errors:0}));
    await page.close();
   }
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
