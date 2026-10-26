const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const published=JSON.parse(fs.readFileSync(path.join(root,"league-intelligence.json"),"utf8"));
const maple=published.teams.find(t=>t.leagueName==="Maplewolves");
const leagueDivision=published.divisions.find(t=>t.name==="The Cristillo Division");
const ranked=[...published.teams].filter(t=>t.strengthContext?.rank!==null).sort((a,b)=>a.strengthContext.rank-b.strengthContext.rank);
const competitiveCount=published.teams.filter(t=>published.divisions.some(d=>d.name===t.divisionNow&&d.competitive)).length;
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
     contextHeaders:[...document.querySelectorAll("thead th")].map(x=>x.textContent),
     contextBreakdown:document.querySelector("#strength-metrics")?.textContent,
     trendSummary:document.querySelector("#trend-summary")?.textContent,
     trendCount:document.querySelectorAll("#trend-rows .trend-point").length,
     scoutingBoardCount:document.querySelectorAll("#scout-board .scout-card").length,
     scoutingSummary:document.querySelector("#scout-profile-summary")?.textContent,
     scoutingRecent:[...document.querySelectorAll("#scout-recent li")].map(x=>x.textContent),
     scoutingComparison:document.querySelector("#scout-profile-context")?.textContent,
     method:document.querySelector("#strength-method")?.textContent,
     firstRankedTeam:document.querySelector("#league-rows tr[data-team]")?.dataset.team,
     status:document.querySelector("#source-status")?.textContent
   }));
   assert.ok(info.contextHeaders.includes("CONTEXT /100")&&info.contextHeaders.includes("CONTEXT RANK"),"descriptive new comparison columns");
   assert.equal(info.firstRankedTeam,ranked[0].leagueName,"context order follows current accepted score");
   assert.ok(info.contextBreakdown.includes("Current form")&&info.contextBreakdown.includes("Schedule difficulty")&&info.contextBreakdown.includes("previous winter"));
   assert.ok(info.method.includes(maple.strengthContext.contextIndex.toFixed(1)+"/100")&&info.method.includes("NOT win probability"),"Maplewolves context follows the published model");
   const points=published.trendLedger.teams.find(g=>g.sourceTeamId===maple.sourceTeamId).observations;
   assert.equal(info.trendCount,Math.min(6,points.length),"display accepted trend observations only");
   assert.ok(points.length===1?
      info.trendSummary.includes("No measured trend yet"):
      info.trendSummary.includes("accepted material observations"),
      "trend narration is derived from accepted observations");
   const brave=published.teams.find(t=>t.leagueName==="Braves HC");
   assert.ok(info.incomingContent.includes("Current SVHL context: Maplewolves "+
     maple.strengthContext.contextIndex.toFixed(1)+"/100 vs Brave H.C. "+
     brave.strengthContext.contextIndex.toFixed(1)+"/100") &&
     info.incomingContent.includes("Descriptive only, not a win probability."),
     "incoming scouting compares published current team components without predictive claims");
   assert.equal(info.movementCount,Math.min(12,published.movementLedger.events.length),
      "movement count follows source-observed events");
   assert.equal(info.incomingCount,Math.min(8,published.movementLedger.incomingCristilloReports.length),
      "incoming reports follow accepted ledger");
   assert.ok(info.movementContent.includes("Sugo Sundays")&&info.movementContent.includes("Maplewolves"));
   assert.ok(info.incomingContent.includes("11–10–3")&&info.incomingContent.includes("Primary Auto")&&
             info.incomingContent.includes("3–6–1"),"prior winter, competition and Braves history visible");
   assert.equal(info.rows,competitiveCount,"all competitive team entries");
   assert.equal(info.divisions.length,published.divisions.length+1,"all source divisions plus all");
   assert.equal(info.selected,"Maplewolves");
   assert.equal(info.scoutingBoardCount,leagueDivision.teams.length-1,
      "scouting board covers all seven current Cristillo opponents");
   assert.ok(info.scoutingSummary.includes(maple.record.gf+" GF / "+maple.record.ga+" GA")&&
      info.scoutingSummary.includes(maple.bravesMatchHistory.bravesAllTime.w+"–"+
       maple.bravesMatchHistory.bravesAllTime.l+"–"+maple.bravesMatchHistory.bravesAllTime.t),
      "scouting cards use current verified source and H2H without fixed game totals");
   assert.equal(info.scoutingRecent.length,maple.completedGames.length);
   assert.ok(info.scoutingRecent.some(x=>x.includes("Primary Auto"))&&
      info.scoutingComparison.includes("No future fixture or win probability is inferred."),
      "selected opponent brief is factual and does not guess fixtures");
   assert.ok(info.prior.includes("11–10–3")&&info.prior.includes("Maple Hyundai"));
   assert.ok(info.historical.includes("3–6–1")&&info.historical.includes("10 all-time verified"));
   assert.equal(info.fixtures.length,maple.completedGames.length);
   assert.ok(["Primary Auto","Butcher Brothers","Mighty Drunks","Young Guns"].every(n=>info.fixtures.some(x=>x.includes(n))));
   assert.ok(info.bodyOverflow<=1,"mobile page must not overflow");
   // Capture only the output of the real UI copy event; no external WhatsApp action.
   await page.evaluate(()=>{
    Object.defineProperty(navigator,"clipboard",{
     configurable:true,value:{writeText:async text=>{window.__scoutingCopied=text}}
    });
   });
   await page.click("#copy-scout-brief");
   await page.waitForFunction(()=>Boolean(window.__scoutingCopied));
   const pasted=await page.evaluate(()=>window.__scoutingCopied);
   assert.ok(pasted.includes("Opponent: Maplewolves")&&
      pasted.includes(maple.record.gf+" GF / "+maple.record.ga+" GA")&&
      pasted.includes(maple.bravesMatchHistory.bravesAllTime.w+"–"+
        maple.bravesMatchHistory.bravesAllTime.l+"–"+
        maple.bravesMatchHistory.bravesAllTime.t+" in "+
        maple.bravesMatchHistory.bravesAllTime.gp+" GP")&&
      pasted.includes("No upcoming fixture or game date is asserted"),
      "copy control produces verifiable WhatsApp text without fictional schedule");
   await page.select("#sort-field","official");
   assert.ok((await page.$eval("#league-rows tr[data-team]",x=>x.dataset.team)),"official sorting remains available");
   await page.select("#sort-field","context");
   await page.select("#division-filter","The Cristillo Division");
   assert.equal(await page.$$eval("#league-rows tr[data-team]",r=>r.length),leagueDivision.teams.length);
   await page.select("#team-filter","Braves HC");
   assert.equal(await page.$eval("#profile-title",e=>e.textContent),"Brave H.C.");
   assert.ok((await page.$eval("#braves-history",e=>e.textContent)).includes("Own club"));
   assert.ok((await page.$eval("#scout-profile-summary",e=>e.textContent)).includes("Club baseline"),
     "self club does not fabricate a head-to-head matchup");
   assert.ok((await page.$eval("#strength-method",e=>e.textContent)).includes("Brave H.C. historical matchups do not contribute"));
   results.push({width,allCompetitiveRows:info.rows,maplewolvesPrior:true,maplewolvesBravesHistory:true,opponentResults:info.fixtures.length,
      mobileOverflow:info.bodyOverflow});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",results,scriptErrors:errors}));
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=2});
