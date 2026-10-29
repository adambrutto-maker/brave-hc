'use strict';
// Real Bio page, synthetic scores used in ephemeral browser responses only.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const data=require('../widgets/projection.json');
const engine=require('../widgets/player-bio-projection-trend.js');
const visual=require('../widgets/player-bio-trend-visual-v36.js');
const sigma=data.conditionalFormatting.sampleStandardDeviation;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const cases=[
 {z:-2.75},{z:-2.1},{z:-1.73},{z:-1.15},{z:-.56},{z:-.21},{z:0},
 {z:.06},{z:.34},{z:.67},{z:1.12},{z:1.2743385655355493},{z:1.4055420847317484},
 {z:2.5},{rookie:true}
];
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);return res.end('Unavailable');}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(bytes);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const passes=[],failures=[];
 try{
 for(const width of [320,390,625,1280]){
  const page=await browser.newPage({viewport:{width,height:950}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  // All external URLs are blocked: replay the verified local repo only.
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  let spec=cases[0];
  await page.route('**/projection.json*',r=>{
    const p=structuredClone(data),row=p.players.find(x=>x.name==='Carosi, Justin');
    assert.ok(row,'official verified HTO identity is available');
    if(spec.rookie)row.trendInputs.firstSeasonOrNoCareer=true;
    else{row.trend=spec.z*sigma;row.trendInputs.firstSeasonOrNoCareer=false;}
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(p)});
  });
  for(const c of cases){
   spec=c;const url=origin+'/widgets/player-bio.html?playerID=354060&embed=1';
   try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
    if(c.rookie)await page.locator('#bioProjectionTrend[data-trend-state="ROOKIE"] .v36-badge').waitFor({timeout:14000});
    else await page.locator('#bioProjectionTrend.bio-trend-ready .v36-badge').waitFor({timeout:14000});
    const o=await page.evaluate(()=>{
     const host=document.querySelector('#bioProjectionTrend');
     const b=host?.querySelector('.v36-badge');
     const arrow=b?.querySelector('svg.bio-trend-direction-arrow');
     const g=arrow?.querySelector('.v36-arrow-rotor');
     const p=arrow?.querySelector('path.v36-arrow-shape');
     const elt=b?.querySelector('.v36-element');
     const br=b.getBoundingClientRect(),ar=arrow.getBoundingClientRect(),e=elt?.getBoundingClientRect();
     const mat=p.getScreenCTM();
     const tip=new DOMPoint(50,29).matrixTransform(mat);
     const ctr=new DOMPoint(50,50).matrixTransform(mat);
     const cold=b.classList.contains('v36-frosted');
     const anim=b.querySelector(cold?'.v36-ice-shimmer':'.v36-flame-outer');
     return {
      category:host.dataset.trendState,trendDirection:host.dataset.trendDirection,
      actualZ:b.dataset.sourceZScore,angle:b.dataset.deg,
      sourceSigma:b.dataset.sourceSigma,sourceTrend:b.dataset.sourceTrend,
      rotorAngle:g?.dataset.arrowAngle,rotorZ:g?.dataset.zScore,
      rookie:b.dataset.rookie==='true',rookieNeutral:!!p.getAttribute('data-rookie-neutral'),
      cold,fire:!!b.querySelector('.v36-element.fire'),ice:!!b.querySelector('.v36-element.ice'),
      tipX:tip.x-ctr.x,tipY:tip.y-ctr.y,
      centerX:(ar.left+ar.width/2)-(br.left+br.width/2),
      centerY:(ar.top+ar.height/2)-(br.top+br.height/2),
      hasCorner:!!e,cornerContained:!e||e.left>=br.left-.5&&e.top>=br.top-.5&&e.right<=br.right+.5&&e.bottom<=br.bottom+.5,
      background:getComputedStyle(b).backgroundImage,
      motion:anim?getComputedStyle(anim).animationName:null,
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      shape:p.getAttribute('d'),html:host.innerText.slice(0,105)
     };
    });
    assert.equal(o.overflow,false,'no horizontal overflow '+width);
    assert.match(o.background,/radial-gradient/i,'real production badge must use rich icy or fiery dark backgrounds');
    assert.ok(Math.abs(o.centerX)<.75&&Math.abs(o.centerY)<.75,'exact centered arrow '+width);
    assert.equal(o.cornerContained,true,'corner effects wholly within badge '+width);
    assert.match(o.shape,/^M40 69V50H32L50 29L68 50H60V69Z$/,'short broad approved arrow');
    if(c.rookie){
     assert.equal(o.rookie,true);
     assert.equal(o.rookieNeutral,true);
     assert.equal(o.hasCorner,false);
     assert.equal(o.rotorAngle,undefined,'no rookie computed angle');
     assert.equal(o.rotorZ,undefined,'no rookie invented standard deviation');
     assert.equal(o.actualZ,'');
     assert.match(o.html,/Rookie Year/);
     assert.ok(o.tipX>6&&Math.abs(o.tipY)<2.4,'rookie neutral to right');
    }else{
     const p=structuredClone(data),row=p.players.find(x=>x.name==='Carosi, Justin');row.trend=c.z*sigma;
     const direction=engine.directionalArrow(row,p);
     assert.equal(direction.status,'VERIFIED_STANDARD_DEVIATION_ARROW');
     const expected=visual.angleFromZ(direction.zScore);
     assert.equal(o.category,direction.category,'workbook category unchanged');
     assert.ok(Math.abs(Number(o.angle)-expected)<1e-6,'actual source bearing '+c.z);
     assert.ok(Math.abs(Number(o.rotorAngle)-expected)<1e-6,'SVG rotor bearing '+c.z);
     assert.ok(Math.abs(Number(o.actualZ)-direction.zScore)<1e-12);
     assert.equal(Number(o.sourceSigma),sigma);
     assert.ok(Math.abs(Number(o.sourceTrend)-row.trend)<1e-12);
     if(c.z<0){assert.equal(o.ice,true);assert.equal(o.fire,false);assert.ok(o.tipY>0,'downward for '+c.z);}
     else if(c.z>0){assert.equal(o.fire,true);assert.equal(o.ice,false);assert.ok(o.tipY<0,'upward for '+c.z);}
     else{assert.equal(o.ice,false);assert.equal(o.fire,false);assert.ok(o.tipX>6&&Math.abs(o.tipY)<2.4,'neutral horizontal');}
     if(c.z!==0)assert.ok(o.motion&&o.motion!=='none','animated ice or fire '+c.z);
    }
    assert.deepEqual(errs,[],'no runtime errors');
    if(width===390 && (c.z===-2.75||c.z===0||c.z===1.4055420847317484)){
     const dest=process.env.BRAVE_V36_SCREENSHOT_DIR;
     if(dest)await page.screenshot({path:path.join(dest,c.z<0?'v36-cold-390.png':c.z>0?'v36-hot-390.png':'v36-neutral-390.png'),fullPage:true});
    }
    passes.push({width,z:c.z??null,angle:Number(o.angle),category:o.category,rookie:!!c.rookie});
   }catch(e){failures.push({width,scenario:c,error:e.message});}
  }
  // motion preferences must really stop motion in player Bio, not only the preview.
  await page.emulateMedia({reducedMotion:'reduce'});
  spec={z:1.15};
  try{
   await page.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1',{waitUntil:'domcontentloaded'});
   await page.locator('#bioProjectionTrend.bio-trend-ready .v36-flame-outer').waitFor({timeout:14000});
   const reduced=await page.locator('#bioProjectionTrend .v36-flame-outer')
      .evaluate(el=>getComputedStyle(el).animationName);
   assert.equal(reduced,'none','prefers-reduced-motion');
  }catch(e){failures.push({width,scenario:'reduced motion',error:e.message});}
  await page.close();
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 const unique=[...new Set(passes.filter(x=>x.width===390&&!x.rookie).map(x=>x.angle))];
 assert.ok(unique.length>=14,'14 distinct supplied z-score examples must keep distinct angles');
 console.log('BIO_V36_ANIMATION_QA',JSON.stringify({passed:passes.length,failures,sigma,uniqueAngles:unique.length,angleConvention:'0=up,90=right,180=down',sourceUnchanged:true}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
