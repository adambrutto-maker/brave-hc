"""No-network source evidence tests for an optional 499-cell metadata candidate."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_optional_499_opponents import compare_499,verify_source_manual_delta,MetadataHold,ACCEPTED_497_SHA,EXTRA

NEW_SHA="8"*64

def fixtures():
    base={"members":{"xl/workbook.xml","xl/worksheets/sheet12.xml"},
          "sheets":[f"Sheet {i}" for i in range(1,18)],
          "formulaSHA":"formula_definition_fingerprint",
          "formulaCount":545506,
          "stableScheduleManualSHA":"excluding_opponent_H372_H373",
          "stableScheduleManualCount":6836,
          "scheduleOpponentCells":{"H370":("text","Dateline Predators"),
                                   "H371":("text","Mohawks HC")},
          "scheduleFields":{"X374":("numeric","0")}}
    candidate=copy.deepcopy(base)
    candidate["scheduleOpponentCells"]["H372"]=("text","Michelob Morts")
    candidate["scheduleOpponentCells"]["H373"]=("text","Zamboner Crew")
    reviewed={"status":"TWO_OPPONENT_NAMES_VERIFIED_PRIVATE_REVIEW_ONLY",
      "source497CellCompositeTechnicallyVerifiedSeparately":True,
      "newOpponentValuesInsertedInComposite":False,
      "sourceOfTruthOwnerApprovalGranted":False,
      "wouldBecomeAdditionalSourceCells":2,
      "newOpponentNamesProposed":[
        {"cell":"H372","verifiedOpponent":"Michelob Morts","approvalToWriteOriginal":False},
        {"cell":"H373","verifiedOpponent":"Zamboner Crew","approvalToWriteOriginal":False},
      ]}
    return base,candidate,reviewed

def checked(data):
    return compare_499(*data,base_sha=ACCEPTED_497_SHA,candidate_sha=NEW_SHA)

class New499SourceGate(unittest.TestCase):
    def test_only_two_names_can_pass_and_cannot_be_released(self):
        r=checked(fixtures())
        self.assertEqual(r["status"],"PRIVATE_499_OPPONENT_METADATA_SAVED_REVIEW_ONLY")
        self.assertEqual(r["totalSourceChangesUnderReview"],499)
        self.assertFalse(r["499FullWorkbookRecalculationCertified"])
        self.assertFalse(r["ownerOriginalWorkbookApproval"])
        self.assertFalse(r["publicWatchOrAwardReleaseAuthorized"])
    def test_missing_first_source_name_holds(self):
        a,b,c=fixtures()
        b["scheduleOpponentCells"].pop("H372")
        with self.assertRaisesRegex(MetadataHold,"HTO_OPPONENT_NAME_NOT_IN_CORRECT_CELL"):
            checked((a,b,c))
    def test_invented_opponent_name_holds(self):
        a,b,c=fixtures()
        b["scheduleOpponentCells"]["H373"]=("text","Invented Club")
        with self.assertRaisesRegex(MetadataHold,"HTO_OPPONENT_NAME_NOT_IN_CORRECT_CELL"):
            checked((a,b,c))
    def test_name_cannot_become_number_or_zero(self):
        a,b,c=fixtures()
        b["scheduleOpponentCells"]["H373"]=("numeric","0")
        with self.assertRaisesRegex(MetadataHold,"HTO_OPPONENT_NAME_NOT_IN_CORRECT_CELL"):
            checked((a,b,c))
    def test_official_mohawks_alias_must_stay_legacy(self):
        a,b,c=fixtures()
        b["scheduleOpponentCells"]["H371"]=("text","Mohawks H.C.")
        with self.assertRaisesRegex(MetadataHold,"OTHER_OFFICIAL_OR_FUTURE_OPPONENT_CHANGED"):
            checked((a,b,c))
    def test_future_oct25_opponent_stays_blank(self):
        a,b,c=fixtures()
        b["scheduleOpponentCells"]["H374"]=("text","Big Bastones")
        with self.assertRaisesRegex(MetadataHold,"OTHER_OFFICIAL_OR_FUTURE_OPPONENT_CHANGED"):
            checked((a,b,c))
    def test_future_oct25_counted_game_guard(self):
        a,b,c=fixtures()
        b["scheduleFields"]["X374"]=("numeric","1")
        with self.assertRaisesRegex(MetadataHold,"UNPLAYED_FUTURE_GAME_CHANGED"):
            checked((a,b,c))
    def test_unverified_rink_field_rejected(self):
        a,b,c=fixtures()
        b["scheduleFields"]["I372"]=("text","Fake Rink")
        with self.assertRaisesRegex(MetadataHold,"UNVERIFIED_ADJACENT_GAME_METADATA_ENTERED"):
            checked((a,b,c))
    def test_unverified_home_away_field_rejected(self):
        a,b,c=fixtures()
        b["scheduleFields"]["G373"]=("text","Home")
        with self.assertRaisesRegex(MetadataHold,"UNVERIFIED_ADJACENT_GAME_METADATA_ENTERED"):
            checked((a,b,c))
    def test_extra_other_schedule_manual_value_rejected(self):
        a,b,c=fixtures()
        b["stableScheduleManualSHA"]="changed"
        with self.assertRaisesRegex(MetadataHold,"OTHER_SCHEDULE_MANUAL_SOURCE_EDIT_DETECTED"):
            checked((a,b,c))
    def test_any_workbook_formula_change_requires_separate_review(self):
        a,b,c=fixtures()
        b["formulaSHA"]="changed"
        with self.assertRaisesRegex(MetadataHold,"WORKBOOK_FORMULA_DEFINITION_DRIFT"):
            checked((a,b,c))
    def test_missing_excel_package_part_holds(self):
        a,b,c=fixtures()
        b["members"].remove("xl/worksheets/sheet12.xml")
        with self.assertRaisesRegex(MetadataHold,"EXCEL_PACKAGE_COMPONENTS_CHANGED"):
            checked((a,b,c))
    def test_hidden_approval_flag_rejected(self):
        a,b,c=fixtures()
        c["newOpponentNamesProposed"][0]["approvalToWriteOriginal"]=True
        with self.assertRaisesRegex(MetadataHold,"HTO_SOURCE_REVIEW_MUST_NOT_APPROVE_ORIGINAL_WRITE"):
            checked((a,b,c))
    def test_baseline_source_hash_drift_holds(self):
        with self.assertRaisesRegex(MetadataHold,"PRIVATE_497_SOURCE_HASH_OR_NEW_CANDIDATE_INVALID"):
            compare_499(*fixtures(),base_sha="f"*64,candidate_sha=NEW_SHA)
    def test_identical_workbook_is_not_new_metadata_candidate(self):
        with self.assertRaisesRegex(MetadataHold,"PRIVATE_497_SOURCE_HASH_OR_NEW_CANDIDATE_INVALID"):
            compare_499(*fixtures(),base_sha=ACCEPTED_497_SHA,candidate_sha=ACCEPTED_497_SHA)
    def test_official_source_name_proposals_cannot_change(self):
        a,b,c=fixtures()
        c["newOpponentNamesProposed"][1]["verifiedOpponent"]="Other team"
        with self.assertRaisesRegex(MetadataHold,"HTO_SOURCE_NAME_SET_CHANGED"):
            checked((a,b,c))


class IntentionalOpponentDelta(unittest.TestCase):
    def base(self):
        return {
          "legacyManualHashes":{"skaters":"s","goalies":"g","masterSchedule":"old"},
          "legacyManualCounts":{"skaters":694249,"goalies":39239,"masterSchedule":6836}
        }
    def test_exact_two_new_opponents_can_change_schedule_manual_digest(self):
        before=self.base()
        after=copy.deepcopy(before)
        after["legacyManualHashes"]["masterSchedule"]="new"
        after["legacyManualCounts"]["masterSchedule"]=6838
        verify_source_manual_delta(before,after)
    def test_staged_opponent_count_one_held(self):
        before=self.base();after=copy.deepcopy(before)
        after["legacyManualHashes"]["masterSchedule"]="new"
        after["legacyManualCounts"]["masterSchedule"]=6837
        with self.assertRaisesRegex(MetadataHold,"OFFICIAL_OPPONENT_SOURCE_COUNT_NOT_EXACT_PLUS_TWO"):
            verify_source_manual_delta(before,after)
    def test_unrelated_extra_schedule_manual_cell_held(self):
        before=self.base();after=copy.deepcopy(before)
        after["legacyManualHashes"]["masterSchedule"]="new"
        after["legacyManualCounts"]["masterSchedule"]=6839
        with self.assertRaisesRegex(MetadataHold,"OFFICIAL_OPPONENT_SOURCE_COUNT_NOT_EXACT_PLUS_TWO"):
            verify_source_manual_delta(before,after)
    def test_skater_source_value_drift_held(self):
        before=self.base();after=copy.deepcopy(before)
        after["legacyManualHashes"]["skaters"]="unexpected"
        after["legacyManualHashes"]["masterSchedule"]="new"
        after["legacyManualCounts"]["masterSchedule"]=6838
        with self.assertRaisesRegex(MetadataHold,"HISTORICAL_PLAYER_MANUAL_SOURCE_DRIFT"):
            verify_source_manual_delta(before,after)
    def test_goalie_source_row_count_drift_held(self):
        before=self.base();after=copy.deepcopy(before)
        after["legacyManualCounts"]["goalies"]+=1
        after["legacyManualHashes"]["masterSchedule"]="new"
        after["legacyManualCounts"]["masterSchedule"]=6838
        with self.assertRaisesRegex(MetadataHold,"HISTORICAL_PLAYER_MANUAL_SOURCE_DRIFT"):
            verify_source_manual_delta(before,after)
    def test_sha_must_change_for_two_real_new_text_inputs(self):
        before=self.base();after=copy.deepcopy(before)
        after["legacyManualCounts"]["masterSchedule"]=6838
        with self.assertRaisesRegex(MetadataHold,"OFFICIAL_OPPONENT_SOURCE_DIGEST_NOT_UPDATED"):
            verify_source_manual_delta(before,after)

if __name__=="__main__":
    unittest.main()
