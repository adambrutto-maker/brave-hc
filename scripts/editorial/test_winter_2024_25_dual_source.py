"""Independent 2024–25 HTO/SVHL historical score corroboration and explicit holds."""
import json, unittest
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/"docs"/"editorial"/"native_hto"/"2024-25"
HTO=json.loads((DIR/"261103_Winter2024_25_Public_Source_Preservation_v2.json").read_text(encoding="utf-8"))
SVHL=json.loads((DIR/"261103_Winter2024_25_HTO_SVHL_Source_Corroboration.json").read_text(encoding="utf-8"))

class TwoSourceParityTests(unittest.TestCase):
    def test_verified_match_counts(self):
        self.assertEqual(SVHL["schema"],"brave-hc-winter-2024-25-hto-svhl-season-source-parity/v1")
        self.assertEqual(SVHL["status"],"READ_ONLY_SOURCE_CORROBORATION_WITH_EXPLICIT_HOLDS")
        self.assertEqual(SVHL["counts"],{
            "PLAYED_EXACT_DATE_FINAL_SCORE_PARITY":23,
            "ADMIN_FORFEIT_DIFFERENT_SOURCE_SCORING_CONVENTION":1,
            "PLAYOFF_UNSCORED_IN_SVHL_EVENT_DATASET":2})
        self.assertEqual(len(SVHL["games"]),26)

    def test_team_identity_and_source_scope(self):
        self.assertEqual((SVHL["svhlLeagueId"],SVHL["svhlTeamId"],SVHL["svhlTeamName"]),(531,12572,"Braves H/C"))
        self.assertIn("leagueid=531&teamid=12572",SVHL["svhlTeamSeasonURL"])
        self.assertIn("No native HTO editing",SVHL["editorialPolicy"])
        self.assertEqual({r["htoGameId"] for r in SVHL["games"]},{r["gameId"] for r in HTO["games"]})

    def test_played_match_exact_date_and_both_goals(self):
        hto={g["gameId"]:g for g in HTO["games"]}
        records=[r for r in SVHL["games"] if r["status"]=="PLAYED_EXACT_DATE_FINAL_SCORE_PARITY"]
        self.assertEqual(len(records),23)
        for r in records:
            with self.subTest(id=r["htoGameId"]):
                orig=hto[r["htoGameId"]]
                self.assertEqual(r["date"],orig["date"])
                self.assertEqual(r["HTOScore"],r["svhlScore"])
                self.assertEqual(r["HTOScore"],[orig["bravesGoals"],orig["opponentGoals"]])
                self.assertIn(orig["result"],("W","L","T"))
                self.assertEqual(len(r["svhlGamePublicSourceSHA256"]),64)

    def test_exact_official_crosslinked_game_sources(self):
        for r in SVHL["games"]:
            with self.subTest(id=r["htoGameId"]):
                u=urlparse(r["HTOURL"])
                q=parse_qs(u.query)
                self.assertEqual(u.hostname,"www.htosports.com")
                self.assertEqual(q["gameID"],[str(r["htoGameId"])])
                self.assertEqual(q["viewseas"],["Winter_2024/2025"])
                if r["status"]!="PLAYOFF_UNSCORED_IN_SVHL_EVENT_DATASET":
                    v=urlparse(r["svhlGameURL"])
                    q2=parse_qs(v.query)
                    self.assertEqual(v.hostname,"leagues.sportsvillage.ca")
                    self.assertEqual(q2["gameid"],[str(r["svhlGameId"])])
                    self.assertEqual(q2["leagueid"],["531"])

    def test_admin_forfeit_not_mislabeled_as_played_tie(self):
        f=[r for r in SVHL["games"] if r["status"]=="ADMIN_FORFEIT_DIFFERENT_SOURCE_SCORING_CONVENTION"]
        self.assertEqual(len(f),1)
        self.assertEqual(f[0]["htoGameId"],2148155)
        self.assertEqual(f[0]["HTOScore"],[0,0])
        self.assertEqual(f[0]["svhlScore"],[1,0])
        self.assertEqual(f[0]["officialLeagueFinalBravesFirst"],[1,0])
        self.assertEqual(f[0]["officialLeagueResult"],"W")
        self.assertEqual(f[0]["officialLeagueResultType"],"ADMINISTRATIVE_FORFEIT_WIN")
        self.assertEqual(f[0]["bravesHomeAway"],"HOME")
        self.assertEqual(f[0]["leagueDisplayedHomeVisitor"],[1,0])
        self.assertEqual(f[0]["leagueCompetitiveStandingsContribution"],{"gp":1,"w":1,"l":0,"t":0,"gf":1,"ga":0})
        self.assertFalse(f[0]["playedOnIce"])
        self.assertFalse(f[0]["awardedIndividualGoals"])
        self.assertEqual(f[0]["gameType"],"REGULAR SEASON")
        self.assertIn("home-first/visitor-second 1-0",f[0]["sourceBoundary"])
        self.assertIn("HTO 0-0 raw display",f[0]["sourceBoundary"])

    def test_playoffs_are_unscored_in_secondary_source(self):
        p=[r for r in SVHL["games"] if r["status"]=="PLAYOFF_UNSCORED_IN_SVHL_EVENT_DATASET"]
        self.assertEqual({r["htoGameId"] for r in p},{2148162,2148163})
        self.assertEqual({(r["htoGameId"],tuple(r["HTOScore"])) for r in p},{(2148162,(2,3)),(2148163,(0,3))})
        self.assertTrue(all(r["svhlPlayerGameRecord"] is None for r in p))
        self.assertTrue(all("not completed playoff results" in r["sourceBoundary"] for r in p))

    def test_no_unverified_full_franchise_alias_inference(self):
        aliases={r["opponentHTO"]:r.get("svhlOpponent") for r in SVHL["games"] if "svhlOpponent" in r}
        self.assertEqual(aliases["Fang"],"Fangs")
        self.assertEqual(aliases["Mohawks H.C."],"Mohawks H/C")
        self.assertEqual(aliases["Mohawks HC"],"Mohawks H/C")
        self.assertEqual(aliases["Mid Ice Crisis"],"Mid Ice Crisis")
        self.assertEqual(aliases["Schmelts"],"Schmelts")

    def test_april_goalie_discrepancy_remains_held(self):
        issue=SVHL["majorHold"]
        self.assertEqual(issue["htoGameId"],2148163)
        self.assertEqual(issue["status"],"UNRESOLVED_NO_EVENT_INFERENCE")
        self.assertIn("goalie Stephen Logue individual 2 GA",issue["issue"])
        april=(DIR/"review_drafts"/"20250406_HTO_2148163_Preview_NotForPublication.md").read_text(encoding="utf-8")
        self.assertIn("does not establish an empty-net goal",april)

if __name__=="__main__":
    unittest.main()
