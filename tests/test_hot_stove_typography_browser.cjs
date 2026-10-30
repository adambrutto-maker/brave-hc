/* Read-only regression test for Hot Stove editorial typography.
 * Run: node tests/test_hot_stove_typography_browser.cjs (NODE_PATH to puppeteer).
 * Self-hosted source preview; does not save HTO/editor settings.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'widgets');
const puppeteer = require('puppeteer');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=path.resolve(root,'.'+name);
  if(!(full===root||full.startsWith(root+path.sep))){res.writeHead(403).end();return}
  fs.readFile(full,(err,bytes)=>{if(err){res.writeHead(404).end();return}
    res.setHeader('Content-Type',types[path.extname(full)]||'text/plain');res.end(bytes);
  });
});
const chrome=['C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync);
(async()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'hot-stove-approved.json'),'utf8'));
  assert.equal(data.editorialState,'FOUNDER_APPROVED');
  assert.equal(data.latestArticle.verification.status,'SOURCE_VERIFIED');
  assert.equal(data.latestArticle.boxScore.ourGoals,6);
  assert.equal(data.latestArticle.boxScore.theirGoals,4);
  const snapshot=fs.readFileSync(path.join(root,'hot-stove-approved.json'));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await puppeteer.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--no-sandbox','--disable-gpu']});
  const report={goal:'Hot Stove professional article reading scale, no content changes',publicSiteModified:false,views:[]};
  try{
    for(const item of [
      {name:'desktop',width:650,height:900,embed:false},
      {name:'embedded',width:630,height:900,embed:true},
      {name:'mobile',width:390,height:820,embed:true},
      {name:'smallmobile',width:358,height:740,embed:true},
    ]){
      const page=await browser.newPage(),errs=[];
      page.on('pageerror',e=>errs.push(e.message));
      await page.setViewport({width:item.width,height:item.height,deviceScaleFactor:1,isMobile:item.width<500,hasTouch:item.width<500});
      await page.goto(base+'/hot-stove.html'+(item.embed?'?embed=1':''),{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForSelector('.article-body p',{timeout:12000});
      let facts=await page.evaluate(()=>{
        const css=(selector)=>{let e=document.querySelector(selector),s=getComputedStyle(e);return {size:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),family:s.fontFamily,weight:s.fontWeight}};
        return {
         headline:document.querySelector('.page h2')?.textContent,
         score:document.querySelector('.score .numbers')?.textContent.replace(/\s/g,''),
         paragraphText:document.querySelector('.article-body p')?.textContent,
         articleParagraphs:document.querySelectorAll('.article-body p').length,
         paragraph:css('.article-body p'),headlineFont:css('.page h2'),
         lead:css('.lead'),tab:css('.tab'),meta:css('.meta'),
         articleLink:{href:document.querySelector('.expand-article')?.href,target:document.querySelector('.expand-article')?.target},
         horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
        };
      });
      assert.equal(facts.headline,data.latestArticle.headline,'approved headline must be preserved');
      assert.equal(facts.paragraphText,data.latestArticle.paragraphs[0],'approved article paragraph must be preserved');
      assert.equal(facts.articleParagraphs,data.latestArticle.paragraphs.length,'all original paragraphs retained');
      assert.ok(facts.paragraph.size>=16,'article paragraphs 16px minimum');
      assert.ok(facts.paragraph.line>=25.0,'article paragraphs line spacing at least 25px');
      assert.ok(facts.headlineFont.size>=20,'headline at least 20px');
      assert.ok(facts.lead.size>=15,'lead 15px minimum');
      assert.ok(facts.tab.size>=13,'tabs 13px minimum');
      assert.ok(facts.meta.size>=12,'metadata 12px minimum');
      assert.match(facts.paragraph.family,/Arial/);
      assert.equal(facts.score,'6:4','verified final score retained');
      assert.equal(facts.articleLink.target,'_blank','full article remains reachable outside the fixed-height HTO iframe');
      assert.equal(facts.horizontalOverflow,false,'never overflow horizontally');
      await page.click('button[data-tab="preview"]');
      await page.waitForSelector('.preview p');
      const preview=await page.$eval('.preview p',e=>({size:parseFloat(getComputedStyle(e).fontSize),text:e.textContent}));
      assert.ok(preview.size>=14.5,'pregame article paragraphs are legible');
      await page.click('button[data-tab="archive"]');
      await page.waitForSelector('.archive button');
      const archive=await page.$eval('.archive button',e=>({size:parseFloat(getComputedStyle(e).fontSize),text:e.textContent}));
      assert.ok(archive.size>=14,'archive buttons legible');
      await page.click('.archive button');
      await page.waitForSelector('.article-body p');
      assert.ok(await page.$eval('.article-body p',e=>parseFloat(getComputedStyle(e).fontSize)>=16),'archived article readable');
      await page.click('button[data-tab="feature"]');
      await page.waitForSelector('.article-body p');
      await page.screenshot({path:path.join(__dirname,'..','docs','QA_HotStove_Typography_'+item.name+'.png'),fullPage:false});
      assert.deepEqual(errs,[],'no script errors');
      report.views.push({viewport:item.name,...facts,nextGameText:preview.text.slice(0,110),archiveButtonSize:archive.size,scriptErrors:errs});
      console.log('HOT_STOVE_READABILITY_PASS',item.name,'paragraph',facts.paragraph.size,'line',facts.paragraph.line,'headline',facts.headlineFont.size,'tab',facts.tab.size,'horizontal',facts.horizontalOverflow);
      await page.close();
    }
    assert.deepEqual(fs.readFileSync(path.join(root,'hot-stove-approved.json')),snapshot,'all approved story bytes untouched');
    fs.writeFileSync(path.join(__dirname,'..','docs','QA_HotStove_Typography_Proof.json'),JSON.stringify(report,null,2));
    console.log('HOT_STOVE_SOURCE_AND_BROWSER_QA_PASS');
  } finally {
    await browser.close();
    await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error('HOT_STOVE_QA_FAIL',e.stack);process.exitCode=1;server.close()});
