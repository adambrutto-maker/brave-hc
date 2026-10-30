const fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets"),out=path.resolve(__dirname,"../docs/r31-qa");
fs.mkdirSync(out,{recursive:true});
const type={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json",".png":"image/png",".webp":"image/webp",".pdf":"application/pdf",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,"http://localhost").pathname),file=path.resolve(root,"."+u);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return}
  res.writeHead(200,{"Content-Type":type[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(data)});
});
const league=JSON.parse(fs.readFileSync(path.join(root,"league-intelligence.json"),"utf8"));
const eligible=league.teams.filter(t=>["The Cristillo Division","Remax Division","Fazzari Partners"].includes(t.divisionNow));
const emptyPdf=fs.readFileSync(path.join(root,"assets/lineups/brave-hc-blank-original-card.pdf"));
assert.equal(emptyPdf.subarray(0,5).toString(),"%PDF-");
assert.equal(eligible.length,22);
let browser;const checks=[];
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+server.address().port+"/game-centre-next.html";
 browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 for(const [name,width] of [["wide",1100],["hta",625],["mobile",390],["smallmobile",358],["tight",326]]){
  const page=await browser.newPage(),errors=[],missing=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400&&r.url().startsWith("http://127.0.0.1")&&!r.url().endsWith("favicon.ico"))missing.push({status:r.status(),url:r.url()})});
  await page.setViewport({width,height:960,isMobile:width<400,hasTouch:width<400});
  const resp=await page.goto(url,{waitUntil:"domcontentloaded",timeout:40000});assert.equal(resp.status(),200);
  await page.waitForFunction(()=>{
   return document.querySelectorAll("#standings-rows tr").length===8&&
    document.querySelectorAll("#rankings-rows tr").length===(innerWidth<=400?3:innerWidth<=900?4:8)&&
    document.querySelector("#lineup-print").href.endsWith(".pdf")&&
    !document.querySelector("#lineup-print").hasAttribute("aria-disabled")&&
    !document.querySelector("#lineup-pdf-preview").hidden&&document.querySelector("#lineup-pdf-preview").naturalWidth>0;
  },{timeout:24000,polling:100});
  const base=await page.evaluate(()=>{
   const api=window.BraveGameCentreTest;
   const synth=[40,50,60].map(x=>({strengthContext:{contextIndex:x}}));
   const c=api.calibrateSunday(synth);
   const same=api.calibrateSunday([3,3,3].map(x=>({strengthContext:{contextIndex:x}})));
   return {apiTest:[api.calibratedValue(40,c),api.calibratedValue(50,c),api.calibratedValue(60,c),api.calibratedValue(3,same),api.calibratedValue(null,c)],
    decimals:[api.hockeyPercent(.8),api.hockeyPercent(.625),api.hockeyPercent(1),api.hockeyPercent(0)],
    zeroGP:api.rate(5,0),
    columns:[...document.querySelectorAll(".ranking-table thead th")].map(th=>th.textContent.trim()),
    tabOrder:[...document.querySelectorAll(".tabs button")].map(b=>b.textContent.trim()),
    winRows:[...document.querySelectorAll("#standings-rows tr")].map(tr=>({team:tr.cells[0]?.innerText,pct:tr.cells[4]?.innerText})),
    logo:document.querySelector(".league-crest").naturalWidth>0,
    shield:document.querySelector(".division-patch").naturalWidth>0,
    shieldSrc:document.querySelector(".division-patch").getAttribute("src"),
    pdfFrame:document.querySelector("#lineup-pdf-frame").getAttribute("src"),
    print:document.querySelector("#lineup-print").getAttribute("href"),
    lineupNotice:document.querySelector("#lineup-notice").innerText,
    pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
    rankingCount:document.querySelectorAll("#ranking-mobile-list article").length};
  });
  assert.deepEqual(base.apiTest,[50,75,100,75,null]);
  assert.deepEqual(base.decimals,[".800",".625","1.000",".000"]);
  assert.equal(base.zeroGP,null);
  assert.equal(base.columns.length,10);
  assert.deepEqual(base.tabOrder,["Standings","Opponents","Lineup","Goaltenders","Power Rankings","Coaching"]);
  assert.ok(base.winRows.some(r=>r.team.includes("Mohawks")&&r.pct===".800"));
  assert.ok(base.winRows.some(r=>r.team.includes("Zamboner")&&r.pct===".625"));
  assert.ok(base.winRows.some(r=>r.team.includes("Braves")&&r.pct===".200"));
  assert.ok(base.shield&&base.shieldSrc.includes("/awards/cristillo-dedication.webp"));
  assert.ok(base.logo&&base.pdfFrame.includes("brave-hc-blank-original-card.pdf"));
  assert.ok(base.print.includes("brave-hc-blank-original-card.pdf"));
  assert.ok(base.lineupNotice.includes("Blank original")&&base.lineupNotice.includes("pending"));
  assert.equal(base.pageOverflow,false);
  await page.$eval("#centre-rankings",b=>b.click());
  await page.screenshot({path:path.join(out,"r31_"+name+"_rankings.png"),fullPage:true});
  // Default raw source strength ranking preserved; relative scale 50–100.
  const defaultFirst=await page.$eval("#rankings-rows tr:first-child",x=>x.innerText);
  assert.ok(defaultFirst.includes("Degenerates")&&defaultFirst.includes("100.0"),defaultFirst);
  const all=await page.evaluate(()=>window.BraveGameCentreTest.rankRows().map(t=>({
   name:t.leagueName,gp:t.record.gp,pts:t.record.pts,gf:t.record.gf,ga:t.record.ga,context:t.strengthContext.contextIndex})));
  assert.equal(all.length,22);
  // Mobile-visible sorting: select GA/GP ascending. Verify against source, not hardcoded names.
  await page.select("#rank-sort-select","gaPerGame:asc");
  const expected=[...eligible].sort((a,b)=>a.record.ga/a.record.gp-b.record.ga/b.record.gp||a.sourceTeamId-b.sourceTeamId)[0].leagueName;
  const sortedFirst=await page.$eval("#rankings-rows tr:first-child td:nth-child(2)",x=>x.textContent);
  assert.equal(sortedFirst,expected);
  await page.select("#rank-sort-select","ptsPerGame:desc");
  const got=await page.$eval("#rankings-rows tr:first-child td:nth-child(6)",x=>x.innerText);
  const max=Math.max(...eligible.map(t=>t.record.pts/t.record.gp)).toFixed(2);
  assert.equal(got,max);
  const allCols=await page.$eval("#rankings-rows tr:first-child",x=>[...x.cells].map(c=>c.textContent));
  assert.equal(allCols.length,10);assert.ok(/^[-+]?\d+\.\d{2}$/.test(allCols[8]));
  const pageSize=width<=400?3:width<=900?4:8,pages=Math.ceil(22/pageSize);
  await page.$eval("#rank-next",b=>b.click());
  assert.equal(await page.$eval("#rank-page",x=>x.innerText),"Page 2 / "+pages);
  for(let i=2;i<pages;i++)await page.$eval("#rank-next",b=>b.click());
  assert.equal(await page.$$eval("#rankings-rows tr",x=>x.length),22-pageSize*(pages-1));
  for(let i=1;i<pages;i++)await page.$eval("#rank-prev",b=>b.click());
  await page.$eval("#centre-lineup",b=>b.click());
  await page.screenshot({path:path.join(out,"r31_"+name+"_pdf.png"),fullPage:true});
  await page.$eval("#centre-standings",b=>b.click());
  await page.screenshot({path:path.join(out,"r31_"+name+"_standings.png"),fullPage:true});
  await page.select("#division-select","Fazzari Partners");
  assert.equal(await page.$$eval("#standings-rows tr",x=>x.length),6);
  await page.select("#division-select","The Cristillo Division");
  assert.equal(await page.$$eval("#standings-rows tr",x=>x.length),8);
  for(const tab of ["opponent","lineup","goalies","coaching"]){
   await page.$eval("#centre-"+tab,b=>b.click());
   const cur=await page.evaluate(()=>({
    active:[...document.querySelectorAll(".tabs button[aria-selected=true]")].map(x=>x.dataset.tab),
    hidden:document.documentElement.scrollWidth>innerWidth+1
   }));
   assert.deepEqual(cur.active,[tab]);assert.equal(cur.hidden,false);
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.equal(missing.length,0,JSON.stringify(missing));
  checks.push({name,width,winRows:base.winRows,apiTest:base.apiTest,rankingCols:base.columns,sortedByGaFirst:sortedFirst,pdf:base.print,errors,missing});
  console.log("ENG63_R31_VIEW_PASS",name,width,"GA/GP",sortedFirst,"PDF",base.print);
  await page.close();
 }
 fs.writeFileSync(path.join(out,"ENG63_R31_Standalone_QA.json"),JSON.stringify({state:"PASS",timestamp:new Date().toISOString(),noProductionChange:true,checks},null,2));
 console.log("ENG63_R31_ALL_PASS",checks.length);
})().catch(e=>{console.error("ENG63_R31_FAIL",e.stack);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
