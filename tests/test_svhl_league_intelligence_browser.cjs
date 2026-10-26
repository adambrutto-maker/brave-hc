const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,b)=>{if(err)return res.writeHead(404).end();res.setHeader("content-type",types[path.extname(f)]||"text/plain");res.end(b)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await b.newPage(),errors=[],results=[];page.on("pageerror",e=>errors.push(e.message));
  for(const width of [1150,358]){
   await page.setViewport({width,height:850});
   await page.goto("http://127.0.0.1:"+server.address().port+"/league-intelligence.html?team=Maplewolves",{waitUntil:"networkidle0",timeout:36000});
   const info=await page.evaluate(()=>({
     rows:document.querySelectorAll("#league-rows tr[data-team]").length,
     divisions:[...document.querySelectorAll("#division-filter option")].map(x=>x.value),
     selected:document.querySelector("#profile-title")?.textContent,
     prior:document.querySelector("#prior-summary")?.textContent,
     historical:document.querySelector("#braves-history")?.textContent,
     fixtures:[...document.querySelectorAll("#fixture-rows tr")].map(x=>x.textContent),
     movementCount:document.querySelectorAll("#movement-rows .move-card").length,
     incomingCount:document.querySelectorAll("#incoming-rows .move-card").length,
     movementContent:document.querySelector("#movement-rows").textContent,
     incomingContent:document.querySelector("#incoming-rows").textContent,
     bodyOverflow:document.body.scrollWidth-innerWidth,
     status:document.querySelector("#source-status")?.textContent
   }));
   assert.equal(info.movementCount,2,"two source-observed Cristillo membership changes");
   assert.equal(info.incomingCount,1,"one incoming Maplewolves source profile");
   assert.ok(info.movementContent.includes("Sugo Sundays")&&info.movementContent.includes("Maplewolves"));
   assert.ok(info.incomingContent.includes("11–10–3")&&info.incomingContent.includes("Primary Auto")&&
             info.incomingContent.includes("3–6–1"),"prior winter, competition and Braves history visible");
   assert.equal(info.rows,26,"all competitive team entries");
   assert.equal(info.divisions.length,6,"all five divisions plus all");
   assert.equal(info.selected,"Maplewolves");
   assert.ok(info.prior.includes("11–10–3")&&info.prior.includes("Maple Hyundai"));
   assert.ok(info.historical.includes("3–6–1")&&info.historical.includes("10 all-time verified"));
   assert.equal(info.fixtures.length,4);
   assert.ok(info.fixtures.every(x=>x.includes("Remax Division")));
   assert.ok(info.bodyOverflow<=1,"mobile page must not overflow");
   await page.select("#division-filter","The Cristillo Division");
   assert.equal(await page.$$eval("#league-rows tr[data-team]",r=>r.length),8);
   await page.select("#team-filter","Braves HC");
   assert.equal(await page.$eval("#profile-title",e=>e.textContent),"Brave H.C.");
   assert.ok((await page.$eval("#braves-history",e=>e.textContent)).includes("Own club"));
   results.push({width,allCompetitiveRows:info.rows,maplewolvesPrior:true,maplewolvesBravesHistory:true,opponentResults:info.fixtures.length,
      mobileOverflow:info.bodyOverflow});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",results,scriptErrors:errors}));
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=2});
