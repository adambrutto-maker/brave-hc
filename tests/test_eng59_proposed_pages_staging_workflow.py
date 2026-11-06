"""Proof proposed Pages staging does NOT change production or deploy anything.

Synthetic source-text mutations exercise the inactivity/security conditions.
No external workflow invocation, network calls, or GitHub Pages permissions.
"""
from pathlib import Path
import re,unittest
ROOT=Path(__file__).resolve().parents[1]
PROPOSAL=ROOT/"docs"/"ENG59_Proposed_Scoped_Pages_Staging_Workflow_20261027.yml"
KNOWN=ROOT/".github"/"workflows"/"pages.yml"
REQUIRED=(
 "actions/checkout@v6",
 "actions/setup-python@v6",
 "scripts/check_eng59_release_evidence.py",
 "scripts/check_eng59_static_release_surface.py",
 "scripts/check_eng59_preexisting_pages_exposure.py",
 "scripts/check_eng59_frozen_source_freshness.py",
 "scripts/build_eng59_scoped_static_preview.py",
 "test_eng59_scoped_static_preview.py",
 "--output \"$RUNNER_TEMP/eng59_scoped_site\"",
 "--receipt \"$RUNNER_TEMP/eng59_scoped_site_manifest.json\"",
 '--private-preview-manifest "$RUNNER_TEMP/eng59_scoped_site_manifest.json"',
 "actions/upload-artifact@v4",
 "name: eng59-scoped-web-only-review",
 "if-no-files-found: error",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/docs\"",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/scripts\"",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/.github\"",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/widgets/assets/opaque-originals\"",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/widgets/assets/approved-sources\"",
 "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/widgets/assets/approved-history\"",
)
class ProposalHold(ValueError):pass
def check(candidate,existing):
 def need(ok,reason):
  if not ok:raise ProposalHold("ENG59_INACTIVE_STAGING_PROPOSAL_HOLD:"+reason)
 need(PROPOSAL.parent.name=="docs" and
      PROPOSAL.resolve().is_relative_to(ROOT.resolve()),"PROPOSAL_OUTSIDE_INERT_DOCS")
 need("NOT AN ACTIVE GITHUB ACTIONS WORKFLOW" in candidate and
      "on:\n  workflow_dispatch:\n" in candidate,
      "MANUAL_DRAFT_INERT_DECLARATION_MISSING")
 need(all(part in candidate for part in REQUIRED),"REQUIRED_BUILD_VERIFICATION_OR_ARTIFACT_STEP_MISSING")
 need("permissions:\n      contents: read" in candidate,
      "STAGING_PERMISSIONS_NOT_READ_ONLY")
 # Strip comments before testing active Actions keys/commands.
 lines=[line for line in candidate.splitlines()
        if line.strip() and not line.lstrip().startswith("#")]
 active="\n".join(lines)
 need(not re.search(r"(?m)^\s*pages:\s*write",active) and
      not re.search(r"(?m)^\s*id-token:\s*write",active) and
      "deploy-pages@" not in active and
      "upload-pages-artifact@" not in active,
      "STAGING_PROPOSAL_BECAME_PRODUCTION_DEPLOYER")
 need(not re.search(r"(?m)^\s*path:\s*['\"]?\.['\"]?\s*$",active),
      "ROOT_DIRECTORY_PUBLICATION_PROPOSED")
 need(re.search(r"(?m)^\s*path:\s*\$\{\{ runner\.temp \}\}/eng59_scoped_site\s*$",active),
      "SINGLE_SCOPED_ARTIFACT_PATH_MISSING")
 need(not re.search(r"(?m)^\s*push:",active) and
      not re.search(r"(?m)^\s*schedule:",active),
      "STAGING_AUTOMATIC_PUBLISH_TRIGGER_NOT_ALLOWED")
 need("path: '.'" in existing and "actions/deploy-pages@" in existing,
      "EXISTING_ROOT_PUBLICATION_BASELINE_CHANGED_HUMAN_REVIEW_REQUIRED")
 return {"status":"INERT_SCOPED_PAGES_STAGING_PROPOSAL_VERIFIED_NOT_ACTIVE",
         "deployPermissions":False,"deployAction":False,
         "rootPublicationReplaced":False,"humanPrivacyApproved":False,
         "releaseAuthorized":False}
class InertStagingWorkflowTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.source=PROPOSAL.read_text(encoding="utf-8")
  cls.live=KNOWN.read_text(encoding="utf-8")
 def test_inert_proposal_does_not_deploy_or_replace_pages(self):
  r=check(self.source,self.live)
  self.assertFalse(r["deployPermissions"])
  self.assertFalse(r["rootPublicationReplaced"])
  self.assertFalse(r["releaseAuthorized"])
 def test_missing_required_safety_gate_stops(self):
  for gate in ("scripts/check_eng59_release_evidence.py",
       "scripts/check_eng59_frozen_source_freshness.py",
       "test ! -d \"$RUNNER_TEMP/eng59_scoped_site/docs\""):
   with self.subTest(gate=gate),self.assertRaisesRegex(ProposalHold,"REQUIRED_BUILD_VERIFICATION"):
    check(self.source.replace(gate,"REMOVED_REQUIRED_GUARD"),self.live)
 def test_root_pages_artifact_upload_is_rejected(self):
  with self.assertRaisesRegex(ProposalHold,"ROOT_DIRECTORY_PUBLICATION_PROPOSED"):
   check(self.source.replace("path: ${{ runner.temp }}/eng59_scoped_site","path: '.'"),self.live)
 def test_active_production_permissions_are_rejected(self):
  for injected in ("      pages: write\n","      id-token: write\n",
                   "      - name: Deploy\n        uses: actions/deploy-pages@v4\n",
                   "      - name: Publish\n        uses: actions/upload-pages-artifact@v4\n"):
   with self.subTest(item=injected),self.assertRaisesRegex(ProposalHold,"STAGING_PROPOSAL_BECAME_PRODUCTION_DEPLOYER"):
    check(self.source.replace("      contents: read\n","      contents: read\n"+injected),self.live)
 def test_automatic_main_push_is_not_a_authorized_staging_trigger(self):
  fake=self.source.replace("  workflow_dispatch:\n","  workflow_dispatch:\n  push:\n    branches: [main]\n")
  with self.assertRaisesRegex(ProposalHold,"STAGING_AUTOMATIC_PUBLISH_TRIGGER_NOT_ALLOWED"):
   check(fake,self.live)
 def test_original_pages_workflow_must_still_be_treated_as_root_publishing(self):
  with self.assertRaisesRegex(ProposalHold,"EXISTING_ROOT_PUBLICATION_BASELINE_CHANGED"):
   check(self.source,self.live.replace("path: '.'","path: './dist'"))
if __name__=="__main__":unittest.main()
