#!/usr/bin/env python3
"""Read-only next-game readiness decision, with an optional GitHub issue receipt.

SVHL controls game details. This does NOT change HTO, confirm a goalie, or
contact any player. Only a repository issue is created/updated/closed when
a fresh, verified fixture snapshot requires attention.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

TORONTO = ZoneInfo("America/Toronto")
TITLE = "Brave H.C. — next-game readiness review"
SVHL = "https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=570&page_type=Adult&sc=HOCKEY#Schedule"
MANAGER = "https://adambrutto-maker.github.io/brave-hc/widgets/goalie-manager-v1.2.html"
HTO = "https://www.hometeamsonline.com/admin/default.asp?p=schedule"


def kickoff(item: dict) -> datetime:
    return datetime.fromisoformat(item["date"] + "T" + item["time"]).replace(tzinfo=TORONTO)


def examine(feed: dict, saved: dict, now: datetime) -> dict:
    if feed.get("schema") != "brave-hc-svhl-schedule/v1" or not isinstance(feed.get("games"), list):
        raise ValueError("SVHL feed structure invalid")
    if saved.get("schema") != "brave-hc-goalie-assignments/v1" or not isinstance(saved.get("assignments"), dict):
        raise ValueError("Goalie assignments structure invalid")
    timestamp = datetime.fromisoformat(feed["checkedAt"])
    if timestamp.tzinfo is None or not -timedelta(minutes=15) <= now-timestamp <= timedelta(hours=24):
        raise ValueError("SVHL feed not freshly verified; do not claim game readiness")
    if feed.get("missingFixtureReviews"):
        # The missing-game review issue is handled separately. Do not assert
        # next-game readiness while an upcoming fixture identity is unresolved.
        return {"status": "REVIEW", "reason": "A previously verified upcoming fixture is missing from SVHL",
                "game": None, "goalie": None}
    candidates = sorted(
        (g for g in feed["games"] if kickoff(g) + timedelta(hours=3) >= now),
        key=kickoff
    )
    if not candidates:
        return {"status": "NONE", "reason": "No upcoming published league games",
                "game": None, "goalie": None}
    next_game=candidates[0]

    def notes(game):
        name=saved["assignments"].get(game["assignmentKey"],"TBD")
        warnings=[]
        if name=="TBD" or not isinstance(name,str) or not name.strip():
            warnings.append("No goaltender booking is recorded for this game")
        if game.get("requiresGoalieReconfirmation") and name!="TBD":
            sig=game.get("fixtureSignature")
            if not sig or saved.get("scheduleConfirmations",{}).get(game["assignmentKey"]) != sig:
                warnings.append("Goaltender must be reconfirmed after a league schedule change")
        if game.get("htoSyncStatus")!="MATCH":
            warnings.append("HTO schedule requires a manual SVHL correction/review")
        return name,warnings

    # A genuine game-day blocker always outranks advance planning.
    if kickoff(next_game)-now <= timedelta(hours=36):
        name,warnings=notes(next_game)
        if warnings:
            return {"status":"REVIEW","reason":"; ".join(warnings),
                    "game":next_game,"goalie":name,"priority":"GAME_DAY"}

    # Look beyond this Sunday's confirmed starter. Flag the earliest fixture
    # needing manager attention within 14 days, without treating TBD as an
    # invitation, booking, or authorization for player contact.
    for game in candidates:
        delta=kickoff(game)-now
        if delta > timedelta(days=14):
            break
        name,warnings=notes(game)
        if warnings:
            priority="GAME_DAY" if delta<=timedelta(hours=36) else "ADVANCE_COVERAGE"
            return {"status":"REVIEW","reason":"; ".join(warnings),
                    "game":game,"goalie":name,"priority":priority,
                    "nearest_game":next_game,
                    "nearest_goalie":saved["assignments"].get(next_game["assignmentKey"],"TBD")}

    name,_=notes(next_game)
    if kickoff(next_game)-now > timedelta(hours=36):
        return {"status":"NOT_DUE","reason":"No game-day action or coverage gap within 14 days",
                "game":next_game,"goalie":name}
    return {"status":"READY","reason":"Next starter and HTO schedule verified; no coverage gap within 14 days",
            "game":next_game,"goalie":name}

def issue_body(result: dict) -> str:
    game=result["game"]
    if not game:
        return (
            "**Human review required:** previously listed SVHL fixture disappeared. "
            f"Check [SVHL]({SVHL}) and the HTO schedule before confirming availability. "
            "No HTO changes or player contact were performed."
        )
    # Provider fields are plain display text, not instructions or executable content.
    def plain(value):
        return re.sub(r"[^A-Za-z0-9 :/._-]", " ", str(value))[:100].strip()
    nearest=result.get("nearest_game")
    first_game_context=[]
    if isinstance(nearest,dict) and nearest.get("assignmentKey")!=game.get("assignmentKey"):
        first_game_context=[
            f"**Nearest scheduled game (already recorded):** {plain(nearest.get('date'))} at "+
            f"{plain(nearest.get('time'))} vs {plain(nearest.get('opponent'))} — "+
            f"goalie recorded: {plain(result.get('nearest_goalie','TBD'))}",
            "",
        ]
    return "\n".join([
        "## Brave H.C. game-day / advance goalie coverage review",
        "",
        f"**SVHL game:** {plain(game['date'])} at {plain(game['time'])} Toronto time",
        f"**Opponent:** {plain(game['opponent'])}",
        f"**Rink:** {plain(game['rink'])}",
        f"**Priority:** {plain(result.get('priority', 'MANAGER_REVIEW'))}",
        f"**Recorded goalie:** {plain(result['goalie'])}",
        f"**HTO reconciliation:** {plain(game.get('htoSyncStatus','UNKNOWN'))}",
        f"**Attention:** {plain(result['reason'])}",
        "",
        *first_game_context,
        "This GitHub issue is publicly visible in the Braves repository. It is **not** evidence of goalie acceptance, a booking, or authorization to contact a player or edit HTO.",
        "",
        f"1. Check the [official SVHL fixture]({SVHL}).",
        f"2. If goalie confirmation is required, use the [protected goalie manager]({MANAGER}).",
        f"3. If HTO details differ, review [HTO Schedule & Results]({HTO}) and preserve the existing game ID.",
        "4. The next verified monitoring pass closes this issue only when the action is no longer needed.",
        "",
        "**No players were contacted, no goaltender assigned and no HTO game edited.**",
    ])


def github(method: str, base: str, path: str, token: str, payload=None):
    headers={"Authorization": "Bearer "+token, "Accept":"application/vnd.github+json",
             "X-GitHub-Api-Version":"2022-11-28","User-Agent":"BraveHC-Readiness-Watch"}
    data=None if payload is None else json.dumps(payload).encode()
    if payload is not None:
        headers["Content-Type"]="application/json"
    req=Request(base+path,data=data,headers=headers,method=method)
    with urlopen(req,timeout=20) as response:
        return json.load(response) if response.status!=204 else {}


def sync_issue(result: dict, repo: str, token: str) -> str:
    base="https://api.github.com/repos/"+repo
    existing=next((x for x in github("GET",base,"/issues?state=all&per_page=100",token)
                   if x.get("title")==TITLE and "pull_request" not in x),None)
    if result["status"] != "REVIEW":
        if existing and existing["state"]=="open":
            github("PATCH",base,"/issues/"+str(existing["number"]),token,{"state":"closed"})
            return "CLOSED"
        return "NO_ACTION"
    body=issue_body(result)
    if not existing:
        github("POST",base,"/issues",token,{"title":TITLE,"body":body})
        return "OPENED"
    changes={"body":body}
    if existing["state"]!="open":
        changes["state"]="open"
    if existing.get("body")==body and existing["state"]=="open":
        return "UNCHANGED"
    github("PATCH",base,"/issues/"+str(existing["number"]),token,changes)
    return "UPDATED"


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--feed",type=Path,default=Path("widgets/svhl-upcoming.json"))
    p.add_argument("--assignments",type=Path,default=Path("widgets/goalie-assignments.json"))
    p.add_argument("--dry-run",action="store_true")
    args=p.parse_args()
    feed=json.loads(args.feed.read_text(encoding="utf-8"))
    saved=json.loads(args.assignments.read_text(encoding="utf-8"))
    result=examine(feed,saved,datetime.now(timezone.utc))
    print(json.dumps(result,indent=2,default=str))
    if args.dry_run:
        return
    repo=os.environ["GITHUB_REPOSITORY"]
    token=os.environ["GITHUB_TOKEN"]
    print("Issue operation:",sync_issue(result,repo,token))


if __name__=="__main__":
    main()
