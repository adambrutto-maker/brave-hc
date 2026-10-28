(() => {
'use strict';
const ROOT='./';
const SOURCE={
 records:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records',
 awards:'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=awards'
};
const $=id=>document.getElementById(id);
const state={view:new URLSearchParams(location.search).get('view')==='awards'?'awards':'records',search:'',section:'',feeds:{},seasonEvidence:[]};
const node=(tag,text,cls)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);return el;
};
const number=x=>Number(x).toLocaleString('en-CA');
const normalize=x=>String(x??'').toLocaleLowerCase('en-CA').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const shortRecordDate=(entry)=>{
 // Presentation only: retain exact HTO source text and date precision.
 // A known YYYY-MM-DD becomes Sep 2, 2026, but year-only and season totals
 // stay unchanged. This applies to single-game and streak-span dates.
 const month={January:'Jan',February:'Feb',March:'Mar',April:'Apr',May:'May',June:'Jun',
   July:'Jul',August:'Aug',September:'Sep',October:'Oct',November:'Nov',December:'Dec'};
 const months=Object.values(month);
 const iso=/\b((?:19|20)\d{2}-\d{2}-\d{2})\b/g;
 const parsed=raw=>{
  const m=/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/.exec(raw);
  if(!m)return null;
  const y=Number(m[1]),mo=Number(m[2]),day=Number(m[3]);
  const d=new Date(Date.UTC(y,mo-1,day));
  if(!Number.isFinite(d.getTime())||d.getUTCFullYear()!==y||d.getUTCMonth()!==mo-1||d.getUTCDate()!==day)return null;
  return {year:y,month:months[mo-1],day};
 };
 const format=d=>d.month+' '+d.day+', '+d.year;
 let display=String(entry).replace(/\b((?:19|20)\d{2}-\d{2}-\d{2})\s+to\s+((?:19|20)\d{2}-\d{2}-\d{2})\b/g,
  (raw,a,b)=>{
   const start=parsed(a),end=parsed(b);
   if(!start||!end)return raw;
   return start.year===end.year
    ?start.month+' '+start.day+' - '+end.month+' '+end.day+', '+end.year
    :format(start)+' - '+format(end);
  });
 display=display.replace(iso,raw=>{const d=parsed(raw);return d?format(d):raw});
 return display.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*((?:19|20)\d{2})\b/g,
  (_,m,day,year)=>month[m]+' '+Number(day)+', '+year);
};
function validate(data,type) {
 if(!data||data.schema!=='brave-hc-hto-history-snapshot/v1'||data.type!==type
    ||data.source?.authority!=='OFFICIAL_HTO_PUBLIC_READBACK'
    ||data.source.url!==SOURCE[type]||!Array.isArray(data.groups)) throw Error('Snapshot source validation failed');
 const count=data.groups.reduce((s,g)=>{
  if(!g||typeof g.category!=='string'||!Array.isArray(g.items)
    ||g.items.some(item=>typeof item!=='string'||item.length>1000))throw Error('Invalid HTO record');
  return s+g.items.length;
 },0);
 if(count!==data.entryCount||count<1)throw Error('Snapshot entry-count mismatch');
 return data;
}
function sectionOf(group) {
 return state.view==='awards'?(group.category||'Other awards'):(group.section||'Other records');
}
function options(feed) {
 const select=$('historySection'),unique=[...new Set(feed.groups.map(sectionOf))].filter(Boolean);
 select.replaceChildren(new Option('All sections',''));
 for(const group of unique)select.append(new Option(group,group));
 if(!unique.includes(state.section))state.section='';
 select.value=state.section;
}
function updateTab() {
 for(const name of ['records','awards']){
  const tab=$(name+'Tab');
  tab.setAttribute('aria-selected',String(state.view===name));
  tab.tabIndex=state.view===name?0:-1;
 }
 $('official').href=SOURCE[state.view];
 $('official').textContent=state.view==='awards'?'official HTO Awards & Honors ↗':'official HTO Records & Achievements ↗';
}
// Summer-only deep links require the exact player+season pairing in HTO's
// public season statistics. Year-only Winter awards have ambiguous start/end
// years and intentionally remain career-profile links.
function confirmedSummerSeason(group, item) {
 if(!/\bsummer\b/i.test(group.category||''))return null;
 const years=[...String(item).matchAll(/\b(?:19|20)\d{2}\b/g)].map(m=>m[0]);
 const unique=[...new Set(years)];
 if(unique.length!==1)return null;
 const season='Summer_'+unique[0];
 const normalized=normalize(item);
 const people=state.seasonEvidence.filter(p=>{
  const term=normalize(p.name);
  const pos=normalized.indexOf(term);
  if(pos<0)return false;
  const bef=normalized[pos-1]||' ';
  const aft=normalized[pos+term.length]||' ';
  return !/[\p{L}\p{N}]/u.test(bef)&&!/[\p{L}\p{N}]/u.test(aft);
 });
 if(!people.length||people.some(p=>!p.seasons.includes(season)))return null;
 return season;
}
function render() {
 const feed=state.feeds[state.view];
 updateTab();
 const result=$('results');result.replaceChildren();
 if(!feed){$('status').textContent='No verified snapshot available for this view.';return}
 const find=normalize(state.search);
 let shown=0,groups=0;
 feed.groups.forEach((g,i)=>{
  if(state.section&&sectionOf(g)!==state.section)return;
  const matches=g.items.filter(item=>!find||normalize([g.section,g.category,g.period,item].join(' ')).includes(find));
  if(!matches.length)return;
  shown+=matches.length;groups++;
  const details=node('details',undefined,'history-group');
  details.open=!!find||i<3;
  const summary=node('summary');
  const label=state.view==='records'
   ?(g.category||g.section||'Record')+(g.period?' · '+g.period:'')
   :g.category||'Award';
  summary.append(node('span',label,'history-category'),node('small',g.section+(state.view==='records'?' · ':'')+matches.length+' entries'));
  details.append(summary);
  const list=node('ul');
  for(const item of matches){
   const li=node('li',state.view==='records'?shortRecordDate(item):item);
   const verified=confirmedSummerSeason(g,item);
   if(verified)li.dataset.htoSeason=verified;
   list.append(li);
  }
  details.append(list);
  result.append(details);
 });
 $('totalItems').textContent=number(feed.entryCount);
 $('totalGroups').textContent=number(feed.groups.length);
 $('visibleItems').textContent=number(shown);
 const t=new Date(feed.capturedAt);
 const date=Number.isNaN(t.getTime())?'date unavailable':
   t.toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'long',day:'numeric'});
 $('status').textContent='HTO public snapshot captured '+date+' · '+number(groups)+' groups and '+number(shown)+' matching entries. Not a live feed.';
 if(!shown)result.append(node('p','No historical entries match this filter. Try a different player, year or section.','history-empty'));
}
function switchView(view) {
 if(view===state.view)return;
 state.view=view;state.section='';state.search='';$('historySearch').value='';
 history.replaceState(null,'',location.pathname+'?view='+view);
 options(state.feeds[view]);render();
}
for(const view of ['records','awards']){
 $(view+'Tab').addEventListener('click',()=>switchView(view));
 $(view+'Tab').addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();const next=view==='records'?'awards':'records';switchView(next);$(next+'Tab').focus();
  }
 });
}
$('historySearch').addEventListener('input',e=>{state.search=e.target.value;render()});
$('historySection').addEventListener('change',e=>{state.section=e.target.value;render()});
(async()=>{
 try{
  const feeds=await Promise.all(['records','awards'].map(async type=>{
   const res=await fetch(ROOT+'history-'+type+'.json',{cache:'no-store'});
   if(!res.ok)throw Error(type+' snapshot HTTP '+res.status);
   return validate(await res.json(),type);
  }));
  [state.feeds.records,state.feeds.awards]=feeds;
  // Optional evidence: a failed/invalid seasonal file must not suppress the
  // authoritative history snapshot; links safely fall back to career profiles.
  try{
   const response=await fetch(ROOT+'history-player-seasons.json',{cache:'no-store'});
   if(!response.ok)throw Error('No season evidence');
   const evidence=await response.json();
   if(evidence.schema!=='brave-hc-hto-player-season-evidence/v1'
      ||evidence.authority!=='OFFICIAL_HTO_PUBLIC_STATS_READBACK'
      ||!Array.isArray(evidence.players)||evidence.players.length!==51
      ||evidence.players.some(p=>typeof p.name!=='string'||!Number.isInteger(p.playerID)
        ||!Array.isArray(p.seasons)||p.seasons.some(v=>!/^((Summer_20\d{2})|(Winter_20\d{2}\/20\d{2}))$/.test(v))))
      throw Error('Invalid player-season evidence');
   state.seasonEvidence=evidence.players.filter(p=>{
      const href=window.BravePlayerLinks?.profileUrl(p.name);
      if(!href)return false;
      try{return new URL(href).searchParams.get('playerID')===String(p.playerID)}
      catch{return false}
   });
  }catch(e){state.seasonEvidence=[];}
  options(state.feeds[state.view]);render();
 }catch(e){
  $('status').textContent='Historical snapshot unavailable or invalid. Please use the official HTO page.';
  $('results').replaceChildren(node('p','The display has been withheld because the source snapshot could not be verified.','history-empty'));
  console.error('HTO history snapshot withheld:',e);
 }
})();
})();
