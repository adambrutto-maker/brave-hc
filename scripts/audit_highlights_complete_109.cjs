'use strict';
/* Source-preserving audit of Brave H.C. Highlights. All classification uses
 * explicit, already-public HTO readback sources. No inferred award winners. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),widgets=path.join(root,'widgets');
const read=n=>fs.readFileSync(path.join(widgets,n),'utf8');
const load=n=>JSON.parse(read(n));
const sourceFiles=['player-links.js','player-career-insights.json','player-highlights-ledger.json',
 'player-bio-leadership.json','history-awards.json','history-records.json','player-record-book.json',
 'history-player-seasons.json'];
// Audit hashes are cross-platform canonical: normalize CRLF/CR to LF first.
const SHA=x=>crypto.createHash('sha256').update(String(x).replace(/\r\n?/g,'\n'),'utf8').digest('hex');
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const links=(()=>{const scope={};vm.runInNewContext(read('player-links.js'),scope);return scope.BravePlayerLinks;})();
const career=load('player-career-insights.json'),ledger=load('player-highlights-ledger.json'),roles=load('player-bio-leadership.json'),
 awards=load('history-awards.json'),rec=load('player-record-book.json'),history=load('history-records.json'),seasons=load('history-player-seasons.json');
const valid=n=>Number.isSafeInteger(n)&&n>=0;
function assertSources(){
 if(links.knownPlayers!==109||Object.keys(career.players||{}).length!==109||
   ledger.schema!=='brave-hc-player-highlights/v1'||roles.schema!=='brave-hc-bio-public-leadership/v1'||
   roles.status!=='PUBLIC_BIO_SOURCE_AND_FOUNDER_CONFIRMED'||
   awards.schema!=='brave-hc-hto-history-snapshot/v1'||awards.type!=='awards'||
   history.schema!=='brave-hc-hto-history-snapshot/v1'||rec.schema!=='brave-hc-player-record-book/v1')
  throw Error('SOURCE_SCHEMA_OR_109_IDENTITY_COUNT_MISMATCH');
 const ids=Object.keys(career.players);let known=0;
 for(const id of ids){
  const c=career.players[id],identity=links.identityById(Number(id)),archived=ledger.players[id];
  if(!identity||c.name!==identity.name||Number(identity.playerID)!==Number(id))
   throw Error('HTO_IDENTITY_MISMATCH '+id+' '+c.name);
  if(archived&&(archived.name!==c.name||!archived.profileUrl.endsWith('playerID='+id)||
    archived.originalCount!==archived.items.filter(x=>x.provenance==='EXISTING_NATIVE_HTO_HIGHLIGHTS').length))
   throw Error('HIGHLIGHT_LEDGER_IDENTITY_OR_NATIVE_COUNT_MISMATCH '+id);
  if(rec.players[id]&&rec.players[id].name!==c.name)throw Error('HTO_RECORD_IDENTITY_MISMATCH '+id);
  known++;
 }
 if(known!==109)throw Error('INCOMPLETE_PLAYER_ID_LIST');
 return ids;
}
function awardType(label){
 const text=norm(label);
 const patterns=[
 ['hall_of_fame',/^(?:brave h\.c\. hall of fame|hall of fame inductee)/],
 ['rocket_richard',/^maurice ['"]?rocket['"]? richard (?:trophy|award)/],
 ['art_ross',/^art ross award/],
 ['hart',/^hart award/],
 ['conn_smythe',/^conn smythe/],
 ['james_norris',/^james norris/],
 ['most_improved',/^most improved/],
 ['lady_byng',/^lady byng/],
 ['dedication',/^(andrew cristillo|bill masterton) award/],
 ['rookie_year',/^rookie of the year/],
 ['rolaids',/^rolaids relief/]
 ];
 const r=patterns.filter(([id,regex])=>regex.test(text));
 return r.length===1?r[0][0]:null;
}
function parsePeriod(category,year){
 const y=Number(year);
 if(!valid(y)||y<2012||y>2026)return null;
 if(/Brave H\.C\. Hall of Fame/.test(category))return String(year);
 if(/ - Summer(?:\b|$)/i.test(category))return 'Summer '+year;
 if(/ - Winter(?:\b|$)/i.test(category))return 'Winter '+year+'/'+String((y+1)%100).padStart(2,'0');
 return null;
}
function itemPeriods(text){
 const lines=String(text).replace(/\u00a0/g,' ').split('\n');
 const periods=[];
 for(const line of lines){
   const match=/ - (Summer \d{4}|Winter \d{4}\/(?:\d{2}|\d{4})|\d{4})\s*$/.exec(line);
   if(!match)continue;
   const value=match[1],winter=/^Winter (\d{4})\/(\d{2}|\d{4})$/.exec(value);
   periods.push(winter?'Winter '+winter[1]+'/'+winter[2].slice(-2):value);
 }
 return periods;
}
function matchesAwardPeriod(item,type,period){
 const periods=itemPeriods(item.sourceText);
 if(type==='hall_of_fame'){
   return periods.some(x=>x===period||x==='Winter '+period+'/'+String((Number(period)+1)%100).padStart(2,'0'));
 }
 return periods.includes(period);
}
function reportedMetric(type,sourceText,historical){
 const text=String(sourceText||'').replace(/\u00a0/g,' ');
 if(type==='art_ross'){
   const x=historical?/(\d+)\s*PTS\b/i:/\((\d+)\s*Points\)/i;
   const m=x.exec(text);return m?Number(m[1]):null;
 }
 if(type==='rocket_richard'){
   const x=historical?/(\d+)\s*Goals\b/i:/\((\d+)\s*Goals\)/i;
   const m=x.exec(text);return m?Number(m[1]):null;
 }
 return null;
}

function getAwardCandidates(ids){
 const byName=new Map();
 for(const id of ids){const name=norm(career.players[id].name);if(byName.has(name))throw Error('DUPLICATE_PLAYER_NAME '+name);byName.set(name,id);}
 const events=[],held=[],nonAwards=[];
 for(const group of awards.groups||[]){
  const category=group.category,type=awardType(category);
  if(!type){held.push({reason:'UNRECOGNIZED_HISTORICAL_AWARD_CATEGORY',category});continue;}
  for(const sourceText of group.items||[]){
   const match=/^(\d{4}) - (.+?)(?: - (.+))?$/.exec(sourceText);
   if(!match){held.push({reason:'UNPARSEABLE_SOURCE_AWARD_ROW',category,sourceText});continue;}
   const [,year,reportedName,sourceStats]=match;
   const period=parsePeriod(category,year);
   if(!period){held.push({reason:'UNVERIFIED_AWARD_PERIOD',category,sourceText});continue;}
   if(norm(reportedName)==='no rookies'){
    nonAwards.push({reason:'EXPLICIT_NO_ROOKIE_AWARDED',category,period,sourceText});continue;
   }
   const winnerNames=reportedName.split(/\s+&\s+/).map(n=>n.trim());
   for(const winner of winnerNames){
    const id=byName.get(norm(winner));
    if(!id){held.push({reason:'WINNER_IDENTITY_NOT_IN_109_ARCHIVE',category,period,winner,sourceText});continue;}
    const player=career.players[id],record=ledger.players[id];
    let matching=[],conflictingPeriod=[];
    if(record)for(const item of record.items){
      if(!['award','recognition','record'].includes(item.category))continue;
      for(const line of String(item.sourceText||'').split('\n')){
       if(awardType(line)!==type)continue;
       if(matchesAwardPeriod({sourceText:line},type,period)){
        matching.push({ledgerId:item.id,ledgerSourceText:line,category:item.category,
          publication:item.publication,provenance:item.provenance});
       }else if(period.startsWith('Winter ')&&itemPeriods(line).some(x=>{
        const match=/^Winter (\d{4})\/(\d{2})$/.exec(x);
        const reference=/^Winter \d{4}\/(\d{2})$/.exec(period);
        return match&&reference&&Number(match[2])!==((Number(match[1])+1)%100)&&
          match[2]===reference[1];
       }))conflictingPeriod.push({ledgerId:item.id,ledgerSourceText:line,reason:'MALFORMED_NATIVE_YEAR_SAME_END_YEAR'});
      }
    }
    const unique=matching.filter((x,i)=>matching.findIndex(y=>y.ledgerId===x.ledgerId)===i);
    const key=[id,type,period].join('|');
    const conflictingMetric=unique.length===1?reportedMetric(type,unique[0].ledgerSourceText,false):null,
      officialMetric=reportedMetric(type,sourceStats,true);
    const matchStatus=unique.length>1?'REVIEW_DUPLICATE_NATIVE_ENTRY':
      unique.length===1?'NATIVE_LEDGER_MATCH':
      conflictingPeriod.length?'NATIVE_SOURCE_PERIOD_CONFLICT_HOLD':
      'OFFICIAL_HISTORY_NOT_IN_NATIVE_LEDGER';
    events.push({key,playerId:id,playerName:player.name,category,type,period,winner,
      officialHistorySourceText:sourceText,officialSource:awards.source.url,
      historicalSnapshot:awards.capturedAt,matchStatus,matchedNative:unique,
      possiblePeriodConflict:conflictingPeriod,
      publishedMetric:officialMetric,nativeMetric:conflictingMetric,
      metricComparison:officialMetric===null||conflictingMetric===null?'NOT_COMPARABLE_NO_EXPLICIT_COUNT':
        officialMetric===conflictingMetric?'COUNTS_AGREE':'REVIEW_SOURCE_SCOPE_COUNT_DISAGREEMENT',
      scope:'OFFICIAL_AWARD_WINNER_HISTORY_NOT_STATISTICALLY_INFERRED'});
   }
  }
 }
 const keys=new Set();
 for(const e of events){if(keys.has(e.key))held.push({reason:'DUPLICATE_HISTORICAL_AWARD_REFERENCE',key:e.key});keys.add(e.key);}
 return {events,held,nonAwards};
}
function recordCrosswalk(ids){
 const allHistory=new Map();
 for(const group of history.groups||[]){
   if(group.section!=='Individual Records')continue;
   for(const text of group.items||[]){
     const k=JSON.stringify([group.category,group.period,text]);
     allHistory.set(k,(allHistory.get(k)||0)+1);
   }
 }
 const results=[];
 for(const id of ids)for(const entry of rec.players[id]?.entries||[]){
   const k=JSON.stringify([entry.category,entry.scope,entry.sourceText]);
   const matches=allHistory.get(k)||0;
   results.push({playerId:id,playerName:career.players[id].name,
     category:entry.category,scope:entry.scope,sourceText:entry.sourceText,
     snapshot:rec.capturedAt,status:matches?'HTO_RECORD_HISTORY_SOURCE_MATCH':'HTO_RECORD_HISTORY_SOURCE_HOLD',
     sourceOccurrences:matches});
 }
 return results;
}
function build(){
 const ids=assertSources();
 const {events,held,nonAwards}=getAwardCandidates(ids),records=recordCrosswalk(ids);
 const per=new Map(ids.map(id=>[id,[]]));
 const recordMap=new Map(ids.map(id=>[id,[]]));
 for(const e of events)per.get(e.playerId).push(e);
 for(const r of records)recordMap.get(r.playerId).push(r);
 const rows=ids.map(id=>{
  const p=career.players[id],lg=ledger.players[id],lead=roles.items.filter(x=>String(x.htoPlayerID)===id);
  const a=per.get(id),r=recordMap.get(id),missing=a.filter(x=>x.matchStatus==='OFFICIAL_HISTORY_NOT_IN_NATIVE_LEDGER');
  const conflicts=a.filter(x=>['REVIEW_DUPLICATE_NATIVE_ENTRY','NATIVE_SOURCE_PERIOD_CONFLICT_HOLD'].includes(x.matchStatus));
  const careerSeasons=seasons.players.find(x=>Number(x.playerID)===Number(id));
  return {htoPlayerID:id,playerName:p.name,publicHTOProfile:links.profileUrl(p.name),
   sourceSnapshotStatuses:{
    nativeHighlights:lg?'NATIVE_HTO_HIGHLIGHTS_CAPTURED':'NO_NATIVE_HIGHLIGHTS_IN_PUBLIC_SNAPSHOT',
    officialHistoricalAwardWinners:a.length?'MATCHED_PUBLIC_HTO_AWARD_WINNER_ROWS':'NO_WINNER_ROW_IN_AWARDS_SNAPSHOT',
    nativeRecords:r.length?'HTO_RECORD_READBACK_PRESENT':'NO_NATIVE_PERSONAL_RECORD_IN_PUBLIC_SNAPSHOT',
    historicalPlayerSeason:careerSeasons?'SEASON_MEMBERSHIP_EVIDENCE_CAPTURED':'NOT_IN_PARTIAL_51_PLAYER_SEASON_LIST'
   },
   nativeHighlights:{count:lg?.items.length||0,nativeCount:lg?.originalCount||0,
      categories:lg?lg.items.reduce((q,x)=>(q[x.category]=(q[x.category]||0)+1,q),{}):{},
      status:lg?.legacyStatus||'NO_NATIVE_HIGHLIGHTS_CAPTURED'},
   teamServiceTenures:lead.map(x=>({role:x.text,source:x.source,verification:x.status,
      display:'HIGHLIGHTS_HONORS_SEPARATE_LEADERSHIP_HISTORY'})),
   publicAwardHistoryEvents:a,
   openAwardSourceHolds:missing.map(x=>({type:x.type,period:x.period,source:x.officialHistorySourceText,
     status:'HOLD_PENDING_SOURCE_SCOPE_AND_PUBLICATION_REVIEW'})),
   duplicateAwardSourceHolds:conflicts,
   conflictingAwardMetrics:a.filter(x=>x.metricComparison==='REVIEW_SOURCE_SCOPE_COUNT_DISAGREEMENT'),
   nativeRecordRows:r.length,
   unmatchedRecordSourceRows:r.filter(x=>x.status==='HTO_RECORD_HISTORY_SOURCE_HOLD'),
   sourceCompleteness:'SOURCE_RECONCILED_ACROSS_AVAILABLE_SNAPSHOTS_NOT_VERIFIED_FULL_HISTORICAL_COMPLETENESS'};
 });
 const counts={
  officialHTOIdentities:ids.length,
  nativeHighlightsProfiles:rows.filter(x=>x.nativeHighlights.count>0).length,
  nativeHighlightsOriginalRows:rows.reduce((n,x)=>n+x.nativeHighlights.nativeCount,0),
  allCapturedHighlightsRows:rows.reduce((n,x)=>n+x.nativeHighlights.count,0),
  profilesWithoutNativeHighlights:rows.filter(x=>x.nativeHighlights.count===0).length,
  officialHistoricalAwardWinnerRows:events.length,
  awardEventsMatchedNative:events.filter(x=>x.matchStatus==='NATIVE_LEDGER_MATCH').length,
  awardEventsMissingNative:events.filter(x=>x.matchStatus==='OFFICIAL_HISTORY_NOT_IN_NATIVE_LEDGER').length,
  awardEventsDuplicateNative:events.filter(x=>x.matchStatus==='REVIEW_DUPLICATE_NATIVE_ENTRY').length,
  awardNativePeriodConflicts:events.filter(x=>x.matchStatus==='NATIVE_SOURCE_PERIOD_CONFLICT_HOLD').length,
  awardMetricDisagreements:events.filter(x=>x.metricComparison==='REVIEW_SOURCE_SCOPE_COUNT_DISAGREEMENT').length,
  awardsUnresolvedSourceRows:held.length,
  officialNoRookieRows:nonAwards.length,
  leadershipServiceRows:rows.reduce((n,x)=>n+x.teamServiceTenures.length,0),
  leadershipPlayers:rows.filter(x=>x.teamServiceTenures.length>0).length,
  publishedRecordRows:records.length,
  recordRowsSourceMatched:records.filter(x=>x.status==='HTO_RECORD_HISTORY_SOURCE_MATCH').length,
  recordRowsHeld:records.filter(x=>x.status!=='HTO_RECORD_HISTORY_SOURCE_MATCH').length,
  partialSeasonEvidencePlayers:rows.filter(x=>x.sourceSnapshotStatuses.historicalPlayerSeason==='SEASON_MEMBERSHIP_EVIDENCE_CAPTURED').length
 };
 return {schema:'hockeyos-highlights-109player-source-parity/v1',
  evidencePolicy:'PUBLIC_HTO_SNAPSHOT_JOINS_ONLY_NO_NEW_AWARD_PUBLICATION',
  sourceInputs:sourceFiles.map(file=>({file,sha256:SHA(read(file)),
    capturedAt:file==='player-highlights-ledger.json'?ledger.capturedAt:
     file==='history-awards.json'?awards.capturedAt:
     file==='history-records.json'?history.capturedAt:
     file==='player-record-book.json'?rec.capturedAt:undefined})),
  counts,
  officialAwardProvenance:{source:awards.source.url,capturedAt:awards.capturedAt,
    nonAwards,unresolved:held},
  rows,scopeWarning:'43 captured native-highlight profiles do not imply only 43 eligible people; missing entries are not automatically missed earned awards. Historical HTO award discrepancies remain pending human source reconciliation.',
  outcome:'OPEN_HOLDS_REQUIRE_REVIEW_NO_NEW_AWARDS_AUTOMATICALLY_PUBLISHED'};
}
module.exports={build,awardType,parsePeriod,itemPeriods,norm,matchesAwardPeriod,reportedMetric};
if(require.main===module){
 const result=build(),text=JSON.stringify(result,null,2)+'\n',destination=path.join(root,'docs/261028_Highlights_109_Profile_Parity_Register.json');
 if(process.argv.includes('--check')){
  if(!fs.existsSync(destination)||fs.readFileSync(destination,'utf8')!==text){
   console.error('HIGH_LIGHT_PARITY_REGISTER_STALE');process.exit(2);
  }
  console.log('HIGHLIGHTS_AUDIT_109_SOURCE_PARITY_MATCH',JSON.stringify(result.counts));process.exit(0);
 }
 fs.writeFileSync(destination,text,'utf8');
 console.log('HIGHLIGHTS_AUDIT_109_REGISTER_GENERATED',JSON.stringify(result.counts,null,2));
 const issues=result.rows.filter(x=>x.openAwardSourceHolds.length||x.unmatchedRecordSourceRows.length)
 .map(x=>({name:x.playerName,awards:x.openAwardSourceHolds.map(y=>y.type+' '+y.period),
   records:x.unmatchedRecordSourceRows.map(y=>y.category+' '+y.scope)}));
 console.log('SOURCE_GAPS',JSON.stringify(issues,null,2));
 console.log('GENERAL_HOLDS',JSON.stringify(result.officialAwardProvenance.unresolved.slice(0,15)));
}
