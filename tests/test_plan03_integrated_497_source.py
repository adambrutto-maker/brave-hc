"""Fail-closed checks that a single private Excel copy includes all Plan03 input groups."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_integrated_497_source import (
    accept,PromotionHold,EXPECTED_TOTALS,TARGET_TABLES,ORIGINAL_TABLES,
)

def sample():
    plan={3:{f"Q{i}":("text",f"Skater {i}") for i in range(1,461)},
          12:{f"{c}{n}":("number","0") for c in "KLMNPQRS" for n in (370,371,372,373)}}
    held={f"R{i}" for i in range(1,42)}
    def src(ranges):
        return {"tableRefs":dict(ranges),
            "legacyManualHashes":{"skaters":"sha-a","goalies":"sha-b","masterSchedule":"sha-c"},
            "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
            "unexpectedAppendedManualCells":[],
            "targetCellValues":{3:{},12:{}}}
    original=src(ORIGINAL_TABLES)
    combined=src(TARGET_TABLES)
    for sheet in plan:
        combined["targetCellValues"][sheet].update(plan[sheet])
    for ref,old,new in [
        ("GJ363","1","0"),("GK363","0","1"),
        ("GQ363","0","3"),("HA363","0","1")
    ]:
        original["targetCellValues"][3][ref]=("number",old)
        combined["targetCellValues"][3][ref]=("number",new)
    original["targetCellValues"][3]["Y4674"]=("text"," ")
    combined["targetCellValues"][3]["Y4674"]=None
    return original,combined,plan,held

def run(args=None,*,games=EXPECTED_TOTALS):
    return accept(*(args or sample()),observed_games=games)

class CompositeQA(unittest.TestCase):
    def test_exact_integration_pass_without_release_permission(self):
        r=run()
        self.assertEqual(r["status"],"COMBINED_497_SOURCE_INPUTS_PASS_DISPOSABLE_ONLY")
        self.assertEqual(r["verifiedTotalIntentionalManualDispositions"],497)
        self.assertEqual(r["verifiedPlayerGameCells"],460)
        self.assertEqual(r["verifiedPeriodScoringCells"],32)
        self.assertEqual(r["preservedSourceUnknownCells"],41)
        self.assertFalse(r["originalSourceWorkbookEdited"])
        self.assertFalse(r["ownerOriginalWorkbookApproval"])
        self.assertFalse(r["officialAwardsForecastsAndLiveWatchCertified"])
    def test_missing_source_period_fails(self):
        a,b,p,h=sample();b["targetCellValues"][12].pop("K370")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_HTO_SOURCE_INPUT_MISMATCH"):
            run((a,b,p,h))
    def test_unknown_is_not_numeric_zero(self):
        a,b,p,h=sample();b["targetCellValues"][3]["R1"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_UNKNOWN_HTO_FIELD_FILLED"):
            run((a,b,p,h))
    def test_preserves_goalie_correction_and_no_unverified_wins(self):
        a,b,p,h=sample();b["targetCellValues"][3]["GQ363"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_GOALIE_SOURCE_CORRECTION_DRIFT"):
            run((a,b,p,h))
    def test_whitespace_not_preserved_as_numeric_shg(self):
        a,b,p,h=sample();b["targetCellValues"][3]["Y4674"]=("number","0")
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_Y4674_NOT_BLANK"):
            run((a,b,p,h))
    def test_existing_historical_manual_cells_cannot_change(self):
        a,b,p,h=sample();b["legacyManualHashes"]["skaters"]="rewritten"
        with self.assertRaisesRegex(PromotionHold,"PREEXISTING_HISTORICAL_MANUAL_INPUT_CHANGED"):
            run((a,b,p,h))
    def test_unreviewed_appended_manual_field_fails(self):
        a,b,p,h=sample();b["unexpectedAppendedManualCells"].append({"ref":"Z4697","type":"number"})
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_CONTAINS_UNAUTHORIZED_NEW_PLAYER_SOURCE"):
            run((a,b,p,h))
    def test_original_source_collision_fails(self):
        a,b,p,h=sample();a["targetCellValues"][3]["Q1"]=("text","Existing")
        with self.assertRaisesRegex(PromotionHold,"ORIGINAL_SOURCE_INPUT_NOT_EMPTY"):
            run((a,b,p,h))
    def test_source_table_extension_fails_when_incomplete(self):
        a,b,p,h=sample();b["tableRefs"]["SkaterStatsByGame"]="A2:FB4668"
        with self.assertRaisesRegex(PromotionHold,"ORIGINAL_AND_COMPOSITE_TABLE_STRUCTURE_INCORRECT"):
            run((a,b,p,h))
    def test_preview_game_cannot_be_marked_counted(self):
        wrong=dict(EXPECTED_TOTALS);wrong[374]=(0,0,0,"T",1)
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_TEAM_GAME_SCORE_OR_COUNT_CONFLICT"):
            run(games=wrong)
    def test_missing_full_score_cache_cannot_claim_pass(self):
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_TEAM_GAME_SCORE_OR_COUNT_CONFLICT"):
            run(games=None)
    def test_changed_official_score_fails(self):
        wrong=dict(EXPECTED_TOTALS);wrong[371]=(4,6,-2,"L",1)
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_TEAM_GAME_SCORE_OR_COUNT_CONFLICT"):
            run(games=wrong)
    def test_incomplete_known_source_field_counts_fail(self):
        a,b,p,h=sample();p[3].pop("Q1")
        with self.assertRaisesRegex(PromotionHold,"REVIEWED_SOURCE_497_CELL_CONTRACT_CHANGED"):
            run((a,b,p,h))
    def test_mismatched_zero_period_input_fails(self):
        a,b,p,h=sample();b["targetCellValues"][12]["P370"]=None
        with self.assertRaisesRegex(PromotionHold,"COMPOSITE_HTO_SOURCE_INPUT_MISMATCH"):
            run((a,b,p,h))

if __name__=="__main__":
    unittest.main()
