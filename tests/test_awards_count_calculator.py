import sys,json,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hockeyos_awards_count_calculator import calculate,compare
class CountCalculator(unittest.TestCase):
 def player(self,name,row,g=0,a=0,gp=1):return {'name':name,'sourceWorksheetRow':row,'gp':gp,'goals':g,'assists':a,'points':g+a}
 def test_native_fixture_exact_76_values(self):
  fixture=json.loads((Path(__file__).resolve().parents[1]/'docs/261021_Awards_Current_Count_Reference.json').read_text());r=compare(fixture,4)
  self.assertEqual(r['state'],'CURRENT_COUNT_ARITHMETIC_PARITY_PASS');self.assertEqual(r['numericComparisons'],76)
 def test_original_points_ties_use_goals_then_rate(self):
  p=[self.player('Assist, Slow',6,a=1,gp=4),self.player('Assist, Fast',7,a=1,gp=2),self.player('Goal, One',8,g=1,gp=4)]
  self.assertEqual(calculate(p,4)['artRossOrder'],['Goal, One','Assist, Fast','Assist, Slow'])
 def test_goal_ties_use_source_row_not_points_or_input_order(self):
  p=[self.player('Later, ManyAssists',9,g=1,a=4),self.player('Earlier, NoAssist',6,g=1)]
  self.assertEqual(calculate(p,4)['rocketOrder'],['Earlier, NoAssist','Later, ManyAssists'])
 def test_zero_count_players_retained_and_input_not_mutated(self):
  p=[self.player('Player, Zero',6)];before=copy.deepcopy(p);r=calculate(p,4);self.assertEqual(r['rows'][0]['rocketScore'],0);self.assertEqual(p,before)
 def test_bad_identity_counts_appearances_and_tie_order_rejected(self):
  for field,value in [('name','Unknown, Johnny'),('gp',0),('gp',5),('goals',-1),('assists',True),('points',2),('sourceWorksheetRow',True)]:
   p=self.player('Player, One',6);p[field]=value
   with self.assertRaises(ValueError):calculate([p],4)
  p=self.player('Player, One',6)
  with self.assertRaises(ValueError):calculate([p,p],4)
 def test_changed_native_rank_is_an_exact_mismatch(self):
  p=self.player('Player, One',6,g=1);expected=calculate([p],4)['rows'][0]
  p.update({'nativeArtRossScore':1,'nativeRocketScore':1,'nativeArtRossRankKey':expected['artRossRankKey']+1,'nativeRocketRankKey':expected['rocketRankKey']})
  self.assertEqual(compare({'rows':[p]},4)['differences'][0]['field'],'artRossRankKey')
if __name__=='__main__':unittest.main()
