"""Fail-closed independent GitHub publisher for current official HTO skater actuals.

Publishes only widgets/player-actuals.json after current public HTO stat/source
parity. Does not recalculate, overwrite or publish the Master Workbook forecast.
Use a clean dedicated publication staging repo on main; fetch and FF before write.
"""
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,subprocess,sys

from export_hto_verified_player_actuals import parse,Hold

def git(repo,*args):
    p=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=45)
    if p.returncode:raise Hold("GIT_"+args[0].upper()+"_FAILED:"+p.stderr[-320:])
    return p.stdout.strip()

def publish(repo,readback):
    repo=Path(repo);source=Path(readback)
    target=repo/"widgets"/"player-actuals.json"
    if not repo.is_dir() or not source.is_file():raise Hold("PUBLISHER_PATHS_MISSING")
    if git(repo,"branch","--show-current")!="main" or git(repo,"status","--porcelain"):
        raise Hold("PUBLISHER_STAGING_NOT_CLEAN_MAIN")
    git(repo,"fetch","origin","main")
    git(repo,"merge","--ff-only","origin/main")
    before=json.loads(target.read_text(encoding="utf8")) if target.exists() else None
    after=parse(json.loads(source.read_text(encoding="utf-8-sig")))
    if before and before.get("schema")!=after["schema"]:raise Hold("PUBLIC_FEED_SCHEMA_CHANGED")
    if before and before.get("teamGP",0)>after["teamGP"]:
        raise Hold("HTO_PUBLIC_SEASON_GP_REGRESSION")
    before_sig=None if before is None else (before.get("teamGP"),before.get("teamGF"),before.get("teamGA"),before.get("players"))
    now_sig=(after["teamGP"],after["teamGF"],after["teamGA"],after["players"])
    if before_sig==now_sig and before:
        stamp=datetime.fromisoformat(before.get("asOf","1970-01-01T00:00:00Z").replace("Z","+00:00"))
        age=(datetime.now(timezone.utc)-stamp).total_seconds()/3600
        if 0<=age<120:
            return {"status":"HTO_ACTUALS_UNCHANGED","latestHTOGP":after["teamGP"],"published":False}
    target.write_text(json.dumps(after,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    files=[line.strip() for line in git(repo,"status","--porcelain").splitlines()]
    if files==[]:return {"status":"HTO_ACTUALS_UNCHANGED","published":False}
    if files not in (["M widgets/player-actuals.json"],["?? widgets/player-actuals.json"]):
        raise Hold("PUBLISHER_UNEXPECTED_CHANGED_FILES:"+repr(files))
    git(repo,"add","--","widgets/player-actuals.json")
    if git(repo,"diff","--cached","--name-only")!="widgets/player-actuals.json":
        raise Hold("PUBLISHER_STAGING_SCOPE_MISMATCH")
    git(repo,"diff","--cached","--check")
    author=git(repo,"log","-1","--format=%an")
    email=git(repo,"log","-1","--format=%ae")
    git(repo,"-c","user.name="+author,"-c","user.email="+email,
        "commit","-m","Refresh verified Brave HC HTO player actuals")
    rev=git(repo,"rev-parse","HEAD")
    git(repo,"push","origin","HEAD:main")
    return {"status":"HTO_CURRENT_ACTUALS_PUBLISHED","commit":rev,"teamGP":after["teamGP"],
            "players":len(after["players"]),"published":True,"modelRecalculated":False}

def main():
    p=ArgumentParser()
    p.add_argument("--repo",required=True)
    p.add_argument("--readback",required=True)
    a=p.parse_args()
    try:
        r=publish(a.repo,a.readback);print(json.dumps(r));return 0
    except (Hold,ValueError,OSError,KeyError,subprocess.TimeoutExpired) as e:
        print(json.dumps({"status":"HTO_ACTUALS_PUBLISH_HELD","reason":str(e),
                          "modelRecalculated":False}),file=sys.stderr)
        return 2
if __name__=="__main__":sys.exit(main())
