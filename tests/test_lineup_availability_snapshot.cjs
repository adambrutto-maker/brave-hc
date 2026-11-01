'use strict';
// Regression: attendance evidence stays in private HockeyOS workflows, never public Game Centre.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../widgets');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'game-centre-lineup-public.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'game-centre-arena-r32.html'),'utf8');
const js=fs.readFileSync(path.join(root,'game-centre-next.js'),'utf8');
const legacyFields=['skatersIndicatingIn','partTimersAvailable','attendanceSnapshot','confirmedSkaters','fullTimers','callupsConfirmed','callupsAwaitingReply'];
const verifySrc=js.slice(js.indexOf('function verifyPdfManifest('),js.indexOf('function validApprovedPdf('));
assert(verifySrc.startsWith('function verifyPdfManifest('));
const verify=vm.runInNewContext('('+verifySrc.trim()+')',{allowedPdfPath:x=>/^\.\/assets\/lineups\/[a-z0-9][a-z0-9_/-]*\.pdf$/.test(x)&&!x.includes('..')});
test('pre-game availability section and source note are absent from the public R3.2 lineup UI',()=>{
 assert.equal(html.includes('id="lineup-attendance"'),false);
 assert.equal(html.includes('NEXT GAME · PLAYER AVAILABILITY'),false);
 assert.equal(html.includes('Pregame availability'),false);
 assert.equal(html.includes('A part-timer is not added'),false);
 assert.equal(html.includes('Official Team Roster ↗'),false);
 assert.equal(html.includes('class="pdf-fallback"'),false);
 assert.equal(js.includes('drawAttendanceSummary('),false);
 assert.equal(js.includes('function attendanceForFixture('),false);
 assert.equal(js.includes('PREGAME AVAILABILITY'),false);
 assert.match(html,/id="lineup-card"/);
 assert.match(html,/id="lineup-print"/);
 assert.match(html,/id="lineup-open"/);
});
test('public lineup JSON contains no RSVP tally, callup counts, or personal absence details',()=>{
 assert.equal(Object.hasOwn(manifest,'attendanceSnapshot'),false);
 for(const key of legacyFields){
  assert.equal(Object.hasOwn(manifest.publishedWorkingCard||{},key),false,key);
 }
 const raw=JSON.stringify(manifest);
 for(const term of ['Brutto, Adam','illness','sick','personal absence','Adam is out','adam.brutto@gmail.com'])
  assert.equal(raw.toLowerCase().includes(term.toLowerCase()),false,term);
 assert.equal(manifest.privateWhatsAppPollDataPublished,false);
 assert.equal(manifest.weeklyAutoPublishEnabled,false);
});
test('public manifest accepts only card-only data and rejects accidental re-publication of poll counts',()=>{
 assert.equal(verify(manifest),manifest);
 assert.throws(()=>verify({...manifest,attendanceSnapshot:{skatersIndicatingIn:10,partTimersAvailable:1}}));
});
