"""Private source-linked game-night defensive watch packet.

Match HTO and SVHL next scheduled Brave H.C. game exactly, then flag
opponent players for coach review. No game-day attendance is inferred and no
named Brave defender is assigned. No release, e-mail, messaging or HTO edits.
"""
from __future__ import annotations
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from argparse import ArgumentParser
from pathlib import Path
import json
import re
import sys

SCHEMA = "brave-hc-game-night-opponent-defensive-review/private-v1"
BASIS = "brave-hc-opponent-player-intelligence/public-v1"
AUTH = "brave-hc-upcoming-countdown/v1"
SVHL = "brave-hc-svhl-schedule/v1"
class GameNightHold(ValueError):
    pass

def need(cond, reason):
    if not cond:
        raise GameNightHold("DEFENSIVE_GAME_NIGHT_HOLD:" + reason)

def rink(s):
    return re.sub("[^a-z0-9]", "",str(s).lower().replace(
        "vaughan sports village", ""))

def iso(s):
    dt = datetime.fromisoformat(str(s).replace("Z","+00:00"))
    need(dt.tzinfo is not None,"FIXTURE_TIMEZONE_MISSING")
    return dt.astimezone(ZoneInfo("America/Toronto"))

def build(feed, hto, svhl, now=None):
    now = now or datetime.now(timezone.utc)
    need(feed.get("schema") == BASIS and feed.get("teamCount") == 21 and
         feed.get("sourceAuthority",{}).get("braveHC") == "HTO_ONLY" and
         feed.get("VAHLExcluded") is True and
         feed.get("svhlBravePlayerStatsPublished") is False and
         hto.get("schema") == AUTH and hto.get("season") == "W2026/27" and
         svhl.get("schema") == SVHL and
         not svhl.get("missingFixtureReviews"),
         "SOURCE_QUALIFICATION_INVALID")
    need(now.tzinfo is not None and
         abs((now - iso(feed["capturedAt"])).total_seconds()) <= 14*86400 and
         abs((now - iso(svhl["checkedAt"])).total_seconds()) <= 14*86400,
         "SCHEDULE_OR_PLAYER_SOURCE_STALE")
    future = sorted([game for game in hto.get("games",[])
                     if iso(game["puckDrop"]) > now.astimezone(
                         ZoneInfo("America/Toronto"))],
                    key=lambda g: iso(g["puckDrop"]))
    need(future,"NO_VERIFIED_UPCOMING_FIXTURE")
    game = future[0]
    counterpart = [x for x in svhl.get("games",[]) if
         x.get("htoGameId") == str(game["id"]) and
         x.get("assignmentKey") == "hto:" + str(game["id"]) and
         x.get("htoSyncStatus") == "MATCH"]
    need(len(counterpart)==1,"SVHL_HTO_IDENTITY_NOT_MATCHED")
    league = counterpart[0]
    need(league["opponent"] == game["opponent"] and
         league["date"] == game["gameDate"] and
         league["time"] == iso(game["puckDrop"]).strftime("%H:%M") and
         rink(league["rink"]) == rink(game["rink"]) and
         league["side"].lower() == game["homeAway"].lower(),
         "FIXTURE_DATE_TIME_OPPONENT_RINK_OR_SIDE_DRIFT")
    selected = [t for t in feed["teams"] if t["name"] == game["opponent"]]
    need(len(selected)==1 and selected[0]["division"] == "The Cristillo Division",
         "NEXT_OPPONENT_NOT_IN_QUALIFIED_SVHL_SCOUT_SCOPE")
    team = selected[0]
    grades = {"SPECIAL_DEFENSIVE_ATTENTION_REVIEW":2,
              "OPPONENT_WATCH_REVIEW":1,"ROUTINE_UNCONFIRMED":0}
    cues = {"DEFEND_INSIDE_SHOOTING_LANE":
             "Defenders protect inside shooting lanes and slot.",
            "DENY_MIDDLE_PASSING_LANE":
             "Wingers close central passing seams; keep inside support.",
            "F1_PRESSURE_AND_FORCE_OUTSIDE":
             "F1 pressures the carrier outside; teammates guard middle."}
    observed = []
    for p in team["players"]:
        watch=p.get("sourceForm",{}).get("gameNight",{})
        recent=p.get("sourceForm",{}).get("recentForm",{})
        season=p.get("sourceForm",{}).get("seasonPace",{})
        priority=watch.get("priority")
        need(priority in grades and
             watch.get("namedBravesAssignment") is None and
             watch.get("coachApproved") is False and
             watch.get("opponentDressed") == "UNVERIFIED" and
             watch.get("bravesLineupAndRole") == "UNVERIFIED" and
             watch.get("defensiveFocus") in cues,
             "UNAPPROVED_PLAYER_ASSIGNMENT_OR_FORM")
        if grades[priority] == 0 or p.get("gp",0) < 3:
            continue
        observed.append({
            "sourcePlayerId": p["playerId"],"nameAsPublished": p["name"],
            "profileUrl": p["profileUrl"],
            "reportedGP": p["gp"],"reportedGoals": p["g"],
            "reportedAssists": p["a"],"reportedPoints": p["pts"],
            "pointsPerReportedGP":p["publishedPtsPerGP"],
            "priority": priority,"formState": recent.get("state"),
            "newReportedGP":recent.get("newReportedGP"),
            "newReportedPoints":recent.get("newReportedPoints"),
            "priorSeasonPace":season.get("state"),
            "proposedDefensiveResponsibility":watch["defensiveFocus"],
            "tacticalCue":cues[watch["defensiveFocus"]],
            "opponentConfirmedDressed": False,
            "bravePlayerAssigned": None,
            "coachApproved": False,
            "verificationNeeded": [
                "Confirm opposing player is actually dressed",
                "Confirm Brave H.C. attendance and defensive roles",
                "Manager/coach approves any named matchup",
                "Retain standard F1 outside pressure and protect the middle"
            ]})
    observed.sort(key=lambda x:(
        -grades[x["priority"]],
        -(x["formState"] == "HOT_MULTIGAME_SOURCE_TREND"),
        -(x["formState"] == "ONE_GAME_SCORING_SURGE_WATCH"),
        -(x["pointsPerReportedGP"] or 0),
        -x["reportedGoals"],x["nameAsPublished"]))
    return {"schema":SCHEMA,"status":"PRIVATE_COACH_REVIEW_PROPOSALS_ONLY",
        "createdUTC":datetime.now(timezone.utc).isoformat(),
        "sourceCutoff":feed["capturedAt"],
        "sourceWindow":feed["weeklyFormWindow"],
        "fixture":{"htoGameId":game["id"],"date":game["gameDate"],
                   "timeToronto":league["time"],"opponent":game["opponent"],
                   "rink":league["rink"],"hto":game["eventURL"],
                   "svhlScheduleProof":"MATCH_SOURCE_ADMITTED"},
        "sourceOpponentTeamId":team["sourceTeamId"],
        "reviewTargets": observed[:4], "allWatchCandidates":len(observed),
        "managerReviewRequired":True,
        "opponentAttendanceConfirmed":False,
        "bravesAttendanceAndRolesConfirmed":False,
        "anyNamedAssignmentsApproved":False,
        "outboundMessages":0,"publicDataChanged":False,
        "note":"SVHL player stats are provisional source observations. One-game surge "
               "is not a sustained hot streak; prior season pace is not a "
               "forecast. Named coverage needs current attendance and coach approval."}

def main():
    p=ArgumentParser()
    for item in ("feed","hto","svhl","out"):
        p.add_argument("--"+item,type=Path,required=True)
    a=p.parse_args()
    try:
        read=lambda path:json.loads(path.read_text("utf8"))
        result=build(read(a.feed),read(a.hto),read(a.svhl))
        if not a.out.parent.is_dir() or "widgets" in [
                s.lower() for s in a.out.parts]:
            raise GameNightHold("DEFENSIVE_GAME_NIGHT_HOLD:PRIVATE_OUTPUT_REQUIRED")
        tmp=a.out.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",
                       encoding="utf8")
        tmp.replace(a.out)
        print(json.dumps({"status":result["status"],
                          "game":result["fixture"]["htoGameId"],
                          "opponent":result["fixture"]["opponent"],
                          "targets":len(result["reviewTargets"]),
                          "coachApproval":False,"output":str(a.out)}))
        return 0
    except (GameNightHold,OSError,TypeError,ValueError,KeyError) as e:
        print(json.dumps({"status":"HOLD","reason":str(e)[:500]}),
              file=sys.stderr)
        return 2
if __name__=="__main__":
    sys.exit(main())
