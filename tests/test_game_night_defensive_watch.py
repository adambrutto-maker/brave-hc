"""Fictional dated fixture QA; production game-day review uses live dual-source data.

All tested football-like assignments remain unconfirmed suggestions. Test
fixtures are constructed from the real, admitted league roster name solely to
exercise source-identity and safety gates without assuming a fixed next game.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from zoneinfo import ZoneInfo
from pathlib import Path
import json
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_game_night_defensive_watch import build,GameNightHold

def read(name):
    return json.loads((ROOT/"widgets"/name).read_text("utf8"))

class GameNightQA(unittest.TestCase):
    def setUp(self):
        self.feed=read("opponent-player-intelligence.json")
        self.team=next(t for t in self.feed["teams"] if
            t["division"]=="The Cristillo Division" and t["playerCount"]>0)
        now=datetime.fromisoformat(
            self.feed["capturedAt"].replace("Z","+00:00")).astimezone(
            timezone.utc)+timedelta(hours=2)
        self.cutoff=now
        future=(now.astimezone(ZoneInfo("America/Toronto"))+
                timedelta(days=5)).replace(hour=21,minute=15,second=0,microsecond=0)
        self.hto={
            "schema":"brave-hc-upcoming-countdown/v1","season":"W2026/27",
            "games":[{
               "id":888123,"opponent":self.team["name"],"homeAway":"Home",
               "rink":"Vaughan Sports Village - D Rink",
               "gameDate":future.date().isoformat(),
               "puckDrop":future.isoformat(),
               "eventURL":"https://www.htosports.com/teams/default.asp?gameID=888123"}]}
        self.svhl={
            "schema":"brave-hc-svhl-schedule/v1",
            "checkedAt":self.feed["capturedAt"],"missingFixtureReviews":[],
            "games":[{
              "htoGameId":"888123","assignmentKey":"hto:888123","htoSyncStatus":"MATCH",
              "opponent":self.team["name"],"date":future.date().isoformat(),
              "time":"21:15","rink":"D Rink","side":"home"}]}
    def report(self):
        return build(self.feed,self.hto,self.svhl,now=self.cutoff)
    def test_synthetic_source_identical_fixture_creates_only_coach_review(self):
        d=self.report()
        self.assertEqual(d["status"],"PRIVATE_COACH_REVIEW_PROPOSALS_ONLY")
        self.assertEqual(d["fixture"]["opponent"],self.team["name"])
        self.assertEqual(d["fixture"]["htoGameId"],888123)
        self.assertEqual(d["fixture"]["timeToronto"],"21:15")
        self.assertLessEqual(len(d["reviewTargets"]),4)
        self.assertGreater(d["allWatchCandidates"],0)
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
        with self.assertRaisesRegex(GameNightHold,"SVHL_HTO_IDENTITY_NOT_MATCHED"):
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
        self.team["players"][0]["sourceForm"]["gameNight"]["namedBravesAssignment"]="Player"
        with self.assertRaisesRegex(GameNightHold,"UNAPPROVED_PLAYER_ASSIGNMENT"):
            self.report()
    def test_unverified_schedule_match_is_held(self):
        self.svhl["games"][0]["htoSyncStatus"]="REVIEW"
        with self.assertRaisesRegex(GameNightHold,"SVHL_HTO_IDENTITY_NOT_MATCHED"):
            self.report()
    def test_missing_source_stale_returns_hold(self):
        after=self.cutoff+timedelta(days=40)
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
