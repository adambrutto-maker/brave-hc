"""Weekly PRIVATE Sunday-opponent capture, including separate Braves SVHL shadow.

One run: current league -> all source team-season rosters -> 21 opponents'
individual player pages -> privacy-minimal public candidate -> private SQLite
-> HTO-vs-SVHL Brave H.C. shadow. This worker NEVER publishes to GitHub,
emails players, edits HTO, or changes the accepted shared HockeyOS database.

The release candidate is staged privately for separately guarded publication.
Run from an existing trusted repository. The weekly Windows Task Scheduler
invocation uses the private-only defaults.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import os
import subprocess
import sys

from collect_svhl_roster_season_evidence import (
    build as roster_jobs, collect as roster_collect, assemble as roster_assemble,
    DIVISIONS, SCHEMA as ROSTER_SCHEMA)
from collect_svhl_opponent_profiles import collect as profile_collect
from collect_svhl_brave_shadow_profiles import collect as brave_profile_collect
from build_svhl_opponent_player_db import (
    make_public, install_sqlite, SCHEMA as PUBLIC_SCHEMA)
from check_svhl_roster_intelligence import verify as verify_roster
from track_brave_svhl_shadow import examine as compare_braves, write_db as write_shadow
from collect_svhl_historical_standings import validate as validate_archive
from check_svhl_league_intelligence import verify as verify_league

class WorkflowHold(ValueError):
    pass

def need(ok, why):
    if not ok:
        raise WorkflowHold("OPPONENT_WEEKLY_HOLD:" + why)

def read(path, cap=9_000_000):
    path = Path(path)
    need(path.is_file() and not path.is_symlink() and
         100 <= path.stat().st_size <= cap, "SOURCE_NOT_BOUNDED_FILE_" + path.name)
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8-sig")), sha256(raw).hexdigest()

def atom(path, data):
    path = Path(path)
    need(path.parent.is_dir() and not path.exists(), "REFUSE_OVERWRITE_CAPTURE")
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("x",encoding="utf8") as file:
        json.dump(data,file,ensure_ascii=False,indent=2)
        file.write("\n")
    os.replace(tmp,path)

def js_validate(repo, candidate, league):
    source = """const fs=require('fs');
