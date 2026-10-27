"""Read-only ENG59 GitHub Pages asset-surface and no-private-leak tests.

Tests patch in-memory readback only, never the repository or private packets.
"""
import json,sys,subprocess,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from check_eng59_static_release_surface import (
 check,safe_path,ReleaseSurfaceHold)
TRACKED=set(subprocess.check_output(["git","-C",str(ROOT),"ls-files"],text=True).splitlines())
ORIGINAL=Path.read_text
def altered(filename,replace):
 def read(path,*args,**kwargs):
  val=ORIGINAL(path,*args,**kwargs)
  return replace(val) if path.name==filename else val
 return read
class StaticPagesTests(unittest.TestCase):
 def test_current_release_assets_and_source_only_bridges_all_tracked(self):
  result=check(ROOT)
  self.assertEqual(result["scopedHTMLPages"],3)
  self.assertEqual(result["checkedLocalAssetLinks"],38)
  self.assertEqual(result["sourceOnlyEvidenceFeeds"],3)
  self.assertFalse(result["independentReviewSigned"])
  self.assertFalse(result["automaticProductionDeploymentAuthorized"])
  self.assertFalse(result["eng59PrivateReviewPacketsTracked"])
  self.assertFalse(result["independentPrivacyReviewSigned"])
  self.assertTrue(any("Private" in name or "private" in name
   for name in result["preexistingPrivateNamedPathsRequiringHumanReview"]))
  self.assertIn("widgets/svhl-official-game-id-bridges.json",result["runtimeAssetSHA256"])
  self.assertIn("widgets/brave-historical-gameinfo-ids.json",result["runtimeAssetSHA256"])
  self.assertIn("widgets/svhl-gameinfo-hold-review.json",result["runtimeAssetSHA256"])
 def test_git_pages_deployment_root_changed_is_release_hold(self):
  with patch.object(Path,"read_text",altered("pages.yml",
       lambda s:s.replace("path: '.'","path: './public'"))):
   with self.assertRaisesRegex(ReleaseSurfaceHold,"PAGES_PUBLICATION_PATH_OR_TRIGGER_CHANGED"):
    check(ROOT,TRACKED)
 def test_required_local_page_asset_missing_from_tracked_bundle(self):
  t=set(TRACKED);t.remove("widgets/division-fit-lab.js")
  with self.assertRaisesRegex(ReleaseSurfaceHold,"RUNTIME_FETCH_SCRIPT_MISSING"):
   check(ROOT,t)
 def test_required_source_json_omitted_from_github_pages_is_hold(self):
  t=set(TRACKED);t.remove("widgets/svhl-official-game-id-bridges.json")
  with self.assertRaisesRegex(ReleaseSurfaceHold,"SOURCE_JSON_NOT_TRACKED_FOR_GITHUB_PAGES"):
   check(ROOT,t)
 def test_private_review_receipt_in_public_tree_is_hold(self):
  for secret in [
     "widgets/261027_ENG59_Raw98_Disposition_PRIVATE.json",
     "docs/ENG59_17_SourceOwner_Cases_PRIVATE.csv",
     "widgets/261027_ENG59_NewSecret_PRIVATE.json",
     "widgets/sensitive_private_key.pem",
     ".env"]:
   t=set(TRACKED)|{secret}
   with self.subTest(path=secret):
    with self.assertRaises(ReleaseSurfaceHold):check(ROOT,t)
 def test_required_video_script_absent_from_division_lab_is_hold(self):
  with patch.object(Path,"read_text",altered(
      "division-fit-lab.html",
      lambda s:s.replace('src="./video-strength-evidence.js',
                        'src="./missing-video-engine.js'))):
   with self.assertRaisesRegex(ReleaseSurfaceHold,"LOCAL_RELEASE_ASSET_NOT_AVAILABLE"):
    check(ROOT,TRACKED)
 def test_static_path_traversal_rejected(self):
  for path in ("../secrets.env","./%2e%2e/secrets","./../hidden.json"):
   with self.subTest(path=path):
    with self.assertRaisesRegex(ReleaseSurfaceHold,"RELATIVE_ASSET_PATH_NOT_SAFE"):
     safe_path(ROOT/"widgets",path)
 def test_runtime_feed_being_removed_must_fail(self):
  with patch.object(Path,"read_text",altered(
      "division-fit-lab.js",lambda s:s.replace(
       'fetch("./svhl-official-game-id-bridges.json"',
       'fetch("./fabricated-scope.json"'))):
   with self.assertRaisesRegex(ReleaseSurfaceHold,"RUNTIME_LOCAL_EVIDENCE_FETCH_NOT_DECLARED"):
    check(ROOT,TRACKED)
 def test_wrong_game_id_contract_or_schema_rejected(self):
  with patch.object(Path,"read_text",altered(
       "svhl-official-game-id-bridges.json",
       lambda s:s.replace(
        '"OFFICIAL_GAMEINFO_IDENTITY_MATCHED_NO_RATING_OR_STATS_WRITE"',
        '"AUTOMATIC_PRODUCTION_RELEASE_APPROVED"'))):
   with self.assertRaisesRegex(ReleaseSurfaceHold,"SOURCE_JSON_SCHEMA_OR_ACCEPTANCE_SCOPE_CHANGED"):
    check(ROOT,TRACKED)
 def test_false_independent_source_approval_rejected(self):
  def forge(s):
   d=json.loads(s);d["independentAcceptedForHistoricalPlayerCorrections"]=True
   return json.dumps(d)
  with patch.object(Path,"read_text",altered("svhl-official-game-id-bridges.json",forge)):
   with self.assertRaisesRegex(ReleaseSurfaceHold,"UNACCEPTED_OFFICIAL_CORRECTION_IN_SOURCE_JSON"):
    check(ROOT,TRACKED)
 def test_unknown_private_media_asset_is_not_implicitly_safe(self):
  t=set(TRACKED)|{"widgets/ENG59_private_videos.b64"}
  with self.assertRaisesRegex(ReleaseSurfaceHold,"PRIVATE_EVIDENCE_OR_CREDENTIAL_FILE_TRACKED"):
   check(ROOT,t)
if __name__=="__main__":unittest.main()
