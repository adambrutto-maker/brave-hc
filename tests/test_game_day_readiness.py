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
