"""Source-qualified daily all-division SVHL collector/publisher on BRUTTECH 1.

Writes only league-intelligence.json to the public Brave H.C. repo, after:
  1. current and prior winter official league/team captures
  2. paired team-result and official standings parity
  3. roster-ID cross-season continuity controls
  4. original Brave H.C. historical opponent source parity
  5. public release validation and no-regression source-game gate
Never edits Master Workbook, native HTO, official SVHL or approved editorial.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,os,subprocess,sys,shutil
from check_svhl_league_intelligence import verify,ReleaseHold
from track_svhl_division_movements import enrich,MovementHold
from model_svhl_schedule_strength import calculate
class Hold(ValueError):pass
TARGET="widgets/league-intelligence.json"
def require(ok,reason):
 if not ok:raise Hold(reason)
def git(repo,*args):
 proc=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=65)
 if proc.returncode:raise Hold("GIT_"+args[0].upper()+"_FAILED:"+(proc.stderr or proc.stdout)[-320:])
 return proc.stdout.strip()
def python(*args,timeout=130):
 p=subprocess.run([sys.executable,*map(str,args)],capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise Hold("SOURCE_REPLAY_FAILED:"+(p.stderr or p.stdout)[-540:])
 return p.stdout.strip()
def read(path):return json.loads(Path(path).read_text(encoding="utf-8-sig"))
def monotonic(old,new):
 """A previously admitted SVHL team source must not silently lose games."""
 if old.get("schema")!="brave-hc-league-intelligence/public-v1":raise Hold("PREVIOUS_LEAGUE_SOURCE_SCHEMA_INVALID")
 require(old.get("leagueId")==new.get("leagueId")==570,"LEAGUE_IDENTITY_RESET")
 oldmap={t["sourceTeamId"]:t for t in old["teams"]}
 newmap={t["sourceTeamId"]:t for t in new["teams"]}
 for tid,prior in oldmap.items():
  later=newmap.get(tid)
  if later is None:continue  # Division entry left entire league, not renamed
  require(later["leagueName"]==prior["leagueName"],"SOURCE_TEAM_ID_REASSIGNED_TO_ANOTHER_NAME")
  require(later["record"]["gp"]>=prior["record"]["gp"] and
          later["gamesConfirmed"]>=prior["gamesConfirmed"],
          "VERIFIED_TEAM_GAMES_DISAPPEARED_"+prior["leagueName"])
  historical={(g["date"],g["opponent"],g["result"],g["gf"],g["ga"]) for g in prior["completedGames"]}
  fresh={(g["date"],g["opponent"],g["result"],g["gf"],g["ga"]) for g in later["completedGames"]}
  require(historical.issubset(fresh),"PREVIOUSLY_CONFIRMED_MATCHUP_CHANGED_"+prior["leagueName"])
 previous_ledger=old.get("movementLedger")
 new_ledger=new.get("movementLedger")
 if previous_ledger:
  require(new_ledger and new_ledger.get("schema")==previous_ledger.get("schema"),
          "MOVEMENT_HISTORY_MUST_REMAIN_ADMITTED")
  for key in ("events","incomingCristilloReports","previouslyTrackedTeams"):
   before=previous_ledger.get(key,[])
   after=new_ledger.get(key,[])
   require(len(after)>=len(before) and after[:len(before)]==before,
           "IMMUTABLE_LEAGUE_MOVEMENT_HISTORY_REGRESSED_"+key)
 return True
def pipeline(repo,private,receipt,check_only=False):
 repo=Path(repo);private=Path(private);receipt=Path(receipt)
 report={"schema":"brave-hc-svhl-league-daily-publisher/v1",
         "startedUTC":datetime.now(timezone.utc).isoformat(),
         "state":"STARTED","siteWritten":False,"workbookWritten":False,"htoWritten":False}
 try:
  require(repo.is_dir() and (repo/TARGET).is_file(),"PUBLIC_LEAGUE_SOURCE_TARGET_MISSING")
  if not check_only:
   require(git(repo,"branch","--show-current")=="main" and
           not git(repo,"status","--porcelain"),"SHARED_PUBLISHING_REPO_NOT_CLEAN_MAIN")
   git(repo,"fetch","origin","main")
   git(repo,"merge","--ff-only","origin/main")
  previous=read(repo/TARGET)
  source=private/"snapshots"/(datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"_official_svhl_PRIVATE.json")
  source.parent.mkdir(parents=True,exist_ok=True)
  candidate=private/"staging"/(source.stem+"_PUBLIC_CANDIDATE.json")
  candidate.parent.mkdir(parents=True,exist_ok=True)
  scriptbase=Path(__file__).resolve().parent
  python(scriptbase/"collect_svhl_league_intelligence.py",
         "--prior","--output",source,timeout=130)
  python(scriptbase/"build_svhl_league_intelligence_public.py",
         "--private",source,
         "--opponent-feed",repo/"widgets"/"opponent-intelligence.json",
         "--opponent-ledger",private.parent/"Opponent Intelligence"/"Online_Opponent_Ledger_PRIVATE_LATEST.json",
         "--out",candidate,timeout=30)
  current=read(candidate)
  baseline_path=repo/"widgets"/"cristillo-membership-20261026-baseline.json"
  if check_only and not baseline_path.is_file():
   # The new historical baseline cannot exist in the public publishing clone
   # until the audited PR has merged. Pre-release QA only may use the exact
   # source-controlled candidate from beside this publisher.
   baseline_path=Path(__file__).resolve().parents[1]/"widgets"/baseline_path.name
  baseline=read(baseline_path)
  current=enrich(previous,current,baseline)
  current=calculate(current)  # descriptive context only; game source still authoritative
  # The enriched file is a private staged candidate until all source,
  # immutable-event and publisher checks have passed.
  candidate.write_text(json.dumps(current,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  accepted=read(repo/"widgets"/"opponent-intelligence.json")
  verified=verify(current,accepted,fresh=True)
  monotonic(previous,current)
  report.update(strengthModel=current["strengthModel"]["schema"],
       rankedCompetitiveTeams=current["strengthModel"]["eligibleTeams"])
  report.update(movementCount=current["movementLedger"]["eventsRecorded"],
       incomingCristilloCount=current["movementLedger"]["incomingCristilloEventsRecorded"],
       departedProfilesRetained=current["movementLedger"]["departedTeamProfilesRetained"])
  report.update(sourceSnapshot=str(source),publicCandidate=str(candidate),
      teams=verified["teams"],divisions=verified["divisions"],
      pairedGames=verified["pairedGames"],priorQualified=verified["priorRosterQualified"])
  if check_only:
   report["state"]="CHECK_ONLY_QUALIFIED_NOT_PUBLISHED"
  else:
   target=repo/TARGET
   text=candidate.read_text(encoding="utf8")
   target.write_text(text,encoding="utf8")
   changed=[r.strip() for r in git(repo,"status","--porcelain").splitlines()]
   require(not changed or changed==["M "+TARGET],
           "UNRELATED_PUBLIC_FILES_CHANGED:"+repr(changed))
   if changed:
    git(repo,"add","--",TARGET)
    require(git(repo,"diff","--cached","--name-only")==TARGET,
            "STAGING_SCOPE_EXCEEDS_PUBLIC_LEAGUE_FILE")
    git(repo,"diff","--cached","--check")
    author=git(repo,"log","-1","--format=%an")
    email=git(repo,"log","-1","--format=%ae")
    git(repo,"-c","user.name="+author,"-c","user.email="+email,"commit",
        "-m","Refresh source-verified all-division SVHL team intelligence")
    sha=git(repo,"rev-parse","HEAD")
    git(repo,"push","origin","HEAD:main")
    report.update(state="SOURCE_VERIFIED_ALL_DIVISIONS_PUBLISHED",siteWritten=True,commit=sha)
   else:
    report["state"]="PUBLIC_NO_CHANGE"
 except (ReleaseHold,MovementHold,Hold,ValueError,TypeError,KeyError,OSError,subprocess.TimeoutExpired) as e:
  report.update(state="HOLD",reason=str(e)[:600])
  # Restore only known unstaged candidate; never reset commits or other changes.
  if not check_only:
   try:
    status=subprocess.run(["git","-C",str(repo),"status","--porcelain"],
        capture_output=True,text=True,timeout=12)
    if status.returncode==0 and status.stdout.splitlines()==[" M "+TARGET]:
     subprocess.run(["git","-C",str(repo),"restore","--",TARGET],
                    capture_output=True,timeout=12)
   except Exception:pass
 report["finishedUTC"]=datetime.now(timezone.utc).isoformat()
 receipt.parent.mkdir(parents=True,exist_ok=True)
 tmp=receipt.with_suffix(receipt.suffix+".tmp")
 tmp.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
 os.replace(tmp,receipt)
 print(json.dumps(report))
 return 0 if report["state"]!="HOLD" else 2
def main():
 ap=ArgumentParser()
 for x in ("repo","private","receipt"):ap.add_argument("--"+x,required=True)
 ap.add_argument("--check-only",action="store_true")
 a=ap.parse_args()
 return pipeline(a.repo,a.private,a.receipt,a.check_only)
if __name__=="__main__":sys.exit(main())
