"""Review-only 2026/27 HTO career-milestone reconciler for HockeyOS Plan 03.

Cross-check already calculated workbook-threshold events against the verified
HTO game feed AND already published HTO Records. Never updates the workbook,
native HTO, GitHub Pages, or public watch.json. No network calls.
"""
import argparse
from datetime import datetime, timezone
import json
import re
from urllib.parse import parse_qs, urlparse
from pathlib import Path

EXPECTED_GAME_IDS = (3356177, 3356178, 3369564, 3375601)
FAMILY = {"gp": ("Game", "gameAppearance"), "pts": ("Point", "pts"),
          "g": ("Goal", "g"), "a": ("Assist", "a"), "potg": ("POTG", "potg")}


def integer(value):
    return type(value) is int and value >= 0


def name_forward(name):
    if not isinstance(name, str) or name.count(",") != 1:
        raise ValueError("MILESTONE_PLAYER_NAME_UNSUPPORTED")
    last, first = [p.strip() for p in name.split(",")]
    if not last or not first or not re.fullmatch(r"[\w .'-]+", first+" "+last):
        raise ValueError("MILESTONE_PLAYER_NAME_UNSUPPORTED")
    return first + " " + last


def source_url(url, game_id):
    if not isinstance(url, str):
        raise ValueError("INVALID_HTO_BOXSCORE_URL")
    u = urlparse(url)
    q = parse_qs(u.query)
    if (u.scheme != "https" or u.hostname != "www.htosports.com"
        or u.path != "/teams/default.asp" or q.get("u") != ["BRAVESHOCKEY"]
        or q.get("p") != ["boxscore"] or q.get("gameID") != [str(game_id)]):
        raise ValueError("INVALID_HTO_BOXSCORE_URL")
    return url


