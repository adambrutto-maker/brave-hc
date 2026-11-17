/* HockeyOS V20: local and hosted browser acceptance, source-safe and read-only. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const URL=process.env.HOCKEYOS_V20_QA_URL||
 "http://127.0.0.1:18894/leagueos-team-os-demo.html?v=v20-local";
const DIR=process.env.HOCKEYOS_V20_QA_OUT||path.resolve(__dirname,"../_qa_v20_local");
fs.mkdirSync(DIR,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.HOCKEYOS_BROWSER_PATH||
   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 let checks=0;const errors=[],writes=[];const pass=(condition,message)=>{assert.ok(condition,message);checks++};
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const resp=await page.goto(URL+"#team-home",{waitUntil:"domcontentloaded",timeout:28000});
  pass(resp.status()===200,"V20 home HTTP 200");
  await page.waitForSelector("#hockeyos-v20-leaders .v20-leader",{timeout:15000});
  const leaders=await page.$$eval("#hockeyos-v20-leaders .v20-leader",xs=>xs.map(x=>x.textContent));
  pass(leaders.length===4,"Four actual HTO scoring leaders on team homepage");
  pass(leaders.some(x=>x.includes("10")),"Leader points reflect official source");
  const navi=async route=>{
   await page.evaluate(r=>window.LeagueOSDemoBridgeV13.go(r),route);
   await page.waitForFunction(r=>location.hash==="#"+r,{},route);
  };
  await navi("team-roster");
  await page.waitForSelector("#v20-roster-search",{timeout:14000});
  const rosterRows=await page.$$eval(".v20-roster-table tbody tr",xs=>xs.length);
  pass(rosterRows===28,"28 current official roster entries");
  const sourceLink=await page.$eval(".v20-source-bar a",a=>a.href);
  pass(sourceLink.includes("htosports.com")&&sourceLink.includes("p=roster"),"Official roster link retained");
  const jerseyText=await page.$eval("#v20-list-results",e=>e.textContent);
  pass(jerseyText.includes("Provenzano, Mario"),"HTO roster source literal name preserved");
  pass(jerseyText.includes("Rae, Jeff"),"Unassigned jersey roster player retained");
  pass((await page.$$eval("#v20-list-results a[href*='playerID']",xs=>xs.length))===0,
   "No player ID invented on roster without original source links");
  await page.type("#v20-roster-search","Carosi");
  const found=await page.$$eval(".v20-roster-table tbody tr",xs=>xs.length);
  pass(found>=1&&found<28,"Roster search filters source names");
  await page.click("[data-v20-pos='all']");
  await page.$eval("#v20-roster-search",input=>{input.value="";input.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.click("[data-v20-pos='goalies']");
  const goalieRosters=await page.$$eval(".v20-roster-table tbody tr",xs=>xs.length);
  pass(goalieRosters>0&&goalieRosters<28,"Published G position filter works");
  await page.click("[data-v20-pos='all']");
  await page.click("[data-v20-view='cards']");
  pass((await page.$$eval(".v20-roster-card",xs=>xs.length))===28,"28 responsive roster cards");
  await page.screenshot({path:path.join(DIR,"team_roster_desktop_v20.png"),fullPage:true});
  await navi("team-stats");
  await page.waitForSelector(".v20-stats-table tbody tr",{timeout:14000});
  pass((await page.$$eval(".v20-stats-table tbody tr",xs=>xs.length))===23,
    "23 named skater rows, no Team Stats double count");
  const statsText=await page.$eval(".v20-shell",e=>e.textContent);
  pass(statsText.includes("Power-play goals")&&statsText.includes("HTO"),"PPG interpretation and source disclosure");
  pass(statsText.includes("23"),"Team goal aggregate present");
  const profileLinks=await page.$$eval(".v20-stats-table tbody a[href*='playerID']",xs=>xs.map(x=>x.href));
  pass(profileLinks.length===23&&profileLinks.every(u=>u.startsWith("https://www.htosports.com/")),
    "Only 23 source-verified player profile links");
  await page.select("#v20-stats-sort","ppg");
  const row=await page.$eval(".v20-stats-table tbody tr",e=>e.textContent);
  pass(row.includes("1"),"Power-play goals sorting can show a recorded PPG");
  await page.type("#v20-stats-search","Provenzano");
  const matched=await page.$$eval(".v20-stats-table tbody tr",xs=>xs.map(x=>x.textContent));
  pass(matched.length>=1&&matched.every(x=>x.includes("Provenzano")),"Skater search filters source text");
  await page.screenshot({path:path.join(DIR,"team_stats_skaters_desktop_v20.png"),fullPage:true});
  await page.$eval("#v20-stats-search",input=>{input.value="";input.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.click("[data-v20-role='goalies']");
  await page.waitForSelector(".v20-stats-table tbody tr");
  const gr=await page.$$eval(".v20-stats-table tbody tr",xs=>xs.length);
  pass(gr===5,"Five named goaltenders; team aggregate separate");
  const goalieStats=await page.$eval(".v20-shell",e=>e.textContent);
  pass(goalieStats.includes("41"),"Official team goalie GA is 41");
  const names=await page.$$eval(".v20-stats-table tbody .v20-playername",xs=>xs.map(e=>e.textContent));
  pass(!names.includes("Team Stats"),"No team aggregate masquerades as goalie");
  await page.screenshot({path:path.join(DIR,"team_stats_goalies_desktop_v20.png"),fullPage:true});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const phoneGoalies=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
    cards:document.querySelectorAll(".v20-stat-card").length,
    cardsVisible:getComputedStyle(document.querySelector(".v20-stat-cards")).display!=="none"}));
  pass(phoneGoalies.doc<=phoneGoalies.w+2,"Goalie mobile layout does not overflow document");
  pass(phoneGoalies.cards===5&&phoneGoalies.cardsVisible,"Mobile goalie statistics use cards");
  await page.screenshot({path:path.join(DIR,"team_stats_goalies_mobile_v20.png"),fullPage:true});
  await navi("team-roster");
  await page.waitForSelector("#v20-roster-search");
  const phoneRoster=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,
   cardCount:document.querySelectorAll(".v20-roster-card").length}));
  pass(phoneRoster.doc<=phoneRoster.w+2,"Roster mobile layout does not overflow");
  pass(phoneRoster.cardCount===28,"All 28 roster cards present on mobile");
  await page.screenshot({path:path.join(DIR,"team_roster_mobile_v20.png"),fullPage:true});
  await page.click("#sw-league");
  await page.waitForFunction(()=>location.hash==="#league-home");
  pass((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("LEAGUE CENTRAL"),
   "LeagueOS commissioner site retained");
  await navi("league-scoring");
  pass(!!(await page.$("#league-native-scorer-mount")),"Existing LeagueOS scorer intact");
  pass(errors.length===0,"No unhandled browser JavaScript errors: "+JSON.stringify(errors));
  pass(writes.length===0,"No HTTP mutations to HTO or Sports Village");
  const report={pass:true,checks,counts:{roster:28,skaters:23,goalies:5},
    mobile:{goalies:phoneGoalies,roster:phoneRoster},pageErrors:errors,serverWrites:writes,
    source:"Read-only public HTO dated Winter 2026/27 capture",
    officialChanges:0,notes:"No HTO CMS, awards, workbook or official league updates"};
  fs.writeFileSync(path.join(DIR,"v20_browser_acceptance.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V20 BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
