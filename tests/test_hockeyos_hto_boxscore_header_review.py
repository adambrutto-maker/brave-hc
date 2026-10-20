"""Source-shaped synthetic HTO boxscore-column tests. No network or private rows."""
import unittest
from lib.hockeyos_hto_boxscore_header_review import (
    BoxscoreSchemaHold, skater_rows, goalie_rows, check_game_observations
)

# Observed header structures (from user-authorized read-only 2026-10-20
# inspection) are preserved. Every player name/value below is fictional.
SKATER_ZERO=[
    ["No","Name","POS","","+/-","POTG"],
    ["11","Fictional Skater Alpha","C","","-2","0"]
]
SKATER_SCORING=[
    ["No","Name","POS","","G","A","Pts","PIM","+/-","POTG"],
    ["12","Fictional Skater Beta","LW","","1","0","1","0","+1","1"],
    ["18","Fictional Skater Gamma","D","","0","1","1","0","0","0"]
]
GOALIE_WITH_POTG=[
    ["No","Name","","GP","L","GA","GAA","POTG","+/-"],
    ["30","Fictional Goalie Alpha","","1","1","3","3.00","1","-3"]
]
GOALIE_NO_POTG=[
    ["No","Name","","GP","L","GA","GAA","+/-"],
    ["70","Fictional Goalie Delta","","1","1","6","6.00","-4"]
]
def clone(t):
    return [x[:] for x in t]

