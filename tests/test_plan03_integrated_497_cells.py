"""Offline fail-closed Plan 03 integrated 497-cell source contract tests."""
from copy import deepcopy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_497_cells import (
    verify_integrated, verify_master_cache, PromotionHold,
    GAME_RESULTS, CORRECTED_GOALIE, ORIGINAL_SHA, PRIVATE_CALC_SHA,
)

def case():
    period={f"{col}{row}":("number","0") for col in "KLMNPQRS"
            for row in (370,371,372,373)}
    sk={f"C{i}":("number",str(i%3)) for i in range(1,461)}
    nulls={f"Q{i}" for i in range(1,42)}
    def blank(ranges):
        return {"tableRefs":dict(ranges),
                "legacyManualHashes":{"skaters":"abc","goalies":"def","masterSchedule":"ghi"},
                "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
                "unexpectedAppendedManualCells":[],
                "targetCellValues":{3:{},12:{}}}
    old=blank({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    prior=blank({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    merged=deepcopy(prior)
    prior["targetCellValues"][3].update(sk)
    merged["targetCellValues"][3].update(sk)
    merged["targetCellValues"][12].update(period)
    for ref,(a,b) in CORRECTED_GOALIE.items():
        old["targetCellValues"][3][ref]=("number",str(a))
        prior["targetCellValues"][3][ref]=("number",str(b))
        merged["targetCellValues"][3][ref]=("number",str(b))
    old["targetCellValues"][3]["Y4674"]=("text"," ")
    prior["targetCellValues"][3]["Y4674"]=None
    merged["targetCellValues"][3]["Y4674"]=None
    return old,prior,merged,{3:sk,12:period},nulls

def caches():
    vals={}
    for row,(gf,ga,gd) in GAME_RESULTS.items():
        cols={"O":gf,"T":ga,"W":gd,"X":1}
        vals[row]={f"{col}{row}":{"hasFormula":True,"value":str(v)} for col,v in cols.items()}
        vals[row][f"U{row}"]={"hasFormula":True,"value":"L"}
    vals[374]={"X374":{"hasFormula":True,"value":"0"},
               "U374":{"hasFormula":True,"value":"T"}}
    return vals

class CombinedSourceContract(unittest.TestCase):
    def test_true_integrated_497_pass_is_still_review_only(self):
        r=verify_integrated(*case())
        self.assertEqual(r["status"],"INTEGRATED_497_INPUT_CELLS_SOURCE_PASS_NOT_PRODUCTION")
        self.assertEqual(r["sourceCorrections"]["total"],497)
        self.assertEqual(r["sourceCorrections"]["withheldUnknownCellsStillBlank"],41)
        self.assertTrue(r["all497CorrectionsVerifiedInSameComposite"])
        self.assertFalse(r["fullCompositeWorkbookRecalculated"])
        self.assertFalse(r["sourceOfTruthPromotionAuthorized"])
    def test_missing_one_period_zero_is_not_blank_equivalent(self):
        original,prior,merged,plan,nulls=case()
        merged["targetCellValues"][12]["K370"]=None
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_INPUT_CONFLICT"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_missing_player_observation_is_rejected(self):
        original,prior,merged,plan,nulls=case()
        merged["targetCellValues"][3].pop("C1")
        with self.assertRaisesRegex(PromotionHold,"INTEGRATED_HTO_PLAYER_CELL_MISMATCH"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_unsupported_pim_cannot_be_added_as_zero(self):
        original,prior,merged,plan,nulls=case()
        merged["targetCellValues"][3]["Q1"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"SOURCE_UNKNOWN_WAS_POPULATED"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_goalie_source_cannot_revert_to_original(self):
        original,prior,merged,plan,nulls=case()
        merged["targetCellValues"][3]["GQ363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"GOALIE_CORRECTION_SOURCE_DRIFT"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_whitespace_must_be_blank_not_numeric_zero(self):
        original,prior,merged,plan,nulls=case()
        merged["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"Y4674_TYPED_WHITESPACE_DISPOSITION_CHANGED"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_existing_manual_legacy_data_cannot_change(self):
        original,prior,merged,plan,nulls=case()
        merged["legacyManualHashes"]["goalies"]="mutated"
        with self.assertRaisesRegex(PromotionHold,"PREEXISTING_MANUAL_SOURCE_VALUES_CHANGED"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_unexpected_manual_data_in_extension_blocks(self):
        original,prior,merged,plan,nulls=case()
        merged["unexpectedAppendedManualCells"].append({"ref":"E4699"})
        with self.assertRaisesRegex(PromotionHold,"UNPLANNED_INPUT_IN_NEW_TABLE_ROWS"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_new_fifth_game_period_rejected_as_unplanned(self):
        original,prior,merged,plan,nulls=case()
        plan[12]["K374"]=("number","1")
        with self.assertRaisesRegex(PromotionHold,"EXPECTED_497_MANUAL_SOURCE_CONTRACT_CHANGED"):
            verify_integrated(original,prior,merged,plan,nulls)
    def test_four_official_master_scores_and_future_game(self):
        r=verify_master_cache(caches())
        self.assertEqual(r["verifiedGF"],6)
        self.assertEqual(r["verifiedGA"],19)
        self.assertTrue(r["futureGameRow374Unplayed"])
        self.assertFalse(r["seasonInfoRecalculationCertified"])
    def test_fifth_game_marked_counted_holds(self):
        c=caches()
        c[374]["X374"]["value"]="1"
        with self.assertRaisesRegex(PromotionHold,"FUTURE_GAME_MISCLASSIFIED_AS_COMPLETED"):
            verify_master_cache(c)
    def test_wrong_official_loss_score_holds(self):
        c=caches()
        c[371]["O371"]["value"]="4"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_MASTER_SCHEDULE_FORMULA_CACHE_MISMATCH"):
            verify_master_cache(c)
    def test_changed_excel_result_formula_holds(self):
        c=caches()
        c[372]["U372"]["hasFormula"]=False
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_GAME_RESULT_NOT_LOSS"):
            verify_master_cache(c)

if __name__=="__main__":
    unittest.main()
