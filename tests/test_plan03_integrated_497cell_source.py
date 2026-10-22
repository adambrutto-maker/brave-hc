"""Synthetic QA: combined source workbook != prior independent fragments."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_497cell_source import admit,PromotionHold,CORRECTED_GOALIE

def case():
    proposed={3:{f"C{i}":("number",str(i%5)) for i in range(1,461)},
              12:{f"{col}{row}":("number",str(i%4))
                  for i,col in enumerate("KLMNPQRS") for row in range(370,374)}}
    withheld={f"R{i}" for i in range(1,42)}
    original={"tableRefs":{"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"},
        "legacyManualHashes":{"skaters":"a","goalies":"b","masterSchedule":"c"},
        "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
        "unexpectedAppendedManualCells":[],"targetCellValues":{3:{},12:{}}}
    player=deepcopy(original)
    player["tableRefs"]={"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"}
    composite=deepcopy(player)
    for addr,value in proposed[3].items():
        player["targetCellValues"][3][addr]=value
        composite["targetCellValues"][3][addr]=value
    for addr,value in proposed[12].items():
        composite["targetCellValues"][12][addr]=value
    for addr,(old,new) in CORRECTED_GOALIE.items():
        original["targetCellValues"][3][addr]=("number",str(old))
        player["targetCellValues"][3][addr]=("number",str(new))
        composite["targetCellValues"][3][addr]=("number",str(new))
    original["targetCellValues"][3]["Y4674"]=("text"," ")
    player["targetCellValues"][3]["Y4674"]=None
    composite["targetCellValues"][3]["Y4674"]=None
    return original,player,composite,proposed,withheld

class CompositeAcceptance(unittest.TestCase):
    def test_verified_497_is_disposable_not_original_release(self):
        result=admit(*case())
        self.assertEqual(result["totalReviewedSourceChanges"],497)
        self.assertEqual(result["verifiedHTOPlayerGameInputs"],460)
        self.assertEqual(result["verifiedOfficialHTOPeriodInputs"],32)
        self.assertTrue(result["allCorrectionsInOneWorkbook"])
        self.assertFalse(result["fullCompositeCalculateFullSourceParityCertified"])
        self.assertFalse(result["publicHTOOrWebsiteModified"])
        self.assertFalse(result["sourceOwnerApprovalRecorded"])
    def test_source_still_requires_32_official_periods(self):
        args=case()
        args[2]["targetCellValues"][12]["K370"]=None
        with self.assertRaisesRegex(PromotionHold,"INTEGRATED_COMPOSITE_HTO_PERIOD_DIFFERENT"):
            admit(*args)
    def test_unobserved_pim_becoming_zero_holds(self):
        args=case()
        args[2]["targetCellValues"][3]["R1"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"SOURCE_UNKNOWN_STAT_FALSE_ZERO"):
            admit(*args)
    def test_changed_historic_manual_source_value_holds(self):
        args=case()
        args[2]["legacyManualHashes"]["skaters"]="drift"
        with self.assertRaisesRegex(PromotionHold,"HISTORICAL_MANUAL_SOURCE_DRIFT"):
            admit(*args)
    def test_skater_table_range_cannot_change_unreviewed(self):
        args=case()
        args[2]["tableRefs"]["SkaterStatsByGame"]="A2:FB4709"
        with self.assertRaisesRegex(PromotionHold,"UNAPPROVED_TABLE_RANGE"):
            admit(*args)
    def test_goalie_source_correction_cannot_revert(self):
        args=case()
        args[2]["targetCellValues"][3]["GQ363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"GOALIE_REVIEWED_SOURCE_MISSING"):
            admit(*args)
    def test_y4674_blank_cannot_be_substituted_with_numeric_zero(self):
        args=case()
        args[2]["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"UNKNOWN_SHG_FIELD_NOT_BLANK"):
            admit(*args)
    def test_missing_player_input_is_detected(self):
        args=case()
        args[2]["targetCellValues"][3].pop("C1")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_HTO_PLAYER_CELL_DIFFERENT"):
            admit(*args)
    def test_unplanned_manual_data_in_appended_row_holds(self):
        args=case()
        args[2]["unexpectedAppendedManualCells"]=[{"ref":"AB4699","type":"number"}]
        with self.assertRaisesRegex(PromotionHold,"UNREVIEWED_MANUAL_STAT_IN_NEW_SOURCE_ROW"):
            admit(*args)
    def test_player_only_copy_is_not_integrated(self):
        args=list(case())
        args[2]=deepcopy(args[1])
        with self.assertRaisesRegex(PromotionHold,"INTEGRATED_COMPOSITE_HTO_PERIOD_DIFFERENT"):
            admit(*args)
    def test_modified_existing_manual_value_count_holds(self):
        args=case()
        args[2]["legacyManualCounts"]["goalies"]=39240
        with self.assertRaisesRegex(PromotionHold,"HISTORICAL_MANUAL_SOURCE_DRIFT"):
            admit(*args)
    def test_proposed_cell_count_must_be_exact(self):
        args=case()
        args[3][3].pop("C1")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_SOURCE_PROPOSAL_NOT_492"):
            admit(*args)

if __name__=="__main__":
    unittest.main()
