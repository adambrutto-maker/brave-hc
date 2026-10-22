"""Fail-closed offline source and formula integrity tests for combined 497-cell QA."""
import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_composite_497_cell_readback import (
    verify,PromotionHold,ORIGINAL_ERRORS,SOURCE_GOALS,CORRECTED_GOALIE
)

def fixtures():
    plan={
      3:{f"A{n}":("number",str(n%6)) for n in range(100,560)},
      12:{f"{col}{n}":("number",str(v))
          for n,(gf,ga) in SOURCE_GOALS.items()
          for col,v in zip("KLMNPQRS",[0,0,0,gf,0,0,0,ga])},
    }
    withheld={f"AB{n}" for n in range(100,141)}
    prev_sha={"skaters":"legacySkater","goalies":"legacyGoalie","masterSchedule":"legacySchedule"}
    counts={"skaters":694249,"goalies":39239,"masterSchedule":6836}
    def data(tables):
        return {"tableRefs":dict(tables),
                "legacyManualHashes":dict(prev_sha),"legacyManualCounts":dict(counts),
                "unexpectedAppendedManualCells":[],
                "targetCellValues":{3:{},12:{}}}
    old=data({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    new=data({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    combined=copy.deepcopy(new)
    for ref,value in plan[3].items():
        new["targetCellValues"][3][ref]=value
        combined["targetCellValues"][3][ref]=value
    for ref,value in plan[12].items():
        combined["targetCellValues"][12][ref]=value
    for ref,(a,b) in CORRECTED_GOALIE.items():
        old["targetCellValues"][3][ref]=("number",str(a))
        new["targetCellValues"][3][ref]=("number",str(b))
        combined["targetCellValues"][3][ref]=("number",str(b))
    old["targetCellValues"][3]["Y4674"]=("text"," ")
    new["targetCellValues"][3]["Y4674"]=None
    combined["targetCellValues"][3]["Y4674"]=None
    names=["Sheet "+str(i) for i in range(17)]
    def formulas():
        return {
          "names":list(names),"packageMembers":{"xl/workbook.xml","xl/worksheets/sheet3.xml"},
          "formulaCounts":{name:545506 if i==0 else 0 for i,name in enumerate(names)},
          "digest":{name:"sample_"+name for name in names},
          "errors":set(ORIGINAL_ERRORS),
          "masterCells":{},
        }
    first=formulas()
    second=formulas()
    for row,(gf,ga) in SOURCE_GOALS.items():
        second["masterCells"].update({
            f"O{row}":str(gf),f"T{row}":str(ga),f"U{row}":"L",f"X{row}":"1"})
    second["masterCells"]["X374"]="0"
    return old,new,combined,plan,withheld,first,second

class CompositeSourceReview(unittest.TestCase):
    def check(self,parts):
        return verify(*parts)
    def test_all_497_valid_source_inputs_accept_disposable_only(self):
        r=self.check(fixtures())
        self.assertEqual(r["status"],"COMPOSITE_497_SOURCE_CELLS_VERIFIED_OWNER_APPROVAL_HELD")
        self.assertEqual(r["reviewedChanges"]["total"],497)
        self.assertEqual(r["reviewedChanges"]["sourceUnknownFieldsBlank"],41)
        self.assertEqual(r["verifiedFourGameRecord"],"0-4")
        self.assertTrue(r["formulaDefinitionsPreserved"])
        self.assertFalse(r["originalWorkbookWritesAuthorized"])
        self.assertFalse(r["compositeFullWorkbookCalculateFullExecuted"])
    def test_unsupported_field_is_never_coerced_to_zero(self):
        args=list(fixtures())
        args[2]["targetCellValues"][3]["AB100"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"UNSUPPORTED_SOURCE_STAT_POPULATED"):
            self.check(args)
    def test_missing_player_cell_holds(self):
        args=list(fixtures())
        args[2]["targetCellValues"][3]["A100"]=None
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_HTO_PLAYER_INPUT_MISMATCH"):
            self.check(args)
    def test_missing_zero_period_holds(self):
        args=list(fixtures())
        args[2]["targetCellValues"][12]["K370"]=None
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_PERIOD_SCORE_MISMATCH"):
            self.check(args)
    def test_wrong_game_result_fails(self):
        args=list(fixtures())
        args[-1]["masterCells"]["U373"]="T"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_COMPLETED_GAME_FORMULA_CACHE_DRIFT"):
            self.check(args)
    def test_future_unplayed_fixture_never_counted(self):
        args=list(fixtures())
        args[-1]["masterCells"]["X374"]="1"
        with self.assertRaisesRegex(PromotionHold,"FUTURE_OCT25_GAME_COUNTED"):
            self.check(args)
    def test_formula_change_holds(self):
        args=list(fixtures())
        args[-1]["digest"]["Sheet 1"]="some other expression"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_FORMULA_DEFINITIONS_CHANGED"):
            self.check(args)
    def test_new_formula_error_holds(self):
        args=list(fixtures())
        args[-1]["errors"].add(("Player Stats","Z649","#VALUE!"))
        with self.assertRaisesRegex(PromotionHold,"NEW_OR_UNRESOLVED_COMPOSITE_EXCEL_ERROR"):
            self.check(args)
    def test_original_manual_source_mutation_holds(self):
        args=list(fixtures())
        args[2]["legacyManualHashes"]["goalies"]="different"
        with self.assertRaisesRegex(PromotionHold,"EXISTING_MANUAL_SOURCE_MODIFIED"):
            self.check(args)
    def test_original_goalie_record_must_not_be_reverted(self):
        args=list(fixtures())
        args[2]["targetCellValues"][3]["GQ363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_GOALIE_SOURCE_CHANGED"):
            self.check(args)
    def test_whitespace_must_be_empty_not_a_recorded_shg_zero(self):
        args=list(fixtures())
        args[2]["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"Y4674_MUST_BE_BLANK"):
            self.check(args)
    def test_existing_structured_table_ranges_must_be_preserved(self):
        args=list(fixtures())
        args[2]["tableRefs"]["SkaterStatsByGame"]="A2:FB4800"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_EXPANDED_SOURCE_TABLES_CHANGED"):
            self.check(args)
    def test_only_original_error_baseline_allowed(self):
        args=list(fixtures())
        args[-2]["errors"]=set()
        with self.assertRaisesRegex(PromotionHold,"PRIOR_PRIVATE_ERROR_BASELINE_CHANGED"):
            self.check(args)

if __name__=="__main__":
    unittest.main()
