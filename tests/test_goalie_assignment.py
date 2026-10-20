import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "scripts" / "set_goalie.py"
spec = importlib.util.spec_from_file_location("set_goalie", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

NOW = datetime(2026, 10, 19, 20, 0, tzinfo=timezone.utc)
FEED = {"schema": "brave-hc-svhl-schedule/v1", "checkedAt": NOW.isoformat(),
        "games": [{"date": "2026-10-25", "opponent": "Big Bastones",
                   "assignmentKey": "hto:3375682", "requiresGoalieReconfirmation": False}]}
DATA = {"schema": "brave-hc-goalie-assignments/v1",
        "assignments": {"hto:3375682": "Stephen Logue"}}


class GoalieUpdateTests(unittest.TestCase):
    def test_stable_assignment_no_rewrite(self):
        result, changed = module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                                    "hto:3375682", "Stephen Logue", "manager", NOW)
        self.assertFalse(changed)
        self.assertNotIn("lastChange", result)

    def test_valid_change_with_audit(self):
        result, changed = module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                                    "hto:3375682", "Dev Leong", "adambrutto-maker", NOW)
        self.assertTrue(changed)
        self.assertEqual(result["assignments"]["hto:3375682"], "Dev Leong")
        self.assertEqual(result["lastChange"]["previous"], "Stephen Logue")

    def test_manual_save_requires_fixture_and_previous_goalie(self):
        signature="2026-10-25|18:15|Big Bastones|A Rink|home"
        feed=deepcopy(FEED)
        feed["games"][0]["fixtureSignature"]=signature
        data=deepcopy(DATA)
        with self.assertRaisesRegex(ValueError,"SVHL fixture revision is required"):
            module.verify_expected_state(feed,data,"hto:3375682","","")
        module.verify_expected_state(feed,data,"hto:3375682",signature,"Stephen Logue")
        with self.assertRaisesRegex(ValueError,"SVHL fixture changed"):
            module.verify_expected_state(feed,data,"hto:3375682",signature+" updated","Stephen Logue")
        with self.assertRaisesRegex(ValueError,"Goalie assignment changed"):
            module.verify_expected_state(feed,data,"hto:3375682",signature,"TBD")

    def test_cli_dry_run_no_write_and_real_save_blocked_if_preimage_unknown(self):
        now=datetime.now(timezone.utc)
        date=(now+timedelta(days=5)).strftime("%Y-%m-%d")
        signature=date+"|18:15|Synthetic Test Team|A Rink|home"
        feed={"schema":"brave-hc-svhl-schedule/v1","checkedAt":now.isoformat(),
              "games":[{"date":date,"time":"18:15","opponent":"Synthetic Test Team",
                        "assignmentKey":"hto:3375682","fixtureSignature":signature,
                        "requiresGoalieReconfirmation":False}]}
        original={"schema":"brave-hc-goalie-assignments/v1",
                  "assignments":{"hto:3375682":"Stephen Logue"}}
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            feedpath=root/"svhl.json"
            saved=root/"goalies.json"
            feedpath.write_text(json.dumps(feed),encoding="utf-8")
            saved.write_text(json.dumps(original),encoding="utf-8")
            command=[sys.executable,str(path),"--feed",str(feedpath),
                     "--assignments",str(saved),"--game-key","hto:3375682",
                     "--goalie","Dev Leong","--actor","synthetic-qa"]
            dry=subprocess.run(command+["--dry-run"],capture_output=True,text=True)
            self.assertEqual(dry.returncode,0,dry.stderr)
            self.assertEqual(json.loads(saved.read_text()),original)
            blocked=subprocess.run(command,capture_output=True,text=True)
            self.assertEqual(blocked.returncode,2,blocked.stderr)
            self.assertIn("revision is required",blocked.stderr)
            self.assertEqual(json.loads(saved.read_text()),original)
            rejected=subprocess.run(command+["--fixture-signature",signature,
                       "--expected-goalie","TBD"],capture_output=True,text=True)
            self.assertEqual(rejected.returncode,2)
            self.assertEqual(json.loads(saved.read_text()),original)
            permitted=subprocess.run(command+["--fixture-signature",signature,
                       "--expected-goalie","Stephen Logue","--change-reason","BOOKING_CHANGE"],capture_output=True,text=True)
            self.assertEqual(permitted.returncode,0,permitted.stderr)
            self.assertEqual(json.loads(saved.read_text())["assignments"]["hto:3375682"],"Dev Leong")

    def test_manager_reason_transition_rules(self):
        check=module.validate_change_reason
        self.assertEqual(check("Stephen Logue","Stephen Logue","NO_CHANGE"),"NO_CHANGE")
        self.assertEqual(check("TBD","Dev Leong","NEW_BOOKING"),"NEW_BOOKING")
        self.assertEqual(check("Stephen Logue","TBD","GOALIE_UNAVAILABLE"),"GOALIE_UNAVAILABLE")
        self.assertEqual(check("Stephen Logue","Dev Leong","BOOKING_CHANGE"),"BOOKING_CHANGE")
        for old,new,reason in [
            ("Stephen Logue","TBD",""),
            ("Stephen Logue","TBD","NEW_BOOKING"),
            ("Stephen Logue","Dev Leong",""),
            ("TBD","Dev Leong","BOOKING_CHANGE"),
            ("Stephen Logue","Stephen Logue","GOALIE_UNAVAILABLE"),
        ]:
            with self.subTest(old=old,new=new,reason=reason):
                with self.assertRaises(ValueError):
                    check(old,new,reason)

    def test_manual_and_issue_workflows_share_single_queue(self):
        base=Path(__file__).resolve().parents[1]/".github"/"workflows"
        manual=(base/"brave-goalie-confirm.yml").read_text(encoding="utf-8")
        issue=(base/"brave-goalie-issue.yml").read_text(encoding="utf-8")
        self.assertIn("group: brave-hc-goalie-request",manual)
        self.assertIn("group: brave-hc-goalie-request",issue)
        self.assertIn("cancel-in-progress: false",manual)
        self.assertIn("cancel-in-progress: false",issue)
        self.assertIn("'--fixture-signature'",manual)
        self.assertIn("'--expected-goalie'",manual)
        self.assertIn("default: true",manual)

    def test_unknown_key_denied(self):
        with self.assertRaises(ValueError):
            module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                     "hto:9999999", "Dev Leong", "manager", NOW)

    def test_stale_feed_denied(self):
        bad = deepcopy(FEED)
        bad["checkedAt"] = (NOW-timedelta(days=4)).isoformat()
        with self.assertRaises(ValueError):
            module.update_assignment(bad, deepcopy(DATA),
                                     "hto:3375682", "Dev Leong", "manager", NOW)

    def test_schedule_verification_24h_boundary(self):
        fresh = deepcopy(FEED)
        fresh["checkedAt"] = (NOW-timedelta(hours=23,minutes=59)).isoformat()
        result, changed = module.update_assignment(fresh, deepcopy(DATA),
                                                    "hto:3375682", "Dev Leong", "manager", NOW)
        self.assertTrue(changed)
        stale = deepcopy(FEED)
        stale["checkedAt"] = (NOW-timedelta(hours=24,seconds=1)).isoformat()
        with self.assertRaises(ValueError):
            module.update_assignment(stale, deepcopy(DATA),
                                     "hto:3375682", "Dev Leong", "manager", NOW)

    def test_duplicate_key_denied(self):
        bad = deepcopy(FEED)
        bad["games"].append(deepcopy(bad["games"][0]))
        with self.assertRaises(ValueError):
            module.update_assignment(bad, deepcopy(DATA),
                                     "hto:3375682", "Dev Leong", "manager", NOW)

    def test_custom_goalie_requires_name(self):
        with self.assertRaises(ValueError):
            module.safe_goalie("Other / rental", "")
        self.assertEqual(module.safe_goalie("Other / rental", "Alex  McExample"), "Alex McExample")
        with self.assertRaises(ValueError):
            module.safe_goalie("Dev Leong", "Injected")

    def test_reconfirmation_marker(self):
        feed = deepcopy(FEED)
        feed["games"][0]["requiresGoalieReconfirmation"] = True
        result, changed = module.update_assignment(feed, deepcopy(DATA),
                                                    "hto:3375682", "Adam Carlyle", "manager", NOW)
        self.assertTrue(changed)
        self.assertIn("reconfirmation", result["lastChange"]["reason"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
