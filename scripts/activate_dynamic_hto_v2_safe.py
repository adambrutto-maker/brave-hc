"""Controlled activation of previously shadow-tested five-game HockeyOS collector.

Must be invoked only while the existing hourly scheduled task is DISABLED.
Backs up current launcher and feed, atomically switches the collector launcher,
collects five verified games and checks first-four exact-match compatibility.
On failure restores prior launcher and feed atomically.
Never writes workbook, HTO pages, GitHub or any editorial article.
"""
from __future__ import annotations
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
import json,os,re,subprocess,sys,tempfile

ROOT=Path(r"D:\BruTTech\Products\HockeyOS")
OP=ROOT/"Implementation Control"/"Opponent Intelligence"
LIVE=ROOT/"261016_HTO_Widget_Phase0"/"261017_HTO_Verified_GameLevel_Skater_Attendance.json"
LAUNCHER=ROOT/"261017_Collect_HTO_Boxscore_Attendance_AUTO.py"
OLD=ROOT/"Runtime"/"HTOCollector"/"five-game-source-v1-261026"
NEW=ROOT/"Runtime"/"HTOCollector"/"dynamic-date-bound-v2-261026"
BOOK=ROOT/"Reference Implementations"/"Brave H.C"/"01 Team Records"/"261001_Brave_HC_Master_Workbook.xlsx"
RECOVERY=OP/"Publisher Recovery"/"261026_Dynamic_v2_Collector_Cutover"
RECEIPT=RECOVERY/"cutover_receipt.json"
NEW_PART='"dynamic-date-bound-v2-261026"'
OLD_PART='"five-game-source-v1-261026"'
EXPECTED_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
def digest(b):return sha256(b).hexdigest()
def atomic(path,data):
 fd,temp=tempfile.mkstemp(prefix=path.name+".",suffix=".part",dir=str(path.parent))
 try:
  with os.fdopen(fd,"wb") as o:
   o.write(data);o.flush();os.fsync(o.fileno())
  os.replace(temp,path)
 finally:
  if os.path.exists(temp):os.unlink(temp)
 if path.read_bytes()!=data:raise RuntimeError("POST_ATOMIC_WRITE_VERIFICATION_FAILED_"+path.name)
