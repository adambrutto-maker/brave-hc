/* Full sort matrix and fail-closed public PDF release controls. */
const fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets");
const type={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{const f=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://local").pathname));
if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
fs.readFile(f,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{"Content-Type":type[path.extname(f)]||"text/plain"}).end(data)})});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+server.address().port+"/game-centre-next.html";
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 try{
 const page=await browser.newPage();await page.setViewport({width:1100,height:900});await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.querySelectorAll("#rankings-rows tr").length===8,{timeout:20000});
 await page.click("#centre-rankings");
 const options=await page.$$eval("#rank-sort-select option",os=>os.map(o=>o.value));
 assert.equal(options.length,20);
 for(const option of options){
  await page.select("#rank-sort-select",option);
  const sample=await page.evaluate(()=>({
   expected:window.BraveGameCentreTest.sortRankings().slice(0,8).map(t=>t.leagueName),
   actual:[...document.querySelectorAll("#rankings-rows tr")].map(tr=>tr.cells[1].textContent),
   sorted:[...document.querySelectorAll(".ranking-table thead th")].filter(x=>x.getAttribute("aria-sort")!=="none").map(x=>x.getAttribute("aria-sort"))
  }));
  assert.deepEqual(sample.actual,sample.expected,"bad sort "+option);
  assert.equal(sample.sorted.length,1,"aria-sort missing "+option);
 }
 await page.click('button[data-rank-sort="gfPerGame"]');
 let ar=await page.$eval('button[data-rank-sort="gfPerGame"]',b=>b.closest("th").getAttribute("aria-sort"));
 assert.equal(ar,"descending");
 await page.click('button[data-rank-sort="gfPerGame"]');
 ar=await page.$eval('button[data-rank-sort="gfPerGame"]',b=>b.closest("th").getAttribute("aria-sort"));
 assert.equal(ar,"ascending");
 console.log("R31_ALL_SORTS_PASS",options.length,"ARIA_HEADER_TOGGLE_PASS");
 await page.close();
 const unsafe=await browser.newPage();
 await unsafe.setRequestInterception(true);
 unsafe.on("request",r=>{
  if(r.url().endsWith("/game-centre-lineup-public.json")){
   const p=path.join(root,"game-centre-lineup-public.json"),m=JSON.parse(fs.readFileSync(p,"utf8"));
   m.blank.sha256="0".repeat(64);
   return r.respond({status:200,contentType:"application/json",body:JSON.stringify(m)});
  }
  r.continue().catch(()=>{});
 });
 await unsafe.goto(url,{waitUntil:"domcontentloaded"});
 await unsafe.waitForFunction(()=>document.querySelector("#lineup-notice").textContent.includes("integrity check failed"),{timeout:20000});
 const held=await unsafe.evaluate(()=>({
  printDisabled:document.querySelector("#lineup-print").getAttribute("aria-disabled"),
  link:document.querySelector("#lineup-print").hasAttribute("href"),
  pdfSrc:document.querySelector("#lineup-pdf-frame").hasAttribute("src"),
  previewHidden:document.querySelector("#lineup-pdf-preview").hidden
 }));
 assert.deepEqual(held,{printDisabled:"true",link:false,pdfSrc:false,previewHidden:true});
 console.log("R31_TAMPERED_PDF_FAIL_CLOSED_PASS",JSON.stringify(held));
 await unsafe.close();
 }finally{await browser.close()}
})().catch(e=>{console.error("R31_SORT_INTEGRITY_FAIL",e.stack);process.exitCode=1}).finally(()=>server.close());
