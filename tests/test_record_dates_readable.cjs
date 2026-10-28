'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('widgets/history.js','utf8');
const start=code.indexOf('const shortRecordDate=');
const end=code.indexOf('function validate(',start);
assert(start>0&&end>start);
const ctx={};vm.runInNewContext(code.slice(start,end)+'\nthis.format=shortRecordDate;',ctx);
const show=ctx.format;
assert.equal(show('7 - Mark Pastore (July 5, 2015)'),'7 - Mark Pastore (Jul 5, 2015)');
assert.equal(show('September 2, 2026'),'Sep 2, 2026');
assert.equal(show('14 - Brave H.C. (Oct 29, 2017 - Feb 11, 2018)'),
 '14 - Brave H.C. (Oct 29, 2017 - Feb 11, 2018)');
assert.equal(show('2 - Ben Sherritt (2014)'),'2 - Ben Sherritt (2014)');
assert(!show('2 - Ben Sherritt (2014)').includes('Jan '));
assert(code.includes("state.view==='records'?shortRecordDate(item):item"),
 'Only source-backed Records display should be transformed, not Awards');
console.log('PASS readable calendar-date rendering, year-only preserved, source data unchanged');
