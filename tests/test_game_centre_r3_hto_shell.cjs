/* Game Centre r3 — exact public HTO shell with local asset interception.
 * Browses public HTO read-only; simulates the proposed parent message listener,
 * never edits HTO or official records.
 */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets"),out=path.resolve(__dirname,"../docs");
const files=new Set(["game-centre.html","game-centre.css","game-centre.js","official_svhl_logo.png"]);
const MIME={".html":"text/html",".css":"text/css",".js":"application/javascript",".png":"image/png"};
let browser;const checks=[];
(async()=>{
 browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 for(const [name,width,height] of [["desktop",1440,950],["tablet",768,1000],["mobile",390,844],["smallmobile",358,740]]){
  const page=await browser.newPage(),errors=[];
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<400,hasTouch:width<400});
  await page.setRequestInterception(true);
  page.on("request",r=>{
   const u=new URL(r.url()),fname=u.pathname.split("/").pop();
   if(u.hostname==="adambrutto-maker.github.io"&&files.has(fname)){
    const loc=fname==="official_svhl_logo.png"?path.join(root,"assets","official_svhl_logo.png"):path.join(root,fname);
    return r.respond({status:200,contentType:MIME[path.extname(loc)],body:fs.readFileSync(loc)});
   }
   r.continue().catch(()=>{});
  });
  page.on("pageerror",e=>errors.push(String(e.message)));
  const res=await page.goto("https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=home",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(res.status(),200);
  const sel="#mod157965 iframe[src*='game-centre.html']";await page.waitForSelector(sel,{timeout:20000});
  await page.evaluate(()=>{
   const f=document.querySelector("#mod157965 iframe");
   window.__gcEvents=[];
   window.addEventListener("message",event=>{
    if(event.origin!=="https://adambrutto-maker.github.io"||event.source!==f.contentWindow||
       event.data?.type!=="brave-hc.gamecentre.height")return;
    const h=Number(event.data.height);
    if(!Number.isFinite(h)||h<450||h>2200)return;
    f.style.height=h+"px";window.__gcEvents.push(h);
   });
   f.style.height="870px";f.src=f.src;
  });
  const frame=await page.waitForFrame(f=>f.url().includes("game-centre.html"),{timeout:25000});
  await page.evaluate(()=>document.querySelector("#mod157965").scrollIntoView({block:"start",behavior:"instant"}));
  await frame.waitForFunction(()=>document.querySelectorAll("#standings-rows tr").length===8,{timeout:30000,polling:200});
  const heights={};
  for(const tab of ["standings","opponent","lineup","goalies","rankings","coaching"]){
   await frame.$eval("#centre-"+tab,b=>b.click());
   await page.waitForFunction(()=>{
    const f=document.querySelector("#mod157965 iframe"),frame=window.__gcEvents;
    return frame&&frame.length>=1&&f.getBoundingClientRect().height>400;
   },{timeout:5000});
   const inner=await frame.evaluate(()=>Math.ceil(document.querySelector("#game-centre").getBoundingClientRect().height));
   await page.waitForFunction(inner=>{
    const frame=document.querySelector("#mod157965 iframe");
    return Math.abs(frame.getBoundingClientRect().height-inner)<25;
   },{timeout:6000,polling:80},inner);
   const host=await page.evaluate(()=>({
     frameHeight:Math.ceil(document.querySelector("#mod157965 iframe").getBoundingClientRect().height),
     outerOverflow:document.documentElement.scrollWidth>innerWidth+1,
     weather:!!document.querySelector("#mod159192"),media:!!document.querySelector('#mod150050 iframe[src*="media-hot-stove"]'),
     oldGoalie:!!document.querySelector("#mod25330"),oldStandings:!!document.querySelector("#mod149670"),
     projected:!!document.querySelector("#mod34539")
   }));
   assert.ok(!host.outerOverflow&&host.weather&&host.media&&host.projected&&!host.oldGoalie&&!host.oldStandings);
   heights[tab]={inner,host:host.frameHeight};
   if(["standings","opponent","rankings"].includes(tab)){await page.screenshot({path:path.join(out,"GameCentre_R3_HTO_"+name+"_"+tab+".png"),fullPage:false})}
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log("GAMECENTRE_R3_HTO_PASS",name,JSON.stringify(heights));
  checks.push({name,width,heights});
  await page.close();
 }
 fs.writeFileSync(path.join(out,"QA_GameCentre_R3_HTO_Shell.json"),JSON.stringify({status:"PASS",checkedAt:new Date().toISOString(),productionChanged:false,checks},null,2));
 console.log("GAMECENTRE_R3_HTO_ALL_PASS",checks.length);
})().catch(e=>{console.error("GAMECENTRE_R3_HTO_FAIL",e.stack);process.exitCode=1}).finally(async()=>{await browser?.close()});
