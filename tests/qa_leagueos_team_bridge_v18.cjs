/* V18 local-only desktop/mobile browser acceptance. No external writes. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const ROOT=process.env.LEAGUEOS_QA_DIR||path.resolve(__dirname,"../_qa_local_v18");
const HOME=process.env.LEAGUEOS_QA_BASE||"http://127.0.0.1:18765/leagueos-team-os-demo.html";
fs.mkdirSync(ROOT,{recursive:true});
(async()=>{
 const errors=[],writes=[];
 const browser=await puppeteer.launch({executablePath:process.env.LEAGUEOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless:true,args:["--no-sandbox","--disable-gpu"]});
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  await page.goto(HOME+"#league-scoring",{waitUntil:"domcontentloaded",timeout:25000});
  await page.waitForSelector("#league-native-scorer-mount [data-v16-goal-side='home']",{timeout:30000});
  await page.select("#v15-score-night","Sunday");
  await page.waitForSelector("#v15-score-game option[value='128129']",{timeout:15000});
  await page.select("#v15-score-game","128129");
  for(const side of ["home","home","away"]){
   await page.click("[data-v16-goal-side='"+side+"']");
  }
  await page.click("[data-v15-scoretab='result']");
  await page.waitForSelector("#v18-team-stats-form");
  for(const [n,v] of [["home-ppo","2"],["home-ppg","1"],["away-ppo","2"],["away-ppg","0"]]){
   await page.type('#v18-team-stats-form input[name="'+n+'"]',v);
  }
  await page.click("#v18-team-stats-form button[type='submit']");
  const entered=await page.evaluate(()=>{
   const v=JSON.parse(localStorage.getItem("leagueos-v15-scorer-demo"));
   return v.drafts["128129"];
  });
  assert.equal(entered.teamStats.home.ppo,2);
  assert.equal(entered.teamStats.home.ppg,1);
  assert.equal(entered.teamStats.away.ppg,0);
  await page.click("#v17-save-result");
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("leagueos-v15-scorer-demo")).drafts["128129"]);
  assert.equal(saved.result.saved,true);
  assert.equal(saved.result.home,2);
  assert.equal(saved.result.away,1);
  await page.click("#sw-team");
  await page.waitForSelector("#team-leagueos-bridge-mount .v18-draft-card",{timeout:15000});
  const desktop=await page.$eval("#team-leagueos-bridge-mount",e=>e.textContent);
  assert.match(desktop,/Game result review inbox/);
  assert.match(desktop,/PPG\s*1/);
  assert.match(desktop,/PPO\s*2/);
  assert.match(desktop,/PP%\s*50.0%/);
  assert.match(desktop,/PK%\s*100.0%/);
  assert.match(desktop,/not official/i);
  await page.screenshot({path:path.join(ROOT,"team_bridge_desktop_v18.png"),fullPage:true});

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.reload({waitUntil:"domcontentloaded",timeout:25000});
  await page.waitForSelector("#team-leagueos-bridge-mount .v18-draft-card",{timeout:15000});
  const viewport=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
   cardWidth:document.querySelector(".v18-draft-card").getBoundingClientRect().width}));
  await page.screenshot({path:path.join(ROOT,"team_bridge_mobile_v18.png"),fullPage:true});
  assert.ok(viewport.scrollWidth<=viewport.width+2,"mobile horizontal overflow "+JSON.stringify(viewport));

  await page.click("#sw-league");
  await page.evaluate(()=>window.LeagueOSDemoBridgeV13.go("league-scoring"));
  await page.waitForSelector("#league-native-scorer-mount [data-v16-goal-side='home']",{timeout:15000});
  await page.click("[data-v16-goal-side='home']");
  const stale=await page.evaluate(()=>JSON.parse(localStorage.getItem("leagueos-v15-scorer-demo")).drafts["128129"]);
  assert.equal(stale.result.saved,false,"changing event invalidates earlier saved result");
  await page.click("#sw-team");
  await page.waitForSelector("#team-leagueos-bridge-mount .v18-empty",{timeout:15000});
  const unlinked=await page.$eval("#team-leagueos-bridge-mount",e=>e.textContent);
  assert.match(unlinked,/No saved Brave H.C. practice results/);
  assert.equal(writes.length,0,"No outgoing server mutations");
  assert.equal(errors.length,0,"Browser uncaught errors");
  const receipt={pass:true,checks:14,source:"local fixture evidence",browser:"Edge Chromium",
   desktop:true,mobile:true,mobileViewport:viewport,serverWrites:0,pageErrors:errors,
   officialChanges:0,notes:"Practice-only; HTO untouched; approved-score sync remains unavailable"};
  fs.writeFileSync(path.join(ROOT,"v18_browser_acceptance.json"),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error("BROWSER QA FAILED: "+(e.stack||e));process.exitCode=1});
