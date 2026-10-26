"""Public-source contracts for all-division Brave H.C. league intelligence."""
from copy import deepcopy
from pathlib import Path
from datetime import datetime,timezone
import importlib.util,unittest,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("league",ROOT/"scripts"/"build_svhl_league_intelligence_public.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
doc=json.loads((ROOT/"widgets"/"league-intelligence.json").read_text(encoding="utf8"))
class PublicSVHLLeagueQA(unittest.TestCase):
 def test_accepted_multi_division_release(self):
  self.assertEqual(doc["schema"],"brave-hc-league-intelligence/public-v1")
  self.assertEqual(doc["status"],"OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED")
  self.assertTrue(doc["currentSourceDataConcordant"])
  self.assertEqual(doc["currentDivisionCount"],sum(x["competitive"] for x in doc["divisions"]))
  self.assertEqual(doc["allPublishedDivisions"],len(doc["divisions"]))
  self.assertEqual(doc["currentLeagueTeamCount"],len(doc["teams"]))
  self.assertGreaterEqual(doc["verifiedReciprocalCompletedGames"],40)
  self.assertEqual(doc["priorSeasonRosterContinuityQualifiedCount"],
    sum(x["previousWinter"] is not None for x in doc["teams"]))
 def test_no_personal_roster_ids_or_source_workbook_paths(self):
  src=json.dumps(doc)
  self.assertNotIn('"playerIDs"',src)
  self.assertNotIn('D:\\\\BruTTech',src)
  self.assertTrue(doc["originalWorkbookWritten"] is False)
 def test_exact_season_current_game_records_reconcile(self):
  ids=[t["sourceTeamId"] for t in doc["teams"]]
  self.assertEqual(len(ids),len(set(ids)))
  self.assertEqual(sum(len(x["completedGames"]) for x in doc["teams"]),2*doc["verifiedReciprocalCompletedGames"])
  for t in doc["teams"]:
   self.assertEqual(t["record"]["gp"],len(t["completedGames"]),t["leagueName"])
   self.assertEqual(t["record"]["gp"],t["record"]["w"]+t["record"]["l"]+t["record"]["t"])
   self.assertEqual(t["record"]["gf"],sum(g["gf"] for g in t["completedGames"]))
   self.assertEqual(t["record"]["ga"],sum(g["ga"] for g in t["completedGames"]))
   self.assertTrue(all(g["gf"]+g["ga"]>0 for g in t["completedGames"]))
 def test_maplewolves_prior_division_history_kept_separate(self):
  team=next(t for t in doc["teams"] if t["leagueName"]=="Maplewolves")
  prior=team["previousWinter"]
  self.assertEqual(prior["division"],"Maple Hyundai")
  self.assertEqual(prior["record"],{"gp":24,"w":11,"l":10,"t":3,"pts":25,"gf":100,"ga":84})
  self.assertEqual(prior["officialRosterSharedIDs"],7)
  self.assertEqual(prior["association"],"ROSTER_ID_CONTINUITY_CONFIRMED")
  history=team["bravesMatchHistory"]["bravesAllTime"]
  self.assertGreaterEqual(history["gp"],10)
  self.assertGreaterEqual(history["w"],3)
  self.assertGreaterEqual(history["l"],6)
  self.assertGreaterEqual(history["t"],1)
  self.assertGreaterEqual(history["gf"],39)
  self.assertGreaterEqual(history["ga"],56)
 def test_maplewolves_first_four_cross_division_results(self):
  team=next(t for t in doc["teams"] if t["leagueName"]=="Maplewolves")
  matchups={(g["opponent"],g["result"],g["gf"],g["ga"]) for g in team["completedGames"]}
  expected={("Primary Auto","L",3,4),("Butcher Brothers","L",1,3),
            ("Mighty Drunks","L",2,6),("Young Guns","L",3,4)}
  self.assertTrue(expected.issubset(matchups))
  self.assertLessEqual(team["gamesVsTeamsNowInOtherDivisions"],team["record"]["gp"])
 def test_no_unverified_crossseason_team_history(self):
  for t in doc["teams"]:
   prior=t["previousWinter"]
   if prior:
    self.assertGreaterEqual(prior["officialRosterSharedIDs"],3)
    self.assertGreaterEqual(prior["rosterContinuityShare"],0.25)
   if t["bravesMatchHistory"]["state"]=="NO_VERIFIED_BRAVES_MATCH_HISTORY":
    self.assertNotIn("bravesAllTime",t["bravesMatchHistory"])
 def test_historical_brave_name_precedence(self):
  braves=next(x for x in doc["teams"] if x["leagueName"]=="Braves HC")
  self.assertEqual(braves["displayName"],"Brave H.C.")
  mohawks=next(x for x in doc["teams"] if x["leagueName"]=="Mohawks HC")
  self.assertEqual(mohawks["displayName"],"Mohawks H.C.")
  self.assertGreaterEqual(mohawks["bravesMatchHistory"]["bravesAllTime"]["gp"],50)
  sugo=next(x for x in doc["teams"] if x["leagueName"]=="Sugo Sundays")
  self.assertEqual(sugo["displayName"],"Michelob Morts")
  self.assertGreaterEqual(sugo["bravesMatchHistory"]["bravesAllTime"]["gp"],1)
 def test_missing_source_league_result_fails_closed(self):
  fake={"schema":"wrong"}
  with self.assertRaises(m.Hold):m.public(fake,{}, {})
 def test_public_league_rows_have_official_team_links(self):
  for t in doc["teams"]:
   self.assertTrue(t["source"].startswith("https://leagues.sportsvillage.ca/TeamInfo.aspx?"))
   self.assertIn("teamid="+str(t["sourceTeamId"]),t["source"])
 def test_historical_previous_season_incompleteness_disclosed(self):
  x=doc["previousSeasonGameDetailCoverage"]
  self.assertLessEqual(x["teamsWithAllGameResultsReconciled"],x["totalTeams"])
  self.assertIn("authoritative",x["note"])
if __name__=="__main__":unittest.main(verbosity=2)
