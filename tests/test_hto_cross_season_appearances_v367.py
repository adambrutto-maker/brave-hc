"""Independent HTO cross-season Last 3/5/10 source coverage and refusal tests."""
import copy,hashlib,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_hto_cross_season_appearances_v367 as x

class CrossSeasonSourceTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.current=x.load(x.CURRENT)
  cls.index=x.load(x.INDEX)
  cls.career=x.load(x.CAREER)
  cls.formats=x.load(x.FORMAT)
  cls.currentReadback=x.load(x.BOX/'live_boxscores.json')
  cls.archive,cls.digests=x.archived_games()
  cls.digests[str((x.BOX/'live_boxscores.json').relative_to(x.ROOT)).replace("\\","/")]=x.sha(x.BOX/'live_boxscores.json')
 def make(self,**kw):
  d={"current":self.current,"index":self.index,"career":self.career,
     "formats":self.formats,"archived":self.archive,"digest":self.digests,
     "currentReadbacks":self.currentReadback}
  d.update(kw)
  return x.build(d["current"],d["index"],d["career"],d["formats"],d["archived"],d["digest"],d["currentReadbacks"])
 def test_all_recent_sources_exact_and_reproducible(self):
  r=self.make()
  self.assertEqual(r["schema"],x.SCHEMA)
  self.assertEqual(r["status"],x.STATUS)
  self.assertEqual(r,x.load(x.OUT))
  self.assertEqual(r["currentSource"]["players"],20)
  self.assertEqual(r["currentSource"]["verifiedGP"],67)
  self.assertEqual(r["qualification"]["verifiedCurrentPlayersWithAtLeast10"],12)
  self.assertEqual(r["qualification"]["playerTimelinesWithAtLeast10"],30)
  self.assertEqual(r["sourceSeasons"]["Winter 2025/2026"]["status"],"VERIFIED_INDEX_COMPLETE")
  self.assertEqual(r["sourceSeasons"]["Winter 2025/2026"]["indexGames"],27)
  self.assertEqual(r["sourceSeasons"]["Winter 2025/2026"]["forfeits"],3)
  self.assertEqual(r["sourceSeasons"]["Winter 2024/2025"]["indexGames"],26)
  self.assertEqual(r["sourceSeasons"]["Winter 2024/2025"]["forfeits"],1)
  self.assertTrue(r["scoringBasis"]["noSeasonBoundary"])
 def test_crosses_prior_winter_and_playoffs_in_player_clock_order(self):
  r=self.make()
  justin=r["players"]["354060"]
  self.assertEqual(len(justin["games"]),10)
  self.assertEqual([g["season"] for g in justin["games"][:5]],["W2026/27"]*5)
  self.assertEqual([g["season"] for g in justin["games"][5:]],["W2025/26"]*5)
  self.assertEqual([g["time"] for g in justin["games"][5:7]],["20:45","19:15"])
  self.assertEqual([g["pts"] for g in justin["games"][:5]],[2,0,1,2,0])
  self.assertEqual(justin["games"][5]["pts"],0,"Source-proven late game with no goals still counts")
  self.assertTrue(any(g["phase"]=="Playoffs" for g in justin["games"]))
  self.assertTrue(all(g["minutes"]==32 for g in justin["games"]))
  self.assertEqual(justin["currentVerifiedGP"],5)
 def test_player_not_in_previous_winter_can_cross_earlier_verified_season(self):
  r=self.make()
  stefano=r["players"]["356089"]
  self.assertEqual(stefano["games"][0]["season"],"W2026/27")
  self.assertEqual(stefano["games"][1]["season"],"W2025/26")
  self.assertEqual(stefano["games"][2]["season"],"W2024/25")
  self.assertEqual(len(stefano["games"]),10)
  self.assertEqual(len(set(g["gameId"] for g in stefano["games"])),10)
 def test_no_stats_forfeit_is_not_a_player_appearance(self):
  r=self.make()
  skip={2215007,2215009,2215012,2148155}
  self.assertTrue(all(not (skip & {g["gameId"] for g in p["games"]})
                      for p in r["players"].values()))
  self.assertTrue(r["governance"]["forfeitsCountAsZeroPlayedAppearances"])
 def test_source_shortfall_blocks_older_history_no_unverified_skip(self):
  archive=dict(self.archive)
  del archive["2215015"]
  r=self.make(archived=archive)
  self.assertEqual(r["sourceSeasons"]["Winter 2025/2026"]["status"],"HELD")
  justin=r["players"]["354060"]
  self.assertEqual(len(justin["games"]),5)
  self.assertTrue(justin["firstUnqualifiedOlderSource"].startswith("PLAYER_SEASON"))
  self.assertFalse(any(g["season"]=="W2024/25" for g in justin["games"]))
 def test_stale_or_drifted_current_source_fails_closed(self):
  c=copy.deepcopy(self.current);c["status"]="HELD"
  with self.assertRaisesRegex(ValueError,"CURRENT_HTO_APPEARANCES_UNVERIFIED"):
   self.make(current=c)
  currentArchive=copy.deepcopy(self.currentReadback)
  currentArchive["games"].pop()
  with self.assertRaisesRegex(ValueError,"CURRENT_HTO_CLOCK_GAME_COVERAGE_INCOMPLETE"):
   self.make(currentReadbacks=currentArchive)
 def test_history_player_score_tamper_yields_explicit_barrier(self):
  career=copy.deepcopy(self.career)
  row=next(r for seg in career["players"]["354060"]["segments"]
           if seg["kind"]=="skater" for r in seg["seasons"]
           if r["Season"]=="Winter 2025/2026")
  row["GP"]+=1
  r=self.make(career=career)
  self.assertEqual(len(r["players"]["354060"]["games"]),5)
  self.assertIn("W2025/26",r["players"]["354060"]["firstUnqualifiedOlderSource"])
 def test_unverified_source_game_length_blocks_season(self):
  formats=copy.deepcopy(self.formats)
  formats["seasonBindings"]["Winter 2025/2026::ALL_HTO_GAME_TYPES"]["verificationStatus"]="HELD"
  with self.assertRaisesRegex(ValueError,"UNVERIFIED_HISTORICAL_GAME_DURATION"):
   self.make(formats=formats)
 def test_duplicate_archived_source_game_or_nonofficial_url_fails_closed(self):
  archive=dict(self.archive)
  game=copy.deepcopy(archive["2215015"]);game["url"]="https://example.com/teams/default.asp?gameID=2215015"
  archive["2215015"]=game
  r=self.make(archived=archive)
  self.assertEqual(r["sourceSeasons"]["Winter 2025/2026"]["status"],"HELD")
  self.assertEqual(len(r["players"]["354060"]["games"]),5)
 def test_rebuild_only_derived_feed_and_never_modify_original_sources(self):
  tracked=[x.CURRENT,x.INDEX,x.CAREER,x.FORMAT,x.MAIN,x.BOX/"live_boxscores.json"]
  before=[hashlib.sha256(t.read_bytes()).hexdigest() for t in tracked]
  with tempfile.TemporaryDirectory() as tmp:
   output=Path(tmp)/"cross-season.json"
   x.run(["--write","--output",str(output)])
   x.run(["--check","--output",str(output)])
   self.assertEqual(x.load(output),self.make())
  after=[hashlib.sha256(t.read_bytes()).hexdigest() for t in tracked]
  self.assertEqual(before,after)
if __name__=="__main__":unittest.main()
