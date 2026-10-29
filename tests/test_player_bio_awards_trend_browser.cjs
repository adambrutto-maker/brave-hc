'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.BRAVE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),screens=process.env.BRAVE_QA_SCREENSHOTS;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain');
  res.end(b);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({
  executablePath:process.env.BRAVE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-gpu']
 });
 const errors=[];const photo=async(p,name)=>{if(screens)await p.screenshot({path:path.join(screens,name),fullPage:true});};
 async function open(id,overrides={}){
  const p=await browser.newPage({viewport:{width:390,height:880}});
  p.on('pageerror',e=>errors.push(id+': '+e.message));
  for(const [name,obj] of Object.entries(overrides))await p.route('**/'+name,route=>route.fulfill({status:200,
     contentType:'application/json',body:JSON.stringify(obj)}));
  await p.goto(origin+'/widgets/player-bio.html?playerID='+id+'&embed=1');
  await p.waitForFunction(()=>document.body.classList.contains('bio-premium-ready'),null,{timeout:15000});
  return p;
 }
 try{
  const j=await open('354060');
  assert.equal(await j.locator('#bioAdvancedGrid .bio-insight-tile').count(),1,'only one contextual career-pace card; no isolated peak');
  assert.match(await j.locator('#bioAdvancedGrid').innerText(),/Career scoring pace/i);
  assert.doesNotMatch(await j.locator('#bioAdvancedGrid').innerText(),/Peak season/i);
  assert.equal(await j.locator('#bioAdvancedGrid .bio-insight-value').first().textContent(),'1.23',
    'unadjusted career pace must match the Actual chart, not silently show Winter equivalent');
  assert.equal(await j.$eval('#bioProjectionFull',el=>el.open),false,'full model collapsed by default');
  assert.equal(await j.$eval('#bioOtherMetrics',el=>el.open),false,'secondary stats collapsed');
  assert.equal(await j.$eval('#bioMoreSeasonFilters',el=>el.open),false,'extra season filters collapsed');
  assert.equal(await j.$eval('#bioProjectionTrend',el=>el.dataset.trendState),'Neutral');
  assert.match(await j.locator('#bioProjectionTrend').innerText(),/NEUTRAL.*-2\.5%.*Within ±5% of career average/s);
  assert.match(await j.locator('#bioProjectionHeadline').innerText(),/source reconciliation pending/i);
  assert.equal(await j.locator('#bioProjectionCards .bio-metric').nth(3).locator('.value').innerText(),'24');
  const arrow=await j.locator('#bioProjectionTrend .bio-trend-direction-arrow');
  assert.equal(await arrow.count(),1,'one polished arrow and no gauge');
  assert.equal(await j.locator('#bioProjectionTrend .bio-trend-gauge').count(),0,'no gauge');
  const arrowAngle=Number(await j.locator('#bioProjectionTrend [data-arrow-angle]').getAttribute('data-arrow-angle'));
  const z=Number(await j.locator('#bioProjectionTrend [data-z-score]').getAttribute('data-z-score'));
  assert.ok(arrowAngle>90&&arrowAngle<115,'negative but Neutral z-score must tilt down in 0-up/90-right/180-down convention');
  assert.ok(z<0,'workbook trend is below zero even when class is Neutral');
  assert.equal(await j.$eval('#bioProjectionTrend',e=>e.dataset.trendDirection),'BELOW');
  assert.equal(await j.locator('#bioTabs button').count(),3,'three main tabs');
  assert.equal(await j.locator('#bioRateModes button[data-mode="actual"]').innerText(),'All · actual');
  assert.equal(await j.locator('#bioSeasonModes button[data-mode="all"]').innerText(),'Career');
  assert.equal(await j.locator('#bioProjectionSummarySlot').isVisible(),true);
  await j.click('#bioTabs button[data-bio-view="trends"]');
  const rAvg=await j.locator('#bioComboChart [data-series="rolling-prior-career-average"]').count();
  assert.ok(rAvg>=1,'rolling prior-career baseline is visible');
  assert.equal(await j.$eval('#bioCareerComparisonLegend',e=>e.hidden),false);
  assert.match(await j.locator('#bioChartDetail').textContent(),/prior-career pace by 0\.49 P\/GP.*benchmark 1\.24 P\/GP/);
  const markG=j.locator('#bioComboChart [data-award-type="goalTitle"]');
  const markP=j.locator('#bioComboChart [data-award-type="pointsTitle"]');
  assert.equal(await markG.count(),1,'Justin recent8 G title only W2024/25');
  assert.equal(await markP.count(),2,'Justin recent8 points titles W2022/23 + W2023/24');
  assert.equal(await j.$eval('#bioAwardKey',el=>el.hidden),false);
  assert.equal(await j.locator('#bioTabs .bio-tab-count:visible').count(),0);
  await photo(j,'bio-v21-justin-compact-overview.png');
  await j.locator('#bioComboChart [data-award-season="Winter 2024/2025"][data-award-type="goalTitle"]').click();
  assert.match(await j.locator('#bioChartDetail').innerText(),/Rocket Richard/i);
  assert.match(await j.locator('#bioChartDetail').innerText(),/Winter 2024\/2025/);
  await photo(j,'bio-v21-justin-goals-award-detail.png');
  await j.locator('#bioComboChart [data-award-season="Winter 2023/2024"][data-award-type="pointsTitle"]').click();
  assert.match(await j.locator('#bioChartDetail').innerText(),/Art Ross/i);
  const before={bars:await j.locator('#bioComboChart rect').count(),titles:await j.locator('#bioComboChart [data-award-type]').count()};
  assert.ok((await j.locator('#bioComboChart [data-axis-tick="pts-per-game"]').allTextContents())
    .every(x=>/^\d+\.\d{2}$/.test(x)));
  await j.locator('#bioChartMethod summary').click();
  await j.click('#bioCareerComparisonModes button[data-mode="fixed"]');
  assert.equal(await j.locator('#bioComboChart [data-series="fixed-career-average"]').count(),1,
    'retrospective career benchmark is a horizontal fixed line');
  await j.click('#bioCareerComparisonModes button[data-mode="off"]');
  assert.equal(await j.locator('#bioComboChart [data-series="rolling-prior-career-average"],[data-series="fixed-career-average"]').count(),0,'career baseline off');
  assert.equal(await j.locator('#bioComboChart [data-series="selected-points-per-game"]').count(),1,'the selected P/GP line remains');
  await j.click('#bioCareerComparisonModes button[data-mode="rolling"]');
  assert.ok(await j.locator('#bioComboChart [data-series="rolling-prior-career-average"]').count()>0);

  for(const mode of ['winter','summer','actual']){
   await j.click('#bioRateModes button[data-mode="'+mode+'"]');
   const expected=({winter:'1.14',summer:'1.70',actual:'1.23'})[mode];
   assert.equal(await j.locator('#bioAdvancedGrid .bio-insight-value').first().textContent(),expected,
     'career pace must use the same comparison basis as the chart '+mode);
   assert.equal(await j.locator('#bioComboChart rect').count(),before.bars,'official bars unchanged '+mode);
   assert.equal(await j.locator('#bioComboChart [data-award-type]').count(),before.titles,'titles unchanged '+mode);
  }
  await j.locator('#bioMoreSeasonFilters summary').click();
  await j.click('#bioSeasonModes button[data-mode="summer"]');
  assert.equal(await j.$eval('#bioMoreSeasonFilters',el=>el.open),false);
  assert.match(await j.locator('#bioMoreSeasonFilters summary').textContent(),/Summer only/);
  await j.click('#bioSeasonModes button[data-mode="recent"]');
  assert.equal(await j.locator('#bioMoreSeasonFilters summary').textContent(),'More');
  await j.click('#bioTabs button[data-bio-view="production"]');
  assert.equal(await j.locator('#bioProjectionCards .bio-metric-icon:visible').count(),5);
  await j.locator('#bioProjectionFull summary').click();
  assert.equal(await j.locator('#bioProjectionCards .bio-metric:visible').count(),5);
  assert.equal(await j.locator('#bioProjectionCards .bio-metric').first().locator('.value').innerText(),
    '23','projected GP whole-number display without changing model precision');
  assert.equal(await j.locator('#bioProjectionCards .bio-metric').nth(4).locator('.value').innerText(),
    '1.06','projected P/GP exactly 2 decimals');
  assert.match(await j.locator('#bioProjectionHeadline').innerText(),/Full regular-season projection/);
  const projectionDetail=await j.locator('#bioProjectionTrendDetail').textContent();
  assert.match(projectionDetail,/Historical career regular-season scoring rate 1\.14 P\/GP/);
  assert.match(projectionDetail,/projected scoring-rate component 1\.11 P\/GP/);
  assert.match(projectionDetail,/distinct from the displayed full-season projected P\/GP/);
  await photo(j,'bio-v21-justin-projection-detail.png');
  await j.close();
  const mark=await open('354061');
  await mark.click('#bioTabs button[data-bio-view="trends"]');
  await mark.click('#bioSeasonModes button[data-mode="all"]');
  assert.equal(await mark.locator('#bioComboChart [data-award-season="Summer 2015"]').count(),2,'both gold RR and AR medals');
  await mark.locator('#bioComboChart [data-award-season="Summer 2015"][data-award-type="goalTitle"]').click();
  const text=await mark.locator('#bioChartDetail').textContent();
  assert.match(text,/Rocket Richard/i);assert.match(text,/Art Ross/i);
  assert.equal(await mark.locator('#bioComboChart [data-award-season="Summer 2016"][data-award-type="pointsTitle"]').count(),1);
  await mark.click('#bioTabs button[data-bio-view="production"]');
  assert.equal(await mark.$eval('#bioProjectionSection',e=>e.hidden),false,'Unmodelled player should receive an explicit held forecast');
  assert.equal(await mark.locator('#bioProjectionHold').isVisible(),true);
  assert.equal(await mark.locator('#bioProjectionCards .bio-metric').count(),0,'No manufactured projected totals');
  await photo(mark,'bio-v21-mark-double-title.png');
  await mark.close();
  const adam=await open('354054');
  assert.equal(await adam.locator('#bioComboChart [data-award-type]').count(),0);
  assert.equal(await adam.$eval('#bioAwardKey',el=>el.hidden),true);
  await adam.close();
  const projection=require('../widgets/projection.json');
  const slightlyMoreNegative=structuredClone(projection);
  slightlyMoreNegative.players.find(p=>p.name==='Carosi, Justin').trend=-.05;
  const dynamic=await open('354060',{'projection.json':slightlyMoreNegative});
  assert.equal(await dynamic.$eval('#bioProjectionTrend',e=>e.dataset.trendState),'Neutral');
  const dynamicAngle=Number(await dynamic.locator('#bioProjectionTrend [data-arrow-angle]')
    .getAttribute('data-arrow-angle'));
  assert.ok(dynamicAngle>arrowAngle,'a more negative percentage tilts further toward 180 degrees down');
  assert.ok(Math.abs(dynamicAngle-arrowAngle)>2,'angle is not a fixed category rotation');
  assert.equal(await dynamic.locator('#bioProjectionTrend').getAttribute('data-near-career-average'),'true',
    'a -5.0% change is in the inclusive neutral visual tolerance');
  await dynamic.close();
  const rookieData=structuredClone(projection);
  rookieData.players.find(p=>p.name==='Carosi, Justin').trendInputs.firstSeasonOrNoCareer=true;
  const rookie=await open('354060',{'projection.json':rookieData});
  assert.match(await rookie.locator('#bioProjectionTrend').innerText(),/Neutral.*Rookie Year/s);
  assert.equal(await rookie.locator('#bioProjectionTrend .bio-trend-direction-arrow').count(),1);
  assert.equal(await rookie.locator('#bioProjectionTrend [data-rookie-neutral]').getAttribute('fill'),'#f7fbff');
  assert.match(await rookie.locator('#bioProjectionTrend').innerText(),/Neutral.*Rookie Year/s);
  assert.equal(await rookie.locator('#bioProjectionTrend [data-z-score]').count(),0,'rookie visual has no invented z-score');
  assert.equal(await rookie.$eval('#bioProjectionTrend',e=>e.dataset.trendState),'ROOKIE');
  await rookie.close();
  const corrupt=structuredClone(projection);
  corrupt.players.find(p=>p.name==='Carosi, Justin').trend=null;
  const held=await open('354060',{'projection.json':corrupt});
  assert.equal(await held.$eval('#bioProjectionTrend',el=>el.dataset.trendState),'HELD');
  assert.equal(await held.locator('#bioProjectionTrend .bio-trend-arrow').count(),0);
  assert.equal(await held.locator('#bioProjectionCards .bio-metric').count(),5,'raw model metrics still preserved');
  await held.close();
  const sourceTitles=require('../widgets/player-bio-season-titles.json');
  const invalid=structuredClone(sourceTitles);invalid.sourceHashes.native=null;
  const bad=await open('354060',{'player-bio-season-titles.json':invalid});
  assert.equal(await bad.locator('#bioComboChart [data-award-type]').count(),0);
  assert.equal(await bad.locator('#bioComboChart rect').count(),before.bars,'raw chart preserved if award evidence missing');
  await bad.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',awards:'33 source verified titles',justin:{goalTitle:1,pointsTitle:2,trend:'Neutral -2.5%'},model:"same homepage thresholds",falseAwards:0,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(()=>server.close());