def reconcile(feed, milestones, record_book, *, now=None, max_age_hours=2):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("NOW_MUST_BE_TIMEZONE_AWARE")
    if not 0 < max_age_hours <= 24:
        raise ValueError("INVALID_MAX_AGE_HOURS")
    if feed.get("schema") != "brave-hc-hto-verified-game-feed/v1" or (
        feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True):
        raise ValueError("HTO_FEED_NOT_VERIFIED")
    games = feed.get("games")
    if not isinstance(games, list) or len(games) != feed.get("teamGP") or len(games) != 4:
        raise ValueError("HTO_GAME_COVERAGE_INVALID")
    ids = [g.get("htoGameId") for g in games if isinstance(g, dict)]
    if len(ids) != len(games) or len(set(ids)) != len(ids) or set(ids) != set(EXPECTED_GAME_IDS):
        raise ValueError("HTO_UNADMITTED_OR_DUPLICATE_GAME")
    try:
        observed = datetime.fromisoformat(feed["sourceReadback"].replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("HTO_SOURCE_TIMESTAMP_INVALID") from exc
    if observed.tzinfo is None or observed.utcoffset() is None:
        raise ValueError("HTO_SOURCE_TIMESTAMP_INVALID")
    age = (now - observed).total_seconds()
    if age < -300 or age > max_age_hours * 3600:
        raise ValueError("HTO_FEED_STALE_OR_FUTURE")
    for g in games:
        if not isinstance(g.get("date"), str) or not re.fullmatch(r"20\d\d-\d\d-\d\d", g["date"]):
            raise ValueError("HTO_GAME_DATE_INVALID")
        datetime.strptime(g["date"], "%Y-%m-%d")
        source_url(g.get("sourceUrl"), g["htoGameId"])
        if not isinstance(g.get("skaters"), list):
            raise ValueError("HTO_GAME_SKATERS_MISSING")
    latest = max(g["date"] for g in games)
    if (milestones.get("status") != "VERIFIED_SUPPORTED_CATEGORIES_ONLY"
        or milestones.get("sourceAsOf") != latest
        or milestones.get("gameCount") != len(games)
        or not isinstance(milestones.get("eventHistory"), list)
        or not isinstance(milestones.get("playersWithoutBaseline"), list)):
        raise ValueError("MILESTONE_REPORT_NOT_VERIFIED")
    if (record_book.get("schema") != "brave-hc-hto-history-snapshot/v1"
        or record_book.get("type") != "records"
        or record_book.get("source", {}).get("authority") != "OFFICIAL_HTO_PUBLIC_READBACK"):
        raise ValueError("NATIVE_RECORD_SNAPSHOT_INVALID")
    groups = record_book.get("groups")
    if not isinstance(groups, list) or sum(len(g["items"]) for g in groups) != record_book.get("entryCount"):
        raise ValueError("NATIVE_RECORD_SNAPSHOT_INCOMPLETE")
    by_date = {}
    for game in games:
        by_date.setdefault(game["date"], []).append(game)
    result, seen = [], set()
    for event in milestones["eventHistory"]:
        if event.get("type") != "reached":
            raise ValueError("UNSUPPORTED_MILESTONE_EVENT")
        name = name_forward(event.get("player"))
        category = event.get("category")
        if category not in FAMILY or not integer(event.get("threshold")) or event["threshold"] == 0:
            raise ValueError("UNSUPPORTED_MILESTONE_CATEGORY")
        label, stat = FAMILY[category]
        total = event.get("careerTotalAtEvent")
        day = event.get("eventDate")
        if not integer(total) or total < event["threshold"] or not isinstance(day, str):
            raise ValueError("MILESTONE_THRESHOLD_UNSUPPORTED")
        try:
            formatted = datetime.strptime(day, "%Y-%m-%d").strftime("%B %-d, %Y")
        except ValueError:
            # Windows strftime does not support %-d.
            parsed = datetime.strptime(day, "%Y-%m-%d")
            formatted = f"{parsed.strftime('%B')} {parsed.day}, {parsed.year}"
        if day not in by_date or len(by_date[day]) != 1:
            raise ValueError("MILESTONE_OFFICIAL_GAME_AMBIGUOUS")
        game = by_date[day][0]
        player = [p for p in game["skaters"] if p.get("name") == event["player"]]
        if len(player) != 1 or not integer(player[0].get(stat)):
            raise ValueError("MILESTONE_PLAYER_GAME_NOT_VERIFIED")
        delta = player[0][stat]
        if not 0 < delta <= total or total - delta >= event["threshold"]:
            raise ValueError("MILESTONE_CROSSING_NOT_VERIFIED")
        group_name = f"{event['threshold']} {label} Club"
        archive = [item for g in groups
                   if g.get("section") == "Individual Records"
                   and g.get("category") == group_name and g.get("period") == "Career"
                   for item in g["items"] if re.fullmatch(
                       rf"\d+ - {re.escape(name)} \({re.escape(formatted)}\)", item)]
        if len(archive) != 1:
            raise ValueError("MILESTONE_NOT_FOUND_IN_PUBLISHED_HTO_RECORDS")
        key = (name, group_name, day)
        if key in seen:
            raise ValueError("DUPLICATE_MILESTONE_EVENT")
        seen.add(key)
        result.append({
            "player": name, "category": group_name, "eventDate": day,
            "threshold": event["threshold"], "recordedCareerTotal": total,
            "officialGameID": game["htoGameId"],
            "officialBoxscoreURL": game["sourceUrl"],
            "publishedRecordText": archive[0],
            "state": "MATCHES_EXISTING_PUBLISHED_HTO_RECORD",
        })
    result.sort(key=lambda x: (-int(x["eventDate"].replace("-", "")), x["player"], x["category"]))
    return {
        "schema": "brave-hc-hto-career-milestone-review/v1",
        "status": "REVIEW_ONLY_MATCHES_PUBLISHED_HISTORICAL_RECORDS",
        "officialGameCount": len(games),
        "latestCompletedGame": latest,
        "htoSourceReadback": feed["sourceReadback"],
        "eventCount": len(result),
        "verifiedEvents": result,
        "playersWithoutHistoricalBaseline": sorted(milestones["playersWithoutBaseline"]),
        "excluded": ["PIM partial per-game coverage", "goalie career milestones",
                     "single-game records", "unverified drought/streak categories"],
        "publicationAuthorized": False,
        "originalWorkbookModified": False,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--feed", type=Path, required=True)
    p.add_argument("--milestones", type=Path, required=True)
    p.add_argument("--records", type=Path, required=True)
    p.add_argument("--max-age-hours", type=float, default=2)
    args = p.parse_args()
    feed = json.loads(args.feed.read_text(encoding="utf-8"))
    events = json.loads(args.milestones.read_text(encoding="utf-8"))
    records = json.loads(args.records.read_text(encoding="utf-8"))
    print(json.dumps(reconcile(feed, events, records, max_age_hours=args.max_age_hours), indent=2))


if __name__ == "__main__":
    main()
