"""Independent source-movement detection and immutable history tests.

All post-baseline division reshuffles here are synthetic. The two observed
October 26 Cristillo changes derive from the original published standings.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,unittest,sys
R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/"scripts"))
spec=importlib.util.spec_from_file_location("moves",R/"scripts"/"track_svhl_division_movements.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def read(name):return json.loads((R/"widgets"/name).read_text(encoding="utf8"))
def base():return read("league-intelligence.json")
def historical():return read("cristillo-membership-20261026-baseline.json")
def current(previous,hours=1):
 new=deepcopy(previous)
 date=datetime.fromisoformat(previous["asOf"].replace("Z","+00:00"))
 new["asOf"]=(date+timedelta(hours=hours)).isoformat()
 return new
class MovementHistoryQA(unittest.TestCase):
 def test_original_two_membership_changes_are_grounded(self):
  snapshot=base()
  # The published feed may already be seeded; recompute from a plain source.
  snapshot.pop("movementLedger",None)
  doc=m.enrich(snapshot,snapshot,historical())
  ledger=doc["movementLedger"]
  self.assertEqual(ledger["eventsRecorded"],2)
  self.assertEqual(ledger["incomingCristilloEventsRecorded"],1)
  events={x["leagueName"]:x for x in ledger["events"]}
  self.assertEqual(events["Sugo Sundays"]["fromDivision"],m.CRISTILLO)
  self.assertEqual(events["Sugo Sundays"]["toDivision"],"Remax Division")
  self.assertIsNone(events["Maplewolves"]["fromDivision"])
  self.assertEqual(events["Maplewolves"]["toDivision"],m.CRISTILLO)
  self.assertTrue(all(x["effectiveDateNotVerified"] for x in ledger["events"]))
  info=ledger["incomingCristilloReports"][0]
  self.assertEqual(info["leagueName"],"Maplewolves")
  self.assertTrue(info["fromDivisionUnknown"])
  self.assertEqual(info["currentRecordAtFirstDetection"]["gp"],4)
  self.assertEqual(len(info["opponentsFacedAtFirstDetection"]),4)
  self.assertEqual(info["previousWinter"]["division"],"Maple Hyundai")
  self.assertEqual(info["bravesHistoryAtFirstDetection"]["bravesAllTime"]["gp"],10)
 def test_repeat_same_source_not_duplicate_events(self):
  base_doc=base();base_doc.pop("movementLedger",None)
  accepted=m.enrich(base_doc,base_doc,historical())
  later=m.enrich(accepted,current(accepted),historical())
  self.assertEqual(later["movementLedger"]["eventsRecorded"],2)
  self.assertEqual(later["movementLedger"]["incomingCristilloEventsRecorded"],1)
 def test_move_any_team_between_full_divisions(self):
  base_doc=base();base_doc.pop("movementLedger",None)
  old=m.enrich(base_doc,base_doc,historical())
  new=current(old)
  team=next(x for x in new["teams"] if x["leagueName"]=="Big Bastones")
  team["divisionNow"]="Remax Division"
  doc=m.enrich(old,new,historical())
  self.assertEqual(doc["movementLedger"]["eventsRecorded"],3)
  event=doc["movementLedger"]["events"][-1]
  self.assertEqual((event["fromDivision"],event["toDivision"]),
                   (m.CRISTILLO,"Remax Division"))
  self.assertEqual(event["sourceBasis"],"TWO_FULL_OFFICIAL_SVHL_LEAGUE_SNAPSHOTS")
  self.assertEqual(event["leagueName"],"Big Bastones")
 def test_new_incoming_team_from_known_division_gets_both_names(self):
  base_doc=base();base_doc.pop("movementLedger",None)
  old=m.enrich(base_doc,base_doc,historical())
  new=current(old)
  team=next(x for x in new["teams"] if x["leagueName"]=="Mighty Drunks")
  team["divisionNow"]=m.CRISTILLO
  doc=m.enrich(old,new,historical())
  event=doc["movementLedger"]["events"][-1]
  self.assertEqual(event["eventType"],"OBSERVED_DIVISION_TRANSFER")
  self.assertEqual(event["fromDivision"],"Remax Division")
  self.assertEqual(event["toDivision"],m.CRISTILLO)
  self.assertEqual(doc["movementLedger"]["incomingCristilloReports"][-1]["leagueName"],"Mighty Drunks")
 def test_disappearing_league_team_is_archived_without_erasing_results(self):
  base_doc=base();base_doc.pop("movementLedger",None)
  old=m.enrich(base_doc,base_doc,historical())
  new=current(old)
  t=next(x for x in new["teams"] if x["leagueName"]=="Big Bastones")
  new["teams"]=[x for x in new["teams"] if x["leagueName"]!="Big Bastones"]
  doc=m.enrich(old,new,historical())
  archived=doc["movementLedger"]["previouslyTrackedTeams"]
  self.assertEqual(len(archived),1)
  self.assertEqual(archived[0]["sourceTeamId"],t["sourceTeamId"])
  self.assertEqual(archived[0]["recordLastSeen"]["gp"],t["record"]["gp"])
  self.assertEqual(archived[0]["completedGames"],t["completedGames"])
  self.assertEqual(doc["movementLedger"]["events"][-1]["eventType"],"LEFT_CURRENT_LEAGUE_DIRECTORY")
 def test_same_id_cannot_be_renamed_as_new_franchise(self):
  baseline=base();baseline.pop("movementLedger",None)
  old=m.enrich(baseline,baseline,historical())
  new=current(old)
  next(x for x in new["teams"] if x["leagueName"]=="Big Bastones")["leagueName"]="Unknown"
  with self.assertRaisesRegex(m.MovementHold,"SAME_SVHL_TEAM_ID_CHANGED_NAME"):
   m.enrich(old,new,historical())
 def test_backdated_source_does_not_replace_accepted_history(self):
  baseline=base();baseline.pop("movementLedger",None)
  old=m.enrich(baseline,baseline,historical())
  newer=current(old,-3)
  with self.assertRaisesRegex(m.MovementHold,"OLDER_LEAGUE_SNAPSHOT"):
   m.enrich(old,newer,historical())
 def test_unverified_earlier_source_baseline_refused(self):
  doc=base();doc.pop("movementLedger",None)
  bad=historical();bad["sourceCommit"]="unverified"
  with self.assertRaisesRegex(m.MovementHold,"UNVERIFIED_HISTORICAL_CRISTILLO_BASELINE"):
   m.enrich(doc,doc,bad)
 def test_formerly_departed_team_can_return_without_erasing_the_exit(self):
  from check_svhl_league_intelligence import verify
  baseline=base();baseline.pop("movementLedger",None)
  accepted=m.enrich(baseline,baseline,historical())
  absent=current(accepted)
  absent["teams"]=[x for x in absent["teams"] if x["leagueName"]!="Big Bastones"]
  after_exit=m.enrich(accepted,absent,historical())
  later=current(after_exit)
  previous=next(x for x in accepted["teams"] if x["leagueName"]=="Big Bastones")
  later["teams"].append(deepcopy(previous))
  restored=m.enrich(after_exit,later,historical())
  # Source publisher also adds the trend ledger before independent validation.
  from track_svhl_strength_trends import enrich as enrich_trends
  restored=enrich_trends(accepted,restored)
  from build_svhl_weekly_strength import enrich as enrich_weekly
  restored=enrich_weekly(accepted,restored)
  ledger=restored["movementLedger"]
  self.assertEqual(ledger["departedTeamProfilesRetained"],1)
  self.assertEqual(ledger["previouslyTrackedTeams"][0]["leagueName"],"Big Bastones")
  self.assertEqual(ledger["events"][-1]["eventType"],"ENTERED_CURRENT_LEAGUE_DIRECTORY")
  self.assertEqual(ledger["events"][-2]["eventType"],"LEFT_CURRENT_LEAGUE_DIRECTORY")
  self.assertEqual(verify(restored,now=datetime.fromisoformat(restored["asOf"].replace("Z","+00:00"))+timedelta(minutes=1))["status"],"SVHL_ALL_DIVISIONS_PUBLIC_PARITY_PASS")
if __name__=="__main__":unittest.main(verbosity=2)
