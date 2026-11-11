/* Direct browser and device-width release gating, no HTO write or remote credentials.
 * Tests the actual homepage panel with a verified real feed shape and fictional variations.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
let pp;
try{pp=require('puppeteer');}catch{pp=require('C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');}
const widgets=path.resolve(__dirname,'../widgets');
const base=JSON.parse(fs.readFileSync(path.join(widgets,'projection.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
let scenario='current';
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(u.pathname),name=pathname.slice(1);
 if(name==='home-embedded-projection-gate.js'&&scenario==='gate404'){
   res.writeHead(404).end('source gate unavailable');return;
 }
 if(name==='projection.json'&&scenario==='projection503'){
   res.writeHead(503).end('readback unavailable');return;
 }
 if(name==='projection.json'&&scenario!=='current'){
   const f=JSON.parse(JSON.stringify(base));
   f.htoreadback=new Date().toISOString();
   f.modelCurrent=true;f.projectionComplete=true;f.publicationStatus='HTO_MODEL_CURRENT';
   f.modelParity={replayedRows:21,mismatches:0};
   f.sourceInputs.workbookRecordedTeamGP=f.sourceInputs.verifiedHTOBoxscoreGP;
   f.sourceInputs.htoRecordedTeamGP=f.sourceInputs.verifiedHTOBoxscoreGP;
   if(scenario==='modelHeld')f.modelCurrent=false;
   if(scenario==='missingParity')f.modelParity={replayedRows:21,mismatches:1};
   res.setHeader('Content-Type',mime['.json']);res.end(JSON.stringify(f));return;
 }
 const full=path.resolve(widgets,'.'+pathname);
 if(!full.startsWith(widgets+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(full,(e,b)=>{if(e){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(full)]||'text/plain');res.end(b);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const host='http://127.0.0.1:'+server.address().port;
 const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 const browser=await pp.launch({headless:true,executablePath:edge,args:['--no-sandbox']});
 let checks=0;
 async function pageFor(state,qs='panel=projection&embed=1',width=650){
  scenario=state;
  const p=await browser.newPage();await p.setViewport({width,height:800});
  await p.goto(host+'/home-panels.html?'+qs,{waitUntil:'networkidle2',timeout:30000});
  return p;
 }
 async function held(name,width=650){
  const p=await pageFor(name,'panel=projection&embed=1',width);
  try{
   await p.waitForFunction(()=>document.body.dataset.homeProjectionGate==='HELD',{timeout:12000});
   const s=await p.evaluate(()=>({
    status:document.getElementById('projection-state')?.textContent,
    note:document.getElementById('projection-note')?.textContent,
    forecast:document.getElementById('proj-total')?.textContent,
    summaryHidden:document.querySelector('#projection .summary')?.hidden,
    tableHidden:document.querySelector('#projection .projection-table')?.hidden,
    rows:document.querySelectorAll('#projection-rows tr').length,
    legendHidden:document.querySelector('#trend-legend')?.hidden,
    dispersionHidden:document.querySelector('#homeTeamDispersionDisclosure')?.hidden,
    scrollWidth:document.documentElement.scrollWidth,
    innerWidth:innerWidth
   }));
   assert.equal(s.status,'FORECAST HELD');assert.equal(s.forecast,'HELD');
   assert.match(s.note,/withheld/i);assert.equal(s.summaryHidden,true);
   assert.equal(s.tableHidden,true);assert.equal(s.legendHidden,true);
   assert.equal(s.dispersionHidden,true);assert.equal(s.rows,0);
   assert.ok(s.scrollWidth<=s.innerWidth+2,'viewport overflow at '+width+': '+JSON.stringify(s));
   console.log('PASS EMBED_HELD',name,width,s.status);
   checks++;
  }finally{await p.close();}
 }
 try{
  for(const width of [320,358,390,625,1280])await held('current',width);
  await held('modelHeld',390);
  await held('missingParity',390);
  await held('gate404',390);
  const p=await pageFor('reconciled','panel=projection&embed=1',390);
  try{
   await p.waitForFunction(()=>document.body.dataset.homeProjectionGate==='VERIFIED',{timeout:12000});
   const s=await p.evaluate(()=>({
    state:document.body.dataset.homeProjectionGate,
    text:document.getElementById('proj-total')?.textContent,
    summaryHidden:document.querySelector('#projection .summary')?.hidden,
    rows:document.querySelectorAll('#projection-rows tr').length
   }));
   assert.equal(s.text,String(base.total.points)+' PTS');assert.equal(s.summaryHidden,false);
   assert.ok(s.rows>0);console.log('PASS QUALIFIED_RENDER',s);checks++;
  }finally{await p.close();}
  const full=await pageFor('modelHeld','panel=projection&full=1',390);
  try{
   await full.waitForFunction(()=>document.getElementById('proj-total')?.textContent?.endsWith(' PTS'),{timeout:12000});
   const s=await full.evaluate(()=>({
    gate:document.body.dataset.homeProjectionGate||null,
    total:document.getElementById('proj-total')?.textContent
   }));
   assert.equal(s.gate,null);assert.equal(s.total,String(base.total.points)+' PTS');
   console.log('PASS STANDALONE_UNMODIFIED',s);checks++;
  }finally{await full.close();}
  const down=await pageFor('projection503','panel=projection&embed=1',390);
  try{
   await down.waitForFunction(()=>document.getElementById('projection-note')?.textContent?.includes('could not be validated'),{timeout:12000});
   assert.doesNotMatch(await down.$eval('#proj-total',e=>e.textContent),/ PTS/);
   console.log('PASS HTTP_503_FAIL_CLOSED');checks++;
  }finally{await down.close();}
  console.log('BROWSER_REGRESSION_PASSED '+checks+'/'+checks);
 }finally{await browser.close();}
})().catch(e=>{console.error('BROWSER_REGRESSION_FAILED',e.stack||e);process.exitCode=1;})
.finally(()=>server.close());
