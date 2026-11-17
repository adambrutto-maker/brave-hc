/* LeagueOS V17 | Public-fixture game-night operations scenario engine.
 * This is an ORIGINAL browser-only demo model, not Sports Village's actual
 * staffing, resurfacing, officiating or contractual ice rules.
 */
(function(){"use strict";
const SOURCE="./leagueos-source-qualified-current-fixtures-v4.json";
const DRAFT_KEY="bruttech-leagueos-ops-drafts-v17";
const FEED_KEY="bruttech-leagueos-demo-hockeyos-fixtures-v17";
const SETTINGS_KEY="bruttech-leagueos-ops-settings-v17";
const REF_KEY="bruttech-leagueos-demo-referee-overrides-v17";
const DEMO_REFS=Object.freeze(Array.from({length:16},(_,i)=>"Official "+String(i+1).padStart(2,"0")));
const DEMO_TIMEKEEPERS=Object.freeze(Array.from({length:4},(_,i)=>"Timekeeper "+String(i+1).padStart(2,"0")));
const MACHINES=Object.freeze(["Zamboni 1","Zamboni 2"]);
const RINKS=Object.freeze(["A","B","C","D"]);
const DEFAULTS=Object.freeze({serviceMinutes:12,readyBufferMinutes:3,assumedPlayingMinutes:45,assumedGameBlockMinutes:60,refBreakMinutes:10});
const read=(k,fallback)=>{try{const x=JSON.parse(localStorage.getItem(k)||"null");return x&&typeof x==="object"?x:fallback}catch(_){return fallback}};
const write=(k,x)=>{try{localStorage.setItem(k,JSON.stringify(x));return true}catch(_){return false}};
function clockMin(s){const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||""));return m?Number(m[1])*60+Number(m[2]):null}
function clock(v){const n=((v%1440)+1440)%1440;return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function dateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||""))return false;const d=new Date(s+"T12:00:00Z");return!Number.isNaN(+d)&&d.toISOString().slice(0,10)===s}
function rinkId(s){const x=String(s||"").trim().toUpperCase().replace(/ RINK$/,"");return RINKS.includes(x)?x:null}
function fixtureSource(x){return x&&x.status==="FUTURE_RECIPROCAL_FIXTURE"&&Number.isInteger(x.game_id)&&dateValid(x.date)&&clockMin(x.time)!==null&&rinkId(x.rink)&&typeof x.home==="string"&&typeof x.away==="string"}
function sourceRows(d){if(d?.schema!=="bruttech-svhl-current-fixture-window/v4"||d?.counts?.total!==411||!Array.isArray(d.fixtures))throw Error("Source-qualified public fixture window unavailable or schema differs");return d.fixtures.filter(fixtureSource)}
function publicDates(rows){return[...new Set(rows.map(x=>x.date))].sort()}
function normalizeDraft(value){if(!value||!dateValid(value.date)||clockMin(value.time)===null||!rinkId(value.rink))return null;return{date:value.date,time:value.time,rink:rinkId(value.rink),revision:Math.max(1,Number(value.revision)||1)}}
function merge(rows,drafts={}){return rows.map(src=>{const edit=normalizeDraft(drafts[String(src.game_id)]);
return{...src,sourceDate:src.date,sourceTime:src.time,sourceRink:rinkId(src.rink),rink:edit?.rink||rinkId(src.rink),date:edit?.date||src.date,time:edit?.time||src.time,draftChange:Boolean(edit),draftRevision:edit?.revision||0,sourceAuthority:"PUBLISHED_PUBLIC_FIXTURE_SNAPSHOT",bookingAuthority:"NONE"}})}
function forDate(rows,drafts,date){return merge(rows,drafts).filter(x=>x.date===date).sort((a,b)=>clockMin(a.time)-clockMin(b.time)||a.rink.localeCompare(b.rink)||a.game_id-b.game_id)}
function overlaps(s1,e1,s2,e2){return s1<e2&&s2<e1}
function fixtureProblems(games,settings=DEFAULTS){
 const issues=[];
 for(let i=0;i<games.length;i++){const a=games[i],aStart=clockMin(a.time);if(aStart===null){issues.push({kind:"INVALID_TIME",gameIds:[a.game_id],message:"Game time is invalid"});continue}
 for(let j=i+1;j<games.length;j++){const b=games[j],bStart=clockMin(b.time);if(bStart===null)continue;
 if(a.rink===b.rink&&overlaps(aStart,aStart+settings.assumedGameBlockMinutes,bStart,bStart+settings.assumedGameBlockMinutes))issues.push({kind:"RINK_COLLISION",gameIds:[a.game_id,b.game_id],message:"Rink "+a.rink+" has overlapping proposed game blocks"});
 if(overlaps(aStart,aStart+settings.assumedGameBlockMinutes,bStart,bStart+settings.assumedGameBlockMinutes)&&[a.home,a.away].some(t=>t===b.home||t===b.away))issues.push({kind:"TEAM_COLLISION",gameIds:[a.game_id,b.game_id],message:"A club has overlapping proposed game blocks"})
 }}
 return issues;
}
function resurfacing(games,settings=DEFAULTS){
 const jobs=[],issues=[],lanes=Object.fromEntries(MACHINES.map(x=>[x,[]]));
 const byRink=Object.fromEntries(RINKS.map(r=>[r,games.filter(x=>x.rink===r).sort((a,b)=>clockMin(a.time)-clockMin(b.time))]));
 for(const rink of RINKS){const list=byRink[rink];
 for(let i=1;i<list.length;i++){
 const prev=list[i-1],next=list[i],start=clockMin(next.time)-settings.readyBufferMinutes-settings.serviceMinutes,end=start+settings.serviceMinutes;
 jobs.push({id:"Z-"+next.game_id,date:next.date,gameId:next.game_id,rink,start,end,previousId:prev.game_id,previousStart:prev.time,gameStart:next.time,machine:null,operator:null,status:"UNASSIGNED_DEMO"});
 if(start<clockMin(prev.time)+settings.assumedPlayingMinutes)issues.push({kind:"TURNAROUND_RISK",gameIds:[prev.game_id,next.game_id],message:"Rink "+rink+" may lack space for "+settings.assumedPlayingMinutes+"m assumed play plus "+settings.serviceMinutes+"m resurfacing"})
 }}
 jobs.sort((a,b)=>a.start-b.start||a.rink.localeCompare(b.rink));
 for(const job of jobs){const machine=MACHINES.find(name=>lanes[name].every(x=>!overlaps(x.start,x.end,job.start,job.end)));
 if(machine){job.machine=machine;job.operator=machine==="Zamboni 1"?"Demo operator A":"Demo operator B";job.status="CAPACITY_SCENARIO_ASSIGNED";lanes[machine].push(job)}
 else{job.status="UNSTAFFED_CAPACITY_HOLD";issues.push({kind:"ZAMBONI_CAPACITY",gameIds:[job.gameId],message:"Only two example resurfacing machines; no machine free for rink "+job.rink+" before "+job.gameStart})}
 }
 return{jobs,lanes,issues,machines:2,operators:["Demo operator A","Demo operator B"],mode:"INFERRED_SERVICE_SCENARIO_NOT_FACILITY_PLAN"};
}
function officials(games,settings=DEFAULTS,overrides={}){
 const crews=[],issues=[],availability=Object.fromEntries(DEMO_REFS.map(k=>[k,[]])),timekeepers=Object.fromEntries(DEMO_TIMEKEEPERS.map(k=>[k,[]]));
 const sorted=games.slice().sort((a,b)=>clockMin(a.time)-clockMin(b.time)||a.rink.localeCompare(b.rink));
 for(const g of sorted){
 const s=clockMin(g.time),e=s+settings.assumedGameBlockMinutes;let r1=null,r2=null,tk=null;
 const prior=overrides[String(g.game_id)]||{};
 for(const slot of ["ref1","ref2"]){const picked=prior[slot];if(picked&&DEMO_REFS.includes(picked)&&availability[picked].every(x=>!overlaps(x.start-settings.refBreakMinutes,x.end+settings.refBreakMinutes,s,e))&&(!r1||picked!==r1)){if(slot==="ref1")r1=picked;else r2=picked}}
 const available=DEMO_REFS.filter(name=>availability[name].every(x=>!overlaps(x.start-settings.refBreakMinutes,x.end+settings.refBreakMinutes,s,e)));
 const order=available.slice().sort((a,b)=>availability[a].length-availability[b].length||a.localeCompare(b));
 if(!r1)r1=order.find(n=>n!==r2)||null;if(!r2)r2=order.find(n=>n!==r1)||null;
 const keep=prior.timekeeper;if(keep&&DEMO_TIMEKEEPERS.includes(keep)&&timekeepers[keep].every(x=>!overlaps(x.start,x.end,s,e)))tk=keep;
 if(!tk)tk=DEMO_TIMEKEEPERS.find(n=>timekeepers[n].every(x=>!overlaps(x.start,x.end,s,e)))||null;
 const row={gameId:g.game_id,date:g.date,start:s,end:e,rink:g.rink,home:g.home,away:g.away,ref1:r1,ref2:r2,timekeeper:tk,official:false,demoOnly:true};
 if(prior.ref1&&r1!==prior.ref1)issues.push({kind:"REF_OVERRIDE_UNAVAILABLE",gameIds:[g.game_id],message:"Manually selected Ref 1 is unavailable or clashes with another proposed game"});
 if(prior.ref2&&r2!==prior.ref2)issues.push({kind:"REF_OVERRIDE_UNAVAILABLE",gameIds:[g.game_id],message:"Manually selected Ref 2 is unavailable or clashes with another proposed game"});
 if(prior.timekeeper&&tk!==prior.timekeeper)issues.push({kind:"TIMEKEEPER_OVERRIDE_UNAVAILABLE",gameIds:[g.game_id],message:"Manually selected timekeeper conflicts with the staff board"});
 if(r1)availability[r1].push(row);if(r2)availability[r2].push(row);if(tk)timekeepers[tk].push(row);crews.push(row);
 if(!r1||!r2)issues.push({kind:"REFEREE_CAPACITY",gameIds:[g.game_id],message:"Not enough available fictional officials for "+g.home+" vs "+g.away});
 if(!tk)issues.push({kind:"TIMEKEEPER_CAPACITY",gameIds:[g.game_id],message:"No sample timekeeper available for "+g.home+" vs "+g.away});
 }
 return{crews,issues,availability,timekeepers,roster:DEMO_REFS,timekeeperRoster:DEMO_TIMEKEEPERS,status:"FICTIONAL_OFFICIAL_POOL_NOT_A_REAL_ASSIGNMENT"};
}
function evaluate(rows,drafts,date,settingsInput={},overrides={}){
 const settings={...DEFAULTS,...settingsInput},games=forDate(rows,drafts,date),ice=fixtureProblems(games,settings),zamboni=resurfacing(games,settings),staff=officials(games,settings,overrides);
 const issues=[...ice,...zamboni.issues,...staff.issues];
 return{date,games,rinks:RINKS,issues,issueCounts:issues.reduce((o,x)=>{o[x.kind]=(o[x.kind]||0)+1;return o},{}),zamboni,staff,settings,bookable:false,official:false,sourceWindow:"NOV_16_2026_PARTIAL",sourceTeamSiteConnected:false};
}
function publishable(g,assessment){if(!g?.draftChange)return{ok:false,reason:"No proposed change for this game"};
 const blockers=assessment.issues.filter(x=>x.gameIds?.includes(g.game_id));return blockers.length?{ok:false,reason:blockers.map(x=>x.message).join("; "),issues:blockers}:{ok:true,reason:"Valid for browser-local demonstration only"};
}
function teamFeed(rows,feed,team){const value=String(team||"").toLowerCase().trim();
 return rows.filter(x=>[x.home,x.away].some(y=>y.toLowerCase()===value)).map(x=>{const staged=feed[String(x.game_id)];const accepted=staged&&staged.status==="DEMO_SHARED_LOCAL_ONLY"&&staged.original?.gameId===x.game_id;
 return{gameId:x.game_id,date:accepted?staged.proposed.date:x.date,time:accepted?staged.proposed.time:x.time,rink:accepted?staged.proposed.rink:rinkId(x.rink),sourceDate:x.date,sourceTime:x.time,sourceRink:rinkId(x.rink),home:x.home,away:x.away,demoUpdated:Boolean(accepted),revision:accepted?staged.revision:0,status:accepted?"LOCAL_DEMO_TEAM_FEED":"SOURCE_PUBLISHED_SNAPSHOT",officialUrl:x.official_game_url||null}
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))}
function shareEvent(g){return{schema:"bruttech-leagueos-demo-team-sync-v17",status:"DEMO_SHARED_LOCAL_ONLY",officialPublished:false,facilityBooked:false,recordAuthority:"NONE",original:{gameId:g.game_id,date:g.sourceDate,time:g.sourceTime,rink:g.sourceRink},proposed:{date:g.date,time:g.time,rink:g.rink},teams:[g.home,g.away],revision:g.draftRevision,createdAt:new Date().toISOString(),note:"Browser-local HockeyOS preview only; no remote push"}}
window.LeagueOSOpsEngineV17={SOURCE,DRAFT_KEY,FEED_KEY,SETTINGS_KEY,REF_KEY,DEFAULTS,MACHINES,RINKS,DEMO_REFS,DEMO_TIMEKEEPERS,read,write,clockMin,clock,dateValid,rinkId,sourceRows,publicDates,normalizeDraft,merge,forDate,fixtureProblems,resurfacing,officials,evaluate,publishable,teamFeed,shareEvent};
})();