const api=require('./widgets/opponent-player-intelligence.js');
const feed=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const league=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(api.validate(feed,league)!==true)process.exit(2);
console.log('OPPONENT_BROWSER_SOURCE_VALIDATION_PASS');"""
    p = subprocess.run(["node","-e",source,str(candidate),str(league)],
                       cwd=repo,capture_output=True,text=True,timeout=20)
    need(p.returncode==0 and "OPPONENT_BROWSER_SOURCE_VALIDATION_PASS" in p.stdout,
         "PUBLIC_BROWSER_SOURCE_GATE_FAILED:" + (p.stderr or p.stdout)[-400:])

def run(repo, private, db, receipt, *, use_prepared=None, check_only=False):
    repo,private,db,receipt = map(Path,(repo,private,db,receipt))
    status={"schema":"brave-hc-opponent-weekly-private-run/v1",
            "startedAtUTC":datetime.now(timezone.utc).isoformat(),
            "state":"STARTED","publicPublished":False,"htoChanged":False,
            "outboundMessages":0,"vaHLIncluded":False}
    try:
        need(repo.is_dir() and (repo/"widgets").is_dir() and private.is_dir() and
             repo.resolve() not in private.resolve().parents and
             private.resolve() != repo.resolve() and
             receipt.resolve().parent==private.resolve() and
             db.resolve().parent==private.resolve() and
             db.name.startswith("svhl_opponent_players_") and db.suffix==".sqlite",
             "AUTHORIZED_PRIVATE_WORKSPACE_REQUIRED")
        league_path=repo/"widgets"/"league-intelligence.json"
        archive_path=repo/"widgets"/"historical-svhl-standings.json"
        hto_path=repo/"widgets"/"player-actuals.json"
        league,leaguehash=read(league_path)
        archive,_=read(archive_path)
        hto,htohash=read(hto_path)
        verify_league(league,fresh=False)
        validate_archive(archive)
        need(league.get("leagueId")==570 and
             hto.get("schema")=="brave-hc-hto-player-actuals/v1" and
             hto.get("status")=="VERIFIED_HTO_CURRENT","LEAGUE_OR_HTO_NOT_VERIFIED")
        now=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        run_dir=private/"runs"/now
        if use_prepared:
            # Replay only source-bound local input artifacts; the same public
            # and private validation runs. No new provider GETs.
            prepared=Path(use_prepared)
            need(prepared.is_dir(),"PREPARED_SOURCE_DIRECTORY_MISSING")
            roster,_=read(prepared/"roster_source.json")
            full,_=read(prepared/"full_source.json")
            profiles,_=read(prepared/"profiles.json")
        else:
            jobs=roster_jobs(archive)
            jobs.extend({"leagueId":570,"season":"Sunday Winter 2026/27",
               "sourceTeamId":t["sourceTeamId"],"name":t["leagueName"],
               "division":t["divisionNow"]}
               for t in league["teams"] if t["divisionNow"] in DIVISIONS)
            source,errors=roster_collect(jobs)
            need(not errors,"OFFICIAL_ROSTER_FETCH_HELD:"+
                 json.dumps(errors[:3])[:320])
            roster=roster_assemble(league,jobs,source)
            full={"schema":"brave-hc-svhl-full-season-team-capture/private-v1",
               "capturedAt":roster["asOf"],"sourceLeagueAsOf":league["asOf"],
               "sourceTeamCount":len(source),
               "playerSeasonRows":sum(len(t["players"]) for t in source),
               "sourceTeams":source,
               "sourceScope":"PUBLIC_SVHL_ADULT_SUNDAY_NON_VAHL_ONLY",
               "braveHTOAuthoritative":True,"originalWorkbookWritten":False}
            profiles=profile_collect(league,roster)
        verify_roster(league,roster)
        need(roster.get("schema")==ROSTER_SCHEMA and
             full.get("sourceLeagueAsOf")==league["asOf"],
             "ROSTER_SCOPE_OR_SOURCE_FRESHNESS_INVALID")
        public=make_public(league,roster,full,profiles)
        need(public.get("schema")==PUBLIC_SCHEMA and public["teamCount"]==21 and
             public["playerCount"]>=250 and
             profiles["profilesVerified"]>=0.95*profiles["playersAttempted"],
             "OPPONENT_PROFILE_QUALITY_BELOW_THRESHOLD")
        if not check_only:
            need(not run_dir.exists(),"CURRENT_RUN_ALREADY_EXISTS")
            run_dir.mkdir(parents=True)
            atom(run_dir/"roster_source.json",roster)
            atom(run_dir/"full_source.json",full)
            atom(run_dir/"profiles.json",profiles)
            atom(run_dir/"public_candidate.json",public)
            js_validate(repo,run_dir/"public_candidate.json",league_path)
            stats=install_sqlite(db,full,profiles,public)
        else:
            stats={"dbWritten":False}
        shadow_status="NOT_RUN"
        shadow_meta={}
        try:
            raw_roster_hash=sha256(json.dumps(roster,ensure_ascii=False,indent=2)
                    .encode("utf8")+b"\n").hexdigest()
            review=compare_braves(hto,roster,league,
                    {"hto":htohash,"svhl":raw_roster_hash,"league":leaguehash})
            shadow_status=review["status"]
            shadow_meta=review["sourceCounts"]
            # Braves specialty fields remain PRIVATE and never enter the
            # opponent feed or the accepted HTO actuals.
            brave_profiles=None
            if use_prepared:
                extra=Path(use_prepared)/"brave_profiles.json"
                if extra.is_file():
                    brave_profiles,_=read(extra)
            else:
                brave_profiles=brave_profile_collect(roster)
            if brave_profiles is not None:
                shadow_meta["braveSpecialtyProfilesVerified"]=brave_profiles["verified"]
                shadow_meta["braveSpecialtyProfilesHeld"]=brave_profiles["held"]
                if not check_only:
                    atom(run_dir/"brave_profiles_PRIVATE.json",brave_profiles)
            if not check_only:
                shadow_stats=write_shadow(db,review,hto,roster,brave_profiles)
                atom(run_dir/"braves_svhl_shadow_PRIVATE.json",review)
                shadow_meta.update(shadow_stats)
        except Exception as exc:
            shadow_status="HELD_INDEPENDENT_PRIVATE_SHADOW"
            shadow_meta={"reason":str(exc)[:250]}
        status.update(state="PRIVATE_CANDIDATE_VERIFIED_NO_PUBLICATION",
                      sourceRosterTeams=roster["currentTeams"],
                      sourceHistoricalTeams=roster["sourceHistoricalTeamsRead"],
                      publicOpponentTeams=public["teamCount"],
                      publicOpponentPlayers=public["playerCount"],
                      specialtyVerified=public["currentSpecialtyProfilesVerified"],
                      linkedPriorRows=public["linkedPriorPlayerSeasonTeamObservations"],
                      providerProfileHolds=profiles["profilesHeld"],
                      savedDatabase=stats,
                      braveShadowStatus=shadow_status,
                      braveShadow=shadow_meta,
                      runDirectory=str(run_dir) if not check_only else None)
    except Exception as exc:
        status.update(state="HOLD",reason=str(exc)[:900])
    status["finishedAtUTC"]=datetime.now(timezone.utc).isoformat()
    if not check_only:
        receipt.parent.mkdir(parents=True,exist_ok=True)
        tmp=receipt.with_suffix(receipt.suffix+".tmp")
        tmp.write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n",
                       encoding="utf8")
        os.replace(tmp,receipt)
    print(json.dumps(status,ensure_ascii=False))
    return 2 if status["state"]=="HOLD" else 0

def main():
    p=ArgumentParser()
    for key in ("repo","private","db","receipt"):
        p.add_argument("--"+key,required=True)
    p.add_argument("--prepared")
    p.add_argument("--check-only",action="store_true")
    a=p.parse_args()
    return run(a.repo,a.private,a.db,a.receipt,
               use_prepared=a.prepared,check_only=a.check_only)
if __name__=="__main__":
    sys.exit(main())
