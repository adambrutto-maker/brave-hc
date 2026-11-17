/* HockeyOS V21 browser acceptance: published HTO IDs, period scores and calendar.
   Run on local staging AND the actual public GitHub Pages website. No writes. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const URL=process.env.HOCKEYOS_V21_QA_URL||"http://127.0.0.1:18896/leagueos-team-os-demo.html?v=v21-local";
const OUT=process.env.HOCKEYOS_V21_QA_OUT||path.resolve(__dirname,"../_qa_local_v21");
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,
  executablePath:process.env.HOCKEYOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args:["--no-sandbox","--disable-gpu"]});
 const failures=[],errors=[],writes=[],checks=[];
 const test=(ok,label)=>{assert.ok(ok,label);checks.push(label)};
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  const view=async route=>{
   await page.evaluate(r=>window.LeagueOSDemoBridgeV13.go(r),route);
   await page.waitForFunction(r=>location.hash==="#"+r,{},route);
   if(route==="team-schedule"||route==="team-results"||route.startsWith("team-game-"))
    await page.waitForSelector("#hockeyos-native-games-v21 .v21-heading, #hockeyos-native-games-v21 .v21-source-fail",{timeout:15000});
  };
  const dataUrl="http://127.0.0.1:18896/hockeyos-hto-games-v21.json";
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const res=await page.goto(URL+"#team-home",{waitUntil:"domcontentloaded",timeout:30000});
  test(res.status()===200,"Website responds HTTP 200");
  await page.waitForSelector("#hockeyos-v21-last-game .v21-home-last",{timeout:16000});
  const last=await page.$eval("#hockeyos-v21-last-game",e=>e.textContent);
  test(last.includes("4–6")&&last.includes("Sugo Sundays"),"HTO last official 4-6 result appears on Home");
  test(last.includes("Nov 15, 2026"),"Home last result uses verified Nov 15 date");
  await page.waitForSelector("#hockeyos-v20-leaders .v20-leader",{timeout:15000});
  test((await page.$$eval("#hockeyos-v20-leaders .v20-leader",x=>x.length))===4,"V20 verified scoring leaders retained");
  await page.screenshot({path:path.join(OUT,"home_v21_desktop.png"),fullPage:true});

  await view("team-schedule");
  test((await page.$eval("#v21-month",e=>e.value))==="2026-11","Calendar defaults to source-captured November 2026");
  const monthEventIds=await page.$$eval(".v21-day-event",xs=>xs.map(x=>x.dataset.v21Game));
  test(monthEventIds.length===4,"November calendar shows exactly four HTO-linked game records");
  test(monthEventIds.includes("3375686"),"Nov 22 HTO preview game ID on calendar");
  const scheduleText=await page.$eval("#hockeyos-native-games-v21",e=>e.textContent);
  test(scheduleText.includes("8")&&scheduleText.includes("HTO ID MATCHED"),"Calendar shows completed count and HTO reconciliation");
  await page.screenshot({path:path.join(OUT,"schedule_desktop_nov_v21.png"),fullPage:true});

  await page.click('.v21-day-event[data-v21-game="3375686"]');
  await page.waitForFunction(()=>location.hash==="#team-game-3375686",{timeout:15000});
  await page.waitForSelector("#hockeyos-native-games-v21 .v21-detail");
  const previewText=await page.$eval(".v21-detail",e=>e.textContent);
  test(previewText.includes("SCHEDULED AT CAPTURE"),"HTO future game has no official score");
  test(previewText.includes("Dateline Predators")&&previewText.includes("Nov 22, 2026"),"HTO date and opponent survive source linkage");
  test(previewText.includes("8:00 PM")&&previewText.includes("B Rink"),"HTO exact time and venue in game detail");
  const previewHref=await page.$eval(".v21-detail-actions a",a=>a.href);
  test(previewHref.includes("p=preview")&&previewHref.includes("gameID=3375686"),"Original official HTO preview URL retained");
  test((await page.$(".v21-score-table"))===null,"Scheduled game cannot display an invented final score");
  await page.screenshot({path:path.join(OUT,"game_preview_v21_desktop.png"),fullPage:true});

  await view("team-schedule");
  await page.select("#v21-month","2026-10");
  test((await page.$$eval(".v21-day-event",xs=>xs.length))===3,"October calendar exactly three completed HTO games");
  await page.click('[data-v21-view="list"]');
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===3,"Calendar/list view toggle preserves October fixture counts");
  await page.type("#v21-search","Sugo");
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===1,"Opponent search reduces October to one sourced match");
  await page.select("#v21-status","future");
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===0,"No future HTO games were invented in October");
  await page.select("#v21-month","2027-01");
  await page.select("#v21-status","all");
  await page.$eval("#v21-search",el=>{el.value="";el.dispatchEvent(new Event("input",{bubbles:true}))});
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===0,"January without public entries does not become presumed available ice");
  test((await page.$eval(".v21-no-results",e=>e.textContent)).includes("This does not establish"),"Empty calendar caveat visible");

  await view("team-results");
  await page.waitForSelector(".v21-game-card");
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===8,"Exactly 8 HTO final scores appear");
  const record=await page.$eval(".v21-record",e=>e.textContent);
  test(record.includes("1–7–0"),"1–7–0 official results match V20 team stats");
  const scoreIds=await page.$$eval(".v21-game-card",xs=>xs.map(x=>x.dataset.v21Game));
  test(!scoreIds.includes("3375686")&&scoreIds.includes("3375685"),"Unplayed preview excluded from results");
  await page.waitForSelector("#team-leagueos-bridge-mount .v18-empty",{timeout:14000});
  test((await page.$eval("#team-leagueos-bridge-mount",e=>e.textContent)).includes("practice"),"V18 browser-local practice result review stays distinct");
  await page.screenshot({path:path.join(OUT,"results_desktop_v21.png"),fullPage:true});

  await page.click('[data-v21-result="W"]');
  const wins=await page.$$eval(".v21-game-card",xs=>xs.map(x=>x.textContent));
  test(wins.length===1&&wins[0].includes("Big Bastones"),"Only verified HTO win displays in Win filter");
  await page.click('[data-v21-result="L"]');
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===7,"Seven official HTO losses display");
  await page.click('[data-v21-result="all"]');
  await page.type("#v21-score-search","Dateline");
  test((await page.$$eval(".v21-game-card",xs=>xs.length))===1,"Results search does not confuse Sep result with Nov future fixture");
  await page.$eval("#v21-score-search",el=>{el.value="";el.dispatchEvent(new Event("input",{bubbles:true}))});

  await view("team-game-3375685");
  await page.waitForSelector(".v21-score-table");
  const score=await page.$eval(".v21-score-table",e=>e.textContent);
  test(score.includes("Brave H.C.")&&score.includes("Sugo Sundays"),"Native box-score table displays recorded teams");
  test(score.includes("4")&&score.includes("6"),"Native box-score displays certified final goals");
  const cells=await page.$$eval(".v21-score-table tbody tr",trs=>trs.map(tr=>[...tr.querySelectorAll("td")].map(x=>x.textContent)));
  test(cells.length===2&&cells.every(row=>row.length===5),"Published 1/2/3/F score table preserved");
  const boxHref=await page.$eval(".v21-detail-actions a",a=>a.href);
  test(boxHref.includes("p=boxscore")&&boxHref.includes("gameID=3375685"),"Exact official HTO box-score link");
  await page.screenshot({path:path.join(OUT,"boxscore_desktop_v21.png"),fullPage:true});

  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForSelector(".v21-score-table",{timeout:15000});
  test(page.url().includes("#team-game-3375685"),"Game detail direct hash is reload-safe");

  await view("team-game-9999999");
  await page.waitForSelector(".v21-source-fail",{timeout:12000});
  test((await page.$eval(".v21-source-fail",e=>e.textContent)).includes("not found"),"Unknown HTO game ID fails closed");

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await view("team-schedule");
  await page.select("#v21-month","2026-11");
  await page.click('[data-v21-view="calendar"]');
  const phoneSchedule=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,
    days:document.querySelectorAll(".v21-day").length,sourcePreview:!!document.querySelector('.v21-day-event[data-v21-game="3375686"]')}));
  test(phoneSchedule.doc<=phoneSchedule.viewport+2,"Mobile calendar stays within 390-pixel document");
  test(phoneSchedule.days===30&&phoneSchedule.sourcePreview,"Mobile November calendar has 30 days and HTO preview");
  await page.screenshot({path:path.join(OUT,"calendar_mobile_v21.png"),fullPage:true});

  await view("team-results");
  const phoneResult=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,
    listCount:document.querySelectorAll(".v21-game-card").length}));
  test(phoneResult.doc<=phoneResult.viewport+2&&phoneResult.listCount===8,"Mobile result cards fit without overflow");
  await page.screenshot({path:path.join(OUT,"results_mobile_v21.png"),fullPage:true});
  await view("team-game-3375685");
  const phoneDetail=await page.evaluate(()=>{
    const table=document.querySelector(".v21-score-table"),wrapper=document.querySelector(".v21-score-table-wrap");
    const final=table?.querySelector("th:last-child");
    return{viewport:innerWidth,doc:document.documentElement.scrollWidth,table:!!table,
      finalVisible:!!final&&final.getBoundingClientRect().right<=wrapper.getBoundingClientRect().right+2};
  });
  test(phoneDetail.doc<=phoneDetail.viewport+2&&phoneDetail.table,"Mobile game detail keeps official periods legible");
  test(phoneDetail.finalVisible,"Final F score column is visible without horizontal scrolling");
  const activeScoreTab=await page.$eval("#v19-site-navigation .v19-tab[aria-current='page']",e=>e.textContent);
  test(activeScoreTab.trim()==="Scores","Native game detail retains Scores primary navigation");
  await page.screenshot({path:path.join(OUT,"boxscore_mobile_v21.png"),fullPage:true});

  await view("team-roster");
  await page.waitForSelector(".v20-roster-table tbody tr");
  test((await page.$$eval(".v20-roster-table tbody tr",xs=>xs.length))===28,"V20 roster remains intact");
  await page.click("#sw-league");
  await page.waitForFunction(()=>location.hash==="#league-home",{timeout:9000});
  test((await page.$eval("#v19-site-banner",e=>e.textContent)).includes("LEAGUE CENTRAL"),"LeagueOS commissioner mode retained");
  await view("league-scoring");
  test(!!(await page.$("#league-native-scorer-mount")),"LeagueOS V18 scorer remains reachable");
  test(errors.length===0,"Zero unhandled browser exceptions: "+JSON.stringify(errors));
  test(writes.length===0,"Zero public server mutations to HTO, SVHL or Github");
  const receipt={pass:true,checks:checks.length,counts:{completed:8,scheduled:1},
    screenshots:["home_v21_desktop.png","schedule_desktop_nov_v21.png","game_preview_v21_desktop.png",
      "results_desktop_v21.png","boxscore_desktop_v21.png","calendar_mobile_v21.png",
      "results_mobile_v21.png","boxscore_mobile_v21.png"],
    mobile:{calendar:phoneSchedule,results:phoneResult,detail:phoneDetail},
    errors,writes,source:"Public HTO current-season exact game IDs; no inferred fixtures",
    officialChanges:0};
  fs.writeFileSync(path.join(OUT,"v21_browser_acceptance.json"),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error("V21 BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
