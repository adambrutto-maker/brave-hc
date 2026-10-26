'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const verify=require('../widgets/watch-evidence.js').verify;
const widgets=path.resolve(__dirname,'../widgets');
const watch=JSON.parse(fs.readFileSync(path.join(widgets,'watch.json'),'utf8'));
const history=JSON.parse(fs.readFileSync(path.join(widgets,'history-records.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
test('two historical milestone entries have one matching published HTO record each',()=>{
 const r=verify(watch,history);
 assert.equal(r.state,'HTO_PUBLISHED_HISTORICAL_RECORD_MATCH');
 assert.deepEqual(r.entries.map(p=>p.name),['Michael Provenzano','Justin Carosi']);
 assert.deepEqual(r.entries.map(p=>p.title),['50 Point Club','300 Game Club']);
 assert.deepEqual(r.entries.map(p=>p.date),['2026-09-27','2026-09-20']);
 assert.equal(r.publicWatchFullyVerified,false);
 assert.equal(r.workbookCurrent,false);
 assert.equal(r.freshGameFeedVerified,false);
 assert.equal(r.latestRecordedGame,'2026-10-25');
 assert.equal(r.countdownArithmeticChecks,2);
});
test('a current-workbook claim is outside the approved historic snapshot contract',()=>{
 const d=clone(watch);d.dataStatus='VERIFIED_CURRENT';
 assert.throws(()=>verify(d,history),/WATCH_IS_NOT_REVIEWED_HISTORICAL_SNAPSHOT/);
});
test('sourceValidated flag cannot be upgraded without a distinct release',()=>{
 const d=clone(watch);d.sourceValidated=true;
 assert.throws(()=>verify(d,history),/WATCH_IS_NOT_REVIEWED_HISTORICAL_SNAPSHOT/);
});
test('wrong HTO source URL is withheld',()=>{
 const h=clone(history);h.source.url='https://example.com/records';
 assert.throws(()=>verify(watch,h),/HTO_RECORD_ARCHIVE_AUTHORITY_INVALID/);
});
test('missing published record is withheld, not silently omitted',()=>{
 const h=clone(history);const grp=h.groups.find(g=>g.category==='300 Game Club'&&g.period==='Career');
 grp.items=grp.items.filter(v=>!v.includes('Justin Carosi'));h.entryCount--;
 assert.throws(()=>verify(watch,h),/MILESTONE_NOT_UNIQUELY_IN_HTO_RECORDS/);
});
test('changed milestone date cannot be inferred from archive entries',()=>{
 const d=clone(watch);d.records.find(x=>x.type==='reached').eventDate='2026-09-21';
 assert.throws(()=>verify(d,history),/MILESTONE_NOT_UNIQUELY_IN_HTO_RECORDS/);
});
test('falsely enlarged archive count is rejected',()=>{
 const h=clone(history);h.entryCount++;
 assert.throws(()=>verify(watch,h),/HTO_RECORD_ARCHIVE_INCOMPLETE/);
});
test('unsupported award/stat category cannot be turned into milestone',()=>{
 const d=clone(watch);d.records.find(x=>x.type==='reached').category='salary';
 assert.throws(()=>verify(d,history),/UNSUPPORTED_MILESTONE_IN_SNAPSHOT/);
});
test('duplicate milestones are rejected',()=>{
 const d=clone(watch);d.records.push(clone(d.records.find(x=>x.type==='reached')));
 assert.throws(()=>verify(d,history),/DUPLICATE_MILESTONE/);
});
test('future dated unsupported milestone is rejected',()=>{
 const d=clone(watch);d.records.find(x=>x.type==='reached').eventDate='2026-10-26';
 assert.throws(()=>verify(d,history),/MILESTONE_AFTER_RECORDED_SOURCE/);
});
test('historical source capture timestamp cannot be missing',()=>{
 const h=clone(history);h.capturedAt='not-a-timestamp';
 assert.throws(()=>verify(watch,h),/HISTORICAL_CAPTURE_TIMESTAMP_INVALID/);
});
test('countdowns cannot be treated as reached milestones without HTO record evidence',()=>{
 const d=clone(watch);const cd=d.records.find(x=>x.type==='countdown');
 cd.type='reached';cd.eventDate='2026-10-25';
 assert.throws(()=>verify(d,history),/MILESTONE_NOT_UNIQUELY_IN_HTO_RECORDS/);
});
test('countdown remaining games must equal threshold less recorded career total',()=>{
 const d=clone(watch);const cd=d.records.find(x=>x.type==='countdown');
 cd.remaining++;
 assert.throws(()=>verify(d,history),/INVALID_NONREACHED_COUNTDOWN/);
});
test('duplicate countdowns cannot replace distinct source candidates',()=>{
 const d=clone(watch);d.records.push(clone(d.records.find(x=>x.type==='countdown')));
 assert.throws(()=>verify(d,history),/DUPLICATE_COUNTDOWN/);
});
test('source files unchanged and no HTO identifiers inferred',()=>{
 const r=verify(watch,history);
 assert.equal(r.entries.length,2);
 assert.ok(r.authoritativeUrl.includes('p=records'));
 assert.ok(!r.entries.some(x=>'officialGameID' in x));
});
