"""Source-qualified SVHL Sunday opponent player form and defensive watch.

Only compares a player's official current-season team/player ID to an actual
earlier dated snapshot of the SAME team/player ID, and optionally to a single
source-qualified prior-season observation. No guessed game appearances,
player positions, lineup deployment or team wins. HTO owns Brave statistics.

A one-game burst is a WATCH, never a proven hot streak. Full momentum requires
>=2 new reported appearances across independently dated snapshots.
"""
from __future__ import annotations
from datetime import datetime, timezone
import re

FIELDS = ("gp", "g", "a", "pts")
BRAVE = 13679
LEAGUE = 570
SCHEMA = "brave-hc-svhl-opponent-form/v1"
class FormHold(ValueError):
    pass

def need(ok, why):
    if not ok:
        raise FormHold("SVHL_FORM_HOLD:" + why)

def instant(s):
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        need(d.tzinfo is not None, "NAIVE_SNAPSHOT_TIME")
        return d.astimezone(timezone.utc)
    except (TypeError, ValueError) as ex:
        raise FormHold("SVHL_FORM_HOLD:SNAPSHOT_TIME_INVALID") from ex

def norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())

def valid_player(p):
    return (p.get("statStatus") == "PUBLISHED_ARITHMETICALLY_CONSISTENT"
            and all(type(p.get(k)) is int and p[k] >= 0 for k in FIELDS)
            and p["g"] + p["a"] == p["pts"])

def snapshot(previous, current):
    """Admit two independently captured player-roster snapshots 2–15 days apart."""
    if previous is None:
        return None
    need(previous.get("schema") ==
         "brave-hc-public-svhl-roster-seasons/v1" and
         current.get("schema") == previous["schema"] and
         previous.get("sourceLeagueId") == current.get("sourceLeagueId") == LEAGUE and
         previous.get("currentTeams") == current.get("currentTeams") == 22,
         "SOURCE_SEASON_OR_TEAM_COUNT_CHANGED")
    days = (instant(current["asOf"]) - instant(previous["asOf"])
            ).total_seconds() / 86400
    need(2 <= days <= 15, "SNAPSHOT_INTERVAL_NOT_WEEKLY")
    current_teams = {t["sourceTeamId"]: t for t in current["teams"]}
    older = {}
    for t in previous["teams"]:
        tid = t["sourceTeamId"]
        if tid == BRAVE:
            continue
        if tid not in current_teams:
            continue
        for p in t["players"]:
            key = (tid, p["playerId"])
            need(key not in older, "DUPLICATE_PREVIOUS_PLAYER")
            older[key] = p
    return {"previousAsOf": previous["asOf"], "currentAsOf": current["asOf"],
            "daysBetweenCaptures": round(days, 2), "older": older}

def prior_baseline(current, history):
    """Compare to one most-recent eligible season; no multi-team season summing."""
    previous = [x for x in history if
        x.get("nameMatch") is True and
        x.get("sourceStatus") == "PUBLISHED_ARITHMETICALLY_CONSISTENT" and
        all(type(x.get(k)) is int and x[k] >= 0 for k in FIELDS) and
        x["pts"] == x["g"] + x["a"] and x["gp"] >= 5 and
        type(x.get("leagueId")) is int and x["leagueId"] < LEAGUE]
    if not previous or current["gp"] < 3:
        return {"state": "INSUFFICIENT_COMPARABLE_SEASON_DATA",
                "priorSeason": None, "pointsPerGameDelta": None}
    lid = max(x["leagueId"] for x in previous)
    one_season = [x for x in previous if x["leagueId"] == lid]
    if len(one_season) != 1:
        return {"state": "MULTIPLE_TEAMS_SAME_PRIOR_SEASON_HOLD",
                "priorSeason": None, "pointsPerGameDelta": None}
    p = one_season[0]
    prev = p["pts"] / p["gp"]
    now = current["pts"] / current["gp"]
    d = now - prev
    state = ("SEASON_PACE_ABOVE_PRIOR" if d >= .4 else
             "SEASON_PACE_BELOW_PRIOR" if d <= -.4 else
             "SEASON_PACE_SIMILAR_TO_PRIOR")
    return {"state": state, "priorSeason": p["season"],
            "priorTeam": p["teamName"], "priorGP": p["gp"],
            "priorPoints": p["pts"], "priorPtsPerGP": round(prev, 3),
            "currentPtsPerGP": round(now, 3),
            "pointsPerGameDelta": round(d, 3)}

