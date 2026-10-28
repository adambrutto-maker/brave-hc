// Source-gated AW-19 player badge acceptance; original 306 legacy items intact.
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const ledger=JSON.parse(fs.readFileSync('widgets/player-highlights-ledger.json','utf8'));
const source=fs.readFileSync('widgets/player-highlights-v2.js','utf8');
assert.equal(ledger.schema,'brave-hc-player-highlights/v1');
assert.equal(Object.keys(ledger.players).length,43);
assert.equal(ledger.supplementalSourceAuthority,'EXACT_VERIFIED_HTO_GAME_DATES_AND_PUBLIC_NATIVE_AWARDS_37');
const items=Object.entries(ledger.players).flatMap(([pid,p])=>p.items.map(item=>({pid,name:p.name,...item})));
const legacy=items.filter(i=>i.provenance==='EXISTING_NATIVE_HTO_HIGHLIGHTS');
const additional=items.filter(i=>i.provenance==='OFFICIAL_DATED_HTO_AWARDS_PARITY');
assert.equal(items.length,343);
assert.equal(legacy.length,306);
assert.equal(additional.length,37);
assert.equal(items.filter(i=>i.category==='milestone').length,134);
assert.equal(Object.values(ledger.players).reduce((n,p)=>n+p.originalCount,0),306);
assert.equal(new Set(additional.map(i=>i.pid+':'+i.awardCategory)).size,37);
assert.equal(new Set(additional.map(i=>i.pid)).size,15);
for(const i of additional){
 assert.equal(i.officialPlayerId,i.pid);
 assert.equal(i.displayText,i.sourceText);
 assert.equal(i.category,'milestone');
 assert.equal(i.publication,'VERIFIED_NATIVE_HTO_AWARD');
 assert.match(i.sourceGameSHA256,/^[a-f0-9]{64}$/);
 assert.match(i.sortDate,/^20\d\d-\d\d-\d\d$/);
 assert(i.sourceText.startsWith(i.awardCategory+' - '));
 const u=new URL(i.sourceGameURL);
 assert.equal(u.hostname,'www.htosports.com');
 assert.equal(u.searchParams.get('p'),'boxscore');
 assert.equal(u.searchParams.get('u'),'BRAVESHOCKEY');
 assert.equal(u.searchParams.get('gameID'),i.sourceGameId);
}
const start=source.indexOf('const achievementDateRank=');
const end=source.indexOf('const newestAchievements=',start);
const validatorStart=source.indexOf('function validSupplementalClub(');
const validatorEnd=source.indexOf('function validDisplayCorrections(',validatorStart);
assert(start>0&&end>start&&validatorStart>0&&validatorEnd>validatorStart);
const categoryNames=[...new Set(items.map(x=>x.category))];
const context={URL,Date,Object,Number,String,Array};
const snippet='const categoryLabel='+JSON.stringify(Object.fromEntries(categoryNames.map(x=>[x,x])))+';\n'+
 source.slice(start,end)+'\n'+source.slice(validatorStart,validatorEnd)+'\nthis.validate=validLedger;\n';
vm.runInNewContext(snippet,context);
assert.equal(context.validate(ledger).players['354285'].name,'Ben Sherritt');
const corrupted=structuredClone(ledger);
const player=corrupted.players[additional[0].pid];
const row=player.items.find(x=>x.id===additional[0].id);
row.sourceGameSHA256='bad';
assert.throws(()=>context.validate(corrupted),/Unapproved highlight state/);
const artStart=source.indexOf('const knownClubValues='),artEnd=source.indexOf('function paintVerifiedFutureClub(',artStart);
const artctx={};vm.runInNewContext(source.slice(artStart,artEnd)+'\nthis.clubArt=clubArtFor;',artctx);
for(const item of additional){
 const art=artctx.clubArt(item);
 assert(art,'Every source verified goal/assist/shutout badge must display');
 assert.equal(art.generated,true,'New clubs use verified logo-based generated badges when no static original exists');
 assert(['bronze','silver','gold','platinum'].includes(art.tier));
}
console.log('PASS 306 preserved originals + 37 dated HTO Awards in 15 player widgets; 134 earned milestones; exact game/date/identity guards');
