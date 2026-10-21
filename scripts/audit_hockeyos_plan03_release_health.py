"""Read-only semantic release-health gate for Brave H.C. HockeyOS Plan 03.

A green eight-stage Windows scheduled task is *not* proof of current workbook
scoring, public publishing, or new record admission. All paths are caller
supplied. No network access, source mutation, scheduling or publication.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

STAGES = (
    "read_hto", "reconcile_game_boxes", "standings", "countdown",
    "hot_stove_drafts", "projections", "hot_stove_roster_context", "record_watch"
)
FOUR_GAMES = {
    3356177: ("2026-09-20", 0, 3, 359),
    3356178: ("2026-09-27", 3, 6, 360),
    3369564: ("2026-10-04", 2, 3, 361),
    3375601: ("2026-10-18", 1, 7, 362),
}
HTO_RECORDS = "https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records"


class EvidenceHold(ValueError):
    pass


def instant(s: str, field: str):
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None or dt.utcoffset() is None:
            raise ValueError("naive date")
        return dt
    except (AttributeError, TypeError, ValueError) as exc:
        raise EvidenceHold(field + "_INVALID_TIMESTAMP") from exc


def classify(report: dict, feed: dict, watch: dict, records: dict, *,
             now: datetime | None = None, max_age_hours: float = 2):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None or now.utcoffset() is None or not 0 < max_age_hours <= 24:
        raise EvidenceHold("HEALTH_CHECK_TIME_ARGUMENT_INVALID")

    start = instant(report.get("started"), "TASK_START")
    finish = instant(report.get("finished"), "TASK_FINISH")
    observed = instant(feed.get("sourceReadback"), "HTO_SOURCE")
    if not start <= observed <= finish or finish < start:
        raise EvidenceHold("TASK_HTO_OBSERVATION_SEQUENCE_INVALID")
    if (now - finish).total_seconds() > max_age_hours * 3600 or (now - finish).total_seconds() < -300:
        raise EvidenceHold("SCHEDULED_TASK_RECEIPT_STALE_OR_FUTURE")

    stage_data = report.get("stages")
    if not isinstance(stage_data, dict) or set(stage_data) != set(STAGES):
        raise EvidenceHold("UNEXPECTED_TASK_STAGE_SET")
    per_stage = {key: value.get("outcome") for key, value in stage_data.items()
                 if isinstance(value, dict)}
    if len(per_stage) != len(STAGES):
        raise EvidenceHold("MALFORMED_TASK_STAGE")
    process_pass = all(per_stage[s] == "PASS" and stage_data[s].get("returnCode") == 0 for s in STAGES)
    if report.get("allStagesSuccessful") is not process_pass:
        raise EvidenceHold("SCHEDULED_TASK_SUMMARY_CONFLICT")

    if (feed.get("schema") != "brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True):
        raise EvidenceHold("HTO_FEED_NOT_VERIFIED")
    games = feed.get("games")
    if not isinstance(games, list) or len(games) != feed.get("teamGP") or len(games) != 4:
        raise EvidenceHold("UNADMITTED_FIFTH_GAME_OR_INVALID_COVERAGE")
    ids = [g.get("htoGameId") for g in games if isinstance(g, dict)]
    if len(ids) != 4 or set(ids) != set(FOUR_GAMES):
        raise EvidenceHold("UNEXPECTED_HTO_GAME_SET")
    for g in games:
        expected = FOUR_GAMES[g["htoGameId"]]
        if (g.get("date"), g.get("teamGoals"), g.get("teamGoalsAgainst"),
            g.get("workbookGameNumber")) != expected:
            raise EvidenceHold("HTO_GAME_SOURCE_MAPPING_OR_SCORE_DRIFT")

    if (watch.get("schema") != "brave-hc-workbook-watch/v2"
        or watch.get("dataStatus") != "HISTORICAL_WORKBOOK_SNAPSHOT"
        or watch.get("sourceValidated") is not False
        or watch.get("workbookScoreParity") is not False
        or watch.get("recordWatchComplete") is not False
        or watch.get("recordsDataStatus") != "VERIFIED_SUPPORTED_CATEGORIES_PARTIAL"
        or watch.get("verifiedRecordScope", {}).get("status") != "VERIFIED_SUPPORTED_CATEGORIES_ONLY"
        or watch.get("latestOfficialCompletedGameDate") != "2026-10-18"
        or watch.get("completedGames") != 4):
        raise EvidenceHold("WATCH_HISTORICAL_RELEASE_CONTRACT_CHANGED")
    watch_exported = instant(watch.get("exportedAt"), "WATCH_EXPORTED")
    if watch_exported > finish:
        raise EvidenceHold("WATCH_EXPORT_NEWER_THAN_TASK")
    if (records.get("schema") != "brave-hc-hto-history-snapshot/v1"
        or records.get("type") != "records"
        or records.get("source", {}).get("authority") != "OFFICIAL_HTO_PUBLIC_READBACK"
        or records.get("source", {}).get("url") != HTO_RECORDS
        or records.get("entryCount") != 558):
        raise EvidenceHold("HISTORICAL_RECORD_AUTHORITY_OR_BASELINE_CHANGED")
    groups = records.get("groups")
    if (not isinstance(groups, list)
        or len(groups) != 119
        or sum(len(g.get("items", [])) for g in groups if isinstance(g, dict)) != 558):
        raise EvidenceHold("HISTORICAL_RECORD_COUNT_DISAGREEMENT")
    by_category = {(g.get("category"), g.get("period")): g.get("items", [])
                   for g in groups if isinstance(g, dict)}
    # These two are pre-existing published milestones, not novel record holders.
    expected_lines = {
        ("Carosi, Justin", "gp", "2026-09-20"):
            ("300 Game Club", "3 - Justin Carosi (September 20, 2026)"),
        ("Provenzano, Michael", "pts", "2026-09-27"):
            ("50 Point Club", "20 - Michael Provenzano (September 27, 2026)"),
    }
    items = watch.get("records")
    if not isinstance(items, list) or len(items) != 2:
        raise EvidenceHold("HISTORICAL_MILESTONE_SET_CHANGED")
    found = set()
    for event in items:
        if not isinstance(event, dict) or event.get("type") != "reached":
            raise EvidenceHold("UNSUPPORTED_WATCH_EVENT")
        key = (event.get("player"), event.get("category"), event.get("eventDate"))
        if key not in expected_lines or key in found:
            raise EvidenceHold("UNVERIFIED_OR_DUPLICATE_MILESTONE")
        category, line = expected_lines[key]
        if line not in by_category.get((category, "Career"), []):
            raise EvidenceHold("HTO_PUBLISHED_MILESTONE_NOT_FOUND")
        found.add(key)
    if len(found) != 2:
        raise EvidenceHold("MISSING_HISTORICAL_MILESTONE")

    projection_stdout = stage_data["projections"].get("stdoutTail", "")
    watch_stdout = stage_data["record_watch"].get("stdoutTail", "")
    return {
        "schema": "brave-hc-plan03-semantic-release-health/v1",
        "checkedAt": now.isoformat(),
        "taskFinishedAt": finish.isoformat(),
        "htoSourceReadback": feed["sourceReadback"],
        "processing": "PASS" if process_pass else "DEGRADED",
        "stages": per_stage,
        "officialCompletedGames": len(games),
        "officialScores": {"GF": 6, "GA": 19},
        "historicalRecordEntries": 558,
        "verifiedExistingMilestoneCount": 2,
        "recordWatchSourceState": "HISTORICAL_ONLY",
        "workbookRelease": "HOLD_STALE_WORKBOOK_FINALS",
        "projectionRelease": ("HOLD_MODEL_RECONCILIATION_PENDING"
                              if "HTO_MODEL_RECONCILIATION_PENDING" in projection_stdout
                              else "UNVERIFIED_MODEL_RELEASE_STATE"),
        "watchPublisher": ("UNCHANGED_SNAPSHOT" if "WATCH_UNCHANGED" in watch_stdout
                           else "NOT_CONFIRMED_BY_TASK_RECEIPT"),
        "websitePublication": "NOT_VERIFIED_BY_SCHEDULED_TASK",
        "nextGameAdmission": "NOT_ADMITTED_HTO_3375682",
        "fullLiveRecordWatchAuthorized": False,
        "newHistoricalRecordsPublished": False,
        "originalWorkbookModified": False,
        "status": "PROCESSING_PASS_RELEASE_HELD" if process_pass else "PROCESSING_DEGRADED_RELEASE_HELD"
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task-report", required=True, type=Path)
    parser.add_argument("--verified-feed", required=True, type=Path)
    parser.add_argument("--published-watch", required=True, type=Path)
    parser.add_argument("--records", required=True, type=Path)
    parser.add_argument("--max-age-hours", type=float, default=2)
    args = parser.parse_args()
    read = lambda path: json.loads(path.read_text(encoding="utf-8"))
    print(json.dumps(classify(read(args.task_report), read(args.verified_feed),
                              read(args.published_watch), read(args.records),
                              max_age_hours=args.max_age_hours), indent=2))


if __name__ == "__main__":
    main()
