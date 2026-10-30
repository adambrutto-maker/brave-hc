/* Read-only live Black Ice HTO browser simulation: candidate game centre sourced from local branch.
 * Never writes to native HTO. Mocked GitHub Pages asset responses only in disposable browser.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let puppeteer;try{puppeteer=require('puppeteer')}catch{puppeteer=require('C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer')}
const root=path.resolve(__dirname,'../widgets'),out=path.resolve(__dirname,'../docs');fs.mkdirSync(out,{recursive:true});
const base='https://adambrutto-maker.github.io/brave-hc/widgets/game-centre.html?embed=1';
const style='display:block;width:100%;height:clamp(850px, calc(990px - 28vw), 870px);max-width:850px;margin:0 auto;border:0;background:#06101e;overflow:hidden;';
const files=new Set(['game-centre.html','game-centre.css','game-centre.js']);
const contentTypes={'.html':'text/html','.css':'text/css','.js':'application/javascript'};
let browser;const checks=[];
(async()=>{browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
for(const [name,width,height] of [['desktop',1440,930],['tablet',768,1000],['mobile',390,844],['smallmobile',358,740]]){
 const page=await browser.newPage();const errors=[];await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<=390,hasTouch:width<=390});
 await page.setRequestInterception(true);
 page.on('request',req=>{const url=new URL(req.url()),file=url.pathname.split('/').pop();
  if(url.hostname==='adambrutto-maker.github.io'&&files.has(file)){
   const body=fs.readFileSync(path.join(root,file));
   return req.respond({status:200,contentType:contentTypes[path.extname(file)],body});
  }
  req.continue().catch(()=>{});
 });
 page.on('pageerror',e=>{if(String(e.message).includes('game-centre'))errors.push(String(e.message))});
 const res=await page.goto('https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=home',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(res.status(),200);
 const before=await page.evaluate(()=>({
  moduleOrder:[...document.querySelectorAll('#mainArea .modWrapper')].map(e=>e.id),
  weather:!!document.getElementById('mod159192'),
  navCount:document.querySelectorAll('ul.navRowLinks a').length,
  mediaURL:document.querySelector('#mod150050 iframe')?.src
 }));
 assert.deepEqual(before.moduleOrder.slice(0,4),['mod150050','mod157965','mod25330','mod149670']);
 await page.evaluate(({base,style})=>{
  const mod=document.getElementById('mod157965'),outer=mod.querySelector('.modContent');
  const fr=document.createElement('iframe');fr.src=base;fr.setAttribute('height','870');fr.setAttribute('width','100%');fr.setAttribute('title','Brave H.C. Game Centre');fr.setAttribute('scrolling','no');fr.setAttribute('loading','eager');fr.setAttribute('style',style);
  outer.replaceChildren(fr);
  const title=mod.querySelector('.modTitle-inner');if(title)title.textContent='Game Centre';
  document.getElementById('mod25330').remove();document.getElementById('mod149670').remove();
 },{base,style});
 await page.waitForSelector('#mod157965 iframe[src*=\'game-centre\']',{timeout:15000});
 const inner=await page.waitForFrame(f=>f.url().includes('game-centre.html'),{timeout:20000});assert.ok(inner,'new Game Centre iframe missing');
 try{await page.evaluate(()=>document.getElementById('mod157965').scrollIntoView({block:'start',behavior:'instant'}));await inner.waitForFunction(()=>document.querySelectorAll('#goalie-rows tr').length===3&&document.querySelectorAll('#standings-rows tr').length===4,{timeout:30000,polling:250});}catch(err){console.log('FRAME_LOAD_DIAG',name,inner.url(),JSON.stringify(await inner.evaluate(()=>({title:document.title,body:document.body?.innerText.slice(0,1000),goalieRows:document.querySelectorAll('#goalie-rows tr').length,standingsRows:document.querySelectorAll('#standings-rows tr').length,jsLoaded:!!window.BraveGameCentreTest}))),errors);await page.screenshot({path:path.join(out,'GameCentre_HTOShell_FAILURE_'+name+'.png'),fullPage:false});throw err}
 const host=await page.evaluate(()=>{
  const e=document.querySelector('#mod157965 iframe'),r=e.getBoundingClientRect();
  return {height:Math.round(r.height),width:Math.round(r.width),src:e.src,
   pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
   weather:!!document.getElementById('mod159192'),
   oldGoalie:!!document.getElementById('mod25330'),
   oldStandings:!!document.getElementById('mod149670'),
   mediaUnchanged:document.querySelector('#mod150050 iframe')?.src.includes('media-hot-stove.html'),
   analyticsPresent:!!document.getElementById('mod34539'),
   mainOrder:[...document.querySelectorAll('#mainArea .modWrapper')].map(x=>x.id),
   navCount:document.querySelectorAll('ul.navRowLinks a').length};
 });
 assert.ok(host.src===base);assert.ok(!host.pageOverflow);assert.ok(host.weather&&host.mediaUnchanged&&host.analyticsPresent);
 assert.equal(host.oldGoalie,false);assert.equal(host.oldStandings,false);assert.equal(host.navCount,before.navCount);
 const content={};
 for(const tab of ['goalies','lineup','standings','opponent']){
  await inner.$eval('#centre-'+tab,b=>b.click());
  content[tab]=await inner.evaluate(()=>({height:Math.ceil(document.getElementById('game-centre').getBoundingClientRect().height),
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   selected:document.querySelector('button[role=tab][aria-selected=true]')?.dataset.tab,
   activeText:document.querySelector('.tab-panel:not([hidden])')?.innerText.slice(0,240)}));
  assert.equal(content[tab].selected,tab);assert.equal(content[tab].overflow,false);
  assert.ok(content[tab].height<=host.height,tab+' clipped '+content[tab].height+' / '+host.height);
 }
 await inner.$eval('#centre-goalies',b=>b.click());
 await page.evaluate(()=>document.querySelector('#mod157965').scrollIntoView({block:'start',behavior:'instant'}));
 await page.screenshot({path:path.join(out,'GameCentre_HTO_Shell_'+name+'.png'),fullPage:true});
 const result={name,width,before,host,content,errors};checks.push(result);
 console.log('GAMECENTRE_HTO_SHELL_PASS',name,JSON.stringify({frame:host.height,max:Math.max(...Object.values(content).map(e=>e.height)),media:host.mediaUnchanged,weather:host.weather,legacyRemoved:!host.oldGoalie&&!host.oldStandings}));
 await page.close();
}
fs.writeFileSync(path.join(out,'QA_GameCentre_HTOShell.json'),JSON.stringify({status:'PASS',productionChanged:false,verifiedAt:new Date().toISOString(),embedURL:base,embedStyle:style,checks},null,2));
console.log('GAMECENTRE_HTO_SHELL_ALL_PASS',checks.length);
})().catch(e=>{console.error('GAMECENTRE_HTO_SHELL_FAIL',e.stack);process.exitCode=1}).finally(async()=>{await browser?.close()});
