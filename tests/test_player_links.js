'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.resolve(__dirname,'../widgets/player-links.js'),'utf8');
const sandbox = {URL};
vm.runInNewContext(code,sandbox,{filename:'player-links.js'});
const links = sandbox.BravePlayerLinks;
test('HTO profile resolution uses verified team-specific player IDs',()=>{
 for(const [name,id] of [
  ['Adam Brutto',354054],['Justin Carosi',354060],['Mario Provenzano',354045],
  ['Michael Provenzano',686216],['Adam Kober',736317],['Dev Leong',776208],
  ['Andrew Cristillo',634098],['Damian Pavaday',849368],['Stefano Mazzei',595514]
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
 for(const name of ['M. Provenzano','Adam','Carosi','Unknown, Johnny','Unknown, Christopher','']) assert.equal(links.profileUrl(name),null);
});
// The public verified registry was expanded from 51 to 109 distinct identities on 2026-10-20.
test('Season filter uses HTO profile; unverified game ID does not create game link',()=>{
 const url=links.profileUrl('Alex Pagnotta');
 assert.equal(links.resolve('Alex Pagnotta',{season:'Winter 2014/15'}),url+'&pageLoad=ProfileTabStats&viewseas=Winter_2014/2015');
 assert.equal(links.resolve('Alex Pagnotta',{gameID:3375601}),url);
 assert.equal(links.knownPlayers,109);
});
test('Every active public HockeyOS page loads the shared linker',()=>{
 for(const file of [
  'analytics.html','watch-v2.html','home-panels.html',
  'awards-races.html','awards-races-v3.html',
  'awards-races-preview.html','hot-stove.html','hot-stove-review.html',
  'hot-stove-teaser.html','goalie-manager-v1.2.html','countdown.html',
  'index.html','preview.html'
 ]) {
  const html=fs.readFileSync(path.resolve(__dirname,'../widgets',file),'utf8');
  assert.match(html,/<script defer src="\.\/player-links\.js\?v=3"><\/script>/,file);
 }
});

test('Legacy projection and standings routes reach the linked canonical panel',()=>{
 const read=file=>fs.readFileSync(path.resolve(__dirname,'../widgets',file),'utf8');
 for(const [file,panel] of [['projection-v2.html','projection'],['standings-v2.html','standings']]){
  const html=read(file),base='https://example.test/brave-hc/widgets/'+file;
  const expected=new URL('./home-panels.html?panel='+panel+'&full=1',base).href;
  // All three supported navigation paths must agree, including no-JavaScript fallback.
  const refresh=html.match(/<meta\s+http-equiv="refresh"\s+content="0;\s*url=([^"]+)"/i);
  const fallback=html.match(/<a\s+href="([^"]+)"/i);
  assert.ok(refresh,file+' refresh');assert.ok(fallback,file+' fallback link');
  assert.equal(new URL(refresh[1].replaceAll('&amp;','&'),base).href,expected);
  assert.equal(new URL(fallback[1].replaceAll('&amp;','&'),base).href,expected);
  const navigations=[];
  for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){
   vm.runInNewContext(script[1],{URL,location:{href:base,replace:url=>navigations.push(url)}},{timeout:1000});
  }
  assert.deepEqual(navigations,[expected],file+' JavaScript redirect');
  assert.match(read('home-panels.html'),/<script defer src="\.\/player-links\.js\?v=3"><\/script>/);
 }
});

