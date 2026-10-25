const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.hidden=false;this.attributes={};this.own='';}
 set textContent(s){this.own=String(s??'');this.children=[];}
 get textContent(){return this.own+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 get childNodes(){return this.children;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.own='';this.children=[...children];}
 setAttribute(k,v){this.attributes[k]=v;}
}
const read=p=>fs.readFileSync(p,'utf8'),parse=p=>JSON.parse(read(p));
const ledger=parse('widgets/player-highlights-ledger.json'),career=parse('widgets/player-career-insights.json'),book=parse('widgets/player-record-book.json');
const corrections=parse('widgets/player-highlights-display-corrections.json');
const feeds={'player-highlights-ledger.json':ledger,'awards-participants.json':parse('widgets/awards-participants.json'),'player-career-insights.json':career,'player-record-book.json':book,'player-highlights-display-corrections.json':corrections};
const expectedCorrections={
 'hto-legacy-354046-06':{text:'100 Point Club - August 9, 2015',date:'2015-08-09'},
 'hto-legacy-354055-09':{text:'50 Game Club - July 27, 2014',date:'2014-07-27'},
 'hto-legacy-354060-19':{text:'100 Point Club - May 15, 2016',date:'2016-05-15'},
 'hto-legacy-354285-17':{text:'100 Point Club - November 13, 2016',date:'2016-11-13'}
};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const code=read('widgets/player-highlights-v2.js'),links=read('widgets/player-links.js');
async function render(id,overrides={}){
 const ids='playerName playerSub notice legacy careerSummary expand legacySection highsSection highs careerDate recordsSection records recordsSource currentSection form statsDate profileSource footer'.split(' ');
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 for(const id of ['notice','legacySection','highsSection','recordsSection','currentSection'])nodes[id].hidden=true;
 const context=vm.createContext({window:{},URL,URLSearchParams,Date,Number,String,Object,Array,Map,Promise,Error,console,location:{search:'?playerID='+id},document:{getElementById:id=>{assert(nodes[id],'missing element '+id);return nodes[id]},createElement:tag=>new Element(tag),createTextNode:s=>String(s)},fetch:async url=>({ok:true,json:async()=>freeze(structuredClone(Object.hasOwn(overrides,url.slice(2))?overrides[url.slice(2)]:feeds[url.slice(2)]))})});
 vm.runInContext(links,context);vm.runInContext(code,context);await new Promise(setImmediate);return nodes;
}
(async()=>{
 let profiles=0,highlights=0,records=0,corrected=0;
 assert.deepEqual(corrections.corrections.map(c=>[c.itemID,c.displayText,c.sortDate]),Object.entries(expectedCorrections).map(([id,c])=>[id,c.text,c.date]));
 for(const [id,p] of Object.entries(career.players)){
 const n=await render(id);assert.equal(n.playerName.textContent,p.name);assert(n.notice.hidden,id+' unexpected warning');
 const items=ledger.players[id]?.items||[];
 assert.equal(n.legacySection.hidden,items.length===0);
 assert.equal(n.legacy.children.length,Math.min(3,items.length));
 if(items.length>3)n.expand.onclick();
 assert.equal(n.legacy.children.length,items.length);
 for(let i=0;i<items.length;i++){
  const item=items[i],expectedText=expectedCorrections[item.id]?.text||item.displayText;
  const row=n.legacy.children.find(row=>{const parts=expectedText.split(' - ');const title=item.sourceRuns||item.preserveLines?expectedText:parts.length>1?parts.slice(0,-1).join(' - '):expectedText;return row.children[1].children[0].textContent===title&&(item.sourceRuns||item.preserveLines||parts.length===1||row.children[1].children[1].textContent.endsWith(parts.at(-1)))});assert(row,'Source highlight lost after sorting: '+item.id);const info=row.children[1];
  if(expectedCorrections[item.id])corrected++;
  if(item.sourceRuns){const spans=info.children[0].children;assert.equal(spans.map(s=>s.textContent).join(''),expectedText);assert.equal(spans.length,item.sourceRuns.length);for(let j=0;j<spans.length;j++){assert.equal(spans[j].style.fontWeight,item.sourceRuns[j].strong?'800':'400');assert.equal(spans[j].style.fontStyle,item.sourceRuns[j].italic?'italic':'normal');}}
 }
 highlights+=items.length;
 const entries=book.players[id].entries;assert.equal(n.recordsSection.hidden,entries.length===0);
 if(entries.length){const rows=n.records.children[0].children[1].children;assert.equal(rows.length,entries.length);for(let i=0;i<entries.length;i++)assert(rows.some(row=>row.textContent.includes(entries[i].sourceText)));records+=entries.length;}
 const expectedHighs=p.segments.flatMap(s=>s.highs).length;assert.equal(n.highs.children.length,expectedHighs);assert.equal(n.highsSection.hidden,!expectedHighs);
 assert(!Object.values(n).some(el=>/NaN|Infinity/.test(el.textContent)),id+' non-finite value');
 profiles++;
 }
 const sortedBook=structuredClone(book);sortedBook.players['354054'].entries=[
 {category:'Test',scope:'Career',sourceText:'Old 2013',dateLabel:'June 9, 2013'},
 {category:'Test',scope:'Career',sourceText:'Season 2020',dateLabel:'2019/20'},
 {category:'Test',scope:'Career',sourceText:'Newest 2026',sortDate:'2026-03-22',sourceURLs:['https://www.htosports.com/teams/default.asp?gameID=123','javascript:alert(1)','https://example.com/?gameID=2']},
 {category:'Test',scope:'Career',sourceText:'Milestone 2025',dateLabel:'January 5, 2025'},
 {category:'Test',scope:'Career',sourceText:'Undated'}];
 const sorted=await render('354054',{'player-record-book.json':sortedBook});const sortedRows=sorted.records.children[0].children[1].children;
 assert(sortedRows[0].textContent.includes('Newest 2026'));assert(sortedRows[1].textContent.includes('Milestone 2025'));assert(sortedRows[2].textContent.includes('Season 2020'));assert(sortedRows[4].textContent.includes('Undated'));
 const sourceLinks=sortedRows[0].children[2].children.filter(x=>typeof x!=='string');assert.equal(sourceLinks.length,1);assert(sourceLinks[0].href.includes('gameID=123'));
 const justin=await render('354060');assert(justin.form.textContent.includes('50%'));assert(justin.form.textContent.includes('3 of 6 goals'));assert(justin.form.textContent.includes('2/4'));assert(justin.highs.textContent.includes('Winter 2017/2018 · Winter 2022/2023'));
 const broken=structuredClone(ledger);broken.players['354054'].name='Wrong Player';const withheld=await render('354054',{'player-highlights-ledger.json':broken});assert.equal(withheld.legacy.children.length,0);assert(!withheld.notice.hidden);
 const empty=await render('999999');assert.equal(empty.records.children.length,0);assert.equal(empty.highs.children.length,0);
 assert.equal(corrected,4);
 const expanded=async(id,overrides={})=>{const n=await render(id,overrides);if(!n.expand.hidden)n.expand.onclick();return n;};
 const ben=await expanded('354285'),benRows=ben.legacy.children.map(r=>r.textContent);
 const benPoint=benRows.findIndex(s=>s.includes('100 Point Club')),benGame=benRows.findIndex(s=>s.includes('50 Game Club'));
 assert(benPoint>benGame,'Corrected November13 milestone must follow November20 game milestone');
 assert(benRows[benPoint].includes('November 13, 2016'));assert(!benRows[benPoint].includes('November 20, 2016'));
 assert(benRows[benGame].includes('November 20, 2016'),'Unrelated Ben50-game date changed');
 const ryan=await expanded('354046'),ryanRows=ryan.legacy.children.map(r=>r.textContent);
 assert(ryanRows.findIndex(s=>s.includes('100 Point Club'))<ryanRows.findIndex(s=>s.includes('Elected Assistant Captain')),'Ryan corrected2015 milestone must precede winter2014/15 entry');
 assert(ryanRows.findIndex(s=>s.includes('100 Point Club'))>ryanRows.findIndex(s=>s.includes('100 Game Club')),'Ryan correctedAugust milestone must follow December2015 entry');
 let negativeChecks=0;
 for(const mutate of [
  d=>{d.corrections[0].playerName='Wrong Player';},
  d=>{d.corrections[0].itemID+='-missing';},
  d=>{d.corrections[0].sourceText+=' changed';},
  d=>{d.corrections[0].expectedDisplayText='100 Point Club - August 8, 2014';},
  d=>{d.corrections[0].playerID='354055';},
  d=>{d.corrections.push(structuredClone(d.corrections[0]));},
  d=>{d.corrections[0].sortDate='2015-02-30';},
  d=>{d.corrections[0].sourceURL='javascript:alert(1)';},
  d=>{d.corrections[0].displayText='200 Point Club - August 9, 2015';}
 ]){
  const bad=structuredClone(corrections);mutate(bad);
  const n=await render('354046',{'player-highlights-display-corrections.json':bad});
  assert.equal(n.legacy.children.length,0,'Mismatched correction must not render');assert(!n.notice.hidden);assert(n.records.children.length,'Correction failure must not hide record book');negativeChecks++;
 }
 const unavailable=await render('354046',{'player-highlights-display-corrections.json':null});
 assert.equal(unavailable.legacy.children.length,0);assert(!unavailable.notice.hidden);assert(unavailable.records.children.length);negativeChecks++;
 const unaffectedWithoutFeed=await render('354054',{'player-highlights-display-corrections.json':null});
 assert(unaffectedWithoutFeed.legacy.children.length);assert(unaffectedWithoutFeed.notice.hidden,'Unavailable corrections must not suppress an unaffected profile');
 const wrongTarget=structuredClone(corrections);wrongTarget.corrections[0].itemID+='-missing';
 const unaffected=await render('354054',{'player-highlights-display-corrections.json':wrongTarget});assert(unaffected.legacy.children.length);assert(unaffected.notice.hidden);
 const reformatted=structuredClone(ledger),run=reformatted.players['354046'].items.find(i=>i.id==='hto-legacy-354046-06').sourceRuns[0];
 reformatted.players['354046'].items.find(i=>i.id==='hto-legacy-354046-06').sourceRuns=[{...run,text:'100 Point Club - '},{...run,text:'August 9, 2014'}];
 const changedRuns=await render('354046',{'player-highlights-ledger.json':reformatted});assert.equal(changedRuns.legacy.children.length,0);assert(!changedRuns.notice.hidden);negativeChecks++;
 const repeated=await expanded('354285');assert.deepEqual(repeated.legacy.children.map(r=>r.textContent),benRows,'Repeated rendering must not accumulate changes');
 console.log(JSON.stringify({profiles,expandedHighlightItems:highlights,recordBookEntries:records,displayCorrections:corrected,negativeCorrectionChecks:negativeChecks,identityMismatchWithheld:true,unregisteredIdentityWithheld:true,formattingRunsPreserved:true,frozenSourceInputsPreserved:true,correctedChronology:true,unrelatedBenMilestonePreserved:true,unaffectedProfileSurvivesUnavailableCorrections:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
