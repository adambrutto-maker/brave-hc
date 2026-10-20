"""Synthetic tests for interpreting intentionally skipped goalie browser QA checks."""
import importlib.util
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

source=Path(__file__).resolve().parents[1]/"scripts"/"widget_smoke_health.py"
spec=importlib.util.spec_from_file_location("widget_smoke_health",source)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NOW=datetime(2026,10,20,15,0,tzinfo=timezone.utc)
REPO="adambrutto-maker/brave-hc"

def case(result,identifier,hours=1,event="workflow_run"):
    return dict(id=identifier,name=module.TARGET,status="completed",
                conclusion=result,event=event,head_branch="main",
                head_repository={"full_name":REPO},
                created_at=(NOW-timedelta(hours=hours)).isoformat())

class ExpectedSkipTests(unittest.TestCase):
    def test_expected_skip_after_success_is_healthy(self):
        skipped=case("skipped",102)
        green=case("success",101,2,event="workflow_dispatch")
        self.assertEqual(module.latest_completed([skipped,green])["id"],101)
        self.assertEqual(module.decision({"workflow_run":skipped},[skipped,green],REPO,NOW)["action"],"CLOSE")

    def test_skip_after_real_failure_still_requires_review(self):
        skipped=case("skipped",102)
        failed=case("failure",101,2,event="workflow_dispatch")
        self.assertEqual(module.decision({},[skipped,failed],REPO,NOW)["action"],"OPEN")

    def test_skipped_scheduled_check_is_not_exempt(self):
        skip=case("skipped",102,event="schedule")
        self.assertFalse(module.intentionally_skipped(skip))
        self.assertEqual(module.decision({},[skip],REPO,NOW)["action"],"OPEN")

    def test_old_success_not_made_fresh_by_skip(self):
        skip=case("skipped",102)
        old=case("success",101,40,event="workflow_dispatch")
        self.assertEqual(module.decision({},[skip,old],REPO,NOW)["action"],"OPEN")

if __name__=="__main__":
    unittest.main(verbosity=2)
