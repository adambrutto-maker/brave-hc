#!/usr/bin/env python3
"""Read-only advance goalie planning from PUBLIC SVHL fixtures and saved starters.

Never infer an invitation, acceptance, booking or player contact. This is a
planning signal only. No network, messaging, SQLite, HTO or repo writes.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TORONTO = ZoneInfo("America/Toronto")
HORIZON_DAYS = 21
RENTAL_BACKUP_DAYS = 7
RENTAL_PRIORITY_HOURS = 72
GAME_DAY_HOURS = 36
CURRENT_REGULARS = ("Dev Leong", "Stephen Logue")
LABELS = {
    "COVERED": "Recorded goalie — verify separately if booking evidence is incomplete",
    "LEAGUE_RECONFIRM": "League changed — reconfirm recorded goalie before relying on it",
    "HTO_REVIEW": "SVHL/HTO discrepancy — manual schedule review",
    "REGULAR_FIRST": "Plan Dev/Stephen availability now; keep rental fallback on calendar",
    "LOOKAHEAD": "Later fixture — outside the 21-day active booking window",
    "RENTAL_BACKUP": "No recorded goalie: prepare rental fallback alongside regular outreach",
    "RENTAL_PRIORITY": "No recorded goalie: rental contingency is priority",
    "GAME_DAY": "Game-day coverage unresolved — urgent manager review",
}


def start(game: dict) -> datetime:
    return datetime.fromisoformat(game["date"] + "T" + game["time"]).replace(tzinfo=TORONTO)


def stage(game: dict, saved: dict, now: datetime) -> dict:
    """Produce no-write advisory for one authoritative league fixture."""
    due=start(game)
    delta=due-now.astimezone(TORONTO)
    hours=delta.total_seconds()/3600
    key=game["assignmentKey"]
    selected=(saved.get("assignments") or {}).get(key,"TBD")
    reconfirm=bool(game.get("requiresGoalieReconfirmation") and selected!="TBD" and
                   (saved.get("scheduleConfirmations") or {}).get(key)!=game.get("fixtureSignature"))
    if game.get("htoSyncStatus")!="MATCH":
        flag="HTO_REVIEW"
    elif reconfirm:
        flag="LEAGUE_RECONFIRM"
    elif selected!="TBD":
        flag="COVERED"
    elif hours<=GAME_DAY_HOURS:
        flag="GAME_DAY"
    elif hours<=RENTAL_PRIORITY_HOURS:
        flag="RENTAL_PRIORITY"
    elif hours<=RENTAL_BACKUP_DAYS*24:
        flag="RENTAL_BACKUP"
    elif hours>HORIZON_DAYS*24:
        flag="LOOKAHEAD"
    else:
        flag="REGULAR_FIRST"
    return {
        "date":game["date"],"time":game["time"],"opponent":game["opponent"],
        "rink":game["rink"],"game_key":key,"recorded_goalie":selected,
        "stage":flag,"action":LABELS[flag],
        "rental_backup_review_at":(due-timedelta(days=RENTAL_BACKUP_DAYS)).isoformat(),
        "rental_priority_review_at":(due-timedelta(hours=RENTAL_PRIORITY_HOURS)).isoformat(),
        "confirmed_by_this_plan":False,
        "contacted_by_this_plan":False,
        "rental_contacted":False,
    }


def plan(feed: dict, saved: dict, now: datetime) -> dict:
    if now.tzinfo is None:
        raise ValueError("Timezone-aware planning time required")
    if feed.get("schema")!="brave-hc-svhl-schedule/v1" or not isinstance(feed.get("games"),list):
        raise ValueError("Official SVHL feed missing or invalid")
    if saved.get("schema")!="brave-hc-goalie-assignments/v1" or not isinstance(saved.get("assignments"),dict):
        raise ValueError("Published goalie assignments missing or invalid")
    if feed.get("missingFixtureReviews"):
        return {"status":"HOLD_MISSING_LEAGUE_FIXTURES","games":[],
                "no_outbound":True,"goalies_not_automatically_selected":True}
    entries=[stage(g,saved,now) for g in sorted(feed["games"],key=start)
             if -timedelta(hours=3)<=start(g)-now.astimezone(TORONTO)<=timedelta(days=HORIZON_DAYS)]
    unresolved=[g for g in entries if g["stage"]!="COVERED"]
    return {
        "status":"ADVANCE_COVERAGE_REVIEW_ONLY",
        "horizon_days":HORIZON_DAYS,
        "regular_goalie_candidates":list(CURRENT_REGULARS),
        "regulars_are_suggestions_only":True,
        "first_unresolved_game_key":unresolved[0]["game_key"] if unresolved else None,
        "recorded_covered":sum(g["stage"]=="COVERED" for g in entries),
        "unresolved":len(unresolved),
        "games":entries,
        "no_outbound":True,
        "goalies_not_automatically_selected":True,
    }
