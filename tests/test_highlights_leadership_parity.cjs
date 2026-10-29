'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const modulePath='../widgets/player-highlights-leadership-parity.js';
const parity=require(modulePath),root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,'widgets',file),'utf8');
const source=JSON.parse(read('player-bio-leadership.json'));
const ledger=JSON.parse(read('player-highlights-ledger.json'));
test('13 documented tenure records pass explicit source/identity and duration validation',()=>{
  assert.equal(parity.validateSource(source,ledger).status,'VERIFIED');
  assert.equal(source.items.length,13);
  const ids=new Set(source.items.map(x=>String(x.htoPlayerID)));
  assert.equal(ids.size,9);
  for(const item of source.items){
    assert.equal(ledger.players[String(item.htoPlayerID)].name,item.player);
    assert.ok(['Team Captain','Assistant Captain','Team Player Coach'].includes(parity.roleOf(item.text)));
    assert.equal(item.status,'SOURCE_DOCUMENTED');
  }
});
test('Dylan Brennan captaincy 2018–2019 appears once without inventing a new elected award',()=>{
  const raw=ledger.players['525407'],serialized=JSON.stringify(raw);
  const joined=parity.enrichRecord(raw,source,ledger);
  const service=joined.items.filter(x=>x.recordType==='SERVICE_TENURE_NOT_ELECTION');
  assert.equal(service.length,1);
  assert.equal(service[0].sourceText,'Team Captain - 2018 to 2019');
  assert.equal(service[0].officialPlayerId,'525407');
  assert.equal(service[0].category,'leadership');
  assert.equal(service[0].sourceRole,'Team Captain');
  assert.equal(service[0].publication,'PRESENTATION_ONLY_EXISTING_TEAM_SERVICE_HISTORY');
  assert.equal(service[0].provenance,'VERIFIED_PUBLIC_HTO_BIO_LEADERSHIP');
  assert.equal(joined.items.length,raw.items.length+1);
  assert.equal(raw.originalCount,7);
  assert.equal(JSON.stringify(raw),serialized);
  assert.ok(!joined.items.some(x=>x.id.startsWith('hto-legacy-525407-')&&/captain/i.test(x.sourceText)));
});
test('all documented leader tenures appear under matching immutable HTO identities',()=>{
  const tally={};
  for(const [id,record] of Object.entries(ledger.players)){
    const before=JSON.stringify(record);
    const joined=parity.enrichRecord(record,source,ledger);
    const n=joined.items.filter(x=>x.recordType==='SERVICE_TENURE_NOT_ELECTION').length;
    const expected=source.items.filter(x=>String(x.htoPlayerID)===id).length;
    assert.equal(n,expected,id);
    assert.equal(record.originalCount,joined.originalCount,id);
    assert.deepEqual(joined.items.slice(0,record.items.length),record.items,id);
    assert.equal(JSON.stringify(record),before,id);
    if(n)tally[id]=n;
  }
  assert.equal(Object.values(tally).reduce((a,b)=>a+b,0),13);
  assert.equal(Object.keys(tally).length,9);
});
test('Election achievements remain distinct from captaincy tenure',()=>{
  for(const id of ['354054','354285','354061']){
    const raw=ledger.players[id],view=parity.enrichRecord(raw,source,ledger);
    for(const election of raw.items.filter(x=>/Elected.*Captain/i.test(x.sourceText))){
      assert.ok(view.items.some(x=>x.id===election.id&&x.sourceText===election.sourceText));
    }
    assert.ok(view.items.some(x=>x.recordType==='SERVICE_TENURE_NOT_ELECTION'));
  }
});
test('Founder-confirmed leadership has explicit provenance and never becomes an elected award',()=>{
  const source2=source.items.filter(x=>x.source==='FOUNDER_CONFIRMED');
  assert.equal(source2.length,2);
  for(const item of source2){
    const id=String(item.htoPlayerID),view=parity.enrichRecord(ledger.players[id],source,ledger);
    const present=view.items.find(x=>x.sourceText===item.text);
    assert.equal(present.provenance,'TEAM_MANAGEMENT_CONFIRMED_LEADERSHIP');
    assert.equal(present.recordType,'SERVICE_TENURE_NOT_ELECTION');
  }
});
test('Modified identity, duplicate, invented role or unapproved publication state holds instead of misattributing a captain',()=>{
  const broken=[
    (()=>{let x=structuredClone(source);x.items.find(x=>x.player==='Dylan Brennan').htoPlayerID=354285;return x})(),
    (()=>{let x=structuredClone(source);x.items.push(structuredClone(x.items[0]));return x})(),
    (()=>{let x=structuredClone(source);x.items[0].text='Elected Team Captain - 2022 to Present';return x})(),
    (()=>{let x=structuredClone(source);x.items[0].status='UNVERIFIED';return x})(),
    (()=>{let x=structuredClone(source);x.items[0].source='UNAPPROVED';return x})(),
    {...source,schema:'not-HTO'},
    {...source,items:[]},
  ];
  for(const x of broken){
    assert.equal(parity.validateSource(x,ledger).status,'HELD');
    const raw=ledger.players['525407'];
    assert.strictEqual(parity.enrichRecord(raw,x,ledger),raw);
  }
});
test('Supplement is presentation-only; both native HTO source JSON files stay byte-for-byte unchanged',()=>{
  const files=['player-highlights-ledger.json','player-bio-leadership.json'];
  const before=files.map(x=>crypto.createHash('sha256').update(read(x)).digest('hex'));
  const merged=parity.enrichRecord(ledger.players['525407'],source,ledger);
  assert.ok(merged.items.some(x=>x.category==='leadership'));
  const after=files.map(x=>crypto.createHash('sha256').update(read(x)).digest('hex'));
  assert.deepEqual(after,before);
});
