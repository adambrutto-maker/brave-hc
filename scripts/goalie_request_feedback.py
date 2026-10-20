#!/usr/bin/env python3
"""Public, controlled feedback for failed goalie confirmation issue workflows.

Run only AFTER an Actions job has failed. This module never changes HTO,
the goalie schedule or assignments. It only comments on the existing request.
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

SCHEMA = "brave-hc-goalie-request-status/v1"
MESSAGES = {
    "STALE_FIXTURE": "The league game details changed since this request was prepared. Open the Goaltender Manager again and review the current opponent, puck-drop time and rink.",
    "STALE_GOALIE": "The saved goaltender changed after this request was prepared. Open the manager again and review the current assignment before submitting anything new.",
    "STALE_FEED": "The official SVHL verification is too old. Refresh the league feed successfully, then reopen the Goaltender Manager.",
    "GAME_COMPLETED": "This game is already past the supported confirmation window. Review any historical correction manually; this approval flow will not edit the past result.",
    "UNKNOWN_GAME": "The requested game no longer matches exactly one published upcoming SVHL game. Reopen the manager after checking the league schedule.",
    "INVALID_GOALIE": "The goalie choice or rental name did not pass validation. Review the allowed list and rental name, then prepare a new request.",
    "UNAUTHORIZED": "The request could not be attributed to an account with repository write permission. An authorized manager must submit the request.",
    "INVALID_REQUEST": "The request format or supplied fields were invalid. Prepare a new request from the current Goaltender Manager.",
}


def safe_status(path: Path) -> str:
    """Never echo untrusted issue text or exception messages in public comments."""
    try:
        content = json.loads(path.read_text(encoding="utf-8"))
        if content.get("schema") == SCHEMA and content.get("code") in MESSAGES:
            return content["code"]
    except (OSError, ValueError, AttributeError, TypeError):
        pass
    return "INVALID_REQUEST"


def build_comment(code: str, auth: str, commit: str, close: str,
                  repo: str, run_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("Untrusted repository name")
    if not re.fullmatch(r"[0-9]{1,20}", run_id):
        raise ValueError("Untrusted workflow ID")
    link = f"https://github.com/{repo}/actions/runs/{run_id}"
    if commit == "failure" or (auth == "success" and commit == "success" and close == "failure"):
        reason = ("The request reached the publish or close stage, but the workflow failed. "
                  "The assignment may or may not have been published. Check the saved "
                  "assignment file and commit history BEFORE attempting another request.")
    elif auth == "failure":
        reason = MESSAGES.get(code, MESSAGES["INVALID_REQUEST"])
    else:
        reason = ("The automated workflow failed before it could verify successful publication. "
                  "Inspect its tests and logs; do not assume the request was saved.")
    return "\n".join([
        "### Goalie confirmation needs review — not automatically retried",
        "",
        reason,
        "",
        f"[Review the failed GitHub workflow]({link})",
        "",
        "This issue is intentionally left open as a review receipt. If a fresh confirmation "
        "is necessary, revisit the [Goaltender Manager]"
        "(https://adambrutto-maker.github.io/brave-hc/widgets/goalie-manager-v1.2.html), "
        "check the official SVHL fixture and currently saved goalie, and submit a **new issue** "
        "only after explicit manager review. Editing or commenting on this old issue will not re-run a save.",
        "",
        "**This failure notice has not edited HTO, changed any goalie assignment or contacted a player.**",
    ])


def post_comment(repo: str, issue: int, token: str, message: str) -> None:
    if not isinstance(issue, int) or issue < 1:
        raise ValueError("Invalid GitHub issue number")
    url = f"https://api.github.com/repos/{repo}/issues/{issue}/comments"
    request = Request(
        url, data=json.dumps({"body": message}).encode("utf-8"), method="POST",
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "BraveHC-Goalie-Approval-Feedback",
        },
    )
    with urlopen(request, timeout=20) as response:
        if response.status != 201:
            raise RuntimeError("GitHub did not confirm creation of the review comment")


def main() -> int:
    event=json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    issue=event.get("issue") or {}
    if issue.get("title") != "GOALIE_CONFIRMATION_REQUEST":
        raise ValueError("Unexpected issue event")
    repo=os.environ["GITHUB_REPOSITORY"]
    token=os.environ["GITHUB_TOKEN"]
    issue_number=issue["number"]
    code=safe_status(Path("build/goalie-request-status.json"))
    note=build_comment(
        code, os.environ.get("AUTH_OUTCOME","unknown"),
        os.environ.get("COMMIT_OUTCOME","unknown"),
        os.environ.get("CLOSE_OUTCOME","unknown"),
        repo,os.environ["GITHUB_RUN_ID"])
    post_comment(repo,issue_number,token,note)
    print(f"Review comment added to issue #{issue_number}; reason category {code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
