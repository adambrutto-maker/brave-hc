"""Daily publisher safety: no silently vanished source-qualified SVHL result."""
from copy import deepcopy
from pathlib import Path
import importlib.util,json,unittest,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
spec=importlib.util.spec_from_file_location("publish",ROOT/"scripts"/"publish_svhl_league_intelligence.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
doc=json.loads((ROOT/"widgets"/"league-intelligence.json").read_text(encoding="utf8"))
class PublisherQA(unittest.TestCase):
 def test_identical_snapshot_no_change_allowed(self):
  self.assertTrue(m.monotonic(deepcopy(doc),deepcopy(doc)))
 def test_division_transfer_does_not_erase_completed_games(self):
  incoming=deepcopy(doc);x=next(t for t in incoming["teams"] if t["leagueName"]=="Maplewolves")
  x["divisionNow"]="Remax Division"
  self.assertTrue(m.monotonic(doc,incoming))
 def test_new_qualified_extra_game_can_be_added(self):
  newer=deepcopy(doc);a=next(t for t in newer["teams"] if t["leagueName"]=="Maplewolves")
  a["record"]["gp"]+=1;a["record"]["w"]+=1;a["record"]["pts"]+=2
  a["record"]["gf"]+=2;a["record"]["ga"]+=1
  a["gamesConfirmed"]+=1
  a["completedGames"].append({"date":"2026-11-01","opponent":"Zamboner Crew",
      "opponentCurrentDivision":"The Cristillo Division","gf":2,"ga":1,"result":"W"})
  self.assertTrue(m.monotonic(doc,newer))
 def test_original_official_game_can_not_disappear(self):
  newer=deepcopy(doc);a=next(t for t in newer["teams"] if t["leagueName"]=="Maplewolves")
  a["completedGames"]=a["completedGames"][1:]
  with self.assertRaisesRegex(m.Hold,"PREVIOUSLY_CONFIRMED_MATCHUP_CHANGED"):
   m.monotonic(doc,newer)
 def test_original_game_score_can_not_be_overwritten(self):
  newer=deepcopy(doc);a=next(t for t in newer["teams"] if t["leagueName"]=="Maplewolves")
  a["completedGames"][0]["gf"]=12
  with self.assertRaisesRegex(m.Hold,"PREVIOUSLY_CONFIRMED_MATCHUP_CHANGED"):
   m.monotonic(doc,newer)
 def test_same_official_team_id_must_keep_its_original_name(self):
  newer=deepcopy(doc);a=next(t for t in newer["teams"] if t["leagueName"]=="Maplewolves")
  a["leagueName"]="Invented Rename"
  with self.assertRaisesRegex(m.Hold,"SOURCE_TEAM_ID_REASSIGNED"):
   m.monotonic(doc,newer)
 def test_full_league_team_departure_does_not_relabel_others(self):
  newer=deepcopy(doc)
  newer["teams"]=[t for t in newer["teams"] if t["leagueName"]!="Maplewolves"]
  self.assertTrue(m.monotonic(doc,newer))
 def test_league_source_season_id_cannot_change(self):
  newer=deepcopy(doc);newer["leagueId"]=571
  with self.assertRaisesRegex(m.Hold,"LEAGUE_IDENTITY_RESET"):
   m.monotonic(doc,newer)
if __name__=="__main__":unittest.main(verbosity=2)
