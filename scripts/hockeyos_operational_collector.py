"""Operational HTO collector candidate. Defaults to live check-only; no scheduler edits."""
import argparse
import copy
import hashlib
import json
import os
import re
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import hockeyos_feed_adapter_review as adapter

class CollectorHold(ValueError):
    pass

def digest(data):
    return hashlib.sha256(data).hexdigest()

def serialize(payload):
    return (json.dumps(payload,ensure_ascii=False,allow_nan=False,sort_keys=True,indent=2)+"\n").encode("utf8")

def verified_feed():
    """Only live reviewed collection can enter the operational contract."""
    source=adapter.adapt_review(adapter.observe_discovery())
    if (source.get("schema")!="brave-hc-hto-operational-contract-candidate/v1" or
        source.get("sourceContentIdentityVerified") is not True or
        source.get("allGamesDiscovered") is not True or
        source.get("playerAggregateParity") is not True):
        raise CollectorHold("LIVE_SOURCE_CONTRACT_NOT_VERIFIED")
    output=copy.deepcopy(source)
    output.update(schema="brave-hc-hto-verified-game-feed/v1",
                  createdAt=datetime.now(timezone.utc).isoformat(),
                  source="HTO live scores discovery, verified boxscores and season statistics",
                  sourceValidationState="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS",
                  releaseState="OPERATIONAL_SOURCE_FEED_NOT_AWARD_CALCULATION")
    return output

def safe_json_path(value):
    path=Path(value)
    if not path.is_absolute() or path.suffix.lower()!=".json":
        raise CollectorHold("ABSOLUTE_JSON_PATH_REQUIRED")
    # Resolve only after checking links: resolution alone would hide redirection.
    for part in (path,*path.parents):
        if part.is_symlink() or (hasattr(os.path,"isjunction") and os.path.isjunction(part)):
            raise CollectorHold("LINK_OR_JUNCTION_PATH_REFUSED")
    if not path.parent.is_dir():
        raise CollectorHold("EXISTING_PARENT_REQUIRED")
    if path.exists() and not path.is_file():
        raise CollectorHold("REGULAR_JSON_FILE_REQUIRED")
    return path

def current_bytes(path):
    safe_json_path(path)
    return path.read_bytes() if path.exists() else None

def expected_state(path,expected_sha=None,expected_absent=False):
    if expected_absent==bool(expected_sha):
        raise CollectorHold("EXACTLY_ONE_EXPECTED_STATE_REQUIRED")
    if expected_sha is not None and not re.fullmatch("[0-9a-fA-F]{64}",expected_sha):
        raise CollectorHold("INVALID_EXPECTED_SHA256")
    old=current_bytes(path)
    if expected_absent:
        if old is not None: raise CollectorHold("EXPECTED_ABSENT_BUT_EXISTS")
    elif old is None or digest(old)!=expected_sha.lower():
        raise CollectorHold("CURRENT_HASH_MISMATCH")
    return old

def write_exclusive(path,data):
    with path.open("xb") as handle:
        handle.write(data);handle.flush();os.fsync(handle.fileno())
    if path.read_bytes()!=data:
        raise CollectorHold("EXCLUSIVE_WRITE_VERIFICATION_FAILED")

def atomic_replace_bytes(path,data):
    """Called only inside our separate per-output exclusive lock."""
    fd,name=tempfile.mkstemp(prefix=path.name+".",suffix=".tmp",dir=str(path.parent))
    temp=Path(name)
    try:
        with os.fdopen(fd,"wb") as handle:
            handle.write(data);handle.flush();os.fsync(handle.fileno())
        if temp.read_bytes()!=data: raise CollectorHold("TEMPORARY_WRITE_VERIFICATION_FAILED")
        os.replace(temp,path)
    finally:
        if temp.exists():temp.unlink()

class OutputLock:
    def __init__(self,output,lock_path=None):
        self.path=Path(lock_path) if lock_path else output.with_name(output.name+".collector-lock.json")
        safe_json_path(self.path)
        if self.path.parent!=output.parent or self.path==output:
            raise CollectorHold("SEPARATE_SAME_DIRECTORY_LOCK_REQUIRED")
        self.token=serialize({"token":uuid.uuid4().hex,"pid":os.getpid()})
        self.owned=False
    def __enter__(self):
        try:write_exclusive(self.path,self.token)
        except FileExistsError:raise CollectorHold("OUTPUT_LOCK_CONTENDED")
        self.owned=True
        return self
    def __exit__(self,*args):
        if self.owned and self.path.exists() and self.path.read_bytes()==self.token:
            self.path.unlink()

