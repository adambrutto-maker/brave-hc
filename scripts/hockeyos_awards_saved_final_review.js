'use strict';
// Historical cached final-score review only. No Excel, network, workbook writes,
// current inputs, eligibility decisions or release authority.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SOURCE='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
const models=[
 ['rolaids','Rolaids','Rolaids Relief Man Award Score','Rolaids Relief Man Rank Key','gap','30c222bd3f92542dd6e8e2c16143f2c0d349ede0fda1e9217a2917a4051020ea'],
 ['conn-smythe','Conn Smythe','Conn Smythe Award Score','Conn Smythe Rank Key','roleGap','a6d546a217cb94243988fa8cd0872fc2fddb1873c9dfbce6fe56b7ac896cc19f'],
 ['norris','Norris','Norris Award Score','Norris Rank Key','singleGap','0b6ab5c52486d6737db7875278d9452a8306a580f7c7384a4028b0d9b30c5e40'],
 ['rookie','Rookie','Rookie of the Year Award Score','Rookie Rank Key','rookie','3141f8e2cf134467675d9e45d3693521fb58bb58635ccb2ef875a19f6588ab5a']
];
function value(cell){
 if(cell===null||cell===undefined)return null;
 if(typeof cell==='string')return cell;
 if(cell.type==='n'&&typeof cell.value==='string'&&cell.value.trim()!==''){
  const n=Number(cell.value);if(Number.isFinite(n))return n;
 }
 if(cell.type==='str')return cell.value;
 throw Error('Unsupported cached cell type');
}
function round(x){return x<0?-Math.round(-x):Math.round(x);}
function audit(capture){
 if(capture?.schema!=='brave-hc-awards-source-formula-capture/v1'
  ||capture.sourceWorkbookSha256!==SOURCE||capture.sourceHashUnchanged!==true
  ||capture.currentScoresVerified!==false||capture.publicationAuthorized!==false
  ||!Array.isArray(capture.columns)||capture.columns.length!==146
  ||!Array.isArray(capture.historicalRows)||capture.historicalRows.length!==50)
  throw Error('Incomplete historical source capture');
 const columns=new Map(capture.columns.map(c=>[c.name,c]));
 if(columns.size!==146)throw Error('Duplicate captured column');
 const seenRows=new Set(),seenNames=new Set();
 const rows=capture.historicalRows.map(row=>{
  if(!Number.isInteger(row.row)||row.row<6||row.row>55||seenRows.has(row.row))
   throw Error('Historical row coverage mismatch');
  seenRows.add(row.row);
  if(!Object.hasOwn(row.values,'Name'))throw Error('Missing cached identity');
  const values=Object.fromEntries(Object.entries(row.values).map(([k,v])=>[k,value(v)]));
  const name=values.Name;
  if(name!==null&&name!==''){
   if(typeof name!=='string'||seenNames.has(name))throw Error('Duplicate historical identity');
   for(const [,prefix] of models){
    if(!Object.hasOwn(values,prefix+' Eligible')||![0,1].includes(values[prefix+' Eligible']))
     throw Error('Missing or invalid cached eligibility: '+prefix);
   }
   seenNames.add(name);
  }
  return {row:row.row,...values};
 });
 const results=[];
 for(const [id,prefix,final,rank,kind,digest] of models){
  const c=columns.get(final);
  if(!c||crypto.createHash('sha256').update(c.formula).digest('hex')!==digest
   ||c.firstStoredFormula?.formula!==c.formula
   ||c.firstStoredFormula.metadata.t!=='array')
   throw Error('Captured final formula changed: '+id);
  const eligible=rows.filter(r=>r.Name&&r[prefix+' Eligible']===1);
  if(eligible.some(r=>!Number.isFinite(r[prefix+' Raw Composite Score'])
    ||!Number.isFinite(r[rank])||!Number.isFinite(r[final])))
   throw Error('Missing eligible cached input: '+id);
  const cohort=kind==='roleGap'?eligible.filter(r=>['Skater','Goaltender'].includes(r['Award Scoring Type'])):eligible;
  const rawKey=prefix+' Raw Composite Score';
  const high=cohort.length?Math.max(...cohort.map(r=>r[rawKey])):null;
  const low=cohort.length?Math.min(...cohort.map(r=>r[rawKey])):null;
  const comparisons=eligible.map(r=>{
   const raw=r[rawKey];let expected;
   if(kind==='rookie'){
    expected=cohort.length<=1?75:raw===high?100:
      Math.min(99,Math.max(50,round(50+(raw-low)/(high-low)*50)));
   }else if(['singleGap','roleGap'].includes(kind)&&cohort.length<=1)expected=75;
   else expected=Math.max(50,Math.min(round(100-(high-raw)),100-eligible.filter(q=>q[rank]>r[rank]).length));
   return {name:r.Name,row:r.row,rawComposite:raw,expectedFinal:expected,cachedFinal:r[final],matches:expected===r[final]};
  });
  results.push({awardId:id,comparisons});
 }
 const comparisons=results.flatMap(r=>r.comparisons);
 return {schema:'brave-hc-awards-saved-final-review/v1',status:comparisons.every(c=>c.matches)?'CACHED_FINAL_FORMULA_REVIEW_PASS':'CACHED_FINAL_FORMULA_REVIEW_MISMATCH',
  sourceWorkbookSha256:SOURCE,awards:results,checked:comparisons.length,
  mismatches:comparisons.filter(c=>!c.matches).length,
  method:'Independent arithmetic translation of four captured final formulas applied only to saved eligible raw/rank inputs. No Excel recalculation.',
  eligibilityRecalculated:false,rawComponentsRecalculated:false,
  fullWorkbookParity:false,currentScoresVerified:false,publicationAuthorized:false};
}
if(require.main===module){
 const file=path.join(__dirname,'../docs/261020_Awards_Original_Formula_Capture.json');
 const result=audit(JSON.parse(fs.readFileSync(file,'utf8')));
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(result.mismatches)process.exitCode=1;
}
module.exports={audit};

