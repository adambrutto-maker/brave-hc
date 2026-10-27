"""Source-qualified hockey trend history: real baseline + synthetic future scenarios."""
from copy import deepcopy
from datetime import datetime,timedelta
from pathlib import Path
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from track_svhl_strength_trends import enrich,validate,TrendHold
from publish_svhl_league_intelligence import monotonic
def base():return json.loads((ROOT/"widgets"/"league-intelligence.json").read_text(encoding="utf8"))
def future(doc,hours=24):
 result=deepcopy(doc)
 result["asOf"]=(datetime.fromisoformat(doc["asOf"].replace("Z","+00:00"))+
                 timedelta(hours=hours)).isoformat()
 return result
def maple(doc):return next(t for t in doc["teams"] if t["leagueName"]=="Maplewolves")
class TrendHistoryQA(unittest.TestCase):
 def test_published_history_preserves_its_original_observation_dates(self):
  doc=base();ledger=doc["trendLedger"]
  self.assertTrue(validate(doc))
  self.assertGreaterEqual(ledger["trackedTeams"],len(doc["teams"]))
  self.assertEqual(ledger["observationsRecorded"],
                   sum(len(x["observations"]) for x in ledger["teams"]))
  self.assertEqual(ledger["materialChangesRecorded"],
                   ledger["observationsRecorded"]-ledger["trackedTeams"])
  self.assertTrue(all(datetime.fromisoformat(x["observations"][0]["observedAtUTC"])<=
                      datetime.fromisoformat(doc["asOf"])
                      for x in ledger["teams"]))
  self.assertTrue(all(x["observations"][0]["observedAtUTC"]==
     "2026-10-26T20:07:46.886724+00:00" for x in ledger["teams"]
     if x["sourceTeamId"] in
       {t["sourceTeamId"] for t in doc["teams"] if t["leagueName"]=="Maplewolves"}))
 def test_repeat_publisher_run_never_fakes_a_new_observation(self):
  doc=base();next_doc=enrich(doc,future(doc))
  self.assertEqual(next_doc["trendLedger"]["observationsRecorded"],
                   doc["trendLedger"]["observationsRecorded"])
  self.assertEqual(next_doc["trendLedger"]["materialChangesRecorded"],
                   doc["trendLedger"]["materialChangesRecorded"])
  self.assertTrue(monotonic(doc,next_doc))
 def test_new_public_source_fingerprint_without_metric_change_no_new_point(self):
  doc=base();candidate=future(doc)
  candidate["sourceSHA256"]="f"*64
  result=enrich(doc,candidate)
  self.assertEqual(result["trendLedger"]["materialChangesRecorded"],
                   doc["trendLedger"]["materialChangesRecorded"])
 def test_observed_score_change_even_without_new_games_is_recorded(self):
  doc=base();candidate=future(doc)
  maple(candidate)["strengthContext"]["scheduleDifficulty"]+=1
  maple(candidate)["strengthContext"]["contextIndex"]+=0.3
  result=enrich(doc,candidate)
  self.assertEqual(result["trendLedger"]["materialChangesRecorded"],
                   doc["trendLedger"]["materialChangesRecorded"]+1)
  trend=next(x for x in result["trendLedger"]["teams"] if x["leagueName"]=="Maplewolves")
  self.assertEqual(len(trend["observations"]),
                   len(next(x for x in doc["trendLedger"]["teams"] if
                            x["leagueName"]=="Maplewolves")["observations"])+1)
  self.assertEqual(trend["observations"][-2]["record"]["gp"],
                   trend["observations"][-1]["record"]["gp"])
  self.assertTrue(monotonic(doc,result))
 def test_new_games_create_new_observation_after_verified_source(self):
  doc=base();candidate=future(doc)
  t=maple(candidate)
  oldgp=t["record"]["gp"];newgp=oldgp+1
  t["record"].update(gp=newgp,w=t["record"]["w"]+1,pts=t["record"]["pts"]+2,
                     gf=t["record"]["gf"]+2,ga=t["record"]["ga"]+1)
  t["strengthContext"].update(
      contextIndex=min(100,t["strengthContext"]["contextIndex"]+0.5),
      completedGames=newgp,
      confidence="EARLY_SAMPLE" if newgp<5 else
                 "LIMITED_SAMPLE" if newgp<10 else "LARGER_SAMPLE")
  result=enrich(doc,candidate)
  self.assertEqual(result["trendLedger"]["materialChangesRecorded"],
                   doc["trendLedger"]["materialChangesRecorded"]+1)
  self.assertEqual(next(x for x in result["trendLedger"]["teams"] if x["leagueName"]=="Maplewolves")
                   ["observations"][-1]["record"]["gp"],newgp)
 def test_same_timestamp_cannot_hide_changed_values(self):
  doc=base();candidate=future(doc)
  maple(candidate)["strengthContext"]["contextIndex"]+=0.1
  accepted=enrich(doc,candidate)
  altered=deepcopy(accepted)
  maple(altered)["strengthContext"]["contextIndex"]+=0.1
  with self.assertRaisesRegex(TrendHold,"DIFFERENT_STATE_SAME_TIMESTAMP"):
   enrich(accepted,altered)
 def test_backward_timestamp_is_held(self):
  doc=base()
  with self.assertRaisesRegex(TrendHold,"BACKDATED_SNAPSHOT"):
   enrich(doc,future(doc,-1))
 def test_point_tampering_is_rejected(self):
  doc=base()
  # A public source can have multiple real observation points. The most recent
  # must match the latest accepted team; changing an old historical point is
  # instead guarded by the append-only publisher monotonic source comparison.
  doc["trendLedger"]["teams"][0]["observations"][-1]["contextIndex"]=99
  with self.assertRaisesRegex(TrendHold,"LATEST_POINT_DOES_NOT_MATCH"):
   validate(doc)
 def test_erased_historical_point_is_held_by_monotonic(self):
  doc=base();later=enrich(doc,future(doc))
  later["trendLedger"]["teams"]=later["trendLedger"]["teams"][1:]
  with self.assertRaisesRegex(Exception,"TRACKED_TEAM_TREND_ERASED"):
   monotonic(doc,later)
 def test_departure_keeps_history_and_return_reuses_same_identity(self):
  doc=base();candidate=future(doc)
  absent=maple(candidate)
  candidate["teams"]=[t for t in candidate["teams"] if t["leagueName"]!="Maplewolves"]
  gone=enrich(doc,candidate)
  self.assertEqual(gone["trendLedger"]["trackedTeams"],
                   doc["trendLedger"]["trackedTeams"])
  self.assertTrue(any(g["sourceTeamId"]==absent["sourceTeamId"] for g in gone["trendLedger"]["teams"]))
  returned=future(gone);returned["teams"].append(deepcopy(maple(doc)))
  back=enrich(gone,returned)
  self.assertEqual(back["trendLedger"]["trackedTeams"],
                   doc["trendLedger"]["trackedTeams"])
  self.assertTrue(validate(back))
 def test_renaming_a_stable_source_id_fails(self):
  doc=base();candidate=future(doc);maple(candidate)["leagueName"]="Fictional identity"
  with self.assertRaisesRegex(TrendHold,"SAME_ID_CHANGED_NAME"):
   enrich(doc,candidate)
 def test_prior_baseline_only_from_actual_previous_public_snapshot(self):
  doc=base();old=deepcopy(doc);old.pop("trendLedger")
  accepted=enrich(old,future(old))
  self.assertEqual(accepted["trendLedger"]["observationsRecorded"],27)
  self.assertEqual(accepted["trendLedger"]["teams"][0]["observations"][0]["observedAtUTC"],old["asOf"])
if __name__=="__main__":unittest.main(verbosity=2)
