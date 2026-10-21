"""No-network legacy vs official HTO record count scope tests."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_legacy_vs_hto_record_scope import (
    read_verified_hto_records,reconcile,SourceHold
)

PERIODS={"Playoffs":7,"Game":10,"Season":2,"Career":6}
def fixtures():
    legacy={"profile":{"player":"Brutto, Adam",
              "I13":{"value":"#REF!","type":"e","formula":False},
              "J13":{"value":"#REF!","type":"e","formula":False}},
            "roster":[{"name":"Brutto, Adam","major":"15","minor":"13",
                       "total":"28","points":"196"}],
            "ledger":([{"class":"Major","major":"1","minor":"0","points":"10"}
                       for _ in range(15)]
                     +[{"class":"Minor","major":"0","minor":"1","points":"3"} for _ in range(13)]
                     +[{"class":"Display","major":"0","minor":"0","points":"0"} for _ in range(51)])}
    legacy["ledger"][0]["points"]="17"
    entries=[]
    for period,n in PERIODS.items():
        entries.extend({"category":"Test Category","period":period,
                        "entry":f"1 - Adam Brutto (event {i})"} for i in range(n))
    verified={"allEntries":558,"allGroups":119,"playerEntries":entries}
    return legacy,verified

def snapshot():
    groups=[{"category":"Record "+str(i),"period":"Game","items":[]} for i in range(119)]
    for j,(period,n) in enumerate(PERIODS.items()):
        groups[j]["period"]=period
        groups[j]["items"]=[f"{i} - Adam Brutto (date)" for i in range(n)]
    groups[-1]["items"]=["Unknown Player"]*533
    return {"schema":"brave-hc-hto-history-snapshot/v1","type":"records","entryCount":558,
            "source":{"authority":"OFFICIAL_HTO_PUBLIC_READBACK"},"groups":groups}

class ScopeReview(unittest.TestCase):
    def test_28_legacy_holdings_and_25_current_mentions_remain_incommensurate(self):
        legacy,verified=fixtures()
        result=reconcile(legacy,verified)
        self.assertEqual(result["legacy"]["countedHolderRows"],28)
        self.assertEqual(result["officialHTO"]["playerMentionEntries"],25)
        self.assertTrue(result["differenceOfThreeIsNotEvidenceOfThreeMissingRecords"])
        self.assertFalse(result["activeProfileRecordsDefinitionCertified"])
        self.assertFalse(result["totalProfileRecordsDefinitionCertified"])
        self.assertFalse(result["publicProfileRecordsPublished"])
    def test_official_snapshot_explicit_name_matching(self):
        result=read_verified_hto_records(snapshot())
        self.assertEqual(len(result["playerEntries"]),25)
        self.assertEqual(result["periods"],PERIODS)
    def test_display_entries_cannot_become_holder_count(self):
        a,b=fixtures()
        a["ledger"][0]["class"]="Display"
        with self.assertRaisesRegex(SourceHold,"LEGACY_RECORD_LEDGER_SCOPE_CHANGED"):
            reconcile(a,b)
    def test_lost_formula_cannot_be_silently_restored(self):
        a,b=fixtures()
        a["profile"]["I13"]["formula"]=True
        with self.assertRaisesRegex(SourceHold,"ORIGINAL_PROFILE_ERRORS_OR_IDENTITY_CHANGED"):
            reconcile(a,b)
    def test_historical_ledger_points_not_inferred(self):
        a,b=fixtures()
        a["ledger"][0]["points"]="0"
        with self.assertRaisesRegex(SourceHold,"LEGACY_RECORD_LEDGER_TOTALS_CHANGED"):
            reconcile(a,b)
    def test_verified_hto_group_scope_changed_holds(self):
        a=snapshot()
        a["groups"].pop()
        with self.assertRaisesRegex(SourceHold,"HTO_RECORD_GROUPS_CHANGED"):
            read_verified_hto_records(a)
    def test_false_inclusion_of_unrelated_player_held(self):
        a=snapshot()
        a["groups"][0]["items"][0]="Another Person"
        a["groups"][-1]["items"].append("Another Person")
        with self.assertRaisesRegex(SourceHold,"PLAYER_OFFICIAL_RECORD_MENTIONS_CHANGED"):
            read_verified_hto_records(a)
    def test_record_book_not_authoritative_holds(self):
        a=snapshot()
        a["source"]["authority"]="INFERRED_WORKBOOK"
        with self.assertRaisesRegex(SourceHold,"OFFICIAL_HTO_RECORD_SNAPSHOT_NOT_ADMITTED"):
            read_verified_hto_records(a)

if __name__=="__main__":
    unittest.main()
