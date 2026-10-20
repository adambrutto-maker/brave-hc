#!/usr/bin/env python3
"""Process only strictly formatted Brave H.C. goalie issue requests.

A GitHub Actions job checks actor WRITE+ permissions *before* running this file.
The issue body is untrusted; never evaluate or run commands supplied by it.
The authenticated issue opener's login is the audit actor.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from set_goalie import safe_goalie, update_assignment

TITLE = "GOALIE_CONFIRMATION_REQUEST"
REQUEST_TYPE = "brave-hc-goalie-confirmation/v2"
ALLOWED_PERMISSIONS = {"admin", "maintain", "write"}


def parse_request(title: str, body: str) -> dict:
    if title != TITLE:
        raise ValueError("Not a goalie confirmation request")
    if not isinstance(body, str) or len(body) > 3000:
        raise ValueError("Unexpected request body length")
    try:
        req = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Request body is not JSON") from exc
    if not isinstance(req, dict) or set(req) != {"type", "game_key", "goalie", "custom_goalie_name", "fixture_signature", "expected_goalie"}:
        raise ValueError("Unexpected goalie request fields")
    if req["type"] != REQUEST_TYPE:
        raise ValueError("Unexpected goalie request type")
    for key in ("game_key", "goalie", "custom_goalie_name", "fixture_signature", "expected_goalie"):
        if not isinstance(req[key], str):
            raise ValueError("Request fields must all be strings")
    if not re.fullmatch(r"(?:hto:[0-9]{4,15}|svhl:[0-9]{4}-[0-9]{2}-[0-9]{2}:[a-z0-9]{2,90})", req["game_key"]):
        raise ValueError("Unexpected game key")
    if not 10 <= len(req["fixture_signature"]) <= 240 or
       any(ord(ch) < 32 for ch in req["fixture_signature"]):
        raise ValueError("Invalid requested SVHL fixture revision")
    if not 1 <= len(req["expected_goalie"]) <= 70:
        raise ValueError("Invalid previously displayed goalie")
    req["resolved_goalie"] = safe_goalie(req["goalie"], req["custom_goalie_name"])
    return req


def apply_request(req: dict, actor: str, permission: str, feed: dict,
                  stored: dict, now: datetime) -> tuple[dict, bool]:
    if permission not in ALLOWED_PERMISSIONS:
        raise PermissionError("A repository-writing account is required")
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})", actor):
        raise ValueError("Unexpected GitHub actor")
    matches=[g for g in feed.get("games",[]) if g.get("assignmentKey")==req["game_key"]]
    if len(matches)!=1 or matches[0].get("fixtureSignature")!=req["fixture_signature"]:
        raise ValueError("SVHL fixture changed since selection; reload manager and re-confirm")
    previous=(stored.get("assignments") or {}).get(req["game_key"], "TBD")
    if previous!=req["expected_goalie"]:
        raise ValueError("Goalie assignment changed since selection; reload manager and review")
    return update_assignment(feed, stored, req["game_key"],
                             req["resolved_goalie"], actor, now)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--request", required=True, type=Path)
    ap.add_argument("--actor", required=True)
    ap.add_argument("--permission", required=True)
    ap.add_argument("--feed", type=Path, default=Path("widgets/svhl-upcoming.json"))
    ap.add_argument("--assignments", type=Path, default=Path("widgets/goalie-assignments.json"))
    args = ap.parse_args()
    try:
        issue = json.loads(args.request.read_text(encoding="utf-8"))
        req = parse_request(issue["title"], issue["body"])
        current = json.loads(args.feed.read_text(encoding="utf-8"))
        stored = json.loads(args.assignments.read_text(encoding="utf-8"))
        out, changed = apply_request(req, args.actor, args.permission, current,
                                     stored, datetime.now(timezone.utc))
        if changed:
            args.assignments.write_text(json.dumps(out, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
        print("CHANGED" if changed else "ALREADY_CONFIRMED")
        return 0
    except (ValueError, KeyError, TypeError, PermissionError, OSError, json.JSONDecodeError) as exc:
        print("BLOCKED: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