def command(*xs,timeout=25):
 p=subprocess.run(list(xs),capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise RuntimeError("SUBPROCESS_FAILURE:"+str(p.returncode)+":"+p.stderr[-400:])
 return p.stdout.strip()
def disabled():
 # Hard stop if task can still launch another writer during this cutover.
 status=command("powershell","-NoProfile","-Command",
   "$t=Get-ScheduledTask -TaskName 'BruTTech_HockeyOS_Workbook_Projection_Refresh'; Write-Output ($t.State.ToString()+'|'+$t.Settings.Enabled.ToString())")
 return status
def run():
 if RECOVERY.exists():raise RuntimeError("EXISTING_CUTOVER_RECEIPT_OR_BACKUP_REFUSE_OVERWRITE")
 state=disabled()
 if not state.startswith("Disabled|False"):
  raise RuntimeError("HOURLY_TASK_NOT_DISABLED:"+state)
 if not LAUNCHER.is_file() or not LIVE.is_file() or not NEW.is_dir():
  raise RuntimeError("REQUIRED_LAUNCHER_FEED_VERSIONED_RUNTIME_MISSING")
 book_sha=digest(BOOK.read_bytes())
 if book_sha!=EXPECTED_SHA:raise RuntimeError("ORIGINAL_MASTER_WORKBOOK_HASH_CHANGED")
 manifest=json.loads((NEW/"manifest.json").read_text(encoding="utf8"))
 if manifest.get("state")!="DYNAMIC_DATE_BOUND_RUNTIME_QA_NOT_ACTIVATED":
  raise RuntimeError("STANDBY_SOURCE_MANIFEST_NOT_VALIDATED")
 for rel,expected in manifest["sourceFiles"].items():
  f=NEW/rel
  if not f.is_file() or digest(f.read_bytes())!=expected:
   raise RuntimeError("VERSIONED_COLLECTOR_SOURCE_HASH_DRIFT:"+rel)
 oldlauncher=LAUNCHER.read_bytes();oldfeed=LIVE.read_bytes()
 text=oldlauncher.decode("utf8")
 if text.count(OLD_PART)!=1 or NEW_PART in text:
  raise RuntimeError("LAUNCHER_TARGET_NOT_EXPECTED_OLD_RUNTIME")
 before=json.loads(oldfeed)
 if before.get("teamGP")!=5 or before.get("sourceValidationState")!="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS":
  raise RuntimeError("PRIOR_FOUR_GAME_STATE_NOT_RECOGNIZED")
 previous={g["htoGameId"]:g for g in before["games"]}
 if set(previous)!={3356177,3356178,3369564,3375601,3375682}:
  raise RuntimeError("PRIOR_ACCEPTED_GAME_IDS_CHANGED")
 RECOVERY.mkdir(parents=True)
 (RECOVERY/"launcher.original.py").write_bytes(oldlauncher)
 (RECOVERY/"four_game_feed.original.json").write_bytes(oldfeed)
 newlauncher=text.replace(OLD_PART,NEW_PART,1).encode("utf8")
 info={"state":"CUTOVER_STARTED","startedUTC":datetime.now(timezone.utc).isoformat(),
       "previousLauncherSHA256":digest(oldlauncher),"previousFeedSHA256":digest(oldfeed),
       "protectedWorkbookSHA256":book_sha,"previousGameIDs":sorted(previous),
       "sourceRuntime":str(NEW),"publicGitHubWritten":False,
       "htoCMSWritten":False,"masterWorkbookWritten":False,
       "rollbackVerified":False}
 try:
  if not disabled().startswith("Disabled|False"):raise RuntimeError("TASK_NO_LONGER_DISABLED")
  atomic(LAUNCHER,newlauncher)
  # Fresh full live source collection by existing operational launcher, now
  # directed at the proven versioned runtime.
  result=subprocess.run([sys.executable,str(LAUNCHER)],cwd=str(ROOT),
                        text=True,capture_output=True,timeout=115)
  info["collectorStdoutTail"]=result.stdout[-1000:]
  info["collectorStderrTail"]=result.stderr[-1000:]
  if result.returncode:raise RuntimeError("DYNAMIC_RUNTIME_OPERATIONAL_COLLECTION_FAILED_"+str(result.returncode))
  fresh=json.loads(LIVE.read_text(encoding="utf8"))
  actual={g["htoGameId"]:g for g in fresh.get("games",[])}
  if set(actual)!={3356177,3356178,3369564,3375601,3375682} or fresh.get("teamGP")!=5:
   raise RuntimeError("FIVE_GAME_OUTPUT_COVERAGE_UNEXPECTED")
  if any(actual[gid]!=previous[gid] for gid in previous):
   raise RuntimeError("FIVE_PRIOR_GAME_ROWS_HAVE_CHANGED")
  if (fresh.get("teamG"),fresh.get("teamA"))!=(12,19) or fresh.get("playerAggregateParity") is not True:
   raise RuntimeError("UPDATED_FIVE_GAME_PLAYER_PARITY_FAILURE")
  if fresh["missingStatFields"]["seasonParity"]["skaters"]["completeFieldComparisons"]!=120:
   raise RuntimeError("FIVE_GAME_SKATER_COMPARISON_COUNT_CHANGED")
  if fresh["missingStatFields"]["seasonParity"]["goalies"]["completeFieldComparisons"]!=11:
   raise RuntimeError("FIVE_GAME_GOALIE_PARITY_COUNT_CHANGED")
  if any(g["teamGoals"]!=6 or g["teamGoalsAgainst"]!=4 for g in fresh["games"] if g["htoGameId"]==3375682):
   raise RuntimeError("FIFTH_GAME_OFFICIAL_SCORE_INVALID")
  if digest(BOOK.read_bytes())!=book_sha:
   raise RuntimeError("ORIGINAL_MASTER_WORKBOOK_CHANGED_DURING_CUTOVER")
  if not disabled().startswith("Disabled|False"):raise RuntimeError("TASK_REENABLED_DURING_CUTOVER")
  info.update(state="CUTOVER_VERIFIED_DYNAMIC_RUNTIME_ACTIVE",
              finishedUTC=datetime.now(timezone.utc).isoformat(),
              newFeedSHA256=digest(LIVE.read_bytes()),
              newLauncherSHA256=digest(LAUNCHER.read_bytes()),
              newGameIDs=sorted(actual), previousFiveUnchanged=True,
              rollbackBackupsVerified=(digest((RECOVERY/"launcher.original.py").read_bytes())==digest(oldlauncher) and
                                      digest((RECOVERY/"four_game_feed.original.json").read_bytes())==digest(oldfeed)))
  if not info["rollbackBackupsVerified"]:raise RuntimeError("ROLLBACK_BACKUP_SHA_INVALID")
 except Exception as ex:
  info["failureReason"]=str(ex)
  atomic(LAUNCHER,oldlauncher)
  atomic(LIVE,oldfeed)
  info.update(state="CUTOVER_FAILED_ROLLED_BACK",finishedUTC=datetime.now(timezone.utc).isoformat(),
              rollbackVerified=(digest(LAUNCHER.read_bytes())==digest(oldlauncher) and digest(LIVE.read_bytes())==digest(oldfeed)))
 RECEIPT.write_text(json.dumps(info,indent=2)+"\n",encoding="utf8")
 print(json.dumps(info))
 if info["state"]!="CUTOVER_VERIFIED_DYNAMIC_RUNTIME_ACTIVE":sys.exit(2)
if __name__=="__main__":
 try:run()
 except Exception as e:
  print(json.dumps({"state":"CUTOVER_HOLD","reason":str(e)}),file=sys.stderr);sys.exit(2)
