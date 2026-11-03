/* HockeyOS Bio V3.1 — current-season overview.
 * A public HTO actuals feed is shown independently from the workbook forecast.
 * No current goalie stats or player attendance inferred from incomplete sources.
 */
(async function(){
'use strict';
const host=document.getElementById('bioSeasonCurrent');
if(!host)return;
const grid=host.querySelector('#bioCurrentActuals'),status=host.querySelector('#bioCurrentStatus'),
 badge=host.querySelector('#bioCurrentBadge');
const eligible=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const date=x=>{const d=Date.parse(x||'');return Number.isFinite(d)?
 new Date(d).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'America/Toronto'}):'date unavailable';};
function card(label,value){
 const c=document.createElement('div');c.className='bio-outlook-stat';
 const l=document.createElement('span');l.className='bio-outlook-label';l.textContent=label;
 const v=document.createElement('strong');v.className='bio-outlook-value';v.textContent=String(value);
 c.append(v,l);grid.append(c);
}
let feed=null,career=null;
try{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
 let rs;try{rs=await Promise.all([
  fetch('./player-actuals-hourly.json',{cache:'no-store',signal:ctrl.signal}),
  fetch('./player-career-insights.json',{cache:'no-store',signal:ctrl.signal})
 ])}finally{clearTimeout(timer)}
 if(!rs.every(r=>r.ok))throw Error('missing source');
 [feed,career]=await Promise.all(rs.map(r=>r.json()));
 if(feed?.schema!=='brave-hc-hto-player-actuals/v1'||feed.status!=='VERIFIED_HTO_CURRENT'||
    !Array.isArray(feed.players)||!eligible(feed.teamGP)||feed.teamGP<=0||
    career?.schema!=='brave-hc-player-career-insights/v1')throw Error('source mismatch');
}catch{feed=null;career=null;}
function render(){
 const id=String(document.getElementById('playerChoice')?.value||new URLSearchParams(location.search).get('playerID')||'');
 grid.replaceChildren();
 badge.textContent='ACTUAL';badge.dataset.held='false';
 if(!feed||!career){status.textContent='Current HTO feed unavailable. No estimates substituted.';badge.textContent='SOURCE HELD';badge.dataset.held='true';return;}
 const profile=career.players?.[id];
 if(!profile||profile.status!=='VERIFIED_PROFILE_CAREER_SUM_PARITY'||window.BravePlayerLinks?.identityById(Number(id))?.name!==profile.name){
  status.textContent='Official player identity unavailable.';badge.textContent='SOURCE HELD';badge.dataset.held='true';return;
 }
 const isGoalie=profile.segments?.some(s=>s.kind==='goalie')&&!profile.segments?.some(s=>s.kind==='skater');
 if(isGoalie){
  status.textContent='Current goaltender totals held pending a reconciled HTO goalie source. Historical goalie analysis is under Career Trends.';
  badge.textContent='SOURCE HELD';badge.dataset.held='true';return;
 }
 const resolver=window.BravePlayerLinks?.profileUrl;
 if(typeof resolver!=='function'){status.textContent='Verified identity resolver unavailable.';badge.textContent='SOURCE HELD';badge.dataset.held='true';return;}
 const matches=feed.players.filter(x=>{
  const href=resolver(x.name);if(!href)return false;
  try{return new URL(href).searchParams.get('playerID')===id}catch{return false}
 });
 if(matches.length!==1){status.textContent='Current HTO skater source has no unique matching player observation.';badge.textContent='SOURCE HELD';badge.dataset.held='true';return;}
 const p=matches[0];
 if(![p.gp,p.g,p.a,p.pts].every(eligible)||p.gp>feed.teamGP||
    p.g+p.a!==p.pts||(!p.gp&&p.pts>0)){
  status.textContent='Current HTO skater totals failed source consistency checks.';badge.textContent='SOURCE HELD';badge.dataset.held='true';return;
 }
 card('GP',p.gp);card('G',p.g);card('A',p.a);card('PTS',p.pts);
 card('PTS/GP',p.gp?(p.pts/p.gp).toFixed(2):'—');
 status.textContent='Official HTO actuals · '+date(feed.asOf)+' · '+feed.teamGP+' team games recorded.';
}
render();
const sel=document.getElementById('playerChoice');
if(sel)sel.addEventListener('change',()=>setTimeout(render,0));
const content=document.getElementById('profileContent');
if(content){const observer=new MutationObserver(()=>{if(!content.hidden)render();});
 observer.observe(content,{attributes:true,attributeFilter:['hidden']});}
})();