class SourceShapedHTOHeaderTests(unittest.TestCase):
    def test_zero_goal_game_may_omit_skater_GAPTS_when_official_GF_zero(self):
        p=skater_rows(clone(SKATER_ZERO),verified_team_goals=0)
        self.assertEqual((p[0]["g"],p[0]["a"],p[0]["pts"]),(0,0,0))
        self.assertEqual(p[0]["plusminus"],-2)
        self.assertIsNone(p[0]["pim"])
        self.assertFalse(p[0]["scoringColumnsFromHTO"])
    def test_nonzero_goal_game_must_map_skater_fields_by_header_not_ordinal(self):
        p=skater_rows(clone(SKATER_SCORING),verified_team_goals=1)
        self.assertEqual(len(p),2)
        self.assertEqual((p[0]["g"],p[0]["a"],p[0]["pts"]),(1,0,1))
        self.assertEqual((p[1]["g"],p[1]["a"],p[1]["pts"]),(0,1,1))
        self.assertTrue(p[0]["scoringColumnsFromHTO"])
    def test_published_goalie_POTG_after_spacer_gets_correct_index(self):
        g=goalie_rows(clone(GOALIE_WITH_POTG))
        self.assertEqual((g[0]["gp"],g[0]["losses"],g[0]["goalsAgainst"],g[0]["potg"]),(1,1,3,1))
        self.assertTrue(g[0]["potgPublishedInBoxscore"])
    def test_absent_goalie_POTG_must_be_None_not_fabricated_zero(self):
        g=goalie_rows(clone(GOALIE_NO_POTG))
        self.assertEqual((g[0]["gp"],g[0]["losses"],g[0]["goalsAgainst"]),(1,1,6))
        self.assertIsNone(g[0]["potg"])
        self.assertFalse(g[0]["potgPublishedInBoxscore"])
    def test_supported_legacy_unshifted_goalie_header_does_not_require_spacer(self):
        h=[x for x in GOALIE_WITH_POTG[0] if x!=""]
        row=[x for x in GOALIE_WITH_POTG[1] if x!=""]
        g=goalie_rows([h,row])
        self.assertEqual(g[0]["goalsAgainst"],3)
    def test_missing_goal_columns_only_allowed_for_verified_zero_score(self):
        with self.assertRaisesRegex(BoxscoreSchemaHold,"MISSING_SCORING_COLUMNS"):
            skater_rows(clone(SKATER_ZERO),verified_team_goals=1)
        with self.assertRaisesRegex(BoxscoreSchemaHold,"MISSING_OFFICIAL_GAME_GF"):
            skater_rows(clone(SKATER_ZERO),verified_team_goals=None)
    def test_corrupt_skater_stats_or_incomplete_columns_fail(self):
        t=clone(SKATER_SCORING);t[1][6]="3"
        with self.assertRaisesRegex(BoxscoreSchemaHold,"PLAYER_POINTS_ARITHMETIC"):
            skater_rows(t,verified_team_goals=1)
        t=clone(SKATER_SCORING);t[0][6]="Unknown"
        with self.assertRaises(BoxscoreSchemaHold):
            skater_rows(t,verified_team_goals=1)
    def test_short_or_misaligned_player_row_does_not_get_zero_filled(self):
        t=clone(GOALIE_NO_POTG);t[1].pop()
        with self.assertRaisesRegex(BoxscoreSchemaHold,"GOALIE_ROW_LENGTH_DRIFT"):
            goalie_rows(t)
        t=clone(SKATER_SCORING);t[1].pop()
        with self.assertRaisesRegex(BoxscoreSchemaHold,"SKATER_ROW_LENGTH_DRIFT"):
            skater_rows(t,verified_team_goals=1)
    def test_bad_blank_column_position_or_content_is_rejected(self):
        t=clone(GOALIE_WITH_POTG);t[0][2]="GP";t[0][3]=""
        with self.assertRaises(BoxscoreSchemaHold): goalie_rows(t)
        t=clone(GOALIE_WITH_POTG);t[1][2]="unexpected"
        with self.assertRaisesRegex(BoxscoreSchemaHold,"NONEMPTY_DECORATIVE_GOALIE_CELL"):
            goalie_rows(t)
    def test_invalid_goalie_POTG_column_does_not_silently_read_negative_or_text(self):
        for bad in ("unknown","-1",""):
            t=clone(GOALIE_WITH_POTG);t[1][7]=bad
            with self.assertRaises(BoxscoreSchemaHold):goalie_rows(t)
    def test_goalie_required_GP_GA_missing_never_inferred(self):
        for missing in ("GP","GA","L"):
            t=clone(GOALIE_WITH_POTG)
            t[0][t[0].index(missing)]="X"
            with self.assertRaises(BoxscoreSchemaHold):goalie_rows(t)
    def test_game_goals_parity_must_be_verified_after_scoring_by_named_columns(self):
        with self.assertRaisesRegex(BoxscoreSchemaHold,"TEAM_GOALS_DO_NOT_MATCH"):
            skater_rows(clone(SKATER_SCORING),verified_team_goals=2)
    def test_team_stats_source_aggregate_row_skipped_not_counted_as_player(self):
        t=clone(GOALIE_WITH_POTG)
        t.append(["","Team Stats","","1","1","3","3.00","1","-3"])
        g=goalie_rows(t)
        self.assertEqual(len(g),1)
        t=clone(SKATER_SCORING)
        t.append(["","Team Stats","","","1","1","2","0","0","1"])
        p=skater_rows(t,verified_team_goals=1)
        self.assertEqual(len(p),2)
    def test_no_external_transport_or_write_interfaces_in_helper(self):
        import lib.hockeyos_hto_boxscore_header_review as module
        self.assertFalse(hasattr(module,"fetch"))
        self.assertFalse(hasattr(module,"publish"))
        self.assertFalse(hasattr(module,"write"))
        self.assertFalse(hasattr(module,"start_background_collector"))

    def test_same_game_goals_and_goalie_ga_crosscheck_source_values_without_awards_scoring(self):
        sk=skater_rows(clone(SKATER_SCORING),verified_team_goals=1)
        gl=goalie_rows(clone(GOALIE_NO_POTG))
        result=check_game_observations(
            hto_game_id=3375601,official_goals_for=1,official_goals_against=6,
            skaters=sk,goalies=gl)
        self.assertEqual(result["goalsFor"],1)
        self.assertEqual(result["assists"],1)
        self.assertEqual(result["points"],2)
        self.assertEqual(result["goalieGoalsAgainst"],6)
        self.assertEqual(result["unknownGoaliePOTG"],["Fictional Goalie Delta"])
        self.assertFalse(result["awardModelRecalculated"])
        self.assertFalse(result["publisherUpdated"])
        self.assertEqual(result["messagesSent"],0)

    def test_game_score_reconciliation_rejects_changed_verified_total(self):
        sk=skater_rows(clone(SKATER_SCORING),verified_team_goals=1)
        gl=goalie_rows(clone(GOALIE_NO_POTG))
        for gf,ga,code in ((0,6,"GAME_SCORER_TOTAL"),(1,5,"GAME_GOALIE_TOTAL")):
            with self.assertRaisesRegex(BoxscoreSchemaHold,code):
                check_game_observations(hto_game_id=3375601,official_goals_for=gf,
                                        official_goals_against=ga,skaters=sk,goalies=gl)

    def test_same_game_unknown_goalie_potg_does_not_become_zero_or_one(self):
        sk=skater_rows(clone(SKATER_ZERO),verified_team_goals=0)
        gl=goalie_rows(clone(GOALIE_NO_POTG))
        gl[0]["potgPublishedInBoxscore"]=True
        with self.assertRaisesRegex(BoxscoreSchemaHold,"GOALIE_POTG_MISSING"):
            check_game_observations(hto_game_id=3356177,official_goals_for=0,
                                    official_goals_against=6,skaters=sk,goalies=gl)

    def test_same_game_duplicate_player_identity_fails_closed(self):
        sk=skater_rows(clone(SKATER_ZERO),verified_team_goals=0)
        gl=goalie_rows(clone(GOALIE_WITH_POTG))
        with self.assertRaisesRegex(BoxscoreSchemaHold,"DUPLICATE_OR_MISSING_SKATER"):
            check_game_observations(hto_game_id=3356177,official_goals_for=0,
                official_goals_against=3,skaters=sk+sk,goalies=gl)
        with self.assertRaisesRegex(BoxscoreSchemaHold,"DUPLICATE_OR_MISSING_GOALIE"):
            check_game_observations(hto_game_id=3356177,official_goals_for=0,
                official_goals_against=6,skaters=sk,goalies=gl+gl)

    def test_game_id_and_goalie_gp_values_must_be_valid(self):
        sk=skater_rows(clone(SKATER_ZERO),verified_team_goals=0)
        gl=goalie_rows(clone(GOALIE_WITH_POTG))
        for id in (None,0,True,"3356177"):
            with self.assertRaisesRegex(BoxscoreSchemaHold,"INVALID_OFFICIAL_HTO_GAME_ID"):
                check_game_observations(hto_game_id=id,official_goals_for=0,
                    official_goals_against=3,skaters=sk,goalies=gl)
        gl[0]["gp"]=0
        with self.assertRaisesRegex(BoxscoreSchemaHold,"UNEXPECTED_GOALIE_APPEARANCE"):
            check_game_observations(hto_game_id=3356177,official_goals_for=0,
                official_goals_against=3,skaters=sk,goalies=gl)

    def test_game_reconciliation_does_not_claim_freshness_or_Excel_parity(self):
        sk=skater_rows(clone(SKATER_ZERO),verified_team_goals=0)
        gl=goalie_rows(clone(GOALIE_WITH_POTG))
        result=check_game_observations(hto_game_id=3356177,
                 official_goals_for=0,official_goals_against=3,skaters=sk,goalies=gl)
        self.assertEqual(result["state"],"FOUR_SOURCE_CATEGORIES_RECONCILED_GAME_ONLY_AWARD_OVR_HELD")
        self.assertFalse(result["workbookWritten"])
        self.assertFalse(result["publisherUpdated"])
        self.assertNotIn("officialHTOReadbackAuthenticated",result)
        self.assertNotIn("officialAwardsRank",result)

if __name__=="__main__":
    unittest.main()
