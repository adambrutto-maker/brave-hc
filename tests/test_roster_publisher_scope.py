"""No-network write-scope guard for one-file roster weekly publisher."""
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess,sys,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from publish_svhl_roster_intelligence import git,TARGET
class ScopeQA(unittest.TestCase):
 def setup(self,p):
  def run(*args):
   v=subprocess.run(["git","-C",str(p),*args],capture_output=True,text=True)
   self.assertEqual(v.returncode,0,v.stderr)
  run("init","-q");run("config","user.name","HockeyOS Source QA")
  run("config","user.email","qa@users.noreply.github.com")
  target=p/TARGET;target.parent.mkdir(parents=True,exist_ok=True)
  target.write_text('{"schema":"before"}\n')
  other=p/"README.md";other.write_text("source\n")
  run("add",".");run("commit","-q","-m","source baseline")
  return target,other
 def test_only_single_allowed_roster_file_is_accepted(self):
  with TemporaryDirectory() as temp:
   p=Path(temp);target,_=self.setup(p)
   target.write_text('{"schema":"after"}\n')
   changed=git(p,"status","--porcelain").splitlines()
   self.assertEqual(changed,["M "+TARGET])
   self.assertTrue(not changed or changed==["M "+TARGET])
 def test_any_unrelated_source_write_is_rejected(self):
  with TemporaryDirectory() as temp:
   p=Path(temp);target,other=self.setup(p)
   target.write_text('{"schema":"after"}\n')
   other.write_text("unexpected\n")
   changed=git(p,"status","--porcelain").splitlines()
   self.assertNotEqual(changed,["M "+TARGET])
   self.assertEqual(len(changed),2)
 def test_clean_repo_has_no_changes(self):
  with TemporaryDirectory() as temp:
   p=Path(temp);self.setup(p)
   self.assertEqual(git(p,"status","--porcelain").splitlines(),[])
if __name__=="__main__":unittest.main(verbosity=2)
