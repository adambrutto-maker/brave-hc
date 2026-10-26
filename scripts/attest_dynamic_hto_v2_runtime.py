"""Attest activated dynamic HockeyOS collector after a full scheduled replay."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,subprocess
ROOT=Path(r"D:\BruTTech\Products\HockeyOS")
OP=ROOT/"Implementation Control"/"Opponent Intelligence"
RUNTIME=ROOT/"Runtime"/"HTOCollector"/"dynamic-date-bound-v2-261026"
LAUNCHER=ROOT/"261017_Collect_HTO_Boxscore_Attendance_AUTO.py"
FEED=ROOT/"261016_HTO_Widget_Phase0"/"261017_HTO_Verified_GameLevel_Skater_Attendance.json"
REPORT=ROOT/"261016_HTO_Widget_Phase0"/"auto_refresh_last_run.json"
BOOK=ROOT/"Reference Implementations"/"Brave H.C"/"01 Team Records"/"261001_Brave_HC_Master_Workbook.xlsx"
BACKUP=OP/"Publisher Recovery"/"261026_Dynamic_v2_Collector_Cutover"/"cutover_receipt.json"
APPROVED_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
doc=json.loads((RUNTIME/"manifest.json").read_text(encoding="utf8"))
cut=json.loads(BACKUP.read_text(encoding="utf8"))
run=json.loads(REPORT.read_text(encoding="utf8"))
feed=json.loads(FEED.read_text(encoding="utf8"))
def check(cond,label):
 if not cond:raise RuntimeError("DYNAMIC_RUNTIME_ACTIVATION_ATTESTATION_HOLD:"+label)
check(cut["state"]=="CUTOVER_VERIFIED_DYNAMIC_RUNTIME_ACTIVE" and cut["previousFiveUnchanged"],"CUTOVER_RECEIPT")
check(cut["rollbackBackupsVerified"] and all((BACKUP.parent/name).is_file() for name in ("four_game_feed.original.json","launcher.original.py")),"CUTOVER_BACKUPS")
check("dynamic-date-bound-v2-261026" in LAUNCHER.read_text(encoding="utf8"),"CURRENT_LAUNCHER")
check(run["allStagesSuccessful"] and len(run["stages"])==8 and all(x["outcome"]=="PASS" for x in run["stages"].values()),"8_STAGES_PASS")
check(feed["teamGP"]==5 and feed["sourceValidationState"]=="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS","FEED_SOURCE_STATUS")
check({g["htoGameId"] for g in feed["games"]}=={3356177,3356178,3369564,3375601,3375682},"ACTUAL_GAME_IDS")
check(sha256(BOOK.read_bytes()).hexdigest()==APPROVED_SHA,"ORIGINAL_MASTER_SHA_CHANGED")
for relative,expected in doc["sourceFiles"].items():
 p=RUNTIME/relative
 check(p.is_file() and sha256(p.read_bytes()).hexdigest()==expected,"RUNTIME_SOURCE_FILE_HASH_"+relative)
attestation={"status":"DYNAMIC_DATE_BOUND_COLLECTOR_ACTIVE_VALIDATED",
 "recordedAtUTC":datetime.now(timezone.utc).isoformat(),
 "activeVersion":"dynamic-date-bound-v2-261026",
 "standbyRollbackVersion":"five-game-source-v1-261026",
 "scheduledControllerStartUTC":run["started"],
 "scheduledControllerEndUTC":run["finished"],
 "scheduledStages":{n:s["outcome"] for n,s in run["stages"].items()},
 "sourceGames":feed["teamGP"],"sourceGameIDs":[g["htoGameId"] for g in feed["games"]],
 "goalTotal":feed["teamG"],"assistsTotal":feed["teamA"],
 "verifiedSourceSHA256":sha256(FEED.read_bytes()).hexdigest(),
 "protectedOriginalMasterSHA256":APPROVED_SHA,
 "operationalRollbackBackupsVerified":True,
 "productionSourceFilesHashVerified":True,
 "originalWorkbookModified":False,
 "nativeHTOWritten":False,
 "changesToHTOOriginalGameStats":False,
 "newFutureGameAcceptance":"DATE_BOUND_SOURCE_VERIFIED_WITH_FULL_PLAYER_GOALIE_PARITY_FAIL_CLOSED",
 "nextActualGameDate":"2026-11-01",
 "nextOriginalWorkbookGameNumber":364,
 "remainingHolds":["UNAPPROVED_OPPONENT_ALIASES","FULL_WORKBOOK_ROSTER_COMPLETENESS",
                  "NATIVE_HTO_MILESTONE_MODULE_REMOVAL"]}
(RUNTIME/"activation_receipt.json").write_text(json.dumps(attestation,indent=2)+"\n",encoding="utf8")
(OP/"261026_Dynamic_Collector_Production_Activation_Receipt.json").write_text(json.dumps(attestation,indent=2)+"\n",encoding="utf8")
print(json.dumps(attestation))
