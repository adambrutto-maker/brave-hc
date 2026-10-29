'use strict';
/* Browser regression: the name Andrew Cristillo in a verified award title is
   an eponymous honour, not a player reference; generic HTO links still work. */
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript',
 '.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);return res.end('Unavailable')}
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');
  res.end(bytes);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/widgets/player-highlights.html?playerID=354060');
  await page.locator('#profileSource a').waitFor({timeout:15000});
  await page.locator('#lockerHonors').click();
  const award=page.locator('#honorsGrid .ph-honor-title').filter({hasText:'Andrew Cristillo Award'});
  await award.waitFor({timeout:8000});
  assert.equal(await award.locator('a.brave-player-link').count(),0,'Namesake in award badge must not link to the player');
  assert.equal(await award.getAttribute('data-brave-no-link'),'','Award title must explicitly opt out');
  await page.locator('#lockerAll').click();
  for(let tries=0;tries<8;tries++){
   if(await page.locator('#allGrid .ph-inventory-name').filter({hasText:'Andrew Cristillo Award'}).count())break;
   const more=page.locator('#allMore');if(!(await more.count())||await more.isHidden())break;
   await more.click();
  }
  const inAll=page.locator('#allGrid .ph-inventory-name').filter({hasText:'Andrew Cristillo Award'});
  assert.equal(await inAll.count(),1,'Award should remain present in All');
  assert.equal(await inAll.locator('a.brave-player-link').count(),0,'All must not link namesake');
  const legacy=page.locator('#legacy .ph-event-title').filter({hasText:'Andrew Cristillo Award'});
  assert.ok(await legacy.count()>0,'Legacy source label remains present');
  assert.equal(await legacy.first().locator('a.brave-player-link').count(),0);
  await page.evaluate(()=>{
   const p=document.createElement('p');p.id='link-scope-control';p.textContent='Andrew Cristillo';document.body.append(p);
  });
  await page.locator('#link-scope-control a.brave-player-link').waitFor({timeout:5000});
  assert.match(await page.locator('#link-scope-control a').getAttribute('href'),/playerID=634098/);
  assert.deepEqual(errors,[]);
  console.log('HIGHLIGHTS_AWARD_TITLE_NOLINK_PASS',JSON.stringify({awardTitlePlainText:true,allCollectionPlainText:true,historicalPlainText:true,playerLinkElsewhere:true,width:390}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
