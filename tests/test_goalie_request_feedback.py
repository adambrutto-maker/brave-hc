import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

base = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(base / "scripts"))

def load(name):
    spec=importlib.util.spec_from_file_location(name, base/"scripts"/(name+".py"))
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj

feedback=load("goalie_request_feedback")
approval=load("process_goalie_issue")
REPO="adambrutto-maker/brave-hc"
RUN="39443517688"


class FeedbackTests(unittest.TestCase):
    def test_rejected_fixture_has_actionable_refresh_instructions(self):
        msg=feedback.build_comment("STALE_FIXTURE","failure","skipped","skipped",REPO,RUN)
        self.assertIn("league game details changed",msg)
        self.assertIn("Goaltender Manager",msg)
        self.assertIn("/actions/runs/"+RUN,msg)
        self.assertIn("intentionally left open",msg)
        self.assertIn("not automatically retried",msg)

    def test_changed_goalie_warns_against_stale_request(self):
        msg=feedback.build_comment("STALE_GOALIE","failure","skipped","skipped",REPO,RUN)
        self.assertIn("saved goaltender changed",msg)

    def test_publish_failure_never_claims_unsaved_assignment(self):
        msg=feedback.build_comment("INVALID_REQUEST","success","failure","skipped",REPO,RUN)
        self.assertIn("may or may not have been published",msg)
        self.assertIn("Check the saved",msg)
        self.assertNotIn("has not saved",msg)

    def test_closure_failure_requires_state_review(self):
        msg=feedback.build_comment("INVALID_REQUEST","success","success","failure",REPO,RUN)
        self.assertIn("may or may not have been published",msg)

    def test_failed_readback_requires_independent_state_check(self):
        note=feedback.build_comment("INVALID_REQUEST","success","success","skipped",
                                    REPO,RUN,receipt="failure")
        self.assertIn("may or may not have been published",note)

    def test_unit_test_failure_reports_unverified_status_not_invalid_goalie(self):
        msg=feedback.build_comment("INVALID_REQUEST","skipped","skipped","skipped",REPO,RUN)
        self.assertIn("failed before it could verify",msg)

    def test_codes_from_actual_guard_messages(self):
        for raw,expected in [
            ("SVHL fixture changed since selection","STALE_FIXTURE"),
            ("Goalie assignment changed since selection","STALE_GOALIE"),
            ("SVHL verification is stale","STALE_FEED"),
            ("Cannot change goaltender for a completed game","GAME_COMPLETED"),
            ("Selected game key must uniquely match","UNKNOWN_GAME"),
            ("Other goalie requires a name","INVALID_GOALIE"),
            ("A repository-writing account is required","UNAUTHORIZED"),
        ]:
            with self.subTest(raw=raw):
                self.assertEqual(approval.rejection_code(ValueError(raw)),expected)

    def test_never_echo_untrusted_exception_or_status_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"result.json"
            approval.write_status(path,"STALE_FIXTURE")
            self.assertEqual(feedback.safe_status(path),"STALE_FIXTURE")
            path.write_text(json.dumps({"schema":feedback.SCHEMA,
                                         "code":"<script>invalid</script>",
                                         "secret":"very private"}),encoding="utf-8")
            self.assertEqual(feedback.safe_status(path),"INVALID_REQUEST")
            msg=feedback.build_comment(feedback.safe_status(path),"failure","skipped","skipped",REPO,RUN)
            self.assertNotIn("<script>",msg)
            self.assertNotIn("very private",msg)

    def test_untrusted_repo_or_run_id_is_rejected(self):
        with self.assertRaises(ValueError):
            feedback.build_comment("INVALID_REQUEST","failure","skipped","skipped","bad;echo x",RUN)
        with self.assertRaises(ValueError):
            feedback.build_comment("INVALID_REQUEST","failure","skipped","skipped",REPO,"123'; touch file")

    def test_failure_feedback_step_is_failure_only_and_keeps_issue_open(self):
        workflow=(base/".github/workflows/brave-goalie-issue.yml").read_text(encoding="utf-8")
        self.assertIn("if: " + "$" + "{{ failure() }}",workflow)
        self.assertIn("python scripts/goalie_request_feedback.py",workflow)
        self.assertIn("id: commit",workflow)
        self.assertIn("id: close",workflow)
        self.assertNotIn("gh issue close",feedback.build_comment("INVALID_REQUEST","failure","skipped","skipped",REPO,RUN))


if __name__=="__main__":
    unittest.main(verbosity=2)
