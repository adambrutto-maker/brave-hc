'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'../widgets'),js=fs.readFileSync(path.join(dir,'game-centre-next.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'game-centre-lineup-public.json'),'utf8')),entry=manifest.publishedWorkingCard;
const fixture={id:entry.fixtureId,opponent:entry.opponent,gameDate:entry.gameDate,puckDropUTC:entry.puckDropUTC,rolloverAtUTC:entry.expiresAt};
const at=Date.parse(entry.publishedAt)+1000;
function el(dataset={}){return {dataset,hidden:false,attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k];delete this[k]},addEventListener(k,f){this.events[k]=f},focus(){}}}
function harness({pdf=true,png=true}={}){
 const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,el());return ids.get(id)};
 const buttons=['standings','lineup'].map(tab=>el({tab})),panels=['standings','lineup'].map(name=>el({name}));
 panels[1].hidden=true;
 const root={dataset:{publicWorkingLineup:'1'},querySelectorAll:q=>q==='.tabs button'?buttons:panels};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[at]))}static now(){return at}}
 const c=vm.createContext({root,$:get,set:(id,t)=>{get(id).textContent=t},state:{lineupPdf:manifest},window:{},
  nextFixture:()=>fixture,when:day=>day,Date:Clock,setTimeout:()=>1,clearTimeout:()=>{},allowedPdfPath:p=>/^\.\/assets\/lineups\/[\w-]+\.pdf$/.test(p),
  pdfIntegrity:async()=>pdf,pngPreviewIntegrity:async()=>png,validApprovedPdf:()=>false});
 const tabCode=js.slice(js.indexOf('function selectTab('),js.indexOf('const validRecord='));
 const selector=js.slice(js.indexOf('function publicWorkingEntry('),js.indexOf('let lineupLoadVersion='));
 const drawing=js.slice(js.indexOf('let lineupLoadVersion='),js.indexOf('function miniMetric('));
 vm.runInContext(tabCode+selector+drawing,c);
 return {c,get,buttons,panels};
}
test('one Lineup tab click reveals the verified final card without opening a PDF',async()=>{
 const h=harness();await h.c.drawLineup();
 assert.equal(h.get('lineup-pdf-preview').hidden,false);
 assert.equal(h.get('lineup-pdf-preview').src,entry.previewImage);
 h.buttons[1].events.click();
 assert.equal(h.panels[1].hidden,false);assert.equal(h.panels[0].hidden,true);
 assert.equal(h.buttons[1].attrs['aria-selected'],'true');
 assert.equal(h.get('lineup-pdf-frame').hidden,true);
 assert.equal(h.get('lineup-pdf-frame').src,undefined);
 assert.equal(h.get('lineup-open').href,entry.url);
 assert.match(h.get('lineup-pdf-preview').alt,/Final team lineup.*Jeff Rae/);
});
test('PNG integrity failure retains PDF fallback without displaying an unverified image',async()=>{
 const h=harness({png:false});await h.c.drawLineup();
 assert.equal(h.get('lineup-pdf-preview').hidden,true);
 assert.equal(h.get('lineup-pdf-frame').hidden,false);
 assert.ok(h.get('lineup-pdf-frame').src.startsWith(entry.url));
});
test('PDF integrity failure blocks the card and secondary links',async()=>{
 const h=harness({pdf:false});await h.c.drawLineup();
 assert.equal(h.get('lineup-pdf-preview').hidden,true);
 assert.equal(h.get('lineup-pdf-frame').hidden,true);
 assert.equal(h.get('lineup-open').attrs['aria-disabled'],'true');
 assert.match(h.get('lineup-notice').textContent,/integrity check failed/);
});
test('desktop and mobile share responsive image sizing with no fixed-height scroll trap',()=>{
 const css=fs.readFileSync(path.join(dir,'game-centre-next.css'),'utf8');
 assert.match(css,/\.pdf-lineup-preview\{display:block;width:100%;max-width:100%;height:auto;box-sizing:border-box/);
 assert.doesNotMatch(css,/\.pdf-lineup-preview\{display:none/);
 assert.match(css,/\.pdf-lineup-preview\[hidden\],\.pdf-lineup iframe\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(css,/\.pdf-lineup\{[^}]*height:/);
});
test('live entry eagerly prepares the image and requests updated display assets',()=>{
 const html=fs.readFileSync(path.join(dir,'game-centre-arena-r32.html'),'utf8');
 assert.match(html,/class="pdf-lineup-preview" loading="eager" decoding="async"/);
 assert.match(html,/game-centre-next.css\?v=20261108-inline-r3/);
 assert.match(html,/game-centre-next.js\?v=20261108-inline-r3/);
});
