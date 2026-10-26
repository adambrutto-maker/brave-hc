/* Exact-source public Opponent Intelligence browser acceptance, using local
   file that will be committed, NOT mocked feed values. */
const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const puppeteer=require("puppeteer");
const root=path.resolve(__dirname,"..","widgets");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const full=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!full.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(full,(e,bytes)=>{
  if(e)return res.writeHead(404).end();
  res.setHeader("Content-Type",types[path.extname(full)]||"text/plain");
  res.end(bytes);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 const base="http://127.0.0.1:"+server.address().port;
 try{
  const page=await browser.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setViewport({width:358,height:460});
  await page.goto(base+"/home-panels.html?panel=standings&embed=1",{waitUntil:"networkidle0"});
  await page.click("#tab-intel");
  const samples=[];
  for(const [name,wlt,gf,ga] of [
   ["Big Bastones","4–2–1",24,27],
   ["Mid Ice Crisis","1–2–2",13,19],
   ["Dateline Predators","8–3–0",41,25],
   ["Zamboner Crew","0–1–0",1,7]
  ]){
   await page.select("#opponent",name);
   const data=await page.$eval("#intel-metrics",e=>e.textContent);
   const detail=await page.$eval("#headtohead-section",e=>({hidden:e.hidden,text:e.textContent}));
   assert.equal(detail.hidden,false,name+" verified history visible");
   assert.ok(data.includes(wlt)&&data.includes(String(gf))&&data.includes(String(ga)),name+" exact source GF/GA/WLT");
   samples.push({name,wlt,gf,ga});
  }
  for(const [name,sentence] of [
   ["Mohawks HC","unreviewed name/identity alias"],
   ["Sugo Sundays","unreviewed name/identity alias"],
   ["Other Way","No completed matchup"]
  ]){
   await page.select("#opponent",name);
   assert.equal(await page.$eval("#headtohead-section",e=>e.hidden),true,name+" no invented historical card");
   assert.ok((await page.$eval("#intel-metrics",e=>e.textContent)).includes(sentence));
  }
  const scroller=await page.$eval(".shell",e=>{e.scrollTop=400;return e.scrollTop});
  assert.ok(scroller>0,"HTO-height iframe remains scrollable");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,verified:samples,aliasHeld:["Mohawks HC","Sugo Sundays"],noExactHistory:["Other Way"],errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
