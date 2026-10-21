'use strict';

// Pure comparison of caller-supplied observations. No Excel, files or network.
// Matching metadata is not proof that a workbook was actually observed.
const crypto=require('node:crypto');
function fingerprint(input){
 if(input?.schema!=='hockeyos-formula-semantics-observation/v1'
    ||!Array.isArray(input.cells)||input.cells.length===0||!Array.isArray(input.names))
  throw Error('Incomplete formula semantics observation');
 const seen=new Set();
 const cells=input.cells.map(c=>{
  if(typeof c?.sheet!=='string'||!c.sheet||typeof c.address!=='string'
     ||!/^\$?[A-Z]{1,3}\$?[1-9][0-9]*$/.test(c.address)
     ||typeof c.formula!=='string'||!c.formula.startsWith('=')
     ||!['ORDINARY','LEGACY_ARRAY','DYNAMIC_ARRAY'].includes(c.mode))
   throw Error('Invalid formula cell metadata');
  const address=c.address.replaceAll('$','');
  const key=JSON.stringify([c.sheet.toLowerCase(),address]);
  if(seen.has(key))throw Error('Duplicate formula cell');
  seen.add(key);
  if(c.mode==='LEGACY_ARRAY'){
   if(typeof c.arrayRange!=='string'||!/^\$?[A-Z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Z]{1,3}\$?[1-9][0-9]*)?$/.test(c.arrayRange))
    throw Error('Legacy array range missing');
  }else if(c.arrayRange!==null)throw Error('Explicit null required for nonlegacy array range');
  return {sheet:c.sheet,address,formula:c.formula,mode:c.mode,
   arrayRange:c.arrayRange===null?null:c.arrayRange.replaceAll('$','')};
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
 const keys=new Set();
 const names=input.names.map(n=>{
  if(typeof n?.scope!=='string'||!n.scope||typeof n.name!=='string'||!n.name
     ||typeof n.refersTo!=='string'||!n.refersTo.startsWith('='))
   throw Error('Invalid named-reference metadata');
  const key=JSON.stringify([n.scope.toLowerCase(),n.name.toLowerCase()]);
  if(keys.has(key))throw Error('Duplicate named reference');
  keys.add(key);return {scope:n.scope,name:n.name,refersTo:n.refersTo};
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
 return crypto.createHash('sha256').update(JSON.stringify({cells,names})).digest('hex');
}
function compare(source,candidate){
 let sourceFingerprint=null,candidateFingerprint=null,error=null;
 try{sourceFingerprint=fingerprint(source);candidateFingerprint=fingerprint(candidate);}
 catch(e){error=e.message;}
 const matches=error===null&&sourceFingerprint===candidateFingerprint;
 return {status:error?'INCOMPLETE_OR_INVALID_OBSERVATIONS':matches
  ?'SUPPLIED_FORMULA_SEMANTICS_MATCH':'FORMULA_SEMANTICS_DIFFER',
  sourceFingerprint,candidateFingerprint,error,
  suppliedObservationsMatch:matches,workbookInspected:false,
  observationAuthenticityVerified:false,fullWorkbookParityVerified:false,
  publicationAuthorized:false};
}
module.exports={fingerprint,compare};
