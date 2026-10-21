import json,unittest,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from hockeyos_awards_streak_ledger import build,SOURCE,RULES
from hockeyos_awards_current_streak_pipeline import replay
class StreakPipeline(unittest.TestCase):
 def test_career_streak_carries_across_seasons(self):
  rows=[]
  for i in range(1,4):
   r={'sourceRow':i+2,'Game #':i,'Name':'P','Season':'S2025' if i<3 else 'W2026/27','GP':1,'G':1,'A':0,'Pts':1,'POTG':0,'+/-':0,'Skater Positive Streak Heat Points':1.5 if i==3 else 0}
   r.update({f:i if f in ('Point Streak','Goal Streak') else 0 for f,_,_,_ in RULES});rows.append(r)
  master={'Website Name':'P','Position':'F','Recent Season':'W2026/27','Current Total Skater Streak Heat Points':1.5,'Career Prior Total Skater Streak Heat/GP':0,'All-Time Total Skater Streak Heat Team Rate Avg':.5}
  p=build({'sourceWorkbookSha256':SOURCE,'readOnlyHashUnchanged':True,'playerInfo':[master],'skaterGames':rows},{'season':'W2026/27','players':[{'name':'P','role':'Skater','season':'W2026/27'}]})
  self.assertEqual(p['differenceCount'],0);self.assertEqual(p['checked'],27)
 def fixtures(self):return [ROOT/'docs/261020_Awards_Original_Formula_Capture.json']+[json.loads((ROOT/'docs'/f).read_text()) for f in ['261021_Awards_Resolved_Game_Input_Candidate.json','261021_Awards_Current_Population_Join.json','261021_Awards_Streak_Ledger.json']]
 def test_saved_history_reconciliation(self):
  p=self.fixtures()[-1];self.assertEqual((p['checked'],p['differenceCount']),(37705,0))
 def test_all22_current_values(self):
  p=replay(*self.fixtures());c=p['components']['Total Streak Heat Internal Score'];self.assertEqual(len(c['rows']),22);self.assertEqual(c['normalized']['numericPlayerCount'],22)
  self.assertFalse(p['publicationAuthorized'])
 def test_changed_current_observation_rejected(self):
  args=self.fixtures();args[1]['rows'][0]['inputs']['G']=1
  with self.assertRaises(ValueError):replay(*args)
 def test_goalie_loss_required_for_zero_heat(self):
  args=self.fixtures();r=next(r for r in args[1]['rows'] if r['targetTable']=='GoalieStatsByGame');r['inputs']['L']=None
  with self.assertRaises(ValueError):replay(*args)
if __name__=='__main__':unittest.main()
