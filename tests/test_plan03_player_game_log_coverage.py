"""Offline fail-closed checks for the Plan03 immutable workbook Player Game Logs audit."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_player_game_log_coverage import audit,ReviewHold,count,MAP

def fixture():
    feed={"schema":"brave-hc-hto-verified-game-feed/v1","allGamesDiscovered":True,
        "playerAggregateParity":True,"teamGP":4,"games":[]}
    for i,(game_id,num) in enumerate(MAP.items()):
        g=[0,3,2,1][i]
        ga=[3,6,3,7][i]
        feed["games"].append({"htoGameId":game_id,"teamGoals":g,"teamGoalsAgainst":ga,
           "skaters":[{"name":f"Skater {i}","gp":1,"g":g,"a":0,"pts":g}],
           "goalies":[{"name":f"Goalie {i}","gp":1,"losses":1,"goalsAgainst":ga,"potg":1 if i==0 else 0}]})
    original={"skaters":[{"game":"359","season":"W2026/27","gameType":"Regular Season",
                "name":"Skater 0","gp":"1","g":"0","a":"0","pts":"0","potg":"0"}],
          "goalies":[{"game":"359","season":"W2026/27","gameType":"Regular Season",
                "name":"Goalie 0","gp":"1","wins":"1","losses":"0","goalsAgainst":"0","potg":"0"}]}
    return feed,original

class WorkbookGameLogAuditTests(unittest.TestCase):
    def test_missing_three_games_and_four_goalie_conflicts_are_reported(self):
        f,w=fixture();r=audit(f,w)
        self.assertEqual(r["status"],"GAME_LOG_INCOMPLETE_HOLD")
        self.assertEqual(r["skaterRecordedGames"],[359])
        self.assertEqual(r["goalieRecordedGames"],[359])
        self.assertEqual(sum(x["missingCount"] for x in r["missingSourceMatches"]),6)
        self.assertEqual({x["field"] for x in r["conflicts"]},
            {"losses","goalsAgainst","winsConflictsWithOfficialLoss","potg"})
        self.assertFalse(r["fullPlayerSeasonProjectionAuthorized"])
        self.assertFalse(r["futureGame3375682Admitted"])
    def test_trusted_first_game_skater_does_not_create_conflict(self):
        f,w=fixture();r=audit(f,w)
        self.assertFalse(any(x["scope"]=="skaters" for x in r["conflicts"]))
    def test_official_fifth_game_is_held(self):
        f,w=fixture();f["games"].append(copy.deepcopy(f["games"][0]));f["teamGP"]=5
        with self.assertRaisesRegex(ReviewHold,"OFFICIAL_HTO_SOURCE_NOT_VERIFIED"):
            audit(f,w)
    def test_duplicate_htoid_is_held(self):
        f,w=fixture();f["games"][1]["htoGameId"]=f["games"][0]["htoGameId"]
        with self.assertRaisesRegex(ReviewHold,"UNADMITTED_OR_DUPLICATE_HTO_GAME"):
            audit(f,w)
    def test_invalid_per_game_scorer_identity_is_held(self):
        f,w=fixture();f["games"][0]["skaters"][0]["name"]=""
        with self.assertRaisesRegex(ReviewHold,"OFFICIAL_PLAYER_IDENTITY_AMBIGUOUS"):
            audit(f,w)
    def test_duplicate_workbook_player_game_is_held(self):
        f,w=fixture();w["skaters"].append(copy.deepcopy(w["skaters"][0]))
        with self.assertRaisesRegex(ReviewHold,"DUPLICATED_LEGACY_PLAYER_GAME"):
            audit(f,w)
    def test_unadmitted_legacy_game_is_held(self):
        f,w=fixture();w["skaters"][0]["game"]="363"
        with self.assertRaisesRegex(ReviewHold,"UNEXPECTED_LEGACY_SEASON_GAME_LOG_ROW"):
            audit(f,w)
    def test_wrong_source_season_is_held(self):
        f,w=fixture();w["skaters"][0]["season"]="W2025/26"
        with self.assertRaisesRegex(ReviewHold,"UNEXPECTED_LEGACY_SEASON_GAME_LOG_ROW"):
            audit(f,w)
    def test_wrong_player_total_is_explicitly_reported(self):
        f,w=fixture();w["skaters"][0]["g"]="1"
        r=audit(f,w)
        self.assertTrue(any(x["scope"]=="skaters" and x["field"]=="g" for x in r["conflicts"]))
    def test_conflicting_outside_name_is_not_assigned_to_player(self):
        f,w=fixture();w["skaters"][0]["name"]="Unknown Substitute"
        r=audit(f,w)
        self.assertTrue(any(x["reason"]=="UNRECONCILED_EXTRA_LEGACY_NAME" for x in r["conflicts"]))
        self.assertTrue(any(x["missingCount"] for x in r["missingSourceMatches"]))
    def test_complete_aligned_source_still_requires_public_release_review(self):
        f,w=fixture()
        sk=[];go=[]
        for source in f["games"]:
            game=str(MAP[source["htoGameId"]])
            for x in source["skaters"]:
                sk.append({"game":game,"season":"W2026/27","gameType":"Regular Season",
                  "name":x["name"],"gp":str(x["gp"]),"g":str(x["g"]),"a":str(x["a"]),
                  "pts":str(x["pts"]),"potg":"0"})
            for x in source["goalies"]:
                go.append({"game":game,"season":"W2026/27","gameType":"Regular Season",
                   "name":x["name"],"gp":"1","wins":"0","losses":"1",
                   "goalsAgainst":str(x["goalsAgainst"]),"potg":str(x["potg"])})
        r=audit(f,{"skaters":sk,"goalies":go})
        self.assertEqual(r["status"],"GAME_LOG_PARITY_PASS_REVIEW_ONLY")
        self.assertFalse(r["fullPlayerSeasonProjectionAuthorized"])
        self.assertFalse(r["newOfficialRecordPublicationAuthorized"])
    def test_bool_instead_of_integer_is_rejected(self):
        with self.assertRaisesRegex(ReviewHold,"INVALID_NUMBER"):
            count(True,"GP")

if __name__=="__main__":unittest.main()
