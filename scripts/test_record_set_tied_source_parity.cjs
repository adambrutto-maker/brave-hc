// Verify gold RECORD SET and silver RECORD TIED labels against the immutable
// official HTO Records source and 230 source-mapped player entries.
// "Set" = unique listed mark at the exact category/scope/value; "Tied" =
// shared listed mark. Neither implies first chronological setter or top rank.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const history=JSON.parse(fs.readFileSync('widgets/history-records.json','utf8'));
const book=JSON.parse(fs.readFileSync('widgets/player-record-book.json','utf8'));
const code=fs.readFileSync('widgets/player-highlights-v2.js','utf8');
const a=code.indexOf('function resolveOfficialRecordMarkEvidence(');
const b=code.indexOf('function inventoryCard(',a);
assert(a>0&&b>a);
const context=vm.createContext({});
vm.runInContext(code.slice(a,b)+'\nthis.build=resolveOfficialRecordMarkEvidence;this.mark=classifyVerifiedRecordMark;this.label=recordMarkLabel;this.marker=recordMarkClass;',context);
const evidence=context.build(book,history);
assert(evidence,'Official HTO category/scope grouping not compatible with player book');
const stat={set:0,tied:0,unverified:0};
const retained={};
for(const [pid,p]of Object.entries(book.players)){
 for(const entry of p.entries){
  const source=evidence.groups.get(JSON.stringify(['Individual Records',entry.category,entry.scope]));
  assert(source);
  assert.equal(source.names.get(entry.sourceText),1,entry.sourceText);
  const mark=context.mark(entry,evidence);
  assert(mark.status==='set'||mark.status==='tied');
  assert.equal(mark.count,source.marks.get(entry.value));
  assert.equal(context.label({...entry,recordMark:mark.status}),mark.status==='set'?'RECORD SET':'RECORD TIED');
  assert(context.marker({...entry,recordMark:mark.status}).includes('ph-record-'+mark.status));
  stat[mark.status]++;
  (retained[pid]??=[]).push(mark.status);
 }
}
assert.deepEqual(stat,{set:82,tied:148,unverified:0});
for(const [why,source,entry] of [
 ['missing history',null,book.players['354041'].entries[0]],
 ['stale snapshot',{...history,capturedAt:'1999-01-01T00:00:00Z'},book.players['354041'].entries[0]],
 ['changed source url',{...history,source:{...history.source,url:'https://not-official.example/'}},book.players['354041'].entries[0]],
 ['different source count',{...history,entryCount:462},book.players['354041'].entries[0]]
]){
 const off=context.build(book,source);
 assert.equal(off,null,why);
 assert.equal(context.mark(entry,off).status,'unverified');
 assert.equal(context.label({recordMark:'unverified'}),'RECORD MARK');
}
const altered={...book.players['354041'].entries[0],sourceText:'2 - Invented player (Jan 1, 2030)'};
assert.equal(context.mark(altered,evidence).status,'unverified');
const wrongGroup={...book.players['354041'].entries[0],scope:'Season'};
assert.equal(context.mark(wrongGroup,evidence).status,'unverified');
const wrongValue={...book.players['354041'].entries[0],value:'9999'};
assert.equal(context.mark(wrongValue,evidence).status,'unverified');
assert.equal(book.schema,'brave-hc-player-record-book/v1');
assert.equal(history.entryCount,463);
const benchmark=Object.values(book.players).reduce((acc,p)=>acc+p.entries.length,0);
assert.equal(benchmark,230);
console.log(JSON.stringify({status:'PASS_HTO_RECORD_SET_TIED_SOURCE_PARITY',sourceRows:history.entryCount,
 recordGroups:history.groups.length,verifiedMapped:benchmark,...stat,
 historicalSourceFilesEdited:false},null,2));
