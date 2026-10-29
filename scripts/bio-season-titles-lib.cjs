'use strict';
/* Source-only season award mapping. Never infer scoring titles from player stats/rankings. */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const normalize=s=>String(s||'').normalize('NFKC').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const normName=s=>normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const rosterSeason=(mode,year)=>{
 const n=Number(year);
 return mode==='Summer'?'Summer '+n:'Winter '+n+'/'+(n+1);
};
const registry=source=>{
 const names=new Map();
 for(const [id,p] of Object.entries(source.players||{})){
  if(!/^\d+$/.test(id)||!p?.name)continue;
  const key=normName(p.name),old=names.get(key);
  if(old)names.set(key,null);else if(!names.has(key))names.set(key,id);
 }
 return names;
};
function build(ledger,history,career,raw){
 if(ledger?.schema!=='brave-hc-player-highlights/v1'||history?.schema!=='brave-hc-hto-history-snapshot/v1'||
  career?.schema!=='brave-hc-player-career-insights/v1')throw Error('UNTRUSTED_SOURCE_SCHEMA');
 const index=registry(career),data=new Map(),held=[],sourceRows={NATIVE_HTO_HIGHLIGHTS:0,PUBLIC_HTO_AWARDS_HISTORY:0};
 const eligible=(id,season)=>career.players?.[id]?.segments?.some(s=>
  s.kind==='skater'&&Array.isArray(s.seasons)&&s.seasons.some(x=>x.Season===season));
 function add(id,season,type,origin,text){
  if(!id||!eligible(id,season)){held.push({id:id||null,season,type,origin,reason:'PLAYER_OR_SEASON_NOT_VERIFIED'});return;}
  if(!['goalTitle','pointsTitle'].includes(type))throw Error('UNEXPECTED_TITLE_KIND');
  const key=id+'|'+season+'|'+type;
  const entry=data.get(key)||{id,season,type,award:type==='goalTitle'?'Rocket Richard':'Art Ross',sourceTypes:[]};
  if(!entry.sourceTypes.includes(origin))entry.sourceTypes.push(origin);
  data.set(key,entry);sourceRows[origin]++;
 }
 for(const [id,p] of Object.entries(ledger.players||{})){
  if(!career.players?.[id]||career.players[id].name!==p.name){held.push({id,reason:'LEDGER_IDENTITY_NOT_VERIFIED'});continue;}
  for(const item of p.items||[]){
   if(item?.category!=='award'||item?.provenance!=='EXISTING_NATIVE_HTO_HIGHLIGHTS'||
      item?.publication!=='EXISTING_HTO_MANUAL_RECORD')continue;
   const text=normalize(item.sourceText);
   const kind=/^Art Ross Award\s+\(\d+\s+Points\)/i.test(text)?'pointsTitle':
     /^Maurice\s+['"]Rocket['"]\s+Richard Award\s+\(\d+\s+Goals\)/i.test(text)?'goalTitle':null;
   if(!kind)continue;
   const m=text.match(/\s+-\s+(Summer \d{4}|Winter \d{4}\/\d{2,4})$/);
   if(!m){held.push({id,reason:'AWARD_SEASON_NOT_EXPLICIT',source:text});continue;}
   const s=m[1],winter=/^Winter (\d{4})\/(\d{2,4})$/.exec(s);
   const season=winter?rosterSeason('Winter',winter[1]):s;
   if(winter && (Number(winter[2])!==Number(winter[1])+1&&Number(winter[2])!==(Number(winter[1])+1)%100)){
    held.push({id,reason:'MALFORMED_WINTER_SEASON',source:text});continue;
   }
   add(id,season,kind,'NATIVE_HTO_HIGHLIGHTS',text);
  }
 }
 for(const group of history.groups||[]){
  if(group?.section!=='Brave H.C. Awards & Honors')continue;
  const category=normalize(group.category);
  const kind=/^Maurice ['"]Rocket['"] Richard Trophy - (Summer|Winter)$/.exec(category)?'goalTitle':
    /^Art Ross Award - (Summer|Winter)$/.test(category)?'pointsTitle':null;
  if(!kind)continue;
  const mode=category.endsWith('Summer')?'Summer':'Winter';
  for(const s of group.items||[]){
   const text=normalize(s),m=/^(\d{4}) - (.+?) - (.+)$/.exec(text);
   if(!m){held.push({reason:'HISTORY_ROW_INVALID',category,source:text});continue;}
   const season=rosterSeason(mode,m[1]);
   for(const name of m[2].split(/\s+&\s+/)){
    const id=index.get(normName(name));
    if(!id){held.push({name,reason:'HISTORY_PLAYER_NOT_UNIQUE',category,season});continue;}
    add(id,season,kind,'PUBLIC_HTO_AWARDS_HISTORY',text);
   }
  }
 }
 const players={};
 const items=[...data.values()].sort((a,b)=>a.id.localeCompare(b.id)||a.season.localeCompare(b.season)||
    (a.type==='goalTitle'?-1:1));
 for(const item of items){
  (players[item.id]??={})[item.season]??=[];
  players[item.id][item.season].push({type:item.type,award:item.award,sourceTypes:item.sourceTypes.slice().sort()});
 }
 // Source audit hashes use canonical LF so Windows/Unix checkout line endings cannot drift.
 const hash=s=>crypto.createHash('sha256').update(String(s).replace(/\r\n?/g,'\n'),'utf8').digest('hex');
 const result={schema:'hockeyos-verified-season-scoring-titles/v1',
  sourcePolicy:'EXPLICIT_PUBLIC_HTO_HONORS_ONLY_NO_STAT_RANK_INFERENCE',
  sourceCaptured:{native:ledger.capturedAt,history:history.capturedAt},
  sourceHashes:{native:raw?.ledger?hash(raw.ledger):null,history:raw?.history?hash(raw.history):null},
  verifiedSourceRows:sourceRows,
  verifiedEvents:items.length,
  heldCount:held.length,
  titleCounts:{goalTitle:items.filter(x=>x.type==='goalTitle').length,
    pointsTitle:items.filter(x=>x.type==='pointsTitle').length},
  notice:'Titles are published awards. The season chart totals may include playoffs or different HTO source scopes; title totals are not inferred from chart bars.',
  players};
 return {manifest:result,held};
}
function fromDir(root){
 const text=f=>fs.readFileSync(path.join(root,'widgets',f),'utf8');
 const l=text('player-highlights-ledger.json'),h=text('history-awards.json'),c=text('player-career-insights.json');
 return build(JSON.parse(l),JSON.parse(h),JSON.parse(c),{ledger:l,history:h});
}
module.exports={build,fromDir,normalize,rosterSeason};
