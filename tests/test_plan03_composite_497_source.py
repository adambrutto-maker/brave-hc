"""No-network fail-closed tests for integrated 497-cell private workbook source acceptance."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_composite_497_source import source_parity,PromotionHold,CORRECTED_GOALIE

def make():
    source={3:{f"C{i}":("number",str(i%5)) for i in range(1,461)},
            12:{f"{col}{row}":("number",str((row+len(col))%4))
                for col in "KLMNPQRS" for row in range(370,374)}}
    withheld={f"Z{i}" for i in range(1,42)}
    def b(tables):
        return {
          "tableRefs":dict(tables),
          "legacyManualHashes":{"skaters":"a","goalies":"b","masterSchedule":"c"},
          "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
          "unexpectedAppendedManualCells":[],
          "targetCellValues":{3:{},12:{}}
        }
    old=b({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    prior=b({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    combined=copy.deepcopy(prior)
    for ref,value in source[3].items():
        prior["targetCellValues"][3][ref]=value
        combined["targetCellValues"][3][ref]=value
    for ref,value in source[12].items():
        combined["targetCellValues"][12][ref]=value
    for ref,(before,after) in CORRECTED_GOALIE.items():
        old["targetCellValues"][3][ref]=("number",str(before))
        for copybook in (prior,combined):
            copybook["targetCellValues"][3][ref]=("number",str(after))
    old["targetCellValues"][3]["Y4674"]=("text"," ")
    prior["targetCellValues"][3]["Y4674"]=None
    combined["targetCellValues"][3]["Y4674"]=None
    return old,prior,combined,source,withheld

class CompositeSourceTests(unittest.TestCase):
    def test_all_497_changes_present_cannot_authorize_source_promotion(self):
        r=source_parity(*make())
        self.assertEqual(r["status"],"COMPOSITE_497_SOURCE_PARITY_PASS_FULL_CALC_PENDING")
        self.assertEqual(r["sourceChanges"],497)
        self.assertEqual(r["officialGamePeriodInputCells"],32)
        self.assertEqual(r["HTOPlayerGameInputCells"],460)
        self.assertEqual(r["unknownHTOFieldsStillBlank"],41)
        self.assertTrue(r["combinedCandidateVerified"])
        self.assertFalse(r["compositeFullWorkbookRecalculated"])
        self.assertFalse(r["originalWorkbookPromotionApproved"])
    def test_missing_period_score_is_a_hard_hold(self):
        a,b,c,p,u=make()
        c["targetCellValues"][12].pop("K370")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_MISMATCH"):
            source_parity(a,b,c,p,u)
    def test_period_score_coerced_to_text_is_rejected(self):
        a,b,c,p,u=make()
        c["targetCellValues"][12]["K370"]=("text","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_MISMATCH"):
            source_parity(a,b,c,p,u)
    def test_missing_one_player_input_is_a_hard_hold(self):
        a,b,c,p,u=make()
        c["targetCellValues"][3].pop("C1")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_PLAYER_SOURCE_EVIDENCE_CONFLICT"):
            source_parity(a,b,c,p,u)
    def test_preexisting_historical_manual_value_cannot_change(self):
        a,b,c,p,u=make()
        c["legacyManualHashes"]["masterSchedule"]="modified"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_PREEXISTING_MANUAL_SOURCE_CHANGED"):
            source_parity(a,b,c,p,u)
    def test_source_unknown_cannot_become_zero(self):
        a,b,c,p,u=make()
        c["targetCellValues"][3]["Z1"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"SOURCE_UNKNOWN_CONVERTED_TO_ZERO_OR_VALUE"):
            source_parity(a,b,c,p,u)
    def test_modified_original_source_value_fails(self):
        a,b,c,p,u=make()
        a["targetCellValues"][12]["K370"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"ORIGINAL_PERIOD_SOURCE_NOT_EMPTY"):
            source_parity(a,b,c,p,u)
    def test_wrong_goaltender_loss_correction_fails(self):
        a,b,c,p,u=make()
        c["targetCellValues"][3]["GK363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_GOALIE_CORRECTION_MISSING"):
            source_parity(a,b,c,p,u)
    def test_whitespace_cannot_be_replaced_with_official_zero(self):
        a,b,c,p,u=make()
        c["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"Y4674_MUST_STAY_BLANK_UNKNOWN"):
            source_parity(a,b,c,p,u)
    def test_duplicate_extra_manual_source_cell_holds(self):
        a,b,c,p,u=make()
        c["unexpectedAppendedManualCells"].append({"ref":"Q4709","type":"number"})
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_UNPLANNED_MANUAL_DATA"):
            source_parity(a,b,c,p,u)
    def test_skater_table_resize_drift_holds(self):
        a,b,c,p,u=make()
        c["tableRefs"]["SkaterStatsByGame"]="A2:FB4709"
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_EXPANDED_TABLE_SCHEMA_DRIFT"):
            source_parity(a,b,c,p,u)
    def test_old_player_only_fragment_cannot_be_claimed_composite(self):
        a,b,c,p,u=make()
        c["targetCellValues"][12].clear()
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_MISMATCH"):
            source_parity(a,b,c,p,u)
    def test_wrong_player_only_source_fingerprint_evidence_holds(self):
        a,b,c,p,u=make()
        b["targetCellValues"][3]["C1"]=("number","99")
        with self.assertRaisesRegex(PromotionHold,"PRIOR_PLAYER_SOURCE_EVIDENCE_DRIFT"):
            source_parity(a,b,c,p,u)

if __name__=="__main__":
    unittest.main()
