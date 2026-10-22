"""Synthetic fail-closed source tests for skater projection actuals."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_projection_actuals_hto import official_skaters,reconcile,EvidenceHold

def fixture():
    names=[f"Skater-{n}" for n in range(19)]+["Pavaday, Damian"]
    indices=[list(range(14)),list(range(5,20)),list(range(1,14)),list(range(8,20))]
    ids=[3356177,3356178,3369564,3375601]
    goals,assists=6,10
    games=[]
    for gid,players in zip(ids,indices):
        g=[]
        for n in players:
            gg=1 if goals else 0
            aa=1 if assists else 0
            goals-=gg;assists-=aa
            g.append({"name":names[n],"gp":1,"g":gg,"a":aa,"pts":gg+aa})
        games.append({"htoGameId":gid,"skaters":g})
    feed={"schema":"brave-hc-hto-verified-game-feed/v1","allGamesDiscovered":True,
          "playerAggregateParity":True,"teamGP":4,"games":games}
    source=official_skaters(feed)
    rows=[{"player":name,"status":"FT","values":dict(source[name])} for name in names[:-1]]
    rows.extend({"player":f"Historical-{i}","status":"CU",
                 "values":{"gp":0,"g":0,"a":0,"pts":0}} for i in range(70))
    return feed,source,rows

class ProjectionActualQA(unittest.TestCase):
    def test_basic_projected_table_actuals_pass_not_forecast(self):
        _,official,rows=fixture()
        result=reconcile(official,rows)
        self.assertEqual(result["status"],"PROJECTION_REPRESENTED_ACTUALS_MATCH_HTO_PARTIAL")
        self.assertEqual(result["officialHTOSkaters"],20)
        self.assertEqual(result["projectionTablePlayers"],89)
        self.assertEqual(result["matchedActuals"],19)
        self.assertEqual(result["notRepresentedOfficialHTOSkaters"],["Pavaday, Damian"])
        self.assertEqual(result["officialCurrentSeasonTotals"],{"gp":54,"g":6,"a":10,"pts":16})
        self.assertFalse(result["forecastColumnsAndRatesCertified"])
        self.assertFalse(result["awardsOrWebWatchPublicationAuthorized"])
    def test_actual_goal_mismatch_is_visible(self):
        _,official,rows=fixture()
        rows[0]["values"]["g"]+=1
        result=reconcile(official,rows)
        self.assertEqual(result["status"],"PROJECTION_ACTUAL_SOURCE_PARITY_HOLD")
        self.assertEqual(result["discrepancies"][0]["field"],"g")
    def test_duplicate_projection_player_holds(self):
        _,official,rows=fixture()
        rows[50]["player"]=rows[0]["player"]
        with self.assertRaisesRegex(EvidenceHold,"PROJECTION_ROSTER_DUPLICATE"):
            reconcile(official,rows)
    def test_unreviewed_twentieth_player_requires_eligibility_gate(self):
        _,official,rows=fixture()
        rows[22]["player"]="Pavaday, Damian"
        rows[22]["values"]=dict(official["Pavaday, Damian"])
        with self.assertRaisesRegex(EvidenceHold,"PROJECTION_HTO_PLAYER_COVERAGE_CHANGED"):
            reconcile(official,rows)
    def test_unsupported_missing_player_cannot_be_swapped(self):
        _,official,rows=fixture()
        rows[7]["player"]="Historical-70"
        with self.assertRaisesRegex(EvidenceHold,"PROJECTION_HTO_PLAYER_COVERAGE_CHANGED"):
            reconcile(official,rows)
    def test_negative_actuals_never_valid(self):
        _,official,rows=fixture()
        rows[0]["values"]["gp"]=-1
        with self.assertRaisesRegex(EvidenceHold,"PROJECTION_ACTUAL_VALUE_NOT_INTEGER"):
            reconcile(official,rows)
    def test_verified_feed_unknown_fifth_game_hold(self):
        feed,_,_=fixture()
        feed["games"].append(copy.deepcopy(feed["games"][0]))
        feed["games"][-1]["htoGameId"]=3375682
        feed["teamGP"]=5
        with self.assertRaisesRegex(EvidenceHold,"HTO_VERIFIED_FEED_CONTRACT_CHANGED"):
            official_skaters(feed)
    def test_recorded_goals_must_be_integer(self):
        feed,_,_=fixture()
        feed["games"][0]["skaters"][0]["g"]=None
        with self.assertRaisesRegex(EvidenceHold,"HTO_PLAYER_ACTUAL_NOT_INTEGER"):
            official_skaters(feed)
    def test_malformed_actual_field_structure_holds(self):
        _,official,rows=fixture()
        rows[0]["values"].pop("pts")
        with self.assertRaisesRegex(EvidenceHold,"PROJECTION_ACTUAL_FIELDS_INCOMPLETE"):
            reconcile(official,rows)
    def test_any_duplicate_hto_game_identity_is_rejected(self):
        feed,_,_=fixture()
        feed["games"][1]["htoGameId"]=feed["games"][0]["htoGameId"]
        with self.assertRaisesRegex(EvidenceHold,"UNADMITTED_OR_DUPLICATE_HTO_GAME"):
            official_skaters(feed)

if __name__=="__main__":
    unittest.main()