def validate_feed(payload):
    if (not isinstance(payload,dict) or payload.get("schema")!="brave-hc-hto-verified-game-feed/v1" or
        payload.get("allGamesDiscovered") is not True or payload.get("sourceContentIdentityVerified") is not True or
        payload.get("playerAggregateParity") is not True or payload.get("parityScope")!="COMPLETE_FIELDS_ONLY"):
        raise CollectorHold("VERIFIED_FEED_CONTRACT_REQUIRED")
    adapter.timestamp(payload.get("sourceReadback"))
    if payload.get("sourceReadback")!=payload.get("observationStartedAt"):
        raise CollectorHold("SOURCE_READBACK_MUST_BE_OBSERVATION_START")

def write_feed(payload,output_path,expected_sha=None,expected_absent=False,lock_path=None):
    """Atomic feed replacement with verified backup; caller owns activation decision."""
    validate_feed(payload)
    data=serialize(payload) # serialization failure occurs before any filesystem mutation
    path=safe_json_path(output_path)
    backup=None;backup_sha=None
    with OutputLock(path,lock_path):
        old=expected_state(path,expected_sha,expected_absent)
        if old is not None:
            backup=path.with_name(path.stem+".backup-"+uuid.uuid4().hex+".json")
            write_exclusive(backup,old)
            backup_sha=digest(backup.read_bytes())
            if backup_sha!=digest(old):raise CollectorHold("BACKUP_HASH_MISMATCH")
        # Last pre-replacement comparison detects an external writer ignoring our lock.
        expected_state(path,expected_sha,expected_absent)
        atomic_replace_bytes(path,data)
        installed=path.read_bytes()
        if installed!=data:raise CollectorHold("INSTALLED_FEED_VERIFICATION_FAILED")
        if json.loads(installed)!=payload:raise CollectorHold("INSTALLED_JSON_ROUNDTRIP_FAILED")
    return {"state":"FEED_WRITTEN_VERIFIED","outputPath":str(path),"outputSHA256":digest(data),
            "previousSHA256":None if old is None else digest(old),
            "backupPath":None if backup is None else str(backup),"backupSHA256":backup_sha,
            "schema":payload["schema"],"sourceReadback":payload["sourceReadback"],
            "workbookWritten":False,"publisherUpdated":False}

def rollback_feed(output_path,expected_current_sha,backup_path,expected_backup_sha,lock_path=None):
    path=safe_json_path(output_path);backup=safe_json_path(backup_path)
    if path==backup:raise CollectorHold("DISTINCT_BACKUP_REQUIRED")
    if not re.fullmatch("[0-9a-fA-F]{64}",expected_backup_sha or ""):
        raise CollectorHold("INVALID_BACKUP_SHA256")
    with OutputLock(path,lock_path):
        expected_state(path,expected_current_sha)
        data=backup.read_bytes()
        if digest(data)!=expected_backup_sha.lower():raise CollectorHold("ROLLBACK_BACKUP_HASH_MISMATCH")
        json.loads(data) # refusal if backup no longer contains JSON
        expected_state(path,expected_current_sha)
        atomic_replace_bytes(path,data)
        if path.read_bytes()!=data:raise CollectorHold("ROLLBACK_VERIFICATION_FAILED")
    return {"state":"ROLLBACK_VERIFIED","outputPath":str(path),"outputSHA256":digest(data)}

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument("--check-only",action="store_true")
    mode.add_argument("--write-feed",action="store_true")
    parser.add_argument("--output-path")
    expected=parser.add_mutually_exclusive_group()
    expected.add_argument("--expected-current-sha")
    expected.add_argument("--expected-absent",action="store_true")
    parser.add_argument("--lock-path")
    args=parser.parse_args(argv)
    if args.write_feed:
        if not args.output_path:raise CollectorHold("WRITE_OUTPUT_PATH_REQUIRED")
        path=safe_json_path(args.output_path)
        expected_state(path,args.expected_current_sha,args.expected_absent)
    elif args.output_path or args.expected_current_sha or args.expected_absent or args.lock_path:
        raise CollectorHold("WRITE_ARGUMENTS_REQUIRE_WRITE_FEED")
    payload=verified_feed()
    if args.write_feed:
        print(json.dumps(write_feed(payload,args.output_path,args.expected_current_sha,args.expected_absent,args.lock_path)),flush=True)
    else:
        print(json.dumps({"state":"CHECK_ONLY_SOURCE_VERIFIED","feed":payload,"feedWritten":False}),flush=True)
    return 0

if __name__=="__main__":
    try:raise SystemExit(main())
    except (CollectorHold,adapter.review.ReviewHold,adapter.review.helper.BoxscoreSchemaHold,
            OSError,ValueError,KeyError) as error:
        print(json.dumps({"state":"HOLD","reason":str(error),"workbookWritten":False,"publisherUpdated":False}),file=sys.stderr)
        raise SystemExit(2)
