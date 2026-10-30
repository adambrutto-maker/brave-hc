/* HockeyOS Arena R3.2 isolated standalone acceptance.
 * Serves local code and official public-feed snapshots, without HTO writes.
 */
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets"),out=path.resolve(__dirname,"../docs/screenshots");fs.mkdirSync(out,{recursive:true});
const types={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".svg":"image/svg+xml",".webp":"image/webp",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return}
  res.writeHead(200,{"Content-Type":types[path.extname(file)]||"text/plain","Cache-Control":"no-store"}).end(data)});
});
let browser;const checks=[];
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+server.address().port+"/game-centre-arena-r32.html?embed=1";
 browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 for(const [name,width] of [["wide",1100],["hta",625],["tablet",768],["mobile",390],["smallmobile",358],["tight",326]]){
  const page=await browser.newPage(),errors=[],assets=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400&&r.url().startsWith("http://127.0.0.1")&&!r.url().endsWith("favicon.ico"))assets.push({status:r.status(),url:r.url()})});
  await page.setViewport({width,height:960,isMobile:width<=390,hasTouch:width<=390,deviceScaleFactor:1});
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.HockeyOSArenaR32UI?.getState().loaded===true&&
   document.querySelectorAll("#arena-board-rows .arena-item").length===22&&
   document.querySelectorAll("#standings-rows tr").length===8,{timeout:25000,polling:100});
  await page.$eval("#centre-rankings",e=>e.click());
  const board=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll("#arena-board-rows .arena-row")];
   const bad=cards.some(x=>!x.querySelector(".arena-rating"));
   const root=document.querySelector("#game-centre");
   return {
    rankCount:cards.length,
    sourceState:window.HockeyOSArenaR32UI.getState(),
    hero:document.querySelector(".arena-hero h3").textContent,
    hiddenLegacy:document.querySelector("#arena-r32-legacy").hidden,
    firstRow:cards[0].textContent,braves:cards.find(b=>b.textContent.includes("Braves HC"))?.textContent,
    lastRow:cards.at(-1).textContent,badges:cards.map(b=>({
     text:b.querySelector(".arena-rating").textContent,
     bg:b.querySelector(".arena-rating").style.backgroundColor,
     fg:b.querySelector(".arena-rating").style.color
    })),
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    height:Math.ceil(root.getBoundingClientRect().height),
    stalePaginatorHidden:getComputedStyle(document.querySelector("#arena-r32-legacy")).display==="none",
    bad
   };
  });
  assert.equal(board.rankCount,22);assert.equal(board.sourceState.teamCount,22);
  assert.equal(board.hiddenLegacy,true);assert.equal(board.stalePaginatorHidden,true);
  assert.ok(board.firstRow.includes("Degenerates")&&board.lastRow.includes("Maplewolves"));
  assert.ok(board.braves?.includes("Braves HC"));assert.ok(!board.bad);
  assert.equal(board.overflow,false);assert.ok(board.height<=2200,"board height exceeds HTO listener at "+name+": "+board.height);
  await page.screenshot({path:path.join(out,"ArenaR32_"+name+"_board.png"),fullPage:true});
  // All divisions (6,8,8) selectable, no page chunking.
  for(const [division,expected] of [["Fazzari Partners",6],["The Cristillo Division",8],["Remax Division",8],["ALL",22]]){
   await page.select("#arena-division-filter",division);
   assert.equal(await page.$$eval("#arena-board-rows .arena-item",xs=>xs.length),expected);
  }
  await page.select("#arena-sort","ptsPerGame");
  const ptsLeader=await page.$eval("#arena-board-rows .arena-row:first-child",e=>e.textContent);
  assert.ok(ptsLeader.includes("Degenerates"),ptsLeader);
  await page.select("#arena-sort","strength");
  await page.$eval('button[data-team-id="13679"]',e=>e.click());
  const braves=await page.evaluate(()=>({
   view:window.HockeyOSArenaR32UI.getState().view,
   title:document.querySelector(".arena-team-identity h4")?.textContent,
   body:document.querySelector("#arena-team-profile")?.innerText,
   height:Math.ceil(document.querySelector("#game-centre").getBoundingClientRect().height),
   overflow:document.documentElement.scrollWidth>innerWidth+1
  }));
  assert.equal(braves.view,"team");assert.equal(braves.title,"Braves HC");
  assert.ok(braves.body.includes("DIVISION RANK")&&braves.body.includes("SUNDAY RANK"));
  assert.ok(braves.body.includes("FORM · WATCH")&&braves.body.includes("4 GP"));
  assert.ok(braves.body.includes("opponents")&&braves.body.includes("Remax"));
  assert.ok(!braves.body.includes("Played better after moving"));
  assert.equal(braves.overflow,false);assert.ok(braves.height<=2200,"team height exceeds 2200");
  await page.screenshot({path:path.join(out,"ArenaR32_"+name+"_team.png"),fullPage:true});
  await page.select("#arena-team-select","13709");
  const sugo=await page.$eval("#arena-team-profile",e=>e.innerText);
  assert.ok(sugo.includes("Sugo Sundays")&&sugo.includes("Cristillo → Remax")&&sugo.includes("HELD"));
  await page.select("#arena-team-select","13649");
  const big=await page.$eval("#arena-team-profile",e=>e.innerText);
  assert.ok(big.includes("1 verified game(s) against clubs outside"),big);
  await page.$eval('button[data-arena-tab="fit"]',e=>e.click());
  const fit=await page.evaluate(()=>({
   view:window.HockeyOSArenaR32UI.getState().view,
   status:document.querySelector("#arena-fit-status")?.textContent,
   body:document.querySelector("#arena-fit")?.innerText,
   divisions:document.querySelectorAll("#arena-fit-divisions .arena-division-card").length,
   height:Math.ceil(document.querySelector("#game-centre").getBoundingClientRect().height),
   overflow:document.documentElement.scrollWidth>innerWidth+1
  }));
  assert.equal(fit.view,"fit");assert.equal(fit.divisions,3);
  assert.ok(fit.status.includes("NOT READY"));
  assert.ok(fit.body.includes("Sugo Sundays")&&fit.body.includes("Maplewolves"));
  assert.ok(fit.body.includes("EXPERIMENTAL")&&fit.body.includes("NOT OFFICIAL")||fit.body.includes("NO OFFICIAL"));
  assert.equal(fit.overflow,false);assert.ok(fit.height<=2200,"fit height exceeds 2200: "+fit.height);
  await page.screenshot({path:path.join(out,"ArenaR32_"+name+"_fit.png"),fullPage:true});
  await page.$eval('button[data-arena-tab="board"]',e=>e.click());
  assert.equal(await page.$$eval("#arena-board-rows .arena-item",xs=>xs.length),22);
  // Regression gates for original Game Centre: 6 tabs, verified authentic PDF.
  const regression=await page.evaluate(()=>({
   tabs:[...document.querySelectorAll(".tabs button")].map(e=>e.dataset.tab),
   pdf:document.querySelector("#lineup-print").getAttribute("href"),
   pdfDisabled:document.querySelector("#lineup-print").hasAttribute("aria-disabled"),
   standings:document.querySelectorAll("#standings-rows tr").length,
   nativeSourceScripts:[...document.querySelectorAll("script[src]")].filter(x=>x.src.includes("arena-power")).length
  }));
  assert.deepEqual(regression.tabs,["standings","opponent","lineup","goalies","rankings","coaching"]);
  assert.ok(regression.pdf.endsWith("brave-hc-blank-original-card.pdf")&&!regression.pdfDisabled);
  assert.equal(regression.standings,8);assert.equal(regression.nativeSourceScripts,2);
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(assets.length,0,JSON.stringify(assets));
  console.log("ARENA_R32_UI_PASS",name,width,"board",board.height,"team",braves.height,"fit",fit.height,"rows",board.rankCount);
  checks.push({name,width,board:{height:board.height,count:board.rankCount,firstRow:board.firstRow,lastRow:board.lastRow},
   team:{height:braves.height,title:braves.title},fit:{height:fit.height,status:fit.status},regression,errors,assets});
  await page.close();
 }
 const evidence={status:"PASS",checkedAt:new Date().toISOString(),noProductionWrites:true,checks};
 fs.writeFileSync(path.resolve(__dirname,"../docs/QA_ArenaR32_Browser.json"),JSON.stringify(evidence,null,2));
 console.log("ARENA_R32_UI_ALL_PASS",checks.length);
})().catch(e=>{console.error("ARENA_R32_UI_FAIL",e.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
