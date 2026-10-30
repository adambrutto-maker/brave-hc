"use strict";
/* ENG59 private preview smoke, not GitHub deployment or human approval.
 * Run locally with a path to the protected static candidate.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),
 http=require("node:http"),puppeteer=require("puppeteer");
const root=path.resolve(process.argv[2]||"");
assert.ok(root&&!root.includes("/widgets/")&&fs.existsSync(path.join(root,"index.html")),
 "PRIVATE_PREVIEW_DIRECTORY_REQUIRED");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",
 ".json":"application/json",".png":"image/png",".jpg":"image/jpeg",
 ".svg":"image/svg+xml",".webp":"image/webp",".ico":"image/x-icon"};
const server=http.createServer((req,res)=>{
 const uri=new URL(req.url,"http://127.0.0.1");
 const requestPath=decodeURIComponent(uri.pathname);
 const f=path.resolve(root,"."+requestPath);
 if(f!==path.join(root,"index.html")&&!f.startsWith(root+path.sep))
  return res.writeHead(403).end();
 fs.readFile(f,(err,data)=>{
  if(err)return res.writeHead(404).end();
  res.setHeader("content-type",mime[path.extname(f)]||"application/octet-stream");
  res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 const results=[];
 try{
  for(const width of [1140,358]){
   const page=await browser.newPage();
   await page.setViewport({width,height:840});
   const errors=[],missing=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{
    if(r.status()>=400&&r.url().startsWith("http://127.0.0.1:")&&
       !r.url().includes("favicon.ico"))missing.push(r.status()+" "+r.url());
   });
   const origin="http://127.0.0.1:"+server.address().port;
   await page.goto(origin+"/index.html",{waitUntil:"networkidle0",timeout:50000});
   assert.ok(page.url().includes("/widgets/analytics.html"));
   for(const resource of ["league-intelligence.html","division-fit-lab.html","player-game-audit.html"]){
    await page.goto(origin+"/widgets/"+resource,{waitUntil:"networkidle0",timeout:50000});
    const data=await page.evaluate(()=>({
     overflow:document.body.scrollWidth-innerWidth,
     source:document.querySelector("#audit-source-status")?.textContent,
     video:document.querySelector("#video-readiness-status")?.textContent,
     title:document.title
    }));
    assert.ok(data.overflow<=2,resource+" overflow "+data.overflow);
    if(resource==="division-fit-lab.html")
     assert.ok(data.video?.includes("INSUFFICIENT_VIDEO"),"No video rating allowed in preview");
    if(resource==="player-game-audit.html")
     assert.ok(!data.source?.includes("Source evidence held"),"GameInfo source audit was held");
    results.push({width,resource,overflow:data.overflow,videoHold:!!data.video?.includes("INSUFFICIENT_VIDEO")});
   }
   assert.deepEqual(errors,[],"JS ERRORS on "+width);
   assert.deepEqual(missing,[],"MISSING PAGE ASSETS on "+width);
   await page.close();
  }
  console.log(JSON.stringify({status:"ENG59_SCOPED_PRIVATE_PREVIEW_BROWSER_PASS",
    rootPagesWorkflowChanged:false,productionDeployed:false,independentPrivacyApproval:false,
    sourceOnlyPreview:true,results}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=2});
