/* V29 real Edge desktop/mobile commissioner scenario and zero-write acceptance. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V29_QA_URL||
 "http://127.0.0.1:18929/leagueos-team-os-demo.html?v=29";
const OUT=process.env.SPORTSOS_V29_QA_OUT||path.resolve(__dirname,"../_qa_v29");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||
   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[];
 const check=(ok,msg)=>{assert.ok(ok,msg);checks.push(msg)};
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))
   writes.push(r.method()+" "+r.url())});
  const response=await page.goto(BASE+"#league-connected-demo",
   {waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"Connected demo entry returns HTTP 200");
  await page.waitForSelector("#leagueos-v29-season-planner .v29-season",{timeout:35000});
  check((await page.$eval(".v29-season header",e=>e.textContent))
   .includes("FULL-SEASON FAIRNESS"),"V29 embedded under commissioner V26 without new primary navigation");
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("FICTIONAL FEASIBLE"),
   "Default 24-week fiction scenario is feasible");
  const keys=await page.$$eval(".v29-keys>div",x=>x.map(el=>el.textContent));
  check(keys.length===4&&keys[0].includes("24")&&keys[1].includes("264")&&
   keys[2].includes("288")&&keys[3].includes("0"),
   "24 weeks, 264 fictional games, 288 source slots, zero real bookings");
  const before=await page.$eval(".v29-fairness",e=>e.textContent);
  check(before.includes("Full-season equity penalty")&&before.includes("9 PM+")&&
   before.includes("10 PM+"),"Season-wide average, late and very-late equity exposed");
  check(before.includes("2/2"),"Two immutable fictional commitments preserved");
  check((await page.$$eval(".v29-games>div",x=>x.length))===11,
   "Week 13 initially exposes 11 invented games");
  check((await page.$$eval(".v29-games>div",x=>x.filter(e=>e.textContent.includes("Fixed in simulation")).length))===1,
   "At least one visible week-13 fixture is pinned");
  await page.$eval(".v29-season",e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(OUT,"v29_commissioner_season_desktop.png"),fullPage:false});
  await page.select("[data-v29-week]","14");
  check((await page.$eval(".v29-details[open]>summary",e=>e.textContent)).includes("Week 14"),
   "Commissioner can inspect another week without changing bookings");
  check((await page.$$eval(".v29-games>div",x=>x.length))===11,
   "Week 14 has all 11 invented assignments");
  await page.select("[data-v29-mode]","OTHER_PROGRAM_COMMITMENTS");
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("FICTIONAL FEASIBLE"),
   "Reserving one competing-program slot per week still fits all games");
  const other=await page.$$eval(".v29-keys>div",x=>x.map(el=>el.textContent));
  check(other[2].includes("264"),"Cross-program what-if has exactly 264 usable slots");
  await page.select("[data-v29-mode]","RINK_C_UNAVAILABLE");
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("SCHEDULING HOLD"),
   "Closing fictional Rink C blocks the entire season");
  const held=await page.$eval(".v29-hold",e=>e.textContent);
  check(held.includes("Week 1")&&held.includes("short 3")&&held.includes("24 affected weeks"),
   "Entire 72-slot deficit remains visible without partial schedule output");
  check((await page.$(".v29-games"))===null,
   "Held capacity scenario shows no partial game timetable");
  await page.select("[data-v29-mode]","PINNED_SLOT_UNAVAILABLE");
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("SCHEDULING HOLD"),
   "Removing a fixed fictional game slot holds even with spare ice elsewhere");
  check((await page.$eval(".v29-hold",e=>e.textContent)).includes("FIXED SLOT UNAVAILABLE"),
   "Fixed game conflict is distinguished from capacity shortfall");
  await page.select("[data-v29-mode]","FULL_FICTIONAL_SEASON");
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("FICTIONAL FEASIBLE"),
   "Returning to full mode restores an entirely hypothetical workable season");
  await page.evaluate(()=>{
   window.__v29Blob=null;window.__v29Name=null;
   const orig=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__v29Blob=b;return orig(b)};
   const old=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V29_FICTIONAL_Full_Season_Review.json"){
     window.__v29Name=this.download;return;
    }return old.call(this);
   };
  });
  await page.click("[data-v29-export]");
  const exportData=await page.evaluate(async()=>({
   name:window.__v29Name,
   data:window.__v29Blob?JSON.parse(await window.__v29Blob.text()):null
  }));
  check(exportData.name==="LeagueOS_V29_FICTIONAL_Full_Season_Review.json",
   "Browser-only commissioner season review download activated");
  check(exportData.data?.games?.length===264&&
   exportData.data?.bookedSlots===0&&exportData.data?.realIceReservations===0,
   "Export contains entire unbooked schedule and zero real reservations");
  check(exportData.data?.officialScheduleWriteAllowed===false&&
   exportData.data?.commissionerApproval==="NOT_AUTHENTICATED"&&
   exportData.data?.sourceLeagueChanges===0,
   "Export explicitly denies commissioner approval and official write authority");
  await page.click('[data-v26-role="captain"]');
  check((await page.$(".v29-season"))===null,
   "Season optimizer remains commissioner-only in five-role demo");
  await page.click('[data-v26-role="commissioner"]');
  await page.waitForSelector(".v29-season",{timeout:15000});
  check((await page.$eval(".v29-status",e=>e.textContent)).includes("FICTIONAL FEASIBLE"),
   "Returning to commissioner restores fictional scenario");
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({width:innerWidth,
   documentWidth:document.documentElement.scrollWidth,
   keys:document.querySelectorAll(".v29-keys>div").length,
   gameRows:document.querySelectorAll(".v29-games>div").length}));
  check(mobile.documentWidth<=mobile.width+2,
   "390px viewport has no document-level horizontal overflow");
  check(mobile.keys===4&&mobile.gameRows===11,
   "Phone view retains KPIs and all week-14 matchups");
  await page.$eval(".v29-season",e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(OUT,"v29_commissioner_season_mobile.png"),fullPage:false});
  await page.click(".v29-details:nth-of-type(2)>summary");
  const table=await page.evaluate(()=>({rows:document.querySelectorAll(".v29-details:nth-of-type(2) .v29-table tbody tr").length,
   width:innerWidth,documentWidth:document.documentElement.scrollWidth}));
  check(table.rows===24&&table.documentWidth<=table.width+2,
   "All 24 teams and 9 PM/10 PM fairness stay internally scrollable on phone: "+JSON.stringify(table));
  await page.screenshot({path:path.join(OUT,"v29_24_team_fairness_mobile.png"),fullPage:false});
  check((await page.$eval(".v29-disclosure",e=>e.textContent))
   .includes("No authentic commissioner permission"),"Prominent no-authority disclosure survives mobile");
  const forged=JSON.parse(fs.readFileSync(path.join(__dirname,
   "../widgets/leagueos-fictitious-season-v29.json"),"utf8"));
  forged.safety.facilityAuthorization=true;
  const hostile=await browser.newPage();
  await hostile.setRequestInterception(true);
  hostile.on("request",r=>{
   if(r.url().includes("leagueos-fictitious-season-v29.json"))
    r.respond({status:200,contentType:"application/json",body:JSON.stringify(forged)});
   else r.continue();
  });
  await hostile.goto(BASE+"#league-connected-demo",{waitUntil:"domcontentloaded",timeout:30000});
  await hostile.waitForSelector(".v29-source-hold",{timeout:22000});
  check((await hostile.$eval(".v29-source-hold",e=>e.textContent))
   .includes("No timetable proposed"),"Forged facility-approval flag fails closed in browser");
  await hostile.close();
  check(errors.length===0,"No uncaught Edge JavaScript errors");
  check(writes.length===0,"No HTTP POST, PATCH, PUT or real booking writes");
  const output={pass:true,checks:checks.length,fictionalWeeks:24,matchups:264,
   inventedSlots:288,realIceReservations:0,mobile,errors,writes,
   screenshots:["v29_commissioner_season_desktop.png","v29_commissioner_season_mobile.png",
    "v29_24_team_fairness_mobile.png"]};
  fs.writeFileSync(path.join(OUT,"v29_browser_acceptance.json"),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V29 EDGE QA FAILED",e.stack||e);process.exitCode=1});
