'use strict';
const fs=require('node:fs'),path=require('node:path');
const puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE||'puppeteer');
const SOURCE='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=';
const targets=[{id:354054,name:'Adam Brutto',expected:16},{id:354060,name:'Justin Carosi',expected:25}];
function category(text){
 if(/SVHL Cup Champion/i.test(text))return 'championship';
 if(/(?:Game|Point) Club/i.test(text))return 'milestone';
 if(/Elected (?:Assistant )?Captain/i.test(text))return 'leadership';
 if(/All-Star Nomination/i.test(text))return 'recognition';
 return 'award';
}
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try{
 const records={};
 for(const t of targets){
  const p=await browser.newPage();const url=SOURCE+t.id;
  const res=await p.goto(url,{waitUntil:'domcontentloaded',timeout:24000});
  if(res.status()!==200)throw Error('HTO profile HTTP '+res.status());
  const result=await p.evaluate(()=>({
    name:document.title.replace(/\u00a0/g,' ').split(' - ')[0].trim(),
    items:[...document.querySelectorAll('#profileHighlights .modGroupItem > p')].map(x=>({
     text:x.textContent.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim(),
     emphasized:!!x.querySelector('strong,b')
    })).filter(x=>x.text)
  }));
  if(result.name!==t.name||result.items.length!==t.expected)throw Error(t.name+' HTO identity/count mismatch '+JSON.stringify({name:result.name,count:result.items.length}));
  const events=result.items.map((x,i)=>({
   id:'hto-legacy-'+t.id+'-'+String(i+1).padStart(2,'0'),
   category:category(x.text),
   sourceText:x.text,
   displayText:x.text.replace(/\bDecidation\b/gi,'Dedication'),
   sourceEmphasis:x.emphasized,
   sourceOrder:i,
   provenance:'EXISTING_NATIVE_HTO_HIGHLIGHTS',
   publication:'EXISTING_HTO_MANUAL_RECORD'
  }));
  records[String(t.id)]={name:t.name,profileUrl:url,items:events,originalCount:events.length,legacyStatus:'IMPORT_FROM_CURRENT_PUBLIC_HTO_NO_NEW_AWARD_APPROVAL'};
  console.log('LEGACY_CAPTURED',t.name,events.length,'cupEmphasis',events.filter(e=>e.sourceEmphasis).length);
  await p.close();
 }
 const out={
  schema:'brave-hc-player-highlights/v1',
  capturedAt:new Date().toISOString(),
  sourceAuthority:'NATIVE_HTO_HIGHLIGHTS_PUBLIC_READBACK',
  recordPolicy:'Keep original sourceText/order/emphasis exactly. displayText may correct known typo; never infer new awards, membership or milestone dates. Additional records require manager approval.',
  players:records
 };
 const target=path.resolve(__dirname,'../widgets/player-highlights-ledger.json');
 fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
 console.log('LEDGER',target,fs.statSync(target).size,'total',Object.values(records).reduce((s,x)=>s+x.items.length,0));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
