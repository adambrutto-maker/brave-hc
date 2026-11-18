/* V28 actual browser ice-slot and competitive-fairness acceptance. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V28_QA_URL||
 "http://127.0.0.1:18918/leagueos-team-os-demo.html?v=28";
const OUT=process.env.SPORTSOS_V28_QA_OUT||path.resolve(__dirname,"../_qa_v28");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||
   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[];
 const check=(truth,msg)=>{assert.ok(truth,msg);checks.push(msg)};
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))
   writes.push(r.method()+" "+r.url())});
  const response=await page.goto(BASE+"#league-connected-demo",
   {waitUntil:"domcontentloaded",timeout:30000});
  check(response.status()===200,"LeagueOS demo main site HTTP 200");
  await page.waitForSelector("#leagueos-v28-ice-planner .v28-ice",{timeout:16000});
  check((await page.$eval(".v28-ice header",e=>e.textContent)).includes("COMMISSIONER ICE & FAIRNESS"),
   "Integrated V28 commissioner schedule planner loads in same V26 role");
  check((await page.$eval(".v28-status",e=>e.textContent)).trim()==="CAPACITY FEASIBLE",
   "Default fictional rink inventory meets full 22-game capacity");
  const kpis=await page.$$eval(".v28-keys>div",els=>els.map(e=>e.textContent));
  check(kpis.length===4&&kpis[0].includes("22")&&kpis[1].includes("24")&&
   kpis[2].includes("22")&&kpis[3].includes("0"),"22 requests, 24 sample slots and zero real bookings");
  check((await page.$eval(".v28-fairness",e=>e.textContent)).includes("Start-time equity score")&&
   (await page.$eval(".v28-fairness",e=>e.textContent)).includes("Late-start exposure spread"),
   "Start-time fairness comparison and late exposure are decision visible");
  check((await page.$eval(".v28-disclosure",e=>e.textContent)).includes("invented venue exercise"),
   "Fictional ice and sample-limit disclosure visible");
  check((await page.$$eval(".v28-rows>div",els=>els.length))===11,
   "Week 13 exposes exactly 11 draft matchups with source-qualified IDs");
  const first=await page.$eval(".v28-rows>div",e=>e.textContent);
  check(first.includes("Fictional Rink")&&first.includes("Unbooked scenario"),
   "Rink and time are labelled as hypothetical, never booked");
  await page.screenshot({path:path.join(OUT,"v28_commissioner_capacity_desktop.png"),fullPage:false});
  await page.$eval(".v28-ice",e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(OUT,"v28_schedule_desktop.png"),fullPage:false});

  await page.select("[data-v28-week]","14");
  check((await page.$eval(".v28-details[open]>summary",e=>e.textContent)).includes("Week 14"),
   "Commissioner can inspect week 14 of the imaginary schedule");
  check((await page.$$eval(".v28-rows>div",els=>els.length))===11,
   "Second week holds 11 complete matchups");
  await page.select("[data-v28-mode]","ONE_SLOT_PER_WEEK_UNAVAILABLE");
  check((await page.$eval(".v28-status",e=>e.textContent)).trim()==="CAPACITY FEASIBLE",
   "Removing one last time slot per week remains feasible");
  const limited=await page.$$eval(".v28-keys>div",els=>els.map(e=>e.textContent));
  check(limited[1].includes("22")&&limited[2].includes("22"),
   "Tighter 22-slot inventory still fits the full 22-game sample");
  check((await page.$eval(".v28-fairness",e=>e.textContent)).includes("Unused fictional slots0"),
   "No buffer remains with only 22 sample slots");
  await page.select("[data-v28-mode]","RINK_C_UNAVAILABLE");
  check((await page.$eval(".v28-status",e=>e.textContent)).includes("CAPACITY HOLD"),
   "Closing fictional Rink C triggers explicit scheduling hold");
  const hold=await page.$eval(".v28-held",e=>e.textContent);
  check(hold.includes("Week 13")&&hold.includes("Week 14")&&
   hold.includes("short 3")&&hold.includes("No partial plan"),
   "Commissioner sees six unallocated fixtures and no partial-pass misrepresentation");
  check((await page.$(".v28-rows"))===null,
   "Infeasible schedule cannot display game-time allocations");
  const blocked=await page.evaluate(()=>{
   const s=window.LeagueOSConnectedV26._test.getSeed(),
    st=window.LeagueOSConnectedV26._test.getState(),
    rec=window.LeagueOSConnectedV26._test.recommend(s,{targetSize:st.targetSize,overrides:st.overrides}),
    ice=window.LeagueOSIceV28._test.getInventory();
   return window.LeagueOSIceV28._test.plan(s,st,rec,ice,"RINK_C_UNAVAILABLE");
  });
  check(blocked.requestedGames===22&&blocked.assignedSlotCount===0&&
   blocked.capacityHold.reduce((n,x)=>n+x.shortfall,0)===6,
   "Infeasible input yields a whole-plan hold, never a booked partial schedule");

  await page.select("[data-v28-mode]","FULL_FICTIONAL_CAPACITY");
  await page.select("#v26-target","6");
  await page.click('[data-v26-action="TARGET"]');
  await page.waitForSelector(".v28-status");
  const updated=await page.evaluate(()=>{
   const s=window.LeagueOSConnectedV26._test.getSeed(),
   st=window.LeagueOSConnectedV26._test.getState(),
   rec=window.LeagueOSConnectedV26._test.recommend(s,{targetSize:st.targetSize,overrides:st.overrides});
   return{groupSizes:rec.groups.map(x=>x.teamIds.length),
    plan:window.LeagueOSIceV28._test.plan(s,st,rec,
     window.LeagueOSIceV28._test.getInventory())};
  });
  check(updated.groupSizes.join(",")==="5,6,6,7"&&
   updated.plan.proposedDivisions===4,
   "Changing division size automatically recomputes the schedule against new groups");
  check(updated.plan.games.length===22&&updated.plan.officialBookingsChanged===false,
   "Recomputed schedule remains complete and unbooked");
  await page.select("#v26-target","9");
  await page.click('[data-v26-action="TARGET"]');

  await page.select("#v26-grade-team","FIC-A-01");
  await page.select("#v26-grade","B");
  await page.click('[data-v26-action="GRADE"]');
  check((await page.$eval(".v28-status",e=>e.textContent)).includes("HOLD"),
   "Orphan B-grade team blocks schedule instead of inventing extra B division");
  check((await page.$(".v28-rows"))===null,"Undersized division prevents scheduling");
  await page.select("#v26-grade","A");
  await page.click('[data-v26-action="GRADE"]');
  check((await page.$eval(".v28-status",e=>e.textContent)).includes("FEASIBLE"),
   "Restoring original group returns to feasible unslotted schedule");

  await page.select("#v26-week","13");
  await page.click('[data-v26-action="WEEK"]');
  check((await page.$eval(".v28-held",e=>e.textContent)).includes("No invented ice allocation"),
   "After final lock, missing fictional public snapshot is held");
  check((await page.$eval(".v28-rule",e=>e.textContent)).includes("No authorized fictional division snapshot"),
   "Post-lock schedule cannot silently use a newly recalculated division");

  await page.select("#v26-week","5");
  await page.click('[data-v26-action="WEEK"]');
  await page.click('[data-v26-action="REVIEW"]');
  await page.click('[data-v26-action="PUBLISH"]');
  await page.select("#v26-week","13");
  await page.click('[data-v26-action="WEEK"]');
  check((await page.$eval(".v28-rule",e=>e.textContent)).includes("previously published fictional groups"),
   "Post-lock uses the historical fictional published groups, not new candidate movement");
  check((await page.$eval(".v28-status",e=>e.textContent)).includes("FEASIBLE"),
   "Previously published fictional plan remains schedulable after final lock");
  const locked=await page.evaluate(()=>{
   const s=window.LeagueOSConnectedV26._test.getSeed(),st=window.LeagueOSConnectedV26._test.getState();
   return window.LeagueOSIceV28._test.plan(s,st,
    window.LeagueOSConnectedV26._test.recommend(s,{targetSize:st.targetSize,overrides:st.overrides}),
    window.LeagueOSIceV28._test.getInventory());
  });
  check(locked.locked===true&&locked.hasFictionalApproval===true&&
   locked.authority==="PUBLISHED_FICTIONAL_DIVISIONS_LOCKED",
   "Frozen fictional group membership controls the entire schedule preview");

  await page.evaluate(()=>{
   window.__v28Blob=null;window.__v28Name=null;
   const f=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__v28Blob=b;return f(b)};
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V28_FICTIONAL_Ice_Schedule_Fairness_Review.json"){
      window.__v28Name=this.download;return;
    }
    return click.call(this);
   };
  });
  await page.click("[data-v28-export]");
  const exportInfo=await page.evaluate(async()=>({
   name:window.__v28Name,data:window.__v28Blob?JSON.parse(await window.__v28Blob.text()):null
  }));
  check(exportInfo.name==="LeagueOS_V28_FICTIONAL_Ice_Schedule_Fairness_Review.json",
   "Commissioner can export a local fictional ice capacity report");
  check(exportInfo.data?.officialLeagueWriteAllowed===false&&
   exportInfo.data?.facilityBookingAuthority==="NONE_BROWSER_ONLY"&&
   exportInfo.data?.financialTransactions===0,
   "Export makes no claim of booking, billing or approval");
  check(exportInfo.data?.games?.length===22&&exportInfo.data?.bookedSlots===0,
   "All 22 hypothetical time allocations export with zero real reservations");
  await page.click('[data-v26-role="captain"]');
  check((await page.$(".v28-ice"))===null,
   "Ice allocation decision panel is scoped to commissioner, not captain or player views");
  await page.click('[data-v26-role="commissioner"]');
  await page.waitForSelector(".v28-ice",{timeout:12000});
  check((await page.$eval(".v28-rule",e=>e.textContent)).includes("previously published"),
   "Commissioner role return retains final lock and fictional source snapshot");

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({w:innerWidth,
   doc:document.documentElement.scrollWidth,keys:document.querySelectorAll(".v28-keys>div").length,
   rows:document.querySelectorAll(".v28-rows>div").length,
   status:document.querySelector(".v28-status")?.textContent}));
  check(mobile.doc<=mobile.w+2,
   "390px viewport displays commissioner ice planning without document horizontal overflow");
  check(mobile.keys===4&&mobile.rows===11,"All capacity KPIs and 11 game rows available on mobile");
  await page.$eval(".v28-ice",e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:path.join(OUT,"v28_commissioner_mobile.png"),fullPage:false});
  await page.click(".v28-details:nth-of-type(2)>summary");
  const teamMobile=await page.evaluate(()=>({w:innerWidth,
   doc:document.documentElement.scrollWidth,
   rows:document.querySelectorAll(".v28-table-scroll tbody tr").length}));
  check(teamMobile.doc<=teamMobile.w+2&&teamMobile.rows===24,
   "24-team early/late exposure table scrolls internally on mobile");
  await page.screenshot({path:path.join(OUT,"v28_fairness_mobile.png"),fullPage:false});

  const forged=JSON.parse(fs.readFileSync(path.resolve(__dirname,
   "../widgets/leagueos-fictitious-ice-v28.json"),"utf8"));
  forged.facilityAuthorization=true;
  const hostile=await browser.newPage();
  await hostile.setRequestInterception(true);
  hostile.on("request",r=>{
   if(r.url().includes("leagueos-fictitious-ice-v28.json"))
    r.respond({status:200,contentType:"application/json",body:JSON.stringify(forged)});
   else r.continue();
  });
  await hostile.goto(BASE+"#league-connected-demo",{waitUntil:"domcontentloaded",timeout:25000});
  await hostile.waitForSelector(".v28-source-hold",{timeout:14000});
  check((await hostile.$eval(".v28-source-hold",e=>e.textContent)).includes("failed"),
   "Forged facility authority produces a fail-closed source hold");
  await hostile.close();
  check(errors.length===0,"No unhandled Edge browser JavaScript errors");
  check(writes.length===0,"No HTTP source booking or league mutation");
  const out={pass:true,checks:checks.length,source:{
    fictionalWeeks:[13,14],inventedIceSlots:24,proposedMatchups:22,
    confirmedBookings:0,capacityShortfallIfRinkCClosed:6,
    publicLeagueChanges:0},mobile,errors,writes,officialChanges:0,
    screenshots:["v28_commissioner_capacity_desktop.png","v28_schedule_desktop.png",
     "v28_commissioner_mobile.png","v28_fairness_mobile.png"]};
  fs.writeFileSync(path.join(OUT,"v28_browser_acceptance.json"),JSON.stringify(out,null,2));
  console.log(JSON.stringify(out,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V28 BROWSER QA FAILED",e.stack||e);process.exitCode=1});
