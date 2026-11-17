/* SportsOS V22 browser acceptance, local and hosted HTTPS. No HTO/SVHL server mutation. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const URL_BASE=process.env.SPORTSOS_V22_QA_URL||"http://127.0.0.1:18898/leagueos-team-os-demo.html?v=v22-local";
const OUT=process.env.SPORTSOS_V22_QA_OUT||path.resolve(__dirname,"../_qa_v22_review_only");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[];
 const check=(yes,msg)=>{assert.ok(yes,msg);checks.push(msg)};
 const route=async(page,name)=>{
  await page.evaluate(k=>window.LeagueOSDemoBridgeV13.go(k),name);
  await page.waitForFunction(r=>location.hash==="#"+r,{},name);
 };
 const visibleCount=async(page)=>page.$$eval(".v22-case-row",xs=>xs.length);
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const response=await page.goto(URL_BASE+"#league-reconciliation",{waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"Public review page HTTP 200");
  await page.waitForSelector(".v22-case-row",{timeout:15000});
  const banner=await page.$eval("#v19-site-banner",e=>e.textContent);
  check(banner.includes("LEAGUE CENTRAL"),"Branded LeagueOS identity retained");
  const mainNav=await page.$$eval(".v19-tab",xs=>xs.map(x=>x.textContent.trim()));
  check(mainNav.includes("Source Review"),"LeagueOS site navigation has Source Review");
  check((await page.$eval(".v19-tab[aria-current='page']",e=>e.textContent)).trim()==="Source Review",
   "Direct hashtag opens Source Review active tab");
  const headline=await page.$eval(".v22-heading",e=>e.textContent);
  check(headline.includes("Schedule reconciliation")&&headline.includes("REVIEW-ONLY"),
   "Screen is explicitly not an official approval interface");
  const counters=await page.$$eval(".v22-kpi",xs=>xs.map(x=>x.textContent.replace(/\s+/g," ").trim()));
  check(counters.length===4,"Four source-audit summary metrics");
  check(counters[0].includes("411")&&counters[1].includes("8")&&counters[2].includes("16"),
    "411 registry, eight public comparisons and 16 holds displayed");
  check(counters[3].includes("1"),"One critical historical HTO ID conflict identified");
  check((await visibleCount(page))===16,"Source review is default 16 held cases, not approved results");
  const critical=await page.$eval(".v22-critical",e=>e.textContent);
  check(critical.includes("December 6")&&critical.includes("3375683")&&critical.includes("Nov 1"),
    "Critical historical HTO ID reuse warning is visible");
  const sourceStrip=await page.$eval(".v22-source-strip",e=>e.textContent);
  check(sourceStrip.includes("Nov 16")&&sourceStrip.includes("Nov 17"),
    "Dated source snapshots distinguish league and HTO collection");
  await page.screenshot({path:path.join(OUT,"league_review_desktop_v22.png"),fullPage:true});

  await page.click(".v22-critical button[data-v22-open]");
  const detail=await page.$eval(".v22-detail-panel",e=>e.textContent);
  check(detail.includes("2026-12-06")||detail.includes("Dec 6"),"Critical December 6 proposal selected");
  check(detail.includes("3375683")&&detail.includes("Nov 1"),"Stale HTO ID and historical date shown in detail");
  const links=await page.$$eval(".v22-detail-panel a",xs=>xs.map(x=>x.href));
  check(links.some(x=>x.includes("htosports.com")&&x.includes("3375683")),"Direct historical HTO evidence link exposed");
  check(links.every(x=>x.startsWith("https://")),"All source evidence links use HTTPS");
  check((await page.$$eval('.v22-detail-panel button[data-go^="team-game-"]',xs=>xs.length))===0,
    "Historical ID collision cannot open a falsely linked future HockeyOS game");
  await page.screenshot({path:path.join(OUT,"league_review_critical_v22.png"),fullPage:true});

  await page.select("#v22-note-status","source_needed");
  const injection="Verify old game ID. <img src=x onerror=alert(1)> still HELD.";
  await page.type("#v22-note-text",injection);
  await page.click("[data-v22-save]");
  const statusNote=await page.$eval(".v22-case-row.selected",e=>e.textContent);
  check(statusNote.includes("Source evidence needed"),"Local note status shown on selected case");
  check((await page.$eval(".v22-detail-panel textarea",e=>e.value))===injection,
   "Local notes remain editable after saving");
  check((await page.$$eval(".v22-detail-panel img",xs=>xs.length))===0,
   "Local HTML-like note remains text, never executable markup");
  check((await page.$eval(".v22-kpi",e=>e.textContent)).includes("411"),"Saving notes cannot change official counts");
  check((await visibleCount(page))===16,"Saving a review note cannot approve or clear a source hold");
  await page.reload({waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector(".v22-case-row");
  await page.click(".v22-critical button[data-v22-open]");
  check((await page.$eval("#v22-note-text",e=>e.value))===injection,
   "Browser-local note persists after full reload");
  check((await page.$eval("#v22-note-status",e=>e.value))==="source_needed",
   "Local review status persists after reload");
  check((await visibleCount(page))===16,"Source hold remains after local-note reload");

  // Intercept ONLY the QA browser download event, verify JSON and avoid host downloads.
  await page.evaluate(()=>{
   window.__v22CapturedBlob=null;window.__v22DownloadedFile=null;
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=(blob)=>{window.__v22CapturedBlob=blob;return create(blob)};
   const baseClick=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V22_Local_Review_Notes.json"){
     window.__v22DownloadedFile=this.download;return;
    }
    return baseClick.call(this);
   };
  });
  await page.click("[data-v22-export]");
  const exportResult=await page.evaluate(async()=>{
   const b=window.__v22CapturedBlob;return{
    file:window.__v22DownloadedFile,data:b?JSON.parse(await b.text()):null};
  });
  check(exportResult.file==="LeagueOS_V22_Local_Review_Notes.json",
   "Export produces a downloadable, locally scoped filename");
  check(exportResult.data?.schema==="bruttech-leagueos-local-review-export/v22"&&
    exportResult.data?.officialWriteAllowed===false,"Export is explicitly not an official approval");
  check(exportResult.data?.cases?.length===24&&
    exportResult.data.cases.some(x=>x.localNote?.note===injection),
   "Export includes all 24 source case IDs and the saved review note");

  await page.click('[data-v22-tab="all"]');
  check((await visibleCount(page))===24,"All cases filter shows 24 derived cases");
  await page.click('[data-v22-tab="observed"]');
  check((await visibleCount(page))===8,"Public parity filter shows exactly eight nonapproved observations");
  const native=(await page.$$('.v22-detail-panel button[data-go="team-game-3375686"]')).length;
  check(native===1,"Observed future source pair offers its exact HockeyOS preview");
  await page.click('.v22-detail-panel button[data-go="team-game-3375686"]');
  await page.waitForFunction(()=>location.hash==="#team-game-3375686",{timeout:9000});
  await page.waitForSelector(".v21-detail",{timeout:12000});
  check((await page.$eval(".v21-detail",e=>e.textContent)).includes("Dateline Predators"),
   "Cross-product navigation opens correct native HockeyOS HTO preview");
  await route(page,"league-reconciliation");
  await page.waitForSelector(".v22-case-row");
  await page.click('[data-v22-tab="pilot"]');
  check((await visibleCount(page))===9,"Brave H.C. pilot shows nine source-registry fixtures");
  await page.click('[data-v22-tab="proposals"]');
  check((await visibleCount(page))===5,"Future proposal filter shows five unverified assignments");
  await page.click('[data-v22-tab="league"]');
  check((await visibleCount(page))===10,"League historical hold view shows ten unresolved results");
  const holdCards=await page.$$eval(".v22-case-row",xs=>xs.map(x=>x.textContent));
  check(holdCards.every(x=>!x.includes("Final score confirmed")),"Unresolved 0-0 fixtures remain held, not ties");

  await page.click('[data-v22-tab="all"]');
  await page.type("#v22-search","3375683");
  const searchCount=await visibleCount(page);
  check(searchCount===2,"Exact HTO game ID search finds historical game and reused future proposal");
  const inputValue=await page.$eval("#v22-search",e=>e.value);
  check(inputValue==="3375683","Typing through refresh retains full search value");
  const focused=await page.evaluate(()=>document.activeElement?.id);
  check(focused==="v22-search","Search focus survives asynchronous list refresh");
  await page.$eval("#v22-search",e=>{e.value="";e.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.select("#v22-night","Tuesday");
  check((await visibleCount(page))===2,"Tuesday holds are distinguishable from Sunday");
  await page.select("#v22-night","all");
  await page.select("#v22-priority","CRITICAL");
  check((await visibleCount(page))===1,"Critical-only filter isolates one stale HTO ID");
  await page.select("#v22-priority","all");

  await route(page,"league-home");
  const home=await page.$eval("#workspace",e=>e.textContent);
  check(home.includes("Source reconciliation"),"Commissioner homepage features source-reconciliation entry");
  await route(page,"league-admin");
  const admin=await page.$eval("#workspace",e=>e.textContent);
  check(admin.includes("Source reconciliation"),"Commissioner Office includes original source-review module");
  await route(page,"league-scoring");
  check(!!(await page.$("#league-native-scorer-mount")),"Existing LeagueOS practice scorer remains reachable");
  await route(page,"league-reconciliation");
  await page.waitForSelector(".v22-case-row");
  await page.click('[data-v22-tab="review"]');
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({
   width:innerWidth,scroll:document.documentElement.scrollWidth,
   rows:document.querySelectorAll(".v22-case-row").length,
   kpis:document.querySelectorAll(".v22-kpi").length,
   detail:!!document.querySelector(".v22-detail-panel"),
   critical:!!document.querySelector(".v22-critical")
  }));
  check(mobile.scroll<=mobile.width+2,"390px mobile document has no horizontal overflow");
  check(mobile.rows===16&&mobile.kpis===4&&mobile.detail&&mobile.critical,
   "Mobile source-review screen retains complete evidence and controls");
  await page.screenshot({path:path.join(OUT,"league_review_mobile_v22.png"),fullPage:true});
  await page.click(".v22-critical button[data-v22-open]");
  const selectedMobile=await page.evaluate(()=>({
   viewport:innerWidth,scroll:document.documentElement.scrollWidth,
   selected:document.querySelector(".v22-case-row.selected")?.textContent
  }));
  check(selectedMobile.scroll<=selectedMobile.viewport+2&&selectedMobile.selected?.includes("Mid Ice Crisis"),
   "Mobile critical review case is reachable without layout overflow");
  await page.screenshot({path:path.join(OUT,"league_review_critical_mobile_v22.png"),fullPage:true});
  await page.click("#sw-team");
  await page.waitForFunction(()=>location.hash==="#team-home",{timeout:8000});
  await page.waitForSelector("#hockeyos-v21-last-game .v21-home-last",{timeout:12000});
  check((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("BRAVE H.C."),
   "HockeyOS V21 homepage remains accessible after LeagueOS review");
  check(errors.length===0,"No unhandled JavaScript errors");
  check(writes.length===0,"No HTTP writes to HTO/SVHL or hosting server");

  // Source tamper: a new browser page with one forged officialWriteAllowed flag must show HOLD.
  const bad=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../widgets/leagueos-reconciliation-v22.json"),"utf8"));
  bad.cases[0].officialWriteAllowed=true;
  const invalid=await browser.newPage();
  await invalid.setRequestInterception(true);
  invalid.on("request",r=>{
   if(r.url().includes("/leagueos-reconciliation-v22.json"))r.respond({status:200,contentType:"application/json",
     body:JSON.stringify(bad)});
   else r.continue();
  });
  await invalid.goto(URL_BASE+"#league-reconciliation",{waitUntil:"domcontentloaded",timeout:30000});
  await invalid.waitForSelector(".v22-failed",{timeout:16000});
  check((await invalid.$eval(".v22-failed",e=>e.textContent)).includes("unavailable"),
   "Forged official-write permission fails closed instead of publishing");
  await invalid.close();

  const result={pass:true,checks:checks.length,sourceCases:{all:24,parity:8,held:16,
    critical:1,alias:1,supplementalMissing:4,unverifiedHistoricalResults:10},
    mobile,serverWrites:writes,pageErrors:errors,
    officialChanges:0,authenticatedApproval:false,
    screenshots:["league_review_desktop_v22.png","league_review_critical_v22.png",
      "league_review_mobile_v22.png","league_review_critical_mobile_v22.png"],
    tested:checks};
  fs.writeFileSync(path.join(OUT,"v22_browser_acceptance.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,checks:result.checks,sourceCases:result.sourceCases,
    mobile:result.mobile,serverWrites:result.serverWrites,pageErrors:result.pageErrors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V22 BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
