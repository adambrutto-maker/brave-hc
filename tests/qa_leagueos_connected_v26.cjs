/* SportsOS V26 — full fictional commissioner → captain → player → rink → public browser QA.
 * The demo must never POST to SVHL/HTO, issue real payments, upload logos or sign games.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V26_QA_URL||
 "http://127.0.0.1:18910/leagueos-team-os-demo.html?v=v26-local";
const OUT=process.env.SPORTSOS_V26_QA_OUT||path.resolve(__dirname,"../_qa_v26");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const tests=[],errors=[],writes=[];
 const check=(good,label)=>{assert.ok(good,label);tests.push(label)};
 const role=async(page,r)=>{
  await page.click('[data-v26-role="'+r+'"]');
  await page.waitForSelector('[data-v26-role="'+r+'"][aria-current="step"]');
 };
 const action=async(page,code)=>page.click('[data-v26-action="'+code+'"]');
 const navigate=async(page,r)=>{await page.evaluate(x=>window.LeagueOSDemoBridgeV13.go(x),r);
  await page.waitForFunction(x=>location.hash==="#"+x,{},r)};
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const res=await page.goto(BASE+"#league-connected-demo",{waitUntil:"domcontentloaded",timeout:30000});
  check(res.status()===200,"V26 connected demo returns HTTP 200");
  await page.waitForSelector("#leagueos-connected-demo-v26 .v26-workbench",{timeout:18000});
  check((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("LEAGUE CENTRAL"),
   "Commissioner source website still branded");
  check((await page.$$eval(".v19-tab",xs=>xs.length))===10,"No extra crowded primary league tabs introduced");
  const head=await page.$eval(".v26-head",e=>e.textContent);
  check(head.includes("One league")&&head.includes("Captains, players, game day"),
   "Approved one-connected-subscription demo thesis visible");
  check((await page.$$eval(".v26-steps button",xs=>xs.map(x=>x.textContent))).length===5,
   "Five readable roles from commissioner through public site");
  const kpis=await page.$$eval(".v26-overview-kpis:first-of-type>div",xs=>xs.map(x=>x.textContent));
  check(kpis.length===4&&kpis[0].includes("24")&&kpis[2].includes("0")&&kpis[3].includes("0"),
   "All 24 teams fictional with no registered payments or official actions");
  const divisions=await page.$$eval(".v26-division-list.recommended>details",xs=>xs.map(x=>x.textContent));
  check(divisions.length===3&&divisions[0].includes("A North")&&divisions[0].includes("8 teams")&&
   divisions[1].includes("A South")&&divisions[1].includes("9 teams")&&
   divisions[2].includes("D Recreational")&&divisions[2].includes("7 teams"),
   "A North 8, A South 9, D Recreational 7 with no invented B/C division");
  check((await page.$eval(".v26-division-list",x=>x.textContent)).includes("Current North Division"),
   "Original fictional season division identity separated from strength grade");
  await page.screenshot({path:path.join(OUT,"v26_commissioner_desktop.png"),fullPage:false});

  await page.select("#v26-target","6");await action(page,"TARGET");
  const changed=await page.$$eval(".v26-division-list.recommended>details",xs=>xs.map(x=>x.textContent));
  check(changed.length===4&&changed.some(x=>x.includes("A Central")),
   "Commissioner can change division count and target size rather than force a fixed structure");
  await page.select("#v26-target","9");await action(page,"TARGET");
  check((await page.$$eval(".v26-division-list.recommended>details",xs=>xs.length))===3,
   "Default 8/9/7 scenario recoverable");

  await page.select("#v26-week","13");await action(page,"WEEK");
  check((await page.$('[data-v26-action="REVIEW"]')).constructor!==undefined&&
   (await page.$eval('[data-v26-action="REVIEW"]',e=>e.disabled))===true,
   "Final lock disables new division reviews");
  check((await page.$eval(".v26-gate-status",x=>x.textContent)).includes("FINAL LOCK"),
   "Final placement lock is visible after midseason");
  await page.select("#v26-week","5");await action(page,"WEEK");
  check((await page.$eval('[data-v26-action="REVIEW"]',e=>e.disabled))===false,
   "Rulebook week five review window enables simulated commissioner review");
  await action(page,"REVIEW");
  const reviewed=await page.$eval(".v26-gate-status",e=>e.textContent);
  check(reviewed.includes("SIMULATED_REVIEWED")&&reviewed.includes("NOT_PUBLISHED"),
   "Commissioner review does not automatically publish a real or fictional division");
  await action(page,"PUBLISH");
  check((await page.$eval(".v26-gate-status",e=>e.textContent)).includes("FICTIONAL_PUBLIC_PREVIEW"),
   "Explicit fictional commissioner publication is auditable");
  await role(page,"public");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("A North")&&
   (await page.$eval(".v26-workbench",e=>e.textContent)).includes("D Recreational"),
   "Fictional public site reads only the simulated published decision");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("approved artwork not yet available"),
   "Unmoderated team crest is withheld from public view");

  await role(page,"captain");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("TeamOS Core"),
   "Captain sees included team functions and optional advanced capabilities separately");
  await action(page,"REMIND");await action(page,"GOALIE_POLL");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("1 reminder previews"),
   "Captain no-show reminder is local and not sent");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("OPEN_FOR_DEMO"),
   "Spare-goalie poll available without actual player contact");
  await page.select("#v26-logo-choice","Wolf Crest");
  await page.select("#v26-logo-colour","Teal");
  await action(page,"LOGO_SUBMIT");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("PENDING_DEMO_MODERATION"),
   "Fictional crest submission requires separate commissioner moderation");
  const rawQuestion="Will the league lock divisions by playoffs? <img src=x onerror=alert(1)>";
  await page.type("#v26-captain-question",rawQuestion);
  await action(page,"ASK_LEAGUE");
  check((await page.$$eval(".v26-workbench img",xs=>xs.length))===0,
   "Captain question is treated as text, not executable markup");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("PENDING_DEMO_REPLY"),
   "Captain inquiry enters local commissioner queue");
  await page.screenshot({path:path.join(OUT,"v26_captain_desktop.png"),fullPage:false});

  await role(page,"player");
  const playerIntro=await page.$eval(".v26-workbench",e=>e.textContent);
  check(playerIntro.includes("Registration")&&playerIntro.includes("No real registration"),
   "HockeyOS player account is explicitly fictional, not a live login");
  check(playerIntro.includes("Included HockeyOS Core")&&playerIntro.includes("Optional advanced research"),
   "Core participation is bundled; advanced analytics optional");
  check((await page.$eval('[data-v26-action="WAIVER"]',e=>e.disabled))===true,
   "Mock waiver cannot precede fictional registration");
  await action(page,"REGISTER");await action(page,"WAIVER");await action(page,"RECEIPT");
  const receipt=await page.$eval(".v26-receipt",e=>e.textContent);
  check(receipt.includes("$0.00 charged")&&receipt.includes("no transaction"),
   "Mock financial receipt cannot claim real money collection");
  await action(page,"RSVP");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("IN"),
   "Player RSVP stored locally and visible to captains");
  await page.screenshot({path:path.join(OUT,"v26_player_desktop.png"),fullPage:false});

  await role(page,"captain");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("Alex Example")&&
   (await page.$eval(".v26-workbench",e=>e.textContent)).includes("IN"),
   "Captain sees fictional player RSVP within the same browser");
  await role(page,"commissioner");
  await action(page,"LOGO_APPROVE");
  await page.type("#v26-commissioner-reply","The fictional final alignment window closes after Week 12.");
  await action(page,"REPLY");
  await role(page,"public");
  const pub=await page.$eval(".v26-workbench",e=>e.textContent);
  check(pub.includes("Wolf Crest")&&pub.includes("Approved in this fictional browser"),
   "Only moderated fictional team crest appears publicly");
  check(pub.includes("FICTIONAL_RESOLVED")&&pub.includes("closes after Week 12"),
   "League-office response visibly travels back through the fictional public workflow");
  check(pub.includes("Cristillo Division")&&pub.includes("separate memorial-naming"),
   "Real-source Cristillo identity kept distinct from invented team grades");
  await page.screenshot({path:path.join(OUT,"v26_public_preview_desktop.png"),fullPage:false});

  await role(page,"rink");
  const gameNote=await page.$eval(".v26-workbench",e=>e.textContent);
  check(gameNote.includes("does not become an official referee-signed game sheet")&&gameNote.includes("short-lived"),
   "Game-scoped QR policy explicitly refuses official score-sheet claims");
  await action(page,"QR_ISSUE");
  check((await page.$$eval(".v26-qr-demo i",xs=>xs.length))===121,
   "Fictional QR pattern is present and labelled unscannable");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("not a scannable"),
   "Game QR display does not pretend to be an authenticated digital token");
  await action(page,"QR_SCAN");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("ATTENDANCE_PENDING_SCOREKEEPER_REVIEW"),
   "Roster/waiver/RSVP-gated fictional scan records pending attendance");
  await action(page,"QR_SCAN");
  check((await page.$eval(".v26-notice",e=>e.textContent)).includes("Duplicate check-in blocked"),
   "Replay of a game-scoped demo check-in is rejected");
  await action(page,"SCOREKEEPER_REVIEW");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("FICTIONAL_SCOREKEEPER_REVIEWED_NOT_SIGNED"),
   "Scorekeeper reconciliation stays unsigned");
  await action(page,"MANUAL_EXCEPTION");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("OFFLINE_EXCEPTION_PENDING_MANUAL_REVIEW"),
   "Offline/manual exception remains pending rather than certifying attendance");
  await page.screenshot({path:path.join(OUT,"v26_game_day_desktop.png"),fullPage:false});

  // Browser-local evidence export must have no hidden official state or payment.
  await page.click(".v26-audit summary");
  const audit=await page.$eval(".v26-audit",e=>e.textContent);
  check(audit.includes("FICTIONAL_QR_ATTENDANCE_RECORDED")&&audit.includes("FICTIONAL_PUBLIC_VIEW_UPDATED"),
   "Local audit captures both public plan and game attendance history");
  await page.evaluate(()=>{
   window.__v26Blob=null;window.__v26Name=null;
   const old=URL.createObjectURL.bind(URL);
   URL.createObjectURL=(x)=>{window.__v26Blob=x;return old(x)};
   const click=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="BruTTech_SportsOS_V26_Fictional_Demo_Receipt.json"){
     window.__v26Name=this.download;return;
    }
    return click.call(this);
   };
  });
  await action(page,"EXPORT");
  const exported=await page.evaluate(async()=>({
   name:window.__v26Name,
   source:window.__v26Blob?JSON.parse(await window.__v26Blob.text()):null
  }));
  check(exported.name==="BruTTech_SportsOS_V26_Fictional_Demo_Receipt.json",
   "Handoff receipt is a downloadable local artifact, not a sent message");
  check(exported.source?.officialActions===0&&exported.source?.bankCharges===0&&
   exported.source?.actualRegistration===false&&exported.source?.realSignatures===false,
   "Audit export explicitly declares zero official, banking, authentication and legal actions");
  check(exported.source?.storyState?.gameDay?.attestation?.officialSignature===false,
   "No fake game-sheet signature exported");
  await page.reload({waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector("#leagueos-connected-demo-v26 .v26-workbench",{timeout:18000});
  await role(page,"public");
  check((await page.$eval(".v26-workbench",e=>e.textContent)).includes("Wolf Crest"),
   "Browser-only moderation result persists after reload");
  await navigate(page,"team-connected-demo");
  await page.waitForSelector(".v26-workbench",{timeout:15000});
  check((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("BRAVE H.C."),
   "TeamOS uses the existing HockeyOS/Brave H.C. shell without a new primary league tab");
  check((await page.$eval(".v26-section-label",e=>e.textContent)).includes("CAPTAIN"),
   "Direct team-facing deep link opens captain view");
  await navigate(page,"team-home");
  check((await page.$eval("#workspace",e=>e.textContent)).includes("Connected demo"),
   "TeamOS home offers the connected-role workflow without replacing existing functions");
  await navigate(page,"league-home");
  check((await page.$eval("#workspace",e=>e.textContent)).includes("Connected league demo"),
   "Commissioner league home links to connected demo");

  await navigate(page,"league-connected-demo");
  await page.waitForSelector(".v26-workbench",{timeout:15000});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({
   width:innerWidth,scroll:document.documentElement.scrollWidth,
   roles:document.querySelectorAll(".v26-steps button").length,
   proposed:document.querySelectorAll(".v26-division-list.recommended details").length
  }));
  check(mobile.scroll<=mobile.width+2,"390px mobile has zero page-level horizontal overflow");
  check(mobile.roles===5&&mobile.proposed===3,"Mobile commissioner sees all five role tabs and approved demo grouping");
  await page.screenshot({path:path.join(OUT,"v26_mobile_commissioner.png"),fullPage:false});
  for(const r of ["captain","player","rink","public"]){
   await role(page,r);
   const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,w:innerWidth}));
   check(size.doc<=size.w+2,"390px mobile "+r+" view has no page overflow");
  }
  await page.screenshot({path:path.join(OUT,"v26_mobile_public.png"),fullPage:false});
  check(errors.length===0,"No unhandled JavaScript page errors: "+errors.join(";"));
  check(writes.length===0,"No HTTP POST/PUT/PATCH to any application");

  const bad=JSON.parse(fs.readFileSync(path.resolve(__dirname,
    "../widgets/leagueos-connected-fictional-v26.json"),"utf8"));
  bad.authorization.paymentProcessing=true;
  const invalid=await browser.newPage();
  await invalid.setRequestInterception(true);
  invalid.on("request",request=>{
   if(request.url().includes("leagueos-connected-fictional-v26.json"))
    request.respond({status:200,contentType:"application/json",body:JSON.stringify(bad)});
   else request.continue();
  });
  await invalid.goto(BASE+"#league-connected-demo",{waitUntil:"domcontentloaded",timeout:30000});
  await invalid.waitForSelector(".v26-failed",{timeout:15000});
  check((await invalid.$eval(".v26-failed",e=>e.textContent)).includes("failed validation"),
   "Forged live-payment processing permission fails the fictional seed source gate");
  await invalid.close();

  const result={pass:true,checks:tests.length,source:{fictionalTeams:24,
   initialADivisionSizes:[8,9],initialDDivisionSizes:[7],simulatedRoles:5,
   officialTransactions:0,realPayments:0,realSignatures:0},
   mobile,errors,writes,officialChanges:0,
   screenshots:["v26_commissioner_desktop.png","v26_captain_desktop.png",
    "v26_player_desktop.png","v26_public_preview_desktop.png",
    "v26_game_day_desktop.png","v26_mobile_commissioner.png","v26_mobile_public.png"]};
  fs.writeFileSync(path.join(OUT,"v26_browser_acceptance.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
 }finally{await browser.close()}
})().catch(err=>{console.error("V26 BROWSER QA FAILED: "+(err.stack||err));process.exitCode=1});
