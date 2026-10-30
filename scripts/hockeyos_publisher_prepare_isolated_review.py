#!/usr/bin/env python3
"""Prepare an isolated, review-only HockeyOS publishing candidate.

This does not merge/cherry-pick/push any branch, edit the active publisher,
publish JSON, run the Windows task, touch HTO, or open the original workbook.
A complete, pre-verified recovery bundle is required before cloning.

Use --old-repo, --bundle, --candidate, --expected-local,
--expected-remote, --report. Candidate directory must NOT exist.

Any mismatch fails closed. The report is local/private only.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

EXPECTED_REMOTE = "https://github.com/adambrutto-maker/brave-hc.git"
GENERATED = ("countdown", "projection", "standings")
SHA = re.compile(r"^[0-9a-f]{40}$", re.I)


class Hold(RuntimeError):
    pass


def git(where: Path, *args: str, timeout: int = 45) -> str:
    cmd = ["git", "-C", str(where), *args]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise Hold("git " + args[0] + " failed: " + result.stderr[-200:])
    return result.stdout.strip()


def sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_json(repo: Path, name: str) -> dict:
    path = repo / "widgets" / (name + ".json")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise Hold(name + ": JSON root not object")
    return value


def signature_countdown(value: dict) -> str:
    if value.get("schema") != "brave-hc-upcoming-countdown/v1":
        raise Hold("Unexpected countdown schema")
    copied = dict(value)
    copied.pop("generatedAt", None)
    return json.dumps(copied, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def inspect_data(candidate: Path, old: Path) -> dict:
    result = {}
    for name in GENERATED:
        current = source_json(candidate, name)
        local = source_json(old, name)
        path = old / "widgets" / (name + ".json")
        result[name] = {
            "sourceSha256": sha_file(path),
            "sameBytes": (candidate / "widgets" / (name + ".json")).read_bytes() == path.read_bytes(),
            "releasePermission": False,
        }
        if name == "countdown":
            result[name]["sameScheduleAndSource"] = signature_countdown(current) == signature_countdown(local)
            result[name]["decision"] = (
                "NO_MATERIAL_UPDATE" if result[name]["sameScheduleAndSource"]
                else "REVIEW_MATERIAL_SCHEDULE_DELTA"
            )
        elif name == "projection":
            expected_status = "HTO_MODEL_RECONCILIATION_PENDING"
            result[name].update({
                "modelCurrent": local.get("modelCurrent"),
                "sourceModelStatus": local.get("publicationStatus"),
                "sourceHtoGP": local.get("sourceInputs", {}).get("htoRecordedTeamGP"),
                "sourceBoxscoreGP": local.get("sourceInputs", {}).get("verifiedHTOBoxscoreGP"),
                "decision": "HOLD_MODEL_RECONCILIATION"
                if local.get("publicationStatus") == expected_status or local.get("modelCurrent") is not True
                else "REQUIRES_FRESH_SOURCE_INDEPENDENT_REVIEW",
            })
        elif name == "standings":
            result[name].update({
                "sourceType": local.get("sourceType"),
                "capturedAt": local.get("capturedAt"),
                "localBravesGP": local.get("braveGP"),
                "hostedBravesGP": current.get("braveGP"),
                "decision": "HOLD_SOURCE_FRESHNESS_AND_LEAGUE_PARITY",
            })
    return result


def prepare(args) -> dict:
    old, bundle = Path(args.old_repo).resolve(), Path(args.bundle).resolve()
    candidate = Path(args.candidate).resolve()
    report = Path(args.report).resolve()
    if not SHA.fullmatch(args.expected_local) or not SHA.fullmatch(args.expected_remote):
        raise Hold("Expected commit SHA is not a 40-character Git SHA1")
    if not (old / ".git").exists():
        raise Hold("Old publisher is not a local Git checkout")
    if candidate.exists():
        raise Hold("Candidate directory already exists; refuse overwrite")
    if report.exists():
        raise Hold("Report already exists; refuse overwrite")
    if candidate == old or old in candidate.parents or candidate in old.parents:
        raise Hold("Candidate must be isolated from old publisher")
    if report == old or old in report.parents:
        raise Hold("Report must not write into active publisher")
    if report == candidate or candidate in report.parents:
        raise Hold("Report must not write into candidate checkout")
    if not bundle.is_file():
        raise Hold("Verified recovery bundle absent")
    if candidate == report.parent:
        raise Hold("Candidate must not be report directory")
    if not candidate.parent.is_dir() or not report.parent.is_dir():
        raise Hold("Destination parent missing")
    # Caller controls paths. We do not create/delete parent dirs or user files.
    local = git(old, "rev-parse", "HEAD")
    if local != args.expected_local:
        raise Hold("Active publisher head changed; re-review required")
    if git(old, "status", "--porcelain"):
        raise Hold("Active publisher is dirty; not safe to proceed")
    known_bundle_ref = git(old, "bundle", "list-heads", str(bundle))
    if args.expected_local.lower() not in known_bundle_ref.lower():
        raise Hold("Bundle does not preserve expected unpublished local tip")
    git(old, "bundle", "verify", str(bundle))
    origin = git(old, "remote", "get-url", "origin")
    if origin.lower() != EXPECTED_REMOTE.lower():
        raise Hold("Publisher origin URL differs from reviewed public repository")
    remote = git(old, "ls-remote", "origin", "refs/heads/main").split()[0]
    if remote != args.expected_remote:
        raise Hold("Remote main moved; prepare a new review")
    cloned = subprocess.run([
        "git", "-c", "credential.interactive=never", "clone",
        "--depth", "1", "--single-branch", "--branch", "main",
        EXPECTED_REMOTE, str(candidate),
    ], capture_output=True, text=True, timeout=180)
    if cloned.returncode:
        raise Hold("Isolated clean-main clone failed: " + cloned.stderr[-220:])
    check_remote = git(candidate, "rev-parse", "HEAD")
    if check_remote != args.expected_remote:
        raise Hold("Main moved during clone; candidate remains unapproved")
    if git(candidate, "status", "--porcelain"):
        raise Hold("Isolated candidate has unexpected modifications")
    result = {
        "schema": "brave-hc-publisher-isolated-preparation/v1",
        "preparedAt": datetime.now(timezone.utc).isoformat(),
        "status": "REVIEW_ONLY_CLEAN_MAIN_CANDIDATE_PREPARED",
        "activePublisherCommit": local,
        "candidateMainCommit": check_remote,
        "bundleSha256": sha_file(bundle),
        "bundlePreservesLocalHead": True,
        "candidateGitClean": True,
        "candidateDirectory": str(candidate),
        "dataReadiness": inspect_data(candidate, old),
        "sourceOrigin": EXPECTED_REMOTE,
        "widgetQARun": False,
        "productionPublishingAuthorized": False,
        "workbookWriteAuthorized": False,
        "existingWindowsTaskModified": False,
        "activePublisherModified": False,
        "notice": "An isolated fresh-main clone is not a deployment or approved repair. "
                  "No JSON was copied from the old publisher into the candidate. "
                  "Run website QA and independent review before any further action.",
    }
    report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> int:
    p = argparse.ArgumentParser()
    for name in ("old-repo", "bundle", "candidate", "expected-local", "expected-remote", "report"):
        p.add_argument("--" + name, required=True)
    args = p.parse_args()
    try:
        result = prepare(args)
        print(json.dumps({
            "status": result["status"],
            "candidateMainCommit": result["candidateMainCommit"],
            "activePublisherModified": result["activePublisherModified"],
            "dataDecisions": {k: v["decision"] for k, v in result["dataReadiness"].items()},
            "productionPublishingAuthorized": False,
        }))
        return 0
    except (Hold, OSError, ValueError, subprocess.TimeoutExpired) as exc:
        print("REVIEW_HOLD: " + str(exc)[:350], file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
