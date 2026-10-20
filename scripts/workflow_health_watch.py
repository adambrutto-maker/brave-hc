#!/usr/bin/env python3
"""Independent GitHub issue alert on failed Brave H.C. schedule reconciliations.

Invoked by workflow_run.completed, not by the reconciliation process itself.
Never edits SVHL, HTO, goalie assignments, website files or contacts players.
"""
from __future__ import annotations

import json
import os
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


def api(base: str, path: str, token: str, method="GET", payload=None):
    headers={"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
             "X-GitHub-Api-Version":"2022-11-28","User-Agent":"BraveHC-Workflow-Watchdog"}
    data=json.dumps(payload).encode() if payload is not None else None
    if data is not None:
        headers["Content-Type"]="application/json"
    with urlopen(Request(base+path,headers=headers,data=data,method=method),timeout=20) as res:
        return {} if res.status==204 else json.load(res)


def sync(action: dict, repo: str, token: str):
    if action["action"]=="IGNORE":
        print("SKIPPED:",action["reason"])
        return
    base="https://api.github.com/repos/"+repo
    # Re-fetch latest run immediately before mutating issue state; this also
    # catches completion-order races where an older failure arrives late.
    latest=api(base,"/actions/workflows/brave-svhl-sync.yml/runs?per_page=1",token)
    return latest


def main():
    event=json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    repo=os.environ["GITHUB_REPOSITORY"]
    token=os.environ["GITHUB_TOKEN"]
    base="https://api.github.com/repos/"+repo
    latest=api(base,"/actions/workflows/brave-svhl-sync.yml/runs?per_page=1",token)
    recent=(latest.get("workflow_runs") or [{}])[0]
    d=decision(event,recent,repo)
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
