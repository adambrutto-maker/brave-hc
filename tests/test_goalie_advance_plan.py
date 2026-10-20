import importlib.util
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/"scripts"))
from goalie_advance_plan import plan,stage,CURRENT_REGULARS

TZ=ZoneInfo("America/Toronto")
NOW=datetime(2026,10,20,12,0,tzinfo=TZ)
GAME={"date":"2026-11-01","time":"20:15","opponent":"Mid Ice Crisis",
      "rink":"D Rink","side":"away","assignmentKey":"hto:3375683",
      "fixtureSignature":"2026-11-01|20:15|Mid Ice Crisis|D Rink|away",
      "htoSyncStatus":"MATCH","requiresGoalieReconfirmation":False}
SAVED={"schema":"brave-hc-goalie-assignments/v1","assignments":{"hto:3375683":"TBD"}}
FEED={"schema":"brave-hc-svhl-schedule/v1","games":[GAME],"missingFixtureReviews":[]}

def at_distance(days=0,hours=0):
    return datetime(2026,11,1,20,15,tzinfo=TZ)-timedelta(days=days,hours=hours)

class GoalieAdvancePlanningTests(unittest.TestCase):
    def test_regular_outreach_is_only_a_suggestion(self):
        result=plan(deepcopy(FEED),deepcopy(SAVED),NOW)
        self.assertEqual(result["regular_goalie_candidates"],["Dev Leong","Stephen Logue"])
        self.assertEqual(result["games"][0]["stage"],"REGULAR_FIRST")
        self.assertEqual(result["games"][0]["recorded_goalie"],"TBD")
        self.assertFalse(result["games"][0]["contacted_by_this_plan"])
        self.assertFalse(result["games"][0]["confirmed_by_this_plan"])
        self.assertTrue(result["no_outbound"])

    def test_backup_begins_seven_days_prior(self):
        before=stage(GAME,SAVED,at_distance(days=7,hours=1))
        now=stage(GAME,SAVED,at_distance(days=7))
        self.assertEqual(before["stage"],"REGULAR_FIRST")
        self.assertEqual(now["stage"],"RENTAL_BACKUP")

    def test_three_day_and_game_day_escalations(self):
        self.assertEqual(stage(GAME,SAVED,at_distance(hours=73))["stage"],"RENTAL_BACKUP")
        self.assertEqual(stage(GAME,SAVED,at_distance(hours=72))["stage"],"RENTAL_PRIORITY")
        self.assertEqual(stage(GAME,SAVED,at_distance(hours=36))["stage"],"GAME_DAY")

    def test_booked_primary_clears_rental_flag(self):
        stored=deepcopy(SAVED)
        stored["assignments"][GAME["assignmentKey"]]="Dev Leong"
        for day in [19,7,1]:
            self.assertEqual(stage(GAME,stored,at_distance(days=day))["stage"],"COVERED")

    def test_booked_rental_also_clears_rental_flag(self):
        stored=deepcopy(SAVED)
        stored["assignments"][GAME["assignmentKey"]]="Adam Carlyle"
        self.assertEqual(stage(GAME,stored,at_distance(days=1))["stage"],"COVERED")

    def test_rescheduled_booking_requires_reconfirmation(self):
        stored=deepcopy(SAVED)
        stored["assignments"][GAME["assignmentKey"]]="Stephen Logue"
        moved=deepcopy(GAME)
        moved["requiresGoalieReconfirmation"]=True
        self.assertEqual(stage(moved,stored,at_distance(days=3))["stage"],"LEAGUE_RECONFIRM")
        stored["scheduleConfirmations"]={GAME["assignmentKey"]:GAME["fixtureSignature"]}
        self.assertEqual(stage(moved,stored,at_distance(days=3))["stage"],"COVERED")

    def test_hto_conflict_blocks_clean_coverage(self):
        broken=deepcopy(GAME)
        broken["htoSyncStatus"]="REVIEW_RESCHEDULE"
        self.assertEqual(stage(broken,SAVED,NOW)["stage"],"HTO_REVIEW")

    def test_21_day_window_does_not_carry_prior_game(self):
        old=deepcopy(GAME)
        old["date"]="2026-10-18"
        old["assignmentKey"]="hto:3375000"
        far=deepcopy(GAME)
        far["date"]="2026-11-22"
        far["assignmentKey"]="hto:3375686"
        feed=deepcopy(FEED)
        feed["games"]=[old,GAME,far]
        results=plan(feed,SAVED,NOW)
        self.assertEqual([g["opponent"] for g in results["games"]],["Mid Ice Crisis"])

    def test_distant_game_is_lookahead_not_active_outreach(self):
        later=deepcopy(GAME)
        later["date"]="2026-11-22"
        later["assignmentKey"]="hto:3375686"
        self.assertEqual(stage(later,SAVED,NOW)["stage"],"LOOKAHEAD")

    def test_missing_league_games_stop_plan(self):
        feed=deepcopy(FEED)
        feed["missingFixtureReviews"]=[{"opponent":"Test Fixture"}]
        result=plan(feed,SAVED,NOW)
        self.assertEqual(result["status"],"HOLD_MISSING_LEAGUE_FIXTURES")
        self.assertFalse(result["games"])

    def test_no_contact_or_approval_capability(self):
        result=plan(FEED,SAVED,NOW)
        self.assertTrue(result["goalies_not_automatically_selected"])
        self.assertTrue(result["no_outbound"])
        self.assertTrue(all(g["contacted_by_this_plan"] is False for g in result["games"]))

if __name__=="__main__":
    unittest.main(verbosity=2)
