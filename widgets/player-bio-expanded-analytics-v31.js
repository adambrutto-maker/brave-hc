/* HockeyOS additional source-qualified historical analysis.
   HTO actuals remain authoritative. Historical Summer/Winter equivalents are
   analytical only, never recalculated into official stats, Awards or Records. */
(async function(){
'use strict';
const panel=document.getElementById('bioExtendedAnalytics');if(!panel)return;
const grid=panel.querySelector('#bioExtendedMetrics'),status=panel.querySelector('#bioExtendedStatus');
const shareGrid=document.getElementById('bioHistoricalShareGrid');
const shareSource=document.getElementById('bioShareSource');
const showMore=document.getElementById('bioSharesMore');
const attendanceHold=document.getElementById('bioAttendanceHold');
let rankContext={id:null,role:null},shareExpanded=false,shareSelection='',shareResult=null;
const formatCount=n=>Number(n).toLocaleString('en-CA',{maximumFractionDigits:0});
const formatShare=p=>p>0&&p<.1?p.toFixed(2)+'%':p.toFixed(1)+'%';
const put=(tag,klass,content)=>{
 const node=document.createElement(tag);if(klass)node.className=klass;
 if(content!==undefined)node.textContent=String(content);return node;
};
function drawShares(){
 if(!shareGrid||!showMore)return;
 shareGrid.replaceChildren();
 if(shareResult?.status!=='SOURCE_CALCULATED')return;
 const all=shareResult.metrics;
 const take=shareExpanded?all:shareResult.primary;
 for(const metric of take){
  const card=put('article','bio-v33-card has-rank');
  card.dataset.metric=metric.metric;
  card.append(
   put('strong','bio-v33-value',formatShare(metric.sharePct)),
   put('span','bio-v33-name',metric.label),
   put('small','bio-v33-basis',formatCount(metric.value)+' / '+formatCount(metric.publishedTotal)+' published '+metric.noun)
  );
  const badge=put('span','bio-v33-rank','#'+metric.rank+'/'+metric.qualified);
  badge.title='All-time recorded total rank, no GP cutoff. '+metric.qualified+
    ' people have a published numeric '+metric.noun+' total; '+
    metric.allHistoricalProfiles+' historical HTO identities checked. Missing data not counted as zero.'+
    (metric.tied>1?' Tied with '+(metric.tied-1)+'.':'');
  badge.setAttribute('aria-label',metric.label+' all-time rank '+metric.rank+
    ' among '+metric.qualified+' profiles with published totals');
  card.append(badge);
  shareGrid.append(card);
 }
 const more=shareResult.additional.length>0;
 showMore.hidden=!more;
 showMore.setAttribute('aria-expanded',String(shareExpanded));
 showMore.textContent=shareExpanded?'Show key categories':'View all '+all.length+' categories';
}
if(showMore)showMore.addEventListener('click',()=>{
 shareExpanded=!shareExpanded;drawShares();
});
const add=(label,value,basis,explicitRanking=null)=>{
 const card=document.createElement('article');card.className='bio-extended-stat';
 for(const [tag,text,cls] of [['strong',value,'bio-extended-value'],['span',label,'bio-extended-label'],['small',basis,'bio-extended-basis']]){
  const el=document.createElement(tag);el.className=cls;el.textContent=String(text);card.append(el);
 }
 const ranking=explicitRanking||window.BraveBioRankEngine?.rankMetric(sources?.career,rankContext.id,rankContext.role,label);
 if(ranking?.status==='QUALIFIED'){
  card.classList.add('has-rank');
  const badge=document.createElement('span');badge.className='bio-extended-rank';
  badge.textContent='#'+ranking.rank+'/'+ranking.qualified;
  const extraMinimum=ranking.minimumDenominator&&ranking.denominatorMetric!=='GP'?
   ' · at least '+ranking.minimumDenominator+' '+ranking.denominatorMetric:'';
  badge.title='Verified Brave H.C. '+rankContext.role+' ranking · '+ranking.minimumGP+'+ career GP'+extraMinimum+
    ' · '+ranking.qualified+' players qualified'+(ranking.tied>1?' · tied with '+(ranking.tied-1):'');
  badge.setAttribute('aria-label','Career rank '+ranking.rank+' of '+ranking.qualified+' qualified '+rankContext.role+'s, minimum '+ranking.minimumGP+' games played');
  card.append(badge);
 }
 grid.append(card);
};
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const show=(value,digits=2)=>number(value)?value.toFixed(digits):'—';
const per=(n,d,k=1)=>number(n)&&number(d)&&d>0?n*k/d:null;
function eventPct(label,events,gp,code){
 // One decimal place and raw counts make small-sample event frequency legible.
 // Missing GP or source events are held rather than represented as zero.
 if(!number(events)||!number(gp)||gp<=0||events>gp)return;
 const value=per(events,gp,100);
 if(!number(value))return;
 add(label,show(value,1)+'%',events+' '+code+' / '+gp+' recorded GP');
}
const fetchJSON=async file=>{const r=await fetch('./'+file,{cache:'no-store'});if(!r.ok)throw Error(file+' unavailable');return r.json()};
let sources;
try{
 // All-time HTO shares depend on the verified HTO archive, NOT on the workbook
 // model or unrelated historical game-duration config. Optional sources only
 // unlock their respective technical comparison or attendance data.
 const [career,formats,projection,attendance]=await Promise.all([
  fetchJSON('player-career-insights.json'),
  fetchJSON('league-game-formats.json').catch(()=>null),
  fetchJSON('projection.json').catch(()=>null),
  fetchJSON('player-bio-attendance-verified-v31.json').catch(()=>null)]);
 if(career?.schema!=='brave-hc-player-career-insights/v1'||
    career.sourceAuthority!=='NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK')throw Error('Career source invalid');
 sources={career,
  formats:formats?.configurationStatus==='REFERENCE_FORMATS_AND_18_MASTER_SCHEDULE_SEASON_BINDINGS_VERIFIED'?formats:null,
  projection:projection?.schema==='brave-hc-workbook-projection/v1'?projection:null,
  attendance};
}catch{
 status.hidden=false;
 status.textContent='Advanced stats held: verified HTO career archive unavailable.';
 if(shareSource)shareSource.textContent='All-time contributions held: verified HTO archive unavailable.';
 if(attendanceHold){attendanceHold.hidden=false;attendanceHold.textContent='Roster-adjusted attendance · Source pending approval';}
 return;
}
function currentSeason(){
 const m=/^([WS])(20\d{2})\/(\d{2})$/.exec(sources.projection?.season||'');
 if(!m)return null;
 return (m[1]==='W'?'Winter ':'Summer ')+m[2]+(m[1]==='W'?'/20'+m[3]:'');
}
function normalizedRate(season){
 if(!number(season.GP)||!number(season.Pts)||season.GP<=0)return null;
 const binding=sources.formats?.seasonBindings?.[season.Season+'::ALL_HTO_GAME_TYPES'];
 if(binding?.verificationStatus!=='VERIFIED')return null;
 const format=sources.formats?.formats?.[binding.formatId];
 if(format?.verificationStatus!=='VERIFIED'||!number(format.regulationGameMinutes))return null;
 return {season:season.Season,gp:season.GP,pointsWinter:season.Pts*32/format.regulationGameMinutes,pointsRaw:season.Pts};
}
function weightedRate(rows){const gp=rows.reduce((n,r)=>n+r.gp,0);return gp>0?rows.reduce((n,r)=>n+r.pointsWinter,0)/gp:null;}
function render(){
 const selected=document.getElementById('playerChoice')?.value||
  new URLSearchParams(location.search).get('playerID');
 const record=sources.career.players?.[selected];
 grid.replaceChildren();
 if(shareGrid)shareGrid.replaceChildren();
 if(attendanceHold)attendanceHold.hidden=true;
 if(String(selected)!==shareSelection){
  shareSelection=String(selected);shareExpanded=false;
 }
 if(!record){status.textContent='No source-verified historical profile for this player.';return}
 const skater=record.segments?.find(s=>s.kind==='skater');
 const goalie=record.segments?.find(s=>s.kind==='goalie');
 rankContext={id:String(selected),role:skater?'skater':goalie?'goalie':null};
 const historical=window.BraveBioAllTimeShares;
 shareResult=rankContext.role?historical?.analyzePlayer(sources.career,String(selected),rankContext.role):null;
 if(shareResult?.status==='SOURCE_CALCULATED'){
  drawShares();
  if(shareSource)shareSource.textContent=
   formatCount(shareResult.archiveSize)+' HTO profiles checked · '+
   new Date(shareResult.sourceAsOf).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'America/Toronto'})+
   ' · reported totals only.';
 }else{
  if(showMore)showMore.hidden=true;
  if(shareSource)shareSource.textContent='All-time contributions held: a verified HTO history source is unavailable.';
 }
 const ranks=window.BraveBioRankEngine;
 const careerAttendance=rankContext.role?ranks?.rankAttendance(sources.attendance,selected,rankContext.role):null;
 const currentAttendance=rankContext.role?ranks?.seasonAttendance(sources.attendance,selected):null;
 // One source-hold note replaces two duplicated "—" tiles. Never publish
 // attendance without separately approved, roster-status-aligned source evidence.
 if(currentAttendance?.status==='PROVISIONAL')
  add('Season roster-adjusted attendance',show(currentAttendance.percent,1)+'%',currentAttendance.gp+' / '+currentAttendance.eligible+' eligible games · provisional');
 if(careerAttendance?.percent!=null)
  add('Career roster-adjusted attendance',show(careerAttendance.percent,1)+'%',careerAttendance.gp+' / '+careerAttendance.eligible+' eligible games',careerAttendance.status==='QUALIFIED'?careerAttendance:null);
 if(attendanceHold){
  attendanceHold.hidden=currentAttendance?.status==='PROVISIONAL'&&careerAttendance?.percent!=null;
  attendanceHold.textContent='Roster-adjusted attendance · Source pending approval';
 }
 // Historical snapshot date already appears above with the all-time share cards.
 // Do not repeat source disclaimers below every statistical section.
 status.textContent='';status.hidden=true;
 if(skater){
  const t=skater.total||{},gp=t.GP;
  eventPct('Game-winning goals / GP',t.GWG,gp,'GWG');
  eventPct('Game-tying goals / GP',t.GTG,gp,'GTG');
  eventPct('Player of Game / GP',t.POTG,gp,'POTG');
  if(number(t.PIM)&&number(gp)&&gp>0)add('Penalty minutes / GP',show(per(t.PIM,gp)),'Recorded PIM');
  const active=currentSeason();
  const complete=active?(skater.seasons||[]).filter(s=>s.Season!==active).map(normalizedRate).filter(Boolean):[];
  if(complete.length){
   const qualified=complete.filter(s=>s.gp>=5),mean=weightedRate(qualified);
   if(qualified.length>=4&&number(mean)){
    const variance=qualified.reduce((n,s)=>n+s.gp*(s.pointsWinter/s.gp-mean)**2,0)/qualified.reduce((n,s)=>n+s.gp,0);
    add('Season scoring variation',show(Math.sqrt(variance)),'GP-weighted SD · seasons with ≥5 GP');
   }
   if(qualified.length){const best=qualified.reduce((a,b)=>a.pointsWinter/a.gp>=b.pointsWinter/b.gp?a:b);
    add('Best qualifying season',show(best.pointsWinter/best.gp),'Winter eq. · '+best.season);
   }
  }
 }else if(goalie){
  const t=goalie.total||{},gp=t.GP;
  if(number(t.GA)&&number(gp)&&gp>0)add('Recorded GA / appearance',show(per(t.GA,gp)),'Historical GA and actual GP');
  eventPct('Shutouts / GP',t.SHO,gp,'SHO');
  eventPct('Player of Game / GP',t.POTG,gp,'POTG');
  if(number(t.PIM)&&number(gp)&&gp>0)add('Penalty minutes / GP',show(per(t.PIM,gp)),'Recorded goalie PIM');
  status.hidden=false;
  status.textContent='Shots and save % held: source unverified.';
 }
 if(!grid.children.length){status.hidden=false;status.textContent='Rates held: no verified career metric.';}
}
render();
document.getElementById('playerChoice')?.addEventListener('change',render);
const name=document.getElementById('playerName');
if(name){const obs=new MutationObserver(()=>render());obs.observe(name,{childList:true,characterData:true,subtree:true});}
})();