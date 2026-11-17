/* LeagueOS V23 desktop+mobile live acceptance. Does not write official results. */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V23_QA_URL||"http://127.0.0.1:18900/leagueos-team-os-demo.html?v=v23-local";
const OUT=process.env.SPORTSOS_V23_QA_OUT||path.resolve(__dirname,"../_qa_v23_browser_review");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.SPORTSOS_BROWSER_PATH||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--no-sandbox","--disable-gpu"]});
 const errors=[],writes=[],checks=[];
 const check=(condition,message)=>{assert.ok(condition,message);checks.push(message)};
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",req=>{if(!["GET","HEAD","OPTIONS"].includes(req.method()))writes.push(req.method()+" "+req.url())});
  const response=await page.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"Homepage HTTP 200");
  await page.waitForSelector(".v23-night",{timeout:15000});
  check((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("LEAGUE CENTRAL"),
   "Commissioner site branding retained");
  check((await page.$eval(".v19-tab[aria-current='page']",e=>e.textContent)).trim()==="Division Plan",
   "Division Plan opens as active primary route");
  const heads=await page.$$eval(".v23-night-heading h3",els=>els.map(x=>x.textContent));
  check(JSON.stringify(heads)===JSON.stringify(["Sunday division plan","Tuesday division plan","Wednesday division plan","Thursday division plan"]),
   "Four league nights immediately visible without filters");
  check((await page.$$eval(".v23-night",els=>els.length))===4,"All four night panels in single view");
  const texts=await page.$$eval(".v23-kpis>div",els=>els.map(x=>x.textContent));
  check(texts.length===4&&texts[0].includes("96")&&texts[1].includes("70")&&
   texts[2].includes("4")&&texts[3].includes("3"),"Verified team, player and held-pool counts");
  check((await page.$$eval(".v23-division-card.proposed .v23-team",els=>els.length))===96,
   "Every one of 96 source-rated teams appears in a proposed group exactly once");
  check((await page.$$eval(".v23-pool",els=>els.length))===9,"Nine separate league/program/source components visible");
  const sunday=await page.$eval("#v23-sunday",e=>e.textContent);
  check(sunday.includes("5 / 7 / 10")&&sunday.includes("8 / 8 / 6"),"Sunday candidate uses 8-8-6 instead of existing 5-7-10");
  const tuesday=await page.$eval("#v23-tuesday",e=>e.textContent);
  check(tuesday.includes("6 / 5 / 5")&&tuesday.includes("8 / 8"),"Tuesday candidate uses two groups of eight");
  const wed=await page.$eval("#v23-wednesday",e=>e.textContent);
  check(wed.includes("6 / 8 / 6")&&wed.includes("8 / 6 / 6"),"Wednesday complete twenty-team connected pool modeled");
  const thu=await page.$eval("#v23-thursday",e=>e.textContent);
  check(thu.includes("4 / 5")&&thu.includes("Masters"),"Thursday can split one nine-team pool while Masters remain separate");
  check(thu.includes("EVIDENCE HOLD")&&thu.includes("A & G Cleaners"),
   "Thursday disconnected source division is held, not automatically merged");
  const sourceText=await page.$eval(".v23-refresh",e=>e.textContent);
  check(sourceText.includes("No newly verified reciprocal results")&&sourceText.includes("Newly settled source games: 0"),
   "Daily gate makes no false claim of settled games");
  check((await page.$eval(".v23-disclosure",e=>e.textContent)).includes("no source roster"),
   "Official read-only and no source roster writes disclosed");
  await page.screenshot({path:path.join(OUT,"league_divisions_desktop_v23.png"),fullPage:true});

  // Simple jump must not mutate hash and accidentally navigate to another app screen.
  await page.click('[data-v23-jump="wednesday"]');
  check(page.url().includes("#league-division-plan"),"Night quick-jump retains LeagueOS route");

  await page.click(".v23-evidence>summary");
  const evidence=await page.$eval(".v23-evidence",e=>e.textContent);
  check(evidence.includes("70 exact player-ID")&&/calibration waits/i.test(evidence),
   "Cross-night registered player observations visible with limitation");
  check((await page.$$eval(".v23-bridge-table tbody tr",els=>els.length))===15,
   "Top fifteen exact-ID division pair bridges inspected");
  const pairInfo=await page.$$eval(".v23-bridge-table tbody tr",els=>els.map(x=>x.textContent));
  check(pairInfo.some(x=>x.includes("Thursday")&&x.includes("Sunday")),
   "Cross-night links are based on direct player IDs in both competitions");

  await page.click(".v23-tier-panel>summary");
  check((await page.$$eval("[data-v23-tier]",els=>els.length))===15,
   "All fifteen published divisions have draft-level assignment selectors");
  check((await page.$$eval("[data-v23-tier] option",els=>els.length))===90,
   "Every official-tier proposal offers unassigned and five level options");
  const tierBadge=await page.$eval(".v23-tier-panel",e=>e.textContent);
  check(tierBadge.includes("15 official levels unassigned")&&tierBadge.includes("Drafts do not alter"),
   "Unapproved league tiers are not misrepresented as effective");
  const select=await page.$("[data-v23-tier]");
  const key=await page.$eval("[data-v23-tier]",e=>e.dataset.v23Tier);
  await page.select("[data-v23-tier]","2");
  await page.click("[data-v23-save-tiers]");
  const local=await page.evaluate(()=>JSON.parse(localStorage.getItem("leagueos-v23-tier-drafts-browser-local")||"null"));
  check(local?.drafts?.[key]===2&&local.status==="LOCAL_DRAFT_NOT_LEAGUE_APPROVED",
   "Tier draft saved locally without league approval");
  check((await page.$eval(".v23-kpis>div:first-child",e=>e.textContent)).includes("96"),
   "Draft tier changes cannot alter official team-count source");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForSelector(".v23-night",{timeout:15000});
  await page.click(".v23-tier-panel>summary");
  check((await page.$eval("[data-v23-tier]",e=>e.value))==="2",
   "Draft level persists after reload but remains unapproved");

  await page.evaluate(()=>{
   window.__captured=null;window.__name=null;
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{window.__captured=blob;return create(blob)};
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V23_Draft_Division_Strength_Levels.json"){window.__name=this.download;return}
    return click.call(this);
   };
  });
  await page.click("[data-v23-export-tiers]");
  const exportInfo=await page.evaluate(async()=>{
   return{name:window.__name,data:window.__captured?JSON.parse(await window.__captured.text()):null};
  });
  check(exportInfo.name==="LeagueOS_V23_Draft_Division_Strength_Levels.json",
   "Tier assignment export is locally named and downloadable");
  check(exportInfo.data?.schema==="bruttech-leagueos-strength-level-proposal/v23"&&
   exportInfo.data?.officialWriteAllowed===false&&exportInfo.data?.approval==="NOT_APPROVED_BROWSER_ONLY",
   "Tier export is explicitly unapproved");
  check(exportInfo.data?.assignmentRequests?.length===15&&
   exportInfo.data.assignmentRequests.some(x=>x.proposedLevel===2&&x.approvedLevel===null),
   "Export carries fifteen assignments with no invented official approval");

  // Same mode switch works on large pages.
  await page.click("#sw-team");
  await page.waitForFunction(()=>location.hash==="#team-home");
  await page.waitForSelector("#hockeyos-v21-last-game .v21-home-last",{timeout:14000});
  check((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("BRAVE H.C."),
   "Existing HockeyOS team homepage intact");
  await page.click("#sw-league");
  await page.waitForFunction(()=>location.hash==="#league-home");
  check((await page.$eval("#workspace",e=>e.textContent)).includes("Recommended divisions"),
   "Commissioner league home offers automatic recommended divisions");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-admin"));
  check((await page.$eval("#workspace",e=>e.textContent)).includes("Division recommendations"),
   "League Admin offers automatic four-night division view");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-scoring"));
  check(!!(await page.$("#league-native-scorer-mount")),"Existing LeagueOS scorer still reachable");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-division-plan"));
  await page.waitForSelector(".v23-night",{timeout:14000});

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({
   viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
   nights:document.querySelectorAll(".v23-night").length,
   proposedTeamCount:document.querySelectorAll(".v23-division-card.proposed .v23-team").length
  }));
  check(mobile.documentWidth<=mobile.viewport+2,"Mobile document has no horizontal overflow");
  check(mobile.nights===4&&mobile.proposedTeamCount===96,"All four nights and 96 teams available on mobile");
  await page.screenshot({path:path.join(OUT,"league_divisions_mobile_v23.png"),fullPage:true});
  await page.click(".v23-tier-panel>summary");
  const mobileTier=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    fields:document.querySelectorAll("[data-v23-tier]").length}));
  check(mobileTier.doc<=mobileTier.w+2&&mobileTier.fields===15,
   "Mobile league tier configuration fields are present without page overflow");
  await page.screenshot({path:path.join(OUT,"division_tiers_mobile_v23.png"),fullPage:true});
  check(errors.length===0,"No unhandled browser errors: "+JSON.stringify(errors));
  check(writes.length===0,"No HTTP mutations to SVHL, HTO or GitHub Pages");

  // Deliberate tampering in a new browser session must show source HOLD.
  const invalid=await browser.newPage();await invalid.setRequestInterception(true);
  const tampered=JSON.parse(fs.readFileSync(path.resolve(__dirname,"../widgets/leagueos-division-recommendations-v23.json"),"utf8"));
  tampered.officialStandingsChanged=true;
  invalid.on("request",req=>{
   if(req.url().includes("leagueos-division-recommendations-v23.json"))
    req.respond({status:200,contentType:"application/json",body:JSON.stringify(tampered)});
   else req.continue();
  });
  await invalid.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:25000});
  await invalid.waitForSelector(".v23-failed",{timeout:16000});
  const sourceHeld=await invalid.evaluate(()=>window.LeagueOSDivisionV23?._test?.getSource?.()===null&&
    document.querySelectorAll(".v23-division-card.proposed").length===0);
  check(sourceHeld,"Forged official data-change flag fails closed without a valid division model");
  await invalid.close();

  const result={pass:true,checks:checks.length,source:{nights:4,teams:96,exactPlayerIds:70,
   provisionalPoolChanges:4,heldPools:3,officialAssignedTiers:0},
   mobile,serverWrites:writes,pageErrors:errors,officialChanges:0,
   tested:checks,screenshots:["league_divisions_desktop_v23.png","league_divisions_mobile_v23.png",
     "division_tiers_mobile_v23.png"]};
  fs.writeFileSync(path.join(OUT,"v23_browser_acceptance.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,checks:result.checks,source:result.source,
    mobile,errors,writes},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V23 BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
