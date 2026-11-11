'use strict';
/**
 * HockeyOS no-write cached source expansion plan review.
 * Compares three PREVIOUSLY SAVED read-only JSON audits only.
 * NEVER opens Excel, changes a workbook, clones formulas, touches a task,
 * emails reviewers, alters the repo main, or produces a runnable patch.
 * A structural PASS is NOT an authorized Excel expansion.
 */
const AUTHORITY='0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154';
const TABLES=['SkaterStatsByGame','GoalieStatsByGame'];
const END={SkaterStatsByGame:4668,GoalieStatsByGame:363};
const ALLOCATIONS={SkaterStatsByGame:41,GoalieStatsByGame:3};
const KNOWN_COLLISION='Y4674';
const ALLOWED={GA:true,POTG:true};

function check({extension,capacity,importPlan}={}){
 const errors=[],warnings=[];
 const fail=(code)=>{if(!errors.includes(code))errors.push(code)};
 const warn=(code)=>{if(!warnings.includes(code))warnings.push(code)};
 if(extension?.schema!=='hockeyos-master-workbook-extension-plan-readonly/v1'
   ||capacity?.schema!=='hockeyos-master-disposable-table-row-capacity-audit/v1'
   ||importPlan?.schema!=='hockeyos-original-master-copy-field-level-import-plan/v1')
  fail('MISSING_OR_UNEXPECTED_SAVED_AUDIT_SCHEMA');
 if(extension?.sourceWorkbookSHA256!==AUTHORITY
   ||capacity?.sourceCopySHA256!==AUTHORITY
   ||importPlan?.sourceWorkbookSHA256!==AUTHORITY)
  fail('ORIGINAL_FORMULA_AUTHORITY_HASH_MISMATCH');
 if(extension?.writeAuthorized!==false
   ||capacity?.workbookOriginalUnmodified!==true
   ||importPlan?.writeAuthorization!==false
   ||importPlan?.originalMasterNotTouched!==true
   ||extension?.originalWorkbookUnchanged!==true)
  fail('SAVED_AUDIT_WRITE_BOUNDARY_INVALID');
 if(extension?.status!=='PROPOSED_TABLE_EXTENSION_LAYOUT_NO_WRITE_AUTHORITY'
   ||importPlan?.status!=='READ_ONLY_SOURCE_DIFF_READY_IMPORT_WRITE_NOT_AUTHORIZED')
  fail('PLANNING_ONLY_STATUS_NOT_PRESERVED');
 if(extension?.existingRecordMatches!==14||importPlan?.existingMatched!==14
    ||extension?.missingSourceRecords!==44||importPlan?.needsNewRows!==44
    ||importPlan?.sourceRecordCount!==58)
  fail('FOUR_GAME_58_RECORD_RECONCILIATION_MISMATCH');
 // Two field differences belong to ONE old record, not two changed players.
 if(extension?.existingRecordCorrectionsToReview!==2
    ||!Array.isArray(importPlan?.existingRecords)||importPlan.existingRecords.length!==14)
  fail('CORRECTION_REVIEW_FIELD_ACCOUNTING_INVALID');
 const corrections=[];
 for(const old of importPlan?.existingRecords||[]){
  if(!Array.isArray(old?.fieldValueDifferences))fail('INVALID_EXISTING_FIELD_DIFFS');
  for(const c of old?.fieldValueDifferences||[]){
   corrections.push({key:old?.key,field:c.field,cell:c.cell,
    containsSourceFormula:c.containsSourceFormula});
   if(!ALLOWED[c.field]||c.containsSourceFormula!==false
     ||!['GQ363','HA363'].includes(c.cell)
     ||!Array.isArray(old.key)||old.key.join('|')!=='359|GoalieStatsByGame|Leong, Dev')
    fail('UNEXPECTED_EXISTING_SOURCE_CORRECTION');
  }
 }
 if(corrections.length!==2||new Set(corrections.map(x=>x.field)).size!==2)
  fail('CORRECTION_FIELDS_NOT_EXACTLY_TWO');
 const placeholder=importPlan?.unverifiedSavedRecords;
 if(!Array.isArray(placeholder)||placeholder.length!==1
    ||placeholder[0]?.key?.join('|')!=='359|SkaterStatsByGame|Unknown, Johnny'
    ||!String(placeholder[0]?.status).includes('HOLD'))
  fail('UNVERIFIED_ORIGINAL_IDENTITY_NOT_QUARANTINED');
 const newRows=extension?.newRowCandidates;
 if(!Array.isArray(newRows)||newRows.length!==44
    ||!Array.isArray(importPlan?.unmatchedHTORecords)
    ||importPlan.unmatchedHTORecords.length!==44)
  fail('SOURCE_EXPANSION_SET_NOT_44_ROWS');
 const existing=new Set((importPlan?.existingRecords||[]).map(x=>x?.key?.join('|')));
 const missing=new Set((importPlan?.unmatchedHTORecords||[]).map(x=>x?.key?.join('|')));
 if(missing.size!==44||existing.size!==14||[...missing].some(x=>existing.has(x)))
  fail('DUPLICATE_OR_OVERLAPPING_EXISTING_SOURCE_KEYS');
 const assigned=new Set(),columns={},groups={};
 for(const table of TABLES){
  const info=capacity?.tableCapacity?.[table];
  const n=ALLOCATIONS[table],last=END[table];
  const physical=extension?.physicalCollisionCellCount?.[table];
  const hits=extension?.collisionSamples?.[table];
  const proposed=extension?.proposedExpansionRows?.[table];
  if(!info||info.declaredTableLastRow!==last
    ||info.lastNamedSheetRow!==last
    ||info.emptyIdentityRowsPresentInXML!==0
    ||info.emptyRowsAfterLastName!==0
    ||extension?.appendCandidatesByTable?.[table]!==n
    ||extension?.['old'+(table==='SkaterStatsByGame'?'Skater':'Goalie')+'TableLastRow']!==last
    ||!proposed||proposed.first!==last+1||proposed.last!==last+n)
   fail('ORIGINAL_FILLED_TABLE_CAPACITY_OR_ALLOCATION_MISMATCH_'+table);
  if(!Array.isArray(hits)||hits.length!==physical)fail('PHYSICAL_COLLISION_RECEIPT_MISMATCH_'+table);
  if(physical>0){
   if(table==='SkaterStatsByGame'&&physical===1
      &&hits[0]?.cell===KNOWN_COLLISION&&hits[0].containsFormula===false
      &&hits[0].hasCachedValue===true)warn('NONEMPTY_CANDIDATE_CELL_Y4674_REQUIRES_HUMAN_DISPOSITION');
   else fail('UNEXPECTED_PROTECTED_OR_FORMULA_CELL_COLLISION_'+table);
  }
  const records=(newRows||[]).filter(x=>x?.key?.[1]===table);
  if(records.length!==n)fail('NEW_ROW_COUNT_MISMATCH_'+table);
  const occupied=new Set();
  for(const r of records){
   const key=r?.key?.join('|'),row=r?.proposedNewWorksheetRow;
   if(!missing.has(key)||existing.has(key)||assigned.has(key)
      ||r.allocationStatus!=='PLAN_ONLY_NO_WRITES'
      ||r.formulaRowsMustBeCopied!==true
      ||!Number.isInteger(row)||row<=last||row>last+n)
    fail('INVALID_NEW_ROW_CANDIDATE_'+table);
   assigned.add(key);
   if(occupied.has(row))fail('DUPLICATED_PROPOSED_ROW_'+table);
   occupied.add(row);
   if(!Number.isInteger(r.sourceInputFieldCount)||r.sourceInputFieldCount<1)
    fail('UNVERIFIED_SOURCE_INPUT_FIELD_COUNT_'+table);
   if(!Number.isInteger(r.sourceHTOGameId)||r.sourceHTOGameId<=0)
    fail('INVALID_HTO_GAME_ID_'+table);
  }
  if(occupied.size!==n||[...Array(n)].some((_,i)=>!occupied.has(last+i+1)))
   fail('PROPOSED_ROWS_NOT_CONTIGUOUS_'+table);
  groups[table]={existingTableLastRow:last,newCandidateCount:records.length,
    proposedFirstRow:last+1,proposedLastRow:last+n,originalFormulaRowsRequireCopy:true,
    physicalCollisionCount:physical};
 }
 if(assigned.size!==44||[...missing].some(x=>!assigned.has(x)))
  fail('ALLOCATED_AND_SOURCE_MISSING_SETS_DO_NOT_MATCH');
 if(extension?.gate?.includes('independent compatible Excel acceptance')!==true)
  fail('ORIGINAL_EXCEL_RELEASE_GATE_NOT_PRESERVED');
 if(errors.length===0)warn('FORMULA_TRANSLATION_AND_FULL_WORKBOOK_RECALCULATION_NOT_VERIFIED');
 return {
  schema:'hockeyos-saved-master-table-expansion-preflight/v1',
  status:errors.length?'BLOCKED_SOURCE_PLAN_INCONSISTENT':'SOURCE_PLAN_PARITY_PASS_EXCEL_RECALCULATION_HOLD',
  errors,warnings,groups,sourceRecords:58,existingRecordsPreserved:13,
  oldRecordCorrectionReviewCount:1,oldRecordCorrectionFieldCount:corrections.length,
  newRowsPlanned:44,unverifiedOldIdentityCount:1,
  immutableSourceHash:AUTHORITY,originalWorkbookOpened:false,
  originalWorkbookModified:false,operationalWorkbookWritten:false,
  originalFormulaCellsTranslated:false,allElevenAwardScoresRecalculated:false,
  independentReviewerAccepted:false,publishAuthorized:false,writeAuthorized:false
 };
}
module.exports={check};
