import importlib.util
import unittest
from pathlib import Path

path=Path(__file__).resolve().parents[1]/"scripts"/"workflow_health_watch.py"
spec=importlib.util.spec_from_file_location("workflow_health_watch",path)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
REPO="adambrutto-maker/brave-hc"

def event(result="success",id=777,branch="main",repo=REPO):
    return {"workflow_run":{"id":id,"name":mod.TARGET,"status":"completed",
                            "conclusion":result,"head_branch":branch,
                            "head_repository":{"full_name":repo}}}

class WorkflowHealthTests(unittest.TestCase):
    def test_latest_success_closes_failure_issue(self):
        self.assertEqual(mod.decision(event(),{"id":777},REPO)["action"],"CLOSE")

    def test_latest_failure_creates_review_issue(self):
        d=mod.decision(event("failure"),{"id":777},REPO)
        self.assertEqual(d["action"],"OPEN")
        self.assertIn("/actions/runs/777",d["body"])
        self.assertIn("No automatic edits",d["body"])

    def test_latest_cancellation_and_timeout_are_actionable(self):
        for state in ("cancelled","timed_out","stale","startup_failure"):
            self.assertEqual(mod.decision(event(state),{"id":777},REPO)["action"],"OPEN")

    def test_old_failure_is_ignored(self):
        self.assertEqual(mod.decision(event("failure",777),{"id":778},REPO)["action"],"IGNORE")

    def test_untrusted_repository_cannot_trigger_issue(self):
        self.assertEqual(mod.decision(event("failure",repo="outsider/example"),{"id":777},REPO)["action"],"IGNORE")

    def test_wrong_branch_cannot_trigger(self):
        self.assertEqual(mod.decision(event("failure",branch="experiments"),{"id":777},REPO)["action"],"IGNORE")

    def test_in_progress_run_not_misreported_as_failure(self):
        e=event("failure")
        e["workflow_run"]["status"]="in_progress"
        self.assertEqual(mod.decision(e,{"id":777},REPO)["action"],"IGNORE")

if __name__=="__main__":
    unittest.main(verbosity=2)
