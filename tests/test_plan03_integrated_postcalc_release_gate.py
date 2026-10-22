"""Offline fail-closed acceptance tests for integrated full-calc and HTO parity."""
import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_postcalc_release_gate import (
    validate_evidence,IntegratedHold,ORIGINAL_SHA,COMBINED_CALCULATED_SHA,EXPECTED_COMPOSITE_SHA
)

def fixture():
    source={"status":"COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD",
        "reviewedChanges":{"total":497,"HTOPlayerCells":460,"periodScoreInputs":32,
                           "goalieSourceCorrections":4,"whitespaceDisposition":1,
                           "sourceUnknownFieldsBlank":41},
        "formulaCount":545506,"formulaDefinitionsPreserved":True,"newExcelErrors":0,
        "verifiedFourGameGF":6,"verifiedFourGameGA":19,"verifiedFourGameRecord":"0-4",
        "nextScheduledGameUnplayed":True,"originalWorkbookModified":False}
    app={"schema":"brave-hc-private-full-calculation-excel-qa/v1",
         "status":"FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA",
         "candidateSaved":True,"worksheetCount":17,
         "sourceSHA256":EXPECTED_COMPOSITE_SHA,
         "rollbackSHA256":EXPECTED_COMPOSITE_SHA,
         "candidateSHA256":COMBINED_CALCULATED_SHA,
         "sourceWorkbookModified":False,"externalConnectionsRefreshed":False,
         "pivotRefreshAllUsed":False}
    errors=[{"sheet":"Skater Profile","ref":"I13","error":"#REF!"},
            {"sheet":"Skater Profile","ref":"J13","error":"#REF!"}]
    qa={"schema":"brave-hc-plan03-private-full-calc-qa/v1",
        "status":"FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY",
        "issues":[],"sourceSHA256":ORIGINAL_SHA,
        "beforeSHA256":EXPECTED_COMPOSITE_SHA,
        "afterSHA256":COMBINED_CALCULATED_SHA,
        "totalFormulasBefore":545506,"totalFormulasAfter":545506,
        "newErrorEvents":[],"beforeErrors":errors,"afterErrors":copy.deepcopy(errors),
        "originalWorkbookModified":False}
    hto={"schema":"brave-hc-plan03-pivot-hto-parity/v1",
         "status":"DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED",
         "officialGames":4,"skaterBasicSourceParity":True,
         "goalieBasicSourceParity":True,"skaterIdentityCount":20,"goalieIdentityCount":3,
         "unknownHTOFields":{"skaterPIM":42,"goaliePOTG":1},
         "goaliePOTGComplete":False,"publicPlayerStatsReleaseAuthorized":False,
         "fifthHTOGameAdmitted":False}
    return source,app,qa,hto

class FullCompositeAcceptance(unittest.TestCase):
    def test_valid_full_calculated_composite_remains_owner_held(self):
        result=validate_evidence(*fixture())
        self.assertEqual(result["status"],"COMBINED_497_SOURCE_CALCFULL_BASIC_HTO_PARITY_PASS_RELEASE_HELD")
        self.assertTrue(result["compositeCalculateFullCompleted"])
        self.assertEqual(result["officialUnknownInputCellsStillBlank"],41)
        self.assertFalse(result["sourceOfTruthOwnerApprovalRecorded"])
        self.assertFalse(result["liveRecordWatchCertified"])
        self.assertFalse(result["awardRankingsCertified"])
    def test_unsupported_pim_zero_invention_holds(self):
        data=list(fixture());data[3]["unknownHTOFields"]["skaterPIM"]=0
        with self.assertRaisesRegex(IntegratedHold,"HTO_SKATER_GOALIE_PIVOT_EVIDENCE"):
            validate_evidence(*data)
    def test_unverified_goalie_potg_zero_invention_holds(self):
        data=list(fixture());data[3]["unknownHTOFields"]["goaliePOTG"]=0
        with self.assertRaisesRegex(IntegratedHold,"HTO_SKATER_GOALIE_PIVOT_EVIDENCE"):
            validate_evidence(*data)
    def test_source_change_count_drift_holds(self):
        data=list(fixture());data[0]["reviewedChanges"]["HTOPlayerCells"]=461
        with self.assertRaisesRegex(IntegratedHold,"HTO_SOURCE_CHANGE_SET_CHANGED"):
            validate_evidence(*data)
    def test_unadmitted_future_game_holds(self):
        data=list(fixture());data[0]["nextScheduledGameUnplayed"]=False
        with self.assertRaisesRegex(IntegratedHold,"COMBINED_CALCULATED_SOURCE_CONTRACT_CHANGED"):
            validate_evidence(*data)
    def test_excel_save_not_completed_holds(self):
        data=list(fixture());data[1]["candidateSaved"]=False
        with self.assertRaisesRegex(IntegratedHold,"FULL_CALC_EXCEL_APPLICATION_EVIDENCE"):
            validate_evidence(*data)
    def test_input_source_sha_drift_holds(self):
        data=list(fixture());data[1]["sourceSHA256"]="f"*64
        with self.assertRaisesRegex(IntegratedHold,"FULL_CALC_EXCEL_APPLICATION_EVIDENCE"):
            validate_evidence(*data)
    def test_new_excel_error_holds(self):
        data=list(fixture());data[2]["newErrorEvents"]=[["Player Stats","A1","#VALUE!"]]
        with self.assertRaisesRegex(IntegratedHold,"INDEPENDENT_FULL_CALC_ERROR_AUDIT"):
            validate_evidence(*data)
    def test_preexisting_profile_ref_cannot_be_silently_deleted(self):
        data=list(fixture());data[2]["afterErrors"]=[]
        with self.assertRaisesRegex(IntegratedHold,"HISTORICAL_PROFILE_REF_ERROR_SCOPE_CHANGED"):
            validate_evidence(*data)
    def test_formula_count_change_holds(self):
        data=list(fixture());data[0]["formulaCount"]=545505
        with self.assertRaisesRegex(IntegratedHold,"COMBINED_CALCULATED_SOURCE_CONTRACT_CHANGED"):
            validate_evidence(*data)
    def test_external_refreshall_not_part_of_accepted_test(self):
        data=list(fixture());data[1]["pivotRefreshAllUsed"]=True
        with self.assertRaisesRegex(IntegratedHold,"FULL_CALC_EXCEL_APPLICATION_EVIDENCE"):
            validate_evidence(*data)
    def test_missing_goalie_identity_holds(self):
        data=list(fixture());data[3]["goalieIdentityCount"]=2
        with self.assertRaisesRegex(IntegratedHold,"HTO_SKATER_GOALIE_PIVOT_EVIDENCE"):
            validate_evidence(*data)
    def test_original_master_sha_change_holds(self):
        with self.assertRaisesRegex(IntegratedHold,"ORIGINAL_OR_COMPOSITE_POSTCALC_HASH_DRIFT"):
            validate_evidence(*fixture(),original_sha="b"*64)

if __name__=="__main__":
    unittest.main()
