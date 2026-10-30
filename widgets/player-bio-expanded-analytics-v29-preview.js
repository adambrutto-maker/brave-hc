/* HockeyOS additional source-qualified historical analysis.
   HTO actuals remain authoritative. Historical Summer/Winter equivalents are
   analytical only, never recalculated into official stats, Awards or Records. */
(async function(){
'use strict';
const panel=document.getElementById('bioExtendedAnalytics');if(!panel)return;
const grid=panel.querySelector('#bioExtendedMetrics'),status=panel.querySelector('#bioExtendedStatus');
let rankContext={id:null,role:null};
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
  badge.title='Qualified Brave H.C. '+rankContext.role+' career comparison · minimum '+ranking.minimumGP+' GP'+(ranking.tied>1?' · tied with '+(ranking.tied-1):'');
  badge.setAttribute('aria-label','Career rank '+ranking.rank+' of '+ranking.qualified+' qualified '+rankContext.role+'s');
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
 if(!number(events)||!number(gp)||gp<=0)return;
 const value=per(events,gp,100);
 if(!number(value))return;
 add(label,show(value,1)+'%',events+' '+code+' / '+gp+' recorded GP');
}
const fetchJSON=async file=>{const r=await fetch('./'+file,{cache:'no-store'});if(!r.ok)throw Error(file+' unavailable');return r.json()};
let sources;
try{
 const [career,formats,projection,attendance]=await Promise.all([
  fetchJSON('player-career-insights.json'),fetchJSON('league-game-formats.json'),fetchJSON('projection.json'),
  fetchJSON('player-bio-attendance-verified-v30-preview.json').catch(()=>null)]);
 if(career.schema!=='brave-hc-player-career-insights/v1'||
    formats.configurationStatus!=='REFERENCE_FORMATS_AND_18_MASTER_SCHEDULE_SEASON_BINDINGS_VERIFIED'||
    projection.schema!=='brave-hc-workbook-projection/v1')throw Error('Source metadata does not match');
 sources={career,formats,projection,attendance};
}catch{status.textContent='Advanced analytics held: verified HTO/format source unavailable.';return;}
function currentSeason(){
 const m=/^([WS])(20\d{2})\/(\d{2})$/.exec(sources.projection.season||'');
 if(!m)return null;
 return (m[1]==='W'?'Winter ':'Summer ')+m[2]+(m[1]==='W'?'/20'+m[3]:'');
}
function normalizedRate(season){
 if(!number(season.GP)||!number(season.Pts)||season.GP<=0)return null;
 const binding=sources.formats.seasonBindings?.[season.Season+'::ALL_HTO_GAME_TYPES'];
 if(binding?.verificationStatus!=='VERIFIED')return null;
 const format=sources.formats.formats?.[binding.formatId];
 if(format?.verificationStatus!=='VERIFIED'||!number(format.regulationGameMinutes))return null;
 return {season:season.Season,gp:season.GP,pointsWinter:season.Pts*32/format.regulationGameMinutes,pointsRaw:season.Pts};
}
function weightedRate(rows){const gp=rows.reduce((n,r)=>n+r.gp,0);return gp>0?rows.reduce((n,r)=>n+r.pointsWinter,0)/gp:null;}
function render(){
 const selected=document.getElementById('playerChoice')?.value||
  new URLSearchParams(location.search).get('playerID');
 const record=sources.career.players?.[selected];
 grid.replaceChildren();
 if(!record){status.textContent='No source-verified historical profile for this player.';return}
 const skater=record.segments?.find(s=>s.kind==='skater');
 const goalie=record.segments?.find(s=>s.kind==='goalie');
 rankContext={id:String(selected),role:skater?'skater':goalie?'goalie':null};
 const ranks=window.BraveBioRankEngine;
 const careerAttendance=rankContext.role?ranks?.rankAttendance(sources.attendance,selected,rankContext.role):null;
 const currentAttendance=rankContext.role?ranks?.seasonAttendance(sources.attendance,selected):null;
 if(currentAttendance?.status==='PROVISIONAL')
  add('Season roster-adjusted attendance',show(currentAttendance.percent,1)+'%',currentAttendance.gp+' / '+currentAttendance.eligible+' eligible games · provisional');
 else add('Season roster-adjusted attendance','—','Awaiting current source alignment');
 if(careerAttendance?.percent!=null){
  add('Career roster-adjusted attendance',show(careerAttendance.percent,1)+'%',careerAttendance.gp+' / '+careerAttendance.eligible+' eligible games',careerAttendance.status==='QUALIFIED'?careerAttendance:null);
 }else add('Career roster-adjusted attendance','—','Workbook source parity held');
 const sourceDate=(sources.career.capturedAt||'').slice(0,10);
 status.textContent='HTO archive '+sourceDate+' · career and current snapshots may differ.';
 if(skater){
  const t=skater.total||{},g=t.G,a=t.A,p=t.Pts,gp=t.GP;
  if(number(g)&&number(p)&&p>0)add('Goal share of points',show(per(g,p,100),1)+'%','Recorded G / PTS');
  if(number(a)&&number(p)&&p>0)add('Assist share of points',show(per(a,p,100),1)+'%','Recorded A / PTS');
  if(number(t.PPG)&&number(g)&&g>0)add('Power-play goal share',show(per(t.PPG,g,100),1)+'%','PPG is power-play goals');
  if(number(t.SHG)&&number(g)&&g>0)add('Short-handed goal share',show(per(t.SHG,g,100),1)+'%','SHG / all goals');
  eventPct('Game-winning goals / GP',t.GWG,gp,'GWG');
  eventPct('Game-tying goals / GP',t.GTG,gp,'GTG');
  eventPct('Player of Game / GP',t.POTG,gp,'POTG');
  if(number(t.PIM)&&number(gp)&&gp>0)add('Penalty minutes / GP',show(per(t.PIM,gp)),'Recorded PIM');
  if(number(t.HAT))add('Career hat tricks',String(t.HAT),'Recorded actual');
  const complete=(skater.seasons||[]).filter(s=>s.Season!==currentSeason()).map(normalizedRate).filter(Boolean);
  if(complete.length){
   add('Completed-career P/GP',show(weightedRate(complete)),'Winter-equivalent · '+complete.length+' seasons');
   const recent=complete.slice(-3),prior=complete.slice(-6,-3);
   if(recent.length===3)add('Last 3 season P/GP',show(weightedRate(recent)),'GP-weighted Winter equivalent');
   const r=weightedRate(recent),b=weightedRate(prior);
   if(number(r)&&number(b)&&b>0&&prior.length===3)add('Recent vs previous 3',((r/b-1)*100).toFixed(1)+'%','Same Winter-equivalent basis');
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
  if(number(t.W))add('Career wins',String(t.W),'HTO recorded');
  if(number(t.L))add('Career losses',String(t.L),'HTO recorded');
  if(number(t.T))add('Career ties',String(t.T),'HTO recorded');
  if(number(t.SHO))add('Career shutouts',String(t.SHO),'HTO recorded');
  if(number(t.GA)&&number(gp)&&gp>0)add('Recorded GA / appearance',show(per(t.GA,gp)),'Historical GA and actual GP');
  eventPct('Player of Game / GP',t.POTG,gp,'POTG');
  if(number(t.PIM)&&number(gp)&&gp>0)add('Penalty minutes / GP',show(per(t.PIM,gp)),'Recorded goalie PIM');
  status.textContent+=' · Save % and shots omitted: source reliability not established.';
 }
 if(!grid.children.length)status.textContent='Held: source does not verify any of these additional indicators.';
}
render();
document.getElementById('playerChoice')?.addEventListener('change',render);
const name=document.getElementById('playerName');
if(name){const obs=new MutationObserver(()=>render());obs.observe(name,{childList:true,characterData:true,subtree:true});}
})();