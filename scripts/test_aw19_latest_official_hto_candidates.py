"""Synthetic fixtures only; source adapter parses official-shaped HTO HTML.
No HTO network calls or native award mutations in these tests."""
import unittest,copy,datetime
from aw19_latest_official_hto_candidates import (parse_boxscore,parse_profile_career,
   canonical_url,reconcile_latest)
DATE="2026-10-25"
GAME_ID=9990001
GAME=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&gameID={GAME_ID}"
PLAYER="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=123"
GOALIE="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=profile&playerID=456"
BOX=f"""
<html><table><tr><td>No</td><td>Name</td><td>POS</td><td>GP</td><td>G</td><td>A</td><td>Pts</td></tr>
<tr><td>28</td><td><a href="{PLAYER}">Tester, Alice</a></td><td>F</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
</table><table><tr><td>No</td><td>Name</td><td>GP</td><td>W</td><td>GA</td></tr>
<tr><td>70</td><td><a href="{GOALIE}">Goalie, Bob</a></td><td>1</td><td>1</td><td>0</td></tr></table></html>"""
SKATER=f"""<html><table><tr><td>Team</td><td>Season</td><td>GP</td><td>G</td><td>A</td><td>Pts</td></tr>
<tr><td>Brave H.C.</td><td>Winter 2026/2027</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>Career</td><td></td><td>54</td><td>50</td><td>12</td><td>62</td></tr>
</table></html>"""
GOALIE_DOC="""<html><table><tr><td>Team</td><td>Season</td><td>GP</td><td>W</td><td>SHO</td><td>GA</td></tr>
<tr><td>Brave H.C.</td><td>Winter 2026/2027</td><td>1</td><td>1</td><td>1</td><td>0</td></tr>
<tr><td>Career</td><td></td><td>76</td><td>50</td><td>5</td><td>188</td></tr>
</table></html>"""
NOW=datetime.datetime(2026,10,28,5,30,tzinfo=datetime.timezone.utc)
FEED={"schema":"brave-hc-hto-verified-game-feed/v1","sourceReadback":"2026-10-28T05:00:00+00:00",
 "allGamesDiscovered":True,"playerAggregateParity":True,"teamGP":1,
 "games":[{"date":DATE,"htoGameId":GAME_ID,"sourceUrl":GAME,"teamGoals":1,"teamGoalsAgainst":0,
    "skaters":[{"name":"Tester, Alice","gp":1,"g":1,"a":0,"pts":1}],
    "goalies":[{"name":"Goalie, Bob","gp":1,"goalsAgainst":0}]}]}
def fetch(url):
 if url==GAME:return BOX.encode()
 if url==PLAYER:return SKATER.encode()
 if url==GOALIE:return GOALIE_DOC.encode()
 raise AssertionError("unexpected source fetch "+url)
class AW19SourceTests(unittest.TestCase):
 def test_boxscore_exact_player_id(self):
  sk,gk=parse_boxscore(BOX.encode(),GAME_ID)
  self.assertEqual(set(sk),{123});self.assertEqual(set(gk),{456})
  self.assertEqual((sk[123]['G'],sk[123]['A'],gk[456]['W']), (1,0,1))
 def test_correct_thresholds_source_and_date(self):
  r=reconcile_latest(FEED,fetch,now=NOW)
  self.assertEqual(r['status'],'SOURCE_RECONCILIATION_PASS')
  self.assertEqual([p['club'] for p in r["proposed_milestones"]],
     ["50 Goal Club","50 Win Club","5 Shutout Club"])
  self.assertEqual([p['date'] for p in r["proposed_milestones"]],[DATE]*3)
  self.assertEqual(r['source_player_count'],2)
  self.assertEqual(r['automatic_grants'],0)
 def test_detects_stale_feed(self):
  f=copy.deepcopy(FEED);f["sourceReadback"]="2026-10-22T00:00:00+00:00"
  with self.assertRaisesRegex(ValueError,"stale"):reconcile_latest(f,fetch,now=NOW)
 def test_profile_mismatch_is_held_not_awarded(self):
  def bad(url):
   if url==PLAYER:return SKATER.replace("<td>1</td><td>1</td><td>0</td><td>1</td>","<td>1</td><td>2</td><td>0</td><td>2</td>").encode()
   return fetch(url)
  r=reconcile_latest(FEED,bad,now=NOW)
  self.assertEqual(len(r['held_players']),1)
  self.assertEqual(r['held_players'][0]['official_player_id'],123)
  self.assertEqual({x['club'] for x in r['proposed_milestones']},{"50 Win Club","5 Shutout Club"})
 def test_rejects_foreign_boxscore_url(self):
  with self.assertRaises(AssertionError):
   canonical_url("https://evil.example/teams/default.asp?u=BRAVESHOCKEY&p=boxscore&gameID=9990001",GAME_ID)
 def test_holds_when_shutout_ambiguous(self):
  f=copy.deepcopy(FEED)
  f["games"][0]["goalies"].append({"name":"Substitute, Joe","gp":1,"goalsAgainst":0})
  # Roster/table parity fails closed; a split shutout is not automatically awarded.
  with self.assertRaisesRegex(ValueError,"roster count"):
   reconcile_latest(f,fetch,now=NOW)
if __name__=="__main__":unittest.main(verbosity=2)
