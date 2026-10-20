#!/usr/bin/env python3
"""Independent GitHub issue alert on failed Brave H.C. schedule reconciliations.

Invoked by workflow_run.completed, not by the reconciliation process itself.
Never edits SVHL, HTO, goalie assignments, website files or contacts players.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

TITLE="Brave H.C. — SVHL synchronization failure"
TARGET="Brave H.C. SVHL schedule reconciliation"
FAILURES={"failure","timed_out","cancelled","action_required","stale","startup_failure"}
GOOD={"success"}


def decision(event: dict, latest: dict, repo: str) -> dict:
    run=event.get("workflow_run") or {}
    own=(run.get("head_repository") or {}).get("full_name")
    if (run.get("name")!=TARGET or own!=repo or run.get("head_branch")!="main" or
        run.get("status")!="completed"):
        return {"action":"IGNORE","reason":"Not a completed first-party default-branch schedule run"}
    if latest.get("id")!=run.get("id"):
        return {"action":"IGNORE","reason":"A more recent schedule run superseded this event"}
    result=run.get("conclusion")
    if result in GOOD:
        return {"action":"CLOSE","reason":"Latest schedule run succeeded"}
    if result not in FAILURES:
        return {"action":"IGNORE","reason":"Unexpected run conclusion"}
    run_id=run.get("id")
    return {"action":"OPEN",
            "reason":"Latest SVHL reconciliation ended: "+result,
            "body":(
                "## Brave H.C. schedule synchronization needs review\n\n"
                "**An independent GitHub monitor detected a failed schedule check.** "
                "This does not prove the official league schedule changed. "
                "The public goalie widget retains its last verified feed and will show a stale-data warning when appropriate.\n\n"
                f"- **Run:** https://github.com/{repo}/actions/runs/{run_id}\n"
                f"- **Result:** {result}\n"
                "- **Action:** review the GitHub Actions logs, restore successful reconciliation, "
                "and confirm that SVHL and HTO still match before any manual HTO edit.\n"
                "- **No automatic edits or player communications occurred.**\n\n"
                "This issue closes only when the latest completed reconciliation succeeds."
            )}



def heartbeat_decision(runs: list[dict], now: datetime, repo: str, maximum_hours: int = 12) -> dict:
    """Catch overdue or failed checks even when no workflow_run.completed event arrives."""
    completed=next((run for run in runs if run.get("status")=="completed"),None)
    if not completed:
        reason="No completed SVHL verification run was found"
        link=f"https://github.com/{repo}/actions/workflows/brave-svhl-sync.yml"
        outcome="NO_COMPLETED_RUN"
    else:
        created=completed.get("run_started_at") or completed.get("created_at") or ""
        try:
            at=datetime.fromisoformat(created.replace("Z","+00:00"))
            if at.tzinfo is None:
                raise ValueError("Naive timestamp")
            elapsed=now-at
        except (ValueError, TypeError):
            elapsed=timedelta(days=999)
        outcome=completed.get("conclusion") or "UNKNOWN"
        link=completed.get("html_url") or f"https://github.com/{repo}/actions/workflows/brave-svhl-sync.yml"
        if outcome in FAILURES:
            reason="Latest completed SVHL reconciliation failed: "+outcome
        elif elapsed>timedelta(hours=maximum_hours):
            reason=f"No completed SVHL verification within {maximum_hours} hours"
        elif outcome=="success" and elapsed>=-timedelta(minutes=15):
            return {"action":"CLOSE","reason":"Last successful SVHL check is fresh"}
        else:
            reason="Unverifiable SVHL reconciliation result or timestamp"
    return {"action":"OPEN","reason":reason,"body":(
        "## Brave H.C. SVHL monitoring overdue or failed\\n\\n"
        f"**Condition:** {reason}\\n\\n"
        f"- **Latest completed run:** {link}\\n"
        f"- **Conclusion:** {outcome}\\n"
        "- Verify [SVHL](https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY) and "
        "[HTO](https://www.htosports.com/teams/default.asp?p=schedule&s=hockey&u=BRAVESHOCKEY&format=List) directly.\\n"
        "- Check the GitHub Actions schedule and logs; do not assume the last published fixture feed is current.\\n"
        "- **No HTO changes, goalie assignments, or player contact occurred.**\\n\\n"
        "This issue clears after the most recent reconciliation succeeds and is fresh."
    ).replace("\\n","\\n")}

def api(base: str, path: str, token: str, method="GET", payload=None):
    headers={"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
             "X-GitHub-Api-Version":"2022-11-28","User-Agent":"BraveHC-Workflow-Watchdog"}
    data=json.dumps(payload).encode() if payload is not None else None
    if data is not None:
        headers["Content-Type"]="application/json"
    with urlopen(Request(base+path,headers=headers,data=data,method=method),timeout=20) as res:
        return {} if res.status==204 else json.load(res)


def main():
    event=json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    repo=os.environ["GITHUB_REPOSITORY"]
    token=os.environ["GITHUB_TOKEN"]
    base="https://api.github.com/repos/"+repo
    latest=api(base,"/actions/workflows/brave-svhl-sync.yml/runs?per_page=15",token)
    recent=(latest.get("workflow_runs") or [{}])[0]
    if event.get("workflow_run"):
        d=decision(event,recent,repo)
    else:
        d=heartbeat_decision(latest.get("workflow_runs") or [],datetime.now(timezone.utc),repo)
    if d["action"]=="IGNORE":
        print("SKIPPED:",d["reason"])
        return
    issues=api(base,"/issues?state=all&per_page=100",token)
    existing=next((i for i in issues if i.get("title")==TITLE and "pull_request" not in i),None)
    if d["action"]=="CLOSE":
        if existing and existing.get("state")=="open":
            api(base,"/issues/"+str(existing["number"]),token,method="PATCH",payload={"state":"closed"})
            print("CLOSED: latest SVHL reconciliation succeeded")
        else:
            print("HEALTHY: no open issue")
    elif not existing:
        api(base,"/issues",token,method="POST",payload={"title":TITLE,"body":d["body"]})
        print("OPENED: failed SVHL reconciliation")
    else:
        payload={"body":d["body"]}
        if existing.get("state")!="open":
            payload["state"]="open"
        if existing.get("state")=="open" and existing.get("body")==d["body"]:
            print("UNCHANGED: existing failure issue")
        else:
            api(base,"/issues/"+str(existing["number"]),token,method="PATCH",payload=payload)
            print("UPDATED: failed SVHL reconciliation")


if __name__=="__main__":
    main()
