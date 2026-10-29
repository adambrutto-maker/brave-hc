/* HockeyOS game-night Home preview.
 * Source-bound DOM visual of the ORIGINAL Brave H.C. Lines card.
 * Requires independently authorized PUBLIC lineage before exposing names.
 * Poll votes (including source counts) are never fetched by this public script.
 */
(function(){
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('lineupOnly')==='1')document.body.classList.add('lineup-only');
 const contract=window.BraveGameNightContract;
 const $=id=>document.getElementById(id);
 const byCell=cell=>document.querySelector('[data-cell="'+cell+'"]');
 const safeText=x=>typeof x==='string'?x:'';
 const int=x=>Number.isSafeInteger(x)&&x>=0;
 const scheduleURL='countdown.json';
 const publicURL='game-night-lineup-public.json';
 const formatDate=s=>{
   const d=new Date(s+'T12:00:00Z');
   return Number.isFinite(d.getTime())?
     new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(d):s;
 };
 const fetchJSON=async file=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
   try{const response=await fetch('./'+file+'?v='+Date.now(),{cache:'no-store',
     signal:controller.signal});if(!response.ok)throw Error('Source HTTP '+response.status);
     return await response.json();
   }finally{clearTimeout(timer);}
 };
 let inFlight=false,lastApprovedVersion=null;
 function paint(result){
   const card=$('braveOriginalLinesCard');
   card.dataset.publicationStatus=result.status;
   for(const cell of contract.CELLS){
     const target=byCell(cell),value=result.slots?.[cell];
     if(!target)continue;
     if(!result.approved||value==='-'||!value){
       target.textContent='-';target.removeAttribute('data-player-id');
     }else{
       target.textContent=(value.jersey||'')+(value.jersey?' - ':'')+value.name;
       target.dataset.playerId=value.playerId;
     }
   }
   for(const row of contract.GRID){
     if(row.kind==='goalie')continue;
     const out=$('ovr-'+row.id);
     if(out)out.textContent='(OVR '+(result.approved?result.averages?.[row.id]||'-':'-')+')';
   }
   if(result.fixture){
     $('lineupFixtureTitle').textContent='Next game · vs. '+result.fixture.opponent;
     $('lineupFixtureTime').textContent=formatDate(result.fixture.gameDate)+' · '+
       result.fixture.rink+' · Original workbook Lines card';
     $('lineupSourceLink').href=result.fixture.eventURL;
   }else{
     $('lineupFixtureTitle').textContent='Official next game not yet verified';
     $('lineupFixtureTime').textContent='No validated fixture for a lineup assignment.';
     $('lineupSourceLink').href='https://www.htosports.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY';
   }
   const badge=$('lineupReleaseStatus');
   if(result.approved){
     badge.classList.add('approved');badge.textContent='MANAGER APPROVED';
     $('lineupDataUpdated').textContent='Approved '+formatDate(result.approvedAt.slice(0,10));
     $('lineupPublicNote').textContent='Published from a verified, approved game-specific lineup version. Rechecked during this page session.';
     lastApprovedVersion=result.evidenceFingerprint;
   }else{
     badge.classList.remove('approved');badge.textContent='NOT APPROVED';
     $('lineupDataUpdated').textContent='No authorized public assignments';
     $('lineupPublicNote').textContent='The original Lines template is shown with dashes. WhatsApp votes, private drafts and future goalie commitments are not published. '+result.reason.replace(/_/g,' ').toLowerCase()+'.';
     lastApprovedVersion=null;
   }
 }
 async function refresh(){
   if(inFlight)return;
   inFlight=true;
   try{
     const [countdown,feed]=await Promise.all([fetchJSON(scheduleURL),fetchJSON(publicURL)]);
     const id=window.BravePlayerLinks?.identityById;
     const result=contract?.confirm(feed,countdown,
       typeof id==='function'?num=>id(num):null,new Date().toISOString());
     paint(result||{status:'PUBLICATION_HELD',approved:false,reason:'CONTRACT_NOT_LOADED',
       slots:contract?.dashed||{}});
   }catch(error){
     // No stale published card remains visible if either source goes unavailable.
     const fallback=contract?.confirm(null,null,null,new Date().toISOString());
     paint(fallback||{status:'PUBLICATION_HELD',approved:false,reason:'SOURCE_UNAVAILABLE',
       slots:contract?.dashed||{}});
   }finally{inFlight=false;}
 }
 if(!contract){
   $('lineupPublicNote').textContent='Lineup source contract unavailable. No player assignments shown.';
 }else{
   paint({status:'PUBLICATION_HELD',approved:false,reason:'SOURCE_NOT_YET_READ',
     slots:contract.dashed});
   refresh();
   setInterval(refresh,60_000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
   window.addEventListener('focus',refresh);
 }
})();
