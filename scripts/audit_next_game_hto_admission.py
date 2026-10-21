"""Read-only explicit next-game HTO/workbook join preflight for Plan 03.

Never treats a fixture, preview, countdown rollover, or 0-0 workbook placeholder
as an official completed result. Does not modify HTO, workbook, or collector.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import argparse
import json

TARGET = 3375682
SEASON = "W2026/27"
DATE = "2026-10-25"
CURRENT_IDS = {3356177, 3356178, 3369564, 3375601}


def one(items, test, error):
    subset = [x for x in items if isinstance(x, dict) and test(x)]
    if len(subset) != 1:
        raise ValueError(error)
    return subset[0]


def check(countdown, svhl, workbook, feed):
    if (countdown.get("schema") != "brave-hc-upcoming-countdown/v1"
        or countdown.get("sourceAuthority") != "HTO official schedule, preview game links"):
        raise ValueError("HTO_PREVIEW_AUTHORITY_INVALID")
    if svhl.get("schema") != "brave-hc-svhl-schedule/v1":
        raise ValueError("SVHL_SCHEDULE_AUTHORITY_INVALID")
    if (feed.get("schema") != "brave-hc-hto-verified-game-feed/v1"
        or feed.get("allGamesDiscovered") is not True
        or feed.get("playerAggregateParity") is not True):
        raise ValueError("CURRENT_COMPLETED_GAMES_UNVERIFIED")
    games=feed.get("games")
    if not isinstance(games,list) or feed.get("teamGP")!=len(games):
        raise ValueError("CURRENT_COMPLETED_COVERAGE_INVALID")
    ids=[x.get("htoGameId") for x in games if isinstance(x,dict)]
    if len(ids)!=4 or len(set(ids))!=4 or set(ids)!=CURRENT_IDS:
        raise ValueError("FIFTH_GAME_ALREADY_PRESENT_OR_BASELINE_CHANGED")
    upcoming=one(countdown.get("games",[]),lambda g:g.get("id")==TARGET,"HTO_FIXTURE_AMBIGUOUS")
    league=one(svhl.get("games",[]),lambda g:g.get("htoGameId")==str(TARGET),"SVHL_FIXTURE_AMBIGUOUS")
    if (upcoming.get("gameDate") != DATE or upcoming.get("opponent") != "Big Bastones"
        or upcoming.get("homeAway") != "Home" or not upcoming.get("puckDrop")):
        raise ValueError("HTO_FIXTURE_CHANGED_OR_INCOMPLETE")
    try:
        game_time=datetime.fromisoformat(upcoming["puckDrop"])
    except (ValueError,TypeError) as exc:
        raise ValueError("HTO_PUCKDROP_INVALID") from exc
    if game_time.tzinfo is None or game_time.utcoffset() is None:
        raise ValueError("HTO_PUCKDROP_INVALID")
    if game_time.strftime("%Y-%m-%d")!=DATE or game_time.strftime("%H:%M")!="18:15":
        raise ValueError("HTO_PUCKDROP_CHANGED")
    u=urlparse(upcoming.get("eventURL",""))
    q=parse_qs(u.query)
    if (u.scheme!="https" or u.hostname!="www.htosports.com"
        or u.path!="/teams/default.asp" or q.get("u")!=["BRAVESHOCKEY"]
        or q.get("p")!=["preview"] or q.get("gameID")!=[str(TARGET)]):
        raise ValueError("HTO_PREVIEW_URL_INVALID")
    if (league.get("htoSyncStatus")!="MATCH"
        or league.get("assignmentKey")!=f"hto:{TARGET}"
        or league.get("date")!=DATE
        or league.get("opponent")!=upcoming["opponent"]
        or league.get("time")!="18:15" or league.get("side")!="home"):
        raise ValueError("SVHL_SCHEDULE_DISAGREES_WITH_HTO")
    if not isinstance(workbook,list):
        raise ValueError("WORKBOOK_ROWS_MISSING")
    matches=[row for row in workbook if isinstance(row,dict)
             and row.get("season")==SEASON and row.get("date")==DATE
             and row.get("scope")=="Regular Season"]
    if len(matches)!=1:
        raise ValueError("WORKBOOK_SEASON_DATE_JOIN_AMBIGUOUS")
    row=matches[0]
    if row.get("sheetRow")!=374 or row.get("gameNumber")!=363:
        raise ValueError("WORKBOOK_IDENTITY_CHANGED")
    if row.get("opponent") not in ("",None,"Big Bastones","Big Bastones H.C."):
        raise ValueError("WORKBOOK_OPPONENT_CONFLICT")
    return {
        "schema":"brave-hc-next-game-source-join-preflight/v1",
        "status":"PRE_GAME_SCHEDULE_ASSOCIATION_VERIFIED_NOT_ADMITTED",
        "htoGameId":TARGET, "date":DATE, "opponent":upcoming["opponent"],
        "puckDrop":upcoming["puckDrop"], "workbookSeason":SEASON,
        "workbookSheetRow":row["sheetRow"],"workbookGameNumber":row["gameNumber"],
        "workbookOpponentAbsent":not bool(row.get("opponent")),
        "completedOfficialBoxscoreVerified":False,
        "newPlayerStatisticsVerified":False,
        "collectorAdmissionApproved":False,
        "originalWorkbookModified":False,
        "reason":"Official HTO completed-game boxscore, roster and final-score parity are required after the game. Preview/countdown is not a result.",
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--countdown",type=Path,required=True)
    p.add_argument("--svhl",type=Path,required=True)
    p.add_argument("--workbook-rows",type=Path,required=True)
    p.add_argument("--hto-feed",type=Path,required=True)
    args=p.parse_args()
    inp=[json.loads(getattr(args,k).read_text(encoding="utf-8"))
         for k in ("countdown","svhl","workbook_rows","hto_feed")]
    print(json.dumps(check(*inp),indent=2))


if __name__=="__main__":
    main()
