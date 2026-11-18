/* LeagueOS + HockeyOS V25 live/isolated browser QA: local only, no official mutations. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const BASE=process.env.SPORTSOS_V25_QA_URL||
 "http://127.0.0.1:18906/leagueos-team-os-demo.html?v=v25";
const OUT=process.env.SPORTSOS_V25_QA_OUT||path.resolve(__dirname,"../_qa_v25_review");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.SPORTSOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const errors=[],writes=[],checks=[];
 const test=(truth,label)=>{assert.ok(truth,label);checks.push(label)};
 const route=async(page,key)=>{
  await page.evaluate(v=>window.LeagueOSDemoBridgeV13.go(v),key);
  await page.waitForFunction(x=>location.hash==="#"+x,{},key);
 };
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",req=>{if(!["GET","HEAD","OPTIONS"].includes(req.method()))writes.push(req.method()+" "+req.url())});
  const res=await page.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:30000});
  test(res.status()===200,"V25 site page returns HTTP 200");
  await page.waitForSelector("#leagueos-v25-competition-studio .v25-league",{timeout:18000});
  test((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("LEAGUE CENTRAL"),
   "LeagueOS commissioner site stays branded");
  test((await page.$eval(".v19-tab[aria-current='page']",e=>e.textContent)).trim()==="Division Plan",
   "Division Plan route remains primary navigation");
  const head=await page.$eval(".v25-head",e=>e.textContent);
  test(head.includes("Player detail in")&&head.includes("Clear division decisions out"),
   "Commissioner sees player-to-team competitive decision overview");
  const kpis=await page.$$eval(".v25-top-metrics>div",els=>els.map(e=>e.textContent));
  test(kpis.length===4&&kpis[0].includes("96")&&kpis[1].includes("1430")&&
   kpis[2].includes("1086")&&kpis[3].includes("70"),
   "Verified 96 teams, 1430 players, 1086 with history and 70 cross-night IDs displayed");
  test((await page.$$eval(".v25-decision-table tbody tr",e=>e.length))===4,
   "Current/proposed comparative summary opens for all four nights without filtering");
  const summaries=await page.$$eval(".v25-decision-table tbody tr",els=>els.map(e=>e.textContent));
  test(summaries.some(x=>x.includes("Sunday")&&x.includes("5 / 7 / 10")&&x.includes("8 / 8 / 6")),
   "Sunday initial current versus eight-eight-six recommended plan");
  test(summaries.some(x=>x.includes("Tuesday")&&x.includes("6 / 5 / 5")&&x.includes("8 / 8")),
   "Tuesday automatic two-division alternative visible");
  test((await page.$eval(".v25-scan-legend",e=>e.textContent)).includes("PAST")&&
   (await page.$eval(".v25-scan-legend",e=>e.textContent)).includes("CURRENT")&&
   (await page.$eval(".v25-scan-legend",e=>e.textContent)).includes("PROJECTED"),
   "Past/current/projected distinctions explain modeling");
  const research=await page.$eval(".v25-evidence-validation",e=>e.textContent);
  test(research.includes("15,468")&&research.includes("16.9%")&&research.includes("26.7%"),
   "Commissioner sees archived time-ordered match evidence and observed blowout rates");
  test(research.includes("not a guarantee")&&research.includes("has not yet demonstrated"),
   "No causal or independently validated player-lift marketing claim");
  test((await page.$$eval(".v25-evidence-kpis>div",els=>els.length))===3,
   "Retrospective source indicators are concise, not a complex analytics wall");
  const groups=await page.$$eval(".v25-night-group",els=>els.map(e=>e.textContent));
  test(groups.length===4&&groups[0].includes("Sunday")&&groups[3].includes("Thursday"),
   "All four nights include explicit proposed A-D group cards");
  test((await page.$$eval(".v25-group-team-list>div",els=>els.length))===96,
   "All 96 source-rated teams appear exactly once across proposed group cards");
  test((await page.$eval(".v25-group-recommendations",e=>e.textContent)).includes("relative research band"),
   "A-D level shown as provisional within compatible competition, not official strength");
  const coachStrength=await page.$eval(".v25-coach-history",e=>e.textContent);
  test(coachStrength.includes("26 recorded A–D")&&coachStrength.includes("168 historical Brave"),
   "Private master workbook aggregation supports strength-history evidence");
  await page.click(".v25-coach-history>summary");
  const coachStats=await page.$$eval(".v25-coach-strength-grid>div",els=>els.map(e=>e.textContent));
  test(coachStats.length===3&&coachStats.some(x=>x.includes("B level")&&x.includes("20 games"))&&
    coachStats.some(x=>x.includes("D level")&&x.includes("66 games")),
    "Coach strength-history records are bounded and exclude unsupported A-level results");
  await page.screenshot({path:path.join(OUT,"v25_commissioner_overview_desktop.png"),fullPage:false});

  await page.click('[data-v25-inspect="Sunday"]');
  const heads=await page.$$eval("#v25-team-drilldown tbody tr",els=>els.map(e=>e.textContent));
  test(heads.length===26,"Sunday all 26 modeled teams including Separate program visible");
  test(heads.some(x=>x.includes("Braves HC")&&x.includes("Cristillo")),
   "Braves visible with source memorial division identity");
  const brave=heads.find(x=>x.includes("Braves HC"));
  test(brave.includes("2.88")&&brave.includes("3.03"),
   "Braves current GF/GP and projected GF/GP are distinct source-backed values");
  test((await page.$eval(".v25-memorial",e=>e.textContent)).includes("The Cristillo Division"),
   "Memorial division identity is recognized in commissioner UI");
  test((await page.$eval(".v25-memorial",e=>e.textContent)).includes("Winter 2025/26"),
   "Memorial source lineage explicitly spans first 2025/26 season");
  test((await page.$eval(".v25-memorial",e=>e.textContent)).includes("proposed group"),
   "Memorial naming tracks a proposed team group rather than a fixed grade");
  await page.screenshot({path:path.join(OUT,"v25_memorial_source_desktop.png"),fullPage:false});

  const ptxt=await page.$eval(".v25-policy",e=>e.textContent);
  test(ptxt.includes("Review after week")&&ptxt.includes("Final alignment after week"),
   "Exactly two scheduled division-review windows are visible");
  test(ptxt.includes("SVHL rulebook")&&ptxt.includes("Roster freeze at halfway"),
   "Source rulebook and separate halftime roster-freeze distinction are visible");
  test((await page.$eval("#v25-first-week",e=>e.value))==="5"&&
   (await page.$eval("#v25-final-week",e=>e.value))==="12",
   "Default rulebook week five and user-proposed halfway final lock");
  await page.$eval("#v25-current-week",e=>e.value="5");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-stage-status",e=>e.textContent)).includes("REVIEW WINDOW"),
   "Week five is a review point requiring settlement and commissioner approval");
  await page.$eval("#v25-current-week",e=>e.value="12");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-stage-status",e=>e.textContent)).includes("REVIEW WINDOW"),
   "Halfway final review is permitted before locking");
  await page.$eval("#v25-current-week",e=>e.value="13");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-stage-status",e=>e.textContent)).includes("FINAL LOCK ACTIVE"),
   "Division lock starts after final review");
  await page.$eval("#v25-current-week",e=>e.value="21");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-stage-status",e=>e.textContent)).includes("FINAL LOCK ACTIVE"),
   "No pre-playoff realignment can reopen at week twenty-one");

  await page.$eval("#v25-final-week",e=>e.value="22");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-notice",e=>e.textContent)).includes("Invalid review windows"),
   "League review policy rejects late lock inside protected playoff buffer");
  test((await page.$eval("#v25-final-week",e=>e.value))==="12",
   "Late invalid division policy was not persisted");
  await page.$eval("#v25-first-week",e=>e.value="4");
  await page.$eval("#v25-final-week",e=>e.value="11");
  await page.click("#v25-save-policy");
  test((await page.$eval(".v25-stage-status",e=>e.textContent)).includes("Proposed alternative"),
   "Changing published week-five policy is visibly marked as an unapproved alternative");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForSelector("#leagueos-v25-competition-studio .v25-league",{timeout:15000});
  test((await page.$eval("#v25-first-week",e=>e.value))==="4"&&
   (await page.$eval("#v25-final-week",e=>e.value))==="11",
   "Working commissioner policy survives reload only in this browser");

  // Reset to the original user-recommended gates.
  await page.$eval("#v25-first-week",e=>e.value="5");
  await page.$eval("#v25-final-week",e=>e.value="12");
  await page.$eval("#v25-current-week",e=>e.value="9");
  await page.click("#v25-save-policy");
  const scheduling=await page.$eval(".v25-schedule",e=>e.textContent);
  test(scheduling.includes("127 public future references")&&
   scheduling.includes("66")&&scheduling.includes("552")&&scheduling.includes("0"),
   "Schedule impact displays actual source fixtures, 66 review cases and 552 unbooked pairings");
  await page.click("#v25-generate");
  test((await page.$$eval(".v25-preview-list>div",els=>els.length))===12,
   "Unsotted Sunday schedule preview shows twelve draft matchups");
  test((await page.$eval(".v25-preview-list",e=>e.textContent)).includes("date/time/rink unassigned"),
   "No invented ice date or rink appears in scheduled matchups");
  await page.select("#v25-schedule-night","Tuesday");
  test((await page.$eval(".v25-preview-list h4",e=>e.textContent)).includes("Tuesday"),
   "Commissioner can inspect schedule recomputation for another league night");
  const published=await page.$eval(".v25-schedule-boundary",e=>e.textContent);
  test(published.includes("No original SVHL schedule entry was rescheduled"),
   "Published fixtures retain operator scheduling authority");

  await page.evaluate(()=>{
   window.__v25Blob=null;window.__v25Name=null;
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=(blob)=>{window.__v25Blob=blob;return create(blob)};
   const realClick=HTMLAnchorElement.prototype.click;
   HTMLAnchorElement.prototype.click=function(){
    if(this.download==="LeagueOS_V25_Division_Schedule_Review_DRAFT.json"){
     window.__v25Name=this.download;return;
    }
    return realClick.call(this);
   };
  });
  await page.click("#v25-export");
  const exported=await page.evaluate(async()=>({
   filename:window.__v25Name,
   payload:window.__v25Blob?JSON.parse(await window.__v25Blob.text()):null}));
  test(exported.filename==="LeagueOS_V25_Division_Schedule_Review_DRAFT.json",
   "Local commissioner export is downloadable, not a server submission");
  test(exported.payload?.status==="LOCAL_DEMO_DRAFT_NOT_APPROVED"&&
   exported.payload?.officialLeagueAction===false,
   "Commissioner package cannot claim league approval");
  test(exported.payload?.generatedMatchups?.length===552&&
   exported.payload?.teamPlacements?.length===96&&
   exported.payload?.memorialNaming?.length===1,
   "Export carries complete source placements, memorial policy and round-robin matches");
  test(exported.payload.generatedMatchups.every(x=>x.date===null&&x.rink===null),
   "No synthetic venue bookings in exported schedule");

  await route(page,"team-projections");
  await page.waitForSelector("#hockeyos-v25-projections .v25-team-heading",{timeout:16000});
  test((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("BRAVE H.C."),
   "HockeyOS native team site remains branded");
  test((await page.$eval(".v19-tab[aria-current='page']",e=>e.textContent)).trim()==="Projections",
   "HockeyOS projections route is a primary team-facing page");
  const htxt=await page.$eval("#hockeyos-v25-projections",e=>e.textContent);
  test(htxt.includes("goals, assists & points")&&htxt.includes("HTO-published current"),
   "Team projection source and method are displayed");
  test((await page.$$eval("#hockeyos-v25-projections tbody tr",els=>els.length))===23,
   "HockeyOS shows 23 public HTO skater projections");
  test(htxt.includes("21")&&htxt.includes("coach baselines"),
   "HockeyOS discloses 21 matched workbook priors without exposing source rates");
  test(htxt.includes("private scouting notes")&&htxt.includes("2 currently published"),
   "Privacy and two unmodelled-coach-player disclosures visible");
  test(htxt.includes("Source snapshot: 2026-11-17")&&
   htxt.includes("Winter/Summer historical rate normalization is not certified"),
   "HockeyOS team projections state the dated HTO source and historical-duration limitation");
  await page.screenshot({path:path.join(OUT,"v25_team_projections_desktop.png"),fullPage:false});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForSelector("#hockeyos-v25-projections tbody tr",{timeout:16000});
  test(page.url().includes("#team-projections"),"HockeyOS direct team projections deep link is reload safe");
  await route(page,"team-stats");
  await page.waitForSelector(".v20-stats-table",{timeout:14000});
  test(!!(await page.$(".v20-stats-table")),"Original source-qualified HTO actual team stats remain available");

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await route(page,"league-division-plan");
  await page.waitForSelector("#leagueos-v25-competition-studio .v25-league",{timeout:16000});
  const mobile=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
   panels:document.querySelectorAll(".v25-league").length,
   nights:document.querySelectorAll(".v25-decision-table tbody tr").length,
   leader:!!document.querySelector(".v25-memorial")}));
  test(mobile.doc<=mobile.w+2,"390px mobile league page has no horizontal document overflow");
  test(mobile.panels===1&&mobile.nights===4&&mobile.leader,
   "Mobile view retains all-night decisions and Cristillo source identity");
  await page.screenshot({path:path.join(OUT,"v25_league_mobile.png"),fullPage:false});
  await page.click("#v25-generate");
  const mobileDraft=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    n:document.querySelectorAll(".v25-preview-list>div").length}));
  test(mobileDraft.doc<=mobileDraft.w+2&&mobileDraft.n===12,
   "Mobile local draft generator keeps matchups without screen overflow");
  await route(page,"team-projections");
  await page.waitForSelector("#hockeyos-v25-projections tbody tr",{timeout:15000});
  const mobileTeam=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    count:document.querySelectorAll("#hockeyos-v25-projections tbody tr").length}));
  test(mobileTeam.doc<=mobileTeam.w+2&&mobileTeam.count===23,
   "Team projections table remains contained on 390px screens");
  await page.screenshot({path:path.join(OUT,"v25_team_mobile.png"),fullPage:false});
  test(errors.length===0,"No unhandled JavaScript errors: "+JSON.stringify(errors));
  test(writes.length===0,"No HTTP POST/PUT/PATCH server writes");

  // Negative source: a forged official schedule-change flag must fail closed.
  const bad=JSON.parse(fs.readFileSync(path.resolve(__dirname,
   "../widgets/leagueos-division-lifecycle-v25.json"),"utf8"));
  bad.officialScheduleModified=true;
  const other=await browser.newPage();
  await other.setRequestInterception(true);
  other.on("request",r=>{
   if(r.url().includes("leagueos-division-lifecycle-v25.json"))
    r.respond({status:200,contentType:"application/json",body:JSON.stringify(bad)});
   else r.continue();
  });
  await other.goto(BASE+"#league-division-plan",{waitUntil:"domcontentloaded",timeout:30000});
  await other.waitForSelector("#leagueos-v25-competition-studio .v25-failed",{timeout:18000});
  test((await other.$eval(".v25-failed",e=>e.textContent)).includes("verification failed"),
   "Forged official schedule mutation is held instead of accepting a plan");
  await other.close();

  const receipt={pass:true,checks:checks.length,source:{players:1430,
    teams:96,oldPlayerIDs:1086,sourceFixtureImpacts:127,
    crossDivisionSourceReviewCases:66,unslottedDrafts:552,coachPriorHTOSkaters:21},
    mobile,errors,writes,officialActions:0,
    screenshots:["v25_commissioner_overview_desktop.png","v25_memorial_source_desktop.png",
      "v25_team_projections_desktop.png","v25_league_mobile.png","v25_team_mobile.png"]};
  fs.writeFileSync(path.join(OUT,"v25_browser_acceptance.json"),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V25 BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
