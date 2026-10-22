"""Plan03 award source-completeness fail-closed tests, no private workbook."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_award_source_readiness import classify,source_coverage,AwardSourceHold

def make():
    official={"officialSkaterObservations":54,"officialGoalieObservations":4,
              "unknownSkaterPIM":42,"unknownGoaliePOTG":1}
    rows=[]
    for i in range(50):
        d={}
        if i<24:
            d={"FJ":f"Player-{i}","FQ":"DI" if i<2 else "CU" if i<10 else "FT",
               "GH":"50.0","GL":"47.3","HZ":"0.12","ID":"0.23",
               "JS":"1" if i<21 else "0","JW":"1" if i<21 else "0"}
        rows.append({"row":i+6,"data":d})
    return official,rows

class AwardReadiness(unittest.TestCase):
    def test_partial_cache_present_does_not_certify_current_awards(self):
        coverage,rows=make()
        result=classify(coverage,rows)
        self.assertEqual(result["status"],"AWARDS_CACHED_COMPONENTS_PRESENT_OFFICIAL_SOURCE_INCOMPLETE_HOLD")
        self.assertEqual(result["legacyAwardScoring"]["namedEntries"],24)
        self.assertEqual(result["legacyAwardScoring"]["rosterStatusCounts"],{"DI":2,"CU":8,"FT":14})
        self.assertEqual(result["currentHTOObservationCoverage"]["unknownSkaterPIM"],42)
        self.assertFalse(result["currentSeasonAwardScoringCertified"])
        self.assertFalse(result["nomineesOrWinnersApproved"])
    def test_partial_hto_pim_coverage_change_requires_review(self):
        c,rows=make();c["unknownSkaterPIM"]=0
        with self.assertRaisesRegex(AwardSourceHold,"OFFICIAL_SCORING_COMPLETENESS_CHANGED"):
            classify(c,rows)
    def test_unknown_goalie_potg_cannot_be_silently_zero(self):
        c,rows=make();c["unknownGoaliePOTG"]=0
        with self.assertRaisesRegex(AwardSourceHold,"OFFICIAL_SCORING_COMPLETENESS_CHANGED"):
            classify(c,rows)
    def test_scoring_rows_cannot_be_duplicated(self):
        c,rows=make();rows[3]["data"]["FJ"]=rows[0]["data"]["FJ"]
        with self.assertRaisesRegex(AwardSourceHold,"LEGACY_AWARD_ELIGIBILITY_ROSTER_CHANGED"):
            classify(c,rows)
    def test_legacy_eligible_player_scope_change_holds(self):
        c,rows=make();rows[3]["data"]["FQ"]="UNREVIEWED"
        with self.assertRaisesRegex(AwardSourceHold,"LEGACY_AWARD_ELIGIBILITY_ROSTER_CHANGED"):
            classify(c,rows)
    def test_award_cache_baseline_drift_is_reviewed(self):
        c,rows=make();rows[4]["data"]["GH"]="0"
        with self.assertRaisesRegex(AwardSourceHold,"AWARDS_CACHED_SOURCE_COMPONENT_BASELINE_CHANGED"):
            classify(c,rows)
    def test_art_ross_eligibility_not_silently_expanded(self):
        c,rows=make();rows[22]["data"]["JS"]="1"
        with self.assertRaisesRegex(AwardSourceHold,"AWARDS_ELIGIBILITY_SOURCE_BASELINE_CHANGED"):
            classify(c,rows)
    def test_malformed_cache_value_fails_closed(self):
        c,rows=make();rows[1]["data"]["HZ"]="N/A"
        with self.assertRaisesRegex(AwardSourceHold,"AWARDS_SCORING_CACHE_NONNUMERIC"):
            classify(c,rows)
    def test_missing_table_row_is_not_auto_accepted(self):
        c,rows=make();rows.pop()
        with self.assertRaisesRegex(AwardSourceHold,"AWARDS_SCORING_TABLE_CHANGED"):
            classify(c,rows)
    def test_wrong_htogame_set_is_rejected(self):
        games=[{"htoGameId":n,"skaters":[],"goalies":[]} for n in (3356177,3356178,3369564,3375601)]
        feed={"schema":"brave-hc-hto-verified-game-feed/v1","teamGP":4,
              "allGamesDiscovered":True,"playerAggregateParity":True,"games":games}
        feed["games"][3]["htoGameId"]=3375682
        with self.assertRaisesRegex(AwardSourceHold,"HTO_GAME_IDENTITIES_CHANGED"):
            source_coverage(feed)

if __name__=="__main__":
    unittest.main()
