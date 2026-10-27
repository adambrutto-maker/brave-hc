const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const published=JSON.parse(fs.readFileSync(path.join(root,"league-intelligence.json"),"utf8"));
const maple=published.teams.find(t=>t.leagueName==="Maplewolves");
const leagueDivision=published.divisions.find(t=>t.name==="The Cristillo Division");
const ranked=[...published.teams].filter(t=>t.strengthContext?.rank!==null).sort((a,b)=>a.strengthContext.rank-b.strengthContext.rank);
const adultScope=require("../widgets/adult-league-scope.js");
const competitiveCount=adultScope.teams(published).length;
const archive=JSON.parse(fs.readFileSync(path.join(root,"historical-svhl-standings.json"),"utf8"));
const historicalLinks=JSON.parse(fs.readFileSync(path.join(root,"brave-historical-verified-games.json"),"utf8"));

const schedule=JSON.parse(fs.readFileSync(path.join(root,"svhl-upcoming.json"),"utf8"));
const dp=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Toronto",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const dpart=k=>dp.find(x=>x.type===k).value;
const today=dpart("year")+"-"+dpart("month")+"-"+dpart("day");
const upcoming=schedule.games.filter(x=>x.date>=today).sort((a,b)=>(a.date+"T"+a.time).localeCompare(b.date+"T"+b.time));
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
     teamChoices:[...document.querySelectorAll("#team-filter option")].map(x=>x.value),
     adultRankValues:[...document.querySelectorAll("#league-rows tr[data-team]")].map(x=>x.lastElementChild?.textContent),
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
     archiveStatus:document.querySelector("#archive-status")?.textContent,
     archiveChoices:document.querySelectorAll("#archive-season option").length,
     archivedDivisionCount:document.querySelectorAll("#archive-divisions .archive-division").length,
     balanceCount:document.querySelectorAll("#balance-cards .insights-card").length,
     balanceText:document.querySelector("#balance-readiness")?.textContent,
     pastEvidence:document.querySelector("#plain-verified-past")?.textContent,
     pastCards:document.querySelectorAll("#history-bridge-cards .insights-card").length,
     plainSummary:document.querySelector("#plain-opponent-summary")?.textContent,
     weeklyPlain:document.querySelector("#weekly-team-summary")?.textContent,
     scoutingBoardCount:document.querySelectorAll("#scout-board .scout-card").length,
     fixtureCount:document.querySelectorAll("#upcoming-fixtures .fixture-card").length,
     fixtureStatus:document.querySelector("#fixture-status")?.textContent,
     firstFixture:document.querySelector("#upcoming-fixtures .fixture-card")?.textContent,
     scoutingSummary:document.querySelector("#scout-profile-summary")?.textContent,
     scoutingRecent:[...document.querySelectorAll("#scout-recent li")].map(x=>x.textContent),
     scoutingComparison:document.querySelector("#scout-profile-context")?.textContent,
     method:document.querySelector("#strength-method")?.textContent,
     firstRankedTeam:document.querySelector("#league-rows tr[data-team]")?.dataset.team,
     status:document.querySelector("#source-status")?.textContent
   }));
   assert.ok(info.contextHeaders.includes("CONTEXT /100")&&info.contextHeaders.includes("ADULT CONTEXT RANK"),"descriptive new comparison columns");
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
   assert.equal(info.rows,competitiveCount,"adult-only competitive team entries");
   assert.equal(info.teamChoices.length,competitiveCount,"select menu only contains adult teams");
   assert.ok(!["Philadelphia","Toronto","LA KIngs","Dallas"].some(n=>info.teamChoices.includes(n)),
      "teams belonging to a separate league are absent from public selectors");
   assert.deepEqual([...info.adultRankValues].sort((a,b)=>
      Number(a.slice(1))-Number(b.slice(1))),Array.from({length:22},(_,i)=>"#"+(i+1)),
      "public ranking spans adult teams only");
   assert.equal(info.divisions.length,adultScope.divisions(published).length+1,"adult Sunday divisions only");
   assert.ok(!info.divisions.includes("VAHL Division"),"separate league must not appear in filter");
   assert.equal(info.selected,"Maplewolves");
   assert.ok(info.archiveStatus.includes(adultScope.archiveCompetitiveCount(archive)+" adult-scope competitive team-season entries"));
   assert.ok(info.archiveStatus.includes(historicalLinks.matchedGameCount+" Brave H.C. game/date/score matches"));
   assert.equal(info.archiveChoices,archive.seasons.length);
   assert.equal(info.archivedDivisionCount,adultScope.archiveDivisions(archive.seasons.at(-1)).length);
   assert.equal(info.balanceCount,adultScope.divisions(published).length);
   assert.ok(info.balanceText.includes("Division changes are not recommended yet"),
      "early-season ranking may not be presented as league realignment recommendation");
   assert.equal(info.pastCards,new Set(historicalLinks.teamSeasons.map(g=>g.season+"|"+g.officialDivision)).size>12?12:
      new Set(historicalLinks.teamSeasons.map(g=>g.season+"|"+g.officialDivision)).size);
   assert.ok(info.plainSummary.includes("wins")&&info.plainSummary.includes("Who they have faced"),
      "opponent scouting includes plain-language performance explanations");
   assert.ok(info.pastEvidence.includes("W2022/23") && info.pastEvidence.includes("NOT evidence"),
      "historical season-matched Brave result distinguished from modern roster");
   assert.ok(info.weeklyPlain.includes("Weekly monitoring: 1 verified week"),
      "weekly view discloses one genuine baseline, never manufactured trend");
   assert.equal(info.fixtureCount,upcoming.length,"all and only future official SVHL fixtures shown");
   assert.ok(info.fixtureStatus.includes("SVHL calendar checked") &&
     !info.fixtureStatus.includes("Upcoming schedule held"),"independent schedule source accepted");
   if(upcoming.length)assert.ok(info.firstFixture.includes(upcoming[0].opponent)&&
     info.firstFixture.includes(upcoming[0].time),
     "next upcoming fixture must follow actual SVHL date/time order");
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
   const firstMatched=upcoming.find(x=>
     published.teams.some(t=>t.leagueName.toLowerCase().replace(/[^a-z0-9]/g,"")===
      x.opponent.toLowerCase().replace(/[^a-z0-9]/g,"")));
   if(firstMatched){
    await page.click("#upcoming-fixtures .fixture-card button");
    const expected=published.teams.find(t=>t.leagueName.toLowerCase().replace(/[^a-z0-9]/g,"")===
       firstMatched.opponent.toLowerCase().replace(/[^a-z0-9]/g,""));
    assert.equal(await page.$eval("#profile-title",e=>e.textContent),expected.displayName,
      "schedule-based button opens verified exact opponent profile");
    const fresh=Date.now()-new Date(schedule.checkedAt).getTime()<=8*60*60*1000;
    if(fresh){
     await page.evaluate(()=>{
      Object.defineProperty(navigator,"clipboard",{
       configurable:true,value:{writeText:async text=>{window.__gameDayCopied=text}}
      });
     });
     await page.evaluate(()=>{
      const button=[...document.querySelectorAll("#upcoming-fixtures button")]
        .find(el=>el.textContent==="Copy game-day WhatsApp brief");
      if(!button)throw Error("Verified fixture game-day copy control missing");
      button.click();
     });
     await page.waitForFunction(()=>Boolean(window.__gameDayCopied));
     const gameDay=await page.evaluate(()=>window.__gameDayCopied);
     assert.ok(gameDay.includes("VERIFIED GAME-DAY SCOUTING")&&
       gameDay.includes(firstMatched.date+" at "+firstMatched.time+" ET")&&
       gameDay.includes(firstMatched.opponent)&&
       gameDay.includes("Goalie assignment:")&&
       !gameDay.includes("No upcoming fixture or game date is asserted"),
       "user-triggered game-day report contains source-checked HTO/SVHL facts only");
    }
    await page.select("#team-filter","Maplewolves");
   }
   await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{
     configurable:true,value:{writeText:async text=>{window.__divisionReviewCopied=text}}
    }));
    await page.evaluate(()=>[...document.querySelectorAll(".os-mode")]
      .find(b=>b.textContent.trim()==="All data").click());
    await page.click("#copy-division-review");
    await page.waitForFunction(()=>Boolean(window.__divisionReviewCopied));
    const beforeReview=await page.evaluate(()=>window.__divisionReviewCopied);
   assert.ok(beforeReview.includes("HOCKEYOS | SVHL SUNDAY WINTER DIVISION RESEARCH")&&
      beforeReview.includes("No realignment recommendation is made"),
      "division-copy action must generate research only");
   await page.select("#archive-season","Sunday Winter 2018/19");
   assert.equal(await page.$$eval("#archive-divisions .archive-division",list=>list.length),
      archive.seasons.find(s=>s.season==="Sunday Winter 2018/19").divisions.length,"historical league year selector works");
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
