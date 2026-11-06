#!/usr/bin/env python3
"""Build an evidence-only review queue for SVHL GameInfo scoring holds.

No network, workbook or source modifications; the supplied official source files
remain authoritative. A roster-qualified candidate-count gap does not prove a missing raw goal row or an invented
goal or player appearance.
"""
import argparse
import csv
import collections
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

SOURCE_SCHEMA = "brave-hc-svhl-game-reconciliation-index/v1"
HEX = re.compile(r"^[0-9a-f]{64}$")
REASON = "GAME_GOAL_EVENTS_DO_NOT_FULLY_RECONCILE_FINAL_SCORE"


def check(condition, description):
    if not condition:
        raise ValueError("SVHL_HELD_GAME_TRIAGE_HOLD:" + description)


def build(index, seasons):
    check(index.get("schema") == SOURCE_SCHEMA
          and index.get("status") == "SEASON_SCOPED_PARTIAL_PLAYER_GAME_EVENT_EVIDENCE"
          and index.get("registeredGPVerified") is False
          and index.get("seasonStatsOverwritten") is False,
          "INDEX_SOURCE_OR_PERMISSION_INVALID")
    expected_seasons = {int(x) for x in index["seasons"]}
    check(set(seasons) == expected_seasons
          and len(seasons) == index["sourceSeasonCount"],
          "SEASON_SET_MISMATCH")
    findings, by_season = [], []
    for lid in sorted(seasons, reverse=True):
        doc = seasons[lid]
        summary = index["seasons"][str(lid)]
        check(doc.get("leagueId") == lid
              and doc.get("leagueAssignmentsOrPlayerTotalsWritten") is False
              and isinstance(doc.get("games"), list)
              and isinstance(doc.get("heldGameEvidence"), list),
              "SEASON_SOURCE_UNQUALIFIED_" + str(lid))
        game_map = {}
        teams = {}
        for team in doc["teams"]:
            check(team["sourceTeamId"] not in teams, "DUPLICATE_TEAM_ID")
            teams[team["sourceTeamId"]] = team["name"]
        for game in doc["games"]:
            key = game.get("gameId")
            check(isinstance(key, int) and key not in game_map,
                  "MISSING_OR_DUPLICATE_GAME_ID_" + str(lid))
            game_map[key] = game
        partial = {g["gameId"]: g for g in doc["games"]
                   if g["status"] == "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL"}
        held_ids = set()
        reason_counts = collections.Counter()
        season_gap = 0
        season_over = 0
        direction_counts = collections.Counter()
        for held in doc["heldGameEvidence"]:
            gid = held.get("gameId")
            check(isinstance(gid, int) and gid in partial
                  and gid not in held_ids, "ORPHAN_OR_DUPLICATE_HOLD_" + str(lid))
            held_ids.add(gid)
            game = partial[gid]
            check(held.get("reason") == REASON
                  and held.get("leagueId") == lid
                  and held.get("expectedScore") == [game["homeGoals"], game["awayGoals"]]
                  and held.get("observedEventCount") == game.get("partialSheetGoalCount"),
                  "HELD_GAME_SCORE_SOURCE_DISAGREEMENT_" + str(lid))
            source = game.get("source", "")
            sha = game.get("sourcePageSHA256", "")
            parsed = urlsplit(source)
            query = parse_qs(parsed.query)
            check(parsed.scheme == "https"
                  and parsed.netloc == "leagues.sportsvillage.ca"
                  and parsed.path.lower() == "/gameinfo.aspx"
                  and query.get("leagueid") == [str(lid)]
                  and query.get("gameid") == [str(gid)]
                  and HEX.fullmatch(sha or "") is not None,
                  "UNQUALIFIED_SOURCE_GAME_PROVENANCE_" + str(lid))
            expected = game["homeGoals"] + game["awayGoals"]
            observed = game["partialSheetGoalCount"]
            check(all(isinstance(n, int) and n >= 0 for n in
                      (game["homeGoals"], game["awayGoals"], observed))
                  and observed != expected,
                  "INVALID_GOAL_EVIDENCE_DIFFERENCE_" + str(lid))
            deficit = max(expected - observed, 0)
            excess = max(observed - expected, 0)
            direction = "QUALIFIED_CANDIDATES_BELOW_FINAL_SCORE_GOALS" if deficit else "QUALIFIED_CANDIDATES_ABOVE_FINAL_SCORE_GOALS"
            season_gap += deficit
            season_over += excess
            direction_counts[direction] += 1
            reason_counts[held["reason"]] += 1
            check(game["homeTeamId"] in teams and game["awayTeamId"] in teams,
                  "MISSING_SOURCE_TEAM_ID_" + str(lid))
            findings.append({
                "leagueId": lid,
                "gameId": gid,
                "date": game["date"],
                "homeTeamId": game["homeTeamId"],
                "homeTeam": teams[game["homeTeamId"]],
                "awayTeamId": game["awayTeamId"],
                "awayTeam": teams[game["awayTeamId"]],
                "publishedFinalScoreHomeAway": [game["homeGoals"], game["awayGoals"]],
                "rosterQualifiedGoalEventCandidates": observed,
                "eventCountProvenance": "LEN_SOURCE_GAME_EVENTS_SCORER_AND_SEASON_ROSTER_QUALIFICATION_NOT_RAW_TABLE_ROW_COUNT",
                "rawOfficialScoringTableRowCountVerifiedByThisQueue": False,
                "totalGoalsInPublishedFinalScore": expected,
                "finalScoreCountMinusQualifiedCandidates": deficit,
                "qualifiedCandidatesMinusFinalScoreCount": excess,
                "absoluteQualifiedCandidateCountDifference": abs(expected - observed),
                "direction": direction,
                "priority": "CURRENT_SEASON_SOURCE_REVIEW" if lid == max(seasons)
                            else ("HIGH_DOCUMENTATION_GAP" if max(deficit, excess) >= 3
                                  else "STANDARD_SOURCE_REVIEW"),
                "classification": "PARTIAL_SCORING_SHEET_NOT_A_PLAYER_SCORE_CORRECTION",
                "reason": held["reason"],
                "officialGameInfoURL": source,
                "officialGameInfoPageSHA256": sha,
                "reviewStatus": "UNRESOLVED_HUMAN_SOURCE_REVIEW",
                "acceptAsVerified": False,
                "lineupAttendanceVerified": False,
                "suggestedReview": "Compare raw period scoring rows with candidate events; inspect linked scorer IDs, season roster inclusion, assist limits and final score before any attributed correction.",
            })
        check(held_ids == set(partial)
              and len(doc["games"]) == summary["completedGames"]
              and len(held_ids) == summary["partialScoringGames"]
              and len(doc["games"]) - len(held_ids) == summary["fullScoringGames"],
              "ADMITTED_PARTIAL_GAME_COVERAGE_PARITY_" + str(lid))
        by_season.append({
            "leagueId": lid,
            "totalGameSheets": len(doc["games"]),
            "fullScoringSheets": summary["fullScoringGames"],
            "heldScoringSheets": len(held_ids),
            "finalScoreCountMinusCandidatesAcrossHeldSheets": season_gap,
            "qualifiedCandidatesMinusFinalScoreAcrossHeldSheets": season_over,
            "directionCounts": dict(sorted(direction_counts.items())),
            "reasonCounts": dict(sorted(reason_counts.items())),
        })
    findings.sort(key=lambda g: (0 if g["priority"] == "CURRENT_SEASON_SOURCE_REVIEW"
                                else 1 if g["priority"] == "HIGH_DOCUMENTATION_GAP"
                                else 2,
                                -g["absoluteQualifiedCandidateCountDifference"],
                                -g["leagueId"], g["date"], g["gameId"]))
    check(len(findings) == sum(row["partialScoringGames"] for row in index["seasons"].values()),
          "TOTAL_HOLD_COUNT_PARITY")
    return {
        "schema": "brave-hc-svhl-scoring-source-holds-triage/v1",
        "status": "READ_ONLY_UNRESOLVED_OFFICIAL_GAMEINFO_REVIEW_QUEUE",
        "candidateCountDefinition": "LEN_OF_SCORER_AND_SEASON_ROSTER_QUALIFIED_SOURCE_GAME_EVENTS_NOT_RAW_SCORING_TABLE_ROWS",
        "sourceCapturedUTC": index.get("capturedUTC"),
        "scope": "SPORTS_VILLAGE_SVHL_ONLY_EXCLUDES_VAHL",
        "seasonCount": len(by_season),
        "totalCompletedGameSheets": sum(s["totalGameSheets"] for s in by_season),
        "fullyReconciledGameSheets": sum(s["fullScoringSheets"] for s in by_season),
        "unresolvedHeldGameSheets": len(findings),
        "gamesWithFewerRosterQualifiedEventsThanFinalGoals": sum(s["directionCounts"].get("QUALIFIED_CANDIDATES_BELOW_FINAL_SCORE_GOALS", 0) for s in by_season),
        "gamesWithMoreRosterQualifiedEventsThanFinalGoals": sum(s["directionCounts"].get("QUALIFIED_CANDIDATES_ABOVE_FINAL_SCORE_GOALS", 0) for s in by_season),
        "finalScoreGoalCountAboveRosterQualifiedCandidates": sum(s["finalScoreCountMinusCandidatesAcrossHeldSheets"] for s in by_season),
        "rosterQualifiedCandidatesAboveFinalScoreGoalCount": sum(s["qualifiedCandidatesMinusFinalScoreAcrossHeldSheets"] for s in by_season),
        "bySeason": by_season,
        "games": findings,
        "limitations": [
            "Undercounts and overcounts compare final-score goals to source player-ID/roster-qualified candidate scoring events (game.events). These counts do NOT represent all raw official GameInfo scoring-table rows. An undercount may reflect an unlisted scorer on a game sheet rather than a missing goal; no player score correction is authorized.",
            "Final scores, original league IDs, dates and team names are retained unchanged.",
            "No goal, assist, player appearance, penalty or player identity is assigned to a missing event.",
            "Each official GameInfo URL and captured page SHA256 must be reviewed before any source correction.",
            "A partial GameInfo goal sheet cannot certify attendance, GP, PIM or the absence of other events.",
            "This queue is a triage tool, not an accepted historical repair or production authorization.",
        ],
        "leagueDataWritten": False,
        "masterWorkbookWritten": False,
        "publishedPlayerTotalsModified": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--csv-output", type=Path, help="Optional reviewer-friendly, read-only 137-game CSV")
    args = parser.parse_args()
    source = args.repo / "widgets"
    index = json.loads((source / "svhl-player-game-index.json").read_text(encoding="utf-8"))
    seasons = {int(k): json.loads((source / ("svhl-player-game-" + k + ".json"))
                                    .read_text(encoding="utf-8"))
               for k in index["seasons"]}
    report = build(index, seasons)
    if args.csv_output:
        args.csv_output.parent.mkdir(parents=True, exist_ok=True)
        columns = ("priority", "leagueId", "gameId", "date", "homeTeam", "awayTeam",
                   "homeTeamId", "awayTeamId", "publishedFinalScoreHomeAway",
                   "rosterQualifiedGoalEventCandidates", "finalScoreCountMinusQualifiedCandidates",
                   "qualifiedCandidatesMinusFinalScoreCount", "direction", "reviewStatus",
                   "officialGameInfoURL", "officialGameInfoPageSHA256")
        with args.csv_output.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=columns)
            writer.writeheader()
            for game in report["games"]:
                row = {k: game[k] for k in columns}
                row["publishedFinalScoreHomeAway"] = "-".join(
                    map(str, row["publishedFinalScoreHomeAway"]))
                writer.writerow(row)
    output = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
