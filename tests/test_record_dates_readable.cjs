'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('widgets/history.js','utf8');
const start=code.indexOf('const shortRecordDate=');
const end=code.indexOf('function validate(',start);
assert(start>0&&end>start);
const ctx={Date,Object,Number,String};
vm.runInNewContext(code.slice(start,end)+'\nthis.format=shortRecordDate;',ctx);
const show=ctx.format;
assert.equal(show('7 - Mark Pastore (July 5, 2015)'),'7 - Mark Pastore (Jul 5, 2015)');
assert.equal(show('September 2, 2026'),'Sep 2, 2026');
assert.equal(show('9 - vs. Opposition (8-0) (2024-12-01)'),
 '9 - vs. Opposition (8-0) (Dec 1, 2024)');
assert.equal(show('14 - Brave H.C. (Oct 29, 2017 - Feb 11, 2018)'),
 '14 - Brave H.C. (Oct 29, 2017 - Feb 11, 2018)');
assert.equal(show('2 - Ben Sherritt (2014)'),'2 - Ben Sherritt (2014)');
assert.equal(show('HTO record (2025-02-29)'),'HTO record (2025-02-29)',
 'Invalid calendar dates must never be corrected or guessed');
assert.equal(show('HTO record (2024-02-29)'),'HTO record (Feb 29, 2024)');
assert(code.includes("state.view==='records'?shortRecordDate(item):item"),
 'Only display must be transformed, preserving source feed and Awards');
console.log('PASS native HTO ISO dates rendered as readable months, exact source/year only unchanged');
