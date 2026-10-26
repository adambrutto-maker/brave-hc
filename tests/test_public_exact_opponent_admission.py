"""Independent acceptance tests for four exact-name public opponent records."""
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,os,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("admit_exact",ROOT/"scripts"/"admit_exact_opponent_public_feed.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
PRIV=Path(os.environ.get("HOCKEYOS_PRIVATE_INTELLIGENCE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence"))
LEDGER=PRIV/"Online_Opponent_Ledger_PRIVATE_LATEST.json"
AVAILABLE=LEDGER.exists()
def input_data():
 return (json.loads(LEDGER.read_text(encoding="utf8")),
         json.loads((ROOT/"widgets"/"standings.json").read_text(encoding="utf8")))
class TestExactOnlyAdmission(unittest.TestCase):
 @unittest.skipUnless(AVAILABLE,"private qualified source ledger not available")
 def test_four_exact_and_three_held_records(self):
  ledger,standings=input_data()
  out=module.release_aggregate(ledger,standings)
  self.assertEqual(out["status"],"PUBLIC_VERIFIED_EXACT_ONLY")
  self.assertTrue(out["publishable"])
  self.assertEqual(len(out["teams"]),7)
  self.assertEqual(out["coverage"]["sourceQualifiedOpponents"],4)
  self.assertEqual(out["coverage"]["aliasesNeedingReview"],2)
  self.assertEqual(out["coverage"]["noExactHistory"],1)
  rows={t["name"]:t for t in out["teams"]}
  self.assertEqual(rows["Big Bastones"]["regularSeason"],{"gp":7,"w":4,"l":2,"t":1,"gf":24,"ga":27})
  self.assertEqual(rows["Mid Ice Crisis"]["allTime"],{"gp":7,"w":1,"l":4,"t":2,"gf":15,"ga":25})
  for name in ("Mohawks HC","Sugo Sundays","Other Way"):
   self.assertNotIn("regularSeason",rows[name])
   self.assertNotIn("possibleSourceName",rows[name])
  self.assertNotIn("sourceRows",json.dumps(out))
  self.assertNotIn("workbookGame",json.dumps(out))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_tampered_original_master_hash_is_blocked(self):
  l,s=input_data();l["sourceMasterSHA256"]="wrong"
  with self.assertRaisesRegex(module.Hold,"CANONICAL_WORKBOOK_HASH"):module.release_aggregate(l,s)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_tampered_big_bastones_history_is_blocked(self):
  l,s=input_data()
  row=next(x for x in l["profiles"] if x["opponentExact"]=="Big Bastones")
  row["regularSeason"]["w"]+=1
  with self.assertRaisesRegex(module.Hold,"SCOPE_DRIFT|WLT_CONFLICT"):module.release_aggregate(l,s)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_changed_game_count_fails_release(self):
  l,s=input_data();l["sourceCounts"]["currentSeasonGP"]=6
  with self.assertRaisesRegex(module.Hold,"CURRENT_FIVE_GAME_HTO"):module.release_aggregate(l,s)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_unverified_other_way_history_fails_release(self):
  l,s=input_data()
  extra=deepcopy(l["profiles"][0]);extra["opponentExact"]="Other Way"
  l["profiles"].append(extra)
  with self.assertRaisesRegex(module.Hold,"REVIEW_SCOPE_CHANGED|DIVISION_OPPONENT_SET_DRIFT"):module.release_aggregate(l,s)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_stale_source_rejected(self):
  l,s=input_data();l["sourceHTOStatsReadback"]=(datetime.now(timezone.utc)-timedelta(days=6)).isoformat()
  with self.assertRaisesRegex(module.Hold,"NOT_FRESH"):module.release_aggregate(l,s)
if __name__=="__main__":unittest.main(verbosity=2)
