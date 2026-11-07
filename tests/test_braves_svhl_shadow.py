"""Shadow discrepancy QA: HTO actual authority, SVHL never promoted."""
from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import json
import sqlite3
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from track_brave_svhl_shadow import examine, write_db, ShadowHold

def load(name):
    return json.loads((ROOT / "widgets" / name).read_text("utf8"))

class BravesShadowQA(unittest.TestCase):
    def setUp(self):
        self.hto = load("player-actuals.json")
        self.svhl = load("svhl-roster-intelligence.json")
        self.league = load("league-intelligence.json")
        self.hashes = {k: c * 64 for k,c in
                       [("hto","a"),("svhl","b"),("league","c")]}
    def report(self):
        return examine(self.hto,self.svhl,self.league,self.hashes)
    def test_hto_is_authority_and_svhl_is_private_shadow(self):
        report=self.report()
        self.assertEqual(report["status"],"PRIVATE_DIFFERENCE_REVIEW_ONLY")
        self.assertEqual(report["sourcePolicy"]["BravePlayerActuals"],"HTO_AUTHORITATIVE")
        self.assertFalse(report["publicStatisticsPublicationAuthorized"])
        self.assertFalse(report["automaticHTOCorrectionAuthorized"])
        self.assertFalse(report["linkedToOpponentsPublicFeed"])
        self.assertEqual(report["sourceCounts"]["htoRows"],len(self.hto["players"]))
    def test_name_candidate_never_counts_as_confirmed_person(self):
        for row in self.report()["nameReviewCandidates"]:
            self.assertFalse(row["identityConfirmed"])
            self.assertIn("CANDIDATE",row["matchStatus"])
    def test_no_missing_stat_zero_or_hto_pim_fabricated(self):
        report=self.report()
        self.assertTrue(report["htoPIMUnavailableInThisFeed"])
        for m in report["nameReviewCandidates"]:
            self.assertEqual(set(m["hto"]),{"gp","g","a","pts"})
            self.assertIn("pim",m["svhl"])
            self.assertNotIn("pim",m.get("svhlMinusHto") or {})
    def test_inputs_remain_unchanged(self):
        original=deepcopy((self.hto,self.svhl,self.league))
        self.report()
        self.assertEqual((self.hto,self.svhl,self.league),original)
    def test_status_change_held(self):
        self.hto["status"]="USER_EDITED"
        with self.assertRaisesRegex(ShadowHold,"UNSUPPORTED_SOURCE_CONTRACT"):
            self.report()
    def test_changed_roster_division_held(self):
        next(x for x in self.svhl["teams"] if x["sourceTeamId"]==13679)["division"]="VAHL Division"
        with self.assertRaisesRegex(ShadowHold,"BRAVES_LEAGUE_SOURCE_OR_DIVISION_CHANGED"):
            self.report()
    def test_duplicate_hto_identity_held(self):
        self.hto["players"].append(deepcopy(self.hto["players"][0]))
        self.hto["playerCount"]+=1
        with self.assertRaisesRegex(ShadowHold,"HTO_IDENTITY_DUPLICATE_NAME"):
            self.report()
    def test_duplicate_svhl_player_id_held(self):
        brave=next(t for t in self.svhl["teams"] if t["sourceTeamId"]==13679)
        duplicate=deepcopy(brave["players"][0])
        duplicate["name"]="New Name, Different"
        brave["players"].append(duplicate);brave["rosterCount"]+=1
        with self.assertRaisesRegex(ShadowHold,"SVHL_BRAVES_PLAYER_OR_IDENTITY_INVALID"):
            self.report()
    def test_unmatched_sources_are_not_force_linked(self):
        report=self.report()
        known={x["svhlPlayerId"] for x in report["nameReviewCandidates"]}
        missing={x["playerId"] for x in report["unmatchedSVHL"]}
        self.assertFalse(missing & known)
        self.assertEqual(len(missing)+len(known),report["sourceCounts"]["svhlRows"])
    def test_sqlite_idempotence_and_append_only(self):
        report=self.report()
        with tempfile.TemporaryDirectory() as t:
            db=Path(t)/"svhl_opponent_players_test.sqlite"
            db.touch()
            first=write_db(db,report,self.hto,self.svhl)
            second=write_db(db,report,self.hto,self.svhl)
            self.assertEqual(first,second)
            self.assertEqual(first["sourceCaptures"],1)
            self.assertEqual(first["candidateComparisonRows"],
                report["sourceCounts"]["uniqueNameReviewCandidates"])
            self.hashes["hto"]="d"*64
            future=write_db(db,self.report(),self.hto,self.svhl)
            self.assertEqual(future["sourceCaptures"],2)
            with sqlite3.connect(db) as con:
                self.assertEqual(con.execute(
                  "select count(distinct identity_confirmed) from brave_shadow_name_review"
                ).fetchone()[0],1)
                self.assertEqual(con.execute(
                  "select max(identity_confirmed) from brave_shadow_name_review"
                ).fetchone()[0],0)
            con.close()  # Windows requires the SQLite handle closed before temp cleanup.
    def test_private_specialty_profile_capture_and_negative_gate(self):
        from track_brave_svhl_shadow import checked_specialty
        brave=next(t for t in self.svhl["teams"] if t["sourceTeamId"]==13679)
        reports=[]
        for p in brave["players"]:
            reports.append({
              "playerId":p["playerId"],"name":p["name"],"sourceUrl":p["profileUrl"],
              "sourceSHA256":"c"*64,"status":"PRIVATE_PROFILE_VERIFIED",
              "stats":{"GP":p["gp"],"G":p["g"],"A":p["a"],
                       "PTS":p["pts"],"PIM":p["pim"],
                       "ppGoals":0,"ppAssists":0,"pkGoals":0,"pkAssists":0,
                       "gameWinningGoals":0,"gameTyingGoals":0}})
        doc={"schema":"brave-hc-svhl-own-player-profiles-shadow/private-v1",
             "sourceRosterAsOf":self.svhl["asOf"],"asOf":"2026-11-03T16:00:00Z",
             "officialSVHLTeamId":13679,
             "htoIsAuthoritative":True,"publicPublicationAllowed":False,
             "profileRows":reports,"attempted":len(reports),
             "verified":len(reports),"held":0}
        self.assertEqual(len(checked_specialty(doc,self.svhl)),len(reports))
        with tempfile.TemporaryDirectory() as t:
            db=Path(t)/"svhl_opponent_players_test.sqlite";db.touch()
            stats=write_db(db,self.report(),self.hto,self.svhl,doc)
            self.assertEqual(stats["bravesPrivateSpecialtyRows"],len(reports))
        bad=deepcopy(doc)
        bad["profileRows"][0]["stats"]["ppGoals"] += 1
        bad["profileRows"][0]["stats"]["G"] = 0
        with self.assertRaisesRegex(ShadowHold,"BRAVES_PRIVATE_PROFILE_SOURCE_CONFLICT"):
            checked_specialty(bad,self.svhl)
    def test_original_database_path_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            db=Path(t)/"hockeyos.db"
            db.touch()
            with self.assertRaisesRegex(ShadowHold,"SHARED_DATABASE_OR_UNAUTHORIZED_TARGET"):
                write_db(db,self.report(),self.hto,self.svhl)

if __name__=="__main__":
    unittest.main(verbosity=2)
