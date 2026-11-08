"""Source-safe unit tests for HockeyOS readiness telemetry; no network/writes."""
from __future__ import annotations
import contextlib
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import io,json,hashlib,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import hockeyos_readiness_snapshot as gate


class ReadinessQA(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.widgets=ROOT/"widgets"
  cls.sources={name:json.loads((cls.widgets/name).read_text("utf8")) for name in gate.REQUIRED}
  cls.when=datetime(2026,11,8,3,55,tzinfo=timezone.utc)

 def evaluate(self,changes=None,when=None):
  doc=deepcopy(self.sources)
  if changes:changes(doc)
  return gate.audit(doc,self.widgets,when or self.when)

 @staticmethod
 def by_name(doc,name):
  return next(x for x in doc["checks"] if x["key"]==name)

 def test_authentic_inputs_have_five_independent_checks_and_never_assert_release(self):
  result=self.evaluate()
  self.assertEqual(result["schema"],gate.SCHEMA)
  self.assertEqual(result["checked"],5)
  self.assertEqual(set(x["key"] for x in result["checks"]),
                   {"league","roster","projection","dispersion","lineup"})
  self.assertEqual(result["passCount"]+result["holdCount"]+result["reviewCount"],5)
  self.assertTrue(result["notApprovedForPublicForecast"])
  self.assertEqual(result["scope"],"READ_ONLY_PUBLIC_SOURCE_EVIDENCE_NOT_A_MODEL_RELEASE")

 def test_league_pass_is_source_qualified_with_count_evidence(self):
  result=self.evaluate()
  x=self.by_name(result,"league")
  self.assertEqual(x["state"],"PASS")
  self.assertEqual(x["evidence"]["teams"],len(self.sources["league-intelligence.json"]["teams"]))

 def test_mismatched_workbook_and_hto_game_counts_always_hold(self):
  def mismatch(doc):
   doc["projection.json"]["sourceInputs"]["workbookRecordedTeamGP"]=1
   doc["projection.json"]["sourceInputs"]["htoRecordedTeamGP"]=6
   doc["projection.json"]["sourceInputs"]["verifiedHTOBoxscoreGP"]=6
  result=self.evaluate(mismatch)
  x=self.by_name(result,"projection")
  self.assertEqual(x["state"],"HOLD")
  self.assertEqual(x["code"],"HTO_WORKBOOK_GAME_COVERAGE_MISMATCH")

 def test_even_hypothetically_equal_game_counts_only_qualify_for_manual_review(self):
  def equal(doc):
   p=doc["projection.json"]
   p["sourceInputs"]["workbookRecordedTeamGP"]=p["sourceInputs"]["verifiedHTOBoxscoreGP"]
  x=self.by_name(self.evaluate(equal),"projection")
  self.assertEqual(x["state"],"REVIEW")
  self.assertEqual(x["code"],"MODEL_REQUIRES_INDEPENDENT_PUBLICATION_REVIEW")

 def test_future_or_old_readback_cannot_qualify_equal_counts(self):
  for iso in ("2027-01-01T00:00:00Z","2025-01-01T00:00:00Z","NOT_A_TIMESTAMP"):
   def invalid(doc):
    p=doc["projection.json"]
    p["sourceInputs"]["workbookRecordedTeamGP"]=p["sourceInputs"]["verifiedHTOBoxscoreGP"]
    p["htoreadback"]=iso
   x=self.by_name(self.evaluate(invalid),"projection")
   self.assertEqual(x["state"],"HOLD")

 def test_current_roster_source_never_passes_if_over_eight_days_old(self):
  def stale(doc):
   league=gate.parsedate(doc["league-intelligence.json"]["asOf"])
   source=league-timedelta(days=9)
   r=doc["svhl-roster-intelligence.json"]
   r["sourceLeagueAsOf"]=gate.stamp(source)
   r["asOf"]=gate.stamp(source+timedelta(hours=1))
  x=self.by_name(self.evaluate(stale),"roster")
  self.assertEqual(x["state"],"HOLD")
  self.assertEqual(x["code"],"ROSTER_LEAGUE_SOURCE_STALE_OR_FUTURE")

 def test_unmatched_dispersion_export_blocks_model_even_when_named_historical(self):
  def mismatch(doc):
   doc["hockeyos-team-dispersion-v365.json"]["model"]["projectionExportedAt"]="2026-01-01T01:00:00Z"
  x=self.by_name(self.evaluate(mismatch),"dispersion")
  self.assertEqual(x["state"],"HOLD")
  self.assertEqual(x["code"],"DISPERSION_PROJECTION_SNAPSHOT_MISMATCH")

 def test_identical_dispersion_and_projection_export_only_reaches_review(self):
  def align(doc):
   doc["hockeyos-team-dispersion-v365.json"]["model"]["projectionExportedAt"]=doc["projection.json"]["exportedAt"]
  x=self.by_name(self.evaluate(align),"dispersion")
  self.assertEqual(x["state"],"REVIEW")
  self.assertEqual(x["code"],"SOURCE_MATCH_REQUIRES_ADAPTIVE_MODEL_REVIEW")

 def test_published_tentative_lineup_integrity_positive_control(self):
  x=self.by_name(self.evaluate(),"lineup")
  self.assertEqual(x["state"],"PASS")
  self.assertEqual(x["code"],"PUBLISHED_TENTATIVE_CARD_VERIFIED")
  self.assertFalse(x["evidence"]["officialLineupApproved"])

 def test_lineup_published_asset_must_match_its_original_working_source(self):
  def changed_source(doc):
   doc["game-centre-lineup-public.json"]["workingCard"]["sha256"]="f"*64
  x=self.by_name(self.evaluate(changed_source),"lineup")
  self.assertEqual(x["state"],"HOLD")
 def test_lineup_hash_tamper_is_held(self):
  def tamper(doc):
   doc["game-centre-lineup-public.json"]["publishedWorkingCard"]["sha256"]="0"*64
  x=self.by_name(self.evaluate(tamper),"lineup")
  self.assertEqual(x["state"],"HOLD")

 def test_lineup_unapproved_goalie_cannot_be_secretly_promoted(self):
  def goalie(doc):
   doc["game-centre-lineup-public.json"]["publishedWorkingCard"]["goalieConfirmed"]=True
  x=self.by_name(self.evaluate(goalie),"lineup")
  self.assertEqual(x["state"],"HOLD")

 def test_lineup_expiration_and_path_traversal_hold(self):
  expire=self.by_name(self.evaluate(when=datetime(2026,11,10,tzinfo=timezone.utc)),"lineup")
  self.assertEqual(expire["state"],"HOLD")
  def tamper(doc):
   doc["game-centre-lineup-public.json"]["publishedWorkingCard"]["url"]="./assets/lineups/../../../../sensitive.pdf"
  self.assertEqual(self.by_name(self.evaluate(tamper),"lineup")["state"],"HOLD")

 def test_source_dict_and_public_file_hashes_are_unchanged(self):
  sources_before=deepcopy(self.sources)
  files=["league-intelligence.json","svhl-roster-intelligence.json",
         "projection.json","game-centre-lineup-public.json",
         "hockeyos-team-dispersion-v365.json"]
  before={name:hashlib.sha256((self.widgets/name).read_bytes()).hexdigest() for name in files}
  self.evaluate()
  after={name:hashlib.sha256((self.widgets/name).read_bytes()).hexdigest() for name in files}
  self.assertEqual(before,after)
  self.assertEqual(self.sources,sources_before)

 def test_cli_missing_required_source_holds_without_filesystem_write(self):
  out=io.StringIO()
  with contextlib.redirect_stdout(out):
   rc=gate.run(["--root",str(ROOT/"MISSING_QA_DIRECTORY"),"--strict"])
  self.assertEqual(rc,2)
  result=json.loads(out.getvalue())
  self.assertEqual(result["status"],"HOLD")
  self.assertTrue(result["notApprovedForPublicForecast"])

 def test_cli_real_strict_exit_is_only_nonzero_when_source_ready_is_not_pass(self):
  out=io.StringIO()
  with contextlib.redirect_stdout(out):
   rc=gate.run(["--root",str(ROOT),"--as-of",gate.stamp(self.when),"--strict"])
  result=json.loads(out.getvalue())
  self.assertEqual(rc,2 if result["status"]!="PASS" else 0)


if __name__=="__main__":
 unittest.main(verbosity=2)
