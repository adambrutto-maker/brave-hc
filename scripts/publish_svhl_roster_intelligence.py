"""Independent fail-closed, weekly Brave H.C. Sports Village roster publisher.

Writes exactly one public JSON after all official historical team pages and
source-ID links are validated; official source systems and workbook read-only.
Schedule away from the daily league results publisher.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
from shutil import copyfile
import json,os,subprocess,sys
TARGET="widgets/svhl-roster-intelligence.json"
class ReleaseHold(ValueError):pass
def need(ok,message):
 if not ok:raise ReleaseHold("WEEKLY_ROSTER_RELEASE_HOLD:"+message)
def git(repo,*args):
 p=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,
    timeout=55)
 need(p.returncode==0,"GIT_"+args[0]+":"+(p.stderr or p.stdout)[-420:])
 return p.stdout.strip()
def python(*args,timeout=185):
 p=subprocess.run([sys.executable,"-B",*map(str,args)],capture_output=True,text=True,
    timeout=timeout)
 need(p.returncode==0,"PYTHON_"+Path(str(args[0])).name+":"+
    (p.stderr or p.stdout)[-700:])
 return p.stdout.strip()
def run(repo,private,receipt,check_only=False,candidate_only=None):
 repo,private,receipt=map(Path,(repo,private,receipt))
 report={"schema":"brave-hc-public-roster-weekly-release/v1",
    "startedUTC":datetime.now(timezone.utc).isoformat(),
    "state":"STARTED","published":False,"workbookWritten":False,
    "officialLeagueWritten":False,"htoWritten":False,"scope":TARGET}
 try:
  need(repo.is_dir() and (repo/TARGET).exists(),"SOURCE_ROSTER_CHECKOUT_MISSING")
  need((repo/"scripts"/"collect_svhl_roster_season_evidence.py").exists(),
    "SOURCE_COLLECTOR_MISSING")
  if candidate_only:need(check_only,"CANDIDATE_ONLY_REQUIRES_CHECK_ONLY")
  if not check_only:
   need(git(repo,"branch","--show-current")=="main" and
     not git(repo,"status","--porcelain"),"PRODUCTION_REPOSITORY_NOT_CLEAN_MAIN")
   git(repo,"fetch","origin","main")
   git(repo,"merge","--ff-only","origin/main")
  script=repo/"scripts"/"collect_svhl_roster_season_evidence.py"
  checker=repo/"scripts"/"check_svhl_roster_intelligence.py"
  now=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  candidate=(Path(candidate_only) if candidate_only else
    private/"staging"/(now+"_public_qualified_roster.json"))
  if not candidate_only:
   candidate.parent.mkdir(parents=True,exist_ok=True)
   python(script,"--current",repo/"widgets"/"league-intelligence.json",
    "--archive",repo/"widgets"/"historical-svhl-standings.json",
    "--out",candidate,timeout=220)
  python(checker,"--league",repo/"widgets"/"league-intelligence.json",
    "--roster",candidate,timeout=30)
  data=json.loads(candidate.read_text(encoding="utf8"))
  report.update(candidate=str(candidate),seasonSourceAsOf=data["sourceLeagueAsOf"],
    teamSources=data["currentTeams"],historicalTeamPages=data["sourceHistoricalTeamsRead"],
    playerSeasonRows=data["playerSeasonObservations"],
    historicalCurrentIDLinks=sum(len(p["previousOfficialObservations"])
     for t in data["teams"] for p in t["players"]))
  if check_only:report["state"]="CHECK_ONLY_SOURCE_QUALIFIED_NO_PUBLISH"
  else:
   target=repo/TARGET
   target.write_text(candidate.read_text(encoding="utf8"),encoding="utf8")
   changed=git(repo,"status","--porcelain").splitlines()
   need(not changed or changed==["M "+TARGET],
     "PUBLIC_WRITE_SCOPE_EXCEEDED:"+repr(changed))
   if changed:
    git(repo,"add","--",TARGET)
    need(git(repo,"diff","--cached","--name-only")==TARGET,
      "EXTRA_FILES_STAGED")
    git(repo,"diff","--cached","--check")
    author=git(repo,"log","-1","--format=%an")
    email=git(repo,"log","-1","--format=%ae")
    git(repo,"-c","user.name="+author,"-c","user.email="+email,"commit",
      "-m","Refresh verified SVHL public roster and player-ID history")
    report["commit"]=git(repo,"rev-parse","HEAD")
    git(repo,"push","origin","HEAD:main")
    report.update(state="QUALIFIED_ROSTER_WEEKLY_PUBLISHED",published=True)
   else:report["state"]="PUBLIC_NO_MATERIAL_CHANGE"
 except (ReleaseHold,ValueError,TypeError,KeyError,OSError,subprocess.TimeoutExpired) as e:
  report.update(state="HOLD",reason=str(e)[:850])
  if not check_only:
   try:
    if subprocess.run(["git","-C",str(repo),"status","--porcelain"],
       capture_output=True,text=True,timeout=12).stdout.splitlines()==[" M "+TARGET]:
     subprocess.run(["git","-C",str(repo),"restore","--",TARGET],
       capture_output=True,timeout=12)
   except Exception:pass
 report["finishedUTC"]=datetime.now(timezone.utc).isoformat()
 receipt.parent.mkdir(parents=True,exist_ok=True)
 temp=receipt.with_suffix(receipt.suffix+".tmp")
 temp.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
 os.replace(temp,receipt)
 print(json.dumps(report))
 return 2 if report["state"]=="HOLD" else 0
def main():
 p=ArgumentParser()
 for a in ("repo","private","receipt"):p.add_argument("--"+a,required=True)
 p.add_argument("--check-only",action="store_true")
 p.add_argument("--candidate-only")
 a=p.parse_args()
 return run(a.repo,a.private,a.receipt,a.check_only,a.candidate_only)
if __name__=="__main__":sys.exit(main())
