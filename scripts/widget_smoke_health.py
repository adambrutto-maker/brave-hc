#!/usr/bin/env python3
"""Independent monitoring of public Brave H.C. goalie widget browser QA.

Trigger: workflow_run.completed for the separate read-only browser test, or
scheduled/manual watchdog checks. This script may create/update/close ONLY
a GitHub QA review issue. It cannot alter HTO, the widget, schedules, goalies
or messages to players.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

TARGET = "Brave H.C. public goalie widget browser QA"
WORKFLOW_FILE = "brave-goalie-widget-smoke.yml"
ISSUE_TITLE = "Brave H.C. — public goalie widget browser QA failure"
FAILURES = {"failure", "cancelled", "timed_out", "startup_failure", "stale", "action_required", "skipped"}
AGE_LIMIT = timedelta(hours=36)


def latest_completed(runs: list[dict]) -> dict | None:
    return next((r for r in runs if r.get("status") == "completed"), None)


def decision(event: dict, runs: list[dict], repo: str, now: datetime) -> dict:
    """Return a structured, side-effect-free OPEN, CLOSE or IGNORE decision."""
    source = (event.get("workflow_run") or {})
    recent = latest_completed(runs)
    if source:
        src_repo = (source.get("head_repository") or {}).get("full_name")
        if (source.get("name") != TARGET or source.get("status") != "completed"
                or source.get("head_branch") != "main" or src_repo != repo):
            return {"action": "IGNORE", "reason": "Not a completed trusted widget QA run"}
        if not recent or source.get("id") != recent.get("id"):
            return {"action": "IGNORE", "reason": "A newer completed browser QA superseded this event"}

    if not recent:
        reason = "No completed public widget browser QA was found"
        url = f"https://github.com/{repo}/actions/workflows/{WORKFLOW_FILE}"
        conclusion = "NONE"
    else:
        conclusion = recent.get("conclusion") or "UNKNOWN"
        url = recent.get("html_url") or f"https://github.com/{repo}/actions/workflows/{WORKFLOW_FILE}"
        started = recent.get("run_started_at") or recent.get("created_at") or ""
        try:
            instant = datetime.fromisoformat(started.replace("Z", "+00:00"))
            if instant.tzinfo is None:
                raise ValueError("Missing timezone")
            elapsed = now - instant
        except (ValueError, TypeError):
            elapsed = timedelta(days=999)
        if conclusion == "success" and -timedelta(minutes=15) <= elapsed <= AGE_LIMIT:
            return {"action": "CLOSE", "reason": "Most recent browser QA passed and is fresh"}
        if conclusion in FAILURES:
            reason = f"Latest completed browser QA ended: {conclusion}"
        elif elapsed > AGE_LIMIT:
            reason = "No successful completed browser QA within 36 hours"
        else:
            reason = "Browser QA outcome or timestamp could not be verified"

    body = "\n".join([
        "## Brave H.C. — public goalie schedule requires a browser check",
        "",
        f"**Condition:** {reason}",
        f"**Last completed run:** {url}",
        f"**Conclusion:** {conclusion}",
        "",
        "The external Chrome QA checks the public HTO iframe and actual desktop/mobile",
        "game rows against verified SVHL fixtures and stored goalie assignments.",
        "A failure does not prove a league cancellation or invalidate a goalie confirmation.",
        "",
        "1. Open the linked browser QA run and inspect the failure.",
        "2. Compare the official SVHL schedule, public HTO site and saved goalie assignments.",
        "3. Fix verified browser/data issues without changing HTO game records or assigning a goalie automatically.",
        "4. Re-run the public browser QA; the issue closes after the latest successful, fresh test.",
        "",
        "**No website edits, goalie changes, messages or player notifications are performed by this watchdog.**",
    ])
    return {"action": "OPEN", "reason": reason, "body": body}


def gh(base: str, path: str, token: str, method: str = "GET", payload: dict | None = None):
    headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "BraveHC-WidgetQA-Watchdog",
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = Request(base + path, data=data, headers=headers, method=method)
    with urlopen(req, timeout=25) as response:
        return {} if response.status == 204 else json.load(response)


def apply(dec: dict, repo: str, token: str):
    if dec["action"] == "IGNORE":
        print("IGNORE:", dec["reason"])
        return
    base = "https://api.github.com/repos/" + repo
    issues = gh(base, "/issues?state=all&per_page=100", token)
    item = next((i for i in issues if i.get("title") == ISSUE_TITLE and "pull_request" not in i), None)
    if dec["action"] == "CLOSE":
        if item and item.get("state") == "open":
            gh(base, f"/issues/{item['number']}", token, "PATCH", {"state": "closed"})
            print("CLOSED: last completed browser QA passed")
        else:
            print("HEALTHY: no active browser QA issue")
    elif not item:
        gh(base, "/issues", token, "POST", {"title": ISSUE_TITLE, "body": dec["body"]})
        print("OPENED: browser QA review issue")
    else:
        patch = {"body": dec["body"]}
        if item.get("state") != "open":
            patch["state"] = "open"
        if item.get("state") == "open" and item.get("body") == dec["body"]:
            print("UNCHANGED: browser QA issue already open")
        else:
            gh(base, f"/issues/{item['number']}", token, "PATCH", patch)
            print("UPDATED: browser QA issue")


def main():
    repo = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GITHUB_TOKEN"]
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    base = "https://api.github.com/repos/" + repo
    response = gh(base, f"/actions/workflows/{WORKFLOW_FILE}/runs?per_page=15", token)
    verdict = decision(event, response.get("workflow_runs") or [], repo, datetime.now(timezone.utc))
    apply(verdict, repo, token)


if __name__ == "__main__":
    main()
