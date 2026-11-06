"""ENG59 source-only HTO game evidence correction hold and adversarial QA."""
from pathlib import Path
from hashlib import sha256
import copy,json,sys,unittest,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_eng59_hto_scoring_revision import evaluate,SourceRevisionHold
E=ROOT/"docs/hto-highlights-rollout/game-audit-evidence/live_boxscores.json"
I=ROOT/"docs/hto-highlights-rollout/261020_Historical_Boxscore_Index.json"
H=ROOT/"widgets/player-actuals-hourly.json"
def data():return tuple(json.loads(p.read_text(encoding="utf-8")) for p in (E,I,H))
class CurrentHTORevisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence,cls.index,cls.hourly=data()
    def evaluate(self,ev=None,idx=None,hour=None):
        return evaluate(ev if ev is not None else self.evidence,
                        idx if idx is not None else self.index,
                        hour if hour is not None else self.hourly)
    def test_exact_source_observation_is_held_not_implicitly_published(self):
        x=self.evaluate()
        expected=("OFFICIAL_GAME_SNAPSHOT_PLAYER_CORRECTIONS_HELD_SOURCE_OWNER_REVIEW"
                  if x["changedPlayers"] else
                  "PUBLISHED_PLAYER_TOTALS_MATCH_SNAPSHOT_RELEASE_REFRESH_STILL_REQUIRED")
        self.assertEqual(x["status"],expected)
        self.assertEqual(x["sourceGames"],len(self.evidence["games"]))
        self.assertEqual(x["sourcePlayers"],len(self.hourly["players"]))
        self.assertGreater(x["verifiedAppearances"],0)
        self.assertEqual((x["observedTeamGF"],x["observedTeamGA"]),
                         (self.hourly["teamGF"],self.hourly["teamGA"]))
        self.assertEqual(x["nonMonotonicPlayers"],sum(v["nonMonotonic"] for v in x["playerDifferences"]))
        self.assertTrue(set(x["sourceGamePeriodLayouts"]) <= {4,6})
        self.assertEqual(len(x["playerDifferences"]),x["changedPlayers"])
        self.assertEqual(len(set(x["sourceGameIDs"])),x["sourceGames"])
        self.assertFalse(x["currentAtProductionReleaseVerified"])
        self.assertFalse(x["sourceOwnerApproved"])
        self.assertFalse(x["productionAuthorized"])
    def test_snapshot_equal_player_values_still_cannot_self_approve_release(self):
        current=copy.deepcopy(self.hourly)
        x=self.evaluate()
        by_name={p["name"]:p for p in current["players"]}
        for delta in x["playerDifferences"]:
            for key,value in delta["sourceObserved"].items():
                by_name[delta["name"]][key]=value
        current["teamAssists"]=x["observedSkaterAssists"]
        current["teamPlayerPoints"]=x["observedSkaterPoints"]
        result=self.evaluate(hour=current)
        self.assertEqual(result["changedPlayers"],0)
        self.assertEqual(result["status"],"PUBLISHED_PLAYER_TOTALS_MATCH_SNAPSHOT_RELEASE_REFRESH_STILL_REQUIRED")
        self.assertFalse(result["currentAtProductionReleaseVerified"])
        self.assertFalse(result["productionAuthorized"])
    def test_malformed_period_headers_and_nonzero_goal_period_sums_fail(self):
        ev=copy.deepcopy(self.evidence)
        ev["games"][-1]["heading"]=ev["games"][-1]["heading"].replace(
             "\t1\t2\t3\tF","\t1\t2\t3\tSO\tF",1)
        with self.assertRaisesRegex(SourceRevisionHold,"SCOREBOARD_PERIOD_HEADER_NOT_OFFICIAL"):
            self.evaluate(ev=ev)
        ev=copy.deepcopy(self.evidence)
        ev["games"][-1]["heading"]=ev["games"][-1]["heading"].replace(
             "3\t0\t3\t6","3\t0\t3\t7",1)
        with self.assertRaisesRegex(SourceRevisionHold,"SCOREBOARD_PERIOD_FINAL_SCORE_MISMATCH"):
            self.evaluate(ev=ev)
    def test_wrong_game_ids_and_partial_scope_fail_not_soft_match(self):
        ev=copy.deepcopy(self.evidence)
        ev["games"][1]["url"]=ev["games"][0]["url"]
        with self.assertRaisesRegex(SourceRevisionHold,"GAME_SOURCE_ID_OR_SEASON_UNVERIFIED"):
            self.evaluate(ev=ev)
        ev=copy.deepcopy(self.evidence)
        ev["sourceAuthority"]="ASSUMED_FROM_TEAM_NAME"
        with self.assertRaisesRegex(SourceRevisionHold,"BOX_SCORE_SNAPSHOT_UNQUALIFIED"):
            self.evaluate(ev=ev)
        bad=copy.deepcopy(self.hourly)
        bad["sourceUrl"]="https://unrelated.example/stats"
        with self.assertRaisesRegex(SourceRevisionHold,"ORIGINAL_PUBLISHED_HTO_FEED_UNQUALIFIED"):
            self.evaluate(hour=bad)
    def test_game_player_total_forgery_fails_before_any_scoring_admission(self):
        ev=copy.deepcopy(self.evidence)
        g=next(g for g in ev["games"] if any(
            "Pts" in t["rows"][0]["cells"] for t in g["tables"]))
        table=next(t for t in g["tables"] if "Pts" in t["rows"][0]["cells"])
        headers=table["rows"][0]["cells"]
        row=next(r for r in table["rows"][1:] if r.get("players"))
        row["cells"][headers.index("Pts")]="99"
        with self.assertRaisesRegex(SourceRevisionHold,"INDIVIDUAL_GAME_GOAL_ASSIST_POINTS_MISMATCH"):
            self.evaluate(ev=ev)
    def test_original_source_files_untouched_and_require_parity_holds(self):
        before={p:sha256(p.read_bytes()).hexdigest() for p in (E,I,H)}
        with tempfile.TemporaryDirectory() as tmp:
            cmd=[sys.executable,"-B",str(ROOT/"scripts/check_eng59_hto_scoring_revision.py"),
                 "--repo",str(ROOT),"--require-no-differences"]
            run=subprocess.run(cmd,capture_output=True,text=True)
            expected_exit=2 if self.evaluate()["changedPlayers"] else 0
            self.assertEqual(run.returncode,expected_exit,run.stdout+run.stderr)
            self.assertIn(self.evaluate()["status"],run.stdout)
            receipt=Path(tmp)/"private_readonly.json"
            ok=subprocess.run([sys.executable,"-B",
                   str(ROOT/"scripts/check_eng59_hto_scoring_revision.py"),
                   "--repo",str(ROOT),"--report",str(receipt)],capture_output=True,text=True)
            self.assertEqual(ok.returncode,0,ok.stdout+ok.stderr)
            self.assertEqual(json.loads(receipt.read_text())["changedPlayers"],
                             self.evaluate()["changedPlayers"])
        self.assertEqual(before,{p:sha256(p.read_bytes()).hexdigest() for p in (E,I,H)})
if __name__=="__main__":unittest.main()
