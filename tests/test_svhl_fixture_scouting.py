"""Read-only source compatibility tests for existing SVHL↔HTO schedule feed."""
from pathlib import Path
from datetime import datetime,date
import json,re,unittest
ROOT=Path(__file__).resolve().parents[1]/"widgets"
def read(name):return json.loads((ROOT/name).read_text(encoding="utf8"))
def norm(s):return re.sub(r"[^a-z0-9]","",s.casefold())
class FixtureScoutingQA(unittest.TestCase):
 def test_existing_reconciliation_source_is_accepted_not_recreated(self):
  doc=read("svhl-upcoming.json")
  self.assertEqual(doc["schema"],"brave-hc-svhl-schedule/v1")
  self.assertEqual(doc["source"],"https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY")
  stamp=datetime.fromisoformat(doc["checkedAt"])
  self.assertIsNotNone(stamp.tzinfo)
  self.assertIsInstance(doc["games"],list)
  self.assertIsInstance(doc["missingFixtureReviews"],list)
 def test_every_fixture_signature_is_consistent_and_unique(self):
  doc=read("svhl-upcoming.json");sigs=set()
  for g in doc["games"]:
   signature="|".join(str(g[k]) for k in ("date","time","opponent","rink","side"))
   self.assertEqual(g["fixtureSignature"],signature)
   self.assertNotIn(signature,sigs)
   sigs.add(signature)
   self.assertIn(g["side"],("home","away"))
   self.assertRegex(g["date"],r"^\d{4}-\d{2}-\d{2}$")
   self.assertRegex(g["time"],r"^\d{2}:\d{2}$")
   date.fromisoformat(g["date"])
 def test_verified_hto_game_id_is_linkable_only_for_verified_match(self):
  for g in read("svhl-upcoming.json")["games"]:
   if g["htoSyncStatus"]=="MATCH":
    self.assertRegex(str(g["htoGameId"]),r"^\d+$")
    self.assertEqual(g["assignmentKey"],"hto:"+str(g["htoGameId"]))
   else:
    # Never infer an HTO ID from a date and opponent name.
    self.assertNotEqual(g.get("htoSyncStatus"),"MATCH")
 def test_current_identity_mapping_has_unique_keys(self):
  teams=read("league-intelligence.json")["teams"]
  ids={}
  for t in teams:
   k=norm(t["leagueName"])
   self.assertNotIn(k,ids)
   ids[k]=t["sourceTeamId"]
  self.assertEqual(len(ids),len(teams))
 def test_first_observed_matched_fixture_is_real_source_not_prediction(self):
  doc=read("svhl-upcoming.json")
  for g in doc["games"]:
   self.assertNotIn("predictedScore",g)
   self.assertNotIn("winProbability",g)
   self.assertNotIn("projectedOutcome",g)
  if doc["games"] and doc["games"][0]["date"]=="2026-11-01":
   self.assertEqual(doc["games"][0]["opponent"],"Mid Ice Crisis")
   self.assertEqual(doc["games"][0]["htoGameId"],"3375683")
   self.assertEqual(doc["games"][0]["time"],"20:15")
 def test_no_invented_opponent_history_added_to_schedule_feed(self):
  doc=read("svhl-upcoming.json")
  for g in doc["games"]:
   self.assertNotIn("bravesHeadToHead",g)
   self.assertNotIn("contextIndex",g)
   self.assertNotIn("previousSeason",g)
if __name__=="__main__":unittest.main(verbosity=2)
