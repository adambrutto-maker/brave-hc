"""Controlled weekly Braves Opponent Intelligence publisher.

Inputs are read-only local historical/HTO sources. Only the whitelisted
widgets/opponent-intelligence.json can be committed to public GitHub Pages.
Source reconciliation and exact-name/alias holds are rechecked every run.
No workbook/HTO CMS writes, no force push, no automatic rename merges.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,os,subprocess,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_dynamic_exact_opponent_feed import build,load,Hold,SourceHold

PUBLISH_REL="widgets/opponent-intelligence.json"
class ReleaseHold(ValueError):pass

def git(repo,*args):
 result=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=50)
 if result.returncode:
  raise ReleaseHold("GIT_"+args[0].upper()+"_FAILED:"+(result.stderr or result.stdout)[-330:])
 return result.stdout.strip()

def publish(repo,private,hto_source,report_file):
 repo=Path(repo);private=Path(private);hto_source=Path(hto_source)
 target=repo/PUBLISH_REL
 status={"state":"STARTED","timestamp":datetime.now(timezone.utc).isoformat(),
         "modelRecalculated":False,"workbookWritten":False,"published":False}
 report_file=Path(report_file)
 try:
  if not repo.is_dir() or not target.exists():raise ReleaseHold("EXISTING_PUBLIC_FEED_REQUIRED")
  if git(repo,"branch","--show-current")!="main" or git(repo,"status","--porcelain"):
   raise ReleaseHold("PUBLISHER_STAGING_DIRTY_OR_WRONG_BRANCH")
  git(repo,"fetch","origin","main")
  git(repo,"merge","--ff-only","origin/main")
  old=load(target)
  if old.get("schema")!="brave-hc-opponent-intelligence/v1" or old.get("status")!="PUBLIC_VERIFIED_EXACT_ONLY":
   raise ReleaseHold("EXISTING_PUBLIC_SOURCE_CONTRACT_MISSING")
  new=build(
   load(private/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json"),
   load(private/"HTO_Completed_Scores_PRIVATE_LATEST.json"),
   load(hto_source/"261016_HTO_SVHL_Latest_Readback.json"),
   load(hto_source/"261017_HTO_Verified_GameLevel_Skater_Attendance.json"),
   load(repo/"widgets"/"standings.json"))
  if new["coverage"]["currentSeasonGames"]<old["coverage"].get("currentSeasonGames",0):
   raise ReleaseHold("HTO_GAME_COUNT_REGRESSION")
  if old.get("releaseScope") and "EXACT" not in new["releaseScope"]:
   raise ReleaseHold("EXACT_SOURCE_SCOPE_ABANDONED")
  # A released source can be more recent while a completed-game record stays the same.
  # Keep the public data fresh, but do not churn when the exact JSON is unchanged.
  target.write_text(json.dumps(new,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  changed=[line.strip() for line in git(repo,"status","--porcelain").splitlines()]
  if changed and changed!=["M widgets/opponent-intelligence.json"]:
   raise ReleaseHold("UNEXPECTED_PUBLIC_FILE_DIFF:"+repr(changed))
  if not changed:
   status.update(state="NO_CHANGE",publicGameCount=new["coverage"]["currentSeasonGames"])
  else:
   git(repo,"add","--",PUBLISH_REL)
   if git(repo,"diff","--cached","--name-only")!=PUBLISH_REL:
    raise ReleaseHold("STAGED_SCOPE_NOT_WHITELISTED")
   git(repo,"diff","--cached","--check")
   user=git(repo,"log","-1","--format=%an")
   mail=git(repo,"log","-1","--format=%ae")
   git(repo,"-c","user.name="+user,"-c","user.email="+mail,
       "commit","-m","Refresh verified Brave HC opponent exact-name history")
   commit=git(repo,"rev-parse","HEAD")
   git(repo,"push","origin","HEAD:main")
   status.update(state="SOURCE_VERIFIED_PUBLICATION_PASS",published=True,commit=commit,
                 publicGameCount=new["coverage"]["currentSeasonGames"],
                 qualifiedOpponents=new["coverage"]["sourceQualifiedOpponents"],
                 aliasesHeld=new["coverage"]["aliasesNeedingReview"])
 except (ReleaseHold,Hold,SourceHold,OSError,KeyError,ValueError,TypeError,
         subprocess.TimeoutExpired) as e:
  status.update(state="HELD",reason=str(e)[:420])
  # Restore only a single known, unstaged changed feed; never discard unknown changes.
  try:
   state=subprocess.run(["git","-C",str(repo),"status","--porcelain"],
                        capture_output=True,text=True,timeout=10)
   if state.returncode==0 and state.stdout.splitlines()==[" M widgets/opponent-intelligence.json"]:
    subprocess.run(["git","-C",str(repo),"restore","--",PUBLISH_REL],
                   capture_output=True,timeout=10)
  except Exception:pass
 status["finished"]=datetime.now(timezone.utc).isoformat()
 report_file.parent.mkdir(parents=True,exist_ok=True)
 temp=report_file.with_suffix(report_file.suffix+".tmp")
 temp.write_text(json.dumps(status,indent=2)+"\n",encoding="utf8")
 os.replace(temp,report_file)
 print(json.dumps(status))
 return 0 if status["state"]!="HELD" else 2

def main():
 p=ArgumentParser()
 for n in ("repo","private","hto-evidence","receipt"):p.add_argument("--"+n,required=True)
 a=p.parse_args()
 return publish(a.repo,a.private,a.hto_evidence,a.receipt)
if __name__=="__main__":sys.exit(main())
