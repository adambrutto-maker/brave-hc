"""Synthetic tests for the first Plan03 combined 497-cell private source copy."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_497_cell_source import merge_acceptance, PromotionHold
from audit_plan03_exact_promotion_preflight import CORRECTED_GOALIE

def fixtures():
    proposed={3:{f"C{i}":("number",str(i%5)) for i in range(1,461)},
              12:{f"{col}{row}":("number","1") for col in "KLMNPQRS"
                  for row in range(370,374)}}
    withheld={f"R{i}" for i in range(1,42)}
    def d(tables):
        return {"tableRefs":tables,
           "legacyManualHashes":{"skaters":"a","goalies":"b","masterSchedule":"c"},
           "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
           "unexpectedAppendedManualCells":[],"targetCellValues":{3:{},12:{}}}
    old=d({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    period=copy.deepcopy(old)
    player=d({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    for ref,value in proposed[3].items():player["targetCellValues"][3][ref]=value
    for ref,value in proposed[12].items():period["targetCellValues"][12][ref]=value
    for ref,(before,after) in CORRECTED_GOALIE.items():
        old["targetCellValues"][3][ref]=("number",str(before))
        period["targetCellValues"][3][ref]=("number",str(before))
        player["targetCellValues"][3][ref]=("number",str(after))
    old["targetCellValues"][3]["Y4674"]=("text"," ")
    period["targetCellValues"][3]["Y4674"]=("text"," ")
    player["targetCellValues"][3]["Y4674"]=None
    integrated=copy.deepcopy(player)
    integrated["targetCellValues"][12]=copy.deepcopy(period["targetCellValues"][12])
    return old,period,player,integrated,proposed,withheld

class CompositeApproval(unittest.TestCase):
    def test_497_verified_source_cells_in_one_copy_do_not_grant_release(self):
        result=merge_acceptance(*fixtures())
        self.assertEqual(result["totalExplicitSourceChanges"],497)
        self.assertEqual(result["sourceNullCellsKeptBlank"],41)
        self.assertTrue(result["combinedWorkbookSourceParityVerified"])
        self.assertFalse(result["originalWorkbookOwnerApproved"])
        self.assertFalse(result["combinedFullWorkbookCalculatedAndCertified"])
        self.assertFalse(result["publicHTOOrWebsitePublished"])
    def test_missing_even_one_period_held(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][12]["K370"]=None
        with self.assertRaisesRegex(PromotionHold,"COMBINED_SOURCE_CELL_NOT_VERIFIED"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_text_zero_in_period_held(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][12]["K370"]=("text","0")
        with self.assertRaisesRegex(PromotionHold,"COMBINED_SOURCE_CELL_NOT_VERIFIED"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_original_player_formula_or_manual_changes_hold(self):
        a,b,c,d,plan,unknown=fixtures()
        d["legacyManualHashes"]["skaters"]="drifted"
        with self.assertRaisesRegex(PromotionHold,"HISTORICAL_MANUAL_SOURCE_VALUES_CHANGED"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_composite_must_preserve_460_player_cells(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][3]["C7"]=("number","777")
        with self.assertRaisesRegex(PromotionHold,"COMBINED_SOURCE_CELL_NOT_VERIFIED"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_41_unknown_stat_inputs_remain_blank(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][3]["R1"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"HTO_UNKNOWN_FIELD_ENTERED_AS_VALUE"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_separately_reviewed_goalie_loses_source_parity_holds(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][3]["GK363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMBINED_PREVIOUS_GOALIE_RECONCILIATION_LOST"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_legacy_y4674_cannot_be_set_to_zero(self):
        a,b,c,d,plan,unknown=fixtures()
        d["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"Y4674_WHITESPACE_NOT_BLANK"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_unplanned_extension_manual_cell_hold(self):
        a,b,c,d,plan,unknown=fixtures()
        d["unexpectedAppendedManualCells"]=[{"ref":"AB4708","type":"number"}]
        with self.assertRaisesRegex(PromotionHold,"UNPLANNED_SOURCE_VALUES_IN_EXTENDED_TABLE_ROWS"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_structured_table_range_drift_hold(self):
        a,b,c,d,plan,unknown=fixtures()
        d["tableRefs"]["SkaterStatsByGame"]="A2:FB4709"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_TABLE_RANGES_NOT_RETAINED"):
            merge_acceptance(a,b,c,d,plan,unknown)
    def test_extra_period_in_previous_player_fragment_must_be_reviewed(self):
        a,b,c,d,plan,unknown=fixtures()
        c["targetCellValues"][12]["K370"]=("number","1")
        with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_PERIODS_CHANGED"):
            merge_acceptance(a,b,c,d,plan,unknown)

if __name__=="__main__":
    unittest.main()
