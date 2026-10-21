"""No-network source capability and unsafe table-expansion regression cases."""
import copy
import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_plan03_full_schema_game_log_staging import manifest, SCHEMAS, ReviewHold, col_num, row_structure

def fixtures():
 names=[14,15,13,12]
 ids=[3356177,3356178,3369564,3375601]
 goals=[0,3,2,1];against=[3,6,3,7]
 games=[]
 old={"skaters":[],"goalies":[]}
 for n,(gid,count,gf,ga) in enumerate(zip(ids,names,goals,against)):
  skaters=[]
  for j in range(count):
   player={"name":f"Skater-{n}-{j}","no":str(20+j),"position":"F",
    "gp":1,"g":gf if j==0 else 0,"a":0,"pts":gf if j==0 else 0,
    "pim":None if n<3 else 0,"potg":0,"plusminus":-ga}
   skaters.append(player)
   if n==0:old["skaters"].append({"game":"359","season":"W2026/27",
     "gameType":"Regular Season","name":player["name"],"gp":"1",
     "g":str(player["g"]),"a":"0","pts":str(player["pts"]),"potg":"0"})
  goalie={"name":f"Goalie-{n}","no":"0" if n==2 else "31","gp":1,"losses":1,
          "goalsAgainst":ga,"potg":None if n==3 else 1}
  if n==0:old["goalies"].append({"game":"359","season":"W2026/27",
    "gameType":"Regular Season","name":goalie["name"],"gp":"1","losses":"0",
    "wins":"1","goalsAgainst":"0","potg":"0"})
  games.append({"htoGameId":gid,"teamGoals":gf,"teamGoalsAgainst":ga,
                "skaters":skaters,"goalies":[goalie]})
 feed={"schema":"brave-hc-hto-verified-game-feed/v1","teamGP":4,
        "allGamesDiscovered":True,"playerAggregateParity":True,"games":games}
 headings={}
 templates={}
 for kind,cfg in SCHEMAS.items():
  names=["Underspecified Legacy Stat"]*cfg["expectedColumns"]
  labels={"skaters":{"A":"Game #","P":"#","Q":"Name","R":"POS","S":"GP","T":"G","U":"A",
                      "V":"Pts","AB":"PIM","AJ":"+/-","AP":"POTG"},
          "goalies":{"FD":"Game #","GG":"#","GH":"Name","GI":"GP","GK":"L",
                     "GQ":"GA","HA":"POTG"}}[kind]
  for col,label in labels.items():names[col_num(col)-cfg["colStart"]]=label
  headings[kind]=names
  templates[kind]={col:{"formula":False,"nonBlank":True} for col in labels}
 collisions={"skaters":[{"cell":"Y4674","kind":"preexisting_value","value":"360"}],"goalies":[]}
 return feed,old,headings,templates,collisions

class SourceSchemaAdmission(unittest.TestCase):
 def test_40_skater_and_three_goalie_rows_staged_but_held(self):
  x=manifest(*fixtures())
  self.assertEqual(x["stagedRows"],{"skaters":40,"goalies":3})
  self.assertEqual(x["sourceCollisions"],1)
  self.assertEqual(x["tables"]["skaters"]["admissionCollisionCells"][0]["cell"],"Y4674")
  self.assertFalse(x["structuredTableResizeApproved"])
  self.assertFalse(x["originalWorkbookModified"])
  self.assertFalse(x["sourcePublicationAuthorized"])
 def test_null_pim_never_coerced_to_zero(self):
  x=manifest(*fixtures())
  self.assertEqual(x["withheldOfficialFields"]["skaters_withheld_pim"],28)
  a=next(y for y in x["sourceProposedRows"]["skaters"] if y["bookGame"]==360)
  self.assertNotIn("AB",a["proposedSourceOnlyCells"])
  self.assertTrue(any(z["sourceField"]=="pim" for z in a["withheldHTOFields"]))
 def test_null_goalie_potg_is_withheld(self):
  x=manifest(*fixtures())
  a=next(y for y in x["sourceProposedRows"]["goalies"] if y["bookGame"]==362)
  self.assertEqual(x["withheldOfficialFields"]["goalies_withheld_potg"],1)
  self.assertNotIn("HA",a["proposedSourceOnlyCells"])
 def test_zero_goalie_jersey_flags_review(self):
  x=manifest(*fixtures())
  a=next(y for y in x["sourceProposedRows"]["goalies"] if y["bookGame"]==361)
  self.assertIn("HTO_JERSEY_ZERO_VALIDATE",a["identityReviewFlags"])
 def test_no_derived_goalie_win_written(self):
  x=manifest(*fixtures())
  for row in x["sourceProposedRows"]["goalies"]:
   self.assertNotIn("GJ",row["proposedSourceOnlyCells"])
 def test_no_future_game_is_admitted(self):
  feed,old,head,template,c=fixtures()
  feed["games"].append(copy.deepcopy(feed["games"][0]))
  feed["games"][-1]["htoGameId"]=3375682;feed["teamGP"]=5
  with self.assertRaisesRegex(ReviewHold,"OFFICIAL_HTO_SOURCE_NOT_VERIFIED"):
   manifest(feed,old,head,template,c)
 def test_pts_inconsistent_with_g_and_a_fails(self):
  feed,old,head,template,c=fixtures()
  feed["games"][1]["skaters"][0]["pts"]=99
  with self.assertRaisesRegex(ReviewHold,"HTO_SKATER_G_A_POINTS_MISMATCH"):
   manifest(feed,old,head,template,c)
 def test_existing_player_summaries_not_accidentally_doubled(self):
  x=manifest(*fixtures())
  self.assertTrue(all(y["bookGame"] in (360,361,362) for y in x["sourceProposedRows"]["skaters"]))
  self.assertEqual(len({y["worksheetRow"] for y in x["sourceProposedRows"]["skaters"]}),40)
 def test_missing_key_identity_fails(self):
  feed,old,head,template,c=fixtures()
  feed["games"][1]["skaters"][0]["name"]=""
  with self.assertRaisesRegex(ReviewHold,"OFFICIAL_PLAYER_IDENTITY_AMBIGUOUS"):
   manifest(feed,old,head,template,c)

if __name__=="__main__":unittest.main()
