/* HockeyOS Bio V3.0 — verified advanced metric ranking + workbook-adjusted
 * attendance rank consumer. No private workbook, status history or call-up
 * identity is bundled in this client-side engine.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BraveBioRankEngine=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 // A standard Summer regular season provides roughly 10 qualifying appearances.
 // Goalies retain their existing 8-GP threshold because of their smaller role cohort.
 const MIN_GP=Object.freeze({skater:10,goalie:8});
 const SH='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
 const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 const metricRules=Object.freeze({
  'Goal share of points':{kind:'skater',num:'G',den:'Pts',minDen:5},
  'Assist share of points':{kind:'skater',num:'A',den:'Pts',minDen:5},
  'Power-play goal share':{kind:'skater',num:'PPG',den:'G',minDen:3},
  'Short-handed goal share':{kind:'skater',num:'SHG',den:'G',minDen:3},
  'Game-winning goals / GP':{kind:'skater',num:'GWG',den:'GP',minDen:10},
  'Game-tying goals / GP':{kind:'skater',num:'GTG',den:'GP',minDen:10},
  'Player of Game / GP':{kind:'either',num:'POTG',den:'GP'},
  'Penalty minutes / GP':{kind:'either',num:'PIM',den:'GP',ascending:true}
 });
 const rankRows=(rows,wantedId,ascending=false)=>{
  if(!rows.length)return {status:'NO_QUALIFIED_COHORT'};
  const p=rows.find(x=>x.id===String(wantedId));
  if(!p)return {status:'UNQUALIFIED',qualified:rows.length};
  const better=rows.filter(x=>ascending?x.value<p.value-1e-12:x.value>p.value+1e-12).length;
  const tied=rows.filter(x=>Math.abs(x.value-p.value)<=1e-12).length;
  return Object.freeze({status:'QUALIFIED',rank:better+1,qualified:rows.length,tied,
   value:p.value,minimumGP:p.minimumGP});
 };
 function rankMetric(archive,playerId,role,label){
  const rule=metricRules[label];
  if(!rule||!['skater','goalie'].includes(role)||(rule.kind!=='either'&&rule.kind!==role)||
    archive?.schema!=='brave-hc-player-career-insights/v1'||!archive.players)return null;
  const rows=[];
  for(const [id,p] of Object.entries(archive.players)){
   if(p.status!=='VERIFIED_PROFILE_CAREER_SUM_PARITY')continue;
   const s=p.segments?.find(x=>x.kind===role);
   const t=s?.total;
   if(!t||!finite(t.GP)||t.GP<MIN_GP[role]||!finite(t[rule.num])||
     !finite(t[rule.den])||t[rule.den]<(rule.minDen||1)||
     // A GP-percentage event may occur at most once per recorded appearance.
     (rule.den==='GP'&&rule.num!=='PIM'&&t[rule.num]>t.GP))continue;
   rows.push({id,value:t[rule.num]/t[rule.den],minimumGP:MIN_GP[role]});
  }
  const result=rankRows(rows,playerId,rule.ascending);
  return Object.freeze({...result,metric:label,role,source:'HTO_VERIFIED_CAREER_TOTALS',
   denominatorMetric:rule.den,minimumDenominator:rule.minDen||null,
   ascending:!!rule.ascending});
 }
 function workbookEligibleSeason(status,actualGP,teamContested){
  if(!finite(actualGP)||!finite(teamContested)||actualGP>teamContested)return null;
  if(status==='FT')return teamContested>0?Object.freeze({gp:actualGP,eligible:teamContested,percent:100*actualGP/teamContested}):null;
  if(status==='CU'||status==='DI')return actualGP>0?Object.freeze({gp:actualGP,eligible:actualGP,percent:100}):null;
  return null;
 }
 function validAttendance(ledger){
  return ledger?.schema==='brave-hc-workbook-roster-adjusted-attendance/v1'&&
   ledger.sourceMasterSHA256===SH&&
   ledger.status==='PREVIEW_ONLY_SOURCE_RECONCILIATION_PENDING'&&
   ledger.authority==='Master Workbook RosterStatusBySeason cumulative GP / eligible games'&&
   ledger.players&&typeof ledger.players==='object';
 }
 function validEntry(entry,role){
  if(!entry||!Array.isArray(entry.roles)||!entry.roles.includes(role)||!entry.career)return false;
  const r=entry.career;
  return finite(r.gp)&&finite(r.eligibleGames)&&finite(r.percent)&&
    r.eligibleGames>=r.gp&&r.eligibleGames>0&&r.percent<=100&&
    Math.abs(r.percent-100*r.gp/r.eligibleGames)<.001&&
    r.status==='WORKBOOK_SOURCE_PARITY';
 }
 function rankAttendance(ledger,playerId,role){
  if(!['skater','goalie'].includes(role)||!validAttendance(ledger))return {status:'SOURCE_HELD'};
  const rows=[];
  for(const [id,p]of Object.entries(ledger.players)){
   if(!validEntry(p,role)||p.career.gp<MIN_GP[role])continue;
   rows.push({id,value:p.career.gp/p.career.eligibleGames,minimumGP:MIN_GP[role]});
  }
  const result=rankRows(rows,playerId);
  const p=ledger.players[String(playerId)];
  if(!validEntry(p,role))return {status:'NO_WORKBOOK_PARITY'};
  return Object.freeze({...result,percent:p.career.percent,
   gp:p.career.gp,eligible:p.career.eligibleGames,source:'WORKBOOK_ROSTER_ADJUSTED',
   label:'Roster-adjusted career attendance',totalMatched:ledger.rosterHistoryMatchedHTOPlayers});
 }
 function seasonAttendance(ledger,playerId){
  if(!validAttendance(ledger))return {status:'SOURCE_HELD'};
  const rec=ledger.players[String(playerId)]?.season;
  if(rec?.status!=='PROVISIONAL_HTO_CURRENT_WORKBOOK_ROSTER_CLASSIFICATION'||
    !finite(rec.gp)||!finite(rec.eligibleGames)||rec.eligibleGames<=0||
    !finite(rec.percent)||rec.percent>100||
    Math.abs(rec.percent-100*rec.gp/rec.eligibleGames)>.001)
    return {status:'CURRENT_SEASON_HELD'};
  return Object.freeze({status:'PROVISIONAL',percent:rec.percent,
   gp:rec.gp,eligible:rec.eligibleGames,teamGames:rec.teamGames});
 }
 return Object.freeze({MIN_GP,rankMetric,rankAttendance,seasonAttendance,workbookEligibleSeason,validAttendance});
});
