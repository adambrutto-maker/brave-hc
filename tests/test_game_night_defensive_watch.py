"""Source-verified pregame defensive-watch packets: no automatic assignments."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_game_night_defensive_watch import build,GameNightHold

def read(file):
    return json.loads((ROOT/"widgets"/file).read_text("utf8"))

class GameNightQA(unittest.TestCase):
    def setUp(self):
        self.feed=read("opponent-player-intelligence.json")
        self.hto=read("countdown.json")
        self.svhl=read("svhl-upcoming.json")
        self.cutoff=datetime(2026,11,3,16,40,tzinfo=timezone.utc)
    def report(self):
        return build(self.feed,self.hto,self.svhl,now=self.cutoff)
    def test_official_fixture_and_4_person_defence_review(self):
        d=self.report()
        self.assertEqual(d["status"],"PRIVATE_COACH_REVIEW_PROPOSALS_ONLY")
        self.assertEqual(d["fixture"]["opponent"],"Other Way")
        self.assertEqual(d["fixture"]["htoGameId"],3375684)
        self.assertEqual(d["fixture"]["timeToronto"],"21:15")
        self.assertEqual(len(d["reviewTargets"]),4)
        self.assertFalse(d["anyNamedAssignmentsApproved"])
        self.assertFalse(d["opponentAttendanceConfirmed"])
        self.assertFalse(d["bravesAttendanceAndRolesConfirmed"])
        self.assertEqual(d["outboundMessages"],0)
    def test_source_links_attendance_and_roles_all_unconfirmed(self):
        for p in self.report()["reviewTargets"]:
            self.assertTrue(p["profileUrl"].startswith(
                "https://leagues.sportsvillage.ca/playerinfo.aspx"))
            self.assertFalse(p["opponentConfirmedDressed"])
            self.assertIsNone(p["bravePlayerAssigned"])
            self.assertFalse(p["coachApproved"])
            self.assertEqual(len(p["verificationNeeded"]),4)
    def test_wrong_htoid_is_held(self):
        self.hto["games"][0]["id"]+=1
        with self.assertRaisesRegex(GameNightHold,
                                    "SVHL_HTO_IDENTITY_NOT_MATCHED|FIXTURE_DATE_TIME"):
            self.report()
    def test_wrong_start_time_is_held(self):
        self.svhl["games"][0]["time"]="20:15"
        with self.assertRaisesRegex(GameNightHold,"FIXTURE_DATE_TIME"):
            self.report()
    def test_wrong_rink_is_held(self):
        self.svhl["games"][0]["rink"]="A Rink"
        with self.assertRaisesRegex(GameNightHold,"FIXTURE_DATE_TIME"):
            self.report()
    def test_wrong_opponent_is_held(self):
        self.svhl["games"][0]["opponent"]="Some New Team"
        with self.assertRaisesRegex(GameNightHold,"FIXTURE_DATE_TIME"):
            self.report()
    def test_unknown_source_league_is_held(self):
        self.feed["VAHLExcluded"]=False
        with self.assertRaisesRegex(GameNightHold,"SOURCE_QUALIFICATION_INVALID"):
            self.report()
    def test_named_brave_defender_cannot_be_published_as_verified(self):
        team=next(x for x in self.feed["teams"] if x["name"]=="Other Way")
        team["players"][0]["sourceForm"]["gameNight"]["namedBravesAssignment"]="Player"
        with self.assertRaisesRegex(GameNightHold,"UNAPPROVED_PLAYER_ASSIGNMENT"):
            self.report()
    def test_unverified_source_is_held_not_reported_as_ready(self):
        self.svhl["games"][0]["htoSyncStatus"]="REVIEW"
        with self.assertRaisesRegex(GameNightHold,"SVHL_HTO_IDENTITY_NOT_MATCHED"):
            self.report()
    def test_dated_fixture_requires_future_verified_game(self):
        after=datetime(2027,6,1,tzinfo=timezone.utc)
        with self.assertRaisesRegex(GameNightHold,"SCHEDULE_OR_PLAYER_SOURCE_STALE"):
            build(self.feed,self.hto,self.svhl,now=after)
    def test_output_is_deterministic_except_capture_timestamp(self):
        source=deepcopy(self.feed)
        a=self.report();b=self.report()
        a.pop("createdUTC");b.pop("createdUTC")
        self.assertEqual(a,b)
        self.assertEqual(self.feed,source)
if __name__=="__main__":
    unittest.main(verbosity=2)
