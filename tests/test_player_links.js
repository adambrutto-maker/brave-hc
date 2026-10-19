'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.resolve(__dirname,'../widgets/player-links.js'),'utf8');
const sandbox = {};
vm.runInNewContext(code,sandbox,{filename:'player-links.js'});
const links = sandbox.BravePlayerLinks;
test('HTO profile resolution uses verified team-specific player IDs',()=>{
 for(const [name,id] of [
  ['Adam Brutto',354054],['Justin Carosi',354060],['Mario Provenzano',354045],
  ['Michael Provenzano',686216],['Adam Kober',736317],['Dev Leong',776208],
  ['Andrew Cristillo',634098],['Damian Pavaday',849368]
 ]) {
  const url = links.profileUrl(name);
  assert.ok(url);
  const u = new URL(url);
  assert.equal(u.hostname,'www.htosports.com');
  assert.equal(u.searchParams.get('p'),'profile');
  assert.equal(u.searchParams.get('u'),'BRAVESHOCKEY');
  assert.equal(u.searchParams.get('playerID'),String(id));
 }
});
test('Reverse-name, case and spaces map to one player',()=>{
 assert.equal(links.profileUrl('CAROSI, JUSTIN'),links.profileUrl('Justin Carosi'));
 assert.equal(links.profileUrl('Justin\u00a0Carosi'),links.profileUrl('Justin Carosi'));
 assert.equal(links.profileUrl('Brutto, Adam'),links.profileUrl('Adam Brutto'));
});
test('Ambiguous, incomplete or unverified names never get speculative profiles',()=>{
 for(const name of ['M. Provenzano','Adam','Carosi','Unknown, Johnny','Stefano Mazzei','']) assert.equal(links.profileUrl(name),null);
});
test('Unsupported season/game deep links use verified main HTO profile',()=>{
 const url=links.profileUrl('Alex Pagnotta');
 assert.equal(links.resolve('Alex Pagnotta',{season:'Winter 2014/15'}),url);
 assert.equal(links.resolve('Alex Pagnotta',{gameID:3375601}),url);
 assert.equal(links.knownPlayers,24);
});
test('Every active public HockeyOS page loads the shared linker',()=>{
 for(const file of [
  'analytics.html','projection-v2.html','watch-v2.html','home-panels.html',
  'standings-v2.html','awards-races.html','awards-races-v3.html',
  'awards-races-preview.html','hot-stove.html','hot-stove-review.html',
  'hot-stove-teaser.html','goalie-manager-v1.2.html','countdown.html',
  'index.html','preview.html'
 ]) {
  const html=fs.readFileSync(path.resolve(__dirname,'../widgets',file),'utf8');
  assert.match(html,/<script defer src="\.\/player-links\.js\?v=1"><\/script>/,file);
 }
});
