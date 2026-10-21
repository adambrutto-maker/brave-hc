'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {audit}=require('../scripts/hockeyos_awards_saved_final_review');
const capture=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/261020_Awards_Original_Formula_Capture.json'),'utf8'));
test('four captured models reproduce 20 saved eligible final ratings, without release authority',()=>{
 const result=audit(capture);assert.equal(result.checked,20);assert.equal(result.mismatches,0);
 for(const key of ['eligibilityRecalculated','rawComponentsRecalculated','fullWorkbookParity','currentScoresVerified','publicationAuthorized'])assert.equal(result[key],false);
 const rookies=result.awards.find(x=>x.awardId==='rookie').comparisons;
 assert.equal(rookies.length,4);assert.ok(rookies.every(r=>r.expectedFinal===100));
});
test('altered cached final rating is an observable mismatch',()=>{
 const bad=structuredClone(capture);
 const row=bad.historicalRows.find(r=>r.values['Rolaids Eligible']?.value==='1');
 row.values['Rolaids Relief Man Award Score'].value='12';
 const result=audit(bad);assert.equal(result.mismatches,1);assert.equal(result.status,'CACHED_FINAL_FORMULA_REVIEW_MISMATCH');
});
test('formula text and stored array mode must match the pinned captured model',()=>{
 for(const change of [c=>c.formula+=' ',c=>c.firstStoredFormula.metadata.t='ordinary']){
  const bad=structuredClone(capture);change(bad.columns.find(c=>c.name==='Rolaids Relief Man Award Score'));
  assert.throws(()=>audit(bad),/Captured final formula changed/);
 }
});
test('missing cached eligible input cannot silently become a zero or pass',()=>{
 const bad=structuredClone(capture),row=bad.historicalRows.find(r=>r.values['Rolaids Eligible']?.value==='1');
 row.values['Rolaids Raw Composite Score']=null;
 assert.throws(()=>audit(bad),/Missing eligible cached input/);
});
test('incomplete row coverage and a different workbook source cannot pass',()=>{
 const bad=structuredClone(capture);bad.historicalRows.pop();assert.throws(()=>audit(bad),/Incomplete historical/);
 const other=structuredClone(capture);other.sourceWorkbookSha256='a'.repeat(64);assert.throws(()=>audit(other),/Incomplete historical/);
});
