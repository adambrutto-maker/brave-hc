"""Synthetic fail-closed tests for private composite CalculateFull acceptance."""
import copy
from pathlib import Path
import sys
import tempfile
from zipfile import ZipFile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_composite_recalc_acceptance import judged,PromotionHold,KNOWN_GAMES
from audit_plan03_composite_497_parity import future_period_inputs

def fixture():
    errors=[{"sheet":"Skater Profile","ref":"I13","error":"#REF!"},
            {"sheet":"Skater Profile","ref":"J13","error":"#REF!"}]
    qa={"status":"FULL_CALC_NO_NEW_FORMULA_ERRORS_REVIEW_ONLY",
        "issues":[],"totalFormulasBefore":545506,"totalFormulasAfter":545506,
        "beforeErrors":copy.deepcopy(errors),"afterErrors":copy.deepcopy(errors)}
    app={"status":"FULL_CALC_DISPOSABLE_SAVED_FOR_INDEPENDENT_QA",
        "candidateSaved":True,
        "sourceSHA256":"9f83ef35d9fdb5cfeee52997e06080b7e4fce246855cd3925517b451d83e4d08",
        "candidateSHA256":"231c1e91cdb833f23b4d49a10f3a3050c941205651ca7e9556c0badd029643e9",
        "actualCalculationSeconds":531.61,"worksheetCount":17}
    team={}
    for row,(gf,ga,diff,result,count) in KNOWN_GAMES.items():
        for col,v in (("O",gf),("T",ga),("W",diff),("X",count)):
            team[f"{col}{row}"]=str(v)
        team[f"U{row}"]=result
    team["AN37"]="4";team["X374"]="0"
    pivots={"status":"DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED",
            "skaterBasicSourceParity":True,"goalieBasicSourceParity":True,
            "skaterIdentityCount":20,"goalieIdentityCount":3,
            "unknownHTOFields":{"skaterPIM":42,"goaliePOTG":1}}
    return qa,app,team,pivots

class CompositeCalcAcceptance(unittest.TestCase):
 def test_verified_composite_stays_publication_held(self):
    result=judged(*fixture())
    self.assertEqual(result["status"],"COMPOSITE_CALC_AND_BASIC_HTO_PARITY_PASS_RELEASE_HELD")
    self.assertEqual(result["reviewedSourceChanges"],497)
    self.assertFalse(result["awardsForecastsAndStreaksCertified"])
    self.assertFalse(result["currentRecordWatchOrPlayerPublicationAuthorized"])
    self.assertFalse(result["originalWorkbookOwnerApprovalRecorded"])
 def test_new_formula_value_error_blocks(self):
    qa,app,team,pivots=fixture()
    qa["afterErrors"].append({"sheet":"Player Stats","ref":"Z649","error":"#VALUE!"})
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_EXCEL_ERROR_SET"):
        judged(qa,app,team,pivots)
 def test_missing_old_ref_error_changes_baseline(self):
    qa,app,team,pivots=fixture()
    qa["afterErrors"].pop()
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_EXCEL_ERROR_SET"):
        judged(qa,app,team,pivots)
 def test_calculated_file_hash_must_match_receipt(self):
    qa,app,team,pivots=fixture()
    app["candidateSHA256"]="0"*64
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_CALCULATED_OUTPUT_SHA"):
        judged(qa,app,team,pivots)
 def test_private_copy_source_hash_matters(self):
    qa,app,team,pivots=fixture()
    app["sourceSHA256"]="0"*64
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_EXCEL_SOURCE_SHA"):
        judged(qa,app,team,pivots)
 def test_formula_count_changed_refused(self):
    qa,app,team,pivots=fixture()
    qa["totalFormulasAfter"]=545505
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_FORMULA_COUNT"):
        judged(qa,app,team,pivots)
 def test_16_sheets_cannot_be_called_full_calculation(self):
    qa,app,team,pivots=fixture();app["worksheetCount"]=16
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_17_SHEET_CALC"):
        judged(qa,app,team,pivots)
 def test_four_game_score_mismatch_is_hard_hold(self):
    qa,app,team,pivots=fixture();team["T373"]="6"
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_SCORE_OR_COUNT_INCORRECT"):
        judged(qa,app,team,pivots)
 def test_future_fixture_count_not_admitted(self):
    qa,app,team,pivots=fixture();team["X374"]="1"
    with self.assertRaisesRegex(PromotionHold,"2026_COMPLETED_COUNT_OR_FUTURE_ADMISSION"):
        judged(qa,app,team,pivots)
 def test_unverified_2026_game_count_holds(self):
    qa,app,team,pivots=fixture();team["AN37"]="3"
    with self.assertRaisesRegex(PromotionHold,"2026_COMPLETED_COUNT_OR_FUTURE_ADMISSION"):
        judged(qa,app,team,pivots)
 def test_goalie_source_parity_failure_blocks(self):
    qa,app,team,pivots=fixture();pivots["goalieBasicSourceParity"]=False
    with self.assertRaisesRegex(PromotionHold,"HTO_PLAYER_SEASON_SOURCE_PARITY"):
        judged(qa,app,team,pivots)
 def test_pim_unknown_cannot_be_assumed_complete(self):
    qa,app,team,pivots=fixture();pivots["unknownHTOFields"]["skaterPIM"]=0
    with self.assertRaisesRegex(PromotionHold,"HTO_UNKNOWN_SOURCE_COVERAGE"):
        judged(qa,app,team,pivots)
 def test_unplayed_future_row_xml_stays_blank(self):
    ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    body=f'<worksheet xmlns="{ns}"><sheetData><row r="374"><c r="K374" s="2"/><c r="S374"/></row></sheetData></worksheet>'
    with tempfile.TemporaryDirectory() as tmp:
        p=Path(tmp)/"test.xlsx"
        with ZipFile(p,"w") as z:z.writestr("xl/worksheets/sheet12.xml",body)
        result=future_period_inputs(p)
        self.assertFalse(result["futureGameAdmitted"])
 def test_unplayed_future_row_numbered_zero_is_not_blank(self):
    ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    body=f'<worksheet xmlns="{ns}"><sheetData><row r="374"><c r="K374"><v>0</v></c></row></sheetData></worksheet>'
    with tempfile.TemporaryDirectory() as tmp:
        p=Path(tmp)/"test.xlsx"
        with ZipFile(p,"w") as z:z.writestr("xl/worksheets/sheet12.xml",body)
        with self.assertRaisesRegex(PromotionHold,"UNPLAYED_FIFTH_GAME_HAS_SOURCE_DATA"):
            future_period_inputs(p)

if __name__=="__main__":
    unittest.main()
