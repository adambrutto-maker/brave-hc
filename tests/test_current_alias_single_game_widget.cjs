const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets"),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const srv=http.createServer((req,res)=>{
 const f=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader("Content-Type",mime[path.extname(f)]||"text/plain");res.end(b)});
});
(async()=>{
 await new Promise(r=>srv.listen(0,"127.0.0.1",r));
 const b=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 try{
  const p=await b.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.setViewport({width:358,height:500});
  await p.goto("http://127.0.0.1:"+srv.address().port+"/home-panels.html?panel=standings&embed=1",{waitUntil:"networkidle0"});
  await p.click("#tab-intel");
  for(const [team,opponent,date,result] of [
   ["Mohawks HC","Mohawks H.C.","Sep","3–6"],
   ["Sugo Sundays","Michelob Morts","Oct","2–3"]
  ]){
   await p.select("#opponent",team);
   const el=await p.$eval("#intel-metrics",e=>e.textContent);
   assert.ok(el.includes("VERIFIED 2026–27 MEETING"),team+" source proof");
   assert.ok(el.includes("HTO name: "+opponent),team+" exact HTO identity");
   assert.ok(el.includes("Braves L "+result),team+" factual final score");
   assert.equal(await p.$eval("#headtohead-section",e=>e.hidden),true,team+" cannot merge historical H2H");
   const sources=await p.$$eval(".same-game-links a",els=>els.map(a=>a.href));
   assert.equal(sources.length,2);
   assert.ok(sources[0].includes("sportsvillage.ca/TeamInfo.aspx"));
   assert.ok(sources[1].includes("htosports.com/teams/default.asp"));
  }
  await p.select("#opponent","Other Way");
  assert.equal(await p.$eval(".verified-single-game",e=>e.textContent).catch(()=>null),null);
  assert.equal(await p.$eval("#headtohead-section",e=>e.hidden),true);
  await p.select("#opponent","Big Bastones");
  assert.equal(await p.$eval("#headtohead-section",e=>e.hidden),false,"existing exact-name history preserved");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,sourceVerifiedCurrentGameLinks:2,historicalAliasMerging:false,otherWayHeld:true,exactOpponentUnchanged:true,errors}));
 }finally{await b.close();srv.close()}
})().catch(e=>{console.error(e.stack||e);srv.close();process.exitCode=2});
