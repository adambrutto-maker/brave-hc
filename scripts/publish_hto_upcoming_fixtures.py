"""Publish only independently qualified Brave H.C. HTO upcoming fixtures.

Separate scheduled task from the already-proven league/statistics publisher.
No original workbook, HTO admin page, SVHL league source, team metadata or
approved editorial can be written by this task.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,os,subprocess,sys
TARGET="widgets/upcoming-matchups.json"
class PublicationHold(ValueError):pass
def need(ok,reason):
 if not ok:raise PublicationHold("HTO_FIXTURE_RELEASE_HOLD:"+reason)
def git(repo,*args):
 p=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=55)
 need(p.returncode==0,"GIT_"+args[0].upper()+":"+(p.stderr or p.stdout)[-350:])
 return p.stdout.strip()
def run(repo,private,receipt,check_only=False):
 repo,private,receipt=Path(repo),Path(private),Path(receipt)
 r={"schema":"brave-hc-hto-upcoming-publisher/v1",
    "startedUTC":datetime.now(timezone.utc).isoformat(),
    "state":"STARTED","siteWritten":False,"workbookWritten":False,"htoWritten":False,
    "leagueStatisticsWritten":False}
 try:
  need(repo.is_dir() and (repo/TARGET).is_file(),"PUBLIC_SCHEDULE_TARGET_MISSING")
  if not check_only:
   need(git(repo,"branch","--show-current")=="main" and
        not git(repo,"status","--porcelain"),"SHARED_PUBLICATION_CLONE_NOT_CLEAN_MAIN")
   git(repo,"fetch","origin","main")
   git(repo,"merge","--ff-only","origin/main")
  base=Path(__file__).resolve().parent
  candidate=private/"staging"/(datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"_HTO_CANDIDATE.json")
  candidate.parent.mkdir(parents=True,exist_ok=True)
  proc=subprocess.run([sys.executable,str(base/"collect_hto_upcoming_fixtures.py"),
   "--league",str(repo/"widgets"/"league-intelligence.json"),"--out",str(candidate)],
    capture_output=True,text=True,timeout=160)
  need(proc.returncode==0,"COLLECTOR_FAILED:"+(proc.stderr or proc.stdout)[-450:])
  verify=subprocess.run([sys.executable,str(base/"check_hto_upcoming_fixtures.py"),
   "--fixtures",str(candidate),"--league",str(repo/"widgets"/"league-intelligence.json")],
    capture_output=True,text=True,timeout=30)
  need(verify.returncode==0,"CANDIDATE_NOT_ADMITTED:"+(verify.stderr or verify.stdout)[-450:])
  doc=json.loads(candidate.read_text(encoding="utf8"))
  r.update(candidate=str(candidate),capturedUTC=doc["capturedUTC"],
    scheduleCount=doc["gamesCount"],matchedLeagueTeams=doc["matchedCurrentLeagueCount"],
    sourcePages=len(doc["sourcePages"]))
  if check_only:r["state"]="CHECK_ONLY_VERIFIED_NOT_PUBLISHED"
  else:
   (repo/TARGET).write_text(candidate.read_text(encoding="utf8"),encoding="utf8")
   changed=git(repo,"status","--porcelain").splitlines()
   need(not changed or changed==[" M "+TARGET],"PUBLIC_WRITE_SCOPE_EXCEEDED:"+repr(changed))
   if changed:
    git(repo,"add","--",TARGET)
    need(git(repo,"diff","--cached","--name-only")==TARGET,"EXTRA_FILES_STAGED")
    git(repo,"diff","--cached","--check")
    author=git(repo,"log","-1","--format=%an")
    email=git(repo,"log","-1","--format=%ae")
    git(repo,"-c","user.name="+author,"-c","user.email="+email,"commit",
     "-m","Refresh verified Brave H.C. HTO upcoming schedule")
    sha=git(repo,"rev-parse","HEAD")
    git(repo,"push","origin","HEAD:main")
    r.update(state="SOURCE_VERIFIED_SCHEDULE_PUBLISHED",siteWritten=True,commit=sha)
   else:r["state"]="PUBLIC_NO_CHANGE"
 except (PublicationHold,ValueError,OSError,KeyError,subprocess.TimeoutExpired) as e:
  r.update(state="HOLD",reason=str(e)[:700])
  if not check_only:
   try:
    if subprocess.run(["git","-C",str(repo),"status","--porcelain"],capture_output=True,
       text=True,timeout=12).stdout.splitlines()==[" M "+TARGET]:
     subprocess.run(["git","-C",str(repo),"restore","--",TARGET],capture_output=True,timeout=12)
   except Exception:pass
 r["finishedUTC"]=datetime.now(timezone.utc).isoformat()
 receipt.parent.mkdir(parents=True,exist_ok=True)
 temp=receipt.with_suffix(receipt.suffix+".tmp")
 temp.write_text(json.dumps(r,indent=2)+"\n",encoding="utf8")
 os.replace(temp,receipt)
 print(json.dumps(r))
 return 2 if r["state"]=="HOLD" else 0
def main():
 ap=ArgumentParser()
 for a in ("repo","private","receipt"):ap.add_argument("--"+a,required=True)
 ap.add_argument("--check-only",action="store_true")
 a=ap.parse_args()
 return run(a.repo,a.private,a.receipt,a.check_only)
if __name__=="__main__":sys.exit(main())
