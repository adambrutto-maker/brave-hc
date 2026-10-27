"use strict";
/* Developer-only full private preview browser audit.
 * Uses HTTP localhost only; does not modify release or contact a production site.
 * Keeps per-page evidence and distinguishes runtime blockers from feature-page
 * contextual holds, e.g., selected player required. No false sign-off.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),
 path=require("node:path"),http=require("node:http"),
 puppeteer=require("puppeteer");
const root=path.resolve(process.argv[2]||"");
const reportPath=process.argv[3]?path.resolve(process.argv[3]):null;
if(reportPath){
 assert.ok(!reportPath.startsWith(root+path.sep)&&
  !reportPath.includes(path.sep+"ENG_CHAT59_HockeyOS_20261027"+path.sep),
  "BROWSER_RECEIPT_MUST_STAY_OUTSIDE_PUBLIC_REPO");
 assert.ok(!fs.existsSync(reportPath),"BROWSER_RECEIPT_EXISTS_NO_OVERWRITE");
}
const marker="ENG59_ALL_STATIC_PAGES_LOCAL_BROWSER_V1";
assert.ok(fs.existsSync(path.join(root,"index.html"))&&
 fs.existsSync(path.join(root,"widgets","analytics.html")),
 "PRIVATE_SCOPED_PREVIEW_REQUIRED");
const mime={".html":"text/html;charset=utf-8",".js":"application/javascript",
 ".css":"text/css",".json":"application/json",".png":"image/png",
 ".webp":"image/webp",".svg":"image/svg+xml",".jpg":"image/jpeg"};
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=new URL(req.url,"http://127.0.0.1").pathname;}
 catch{return res.writeHead(400).end();}
 const dest=path.resolve(root,"."+pathname);
 if(dest!==path.join(root,"index.html")&&!dest.startsWith(root+path.sep))
  return res.writeHead(403).end();
 fs.readFile(dest,(err,buf)=>{
  if(err)return res.writeHead(404).end();
  res.setHeader("content-type",mime[path.extname(dest)]||"application/octet-stream");
  res.end(buf);
 });
});
const entrypages=fs.readdirSync(path.join(root,"widgets"))
 .filter(f=>f.endsWith(".html")).sort();
const buckets=[];
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 try{
  const base="http://127.0.0.1:"+server.address().port;
  for(const width of [1140,358]){
   const page=await browser.newPage();
   page.setDefaultNavigationTimeout(16000);
   await page.setRequestInterception(true);
   page.on("request",req=>{
    const uri=req.url();
    if(uri.startsWith(base)||uri.startsWith("data:")||uri.startsWith("about:")||uri.startsWith("blob:"))
     req.continue();
    else req.abort("blockedbyclient");
   });
   await page.setViewport({width,height:820});
   const selected=width===1140?entrypages:entrypages;
   for(const name of selected){
    const js=[],bad=[],responses=[];
    const onJs=e=>js.push(String(e.message).slice(0,180));
    const onRes=r=>{
     if(r.status()>=400&&r.url().startsWith(base)&&!r.url().includes("favicon.ico"))
      bad.push({status:r.status(),resource:r.url().split("/").slice(-1)[0]});
    };
    page.on("pageerror",onJs);page.on("response",onRes);
    let title="",overflow=null,navigateError=null;
    try{
     const resp=await page.goto(base+"/widgets/"+name,{
       waitUntil:"domcontentloaded",timeout:16000});
     if(resp.status()>=400)navigateError="DOCUMENT_HTTP_"+resp.status();
     await new Promise(resolve=>setTimeout(resolve,400));
     const details=await page.evaluate(()=>({
       title:document.title,overflow:Math.max(
       document.documentElement.scrollWidth-innerWidth,
       document.body.scrollWidth-innerWidth),
       bodyText:(document.body?.innerText||"").slice(0,100)
     }));
     title=details.title;overflow=details.overflow;
    }catch(e){navigateError=String(e.message).slice(0,180);}
    page.off("pageerror",onJs);page.off("response",onRes);
    buckets.push({page:name,width,jsErrors:[...new Set(js)],httpErrors:bad,
      overflow,navigateError});
   }
   await page.close();
  }
  const summary={
    schema:marker,
    status:"DEVELOPER_FULL_SITE_STATIC_SMOKE_REVIEW_REQUIRED",
    httpSite:"LOCALHOST_PRIVATE_PREVIEW_ONLY",
    productionSiteTouched:false,sourceFilesModified:false,
    pagesInManifest:entrypages.length,
    viewportWidths:[1140,358],
    pageLoads:buckets.length,
    runtimePageErrorCases:buckets.filter(x=>x.jsErrors.length||x.navigateError).length,
    missingLocalAssetCases:buckets.filter(x=>x.httpErrors.length).length,
    horizontalOverflowCases:buckets.filter(x=>x.overflow!==null&&x.overflow>2).length,
    pageIssues:buckets.filter(x=>x.jsErrors.length||x.navigateError||x.httpErrors.length||x.overflow>2),
    independentUserAcceptance:false,
    productionDeploymentAuthorized:false
  };
  if(summary.runtimePageErrorCases===0&&summary.missingLocalAssetCases===0&&
     summary.horizontalOverflowCases===0)
   summary.status="DEVELOPER_FULL_SITE_STATIC_SMOKE_PASS_NOT_INDEPENDENT_QA";
  if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(summary,null,2)+"\n");
  console.log(JSON.stringify(summary));
  if(summary.pageIssues.length>0)process.exitCode=2;
 }finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
 }
})().catch(err=>{console.error(err);server.close();process.exitCode=2});
