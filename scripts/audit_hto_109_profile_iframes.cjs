'use strict';
/* Read-only live public HTO profile embed parity, on demand (not as flaky PR CI).
 * No HTO editors, authentication or mutations. Moderate concurrency. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const names=require('../widgets/player-career-insights.json').players;
const script=fs.readFileSync(path.join(root,'widgets/player-links.js'),'utf8');
const scope={};vm.runInNewContext(script,scope);
const ids=Object.keys(names);
const capture=process.argv[2]||null;
function imageSources(html){
 const all=[];
 for(const m of html.matchAll(/<iframe\b[^>]*src="([^"]+)"/gi)){
  const src=m[1].replace(/&amp;/g,'&');
  if(/\/widgets\/player-(?:bio|highlights)\.html/.test(src))all.push(src);
 }
 return all;
}
async function check(id){
 const url='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID='+id;
 let last='';
 for(let attempt=0;attempt<2;attempt++){
   try{
    const resp=await fetch(url,{signal:AbortSignal.timeout(25000),redirect:'follow'});
    if(!resp.ok)throw Error('HTTP_'+resp.status);
    const html=await resp.text(),sources=imageSources(html);
    const bio=sources.filter(x=>x.includes('/widgets/player-bio.html'));
    const highlights=sources.filter(x=>x.includes('/widgets/player-highlights.html'));
    // HTO intentionally passes embed=1 for Bio but Highlights uses the plain
    // playerID-only URL. Both are valid, provided the source identity is exact.
    const right=(items,requireEmbed)=>items.length===1&&
      items[0].startsWith('https://adambrutto-maker.github.io/brave-hc/widgets/')&&
      new URL(items[0]).searchParams.get('playerID')===id&&
      (!requireEmbed||new URL(items[0]).searchParams.get('embed')==='1');
    const bioOk=right(bio,true),highlightsOk=right(highlights,false);
    return {id,name:names[id].name,url,publicHTTPStatus:resp.status,
      officialBioIframeValid:bioOk,officialHighlightsIframeValid:highlightsOk,
      bioCount:bio.length,highlightsCount:highlights.length,
      sourceStatus:bioOk&&highlightsOk?'LIVE_HTO_EMBEDS_MATCH':'LIVE_HTML_EMBED_IDENTITY_HOLD'};
   }catch(e){last=String(e?.message||e);await new Promise(r=>setTimeout(r,700));}
 }
 return {id,name:names[id].name,url,sourceStatus:'PUBLIC_HTO_READBACK_ERROR',error:last};
}
(async()=>{
 const started=new Date().toISOString(),results=Array(ids.length),limit=4;let next=0;
 const worker=async()=>{
   while(true){
     const index=next++;if(index>=ids.length)return;
     results[index]=await check(ids[index]);
     if((index+1)%15===0)console.log('LIVE_HTO_PROGRESS',index+1,'/',ids.length);
   }
 };
 await Promise.all(Array.from({length:limit},worker));
 const counts=results.reduce((a,r)=>(a[r.sourceStatus]=(a[r.sourceStatus]||0)+1,a),{});
 const holds=results.filter(x=>x.sourceStatus!=='LIVE_HTO_EMBEDS_MATCH');
 const payload={schema:'hockeyos-live-hto-profile-iframes-109/v1',started,ended:new Date().toISOString(),
  sourcePolicy:'READ_ONLY_ANONYMOUS_OFFICIAL_HTO_PROFILE_HTML',
  mainSource:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile',
  count:results.length,counts,holds,profiles:results};
 if(capture){fs.mkdirSync(path.dirname(capture),{recursive:true});fs.writeFileSync(capture,JSON.stringify(payload,null,2)+'\n');}
 console.log('LIVE_HTO_PROFILE_IFRAME_AUDIT',JSON.stringify({count:payload.count,counts,holds},null,2));
 if(holds.length)process.exitCode=2;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
