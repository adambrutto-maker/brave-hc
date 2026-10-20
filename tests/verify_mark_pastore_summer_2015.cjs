'use strict';
const assert=require('node:assert/strict');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE || 'puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try{
  const url='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=354061&pageLoad=ProfileTabStats&viewseas=Summer_2015';
  const page=await browser.newPage();
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
  const result=await page.evaluate(()=>({
    title:document.title.replace(/\s+/g,' '),
    hasSeasonGameTable:document.body.innerText.includes('2015'),
    officialGameLinks:[...document.querySelectorAll('a[href*="gameID"]')].filter(a=>a.href.includes('p=boxscore')).length,
    playerName:document.title
  }));
  assert.equal(response.status(),200);
  assert.match(result.title,/Mark Pastore - Player Profile/i);
  assert.equal(result.hasSeasonGameTable,true);
  assert.ok(result.officialGameLinks>0,'Expected Summer 2015 HTO game rows');
  console.log('PUBLIC_HTO_SUMMER_PROFILE_QA_PASS',JSON.stringify({http:response.status(),games:result.officialGameLinks,title:result.title}));
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
