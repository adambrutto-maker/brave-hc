"""LeagueOS V24 deterministic four-night public fixture-source safeguards. No network."""
from __future__ import annotations
import io, json, sys, tempfile, unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from discover_leagueos_fixtures_v24 import accepted_game,run,SCHEMA,ROOT as W,NIGHTS
from collect_leagueos_settled_delta_v23 import load_discovery
fixture=json.loads((W/"leagueos-fixture-discovery-v24.json").read_text("utf8"))
SUNDAY_IDS=[t["teamId"] for t in fixture["teamDirectory"] if t["leagueId"]==570][:2]
def pair(score=(0,0),date="2026-11-29",game=999999):
  a={"leagueId":570,"gameId":game,"teamId":SUNDAY_IDS[0],"opponentTeamId":SUNDAY_IDS[1],
     "side":"Home","date":date,"time":"19:00","homeGoals":score[0],
     "visitorGoals":score[1],"teamPageHash":"a"*64,"scoreStatus":"ZERO_ZERO_HOLD"}
  b={**a,"teamId":SUNDAY_IDS[1],"opponentTeamId":SUNDAY_IDS[0],"side":"Visitor","teamPageHash":"b"*64}
  return [a,b]
class FixtureV24Tests(unittest.TestCase):
 def test_exact_recipient_game_id_admission(self):
  x=accepted_game(pair(),"2026-11-17")
  self.assertEqual(x["status"],"NEW_FUTURE_RECIPROCAL")
  self.assertEqual(x["game_id"],999999)
  self.assertEqual(x["sourceCount"],2)
  self.assertFalse(x["officialWriteAllowed"])
 def test_game_must_have_two_independent_reciprocal_source_rows(self):
  with self.assertRaisesRegex(ValueError,"exactly two"):accepted_game(pair()[:1],"2026-11-17")
  with self.assertRaisesRegex(ValueError,"exactly two"):accepted_game(pair()+pair()[:1],"2026-11-17")
 def test_mismatched_game_id_cannot_be_joined_by_opponent_or_date(self):
  a,b=pair();b["gameId"]+=1
  with self.assertRaisesRegex(ValueError,"Reciprocal"):accepted_game([a,b],"2026-11-17")
 def test_mismatched_clock_side_or_scores_fail(self):
  for key,val in [("date","2026-12-01"),("time","21:15"),("side","Home"),
                  ("homeGoals",5),("teamId",13651)]:
   a,b=pair();b[key]=val
   with self.assertRaisesRegex(ValueError,"Reciprocal"):
    accepted_game([a,b],"2026-11-17")
 def test_prior_zero_zero_is_never_treated_as_draw(self):
  self.assertEqual(accepted_game(pair(date="2026-11-16"),"2026-11-17")["status"],
                   "NEW_PAST_ZERO_ZERO_HOLD")
  x=accepted_game(pair(score=(3,2),date="2026-11-16"),"2026-11-17")
  self.assertEqual(x["status"],"NEW_RECIPROCAL_SETTLED")
  self.assertEqual(x["homeGoals"],3);self.assertEqual(x["awayGoals"],2)
 def test_same_day_nonzero_is_held_until_next_toronto_day(self):
  x=accepted_game(pair(score=(3,2),date="2026-11-17"),"2026-11-17")
  self.assertEqual(x["status"],"NEW_SAME_DAY_SCORE_HOLD")
  self.assertIsNone(x["homeGoals"])
 def test_source_fixture_discovery_integration_is_idempotent_offline(self):
  directory=fixture["teamDirectory"]
  def fake_dir(lid):
   return{"leagueId":lid,"night":NIGHTS[lid],
     "teams":[{"league_id":lid,"team_id":t["teamId"],"name":t["name"],
      "division":t["division"],"night":t["night"]} for t in directory if t["leagueId"]==lid],
     "invalidStandings":[]}
  def fake_team(t):
   rows=[]
   if t["league_id"]==570 and t["team_id"] in SUNDAY_IDS:
    rows=[pair()[0 if t["team_id"]==SUNDAY_IDS[0] else 1]]
   return{"team":t,"fixtures":rows,"holds":[],"sourceSHA256":"a"*64}
  with tempfile.TemporaryDirectory() as tmp:
   output=Path(tmp)/"discovery.json"
   with redirect_stdout(io.StringIO()):doc,changed=run("2026-11-17",1,output,fake_dir,fake_team)
   self.assertTrue(changed);self.assertEqual(doc["counts"]["newCandidateCount"],1)
   self.assertEqual(doc["counts"]["currentLeagueTeams"],len(directory))
   self.assertEqual(doc["counts"]["unratedByCurrentDivisionModel"],len(directory)-96)
   with redirect_stdout(io.StringIO()):doc2,again=run("2026-11-17",1,output,fake_dir,fake_team)
   self.assertFalse(again);self.assertEqual(doc2["candidates"][0]["firstSeenAt"],"2026-11-17")
   def removed(t):return{"team":t,"fixtures":[],"holds":[]}
   with redirect_stdout(io.StringIO()):doc3,changed2=run("2026-11-18",1,output,fake_dir,removed)
   self.assertTrue(changed2)
   self.assertEqual(doc3["candidates"][0]["status"],"SOURCE_MISSING_REVIEW_HOLD")
   self.assertTrue(doc3["candidates"][0]["missingFromCurrentSource"])
 def test_source_coverage_current_evidence(self):
  self.assertEqual(fixture["schema"],SCHEMA)
  self.assertGreaterEqual(fixture["counts"]["currentLeagueTeams"],102)
  self.assertGreaterEqual(fixture["counts"]["newCandidateCount"],61)
  self.assertEqual(fixture["counts"]["sourcePagesHeld"],0)
  self.assertEqual(fixture["counts"]["newCandidateCount"],len(fixture["candidates"]))
  self.assertEqual(fixture["counts"]["currentNewFuture"]+
                   fixture["counts"]["newSettled"]+
                   fixture["counts"]["newHeld"],len(fixture["candidates"]))
  self.assertGreaterEqual(len(fixture["unratedTeams"]),6)
  if fixture["lastMaterialChangeToronto"]=="2026-11-17":
   self.assertEqual(fixture["counts"]["newCandidateCount"],61)
   self.assertEqual(sum(g["night"]=="Sunday" for g in fixture["candidates"]),61)
 def test_settlement_reader_will_reject_forged_discovery(self):
  original=(W/"leagueos-source-qualified-current-fixtures-v4.json").read_bytes()
  from hashlib import sha256
  digest=sha256(original).hexdigest()
  self.assertEqual(load_discovery(digest)["schema"],SCHEMA)
  with self.assertRaisesRegex(ValueError,"incomplete"):
   load_discovery("a"*64)
if __name__=="__main__":unittest.main()
