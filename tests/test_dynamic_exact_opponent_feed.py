"""Dynamic private-source -> public exact-match HTO opponent release checks."""
from copy import deepcopy
from datetime import datetime,timezone
from pathlib import Path
import importlib.util,json,os,re,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("dyna",ROOT/"scripts"/"build_dynamic_exact_opponent_feed.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
PRIV=Path(os.environ.get("HOCKEYOS_PRIVATE_INTELLIGENCE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence"))
EV=Path(os.environ.get("HOCKEYOS_PRIVATE_HTO_EVIDENCE",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0"))
FILES=(PRIV/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json",
       PRIV/"HTO_Completed_Scores_PRIVATE_LATEST.json",
       EV/"261016_HTO_SVHL_Latest_Readback.json",
       EV/"261017_HTO_Verified_GameLevel_Skater_Attendance.json",
       ROOT/"widgets"/"standings.json")
AVAILABLE=all(x.exists() for x in FILES)
def read():return [json.loads(x.read_text(encoding="utf-8-sig")) for x in FILES]
def add_sixth(data,opponent="Mid Ice Crisis"):
 master,scores,stats,verified,league=deepcopy(data)
 latest={"htoGameId":3399999,"date":"2026-10-26","season":"W2026/27",
         "gameType":"Regular Season","opponentExact":opponent,"gf":2,"ga":1,
         "result":"W","sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=3399999&p=boxscore"}
 scores["games"].insert(0,latest);scores["sourceGamesCount"]=6
 for page in stats["pages"]:
  if page["name"]=="hto_stats":
   page["text"],n=re.subn(r"(TEAM STATS\s+GP\s+GF\s+GA\s+PPO\s+PK%\s+)5\s+12\s+23\b",
                            r"\g<1>6 14 24",page["text"])
   if n!=1:raise AssertionError("SOURCE_STATS_SYNTHETIC_PATTERN_CHANGED")
 return master,scores,stats,verified,league
class DynamicOpponentQA(unittest.TestCase):
 @unittest.skipUnless(AVAILABLE,"protected source files not available")
 def test_current_real_five_games_match_public_feed(self):
  r=mod.build(*read())
  pub=json.loads((ROOT/"widgets"/"opponent-intelligence.json").read_text(encoding="utf8"))
  names={x["name"]:x for x in r["teams"]}
  self.assertEqual(r["coverage"],pub["coverage"])
  self.assertEqual(names["Big Bastones"]["regularSeason"],{"gp":7,"w":4,"l":2,"t":1,"gf":24,"ga":27})
  self.assertEqual(r["coverage"]["sourceQualifiedOpponents"],4)
  self.assertTrue(r["publishable"])
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_sixth_game_auto_admits_verified_exact_name_without_new_code(self):
  data=add_sixth(read())
  r=mod.build(*data)
  self.assertEqual(r["coverage"]["currentSeasonGames"],6)
  names={x["name"]:x for x in r["teams"]}
  self.assertEqual(names["Mid Ice Crisis"]["regularSeason"],{"gp":6,"w":2,"l":2,"t":2,"gf":15,"ga":20})
  self.assertEqual(names["Mid Ice Crisis"]["lastFive"][-1]["date"],"2026-10-26")
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_new_game_under_unreviewed_alias_stays_withheld(self):
  r=mod.build(*add_sixth(read(),"Sugo Sundays"))
  name={x["name"]:x for x in r["teams"]}
  self.assertEqual(name["Sugo Sundays"]["verification"],"ALIAS_REVIEW_REQUIRED")
  self.assertNotIn("regularSeason",name["Sugo Sundays"])
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_incorrect_sixth_source_goals_fail_closed(self):
  data=add_sixth(read())
  data[1]["games"][0]["ga"]=3
  with self.assertRaisesRegex(mod.SourceHold,"HTO_SCORE_VS_STATS"):mod.build(*data)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_unexpected_division_name_fails_closed(self):
  data=read();data[4]["teams"][0]["name"]="Unknown Franchise"
  with self.assertRaisesRegex(mod.Hold,"DIVISION_TEAM_NAME_SCOPE"):mod.build(*data)
 @unittest.skipUnless(AVAILABLE,"private source unavailable")
 def test_master_history_source_hash_drift_held(self):
  data=read();data[0]["source"]["sha256"]="wrong"
  with self.assertRaisesRegex(mod.SourceHold,"HASH"):mod.build(*data)
if __name__=="__main__":unittest.main(verbosity=2)