def recent_form(p, previous, previous_at=None, current_at=None):
    """Compare observed cumulative GP/G/A/PTS, not inferred game-scoring events."""
    empty = {"state": "NO_PRIOR_WEEKLY_PLAYER_SNAPSHOT", "newReportedGP": None,
             "newReportedPoints": None, "recentPtsPerGP": None,
             "previousPtsPerGP": None, "verifiedHotStreak": False}
    if previous is None:
        return empty
    need(previous_at is not None and current_at is not None and
         2 <= (instant(current_at) - instant(previous_at)
              ).total_seconds() / 86400 <= 15,
         "SAME_PLAYER_SNAPSHOT_TIME_INVALID")
    if (norm(previous.get("name", "")) != norm(p.get("name", "")) or
        not valid_player(previous) or not valid_player(p)):
        return {**empty, "state": "PLAYER_ID_OR_STAT_SOURCE_HOLD"}
    delta = {k: p[k] - previous[k] for k in FIELDS}
    if any(v < 0 for v in delta.values()) or delta["g"] + delta["a"] != delta["pts"]:
        return {**empty, "state": "SOURCE_CORRECTION_OR_REGRESSION_HOLD"}
    if delta["gp"] == 0:
        return {**empty, "state": "NO_NEW_REPORTED_APPEARANCES"
            if delta["pts"] == 0 else "SOURCE_CORRECTION_WITHOUT_GP_HOLD"}
    prior_rate = previous["pts"] / previous["gp"] if previous["gp"] else None
    new_rate = delta["pts"] / delta["gp"]
    rate_change = new_rate - prior_rate if prior_rate is not None else None
    # A single reported appearance cannot prove a sustained streak.
    if delta["gp"] >= 2 and previous["gp"] >= 2 and (
       prior_rate is not None and rate_change is not None and
       rate_change >= .5 and delta["pts"] >= 2):
        state = "HOT_MULTIGAME_SOURCE_TREND"
    elif delta["gp"] >= 2 and previous["gp"] >= 2 and (
         prior_rate is not None and rate_change is not None and
         rate_change <= -.4 and prior_rate >= .7 and new_rate <= .4):
        state = "COOLING_MULTIGAME_SOURCE_TREND"
    elif delta["gp"] == 1 and prior_rate is not None and (
         delta["pts"] >= 2 and rate_change is not None and rate_change >= .6):
        state = "ONE_GAME_SCORING_SURGE_WATCH"
    elif delta["gp"] == 1 and delta["pts"] == 0 and (
         prior_rate is not None and prior_rate >= .8):
        state = "ONE_QUIET_GAME_NOT_A_COLD_STREAK"
    else:
        state = "LIMITED_RECENT_SOURCE_SAMPLE"
    return {"state": state, "previousAsOf": previous_at,
            "currentAsOf": current_at,
            "newReportedGP": delta["gp"], "newReportedGoals": delta["g"],
            "newReportedAssists": delta["a"], "newReportedPoints": delta["pts"],
            "recentPtsPerGP": round(new_rate, 3),
            "previousPtsPerGP": round(prior_rate, 3) if prior_rate is not None else None,
            "pointsPerGameChange": round(rate_change, 3)
               if rate_change is not None else None,
            "verifiedHotStreak": state == "HOT_MULTIGAME_SOURCE_TREND"}

def defensive_watch(p, season, recent):
    """Prioritize coach REVIEW only; never assign a named Brave H.C. player."""
    ok = valid_player(p) and p["gp"] >= 3
    goals_pg = p["g"] / p["gp"] if ok else 0
    points_pg = p["pts"] / p["gp"] if ok else 0
    recent_hot = recent["state"] in (
        "HOT_MULTIGAME_SOURCE_TREND", "ONE_GAME_SCORING_SURGE_WATCH")
    season_up = season["state"] == "SEASON_PACE_ABOVE_PRIOR"
    if ok and (points_pg >= 1.1 or goals_pg >= .7 or
               (recent_hot and points_pg >= .6)):
        priority = "SPECIAL_DEFENSIVE_ATTENTION_REVIEW"
    elif ok and (points_pg >= .65 or goals_pg >= .4 or
                 recent_hot or season_up):
        priority = "OPPONENT_WATCH_REVIEW"
    else:
        priority = "ROUTINE_UNCONFIRMED"
    role = ("DEFEND_INSIDE_SHOOTING_LANE" if goals_pg >= .45 else
            "DENY_MIDDLE_PASSING_LANE" if ok and
            p["a"] / p["gp"] >= .6 else
            "F1_PRESSURE_AND_FORCE_OUTSIDE")
    return {"priority": priority, "defensiveFocus": role,
            "status": "PROPOSED_COACH_REVIEW_ONLY",
            "opponentDressed": "UNVERIFIED",
            "bravesLineupAndRole": "UNVERIFIED",
            "namedBravesAssignment": None,
            "coachApproved": False,
            "goalsPerReportedGP": round(goals_pg, 3) if ok else None,
            "pointsPerReportedGP": round(points_pg, 3) if ok else None,
            "disclaimer": "Scouting attention, not proof of game-night appearance or skill."}

def analyze(p, history, observed=None):
    need(type(p.get("playerId")) is int and p["playerId"] > 0,
         "PLAYER_SOURCE_ID_MISSING")
    if not valid_player(p):
        return {"schema": SCHEMA, "sourceQualified": False,
                "seasonPace": {"state": "PUBLISHED_STATS_HOLD"},
                "recentForm": {"state": "PUBLISHED_STATS_HOLD"},
                "gameNight": {"priority": "HELD", "coachApproved": False}}
    season = prior_baseline(p, history)
    previous = (observed or {}).get("player")
    recent = recent_form(p, previous, (observed or {}).get("previousAsOf"),
                         (observed or {}).get("currentAsOf"))
    return {"schema": SCHEMA, "sourceQualified": True,
            "seasonPace": season, "recentForm": recent,
            "gameNight": defensive_watch(p, season, recent),
            "basis": "SVHL_VERIFIED_SOURCE_SNAPSHOT_DELTAS_AND_HISTORICAL_ID"}
