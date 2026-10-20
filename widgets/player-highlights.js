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
$('playerSub').textContent=identity?'HTO player #'+playerId+' \u00b7 Career archive and source-verified game form':
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
 if(!items.length){
   container.append(text('p',
    'No approved career highlights are on file for this player yet. New profiles use the same widget and receive achievements only after a recorded, approved update.',
    'ph-empty'));
   $('careerSummary').hidden=true;
   return;
 }
 const counts={
  championship:items.reduce((n,x)=>n+(x.summaryCounts?.championship??(x.category==='championship'?1:0)),0),
  award:items.reduce((n,x)=>n+(x.summaryCounts?.award??(x.category==='award'||x.category==='record'&&x.includesAward===true?1:0)),0),
  milestone:items.reduce((n,x)=>n+(x.summaryCounts?.milestone??(x.category==='milestone'?1:0)),0)
 };
 $('careerSummary').hidden=false;
 $('careerSummary').append(statistic('SVHL Cup titles',counts.championship),
   statistic('Recorded awards',counts.award),statistic('Club milestones',counts.milestone));
 const first=items.length>7?7:items.length;
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
   if(item.displayText!==item.sourceText){
    const note=text('div','Displayed spelling standardized; original HTO text retained in archive.','ph-event-source');
    note.title=item.sourceText;
    info.append(note);
   }
   row.append(icon,info);container.append(row);
  }
  const button=$('expand');
  button.hidden=items.length<=first;
  button.textContent=expanded?'Show fewer highlights':'Show all '+items.length+' highlights';
  button.onclick=()=>display(!expanded);
 };
 display(false);
 const source=publicProfileLink();
 if(source)$('footer').append(' Imported: '+shortDate(ledgerTime)+' \u00b7 ',source);
}
const isFiniteNonnegative=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function validParticipant(data){
 if(data?.schema!=='brave-hc-awards-participants/v1'||!Array.isArray(data.players)||
    !/^W20\d{2}\/\d{2}$/.test(data.season)||
    data.status!=='UNRANKED_VERIFIED_SEASON_APPEARANCES_NOT_AWARD_SCORES'||
    !data.sourceReference?.htoReadback)return false;
 return true;
}
function renderCurrent(feed) {
 const panel=$('form');
 if(!validParticipant(feed)){
  panel.textContent='No qualified HTO current-season feed is available. Official profile statistics remain the source of truth.';
  return;
 }
 const candidate=feed.players.find(x=>{
   const named=String(x.name||'');
   const expected=identity.name.split(' ').slice(1).join(' ')+', '+identity.name.split(' ')[0];
   return named.localeCompare(expected,'en-CA',{sensitivity:'base'})===0;
 });
 if(!candidate||candidate.currentHTORaw?.sourceKind!=='OFFICIAL_HTO_PUBLISHED_SEASON_STATISTICS'
    ||candidate.currentHTORaw?.season!==feed.season){
  panel.textContent='No verified current-season observation is published for this player yet. No unverified totals have been substituted.';
  return;
 }
 const gp=candidate.officialHTOStats?.gp;
 if(!isFiniteNonnegative(gp)||!Number.isInteger(gp)){
  panel.textContent='Current-season GP has not passed source validation.';
  return;
 }
 const stats=[];
 if(candidate.position==='Goalie'){
  const raw=candidate.currentHTORaw,obs=candidate.officialHTOStats;
  stats.push(['GP',gp]);
  if(isFiniteNonnegative(obs?.goalsAgainst))stats.push(['GA',obs.goalsAgainst]);
  if(isFiniteNonnegative(obs?.gaa))stats.push(['GAA',obs.gaa.toFixed(2)]);
  if(isFiniteNonnegative(raw.playerOfTheGameCount))stats.push(['POTG',raw.playerOfTheGameCount]);
 }else{
  const obs=candidate.officialHTOStats;
  if(![obs?.goals,obs?.assists,obs?.points].every(isFiniteNonnegative)
    ||obs.goals+obs.assists!==obs.points){
    panel.textContent='Skater totals failed internal HTO parity checks.';return;
  }
  stats.push(['GP',gp],['G',obs.goals],['A',obs.assists],['PTS',obs.points]);
 }
 panel.replaceChildren();
 const grid=text('div','', 'ph-grid');
 grid.style.gridTemplateColumns='repeat('+stats.length+',minmax(0,1fr))';
 for(const [key,val] of stats)grid.append(statistic(key,val));
 panel.append(grid);
 const observed=new Date(feed.sourceReference.htoReadback);
 const age=Date.now()-observed.getTime();
 const aged=!Number.isFinite(age)||age>36*60*60*1000||age<-(60*60*1000);
 const caveat=text('p',
   'Official HTO '+feed.season+' source readback: '+shortDate(feed.sourceReference.htoReadback)+
   (aged?' \u00b7 Historical/stale snapshot \u2014 confirm latest figures on HTO.':' \u00b7 Verified published snapshot.'),
   'ph-sub'+(aged?' ph-hold':''));
 panel.append(caveat);
 const link=publicProfileLink();
 if(link){const wrapper=text('div','','ph-sub');wrapper.append(link);panel.append(wrapper)}
}
(async()=>{
 if(!identity){
  $('legacy').replaceChildren(text('div',
   playerId?'New player ID not yet verified in the shared HTO player registry. Add the exact public HTO player ID through the player onboarding process; no highlights or statistics are shown until identity verification.':
   'Missing HTO player ID. Use the standard embed with ?playerID= followed by the official numeric HTO player ID.','ph-empty'));
  $('form').textContent='Player identity must be verified before showing statistics.';
  setNotice('Identity not verified \u2014 no profile data has been assigned.');
  return;
 }
 const ledgerPromise=fetch(root+'player-highlights-ledger.json',{cache:'no-store'})
   .then(async x=>{if(!x.ok)throw Error('Ledger HTTP '+x.status);return validLedger(await x.json())});
 const feedPromise=fetch(root+'awards-participants.json',{cache:'no-store'})
   .then(x=>{if(!x.ok)throw Error('Stats HTTP '+x.status);return x.json()});
 const [legacyResult,feedResult]=await Promise.allSettled([ledgerPromise,feedPromise]);
 if(legacyResult.status==='fulfilled'){
  const ledger=legacyResult.value;
  const record=ledger.players[String(playerId)];
  if(record && (record.name!==identity.name ||
      !record.profileUrl.endsWith('playerID='+playerId))){
    $('legacy').replaceChildren(text('div','Historic source identity mismatch. Highlights withheld pending review.','ph-empty'));
    $('careerSummary').hidden=true;
    warnings.push('Historical source identity mismatch');
  }else renderLegacy(record,ledger.capturedAt);
 }else{
  $('legacy').replaceChildren(text('div','Highlights source unavailable; existing HTO record remains authoritative.','ph-empty'));
  warnings.push('Historical highlights feed unavailable');
 }
 if(feedResult.status==='fulfilled')renderCurrent(feedResult.value);
 else{$('form').textContent='Current-season source unavailable. Use HTO for authoritative statistics.';warnings.push('Current-season feed unavailable')}
 setNotice(warnings.length?'Partial data: '+warnings.join(' \u00b7 ')+'.':
   'Existing career achievements are preserved as published; current-season statistics are sourced separately. Awards and milestone dates require manager approval.');
})();
})();
