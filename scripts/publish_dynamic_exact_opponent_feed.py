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
from build_canonical_opponent_feed import build,load,Hold,SourceHold

PUBLISH_REL="widgets/opponent-intelligence.json"
class ReleaseHold(ValueError):pass

def git(repo,*args):
 result=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=50)
 if result.returncode:
  raise ReleaseHold("GIT_"+args[0].upper()+"_FAILED:"+(result.stderr or result.stdout)[-330:])
 return result.stdout.strip()

def require_public_scope(feed,standings):
 """Fail closed on unproven current membership and erased past opponents."""
 if (feed.get("schema")!="brave-hc-opponent-intelligence/v1" or
     feed.get("status")!="PUBLIC_VERIFIED_SOURCE_IDENTITY" or
     feed.get("publishable") is not True or
     feed.get("sourceTeamCanonical")!="Brave H.C." or
     feed.get("sourceLeagueTeamAlias")!="Braves HC" or
     not feed.get("releaseScope","").startswith("DYNAMIC_SVHL_DIVISION_KEYS;")):
  raise ReleaseHold("RELEASE_PROVENANCE_OR_CANONICAL_SCOPE_INVALID")
 rows=feed.get("teams",[])
 coverage=feed.get("coverage",{})
 current=[e for e in rows if e.get("membershipStatus")=="CURRENT_DIVISION"]
 past=[e for e in rows if e.get("membershipStatus")=="SEASON_OPPONENT_ARCHIVE"]
 expected={t.get("name") for t in standings.get("teams",[]) if t.get("name")!="Braves HC"}
 if (len(standings.get("teams",[]))!=8 or
     len(rows)!=len({e.get("name") for e in rows}) or
     len(rows)!=len(current)+len(past) or
     len(expected)!=7 or len(current)!=7 or
     {x.get("name") for x in current}!=expected or
     coverage.get("currentDivisionOpponents")!=7 or
     coverage.get("seasonOpponentArchives")!=len(past) or
     any(x.get("sourceHTOGames",0)<1 or
         x.get("verification")=="NO_EXACT_HISTORY" for x in past)):
  raise ReleaseHold("SOURCE_QUALIFIED_DIVISION_AND_ARCHIVE_MEMBERSHIP_CONFLICT")
 names={x.get("name"):x for x in rows}
 if ("Mohawks HC" not in names or "Sugo Sundays" not in names or
     names["Mohawks HC"].get("canonicalName")!="Mohawks H.C." or
     names["Sugo Sundays"].get("canonicalName")!="Michelob Morts" or
     names["Mohawks HC"].get("sourceHTOGames",0)<1 or
     names["Sugo Sundays"].get("sourceHTOGames",0)<1 or
     names["Sugo Sundays"].get("historicalRecordsAreLimited") is not True):
  raise ReleaseHold("CANONICAL_OPPONENT_PROOF_OR_ARCHIVED_HISTORY_MISSING")
 return True

def require_retained_hto_opponents(previous,current):
 """Every previously admitted current-season HTO opponent must survive a
 league division reshuffle as either a current entry or an archive.

 This is separate from identity admission. A changed name/scope must be
 reviewed rather than silently reassigned or dropped.
 """
 old=previous.get("teams",[])
 new=current.get("teams",[])
 if not isinstance(old,list) or not isinstance(new,list):
  raise ReleaseHold("PUBLIC_OPPONENT_RETENTION_SCHEMA_INVALID")
 new_by_name={x.get("name"):x for x in new}
 if len(new_by_name)!=len(new):
  raise ReleaseHold("PUBLIC_OPPONENT_RETENTION_DUPLICATE_SOURCE_NAME")
 for p in old:
  n=p.get("sourceHTOGames",0)
  if type(n) is not int or n<0:
   raise ReleaseHold("OLD_HTO_GAME_COUNT_NOT_QUALIFIED")
  if n==0:continue
  key=p.get("name")
  found=new_by_name.get(key)
  if not isinstance(found,dict):
   raise ReleaseHold("PREVIOUSLY_VERIFIED_HTO_OPPONENT_DISAPPEARED_"+str(key))
  if (found.get("verification")!=p.get("verification") or
      found.get("identityScope")!=p.get("identityScope") or
      found.get("canonicalName")!=p.get("canonicalName") or
      found.get("sourceNames")!=p.get("sourceNames")):
   raise ReleaseHold("VERIFIED_OPPONENT_IDENTITY_SCOPE_REGRESSED_"+str(key))
  count=found.get("sourceHTOGames")
  if type(count) is not int or count<n:
   raise ReleaseHold("HTO_OPPONENT_GAME_COVERAGE_REGRESSED_"+str(key))
  previous_total=p.get("allTime",{})
  later=found.get("allTime",{})
  if (not isinstance(previous_total,dict) or not isinstance(later,dict) or
      type(previous_total.get("gp")) is not int or
      type(later.get("gp")) is not int or
      later["gp"]<previous_total["gp"]):
   raise ReleaseHold("VERIFIED_OPPONENT_HISTORICAL_GAME_COUNT_REGRESSED_"+str(key))
 return True

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
  if old.get("schema")!="brave-hc-opponent-intelligence/v1" or old.get("status") not in ("PUBLIC_VERIFIED_EXACT_ONLY","PUBLIC_VERIFIED_SOURCE_IDENTITY"):
   raise ReleaseHold("EXISTING_PUBLIC_SOURCE_CONTRACT_MISSING")
  new=build(
   load(private/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json"),
   load(private/"HTO_Completed_Scores_PRIVATE_LATEST.json"),
   load(hto_source/"261016_HTO_SVHL_Latest_Readback.json"),
   load(hto_source/"261017_HTO_Verified_GameLevel_Skater_Attendance.json"),
   load(repo/"widgets"/"standings.json"),
   load(repo/"widgets"/"current-opponent-identity-bridges.json"),
   private.parent.parent/"Reference Implementations"/"Brave H.C"/"01 Team Records"/"261001_Brave_HC_Master_Workbook.xlsx")
  if new["coverage"]["currentSeasonGames"]<old["coverage"].get("currentSeasonGames",0):
   raise ReleaseHold("HTO_GAME_COUNT_REGRESSION")
  # Validate source provenance/membership explicitly, not the spelling of
  # an old releaseScope sentence. The latter erroneously held correct SVHL
  # division changes when the accepted release scope was renamed.
  require_public_scope(new, load(repo/"widgets"/"standings.json"))
  if old.get("status")=="PUBLIC_VERIFIED_SOURCE_IDENTITY":
   require_retained_hto_opponents(old,new)
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
       "commit","-m","Refresh Brave H.C. workbook/HTO-canonical opponent histories")
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
