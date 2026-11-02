#!/usr/bin/env python3
"""Read-only HTO/Hot Stove scoring parity audit. Never changes a source or feed.

Requires Python 3, requests and beautifulsoup4 on the authorized HockeyOS QA host.
Each game is compared to its *own* live HTO boxscore; no fabricated events,
retrospective "fixes", or extrapolation from incomplete league snapshots.
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
import re
import sys
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

PUBLIC_FEED = "https://adambrutto-maker.github.io/brave-hc/widgets/hot-stove-approved.json"
HTO_ENDPOINT = "https://www.htosports.com/teams/default.asp"
USER_AGENT = "Brave-HC-editorial-source-parity/1.0 (read-only)"


def normalize(value):
    return re.sub(r"\s+", " ", str(value).replace("\xa0", " ")).strip()


def official_scoring_rows(session, game_id):
    params = {
        "u": "BRAVESHOCKEY", "s": "hockey",
        "sportsHQ": "BRAVESHOCKEY", "gameID": str(game_id),
        "p": "boxscore",
    }
    response = session.get(HTO_ENDPOINT, params=params, timeout=25)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for table in soup.find_all("table"):
        trs = table.find_all("tr")
        if not trs:
            continue
        header = normalize(trs[0].get_text(" ", strip=True)).lower()
        if "period" not in header or "scorer" not in header or "strength" not in header:
            continue
        rows = []
        for tr in trs[1:]:
            cells = [normalize(c.get_text(" ", strip=True))
                     for c in tr.find_all(["th", "td"], recursive=False)]
            if len(cells) < 6 or not cells[0].isdigit():
                continue
            rows.append({
                "period": int(cells[0]), "clock": cells[1],
                "strength": cells[2], "team": cells[3],
                "officialText": cells[4], "result": cells[5],
            })
        if rows:
            return rows, response.url
    raise ValueError("HTO scoring table not found; do not infer that it was scoreless")


def goal_parity(session, article):
    game_id = article["gameId"]
    official, url = official_scoring_rows(session, game_id)
    opposition = article["boxScore"]["opponent"]
    our = [r for r in official if r["team"] == "Brave H.C."]
    theirs = [r for r in official if r["team"] != "Brave H.C."]
    events = article.get("goalEvents", [])
    issues = []
    if len(our) != article["boxScore"]["ourGoals"]:
        issues.append("Our HTO goal count disagrees with article box score")
    if len(theirs) != article["boxScore"]["theirGoals"]:
        issues.append("Opponent HTO goal count disagrees with article box score")
    wrong_opponents = [r["team"] for r in theirs if r["team"] != opposition]
    if wrong_opponents:
        issues.append("Official opponent name differs: " + ",".join(sorted(set(wrong_opponents))))
    if len(events) != len(our):
        issues.append("Structured goal event count disagrees with official HTO")
    for i, (event, src) in enumerate(zip(events, our), 1):
        for key in ("period", "clock", "strength", "officialText"):
            if normalize(event.get(key, "")) != normalize(src[key]):
                issues.append("Goal %d mismatched %s: feed=%r HTO=%r" %
                              (i, key, event.get(key), src[key]))
        if event.get("teamGoalOrdinal") != i:
            issues.append("Goal %d has wrong teamGoalOrdinal" % i)
        if event.get("gameId") != game_id:
            issues.append("Goal %d has wrong game ID" % i)
        if event.get("gameDate") != article.get("date"):
            issues.append("Goal %d has wrong game date" % i)
    for team, count_field in (("Brave H.C.", "ourPeriods"), (opposition, "theirPeriods")):
        recorded = article["boxScore"].get(count_field, [])
        last_official_period = max((r["period"] for r in official), default=3)
        for period in range(1, max(3, len(recorded), last_official_period) + 1):
            actual = sum(r["team"] == team and r["period"] == period for r in official)
            if len(recorded) < period or recorded[period - 1] != actual:
                issues.append("%s period %d totals disagree with HTO" % (team, period))
    return {
        "gameId": game_id,
        "date": article.get("date"),
        "opponent": opposition,
        "sourceUrl": url,
        "officialGoalsFor": len(our),
        "officialGoalsAgainst": len(theirs),
        "feedGoalEvents": len(events),
        "scoreAndEventParity": not issues,
        "issues": issues,
        "officialEvenStrengthGoals": sum(r["strength"] == "ES" and r["team"] == "Brave H.C." for r in official),
        "sourceRows": our,
    }


def audit(feed_url):
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    response = session.get(feed_url, timeout=25)
    response.raise_for_status()
    data = response.json()
    articles = [item["article"] for item in data["archive"]] + [data["latestArticle"]]
    articles.sort(key=lambda item: item["date"])
    results = [goal_parity(session, item) for item in articles]
    total_gf = sum(row["officialGoalsFor"] for row in results)
    total_ga = sum(row["officialGoalsAgainst"] for row in results)
    run_issues = []
    if len({a["gameId"] for a in articles}) != len(articles):
        run_issues.append("Duplicate game identities")
    if total_gf != data["season"]["goalsFor"] or total_ga != data["season"]["goalsAgainst"]:
        run_issues.append("Season GF/GA differs from source game sum")
    if not all(a.get("verification", {}).get("status") == "SOURCE_VERIFIED" for a in articles):
        run_issues.append("Article missing SOURCE_VERIFIED attribution")
    # Strength labels alone do NOT establish goalie presence. In particular:
    # ES = even-strength, not "not empty net".
    rosenberg = next((r for r in results if r["gameId"] == 3375682), None)
    source_rosenberg = None
    if rosenberg:
        source_rosenberg = next((r for r in rosenberg["sourceRows"]
                                if "Jamie Rosenberg" in r["officialText"]), None)
    evidence = {
        "gameId": 3375682,
        "scoringClock": "0:10",
        "officialStrength": source_rosenberg["strength"] if source_rosenberg else None,
        "emptyNetFromHTO": "NOT_REPORTED",
        "assessment": "Even-strength and empty-net are not mutually exclusive; HTO scoring row does not verify goalie status.",
    }
    for result in results:
        result.pop("sourceRows", None)
    passed = not run_issues and all(r["scoreAndEventParity"] for r in results)
    return {
        "checkedAtUTC": datetime.now(timezone.utc).isoformat(),
        "feedUrl": feed_url,
        "readOnly": True,
        "gamesChecked": len(results),
        "teamOfficialGoals": {"for": total_gf, "against": total_ga},
        "status": "PASS" if passed else "HOLD",
        "runIssues": run_issues,
        "games": results,
        "rosenbergOct25": evidence,
        "limitations": [
            "HTO scoring summaries do not independently establish whether a goalie was pulled.",
            "This checks source goal events and period sums, not every narrative or roster claim.",
            "League table may lag the team's HTO completed games; do not conflate source cutoffs.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--feed", default=PUBLIC_FEED, help="Read-only JSON feed URL")
    parser.add_argument("--json", action="store_true", help="Print full machine-readable results")
    args = parser.parse_args()
    try:
        report = audit(args.feed)
        if args.json:
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print("HOT STOVE HTO PARITY:", report["status"])
            print("Games:", report["gamesChecked"],
                  "Finalized HTO goals:", report["teamOfficialGoals"])
            for item in report["games"]:
                print(" ", item["date"], item["opponent"],
                      "%s-%s" % (item["officialGoalsFor"], item["officialGoalsAgainst"]),
                      "PASS" if item["scoreAndEventParity"] else "HOLD",
                      "; ".join(item["issues"]))
            print("Rosenberg 0:10:", report["rosenbergOct25"])
            if report["runIssues"]:
                print("SEASON ISSUES:", report["runIssues"])
        sys.exit(0 if report["status"] == "PASS" else 1)
    except (requests.RequestException, ValueError, KeyError) as exc:
        print("HOLD: Source could not be verified:", str(exc), file=sys.stderr)
        sys.exit(2)
