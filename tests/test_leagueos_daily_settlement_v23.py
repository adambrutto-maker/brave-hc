"""LeagueOS V23: post-settlement source guard tests (never network)."""
from __future__ import annotations
import importlib.util,sys,unittest,io,json
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from collect_leagueos_settled_delta_v23 import day_check,main,SCHEMA,REG
from collect_leagueos_settled_delta_v23 import need
EXAMPLE={"league_id":568,"game_id":128222,"date":"2026-11-17","time":"20:00",
  "home_team_id":13667,"away_team_id":13623,"home":"Shockers","away":"Rebels"}
def leaf_good(f,side):
 if side=="home":return {"side":"home","status":"SOURCE_RESULT_PRESENT","teamId":f["home_team_id"],
  "goals":4,"against":3,"source":"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=568&teamid=13667&page_type=Adult",
  "sha256":"a"*64}
 return {"side":"away","status":"SOURCE_RESULT_PRESENT","teamId":f["away_team_id"],
  "goals":3,"against":4,"source":"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=568&teamid=13623&page_type=Adult",
  "sha256":"b"*64}
class TestDailySettlement(unittest.TestCase):
 def test_two_confirmations_required(self):
  with patch("collect_leagueos_settled_delta_v23.leaf",side_effect=leaf_good):
   c=day_check(EXAMPLE)
  self.assertEqual(c["state"],"VERIFIED")
  self.assertEqual(c["evidence"]["recipientCoverage"],"RECIPROCAL_TEAM_SCHEDULES_VERIFIED")
  self.assertEqual(c["evidence"]["homeGoals"],4)
  self.assertEqual(c["evidence"]["awayGoals"],3)
  self.assertEqual(c["evidence"]["sourceURLs"][0].startswith("https://"),True)
 def test_one_sided_source_is_held(self):
  def missing(f,side):
   if side=="away":return {"side":"away","status":"MISSING_OR_AMBIGUOUS_SCHEDULE"}
   return leaf_good(f,side)
  with patch("collect_leagueos_settled_delta_v23.leaf",side_effect=missing):
   c=day_check(EXAMPLE)
  self.assertEqual(c["state"],"HOLD")
  self.assertIn("MISSING_OR_AMBIGUOUS_SCHEDULE",c["reasons"])
 def test_zero_zero_is_not_a_final_score(self):
  def zero(f,side):
   d=leaf_good(f,side)
   d.update({"goals":0,"against":0,"status":"UNSETTLED_ZERO_ZERO"})
   return d
  with patch("collect_leagueos_settled_delta_v23.leaf",side_effect=zero):
   c=day_check(EXAMPLE)
  self.assertEqual(c["state"],"HOLD")
 def test_conflicting_reciprocal_goal_totals_are_held(self):
  def wrong(f,side):
   d=leaf_good(f,side)
   if side=="away":d["against"]=5
   return d
  with patch("collect_leagueos_settled_delta_v23.leaf",side_effect=wrong):
   c=day_check(EXAMPLE)
  self.assertEqual(c["state"],"HOLD")
  self.assertIn("RECIPROCAL_GOAL_CONFLICT",c["reasons"])
 def test_remote_errors_cannot_publish(self):
  with patch("collect_leagueos_settled_delta_v23.leaf",side_effect=ConnectionError("HTTP 503")):
   c=day_check(EXAMPLE)
  self.assertEqual(c["state"],"HOLD")
 def test_before_season_future_games_daily_gate_is_a_noop(self):
  self.assertTrue(REG.exists())
  with patch.object(sys,"argv",["collect","--asof","2026-09-01","--max-workers","4"]):
   with redirect_stdout(io.StringIO()) as out:
    main()
  result=json.loads(out.getvalue())
  self.assertEqual(result["state"],"NO_DUE_FIXTURES")
  self.assertEqual(result["verifiedNewGameCount"],0)
  self.assertFalse(result["publishedFileChanged"])
if __name__=="__main__":unittest.main()
