"""Isolated four-game feed candidate. GET-only, JSON stdout; no production writer.

Not automatic discovery and not proven compatible with production consumers.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import hockeyos_review_four_game_source_parity as review

GAME_MAP = {
    3356177: (359, "2026-09-20"), 3356178: (360, "2026-09-27"),
    3369564: (361, "2026-10-04"), 3375601: (362, "2026-10-18"),
}
SCORE_URL = "https://www.htosports.com/teams/default.asp?p=scores&s=hockey&u=BRAVESHOCKEY"
STATS_URL = "https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"


def collect_sources(fetch=review.fetch_html):
    games = []
    for gid in GAME_MAP:
        url = f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        source = fetch(url)
        provenance = review.verify_content(source, url, game_id=gid)
        tables = review.parse_tables(source)
        board = review.unique_table(tables, lambda h: h and h[0] == "REGULAR SEASON")
        team = [r for r in board[1:] if r and r[0] == "Brave H.C."]
        other = [r for r in board[1:] if r and r[0] != "Brave H.C." and r[-1].isdigit()]
        if len(team) != 1 or len(other) != 1:
            raise review.ReviewHold("AMBIGUOUS_SCOREBOARD")
        gf, ga = int(team[0][-1]), int(other[0][-1])
        sk = review.unique_table(tables, lambda h: h[:3] == ["No", "Name", "POS"])
        go = review.unique_table(tables, lambda h: h[:2] == ["No", "Name"] and "GP" in h)
        games.append({"htoGameId": gid, "sourceUrl": url,
                      "teamGoals": gf, "teamGoalsAgainst": ga,
                      "skaters": review.helper.skater_rows(sk, verified_team_goals=gf),
                      "goalies": review.helper.goalie_rows(go),
                      "contentProvenance": provenance})
    source = fetch(STATS_URL)
    season_provenance = review.verify_content(source, STATS_URL)
    tables = review.parse_tables(source)
    sk = review.unique_table(tables, lambda h: h[:3] == ["No", "Name", "POS"] and "GP" in h)
    go = review.unique_table(tables, lambda h: h[:2] == ["No", "Name"] and "GP" in h and "GA" in h)
    return games, sk, go, season_provenance


def build_candidate(games, skater_season, goalie_season, season_provenance):
    """Pure adapter for validated observations; no inference and no writes."""
    ids = [g["htoGameId"] for g in games]
    if len(ids) != len(set(ids)) or set(ids) != set(GAME_MAP):
        raise review.ReviewHold("AUDITED_GAME_MAP_COVERAGE")
    allsk, allgoal, output = [], [], []
    for game in sorted(games, key=lambda g: GAME_MAP[g["htoGameId"]][0]):
        gid = game["htoGameId"]
        number, date = GAME_MAP[gid]
        expected_url = f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"
        provenance = game.get("contentProvenance", {})
        if (provenance.get("gameDate") != review.GAME_DATES[gid] or
            review.response_identity(provenance.get("canonicalURL", "")) != review.response_identity(expected_url) or
            review.response_identity(game["sourceUrl"]) != review.response_identity(expected_url)):
            raise review.ReviewHold("GAME_PROVENANCE_MISMATCH")
        review.helper.check_game_observations(
            hto_game_id=gid, official_goals_for=game["teamGoals"],
            official_goals_against=game["teamGoalsAgainst"],
            skaters=game["skaters"], goalies=game["goalies"])
        allsk.extend(game["skaters"]); allgoal.extend(game["goalies"])
        skaters = [{"name": p["name"], "no": p["jerseyNo"], "position": p["listedPosition"],
                    "gp": p["gameAppearance"], **{k: p[k] for k in
                    ("g", "a", "pts", "potg", "plusminus", "pim")}} for p in game["skaters"]]
        goalies = [{"name": p["name"], "no": p["jerseyNo"],
                    **{k: p[k] for k in ("gp", "losses", "potg", "goalsAgainst")}}
                   for p in game["goalies"]]
        output.append({"htoGameId": gid, "workbookGameNumber": number, "date": date,
                       "teamGoals": game["teamGoals"], "teamGoalsAgainst": game["teamGoalsAgainst"],
                       "sourceUrl": expected_url, "skaters": skaters, "goalies": goalies})
    if (season_provenance.get("seasonTitle") != review.SEASON_TITLE or
        review.response_identity(season_provenance.get("canonicalURL", "")) != review.response_identity(STATS_URL)):
        raise review.ReviewHold("SEASON_PROVENANCE_MISMATCH")
    parity = {"skaters": review.compare_season(skater_season, allsk, review.SKATER_FIELDS),
              "goalies": review.compare_season(goalie_season, allgoal, review.GOALIE_FIELDS)}
    if any(p["discrepancies"] for p in parity.values()):
        raise review.ReviewHold("SEASON_PARITY_MISMATCH")
    totals, completeness = {}, {}
    for name in sorted({p["name"] for p in allgoal}):
        rows = [p for p in allgoal if p["name"] == name]
        known = [p["potg"] for p in rows if p["potg"] is not None]
        unknown = len(rows) - len(known)
        totals[name] = {k: sum(p[k] for p in rows) for k in ("gp", "losses", "goalsAgainst")}
        totals[name]["potg"] = None if unknown else sum(known)
        completeness[name] = {"potg": {"knownSubtotal": sum(known), "unknownCount": unknown,
                                       "complete": unknown == 0}}
    return {"schema": "brave-hc-hto-game-feed-candidate/v1",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "source": "Bounded four-game live HTO review; not automatic discovery",
            "sourceUrl": STATS_URL, "sourceUrls": [STATS_URL] + [g["sourceUrl"] for g in output],
            "discoveryReferenceUrl": SCORE_URL, "season": "W2026/27",
            "teamGP": len(output), "teamG": sum(g["teamGoals"] for g in output),
            "teamA": sum(p["a"] for p in allsk),
            "playerAggregateParity": True, "parityScope": "COMPLETE_FIELDS_ONLY",
            "allGamesDiscovered": False, "auditedGameMapComplete": True,
            "goalieGameTotals": totals, "goalieAggregateCompleteness": completeness,
            "missingStatFields": {"seasonParity": parity,
                "skaterPIMUnknownRows": sum(p["pim"] is None for p in allsk)},
            "inferredPerGamePOTG": [], "games": output,
            "productionAcceptance": False, "consumerCompatibilityVerified": False,
            "releaseState": "ISOLATED_CANDIDATE_NOT_PRODUCTION_ACCEPTANCE",
            "workbookWritten": False, "publisherUpdated": False}


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv != ["--live-read-only"]:
        raise review.ReviewHold("EXPLICIT_LIVE_READ_ONLY_REQUIRED")
    print(json.dumps(build_candidate(*collect_sources())), flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (review.ReviewHold, review.helper.BoxscoreSchemaHold, KeyError, ValueError) as error:
        print(json.dumps({"state": "HOLD", "reason": str(error),
                          "productionAcceptance": False}), file=sys.stderr)
        raise SystemExit(2)
