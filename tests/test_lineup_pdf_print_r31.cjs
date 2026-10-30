/* Verify actual PDF open/print handoff from the Lineup tab. No printer use. */
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("node:assert/strict");
const puppeteer=require("C:/Users/adamb/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer");
const root=path.resolve(__dirname,"../widgets");
const map={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".pdf":"application/pdf",".png":"image/png",".webp":"image/webp"};
const server=http.createServer((req,res)=>{const f=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://local").pathname));
if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
fs.readFile(f,(err,b)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{"Content-Type":map[path.extname(f)]||"text/plain"}).end(b)})});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const url="http://127.0.0.1:"+server.address().port;
 const browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-gpu"]});
 try{
  const page=await browser.newPage();await page.goto(url+"/game-centre-next.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#lineup-print").hasAttribute("href")&&!document.querySelector("#lineup-print").hasAttribute("aria-disabled"),{timeout:20000});
  await page.click("#centre-lineup");
  const attributes=await page.$eval("#lineup-print",e=>({href:e.href,target:e.target,rel:e.rel}));
  assert.equal(attributes.target,"_blank");assert.ok(attributes.href.endsWith("brave-hc-blank-original-card.pdf"));
  const pdfResponse=await page.evaluate(async url=>{const r=await fetch(url);const b=await r.arrayBuffer();return {status:r.status,type:r.headers.get("content-type"),magic:new TextDecoder().decode(b.slice(0,5)),bytes:b.byteLength}},attributes.href);
  assert.equal(pdfResponse.status,200);assert.equal(pdfResponse.type,"application/pdf");assert.equal(pdfResponse.magic,"%PDF-");
  const targetWait=browser.waitForTarget(t=>t.url().includes("brave-hc-blank-original-card.pdf"),{timeout:12000});
  await page.click("#lineup-print");
  const target=await targetWait;
  assert.ok(target.url().includes("brave-hc-blank-original-card.pdf"));
  console.log("R31_PRINT_LINK_PASS",JSON.stringify({openedTarget:target.url(),...pdfResponse,opensSeparateTab:true,physicalPrinterNotInvoked:true}));
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error("R31_PRINT_LINK_FAIL",e.stack);process.exitCode=1}).finally(()=>server.close());
