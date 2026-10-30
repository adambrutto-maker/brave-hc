/* Read-only Black Ice HTO shell R3.2 simulation — new iframe injected
 * into disposable headless browser, not written to native HTO admin.
 */
const fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets"),out=path.resolve(__dirname,"../docs/screenshots");
fs.mkdirSync(out,{recursive:true});
const mime={".html":"text/html",".css":"text/css",".js":"application/javascript"};
const files=new Set(["game-centre-arena-r32.html","arena-power-r32.css","arena-power-r32-core.js","arena-power-r32.js"]);
const oldUrl="https://adambrutto-maker.github.io/brave-hc/widgets/game-centre-next.html?embed=1";
const newUrl="https://adambrutto-maker.github.io/brave-hc/widgets/game-centre-arena-r32.html?embed=1";
let browser;const checks=[];
(async()=>{
 browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 for(const [name,width,height] of [["desktop",1440,930],["tablet",768,1000],["mobile",390,844],["smallmobile",358,740]]){
  const page=await browser.newPage(),errors=[];
  await page.setViewport({width,height,isMobile:width<=390,hasTouch:width<=390,deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on("request",req=>{
   const url=new URL(req.url()),file=url.pathname.split("/").at(-1);
   if(url.hostname==="adambrutto-maker.github.io"&&files.has(file)){
    const local=path.join(root,file);
    return req.respond({status:200,contentType:mime[path.extname(file)],body:fs.readFileSync(local)});
   }
   req.continue().catch(()=>{});
  });
  page.on("pageerror",e=>errors.push(e.message));
  const res=await page.goto("https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=home",
   {waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(res.status(),200);
  await page.waitForSelector("#mod157965 iframe",{timeout:20000});
  const before=await page.evaluate(()=>{
   const frame=document.querySelector("#mod157965 iframe");
   return {src:frame.src,media:!!document.querySelector('#mod150050 iframe[src*="media-hot-stove"]'),
    weather:!!document.querySelector("#mod159192"),projections:!!document.querySelector("#mod34539"),
    originalScripts:document.querySelector("#mod157965 script")?.textContent||"",
    originalOrder:[...document.querySelectorAll("#mainArea .modWrapper")].map(x=>x.id)};
  });
  assert.equal(before.src,oldUrl);
  assert.ok(before.originalScripts.includes("event.origin")&&before.originalScripts.includes("event.source"));
  assert.ok(before.media&&before.weather&&before.projections);
  assert.deepEqual(before.originalOrder,["mod150050","mod157965","mod34539"]);
  await page.evaluate(url=>{
   const f=document.querySelector("#mod157965 iframe");
   f.src=url;
   f.style.height="1680px"; // original HTO initial reserve; handler must supersede
  },newUrl);
  await page.evaluate(()=>document.querySelector("#mod157965").scrollIntoView({block:"start",behavior:"instant"}));
  const frame=await page.waitForFrame(f=>f.url()===newUrl,{timeout:25000});
  await frame.waitForFunction(()=>window.HockeyOSArenaR32UI?.getState().loaded===true&&
   document.querySelectorAll("#arena-board-rows .arena-row").length===22,{timeout:25000,polling:100});
  const heights={};
  await frame.$eval("#centre-rankings",b=>b.click());
  for(const view of ["board","team","fit"]){
   if(view==="team")await frame.$eval('button[data-team-id="13679"]',b=>b.click());
   else if(view==="fit")await frame.$eval('button[data-arena-tab="fit"]',b=>b.click());
   const actual=await frame.$eval("#game-centre",x=>Math.ceil(x.getBoundingClientRect().height));
   await page.waitForFunction(v=>{
    const f=document.querySelector("#mod157965 iframe");
    return Math.abs(f.getBoundingClientRect().height-v)<25;
   },{timeout:8500,polling:100},actual);
   const host=await page.evaluate(()=>{
    const f=document.querySelector("#mod157965 iframe");
    return {height:Math.ceil(f.getBoundingClientRect().height),
     src:f.src,overflow:document.documentElement.scrollWidth>innerWidth+1,
     weather:!!document.querySelector("#mod159192"),media:!!document.querySelector("#mod150050"),
     projections:!!document.querySelector("#mod34539")};
   });
   assert.equal(host.src,newUrl);
   assert.ok(host.height<=2200&&!host.overflow&&host.weather&&host.media&&host.projections);
   heights[view]={inner:actual,host:host.height};
   await page.screenshot({path:path.join(out,"HTO_R32_simulated_"+name+"_"+view+".png"),fullPage:false});
  }
  await frame.$eval("#centre-lineup",b=>b.click());
  const pdf=await frame.$eval("#lineup-print",x=>({url:x.href,disabled:x.hasAttribute("aria-disabled")}));
  assert.ok(pdf.url.endsWith("brave-hc-blank-original-card.pdf")&&!pdf.disabled);
  await frame.$eval("#centre-standings",b=>b.click());
  assert.equal(await frame.$$eval("#standings-rows tr",r=>r.length),8);
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log("ARENA_R32_HTO_SHELL_PASS",name,"heights",JSON.stringify(heights));
  checks.push({name,width,before,heights,errors});
  await page.close();
 }
 fs.writeFileSync(path.resolve(__dirname,"../docs/QA_ArenaR32_HTOShell.json"),
   JSON.stringify({status:"PASS",checkedAt:new Date().toISOString(),productionModified:false,checks},null,2));
 console.log("ARENA_R32_HTO_SHELL_ALL_PASS",checks.length);
})().catch(e=>{console.error("ARENA_R32_HTO_SHELL_FAIL",e.stack);process.exitCode=1}).finally(async()=>{await browser?.close()});
