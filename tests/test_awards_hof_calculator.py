import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_hof_calculator import calculate,audit,WEIGHTS
class HallOfFame(unittest.TestCase):
 def player(self,name='Test',sg=50,gg=0,row=6,value=20):
  return {'Website Name':name,'Career Total Skater GP':sg,'Career Total Goalie GP':gg,'sourceRow':row,**{f:value for w in WEIGHTS.values() for f in w}}
 def test_native_all_career_players(self):
  r=audit(json.loads((ROOT/'docs/261021_Awards_HOF_Native_Reference.json').read_text()));self.assertEqual((r['playerCount'],r['checked'],r['differenceCount']),(111,999,0));self.assertFalse(r['currentHallOfFameVerified']);self.assertFalse(r['publicationAuthorized'])
 def test_combined_games_threshold(self):
  p=self.player(sg=25,gg=24);self.assertEqual(calculate([p],[])[0]['values']['HOF Eligible'],0);p['Career Total Goalie GP']=25;self.assertEqual(calculate([p],[])[0]['values']['HOF Eligible'],1)
 def test_prior_induction_excludes(self):
  p=self.player();a=[{'Player':'Test','Brave H.C. Hall of Fame':1,'Major Awards Won':2,'Minor Awards Won':1,'Points Awarded':10}];v=calculate([p],a)[0]['values'];self.assertEqual(v['HOF Eligible'],0);self.assertEqual(v['HOF Rank Key'],0);self.assertEqual(v['HOF Total Awards Won'],3)
 def test_scoring_role_tie_is_skater(self):
  self.assertEqual(calculate([self.player(sg=25,gg=25)],[])[0]['values']['HOF Scoring Type'],'Skater');self.assertEqual(calculate([self.player(sg=24,gg=26)],[])[0]['values']['HOF Scoring Type'],'Goaltender')
 def test_tied_positive_scores_and_row_order(self):
  r=calculate([self.player(),self.player('Second',row=7)],[]);self.assertTrue(all(p['values']['HOF Final Web Display Score']==100 for p in r));self.assertGreater(r[0]['values']['HOF Rank Key'],r[1]['values']['HOF Rank Key'])
 def test_zero_field_scores_fifty(self):
  self.assertEqual(calculate([self.player(value=0)],[])[0]['values']['HOF Final Web Display Score'],50)
 def test_ineligible_high_score_does_not_set_display_bounds(self):
  r=calculate([self.player(),self.player('Ineligible',sg=49,row=7,value=100)],[]);self.assertEqual(r[0]['values']['HOF Final Web Display Score'],100);self.assertEqual(r[1]['values']['HOF Final Web Display Score'],0)
 def test_missing_component_is_held(self):
  p=self.player();p['HOF Career Production Internal Score']=None
  with self.assertRaises(ValueError):calculate([p],[])
 def test_duplicate_identity_or_source_row_rejected(self):
  with self.assertRaises(ValueError):calculate([self.player(),self.player()],[])
  with self.assertRaises(ValueError):calculate([self.player(),self.player('Second')],[])
 def test_saved_award_blanks_follow_sumifs_semantics(self):
  a=[{'Player':'Test','Brave H.C. Hall of Fame':'','Major Awards Won':'','Minor Awards Won':1,'Points Awarded':2}];self.assertEqual(calculate([self.player()],a)[0]['values']['HOF Total Awards Won'],1)
if __name__=='__main__':unittest.main()
