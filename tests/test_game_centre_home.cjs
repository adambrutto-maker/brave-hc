/* Brave H.C. Game Centre standalone browser acceptance; no production writes. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let puppeteer;try{puppeteer=require('puppeteer')}catch{puppeteer=require('C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer')}
const root=path.resolve(__dirname,'../widgets'),out=path.resolve(__dirname,'../docs');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store'}).end(data)})});
let browser;const checks=[];
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/game-centre.html?embed=1';
 browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
 for(const [name,width] of [['desktop',660],['hto',625],['tablet',768],['mobile',390],['smallmobile',358],['tight',326]]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height:930,isMobile:width<400,hasTouch:width<400});
  const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});assert.equal(res.status(),200);
  await page.waitForFunction(()=>document.querySelectorAll('#standings-rows tr').length===4&&document.querySelectorAll('#goalie-rows tr').length===3,{timeout:15000});
  const basics=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,
    countdown:document.querySelector('iframe.countdown')?.src,
    goalies:[...document.querySelectorAll('#goalie-rows tr')].map(e=>e.innerText),
    standings:[...document.querySelectorAll('#standings-rows tr')].map(e=>e.innerText),
    tabCount:document.querySelectorAll('button[role=tab]').length,
    lineupText:document.querySelector('#lineup-notice')?.innerText,
    htoSchedule:document.querySelector('a[href*=\'p=schedule\']')?.href}));
  assert.equal(basics.width,width,'horizontal overflow');assert.equal(basics.tabCount,4);
  assert.ok(basics.countdown.endsWith('/countdown.html?embed=1'));assert.ok(basics.goalies[0].includes('Mid Ice Crisis'));
  assert.ok(basics.goalies.some(g=>g.includes('TBD')));assert.ok(basics.standings.some(g=>g.includes('Braves HC')));
  assert.ok(basics.lineupText.toLowerCase().includes('private')||basics.lineupText.toLowerCase().includes('manager'));
  const heights={},texts={},links={};
  for(const tab of ['goalies','lineup','standings','opponent']){
   await page.$eval('#centre-'+tab,b=>b.click());
   const state=await page.evaluate(tab=>({
    tabs:[...document.querySelectorAll('button[role=tab]')].map(e=>({name:e.dataset.tab,selected:e.getAttribute('aria-selected')})),
    panels:[...document.querySelectorAll('.tab-panel')].map(e=>({name:e.dataset.name,hidden:e.hidden})),
    height:Math.ceil(document.querySelector('#game-centre').getBoundingClientRect().height),
    width:document.documentElement.scrollWidth,
    text:document.querySelector('#centre-'+tab+'-panel').innerText,
    links:[...document.querySelectorAll('#centre-'+tab+'-panel a')].map(a=>a.href)
   }),tab);
   assert.equal(state.tabs.filter(t=>t.selected==='true').length,1);assert.equal(state.tabs.find(t=>t.selected==='true').name,tab);
   assert.equal(state.panels.filter(p=>!p.hidden).length,1);assert.equal(state.width,width);
   heights[tab]=state.height;texts[tab]=state.text.slice(0,300);links[tab]=state.links;
   if(tab==='opponent'){assert.ok(state.text.includes('Mid Ice Crisis'));assert.ok(state.text.includes('League pts'));assert.ok(state.text.includes('HISTORICAL'));await page.screenshot({path:path.join(out,'GameCentre_Compact_OPP_'+name+'.png'),fullPage:true})}
   if(tab==='lineup')assert.ok(!state.text.includes('Stephen Logue'));
  }
  await page.$eval('#centre-goalies',b=>b.click());
  await page.screenshot({path:path.join(out,'GameCentre_Compact_'+name+'.png'),fullPage:true});
  assert.equal(errors.length,0,'JS errors '+errors);
  const maxHeight=Math.max(...Object.values(heights));assert.ok(maxHeight<900,'compact module too tall '+maxHeight);
  checks.push({name,width,basics,heights,maxHeight,texts,links,errors});
  console.log('GAMECENTRE_COMPACT_PASS',name,'heights',JSON.stringify(heights),'max',maxHeight);
  await page.close();
 }
 fs.writeFileSync(path.join(out,'QA_GameCentre_Standalone.json'),JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),productionChanged:false,checks},null,2));
 console.log('GAMECENTRE_COMPACT_ALL_PASS',checks.length);
})().catch(e=>{console.error('GAMECENTRE_COMPACT_FAIL',e.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
