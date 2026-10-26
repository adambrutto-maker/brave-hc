"""Provisional five-game forecast release checks; private Excel source optional in CI."""
from copy import deepcopy
from pathlib import Path
import importlib.util,json,os,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("scenario",ROOT/"scripts"/"verify_hto_five_game_scenario.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
BOOK=Path(os.environ.get("HOCKEYOS_CANONICAL_MASTER",r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx"))
FEED=Path(os.environ.get("HOCKEYOS_FIVE_GAME_VERIFIED_FEED",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Five_Game_Projection_Disposable\evidence\261017_HTO_Verified_GameLevel_Skater_Attendance.json"))
AVAILABLE=BOOK.exists() and FEED.exists()
def fixtures():
 return (json.loads((ROOT/"widgets"/"projection.json").read_text(encoding="utf8")),
         json.loads((ROOT/"widgets"/"player-actuals.json").read_text(encoding="utf8")),
         json.loads(FEED.read_text(encoding="utf8")))
class TestProvisionalModel(unittest.TestCase):
 @unittest.skipUnless(AVAILABLE,"historical private workbook and verified HTO source unavailable")
 def test_exact_original_workbook_5game_source(self):
  model,actual,verified=fixtures()
  result=module.validate(model,actual,verified,BOOK)
  self.assertEqual(result["state"],"HTO_FIVE_GAME_PROVISIONAL_FORECAST_SOURCE_ACCEPTED")
  self.assertEqual(result["totalProjectedPoints"],181)
  self.assertFalse(result["publishedAsCurrent"])
  self.assertEqual(result["workbookParity"]["mismatches"],0)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_forced_current_falsehood_is_blocked(self):
  model,actual,verified=fixtures();model["modelCurrent"]=True
  with self.assertRaisesRegex(module.ModelHold,"SCENARIO_MUST_NOT_CLAIM"):module.validate(model,actual,verified,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_workbook_threshold_drift_is_blocked(self):
  model,actual,verified=fixtures()
  model["conditionalFormatting"]["arrowIconSet"]["thresholds"]["AB100"]=0
  with self.assertRaisesRegex(module.ModelHold,"THRESHOLD_DRIFT_AB100"):module.validate(model,actual,verified,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_replayed_formula_mismatch_is_blocked(self):
  model,actual,verified=fixtures();model["modelParity"]["mismatches"]=1
  with self.assertRaisesRegex(module.ModelHold,"21_ROW_PARITY"):module.validate(model,actual,verified,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_wrong_player_actual_is_blocked(self):
  model,actual,verified=fixtures()
  model["players"][0]["currentG"]=999
  with self.assertRaisesRegex(module.ModelHold,"ACTUALS_IN_FORECAST_NOT_EQUAL"):module.validate(model,actual,verified,BOOK)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_unapproved_extra_player_is_blocked(self):
  model,actual,verified=fixtures()
  model["unclassifiedHTOPlayers"]=["Unreviewed, Someone"]
  with self.assertRaisesRegex(module.ModelHold,"UNCLASSIFIED_CURRENT_HTO_PLAYER"):module.validate(model,actual,verified,BOOK)
if __name__=="__main__":unittest.main(verbosity=2)
