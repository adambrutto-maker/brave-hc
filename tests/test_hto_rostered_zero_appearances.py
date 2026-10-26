"""Private workbook/HTO official roster zero-appearance source QA."""
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import importlib.util,json,os,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("rostered",ROOT/"scripts"/"enrich_hto_rostered_zero_appearances.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
FEED=Path(os.environ.get("HOCKEYOS_PRIVATE_FIVE_GAME_FEED",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\261017_HTO_Verified_GameLevel_Skater_Attendance.json"))
STAGE=Path(os.environ.get("HOCKEYOS_PRIVATE_ROSTER_COVERAGE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\Player_Actuals_With_Qualified_Zero_Appearances_PRIVATE.json"))
AVAILABLE=FEED.exists() and STAGE.exists()
def fixture():
 actual=json.loads((ROOT/"widgets"/"player-actuals.json").read_text(encoding="utf8"))
 feed=json.loads(FEED.read_text(encoding="utf8"))
 model=json.loads((ROOT/"widgets"/"projection.json").read_text(encoding="utf8"))
 roster={p["name"]:{"position":"LW","jerseyNo":p["number"]} for p in model["players"]}
 roster.update({x:{"position":"G","jerseyNo":"0"} for x in feed["goalieGameTotals"]})
 return actual,feed,model,roster
class RosterSourceQA(unittest.TestCase):
 def test_captain_suffix_is_identity_safe(self):
  self.assertEqual(m.canonical_name("Brutto, Adam - Captain"),"Brutto, Adam")
  self.assertEqual(m.canonical_name("Saindon, Stephane - Asst. Capt."),"Saindon, Stephane")
  self.assertEqual(m.canonical_name("Congiusti, Marco"),"Congiusti, Marco")
 def test_invalid_roster_identity_is_refused(self):
  with self.assertRaises(m.SourceHold):m.canonical_name("Someone Random")
 @unittest.skipUnless(AVAILABLE,"private verified five-game source unavailable")
 def test_current_exact_rostered_zero(self):
  actual,feed,model,roster=fixture()
  result=m.qualify(actual,feed,model,roster)
  qualified=result["rosterCoverage"]
  self.assertEqual(result["playerCount"],20)
  self.assertEqual(qualified["rosterCount"],25)
  self.assertEqual(qualified["observedGoalies"],3)
  self.assertEqual(qualified["rosteredWithoutRecordedAppearance"],[
   {"name":"Congiusti, Marco","gp":0,"g":0,"a":0,"pts":0,"classification":"FT","jerseyNo":"3","evidence":"Rostered on HTO; no recorded appearance in all completed HTO games"},
   {"name":"Mazzei, Stefano","gp":0,"g":0,"a":0,"pts":0,"classification":"CU","jerseyNo":"88","evidence":"Rostered on HTO; no recorded appearance in all completed HTO games"}])
  self.assertEqual(result["players"],actual["players"],"roster qualification must not change official source skater statistics")
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_removed_current_rostered_player_is_held(self):
  actual,feed,model,roster=fixture();del roster["Congiusti, Marco"]
  with self.assertRaisesRegex(m.SourceHold,"ROSTER_COVERAGE"):m.qualify(actual,feed,model,roster)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_unverified_orphan_game_stats_are_held(self):
  actual,feed,model,roster=fixture();actual["players"][0]["name"]="Unverified, Example"
  with self.assertRaisesRegex(m.SourceHold,"SCORER_ATTENDANCE"):m.qualify(actual,feed,model,roster)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_changed_workbook_classification_is_held(self):
  actual,feed,model,roster=fixture()
  next(p for p in model["players"] if p["name"]=="Mazzei, Stefano")["rosterStatus"]="DI"
  with self.assertRaisesRegex(m.SourceHold,"MODEL_ROSTER_ABSENCE"):m.qualify(actual,feed,model,roster)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_source_not_fresh_is_held(self):
  actual,feed,model,roster=fixture()
  feed["sourceReadback"]=(datetime.now(timezone.utc)-timedelta(days=6)).isoformat()
  with self.assertRaisesRegex(m.SourceHold,"SOURCES_STALE"):m.qualify(actual,feed,model,roster)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_a_newly_played_player_disappears_from_zero_group(self):
  actual,feed,model,roster=fixture()
  participant="Mazzei, Stefano"
  feed["games"][-1]["skaters"].append({"name":participant,"gp":1,"g":0,"a":0,"pts":0})
  actual["players"].append({"name":participant,"gp":1,"g":0,"a":0,"pts":0})
  actual["playerCount"]+=1
  model["workbookPlayersAbsentFromHTO"].remove(participant)
  result=m.qualify(actual,feed,model,roster)
  self.assertEqual([p["name"] for p in result["rosterCoverage"]["rosteredWithoutRecordedAppearance"]],["Congiusti, Marco"])
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_private_stage_preserves_actual_stats(self):
  source=json.loads((ROOT/"widgets"/"player-actuals.json").read_text(encoding="utf8"))
  staged=json.loads(STAGE.read_text(encoding="utf8"))
  self.assertEqual(source["players"],staged["players"])
  self.assertEqual(source["teamGP"],staged["teamGP"])
  self.assertEqual(staged["rosterCoverage"]["status"],"SOURCE_QUALIFIED_NO_RECORDED_APPEARANCES")
if __name__=="__main__":unittest.main(verbosity=2)
