'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'../widgets');
const {validate}=require('../widgets/game-centre-mobile-lineup.js');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'game-centre-lineup-public.json')));
const source=fs.readFileSync(path.join(root,'assets/lineups/game-367-2026-11-22-working.lineup.json'));
const c=JSON.parse(source),e=manifest.publishedWorkingCard;
const fx={id:3375686,gameDate:'2026-11-22',opponent:'Dateline Predators'};
const model=validate(c,e,fx);
test('mobile text contract matches published PDF and exact JSON SHA256',()=>{
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),e.lineupJsonSHA256);
 assert.equal(c.pdf.sha256,e.sha256);
 assert.equal(c.png.sha256,e.previewSHA256);
 assert.ok(model);
 assert.equal(model.skaters,13);
});
test('captain paired wings, rotating centres and fifth defenceman remain intact',()=>{
 assert.deepEqual(model.wingPairs.map(p=>p.map(x=>x.name)),[
  ['Mario Provenzano','Michael Provenzano'],
  ['Adam Povegliano','Jamie Rosenberg'],
  ['Keith Pearsoll','Damien Pavaday']]);
 assert.deepEqual(model.centres.map(p=>p.name),['Stephane Saindon','Justin Carosi']);
 assert.deepEqual(model.defencePairs.map(p=>p.map(x=>x?.name||null)),[
  ['Sanjay Rajkumar','Francesco Triumbari'],
  ['Adam Brutto','Alex Pagnotta'],
  ['Adam Kober',null]]);
 assert.equal(model.goalie.name,'Stephen Logue');
});
test('wrong fixture, goalie, privacy, or wrong source assets refuse readable release',()=>{
 const modified=(patch,mp=e)=>validate({...c,...patch},mp,fx);
 assert.equal(validate(c,e,{...fx,id:3375685}),null);
 assert.equal(validate(c,{...e,sha256:'a'.repeat(64)},fx),null);
 assert.equal(modified({privateWhatsAppGroupContentIncluded:true}),null);
 assert.equal(modified({namedPollVotesIncluded:true}),null);
 assert.equal(modified({userManagerApproved:false}),null);
 assert.equal(modified({goalie:{...c.goalie,name:'Unknown, Goalie',displayText:'#70 - Unknown, Goalie'}}),null);
 assert.equal(modified({forwards:[...c.forwards.slice(0,2),{...c.forwards[2],RW:c.forwards[1].RW}]}),null);
 assert.equal(modified({defence:[...c.defence.slice(0,2),{...c.defence[2],RD:c.defence[1].RD}]}),null);
});
test('both Game Centre entrypoints support secure readable presentation and printing',()=>{
 for(const page of ['game-centre-arena-r32.html','game-centre-next.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.match(html,/id="lineup-mobile" class="lineup-mobile"/);
  assert.match(html,/game-centre-mobile-lineup\.js\?v=/);
  assert.match(html,/data-public-working-lineup="1"/);
  assert.match(html,/id="lineup-pdf-preview"/);
  assert.match(html,/id="lineup-open"/);
 }
 const js=fs.readFileSync(path.join(root,'game-centre-next.js'),'utf8');
 assert.match(js,/BraveMobileLineup\?\.reset\(\)/);
 assert.match(js,/released&&managerFinalReady&&previewVerified/);
 assert.match(js,/BraveMobileLineup\?\.publish\(released,fix/);
 const css=fs.readFileSync(path.join(root,'game-centre-next.css'),'utf8');
 assert.match(css,/lineup-mobile-ready/);
 assert.match(css,/max-width:700px/);
});
