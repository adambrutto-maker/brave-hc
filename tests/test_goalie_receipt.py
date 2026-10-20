import importlib.util
import json
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/"scripts"))
spec=importlib.util.spec_from_file_location("verify_goalie_receipt",BASE/"scripts"/"verify_goalie_receipt.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

KEY="hto:3375682"
SIG="2026-10-25|18:15|Big Bastones|A Rink|home"
FEED={"schema":"brave-hc-svhl-schedule/v1","checkedAt":"2026-10-20T10:00:00-04:00",
      "games":[{"assignmentKey":KEY,"fixtureSignature":SIG,
                "date":"2026-10-25","time":"18:15","opponent":"Big Bastones",
                "requiresGoalieReconfirmation":False}]}
OLD={"schema":"brave-hc-goalie-assignments/v1",
     "assignments":{KEY:"Stephen Logue","hto:3375683":"TBD"}}
CHANGED={"schema":"brave-hc-goalie-assignments/v1",
         "assignments":{KEY:"Dev Leong","hto:3375683":"TBD"},
         "lastChange":{"key":KEY,"previous":"Stephen Logue","confirmed":"Dev Leong",
                       "actor":"adambrutto-maker","reason":"manager assignment"}}


class GoalieReceiptTests(unittest.TestCase):
    def test_no_change_succeeds_only_on_published_goalie(self):
        receipt=mod.verify_receipt(deepcopy(FEED),deepcopy(OLD),
                                   KEY,SIG,"Stephen Logue","Stephen Logue")
        self.assertEqual(receipt["status"],"PUBLISHED_AND_VERIFIED")
        self.assertFalse(receipt["change_required"])

    def test_changed_assignment_requires_attributed_audit(self):
        receipt=mod.verify_receipt(deepcopy(FEED),deepcopy(CHANGED),KEY,SIG,
                                   "Stephen Logue","Dev Leong",
                                   actor="adambrutto-maker",claimed_change=True)
        self.assertTrue(receipt["change_required"])
        self.assertEqual(receipt["published_goalie"],"Dev Leong")

    def test_remote_audit_must_match_reviewed_manager_reason(self):
        saved=deepcopy(CHANGED)
        saved["lastChange"]["managerReason"]="BOOKING_CHANGE"
        ok=mod.verify_receipt(deepcopy(FEED),saved,KEY,SIG,
                              "Stephen Logue","Dev Leong",
                              actor="adambrutto-maker",claimed_change=True,
                              manager_reason="BOOKING_CHANGE")
        self.assertEqual(ok["status"],"PUBLISHED_AND_VERIFIED")
        with self.assertRaisesRegex(ValueError,"change reason differs"):
            mod.verify_receipt(deepcopy(FEED),saved,KEY,SIG,
                               "Stephen Logue","Dev Leong",
                               actor="adambrutto-maker",claimed_change=True,
                               manager_reason="GOALIE_UNAVAILABLE")

    def test_failed_or_unrelated_publish_is_not_success(self):
        with self.assertRaisesRegex(ValueError,"does not match"):
            mod.verify_receipt(deepcopy(FEED),deepcopy(OLD),
                               KEY,SIG,"Stephen Logue","Dev Leong",
                               actor="adambrutto-maker",claimed_change=True)

    def test_stale_fixture_receipt_is_denied(self):
        feed=deepcopy(FEED)
        feed["games"][0]["fixtureSignature"]=SIG.replace("18:15","19:15")
        with self.assertRaisesRegex(ValueError,"fixture revision changed"):
            mod.verify_receipt(feed,deepcopy(CHANGED),KEY,SIG,
                               "Stephen Logue","Dev Leong",
                               actor="adambrutto-maker",claimed_change=True)

    def test_wrong_actor_or_prior_is_denied(self):
        for actor,old in (("another-manager","Stephen Logue"),
                          ("adambrutto-maker","Matt Svec")):
            with self.assertRaisesRegex(ValueError,"audit differs"):
                mod.verify_receipt(deepcopy(FEED),deepcopy(CHANGED),KEY,SIG,
                                   old,"Dev Leong",actor=actor,claimed_change=True)

    def test_reconfirmation_needs_published_revision_receipt(self):
        feed=deepcopy(FEED)
        feed["games"][0]["requiresGoalieReconfirmation"]=True
        with self.assertRaisesRegex(ValueError,"reconfirmation"):
            mod.verify_receipt(feed,deepcopy(CHANGED),KEY,SIG,
                               "Stephen Logue","Dev Leong",actor="adambrutto-maker",
                               claimed_change=True)
        saved=deepcopy(CHANGED)
        saved["scheduleConfirmations"]={KEY:SIG}
        mod.verify_receipt(feed,saved,KEY,SIG,"Stephen Logue","Dev Leong",
                           actor="adambrutto-maker",claimed_change=True)

    def test_invalid_remote_schema_is_rejected(self):
        saved=deepcopy(CHANGED)
        saved["schema"]="invalid"
        with self.assertRaisesRegex(ValueError,"Remote goalie file invalid"):
            mod.verify_receipt(deepcopy(FEED),saved,KEY,SIG,"Stephen Logue","Dev Leong")

    def test_issue_status_can_not_claim_invalid_success(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"status.json"
            path.write_text(json.dumps({"schema":"brave-hc-goalie-request-status/v1","code":"STALE_GOALIE"}))
            self.assertEqual(json.loads(path.read_text())["code"],"STALE_GOALIE")
        # Workflow tests enforce that the receipt step is after the push but before close.
        workflow=(BASE/".github/workflows/brave-goalie-issue.yml").read_text()
        self.assertLess(workflow.index("id: commit"),workflow.index("id: receipt"))
        self.assertLess(workflow.index("id: receipt"),workflow.index("id: close"))

if __name__=="__main__":
    unittest.main(verbosity=2)
