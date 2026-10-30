/* Full HTO shell QA: simulate removing old native YouTube and replacing
 * existing Hot Stove Text Area with a single local Media+article iframe.
 * DOM-only test in disposable headless browser; never publishes to HTO.
 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const http=require('node:http'),pup=require('puppeteer');
const root=path.resolve(__dirname,'..','widgets');
const ty={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return}
 res.setHeader('Content-Type',ty[path.extname(file)]||'text/plain');res.end(b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const browser=await pup.launch({headless:true,args:['--no-sandbox','--disable-gpu','--allow-running-insecure-content','--disable-web-security']});
 const data=[];
 try{
  for(const v of [{name:'desktop',width:1440,height:950},{name:'mobile',width:390,height:844},{name:'smallmobile',width:358,height:740}]){
   const page=await browser.newPage();
   await page.setViewport({width:v.width,height:v.height,deviceScaleFactor:1,isMobile:v.width<500,hasTouch:v.width<500});
   await page.goto('https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=home',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForSelector('#mod150050 iframe',{timeout:15000});
   const details=await page.evaluate(url=>{
    const video=document.querySelector('#mod159184');
    const hot=document.querySelector('#mod150050');
    const frame=hot.querySelector('iframe');
    video?.remove();
    frame.src=url;frame.height='900';frame.style.height='clamp(800px, calc(80vw + 450px), 900px)';frame.style.width='100%';frame.style.border='0';
    frame.scrolling='no';frame.title='Brave H.C. — Media & Hot Stove';
    return {replacement:true,oldModuleRemoved:!document.querySelector('#mod159184')};
   },'http://127.0.0.1:'+port+'/media-hot-stove.html?embed=1');
   await new Promise(r=>setTimeout(r,1800));
   const frame=page.frames().find(f=>f.url().includes('media-hot-stove.html'));
   assert.ok(frame,'local candidate must appear in actual HTO iframe');
   await frame.waitForSelector('#story-panel .article-card',{timeout:10000});
   const inner=await frame.evaluate(()=>{
    const e=document.querySelector('#media-root');
    return {height:Math.ceil(e.getBoundingClientRect().height),articleTitle:document.querySelector('#story-panel h2')?.textContent,width:document.documentElement.scrollWidth,viewportWidth:innerWidth,iframeSrc:document.querySelector('.video-ratio iframe')?.src}
   });
   const outer=await page.evaluate(()=>{
    const iframe=document.querySelector('#mod150050 iframe');
    const weather=document.getElementById('mod159192');
    const modules=[...document.querySelectorAll('.modWrapper')].map(x=>x.id);
    return {outerPageWidth:document.documentElement.scrollWidth,width:innerWidth,modules,
      iframeHeight:Math.round(iframe.getBoundingClientRect().height),
      iframeWidth:Math.round(iframe.getBoundingClientRect().width),
      weatherPresent:!!weather,weatherText:weather?.innerText.slice(0,140),
      videoNativeAbsent:!document.getElementById('mod159184')};
   });
   assert.equal(outer.weatherPresent,true);
   assert.equal(outer.videoNativeAbsent,true);
   const expected=v.width<=500?800:900;
   assert.equal(outer.iframeHeight,expected,'responsive iframe height');
   assert.ok(inner.height<=outer.iframeHeight,'iframe content fits');
   assert.ok(inner.width<=inner.viewportWidth+1);
   assert.ok(outer.outerPageWidth<=v.width+1,'HTO parent page must not overflow');
   assert.ok(outer.modules.indexOf('mod150050')<outer.modules.indexOf('mod157965'),'media stays first');
   assert.ok(inner.iframeSrc.includes('0UQeZEan2bk'));
   await page.screenshot({path:path.join(__dirname,'..','docs','QA_HtoShellMedia_'+v.name+'.png'),fullPage:false});
   data.push({screen:v.name,inner,outer});
   console.log('HTO_SHELL_MEDIA_QA_PASS',v.name,'mediaHeight',inner.height,'iframe',outer.iframeHeight,'weather',outer.weatherPresent);
   await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'..','docs','QA_HtoShellMedia_READONLY.json'),JSON.stringify({result:'PASS',realHTOWasNotModified:true,simulations:data},null,2));
  console.log('HTO_SHELL_MEDIA_ALL_PASS');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error('HTO_SHELL_MEDIA_QA_FAIL',e.stack);process.exitCode=1;server.close()});
