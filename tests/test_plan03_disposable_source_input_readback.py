"""Plan03 no-network acceptance tests for 43-row source-only Excel copy readback."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_disposable_source_input_readback import compare,ImportHold,TABLE_REFS

def fixture():
 oldhash={"manualSHA256":"m","formulaSHA256":"f","manualCount":250,"formulaCount":100}
 pre={"members":{"xl/workbook.xml","xl/worksheets/sheet3.xml"},
      "table":dict(TABLE_REFS),
      "existing":{"skaters":dict(oldhash),"goalies":dict(oldhash)},
      "appended":{"skaters":{"Y4674":{"formula":None,"value":" "}},
                  "goalies":{}}}
 post=copy.deepcopy(pre)
 skater=[]
 for i,n in enumerate(range(4669,4709)):
  fields={"A":360 if i<15 else 361 if i<28 else 362,
          "Q":f"Player-{i}","S":1}
  for col,value in fields.items():post["appended"]["skaters"][f"{col}{n}"]={"formula":None,"value":str(value)}
  skater.append({"worksheetRow":n,"proposedSourceOnlyCells":fields,
                 "withheldHTOFields":[{"column":"AB","sourceField":"pim"}] if i<28 else []})
 goalies=[]
 for i,n in enumerate((364,365,366)):
  fields={"FD":360+i,"GH":f"Goalie-{i}","GI":1}
  for col,value in fields.items():post["appended"]["goalies"][f"{col}{n}"]={"formula":None,"value":str(value)}
  goalies.append({"worksheetRow":n,"proposedSourceOnlyCells":fields,
                  "withheldHTOFields":[{"column":"HA","sourceField":"potg"}] if i==2 else []})
 staging={"schema":"brave-hc-private-game-log-gtg-join-receipt/v1",
     "result":{"schema":"brave-hc-private-source-joined-game-log-staging/v1",
         "status":"HTO_GTGS_JOINED_REVIEW_ONLY",
         "stagedRows":{"skaters":40,"goalies":3},
         "structuredTableResizeApproved":False,
         "sourceProposedRows":{"skaters":skater,"goalies":goalies}}}
 receipt={"schema":"brave-hc-private-source-only-disposable-import/v1",
      "status":"SOURCE_ONLY_INPUT_STAGED_NOT_RECALCULATED","saved":True,
      "originalWorkbookChanged":False,"sourceOfTruthPromotionApproved":False,
      "publicStatisticsReleased":False,"Y4674Preserved":True,
      "stagedSkaterRows":40,"stagedGoalieRows":3,
      "stagedSourceInputCells":129,"unknownSourceCellsPreservedBlank":29}
 return pre,post,staging,receipt

class SourceOnlyExcelReadback(unittest.TestCase):
 def test_verified_43rows_and_unmodified_legacy_source(self):
  result=compare(*fixture())
  self.assertEqual(result["status"],"DISPOSABLE_43ROW_SOURCE_FIELDS_VALIDATED_NOT_FOR_PUBLICATION")
  self.assertEqual(result["sourceStagedCells"],129)
  self.assertEqual(result["withheldUnknownFields"],29)
  self.assertFalse(result["publicReleaseApproved"])
 def test_recovered_saved_candidate_can_be_checked_without_false_clean_shutdown(self):
  a,b,c,d=fixture()
  d["schema"]="brave-hc-private-source-only-disposable-import-recovery/v1"
  d["status"]="SAVED_CANDIDATE_APP_CLEANUP_INTERRUPTED"
  d["sourceAppCleanShutdownVerified"]=False
  d["isolatedWorkersCleanedUp"]=True
  d["originalSourceHashChecked"]=True
  result=compare(a,b,c,d)
  self.assertTrue(result["recoveredFromMissingAppReceipt"])
  self.assertFalse(result["applicationCleanShutdownVerified"])
  self.assertFalse(result["publicReleaseApproved"])
 def test_unverified_recovery_worker_cleanup_is_not_accepted(self):
  a,b,c,d=fixture()
  d.update(schema="brave-hc-private-source-only-disposable-import-recovery/v1",
      status="SAVED_CANDIDATE_APP_CLEANUP_INTERRUPTED",
      sourceAppCleanShutdownVerified=False,isolatedWorkersCleanedUp=False,
      originalSourceHashChecked=True)
  with self.assertRaisesRegex(ImportHold,"SOURCE_IMPORT_RECEIPT_INVALID"):
   compare(a,b,c,d)
 def test_formulas_must_remain_identical(self):
  a,b,c,d=fixture()
  a["appended"]["skaters"]["B4669"]={"formula":"=VLOOKUP(A4669,Range,1)","value":None}
  b["appended"]["skaters"]["B4669"]={"formula":"=WRONG()","value":None}
  with self.assertRaisesRegex(ImportHold,"STRUCTURED_EXCEL_FORMULA_CHANGED"):
   compare(a,b,c,d)
 def test_existing_manual_source_cannot_be_changed(self):
  a,b,c,d=fixture()
  b["existing"]["goalies"]["manualSHA256"]="changed"
  with self.assertRaisesRegex(ImportHold,"EXISTING_FORMULA_OR_MANUAL_SOURCE_CHANGED"):
   compare(a,b,c,d)
 def test_unknown_pim_cannot_be_filled_as_zero(self):
  a,b,c,d=fixture()
  b["appended"]["skaters"]["AB4669"]={"formula":None,"value":"0"}
  with self.assertRaisesRegex(ImportHold,"UNKNOWN_SOURCE_FIELD_WAS_FILLED"):
   compare(a,b,c,d)
 def test_unknown_goalie_potg_cannot_be_filled_as_zero(self):
  a,b,c,d=fixture()
  b["appended"]["goalies"]["HA366"]={"formula":None,"value":"0"}
  with self.assertRaisesRegex(ImportHold,"UNKNOWN_SOURCE_FIELD_WAS_FILLED"):
   compare(a,b,c,d)
 def test_unapproved_extra_source_value_rejected(self):
  a,b,c,d=fixture()
  b["appended"]["skaters"]["AA4699"]={"formula":None,"value":"5"}
  with self.assertRaisesRegex(ImportHold,"UNAPPROVED_MANUAL_VALUE_ADDED"):
   compare(a,b,c,d)
 def test_preserved_whitespace_provenance_required(self):
  a,b,c,d=fixture()
  b["appended"]["skaters"]["Y4674"]["value"]=None
  with self.assertRaisesRegex(ImportHold,"SOURCE_WHITESPACE_MARKER_CHANGED"):
   compare(a,b,c,d)
 def test_source_row_count_drift_rejected(self):
  a,b,c,d=fixture()
  c["result"]["sourceProposedRows"]["skaters"].pop()
  with self.assertRaisesRegex(ImportHold,"STAGED_SOURCE_ROW_RANGE_INVALID"):
   compare(a,b,c,d)
 def test_receipt_must_not_claim_public_release(self):
  a,b,c,d=fixture()
  d["publicStatisticsReleased"]=True
  with self.assertRaisesRegex(ImportHold,"SOURCE_IMPORT_ACCEPTANCE_NOT_RECORDED"):
   compare(a,b,c,d)
 def test_unapproved_missing_row_value_rejected(self):
  a,b,c,d=fixture()
  del b["appended"]["skaters"]["S4669"]
  with self.assertRaisesRegex(ImportHold,"HTO_STAGED_INPUT_MISSING"):
   compare(a,b,c,d)
 def test_table_boundary_drift_rejected(self):
  a,b,c,d=fixture()
  b["table"]["GoalieStatsByGame"]="FD2:JO367"
  with self.assertRaisesRegex(ImportHold,"EXPECTED_RESIZED_TABLE_BOUNDS_CHANGED"):
   compare(a,b,c,d)

if __name__=="__main__":unittest.main()
