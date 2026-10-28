const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.hidden=false;this.attributes={};this.own='';}
 set textContent(s){this.own=String(s??'');this.children=[];}
 get textContent(){return this.own+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
 get childNodes(){return this.children;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.own='';this.children=[...children];}
 setAttribute(k,v){this.attributes[k]=v;}
 querySelector(selector){return new Element(selector);}
 before(...children){this.beforeChildren=(this.beforeChildren||[]).concat(children);}
}
const read=p=>fs.readFileSync(p,'utf8'),parse=p=>JSON.parse(read(p));
const ledger=parse('widgets/player-highlights-ledger.json'),career=parse('widgets/player-career-insights.json'),book=parse('widgets/player-record-book.json');
const artManifest=parse('widgets/assets/awards/source-manifest.json');
assert.equal(artManifest.schema,'brave-hc-award-art/v1');
assert.equal(artManifest.assets.length,8);
for(const art of artManifest.assets){
 assert(art.path.startsWith('assets/awards/')&&art.path.endsWith('.webp'),'Only vetted local artwork is allowed');
 const bytes=fs.readFileSync('widgets/'+art.path);
 assert.equal(bytes.length,art.bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
}
const clubManifest=parse('widgets/assets/clubs/source-manifest.json');
assert.equal(clubManifest.schema,'brave-hc-club-milestone-art/v1');
assert.equal(clubManifest.assets.length,22);
for(const art of clubManifest.assets){
 assert(art.path.startsWith('assets/clubs/')&&art.path.endsWith('.svg'));
 const bytes=fs.readFileSync('widgets/'+art.path);
 assert.equal(bytes.length,art.bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
 assert(bytes.toString('utf8').includes('<svg')&&!bytes.toString('utf8').includes('<script'));
}
const specialManifest=parse('widgets/assets/special/source-manifest.json');
assert.equal(specialManifest.schema,'brave-hc-special-emblems/v1');
assert.equal(specialManifest.assets.length,3);
for(const a of specialManifest.assets){
 const b=fs.readFileSync('widgets/assets/special/'+a.file);
 assert.equal(b.length,a.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);
 assert(b.toString('utf8').includes('<svg')&&!b.toString('utf8').includes('<script'));
}
const heritageManifest=parse('widgets/assets/heritage/source-manifest.json');
assert.equal(heritageManifest.schema,'brave-hc-heritage-icons/v1');
assert.equal(heritageManifest.assets.length,6);
for(const art of heritageManifest.assets){
 const bytes=fs.readFileSync('widgets/assets/heritage/'+art.file);
 assert.equal(bytes.length,art.bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
 assert(bytes.toString('utf8').includes('<svg')&&!bytes.toString('utf8').includes('<script'));
}
const roundManifest=parse('widgets/assets/round-clubs/source-manifest.json');
assert.equal(roundManifest.schema,'brave-hc-rounded-milestone-art/v1');
assert.equal(roundManifest.assets.length,22);
for(const entry of roundManifest.assets){
 assert(entry.path.startsWith('assets/round-clubs/')&&entry.path.endsWith('.webp'));
 const b=fs.readFileSync('widgets/'+entry.path);
 assert.equal(b.length,entry.bytes);
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),entry.sha256);
 assert.equal(b.toString('ascii',0,4),'RIFF');
}
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
 const ids='playerName playerSub notice legacy careerSummary expand legacySection milestoneSection milestoneGrid milestoneFilters milestoneCount lockerSection lockerMilestones lockerHonors honorsSection honorsCount honorsFilters honorsGrid disciplineGroup disciplineGrid honorsMore historyDetails highsSection highs careerDate recordsSection records recordsSource currentSection form statsDate profileSource footer'.split(' ');
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 for(const id of ['notice','legacySection','milestoneSection','honorsSection','lockerSection','historyDetails','disciplineGroup','highsSection','recordsSection','currentSection'])nodes[id].hidden=true;
 const context=vm.createContext({window:{},URL,URLSearchParams,Date,Number,String,Object,Array,Map,Promise,Error,console,location:{search:'?playerID='+id},document:{getElementById:id=>{assert(nodes[id],'missing element '+id);return nodes[id]},createElement:tag=>new Element(tag),createTextNode:s=>String(s)},fetch:async url=>({ok:true,json:async()=>freeze(structuredClone(Object.hasOwn(overrides,url.slice(2))?overrides[url.slice(2)]:feeds[url.slice(2)]))})});
 vm.runInContext(links,context);vm.runInContext(code,context);await new Promise(setImmediate);return nodes;
}
(async()=>{
 let profiles=0,highlights=0,records=0,corrected=0,awardLogoDisplays=0,milestoneLogoDisplays=0,retitledDedications=0,specialLogoDisplays=0,heritageLogoDisplays=0,earnedWallBadges=0;
 assert.deepEqual(corrections.corrections.map(c=>[c.itemID,c.displayText,c.sortDate]),Object.entries(expectedCorrections).map(([id,c])=>[id,c.text,c.date]));
 for(const [id,p] of Object.entries(career.players)){
 const n=await render(id);assert.equal(n.playerName.textContent,p.name);assert(n.notice.hidden,id+' unexpected warning');
 const items=ledger.players[id]?.items||[];
 assert.equal(n.legacySection.hidden,items.length===0);
 const sourceMilestones=items.filter(x=>x.category==='milestone');
 const otherItems=items.filter(x=>x.category!=='milestone');
 assert.equal(n.lockerSection.hidden,items.length===0);
 assert.equal(n.historyDetails.hidden,items.length===0);
 assert.equal(n.honorsCount.textContent,otherItems.length+' records');
 assert.equal(n.lockerMilestones.hidden,sourceMilestones.length===0);
 assert.equal(n.lockerHonors.hidden,otherItems.length===0);
 if(sourceMilestones.length&&otherItems.length){
  assert.equal(n.milestoneSection.hidden,false);
  n.lockerHonors.onclick();
  assert.equal(n.honorsSection.hidden,false);
  assert.equal(n.milestoneSection.hidden,true);
  assert.equal(n.honorsGrid.children.length,Math.min(6,otherItems.filter(x=>x.category!=='discipline').length));
  assert.equal(n.disciplineGrid.children.length,otherItems.filter(x=>x.category==='discipline').length);
  n.lockerMilestones.onclick();
  assert.equal(n.honorsSection.hidden,true);
  assert.equal(n.milestoneSection.hidden,false);
 }
 assert.equal(n.milestoneSection.hidden,sourceMilestones.length===0);
 assert.equal(n.milestoneGrid.children.length,sourceMilestones.length);
 assert.equal(n.milestoneCount.textContent,sourceMilestones.length?sourceMilestones.length+' earned':'');
 earnedWallBadges+=n.milestoneGrid.children.length;
 for(const tile of n.milestoneGrid.children){
  assert(tile.className.includes('ph-earned-tile')&&tile.textContent.includes('UNLOCKED'),'Earned tile missing');
  assert(tile.children[1].children.some(x=>x.tagName==='img'),'Earned emblem missing');
 }
 if(sourceMilestones.length){
  const games=n.milestoneFilters.children.find(b=>b.textContent.startsWith('Games ('));
  if(games){games.onclick();assert.equal(n.milestoneGrid.children.length,sourceMilestones.filter(x=>x.sourceText.includes(' Game Club')).length);
   const all=n.milestoneFilters.children.find(b=>b.textContent.startsWith('All ('));all.onclick();}
  assert.equal(n.milestoneGrid.children.length,sourceMilestones.length);
 }
 assert.equal(n.legacy.children.length,Math.min(3,items.length));
 if(items.length>3)n.expand.onclick();
 assert.equal(n.legacy.children.length,items.length);
 awardLogoDisplays+=n.legacy.children.filter(row=>row.children[0].children.some(child=>child.tagName==='img'&&child.src.includes('assets/awards/'))).length;
 milestoneLogoDisplays+=n.legacy.children.filter(row=>row.children[0].children.some(child=>child.tagName==='img'&&child.src.includes('assets/round-clubs/'))).length;
 specialLogoDisplays+=n.legacy.children.filter(row=>row.children[0].children.some(child=>child.tagName==='img'&&child.src.includes('assets/special/'))).length;
 heritageLogoDisplays+=n.legacy.children.filter(row=>row.children[0].children.some(child=>child.tagName==='img'&&child.src.includes('assets/heritage/'))).length;
 for(const row of n.legacy.children)assert(row.children[0].children.some(x=>x.tagName==='img'),'Unbranded historical item: '+id+' '+row.textContent);
 for(let i=0;i<items.length;i++){
  const item=items[i],isHistoricDedication=item.category==='award'&&/^Bill Masterton Award for (?:Dedication|Decidation)\b/i.test(item.sourceText);
  const expectedText=(expectedCorrections[item.id]?.text||item.displayText).replace(isHistoricDedication?/^Bill Masterton Award for (?:Dedication|Decidation)\b/i:/^$/,'Andrew Cristillo Award for Dedication');
  if(isHistoricDedication)retitledDedications++;
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
 assert.equal(retitledDedications,10,'All ten historically named award wins must be retitled');
 assert.equal(milestoneLogoDisplays,97,'Every verified club milestone must show a branded emblem');
 assert.equal(earnedWallBadges,134,'All 97 original and 37 newly HTO-verified club milestones must appear in the earned badge gallery');
 assert.equal(awardLogoDisplays,105,'James Norris composite winner must display existing artwork');
 assert.equal(specialLogoDisplays,58,'All 51 championship rows, 1 composite Cup and 6 All-Star rows must show specials');
 assert.equal(heritageLogoDisplays,46,'Every remaining historical badge has unique emblem');
 assert.equal(awardLogoDisplays+milestoneLogoDisplays+specialLogoDisplays+heritageLogoDisplays,306,'All historical rows must have an emblem');
 assert.equal(ledger.players['354054'].items[0].sourceText,'Bill Masterton Award for Dedication - Winter 2024/25',
   'Native original historical wording must be preserved for audit');
 const expanded=async(id,overrides={})=>{const n=await render(id,overrides);if(!n.expand.hidden)n.expand.onclick();return n;};
 const artCases=[
  ['354060','Andrew Cristillo Award','cristillo-dedication.webp'],
  ['354054','Andrew Cristillo Award','cristillo-dedication.webp'],
  ['354060','Hart Award Team MVP','hart-mvp.webp'],
  ['354060','Conn Smythe Award','conn-smythe.webp'],
  ['354058','James Norris Award','james-norris.webp'],
  ['354059','Lady Byng Award','lady-byng.webp'],
  ['354060','Rookie of the Year Award','rookie-of-the-year.webp'],
  ['354041','Most Improved Award','most-improved.webp'],
  ['736317','Rolaids Relief Man Award','rolaids-relief.webp']
 ];
 for(const [id,label,filename] of artCases){
  const n=await expanded(id),row=n.legacy.children.find(x=>x.children[1].textContent.includes(label));
  assert(row,'Missing verified winning entry '+id+' '+label);
  const icon=row.children[0],img=icon.children[0];
  assert.equal(img?.tagName,'img','Award should have original logo '+id+' '+label);
  assert(img.src.endsWith('/assets/awards/'+filename),label+' image mismatch');
  assert(img.alt.toLowerCase().includes('award'),'Image alt should identify award');
  assert.equal(img.loading,'lazy');
  assert.equal(row.className.includes('ph-with-award-art'),true);
  img.onerror();
  assert.equal(icon.textContent,'AWD','Broken artwork should fall back to award badge');
 }
 for(const [id,label,file] of [
   ['354049','Hall of Fame Inductee','hall-of-fame-inductee.svg'],
   ['354061','Art Ross Award','art-ross.svg'],
   ['354061','Rocket','rocket-richard.svg'],
   ['354054','Elected Captain','captain.svg'],
   ['354054','Elected Assistant Captain','assistant-captain.svg'],
   ['382708','2 Game Suspension','discipline-record.svg']
 ]){
  const n=await expanded(id),row=n.legacy.children.find(x=>x.children[1].textContent.includes(label));
  assert(row,'Missing explicit historic achievement '+id+' '+label);
  const img=row.children[0].children[0];
  assert.equal(img?.tagName,'img','Missing heritage artwork '+label);
  assert(img.src.split('?')[0].endsWith('/assets/heritage/'+file),'Incorrect category logo '+label);
 }
 const forged=structuredClone(ledger);
 const fake=forged.players['354060'].items.find(x=>x.displayText.includes('Hart Award'));
 fake.category='milestone';
 const noFalseWin=await expanded('354060',{'player-highlights-ledger.json':forged});
 assert(noFalseWin.legacy.children.find(x=>x.children[1].textContent.includes('Hart Award')).children[0].children.length===0,
  'Non-award source category must not gain winning emblem');
for(const [id,label,file] of [
  ['354054','SVHL Cup Champion','svhl-cup-champion.svg'],
  ['354285','SVHL Cup Champion (Call-Up)','svhl-cup-champion.svg'],
  ['354054','All-Star Nomination','all-star-nomination.svg'],
  ['354285','All-Star - Winter 2013/14','all-star-selected.svg']
 ]){
  const n=await expanded(id),row=n.legacy.children.find(x=>x.children[1].textContent.includes(label));
  assert(row,'Missing Special achievement '+id+' '+label);
  const img=row.children[0].children[0];assert.equal(img?.tagName,'img');
  assert(img.src.split('?')[0].endsWith('/assets/special/'+file),'Wrong special emblem '+id+' '+label);
 }
 // Negative cases: published source must identify a winner or an inductee, not a prospect.
 for(const [pid,needle,replacement] of [
  ['354060','Art Ross Award','Art Ross Award Nomination'],
  ['354061','Maurice "Rocket" Richard Award','Maurice "Rocket" Richard Award Nominee'],
  ['354049','Hall of Fame Inductee','Hall of Fame Nominee'],
  ['354054','Elected Captain','Considered for Captain']
 ]){
  const testLedger=structuredClone(ledger);
  const target=testLedger.players[pid].items.find(x=>x.sourceText.startsWith(needle));
  assert(target,'Required negative test source missing '+needle);
  target.sourceText=target.sourceText.replace(needle,replacement);
  target.displayText=target.displayText.replace(needle,replacement);
  if(target.sourceRuns)target.sourceRuns=target.sourceRuns.map(run=>({...run,text:run.text.replace(needle,replacement)}));
  const outcome=await expanded(pid,{'player-highlights-ledger.json':testLedger});
  const row=outcome.legacy.children.find(x=>x.children[1].textContent.includes(replacement));
  assert(row,'Missing rendered negative test '+replacement);
  assert(!row.children[0].children.some(x=>x.tagName==='img'), 'Nomination should never inherit an awarded/inducted emblem: '+replacement);
 }
 // Original award artwork must be visible for both documented Rolaids winners.
 for(const [pid,season] of [['595514','Winter 2024/25'],['736317','Winter 2025/26']]){
  const rows=await expanded(pid);
  const row=rows.legacy.children.find(x=>x.children[1].textContent.includes('Rolaids Relief Man Award')&&x.children[1].textContent.includes(season));
  assert(row,'Recorded Rolaids Relief Award missing: '+pid);
  assert(row.children[0].children[0]?.src.includes('/assets/awards/rolaids-relief.webp'),
   'Missing original Rolaids artwork for '+pid);
 }
 // Andrew Cristillo's memorial is the source-owned black 32-73 patch, not a recoloured generic award.
 for(const pid of ['354054','354060','634098']){
  const rows=await expanded(pid);
  const row=rows.legacy.children.find(x=>x.children[1].textContent.includes('Andrew Cristillo Award for Dedication'));
  assert(row,'Missing original memorial record '+pid);
  assert(row.children[0].children[0]?.src.includes('/assets/awards/cristillo-dedication.webp'));
  assert(row.children[0].className.includes('ph-cristillo-black-patch'),
   'Black patch framing should be retained');
 }
 // Artwork tiers grow in detail while every published club remains source-verified.
 const milestoneRows=await expanded('354054');
 for(const [label,tier] of [['50 Game Club','bronze'],['100 Game Club','silver'],
  ['200 Game Club','gold'],['300 Game Club','platinum']]){
  const row=milestoneRows.legacy.children.find(x=>x.children[1].textContent.includes(label));
  assert(row,'Missing verified club '+label);
  assert(row.className.includes('ph-tier-'+tier),'Expected '+tier+' tier for '+label);
 }
 const future=structuredClone(ledger);
 const existing=future.players['354054'];
 const example=structuredClone(existing.items.find(x=>x.category==='milestone'));
 example.id='hto-legacy-354054-future-fixture';
 example.sourceText='1250 Game Club - January 1, 2040';
 example.displayText=example.sourceText;
 example.sortDate='2040-01-01';
 delete example.sourceRuns;delete example.displayRuns;
 existing.items=[...existing.items,example];
 existing.originalCount+=1; // Fixture extends only the old source rows without altering new HTO award receipts.
 const futureView=await expanded('354054',{'player-highlights-ledger.json':future});
 const futureRow=futureView.legacy.children.find(row=>row.textContent.includes('1250 Game Club'));
 assert(futureRow,'New verified 1250 club badge not rendered');
 assert(futureRow.className.includes('ph-tier-platinum'));
 assert(futureView.milestoneGrid.children.some(tile=>tile.textContent.includes('1250 Game Club')&&tile.className.includes('ph-earned-platinum')),
   'Future verified 1250 Game Club must unlock in the earned collection without a new static badge');
 assert(futureRow.children[0].children[0]?.src==='./brave_hc_logo.png','New threshold falls back to official lion and runtime number');
 const norrisAlias=structuredClone(ledger);
 const alexAlias=norrisAlias.players['354058'].items.find(x=>x.sourceText.startsWith('James Norris Award'));
 alexAlias.sourceText=alexAlias.sourceText.replace('James Norris Award','James Norris Trophy');
 alexAlias.displayText=alexAlias.displayText.replace('James Norris Award','James Norris Trophy');
 const norrisAliasView=await expanded('354058',{'player-highlights-ledger.json':norrisAlias});
 assert(norrisAliasView.legacy.children.some(x=>x.children[1].textContent.includes('James Norris Trophy')&&
  x.children[0].children[0]?.src.endsWith('/assets/awards/james-norris.webp')),
  'Alternate verified James Norris Trophy label should retain existing image');
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
 console.log(JSON.stringify({profiles,expandedHighlightItems:highlights,recordBookEntries:records,awardLogoDisplays,milestoneLogoDisplays,specialLogoDisplays,heritageLogoDisplays,retitledDedications,displayCorrections:corrected,negativeCorrectionChecks:negativeChecks,identityMismatchWithheld:true,unregisteredIdentityWithheld:true,formattingRunsPreserved:true,frozenSourceInputsPreserved:true,correctedChronology:true,unrelatedBenMilestonePreserved:true,unaffectedProfileSurvivesUnavailableCorrections:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
