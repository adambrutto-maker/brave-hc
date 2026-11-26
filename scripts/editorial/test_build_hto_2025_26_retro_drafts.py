"""Source and scope regressions for Winter 2025/26 historical archive drafts."""
import copy
from collections import Counter
from hashlib import sha256
import json,re
from pathlib import Path
import unittest

import build_hto_2025_26_retro_drafts as retro

class Winter2025AuditTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.audit=json.loads(retro.AUDIT.read_text(encoding="utf-8"))
  cls.manifest=json.loads((retro.OUTPUT/"manifest.json").read_text(encoding="utf-8"))
  cls.byid={g["id"]:g for g in cls.audit["games"]}

 def test_27_unique_official_ids(self):
  self.assertEqual(len(self.audit["games"]),27)
  self.assertEqual(len(self.byid),27)

 def test_exact_quality_partition(self):
  self.assertEqual(dict(Counter(g["auditStatus"] for g in self.audit["games"])),{
   retro.FULL:5,retro.OT_PARTIAL:1,retro.PERIOD:18,retro.FORFEIT:3
  })

 def test_team_stats_row_excluded(self):
  for g in self.audit["games"]:
   self.assertTrue(all(p["name"]!="Team Stats" for p in g.get("players",[])))

 def test_five_complete_games_have_per_player_credit_parity(self):
  for g in self.audit["games"]:
   if g["auditStatus"]!=retro.FULL:continue
   goals=Counter();assists=Counter()
   for e in g["events"]:
    if e["team"]!="Brave H.C.":continue
    scorer=re.match(r"^\s*(\d+)\s+",e["credit"])
    self.assertIsNotNone(scorer)
    goals[scorer.group(1)]+=1
    m=re.search(r"\(([^)]*)\)",e["credit"])
    if m:
     for t in m.group(1).split(","):
      x=re.match(r"^\s*(\d+)\s+",t)
      self.assertIsNotNone(x)
      assists[x.group(1)]+=1
   roster={p["number"]:p for p in g["players"]}
   self.assertEqual(len(roster),len(g["players"]))
   self.assertEqual(sum(goals.values()),g["gf"])
   for number,p in roster.items():
    self.assertEqual(goals[number],p["G"])
    self.assertEqual(assists[number],p["A"])

 def test_every_played_game_periods_sum_to_final(self):
  for g in self.audit["games"]:
   if g["auditStatus"]==retro.FORFEIT:continue
   p=g["periods"]
   self.assertEqual(sum(x["braves"] for x in p),g["gf"])
   self.assertEqual(sum(x["opponent"] for x in p),g["ga"])
   self.assertTrue(all(x["period"] in ("1","2","3","OT","2OT") for x in p))

 def test_24_retrospective_drafts_3_forfeits(self):
  self.assertEqual(len(self.manifest["stories"]),24)
  self.assertEqual(len(self.manifest["forfeits"]),3)
  self.assertEqual({g["gameId"] for g in self.manifest["stories"]},
                   {g["id"] for g in self.audit["games"] if g["auditStatus"]!=retro.FORFEIT})

 def test_no_forfeits_are_written_as_draws(self):
  texts=[x["headline"] for x in self.manifest["stories"]]
  self.assertFalse(any(x["gameId"] in {z["id"] for z in self.audit["games"] if z["auditStatus"]==retro.FORFEIT}
                       for x in self.manifest["stories"]))
  self.assertFalse(any("0–0" in title for title in texts))
  self.assertTrue(all(x["zeroScoreIsNotTie"] for x in self.manifest["forfeits"]))

 def test_draft_status_and_original_date_disclaimer(self):
  self.assertFalse(self.manifest.get("HTONativeFieldsWritten",False))
  self.assertEqual(self.manifest["publicationState"],"DRAFT_ONLY_NO_NATIVE_HTO_WRITES")
  for entry in self.manifest["stories"]:
   src=(retro.OUTPUT/entry["file"]).read_text(encoding="utf-8")
   self.assertIn("not an original contemporaneous article",src)
   self.assertIn("NOT PUBLISHED OR APPROVED FOR NATIVE HTO",src)
   self.assertIn("EDITORIAL DRAFT",src)
   self.assertTrue(src.startswith("# "+entry["headline"]))
   self.assertNotIn("\r",src)

 def test_partial_games_never_invent_goal_times(self):
  for entry in self.manifest["stories"]:
   src=(retro.OUTPUT/entry["file"]).read_text(encoding="utf-8")
   if entry["coverage"]==retro.PERIOD:
    self.assertNotIn("official clock ",src)
    self.assertIn("No complete goal-by-goal event log is available",src)
   elif entry["coverage"]==retro.FULL:
    self.assertIn("official clock ",src)

 def test_playoff_scope_is_not_regular_season(self):
  for entry in self.manifest["stories"]:
   txt=(retro.OUTPUT/entry["file"]).read_text(encoding="utf-8")
   if entry["gameType"]=="PLAYOFFS":
    self.assertIn("playoff game",txt)
    self.assertIn("PLAYOFFS",txt)
   else:
    self.assertIn("regular-season game",txt)

 def test_same_day_playoff_games_distinct(self):
  matches=[g for g in self.manifest["stories"] if g["date"]=="2026-03-22"]
  self.assertEqual({x["gameId"] for x in matches},{2215014,2215015})
  self.assertNotEqual(matches[0]["file"],matches[1]["file"])

 def test_overtime_loss_respects_regulation_draw(self):
  g=self.byid[2215014]
  self.assertEqual((g["gf"],g["ga"]),(0,1))
  self.assertIn("Regulation ended 0–0",retro.period_summary(g))
  self.assertIn("Overtime",retro.result_title(g))
  self.assertEqual(g["auditStatus"],retro.OT_PARTIAL)

 def test_broken_period_total_fails_closed(self):
  sample=copy.deepcopy(self.byid[2215015])
  sample["periods"][0]["braves"]+=1
  with self.assertRaisesRegex(ValueError,"PERIOD_SCORE_NOT_FINAL"):
   retro.period_summary(sample)

 def test_unknown_status_fails_closed(self):
  sample=copy.deepcopy(self.byid[2215015])
  sample["auditStatus"]="UNVERIFIED_AWARD_WINNER"
  with self.assertRaisesRegex(ValueError,"GAME_NOT_ELIGIBLE"):
   retro.article(sample)

 def test_26_27_published_pack_separate(self):
  self.assertTrue(all("2025-26/retrospective_drafts/" not in s["file"]
                      for s in self.manifest["stories"]))
  self.assertEqual(self.manifest["season"],"Winter_2025/2026")
  self.assertTrue((retro.ROOT/"docs/editorial/native_hto/2026-27/manifest.json").exists())

 def test_audit_hash_matches_manifest(self):
  self.assertEqual(self.manifest["sourceAuditSHA256"],
                   sha256(retro.AUDIT.read_bytes()).hexdigest())

if __name__=="__main__":
 unittest.main(verbosity=2)
