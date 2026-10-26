"""League context index source/math/identity regression tests.

These are descriptive current-game comparisons, NOT game outcomes or
calibrated predictions. Future source updates must preserve arithmetic.
"""
from copy import deepcopy
from pathlib import Path
import importlib.util,sys,json,unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("context",ROOT/"scripts"/"model_svhl_schedule_strength.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SOURCE=ROOT/"widgets"/"league-intelligence.json"
def current():return json.loads(SOURCE.read_text(encoding="utf8"))
class StrengthSourceQA(unittest.TestCase):
 def test_all_27_source_teams_validly_contextualized(self):
  old=current();new=m.calculate(old)
  self.assertEqual(new["strengthModel"]["schema"],m.VERSION)
  self.assertFalse(new["strengthModel"]["probabilityOfWinning"])
  self.assertTrue(new["strengthModel"]["bravesHistoricalHeadToHeadExcluded"])
  self.assertEqual(len(new["teams"]),len(old["teams"]))
  competitive={v["name"] for v in old["divisions"] if v["competitive"]}
  expected=sum(x["divisionNow"] in competitive and x["record"]["gp"]>=1 for x in old["teams"])
  self.assertEqual(new["strengthModel"]["eligibleTeams"],expected)
  self.assertEqual(sum(x["strengthContext"]["rank"] is not None for x in new["teams"]),expected)
  self.assertEqual(sorted(x["strengthContext"]["rank"] for x in new["teams"] if x["strengthContext"]["rank"] is not None),list(range(1,expected+1)))
  self.assertEqual(len(old["teams"]),len(new["teams"]))
  self.assertEqual([{k:v for k,v in x.items() if k!="strengthContext"} for x in new["teams"]],
                   [{k:v for k,v in x.items() if k!="strengthContext"} for x in old["teams"]])
 def test_displayed_metrics_are_exactly_recalculated_from_league_records(self):
  data=current();calculated=m.calculate(data)
  self.assertEqual(data["strengthModel"],calculated["strengthModel"])
  for observed,new in zip(data["teams"],calculated["teams"]):
   self.assertEqual(observed["strengthContext"],new["strengthContext"])
 def test_all_score_components_bounded_and_prior_authorized(self):
  data=current()
  for x in data["teams"]:
   score=x["strengthContext"]
   if x["record"]["gp"]==0:self.assertIsNone(score["contextIndex"]);continue
   for key in ("contextIndex","currentForm","scheduleDifficulty"):
    self.assertGreaterEqual(score[key],0)
    self.assertLessEqual(score[key],100)
   self.assertIn(score["confidence"],("EARLY_SAMPLE","LIMITED_SAMPLE","LARGER_SAMPLE"))
   if x["previousWinter"] is None:
    self.assertIsNone(score["priorWinterForm"])
    self.assertEqual(score["weights"]["previousWinterForm"],0)
   else:
    self.assertEqual(x["previousWinter"]["association"],"ROSTER_ID_CONTINUITY_CONFIRMED")
    self.assertEqual(score["weights"]["previousWinterForm"],0.15)
    self.assertIsNotNone(score["priorWinterForm"])
   self.assertAlmostEqual(sum(score["weights"].values()),1)
 def test_direct_mutual_result_excluded_from_opponent_strength(self):
  a={"leagueName":"A","completedGames":[{"opponent":"B","result":"W"}]}
  b={"leagueName":"B","record":{"gp":1,"w":0,"l":1,"t":0}}
  self.assertEqual(m.opposition(a,{"A":a,"B":b}),50)
  a["completedGames"][0]["result"]="L"
  b["record"]={"gp":1,"w":1,"l":0,"t":0}
  self.assertEqual(m.opposition(a,{"A":a,"B":b}),50)
 def test_unexpected_opponent_game_source_is_not_used(self):
  a={"leagueName":"A","completedGames":[{"opponent":"B","result":"W"}]}
  b={"leagueName":"B","record":{"gp":1,"w":1,"l":0,"t":0}}
  with self.assertRaisesRegex(ValueError,"OPPONENT_LEAVE_ONE_OUT_SCORE_CONFLICT"):
   m.opposition(a,{"A":a,"B":b})
 def test_zero_current_games_means_unrated_not_neutral_fifty(self):
  j=current()
  team=next(t for t in j["teams"] if t["divisionNow"]=="The Cristillo Division")
  team["record"]={"gp":0,"w":0,"l":0,"t":0,"pts":0,"gf":0,"ga":0}
  team["completedGames"]=[];team["gamesConfirmed"]=0
  with self.assertRaisesRegex(ValueError,"OPPONENT_"):
   m.calculate(j)
  # A completely standalone zero-game team would have no match opponents.
  for t in j["teams"]:
   t["completedGames"]=[];t["gamesConfirmed"]=0
   t["record"]={"gp":0,"w":0,"l":0,"t":0,"pts":0,"gf":0,"ga":0}
  result=m.calculate(j)
  self.assertTrue(all(t["strengthContext"]["contextIndex"] is None for t in result["teams"]))
  self.assertEqual(result["strengthModel"]["eligibleTeams"],0)
 def test_historical_brave_head_to_head_never_influences_score(self):
  j=current()
  source=next(t for t in j["teams"] if t["leagueName"]=="Maplewolves")
  before=m.calculate(j)
  source["bravesMatchHistory"]={"state":"SOURCE_VERIFIED_H2H",
      "bravesAllTime":{"gp":999,"w":999,"l":0,"t":0,"gf":999,"ga":0}}
  after=m.calculate(j)
  self.assertEqual(before["strengthModel"],after["strengthModel"])
  self.assertEqual([x["strengthContext"] for x in before["teams"]],
                   [x["strengthContext"] for x in after["teams"]])
 def test_no_unqualified_2025_winter_identity_can_enter_scoring(self):
  j=current();team=next(t for t in j["teams"] if t["previousWinter"] is not None)
  team["previousWinter"]["association"]="NAME_ONLY_GUESS"
  with self.assertRaisesRegex(ValueError,"UNSUPPORTED_PREVIOUS_SEASON_IDENTITY"):
   m.calculate(j)
 def test_goal_landslide_still_bounded_by_shrunk_goal_context(self):
  self.assertGreaterEqual(m.goal_fraction(0,100,1),0)
  self.assertLessEqual(m.goal_fraction(100,0,1),1)
  self.assertLessEqual(m.form({"gp":1,"w":1,"l":0,"t":0,"gf":100,"ga":0}),100)
 def test_source_name_or_ids_cannot_duplicate(self):
  j=current();j["teams"][1]["sourceTeamId"]=j["teams"][0]["sourceTeamId"]
  with self.assertRaisesRegex(ValueError,"DUPLICATE_TEAM_IDENTITY"):
   m.calculate(j)
if __name__=="__main__":unittest.main(verbosity=2)
