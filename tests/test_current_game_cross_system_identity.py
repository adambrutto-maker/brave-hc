"""Fail-closed official SAME-GAME identity proof tests. No historic merge."""
from copy import deepcopy
from pathlib import Path
import importlib.util,json,unittest
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location("proof",ROOT/"scripts"/"verify_current_game_cross_system_identity.py")
mod=importlib.util.module_from_spec(s);s.loader.exec_module(mod)
def fixtures(spec):
 division=spec["divisionName"];opponent=spec["htoName"]
 date="Sep 27, 2026" if spec["date"]=="2026-09-27" else "Oct 04, 2026"
 official="Sunday, "+date.replace(" 04,"," 4,")
 vs=spec["time"]
 gf,ga=spec["bravesGF"],spec["bravesGA"]
 def row(day,time,other,side,g1,g2):
  return "".join("<td>"+str(v)+"</td>" for v in [day,time,"vs.",other,side,f"{g1} - {g2}"])
 schedule="<div>"+division+"</div><table><tr>"+"".join("<th>"+s+"</th>" for s in
  ["Schedule","Date","Time","vs. Team","Home/Visitor","Score"])+"</tr>"
 # Make signature appear in sequence and four complete rows for table size.
 schedule="<div>"+division+"</div><span>Schedule</span>"+''.join("<span>"+s+"</span>" for s in
  ["Date","Time","vs. Team","Home/Visitor","Score"])
 for d,t,other,side,a,b in [("Sep 20, 2026","8:15PM","Another Team","Home",3,4),
                          (date,vs,"Braves HC","Visitor",gf,ga),
                          ("Oct 18, 2026","9:00PM","Another Team","Home",1,3),
                          ("Nov 01, 2026","8:15PM","Another Team","Home",0,0)]:
  schedule+=f'<table><tr>{row(d,t,other,side,a,b)}</tr></table>'
 schedule+="<div>Roster</div>"
 if gf==3:
  opp=[1,2,3,0,0,6];br=[0,1,2,0,0,3]
 else:
  opp=[2,0,1,0,0,3];br=[2,0,0,0,0,2]
 def tr(name,data):
  return "<tr><td>"+name+"</td>"+''.join("<td>"+str(x)+"</td>" for x in data)+"</tr>"
 dateLabel=official
 HTO="<html><body><span>"+dateLabel+"</span><span>"+vs.replace("PM"," PM")+" - 9:30 PM</span>"
 HTO+="<h2>Score Board</h2><table><tr>"+''.join("<th>"+x+"</th>" for x in
  ["REGULAR SEASON","1","2","3","OT","2OT","F"])+"</tr>"
 HTO+=tr(opponent,opp)+tr("Brave H.C.",br)+"</table></body></html>"
 return schedule,HTO

class OfficialSameGameQA(unittest.TestCase):
 def test_two_same_games_independently_verify(self):
  for spec in mod.BRIDGES:
   schedule,box=fixtures(spec)
   result=mod.certify(spec,schedule,box)
   self.assertEqual(result["scope"],"THIS_COMPLETED_GAME_ONLY")
   self.assertFalse(result["historicalFranchiseMergeAuthorized"])
   self.assertEqual(result["bravesGoals"],spec["bravesGF"])
 def test_score_mutation_holds(self):
  spec=mod.BRIDGES[0]
  schedule,box=fixtures(spec)
  with self.assertRaisesRegex(mod.Hold,"SVHL_BRAVES_START_TIME_OR_SCORE_CHANGED"):
   mod.certify(spec,schedule.replace("3 - 6","3 - 7",1),box)
 def test_other_htoteam_mutation_holds(self):
  spec=mod.BRIDGES[1]
  schedule,box=fixtures(spec)
  with self.assertRaisesRegex(mod.Hold,"HTO_OFFICIAL_GAME_ID_DATE_TIME_SCORE_OR_OPPONENT_CHANGED"):
   mod.certify(spec,schedule,box.replace("Michelob Morts","Different Team",1))
 def test_wrong_time_holds(self):
  spec=mod.BRIDGES[0]
  schedule,box=fixtures(spec)
  with self.assertRaisesRegex(mod.Hold,"SVHL_BRAVES_START_TIME_OR_SCORE_CHANGED"):
   mod.certify(spec,schedule.replace("6:15PM","7:15PM",1),box)
 def test_corrupted_periods_hold(self):
  spec=mod.BRIDGES[1]
  schedule,box=fixtures(spec)
  with self.assertRaisesRegex(mod.Hold,"HTO_BOX_PERIOD_SUM_DISAGREEMENT"):
   mod.certify(spec,schedule,box.replace("<td>2</td><td>0</td><td>1</td>","<td>3</td><td>0</td><td>1</td>",1))
 def test_other_season_roster_not_franchise_identity(self):
  mock={s["divisionName"]:fixtures(s) for s in mod.BRIDGES}
  report=mod.build(source=mock)
  self.assertEqual(len(report["sameGamePairs"]),2)
  self.assertFalse(report["franchiseHistoryMerged"])
  self.assertTrue(all(x["scope"]=="THIS_COMPLETED_GAME_ONLY" for x in report["sameGamePairs"]))
 def test_actual_prepared_feed_has_only_two_limited_proofs(self):
  p=ROOT/"widgets"/"current-opponent-identity-bridges.json"
  self.assertTrue(p.exists())
  j=json.loads(p.read_text(encoding="utf8"))
  self.assertEqual(j["status"],"OFFICIAL_SAME_GAME_PROOF_VERIFIED")
  self.assertFalse(j["franchiseHistoryMerged"])
  self.assertEqual({x["divisionName"] for x in j["sameGamePairs"]},{"Mohawks HC","Sugo Sundays"})
  self.assertEqual({x["htogameId"] for x in j["sameGamePairs"]},{3356178,3369564})
  self.assertTrue(all(not x["historicalFranchiseMergeAuthorized"] for x in j["sameGamePairs"]))
if __name__=="__main__":unittest.main(verbosity=2)
