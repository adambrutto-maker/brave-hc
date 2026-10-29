'use strict';
/* Isolated Bio V2.8 public reference-video-library regression. No production edits. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'widgets/player-bio-coaching-library-v28-preview.json'),'utf8'));
assert.equal(manifest.schema,'brave-hc-coaching-reference-video-library/v1');
assert.equal(manifest.status,'REVIEW_ONLY_NO_PRODUCTION_RELEASE');
assert.equal(manifest.videos.length,7);
assert.equal(new Set(manifest.videos.map(v=>v.youtubeId)).size,manifest.videos.length);
assert.ok(manifest.videos.every(v=>/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId)));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'text/plain');
  res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390]){
   for(const playerID of [354060,354055]){
    const page=await browser.newPage({viewport:{width,height:860}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const response=await page.goto(origin+'/widgets/player-bio-v28-coaching-preview.html?playerID='+playerID+'&embed=1',{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,'Preview loaded');
    await page.locator('#playbookCount').getByText('7 LESSONS').waitFor({timeout:15000});
    await page.locator('[data-bio-view="coaching"]').click();
    assert.equal(await page.locator('#bioVideoPlaybook').isVisible(),true);
    assert.equal(await page.locator('#playbookList .playbook-card').count(),3);
    const featured=page.locator('#playbookList .playbook-card').first();
    assert.match(await featured.innerText(),/Brave H.C. home screen/);
    await page.locator('#playbookFilters button').filter({hasText:'Systems'}).click();
    assert.equal(await page.locator('#playbookList .playbook-card').count(),2);
    await page.locator('#playbookFilters button').filter({hasText:'Goalie'}).click();
    assert.equal(await page.locator('#playbookList .playbook-empty').count(),1);
    await page.locator('#playbookFilters button').filter({hasText:'All'}).click();
    await page.locator('#playbookList .playbook-more').click();
    assert.equal(await page.locator('#playbookList .playbook-card').count(),7);
    const first=page.locator('#playbookList .playbook-card').first();
    await first.locator('.playbook-watch').click();
    assert.equal(await page.locator('#playbookList iframe[src*="01jwwgblUfU"]').count(),1,'Existing featured video has lazy embed');
    await page.locator('#playbookList .playbook-card').first().locator('.playbook-watch').click();
    assert.equal(await page.locator('#playbookList iframe').count(),0,'Closing video removes embed');
    await page.locator('#playbookAdvanced summary').click();
    assert.equal(await page.locator('#playbookAdvanced').evaluate(el=>el.open),true);
    await page.locator('[data-bio-view="trends"]').click();
    assert.equal(await page.locator('#bioVideoPlaybook').isVisible(),false,'Library restricted to Coaching tab');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No overflow at '+width);
    assert.deepEqual(errors,[],'No browser page errors');
    console.log('BIO_V28_VIDEO_LIBRARY_PASS',JSON.stringify({width,playerID,videos:7,systems:2,initialCards:3,filter:true,embedOnDemand:true,privateMedia:false,errors:0}));
    await page.close();
   }
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
