/* Brave H.C. Bio V3.3 — published-Historical-HTO career contribution shares.
 * Read-only, source-checked, no blank->zero, season double-counting or source mutation.
 * Total/volume rankings have NO GP cutoff; rate rankings stay in the V3.2 engine.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.BraveBioAllTimeShares=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const AUTH='NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK';
 const SCHEMA='brave-hc-player-career-insights/v1';
 const VERIFIED='VERIFIED_PROFILE_CAREER_SUM_PARITY';
 const number=n=>Number.isSafeInteger(n)&&n>=0;
 const metric={
  GP:Object.freeze({key:'GP',label:'Braves appearances',noun:'GP',scope:'all',
    note:'Player role appearances, not unique team games'}),
  G:Object.freeze({key:'G',label:'Braves goals',noun:'goals',scope:'all'}),
  A:Object.freeze({key:'A',label:'Braves assists',noun:'assists',scope:'all'}),
  Pts:Object.freeze({key:'Pts',label:'Braves points',noun:'points',scope:'all'}),
  GWG:Object.freeze({key:'GWG',label:'Braves game-winners',noun:'GWG',scope:'skater'}),
  POTG:Object.freeze({key:'POTG',label:'Braves POTG honours',noun:'POTG',scope:'all'}),
  PPG:Object.freeze({key:'PPG',label:'Braves power-play goals',noun:'PPG',scope:'skater'}),
  SHG:Object.freeze({key:'SHG',label:'Braves short-handed goals',noun:'SHG',scope:'skater'}),
  GTG:Object.freeze({key:'GTG',label:'Braves tying goals',noun:'GTG',scope:'skater'}),
  HAT:Object.freeze({key:'HAT',label:'Braves hat tricks',noun:'hat tricks',scope:'skater'}),
  W:Object.freeze({key:'W',label:'Braves goalie wins',noun:'goalie wins',scope:'goalie'}),
  SHO:Object.freeze({key:'SHO',label:'Braves shutouts',noun:'shutouts',scope:'goalie'})
 };
 const displayMetricList=Object.freeze({
  skater:['G','A','Pts','GP','GWG','POTG','PPG','SHG','GTG','HAT'],
  goalie:['GP','W','SHO','POTG','A','Pts']
 });
 function validArchive(archive){
  if(!archive||archive.schema!==SCHEMA||archive.sourceAuthority!==AUTH||
    typeof archive.capturedAt!=='string'||!Number.isFinite(Date.parse(archive.capturedAt))||
    !archive.players||typeof archive.players!=='object'||Array.isArray(archive.players))return false;
  const ids=Object.keys(archive.players);
  if(ids.length<109||new Set(ids).size!==ids.length)return false;
  return ids.every(id=>{
   const p=archive.players[id];
   return /^\d+$/.test(id)&&p&&typeof p.name==='string'&&p.name.trim()&&
     [VERIFIED,'NO_PUBLISHED_STATS'].includes(p.status)&&
     (p.status!==VERIFIED||(Array.isArray(p.segments)&&p.segments.length>=1&&
     p.segments.every(s=>(s.kind==='skater'||s.kind==='goalie')&&s.total&&number(s.total.GP)&&s.total.GP>0)));
  });
 }
 function sourceValue(player,m){
  if(player.status!==VERIFIED)return null;
  const accepted=(player.segments||[]).filter(s=>m.scope==='all'||s.kind===m.scope);
  if(!accepted.length)return null;
  // No missing field is assumed zero. For a dual-role player, sum only role
  // entries for which HTO actually published a numeric statistic.
  const reported=accepted.filter(s=>number(s.total?.[m.key]));
  if(!reported.length)return null;
  const amount=reported.reduce((t,s)=>t+s.total[m.key],0);
  if(!Number.isSafeInteger(amount))return null;
  return {amount,reportedRoles:reported.length,roleRecords:accepted.length};
 }
 function rankMetric(archive,playerId,kind,metricKey){
  const m=metric[metricKey];
  if(!validArchive(archive)||!m||!['skater','goalie'].includes(kind))return {status:'SOURCE_HELD'};
  if(!(displayMetricList[kind]||[]).includes(metricKey))return {status:'NOT_APPLICABLE'};
  const players=Object.entries(archive.players);
  const target=archive.players[String(playerId)];
  if(!target||target.status!==VERIFIED||!(target.segments||[]).some(s=>s.kind===kind))
   return {status:'NOT_VERIFIED_ROLE'};
  const rows=[];
  for(const [id,p] of players){
   const value=sourceValue(p,m);
   if(value!==null)rows.push({id,...value});
  }
  const documented=rows.find(x=>x.id===String(playerId));
  const pool=players.filter(([,p])=>p.status===VERIFIED).length;
  const roleCount=players.filter(([,p])=>p.status===VERIFIED&&(p.segments||[]).some(s=>s.kind===kind)).length;
  if(!rows.length)return {status:'NO_REPORTED_METRIC',archiveSize:players.length};
  const total=rows.reduce((t,x)=>t+x.amount,0);
  if(!Number.isSafeInteger(total)||total<=0)return {status:'NO_REPORTED_METRIC',archiveSize:players.length};
  if(!documented)return {status:'UNREPORTED_FOR_PLAYER',archiveSize:players.length,sourceCovered:rows.length};
  const rank=1+rows.filter(x=>x.amount>documented.amount).length;
  const tied=rows.filter(x=>x.amount===documented.amount).length;
  const sourceCoverage=rows.length;
  const pct=100*documented.amount/total;
  if(!Number.isFinite(pct)||pct<0||pct>100+1e-10)return {status:'SOURCE_HELD'};
  return Object.freeze({
   status:'VERIFIED_REPORTED_SHARE',metric:metricKey,label:m.label,noun:m.noun,
   role:kind,scope:m.scope,sharePct:pct,value:documented.amount,publishedTotal:total,
   rank,qualified:sourceCoverage,tied,allHistoricalProfiles:players.length,
   verifiedProfileCount:pool,roleProfiles:roleCount,sourceCovered:sourceCoverage,
   missingMetricCount:(m.scope==='all'?pool:
       players.filter(([,p])=>p.status===VERIFIED&&(p.segments||[]).some(s=>s.kind===m.scope)).length)-sourceCoverage,
   sourceAsOf:archive.capturedAt,rateGPThreshold:0,
   note:m.note||'Published HTO career totals only'
  });
 }
 function analyzePlayer(archive,playerId,kind){
  if(!validArchive(archive))return {status:'SOURCE_HELD'};
  if(!displayMetricList[kind])return {status:'NOT_APPLICABLE'};
  const results=displayMetricList[kind].map(k=>rankMetric(archive,playerId,kind,k)).filter(r=>r.status==='VERIFIED_REPORTED_SHARE');
  return Object.freeze({status:'SOURCE_CALCULATED',id:String(playerId),role:kind,
   archiveSize:Object.keys(archive.players).length,sourceAsOf:archive.capturedAt,
   primary:results.slice(0,kind==='goalie'?4:6),additional:results.slice(kind==='goalie'?4:6),
   metrics:results});
 }
 return Object.freeze({SCHEMA,AUTH,metric,displayMetricList,validArchive,rankMetric,analyzePlayer});
});
