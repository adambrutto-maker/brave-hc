"""Offline scorecard period semantics QA for five vs seven official columns."""
from __future__ import annotations
from copy import deepcopy
import sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import hockeyos_scorecard_period_contract as f

def compact():
    return [
      list(f.REGULAR),
      ["Big Bastones","0","2","2","4"],
      ["Brave H.C.","3","0","3","6"],
    ]
def extended():
    return [
      list(f.EXTENDED),
      ["Mid Ice Crisis","1","3","3","0","0","7"],
      ["Brave H.C.","0","0","2","0","0","2"],
    ]
def compact_mid():
    return [
      list(f.REGULAR),
      ["Mid Ice Crisis","1","3","3","7"],
      ["Brave H.C.","0","0","2","2"],
    ]

class FormatQA(unittest.TestCase):
 def test_native_five_column_regulation_scorecard(self):
    n=f.normalize(compact())
    self.assertEqual(n["width"],5)
    self.assertEqual(n["layout"],"REGULATION_3_PERIODS")
    self.assertEqual((n["braves"]["final"],n["opponent"]["final"]),(6,4))
    self.assertEqual(n["braves"]["periods"],{"1":3,"2":0,"3":3})

 def test_native_seven_column_extended_scorecard(self):
    n=f.normalize(extended())
    self.assertEqual(n["width"],7)
    self.assertEqual(n["layout"],"EXTENDED_3_PERIODS_OT_2OT")
    self.assertEqual(n["opponent"]["periods"],{"1":1,"2":3,"3":3,"OT":0,"2OT":0})

 def test_source_team_row_order_is_not_assumed(self):
    n=compact()
    n[1],n[2]=n[2],n[1]
    self.assertEqual(f.normalize(n)["opponent"]["name"],"Big Bastones")

 def test_five_column_scoreboard_to_same_five_column_boxscore_parity(self):
    r=f.compare_same_game(compact(),compact(),official_opponent="Big Bastones",
                          official_gf=6,official_ga=4)
    self.assertEqual((r["scorePageWidth"],r["boxscorePageWidth"]),(5,5))
    self.assertFalse(r["publicationAuthorized"])

 def test_seven_column_scoreboard_to_same_seven_column_boxscore_parity(self):
    r=f.compare_same_game(extended(),extended(),official_opponent="Mid Ice Crisis",
                          official_gf=2,official_ga=7)
    self.assertEqual((r["scorePageWidth"],r["boxscorePageWidth"]),(7,7))

 def test_extended_ot_zero_and_compact_regulation_remain_source_equivalent(self):
    r=f.compare_same_game(extended(),compact_mid(),
                official_opponent="Mid Ice Crisis",official_gf=2,official_ga=7)
    self.assertEqual((r["scorePageWidth"],r["boxscorePageWidth"]),(7,5))
    self.assertFalse(r["sameGameIDExternallyQualified"])

 def test_compact_to_extended_ot_zero_valid_in_reverse_order(self):
    r=f.compare_same_game(compact_mid(),extended(),
                official_opponent="Mid Ice Crisis",official_gf=2,official_ga=7)
    self.assertEqual((r["scorePageWidth"],r["boxscorePageWidth"]),(5,7))

 def test_nonzero_ot_in_extended_form_cannot_match_compact(self):
    a=extended()
    a[2][3]="1"
    a[2][4]="1"
    a[2][-1]="3"
    with self.assertRaises(f.ScoreboardHold):
        f.compare_same_game(a,compact_mid(),
              official_opponent="Mid Ice Crisis",official_gf=3,official_ga=7)

 def test_mismatched_valid_regulation_periods_hold_even_if_final_equal(self):
    a=compact();b=deepcopy(a)
    b[2][1]="2";b[2][2]="1"
    with self.assertRaisesRegex(f.ScoreboardHold,"SAME_GAME_REGULATION_PERIOD_CONFLICT"):
        f.compare_same_game(a,b,official_opponent="Big Bastones",official_gf=6,official_ga=4)

 def test_unsupported_header_with_six_columns_is_never_silent_guess(self):
    a=compact()
    a[0]=["REGULAR SEASON","1","2","3","OT","F"]
    with self.assertRaisesRegex(f.ScoreboardHold,"SCORE_HEADER_NOT_5_OR_7_VERIFIED"):
        f.normalize(a)

 def test_wrong_names_and_period_headers_are_held(self):
    for header in (["REGULAR SEASON","1","2","4","F"],
                   ["PLAYOFFS","1","2","3","F"],["REGULAR SEASON","1","2","3","3OT","F"]):
        a=compact();a[0]=header
        with self.assertRaisesRegex(f.ScoreboardHold,"SCORE_HEADER_NOT_5_OR_7_VERIFIED"):
            f.normalize(a)

 def test_incomplete_and_duplicate_team_rows_are_held(self):
    for changed in ("missing","duplicate","blank"):
        a=compact()
        if changed=="missing":a.pop()
        elif changed=="duplicate":a[1][0]="Brave H.C."
        elif changed=="blank":a[1][0]=" "
        with self.assertRaises(f.ScoreboardHold):f.normalize(a)

 def test_team_scores_must_be_decimal_strings_not_tampered_values(self):
    for value in (-1,2,0.5,None,"-1","3.5","nan","inf","", " 1"):
        a=compact();a[2][1]=value
        with self.assertRaises(f.ScoreboardHold):f.normalize(a)

 def test_one_team_row_with_extra_or_missing_cell_is_held(self):
    for mode in ("extra","missing"):
        a=compact()
        a[2].append("0") if mode=="extra" else a[2].pop()
        with self.assertRaisesRegex(f.ScoreboardHold,"SCORE_TEAM_ROW_WIDTH_MISMATCH"):
            f.normalize(a)

 def test_valid_score_units_still_must_sum_to_official_final(self):
    a=compact();a[2][-1]="8"
    with self.assertRaisesRegex(f.ScoreboardHold,"PERIOD_GOALS_NOT_FINAL_SCORE"):
        f.normalize(a)

 def test_wrong_opponent_or_wrong_source_final_is_held(self):
    for candidate in ("opponent","goalsFor","goalsAgainst"):
        props={"official_opponent":"Big Bastones","official_gf":6,"official_ga":4}
        if candidate=="opponent":props["official_opponent"]="Wrong Team"
        elif candidate=="goalsFor":props["official_gf"]=5
        else:props["official_ga"]=5
        with self.assertRaisesRegex(f.ScoreboardHold,"OFFICIAL_SOURCE_GAME_SCORE_PROOF_CONFLICT"):
            f.compare_same_game(compact(),compact(),**props)

 def test_tampered_boxscore_opponent_holds_without_recalculating_team_stats(self):
    b=compact();b[1][0]="A Different Team"
    with self.assertRaisesRegex(f.ScoreboardHold,"SAME_GAME_TEAM_OR_FINAL_CONFLICT"):
        f.compare_same_game(compact(),b,
           official_opponent="Big Bastones",official_gf=6,official_ga=4)

 def test_zero_score_is_a_valid_verified_zero_not_missing(self):
    a=extended()
    a[2]=["Brave H.C.","0","0","0","0","0","0"]
    r=f.normalize(a)
    self.assertEqual(r["braves"]["final"],0)
    self.assertEqual(r["braves"]["periods"]["OT"],0)

 def test_source_parser_never_claims_game_identity_or_awards_release(self):
    r=f.normalize(compact())
    self.assertFalse(r["gameIdVerified"])
    self.assertFalse(r["playerBoxscoreRowsVerified"])
    self.assertFalse(r["originalMasterWorkbookWritten"])
    self.assertFalse(r["publicationAuthorized"])

 def test_same_game_compare_remains_explicitly_separate_from_link_attribution(self):
    r=f.compare_same_game(compact(),compact(),
                          official_opponent="Big Bastones",official_gf=6,official_ga=4)
    self.assertFalse(r["sameGameIDExternallyQualified"])
    self.assertFalse(r["liveBoxscoreFetched"])
    self.assertFalse(r["playerBoxscoreRowsVerified"])
    self.assertFalse(r["publicationAuthorized"])

if __name__=="__main__":
    unittest.main(verbosity=2)
