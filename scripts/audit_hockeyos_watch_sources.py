"""Read-only preflight for HockeyOS Record Watch source state.

This audits supplied JSON snapshots; it never fetches, mutates, or publishes.
HTO-only verification does NOT authorize full Watch publication or official HTO edits.
"""
from __future__ import annotations
import argparse
from datetime import datetime
import json
from pathlib import Path

SCHEMA = "brave-hc-hto-verified-game-feed/v1"
EXPECTED_COMPLETED_IDS = (3356177, 3356178, 3369564, 3375601)


def audit(feed: dict, workbook_rows: list[dict], readback: dict) -> dict:
    """Fail closed on incomplete HTO; report SVHL/workbook independently."""
    if feed.get("schema") != SCHEMA:
        raise ValueError("INVALID_HTO_FEED_SCHEMA")
    if feed.get("playerAggregateParity") is not True or feed.get("allGamesDiscovered") is not True:
        raise ValueError("HTO_COMPLETE_COVERAGE_NOT_VERIFIED")
    games = feed.get("games")
    if not isinstance(games, list) or len(games) != feed.get("teamGP"):
        raise ValueError("HTO_GAME_COUNT_MISMATCH")
    ids = [g.get("htoGameId") for g in games if isinstance(g, dict)]
    if len(ids) != len(games) or len(set(ids)) != len(ids):
        raise ValueError("MISSING_OR_DUPLICATE_HTO_GAME_ID")
    if set(ids) != set(EXPECTED_COMPLETED_IDS):
        raise ValueError("UNADMITTED_COMPLETED_GAME_ID")
    if not feed.get("sourceReadback"):
        raise ValueError("HTO_SOURCE_OBSERVATION_TIME_MISSING")
    try:
        datetime.fromisoformat(feed["sourceReadback"].replace("Z", "+00:00"))
    except (ValueError, TypeError) as exc:
        raise ValueError("HTO_SOURCE_OBSERVATION_TIME_INVALID") from exc
    if not isinstance(workbook_rows, list):
        raise ValueError("WORKBOOK_ROWS_REQUIRED")
    current = {}
    for row in workbook_rows:
        if not isinstance(row, dict):
            raise ValueError("WORKBOOK_ROW_MALFORMED")
        if row.get("season") != "W2026/27" or row.get("scope") != "Regular Season":
            continue
        date = row.get("date")
        if not isinstance(date, str) or date in current:
            raise ValueError("INVALID_OR_DUPLICATE_WORKBOOK_DATE")
        current[date] = row
    comparisons = []
    for game in sorted(games, key=lambda g: (g.get("date", ""), g["htoGameId"])):
        date = game.get("date")
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except (TypeError, ValueError) as exc:
            raise ValueError("OFFICIAL_GAME_DATE_MISSING") from exc
        gf, ga = game.get("teamGoals"), game.get("teamGoalsAgainst")
        if not all(type(v) is int and v >= 0 for v in (gf, ga)):
            raise ValueError("OFFICIAL_FINAL_SCORE_INVALID")
        saved = current.get(date)
        if saved is None or saved.get("gameNumber") != game.get("workbookGameNumber"):
            raise ValueError("HTO_WORKBOOK_GAME_JOIN_UNVERIFIED")
        published_scores_match = saved.get("gf") == gf and saved.get("ga") == ga
        comparisons.append({
            "date": date,
            "htoGameId": game["htoGameId"],
            "workbookGameNumber": saved["gameNumber"],
            "officialFinal": [gf, ga],
            "cachedWorkbookFinal": [saved.get("gf"), saved.get("ga")],
            "workbookScoreParity": published_scores_match,
        })
    if not isinstance(readback, dict) or not isinstance(readback.get("pages"), list):
        raise ValueError("EXTERNAL_READBACK_STRUCTURE_INVALID")
    pages = [p for p in readback["pages"] if isinstance(p, dict) and p.get("name") == "svhl_brave"]
    if len(pages) != 1:
        svhl = "UNAVAILABLE_OR_AMBIGUOUS"
    elif pages[0].get("error") or not isinstance(pages[0].get("tables"), list):
        svhl = "READBACK_FAILED"
    else:
        svhl = "TABLES_PRESENT_NOT_INDEPENDENTLY_RECONCILED"
    parity = all(row["workbookScoreParity"] for row in comparisons)
    return {
        "status": "HTO_ONLY_PARTIAL_NOT_FOR_PUBLICATION",
        "sourceReadback": feed["sourceReadback"],
        "officialGameCount": len(comparisons),
        "officialScoresCovered": True,
        "workbookScoreParity": parity,
        "svhlSourceState": svhl,
        "comparisons": comparisons,
        "fullWatchPublicationAuthorized": False,
        "message": "No original workbook, native HTO or public Watch publication is authorized by this read-only check.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hto-feed", type=Path, required=True)
    parser.add_argument("--workbook-rows", type=Path, required=True,
                        help="Review-only rows containing date, season, scope, gameNumber, gf, ga")
    parser.add_argument("--svhl-readback", type=Path, required=True)
    args = parser.parse_args()
    feed = json.loads(args.hto_feed.read_text(encoding="utf-8"))
    rows = json.loads(args.workbook_rows.read_text(encoding="utf-8"))
    readback = json.loads(args.svhl_readback.read_text(encoding="utf-8"))
    print(json.dumps(audit(feed, rows, readback), indent=2))


if __name__ == "__main__":
    main()
