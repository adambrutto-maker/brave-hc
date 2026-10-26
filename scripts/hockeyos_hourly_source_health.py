"""Read-only HockeyOS hourly health receipt and fail-closed controller QA.

Independent of publisher and original Excel. Does not fetch network, email,
modify source feeds, HTO, public GitHub or schedule. Intended to run AFTER the
hourly controller, writing only a private health JSON receipt. Failures exit 2.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone,timedelta
from hashlib import sha256
from pathlib import Path
import json,os,sys
STAGES=("read_hto","reconcile_game_boxes","standings","countdown",
        "hot_stove_drafts","projections","hot_stove_roster_context","record_watch")
ORIGINAL="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
FIVE={3356177,3356178,3369564,3375601,3375682}
RUNTIME="dynamic-source-crosscheck-v3-261026"
class Hold(ValueError):pass
def require(test,code):
    if not test:raise Hold(code)
def stamp(value):
    try:d=datetime.fromisoformat(value.replace("Z","+00:00"))
    except (AttributeError,ValueError) as e:raise Hold("INVALID_OBSERVATION_TIMESTAMP") from e
    require(d.tzinfo is not None,"SOURCE_TIMESTAMP_HAS_NO_TZ")
    return d.astimezone(timezone.utc)
def source_contract(controller,feed,now=None):
    now=now or datetime.now(timezone.utc)
    assert now.tzinfo is not None
    require(controller.get("allStagesSuccessful") is True,"CONTROLLER_HAS_UNSUCCESSFUL_STAGES")
    stages=controller.get("stages",{})
    require(isinstance(stages,dict) and set(stages)==set(STAGES),"CONTROLLER_STAGE_SET_CHANGED")
    for key in STAGES:
        require(stages[key].get("outcome")=="PASS","CONTROLLER_STAGE_FAILED_"+key)
    start,finish=stamp(controller.get("started")),stamp(controller.get("finished"))
    require(start<=finish<=now,"CONTROLLER_TIME_ORDER_INVALID")
    require(timedelta(0)<=now-finish<=timedelta(minutes=100),"CONTROLLER_RESULT_STALE")
    require(feed.get("schema")=="brave-hc-hto-verified-game-feed/v1" and
            feed.get("sourceValidationState")=="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS" and
            feed.get("playerAggregateParity") is True and feed.get("allGamesDiscovered") is True,
            "HTO_VERIFIED_FEED_SOURCE_GATE_INVALID")
    games=feed.get("games",[])
    ids=[g.get("htoGameId") for g in games]
    gp=feed.get("teamGP")
    require(type(gp) is int and 5<=gp<=24 and len(games)==gp and
            all(type(v) is int and v>0 for v in ids) and len(set(ids))==len(ids) and
            FIVE.issubset(ids),"HTO_COMPLETED_GAMES_SOURCE_MISMATCH")
    sourceAt=stamp(feed.get("sourceReadback"))
    require(timedelta(0)<=now-sourceAt<=timedelta(minutes=100),"HTO_VERIFIED_GAME_SOURCE_STALE")
    require(type(feed.get("teamG")) is int and type(feed.get("teamA")) is int and
            feed["teamG"]==sum(g["teamGoals"] for g in games) and
            feed["teamA"]==sum(p["a"] for g in games for p in g["skaters"]),
            "HTO_PLAYER_GOALS_ASSISTS_PARITY_FAILED")
    for g in games:
        require(sum(p["g"] for p in g["skaters"])==g["teamGoals"],"GAME_GOAL_SCORERS_NOT_OFFICIAL")
        require(sum(gp["goalsAgainst"] for gp in g["goalies"])==g["teamGoalsAgainst"],
                "GOALIE_GAME_GOALS_AGAINST_MISMATCH")
    return {"sourceGames":gp,"teamGoals":feed["teamG"],"teamAssists":feed["teamA"],
            "sourceReadbackUTC":sourceAt.isoformat(),
            "controllerFinishedUTC":finish.isoformat(),
            "stagesPassed":len(STAGES)}
def file_sha(path):
    h=sha256()
    with Path(path).open("rb") as file:
        while data:=file.read(2*1024*1024):h.update(data)
    return h.hexdigest()
def run(repoRoot,privateReceipt):
    root=Path(repoRoot)
    book=root/"Reference Implementations"/"Brave H.C"/"01 Team Records"/"261001_Brave_HC_Master_Workbook.xlsx"
    ev=root/"261016_HTO_Widget_Phase0"
    launcher=root/"261017_Collect_HTO_Boxscore_Attendance_AUTO.py"
    runtime=root/"Runtime"/"HTOCollector"/RUNTIME
    receipt=Path(privateReceipt)
    report={"schema":"brave-hc-hourly-source-health/v1",
            "checkedAtUTC":datetime.now(timezone.utc).isoformat(),
            "status":"HOLD","originalWorkbookWritten":False,
            "publicGitHubWritten":False,"htoCMSWritten":False}
    try:
        require(book.is_file(),"ORIGINAL_MASTER_BOOK_MISSING")
        require(file_sha(book)==ORIGINAL,"ORIGINAL_MASTER_BOOK_HASH_DRIFT")
        require(launcher.is_file() and RUNTIME in launcher.read_text(encoding="utf8"),
                "ACTIVE_COLLECTOR_LAUNCHER_NOT_V3")
        require((runtime/"manifest.json").exists(),"V3_VERSIONED_MANIFEST_MISSING")
        meta=json.loads((runtime/"manifest.json").read_text(encoding="utf8"))
        require(meta.get("state")=="STANDBY_CROSSCHECK_V3_SOURCE_PARITY_VALIDATED",
                "V3_MANIFEST_STATE_UNEXPECTED")
        for relative,expected in meta["sourceFiles"].items():
            file=runtime/relative
            require(file.is_file() and file_sha(file)==expected,
                    "ACTIVE_RUNTIME_SOURCE_SHA_DRIFT:"+relative)
        controller=json.loads((ev/"auto_refresh_last_run.json").read_text(encoding="utf8"))
        feed=json.loads((ev/"261017_HTO_Verified_GameLevel_Skater_Attendance.json").read_text(encoding="utf8"))
        report.update(source_contract(controller,feed))
        report["activeRuntime"]=RUNTIME
        report["originalMasterHashVerified"]=True
        report["runtimeSourceHashVerified"]=True
        report["status"]="PASS"
    except (Hold,OSError,KeyError,TypeError,ValueError,AssertionError) as e:
        report["status"]="HOLD"
        report["holdReason"]=str(e)[:450]
    receipt.parent.mkdir(parents=True,exist_ok=True)
    tmp=receipt.with_suffix(receipt.suffix+".tmp")
    tmp.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
    os.replace(tmp,receipt)
    print(json.dumps(report))
    return 0 if report["status"]=="PASS" else 2
def main():
    p=ArgumentParser()
    p.add_argument("--root",required=True)
    p.add_argument("--receipt",required=True)
    a=p.parse_args()
    return run(a.root,a.receipt)
if __name__=="__main__":sys.exit(main())
