// AW19 isolated milestone badge recognition test. No browser or public writes.
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('widgets/player-highlights-v2.js','utf8');
const begin=source.indexOf('const knownClubValues={');
const end=source.indexOf('function paintVerifiedFutureClub',begin);
assert(begin>=0&&end>begin,'Existing club art parser must stay in JS widget');
const sandbox={};
vm.runInNewContext(source.slice(begin,end)+'\nthis.artFor=clubArtFor;',sandbox);
const art=sandbox.artFor;
function check(word,metric,tier,generated){
 const a=art({category:'milestone',sourceText:word,displayText:word});
 assert(a,'Verified source should parse: '+word);
 assert.equal(a.metric,metric);
 assert.equal(a.tier,tier);
 assert.equal(a.generated,generated);
 return a;
}
check('50 Game Club - January 5, 2025','games','bronze',false);
check('100 Point Club - May 15, 2016','points','silver',false);
check('50 Win Club - April 17, 2016','wins','bronze',false);
check('50 Goal Club - October 25, 2026','goals','bronze',true);
check('100 Goal Club - October 25, 2026','goals','silver',true);
check('200 Goal Club - October 25, 2026','goals','gold',true);
check('300 Goal Club - October 25, 2026','goals','platinum',true);
check('50 Assist Club - October 25, 2026','assists','bronze',true);
check('100 Assist Club - October 25, 2026','assists','silver',true);
check('5 Shutout Club - October 25, 2026','shutouts','bronze',true);
check('10 Shutout Club - October 25, 2026','shutouts','silver',true);
check('20 Shutout Club - October 25, 2026','shutouts','gold',true);
check('30 Shutout Club - October 25, 2026','shutouts','platinum',true);
assert.equal(art({category:'award',sourceText:'50 Goal Club - October 25, 2026'}),null);
assert.equal(art({category:'milestone',sourceText:'50 Goal Club - date pending'}),null);
assert.equal(art({category:'milestone',sourceText:'1 Shutout Club - October 25, 2026'}),null);
assert(source.includes('goals:0,assists:0,shutouts:0'),'Achievement Locker filters missing new metrics');
assert(source.includes("goals:'Goal',assists:'Assist',shutouts:'Shutout'"),'Club labels missing new metrics');
assert(source.includes("paintVerifiedFutureClub(img,art)"),'Genuine logo-based badge fallback must remain supported');
console.log('PASS 13 existing/new milestone art profiles, 3 invalid source guards, dynamic club badge/filter parity');
