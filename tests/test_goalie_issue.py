import importlib.util
import json
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

script_dir = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(script_dir))
spec = importlib.util.spec_from_file_location("issue_processor", script_dir / "process_goalie_issue.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

NOW=datetime(2026,10,19,21,0,tzinfo=timezone.utc)
FEED={"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),"games":[
    {"date":"2026-10-25","opponent":"Big Bastones","assignmentKey":"hto:3375682",
     "requiresGoalieReconfirmation":False}]}
DATA={"schema":"brave-hc-goalie-assignments/v1","assignments":{"hto:3375682":"Stephen Logue"}}


def request(goalie="Stephen Logue", key="hto:3375682", custom=""):
    return json.dumps({"type":mod.REQUEST_TYPE,"game_key":key,
                       "goalie":goalie,"custom_goalie_name":custom})


class IssueTests(unittest.TestCase):
    def test_existing_goalie_no_change(self):
        r=mod.parse_request(mod.TITLE,request())
        out,changed=mod.apply_request(r,"adambrutto-maker","admin",deepcopy(FEED),deepcopy(DATA),NOW)
        self.assertFalse(changed)
        self.assertEqual(out["assignments"]["hto:3375682"],"Stephen Logue")

    def test_new_goalie_audit(self):
        r=mod.parse_request(mod.TITLE,request("Dev Leong"))
        out,changed=mod.apply_request(r,"adambrutto-maker","write",deepcopy(FEED),deepcopy(DATA),NOW)
        self.assertTrue(changed)
        self.assertEqual(out["lastChange"]["actor"],"adambrutto-maker")

    def test_permission_block(self):
        r=mod.parse_request(mod.TITLE,request("Dev Leong"))
        for role in ("read","triage","none",""):
            with self.assertRaises(PermissionError):
                mod.apply_request(r,"someone","read",deepcopy(FEED),deepcopy(DATA),NOW)

    def test_request_injection_block(self):
        examples=[
            '{"type": "brave-hc-goalie-confirmation/v1", "game_key": "hto:3375682", "goalie": "Dev Leong", "custom_goalie_name": "", "shell": "oops"}',
            "not json",
            request(key="hto:3375682; rm -rf ."),
            request(goalie="Not a goalie"),
            request(goalie="Other / rental",custom="<script>alert(1)</script>"),
        ]
        for body in examples:
            with self.assertRaises(ValueError): mod.parse_request(mod.TITLE,body)

    def test_title_and_stale_denied(self):
        with self.assertRaises(ValueError): mod.parse_request("Other request",request())
        r=mod.parse_request(mod.TITLE,request("Dev Leong"))
        stale=deepcopy(FEED);stale["checkedAt"]=(NOW-timedelta(days=4)).isoformat()
        with self.assertRaises(ValueError):
            mod.apply_request(r,"adambrutto-maker","write",stale,deepcopy(DATA),NOW)


if __name__=="__main__":
    unittest.main(verbosity=2)
