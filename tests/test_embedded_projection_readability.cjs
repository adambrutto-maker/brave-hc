const puppeteer=require("puppeteer"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const root=path.resolve(__dirname,"..","widgets");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,b)=>{if(err)return res.writeHead(404).end();res.setHeader("Content-Type",mime[path.extname(f)]||"text/plain");res.end(b)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox"]});
 try{
  const page=await browser.newPage(),errors=[],rows=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const width of [625,358]){
   await page.setViewport({width,height:700});
   await page.goto("http://127.0.0.1:"+server.address().port+"/projection.html?embed=1",{waitUntil:"networkidle0",timeout:32000});
   const x=await page.evaluate(()=>{
    const shell=document.querySelector(".shell"),table=document.querySelector(".projection-table");
    const players=[...document.querySelectorAll("#projection-rows tr:not(.details)")];
    const name=document.querySelector(".projection-table .name");
    const total=document.querySelector(".projection-table .total");
    const actual=document.querySelector(".projection-table .actual");
    shell.scrollTop=900;
    return{
       count:players.length,
       namePx:parseFloat(getComputedStyle(name).fontSize),
       totalPx:parseFloat(getComputedStyle(total).fontSize),
       actualPx:parseFloat(getComputedStyle(actual).fontSize),
       shellWidth:shell.clientWidth,shellScrollWidth:shell.scrollWidth,
       tableWidth:table.clientWidth,tableScrollWidth:table.scrollWidth,
       scrollY:shell.scrollTop
    };
   });
   assert.equal(x.count,22);
   assert.ok(x.namePx>=(width===625?15:16),"player names should be legible on "+width);
   assert.ok(x.totalPx>=(width===625?14:15));
   assert.ok(x.actualPx>=12);
   assert.ok(x.shellScrollWidth<=x.shellWidth+1,"no horizontal clipping of page "+width);
   assert.ok(x.tableScrollWidth<=x.tableWidth+1,"table should not expand horizontally "+width);
   assert.ok(x.scrollY>500,"scroll must reach lower 22-player roster");
   rows.push({width,...x});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",all22:true,scrollable:true,horizontalOverflow:false,measures:rows,pageErrors:errors}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});
