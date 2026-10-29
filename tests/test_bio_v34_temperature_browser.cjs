'use strict';
/* V3.4 presentation QA: synthetic trend readings are intercepted in the local
 * browser ONLY. No production or saved workbook projection data is mutated. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const data=require('../widgets/projection.json');
const sigma=data.conditionalFormatting.sampleStandardDeviation;
const mime={'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);return res.end('Unavailable');}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(bytes);
 });
});
const cases=[
 {z:0,category:'Neutral',badge:null},
 {z:.6,category:'Warm',badge:'flame'},
 {z:1.15,category:'Hot',badge:'flame'},
 {z:2,category:'Hot',badge:'flame'},
 {z:-1.15,category:'Cool',badge:'ice'},
 {z:-1.8,category:'Cool',badge:'ice'},
 {z:-2.2,category:'Cold',badge:'ice'},
 {z:-2.75,category:'Cold',badge:'ice'}
];
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 let total=0;
 try{
  const readings={};
  for(const width of [320,390]){
   for(const spec of cases){
    const p=await browser.newPage({viewport:{width,height:850}}),errors=[];
    p.on('pageerror',err=>errors.push(err.message));
    await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await p.route('**/projection.json*',r=>{
     const snapshot=structuredClone(data);
     const carosi=snapshot.players.find(v=>v.name==='Carosi, Justin');
     assert.ok(carosi);
     carosi.trend=spec.z*sigma;
     return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot)});
    });
    await p.goto(origin+'/widgets/player-bio.html?playerID=354060&embed=1',{waitUntil:'domcontentloaded'});
    await p.locator('#bioProjectionTrend.bio-trend-ready .bio-trend-arrow-inset').waitFor({timeout:18000});
    const v=await p.evaluate(()=>{
     const host=document.querySelector('#bioProjectionTrend');
     const inset=host.querySelector('.bio-trend-arrow-inset');
     const svg=inset.querySelector('svg.bio-trend-direction-arrow');
     const group=svg.querySelector('g[data-arrow-angle]'),paint=group.querySelectorAll('path')[1];
     const badge=inset.querySelector('.bio-trend-temperature-badge');
     const puddle=badge?.querySelector('[data-ice-puddle]');
     const cube=badge?.querySelector('[data-ice-cube]');
     const ib=inset.getBoundingClientRect(),ab=svg.getBoundingClientRect();
     return {category:host.dataset.trendState,angle:Number(group.dataset.arrowAngle),
      z:Number(group.dataset.zScore),arrowFill:paint.getAttribute('fill'),
      inset:inset.dataset.arrowCategory,badge:badge?.dataset.temperature||null,
      accent:badge?.style.getPropertyValue('--temp-accent')||null,
      intensity:Number(badge?.dataset.intensity||0),
      scale:Number(badge?.style.getPropertyValue('--temp-scale')||1),
      iceCube:Number(cube?.dataset.cubeScale||0),
      puddle:Number(puddle?.getAttribute('opacity')||0),
      flameStops:badge?.querySelectorAll('linearGradient stop').length||0,
      insetGradient:getComputedStyle(inset).backgroundImage,
      centered:Math.abs((ib.left+ib.width/2)-(ab.left+ab.width/2))<1.5 &&
       Math.abs((ib.top+ib.height/2)-(ab.top+ab.height/2))<1.5,
      noOverflow:document.documentElement.scrollWidth<=innerWidth+1};
    });
    assert.equal(v.category,spec.category,'category '+spec.z);
    assert.equal(v.inset,spec.category);
    assert.equal(v.badge,spec.badge,'badge '+spec.z);
    assert.ok(Math.abs(v.angle-Math.max(-60,Math.min(60,spec.z*30)))<.0002,'angle '+spec.z);
    assert.ok(Math.abs(v.z-spec.z)<.0002,'source z-score '+spec.z);
    assert.equal(v.centered,true,'centered arrow '+spec.z+'/'+width);
    assert.equal(v.noOverflow,true,'no overflow '+spec.z+'/'+width);
    assert.match(v.insetGradient,/gradient/i);
    if(spec.badge){
     assert.equal(v.arrowFill,v.accent,'arrow and badge use same temperature '+spec.z);
     assert.equal(v.flameStops,3,'layered gradients required '+spec.z);
     assert.ok(v.scale>=.84&&v.scale<=1.001,'subtle icon scaling '+spec.z);
    }
    if(spec.badge==='ice'){
     assert.ok(v.iceCube>=.58&&v.iceCube<=1.001);
     assert.ok(v.puddle>=0&&v.puddle<=.75);
    }
    assert.deepEqual(errors,[],spec.z+'/'+width);
    readings[spec.z]=v;
    total++;await p.close();
   }
  }
  assert.ok(readings['0.6'].scale<readings['1.15'].scale,'flame scales with warmth');
  assert.ok(readings['1.15'].scale<readings['2'].scale,'flame scales into hottest state');
  assert.ok(readings['-1.15'].iceCube<readings['-1.8'].iceCube,'cooler grows the ice cube');
  assert.ok(readings['-1.8'].iceCube<readings['-2.75'].iceCube,'coldest cube is solid');
  assert.ok(readings['-1.15'].puddle>readings['-1.8'].puddle,'melting puddle decreases');
  assert.ok(readings['-1.8'].puddle>readings['-2.75'].puddle,'deep ice has no puddle');
  assert.equal(readings['-2.75'].puddle,0,'solid ice never displays puddle');
  console.log('BIO_V34_TEMPERATURE_QA_PASS '+JSON.stringify({scenarios:total,anglesUnchanged:true,
    ascent:'yellow-orange-red',descent:'melting-pale-blue-to-solid-deep-blue',workbookUnchanged:true}));
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
