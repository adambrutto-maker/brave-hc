"""No-network / no-Excel tests of the Plan03 error recovery acceptance contract."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_formula_error_recovery import (
    classify,FormulaRecoveryHold,ORIGINAL_SHA,BEFORE_SHA,EXPECTED_ORIGINAL,NEW_ERRORS,
)

AFTER_SHA="bdf5ae1482c5ca5f439b2d073684e8e862cb74f1d0123d77a965497726c27cbd"

def fixture():
    sheets=[f"Worksheet {i}" for i in range(1,16)]+["Player Game Logs","Skater Profile"]
    member_names={"xl/workbook.xml","xl/worksheets/sheet3.xml","xl/sharedStrings.xml"}
    def base():
        return {
          "names":list(sheets),"memberNames":set(member_names),
          "errors":set(EXPECTED_ORIGINAL),
          "formulaCount":545506,
          "formulas":{name:"digest"+name for name in sheets},
          "samples":{"GJ363":("0",False),"GK363":("1",False),
                     "GQ363":("3",False),"HA363":("1",False)}
        }
    original=base()
    before=base();before["errors"]|=set(NEW_ERRORS)
    before["samples"]["Y4674"]=(" ",False)
    after=base();after["samples"]["Y4674"]=(None,False)
    return original,before,after

def check(data,*, original_sha=ORIGINAL_SHA,before_sha=BEFORE_SHA,after_sha=AFTER_SHA):
    return classify(*data,original_sha=original_sha,before_sha=before_sha,after_sha=after_sha)

class RecoveryTests(unittest.TestCase):
    def test_three_new_value_errors_removed_only_in_disposable_copy(self):
        r=check(fixture())
        self.assertEqual(r["status"],"THREE_VALUE_ERRORS_CLEARED_DISPOSABLE_ONLY")
        self.assertEqual(r["newValueErrorsBefore"],3)
        self.assertEqual(r["newValueErrorsAfter"],0)
        self.assertEqual(r["originalBaselineErrors"],2)
        self.assertFalse(r["awardsAndPublicReleaseAuthorized"])
    def test_previously_existing_skater_profile_refs_remain_baseline(self):
        original,before,after=fixture()
        after["errors"].remove(("Skater Profile","I13","#REF!"))
        with self.assertRaisesRegex(FormulaRecoveryHold,"NEW_OR_UNREPAIRED"):
            check((original,before,after))
    def test_any_new_value_error_holds(self):
        original,before,after=fixture()
        after["errors"].add(("Player Stats","Z649","#VALUE!"))
        with self.assertRaisesRegex(FormulaRecoveryHold,"NEW_OR_UNREPAIRED"):
            check((original,before,after))
    def test_original_source_error_drift_holds(self):
        original,before,after=fixture()
        original["errors"].add(("Player Stats","A1","#REF!"))
        with self.assertRaisesRegex(FormulaRecoveryHold,"ORIGINAL_SOURCE_ERRORS"):
            check((original,before,after))
    def test_before_evidence_cannot_silently_lose_prior_errors(self):
        original,before,after=fixture()
        before["errors"].remove(("Player Game Logs","BC4674","#VALUE!"))
        with self.assertRaisesRegex(FormulaRecoveryHold,"PRE_REPAIR_ERROR_SET"):
            check((original,before,after))
    def test_source_hash_change_holds(self):
        with self.assertRaisesRegex(FormulaRecoveryHold,"IMMUTABLE_OR_PRE_REPAIR"):
            check(fixture(),original_sha="b"*64)
    def test_stored_formula_text_change_holds(self):
        original,before,after=fixture()
        after["formulas"]["Player Game Logs"]="altered"
        with self.assertRaisesRegex(FormulaRecoveryHold,"FORMULA_COUNT_OR_DEFINITION"):
            check((original,before,after))
    def test_formula_count_change_holds(self):
        original,before,after=fixture()
        after["formulaCount"]-=1
        with self.assertRaisesRegex(FormulaRecoveryHold,"FORMULA_COUNT_OR_DEFINITION"):
            check((original,before,after))
    def test_unsupported_whitespace_marked_as_numeric_zero_holds(self):
        original,before,after=fixture()
        after["samples"]["Y4674"]=("0",False)
        with self.assertRaisesRegex(FormulaRecoveryHold,"Y4674_DISPOSABLE_CLEANUP_NOT_BLANK"):
            check((original,before,after))
    def test_existing_goalie_input_changes_hold(self):
        original,before,after=fixture()
        after["samples"]["GQ363"]=("0",False)
        with self.assertRaisesRegex(FormulaRecoveryHold,"GOALIE_PREVIOUSLY_VERIFIED_DATA_CHANGED"):
            check((original,before,after))
    def test_sheets_added_or_removed_holds(self):
        original,before,after=fixture()
        after["names"].append("Invalid Sheet")
        with self.assertRaisesRegex(FormulaRecoveryHold,"WORKBOOK_SHEET_NAMES"):
            check((original,before,after))
    def test_changed_package_component_set_holds(self):
        original,before,after=fixture()
        after["memberNames"].add("xl/worksheets/sheet18.xml")
        with self.assertRaisesRegex(FormulaRecoveryHold,"EXCEL_PACKAGE_STRUCTURE_DRIFT"):
            check((original,before,after))

if __name__=="__main__":
    unittest.main()
