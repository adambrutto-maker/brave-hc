"""Synthetic, fail-closed Plan03 497-cell composite review tests."""
import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_composite_497_parity import verify,PromotionHold,CORRECTED_GOALIE
from audit_plan03_exact_promotion_preflight import SHEET_GAME_LOGS,SHEET_MASTER_SCHEDULE

def fixture():
    def blank(refs):
        return {"tableRefs":dict(refs),
          "legacyManualHashes":{"skaters":"a"*64,"goalies":"b"*64,"masterSchedule":"c"*64},
          "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836},
          "unexpectedAppendedManualCells":[],
          "targetCellValues":{3:{},12:{}}}
    old=blank({"SkaterStatsByGame":"A2:FB4668","GoalieStatsByGame":"FD2:JO363"})
    player=blank({"SkaterStatsByGame":"A2:FB4708","GoalieStatsByGame":"FD2:JO366"})
    composite=copy.deepcopy(player)
    proposed={SHEET_GAME_LOGS:{f"B{i}":("number",str(i%5)) for i in range(1,461)},
              SHEET_MASTER_SCHEDULE:{f"{col}{r}":("number",str(r%3))
                for col in "KLMNPQRS" for r in (370,371,372,373)}}
    withheld={f"BX{i}" for i in range(1,42)}
    for addr,v in proposed[3].items():
        player["targetCellValues"][3][addr]=v
        composite["targetCellValues"][3][addr]=v
    for addr,v in proposed[12].items():
        composite["targetCellValues"][12][addr]=v
    old["targetCellValues"][3]["Y4674"]=("text"," ")
    player["targetCellValues"][3]["Y4674"]=None
    composite["targetCellValues"][3]["Y4674"]=None
    for addr,(old_value,new_value) in CORRECTED_GOALIE.items():
        old["targetCellValues"][3][addr]=("number",str(old_value))
        player["targetCellValues"][3][addr]=("number",str(new_value))
        composite["targetCellValues"][3][addr]=("number",str(new_value))
    return old,player,composite,proposed,withheld

class Composite497Tests(unittest.TestCase):
 def test_verified_all_497_source_cells_no_release(self):
    result=verify(*fixture())
    self.assertEqual(result["status"],"COMPOSITE_497_SOURCE_CELLS_PASS_FURTHER_MODEL_QA_HELD")
    self.assertEqual(result["sourceChanges"]["totalReviewedCells"],497)
    self.assertEqual(result["sourceChanges"]["unknownHTOFieldsStillBlank"],41)
    self.assertTrue(result["combinedAll497SourceChangesPresent"])
    self.assertFalse(result["fullCompositeCalculateFullCertified"])
    self.assertFalse(result["sourceOfTruthOwnerApprovalRecorded"])
    self.assertFalse(result["publicHTOOrWebsitePublicationAuthorized"])
 def test_missing_period_score_refuses_promotion(self):
    a,b,c,p,u=fixture();c["targetCellValues"][12].pop("K370")
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_SCORE_MISMATCH"):
        verify(a,b,c,p,u)
 def test_text_zero_not_equivalent_to_numeric_zero(self):
    a,b,c,p,u=fixture();c["targetCellValues"][12]["L371"]=("text","0")
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_SCORE_MISMATCH"):
        verify(a,b,c,p,u)
 def test_missing_player_source_refuses_promotion(self):
    a,b,c,p,u=fixture();c["targetCellValues"][3].pop("B10")
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_PLAYER_SOURCE_CHANGED"):
        verify(a,b,c,p,u)
 def test_unknown_pim_not_defaulted_to_zero(self):
    a,b,c,p,u=fixture();c["targetCellValues"][3]["BX1"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"UNKNOWN_HTO_FIELD_COERCED_TO_ZERO"):
        verify(a,b,c,p,u)
 def test_new_unapproved_manual_input_refuses_composite(self):
    a,b,c,p,u=fixture();c["unexpectedAppendedManualCells"].append({"ref":"Q4709","type":"number"})
    with self.assertRaisesRegex(PromotionHold,"UNAPPROVED_MANUAL_SOURCE_IN_EXTENSION"):
        verify(a,b,c,p,u)
 def test_historical_source_data_digest_modified(self):
    a,b,c,p,u=fixture();c["legacyManualHashes"]["skaters"]="other"
    with self.assertRaisesRegex(PromotionHold,"HISTORICAL_PLAYER_MANUAL_DATA_CHANGED"):
        verify(a,b,c,p,u)
 def test_historical_master_schedule_other_manual_values_modified(self):
    a,b,c,p,u=fixture();c["legacyManualHashes"]["masterSchedule"]="other"
    with self.assertRaisesRegex(PromotionHold,"UNPLANNED_MASTER_SCHEDULE_MANUAL_DATA_CHANGED"):
        verify(a,b,c,p,u)
 def test_goalie_source_correction_undone(self):
    a,b,c,p,u=fixture();c["targetCellValues"][3]["GQ363"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_GOALIE_SOURCE_CORRECTION_NOT_PRESERVED"):
        verify(a,b,c,p,u)
 def test_y4674_cannot_be_invented_numeric_shg(self):
    a,b,c,p,u=fixture();c["targetCellValues"][3]["Y4674"]=("number","0")
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_WHITESPACE_TO_BLANK_DISPOSITION_CHANGED"):
        verify(a,b,c,p,u)
 def test_wrong_structured_table_size_holds(self):
    a,b,c,p,u=fixture();c["tableRefs"]["GoalieStatsByGame"]="FD2:JO365"
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_STRUCTURED_TABLE_RANGES_CHANGED"):
        verify(a,b,c,p,u)
 def test_periods_still_missing_from_composite_is_not_accepted(self):
    a,b,c,p,u=fixture()
    for ref in p[12]:c["targetCellValues"][12].pop(ref)
    with self.assertRaisesRegex(PromotionHold,"COMPOSITE_OFFICIAL_PERIOD_SCORE_MISMATCH"):
        verify(a,b,c,p,u)
 def test_player_only_source_must_still_be_independently_valid(self):
    a,b,c,p,u=fixture();b["targetCellValues"][3]["B1"]=("number","100")
    with self.assertRaisesRegex(PromotionHold,"PLAYER_FRAGMENT_HTO_CELL_NOT_MATCHED"):
        verify(a,b,c,p,u)

if __name__=="__main__":unittest.main()
