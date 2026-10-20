"""Fictional-row tests for the isolated collector candidate; no network."""
import copy
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import hockeyos_collector_candidate as candidate

def fixture():
    games=[]
    for index, gid in enumerate(candidate.GAME_MAP):
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        sk=candidate.review.helper.skater_rows([
            ["No","Name","POS","","+/-","POTG"],
            ["11","Fictional Skater","C","","0","0"]], verified_team_goals=0)
        header=["No","Name","","GP","L","GA","GAA","+/-"]
        row=["30","Fictional Goalie","","1","1","1","1.00","-1"]
        if index != 3:
            header.insert(7,"POTG"); row.insert(7,"0")
        go=candidate.review.helper.goalie_rows([header,row])
        games.append({"htoGameId":gid,"sourceUrl":url,"teamGoals":0,"teamGoalsAgainst":1,
                      "skaters":sk,"goalies":go,
                      "contentProvenance":{"canonicalURL":url,"gameDate":candidate.review.GAME_DATES[gid]}})
    skseason=[["Name","GP","G","A","Pts","+/-","POTG"],["Fictional Skater","4","0","0","0","0","0"]]
    goseason=[["Name","GP","L","GA","POTG"],["Fictional Goalie","4","4","4","0"]]
    provenance={"canonicalURL":candidate.STATS_URL,"seasonTitle":candidate.review.SEASON_TITLE}
    return games,skseason,goseason,provenance

class CollectorCandidateTests(unittest.TestCase):
    def test_unknown_goalie_potg_remains_null_with_separate_completeness(self):
        result=candidate.build_candidate(*fixture())
        self.assertIsNone(result["goalieGameTotals"]["Fictional Goalie"]["potg"])
        self.assertEqual(result["goalieAggregateCompleteness"]["Fictional Goalie"]["potg"],
                         {"knownSubtotal":0,"unknownCount":1,"complete":False})
        self.assertIsNone(result["games"][-1]["goalies"][0]["potg"])
        self.assertEqual(result["inferredPerGamePOTG"],[])
    def test_explicit_mapping_is_independent_of_input_order(self):
        args=list(fixture()); args[0].reverse()
        result=candidate.build_candidate(*args)
        self.assertEqual([(g["htoGameId"],g["workbookGameNumber"],g["date"]) for g in result["games"]],
                         [(gid,*mapping) for gid,mapping in candidate.GAME_MAP.items()])
    def test_missing_duplicate_or_unmapped_game_rejected(self):
        for change in ("missing","duplicate","unmapped"):
            args=list(fixture())
            if change=="missing": args[0].pop()
            elif change=="duplicate": args[0][-1]=copy.deepcopy(args[0][0])
            else: args[0][-1]["htoGameId"]=99999
            with self.assertRaisesRegex(candidate.review.ReviewHold,"AUDITED_GAME_MAP_COVERAGE"):
                candidate.build_candidate(*args)
    def test_output_boundary_and_schema_are_explicit(self):
        result=candidate.build_candidate(*fixture())
        self.assertEqual(result["schema"],"brave-hc-hto-game-feed-candidate/v1")
        self.assertFalse(result["productionAcceptance"])
        self.assertFalse(result["consumerCompatibilityVerified"])
        self.assertFalse(result["allGamesDiscovered"])
        self.assertFalse(result["workbookWritten"])
        self.assertEqual(set(result["games"][0]["skaters"][0]),
                         {"name","no","position","gp","g","a","pts","potg","plusminus","pim"})
        self.assertEqual(result["missingStatFields"]["skaterPIMUnknownRows"],4)
        self.assertTrue(all(g["skaters"][0]["pim"] is None for g in result["games"]))
    def test_wrong_game_url_date_or_season_rejected(self):
        for field in ("sourceUrl","gameDate","seasonTitle"):
            args=list(fixture())
            if field=="sourceUrl": args[0][0][field]=args[0][1][field]
            elif field=="gameDate": args[0][0]["contentProvenance"][field]="wrong"
            else: args[3][field]="Wrong Season"
            with self.assertRaises(candidate.review.ReviewHold):
                candidate.build_candidate(*args)
    def test_season_difference_and_missing_column_rejected(self):
        args=list(fixture());args[1][1][1]="3"
        with self.assertRaisesRegex(candidate.review.ReviewHold,"SEASON_PARITY_MISMATCH"):
            candidate.build_candidate(*args)
        args=list(fixture());args[1][0][-1]="UNKNOWN"
        with self.assertRaisesRegex(candidate.review.ReviewHold,"MISSING_SEASON_COLUMNS"):
            candidate.build_candidate(*args)
    def test_explicit_opt_in_required_before_collection(self):
        with patch.object(candidate,"collect_sources") as collect:
            with self.assertRaises(candidate.review.ReviewHold):candidate.main([])
            collect.assert_not_called()

if __name__=="__main__":
    unittest.main()
