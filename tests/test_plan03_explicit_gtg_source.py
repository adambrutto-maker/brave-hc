"""No-network GTG source tests: absent official column is UNKNOWN, never zero."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_explicit_gtg_source import audit,GTGReviewHold,EXPECTED

def fixture():
 roster={
 3356177:[("Other, Player",0)],
 3356178:[("Carosi, Justin",1),("Other, Player",2)],
 3369564:[("Carosi, Justin",1),("Kong, Henry",1)],
 3375601:[("Another, Player",1)]
 }
 feed={"schema":"brave-hc-hto-verified-game-feed/v1","allGamesDiscovered":True,
       "playerAggregateParity":True,"teamGP":4,"games":[]}
 evidence={"schema":"brave-hc-private-hto-explicit-gtg-observation/v1",
           "status":"SOURCE_VERIFIED_GTGS_REVIEW_ONLY",
           "sourceWorkbookModified":False,"publicRecordPublished":False,"games":[]}
 for gid,(date,total) in EXPECTED.items():
  players=[{"name":name,"g":goals} for name,goals in roster[gid]]
  feed["games"].append({"htoGameId":gid,"skaters":players})
  url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
  source={"htoGameId":gid,"sourceUrl":url,"sourceSHA256":"a"*64,"officialDate":date}
  if total is None:
   source.update(columnStatus="NO_GTGS_COLUMN_NO_VALUES",teamGTG=None,sourceGTGPlayers=[])
  else:
   rows=[]
   for person in players:
    hit=(gid,person["name"]) in [(3356178,"Carosi, Justin"),(3369564,"Carosi, Justin"),(3369564,"Kong, Henry")]
    rows.append({"name":person["name"],"gtg":1 if hit else 0})
   source.update(columnStatus="EXPLICIT_GTGS_IN_HTO",teamGTG=total,sourceGTGPlayers=rows)
  evidence["games"].append(source)
 return feed,evidence

class GTGSourceReview(unittest.TestCase):
 def test_supported_three_gtg_credits_and_two_unknown_games(self):
  result=audit(*fixture())
  self.assertEqual(result["status"],"PARTIAL_HTO_GTGS_REVIEW_ONLY_NOT_FOR_WORKBOOK")
  self.assertEqual(len(result["confirmedPositiveGTGCredits"]),3)
  self.assertEqual(len(result["notObservableGames"]),2)
  self.assertFalse(result["allPlayersGTGComplete"])
  self.assertFalse(result["publicAwardOrRecordPublicationAuthorized"])
 def test_absent_column_cannot_be_interpreted_as_zero(self):
  f,e=fixture()
  e["games"][0]["teamGTG"]=0
  with self.assertRaisesRegex(GTGReviewHold,"NONEXISTENT_GTGS_COLUMN_MUST_REMAIN_UNKNOWN"):
   audit(f,e)
 def test_absent_column_cannot_add_player_zero_rows(self):
  f,e=fixture()
  e["games"][0]["sourceGTGPlayers"]=[{"name":"Other, Player","gtg":0}]
  with self.assertRaisesRegex(GTGReviewHold,"NONEXISTENT_GTGS_COLUMN_MUST_REMAIN_UNKNOWN"):
   audit(f,e)
 def test_changed_official_gtg_credit_requires_review(self):
  f,e=fixture()
  e["games"][1]["sourceGTGPlayers"][0]["gtg"]=0
  with self.assertRaisesRegex(GTGReviewHold,"GTG_CREDIT_CHANGE_REQUIRES_NEW_REVIEW"):
   audit(f,e)
 def test_gtg_without_player_goal_is_rejected(self):
  f,e=fixture()
  f["games"][2]["skaters"][1]["g"]=0
  with self.assertRaisesRegex(GTGReviewHold,"GTG_CREDIT_NOT_SUPPORTED_BY_PLAYER_GOALS"):
   audit(f,e)
 def test_source_team_total_conflict_rejected(self):
  f,e=fixture()
  e["games"][1]["teamGTG"]=3
  with self.assertRaisesRegex(GTGReviewHold,"GTG_TEAM_SUMMARY_NOT_VERIFIED"):
   audit(f,e)
 def test_unmapped_fifth_game_rejected(self):
  f,e=fixture()
  f["games"].append(copy.deepcopy(f["games"][0]))
  f["games"][-1]["htoGameId"]=3375682
  f["teamGP"]=5
  with self.assertRaisesRegex(GTGReviewHold,"HTO_GAME_FEED_UNVERIFIED"):
   audit(f,e)
 def test_bad_source_fingerprint_rejected(self):
  f,e=fixture()
  e["games"][1]["sourceSHA256"]="missing"
  with self.assertRaisesRegex(GTGReviewHold,"OFFICIAL_GTGS_SOURCE_PROVENANCE_CHANGED"):
   audit(f,e)
 def test_duplicate_player_row_rejected(self):
  f,e=fixture()
  e["games"][1]["sourceGTGPlayers"].append(copy.deepcopy(e["games"][1]["sourceGTGPlayers"][0]))
  with self.assertRaisesRegex(GTGReviewHold,"HTO_GTGS_PLAYER_COVERAGE_MISMATCH"):
   audit(f,e)

if __name__=="__main__":unittest.main()
