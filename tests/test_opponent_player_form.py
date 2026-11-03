"""HockeyOS source-backed opponent recent form and defensive watch safeguards."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import opponent_player_form as form

class FormSourceQA(unittest.TestCase):
    def setUp(self):
        self.old={"playerId":1234,"name":"Player, Example",
                  "statStatus":"PUBLISHED_ARITHMETICALLY_CONSISTENT",
                  "gp":4,"g":2,"a":1,"pts":3,"pim":0}
        self.now=deepcopy(self.old)
        self.prev="2026-10-27T04:08:28+00:00"
        self.current="2026-11-03T15:47:17+00:00"
        self.history=[{"leagueId":547,"season":"Sunday Winter 2025/26",
              "teamName":"Sample Opponent","sourceStatus":"PUBLISHED_ARITHMETICALLY_CONSISTENT",
              "nameMatch":True,"gp":20,"g":8,"a":8,"pts":16}]
    def observation(self):
        return {"player":self.old,"previousAsOf":self.prev,
                "currentAsOf":self.current}
    def test_no_previous_week_never_invents_a_streak(self):
        r=form.analyze(self.now,self.history)
        self.assertEqual(r["recentForm"]["state"],
                         "NO_PRIOR_WEEKLY_PLAYER_SNAPSHOT")
        self.assertFalse(r["recentForm"]["verifiedHotStreak"])
        self.assertIsNone(r["gameNight"]["namedBravesAssignment"])
    def test_single_burst_is_watch_not_a_verified_hot_streak(self):
        self.now.update(gp=5,g=3,a=2,pts=5)
        r=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(r["recentForm"]["state"],
                         "ONE_GAME_SCORING_SURGE_WATCH")
        self.assertFalse(r["recentForm"]["verifiedHotStreak"])
        self.assertEqual(r["recentForm"]["newReportedGP"],1)
    def test_single_quiet_game_not_called_cold(self):
        self.old.update(gp=4,g=3,a=2,pts=5)
        self.now=deepcopy(self.old);self.now["gp"]=5
        r=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(r["recentForm"]["state"],
                         "ONE_QUIET_GAME_NOT_A_COLD_STREAK")
    def test_two_reported_games_can_show_multi_game_hot(self):
        self.now.update(gp=6,g=4,a=2,pts=6)
        r=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(r["recentForm"]["state"],
                         "HOT_MULTIGAME_SOURCE_TREND")
        self.assertFalse(r["recentForm"]["verifiedHotStreak"])
        self.assertTrue(r["recentForm"]["multiGameCumulativeWindow"])
        self.assertTrue(r["recentForm"]["notIndividualGameScoringEventProof"])
    def test_cooling_requires_multiple_new_games_and_prior_rate(self):
        self.old.update(gp=4,g=2,a=2,pts=4)
        self.now=deepcopy(self.old);self.now["gp"]=6
        r=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(r["recentForm"]["state"],
                         "COOLING_MULTIGAME_SOURCE_TREND")
    def test_goals_drop_is_source_correction_hold(self):
        self.now.update(gp=5,g=1,a=1,pts=2)
        r=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(r["recentForm"]["state"],
                         "SOURCE_CORRECTION_OR_REGRESSION_HOLD")
        self.assertFalse(r["recentForm"]["verifiedHotStreak"])
    def test_changed_official_id_name_is_not_automatically_linked(self):
        self.now.update(gp=5,g=3,a=1,pts=4,name="Different, Person")
        self.assertEqual(form.analyze(self.now,self.history,
                         self.observation())["recentForm"]["state"],
                         "PLAYER_ID_OR_STAT_SOURCE_HOLD")
    def test_current_year_vs_prior_is_separate_from_weekly_form(self):
        self.now.update(gp=5,g=6,a=2,pts=8)
        result=form.analyze(self.now,self.history,self.observation())
        self.assertEqual(result["seasonPace"]["state"],
                         "SEASON_PACE_ABOVE_PRIOR")
        self.assertNotEqual(result["recentForm"]["state"],
                            result["seasonPace"]["state"])
    def test_ambiguous_two_teams_in_one_prior_season_not_summed(self):
        self.history.append({**self.history[0],"teamName":"New Team","gp":5,
                            "pts":4,"g":2,"a":2})
        self.assertEqual(form.analyze(self.now,self.history)["seasonPace"]["state"],
                         "MULTIPLE_TEAMS_SAME_PRIOR_SEASON_HOLD")
    def test_source_pace_below_prior_when_material(self):
        self.now.update(gp=5,g=0,a=0,pts=0)
        self.assertEqual(form.analyze(self.now,self.history)["seasonPace"]["state"],
                         "SEASON_PACE_BELOW_PRIOR")
    def test_never_assign_brave_or_confirm_opponent_attendance(self):
        self.now.update(gp=5,g=6,a=2,pts=8)
        result=form.analyze(self.now,self.history,self.observation())
        game=result["gameNight"]
        self.assertEqual(game["priority"],"SPECIAL_DEFENSIVE_ATTENTION_REVIEW")
        self.assertEqual(game["status"],"PROPOSED_COACH_REVIEW_ONLY")
        self.assertEqual(game["opponentDressed"],"UNVERIFIED")
        self.assertEqual(game["bravesLineupAndRole"],"UNVERIFIED")
        self.assertIsNone(game["namedBravesAssignment"])
        self.assertFalse(game["coachApproved"])
    def test_one_old_source_week_is_rejected_as_recent(self):
        r=self.observation()
        r["previousAsOf"]="2026-09-01T00:00:00+00:00"
        with self.assertRaisesRegex(form.FormHold,
                                    "SAME_PLAYER_SNAPSHOT_TIME_INVALID"):
            form.analyze(self.now,self.history,r)
    def test_published_source_conflict_does_not_create_rank(self):
        self.now["statStatus"]="SOURCE_CONFLICT_HOLD"
        result=form.analyze(self.now,self.history,self.observation())
        self.assertFalse(result["sourceQualified"])
        self.assertEqual(result["gameNight"]["priority"],"HELD")
    def test_weekly_controller_prefers_real_two_week_window_for_sunday_league(self):
        from weekly_svhl_opponent_player_intelligence import prior_week_snapshot
        import tempfile
        source=json.loads((ROOT/"widgets"/"svhl-roster-intelligence.json").read_text("utf8"))
        current=deepcopy(source);current["asOf"]="2026-11-17T16:40:00+00:00"
        older=deepcopy(source);older["asOf"]="2026-11-03T15:40:00+00:00"
        near=deepcopy(source);near["asOf"]="2026-11-10T15:40:00+00:00"
        with tempfile.TemporaryDirectory() as temp:
            base=Path(temp)
            for folder,doc in (("r1103",older),("r1110",near)):
                loc=base/"runs"/folder;loc.mkdir(parents=True)
                (loc/"roster_source.json").write_text(json.dumps(doc),encoding="utf8")
            chosen,_=prior_week_snapshot(base,current)
            self.assertEqual(chosen["asOf"],older["asOf"])
    def test_live_form_source_counts_faithful_to_public_feed(self):
        doc=json.loads((ROOT/"widgets"/"opponent-player-intelligence.json").read_text("utf8"))
        self.assertEqual(doc["teamCount"],21)
        self.assertEqual(doc["sourceAuthority"]["braveHC"],"HTO_ONLY")
        self.assertFalse(doc["completePlayerGameAttendanceVerified"])
        players=[p for t in doc["teams"] for p in t["players"]]
        self.assertEqual(len(players),doc["playerCount"])
        self.assertEqual(doc["weeklyFormWindow"]["playersWithNewReportedGP"],
          sum((p["sourceForm"]["recentForm"].get("newReportedGP") or 0)>0
               for p in players))
        self.assertTrue(all(p["sourceForm"]["gameNight"]["namedBravesAssignment"] is None
                            for p in players))
if __name__=="__main__":
    unittest.main(verbosity=2)
