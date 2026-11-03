"""Release gates for official SVHL administrative forfeits across Winter 2024/25–2025/26."""
import json
import unittest
from pathlib import Path
from urllib.parse import parse_qs,urlparse
ROOT=Path(__file__).resolve().parents[2]
LEDGER=json.loads((ROOT/"widgets"/"brave-official-forfeit-results.json").read_text(encoding="utf-8"))
STANDINGS=json.loads((ROOT/"widgets"/"historical-svhl-standings.json").read_text(encoding="utf-8"))

class OfficialForfeitResultsTests(unittest.TestCase):
    def test_pinned_schema_and_source_policy(self):
        self.assertEqual(LEDGER["schema"],"brave-hc-svhl-canonical-administrative-forfeits/v1")
        self.assertEqual(LEDGER["status"],"RECONCILED_DUAL_SOURCE_ALL_FOUR_FORFEITS_BOTH_SEASONS")
        self.assertEqual(LEDGER["recordUse"],"CANONICAL_READ_ONLY_SUPPLEMENTAL_HOCKEYOS_RESULTS")
        self.assertFalse(LEDGER["publishedWebsiteChanged"])
        self.assertEqual(LEDGER["authorityRules"]["officialForfeitScoreAndWinner"],"SVHL original official league team-season game final")
        self.assertIn("HOME_TEAM_FIRST_VISITOR_TEAM_SECOND",LEDGER["authorityRules"]["leagueDisplayedScoreOrientation"])
        self.assertTrue(LEDGER["authorityRules"]["zeroPlayerCredits"])

    def test_all_four_hto_ids_paired_with_official_league_ids(self):
        self.assertEqual({g["htoGameId"]:g["svhlGameId"] for g in LEDGER["forfeits"]},
                         {2148155:116721,2215007:122674,2215009:122678,2215012:122910})
        self.assertEqual(len(LEDGER["forfeits"]),4)
        self.assertEqual(len({(g["season"],g["htoGameId"]) for g in LEDGER["forfeits"]}),4)

    def test_visitor_scores_are_home_first_not_braves_losses(self):
        away={g["htoGameId"]:g for g in LEDGER["forfeits"] if g["bravesHomeAway"]=="VISITOR"}
        self.assertEqual(set(away),{2215007,2215012})
        for g in away.values():
            with self.subTest(game=g["htoGameId"]):
                self.assertEqual(g["leagueHomeAwayScore"],{"home":0,"visitor":1})
                self.assertEqual(g["leagueCanonicalTeamScore"],{"braves":1,"opponent":0,"outcome":"W"})
                self.assertEqual(g["leagueActualHomeTeamId"],g["opponentLeagueTeamId"])

    def test_reciprocal_both_teams_same_home_visitor_score(self):
        for g in LEDGER["forfeits"]:
            with self.subTest(game=g["htoGameId"]):
                pair=g["sourceCheck"]
                self.assertTrue(pair["reciprocalScoresEqual"])
                self.assertTrue(pair["htoForfeitWinnerMatchesLeague"])
                br=pair["bravesLeagueTeamPage"]
                op=pair["opponentLeagueTeamPage"]
                self.assertNotEqual(br["teamRole"],op["teamRole"])
                for item in (br,op):
                    self.assertEqual((item["leagueHomeGoals"],item["leagueVisitorGoals"]),
                                     (g["leagueHomeAwayScore"]["home"],g["leagueHomeAwayScore"]["visitor"]))
                    self.assertEqual(item["gameId"],g["svhlGameId"])
                    self.assertEqual(item["date"],g["date"])
                    self.assertEqual(item["source"]["http"],200)
                    self.assertEqual(len(item["source"]["publicHTMLSHA256"]),64)

    def test_original_hto_zero_zero_and_forfeit_labels_preserved(self):
        for g in LEDGER["forfeits"]:
            hto=g["sourceCheck"]["originalHTOBoxscore"]
            with self.subTest(game=g["htoGameId"]):
                self.assertEqual(hto["http"],200)
                self.assertEqual(len(hto["publicHTMLSHA256"]),64)
                raw=hto["rawDisplay"]
                self.assertEqual((raw["bravesGoals"],raw["opponentGoals"]),(0,0))
                self.assertEqual(raw["bravesLabel"],"Brave H.C. - WIN")
                self.assertTrue(raw["opponentLabel"].endswith(" - Forfeit"))
                self.assertEqual(hto["classification"],"ADMINISTRATIVE_FORFEIT_NOT_PLAYED")

    def test_competitive_standings_not_in_game_play_statistics(self):
        for g in LEDGER["forfeits"]:
            with self.subTest(game=g["htoGameId"]):
                self.assertEqual(g["eventType"],"ADMINISTRATIVE_FORFEIT")
                self.assertFalse(g["playedOnIce"])
                self.assertFalse(g["countsInOnIceGoalOrAssistStats"])
                self.assertEqual(g["countsInLeagueStandings"],{"gp":1,"w":1,"l":0,"t":0,"gf":1,"ga":0})
                self.assertEqual(g["leagueCanonicalTeamScore"],{"braves":1,"opponent":0,"outcome":"W"})

    def test_source_links_stay_within_exact_team_seasons(self):
        seasonIDs={"Winter_2024/2025":531,"Winter_2025/2026":547}
        for g in LEDGER["forfeits"]:
            with self.subTest(game=g["htoGameId"]):
                self.assertEqual(g["svhlLeagueId"],seasonIDs[g["season"]])
                u=urlparse(g["sourceCheck"]["originalHTOBoxscore"]["url"])
                q=parse_qs(u.query)
                self.assertEqual((u.scheme,u.hostname),("https","www.htosports.com"))
                self.assertEqual(q["gameID"],[str(g["htoGameId"])])
                self.assertEqual(q["viewseas"],[g["season"]])
                v=urlparse(g["sourceCheck"]["officialLeagueGameInfoURL"])
                qv=parse_qs(v.query)
                self.assertEqual(v.hostname,"leagues.sportsvillage.ca")
                self.assertEqual(qv["leagueid"],[str(g["svhlLeagueId"])])
                self.assertEqual(qv["gameid"],[str(g["svhlGameId"])])

    def test_both_season_reconstructions_equal_official_sports_village_standings(self):
        self.assertEqual(len(LEDGER["seasons"]),2)
        expected={
            "Winter_2024/2025":{"gp":24,"w":10,"l":12,"t":2,"pts":22,"gf":74,"ga":95},
            "Winter_2025/2026":{"gp":24,"w":12,"l":9,"t":3,"pts":27,"gf":84,"ga":82}}
        for s in LEDGER["seasons"]:
            with self.subTest(season=s["season"]):
                calc=s["reconstructedFromRawHTOPlusLeagueForfeits"]
                pub=s["officialLeagueStandings"]["official"]
                self.assertEqual(calc,expected[s["season"]])
                self.assertTrue(all(pub[k]==calc[k] for k in calc))
                self.assertEqual(s["result"],"EXACT_LEAGUE_STANDINGS_PARITY")
                self.assertEqual(s["officialLeagueStandings"]["http"],200)
                self.assertEqual(len(s["officialLeagueStandings"]["publicHTMLSHA256"]),64)
                self.assertNotIn("uri",s["sourceHTOAudit"])
                self.assertIn("BRUTTECH 1",s["sourceHTOAudit"]["evidenceStorage"])

    def test_existing_historical_svhl_standings_unchanged_and_agree(self):
        for s in LEDGER["seasons"]:
            edition=next(x for x in STANDINGS["seasons"] if x["leagueId"]==s["svhlLeagueId"])
            team=next(t for d in edition["divisions"] for t in d["teams"] if t["seasonTeamId"]==s["bravesLeagueTeamId"])
            calc=s["reconstructedFromRawHTOPlusLeagueForfeits"]
            with self.subTest(season=s["season"]):
                self.assertEqual({k:team[k] for k in ("gp","w","l","t","pts","gf","ga")},calc)

    def test_aggregate_four_wins_zero_fake_on_ice_stats(self):
        self.assertEqual(LEDGER["aggregate"],{
            "count":4,"leagueAwardedForfeitWins":4,"leagueAwardedForfeitLosses":0,
            "officialTeamStandingsGoalsFor":4,"officialTeamStandingsGoalsAgainst":0,
            "playedGamesCreated":0,"individualSkaterGoalsCreated":0})

if __name__=="__main__":
    unittest.main()
