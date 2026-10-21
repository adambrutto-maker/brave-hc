'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {compare}=require('../scripts/hockeyos_awards_formula_semantics');
function fixture(){return {schema:'hockeyos-formula-semantics-observation/v1',cells:[
 {sheet:'Fictional',address:'C2',formula:'=SUM(A2:A4)',mode:'LEGACY_ARRAY',arrayRange:'C2'},
 {sheet:'Fictional',address:'D2',formula:'=C2',mode:'ORDINARY',arrayRange:null}
],names:[{scope:'workbook',name:'FictionalBaseline',refersTo:'=Fictional!$A$2:$A$4'}]};}
test('ordering does not change supplied semantics and no result grants release authority',()=>{
 const a=fixture(),b=fixture();b.cells.reverse();
 const r=compare(a,b);assert.equal(r.suppliedObservationsMatch,true);
 for(const key of ['workbookInspected','observationAuthenticityVerified','fullWorkbookParityVerified','publicationAuthorized'])
  assert.equal(r[key],false);
});
for(const [label,mutate] of [
 ['array mode lost',b=>{b.cells[0].mode='ORDINARY';b.cells[0].arrayRange=null;}],
 ['array bounds changed',b=>{b.cells[0].arrayRange='C2:C3';}],
 ['formula text changed',b=>{b.cells[0].formula='=SUM(A2:A3)';}],
 ['named formula changed',b=>{b.names[0].refersTo='=Fictional!$A$2:$A$5';}],
 ['name scope changed',b=>{b.names[0].scope='Fictional';}],
 ['formula removed',b=>{b.cells.pop();}]
])test(label+' is detected',()=>{const b=fixture();mutate(b);
 assert.equal(compare(fixture(),b).status,'FORMULA_SEMANTICS_DIFFER');});
for(const [label,mutate] of [
 ['missing legacy bounds',b=>{delete b.cells[0].arrayRange;}],
 ['unknown mode',b=>{b.cells[0].mode='ASSUMED';}],
 ['duplicate cell',b=>{b.cells.push({...b.cells[0],address:'$C$2'});}],
 ['duplicate name',b=>{b.names.push({...b.names[0],name:'fictionalbaseline'});}],
 ['missing names inventory',b=>{delete b.names;}]
])test(label+' rejects incomplete evidence',()=>{const b=fixture();mutate(b);
 assert.equal(compare(fixture(),b).status,'INCOMPLETE_OR_INVALID_OBSERVATIONS');});
