/* V19 browser acceptance: HTO-inspired original site shell, no official writes. */
"use strict";
const fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const puppeteer=require(process.env.PUPPETEER_MODULE_PATH||"puppeteer");
const url=process.env.SPORTSOS_SITE_URL||"http://127.0.0.1:18766/leagueos-team-os-demo.html";
const out=process.env.SPORTSOS_QA_OUT||path.resolve(__dirname,"../_qa_v19");
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.SPORTSOS_BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--no-sandbox","--disable-gpu"]});
 const checks=[],errors=[],writes=[],failures=[];
 try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("request",r=>{if(!["GET","HEAD","OPTIONS"].includes(r.method()))writes.push(r.method()+" "+r.url())});
  const visit=async(route)=>{
   await page.evaluate(r=>window.LeagueOSDemoBridgeV13.go(r),route);
   await page.waitForFunction(r=>location.hash==="#"+r,{},route);
   if(["team-schedule","team-results"].includes(route))
    await page.waitForSelector("#hockeyos-native-games-v21 .v21-heading",{timeout:15000});
   return page.$eval("#workspace",x=>x.textContent.replace(/\s+/g," ").trim());
  };
  const check=async(label,run)=>{await run();checks.push(label);};
  const response=await page.goto(url+"#team-home",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector("#v19-site-navigation .v19-tab",{timeout:16000});
  await check("site HTTP 200",()=>assert.equal(response.status(),200));
  let t=await page.$eval("#v19-site-banner",e=>e.textContent);
  await check("HockeyOS identity",()=>assert.match(t,/BRAVE H.C./));
  const names=await page.$$eval("#v19-site-navigation .v19-tab",xs=>xs.map(x=>x.textContent.trim()));
  await check("Team site navigation",()=>assert.deepEqual(names,["Home","News","Roster","Schedule","Scores","Stats","Analytics","Awards","Records"]));
  const home=await page.$eval("#workspace",e=>e.textContent);
  await check("team home editorial and sideboards",()=>{for(const x of ["Team record","Last game","Next on the ice","Stat leaders","The club. The games. The history."])assert.ok(home.includes(x),x)});
  await check("V18 bridge remains on team home",async()=>assert.ok(await page.$("#team-leagueos-bridge-mount")));
  await page.waitForFunction(()=>document.querySelector("#v19-approved-recap h3")?.textContent!=="Browse the Brave H.C. Hot Stove",{timeout:8000});
  await check("founder-approved recap appears from governed public feed",async()=>{
    const actual=await page.$eval("#v19-approved-recap",e=>e.textContent);
    assert.match(actual,/LATEST VERIFIED HOT STOVE/);
    assert.match(actual,/Read approved recap/);
  });
  await page.screenshot({path:path.join(out,"team_home_desktop.png"),fullPage:true});
  for(const [route,phrase] of [["team-schedule","Schedule"],["team-results","Scores & results"],["team-stats","Team statistics"],["team-awards","Awards & award races"],["team-records","Records & milestones"],["team-about","About Brave H.C."],["team-photos","Photos & highlights"],["team-history","History & alumni"],["team-fees","Team administration"]]){
    const text=await visit(route);await check(route+" route",()=>assert.ok(text.includes(phrase),route));
  }
  await check("Unrelated team administration does not expose scorer drafts",async()=>assert.ok(await page.$("#team-leagueos-bridge-mount")===null)); // Current team-fees route
  await visit("team-results");
  await check("Team results locally mounts V18 bridge",async()=>assert.ok(await page.$("#team-leagueos-bridge-mount")));
  await page.click("#sw-league");await page.waitForFunction(()=>location.hash==="#league-home");
  t=await page.$eval("#v19-site-banner",e=>e.textContent);
  await check("LeagueOS identity",()=>assert.match(t,/LEAGUE CENTRAL/));
  const lnav=await page.$$eval("#v19-site-navigation .v19-tab",xs=>xs.map(x=>x.textContent.trim()));
  await check("League admin nav",()=>assert.deepEqual(lnav,["League Home","Schedule","Results","Standings","Teams","Playoffs","Statistics","League Admin"]));
  const lhome=await page.$eval("#workspace",e=>e.textContent);
  await check("commissioner tools retained",()=>{for(const x of ["Balanced scheduler","Playoff centre","Game sheets & stats","Teams & divisions","Ice allocation"])assert.ok(lhome.includes(x),x)});
  await page.screenshot({path:path.join(out,"league_home_desktop.png"),fullPage:true});
  const admin=await visit("league-admin");
  await check("league admin routes",()=>{for(const x of ["Game verification","Schedule management","Playoff administration","Roster registration","Facility allocation","Finance controls"])assert.ok(admin.includes(x),x)});
  await page.screenshot({path:path.join(out,"league_admin_desktop.png"),fullPage:true});
  await visit("league-results");
  await check("league result page has official boundary",async()=>assert.match(await page.$eval("#workspace",e=>e.textContent),/Official publication/));
  await visit("league-scoring");
  await check("V18 scorer preserved",async()=>assert.ok(await page.$("#league-native-scorer-mount")));
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await visit("team-home");
  const mobile=await page.evaluate(()=>({
    w:innerWidth,scroll:document.documentElement.scrollWidth,
    primaryScrollWidth:document.querySelector(".v19-tabs").scrollWidth,
    primaryClientWidth:document.querySelector(".v19-tabs").clientWidth,
    cards:Array.from(document.querySelectorAll(".v19-action-tile")).map(x=>Math.round(x.getBoundingClientRect().width))
  }));
  await check("mobile no horizontal document overflow",()=>assert.ok(mobile.scroll<=mobile.w+2,JSON.stringify(mobile)));
  await check("mobile nav scroll stays inside container",()=>assert.ok(mobile.primaryScrollWidth>mobile.primaryClientWidth));
  await page.screenshot({path:path.join(out,"team_home_mobile.png"),fullPage:true});
  await visit("league-home");
  const leagueMobile=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
  await check("league mobile no horizontal overflow",()=>assert.ok(leagueMobile.scroll<=leagueMobile.w+2,JSON.stringify(leagueMobile)));
  await page.screenshot({path:path.join(out,"league_home_mobile.png"),fullPage:true});
  await visit("league-scoring");
  await page.click("#sw-team");
  await page.waitForFunction(()=>location.hash==="#team-home");
  await check("mobile LeagueOS-to-HockeyOS switch is not blocked by More menu",()=>assert.equal(page.url().split("#")[1],"team-home"));
  await check("zero uncaught page errors",()=>assert.equal(errors.length,0,JSON.stringify(errors)));
  await check("zero server writes",()=>assert.equal(writes.length,0,JSON.stringify(writes)));
  const report={passed:true,checks:checks.length,checksList:checks,viewport:mobile,leagueMobile,pageErrors:errors,serverWrites:writes,
    notes:"Independent layout only; official HTO, HTO CMS, team stats, workbook and SVHL records unchanged"};
  fs.writeFileSync(path.join(out,"v19_acceptance.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify({pass:report.passed,total:report.checks,viewport:mobile,leagueMobile,errors,writes},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error("V19 QA FAILED",e.stack||e);process.exitCode=1});
