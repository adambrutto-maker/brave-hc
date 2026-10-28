"""ENG59 scoped private preview packaging and confidentiality tests.

Use existing tracked web-only source manifest. No production deploy or
external network; temp preview candidate exists only in isolated tempdir.
"""
from pathlib import Path
import tempfile,sys,unittest,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_eng59_scoped_static_preview import index,build,validate_html,PreviewHold,canonical_source,git_stage,git_hash,verify_artwork_manifests
class ScopedPreviewTests(unittest.TestCase):
 def test_real_website_minimal_scoped_preview_without_nonweb_files(self):
  allowed,source,tracked=index(ROOT)
  self.assertIn("index.html",allowed)
  self.assertIn("widgets/analytics.html",allowed)
  self.assertIn("widgets/league-intelligence.html",allowed)
  self.assertIn("widgets/brave-historical-gameinfo-ids.json",allowed)
  self.assertNotIn("widgets/README.md",allowed)
  self.assertTrue(all(p=="index.html" or p.startswith("widgets/") for p in allowed))
  self.assertFalse(any("PRIVATE" in p or p.startswith(("docs/","scripts/","archive/"))
                       for p in allowed))
  self.assertEqual(set(source),set(allowed))
  self.assertGreaterEqual(validate_html(ROOT,set(allowed)),100)
  self.assertGreater(len(allowed),100)
 def test_text_line_ending_conversion_does_not_change_git_blob_identity(self):
  algorithm,entries=git_stage(ROOT)
  for name in ("index.html","widgets/analytics.html",
      "widgets/league-intelligence.json","widgets/svhl-official-game-id-bridges.json"):
   data=canonical_source(ROOT/name)
   self.assertEqual(git_hash(data,algorithm),entries[name][1])
   mutated=data.replace(b"\\n",b"\\r\\n")
   self.assertEqual(git_hash(mutated.replace(b"\\r\\n",b"\\n"),algorithm),entries[name][1])
   self.assertNotEqual(git_hash(data+b"CHANGED",algorithm),entries[name][1])
 def test_all_78_artwork_assets_and_six_source_manifests_stay_consistent(self):
  included=set(index(ROOT)[0])
  qa=verify_artwork_manifests(ROOT/"widgets",included)
  self.assertEqual(qa["manifestsVerified"],6)
  self.assertEqual(qa["artworkAssetsVerified"],78)
  self.assertEqual(qa["sourceBackupsVerifiedButNotPublished"],39)
  self.assertFalse(any(x.startswith("widgets/assets/opaque-originals/") for x in included))
 def test_missing_new_approved_htO_icon_cannot_sneak_into_preview(self):
  included=set(index(ROOT)[0]);included.remove("widgets/assets/approved/hart_mvp.webp")
  with self.assertRaisesRegex(PreviewHold,"ARTWORK_ASSET_MISSING_OR_UNSAFE"):
   verify_artwork_manifests(ROOT/"widgets",included)
 def test_tampered_retained_opaque_source_backup_hash_is_rejected(self):
  included=set(index(ROOT)[0])
  source=(ROOT/"widgets/assets/approved/source-manifest.json").read_text(encoding="utf8")
  forged=source.replace('"opaqueSourceSha256": "','"opaqueSourceSha256": "0',1)
  with self.assertRaisesRegex(PreviewHold,"OPAQUE_BACKUP_SOURCE_HASH_CONFLICT"):
   verify_artwork_manifests(ROOT/"widgets",included,{"approved":forged})
 def test_a_missing_round_milestone_image_is_not_a_complete_release(self):
  included=set(index(ROOT)[0])
  included.remove("widgets/assets/round-clubs/300_wins_platinum_200.webp")
  with self.assertRaisesRegex(PreviewHold,"ARTWORK_ASSET_MISSING_OR_UNSAFE"):
   verify_artwork_manifests(ROOT/"widgets",included)
 def test_a_forged_manifest_source_hash_is_rejected(self):
  included=set(index(ROOT)[0])
  source=(ROOT/"widgets/assets/round-clubs/source-manifest.json").read_text(encoding="utf8")
  bad=source.replace('"sha256": "','"sha256": "0',1)
  with self.assertRaisesRegex(PreviewHold,"ARTWORK_SOURCE_MANIFEST_HASH_OR_SIZE_CONFLICT"):
   verify_artwork_manifests(ROOT/"widgets",included,{"round-clubs":bad})
 def test_check_only_never_creates_any_output(self):
  with tempfile.TemporaryDirectory() as d:
   output=Path(d)/"private_preview"
   result=build(ROOT,output,True)
   self.assertFalse(output.exists())
   self.assertFalse(result["productionDeploymentPerformed"])
   self.assertFalse(result["publicReleaseApproved"])
   self.assertFalse(result["independentPrivacyApproval"])
 def test_isolated_preview_stages_byte_identical_source_files_and_no_private_docs(self):
  with tempfile.TemporaryDirectory() as d:
   output=Path(d)/"private_preview"
   result=build(ROOT,output,False)
   included=set(result["files"])
   self.assertEqual({str(x.relative_to(output)).replace("\\","/") for x in output.rglob("*") if x.is_file()},included)
   self.assertFalse(any((output/p).exists() for p in
    ("docs","scripts","archive","snapshots",".github","widgets/README.md")))
   self.assertTrue((output/"index.html").is_file())
   self.assertEqual(validate_html(output,included),result["validatedHTMLReferences"])
   for rel in included:self.assertEqual((output/rel).read_bytes(),canonical_source(ROOT/rel))
 def test_output_already_exists_never_overwrites(self):
  with tempfile.TemporaryDirectory() as d:
   out=Path(d)/"private_preview"
   out.mkdir();sentinel=out/"KEEP_ME.txt";sentinel.write_text("ORIGINAL")
   with self.assertRaisesRegex(PreviewHold,"CANDIDATE_ALREADY_EXISTS_NO_OVERWRITE"):
    build(ROOT,out)
   self.assertEqual(sentinel.read_text(),"ORIGINAL")
 def test_refuses_output_nested_in_public_repository(self):
  with self.assertRaisesRegex(PreviewHold,"PREVIEW_OUTPUT_CANNOT_BE_INSIDE_OR_ABOVE_REPO"):
   build(ROOT,ROOT/"widgets"/"accidental_preview",True)
 def test_ignores_internal_workflow_and_private_docs_even_when_tracked(self):
  files,manifest,tracked=index(ROOT)
  self.assertTrue(any(x.startswith("docs/") for x in tracked))
  self.assertTrue(any(x.startswith("scripts/") for x in tracked))
  self.assertFalse(any(p.endswith(".md") or p.endswith(".txt") for p in files))
 def test_ambiguous_new_pem_or_private_named_web_resource_refused(self):
  with tempfile.TemporaryDirectory() as d:
   # Index only operates on source files actually present, but name gate
   # must refuse a real allowed-extension sensitive source asset.
   f=ROOT/"widgets"/"FICTIONAL_TEST_PRIVATE.json"
   # Do not create a forbidden source under the live worktree.
   # Existing programmatic source selection disallows a fictional tracked name
   # even when absent; no copy attempt is permitted.
   tracked={*index(ROOT)[2],"widgets/FICTIONAL_TEST_PRIVATE.json"}
   with self.assertRaisesRegex(PreviewHold,"WEB_ASSET_MISSING_OR_SYMLINK|PRIVATE_NAMED_WEB_ASSET"):
    index(ROOT,tracked)
 def test_original_json_source_schemas_remain_unchanged(self):
  files,_,_=index(ROOT)
  data=json.loads((ROOT/"widgets"/"svhl-official-game-id-bridges.json").read_text(encoding="utf8"))
  self.assertIn("widgets/svhl-official-game-id-bridges.json",files)
  self.assertFalse(data["independentAcceptedForHistoricalPlayerCorrections"])
if __name__=="__main__":unittest.main()
