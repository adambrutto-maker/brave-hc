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
    layoutPatterns:document.querySelectorAll("#layout-design-options button").length,
    layoutLead:document.querySelector("#layout-proposed-recommendation")?.textContent,
    layoutTeams:document.querySelectorAll("#layout-proposal-groups .team-row").length,
    layoutGroupCount:document.querySelectorAll("#layout-proposal-groups .group").length,
    current:document.querySelector("#scenario-options button[aria-pressed=true]")?.textContent,
    groups:document.querySelectorAll("#division-groups .group").length,
    crossLinks:document.querySelectorAll("#cross-division-links .link-card").length,
    history:document.querySelector("#historical-metrics")?.textContent,
    gate:document.querySelector("#gate-summary")?.textContent,
    weeklyStatus:document.querySelector("#weekly-stability-status")?.textContent,
    weeklyMetrics:document.querySelector("#weekly-stability-metrics")?.textContent,
    weeklyTeams:document.querySelectorAll("#stability-team-filter option").length,
    weeklyHistory:document.querySelectorAll("#weekly-team-history .week-card").length,
    weeklyTransitions:document.querySelector("#weekly-transitions")?.textContent,
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
   assert.equal(first.layoutPatterns,4,"must offer all legal 4/6/8 division compositions");
   assert.ok(first.layoutLead.includes("4 + 4 + 4 + 4 + 6"),
     "tightest objective proposes five small divisions, subject to qualification");
   assert.equal(first.layoutTeams,22);
   assert.equal(first.layoutGroupCount,5);
   assert.equal(await page.$eval("#layout-total-preview",x=>x.value),"22");
   assert.equal(await page.$$eval("#layout-total-patterns .week-card",x=>x.length),4);
   for(const oddTotal of ["21","23"]){
    await page.select("#layout-total-preview",oddTotal);
    const hypothetical=await page.evaluate(()=>({
     text:document.querySelector("#layout-total-preview-status").textContent,
     options:[...document.querySelectorAll("#layout-total-patterns .week-card")]
       .map(x=>x.textContent),
     actualTeamCount:document.querySelectorAll("#layout-proposal-groups .team-row").length
    }));
    assert.ok(hypothetical.text.includes("Exactly ONE")&&
      hypothetical.text.includes("CAPACITY PLANNING ONLY"));
    assert.ok(hypothetical.options.length>=3);
    assert.ok(hypothetical.options.every(row=>row.includes("1 odd-sized division(s)")));
    assert.equal(hypothetical.actualTeamCount,22,
      "odd-total hypothetical preview must not add or remove source roster teams");
   }
   await page.select("#layout-total-preview","22");
   assert.ok((await page.$eval("#layout-total-preview-status",x=>x.textContent))
     .includes("All divisions even-sized."),"22-team source remains all even");
   await page.select("#layout-design-focus","PRACTICAL");
   assert.ok((await page.$eval("#layout-proposed-recommendation",e=>e.textContent))
     .includes("6 + 8 + 8"),"operations penalty changes the leading research pattern");
   await page.click('#layout-design-options button[data-shape="4-6-6-6"]');
   assert.equal(await page.$$eval("#layout-proposal-groups .group",els=>els.length),4);
   assert.equal(await page.$$eval("#layout-proposal-groups .team-row",els=>els.length),22);
   assert.ok((await page.$eval("#layout-proposal-comparison",e=>e.textContent))
     .includes("NEW division(s)"));
   await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{
    configurable:true,value:{writeText:async data=>{window.__layoutText=data}}
   }));
   await page.click("#layout-copy");
   await page.waitForFunction(()=>Boolean(window.__layoutText));
   const draft=await page.evaluate(()=>window.__layoutText);
   assert.ok(draft.includes("4+6+6+6")&&draft.includes("RESEARCH DIVISION 4")&&
     draft.includes("NOT APPROVED OR SUBMITTED")&&
     draft.includes("No user authorization to change official assignments"),
     "explicit four-division research copy must include actual membership and no approval");
   assert.ok(first.current.includes("Current divisions"));
   assert.equal(first.groups,3);
   assert.ok(first.crossLinks>=2);
   assert.ok(first.history.includes(String(historical.matchedGameCount)) &&
      first.history.includes(String(historical.heldGameComparisons)));
   assert.ok(first.gate.includes("Not ready"));
   assert.ok(first.weeklyStatus.includes("1 source-verified week(s)") &&
     first.weeklyStatus.includes("BASELINE ONLY"),"must label one week as baseline only");
   assert.ok(first.weeklyMetrics.includes("Not yet measurable"),"no fabricated weekly change metrics");
   assert.equal(first.weeklyTeams,22);
   assert.equal(first.weeklyHistory,1,"only one actual Brave H.C. weekly point shown");
   assert.ok(first.weeklyTransitions.includes("No second accepted weekly observation"));
   assert.ok(!first.weeklyStatus.includes("stable divisions"),"one week cannot establish stability");
   await page.select("#stability-team-filter",
     await page.$eval("#stability-team-filter",node=>
      [...node.options].find(o=>o.textContent==="Maplewolves")?.value));
   assert.ok((await page.$eval("#weekly-team-history",e=>e.textContent))
      .includes("Baseline only"),"team switch retains one-week caution");
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
   assert.ok(copied.includes("SELECTED DRAFT: 4+6+6+6")&&
     copied.includes("NOT APPROVED OR SUBMITTED"),
     "research note includes the selected flexible candidate, not just fixed-size swaps");
   assert.ok(copied.includes("WEEKLY SOURCE STABILITY: SOURCE_BACKED_BASELINE_ONLY") &&
     copied.includes("NOT MEASURABLE — one source-backed baseline only."),
     "research copy may never call a single week stable");
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