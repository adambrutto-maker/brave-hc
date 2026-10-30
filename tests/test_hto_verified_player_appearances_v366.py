"""Independent verification of current-season HTO appearances and fail-closed gaps."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import build_hto_verified_player_appearances_v366 as core

EVIDENCE=ROOT/"docs/hto-highlights-rollout/game-audit-evidence/live_boxscores.json"
INDEX=ROOT/"docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json"
ACTUAL=ROOT/"widgets/player-actuals-hourly.json"
CAREER=ROOT/"widgets/player-career-insights.json"
FEED=ROOT/"widgets/player-form-appearances-v364.json"


class VerifiedAppearancesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence=core.load(EVIDENCE)
        cls.index=core.load(INDEX)
        cls.actual=core.load(ACTUAL)
        cls.career=core.load(CAREER)

    def make(self, **kwargs):
        values={"evidence":self.evidence,"index":self.index,
                "actual":self.actual,"career":self.career}
        values.update(kwargs)
        return core.build(values["evidence"],values["index"],
                          values["actual"],values["career"])

    def test_complete_five_game_source_exact_season_parity(self):
        d=self.make()
        self.assertEqual(d["status"],core.STATUS)
        self.assertEqual(d["season"],"W2026/27")
        self.assertEqual(d["coverage"]["officialTeamGames"],self.actual["teamGP"])
        self.assertEqual(d["coverage"]["reconciledSkaters"],len(self.actual["players"]))
        expected={k:sum(p[k] for p in self.actual["players"])
                  for k in ("gp","g","a","pts")}
        self.assertEqual(d["coverage"]["verifiedSkaterAppearances"],expected["gp"])
        self.assertEqual(d["coverage"]["seasonTotals"],expected)
        self.assertEqual(d["coverage"]["eligiblePlayerWindows"],
                         {str(n):sum(p["gp"]>=n for p in self.actual["players"])
                          for n in (3,5,10)})
        # Preserve the independently audited initial five-game baseline.
        if self.actual["teamGP"]==5:
            self.assertEqual(expected,{"gp":67,"g":12,"a":19,"pts":31})
            self.assertEqual(d["coverage"]["eligiblePlayerWindows"],
                             {"3":13,"5":6,"10":0})
        self.assertEqual(d,core.load(FEED),"Published feed must match source rebuild")
        self.assertEqual(d["asOf"],self.actual["asOf"])

    def test_named_players_have_explicit_zero_point_appearances(self):
        d=self.make()
        carosi=d["players"]["354060"]
        source=next(x for x in self.actual["players"] if x["name"]=="Carosi, Justin")
        self.assertEqual((carosi["gp"],carosi["g"],carosi["a"],carosi["pts"]),
                         tuple(source[k] for k in ("gp","g","a","pts")))
        self.assertTrue(any(g["pts"]==0 for g in carosi["games"]))
        self.assertTrue(all(g["appeared"] is True and g["verification"]==core.PROOF
                            and g["sourceUrl"].startswith("https://www.htosports.com")
                            for g in carosi["games"]))
        self.assertEqual(d["coverage"]["zeroGoalGamesWithoutScoringColumns"],1)
        saindon=next(x for x in self.actual["players"] if x["name"]=="Saindon, Stephane")
        self.assertEqual(len(d["players"]["738846"]["games"]),saindon["gp"])

    def test_current_official_player_without_career_archive_gets_no_invented_baseline(self):
        d=self.make()
        unknown=d["players"]["847926"]
        self.assertEqual(unknown["name"],"Unknown, Johnny")
        official=next(x for x in self.actual["players"] if x["name"]=="Unknown, Johnny")
        self.assertEqual(unknown["gp"],official["gp"])
        self.assertNotIn("careerRate",unknown)
        if "847926" not in self.career["players"]:
            self.assertFalse(unknown.get("historicalCareerVerified",False))

    def test_missing_one_game_or_duplicate_game_holds(self):
        evidence=copy.deepcopy(self.evidence)
        evidence["games"].pop()
        with self.assertRaisesRegex(ValueError,"INCOMPLETE_BOX_SCORE_READBACK"):
            self.make(evidence=evidence)
        index=copy.deepcopy(self.index)
        index["seasons"][0]["boxscoreURLs"][1]=index["seasons"][0]["boxscoreURLs"][0]
        with self.assertRaisesRegex(ValueError,"DUPLICATE_GAME|INCOMPLETE_GAME_INDEX"):
            self.make(index=index)

    def test_missing_individual_explicit_appearance_holds(self):
        evidence=copy.deepcopy(self.evidence)
        table=next(t for t in evidence["games"][1]["tables"]
                   if "POS" in t["rows"][0]["cells"])
        table["rows"].pop(2)
        with self.assertRaisesRegex(ValueError,"GAME_GOALS|SEASON_GP_G_A_PTS_MISMATCH|COMPLETE_SEASON"):
            self.make(evidence=evidence)

    def test_nonzero_team_goal_does_not_infer_missing_stats(self):
        evidence=copy.deepcopy(self.evidence)
        table=next(t for t in evidence["games"][1]["tables"]
                   if "POS" in t["rows"][0]["cells"])
        header=table["rows"][0]["cells"]
        for field in ("G","A","Pts"):
            index=header.index(field)
            for row in table["rows"]:
                row["cells"].pop(index)
            header=table["rows"][0]["cells"]
        with self.assertRaisesRegex(ValueError,"MISSING_NONZERO_GAME_SCORING_COLS"):
            self.make(evidence=evidence)

    def test_tampered_player_stats_hold_without_updating_originals(self):
        evidence=copy.deepcopy(self.evidence)
        game=next(g for g in evidence["games"]
                  if any("Pts" in t["rows"][0]["cells"] and
                         "POS" in t["rows"][0]["cells"] for t in g["tables"]))
        table=next(t for t in game["tables"]
                   if "POS" in t["rows"][0]["cells"] and
                      "Pts" in t["rows"][0]["cells"])
        header=table["rows"][0]["cells"]
        row=next(r for r in table["rows"][1:] if r["players"])
        row["cells"][header.index("Pts")]="999"
        with self.assertRaisesRegex(ValueError,"PLAYER_GAME_POINTS_PARITY|TEAM_GOALS|SEASON_GP"):
            self.make(evidence=evidence)
        actual=copy.deepcopy(self.actual)
        actual["players"][0]["gp"]+=1
        with self.assertRaisesRegex(ValueError,"SEASON_GP_G_A_PTS_MISMATCH"):
            self.make(actual=actual)

    def test_foreign_identity_wrong_season_and_unverified_readback_hold(self):
        evidence=copy.deepcopy(self.evidence)
        evidence["games"][0]["url"]="https://example.com/teams/default.asp?p=boxscore"
        with self.assertRaisesRegex(ValueError,"SOURCE_URL_AUTHORITY_INVALID"):
            self.make(evidence=evidence)
        actual=copy.deepcopy(self.actual);actual["season"]="S2026"
        with self.assertRaisesRegex(ValueError,"SEASON_CODE_INVALID"):
            self.make(actual=actual)
        evidence=copy.deepcopy(self.evidence)
        evidence["sourceAuthority"]="UNVERIFIED"
        with self.assertRaisesRegex(ValueError,"BOX_SCORE_EVIDENCE_UNVERIFIED"):
            self.make(evidence=evidence)

    def test_builder_has_no_source_writes_and_is_deterministic(self):
        tracked=[EVIDENCE,INDEX,ACTUAL,CAREER]
        old=[hashlib.sha256(f.read_bytes()).hexdigest() for f in tracked]
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/"verified.json"
            core.run(["--write","--output",str(p)])
            core.run(["--check","--output",str(p)])
            self.assertEqual(core.load(p),self.make())
        self.assertEqual(old,[hashlib.sha256(f.read_bytes()).hexdigest()
                              for f in tracked])


if __name__=="__main__":
    unittest.main()
