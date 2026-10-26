const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets"),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const server=http.createServer((req,res)=>{const f=path.resolve(root,"."+new URL(req.url,"http://x").pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader("content-type",mime[path.extname(f)]||"text/plain");res.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,"127.0.0.1",r));const b=await puppeteer.launch({headless:true,args:["--no-sandbox"]});let report={};
try{const p=await b.newPage(),err=[];p.on("pageerror",e=>err.push(e.message));
 for(const [w,h,part] of [[358,460,"standings"],[650,460,"standings"],[358,700,"projection"],[650,700,"projection"]]){
  await p.setViewport({width:w,height:h});await p.goto("http://127.0.0.1:"+server.address().port+"/home-panels.html?panel="+part+"&embed=1",{waitUntil:"networkidle0"});
  const before=await p.evaluate(()=>{const e=document.querySelector(".shell");return{height:e.clientHeight,total:e.scrollHeight,top:e.scrollTop,teams:document.querySelectorAll("#standings-rows tr").length,players:document.querySelectorAll("#projection-rows tr:not(.details)").length,win:document.querySelector("#standings-rows")?.textContent.slice(0,70),note:document.querySelector("#projection-note")?.textContent,link:!!document.querySelector(".full-link")}});
  await p.hover(".shell");await p.mouse.wheel({deltaY:700});await new Promise(r=>setTimeout(r,150));
  const after=await p.$eval(".shell",e=>e.scrollTop);
  assert.ok(after>0,part+" "+w+": iframe must scroll");
  assert.equal(before.teams,part==="standings"?8:0);
  assert.equal(before.players,part==="projection"?22:0);
  assert.equal(before.link,true);
  if(part==="standings")assert.ok(before.win.includes(".750"),"decimal winning percentage");
  report[w+"x"+h+" "+part]={...before,scrollAfter:after};
  if(w===358)await p.screenshot({path:path.resolve(__dirname,part+"-fixed.png")});
 }
 await p.setViewport({width:358,height:900});await p.goto("http://127.0.0.1:"+server.address().port+"/home-panels.html?panel=projection&full=1",{waitUntil:"networkidle0"});
 const full=await p.evaluate(()=>({windowScrollHeight:document.documentElement.scrollHeight,rows:document.querySelectorAll("#projection-rows tr:not(.details)").length}));
 assert.equal(full.rows,22);assert.ok(full.windowScrollHeight>900);
 assert.deepEqual(err,[]);console.log(JSON.stringify({ok:true,report,full,errors:err}));
}finally{await b.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1})