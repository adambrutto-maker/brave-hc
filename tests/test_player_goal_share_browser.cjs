'use strict';
// CI browser regression for CURRENT HTO source share, independent of official awards.
// Newer actuals are disabled in this fixture to select the source-pinned participant card.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE||'puppeteer-core');
const root=path.resolve(__dirname,'..'),browserBinary=process.env.BRAVE_CHROME_BIN;
if(!browserBinary)throw Error('BRAVE_CHROME_BIN_REQUIRED');
const feed=JSON.parse(fs.readFileSync(path.join(root,'widgets/awards-participants.json'),'utf8'));
assert.equal(feed.status,'UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES');
const person=feed.players.filter(p=>p.name==='Carosi, Justin');
assert.equal(person.length,1);
const playerGoals=person[0].officialHTOStats.goals,team=feed.verifiedSourceReadback?.team;
assert.equal(team.GP,feed.officialTeamGames);
assert(Number.isInteger(team.G)&&team.G>0&&Number.isInteger(playerGoals)&&playerGoals<=team.G);
const wanted=Math.round(playerGoals/team.G*100)+'%';
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8',
 '.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const service=http.createServer((req,res)=>{
 let url;
 try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
 catch{res.writeHead(400);res.end();return;}
 if(['/widgets/player-actuals.json','/widgets/player-actuals-hourly.json'].includes(url)){
   res.writeHead(404);res.end('Newer feed isolated for snapshot parity test');return;
 }
 const filename=path.resolve(root,'.'+url);
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(filename,(err,b)=>{
   if(err){res.writeHead(404);res.end();return;}
   res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');
   res.end(b);
 });
});
(async()=>{
 await new Promise(ok=>service.listen(0,'127.0.0.1',ok));
 const host='http://127.0.0.1:'+service.address().port+'/widgets/player-highlights.html?playerID=354060';
 const browser=await puppeteer.launch({headless:true,executablePath:browserBinary,args:['--no-sandbox','--disable-background-networking']});
 try{
  for(const width of [390,1440]){
   const page=await browser.newPage(),pageErrors=[];
   try{
    page.on('pageerror',e=>pageErrors.push(String(e)));
    await page.setViewport({width,height:844});
    const response=await page.goto(host,{waitUntil:'networkidle0',timeout:25000});
    assert.equal(response.status(),200);
    const actual=await page.evaluate(()=>({
      player:document.querySelector('#playerName')?.textContent,
      stats:document.querySelector('#form')?.textContent,
      docWidth:document.documentElement.scrollWidth,
      innerWidth:window.innerWidth
    }));
    assert.equal(actual.player,'Justin Carosi');
    assert(actual.stats.includes('Share of team goals'),'Verified HTO share card missing');
    assert(actual.stats.includes(wanted),'Incorrect official percent');
    assert(actual.stats.includes(playerGoals+' of '+team.G+' goals'),'Incorrect official goal denominator');
    assert(actual.docWidth<=actual.innerWidth+4,'Unexpected horizontal overflow');
    assert.deepEqual(pageErrors,[],'Browser JavaScript errors');
    console.log('HOCKEYOS_CURRENT_GOAL_SHARE_BROWSER_PASS '+JSON.stringify({width,share:wanted,goals:playerGoals,teamGoals:team.G}));
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>service.close());
