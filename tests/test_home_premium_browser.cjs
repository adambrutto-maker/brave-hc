/* Browser regression checks for premium Brave H.C. home panels.
 * Run: node tests/test_home_premium_browser.cjs (puppeteer available).
 * Uses a local HTTP server and never changes the HTO website.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets");
let puppeteer;
try{puppeteer=require("puppeteer")}catch(err){throw new Error("Browser QA needs puppeteer (NODE_PATH supported): "+err.message)}
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 const full=path.resolve(root,"."+pathname);
 if(!full.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(full,(e,buf)=>{if(e){res.writeHead(404).end();return}res.setHeader("Content-Type",types[path.extname(full)]||"text/plain");res.end(buf)});
});
const chrome=["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find(fs.existsSync);
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url="http://127.0.0.1:"+server.address().port;
 const browser=await puppeteer.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:["--no-sandbox"]});
 try{
  const page=await browser.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewport({width:650,height:860});
  await page.goto(url+"/home-panels.html?panel=standings",{waitUntil:"networkidle0"});
  const teams=await page.$$eval("#standings-rows tr",r=>r.length);
  assert.equal(teams,8,"all eight division teams included");
  const first=await page.$eval("#standings-rows tr",e=>e.textContent);
  assert.ok(first.includes("19")&&first.includes("11")&&first.includes(".750"),"complete GF/GA/WIN% displayed");
  await page.click("#tab-intel");
  assert.equal(await page.$eval("#intel-view",e=>e.hidden),false);
  const optionCount=await page.$$eval("#opponent option",n=>n.length);
  assert.equal(optionCount,7,"all 7 opponents selectable");
  await page.select("#opponent","Mid Ice Crisis");
  assert.equal(await page.$eval("#intel-team",e=>e.textContent),"Mid Ice Crisis");
  assert.equal(await page.$eval("#headtohead-section",e=>e.hidden),true,"head-to-head withheld until master-workbook source is verified");
  assert.ok((await page.$eval("#intel-metrics",e=>e.textContent)).includes("Historical identity verification"),"opponent intelligence is fail-closed");
  await page.setViewport({width:358,height:690});
  await page.click("#tab-standing");
  const isMobile=await page.$eval(".standings-table tr:nth-child(1)",e=>getComputedStyle(e).display==="grid");
  assert.equal(isMobile,true,"mobile standings use readable card rows");
  await page.goto(url+"/home-panels.html?panel=projection",{waitUntil:"networkidle0"});
  assert.equal(await page.$$eval("#projection-rows tr:not(.details)",n=>n.length),22,"full model roster");
  const legend=await page.$$eval("#trend-legend svg",n=>n.length);assert.equal(legend,5);
  const colours=await page.$$eval(".trend-button svg path",ps=>[...new Set(ps.map(p=>p.getAttribute("fill")))]);
  assert.ok(colours.some(c=>["#f0344d","#dc7383"].includes(c)),"red hot/warm arrow");
  assert.ok(colours.some(c=>["#217fd4","#79bdec"].includes(c)),"blue cold/cool arrow");
  const firstRow=await page.$eval("#projection-rows tr:not(.details)",e=>e.textContent);
  assert.ok(firstRow.includes("(")&&firstRow.includes(")"),"actuals in parentheses");
  const firstButton=await page.$(".trend-button");
  await firstButton.click();
  assert.equal(await page.$eval(".details",e=>e.hidden),false,"tap-to-expand accessible");
  const projected=await page.$eval("#projection-note",e=>e.textContent);
  assert.ok(/unreconciled workbook model|Forecasts and displayed actuals are not up to date|reconciled to/.test(projected),"accurate model freshness disclaimer");
  assert.equal(await page.$eval("#proj-games",e=>e.textContent),"5","latest HTO GP displayed");
  assert.ok(firstRow.includes("(4)")&&firstRow.includes("(5)"),"latest HTO current goals and points used for Carosi");
  assert.deepEqual(errors,[],"no browser script failures");
  const out=path.resolve(__dirname,"..",".qa-output");fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,"projection-mobile.png"),fullPage:true});
  await page.setViewport({width:650,height:900});
  await page.goto(url+"/home-panels.html?panel=standings",{waitUntil:"networkidle0"});
  await page.screenshot({path:path.join(out,"standings-desktop.png"),fullPage:true});
  await page.click("#tab-intel");
  await page.screenshot({path:path.join(out,"opponent-desktop.png"),fullPage:true});
  console.log(JSON.stringify({ok:true,teams,opponents:optionCount,players:22,mobileCards:isMobile,arrowColors:colours,pageErrors:errors}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});