/* HockeyOS Bio V2.8 reference video library.
 * Review-only public YouTube links: click-to-load, publisher attributed, no autoplay.
 * Never use for private film, personalized coaching, or unreconciled milestone clips.
 */
(async function(){
'use strict';
const host=document.getElementById('bioVideoPlaybook');
if(!host)return;
const $=id=>host.querySelector('#'+id);
const categoryArea=$('playbookFilters'),list=$('playbookList'),count=$('playbookCount');
let source=null,active='all',expanded=false,openVideo=null;
const allowedCategories=new Set(['all','featured','systems','skills','defence','goalie']);
const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(id);
const add=(tag,cls,txt)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(txt!==undefined)x.textContent=String(txt);
 return x;
};
function validate(json){
 if(json?.schema!=='brave-hc-coaching-reference-video-library/v1'||
    json.status!=='REVIEW_ONLY_NO_PRODUCTION_RELEASE'||
    !Array.isArray(json.videos)||!Array.isArray(json.categories))return false;
 const names=new Set(),ids=new Set();
 for(const v of json.videos){
  if(typeof v.id!=='string'||!idOK(v.youtubeId)||names.has(v.id)||ids.has(v.youtubeId)||
     !allowedCategories.has(v.category)||v.category==='all'||typeof v.title!=='string'||
     typeof v.publisher!=='string'||typeof v.focus!=='string'||typeof v.sourceStatus!=='string'){
    return false;
  }
  names.add(v.id);ids.add(v.youtubeId);
 }
 return json.categories.every(c=>allowedCategories.has(c.id)&&typeof c.label==='string');
}
function filterButton(entry){
 const b=add('button','',entry.label);b.type='button';
 b.setAttribute('aria-pressed',String(entry.id===active));
 b.addEventListener('click',()=>{active=entry.id;expanded=false;openVideo=null;render();});
 return b;
}
function videoCard(v){
 const card=add('article','playbook-card');
 const header=add('div','playbook-heading'),symbol=add('div','playbook-symbol',v.category==='featured'?'★':v.category==='defence'?'◆':'▶');
 symbol.setAttribute('aria-hidden','true');
 const details=add('div','');
 details.append(
   add('div','playbook-category',v.skill.toUpperCase()+(v.duration?' · '+v.duration:'')),
   add('strong','playbook-title',v.title),
   add('div','playbook-byline',v.publisher)
 );
 header.append(symbol,details);card.append(header);
 const controls=add('div','playbook-controls');
 const playing=openVideo===v.id;
 const button=add('button','playbook-watch',playing?'Close video':'▶ Watch lesson');
 button.type='button';button.setAttribute('aria-expanded',String(playing));
 button.setAttribute('aria-label',(playing?'Close ':'Watch ')+v.title);
 button.addEventListener('click',()=>{
   openVideo=playing?null:v.id;render();
   const next=list.querySelector('[data-video-id="'+v.id+'"] .playbook-watch');
   if(next)next.focus({preventScroll:true});
 });
 const link=add('a','playbook-youtube','YouTube ↗');
 link.href='https://www.youtube.com/watch?v='+encodeURIComponent(v.youtubeId);
 link.target='_blank';link.rel='noopener noreferrer';
 link.title='Watch '+v.title+' on YouTube';
 controls.append(button,link);card.append(controls);
 if(playing){
  const wrapper=add('div','playbook-player');
  const frame=document.createElement('iframe');
  frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(v.youtubeId)+'?rel=0';
  frame.title=v.title+' — YouTube video player';
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('allow','accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  frame.setAttribute('allowfullscreen','');
  wrapper.append(frame);card.append(wrapper);
 }
 card.append(add('p','playbook-description',v.focus));
 card.dataset.videoId=v.id;
 return card;
}
function render(){
 categoryArea.replaceChildren();list.replaceChildren();
 categoryArea.append(...source.categories.map(filterButton));
 count.textContent=source.videos.length+' LESSONS';
 const matches=source.videos.filter(v=>active==='all'||v.category===active);
 if(!matches.length){
  const label=active==='goalie'?'No reviewed goaltending videos in this section yet.':'No verified reference videos in this section yet.';
  list.append(add('div','playbook-empty',label));
  return;
 }
 const subset=active==='all'&&!expanded?matches.slice(0,3):matches;
 for(const v of subset)list.append(videoCard(v));
 if(active==='all'&&matches.length>3){
  const b=add('button','playbook-more',expanded?'Show fewer lessons':'Browse all '+matches.length+' lessons');
  b.type='button';
  b.setAttribute('aria-expanded',String(expanded));
  b.addEventListener('click',()=>{expanded=!expanded;openVideo=null;render();});
  list.append(b);
 }
}
try{
 const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),8000);
 let response;
 try{response=await fetch('./player-bio-coaching-library-v28-preview.json',{cache:'no-store',signal:timeout.signal})}
 finally{clearTimeout(timer)}
 if(!response.ok)throw Error('source unavailable');
 const json=await response.json();
 if(!validate(json))throw Error('invalid public reference manifest');
 source=json;render();
}catch(error){
 count.textContent='SOURCE HELD';
 list.replaceChildren(add('div','playbook-empty','Reference-video library unavailable. No unverified video links were substituted.'));
}
})();