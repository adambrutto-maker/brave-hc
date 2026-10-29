'use strict';
const path=require('node:path'),fs=require('node:fs'),{fromDir}=require('./bio-season-titles-lib.cjs');
const root=path.resolve(__dirname,'..');
const result=fromDir(root),file=path.join(root,'widgets/player-bio-season-titles.json');
const contents=JSON.stringify(result.manifest,null,2)+'\n';
if(process.argv.includes('--check')){
 const current=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
 if(current!==contents){console.error('SCORING_TITLE_MANIFEST_STALE_OR_MISSING');process.exit(2);}
 console.log('SEASON_TITLE_SOURCE_PARITY_OK',result.manifest.verifiedEvents);
}else{
 fs.writeFileSync(file,contents,'utf8');
 console.log('SEASON_TITLE_MANIFEST_GENERATED',JSON.stringify({
  events:result.manifest.verifiedEvents,
  counts:result.manifest.titleCounts,
  heldCount:result.held.length,
  held:result.held,
  sourceRows:result.manifest.verifiedSourceRows
 },null,2));
}