test('HTO season-specific profile deep links use live verified season selector values',()=>{
 const base=links.profileUrl('Justin Carosi');
 for (const season of ['Winter 2025/26','Winter_2025/2026','Winter 2025/2026']) {
   assert.equal(links.resolve('Justin Carosi',{season}),base+'&pageLoad=ProfileTabStats&viewseas=Winter_2025/2026');
 }
 assert.equal(links.resolve('Justin Carosi',{season:'Summer 2016'}),base+'&pageLoad=ProfileTabStats&viewseas=Summer_2016');
 assert.equal(links.resolve('Justin Carosi',{season:'Winter 2025/2029'}),base);
 assert.equal(links.resolve('Stefano Mazzei',{season:'Winter 2026/27'}),links.profileUrl('Stefano Mazzei')+'&pageLoad=ProfileTabStats&viewseas=Winter_2026/2027');
});
test('Game-specific links require an official HTO box-score URL',()=>{
 const exact='https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID=3375601';
 assert.equal(links.resolve('Justin Carosi',{season:'Winter 2026/27',gameUrl:exact}),exact);
 for (const gameUrl of [
  'https://evil.example.org/teams/default.asp?u=BRAVESHOCKEY&p=boxscore&gameID=3375601',
  'https://www.htosports.com/teams/default.asp?u=DIFFERENT&s=hockey&p=boxscore&gameID=3375601',
  'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&gameID=3375601',
  'https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&gameID=bad'
 ])assert.equal(links.resolve('Justin Carosi',{gameUrl}),links.profileUrl('Justin Carosi'));
});

test('Unique HTO initial-and-surname player abbreviations resolve; duplicate initials do not',()=>{
 assert.equal(links.profileUrl('J. Carosi'),links.profileUrl('Justin Carosi'));
 assert.equal(links.profileUrl('A. Pagnotta'),links.profileUrl('Alex Pagnotta'));
 assert.equal(links.profileUrl('S. Saindon'),links.profileUrl('Stephane Saindon'));
 assert.equal(links.profileUrl('M. Provenzano'),null);
 assert.equal(links.profileUrl('P. Unknown'),null);
});

test('HTO native click handlers remain protected from nested links',()=>{
 // Complements live browser QA on 25 roster rows and 225 onclick cells.
 assert.match(code,/el\.classList\.contains\('playerRow'\)/);
 assert.match(code,/el\.classList\.contains\('nameLabel'\)/);
 assert.match(code,/el\.hasAttribute\('onclick'\)/);
 assert.match(code,/el\.getAttribute\('role'\) === 'link'/);
});

test('Historical Records and Awards players resolve to exact official HTO player IDs',()=>{
 const alumni=[
  ['Andrew Buchanan',453662],['Andrew Pozzebon',618956],['Anthony Guerra',453661],
  ['Ben Sherritt',354285],['Cameron Buchanan',354049],['Carmine Cerrone',376086],
  ['Damian Aidemirski',354051],['Daniel Buzzelli',354062],['David Corasaniti',652571],
  ['Dylan Brennan',525407],['Jeff Micheli',354053],['Julian Kercz',382708],
  ['Kourosh Adeli',733003],['Lucas Brutto',354042],['Luke Leddy',354063],
  ['Mark Arruda',612364],['Mark Pastore',354061],['Medi Brancatella',763309],
  ['Michael Congiusti',354059],['Neil Baghel',355501],['Ryan Finlay',399966],
  ['Ryan Logue',354046],['Stephen Keane',533806],['Will Cawkell',378632],
  ["Xav O'Krafka",426873],['Zach Kercz',383322]
 ];
 assert.equal(alumni.length,26);
 for(const [name,id] of alumni){
  const link=links.profileUrl(name);
  assert.equal(new URL(link).searchParams.get('playerID'),String(id),name);
 }
 assert.equal(links.knownPlayers,109);
});
test('Shared-name ambiguity remains safely unresolved after adding alumni',()=>{
 assert.equal(links.profileUrl('M. Provenzano'),null);
 assert.equal(links.profileUrl('M. Congiusti'),null);
 assert.equal(links.profileUrl('A. Buchanan'),links.profileUrl('Andrew Buchanan'));
 assert.equal(links.profileUrl('R. Logue'),links.profileUrl('Ryan Logue'));
 assert.equal(links.profileUrl('Rènt Goaliê'),null);
 assert.equal(links.profileUrl('Unknown, Johnny'),null);
});
