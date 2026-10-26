"""Offline source-health receipt regression and fail-closed alerts."""
from datetime import datetime,timedelta,timezone
from pathlib import Path
from copy import deepcopy
import importlib.util,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("health",ROOT/"scripts"/"hockeyos_hourly_source_health.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
NOW=datetime(2026,10,26,15,15,tzinfo=timezone.utc)
def fixtures():
 games=[]
 for gid,g,a,ga in zip((3356177,3356178,3369564,3375601,3375682),
                       (0,3,2,1,6),(0,6,4,2,7),(3,6,3,7,4)):
  games.append({"htoGameId":gid,"teamGoals":g,"teamGoalsAgainst":ga,
                "skaters":[{"g":g,"a":a}],"goalies":[{"goalsAgainst":ga}]})
 controller={"started":(NOW-timedelta(minutes=22)).isoformat(),
             "finished":(NOW-timedelta(minutes=21)).isoformat(),
             "allStagesSuccessful":True,
             "stages":{key:{"outcome":"PASS"} for key in mod.STAGES}}
 feed={"schema":"brave-hc-hto-verified-game-feed/v1",
       "sourceValidationState":"PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS",
       "playerAggregateParity":True,"allGamesDiscovered":True,
       "sourceReadback":(NOW-timedelta(minutes=22)).isoformat(),
       "teamGP":5,"teamG":12,"teamA":19,"games":games}
 return controller,feed
class HealthQA(unittest.TestCase):
 def test_complete_source_is_healthy(self):
  c,f=fixtures()
  self.assertEqual(mod.source_contract(c,f,NOW)["stagesPassed"],8)
 def test_stage_failure_blocks_acceptance(self):
  c,f=fixtures();c["stages"]["reconcile_game_boxes"]["outcome"]="FAILED"
  with self.assertRaisesRegex(mod.Hold,"CONTROLLER_STAGE_FAILED_reconcile_game_boxes"):
   mod.source_contract(c,f,NOW)
 def test_source_age_over_one_hundred_minutes_holds(self):
  c,f=fixtures();c["started"]=(NOW-timedelta(minutes=141)).isoformat();c["finished"]=(NOW-timedelta(minutes=140)).isoformat()
  with self.assertRaisesRegex(mod.Hold,"CONTROLLER_RESULT_STALE"):
   mod.source_contract(c,f,NOW)
 def test_missing_first_five_game_id_holds(self):
  c,f=fixtures();f["games"][0]["htoGameId"]=99999
  with self.assertRaisesRegex(mod.Hold,"HTO_COMPLETED_GAMES_SOURCE_MISMATCH"):
   mod.source_contract(c,f,NOW)
 def test_game_goalie_source_mismatch_holds(self):
  c,f=fixtures();f["games"][0]["goalies"][0]["goalsAgainst"]=4
  with self.assertRaisesRegex(mod.Hold,"GOALIE_GAME_GOALS_AGAINST_MISMATCH"):
   mod.source_contract(c,f,NOW)
 def test_fictitious_sixth_requires_completed_source_contract(self):
  c,f=fixtures()
  f["games"].append({"htoGameId":9900001,"teamGoals":1,"teamGoalsAgainst":0,
                     "skaters":[{"g":1,"a":1}],"goalies":[{"goalsAgainst":0}]})
  f["teamGP"]=6;f["teamG"]=13;f["teamA"]=20
  self.assertEqual(mod.source_contract(c,f,NOW)["sourceGames"],6)
 def test_missing_stage_holds(self):
  c,f=fixtures();del c["stages"]["hot_stove_drafts"]
  with self.assertRaisesRegex(mod.Hold,"CONTROLLER_STAGE_SET_CHANGED"):
   mod.source_contract(c,f,NOW)
if __name__=="__main__":unittest.main(verbosity=2)
