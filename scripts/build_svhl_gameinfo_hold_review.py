#!/usr/bin/env python3
"""Create a source-qualified read-only presentation of 137 held GameInfo sheets.

Input is a PRIVATE operator capture. Output is a review-only public-data
candidate; it does not admit player events, edit historical data or publish.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from build_svhl_scoring_source_holds_triage import build as source_queue

CATEGORIES = (
    "RAW_GAMEINFO_ROWS_BELOW_PUBLISHED_SCORE",
    "RAW_GAMEINFO_ROWS_ABOVE_PUBLISHED_SCORE",
    "RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD",
    "RAW_SCORE_PARITY_WITH_OTHER_EVENT_QUALIFICATION_HOLD",
    "RAW_SOURCE_SCORE_AND_CANDIDATES_MATCH_INSPECT_HOLD_POLICY"
)

def need(ok, message):
    if not ok:
        raise ValueError("GAMEINFO_REVIEW_HOLD:" + message)

def review(index, seasons, captured):
    queue = source_queue(index, seasons)
    need(captured.get("schema") == "brave-hc-private-live-held-gameinfo-diagnostic/v1"
         and captured.get("sourceCapturedUTC") == index.get("capturedUTC")
         and captured.get("queuedGameCount") == queue["unresolvedHeldGameSheets"]
         and captured.get("requested") == len(queue["games"])
         and captured.get("pageHashVerified") == len(queue["games"])
         and captured.get("failedOrChangedSource") == 0
         and captured.get("officialStatsChanged") is False
         and captured.get("releaseGate") == "HELD_INDEPENDENT_REVIEW_REQUIRED"
         and not captured.get("sourceHolds"),
         "PRIVATE_RECEIPT_UNQUALIFIED_OR_PARTIAL")
    by_key = {(g["leagueId"], g["gameId"]): g for g in queue["games"]}
    need(len(by_key) == len(queue["games"]), "DUPLICATE_SOURCE_GAME_KEYS")
    output = []
    observed = set()
    for item in captured["results"]:
        key = (item.get("leagueId"), item.get("gameId"))
        need(key in by_key and key not in observed, "UNMATCHED_OR_DUPLICATE_CAPTURED_GAME")
        observed.add(key)
        source = by_key[key]
        require = (
            item.get("pageByteIdenticalToPinned") is True
            and item.get("replayedFromUnmodifiedOfficialPage") is True
            and item.get("pageSHA256") == source["officialGameInfoPageSHA256"]
            and item.get("sourceURL") == source["officialGameInfoURL"]
            and item.get("date") == source["date"]
            and item.get("publishedFinalGoals") == source["totalGoalsInPublishedFinalScore"]
            and item.get("sourceRosterQualifiedCandidateEvents") ==
                source["rosterQualifiedGoalEventCandidates"]
            and item.get("playerScoreOrAttendanceVerified") is False
            and item.get("sourceCorrectionApproved") is False
            and item.get("sourceClassification") in CATEGORIES
        )
        need(require, "GAMEINFO_HASH_OR_QUALIFICATION_CONFLICT")
        raw = item["rawOfficialScoringRows"]
        published = source["totalGoalsInPublishedFinalScore"]
        candidate = source["rosterQualifiedGoalEventCandidates"]
        need(all(type(x) is int and x >= 0 for x in (raw, published, candidate))
             and candidate <= raw, "INVALID_RAW_COUNT")
        cat = item["sourceClassification"]
        if cat == CATEGORIES[0]: need(raw < published, "WRONG_RAW_BELOW_CATEGORY")
        if cat == CATEGORIES[1]: need(raw > published, "WRONG_RAW_ABOVE_CATEGORY")
        if cat in CATEGORIES[2:]: need(raw == published, "WRONG_RAW_EQUAL_CATEGORY")
        output.append({
            "leagueId":key[0], "gameId":key[1], "date":source["date"],
            "homeTeam":source["homeTeam"], "awayTeam":source["awayTeam"],
            "finalScore":source["publishedFinalScoreHomeAway"],
            "rawScoringRows":raw,
            "rosterQualifiedEvents":candidate,
            "category":cat,
            "heldReasons":item["heldEventReasons"],
            "officialGameInfoURL":source["officialGameInfoURL"],
            "officialPageSHA256":item["pageSHA256"],
            "status":"SOURCE_PROVEN_REVIEW_PENDING",
            "acceptedPlayerCorrection":False
        })
    need(observed == set(by_key), "MISSING_REVIEWED_SOURCE_PAGE")
    output.sort(key=lambda g:(-g["leagueId"],g["date"],g["gameId"]))
    counts = Counter(g["category"] for g in output)
    need(dict(sorted(counts.items())) == captured["classificationCounts"],
         "CATEGORY_COUNT_INCONSISTENT")
    return {
        "schema":"brave-hc-svhl-gameinfo-raw-source-holds-review/v1",
        "status":"SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED",
        "capturedUTC":captured["observedUTC"],
        "originalGameSourceCapturedUTC":index["capturedUTC"],
        "scope":"SVHL_ONLY_SEPARATE_VAHL_EXCLUDED",
        "gamePages":len(output),
        "fullScoringGames":sum(x["fullScoringGames"] for x in index["seasons"].values()),
        "allCompletedGameSheets":sum(x["completedGames"] for x in index["seasons"].values()),
        "categories":dict(sorted(counts.items())),
        "gamePageHashesMatched":len(output),
        "reviewOnly":True,
        "publicStatsOrScoresChanged":False,
        "seasonGPOrPIMVerified":False,
        "games":output,
        "note":"A raw GameInfo table count matching the published score does NOT independently qualify a scorer who is absent from the source season roster. All 137 games remain held from accepted player event totals."
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument("--capture",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    widgets=args.repo/"widgets"
    index=json.loads((widgets/"svhl-player-game-index.json").read_text(encoding="utf-8"))
    seasons={int(k):json.loads((widgets/f"svhl-player-game-{k}.json").read_text(encoding="utf-8"))
             for k in index["seasons"]}
    doc=review(index,seasons,json.loads(args.capture.read_text(encoding="utf-8")))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"state":doc["status"],"held":doc["gamePages"],
                      "hashes":doc["gamePageHashesMatched"],"categories":doc["categories"]}))

if __name__=="__main__":main()
