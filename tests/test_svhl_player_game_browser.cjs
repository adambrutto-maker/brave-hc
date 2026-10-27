"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),puppeteer=require("puppeteer");
const root=path.resolve(__dirname,"../widgets"),types={".html":"text/html",".js":"text/javascript",".json":"application/json"};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,raw)=>{
  if(err){res.writeHead(404);res.end();return}
  res.setHeader("content-type",types[path.extname(file)]||"application/octet-stream");
  res.end(raw);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]}),results=[];
 try{
  for(const width of [1140,358]){
   const page=await browser.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.setViewport({width,height:900});
   await page.goto(base+"/player-game-audit.html?team=Mid%20Ice%20Crisis",
     {waitUntil:"networkidle0",timeout:45000});
   const first=await page.evaluate(()=>({
    source:document.querySelector("#audit-source-status")?.textContent,
    team:document.querySelector("#audit-team")?.selectedOptions[0]?.textContent,
    coverage:document.querySelector("#audit-coverage")?.textContent,
    seasonChoices:document.querySelectorAll("#audit-season option").length,
    playerCount:document.querySelectorAll("#audit-player option").length,
    status:document.querySelector("#audit-selection-status")?.textContent,
    detail:document.querySelector("#audit-player-metrics")?.textContent,
    proof:document.querySelector("#audit-scoring-attendance")?.textContent,
    penalty:document.querySelector("#audit-penalty-coverage-status")?.textContent,
    penaltyMetrics:document.querySelector("#audit-penalty-coverage-metrics")?.textContent,
    caveat:document.querySelector("#audit-player-caution")?.textContent,
    teamRows:document.querySelectorAll("#audit-team-table tbody tr").length,
    overflow:document.body.scrollWidth-innerWidth
   }));
   assert.ok(first.source.includes("GameInfo sources captured"));
   assert.equal(first.team,"Mid Ice Crisis");
   assert.ok(first.coverage.includes("2206")&&first.coverage.includes("2069"),
     "at least seven source seasons admitted before browser test");
   assert.equal(first.playerCount,19);assert.equal(first.teamRows,19);
   assert.ok(first.status.includes("official league season 570"));
   assert.ok(first.detail.includes("participation LOWER BOUND") &&
     first.detail.includes("NOT absences"));
   assert.ok(first.proof.includes("minimum")||first.proof.includes("At least")||
      first.proof.includes("lower bound"));
   assert.ok(first.penalty.includes("NOT proof of zero penalties") &&
     first.penaltyMetrics.includes("136")&&
     first.penaltyMetrics.includes("Unverified"),
     "penalty source samples must not be interpreted as no PIM");
   assert.ok(first.caveat.includes("does not")||first.caveat.includes("cannot")||
      first.caveat.includes("NOT fully verified"));
   assert.ok(first.overflow<=1);
   await page.waitForFunction(()=>document.querySelector("#audit-hold-review-status")?.textContent.includes("137 of 137"),{timeout:15000});
   await page.$eval("#audit-hold-review",el=>el.open=true);
   const reviewBefore=await page.evaluate(()=>({
     status:document.querySelector("#audit-hold-review-status")?.textContent,
     metrics:document.querySelector("#audit-hold-review-metrics")?.textContent,
     count:document.querySelector("#audit-hold-review-count")?.textContent,
     listed:document.querySelectorAll("#audit-hold-review-list .review-card").length,
     overflow:document.body.scrollWidth-innerWidth
   }));
   assert.ok(reviewBefore.status.includes("NOT independent acceptance"));
   assert.ok(reviewBefore.metrics.includes("86")&&reviewBefore.metrics.includes("12")&&reviewBefore.metrics.includes("39"));
   assert.ok(reviewBefore.count.includes("10 of 137")&&reviewBefore.listed===10);
   assert.ok(reviewBefore.overflow<=1);
   await page.click("#audit-hold-review-next");
   assert.equal(await page.$$eval("#audit-hold-review-list .review-card",x=>x.length),20);
   await page.select("#audit-hold-review-category","RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD");
   await page.select("#audit-hold-review-season","570");
   const currentReview=await page.evaluate(()=>({
     count:document.querySelector("#audit-hold-review-count")?.textContent,
     cards:[...document.querySelectorAll("#audit-hold-review-list .review-card")].map(x=>x.textContent),
     links:[...document.querySelectorAll("#audit-hold-review-list .review-card a")].map(x=>x.href),
     overflow:document.body.scrollWidth-innerWidth
   }));
   assert.ok(currentReview.count.includes("2 of 2"));
   assert.equal(currentReview.cards.length,2);
   assert.ok(currentReview.cards.every(t=>t.includes("roster-qualified scoring events")&&
      t.includes("Goal rows match; scorer not listed on source roster")));
   assert.ok(currentReview.links.every(x=>x.startsWith("https://leagues.sportsvillage.ca/gameinfo.aspx?")));
   assert.ok(currentReview.overflow<=1);
   const roc=await page.$eval("#audit-player",node=>[...node.options]
     .find(o=>o.textContent.includes("Rocchetti"))?.value);
   assert.ok(roc);await page.select("#audit-player",roc);
   await page.waitForFunction(()=>document.querySelectorAll("#audit-season option").length>=2);
   const choices=await page.$eval("#audit-season",s=>[...s.options].map(o=>o.value));
   const older=choices.find(v=>v.startsWith("547|"))||choices.find(v=>!v.startsWith("570|"));
   assert.ok(older,"official playerID has historical previous season");
   await page.select("#audit-season",older);
   await page.waitForFunction((leagueId)=>document.querySelector("#audit-selection-status")?.textContent.includes("official league season "+leagueId),{},older.split("|")[0]);
   const historical=await page.evaluate(()=>({
    title:document.querySelector("#audit-selection-status")?.textContent,
    metrics:document.querySelector("#audit-player-metrics")?.textContent,
    source:document.querySelector("#audit-event-list")?.textContent,
    count:document.querySelectorAll("#audit-team-table tbody tr").length,
    overflow:document.body.scrollWidth-innerWidth
   }));
   assert.ok(historical.title.includes("official league season"));
   assert.ok(historical.metrics.includes("NOT game-sheet verified"));
   assert.ok(historical.metrics.includes("participation LOWER BOUND") &&
     historical.metrics.includes("NOT absences"),
     "historical players must retain distinct-game scored participation bound");
   assert.ok(historical.count>5);assert.ok(historical.overflow<=1);
   await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{
    configurable:true,value:{writeText:async text=>window.__gameCopy=text}
   }));
   await page.click("#audit-copy");await page.waitForFunction(()=>Boolean(window.__gameCopy));
   const message=await page.evaluate(()=>window.__gameCopy);
   assert.ok(message.includes("OFFICIAL INDIVIDUAL GAME SCORING AUDIT")&&
       message.includes("Rocchetti")&&message.includes("NOT game-sheet verified")&&
       message.includes("NOT been overwritten") &&
       message.includes("SCORING GAME PARTICIPATION LOWER BOUND") &&
       message.includes("PUBLISHED GP WITHOUT INDIVIDUAL GAME ATTENDANCE PROOF"));
   await page.goto(base+"/league-intelligence.html?team=Mid%20Ice%20Crisis",
      {waitUntil:"networkidle0",timeout:45000});
   const link=await page.$eval("#game-audit-link",el=>el.getAttribute("href"));
   assert.ok(link.includes("player-game-audit.html?team=Mid%20Ice%20Crisis"));
   assert.deepEqual(errors,[]);
   results.push({width,yearGameSheets:2206,fullGoalParity:2069,
     currentPlayers:19,oldGameEvidence:"PASS",clipboard:"PASS",
     opponentProfileNavigation:"PASS",pageOverflow:0,jsErrors:0});
   await page.close();
  }
  const fail=await browser.newPage();
  await fail.setRequestInterception(true);
  fail.on("request",q=>q.url().includes("svhl-player-game-index.json")?q.abort():q.continue());
  await fail.goto(base+"/player-game-audit.html",{waitUntil:"networkidle0",timeout:45000});
  assert.ok((await fail.$eval("#audit-source-status",el=>el.textContent)).includes("GAME-LEVEL SOURCE HELD"));
  await fail.close();
  const reviewFail=await browser.newPage();
  await reviewFail.setRequestInterception(true);
  reviewFail.on("request",request=>
    request.url().includes("svhl-gameinfo-hold-review.json")?
      request.abort():request.continue());
  await reviewFail.goto(base+"/player-game-audit.html?team=Mid%20Ice%20Crisis",
    {waitUntil:"networkidle0",timeout:45000});
  const isolated=await reviewFail.evaluate(()=>({
    source:document.querySelector("#audit-source-status")?.textContent,
    review:document.querySelector("#audit-hold-review-status")?.textContent,
    players:document.querySelectorAll("#audit-player option").length,
    list:document.querySelectorAll("#audit-hold-review-list .review-card").length
  }));
  assert.ok(isolated.source.includes("GameInfo sources captured"));
  assert.ok(isolated.review.includes("GAMEINFO REVIEW HELD"));
  assert.equal(isolated.players,19);
  assert.equal(isolated.list,0);
  await reviewFail.close();
  console.log(JSON.stringify({status:"GAME_BY_GAME_PUBLIC_BROWSER_PASS",results,
    sourceHold:"PASS",independentReviewSourceHold:"PASS"}));
 }finally{await browser.close();server.close()}
})().catch(err=>{console.error(err.stack||err);server.close();process.exitCode=2});