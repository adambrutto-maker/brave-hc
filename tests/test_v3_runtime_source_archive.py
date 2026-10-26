"""Source-only assurance for the validated HTO source crosscheck v3."""
from pathlib import Path
from hashlib import sha256
import ast,unittest
ROOT=Path(__file__).resolve().parents[1]
PINNED={
 "hockeyos_dynamic_admission.py":"21b6142cd1b3ddeccb65d7d5b28f96d53979b5cca70cf978fc530b405d72aacd",
 "hockeyos_operational_collector.py":"fb3fd36c52a6a85e484e2d87fc326ccd5f4a96e08cfe5a5b55e83a28fea487c3"}
class SourceArchiveQA(unittest.TestCase):
 def test_pinned_runtime_source_exact(self):
  for name,want in PINNED.items():
   p=ROOT/"scripts"/"runtime_v3"/name
   self.assertTrue(p.is_file(),name)
   self.assertEqual(sha256(p.read_bytes()).hexdigest(),want,name)
   ast.parse(p.read_text(encoding="utf8"),filename=name)
 def test_full_source_parity_contract_is_present(self):
  a=(ROOT/"scripts"/"runtime_v3"/"hockeyos_dynamic_admission.py").read_text(encoding="utf8")
  b=(ROOT/"scripts"/"runtime_v3"/"hockeyos_operational_collector.py").read_text(encoding="utf8")
  for text in ("HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT",
               "HTO_CANONICAL_GAME_PERIOD_SUM_INVALID",
               "review.verify_content(source,url,game_id=gid)"):
   self.assertIn(text,a)
  for text in ("HTO_TEAM_SUMMARY_GP_GF_GA_DISAGREEMENT",
               "HTO_SKATER_TEAM_TOTALS_DISAGREEMENT",
               "HTO_GOALIE_TEAM_TOTALS_DISAGREEMENT",
               "SOURCE_SEASON_PARITY_EVIDENCE_MISMATCH",
               "rollback_feed","OutputLock"):
   self.assertIn(text,b)
 def test_builder_references_pinned_templates(self):
  text=(ROOT/"scripts"/"build_hto_source_crosscheck_v3.py").read_text(encoding="utf8")
  ast.parse(text)
  for name,d in PINNED.items():
   self.assertIn(name,text)
   self.assertIn(d,text)
  self.assertIn("AUDITED_V3_SOURCE_REFERENCE_MISSING_OR_CHANGED",text)
if __name__=="__main__":unittest.main(verbosity=2)
