import importlib.util
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

p=Path(__file__).resolve().parents[1]/"scripts"/"widget_smoke_health.py"
spec=importlib.util.spec_from_file_location("widget_smoke_health",p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

REPO="adambrutto-maker/brave-hc"
NOW=datetime(2026,10,20,15,0,tzinfo=timezone.utc)


def run(state="success",rid=100,age_hours=1,status="completed"):
    return {"id":rid,"name":m.TARGET,"status":status,"conclusion":state,
            "head_branch":"main","head_repository":{"full_name":REPO},
            "run_started_at":(NOW-timedelta(hours=age_hours)).isoformat(),
            "html_url":f"https://github.com/{REPO}/actions/runs/{rid}"}


class BrowserQAWatchdogTests(unittest.TestCase):
    def test_latest_fresh_success_closes_issue(self):
        verdict=m.decision({},[run()],REPO,NOW)
        self.assertEqual(verdict["action"],"CLOSE")

    def test_latest_failure_opens_review(self):
        verdict=m.decision({"workflow_run":run("failure")},[run("failure")],REPO,NOW)
        self.assertEqual(verdict["action"],"OPEN")
        self.assertIn("/actions/runs/100",verdict["body"])
        self.assertIn("No website edits",verdict["body"])

    def test_failed_or_skipped_runs_do_not_report_healthy(self):
        for state in m.FAILURES:
            self.assertEqual(m.decision({},[run(state)],REPO,NOW)["action"],"OPEN")

    def test_missing_run_opens_review(self):
        self.assertEqual(m.decision({},[],REPO,NOW)["action"],"OPEN")

    def test_old_success_not_fresh(self):
        verdict=m.decision({},[run("success",age_hours=37)],REPO,NOW)
        self.assertEqual(verdict["action"],"OPEN")
        self.assertIn("36 hours",verdict["reason"])

    def test_new_ongoing_run_does_not_hide_prior_failure(self):
        runs=[run("unknown",101,status="in_progress"),run("failure",100,2)]
        self.assertEqual(m.decision({},runs,REPO,NOW)["action"],"OPEN")

    def test_superseded_failure_event_ignored(self):
        earlier=run("failure",99,3)
        event={"workflow_run":earlier}
        runs=[run("success",100,1),earlier]
        self.assertEqual(m.decision(event,runs,REPO,NOW)["action"],"IGNORE")

    def test_untrusted_repo_ignored(self):
        event=run("failure")
        event["head_repository"]["full_name"]="other/repo"
        self.assertEqual(m.decision({"workflow_run":event},[run("failure")],REPO,NOW)["action"],"IGNORE")

    def test_nonmain_branch_ignored(self):
        event=run("failure")
        event["head_branch"]="experiment"
        self.assertEqual(m.decision({"workflow_run":event},[run("failure")],REPO,NOW)["action"],"IGNORE")

    def test_pending_event_ignored(self):
        event=run("failure")
        event["status"]="in_progress"
        self.assertEqual(m.decision({"workflow_run":event},[run("failure")],REPO,NOW)["action"],"IGNORE")


if __name__=="__main__":
    unittest.main(verbosity=2)
