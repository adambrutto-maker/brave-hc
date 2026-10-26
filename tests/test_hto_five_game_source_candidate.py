"""Pure source-failure tests for the protected HTO five-game source upgrade."""
from copy import deepcopy
from pathlib import Path
import importlib.util,json,os,unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("review_5",ROOT/"scripts"/"audit_hto_five_game_candidate.py")
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
PINNED=Path(r"D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\ae64a29212198fe8d474a3276827b67509575007")
SANDBOX=Path(r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Five_Game_Collector_SourceOnly")
PRIOR=Path(r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\261017_HTO_Verified_GameLevel_Skater_Attendance.json")
REAL=all(x.is_file() for x in (SANDBOX/"261026_Five_Game_Source_Candidate_PRIVATE.json",SANDBOX/"sandbox_receipt.json",PRIOR))

def fixtures():
 ids=(3356177,3356178,3369564,3375601,3375682)
 scores=((0,3),(3,6),(2,3),(1,7),(6,4))
 games=[]
 for idx,(gid,(gf,ga)) in enumerate(zip(ids,scores)):
  n=13 if idx==4 else 1
  players=[{"g":gf if i==0 else 0,"a":0,"pts":gf if i==0 else 0} for i in range(n)]
  games.append({"htoGameId":gid,"teamGoals":gf,"teamGoalsAgainst":ga,
                "skaters":players,"goalies":[{"goalsAgainst":ga}],
                "date":"2026-10-25" if idx==4 else "2026-09-20",
                "workbookGameNumber":363 if idx==4 else 359,
                "sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID="+str(gid)+"&p=boxscore"})
 prior={"schema":"brave-hc-hto-verified-game-feed/v1",
        "sourceValidationState":"PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS",
        "workbookWritten":False,"games":[deepcopy(g) for g in games[:4]]}
 candidate={"schema":"brave-hc-hto-game-feed-candidate/v1",
            "productionAcceptance":False,"workbookWritten":False,"publisherUpdated":False,
            "games":games,"teamGP":5,"teamG":12,"teamA":19,
            "missingStatFields":{"skaterPIMUnknownRows":42,"seasonParity":{
                "skaters":{"completeFieldComparisons":120,"expectedFieldComparisons":120,
                           "discrepancies":[],"incompleteFields":[]},
                "goalies":{"completeFieldComparisons":11,"expectedFieldComparisons":12,
                           "discrepancies":[],"incompleteFields":[{"name":"Leong, Dev","field":"POTG","unknownGames":1}]}}},
            "inferredPerGamePOTG":[]}
 return prior,candidate

class FiveGameSourceAuditQA(unittest.TestCase):
 def test_valid_synthetic_candidate(self):
  old,new=fixtures()
  r=audit.audit(old,new)
  self.assertEqual(r["state"],"PRIVATE_FIVE_GAME_SOURCE_ACCEPTANCE_PASS")
  self.assertFalse(r["productionAcceptance"])
 def test_history_mutation_held(self):
  old,new=fixtures()
  new["games"][0]["skaters"][0]["g"]=9
  with self.assertRaisesRegex(audit.AuditHold,"ORIGINAL_FOUR_GAME_ROWS_CHANGED"):
   audit.audit(old,new)
 def test_new_game_score_mutation_held(self):
  old,new=fixtures()
  new["games"][-1]["teamGoals"]=7
  with self.assertRaisesRegex(audit.AuditHold,"FIFTH_GAME_ID_DATE_SCORE"):
   audit.audit(old,new)
 def test_unknown_goalie_value_cannot_be_invented(self):
  old,new=fixtures()
  new["missingStatFields"]["seasonParity"]["goalies"]["incompleteFields"]=[]
  with self.assertRaisesRegex(audit.AuditHold,"UNKNOWN_GOALIE_POTG"):
   audit.audit(old,new)
 def test_incomplete_skater_parity_held(self):
  old,new=fixtures()
  new["missingStatFields"]["seasonParity"]["skaters"]["completeFieldComparisons"]=119
  with self.assertRaisesRegex(audit.AuditHold,"120_SKATER_PARITY"):
   audit.audit(old,new)
 def test_production_flag_cannot_be_set(self):
  old,new=fixtures()
  new["productionAcceptance"]=True
  with self.assertRaisesRegex(audit.AuditHold,"REVIEW_ONLY_STATE_REQUIRED"):
   audit.audit(old,new)
 @unittest.skipUnless(REAL,"Private pinned operational source not available in CI")
 def test_real_five_game_private_receipt(self):
  old=json.loads(PRIOR.read_text(encoding="utf-8"))
  new=json.loads((SANDBOX/"261026_Five_Game_Source_Candidate_PRIVATE.json").read_text(encoding="utf-8"))
  receipt=json.loads((SANDBOX/"sandbox_receipt.json").read_text(encoding="utf-8"))
  r=audit.audit(old,new,receipt,PINNED)
  self.assertEqual(r["pinnedSourceIntegrity"],"PASS_PRODUCTION_SCRIPTS_UNCHANGED")
  self.assertTrue(r["historicalFourUnchanged"])
if __name__=="__main__":unittest.main(verbosity=2)
