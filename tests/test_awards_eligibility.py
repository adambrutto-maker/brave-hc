import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_eligibility import bindings,calculate
ROOT=Path(__file__).resolve().parents[1]
class Eligibility(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.rules=bindings(ROOT/'docs/261020_Awards_Original_Formula_Capture.json')
 def run_rule(self,model,role='Skater',gp=5,status='FT',total=10,playoffs=0,rookie=0,prior=5):
  row={'Name':'Player','Recent Season':'S','Current Roster Status':status,'Award Scoring Type':role,'Position Group':'Defense','Rookie Status':rookie}
  inputs={k:gp for k in ['Current Total Skater Played Games','Current Total Goalie Played Games','Current Skater GP','Current Goalie GP','Current Playoff Skater Played Games','Current Playoff Goalie Played Games']}
  inputs.update({'Current Skater Playoff GP':playoffs,'Career Prior Skater GP':prior,'Career Prior Goalie GP':prior})
  return calculate(self.rules[model+' Eligible'],row,inputs,roster=[{'Name':'Player','Season':'S','Total Games':total}],seasons=[{'Season':'S','Game Type':'Playoffs','Total Games Contested':playoffs}],context_complete=True)['value']
 def test_all_ten_bound(self):self.assertEqual(len(self.rules),10)
 def test_hart_dedication_lady_thresholds(self):
  for m in ['Hart','Dedication','Lady Byng']:
   self.assertEqual(self.run_rule(m,gp=4),0);self.assertEqual(self.run_rule(m,gp=5),1)
   self.assertEqual(self.run_rule(m,role='Goaltender',gp=3),1)
   self.assertEqual(self.run_rule(m,total=0),0)
 def test_norris_minimum(self):self.assertEqual(self.run_rule('Norris',gp=6),0);self.assertEqual(self.run_rule('Norris',gp=7),1)
 def test_playoff_odd_even(self):
  self.assertEqual(self.run_rule('Conn Smythe',gp=1,playoffs=3),0)
  self.assertEqual(self.run_rule('Conn Smythe',gp=2,playoffs=3),1)
  self.assertEqual(self.run_rule('Conn Smythe',gp=2,playoffs=4),1)
  self.assertEqual(self.run_rule('Conn Smythe',gp=10,playoffs=0),0)
 def test_count_titles_regular_only(self):
  for m in ['Art Ross','Rocket Richard']:
   self.assertEqual(self.run_rule(m,gp=1),1);self.assertEqual(self.run_rule(m,gp=1,playoffs=1),0)
 def test_rookie(self):
  self.assertEqual(self.run_rule('Rookie',rookie=1),1)
  self.assertEqual(self.run_rule('Rookie',rookie=1,status='DI'),0)
 def test_improved_history(self):
  self.assertEqual(self.run_rule('Most Improved',prior=4),0)
  self.assertEqual(self.run_rule('Most Improved',prior=5),1)
  self.assertEqual(self.run_rule('Most Improved',rookie=1),0)
 def test_rolaids(self):
  self.assertEqual(self.run_rule('Rolaids',status='FT',gp=6),0)
  self.assertEqual(self.run_rule('Rolaids',status='DI',gp=6),1)
 def test_unknown_context_holds(self):
  self.assertEqual(calculate(self.rules['Hart Eligible'],{'Name':'Player'},{})['state'],'INPUT_HOLD')
 def test_blank_row(self):
  for b in self.rules.values():self.assertEqual(calculate(b,{'Name':''},{})['value'],'')
if __name__=='__main__':unittest.main()
