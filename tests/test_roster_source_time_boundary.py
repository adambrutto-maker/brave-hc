"""Independent dated roster-vs-league source boundary; other proof gates unchanged."""
from pathlib import Path
from copy import deepcopy
from datetime import datetime,timedelta,timezone
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_svhl_roster_intelligence import verify,RosterSourceHold
def load():
 r=ROOT/"widgets"
 return (json.loads((r/"league-intelligence.json").read_text(encoding="utf8")),
         json.loads((r/"svhl-roster-intelligence.json").read_text(encoding="utf8")))
class SourceCaptureBoundary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.league,cls.roster=load()
 def test_recent_separate_capture_dates_admitted(self):
  r=verify(self.league,self.roster)
  self.assertEqual(r["state"],"PUBLIC_HISTORICAL_ROSTER_PLAYER_ID_PARITY_PASS")
 def test_older_than_eight_days_refused(self):
  source=deepcopy(self.roster)
  old=datetime.fromisoformat(self.league["asOf"])-timedelta(days=9)
  source["sourceLeagueAsOf"]=old.isoformat()
  source["asOf"]=(old+timedelta(hours=1)).isoformat()
  with self.assertRaisesRegex(RosterSourceHold,"ROSTER_LEAGUE_SOURCE_STALE_OR_FUTURE"):
   verify(self.league,source)
 def test_source_created_in_future_refused(self):
  x=deepcopy(self.roster)
  league=datetime.fromisoformat(self.league["asOf"])
  x["sourceLeagueAsOf"]=(league+timedelta(days=1)).isoformat()
  x["asOf"]=(league+timedelta(days=1,hours=1)).isoformat()
  with self.assertRaisesRegex(RosterSourceHold,"ROSTER_LEAGUE_SOURCE_STALE_OR_FUTURE"):
   verify(self.league,x)
 def test_roster_captured_before_its_league_source_refused(self):
  x=deepcopy(self.roster)
  original=datetime.fromisoformat(x["sourceLeagueAsOf"])
  x["asOf"]=(original-timedelta(minutes=1)).isoformat()
  with self.assertRaisesRegex(RosterSourceHold,"ROSTER_LEAGUE_SOURCE_STALE_OR_FUTURE"):
   verify(self.league,x)
 def test_missing_timezone_refused(self):
  x=deepcopy(self.roster)
  x["asOf"]="2026-10-26T22:00:00"
  with self.assertRaisesRegex(RosterSourceHold,"NAIVE_SOURCE_CAPTURE_TIMESTAMP"):
   verify(self.league,x)
 def test_duplicate_current_season_team_id_still_refused(self):
  x=deepcopy(self.roster)
  x["teams"][1]["sourceTeamId"]=x["teams"][0]["sourceTeamId"]
  with self.assertRaisesRegex(RosterSourceHold,"ADULT_CURRENT_TEAM_COVERAGE_BAD"):
   verify(self.league,x)
if __name__=="__main__":unittest.main(verbosity=2)
