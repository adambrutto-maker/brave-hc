"use strict";
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),
 puppeteer=require("puppeteer"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"../widgets"),mime={".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css"};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(f,(err,buf)=>{
  if(err){res.writeHead(404);res.end();return}
  res.setHeader("content-type",mime[path.extname(f)]||"application/octet-stream");
  res.end(buf);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]}),result=[];
 try{
  for(const width of [1140,358]){
   const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.setViewport({width,height:920});
   const url="http://127.0.0.1:"+server.address().port+
    "/league-intelligence.html?team=Mid%20Ice%20Crisis";
   await page.goto(url,{waitUntil:"networkidle0",timeout:45000});
   const info=await page.evaluate(()=>({
    profile:document.querySelector("#profile-title")?.textContent,
    source:document.querySelector("#source-status")?.textContent,
    rosterStatus:document.querySelector("#roster-scouting-status")?.textContent,
    metrics:document.querySelector("#roster-construction-metrics")?.textContent,
    divisionBridge:document.querySelector("#roster-competition-bridge")?.textContent,
    players:document.querySelector("#roster-player-priorities")?.textContent,
    cards:document.querySelectorAll("#roster-player-priorities article").length,
    htoPlayers:document.querySelectorAll("#roster-player-priorities article:first-child select:first-of-type option").length,
    overflow:document.body.scrollWidth-innerWidth
   }));
   assert.equal(info.profile,"Mid Ice Crisis");
   assert.ok(info.source.includes("official sources checked"));
   assert.ok(info.rosterStatus.includes("Current roster source captured"));
   assert.ok(info.metrics.includes("19 listed players")&&
    info.metrics.includes("11 have official earlier player-ID observations")&&
    info.metrics.includes("33.3%"));
   assert.ok(info.divisionBridge.includes("Fazzari Partners")&&
     info.divisionBridge.includes("Cristillo")&&
     info.divisionBridge.includes("Remax Division")&&
     (info.divisionBridge.match(/verified external games/g)||[]).length===3,
     "source-observed interdivision comparisons must update with the league, not stale hard-coded scores");
   assert.equal(info.cards,4);
   assert.ok(info.players.includes("Packowski, Mike")&&info.players.includes("Ieraci, Vito"));
   assert.ok(info.htoPlayers>15);
   assert.ok(info.overflow<=1);
   const choices=await page.evaluate(()=>{
     const selects=document.querySelectorAll("#roster-player-priorities article:first-child select");
     return [...selects].map(x=>[...x.options].slice(0,5).map(o=>({value:o.value,label:o.textContent})));
   });
   assert.ok(choices[0].some(x=>x.label.includes("Carosi")));
   await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{
    configurable:true,value:{writeText:async text=>{window.__copiedRoster=text}}
   }));
   const selectedPlayer=await page.$eval("#roster-player-priorities article:first-child select",x=>
       [...x.options].find(o=>o.textContent.includes("Carosi"))?.value);
   await page.select("#roster-player-priorities article:first-child select:first-of-type",selectedPlayer);
   await page.select("#roster-player-priorities article:first-child select:nth-of-type(2)",
       "F1 pressure puck carrier outside");
   await page.click("#copy-roster-plan");
   await page.waitForFunction(()=>Boolean(window.__copiedRoster),{timeout:15000});
   const copied=await page.evaluate(()=>window.__copiedRoster);
   assert.ok(copied.includes("PLANNED ONLY — Packowski, Mike"));
   assert.ok(copied.includes("Carosi, Justin"));
   assert.ok(copied.includes("F1 pressure puck carrier outside"));
   assert.ok(copied.includes("SOURCE LIMITS"));
   assert.ok(copied.includes("Division")||copied.includes("division"));
   assert.ok(!copied.includes("confirmed lineup"));
   await page.select("#team-filter","Other Way");
   assert.equal(await page.$eval("#profile-title",x=>x.textContent),"Other Way");
   assert.ok((await page.$eval("#roster-construction-metrics",x=>x.textContent))
      .includes("listed players"));
   assert.ok((await page.$eval("#roster-copy-status",x=>x.textContent))==="");
   assert.deepEqual(errors,[]);
   result.push({width,admittedPlayers:348,historicalObservations:3222,
      teamRoster:19,headToHeadDivisionContext:"PASS",
      plannedAssignment:"PASS",switchTeam:"PASS",overflow:info.overflow,jsErrors:0});
   await page.close();
  }
  const failure=await browser.newPage();await failure.setViewport({width:358,height:800});
  await failure.setRequestInterception(true);
  failure.on("request",req=>req.url().includes("svhl-roster-intelligence.json")?
    req.abort():req.continue());
  await failure.goto("http://127.0.0.1:"+server.address().port+
    "/league-intelligence.html?team=Mid%20Ice%20Crisis",
    {waitUntil:"networkidle0",timeout:45000});
  const held=await failure.evaluate(()=>({
   profile:document.querySelector("#profile-title")?.textContent,
   status:document.querySelector("#roster-scouting-status")?.textContent,
   league:document.querySelector("#source-status")?.textContent
  }));
  assert.equal(held.profile,"Mid Ice Crisis");
  assert.ok(held.status.includes("Roster source unavailable"));
  assert.ok(!held.league.includes("SOURCE HELD"));
  await failure.close();
  console.log(JSON.stringify({state:"ROSTER_SCOUT_BROWSER_PASS",results:result,sourceFailure:"INDEPENDENT_HOLD_PASS"}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=2});