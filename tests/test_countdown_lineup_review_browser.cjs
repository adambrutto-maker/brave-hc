'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,data)=>{if(e)return res.writeHead(404).end();
 res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(data)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const b=await chromium.launch({headless:true,executablePath:process.env.BRAVE_CHROMIUM_PATH});
 try{
 const url='http://127.0.0.1:'+server.address().port+'/widgets/countdown-lineup-review.html?embed=1';
 const p=await b.newPage({viewport:{width:390,height:900}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('#gameNightApprovalState').textContent.includes('approval'),null,{timeout:13000});
 assert.equal(await p.locator('#gameNightOriginalCard').isVisible(),false);
 assert.equal(await p.locator('#gameNightCard').isVisible(),true);
 assert.match(await p.locator('#gameNightApprovalState').innerText(),/awaiting manager approval/i);
 assert.doesNotMatch(await p.locator('#gameNightCard').innerText(),/Carosi|Brennan|Pagnotta/i);
 assert.equal(await p.locator('#days').count(),1);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',screen:'countdown lineup review',actualSource:'original Lines Excel template',published:false,unapprovedHidden:true,width:390,pageErrors:errors}));
 await p.close();
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
