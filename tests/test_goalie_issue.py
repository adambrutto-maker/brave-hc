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
SIG="2026-10-25|18:15|Big Bastones|A Rink|home"
FEED={"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),"games":[
    {"date":"2026-10-25","opponent":"Big Bastones","assignmentKey":"hto:3375682","fixtureSignature":SIG,
     "requiresGoalieReconfirmation":False}]}
DATA={"schema":"brave-hc-goalie-assignments/v1","assignments":{"hto:3375682":"Stephen Logue"}}


def request(goalie="Stephen Logue", key="hto:3375682", custom="",
            signature=SIG,expected="Stephen Logue",reason=None):
    if reason is None:
        reason=("NO_CHANGE" if (custom or goalie)==expected else
                "NEW_BOOKING" if expected=="TBD" else "BOOKING_CHANGE")
    return json.dumps({"type":mod.REQUEST_TYPE,"game_key":key,
                       "goalie":goalie,"custom_goalie_name":custom,
                       "fixture_signature":signature,"expected_goalie":expected,
                       "change_reason":reason})


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
        self.assertEqual(out["lastChange"]["managerReason"],"BOOKING_CHANGE")

    def test_renegotiated_game_requires_new_approval(self):
        req=mod.parse_request(mod.TITLE,request("Dev Leong"))
        revised=deepcopy(FEED)
        revised["games"][0]["fixtureSignature"]="2026-10-25|19:15|Big Bastones|A Rink|home"
        with self.assertRaisesRegex(ValueError,"SVHL fixture changed"):
            mod.apply_request(req,"adambrutto-maker","write",revised,deepcopy(DATA),NOW)

    def test_earlier_goalie_change_requires_new_approval(self):
        req=mod.parse_request(mod.TITLE,request("Dev Leong"))
        assigned=deepcopy(DATA)
        assigned["assignments"]["hto:3375682"]="Adam Carlyle"
        with self.assertRaisesRegex(ValueError,"Goalie assignment changed"):
            mod.apply_request(req,"adambrutto-maker","write",deepcopy(FEED),assigned,NOW)

    def test_v1_request_rejected_to_prevent_stale_confirmations(self):
        legacy={"type":"brave-hc-goalie-confirmation/v1","game_key":"hto:3375682",
                "goalie":"Dev Leong","custom_goalie_name":""}
        with self.assertRaises(ValueError):
            mod.parse_request(mod.TITLE,json.dumps(legacy))

    def test_confirmed_goalie_cannot_be_cleared_without_explicit_reason(self):
        with self.assertRaisesRegex(ValueError,"manager-reviewed reason"):
            proposed=mod.parse_request(mod.TITLE,request("TBD",reason="NEW_BOOKING"))
            mod.apply_request(proposed,"adambrutto-maker","write",
                              deepcopy(FEED),deepcopy(DATA),NOW)
        clear=mod.parse_request(mod.TITLE,request("TBD",reason="GOALIE_UNAVAILABLE"))
        result,changed=mod.apply_request(clear,"adambrutto-maker","write",
                                         deepcopy(FEED),deepcopy(DATA),NOW)
        self.assertTrue(changed)
        self.assertEqual(result["assignments"]["hto:3375682"],"TBD")
        self.assertEqual(result["lastChange"]["managerReason"],"GOALIE_UNAVAILABLE")

    def test_prior_format_or_missing_reason_rejected(self):
        old=json.loads(request())
        old["type"]="brave-hc-goalie-confirmation/v2"
        with self.assertRaises(ValueError):
            mod.parse_request(mod.TITLE,json.dumps(old))
        del old["change_reason"]
        with self.assertRaises(ValueError):
            mod.parse_request(mod.TITLE,json.dumps(old))

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
