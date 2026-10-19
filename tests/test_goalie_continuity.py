import importlib.util
import sys
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE=Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0,str(BASE))

def load(name):
    spec=importlib.util.spec_from_file_location(name,BASE/(name+".py"))
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj

reconcile=load("svhl_hto_reconcile")
goalies=load("set_goalie")
NOW=datetime(2026,10,19,16,0,tzinfo=ZoneInfo("America/Toronto"))
def game(when="2026-11-29", time="20:15", opp="Test Rivals"):
    return dict(date=when,time=time,opponent=opp,rink="A Rink",side="home")
def hto(when="2026-11-29", time="20:15", opp="Test Rivals",id="90001"):
    return dict(**game(when,time,opp),htoGameId=id)
def as_feed(items):
    return {"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),"games":items}
def as_goalies(k="svhl:2026-11-29:testrivals",name="Dev Leong"):
    return {"schema":"brave-hc-goalie-assignments/v1","assignments":{k:name}}

class FixtureContinuity(unittest.TestCase):
    def test_svhl_key_survives_new_hto_game(self):
        s=[game()]
        f,_=reconcile.reconcile(s, [], NOW)
        old=f[0]["assignmentKey"]
        self.assertTrue(old.startswith("svhl:"))
        f2,q=reconcile.reconcile(s,[hto()],NOW,as_feed(f),as_goalies(old))
        self.assertEqual(f2[0]["assignmentKey"],old)
        self.assertEqual(f2[0]["htoGameId"],"90001")
        self.assertEqual(f2[0]["htoSyncStatus"],"MATCH")

    def test_reschedule_sticky_until_explicit_same_goalie_confirmation(self):
        s=[game()]
        orig,_=reconcile.reconcile(s,[hto()],NOW)
        key=orig[0]["assignmentKey"]
        data=as_goalies(key)
        moved=[game("2026-12-06")]
        next_feed,_=reconcile.reconcile(moved,[hto()],NOW,as_feed(orig),data)
        self.assertEqual(next_feed[0]["assignmentKey"],key)
        self.assertTrue(next_feed[0]["requiresGoalieReconfirmation"])
        self.assertEqual(next_feed[0]["htoSyncStatus"],"REVIEW_RESCHEDULE")
        # HTO update does not clear the goalie hold.
        hto_updated=[hto("2026-12-06")]
        still,_=reconcile.reconcile(moved,hto_updated,NOW,as_feed(next_feed),data)
        self.assertEqual(still[0]["htoSyncStatus"],"MATCH")
        self.assertTrue(still[0]["requiresGoalieReconfirmation"])
        out,changed=goalies.update_assignment(as_feed(still),deepcopy(data),key,"Dev Leong","adambrutto-maker",NOW)
        self.assertTrue(changed)
        self.assertEqual(out["lastChange"]["previous"],"Dev Leong")
        self.assertIn("reconfirmation",out["lastChange"]["reason"])
        self.assertEqual(out["scheduleConfirmations"][key],still[0]["fixtureSignature"])
        cleared,_=reconcile.reconcile(moved,hto_updated,NOW,as_feed(still),out)
        self.assertFalse(cleared[0]["requiresGoalieReconfirmation"])

    def test_opponent_substitution_is_review_not_silent(self):
        old_s=[game()]
        old_feed,_=reconcile.reconcile(old_s,[hto()],NOW)
        changed=[game(opp="Replacement Rivals")]
        updated,queue=reconcile.reconcile(changed,[hto()],NOW,as_feed(old_feed),as_goalies("hto:90001"))
        self.assertEqual(updated[0]["assignmentKey"],"hto:90001")
        self.assertEqual(updated[0]["htoSyncStatus"],"REVIEW_IDENTITY")
        self.assertTrue(updated[0]["requiresGoalieReconfirmation"])
        self.assertEqual(queue[0]["action"],"REVIEW_IDENTITY")

    def test_unrelated_new_game_does_not_inherit_old_confirmed_goalie(self):
        old_s=[game()]
        old_feed,_=reconcile.reconcile(old_s,[hto()],NOW)
        changed=[game("2027-02-07","18:15","Unrelated Team")]
        f,_=reconcile.reconcile(changed,[hto()],NOW,as_feed(old_feed),as_goalies("hto:90001"))
        self.assertNotEqual(f[0]["assignmentKey"],"hto:90001")

    def test_previous_game_missing_from_svhl_requires_review(self):
        original=[game("2026-11-29","20:15","Test Rivals")]
        old_feed,_=reconcile.reconcile(original,[hto()],NOW)
        current,queue=reconcile.reconcile(
            [game("2026-12-06","18:15","Another Team")], [hto()],
            NOW,as_feed(old_feed),as_goalies("hto:90001"))
        removed=[x for x in queue if x["action"]=="REVIEW_SVHL_REMOVED"]
        self.assertEqual(len(removed),1)
        self.assertEqual(removed[0]["previous"]["assignmentKey"],"hto:90001")
        self.assertEqual(removed[0]["previous"]["opponent"],"Test Rivals")
        self.assertEqual(current[0]["opponent"],"Another Team")
        self.assertFalse(any(x["opponent"]=="Test Rivals" for x in current))
        self.assertFalse(any(x["action"]=="REVIEW_HTO_ONLY" for x in queue))

    def test_completed_prior_game_not_flagged_when_removed(self):
        historical=[dict(game("2026-10-05","18:15","Old Fixture"),
                         assignmentKey="hto:90001",htoGameId="90001")]
        now=datetime(2026,10,19,16,0,tzinfo=ZoneInfo("America/Toronto"))
        games,queue=reconcile.reconcile(
            [game("2026-11-29","20:15","Future Team")],
            [hto("2026-10-05","18:15","Old Fixture")],now,as_feed(historical))
        self.assertFalse(any(r["action"]=="REVIEW_SVHL_REMOVED" for r in queue))

    def test_duplicate_keys_block_feed_publish(self):
        repeated=[game(),game()]
        with self.assertRaises(ValueError):
            reconcile.reconcile(repeated,[],NOW)

if __name__=="__main__":
    unittest.main(verbosity=2)
