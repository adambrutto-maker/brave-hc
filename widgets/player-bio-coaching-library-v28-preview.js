/* HockeyOS Bio public animated coaching resources.
   Public publisher web pages only; no unverified YouTube embeds, ID guessing,
   autoplay, video rehosting, or private game/player footage. */
(async function(){
'use strict';
const host=document.getElementById('bioVideoPlaybook');if(!host)return;
const $=id=>host.querySelector('#'+id);
const filters=$('playbookFilters'),list=$('playbookList'),count=$('playbookCount');
const approvedHosts=new Set(['hockeycoachvision.com','drillflow.ca','www.savard18.com','benchiq.hockey','tactical-board.com','weisstechhockey.com']);
const categories=new Set(['all','systems','skills','defence']);
const add=(tag,klass,text)=>{const e=document.createElement(tag);if(klass)e.className=klass;if(text!==undefined)e.textContent=String(text);return e;};
let data=null,active='all',expanded=false;
function validate(x){
 if(x?.schema!=='brave-hc-coaching-reference-library/v2'||
   x.status!=='REVIEW_ONLY_EXTERNAL_RESOURCE_PAGES'||!Array.isArray(x.resources)||
   !Array.isArray(x.categories)||x.categories.length>7)return false;
 const ids=new Set();
 for(const r of x.resources){
  if(ids.has(r.id)||!categories.has(r.category)||!r.id||typeof r.title!=='string'||
     typeof r.publisher!=='string'||typeof r.focus!=='string'||r.sourceStatus!=='PUBLISHER_PAGE_VERIFIED')return false;
  let u;try{u=new URL(r.url)}catch{return false}
  if(u.protocol!=='https:'||!approvedHosts.has(u.hostname)||u.username||u.password)return false;
  ids.add(r.id);
 }
 return x.categories.every(c=>categories.has(c.id)&&typeof c.label==='string');
}
function cardFor(item){
 const card=add('article','playbook-card');
 const row=add('div','playbook-heading'),icon=add('div','playbook-symbol',item.category==='defence'?'◆':'▶');
 icon.setAttribute('aria-hidden','true');
 const details=add('div','');
 details.append(add('div','playbook-category',item.kind.toUpperCase()),
   add('strong','playbook-title',item.title),
   add('div','playbook-byline',item.publisher));
 row.append(icon,details);card.append(row);
 const controls=add('div','playbook-controls');
 const link=add('a','playbook-watch','Open source lesson ↗');
 link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label','Open '+item.title+' at '+item.publisher);
 controls.append(link);card.append(controls);
 card.append(add('p','playbook-description',item.focus));return card;
}
function render(){
 filters.replaceChildren();list.replaceChildren();
 count.textContent=data.resources.length+' RESOURCES';
 for(const c of data.categories){const btn=add('button','',c.label);btn.type='button';
  btn.setAttribute('aria-pressed',String(c.id===active));
  btn.onclick=()=>{active=c.id;expanded=false;render();};filters.append(btn);}
 let rows=data.resources.filter(r=>active==='all'||r.category===active);
 if(!rows.length){list.append(add('div','playbook-empty','No reviewed resources in this category.'));return;}
 const needMore=active==='all'&&rows.length>3;
 if(needMore&&!expanded)rows=rows.slice(0,3);
 rows.forEach(r=>list.append(cardFor(r)));
 if(needMore){const btn=add('button','playbook-more',expanded?'Show fewer resources':'Browse all '+data.resources.length+' resources');
  btn.type='button';btn.setAttribute('aria-expanded',String(expanded));
  btn.onclick=()=>{expanded=!expanded;render();};list.append(btn);}
}
try{
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
 let response;try{response=await fetch('./player-bio-coaching-library-v28-preview.json',{cache:'no-store',signal:abort.signal});}finally{clearTimeout(timeout)}
 if(!response.ok)throw Error('unavailable');
 const source=await response.json();if(!validate(source))throw Error('invalid manifest');
 data=source;render();
}catch{
 count.textContent='SOURCE HELD';
 list.replaceChildren(add('div','playbook-empty','Coaching reference library unavailable; no unverified video substitute was displayed.'));
}
})();