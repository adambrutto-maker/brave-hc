"use strict";
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),
 puppeteer=require("puppeteer"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../widgets");
const historical=JSON.parse(fs.readFileSync(path.join(root,"brave-historical-verified-games.json"),"utf8"));
const types={".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png",".css":"text/css"};
const srv=http.createServer((req,res)=>{
 const f=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(error,buf)=>{if(error)return res.writeHead(404).end();
   res.setHeader("content-type",types[path.extname(f)]||"text/plain");
   res.end(buf)});
});
(async()=>{
 await new Promise(resolve=>srv.listen(0,"127.0.0.1",resolve));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]}),results=[];
 try{
  for(const width of [1140,358]){
   const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.setViewport({width,height:850});
   await page.goto("http://127.0.0.1:"+srv.address().port+"/division-fit-lab.html",{waitUntil:"networkidle0",timeout:45000});
   const first=await page.evaluate(()=>({
    status:document.querySelector("#notice")?.textContent,
    metrics:document.querySelector("#source-metrics")?.textContent,
    scenarios:document.querySelectorAll("#scenario-options button").length,
    current:document.querySelector("#scenario-options button[aria-pressed=true]")?.textContent,
    groups:document.querySelectorAll("#division-groups .group").length,
    crossLinks:document.querySelectorAll("#cross-division-links .link-card").length,
    history:document.querySelector("#historical-metrics")?.textContent,
    gate:document.querySelector("#gate-summary")?.textContent,
    evidence:document.querySelector("#scenario-evidence")?.textContent,
    caveat:document.querySelector("#scenario-evidence-caution")?.textContent,
    note:document.querySelector("#source-note")?.textContent,
    over:document.body.scrollWidth-innerWidth
   }));
   assert.ok(first.status.includes("Preliminary research only"));
   assert.ok(first.evidence.includes("27")&&first.evidence.includes("16"),
     "current division comparison must show source-confirmed game coverage");
   assert.ok(first.caveat.includes("actual historic schedules")&&
     first.note.includes("adult-pool source-confirmed"),
     "coverage must not imply simulated matchups or count other leagues");
   assert.ok(!first.note.includes("VAHL"),"separate-league name must not enter adult research interface");
   assert.ok(first.metrics.includes("22")&&first.metrics.includes("43")&&first.metrics.includes("16"));
   assert.equal(first.scenarios,3);
   assert.ok(first.current.includes("Current divisions"));
   assert.equal(first.groups,3);
   assert.ok(first.crossLinks>=2);
   assert.ok(first.history.includes(String(historical.matchedGameCount)) &&
      first.history.includes(String(historical.heldGameComparisons)));
   assert.ok(first.gate.includes("Not ready"));
   assert.ok(first.over<=1,"No full-page horizontal overflow");
   await page.click("#scenario-options button:nth-child(2)");
   const limited=await page.evaluate(()=>({
    chosen:document.querySelector("#scenario-options button[aria-pressed=true]")?.textContent,
    info:document.querySelector("#scenario-info")?.textContent,
    groups:document.querySelectorAll("#division-groups .group").length,
    teamNames:[...document.querySelectorAll("#division-groups .team-row")].map(x=>x.textContent)
   }));
   assert.ok(limited.chosen.includes("Two-pair swap test"));
   assert.ok(limited.info.includes("Research sandbox only"));
   assert.equal(limited.groups,3);assert.equal(limited.teamNames.length,22);
   assert.ok((await page.$eval("#scenario-evidence",e=>e.textContent)).includes("16"),
     "limited swap must disclose narrower source-matched game evidence");
   await page.click("#scenario-options button:nth-child(3)");
   assert.equal(await page.$$eval("#division-groups .team-row",nodes=>nodes.length),22);
   assert.ok((await page.$eval("#scenario-evidence",e=>e.textContent)).includes("13"),
     "score-band research is supported by only 13 previously observed games");
   await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{
    configurable:true,value:{writeText:async data=>{window.__researchNote=data}}
   }));
   await page.click("#copy-research");
   await page.waitForFunction(()=>Boolean(window.__researchNote),{timeout:10000});
   const copied=await page.evaluate(()=>window.__researchNote);
   assert.ok(copied.includes("INTERNAL RESEARCH — NOT A DIVISION REALIGNMENT RECOMMENDATION"));
   assert.ok(copied.includes("43")&&copied.includes("79")&&copied.includes("4 weekly")===false);
   assert.ok(copied.includes("proposalReady = FALSE"));
   assert.ok(copied.includes("13 prior completed games")&&
     copied.includes("CRITICAL: those games occurred under real schedules."),
     "research copy must disclose incomplete retrospective pair coverage");
   assert.ok(!copied.includes("Approved by"));
   assert.deepEqual(errors,[]);
   results.push({width,status:"PASS",adultPool:22,verifiedGames:43,
     crossDivisionGames:16,scenarios:3,history:79,copied:"PASS",
     overflow:first.over,jsErrors:0});
   await page.close();
  }
  console.log(JSON.stringify({status:"DIVISION_FIT_BROWSER_PASS",results}));
 }finally{await browser.close();srv.close()}
})().catch(error=>{console.error(error.stack||error);srv.close();process.exitCode=2});