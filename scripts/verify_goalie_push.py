#!/usr/bin/env python3
"""Compare approved goalie request against latest remote GitHub state before push.

No network or filesystem writes in this Python module. The caller must run
'git fetch origin main' just before invoking; a subsequent git push remains
non-force, so changes after that fetch cause push rejection.
"""
from __future__ import annotations
import argparse
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from set_goalie import safe_goalie, verify_expected_state, validate_change_reason


def validate_publish(feed: dict, remote: dict, proposed: dict, key: str,
                     signature: str, previous: str, chosen: str,
                     now: datetime, reason: str = "") -> None:
    verify_expected_state(feed, remote, key, signature, previous)
    if reason:
        validate_change_reason(previous,chosen,reason)
        audit=proposed.get("lastChange") if proposed.get("assignments",{}).get(key)!=previous else None
        if audit and audit.get("managerReason")!=reason:
            raise ValueError("Proposed manager reason differs from approved request")
    checked=datetime.fromisoformat(feed["checkedAt"])
    if checked.tzinfo is None or now-checked>timedelta(hours=24) or checked-now>timedelta(minutes=15):
        raise ValueError("Remote SVHL feed not verified within 24 hours")
    if proposed.get("schema")!="brave-hc-goalie-assignments/v1":
        raise ValueError("Proposed goalie assignment schema invalid")
    if not isinstance(proposed.get("assignments"), dict):
        raise ValueError("Proposed assignments invalid")
    if proposed["assignments"].get(key, "TBD")!=chosen:
        raise ValueError("Proposed goalie differs from the approved selection")
    remote_entries=remote["assignments"]
    proposed_entries=proposed["assignments"]
    for other in set(remote_entries)|set(proposed_entries):
        if other!=key and remote_entries.get(other)!=proposed_entries.get(other):
            raise ValueError("Another goalie assignment changed since checkout; refresh and retry after review")
    fixture=next(g for g in feed["games"] if g["assignmentKey"]==key)
    expected_revision=fixture.get("fixtureSignature")
    if fixture.get("requiresGoalieReconfirmation") and chosen!="TBD":
        if (proposed.get("scheduleConfirmations") or {}).get(key)!=expected_revision:
            raise ValueError("Proposed goalie reconfirmation does not match current league fixture")
    # Never allow other stored schedule confirmations to be discarded.
    for other,revision in (remote.get("scheduleConfirmations") or {}).items():
        if other!=key and (proposed.get("scheduleConfirmations") or {}).get(other)!=revision:
            raise ValueError("Other schedule confirmations changed since checkout")


def load_git(ref: str, path: str) -> dict:
    if ref!="origin/main":
        raise ValueError("Unsupported remote ref")
    if path not in ("widgets/svhl-upcoming.json","widgets/goalie-assignments.json"):
        raise ValueError("Unsupported read path")
    result=subprocess.run(["git","show",ref+":"+path],capture_output=True,text=True,check=True)
    return json.loads(result.stdout)


def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--request-file", type=Path)
    ap.add_argument("--game-key")
    ap.add_argument("--fixture-signature")
    ap.add_argument("--expected-goalie")
    ap.add_argument("--goalie")
    ap.add_argument("--custom-name", default="")
    ap.add_argument("--change-reason", default="")
    ap.add_argument("--assignments",type=Path,default=Path("widgets/goalie-assignments.json"))
    args=ap.parse_args()
    try:
        if args.request_file:
            # The issue workflow has already authenticated and validated this request.
            from process_goalie_issue import parse_request, TITLE
            issue=json.loads(args.request_file.read_text(encoding="utf-8"))
            request=parse_request(issue["title"],issue["body"])
            key=request["game_key"]
            signature=request["fixture_signature"]
            previous=request["expected_goalie"]
            goalie=request["resolved_goalie"]
            reason=request["change_reason"]
        else:
            key=args.game_key or ""
            signature=args.fixture_signature or ""
            previous=args.expected_goalie or ""
            goalie=safe_goalie(args.goalie or "",args.custom_name)
            reason=args.change_reason
        feed=load_git("origin/main","widgets/svhl-upcoming.json")
        remote=load_git("origin/main","widgets/goalie-assignments.json")
        proposed=json.loads(args.assignments.read_text(encoding="utf-8"))
        validate_change_reason(previous,goalie,reason)
        validate_publish(feed,remote,proposed,key,signature,previous,goalie,
                         datetime.now(timezone.utc),reason=reason)
        print("REMOTE_PRE_PUSH_VALIDATION_PASS: reviewed fixture and prior goalie still current")
        return 0
    except (ValueError,TypeError,KeyError,OSError,subprocess.CalledProcessError,json.JSONDecodeError) as exc:
        print("REMOTE_PRE_PUSH_BLOCKED: "+str(exc),file=sys.stderr)
        return 2


if __name__=="__main__":
    sys.exit(main())
