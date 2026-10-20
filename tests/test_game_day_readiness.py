import importlib.util
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

script=Path(__file__).resolve().parents[1]/"scripts"/"game_day_readiness.py"
spec=importlib.util.spec_from_file_location("game_day_readiness",script)
g=importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

NOW=datetime(2026,10,24,15,0,tzinfo=ZoneInfo("America/Toronto"))
GAME={"date":"2026-10-25","time":"18:15","opponent":"Big Bastones","rink":"A Rink",
      "assignmentKey":"hto:3375682","htoGameId":"3375682","htoSyncStatus":"MATCH",
      "fixtureSignature":"2026-10-25|18:15|Big Bastones|A Rink|home",
      "requiresGoalieReconfirmation":False}
FEED={"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),"games":[GAME],
      "missingFixtureReviews":[]}
SAVED={"schema":"brave-hc-goalie-assignments/v1",
       "assignments":{"hto:3375682":"Stephen Logue"}}

class NextGameTests(unittest.TestCase):
    def test_confirmed_goalie_and_harmonized_hto_ready(self):
        res=g.examine(deepcopy(FEED),deepcopy(SAVED),NOW)
        self.assertEqual(res["status"],"READY")

    def test_tbd_starter_requires_review(self):
        data=deepcopy(SAVED);data["assignments"]["hto:3375682"]="TBD"
        result=g.examine(deepcopy(FEED),data,NOW)
        self.assertEqual(result["status"],"REVIEW")
        self.assertIn("No goaltender",result["reason"])
        body=g.issue_body(result)
        self.assertIn("No players were contacted",body)
        self.assertIn("Big Bastones",body)

    def test_hto_mismatch_requires_review_even_with_confirmed_goalie(self):
        feed=deepcopy(FEED);feed["games"][0]["htoSyncStatus"]="REVIEW_RESCHEDULE"
        self.assertEqual(g.examine(feed,deepcopy(SAVED),NOW)["status"],"REVIEW")

    def test_rescheduled_goalie_requires_reconfirmation(self):
        feed=deepcopy(FEED);feed["games"][0]["requiresGoalieReconfirmation"]=True
        self.assertEqual(g.examine(feed,deepcopy(SAVED),NOW)["status"],"REVIEW")
        data=deepcopy(SAVED)
        data["scheduleConfirmations"]={"hto:3375682":GAME["fixtureSignature"]}
        self.assertEqual(g.examine(feed,data,NOW)["status"],"READY")

    def test_not_due_yet(self):
        date=NOW-timedelta(hours=80)
        earlier=deepcopy(FEED)
        earlier["checkedAt"]=date.isoformat()
        self.assertEqual(g.examine(earlier,deepcopy(SAVED),date)["status"],"NOT_DUE")

    def test_14_day_coverage_finds_second_game_while_first_booked(self):
        now=datetime(2026,10,20,12,0,tzinfo=ZoneInfo("America/Toronto"))
        feed=deepcopy(FEED)
        feed["checkedAt"]=now.isoformat()
        next_week={**GAME,"date":"2026-11-01","time":"20:15",
                   "opponent":"Mid Ice Crisis","rink":"D Rink",
                   "assignmentKey":"hto:3375683","htoGameId":"3375683",
                   "fixtureSignature":"2026-11-01|20:15|Mid Ice Crisis|D Rink|away"}
        feed["games"].append(next_week)
        result=g.examine(feed,deepcopy(SAVED),now)
        self.assertEqual(result["status"],"REVIEW")
        self.assertEqual(result["priority"],"ADVANCE_COVERAGE")
        self.assertEqual(result["game"]["opponent"],"Mid Ice Crisis")
        self.assertEqual(result["goalie"],"TBD")
        self.assertIn("ADVANCE_COVERAGE",g.issue_body(result))
        self.assertIn("No players were contacted",g.issue_body(result))

    def test_future_gap_outside_14_day_window_is_not_premature(self):
        now=datetime(2026,10,20,12,0,tzinfo=ZoneInfo("America/Toronto"))
        feed=deepcopy(FEED)
        feed["checkedAt"]=now.isoformat()
        feed["games"].append({**GAME,"date":"2026-11-08","time":"21:15",
                              "opponent":"Other Way","assignmentKey":"hto:3375684",
                              "fixtureSignature":"2026-11-08|21:15|Other Way|D Rink|home"})
        result=g.examine(feed,deepcopy(SAVED),now)
        self.assertEqual(result["status"],"NOT_DUE")

    def test_booking_next_week_closes_advance_coverage_gap(self):
        now=datetime(2026,10,20,12,0,tzinfo=ZoneInfo("America/Toronto"))
        feed=deepcopy(FEED)
        feed["checkedAt"]=now.isoformat()
        other={**GAME,"date":"2026-11-01","opponent":"Mid Ice Crisis",
               "assignmentKey":"hto:3375683",
               "fixtureSignature":"2026-11-01|20:15|Mid Ice Crisis|D Rink|away"}
        feed["games"].append(other)
        with_unbooked=g.examine(feed,deepcopy(SAVED),now)
        self.assertEqual(with_unbooked["status"],"REVIEW")
        saved=deepcopy(SAVED)
        saved["assignments"]["hto:3375683"]="Dev Leong"
        after=g.examine(feed,saved,now)
        self.assertEqual(after["status"],"NOT_DUE")

    def test_urgent_unassigned_next_game_outranks_advance_coverage(self):
        now=datetime(2026,10,24,15,0,tzinfo=ZoneInfo("America/Toronto"))
        feed=deepcopy(FEED)
        feed["checkedAt"]=now.isoformat()
        feed["games"].append({**GAME,"date":"2026-11-01",
                               "opponent":"Mid Ice Crisis","assignmentKey":"hto:3375683"})
        saved=deepcopy(SAVED)
        saved["assignments"]["hto:3375682"]="TBD"
        result=g.examine(feed,saved,now)
        self.assertEqual(result["status"],"REVIEW")
        self.assertEqual(result["priority"],"GAME_DAY")
        self.assertEqual(result["game"]["opponent"],"Big Bastones")

    def test_expired_provider_data_fails_closed(self):
        feed=deepcopy(FEED)
        feed["checkedAt"]=(NOW-timedelta(hours=25)).isoformat()
        with self.assertRaisesRegex(ValueError,"not freshly verified"):
            g.examine(feed,deepcopy(SAVED),NOW)

    def test_missing_svhl_game_creates_review_without_auto_cancellation(self):
        feed=deepcopy(FEED);feed["missingFixtureReviews"]=[{"date":"2026-10-25","opponent":"Big Bastones"}]
        result=g.examine(feed,deepcopy(SAVED),NOW)
        self.assertEqual(result["status"],"REVIEW")
        self.assertIn("No HTO changes",g.issue_body(result))

    def test_after_game_ignore_completed_game(self):
        when=datetime(2026,10,26,3,0,tzinfo=ZoneInfo("America/Toronto"))
        feed=deepcopy(FEED);feed["checkedAt"]=when.isoformat()
        self.assertEqual(g.examine(feed,deepcopy(SAVED),when)["status"],"NONE")

if __name__=="__main__":
    unittest.main(verbosity=2)
