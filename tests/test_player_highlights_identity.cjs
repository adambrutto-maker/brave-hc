'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../widgets/player-links.js'),'utf8');
const scope={URL};vm.runInNewContext(code,scope);
const links=scope.BravePlayerLinks;
test('Three existing Brave H.C. HTO identities have exact URLs for shared widget',()=>{
 for(const [id,name] of [[354054,'Adam Brutto'],[354060,'Justin Carosi'],[776208,'Dev Leong']]){
  const identity=links.identityById(id);
  assert.equal(identity?.name,name);
  assert.equal(identity?.playerID,id);
  assert.equal(new URL(links.profileUrl(name)).searchParams.get('playerID'),String(id));
 }
});
test('New HTO player names require independent identity verification',()=>{
 for(const bad of [0,-5,999999999,'not-an-id',null])assert.equal(links.identityById(bad),null);
});
test('Original HTO highlights remain immutable and in order',()=>{
 const ledger=JSON.parse(fs.readFileSync(path.join(__dirname,'../widgets/player-highlights-ledger.json'),'utf8'));
 assert.equal(ledger.schema,'brave-hc-player-highlights/v1');
 assert.deepEqual(Object.keys(ledger.players).sort(),['354054','354060']);
 assert.equal(ledger.players['354054'].items.length,16);
 assert.equal(ledger.players['354060'].items.length,25);
 assert.equal(ledger.players['354054'].items.filter(x=>x.sourceEmphasis).length,3);
 assert.equal(ledger.players['354060'].items.filter(x=>x.sourceEmphasis).length,2);
 const typo=ledger.players['354054'].items.filter(x=>/Decidation/.test(x.sourceText));
 assert.equal(typo.length,2);
 assert.ok(typo.every(x=>/Dedication/.test(x.displayText)));
 assert.equal(ledger.players['354060'].items[0].sourceText,'300 Game Club - September 20, 2026');
 assert.equal(ledger.players['354054'].items[0].sourceText,'Bill Masterton Award for Dedication - Winter 2024/25');
 for(const [id,entry] of Object.entries(ledger.players)){
   assert.equal(entry.originalCount,entry.items.length);
   assert.ok(entry.items.every((item,i)=>item.sourceOrder===i&&item.provenance==='EXISTING_NATIVE_HTO_HIGHLIGHTS'),id);
 }
});
