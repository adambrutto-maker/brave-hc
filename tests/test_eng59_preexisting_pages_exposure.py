"""Scoped privacy/release inventory QA with fictional in-memory mutations."""
import subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_eng59_preexisting_pages_exposure import (
 evaluate,EXPECTED,scan,ReleaseSurfaceHold)
TRACKED=set(subprocess.check_output(["git","-C",str(ROOT),"ls-files"],text=True).splitlines())
PATH=next(x for x in EXPECTED if x.endswith("build_private_online_opponent_ledger.py"))
class PrivacyInventoryTests(unittest.TestCase):
 def test_real_source_files_are_reported_without_claiming_independent_clearance(self):
  r=evaluate(ROOT,TRACKED)
  self.assertEqual(r["candidatePrivateNamedSourceFiles"],3)
  self.assertEqual(r["literalCredentialPatternCandidates"],0)
  self.assertFalse(r["sourceSharingAndPrivacyApproved"])
  self.assertFalse(r["credentialAbsenceIndependentlyCertified"])
  self.assertFalse(r["currentReleaseDeploymentAuthorized"])
  self.assertEqual(set(r["scopedSourceFiles"]),set(EXPECTED))
  self.assertTrue(all(x["lines"]>0 and x["requiresIndependentContentAndPublicSharingReview"]
     and not x["rawPrivateWorkbookContentsAssessed"]
     and len(x["sourceFileSHA256"])==64 for x in r["scopedSourceFiles"].values()))
 def test_synthetic_embedded_key_value_forces_hold(self):
  fake='API_KEY = "FICTIONAL-DO-NOT-USE-SECRET-12345"\n'
  with self.assertRaisesRegex(ReleaseSurfaceHold,"LITERAL_CREDENTIAL_OR_PRIVATE_KEY_BLOCK"):
   evaluate(ROOT,TRACKED,{PATH:fake})
 def test_synthetic_pem_forces_hold(self):
  fake="-----BEGIN PRIVATE KEY-----\nFICTIONAL_ONLY\n-----END PRIVATE KEY-----"
  with self.assertRaisesRegex(ReleaseSurfaceHold,"LITERAL_CREDENTIAL_OR_PRIVATE_KEY_BLOCK"):
   evaluate(ROOT,TRACKED,{PATH:fake})
 def test_added_private_named_file_prevents_false_pass(self):
  t=TRACKED|{"docs/extra_private_bundle.py"}
  with self.assertRaisesRegex(ReleaseSurfaceHold,"PREEXISTING_PRIVATE_NAMED_PATH_SET_DRIFT"):
   evaluate(ROOT,t)
 def test_removed_previous_file_from_release_scope_requires_review(self):
  t=set(TRACKED);t.remove(PATH)
  with self.assertRaisesRegex(ReleaseSurfaceHold,"PREEXISTING_PRIVATE_NAMED_PATH_SET_DRIFT"):
   evaluate(ROOT,t)
 def test_windows_path_not_treated_as_credential_or_a_privacy_signoff(self):
  d=scan("D:\\BruTTech\\HockeyOS\\Internal\\Private.xlsx\n", "PRIVATE_WORKBOOK_REVIEW_NARRATIVE")
  self.assertGreaterEqual(d["absoluteWindowsPathReferences"],1)
  self.assertEqual(d["credentialAssignmentCandidates"],0)
  self.assertFalse(d["privacyApproved"])
 def test_fake_source_approvals_never_generated(self):
  d=evaluate(ROOT,TRACKED)
  self.assertTrue(all(x["privacyApproved"] is False for x in d["scopedSourceFiles"].values()))
  self.assertEqual(d["status"],"DEVELOPER_SCOPED_SOURCE_INVENTORY_HUMAN_PRIVACY_APPROVAL_REQUIRED")
if __name__=="__main__":unittest.main()
