"""Read-only source-derived HTO game-ID / Master calendar QA."""
from copy import deepcopy
from datetime import date
from pathlib import Path
import importlib.util,json,unittest,os
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("identity",ROOT/"scripts"/"plan_date_bound_hto_game_ids.py")
identity=importlib.util.module_from_spec(spec);spec.loader.exec_module(identity)
BOOK=Path(os.environ.get("HOCKEYOS_CANONICAL_MASTER",r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx"))
SCORES=Path(os.environ.get("HOCKEYOS_CURRENT_SCORES",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\HTO_Completed_Scores_PRIVATE_LATEST.json"))
AVAILABLE=BOOK.exists() and SCORES.exists()
def evidence():return json.loads(SCORES.read_text(encoding="utf8"))
def simulated_sixth(name="Mid Ice Crisis"):
 source=deepcopy(evidence())
 source["games"].insert(0,{"htoGameId":3375683,"date":"2026-11-01","season":"W2026/27",
                          "gameType":"Regular Season","opponentExact":name,"gf":2,"ga":1,"result":"W",
                          "sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3375683&p=boxscore"})
 source["sourceGamesCount"]=6
 return source
class CalendarMapQA(unittest.TestCase):
 @unittest.skipUnless(AVAILABLE,"private original Master Workbook and HTO Scores not on CI")
 def test_five_verified_completed_game_dates(self):
  slots=identity.calendar(BOOK)
  self.assertEqual(len(slots),24)
  self.assertEqual([r["masterGameNumber"] for r in slots[:6]],list(range(359,365)))
  result=identity.current_plan(slots,evidence(),today=date(2026,10,26))
  self.assertEqual(result["officialHTOGames"],5)
  self.assertEqual([g["masterGameNumber"] for g in result["mapping"]],list(range(359,364)))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_future_sixth_game_date_maps_from_original_calendar(self):
  result=identity.current_plan(identity.calendar(BOOK),simulated_sixth(),today=date(2026,11,2))
  mapped={r["htoGameId"]:r for r in result["mapping"]}
  self.assertEqual(mapped[3375683]["masterGameNumber"],364)
  self.assertEqual(mapped[3375683]["date"],"2026-11-01")
  self.assertFalse(mapped[3375683]["workbookCompletedFlag"])
  self.assertFalse(result["workbookWritten"])
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_upcoming_not_mistaken_as_completed(self):
  with self.assertRaisesRegex(identity.SourceHold,"FUTURE_GAME_NOT_YET_COMPLETED"):
   identity.current_plan(identity.calendar(BOOK),simulated_sixth(),today=date(2026,10,26))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_rescheduled_date_without_unique_slot_held(self):
  inp=simulated_sixth();inp["games"][0]["date"]="2026-11-02"
  with self.assertRaisesRegex(identity.SourceHold,"NOT_IN_MASTER_SCHEDULE"):
   identity.current_plan(identity.calendar(BOOK),inp,today=date(2026,11,3))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_prior_audited_score_change_held(self):
  inp=evidence();inp["games"][0]["gf"]=7;inp["games"][0]["result"]="W"
  with self.assertRaisesRegex(identity.SourceHold,"PREVIOUSLY_AUDITED_GAME_SOURCE_CHANGED"):
   identity.current_plan(identity.calendar(BOOK),inp,today=date(2026,10,26))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_same_date_cannot_be_mapped_twice(self):
  inp=simulated_sixth();inp["games"][0]["date"]="2026-10-25"
  with self.assertRaisesRegex(identity.SourceHold,"MORE_THAN_ONE_COMPLETED_GAME"):
   identity.current_plan(identity.calendar(BOOK),inp,today=date(2026,11,2))
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_foreign_boxscore_link_held(self):
  inp=evidence();inp["games"][0]["sourceUrl"]="https://example.com/scores?gameID=3375682"
  with self.assertRaisesRegex(identity.SourceHold,"SOURCE_URL_MISMATCH"):
   identity.current_plan(identity.calendar(BOOK),inp,today=date(2026,10,26))
 def test_fake_master_workbook_rejected_offline(self):
  from tempfile import TemporaryDirectory
  with TemporaryDirectory() as d:
   f=Path(d)/"fake.xlsx";f.write_bytes(b"unsafe fake")
   with self.assertRaisesRegex(identity.SourceHold,"HASH_NOT_ADMITTED"):
    identity.calendar(f)
if __name__=="__main__":unittest.main(verbosity=2)
