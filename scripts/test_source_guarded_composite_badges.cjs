// Deterministic source-only presentation projection audit of exactly three
// previously combined HTO historical entries. Never create an award or edit data.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root='widgets/';
const ledger=JSON.parse(fs.readFileSync(root+'player-highlights-ledger.json','utf8'));
const source=fs.readFileSync(root+'player-highlights-v2.js','utf8');
const start=source.indexOf('const publishedCompositeBadgePreimages=');
// Source-slicing guard follows the function boundary, not its evolving argument list.
const end=source.indexOf('function renderLegacy(',start);
assert(start>0&&end>start);
const snippet=source.slice(start,end)+'\nthis.project=projectVerifiedCompositeBadges;';
function project(pid,record=ledger.players[pid]){
 const ctx=vm.createContext({playerId:Number(pid)});
 vm.runInContext(snippet,ctx);
 return ctx.project(record);
}
const cases=[
 {pid:'354058',name:'Alex Pagnotta',sourceId:'hto-legacy-354058-04',categories:['award','leadership'],
  fragments:['James Norris Award - Winter 2019/20','Elected Assistant Captain - Winter 2019/20'],
  extra:{milestones:0,honors:1}},
 {pid:'354062',name:'Daniel Buzzelli',sourceId:'hto-legacy-354062-03',categories:['milestone','championship'],
  fragments:['50 Game Club - September 23, 2018','SVHL Cup Champion - Winter 2012/13'],
  extra:{milestones:1,honors:0}},
 {pid:'652571',name:'David Corasaniti',sourceId:'hto-legacy-652571-01',categories:['award','award','award'],
  fragments:['Conn Smythe Award Playoff MVP - Winter 2019/20',
   'Hart Award Team MVP - Winter 2019/20','Rookie of the Year Award - Winter 2019/20'],
  extra:{milestones:0,honors:2}}
];
const originalJSON=JSON.stringify(ledger);
let originalRows=0,projectedRows=0,milestones=0,honours=0,disciplines=0;
const extraByPid=Object.fromEntries(cases.map(x=>[x.pid,x.fragments.length-1]));
for(const [pid,p]of Object.entries(ledger.players)){
 originalRows+=p.items.length;
 const derived=project(pid);
 const extra=extraByPid[pid]||0;
 assert.equal(derived.items.length,p.items.length+extra,pid);
 projectedRows+=derived.items.length;
 milestones+=derived.items.filter(x=>x.category==='milestone').length;
 honours+=derived.items.filter(x=>x.category!=='milestone'&&x.category!=='discipline').length;
 disciplines+=derived.items.filter(x=>x.category==='discipline').length;
 if(!extra)assert.deepEqual(JSON.parse(JSON.stringify(derived.items)),p.items,pid);
}
assert.deepEqual({originalRows,projectedRows,milestones,honours,disciplines},
 {originalRows:343,projectedRows:347,milestones:135,honours:209,disciplines:3});
for(const c of cases){
 const origin=ledger.players[c.pid];
 const sourceEntry=origin.items.find(x=>x.id===c.sourceId);
 assert(sourceEntry&&sourceEntry.category==='record',c);
 assert.equal(sourceEntry.sourceText,c.fragments.join('\n'));
 const view=project(c.pid);
 const segments=view.items.filter(x=>x.sourceRecordID===c.sourceId);
 assert.equal(segments.length,c.fragments.length);
 assert.deepEqual(Array.from(segments,x=>x.category),c.categories);
 assert.deepEqual(Array.from(segments,x=>x.sourceText),c.fragments);
 assert(segments.every(x=>x.presentationOnly&&x.sourceOrder>=sourceEntry.sourceOrder));
 assert(segments.every(x=>x.publication==='EXISTING_HTO_MANUAL_RECORD'));
 assert.equal(view.items.some(x=>x.id===c.sourceId),false);
 // Exact source guard: any stale altered text must remain unsplit, not acquire
 // an invented trophy or leadership badge. Same for name/ID/publication.
 for(const reason of ['text','name','publication']){
  const bad=structuredClone(origin);
  const item=bad.items.find(x=>x.id===c.sourceId);
  if(reason==='text'){item.sourceText+=' - wrong';item.displayText=item.sourceText;}
  if(reason==='name')bad.name='Wrong historical identity';
  if(reason==='publication')item.publication='UNVERIFIED';
  const v=project(c.pid,bad);
  assert.equal(v.items.length,bad.items.length);
  assert.equal(v.items.find(x=>x.id===c.sourceId).category,'record');
 }
 const wrongIdProject=project(cases.find(x=>x.pid!==c.pid).pid,origin);
 assert.equal(wrongIdProject.items.length,origin.items.length);
}
assert.equal(JSON.stringify(ledger),originalJSON);
assert(source.includes("const cardRecord=projectVerifiedCompositeBadges(record);"));
assert(source.includes("const container=$('legacy'),items=newestAchievements(record?.items||[])"),
 "Complete Achievement Timeline must still receive original 343 source records");
console.log(JSON.stringify({status:'PASS_EXACT_HTO_COMPOSITE_PRESENTATION_ONLY',
  originalHTORows:originalRows,visibleBadges:projectedRows,visibleMilestones:milestones,
  visibleHonors:honours,disciplinaryEntries:disciplines,compositeSources:3,
  generatedExtraBadges:projectedRows-originalRows,
  changedAuthoritativeRecords:0,failClosedNegativeCases:cases.length*3},null,2));
