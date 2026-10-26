"""Contract QA: public-only opponent intelligence preview from private ledger."""
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,os,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("public_opponents",ROOT/"scripts"/"build_public_opponent_preview.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
PRIV=Path(os.environ.get("HOCKEYOS_PRIVATE_INTELLIGENCE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence"))
LIVE=PRIV/"Online_Opponent_Ledger_PRIVATE_LATEST.json"
def record(name):
    return {"opponentExact":name,"identityScope":"EXACT_MATCH_ONLY","sourceHTOGames":1,
            "regularSeason":{"gp":1,"w":1,"l":0,"t":0,"gf":6,"ga":4},
            "allTime":{"gp":1,"w":1,"l":0,"t":0,"gf":6,"ga":4},
            "playoffs":{"gp":0,"w":0,"l":0,"t":0,"gf":0,"ga":0},
            "lastFive":[{"date":"2026-10-25","result":"W","gf":6,"ga":4}]}
def fixtures():
    stamp=datetime.now(timezone.utc).isoformat()
    ledger={"schema":"brave-hc-online-opponent-ledger/private-v1",
            "status":"PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY","released":False,
            "workbookWritten":False,"releaseEligible":False,
            "sourceHTOStatsReadback":stamp,
            "sourceCounts":{"masterGames":358,"currentOfficialHTOGames":5,"totalGames":363},
            "profiles":[record("Big Bastones"),record("Mid Ice Crisis"),record("Dateline Predators"),record("Zamboner Crew")]}
    division={"schema":"brave-hc-svhl-standings/v1","division":"Cristillo","team":"Braves HC",
              "teams":[{"name":x} for x in ("Braves HC","Big Bastones","Mid Ice Crisis","Dateline Predators","Zamboner Crew","Mohawks HC","Sugo Sundays","Other Way")]}
    return ledger,division
class AdapterQA(unittest.TestCase):
 def test_exact_and_unverified_are_distinct(self):
    d,s=fixtures();report=mod.build(d,s)
    self.assertEqual(report["coverage"],{"historicalGameRecords":358,"currentSeasonGames":5,"sourceQualifiedOpponents":4,"aliasesNeedingReview":2,"noExactHistory":1})
    self.assertFalse(report["publishable"])
    indexed={x["name"]:x for x in report["teams"]}
    self.assertEqual(indexed["Big Bastones"]["regularSeason"]["w"],1)
    self.assertEqual(indexed["Mohawks HC"]["verification"],"ALIAS_REVIEW_REQUIRED")
    self.assertEqual(indexed["Sugo Sundays"]["verification"],"ALIAS_REVIEW_REQUIRED")
    self.assertEqual(indexed["Other Way"]["verification"],"NO_EXACT_HISTORY")
    self.assertNotIn("sourceMasterSHA256",json.dumps(report))
 def test_stale_hto_block(self):
    d,s=fixtures();d["sourceHTOStatsReadback"]=(datetime.now(timezone.utc)-timedelta(days=4)).isoformat()
    with self.assertRaisesRegex(mod.Hold,"NOT_FRESH"):mod.build(d,s)
 def test_unverified_source_block(self):
    d,s=fixtures();d["releaseEligible"]=True
    with self.assertRaisesRegex(mod.Hold,"GATE_INCONSISTENT"):mod.build(d,s)
 def test_conflicting_wlt_block(self):
    d,s=fixtures();d["profiles"][0]["regularSeason"]["w"]=3
    with self.assertRaisesRegex(mod.Hold,"WLT_CONFLICT"):mod.build(d,s)
 def test_duplicate_division_block(self):
    d,s=fixtures();s["teams"][-1]["name"]="Big Bastones"
    with self.assertRaisesRegex(mod.Hold,"EIGHT_TEAM_IDENTITY"):mod.build(d,s)
 @unittest.skipUnless(LIVE.exists(),"private source unavailable")
 def test_real_preview_source(self):
    d=json.loads(LIVE.read_text(encoding="utf8"))
    s=json.loads((ROOT/"widgets"/"standings.json").read_text(encoding="utf8"))
    actual=mod.build(d,s)
    self.assertEqual(len(actual["teams"]),7)
    self.assertEqual(actual["coverage"]["sourceQualifiedOpponents"],4)
    self.assertEqual(actual["coverage"]["aliasesNeedingReview"],2)
    self.assertEqual(actual["coverage"]["noExactHistory"],1)
    rows={x["name"]:x for x in actual["teams"]}
    self.assertEqual(rows["Big Bastones"]["regularSeason"],{"gp":7,"w":4,"l":2,"t":1,"gf":24,"ga":27})
    self.assertEqual(rows["Mid Ice Crisis"]["allTime"],{"gp":7,"w":1,"l":4,"t":2,"gf":15,"ga":25})
if __name__=="__main__":unittest.main(verbosity=2)
