"""HTO future fixture parser and public-source/identity safeguards."""
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from collect_hto_upcoming_fixtures import (
 parse,collect,validate,schedule_url,ScheduleHold,norm)
def league():return json.loads((ROOT/"widgets"/"league-intelligence.json").read_text(encoding="utf8"))
def public():return json.loads((ROOT/"widgets"/"upcoming-matchups.json").read_text(encoding="utf8"))
def html(name="Mid Ice Crisis",date="Sunday, November 1 2026",id="3375683",cls="away",view="preview",time="8:15 PM",venue="Vaughan Sports Village - D Rink"):
 return '<table class="days compactView" id="daysDetail"><tr><td class="eventDays dayCell" id="day_1">'+\
  '<div class="dayDetails"><span>'+date+'</span></div><table><tr><td>'+\
  '<a href="default.asp?u=BRAVESHOCKEY&s=hockey&p='+view+'&gameID='+id+'"'+\
  ' class="game type0 '+cls+'">vs. <strong>'+name+'</strong><br>'+time+\
  ' - ('+cls.title()+')<br>at '+venue+'</a></td></tr></table></td></tr></table>'
class SourceScheduleQA(unittest.TestCase):
 def test_accepted_public_schedule_and_unique_source_games(self):
  doc=public();self.assertTrue(validate(doc,league()))
  self.assertEqual(doc["gamesCount"],len(doc["games"]))
  self.assertEqual(len({g["gameId"] for g in doc["games"]}),len(doc["games"]))
  self.assertTrue(all(g["gameId"]>0 and g["gameUrl"].startswith("https://www.hometeamsonline.com/")
    for g in doc["games"]))
 def test_specific_historical_first_collection_is_genuine_not_an_inferred_game(self):
  doc=public()
  if doc["windowStart"]=="2026-10-26":
   self.assertEqual(doc["games"][0]["gameId"],3375683)
   self.assertEqual(doc["games"][0]["opponentHTO"],"Mid Ice Crisis")
   self.assertEqual(doc["games"][0]["date"],"2026-11-01")
   self.assertEqual(doc["games"][0]["localTime"],"20:15")
 def test_parser_skips_complete_links_instead_of_inventing_future_results(self):
  self.assertEqual(parse(html(view="results"),"2026-11"),[])
 def test_source_parser_reads_one_official_preview(self):
  rows=parse(html(),"2026-11")
  self.assertEqual(len(rows),1)
  self.assertEqual(rows[0]["gameId"],3375683)
  self.assertEqual(rows[0]["localTime"],"20:15")
  self.assertEqual(rows[0]["homeAway"],"AWAY")
 def test_public_home_away_and_location_are_not_derived_from_standings(self):
  a=public()
  for game in a["games"]:
   self.assertIn(game["homeAway"],("HOME","AWAY"))
   self.assertTrue(game["location"])
   self.assertNotIn("gf",game)
   self.assertNotIn("ga",game)
 def test_matching_punctuation_variants_is_uniquely_evidenced(self):
  self.assertEqual(norm("Mohawks H.C."),norm("Mohawks HC"))
  a=public()
  g=next((g for g in a["games"] if g["opponentHTO"]=="Mohawks H.C."),None)
  if g:self.assertEqual(g["leagueName"],"Mohawks HC")
 def test_ambiguous_or_forged_current_league_mapping_fails(self):
  a=public();match=next(g for g in a["games"] if g["sourceTeamId"] is not None)
  match["leagueName"]="Fictional Franchise"
  with self.assertRaisesRegex(ScheduleHold,"UNVERIFIED_LEAGUE_TEAM_MATCH"):
   validate(a,league())
 def test_unknown_htoschedule_opponent_remains_unknown(self):
  pages=[(schedule_url(2026,10),'<table id="daysDetail"></table>'),
         (schedule_url(2026,11),html(name="Unknown Franchise")),
         (schedule_url(2026,12),'<table id="daysDetail"></table>')]
  t=datetime(2026,10,26,12,0,tzinfo=ZoneInfo("America/Toronto"))
  a=collect(league(),pages,t)
  self.assertEqual(a["gamesCount"],1)
  self.assertEqual(a["games"][0]["identityState"],"HTO_NAME_NOT_MATCHED_TO_CURRENT_SVHL_TEAM")
  self.assertIsNone(a["games"][0]["leagueName"])
 def test_bad_game_link_is_refused(self):
  with self.assertRaisesRegex(ScheduleHold,"UNVERIFIED_GAME_PREVIEW_LINK"):
   parse(html(id="not-real"),"2026-11")
 def test_wrong_month_or_missing_detail_calendar_fails(self):
  with self.assertRaisesRegex(ScheduleHold,"SOURCE_PAGE_MONTH_MISMATCH"):
   parse(html(),"2026-12")
  with self.assertRaisesRegex(ScheduleHold,"HTO_SCHEDULE_DETAIL_TABLE_MISSING"):
   parse("<html>missing</html>","2026-11")
 def test_duplicate_game_id_with_changed_fixture_is_refused(self):
  pages=[(schedule_url(2026,10),html(date="Sunday, October 25 2026")),
         (schedule_url(2026,11),html(date="Sunday, November 1 2026")),
         (schedule_url(2026,12),'<table id="daysDetail"></table>')]
  a=collect(league(),pages,datetime(2026,10,26,12,0,tzinfo=ZoneInfo("America/Toronto")))
  self.assertEqual(a["gamesCount"],1) # October 25 is excluded as past
 def test_unapproved_url_or_tampered_source_id_is_blocked(self):
  a=public();a["games"][0]["gameUrl"]="https://example.com/preview?gameID=3375683"
  with self.assertRaisesRegex(ScheduleHold,"GAME_EVIDENCE_URL_INVALID"):
   validate(a,league())
 def test_collector_does_not_mutate_input_league_data(self):
  a=league();before=json.dumps(a,sort_keys=True)
  pages=[(schedule_url(2026,10),'<table id="daysDetail"></table>'),
         (schedule_url(2026,11),html()),
         (schedule_url(2026,12),'<table id="daysDetail"></table>')]
  collect(a,pages,datetime(2026,10,26,12,0,tzinfo=ZoneInfo("America/Toronto")))
  self.assertEqual(json.dumps(a,sort_keys=True),before)
if __name__=="__main__":unittest.main(verbosity=2)
