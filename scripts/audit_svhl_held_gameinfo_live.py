#!/usr/bin/env python3
"""Private source-hash-bound diagnostic of unresolved SVHL GameInfo sheets.

This reads official public pages and reuses the existing verified parser. It does
not change stored official results, public roster/player statistics, or releases.
"""
from __future__ import annotations
import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from collect_svhl_player_game_events import (
    Tables, fetch_game, official_game, url_game
)
from build_svhl_scoring_source_holds_triage import build as build_queue

def require(ok, why):
    if not ok:
        raise ValueError("HELD_GAME_SOURCE_PROBE_HOLD:" + why)

def classify(raw_rows, final_goal_total, candidate_count, held_reasons):
    require(all(type(n) is int and n >= 0 for n in
                (raw_rows, final_goal_total, candidate_count)),
            "INVALID_EVENT_COUNT")
    require(candidate_count <= raw_rows, "MORE_QUALIFIED_CANDIDATES_THAN_RAW_ROWS")
    if raw_rows < final_goal_total:
        return "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE"
    if raw_rows > final_goal_total:
        return "RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE"
    if candidate_count == final_goal_total and not held_reasons:
        return "RAW_SOURCE_SCORE_AND_CANDIDATES_MATCH_INSPECT_HOLD_POLICY"
    if "GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER" in held_reasons:
        return "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"
    return "RAW_SCORE_PARITY_WITH_OTHER_EVENT_QUALIFICATION_HOLD"

def diagnose(row, season, html, sha):
    game = next(g for g in season["games"] if g["gameId"] == row["gameId"])
    require(sha == game["sourcePageSHA256"] == row["officialGameInfoPageSHA256"],
            "LIVE_SOURCE_HASH_DRIFT")
    lid, gid = row["leagueId"], row["gameId"]
    require(game["source"] == row["officialGameInfoURL"] == url_game(lid, gid),
            "SOURCE_URL_NOT_PINNED")
    teams = {t["sourceTeamId"]: [
        {"playerId": player["playerId"], "name": player["name"]}
        for player in t["playerSeasonSummaries"]]
        for t in season["teams"]}
    require(game["homeTeamId"] in teams and game["awayTeamId"] in teams,
            "MISSING_TEAM_ROSTER")
    pinned = {"gameId": gid, "date": game["date"],
              "homeId": game["homeTeamId"], "awayId": game["awayTeamId"],
              "homeGoals": game["homeGoals"], "awayGoals": game["awayGoals"]}
    parsed = official_game(lid, pinned, html, sha, teams)
    table = Tables()
    table.feed(html)
    raw = 0
    for period in range(1, 5):
        key = "ctl00_MainContent_GridViewScoresPeriod" + str(period)
        require(key in table.tables and len(table.tables[key]) >= 1,
                "LIVE_SCORING_TABLE_MISSING")
        raw += len(table.tables[key]) - 1
    admitted = len(parsed["events"])
    require(admitted == game["partialSheetGoalCount"],
            "LIVE_QUALIFIED_EVENT_COUNT_CHANGED_FROM_ARCHIVED")
    require(parsed["status"] == "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL",
            "SOURCE_STATUS_DIFFERENT_SEPARATE_ADMISSION_REQUIRED")
    reasons = dict(sorted(Counter(x["reason"] for x in parsed["heldEvents"]).items()))
    result = {
        "leagueId": lid, "gameId": gid, "date": game["date"],
        "sourceURL": row["officialGameInfoURL"],
        "pageSHA256": sha, "pageByteIdenticalToPinned": True,
        "publishedFinalGoals": game["homeGoals"] + game["awayGoals"],
        "rawOfficialScoringRows": raw,
        "sourceRosterQualifiedCandidateEvents": admitted,
        "heldEventReasons": reasons,
        "sourceClassification": classify(raw, game["homeGoals"] + game["awayGoals"],
                                         admitted, reasons),
        "replayedFromUnmodifiedOfficialPage": True,
        "sourceCorrectionApproved": False,
        "playerScoreOrAttendanceVerified": False
    }
    return result

def audit(repo, limit):
    widgets = repo / "widgets"
    index = json.loads((widgets / "svhl-player-game-index.json").read_text(encoding="utf-8"))
    seasons = {int(k): json.loads((widgets / ("svhl-player-game-" + k + ".json"))
                                    .read_text(encoding="utf-8"))
               for k in index["seasons"]}
    queue = build_queue(index, seasons)
    target = queue["games"] if limit == 0 else queue["games"][:limit]
    examined, held = [], []
    for num, row in enumerate(target, 1):
        lid, gid = row["leagueId"], row["gameId"]
        try:
            html, sha = fetch_game(row["officialGameInfoURL"])
            finding = diagnose(row, seasons[lid], html, sha)
            examined.append(finding)
            print(json.dumps({"i":num,"total":len(target),"leagueId":lid,"gameId":gid,
                              "category":finding["sourceClassification"],
                              "raw":finding["rawOfficialScoringRows"],
                              "qualified":finding["sourceRosterQualifiedCandidateEvents"]}),
                  flush=True)
        except Exception as e:
            held.append({"leagueId":lid,"gameId":gid,"reviewHold":"OFFICIAL_LIVE_SOURCE_REVIEW_FAILED",
                         "why":str(e)[:210],"sourceURL":row["officialGameInfoURL"]})
            print(json.dumps({"i":num,"total":len(target),"leagueId":lid,"gameId":gid,
                              "status":"SOURCE_HOLD","reason":str(e)[:120]}),flush=True)
    categories = dict(sorted(Counter(x["sourceClassification"] for x in examined).items()))
    receipt = {"schema":"brave-hc-private-live-held-gameinfo-diagnostic/v1",
               "observedUTC":datetime.now(timezone.utc).isoformat(),
               "scope":"SVHL_ONLY_NO_VAHL",
               "sourceCapturedUTC":index["capturedUTC"],
               "queuedGameCount":queue["unresolvedHeldGameSheets"],
               "requested":len(target),"pageHashVerified":len(examined),
               "failedOrChangedSource":len(held),
               "classificationCounts":categories,
               "results":examined,"sourceHolds":held,
               "officialStatsChanged":False,"publicFilesChanged":False,
               "sourceVerifiedPlayerAppearance":False,
               "releaseGate":"HELD_INDEPENDENT_REVIEW_REQUIRED"}
    return receipt

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    ap.add_argument("--limit",type=int,default=16,
                    help="Number of highest-priority held games to inspect; 0 = all 137")
    ap.add_argument("--receipt",type=Path,required=True)
    args=ap.parse_args()
    require(args.limit >= 0 and args.limit <= 137,"UNBOUNDED_GAME_READ")
    require(not args.receipt.resolve().is_relative_to((args.repo/"widgets").resolve()),
            "DO_NOT_SAVE_AUDIT_INSIDE_PUBLISHED_WIDGETS")
    result=audit(args.repo,args.limit)
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items()
                      if k in ("queuedGameCount","requested","pageHashVerified",
                               "failedOrChangedSource","classificationCounts","releaseGate")}),
          flush=True)

if __name__=="__main__":
    main()
