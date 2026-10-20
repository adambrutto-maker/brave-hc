import importlib.util
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]/"scripts"
sys.path.insert(0,str(BASE))
spec=importlib.util.spec_from_file_location("verify_goalie_push",BASE/"verify_goalie_push.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

NOW=datetime(2026,10,20,15,0,tzinfo=timezone.utc)
SIG="2026-10-25|18:15|Big Bastones|A Rink|home"
KEY="hto:3375682"
FEED={"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),"games":[{
    "assignmentKey":KEY,"fixtureSignature":SIG,"date":"2026-10-25",
    "time":"18:15","opponent":"Big Bastones","rink":"A Rink",
    "requiresGoalieReconfirmation":False}]}
SAVED={"schema":"brave-hc-goalie-assignments/v1","assignments":{
    KEY:"Stephen Logue","hto:3375683":"TBD"
}}
PROPOSED={"schema":"brave-hc-goalie-assignments/v1","assignments":{
    KEY:"Dev Leong","hto:3375683":"TBD"
}}

def check(feed=None,remote=None,proposed=None,signature=SIG,previous="Stephen Logue",chosen="Dev Leong"):
    module.validate_publish(deepcopy(feed or FEED),deepcopy(remote or SAVED),
                            deepcopy(proposed or PROPOSED),KEY,signature,previous,chosen,NOW)

class RemotePrePushTests(unittest.TestCase):
    def test_fresh_matching_approval_passes(self):
        check()

    def test_changed_league_fixture_is_blocked(self):
        changed=deepcopy(FEED)
        changed["games"][0]["fixtureSignature"]=SIG.replace("18:15","19:15")
        with self.assertRaisesRegex(ValueError,"fixture changed"):
            check(feed=changed)

    def test_changed_saved_goalie_is_blocked(self):
        changed=deepcopy(SAVED)
        changed["assignments"][KEY]="Matt Svec"
        with self.assertRaisesRegex(ValueError,"Goalie assignment changed"):
            check(remote=changed)

    def test_changed_unrelated_goalie_is_blocked_until_refresh(self):
        changed=deepcopy(SAVED)
        changed["assignments"]["hto:3375683"]="Matt Svec"
        with self.assertRaisesRegex(ValueError,"Another goalie assignment changed"):
            check(remote=changed)

    def test_mutated_output_cannot_bypass_selected_goalie(self):
        with self.assertRaisesRegex(ValueError,"Proposed goalie differs"):
            check(chosen="Matt Svec")

    def test_stale_remote_feed_is_blocked(self):
        changed=deepcopy(FEED)
        changed["checkedAt"]=(NOW-timedelta(days=2)).isoformat()
        with self.assertRaisesRegex(ValueError,"not verified"):
            check(feed=changed)

    def test_unchanged_goalie_noop_allowed_only_if_same_preimage(self):
        no_change=deepcopy(SAVED)
        check(proposed=no_change,chosen="Stephen Logue")
        changed=deepcopy(SAVED)
        changed["assignments"][KEY]="Matt Svec"
        with self.assertRaisesRegex(ValueError,"Goalie assignment changed"):
            check(remote=changed,proposed=no_change,chosen="Stephen Logue")

    def test_current_reconfirmation_revision_is_enforced(self):
        moved=deepcopy(FEED)
        moved["games"][0]["requiresGoalieReconfirmation"]=True
        with self.assertRaisesRegex(ValueError,"reconfirmation"):
            check(feed=moved)
        proposed=deepcopy(PROPOSED)
        proposed["scheduleConfirmations"]={KEY:SIG}
        check(feed=moved,proposed=proposed)

    def test_unrelated_reconfirmation_cannot_be_dropped(self):
        saved=deepcopy(SAVED)
        saved["scheduleConfirmations"]={"hto:3375683":"another revision"}
        with self.assertRaisesRegex(ValueError,"Other schedule confirmations"):
            check(remote=saved)

    def test_reject_arbitrary_git_refs_and_file_paths(self):
        with self.assertRaisesRegex(ValueError,"Unsupported remote ref"):
            module.load_git("HEAD","widgets/svhl-upcoming.json")
        with self.assertRaisesRegex(ValueError,"Unsupported read path"):
            module.load_git("origin/main","private/token.json")

if __name__=="__main__":
    unittest.main(verbosity=2)
