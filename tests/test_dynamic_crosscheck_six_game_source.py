"""V3 strict source-parity negative tests, fully offline.

SYNTHETIC fixture (never an official future game): Nov 1 2026 gameID
9900001, Brave H.C. vs Mid Ice Crisis 6–4, copied prior player statistics.
Public HTO Scores page, individual boxscore and season Stats MUST agree;
the original pinned workbook and active production source are not edited.
"""
from __future__ import annotations
from datetime import date as RealDate
from hashlib import sha256
from pathlib import Path
from copy import deepcopy
import os,sys,json,unittest
V3=Path(os.environ.get("HOCKEYOS_V3_QA_RUNTIME",r"D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\dynamic-source-crosscheck-v3-261026\scripts"))
QA=Path(os.environ.get("HOCKEYOS_SYNTHETIC_SIXTH_FIXTURE",r"D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_SixthGame_FullAdapter_QA"))
SOURCE=Path(os.environ.get("HOCKEYOS_VERIFIED_FIVE_GAME_FEED",r"D:\BruTTech\Products\HockeyOS\261016_HTO_Widget_Phase0\261017_HTO_Verified_GameLevel_Skater_Attendance.json"))
BOOK=Path(os.environ.get("HOCKEYOS_CANONICAL_MASTER",r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx"))
AVAILABLE=all(p.exists() for p in (V3/"hockeyos_dynamic_admission.py",QA/"synthetic_html_fixture.json",SOURCE,BOOK))
if AVAILABLE:
 sys.path.insert(0,str(V3))
 import hockeyos_operational_collector as collector
 import hockeyos_dynamic_admission as dynamic
 import hockeyos_collector_candidate as candidate
 import hockeyos_review_four_game_source_parity as review
 import plan_date_bound_hto_game_ids as mapper
 class SimDate(RealDate):
  @classmethod
  def today(cls):return cls(2026,11,2)
 mapper.date=SimDate
 ROOT=json.loads((QA/"synthetic_html_fixture.json").read_text(encoding="utf8"))
 SCORE_URL=candidate.SCORE_URL
 NEW_URL="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID=9900001&p=boxscore"
 def run_admission(pages):
  def fake_fetch(url):
   if url not in pages:raise AssertionError("UNINTERCEPTED_SOURCE_NETWORK_REQUEST:"+url)
   return pages[url]
  review.fetch_html=fake_fetch
  dynamic.configure(collector,QA)
 def run_full(pages):
  run_admission(pages)
  feed=collector.verified_feed()
  collector.validate_feed(feed)
  return feed

@unittest.skipUnless(AVAILABLE,"Private BRUTTECH 1 synthetic fixture unavailable on CI")
class V3CrosscheckQA(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.live_sha=sha256(SOURCE.read_bytes()).hexdigest()
  cls.book_sha=sha256(BOOK.read_bytes()).hexdigest()
 @classmethod
 def tearDownClass(cls):
  assert sha256(SOURCE.read_bytes()).hexdigest()==cls.live_sha,"ACTIVE_HTO_SOURCE_WAS_CHANGED"
  assert sha256(BOOK.read_bytes()).hexdigest()==cls.book_sha,"ORIGINAL_MASTER_WAS_CHANGED"
 def test_sixth_game_passes_entire_operational_adapter(self):
  fresh=run_full(deepcopy(ROOT))
  collector.validate_feed(fresh)
  self.assertEqual(fresh["teamGP"],6)
  self.assertEqual(fresh["teamG"],18)
  self.assertEqual(fresh["teamA"],28)
  self.assertEqual(len(fresh["games"]),6)
  self.assertEqual(candidate.GAME_MAP[9900001],(364,"2026-11-01"))
 def test_scores_opponent_disagrees_with_boxscore_holds(self):
  pages=deepcopy(ROOT)
  self.assertIn("Mid Ice Crisis",pages[SCORE_URL])
  pages[SCORE_URL]=pages[SCORE_URL].replace("Mid Ice Crisis","Incorrect Team",1)
  with self.assertRaisesRegex(Exception,"HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT"):
   run_admission(pages)
 def test_boxscore_opponent_disagrees_with_scores_holds(self):
  pages=deepcopy(ROOT)
  pages[NEW_URL]=pages[NEW_URL].replace("Mid Ice Crisis","Incorrect Team",1)
  with self.assertRaisesRegex(Exception,"HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT"):
   run_admission(pages)
 def test_boxscore_missing_period_arithmetic_holds(self):
  pages=deepcopy(ROOT)
  old='<td>Brave H.C.</td><td>6</td><td>0</td><td>0</td><td>0</td><td>0</td><td>6</td>'
  new='<td>Brave H.C.</td><td>7</td><td>0</td><td>0</td><td>0</td><td>0</td><td>6</td>'
  self.assertIn(old,pages[NEW_URL]);pages[NEW_URL]=pages[NEW_URL].replace(old,new,1)
  with self.assertRaisesRegex(Exception,"HTO_CANONICAL_GAME_PERIOD_SUM_INVALID"):
   run_admission(pages)
 def test_scores_page_changed_final_with_consistent_periods_holds(self):
  pages=deepcopy(ROOT)
  old='<td>Brave H.C.</td><td>6</td><td>0</td><td>0</td><td>0</td><td>0</td><td>6</td>'
  new='<td>Brave H.C.</td><td>7</td><td>0</td><td>0</td><td>0</td><td>0</td><td>7</td>'
  self.assertIn(old,pages[SCORE_URL]);pages[SCORE_URL]=pages[SCORE_URL].replace(old,new,1)
  with self.assertRaisesRegex(Exception,"HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT"):
   run_admission(pages)
 def test_untrusted_sixth_boxscore_canonical_holds(self):
  pages=deepcopy(ROOT)
  pages[NEW_URL]=pages[NEW_URL].replace('gameID=9900001','gameID=9900002',1)
  with self.assertRaisesRegex(Exception,"CONTENT_CANONICAL_URL_MISMATCH"):
   run_admission(pages)
 def test_team_season_count_disagrees_with_discovered_six_holds(self):
  pages=deepcopy(ROOT)
  old='<td>Team Stats</td><td></td><td></td><td>6</td>'
  # Season skater Team Stats row from fake source with blank GP? stable source
  # simply modify expected goals in exact source Stats footer 6/18/27 -> 7/18/27.
  old2='<td>6</td><td>18</td><td>27</td><td>0</td><td>0.0%</td>'
  new2='<td>7</td><td>18</td><td>27</td><td>0</td><td>0.0%</td>'
  self.assertIn(old2,pages[candidate.STATS_URL])
  pages[candidate.STATS_URL]=pages[candidate.STATS_URL].replace(old2,new2,1)
  with self.assertRaisesRegex(Exception,"HTO_TEAM_SUMMARY_GP_GF_GA_DISAGREEMENT"):
   run_full(pages)
 def test_skater_team_summary_tampering_held(self):
  pages=deepcopy(ROOT)
  old='<td>Team Stats</td><td></td><td></td><td>6</td><td>18</td>'
  new='<td>Team Stats</td><td></td><td></td><td>7</td><td>18</td>'
  self.assertIn(old,pages[candidate.STATS_URL])
  pages[candidate.STATS_URL]=pages[candidate.STATS_URL].replace(old,new,1)
  with self.assertRaisesRegex(Exception,"VERIFIED_GAME_COUNT_NOT_SEASON_GP|HTO_SKATER_TEAM_TOTALS_DISAGREEMENT"):
   run_full(pages)
 def test_goalie_team_summary_tampering_held(self):
  pages=deepcopy(ROOT)
  old='<td>Team Stats</td><td></td><td>6</td><td>2</td><td>4</td><td>27</td>'
  new='<td>Team Stats</td><td></td><td>6</td><td>2</td><td>4</td><td>28</td>'
  self.assertIn(old,pages[candidate.STATS_URL])
  pages[candidate.STATS_URL]=pages[candidate.STATS_URL].replace(old,new,1)
  with self.assertRaisesRegex(Exception,"HTO_GOALIE_TEAM_TOTALS_DISAGREEMENT"):
   run_full(pages)
 def test_synthetic_sixth_private_atomic_write_and_rollback(self):
  import tempfile
  feed=run_full(deepcopy(ROOT))
  with tempfile.TemporaryDirectory(prefix="synthetic_six_",dir=str(QA)) as dirname:
   root=Path(dirname)
   dest=root/collector.FEED_DIRECTORY/collector.FEED_BASENAME
   dest.parent.mkdir()
   first=collector.write_feed(feed,dest,expected_absent=True,operational_root=root)
   second=collector.write_feed(feed,dest,expected_sha=first["outputSHA256"],operational_root=root)
   self.assertEqual(second["backupSHA256"],first["outputSHA256"])
   rollback=collector.rollback_feed(dest,second["outputSHA256"],second["backupPath"],second["backupSHA256"],operational_root=root)
   self.assertEqual(rollback["outputSHA256"],first["outputSHA256"])
 def test_future_unplayed_real_clock_would_hold(self):
  pages=deepcopy(ROOT)
  original=mapper.date
  try:
   mapper.date=RealDate
   with self.assertRaisesRegex(Exception,"FUTURE_GAME_NOT_YET_COMPLETED"):
    run_admission(pages)
  finally:mapper.date=original
if __name__=="__main__":unittest.main(verbosity=2)
