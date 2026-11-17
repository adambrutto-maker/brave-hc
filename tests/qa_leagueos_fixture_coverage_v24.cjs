/* LeagueOS V24 desktop/mobile and source-gate browser acceptance, no server mutations. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V24_QA_URL||"http://127.0.0.1:18902/leagueos-team-os-demo.html?v=24";
const OUT=process.env.SPORTSOS_V24_QA_OUT||path.resolve(__dirname,"../_qa_v24");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.SPORTSOS_BROWSER_PATH||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[];
 const check=(ok,reason)=>{assert.ok(ok,reason);checks.push(reason)};
 try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  const response=await page.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"V24 independent public site returns HTTP 200");
  await page.waitForSelector("#leagueos-v24-fixture-coverage .v24-panel",{timeout:15000});
  await page.waitForSelector("#leagueos-v24-strength-history .v24-panel",{timeout:15000});
  check((await page.$eval("#v19-site-banner",x=>x.textContent)).includes("LEAGUE CENTRAL"),
   "LeagueOS commissioner site identity retained");
  check((await page.$eval(".v19-tab[aria-current='page']",x=>x.textContent)).trim()==="Division Plan",
   "Division Plan is still one-click top-level navigation");
  check((await page.$$eval(".v23-night",xs=>xs.length))===4,"Four-night recommendations remain visible");
  const summary=await page.$eval("#leagueos-v24-fixture-coverage",x=>x.textContent);
  check(summary.includes("Newly published fixture coverage"),"V24 fixture discovery has original native panel");
  check(summary.includes("411")&&summary.includes("61")&&summary.includes("472")&&summary.includes("102"),
   "Original and expanded canonical fixture counts displayed");
  check(summary.includes("61 newly published future games"),"All 61 newly discovered games are unscored future source entries");
  check(summary.includes("0 settled results newly found"),"No unverified future game treated as settled");
  check(summary.includes("6 unrated current standings teams"),"Unrated competition teams explicitly shown");
  check(summary.includes("daily engine now recognizes"),"Result engine gates documented");
  await page.screenshot({path:path.join(OUT,"v24_summary_desktop.png"),fullPage:false});

  await page.click("#leagueos-v24-fixture-coverage .v24-details:first-of-type>summary");
  const groups=await page.$$eval("#leagueos-v24-fixture-coverage .v24-night-source h4",xs=>xs.map(x=>x.textContent));
  check(groups.length===4&&groups[0].includes("Sunday"),"Fixture evidence shows four nights without a filter");
  check(groups.some(x=>x.includes("61 additional game IDs")),"Sunday discovery contains all 61 newly sourced future IDs");
  const days=await page.$$eval(".v24-night-source:first-of-type>details",xs=>xs.length);
  check(days>=3,"New Sunday fixtures span multiple future published dates");
  await page.click(".v24-night-source:first-of-type>details:first-of-type>summary");
  const games=await page.$$eval(".v24-source-game, .v24-game-row",xs=>xs.length);
  check(games>0,"Expanded source shows independent exact game ID detail");
  const hrefs=await page.$$eval(".v24-game-row a",xs=>xs.map(x=>x.href));
  check(hrefs.length>0&&hrefs.every(x=>x.startsWith("https://leagues.sportsvillage.ca/gameinfo.aspx?")),
   "All future game links resolve to exact allowlisted public SVHL source");
  check(!summary.includes("CONFIRMED ICE AVAILABLE"),"No invented public facility inventory");
  await page.screenshot({path:path.join(OUT,"v24_future_fixtures_desktop.png"),fullPage:false});

  await page.click("#leagueos-v24-fixture-coverage .v24-details:nth-of-type(2)>summary");
  const unrated=await page.$$eval(".v24-unrated-grid>div",xs=>xs.map(x=>x.textContent));
  check(unrated.length===6,"Exactly six current standings teams excluded from numeric rating");
  check(unrated.every(s=>/playoff/i.test(s)),"Unrated team source division context retained");
  check(unrated.some(x=>x.includes("Woodbridge Express")),"Current unrated source team identity visible");

  const strength=await page.$eval("#leagueos-v24-strength-history",x=>x.textContent);
  check(strength.includes("15 Current divisions")||strength.includes("15Current divisions")||
        strength.includes("Current divisions15"),"Fifteen official current division level obligations shown");
  check(strength.includes("39 Historical division-season labels")||strength.includes("39Historical division-season labels"),
   "Thirty-nine unclassified historical division-season labels shown");
  check(strength.includes("0 Officially approved strength levels")||strength.includes("0Officially approved strength levels"),
   "Zero official tier approvals remains explicit");
  check(strength.includes("League authorization remains required"),"Future classification authority policy visible");
  await page.click("#leagueos-v24-strength-history .v24-details>summary");
  const hist=await page.$$eval(".v24-history-scroll tbody tr",xs=>xs.length);
  check(hist===39,"Thirty-nine source-dated historical labels available to the commissioner");
  check((await page.$$eval(".v24-history-scroll tbody tr",xs=>xs.every(x=>x.textContent.includes("Unassigned"))))===true,
   "No fabricated historical division strengths");
  await page.screenshot({path:path.join(OUT,"v24_strength_history_desktop.png"),fullPage:false});

  await page.click(".v23-tier-panel>summary");
  check((await page.$$eval("[data-v23-tier]",xs=>xs.length))===15,
   "V23 league tier draft controls remain accessible alongside history");
  const draftKey=await page.$eval("[data-v23-tier]",x=>x.dataset.v23Tier);
  await page.select("[data-v23-tier]","3");
  await page.$eval("[data-v24-tier-date]",x=>{x.value="2026-11-23";x.dispatchEvent(new Event("change",{bubbles:true}))});
  await page.click("[data-v23-save-tiers]");
  await page.waitForSelector("#leagueos-v24-strength-history .v24-panel");
  const savedDraft=await page.evaluate(()=>JSON.parse(localStorage.getItem("leagueos-v23-tier-drafts-browser-local")||"null"));
  check(savedDraft?.drafts?.[draftKey]===3&&savedDraft?.effectiveDates?.[draftKey]==="2026-11-23",
   "Draft strength level and effective date are saved together on this browser only");
  check((await page.$eval("#leagueos-v24-strength-history",x=>x.textContent)).includes("0 Officially approved"),
   "Browser-local proposed tier cannot become an official strength classification");
  await page.evaluate(()=>{
   window.__v24Export=null;window.__v24Filename=null;
   const before=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{window.__v24Export=blob;return before(blob)};
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V23_Draft_Division_Strength_Levels.json"){
     window.__v24Filename=this.download;return;
    }
    return click.call(this);
   };
  });
  await page.click("[data-v23-export-tiers]");
  const exportData=await page.evaluate(async()=>window.__v24Export?JSON.parse(await window.__v24Export.text()):null);
  check(exportData?.officialWriteAllowed===false&&exportData?.approval==="NOT_APPROVED_BROWSER_ONLY"&&
   exportData.assignmentRequests.some(x=>x.proposedEffectiveFrom==="2026-11-23"&&x.approvedEffectiveFrom===null),
   "Export captures proposed effective date but never an official league approval");

  const sources=await page.evaluate(async()=>{
   const d=await fetch("./leagueos-fixture-discovery-v24.json",{cache:"no-store"}).then(x=>x.json());
   const h=await fetch("./leagueos-strength-level-history-v24.json",{cache:"no-store"}).then(x=>x.json());
   return{d:d.counts,h:h.counts};
  });
  check(sources.d.newCandidateCount===61&&sources.h.officialCurrentAssignments===0,
   "Public JSON source remains unmodified after local tier draft interaction");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-reconciliation"));
  await page.waitForSelector(".v22-case-row",{timeout:14000});
  check((await page.$$eval(".v22-case-row",xs=>xs.length))===16,
   "V22 source reconciliation holds still present");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-home"));
  check((await page.$eval("#workspace",x=>x.textContent)).includes("Recommended divisions"),
   "LeagueOS homepage continues linking recommended divisions");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-division-plan"));
  await page.waitForSelector("#leagueos-v24-fixture-coverage .v24-panel",{timeout:15000});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    nights:document.querySelectorAll(".v23-night").length,
    proposedTeams:document.querySelectorAll(".v23-division-card.proposed .v23-team").length,
    panels:document.querySelectorAll(".v24-panel").length}));
  check(mobile.doc<=mobile.w+2,"Mobile 390px public document has no horizontal overflow");
  check(mobile.nights===4&&mobile.proposedTeams===96&&mobile.panels===2,
   "Mobile retains the four-night rating model and both V24 source panels");
  await page.screenshot({path:path.join(OUT,"v24_mobile.png"),fullPage:false});
  await page.click("#leagueos-v24-fixture-coverage .v24-details:first-of-type>summary");
  await page.click(".v24-night-source:first-of-type>details:first-of-type>summary");
  const mobileGame=await page.evaluate(()=>({
   doc:document.documentElement.scrollWidth,w:innerWidth,
   sourceLink:!!document.querySelector(".v24-game-row a")}));
  check(mobileGame.doc<=mobileGame.w+2&&mobileGame.sourceLink,
   "Mobile exact-ID fixture detail is legible and source-linked");
  await page.click("#sw-team");
  await page.waitForFunction(()=>location.hash==="#team-home",{timeout:9000});
  await page.waitForSelector("#hockeyos-v21-last-game .v21-home-last",{timeout:12000});
  check((await page.$eval("#v19-site-banner",x=>x.textContent)).includes("BRAVE H.C."),
   "Existing HockeyOS TeamOS home remains working");
  check(errors.length===0,"Zero unhandled JavaScript exceptions: "+JSON.stringify(errors));
  check(writes.length===0,"Zero POST/PUT/PATCH server writes");

  // Deliberately forged official-edit flag must fail closed and never appear.
  const tampered=JSON.parse(fs.readFileSync(path.resolve(__dirname,
    "../widgets/leagueos-fixture-discovery-v24.json"),"utf8"));
  tampered.officialRecordsEdited=true;
  const invalid=await browser.newPage();
  await invalid.setRequestInterception(true);
  invalid.on("request",req=>{
   if(req.url().includes("leagueos-fixture-discovery-v24.json"))
    req.respond({status:200,contentType:"application/json",body:JSON.stringify(tampered)});
   else req.continue();
  });
  await invalid.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:30000});
  await invalid.waitForSelector("#leagueos-v24-fixture-coverage .v24-hold",{timeout:15000});
  check((await invalid.$eval("#leagueos-v24-fixture-coverage",x=>x.textContent)).includes("withheld"),
   "Tampered league edit permission triggers a source HOLD");
  await invalid.close();

  const outcome={pass:true,checks:checks.length,source:{original:411,newGames:61,
    teams:102,unrated:6,levelsUnassigned:15,historicalUnclassified:39},
    mobile,pageErrors:errors,serverWrites:writes,officialChanges:0};
  fs.writeFileSync(path.join(OUT,"v24_browser_acceptance.json"),JSON.stringify(outcome,null,2));
  console.log(JSON.stringify(outcome,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V24 BROWSER QA FAILED",e.stack||e);process.exitCode=1});
