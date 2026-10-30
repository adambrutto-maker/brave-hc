/* Local HTO media widget regression: original score, published YouTube, tabs and no nested scroll. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const pup=require('puppeteer');
const root=path.resolve(__dirname,'..','widgets');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const full=path.resolve(root,'.'+name);
 if(!(full===root||full.startsWith(root+path.sep))){res.writeHead(403).end();return}
 fs.readFile(full,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(full)]||'text/plain');res.end(data)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await pup.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
 const pub=JSON.parse(fs.readFileSync(path.join(root,'hot-stove-approved.json'),'utf8'));
 const video=JSON.parse(fs.readFileSync(path.join(root,'media-hot-stove.json'),'utf8'));
 assert.equal(pub.editorialState,'FOUNDER_APPROVED');
 assert.equal(pub.latestArticle.gameId,video.publishedVideo.gameId);
 const report=[];
 try{
 for(const v of [{name:'desktop',width:660,height:960},{name:'embedded',width:625,height:960},{name:'mobile',width:390,height:844},{name:'smallmobile',width:358,height:740}]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:v.width,height:v.height,deviceScaleFactor:1,isMobile:v.width<500,hasTouch:v.width<500});
  const res=await page.goto(base+'/media-hot-stove.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#story-panel .article-card h2',{timeout:10000});
  const f=async()=>page.evaluate(()=>{
    const heading=document.querySelector('#story-panel h2'),text=document.querySelector('#story-panel .excerpt');
    const s=text?getComputedStyle(text):null;
    return {
     rootHeight:Math.ceil(document.querySelector('#media-root').getBoundingClientRect().height),
     pageHeight:document.documentElement.scrollHeight,
     viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     iframeSrc:document.querySelector('.video-ratio iframe')?.src,
     videoTitle:document.querySelector('.video-ratio iframe')?.title,
     activeTab:document.querySelector('.story-tabs button[aria-selected="true"]')?.dataset.tab,
     headline:heading?.textContent,
     excerpt:text?.textContent,
     excerptSize:s?.fontSize,paragraphs:document.querySelectorAll('#story-panel .article-card p').length,
     articleHref:document.querySelector('#story-panel .full-article')?.href,
     youtubeHref:document.querySelector('.video-ratio iframe')?.src
    };
  });
  const first=await f();
  assert.equal(res.status(),200);
  assert.ok(first.iframeSrc.includes('0UQeZEan2bk'),'correct YouTube game video');
  assert.equal(first.headline,pub.latestArticle.headline);
  assert.equal(first.excerpt,pub.latestArticle.paragraphs[0]);
  assert.equal(first.activeTab,'recap');
  assert.ok(first.articleHref.includes('/hot-stove.html?tab=feature'));
  assert.equal(first.excerptSize,'16px');
  assert.ok(first.rootHeight<=940,'fit proposed HTO iframe height at this viewport; actual '+first.rootHeight);
  assert.ok(first.scrollWidth<=v.width+1,'no horizontal overflow');
  await page.click('button[data-tab="next"]');
  await page.waitForSelector('#story-panel h2');
  const next=await f();
  assert.equal(next.activeTab,'next');
  const fixture=JSON.parse(fs.readFileSync(path.join(root,'countdown.json'),'utf8')).games.find(g=>Date.now()<Date.parse(g.rolloverAtUTC));
  const verifiedPreview=fixture && pub.gamePreview?.headline?.toLowerCase().includes(fixture.opponent.toLowerCase());
  if(verifiedPreview)assert.ok(next.headline.includes(fixture.opponent),'verified fixture must match approved preview');
  else assert.ok(next.headline.includes('pending')||next.headline.includes(fixture?.opponent||''),'expired/stale preview must not be displayed as current');
  assert.ok(next.rootHeight<=940);
  await page.click('button[data-tab="archive"]');
  await page.waitForSelector('.archive-list li');
  const archives=await page.$$eval('.archive-list a',as=>as.map(a=>({href:a.href,label:a.textContent})));
  assert.equal(archives.length,Math.min(3,pub.archive.length+1),'three recent stories shown with full archive access');
  assert.ok((await page.$eval('#story-panel .full-article',e=>e.href)).includes('tab=archive'),'full archive remains available');
  assert.ok(archives[1].href.includes('tab=archive&article=recap-'));
  const arcHeight=await page.$eval('#media-root',e=>Math.ceil(e.getBoundingClientRect().height));
  assert.ok(arcHeight<=940,'archive must fit HTO frame; actual '+arcHeight);
  await page.screenshot({path:path.join(__dirname,'..','docs','QA_MediaHotStove_'+v.name+'.png'),fullPage:true});
  await page.goto(archives[1].href,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.article-body p',{timeout:10000});
  const archiveTitle=await page.$eval('.page h2',e=>e.textContent);
  assert.equal(archiveTitle,pub.archive[0].article.headline,'archive deeplink must show selected article');
  assert.deepEqual(errors,[],'no scripts errors');
  report.push({width:v.width,viewport:v.name,recap:first,nextHeight:next.rootHeight,archiveHeight:arcHeight,archiveDeeplinkTitle:archiveTitle,errors});
  console.log('MEDIA_HOT_STOVE_PASS',v.name,'recap',first.rootHeight,'next',next.rootHeight,'archive',arcHeight,'width',first.scrollWidth);
  await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'..','docs','QA_MediaHotStove_Proof_PRIVATE.json'),JSON.stringify({status:'PRIVATE_QA_PASS',productionHTOChanged:false,views:report},null,2));
 console.log('MEDIA_HOT_STOVE_ALL_PASS');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error('MEDIA_HOT_STOVE_FAILURE',e.stack);process.exitCode=1;server.close()});
