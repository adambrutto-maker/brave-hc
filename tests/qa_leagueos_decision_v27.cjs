/* V27 integrated commissioner decision browser QA. All data fictional or read-only aggregate. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V27_QA_URL||
 "http://127.0.0.1:18914/leagueos-team-os-demo.html?v=27";
const OUT=process.env.SPORTSOS_V27_QA_OUT||path.resolve(__dirname,"../_qa_v27");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||
   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[];
 const check=(yes,msg)=>{assert.ok(yes,msg);checks.push(msg)};
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",req=>{if(!["GET","HEAD","OPTIONS"].includes(req.method()))
   writes.push(req.method()+" "+req.url())});
  const response=await page.goto(BASE+"#league-connected-demo",
   {waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"Hosted LeagueOS public page responds HTTP 200");
  await page.waitForSelector(".v27-commissioner",{timeout:16000});
  check((await page.$eval(".v27-heading",x=>x.textContent)).includes("COMMISSIONER DECISION REPORT"),
   "Commissioner sees V27 decision report inside existing V26 role");
  const kpi=await page.$$eval(".v27-metric",xs=>xs.map(x=>x.textContent));
  check(kpi.length===4,"Four concise decision metrics visible without filters");
  check(kpi.some(x=>x.includes("2 → 3")),"Two existing groups versus three proposed groups");
  check(kpi.some(x=>x.includes("12/12 current")&&x.includes("8/9/7 proposed")),
   "Correct fictional source and proposed division capacities");
  check(kpi.some(x=>x.includes("24/24")),"All fictional team memberships receive review placements");
  const risk=await page.$eval(".v27-decision:first-child",x=>x.textContent);
  check(risk.includes("different pair sets")&&risk.includes("fictional score disparity"),
   "Model-quality comparison discloses its fictional pairwise-rating basis");
  const operations=await page.$eval(".v27-decision:nth-child(2)",x=>x.textContent);
  check(operations.includes("22 unslotted hypothetical matchups")&&
   operations.includes("Zero ice slots booked"),
   "Schedule impact is explicit without invented ice inventory");
  const gate=await page.$eval(".v27-gate",x=>x.textContent);
  check(gate.includes("Window open")&&gate.includes("No commissioner review recorded"),
   "Week-five review is available but cannot imply an approval");
  await page.waitForFunction(()=>document.querySelector(".v27-research")?.textContent.includes("15,468"),
   {timeout:14000});
  const hist=await page.$eval(".v27-research",x=>x.textContent);
  check(hist.includes("16.9%")&&hist.includes("26.7%")&&
   hist.includes("Not causal")&&hist.includes("14,055")&&hist.includes("1,407"),
   "Historical public-source association clearly separated from fictional proposal");
  await page.screenshot({path:path.join(OUT,"v27_commissioner_overview_desktop.png"),fullPage:false});
  await page.$eval(".v27-commissioner",e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(OUT,"v27_decision_report_desktop.png"),fullPage:false});

  await page.click(".v27-movements>summary");
  check((await page.$$eval(".v27-movements tbody tr",xs=>xs.length))===24,
   "All 24 fictional teams have source and proposed group decisions");
  const lines=await page.$$eval(".v27-movements tbody tr",xs=>xs.map(x=>x.textContent));
  check(lines.some(x=>x.includes("Harbour Wolves")&&x.includes("A North")),
   "Captain team appears in original-to-proposed placement review");
  check(lines.some(x=>x.includes("Harbour Rec")&&x.includes("D Recreational")),
   "Recreational-grade example is preserved in its proper band");
  await page.screenshot({path:path.join(OUT,"v27_movement_review_desktop.png"),fullPage:false});

  const before=await page.evaluate(()=>window.LeagueOSDecisionV27._test.report(
   window.LeagueOSConnectedV26._test.getSeed(),
   window.LeagueOSConnectedV26._test.getState(),
   window.LeagueOSConnectedV26._test.recommend(window.LeagueOSConnectedV26._test.getSeed()),300)
   .current.highGapPairs);
  await page.select("[data-v27-threshold]","400");
  const after=await page.evaluate(()=>window.LeagueOSDecisionV27._test.report(
   window.LeagueOSConnectedV26._test.getSeed(),
   window.LeagueOSConnectedV26._test.getState(),
   window.LeagueOSConnectedV26._test.recommend(window.LeagueOSConnectedV26._test.getSeed()),400)
   .current.highGapPairs);
  check(after<=before&&
   (await page.$eval("[data-v27-threshold]",x=>x.value))==="400",
   "Risk-flag threshold sensitivity changes only local simulated reviewer view");
  await page.select("[data-v27-threshold]","300");

  await page.select("#v26-target","6");
  await page.click('[data-v26-action="TARGET"]');
  check((await page.$eval(".v27-scoreline",x=>x.textContent)).includes("2 → 4"),
   "Commissioner group count recalculates when target division sizes change");
  await page.select("#v26-target","9");
  await page.click('[data-v26-action="TARGET"]');
  check((await page.$eval(".v27-scoreline",x=>x.textContent)).includes("2 → 3"),
   "Default 8/9/7 grouping and V27 calculation restored");

  await page.select("#v26-grade-team","FIC-A-01");
  await page.select("#v26-grade","B");
  await page.click('[data-v26-action="GRADE"]');
  check((await page.$eval(".v27-state",x=>x.textContent)).includes("HOLD"),
   "Orphan B-rated team puts whole division decision report on source hold");
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("halt commissioner review"),
   "Model refuses small unplayable strength group");
  check((await page.$eval(".v27-scoreline",x=>x.textContent)).includes("1 held"),
   "A held team cannot be counted as safely placed");
  await page.select("#v26-grade","A");
  await page.click('[data-v26-action="GRADE"]');
  check((await page.$eval(".v27-state",x=>x.textContent)).includes("REVIEW WINDOW"),
   "Restored strong-team assignment removes fictional size hold");

  await page.select("#v26-week","13");
  await page.click('[data-v26-action="WEEK"]');
  check((await page.$eval(".v27-state",x=>x.textContent)).includes("LOCKED")&&
   (await page.$eval(".v27-gate",x=>x.textContent)).includes("no new division moves"),
   "V27 commissioner report enforces final midseason lock");
  await page.select("#v26-week","5");
  await page.click('[data-v26-action="WEEK"]');
  await page.click('[data-v26-action="REVIEW"]');
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("Local review recorded"),
   "V27 report reflects the existing V26 simulated review audit");
  await page.click('[data-v26-action="PUBLISH"]');
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("Fictional public preview updated"),
   "Only explicit fictional publication is reflected in decision report");
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("no authenticated approval"),
   "Simulated public action does not claim arena approval");

  await page.evaluate(()=>{
   window.__v27blob=null;window.__v27file=null;
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=b=>{window.__v27blob=b;return create(b)};
   const old=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V27_Commissioner_Decision_Report_FICTIONAL.json"){
     window.__v27file=this.download;return;
    }
    return old.call(this);
   };
  });
  await page.click("[data-v27-export]");
  const exported=await page.evaluate(async()=>({
   filename:window.__v27file,
   data:window.__v27blob?JSON.parse(await window.__v27blob.text()):null
  }));
  check(exported.filename==="LeagueOS_V27_Commissioner_Decision_Report_FICTIONAL.json",
   "Commissioner report exports to browser-local JSON");
  check(exported.data?.schema==="bruttech-leagueos-commissioner-decision-report/v27"&&
   exported.data?.officialLeagueWriteAllowed===false&&
   exported.data?.approvalAuthority==="NONE_BROWSER_ONLY",
   "Export is explicit about absence of official commissioner authority");
  check(exported.data?.movement?.teams?.length===24&&
   exported.data?.schedule?.allocatedIceSlots===0,
   "Export includes all decision movements with no booked ice");
  check(exported.data?.research?.causalEvidence===false&&
   exported.data?.research?.eligibleCompletedGames===15468,
   "Study metadata cannot be presented as causal results of fictional grouping");
  check(writes.length===0,"No external registration, league, booking or finance request made");

  await page.click('[data-v26-role="captain"]');
  await page.waitForSelector('[data-v26-role="captain"][aria-current="step"]');
  check((await page.$(".v27-commissioner"))===null,
   "Decision report is commissioner-scoped and hidden from captain workspace");
  await page.click('[data-v26-role="commissioner"]');
  await page.waitForSelector(".v27-commissioner");
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("Local review recorded"),
   "Commissioner decision report survives captain-to-league navigation");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForSelector(".v27-commissioner",{timeout:16000});
  check((await page.$eval(".v27-gate",x=>x.textContent)).includes("Fictional public preview updated"),
   "Local commissioner decision state is preserved across browser reload");

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
   metricCount:document.querySelectorAll(".v27-metric").length,
   state:document.querySelector(".v27-state")?.textContent}));
  check(mobile.doc<=mobile.w+2,"390px mobile commissioner page has no horizontal document overflow");
  check(mobile.metricCount===4&&mobile.state,"Four decision KPIs remain visible on mobile");
  await page.screenshot({path:path.join(OUT,"v27_mobile_commissioner.png"),fullPage:false});
  await page.click(".v27-movements summary");
  const moveMobile=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    teams:document.querySelectorAll(".v27-movements tbody tr").length}));
  check(moveMobile.doc<=moveMobile.w+2&&moveMobile.teams===24,
   "Mobile team movement evidence remains internally scrollable");
  await page.screenshot({path:path.join(OUT,"v27_mobile_movement_review.png"),fullPage:false});

  // Negative case: forged historical research cannot display apparent empirical guarantees.
  const bad=JSON.parse(fs.readFileSync(path.resolve(__dirname,
   "../widgets/leagueos-decision-research-v27.json"),"utf8"));
  bad.causalEvidence=true;
  const hostile=await browser.newPage();
  await hostile.setRequestInterception(true);
  hostile.on("request",request=>{
   if(request.url().includes("leagueos-decision-research-v27.json"))
    request.respond({status:200,contentType:"application/json",body:JSON.stringify(bad)});
   else request.continue();
  });
  await hostile.goto(BASE+"#league-connected-demo",{waitUntil:"domcontentloaded",timeout:30000});
  await hostile.waitForSelector(".v27-commissioner",{timeout:17000});
  await hostile.waitForFunction(()=>document.querySelector(".v27-research")?.textContent.includes("Historical evidence unavailable"),
   {timeout:13000});
  check((await hostile.$eval(".v27-research",x=>x.textContent)).includes("unavailable"),
   "Forged causal research is held while fictional commissioner tools remain safe");
  await hostile.close();
  check(errors.length===0,"No unhandled browser errors");
  check(writes.length===0,"No HTTP POST/PUT/PATCH source writes");

  const result={pass:true,checks:checks.length,source:{fictionalTeams:24,
   currentDivisions:[12,12],proposedDivisions:[8,9,7],researchGames:15468,
   realCommissionerActions:0,bookedIceSlots:0},
   mobile,errors,writes,officialChanges:0,
   screenshots:["v27_commissioner_overview_desktop.png","v27_decision_report_desktop.png","v27_movement_review_desktop.png",
    "v27_mobile_commissioner.png","v27_mobile_movement_review.png"]};
  fs.writeFileSync(path.join(OUT,"v27_browser_acceptance.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V27 BROWSER QA FAILED:",e.stack||e);process.exitCode=1});
