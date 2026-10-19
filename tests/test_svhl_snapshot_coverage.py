import importlib.util
import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE=Path(__file__).resolve().parents[1]/"scripts"
sys.path.insert(0,str(BASE))
spec=importlib.util.spec_from_file_location("svhl_hto_reconcile",BASE/"svhl_hto_reconcile.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
NOW=datetime(2026,10,19,16,0,tzinfo=ZoneInfo("America/Toronto"))

def league():
    return [
        {"date":f"2026-11-{1+i*7:02d}","time":"20:15",
         "opponent":f"Opponent {i}","rink":"D Rink","side":"away"}
        for i in range(5)
    ]

def hto_for(games):
    return [{**g,"htoGameId":str(90001+i)} for i,g in enumerate(games)]

def feed(games,missing=None):
    return {"schema":"brave-hc-svhl-schedule/v1","checkedAt":NOW.isoformat(),
            "games":games,"missingFixtureReviews":missing or []}

class SourceCoverageTests(unittest.TestCase):
    def setUp(self):
        self.s=league()
        self.h=hto_for(self.s)
        self.prior,_=mod.reconcile(self.s,self.h,NOW)

    def test_identical_snapshots_accepted(self):
        new,queue=mod.reconcile(self.s,self.h,NOW,feed(self.prior))
        self.assertEqual(len(new),5)
        self.assertTrue(all(r["action"]=="MATCH" for r in queue))

    def test_partial_league_payload_quarantined(self):
        with self.assertRaisesRegex(ValueError,"SVHL snapshot may be incomplete"):
            mod.reconcile(self.s[:2],self.h,NOW,feed(self.prior))

    def test_partial_hto_payload_quarantined(self):
        with self.assertRaisesRegex(ValueError,"HTO snapshot may be incomplete"):
            mod.reconcile(self.s,self.h[:2],NOW,feed(self.prior))

    def test_duplicate_provider_rows_blocked(self):
        with self.assertRaisesRegex(ValueError,"duplicated fixture"):
            mod.reconcile(self.s+[self.s[0]],self.h,NOW,feed(self.prior))
        with self.assertRaisesRegex(ValueError,"duplicate game IDs"):
            mod.reconcile(self.s,self.h+[dict(self.h[-1],opponent="Another")],NOW,feed(self.prior))

    def test_single_missing_fixture_review_persists(self):
        cur=self.s[:3]+self.s[4:]
        first,queue=mod.reconcile(cur,self.h,NOW,feed(self.prior))
        missing=[r for r in queue if r["action"]=="REVIEW_SVHL_REMOVED"]
        self.assertEqual(len(missing),1)
        self.assertEqual(missing[0]["previous"]["assignmentKey"],"hto:90004")
        saved=[m["previous"] for m in missing]
        second,queue2=mod.reconcile(cur,self.h,NOW,feed(first,saved))
        missing2=[r for r in queue2 if r["action"]=="REVIEW_SVHL_REMOVED"]
        self.assertEqual(len(missing2),1)
        self.assertEqual(missing2[0]["previous"]["assignmentKey"],"hto:90004")

    def test_missing_fixture_return_restores_original_key(self):
        current=self.s[:3]+self.s[4:]
        first,queue=mod.reconcile(current,self.h,NOW,feed(self.prior))
        stored=[r["previous"] for r in queue if r["action"]=="REVIEW_SVHL_REMOVED"]
        returned,checks=mod.reconcile(self.s,self.h,NOW,feed(first,stored))
        self.assertEqual(len(returned),5)
        self.assertFalse([r for r in checks if r["action"]=="REVIEW_SVHL_REMOVED"])
        self.assertEqual(next(x for x in returned if x["opponent"]=="Opponent 3")["assignmentKey"],"hto:90004")

if __name__=="__main__":
    unittest.main(verbosity=2)
