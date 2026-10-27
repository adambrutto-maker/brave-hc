#!/usr/bin/env python3
"""Read-only, source-scoped HockeyOS reconciliation coverage report."""
import argparse
import json
from pathlib import Path

ADULT_DIVISIONS = ("Fazzari Partners", "The Cristillo Division", "Remax Division")


def require(condition, message):
    if not condition:
        raise ValueError("HOCKEYOS_COVERAGE_HOLD:" + message)


def build_report(league, history, events, roster, penalties):
    require(league.get("schema") == "brave-hc-league-intelligence/public-v1"
            and league.get("currentSourceDataConcordant") is True,
            "CURRENT_LEAGUE_SOURCE_NOT_CONCORDANT")
    require(history.get("schema") == "brave-hc-source-matched-historical-team-seasons/v1"
            and history.get("status") == "DUAL_SOURCE_VERIFIED_HISTORICAL_GAMES_SEASON_SCOPED"
            and history.get("currentContextNotModified") is True,
            "HISTORICAL_SOURCE_UNQUALIFIED")
    require(events.get("schema") == "brave-hc-svhl-game-reconciliation-index/v1"
            and events.get("seasonStatsOverwritten") is False
            and events.get("unqualifiedEventRowsHeld") is True,
            "PLAYER_GAME_RECONCILIATION_UNQUALIFIED")
    require(roster.get("schema") == "brave-hc-public-svhl-roster-seasons/v1"
            and roster.get("identityBasis") == "EXACT_OFFICIAL_PLAYER_ID_PER_ROSTER_SEASON_NOT_NAMES"
            and roster.get("originalWorkbookWritten") is False,
            "ROSTER_IDENTITY_OR_WRITE_BOUNDARY_FAILED")
    require(penalties.get("schema") == "brave-hc-svhl-penalty-table-source-coverage/v1"
            and penalties.get("notExhaustive") is True,
            "PENALTY_SAMPLE_SCOPE_UNQUALIFIED")
    require(events.get("sourceSeasonCount") == len(events.get("seasons", {})),
            "SEASON_COUNT_INCONSISTENT")
    require(events.get("currentRosterPlayers") == len(events.get("currentPlayers", []))
            and roster.get("currentPlayerObservations") == events.get("currentRosterPlayers"),
            "CURRENT_PLAYER_SOURCE_COUNT_CONFLICT")
    require(history.get("matchedGameCount", -1) >= 0
            and history.get("heldGameComparisons", -1) >= 0
            and len(history.get("teamSeasons", [])) == history.get("matchedTeamSeasonGroups")
            and all(t.get("continuousFranchiseNotVerified") is True
                    for t in history["teamSeasons"]),
            "HISTORICAL_FRANCHISE_OR_COMPARISON_PROOF")
    season_rows = []
    for sid, row in sorted(events["seasons"].items(), key=lambda x: int(x[0]), reverse=True):
        full, partial, total = (row.get(k) for k in
                               ("fullScoringGames", "partialScoringGames", "completedGames"))
        require(all(isinstance(v, int) and v >= 0 for v in (full, partial, total))
                and full + partial == total,
                "SEASON_GAME_PARITY_" + sid)
        season_rows.append({"leagueId": int(sid), "source": row.get("source"),
                            "gamePages": total, "fullGoalParity": full,
                            "partialOrHeld": partial,
                            "goalParityPercent": round(100 * full / total, 2) if total else None})
    total = sum(r["gamePages"] for r in season_rows)
    full = sum(r["fullGoalParity"] for r in season_rows)
    partial = sum(r["partialOrHeld"] for r in season_rows)
    require(total == full + partial, "OVERALL_GAME_COVERAGE_PARITY")
    adult = [t for t in league["teams"] if t["divisionNow"] in ADULT_DIVISIONS]
    require(len({t["sourceTeamId"] for t in adult}) == len(adult),
            "DUPLICATED_ADULT_TEAM_SOURCE_ID")
    require(league.get("currentLeagueTeamCount") == len(league["teams"]),
            "CURRENT_TEAM_COUNT_CONFLICT")
    require(penalties.get("totalGamesSampled") == len(penalties.get("games", [])),
            "PENALTY_SAMPLE_SIZE_CONFLICT")
    return {
        "schema": "brave-hc-hockeyos-eng59-coverage-report/v1",
        "status": "READ_ONLY_EVIDENCE_REPORT_NOT_PUBLICATION_AUTHORITY",
        "sourcesAsObserved": {
            "currentLeague": league.get("asOf"),
            "playerGameCapture": events.get("capturedUTC"),
            "playerGameAcceptedLeague": events.get("acceptedLeagueAsOf"),
            "historicalRoster": roster.get("asOf"),
            "penaltySample": penalties.get("capturedUTC"),
        },
        "league": {
            "sourceLeagueId": league["leagueId"],
            "publishedDivisions": league["currentDivisionCount"],
            "leagueTeams": len(league["teams"]),
            "reciprocalScoredGames": league["verifiedReciprocalCompletedGames"],
            "adultSundayDivisions": list(ADULT_DIVISIONS),
            "eligibleAdultSundayTeams": len(adult),
            "otherDivisionTeamsExcludedFromLab": len(league["teams"]) - len(adult),
        },
        "gameReconciliation": {
            "seasons": len(season_rows), "gamePages": total,
            "fullGoalParity": full, "partialOrHeld": partial,
            "fullGoalParityPercent": round(100 * full / total, 2) if total else None,
            "bySeason": season_rows,
            "gameGoalsVerifiedDoesNotProvePlayerAppearance": True,
            "registeredGamesPlayedVerified": events["registeredGPVerified"],
            "sourceAggregatesOverwritten": events["seasonStatsOverwritten"],
        },
        "historicalOpponentEvidence": {
            "sourceMatchedGameComparisons": history["matchedGameCount"],
            "unresolvedHeldComparisons": history["heldGameComparisons"],
            "matchedSeasonTeamGroups": history["matchedTeamSeasonGroups"],
            "continuousFranchiseIdentityAsserted": False,
        },
        "rosterEvidence": {
            "currentPlayerIDs": events["currentRosterPlayers"],
            "historicalPlayerSeasonObservations": roster["playerSeasonObservations"],
            "historicalSeasonTeamSources": roster["sourceHistoricalTeamsRead"],
            "lineupAvailabilityVerified": False,
            "statTreatment": roster["statTreatment"],
        },
        "penaltyEvidence": {
            "sampledGameInfoPages": penalties["totalGamesSampled"],
            "populatedPenaltyRowsObserved": penalties["totalPopulatedPenaltyRows"],
            "sampleNotExhaustive": penalties["notExhaustive"],
            "seasonPIMReconciled": penalties["seasonPIMReconciled"],
            "seasonGPReconciled": penalties["seasonGPReconciled"],
            "zeroObservedPenaltyRowsDoesNotMeanZeroPenalties": True,
        },
        "limitations": [
            "Sources were captured at different times; counts are not one synchronized snapshot.",
            "A source-matched score does not independently verify every player appearance.",
            "Team name overlap across seasons does not establish a continuing franchise.",
            "Published roster statistics do not prove expected lineups for a future game.",
            "Division scenarios reflect present adult Sunday strength and observed game evidence, not forecast results.",
            "The current league match ledger lacks distinct official game IDs for same-day rematches.",
            "VAHL is a separate league and is excluded from all SVHL division research.",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, help="Optional separate report destination")
    args = parser.parse_args()
    def load(name):
        return json.loads((args.repo / "widgets" / name).read_text(encoding="utf-8"))
    report = build_report(
        load("league-intelligence.json"),
        load("brave-historical-verified-games.json"),
        load("svhl-player-game-index.json"),
        load("svhl-roster-intelligence.json"),
        load("svhl-penalty-source-coverage.json"),
    )
    result = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result, encoding="utf-8")
    print(result, end="")


if __name__ == "__main__":
    main()
