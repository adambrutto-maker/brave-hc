(() => {
'use strict';
const root='./';
const $=id=>document.getElementById(id);
const text=(tag,value,cls)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 n.textContent=String(value??'');
 return n;
};
const shortDate=input=>{
 const t=new Date(input);
 return Number.isNaN(t.valueOf())?'unavailable':t.toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'});
};
const playerId=(()=>{
 const q=new URLSearchParams(location.search).get('playerID');
 if(!q||!/^[1-9]\d{0,11}$/.test(q))return null;
 const n=Number(q);
 return Number.isSafeInteger(n)?n:null;
})();
const identity=playerId?window.BravePlayerLinks?.identityById(playerId):null;
const officialUrl=identity?window.BravePlayerLinks.profileUrl(identity.name):null;
$('playerName').textContent=identity?.name||'Player Highlights';
$('playerSub').textContent=identity?'Career highlights · Personal highs · Club record book':
 playerId?'Player #'+playerId+' \u00b7 identity onboarding pending':'Add the official HTO playerID to the widget URL';
const warnings=[];
const categoryLabel={
 championship:'Championship',milestone:'Career milestone',
 leadership:'Team leadership',award:'Individual award',recognition:'Recognition',discipline:'Disciplinary record',record:'Historical record'
};
// ASCII badges avoid encoding damage when content passes through HTO editors.
const symbol={
 championship:'CUP',milestone:'CLUB',leadership:'CAP',award:'AWD',recognition:'STAR',discipline:'NOTE',record:'NOTE'
};
function setNotice(s){
 $('notice').textContent=s;
}
function publicProfileLink(){
 if(!officialUrl)return null;
 const a=document.createElement('a');
 a.href=officialUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Official HTO player profile \u2197';
 return a;
}
function statistic(label,value) {
 const el=text('div','', 'ph-stat');
 el.append(text('div',value,'ph-number'),text('div',label,'ph-label'));
 return el;
}
function validLedger(data){
 if(data?.schema!=='brave-hc-player-highlights/v1'||
    data.sourceAuthority!=='NATIVE_HTO_HIGHLIGHTS_PUBLIC_READBACK'||
    !data.players||typeof data.players!=='object')throw Error('Legacy ledger source invalid');
 for(const [key,p] of Object.entries(data.players)){
  if(!/^[1-9]\d+$/.test(key)||!p||!Array.isArray(p.items)||
     !Number.isInteger(p.originalCount)||p.originalCount!==p.items.length)throw Error('Invalid ledger record');
  for(const item of p.items)if(typeof item.sourceText!=='string'||typeof item.displayText!=='string'||
    item.sourceText.length>300||item.displayText.length>300||
    !Object.hasOwn(categoryLabel,item.category)||
    item.provenance!=='EXISTING_NATIVE_HTO_HIGHLIGHTS'||
    item.publication!=='EXISTING_HTO_MANUAL_RECORD')throw Error('Unapproved highlight state');
  for(const item of p.items){
   if(item.sourceRuns!==undefined&&(!Array.isArray(item.sourceRuns)||!item.sourceRuns.length||
      item.sourceRuns.some(r=>typeof r.text!=='string'||typeof r.strong!=='boolean'||typeof r.italic!=='boolean')||
      item.sourceRuns.map(r=>r.text).join('')!==item.displayText))throw Error('Invalid source formatting');
   if(item.summaryCounts!==undefined&&['championship','award','milestone'].some(k=>
      !Number.isInteger(item.summaryCounts[k])||item.summaryCounts[k]<0||item.summaryCounts[k]>10))throw Error('Invalid source summary');
  }
 }
 return data;
}
function renderLegacy(record,ledgerTime){
 const container=$('legacy'),items=record?.items||[];
 container.replaceChildren();
 $('careerSummary').replaceChildren();
 $('expand').hidden=true;
 $('legacySection').hidden=!items.length;
 if(!items.length){$('careerSummary').hidden=true;return;}
 const counts={
  championship:items.reduce((n,x)=>n+(x.summaryCounts?.championship??(x.category==='championship'?1:0)),0),
  award:items.reduce((n,x)=>n+(x.summaryCounts?.award??(x.category==='award'||x.category==='record'&&x.includesAward===true?1:0)),0),
  milestone:items.reduce((n,x)=>n+(x.summaryCounts?.milestone??(x.category==='milestone'?1:0)),0)
 };
 $('careerSummary').hidden=true;
 $('careerSummary').append(statistic('SVHL Cup titles',counts.championship),
   statistic('Recorded awards',counts.award),statistic('Club milestones',counts.milestone));
 const first=Math.min(3,items.length);
 const display=expanded=>{
  container.replaceChildren();
  for(const item of expanded?items:items.slice(0,first)){
   const row=text('article','','ph-event'+(item.sourceEmphasis?' ph-champion':''));
   const icon=text('span',symbol[item.category]||'AWD','ph-symbol');
   icon.setAttribute('aria-hidden','true');
   const info=text('div','');
   const raw=item.displayText;
   // Rendering is text-only: source labels are never evaluated as HTML.
   if(item.sourceRuns){
    const sourceTitle=text('div','','ph-event-title');
    sourceTitle.style.whiteSpace='pre-line';
    sourceTitle.style.fontWeight='400';
    for(const run of item.sourceRuns){
     const span=text('span',run.text);
     span.style.fontWeight=run.strong?'800':'400';
     span.style.fontStyle=run.italic?'italic':'normal';
     span.style.color=run.strong?'#f5d18d':'#f3f7fc';
     sourceTitle.append(span);
    }
    info.append(sourceTitle,text('div',categoryLabel[item.category],'ph-event-meta'));
   }else{
   const parts=item.preserveLines?[raw]:raw.split(' - ');
   const title=parts.length>1?parts.slice(0,-1).join(' - '):raw;
   const time=parts.length>1?parts[parts.length-1]:'';
   const titleNode=text('div',title,'ph-event-title');
   if(item.preserveLines)titleNode.style.whiteSpace='pre-line';
   info.append(titleNode);
   info.append(text('div',[categoryLabel[item.category],time].filter(Boolean).join(' \u00b7 '),'ph-event-meta'));
   }
   row.append(icon,info);container.append(row);
  }
  const button=$('expand');
  button.hidden=items.length<=first;
  button.textContent=expanded?'Show fewer highlights':'Show all '+items.length+' highlights';
  button.onclick=()=>display(!expanded);
 };
 display(false);

}
const isFiniteNonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function validParticipant(data){
 if(data?.schema!=='brave-hc-awards-participants/v1'||!Array.isArray(data.players)||
    !/^W20\d{2}\/\d{2}$/.test(data.season)||
    data.status!=='UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES'||
    !data.sourceReference?.htoReadback)return false;
 return true;
}

function detailStat(label,value,detail){
 const card=statistic(label,value);
 if(detail)card.append(text('div',detail,'ph-detail'));
 return card;
}
function renderCareer(data){
 if(data?.schema!=='brave-hc-player-career-insights/v1'||data.sourceAuthority!=='NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK')return null;
 const p=data.players?.[String(playerId)];
 if(p?.name!==identity.name||p.status!=='VERIFIED_PROFILE_CAREER_SUM_PARITY')return null;
 const segments=p.segments||[];
 const cards=[];
 for(const segment of segments)for(const high of segment.highs||[]){
  if(!isFiniteNonnegative(high.value)||!Array.isArray(high.seasons))continue;
  cards.push(detailStat(high.label,high.metric==='GAA'?high.value.toFixed(2):high.value,
    high.seasons.join(' · ')));
 }
 if(cards.length){
  $('highsSection').hidden=false;
  $('highs').replaceChildren(...cards);
  $('careerDate').textContent='Career snapshot: '+shortDate(p.capturedAt)+' · ';
 }
 return p;
}
function renderRecords(data){
 if(data?.schema!=='brave-hc-player-record-book/v1'||data.sourceAuthority!=='NATIVE_HTO_RECORDS_PUBLIC_READBACK')return;
 const p=data.players?.[String(playerId)];
 if(p?.name!==identity.name||!p.entries?.length)return;
 $('recordsSection').hidden=false;
 const details=document.createElement('details');
 details.append(text('summary','View '+p.entries.length+' published entries'));
 const list=text('div','','ph-ledger');
 for(const e of p.entries){
  if(typeof e.category!=='string'||typeof e.scope!=='string'||typeof e.sourceText!=='string')continue;
  const row=text('article','','ph-record');
  row.append(text('div',e.category+' · '+e.scope,'ph-event-title'),
    text('div',e.sourceText,'ph-event-meta'));
  list.append(row);
 }
 details.append(list);
 $('records').replaceChildren(details);
 const a=text('a','Full HTO record book ↗');
 a.href='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records';
 a.target='_blank';a.rel='noopener noreferrer';
 $('recordsSource').replaceChildren(document.createTextNode('Published historical entries · '+shortDate(data.capturedAt)+' · '),a);
}
function renderCurrent(feed,career) {
 if(!validParticipant(feed))return;
 const expected=identity.name.split(' ').slice(1).join(' ')+', '+identity.name.split(' ')[0];
 const candidate=feed.players.find(x=>String(x.name||'').localeCompare(expected,'en-CA',{sensitivity:'base'})===0);
 if(!candidate||candidate.currentHTORaw?.sourceKind!=='OFFICIAL_HTO_PUBLISHED_SEASON_STATISTICS'||candidate.currentHTORaw.season!==feed.season)return;
 const obs=candidate.officialHTOStats,gp=obs?.gp;
 if(!Number.isInteger(gp)||gp<=0)return;
 const stats=[],segment=career?.segments?.find(s=>s.kind===(candidate.position==='Goalie'?'goalie':'skater'));
 const currentSeason='Winter '+feed.season.slice(1,5)+'/20'+feed.season.slice(-2);
 const current=segment?.seasons?.find(s=>s.Season===currentSeason);
 const sameSnapshot=current?.GP===gp&&(candidate.position==='Goalie'?current.GA===obs.goalsAgainst:
   current.G===obs.goals&&current.A===obs.assists&&current.Pts===obs.points);
 const prior=sameSnapshot?(segment?.seasons?.filter(s=>s.Season!==currentSeason)||[]):[];
 const priorGP=prior.reduce((n,s)=>n+(s.GP||0),0);
 if(candidate.position==='Goalie'){
  const ga=obs.goalsAgainst;
  if(!isFiniteNonnegative(ga))return;
  const priorGA=prior.reduce((n,s)=>n+(s.GA||0),0);
  stats.push(detailStat('Current GAA',isFiniteNonnegative(obs.gaa)?obs.gaa.toFixed(2):(ga/gp).toFixed(2),
    priorGP?'Prior career: '+(priorGA/priorGP).toFixed(2)+' GAA':gp+' appearances'));
  if(Number.isInteger(feed.officialTeamGames)&&feed.officialTeamGames>=gp)
   stats.push(detailStat('Share of team games',Math.round(gp/feed.officialTeamGames*100)+'%',gp+' of '+feed.officialTeamGames+' games'));
 }else{
  if(![obs.goals,obs.assists,obs.points].every(isFiniteNonnegative)||obs.goals+obs.assists!==obs.points)return;
  const pace=obs.points/gp;
  const priorPoints=prior.reduce((n,s)=>n+(s.Pts||0),0);
  stats.push(detailStat('Points per game',pace.toFixed(2),priorGP?'Prior career: '+(priorPoints/priorGP).toFixed(2)+' P/GP':gp+' appearances'));
  const teamGoals=feed.verifiedSourceReadback?.team?.goals;
  if(isFiniteNonnegative(teamGoals)&&teamGoals>0&&obs.goals<=teamGoals)
   stats.push(detailStat('Share of team goals',Math.round(obs.goals/teamGoals*100)+'%',obs.goals+' of '+teamGoals+' goals'));
  const pattern=candidate.sourceHTOGamePattern;
  const counts=pattern?.observedCounts;
  if(pattern?.status==='HTO_PER_GAME_OBSERVATIONS_CROSSCHECKED_TO_CURRENT_SEASON'&&pattern.season===feed.season&&counts?.gamesPlayed===gp&&Number.isInteger(counts.pointScoringGames)&&counts.pointScoringGames>=0&&counts.pointScoringGames<=gp)
   stats.push(detailStat('Games with a point',counts.pointScoringGames+'/'+gp,Math.round(counts.pointScoringGames/gp*100)+'% of appearances'));
 }
 if(!stats.length)return;
 $('currentSection').hidden=false;
 $('form').replaceChildren(...stats);
 $('statsDate').textContent='Stats snapshot: '+shortDate(feed.sourceReference.htoReadback)+' · '+feed.season;
}
(async()=>{
 if(!identity){setNotice('Player identity requires verification.');return;}
 const resources=[
 ['player-highlights-ledger.json',validLedger],
 ['awards-participants.json',x=>x],
 ['player-career-insights.json',x=>x],
 ['player-record-book.json',x=>x]
 ];
 const results=await Promise.allSettled(resources.map(([file,validate])=>fetch(root+file,{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw Error(file+' HTTP '+r.status);return validate(await r.json());
 })));
 const [legacyResult,feedResult,careerResult,recordsResult]=results;
 let career=null;
 if(careerResult.status==='fulfilled')career=renderCareer(careerResult.value);
 if(recordsResult.status==='fulfilled')renderRecords(recordsResult.value);
 if(legacyResult.status==='fulfilled'){
  const ledger=legacyResult.value,record=ledger.players[String(playerId)];
  if(record&&(record.name!==identity.name||!record.profileUrl.endsWith('playerID='+playerId)))warnings.push('Career highlights unavailable');
  else renderLegacy(record,ledger.capturedAt);
 }else warnings.push('Career highlights unavailable');
 if(feedResult.status==='fulfilled')renderCurrent(feedResult.value,career);
 const source=publicProfileLink();
 if(source){source.textContent='Full HTO profile ↗';$('profileSource').append(source);}
 $('notice').hidden=!warnings.length;
 setNotice(warnings.join(' · '));
})();
})();
