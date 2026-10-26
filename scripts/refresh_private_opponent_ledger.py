"""Weekly private HockeyOS opponent reconciliation runner.

Reads protected historical stage and official HTO public scores; produces
a private staged ledger. Never edits the workbook or GitHub site. A status
receipt is always written even if source evidence fails.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from pathlib import Path
import json,os,subprocess,sys

def run(argv=None):
    ap=ArgumentParser()
    ap.add_argument("--private-dir",required=True)
    ap.add_argument("--hto-evidence-dir",required=True)
    ap.add_argument("--check-only",action="store_true")
    a=ap.parse_args(argv)
    private=Path(a.private_dir)
    evidence=Path(a.hto_evidence_dir)
    scripts=Path(__file__).resolve().parent
    required={
        "collector":scripts/"collect_hto_completed_scores.py",
        "builder":scripts/"build_private_online_opponent_ledger.py",
        "master":private/"261026_Master_Complete_Game_History_PRIVATE_STAGE.json",
        "stats":evidence/"261016_HTO_SVHL_Latest_Readback.json",
        "prior":evidence/"261017_HTO_Verified_GameLevel_Skater_Attendance.json",
    }
    missing=[k for k,p in required.items() if not p.is_file()]
    if missing:
        print(json.dumps({"status":"HOLD","reason":"MISSING_SOURCES:"+",".join(missing),"published":False}))
        return 2
    if a.check_only:
        print(json.dumps({"status":"PREFLIGHT_READY","required":list(required),"published":False}))
        return 0
    private.mkdir(parents=True,exist_ok=True)
    receipt=private/"weekly_opponent_reconciliation_last_run.json"
    scores=private/"HTO_Completed_Scores_PRIVATE_LATEST.json"
    ledger=private/"Online_Opponent_Ledger_PRIVATE_LATEST.json"
    outcome={"schema":"brave-hc-opponent-weekly-private-reconcile/v1",
             "started":datetime.now(timezone.utc).isoformat(),
             "status":"HOLD","published":False,"masterWorkbookWritten":False,
             "webContentUpdated":False,"stages":{}}
    stages=[
     ("collect_hto",[sys.executable,str(required["collector"]),"--output",str(scores)]),
     ("build_private_ledger",[sys.executable,str(required["builder"]),
       "--master",str(required["master"]),"--scores",str(scores),
       "--stats",str(required["stats"]),"--verified",str(required["prior"]),
       "--output",str(ledger)])
    ]
    for name,command in stages:
        try:
            p=subprocess.run(command,capture_output=True,text=True,timeout=75)
            outcome["stages"][name]={"status":"PASS" if p.returncode==0 else "HOLD",
                                     "returnCode":p.returncode,
                                     "stdoutTail":p.stdout[-850:],"stderrTail":p.stderr[-850:]}
        except subprocess.TimeoutExpired:
            outcome["stages"][name]={"status":"HOLD","reason":"TIMEOUT"}
        except (OSError,ValueError) as e:
            outcome["stages"][name]={"status":"HOLD","reason":str(e)}
        if outcome["stages"][name]["status"]!="PASS":break
    if len(outcome["stages"])==2 and all(stage["status"]=="PASS" for stage in outcome["stages"].values()):
        doc=json.loads(ledger.read_text(encoding="utf8"))
        if (doc.get("status")=="PRIVATE_PARITY_PASS_EXACT_NAMES_ONLY" and
            doc.get("released") is False and
            doc.get("workbookWritten") is False and
            doc.get("sourceCounts",{}).get("currentSeasonGP",0)>=5):
            outcome["status"]="PRIVATE_SOURCE_PARITY_PASS"
            outcome["lastHTOGameId"]=doc["sourceCounts"]["latestCompletedGameId"]
            outcome["currentGP"]=doc["sourceCounts"]["currentSeasonGP"]
        else:outcome["status"]="HOLD_INVALID_OUTPUT_CONTRACT"
    outcome["finished"]=datetime.now(timezone.utc).isoformat()
    tmp=receipt.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(outcome,indent=2)+"\n",encoding="utf8")
    os.replace(tmp,receipt)
    print(json.dumps({"status":outcome["status"],"receipt":str(receipt),
                      "lastHTOGameId":outcome.get("lastHTOGameId"),
                      "published":False,"workbookWritten":False}))
    return 0 if outcome["status"]=="PRIVATE_SOURCE_PARITY_PASS" else 2
if __name__=="__main__":sys.exit(run())
