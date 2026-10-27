"""Source-negative tests for Sports Village individual GameInfo reconcilation.

All fixtures read public committed evidence; mutations are in-memory QA only.
"""
from __future__ import annotations
from pathlib import Path
from copy import deepcopy
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_svhl_player_game_evidence import check,GameProofHold
def load():
 root=ROOT/"widgets"
 idx=json.loads((root/"svhl-player-game-index.json").read_text(encoding="utf8"))
 years={int(k):json.loads((root/("svhl-player-game-"+k+".json")).read_text(encoding="utf8"))
        for k in idx["seasons"]}
 return idx,years
class SourceReconciliationTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index,cls.years=load()
 def test_all_eight_game_sources_admitted(self):
  receipt=check(self.index,self.years)
  self.assertEqual(receipt["seasons"],8)
  self.assertEqual(receipt["gamePages"],2206)
  self.assertEqual(receipt["fullGameGoalParity"],2069)
  self.assertEqual(receipt["currentRosterPlayers"],348)
  self.assertFalse(receipt["seasonGPClaimedVerified"])
 def test_exact_public_source_urls(self):
  for lid,doc in self.years.items():
   for g in doc["games"]:
    self.assertEqual(g["source"],
     f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={lid}&gameid={g['gameId']}&page_type=Adult")
 def test_bad_goal_score_is_rejected(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  y=data[570];game=next(g for g in y["games"] if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY")
  game["homeGoals"]+=1
  with self.assertRaisesRegex(GameProofHold,"GOALS_DO_NOT_MATCH_OFFICIAL_FINAL_SCORE"):
   check(idx,data)
 def test_unknown_scoring_player_id_rejected(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  y=data[570];game=next(g for g in y["games"] if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY" and g["resolvedGoals"])
  game["resolvedGoals"][0]["scorerId"]=9999991
  with self.assertRaisesRegex(GameProofHold,"PLAYER_GOAL_ASSIST_ID_PROOF_INVALID"):
   check(idx,data)
 def test_incomplete_goal_sheet_cannot_claim_complete(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  y=data[570];partial=next(g for g in y["games"] if g["status"]=="PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL")
  partial["resolvedGoals"]=[{"teamId":partial["homeTeamId"],"scorerId":999}]
  with self.assertRaisesRegex(GameProofHold,"PARTIAL_UNQUALIFIED_GAME_EVENT_STORED_AS_VERIFIED"):
   check(idx,data)
 def test_invalid_assist_source_player_rejected(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  y=data[547];game=next(g for g in y["games"] if g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY" and
    any(x["assistPlayerIds"] for x in g["resolvedGoals"]))
  next(x for x in game["resolvedGoals"] if x["assistPlayerIds"])["assistPlayerIds"].append(987654)
  with self.assertRaisesRegex(GameProofHold,"PLAYER_GOAL_ASSIST_ID_PROOF_INVALID"):
   check(idx,data)
 def test_fake_game_hash_rejected(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  data[570]["games"][0]["sourcePageSHA256"]="invalid"
  with self.assertRaisesRegex(GameProofHold,"GAME_OFFICIAL_URL_OR_HASH_NOT_ADMITTED"):
   check(idx,data)
 def test_wrong_accepted_source_count_rejected(self):
  idx=deepcopy(self.index);data=deepcopy(self.years)
  idx["seasons"]["547"]["fullScoringGames"]+=1
  with self.assertRaisesRegex(GameProofHold,"SOURCE_YEAR_COUNT_PARITY"):
   check(idx,data)
 def test_unqualified_published_player_arithmetic_is_held(self):
  idx,years=self.index,self.years
  conflict=[p for y in years.values() for t in y["teams"] for p in t["playerSeasonSummaries"]
      if p["status"]=="SOURCE_PUBLISHED_STATS_CONFLICT_HOLD"]
  self.assertGreaterEqual(len(conflict),1)
  self.assertTrue(any(p["published"]["pts"]!=p["published"]["g"]+p["published"]["a"]
       for p in conflict))
 def test_unverified_gp_and_pim_stay_unverified(self):
  self.assertFalse(self.index["registeredGPVerified"])
  self.assertFalse(self.index["seasonStatsOverwritten"])
  for year in self.years.values():
   for t in year["teams"]:
    for p in t["playerSeasonSummaries"]:
     self.assertEqual(p["gpStatus"],"CANNOT_VERIFY_GAME_APPEARANCE_FROM_GOAL_EVENT_SHEET")
 def test_no_duplicate_source_event_game_id_per_league(self):
  for lid,year in self.years.items():
   ids=[g["gameId"] for g in year["games"]]
   self.assertEqual(len(ids),len(set(ids)),str(lid))
 def test_no_official_source_mutation(self):
  self.assertTrue(all(not year["leagueAssignmentsOrPlayerTotalsWritten"] for year in self.years.values()))
  self.assertTrue(self.index["unqualifiedEventRowsHeld"])
if __name__=="__main__":unittest.main(verbosity=2)
