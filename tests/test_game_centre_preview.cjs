/* Game Centre r3 — local isolated HTTP QA, no production edits or releases. */
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets"),out=path.resolve(__dirname,"../docs");
fs.mkdirSync(out,{recursive:true});
const types={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
 const requested=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+requested);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{"Content-Type":types[path.extname(file)]||"text/plain","Cache-Control":"no-store"}).end(body)});
});
const cases=[["desktop",660],["hto",625],["tablet",768],["mobile",390],["smallmobile",358],["tight",326]];
let browser;const checks=[];
(async()=>{await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+server.address().port+"/game-centre-next.html?embed=1";
 browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 for(const [name,width] of cases){
  const errors=[],failed=[];
  const page=await browser.newPage();await page.setViewport({width,height:940,isMobile:width<=390,hasTouch:width<=390});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",res=>{if(res.status()>=400&&new URL(res.url()).hostname==="127.0.0.1"&&!res.url().endsWith("/favicon.ico"))failed.push({status:res.status(),url:res.url()})});
  const res=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});assert.equal(res.status(),200);
  await page.waitForFunction(()=>document.querySelectorAll("#standings-rows tr").length===8&&document.querySelectorAll("#ranking-rows tr").length!==-1,{timeout:18000,polling:200});
  const start=await page.evaluate(()=>{
   return {title:document.title,tabOrder:[...document.querySelectorAll(".tabs button")].map(b=>b.textContent.trim()),
    div:document.querySelector("#division-heading").textContent,
    standingsCount:document.querySelectorAll("#standings-rows tr").length,
    times:[...document.querySelectorAll("#goalie-rows tr td:nth-child(2)")].map(t=>t.textContent),
    clubs:[...document.querySelectorAll("#standings-rows tr")].map(r=>r.textContent),
    streaks:[...document.querySelectorAll("#standings-rows tr td:nth-child(8)")].map(t=>t.textContent),
    rowColumns:[...document.querySelectorAll("#standings-rows tr:first-child td")].map(t=>t.dataset.label),
    crestLoaded:document.querySelector("img.league-crest").complete&&document.querySelector("img.league-crest").naturalWidth>0,
    patchLoaded:document.querySelector("img.division-patch").complete&&document.querySelector("img.division-patch").naturalWidth>0};
  });
  assert.deepEqual(start.tabOrder,["Standings","Opponents","Lineup","Goaltenders","Power Rankings","Coaching"]);
  assert.equal(start.standingsCount,8);assert.ok(start.clubs.some(s=>s.includes("Braves HC")));
  assert.ok(start.streaks.some(s=>s.includes("Lost ")));assert.ok(start.streaks.some(s=>s.includes("Won ")));
  assert.ok(start.crestLoaded&&start.patchLoaded);
  assert.deepEqual(start.rowColumns,["Team","GP","W-L-T","Pts","Win %","GF","GA","Streak"]);
  assert.ok(start.times.every(s=>/^(\d{1,2}):\d{2} (AM|PM)$/.test(s)),start.times.join(","));
  const tabs={},heights={};
  for(const t of ["standings","opponent","lineup","goalies","rankings","coaching"]){
   await page.$eval("#centre-"+t,b=>b.click());
   await page.waitForFunction(t=>document.querySelector("#centre-"+t).getAttribute("aria-selected")==="true",{timeout:2000},t);
   const result=await page.evaluate(t=>({
    height:Math.ceil(document.querySelector("#game-centre").getBoundingClientRect().height),
    scrollWidth:document.documentElement.scrollWidth,
    selected:[...document.querySelectorAll(".tabs button[aria-selected=true]")].map(n=>n.dataset.tab),
    shown:[...document.querySelectorAll(".tab-panel:not([hidden])")].map(n=>n.dataset.name),
    content:document.querySelector("#centre-"+t+"-panel").innerText.slice(0,1000)
   }),t);
   assert.deepEqual(result.selected,[t]);assert.deepEqual(result.shown,[t]);assert.equal(result.scrollWidth,width,"horizontal overflow "+t+" "+width);
   heights[t]=result.height;tabs[t]=result;
   if(t==="lineup"){
    assert.equal(await page.$$eval(".lineup-slot",s=>s.length),16);
    const labels=await page.$$eval(".lineup-slot strong",s=>s.map(n=>n.textContent));
    assert.ok(labels.every(t=>t==="—"),"Unapproved lineup names unexpectedly published");
   }
   if(t==="opponent"){
    assert.ok(result.content.includes("Mid Ice Crisis"),"Default opponent missing");assert.ok(result.content.includes("Strength"),"Missing strength");
    await page.select("#opponent-select","Other Way");assert.ok((await page.$eval("#opponent-card",x=>x.textContent)).includes("Other Way"));
    await page.select("#opponent-select","Mid Ice Crisis");
   }
   if(t==="rankings"){
    const count=await page.$$eval("#rankings-rows tr",x=>x.length);assert.equal(count,8);
    await page.$eval("#rank-next",b=>b.click());
    assert.equal(await page.$eval("#rank-page",e=>e.textContent),"Page 2 / 3");
    await page.$eval("#rank-next",b=>b.click());
    assert.equal(await page.$$eval("#rankings-rows tr",x=>x.length),6);
    await page.$eval("#rank-prev",b=>b.click());
    await page.$eval("#rank-prev",b=>b.click());
    assert.ok((await page.$eval("#division-movements",x=>x.innerText)).includes("Cristillo"));
   }
   if(t==="coaching")assert.ok(result.content.includes("1–2–2"));
   await page.screenshot({path:path.join(out,"GameCentre_R3_"+name+"_"+t+".png"),fullPage:true});
  }
  await page.$eval("#centre-standings",b=>b.click());
  await page.select("#division-select","Fazzari Partners");assert.equal(await page.$$eval("#standings-rows tr",a=>a.length),6);
  await page.select("#division-select","Remax Division");assert.equal(await page.$$eval("#standings-rows tr",a=>a.length),8);
  await page.select("#division-select","The Cristillo Division");assert.equal(await page.$$eval("#standings-rows tr",a=>a.length),8);
  const all=await page.evaluate(()=>({htmlHeight:document.documentElement.scrollHeight,width:innerWidth,
   division:document.querySelector("#division-heading").textContent,rankStatus:document.querySelector("#rankings-status").textContent}));
  assert.equal(errors.length,0,"JS errors "+JSON.stringify(errors));
  assert.equal(failed.length,0,"missing local assets "+JSON.stringify(failed));
  console.log("GAMECENTRE_R3_PASS",name,width,"heights",JSON.stringify(heights));
  checks.push({name,width,start,heights,rankingsText:all.rankStatus,errors,failed});
  await page.close();
 }
 fs.writeFileSync(path.join(out,"QA_GameCentre_R3.json"),JSON.stringify({status:"PASS",testedAt:new Date().toISOString(),noProductionChange:true,checks},null,2));
 console.log("GAMECENTRE_R3_ALL_PASS",checks.length);
})().catch(err=>{console.error("GAMECENTRE_R3_FAIL",err.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
