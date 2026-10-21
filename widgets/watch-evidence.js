/* HockeyOS Plan 03: cross-check historical Watch milestones against official HTO Records.
 * This is NOT fresh workbook/HTO game data, not a new record, and not a publisher.
 */
const BraveWatchEvidence=(function(){
  'use strict';
  const SOURCE='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records';
  const categories={gp:'Game',pts:'Point',g:'Goal',a:'Assist',potg:'POTG'};
  function isoDay(raw){
    if(typeof raw!=='string'||!/^20\d\d-\d\d-\d\d$/.test(raw))throw Error('INVALID_MILESTONE_DATE');
    const date=new Date(raw+'T12:00:00Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==raw)throw Error('INVALID_MILESTONE_DATE');
    return date;
  }
  function label(day){
    return isoDay(day).toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
  }
  function playerName(raw){
    if(typeof raw!=='string'||!raw.includes(', ')||raw.split(', ').length!==2)throw Error('UNVERIFIED_PLAYER_NAME');
    const [last,first]=raw.split(', ');
    if(!/^[\p{L}][\p{L} .'-]*$/u.test(last)||!/^[\p{L}][\p{L} .'-]*$/u.test(first))throw Error('UNVERIFIED_PLAYER_NAME');
    return first+' '+last;
  }
  function verify(watch,history){
    if(!watch||watch.schema!=='brave-hc-workbook-watch/v2'
      ||watch.dataStatus!=='HISTORICAL_WORKBOOK_SNAPSHOT'
      ||watch.sourceValidated!==false||watch.recordWatchComplete!==false
      ||watch.recordsDataStatus!=='VERIFIED_SUPPORTED_CATEGORIES_PARTIAL'
      ||watch.verifiedRecordScope?.status!=='VERIFIED_SUPPORTED_CATEGORIES_ONLY'
      ||!Array.isArray(watch.records)||!Array.isArray(watch.verifiedStreakHistory))
      throw Error('WATCH_IS_NOT_REVIEWED_HISTORICAL_SNAPSHOT');
    if(!history||history.schema!=='brave-hc-hto-history-snapshot/v1'
      ||history.type!=='records'||history.source?.authority!=='OFFICIAL_HTO_PUBLIC_READBACK'
      ||history.source.url!==SOURCE||!Array.isArray(history.groups))
      throw Error('HTO_RECORD_ARCHIVE_AUTHORITY_INVALID');
    const count=history.groups.reduce((total,g)=>{
      if(g===null||!Array.isArray(g.items)||g.items.some(x=>typeof x!=='string'))throw Error('INVALID_HISTORICAL_RECORD_LINES');
      return total+g.items.length;
    },0);
    if(count<1||count!==history.entryCount)throw Error('HTO_RECORD_ARCHIVE_INCOMPLETE');
    const viewed=isoDay(watch.latestOfficialCompletedGameDate);
    const recordAsOf=isoDay(watch.recordAsOf);
    if(recordAsOf>viewed)throw Error('WATCH_SOURCE_CHRONOLOGY_INVALID');
    const capture=new Date(history.capturedAt), exported=new Date(watch.exportedAt);
    if(!Number.isFinite(capture.getTime())||!Number.isFinite(exported.getTime()))throw Error('HISTORICAL_CAPTURE_TIMESTAMP_INVALID');
    const results=[], seen=new Set();
    for(const entry of watch.records){
      if(entry?.type!=='reached'||!Number.isInteger(entry.threshold)||entry.threshold<1
        ||!Object.hasOwn(categories,entry.category)||typeof entry.player!=='string')
        throw Error('UNSUPPORTED_MILESTONE_IN_SNAPSHOT');
      const name=playerName(entry.player),date=isoDay(entry.eventDate);
      if(date>viewed||date>recordAsOf)throw Error('MILESTONE_AFTER_RECORDED_SOURCE');
      const title=entry.threshold+' '+categories[entry.category]+' Club';
      const display=name+' ('+label(entry.eventDate)+')';
      const matching=history.groups
        .filter(g=>g.section==='Individual Records'&&g.category===title&&g.period==='Career')
        .flatMap(g=>g.items.filter(x=>/^\d+ - /.test(x)&&x.slice(x.indexOf(' - ')+3)===display));
      if(matching.length!==1)throw Error('MILESTONE_NOT_UNIQUELY_IN_HTO_RECORDS');
      const key=title+'|'+display;
      if(seen.has(key))throw Error('DUPLICATE_MILESTONE');
      seen.add(key);
      results.push(Object.freeze({name,title,date:entry.eventDate,publishedText:matching[0]}));
    }
    results.sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name));
    return Object.freeze({
      state:'HTO_PUBLISHED_HISTORICAL_RECORD_MATCH',
      entries:Object.freeze(results),
      latestRecordedGame:watch.latestOfficialCompletedGameDate,
      capturedAt:history.capturedAt,
      watchExportedAt:watch.exportedAt,
      authoritativeUrl:SOURCE,
      workbookCurrent:false,
      freshGameFeedVerified:false,
      publicWatchFullyVerified:false
    });
  }
  return Object.freeze({verify});
})();
if(typeof module==='object'&&module.exports)module.exports=BraveWatchEvidence;
