"""Fail-closed tests for two separately verified workbook source fragments."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_exact_promotion_preflight import (
  compare_fragments,PromotionHold,CORRECTED_GOALIE,check_period_fragment,
  check_player_fragment,SHEET_GAME_LOGS,SHEET_MASTER_SCHEDULE,
)

def fixtures():
    proposed={3:{f"C{i}":("number",str(i%5)) for i in range(1,461)},
              12:{f"{col}{row}":("number","1") for col in "KLMNPQRS"
                  for row in range(370,374)}}
    withheld={f"R{i}" for i in range(1,42)}
    def basic(tables):
        return {"tableRefs":tables,
          "legacyManualHashes":{"skaters":"a","goalies":"b","masterSchedule":"c"},
          "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
          "unexpectedAppendedManualCells":[],
          "targetCellValues":{3:{},12:{}}}
    original=basic({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    period=copy.deepcopy(original)
    player=basic({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    for ref,value in proposed[3].items():
        player["targetCellValues"][3][ref]=value
    for ref,value in proposed[12].items():
        period["targetCellValues"][12][ref]=value
    for ref,(old,new) in CORRECTED_GOALIE.items():
        original["targetCellValues"][3][ref]=("number",str(old))
        period["targetCellValues"][3][ref]=("number",str(old))
        player["targetCellValues"][3][ref]=("number",str(new))
    original["targetCellValues"][3]["Y4674"]=("text"," ")
    period["targetCellValues"][3]["Y4674"]=("text"," ")
    player["targetCellValues"][3]["Y4674"]=None
    return original,period,player,proposed,withheld

class FragmentReview(unittest.TestCase):
 def test_two_validated_fragments_must_not_claim_composite_pass(self):
    a,b,c,plan,unknown=fixtures()
    result=compare_fragments(a,b,c,plan,unknown)
    self.assertEqual(result["status"],"TWO_FRAGMENTS_SOURCE_PARITY_PASS_SINGLE_COMPOSITE_NOT_VALIDATED")
    self.assertEqual(result["reviewedSourceChangeCount"],497)
    self.assertEqual(result["periodCellsMissingFromPlayerOnlyCopy"],32)
    self.assertFalse(result["combined497CellCandidateVerified"])
    self.assertFalse(result["sourceOfTruthWriteAuthorized"])
    self.assertFalse(result["allStatsAwardsAndLiveWatchReleasable"])
 def test_unexpected_new_historical_source_value_is_held(self):
    a,b,c,p,u=fixtures()
    c["legacyManualHashes"]["skaters"]="other"
    with self.assertRaisesRegex(PromotionHold,"PREEXISTING_MANUAL_SOURCE_VALUES_CHANGED"):
     compare_fragments(a,b,c,p,u)
 def test_unplanned_appended_manual_value_is_held(self):
    a,b,c,p,u=fixtures()
    c["unexpectedAppendedManualCells"].append({"ref":"Z4699","type":"number"})
    with self.assertRaisesRegex(PromotionHold,"UNPLANNED_INPUT_IN_NEW_TABLE_ROWS"):
     compare_fragments(a,b,c,p,u)
 def test_period_only_copy_cannot_claim_player_import(self):
    a,b,c,p,u=fixtures()
    b["targetCellValues"][3]["C1"]=("number","1")
    with self.assertRaisesRegex(PromotionHold,"PERIOD_FRAGMENT_HAS_UNREVIEWED_PLAYER_SOURCE"):
     compare_fragments(a,b,c,p,u)
 def test_player_copy_missing_a_verified_htoinput_holds(self):
    a,b,c,p,u=fixtures()
    c["targetCellValues"][3].pop("C1")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_HTO_CELL_NOT_MATCHED"):
     compare_fragments(a,b,c,p,u)
 def test_official_period_not_present_in_period_copy_holds(self):
    a,b,c,p,u=fixtures()
    b["targetCellValues"][12]["K370"]=None
    with self.assertRaisesRegex(PromotionHold,"PERIOD_FRAGMENT_SCORE_NOT_MATCHED"):
     compare_fragments(a,b,c,p,u)
 def test_player_copy_accidentally_contains_period_input_must_be_reclassified(self):
    a,b,c,p,u=fixtures()
    c["targetCellValues"][12]["K370"]=("number","1")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_PERIODS_CHANGED_BUT_NOT_INTEGRATED"):
     compare_fragments(a,b,c,p,u)
 def test_released_unknown_pim_fails(self):
    a,b,c,p,u=fixtures()
    c["targetCellValues"][3]["R1"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_UNKNOWN_FIELD_FILLED"):
     compare_fragments(a,b,c,p,u)
 def test_wrong_goalie_value_fails(self):
    a,b,c,p,u=fixtures()
    c["targetCellValues"][3]["GQ363"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_GOALIE_SOURCE_NOT_REVIEWED"):
     compare_fragments(a,b,c,p,u)
 def test_blank_y4674_is_not_a_zero_shg(self):
    a,b,c,p,u=fixtures()
    c["targetCellValues"][3]["Y4674"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_Y4674_NOT_BLANK"):
     compare_fragments(a,b,c,p,u)
 def test_existing_original_game_period_holds(self):
    a,b,c,p,u=fixtures()
    a["targetCellValues"][12]["K370"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"ORIGINAL_GAME_PERIOD_NO_LONGER_EMPTY"):
     compare_fragments(a,b,c,p,u)
 def test_table_resize_in_period_fragment_holds(self):
    a,b,c,p,u=fixtures()
    b["tableRefs"]["SkaterStatsByGame"]="A2:FB4708"
    with self.assertRaisesRegex(PromotionHold,"PERIOD_ONLY_FRAGMENT_TABLE_BOUNDARY_CHANGED"):
     compare_fragments(a,b,c,p,u)
 def test_wrong_mapped_htocell_count_holds(self):
    a,b,c,p,u=fixtures()
    p[3].pop("C1")
    with self.assertRaisesRegex(PromotionHold,"EXPECTED_CHANGE_MANIFEST_COUNTS_CHANGED"):
     compare_fragments(a,b,c,p,u)

if __name__=="__main__":
 unittest.main()
