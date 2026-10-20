"""Validate inert HockeyOS publisher dependency patches. No production actions."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'scripts'/'hockeyos_publisher_prepare_path_patches.py'
SPEC=importlib.util.spec_from_file_location('hockeyos_path_migration',SCRIPT)
mod=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

class PathMigrationReviewTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name)/'HockeyOS'
  self.root.mkdir()
  self.out=Path(self.tmp.name)/'ReviewPatches'
  self.pattern='from pathlib import Path\nROOT=Path("C:/offline/QA")\nDEST=ROOT/"HTO_Widget_Public_GitHub_Staging_20261016"/"widgets"/"countdown.json"\n'
  for n in mod.SELECTED:
   source=(mod.ORIGINAL_EXACT if n=='261016_Export_SVHL_Standings_Widget.py'
     else 'ROOT/"HTO_Widget_Public_GitHub_Staging_20261016"/"widgets"/"countdown.json"')
   (self.root/n).write_text('from pathlib import Path\nDEST='+source+'\n',encoding='utf-8')

 def test_all_elevent_paths_are_review_patches_without_scripts_or_source_edits(self):
  original={(self.root/n).read_bytes() for n in mod.SELECTED}
  result=mod.build(self.root,self.out)
  self.assertEqual(result['status'],'REVIEW_PATCHES_PREPARED_NO_SCRIPTS_INSTALLED')
  self.assertEqual(result['sourceCount'],11)
  self.assertFalse(result['safeToDeploy'])
  self.assertFalse(result['productionTaskChanged'])
  self.assertFalse(result['filesExecuted'])
  self.assertTrue(all(p.suffix=='.patch' for p in self.out.iterdir() if p.name!='261020_HockeyOS_Publisher_Migration_Path_Patch_Manifest_v1.json'))
  self.assertFalse(any(p.suffix=='.py' for p in self.out.iterdir()))
  self.assertEqual({(self.root/n).read_bytes() for n in mod.SELECTED},original)
  for step in result['steps']:
   patch=(self.out/step['patchName']).read_text('utf8')
   self.assertIn('HOCKEYOS_PUBLISH_REPO',patch)
   self.assertIn('old',patch)
   self.assertIn(step['file'],step['patchName'])
  self.assertTrue((self.out/'261020_HockeyOS_Publisher_Migration_Path_Patch_Manifest_v1.json').is_file())

 def test_missing_one_transitive_dependency_fails_before_any_review_write(self):
  (self.root/mod.SELECTED[-1]).unlink()
  with self.assertRaisesRegex(mod.Hold,'Missing dependency'):
   mod.build(self.root,self.out)
  self.assertFalse(self.out.exists())

 def test_source_drift_refuses_instead_of_guessing_path(self):
  (self.root/mod.SELECTED[0]).write_text('from pathlib import Path\nDEST=Path("C:/unreviewed")\n')
  with self.assertRaisesRegex(mod.Hold,'source changed'):
   mod.build(self.root,self.out)
  self.assertFalse(self.out.exists())

 def test_existing_output_is_never_overwritten(self):
  self.out.mkdir()
  with self.assertRaisesRegex(mod.Hold,'no overwrite'):
   mod.build(self.root,self.out)

 def test_changes_remain_syntactically_valid_after_path_rewrite(self):
  for name in mod.SELECTED:
   text=(self.root/name).read_text('utf8')
   new,count=mod.transform(name,text)
   self.assertGreater(count,0)
   self.assertNotIn(mod.OLD,new)
   compile(new,name,'exec')
   self.assertIn('HOCKEYOS_PUBLISH_REPO',new)

 def test_active_publisher_and_original_workbook_directories_cannot_receive_output(self):
  (self.root/mod.OLD).mkdir()
  with self.assertRaisesRegex(mod.Hold,'protected publisher'):
   mod.build(self.root,self.root/mod.OLD)
  (self.root/'Reference Implementations').mkdir()
  with self.assertRaisesRegex(mod.Hold,'protected publisher'):
   mod.build(self.root,self.root/'Reference Implementations')

if __name__=='__main__':unittest.main()
