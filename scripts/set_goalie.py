#!/usr/bin/env python3
"""Controlled goalie assignment: only writes a known future SVHL fixture to local JSON.

Designed for a GitHub Actions workflow_dispatch run by an authenticated repository
collaborator. The workflow commits the updated file; this script never uses tokens,
calls external APIs or changes SVHL/HTO.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

CURRENT_GOALIES = ("Dev Leong", "Stephen Logue")
HISTORICAL_GOALIES = ("Matt Svec", "Steve Noyek", "Adam Carlyle", "Anthony Paolucci")
GOALIE_OPTIONS = (*CURRENT_GOALIES, "TBD", *HISTORICAL_GOALIES, "Other / rental")


def safe_goalie(option: str, custom: str) -> str:
    if option not in GOALIE_OPTIONS:
        raise ValueError("Goalie is not in the controlled dropdown")
    if option == "Other / rental":
        name = " ".join(custom.split())
        if not 2 <= len(name) <= 70:
            raise ValueError("Other goalie requires a name of 2 to 70 characters")
        if any(ord(c) < 32 for c in name) or "<" in name or ">" in name:
            raise ValueError("Invalid goalie name")
        return name
    if custom.strip():
        raise ValueError("Custom name only allowed when Other / rental is selected")
    return option



def verify_expected_state(feed: dict, data: dict, game_key: str,
                          fixture_signature: str, expected_goalie: str) -> None:
    """Fail closed when a proposed save is no longer the manager-reviewed state."""
    if not isinstance(fixture_signature, str) or not 10 <= len(fixture_signature) <= 240:
        raise ValueError("SVHL fixture revision is required before saving; review latest schedule")
    if not isinstance(expected_goalie, str) or not 1 <= len(expected_goalie) <= 70:
        raise ValueError("Previously displayed goalie is required before saving")
    if feed.get("schema") != "brave-hc-svhl-schedule/v1" or not isinstance(feed.get("games"), list):
        raise ValueError("Official SVHL schedule feed invalid")
    matches = [g for g in feed["games"] if g.get("assignmentKey") == game_key]
    if len(matches) != 1 or matches[0].get("fixtureSignature") != fixture_signature:
        raise ValueError("SVHL fixture changed since selection; reload manager and re-confirm")
    if data.get("schema") != "brave-hc-goalie-assignments/v1" or not isinstance(data.get("assignments"), dict):
        raise ValueError("Saved goaltender data invalid")
    current = data["assignments"].get(game_key, "TBD")
    if current != expected_goalie:
        raise ValueError("Goalie assignment changed since selection; reload manager and review")


def update_assignment(feed: dict, data: dict, game_key: str, goalie: str, actor: str, now: datetime) -> tuple[dict, bool]:
    if feed.get("schema") != "brave-hc-svhl-schedule/v1" or not isinstance(feed.get("games"), list):
        raise ValueError("Official league feed is missing or invalid")
    last = datetime.fromisoformat(feed["checkedAt"])
    if last.tzinfo is None:
        raise ValueError("Official league feed timestamp has no timezone")
    if now - last > timedelta(hours=24) or last - now > timedelta(minutes=15):
        raise ValueError("SVHL verification is stale or has a future timestamp; refresh before assignment")
    valid = [g for g in feed["games"] if g.get("assignmentKey") == game_key]
    if len(valid) != 1:
        raise ValueError("Selected game key must uniquely match one upcoming SVHL fixture")
    fixture = valid[0]
    if fixture.get("date") and fixture.get("time"):
        from zoneinfo import ZoneInfo
        puck_drop = datetime.fromisoformat(fixture["date"]+"T"+fixture["time"]).replace(tzinfo=ZoneInfo("America/Toronto"))
        if now > puck_drop + timedelta(hours=3):
            raise ValueError("Cannot change goaltender for a completed game")

    if data.get("schema") != "brave-hc-goalie-assignments/v1":
        raise ValueError("Unexpected goalie assignment schema")
    assignments = data.get("assignments")
    if not isinstance(assignments, dict):
        raise ValueError("Assignment file is missing its entries")
    confirmed_revisions = data.get("scheduleConfirmations", {})
    if not isinstance(confirmed_revisions, dict):
        raise ValueError("Invalid schedule reconfirmation history")
    old = assignments.get(game_key, "TBD")
    revision = fixture.get("fixtureSignature")
    if revision is not None and not isinstance(revision, str):
        raise ValueError("Invalid fixture revision")
    # The same goalie can be explicitly re-confirmed after a reschedule.
    review_reason = bool(fixture.get("requiresGoalieReconfirmation") and goalie != "TBD")
    reconfirm = bool(review_reason and revision and
                     confirmed_revisions.get(game_key) != revision)
    if old == goalie and not reconfirm:
        return data, False

    assignments[game_key] = goalie
    if goalie == "TBD":
        confirmed_revisions.pop(game_key, None)
    elif revision:
        confirmed_revisions[game_key] = revision
    if revision:
        data["scheduleConfirmations"] = confirmed_revisions
    data["updatedAt"] = now.isoformat()
    data["lastChange"] = {
        "key": game_key, "date": fixture["date"], "opponent": fixture["opponent"],
        "previous": old, "confirmed": goalie, "actor": actor[:80],
        "reason": ("manager reconfirmation after league schedule change" if review_reason
                   else "manager assignment")
    }
    return data, True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed", type=Path, default=Path("widgets/svhl-upcoming.json"))
    ap.add_argument("--assignments", type=Path, default=Path("widgets/goalie-assignments.json"))
    ap.add_argument("--game-key", required=True)
    ap.add_argument("--goalie", required=True)
    ap.add_argument("--custom-name", default="")
    ap.add_argument("--actor", default="repository editor")
    ap.add_argument("--fixture-signature", default="")
    ap.add_argument("--expected-goalie", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    try:
        name = safe_goalie(args.goalie, args.custom_name)
        feed = json.loads(args.feed.read_text(encoding="utf-8"))
        data = json.loads(args.assignments.read_text(encoding="utf-8"))
        if not args.dry_run:
            verify_expected_state(feed, data, args.game_key,
                                  args.fixture_signature, args.expected_goalie)
        updated, changed = update_assignment(feed, data, args.game_key, name, args.actor, datetime.now(timezone.utc))
        if changed and not args.dry_run:
            args.assignments.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(("CHANGED" if changed else "UNCHANGED") + f" {args.game_key}: {name}"
              + (" (dry-run)" if args.dry_run else ""))
        return 0
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        print("BLOCKED: " + str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
