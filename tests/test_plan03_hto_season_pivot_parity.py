"""No-network Plan 03 season pivot parity checks."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_hto_season_pivot_parity import source_totals,reconcile,ParityHold

def fixture():
    counts=[14,15,13,12]
    starts=[0,5,0,8]
    game_ids=[3356177,3356178,3369564,3375601]
    goalie_names=["Leong, Dev","Logue, Stephen","Carlyle, Adam","Leong, Dev"]
    goalie_ga=[3,6,3,7]
    games=[]
    skg=6;ska=10;skpotg=9
    for i,(cnt,start,gid) in enumerate(zip(counts,starts,game_ids)):
        people=[]
        for j in range(cnt):
            name=f"Player-{(start+j)%20}"
            goals=1 if skg>0 else 0
            assists=1 if ska>0 else 0
            potg=1 if skpotg>0 else 0
            skg-=goals;ska-=assists;skpotg-=potg
            people.append({"name":name,"gp":1,"g":goals,"a":assists,
                "pts":goals+assists,"potg":potg,"pim":None if i<3 else 0})
        games.append({"htoGameId":gid,"skaters":people,
           "goalies":[{"name":goalie_names[i],"gp":1,"losses":1,
                       "goalsAgainst":goalie_ga[i],"potg":None if i==3 else 1}]})
    feed={"schema":"brave-hc-hto-verified-game-feed/v1",
          "teamGP":4,"allGamesDiscovered":True,"playerAggregateParity":True,
          "games":games}
    source,unknown=source_totals(feed)
    sk={name:dict(vals) for name,vals in source["skaters"].items()}
    goalies={name:{**vals,"wins":0,"potg":1} for name,vals in source["goalies"].items()}
    return feed,sk,goalies

class PivotParity(unittest.TestCase):
    def test_expected_full_basic_parity_preserves_unknown_fields(self):
        f,s,g=fixture()
        result=reconcile(f,s,g)
        self.assertEqual(result["status"],"DISPOSABLE_BASIC_HTO_PIVOT_PARITY_PASS_CAVEATED")
        self.assertEqual(result["skaterIdentityCount"],20)
        self.assertEqual(result["goalieIdentityCount"],3)
        self.assertTrue(result["skaterBasicSourceParity"])
        self.assertTrue(result["goalieBasicSourceParity"])
        self.assertEqual(result["unknownHTOFields"]["skaterPIM"],42)
        self.assertEqual(result["unknownHTOFields"]["goaliePOTG"],1)
        self.assertFalse(result["goaliePOTGComplete"])
        self.assertFalse(result["publicPlayerStatsReleaseAuthorized"])
    def test_preexisting_goalie_loss_error_is_held(self):
        f,s,g=fixture()
        g["Leong, Dev"]["losses"]=1
        result=reconcile(f,s,g)
        self.assertFalse(result["goalieBasicSourceParity"])
        self.assertEqual(result["status"],"DISPOSABLE_HTO_PIVOT_PARITY_HELD")
    def test_unverified_win_claim_holds_without_direct_source(self):
        f,s,g=fixture()
        g["Leong, Dev"]["wins"]=1
        result=reconcile(f,s,g)
        self.assertEqual(result["unverifiedGoalieWinClaims"],[{"player":"Leong, Dev","wins":1}])
        self.assertFalse(result["goalieBasicSourceParity"])
    def test_missing_skater_identity_holds(self):
        f,s,g=fixture()
        s.pop("Player-0")
        result=reconcile(f,s,g)
        self.assertFalse(result["skaterBasicSourceParity"])
    def test_false_inflated_goal_total_holds(self):
        f,s,g=fixture()
        s["Player-1"]["g"]+=1
        self.assertFalse(reconcile(f,s,g)["skaterBasicSourceParity"])
    def test_fifth_game_rejected(self):
        f,s,g=fixture()
        f["games"].append(copy.deepcopy(f["games"][0]))
        f["games"][-1]["htoGameId"]=3375682
        f["teamGP"]=5
        with self.assertRaisesRegex(ParityHold,"HTO_FEED_INCOMPLETE"):
            reconcile(f,s,g)
    def test_ambiguous_official_player_name_rejected(self):
        f,s,g=fixture()
        f["games"][0]["skaters"][1]["name"]=f["games"][0]["skaters"][0]["name"]
        with self.assertRaisesRegex(ParityHold,"OFFICIAL_PLAYER_NAME_AMBIGUOUS"):
            reconcile(f,s,g)

if __name__=="__main__":
    unittest.main()
