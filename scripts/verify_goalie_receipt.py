#!/usr/bin/env python3
"""Read-after-write receipt for a reviewed Brave H.C. goalie confirmation.

The caller fetches origin/main AFTER a potential non-force push. Only the
remote Git history and JSON at origin/main are consulted here. This script
cannot publish, approve, contact players, or change HTO or goalie files.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from set_goalie import safe_goalie
from verify_goalie_push import load_git


def verify_receipt(feed: dict, saved: dict, game_key: str,
                   signature: str, previous: str, chosen: str,
                   actor: str | None = None, claimed_change: bool = False,
                   manager_reason: str = "") -> dict:
    if feed.get("schema") != "brave-hc-svhl-schedule/v1":
        raise ValueError("Remote SVHL feed invalid")
    if saved.get("schema") != "brave-hc-goalie-assignments/v1":
        raise ValueError("Remote goalie file invalid")
    entries = saved.get("assignments")
    if not isinstance(entries, dict):
        raise ValueError("Remote goalie entries missing")
    matches = [g for g in feed.get("games", [])
               if g.get("assignmentKey") == game_key]
    if len(matches) != 1 or matches[0].get("fixtureSignature") != signature:
        raise ValueError("Remote SVHL fixture revision changed before receipt")
    if entries.get(game_key, "TBD") != chosen:
        raise ValueError("Remote goalie assignment does not match confirmed selection")
    if matches[0].get("requiresGoalieReconfirmation") and chosen != "TBD":
        if (saved.get("scheduleConfirmations") or {}).get(game_key) != signature:
            raise ValueError("Remote schedule reconfirmation was not recorded")
    if claimed_change:
        audit = saved.get("lastChange")
        if not isinstance(audit, dict):
            raise ValueError("Remote goalie change audit missing")
        expected = {
            "key": game_key,
            "previous": previous,
            "confirmed": chosen,
        }
        if actor:
            expected["actor"] = actor
        if any(audit.get(k) != v for k, v in expected.items()):
            raise ValueError("Remote goalie change audit differs from approved request")
        if manager_reason and audit.get("managerReason") != manager_reason:
            raise ValueError("Remote goalie change reason differs from approved request")
    return {
        "schema": "brave-hc-goalie-receipt/v1",
        "status": "PUBLISHED_AND_VERIFIED",
        "game_key": game_key,
        "fixture_signature": signature,
        "previous_goalie": previous,
        "published_goalie": chosen,
        "change_required": claimed_change,
    }


def git_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "origin/main"],
        capture_output=True, text=True, check=True
    )
    value = result.stdout.strip()
    if len(value) != 40 or not all(c in "0123456789abcdef" for c in value):
        raise ValueError("Remote commit hash invalid")
    return value


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--request-file", type=Path)
    ap.add_argument("--game-key", default="")
    ap.add_argument("--fixture-signature", default="")
    ap.add_argument("--goalie", default="")
    ap.add_argument("--custom-name", default="")
    ap.add_argument("--expected-goalie", default="")
    ap.add_argument("--actor", default="")
    ap.add_argument("--change-reason", default="")
    ap.add_argument("--result-file", type=Path)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()
    try:
        if args.request_file:
            from process_goalie_issue import parse_request, TITLE
            src=json.loads(args.request_file.read_text(encoding="utf-8"))
            req=parse_request(src["title"], src["body"])
            key=req["game_key"]
            signature=req["fixture_signature"]
            expected=req["expected_goalie"]
            chosen=req["resolved_goalie"]
            manager_reason=req["change_reason"]
        else:
            key=args.game_key
            signature=args.fixture_signature
            expected=args.expected_goalie
            chosen=safe_goalie(args.goalie,args.custom_name)
            manager_reason=args.change_reason

        changed=False
        if args.result_file:
            status=json.loads(args.result_file.read_text(encoding="utf-8"))
            if status.get("schema")!="brave-hc-goalie-request-status/v1":
                raise ValueError("Approval result schema invalid")
            if status.get("code") not in ("CHANGED","ALREADY_CONFIRMED"):
                raise ValueError("Goaltender approval did not succeed")
            changed=status["code"]=="CHANGED"
        elif args.request_file:
            raise ValueError("Issue approval receipt requires processor status")

        receipt=verify_receipt(
            load_git("origin/main","widgets/svhl-upcoming.json"),
            load_git("origin/main","widgets/goalie-assignments.json"),
            key,signature,expected,chosen,
            actor=args.actor if changed else None,claimed_change=changed,
            manager_reason=manager_reason)
        receipt["verified_remote_sha"]=git_sha()
        receipt["verified_at"]=datetime.now(timezone.utc).isoformat()
        if args.out:
            args.out.parent.mkdir(parents=True,exist_ok=True)
            args.out.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        print("REMOTE_RECEIPT_VERIFIED: "+key+" published as "+chosen+
              " at commit "+receipt["verified_remote_sha"])
        return 0
    except (ValueError,KeyError,TypeError,OSError,subprocess.CalledProcessError,
            json.JSONDecodeError) as e:
        print("REMOTE_RECEIPT_BLOCKED: "+str(e),file=sys.stderr)
        return 2


if __name__=="__main__":
    sys.exit(main())
