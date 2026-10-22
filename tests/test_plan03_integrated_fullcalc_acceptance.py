"""Offline fail-closed gates for Plan03 integrated 17-sheet full calculation."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_fullcalc_acceptance import (
    verify_calculation_evidence, verify_full_integration,
    PromotionHold, COMPOSITE_SHA, FINAL_SHA,
)
from test_plan03_integrated_497_cells import case

def synthetic():
    app={"schema":"brave-hc-private-full-calculation-excel-qa/v1",
         "status":"FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA",
         "candidateSaved":True,"worksheetCount":17,
         "sourceSHA256":COMPOSITE_SHA,"rollbackSHA256":COMPOSITE_SHA,
         "candidateSHA256":FINAL_SHA,"sourceWorkbookModified":False}
    error=[{"sheet":"Skater Profile","ref":"I13","error":"#REF!"},
           {"sheet":"Skater Profile","ref":"J13","error":"#REF!"}]
    sheets=[{"sheet":f"Sheet {n}","formulasAfter":0,
             "formulaDefinitionsPreserved":True} for n in range(17)]
    sheets[0]["formulasAfter"]=545506
    report={"schema":"brave-hc-plan03-private-full-calc-qa/v1",
            "status":"FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY",
            "issues":[],"newErrorEvents":[],"totalFormulasBefore":545506,
            "totalFormulasAfter":545506,"beforeSHA256":COMPOSITE_SHA,
            "afterSHA256":FINAL_SHA,"originalWorkbookModified":False,
            "beforeErrors":copy.deepcopy(error),"afterErrors":copy.deepcopy(error),
            "perSheet":sheets}
    return app,report

class FullCalcReceiptTests(unittest.TestCase):
    def test_correct_17_sheet_receipts_pass_without_awards_approval(self):
        app,report=synthetic()
        result=verify_calculation_evidence(app,report)
        self.assertTrue(result["all17SheetFormulaDefinitionsPreserved"])
        self.assertEqual(result["newExcelFormulaErrors"],0)
        self.assertFalse(result["all17SheetBusinessRulesCertified"])
    def test_excel_candidate_must_be_saved(self):
        app,report=synthetic();app["candidateSaved"]=False
        with self.assertRaisesRegex(PromotionHold,"EXCEL_APP_RECEIPT"):
            verify_calculation_evidence(app,report)
    def test_unsafe_external_fullcalc_source_rejected(self):
        app,report=synthetic();app["sourceSHA256"]="a"*64
        with self.assertRaisesRegex(PromotionHold,"EXCEL_APP_RECEIPT"):
            verify_calculation_evidence(app,report)
    def test_full_calc_stored_hash_changed_rejected(self):
        app,report=synthetic();report["afterSHA256"]="0"*64
        with self.assertRaisesRegex(PromotionHold,"INDEPENDENT_17_SHEET_QA"):
            verify_calculation_evidence(app,report)
    def test_generated_excel_error_rejected(self):
        app,report=synthetic()
        report["afterErrors"].append({"sheet":"Player Stats","ref":"Z649","error":"#VALUE!"})
        with self.assertRaisesRegex(PromotionHold,"PROFILE_REF_ERROR_SCOPE_CHANGED"):
            verify_calculation_evidence(app,report)
    def test_erasing_original_source_ref_error_does_not_count_as_full_pass(self):
        app,report=synthetic();report["afterErrors"].pop()
        with self.assertRaisesRegex(PromotionHold,"PROFILE_REF_ERROR_SCOPE_CHANGED"):
            verify_calculation_evidence(app,report)
    def test_changed_formula_definition_is_blocked(self):
        app,report=synthetic();report["perSheet"][6]["formulaDefinitionsPreserved"]=False
        with self.assertRaisesRegex(PromotionHold,"FORMULA_INTEGRITY_CHANGED"):
            verify_calculation_evidence(app,report)
    def test_missing_seventeenth_sheet_is_blocked(self):
        app,report=synthetic();report["perSheet"].pop()
        with self.assertRaisesRegex(PromotionHold,"FORMULA_INTEGRITY_CHANGED"):
            verify_calculation_evidence(app,report)
    def test_truncated_full_calc_receipt_is_blocked(self):
        app,report=synthetic();report["issues"]=["PIVOT_BAD"]
        with self.assertRaisesRegex(PromotionHold,"INDEPENDENT_17_SHEET_QA"):
            verify_calculation_evidence(app,report)
    def test_composite_verified_before_and_after_still_not_owner_approval(self):
        original,prior,composite,proposed,unknown=case()
        after=copy.deepcopy(composite)
        app,report=synthetic()
        result=verify_full_integration(original,prior,composite,after,
            proposed,unknown,app,report,feed={})
        self.assertEqual(result["status"],"COMBINED_497_HTO_BASIC_STATS_AND_FORMULAS_PASS_OWNER_RELEASE_HELD")
        self.assertFalse(result["sourceOfTruthWorkbookModified"])
        self.assertFalse(result["sourceOwnerApprovalRecorded"])
        self.assertFalse(result["currentAwardsProjectionsAndLiveRecordWatchApproved"])
    def test_full_calculation_must_preserve_source_periods(self):
        original,prior,composite,proposed,unknown=case()
        after=copy.deepcopy(composite)
        after["targetCellValues"][12]["K370"]=None
        app,report=synthetic()
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_INPUT_CONFLICT"):
            verify_full_integration(original,prior,composite,after,
                proposed,unknown,app,report,feed={})

if __name__=="__main__":
    unittest.main()
