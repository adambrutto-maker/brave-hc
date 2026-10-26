/* Acceptance test: optional HTO/Workbook public feed stays fail-closed.
   No actual public JSON is written. Browser intercepts the feed for synthetic QA. */
const puppeteer=require("puppeteer"),assert=require("node:assert/strict");
const path=require("node:path"),fs=require("node:fs"),http=require("node:http");
const root=path.resolve(__dirname,"..","widgets");
const mimetype={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const server=http.createServer((request,response)=>{
 const p=path.resolve(root,"."+new URL(request.url,"http://localhost").pathname);
 if(!p.startsWith(root+path.sep))return response.writeHead(403).end();
 fs.readFile(p,(e,b)=>{if(e)return response.writeHead(404).end();response.setHeader("content-type",mimetype[path.extname(p)]||"text/plain");response.end(b)});
});
const summary=(w,l,t,gf,ga)=>({gp:w+l+t,w,l,t,gf,ga});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await b.newPage(),errs=[];
  page.on("pageerror",e=>errs.push(e.message));
  const base="http://127.0.0.1:"+server.address().port;
  const options=["Mid Ice Crisis","Mohawks HC","Sugo Sundays","Other Way","Big Bastones","Zamboner Crew","Dateline Predators"];
  const feed={schema:"brave-hc-opponent-intelligence/v1",
              status:"PUBLIC_VERIFIED_EXACT_ONLY",publishable:true,
              asOf:new Date(Date.now()-60000).toISOString(),
              coverage:{currentSeasonGames:5},
              teams:options.map(name=>name==="Big Bastones"?
                {name,verification:"VERIFIED_EXACT_NAME",regularSeason:summary(4,2,1,24,27),
                 allTime:summary(4,3,1,24,32),playoffs:summary(0,1,0,0,5),
                 lastFive:[{date:"2026-10-25",result:"W",gf:6,ga:4}]}:
                {name,verification:name==="Mohawks HC"?"ALIAS_REVIEW_REQUIRED":"NO_EXACT_HISTORY"})};
  await page.setRequestInterception(true);
  let requested=0;page.on("request",req=>{
   if(req.url().includes("opponent-intelligence.json")){requested++;req.respond({status:200,contentType:"application/json",body:JSON.stringify(feed)})}
   else req.continue()
  });
  await page.setViewport({width:358,height:700});
  await page.goto(base+"/home-panels.html?panel=standings",{waitUntil:"networkidle0"});
  await page.click("#tab-intel");
  await page.select("#opponent","Big Bastones");
  const verified=await page.$eval("#intel-metrics",e=>e.textContent);
  assert.ok(verified.includes("4–2–1")&&verified.includes("24")&&verified.includes("27"));
  assert.equal(await page.$eval("#headtohead-section",e=>e.hidden),false);
  const note=await page.$eval("#intel-note",e=>e.textContent);
  assert.ok(note.includes("Oct")&&note.includes("2026"));
  await page.select("#opponent","Mohawks HC");
  assert.equal(await page.$eval("#headtohead-section",e=>e.hidden),true);
  const alias=await page.$eval("#intel-metrics",e=>e.textContent);
  assert.ok(alias.includes("unreviewed name/identity alias"));
  await page.select("#opponent","Other Way");
  assert.ok((await page.$eval("#intel-metrics",e=>e.textContent)).includes("No completed matchup"));
  assert.equal(requested,1);
  assert.deepEqual(errs,[]);
  console.log(JSON.stringify({ok:true,verifiedBigBastones:true,aliasWithheld:true,noMatchNotZero:true,errors:errs}));
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
