'use strict';
/* ENG CHAT 62 — source-preserving Player Bio layout and plain-language audit.
   Uses a local server only; no HTO CMS or workbook writes. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('blocked');}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end('not found')}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');
  res.end(data);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const host='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const verified=[],errors=[];
 try{
  for(const width of [320,390,625,1280]){
   for(const [player,kind] of [['738846','skater'],['354055','goalie']]){
    const page=await browser.newPage({viewport:{width,height:960}});
    const uncaught=[];page.on('pageerror',e=>uncaught.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===host?r.continue():r.abort());
    try{
     await page.goto(host+'/widgets/player-bio.html?playerID='+player+'&embed=1',{waitUntil:'domcontentloaded',timeout:20000});
     await page.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:16000});
     if(kind==='skater'){
      await page.locator('#bioCareerModelRate').waitFor({state:'visible',timeout:15000});
      const values=await page.evaluate(()=>{
       const metric=document.querySelector('#bioProjectionCards .bio-metric:last-child');
       const career=document.querySelector('#bioCareerModelStrip .bio-career-benchmark-stat');
       const icon=document.querySelector('#bioProjectionTrend .v365-adaptive');
       const avg=document.querySelector('#bioCareerModelRate');
       const projected=metric.querySelector('.value');
       const projectLabel=metric.querySelector('.label');
       const avgLabel=career.querySelector('.label');
       const hero=document.querySelector('.bio-projection-hero');
       const current=document.querySelector('#bioSeasonCurrent');
       const about=document.querySelector('#bioAboutNumbers');
       const nested=document.querySelector('#bioProjectionFull');
       const note=document.querySelector('#bioSourceExtra');
       const loc=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,left:r.left,right:r.right,bottom:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2}};
       const computed=(e)=>{const c=getComputedStyle(e);return{fontSize:c.fontSize,color:c.color,fontWeight:c.fontWeight,lineHeight:c.lineHeight,background:c.backgroundColor,border:c.borderTopColor,borderWidth:c.borderTopWidth,radius:c.borderTopLeftRadius,pad:c.paddingTop}};
       return{
        countCareer:document.querySelectorAll('#bioCareerModelStrip').length,
        careerParent:career.closest('#bioCareerModelStrip')?.parentElement===hero,
        standaloneCareer:!!document.querySelector('#bioProjectionSection>#bioCareerModelStrip'),
        technicalMoved:!hero.contains(nested)&&about.contains(nested),
        noteMoved:about.contains(note),
        technicalClosed:!nested.open,
        aboutClosed:!about.open,
        technicalSummary:nested.querySelector('summary')?.textContent,
        isVisible:career.checkVisibility(),
        value:avg.textContent,ptsProj:projected.textContent,
        metric:loc(metric),career:loc(career),icon:loc(icon),
        hero:loc(hero),headline:loc(hero.querySelector('.bio-projection-headline-row')),
        copy:loc(document.querySelector('#bioProjectionTrend .bio-trend-copy')),
        current:loc(current),trend:loc(document.querySelector('#bioProjectionSummarySlot')),
        avgStyle:computed(avg),projectStyle:computed(projected),
        avgLabel:computed(avgLabel),projectLabel:computed(projectLabel),
        careerStyle:computed(career),metricStyle:computed(metric),
        noOverflow:document.documentElement.scrollWidth<=innerWidth+1,
        oldStrip:document.body.textContent.includes('Forecast assumptions and source status'),
        aboutHTML:about.innerHTML.slice(0,1500),
        sourceLabelsPresent:['bioProjectionState','bioProjectionActual','bioModelContext','bioProjectionOpponent','bioProjectionTrendDetail','sourceDetail'].every(id=>document.querySelectorAll('#'+id).length===1)
       };
      });
      assert.equal(values.countCareer,1);
      assert.equal(values.careerParent,true,'Career Average must be inside projected-season card');
      assert.equal(values.standaloneCareer,false);
      assert.equal(values.technicalMoved,true,'Full source fields moved to About');
      assert.equal(values.noteMoved,true);
      assert.equal(values.technicalClosed,true);
      assert.equal(values.aboutClosed,true);
      assert.equal(values.technicalSummary,'Where this forecast comes from');
      assert.equal(values.isVisible,true);
      assert.equal(values.value,'1.37','Stéphane career average unchanged');
      assert.equal(values.ptsProj,'1.17','Stéphane projected PTS/GP unchanged');
      assert.equal(values.sourceLabelsPresent,true);
      assert.equal(values.oldStrip,false);
      assert.equal(values.noOverflow,true,'No document horizontal overflow');
      assert.equal(values.avgStyle.fontSize,values.projectStyle.fontSize,'Career value number same size');
      assert.equal(values.avgStyle.color,values.projectStyle.color,'Career value same foreground');
      assert.equal(values.avgStyle.fontWeight,values.projectStyle.fontWeight,'Career value same weight');
      assert.equal(values.avgStyle.lineHeight,values.projectStyle.lineHeight,'Career value same line height');
      assert.equal(values.avgLabel.fontSize,values.projectLabel.fontSize,'Career label same size');
      assert.equal(values.avgLabel.color,values.projectLabel.color,'Career label same foreground');
      assert.equal(values.avgLabel.fontWeight,values.projectLabel.fontWeight,'Career label same weight');
      assert.equal(values.careerStyle.background,values.metricStyle.background,'Career tile same background');
      assert.equal(values.careerStyle.border,values.metricStyle.border,'Career tile same border colour');
      assert.equal(values.careerStyle.borderWidth,values.metricStyle.borderWidth,'Career tile same border width');
      assert.equal(values.careerStyle.radius,values.metricStyle.radius,'Career tile same corner radius');
      assert.ok(Math.abs(values.career.h-values.metric.h)<=1.5,'Career and forecast tile same height');
      assert.ok(Math.abs(values.metric.cx-values.career.cx)<=2,'Career center aligns with projected PTS/GP');
      assert.ok(Math.abs(values.metric.cx-values.icon.cx)<=2.5,'Icon centered in same fifth column');
      assert.ok(values.copy.right<=values.icon.left+2,'Trend copy must not overlap arrow');
      assert.ok(values.metric.bottom<values.career.y,'Career below projected metrics');
      assert.ok(values.career.bottom<values.trend.y,'Trend below the combined projected card');
      await page.locator('#bioAboutNumbers>summary').click();
      await page.locator('#bioNumbersSkaterExplanation').waitFor({state:'visible'});
      const plain=await page.locator('#bioNumbersSkaterExplanation').innerText();
      for(const term of ['Current Season','Projected Current Season','Career Average','Trend arrow','not a guarantee'])
       assert.ok(plain.includes(term),'Plain language missing '+term);
      assert.doesNotMatch(plain,/calibration|historical-reference mode|standard deviation|sigma|forecast certification|Excel/i);
      assert.equal(await page.locator('#bioProjectionFull>summary').isVisible(),true);
      await page.locator('#bioProjectionFull>summary').click();
      assert.equal(await page.locator('#bioProjectionFull').getAttribute('open'),'');
      const provenance=await page.locator('#bioProjectionTrendDetail').textContent();
      assert.match(provenance,/Original workbook category:/);
      assert.match(provenance,/Original career rate/);
      assert.deepEqual(uncaught,[]);
      if(width===390&&process.env.ENG62_SCREENSHOT_DIR)
       await page.screenshot({path:path.join(process.env.ENG62_SCREENSHOT_DIR,'eng62-stéphane-season-outlook-390.png'),fullPage:true});
      verified.push({width,kind,centers:{project:values.metric.cx,career:values.career.cx,icon:values.icon.cx},height:{project:values.metric.h,career:values.career.h},style:values.avgStyle.fontSize,readable:true,techHiddenUntilOpen:true});
     }else{
      assert.equal(await page.locator('#bioProjectionSection').isVisible(),false);
      await page.locator('#bioAboutNumbers>summary').click();
      assert.equal(await page.locator('#bioProjectionFull').isVisible(),false,'Goalie-only profile must not expose irrelevant skater source');
      assert.equal(await page.locator('#bioNumbersSkaterExplanation').isVisible(),false,'Skater explanation hidden for goalie-only role');
      assert.equal(await page.locator('#bioNumbersGoalieExplanation').isVisible(),true,'Goalie receives simple relevant source explanation');
      assert.deepEqual(uncaught,[]);
      verified.push({width,kind,about:true,technicalProjectionHidden:true});
     }
    }catch(e){errors.push({width,player,kind,error:e.message})}
    finally{await page.close()}
   }
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 console.log('ENG62_BIO_LAYOUT_QA',JSON.stringify({passed:verified.length,errors,examples:verified.filter(x=>x.width===390)}));
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
