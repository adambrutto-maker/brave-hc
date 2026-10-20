'use strict';
const fs=require('node:fs'),path=require('node:path'),puppeteer=require(process.env.BRAVE_PUPPETEER_MODULE || 'puppeteer');
const root=path.resolve(__dirname,'../widgets');
const urls={
  records:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records',
  awards:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=awards'
};
(async()=>{
 const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});
 try {
 for(const type of ['records','awards']){
  const p=await b.newPage();
  const response=await p.goto(urls[type],{waitUntil:'domcontentloaded',timeout:30000});
  if(response.status()!==200)throw Error(type+' returned HTTP '+response.status());
  const extracted=await p.evaluate(type=>{
   const clean=e=>(e?.textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
   const groups=[];
   if(type==='records'){
    for(const col of document.querySelectorAll('.pageModCol')){
     let section=col.querySelector('.modGroupAboveHeadingMain')?clean(col.querySelector('.modGroupAboveHeadingMain')):(col.id||'');
     let category='';
     for(const child of [...col.children]){
      if(child.classList.contains('modGroupAboveHeading')){
       if(child.classList.contains('modGroupAboveHeadingMain'))section=clean(child);
       else category=clean(child);
      }else if(child.classList.contains('modGroupWrapper')){
       let period='';
       for(const sub of [...child.children]){
        if(sub.classList.contains('modGroupSubHeading'))period=clean(sub);
        else if(sub.classList.contains('modGroupDetailsWrapper')){
         const items=[...sub.querySelectorAll(':scope > .modGroupItem')].map(clean).filter(Boolean);
         if(items.length)groups.push({section,category,period,items});
        }
       }
      }
     }
    }
   }else{
    for(const wrap of document.querySelectorAll('.modGroupWrapper')){
      const title=clean(wrap.querySelector(':scope > .modGroupHeading'))||clean(wrap.querySelector(':scope > .modGroupAboveHeading'));
      let period='';
      for(const child of [...wrap.children]){
       if(child.classList.contains('modGroupSubHeading'))period=clean(child);
       else if(child.classList.contains('modGroupDetailsWrapper')){
        const items=[...child.querySelectorAll(':scope > .modGroupItem')].map(clean).filter(Boolean);
        if(items.length)groups.push({section:'Brave H.C. Awards & Honors',category:title,period,items});
       }
      }
    }
   }
   const officialCount=document.querySelectorAll('.modGroupItem').length;
   return {pageTitle:document.title,groups,officialCount};
  },type);
  const count=extracted.groups.reduce((a,g)=>a+g.items.length,0);
  if(!count||count!==extracted.officialCount)throw Error(type+' lost entries '+count+'/'+extracted.officialCount);
  const data={
   schema:'brave-hc-hto-history-snapshot/v1',
   type,
   source:{name:'HomeTeamsONLINE / Brave H.C.',url:urls[type],authority:'OFFICIAL_HTO_PUBLIC_READBACK'},
   capturedAt:new Date().toISOString(),
   stalePolicy:'Fixed public snapshot. Official HTO page controls current records; snapshot updates are manually QA-gated.',
   pageTitle:extracted.pageTitle,entryCount:count,groups:extracted.groups
  };
  const file=path.join(root,'history-'+type+'.json');
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({type,groups:data.groups.length,entries:count,bytes:fs.statSync(file).size,source:data.source.url,sample:data.groups.slice(0,2).map(g=>({section:g.section,category:g.category,period:g.period,count:g.items.length}))}));
  await p.close();
 }
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
