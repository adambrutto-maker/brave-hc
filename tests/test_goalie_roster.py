import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / "scripts"))
from set_goalie import safe_goalie, GOALIE_OPTIONS

class VerifiedRosterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r=json.loads((ROOT/"widgets/goalie-roster.json").read_text(encoding="utf-8"))

    def test_schema_and_verified_current_first(self):
        self.assertEqual(self.r["schema"],"brave-hc-goalie-roster/v1")
        self.assertEqual([g["name"] for g in self.r["currentConfirmed"]],["Dev Leong","Stephen Logue"])
        self.assertTrue(all(g["status"]=="CONFIRMED" for g in self.r["currentConfirmed"]))
        self.assertEqual(self.r["options"],{"tbd":"TBD","custom":"Other / rental"})

    def test_validated_names_match_backend(self):
        roster=[g["name"] for g in self.r["currentConfirmed"]+self.r["historicalAndOther"]]
        options=roster+["TBD","Other / rental"]
        self.assertEqual(set(options),set(GOALIE_OPTIONS))
        self.assertEqual(len(options),len(set(options)))
        for name in roster+["TBD"]:
            self.assertEqual(safe_goalie(name,""),name)

    def test_current_status_not_promoted_from_history(self):
        confirmed={g["name"] for g in self.r["currentConfirmed"]}
        other={g["name"] for g in self.r["historicalAndOther"]}
        self.assertFalse(confirmed&other)
        self.assertIn("PENDING",next(g["status"] for g in self.r["historicalAndOther"] if g["name"]=="Matt Svec"))
        for person in self.r["historicalAndOther"]:
            self.assertFalse(person["label"].startswith("CURRENT"))

    def test_all_roster_records_have_sources(self):
        self.assertGreaterEqual(len(self.r["sources"]),2)
        for source in self.r["sources"]:
            self.assertTrue(source["url"].startswith("https://www.htosports.com/"))
        for group in ("currentConfirmed","historicalAndOther"):
            for entry in self.r[group]:
                self.assertTrue(entry.get("name") and entry.get("label") and entry.get("status"))

if __name__=="__main__":
    unittest.main(verbosity=2)
