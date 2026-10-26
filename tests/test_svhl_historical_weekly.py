"""Historical league standings + immutable Toronto weekly performance regression tests."""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from pathlib import Path
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import collect_svhl_historical_standings as archive
import build_svhl_weekly_strength as weekly
from publish_svhl_league_intelligence import monotonic
def read(name):return json.loads((ROOT/"widgets"/name).read_text(encoding="utf8"))
def later(doc,days):
 x=deepcopy(doc)
 dt=datetime.fromisoformat(doc["asOf"].replace("Z","+00:00"))+timedelta(days=days)
 x["asOf"]=dt.isoformat()
 return x
class HistoricWeeklyQA(unittest.TestCase):
 def test_published_archive_source_integrity(self):
  source=read("historical-svhl-standings.json")
  self.assertTrue(archive.validate(source))
  self.assertEqual(source["seasonsCollected"],len(archive.SEASONS))
  self.assertEqual(source["competitiveTeamSeasonEntries"],175)
 def test_old_season_team_ids_are_not_assumed_to_be_franchise_ids(self):
  source=read("historical-svhl-standings.json")
  self.assertIn("Matching names across years are search candidates",source["identityRule"])
  self.assertFalse(source["publishedPersonalRosterData"])
  self.assertEqual(source["missingSeasonsNotInferred"],["2019/20","2020/21"])
 def test_all_standings_records_arithmetically_consistent(self):
  source=read("historical-svhl-standings.json")
  for season in source["seasons"]:
   self.assertEqual(season["teamEntries"],sum(len(x["teams"]) for x in season["divisions"]))
   for d in season["divisions"]:
    for t in d["teams"]:
     self.assertEqual(t["gp"],t["w"]+t["l"]+t["t"])
     self.assertEqual(t["pts"],2*t["w"]+t["t"])
 def test_weekly_seed_is_qualified_current_week(self):
  doc=read("league-intelligence.json")
  self.assertTrue(weekly.validate(doc,True))
  self.assertEqual(doc["weeklyLedger"]["weeksRecorded"],1)
  self.assertEqual(len(doc["weeklyLedger"]["weeks"][0]["teams"]),len(doc["teams"]))
 def test_same_week_refresh_updates_without_double_count(self):
  doc=read("league-intelligence.json")
  refreshed=weekly.enrich(doc,later(doc,1))
  self.assertEqual(refreshed["weeklyLedger"]["weeksRecorded"],1)
  self.assertTrue(weekly.validate(refreshed,True))
 def test_new_monday_freezes_previous_week_and_adds_another(self):
  doc=read("league-intelligence.json")
  next_doc=weekly.enrich(doc,later(doc,7))
  self.assertEqual(next_doc["weeklyLedger"]["weeksRecorded"],2)
  self.assertEqual(next_doc["weeklyLedger"]["weeks"][0],doc["weeklyLedger"]["weeks"][0])
  self.assertTrue(monotonic(doc,next_doc))
 def test_previous_week_is_immutable_after_rollover(self):
  doc=read("league-intelligence.json")
  next_doc=weekly.enrich(doc,later(doc,7))
  modified=deepcopy(next_doc)
  modified["weeklyLedger"]["weeks"][0]["teams"][0]["gf"]+=1
  with self.assertRaisesRegex(Exception,"PRIOR_WEEKLY_HISTORY_CHANGED"):
   monotonic(next_doc,modified)
 def test_same_week_change_only_affects_open_week(self):
  doc=read("league-intelligence.json")
  next_doc=weekly.enrich(doc,later(doc,7))
  updated=later(next_doc,1)
  t=updated["teams"][0]
  t["record"]["gp"]+=1;t["record"]["w"]+=1
  t["strengthContext"]["completedGames"]+=1
  t["strengthContext"]["contextIndex"]=round(min(100,t["strengthContext"]["contextIndex"]+0.4),1)
  result=weekly.enrich(next_doc,updated)
  self.assertEqual(result["weeklyLedger"]["weeks"][0],doc["weeklyLedger"]["weeks"][0])
  self.assertNotEqual(result["weeklyLedger"]["weeks"][-1],next_doc["weeklyLedger"]["weeks"][-1])
 def test_malformed_current_public_snapshot_not_admitted(self):
  doc=read("league-intelligence.json");t=doc["teams"][0];t["record"]["gp"]+=1
  with self.assertRaisesRegex(weekly.WeeklyHold,"TEAM_WEEKLY_SCOPE_INVALID"):
   weekly.enrich(doc,doc)
 def test_wrong_archive_hash_and_source_refused(self):
  a=read("historical-svhl-standings.json")
  a["seasons"][0]["sourceSHA256"]="invented"
  with self.assertRaisesRegex(archive.HistoricalHold,"HISTORICAL_SEASON_PROOF_INVALID"):
   archive.validate(a)
 def test_weekly_source_dates_adhere_to_toronto_week_start(self):
  self.assertEqual(weekly.monday("2026-10-26T20:33:08+00:00"),"2026-10-26")
  self.assertEqual(weekly.monday("2026-11-02T04:30:00+00:00"),"2026-10-26")
  self.assertEqual(weekly.monday("2026-11-02T06:00:00+00:00"),"2026-11-02")
if __name__=="__main__":unittest.main(verbosity=2)
