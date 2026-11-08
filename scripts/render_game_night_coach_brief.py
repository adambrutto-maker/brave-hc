"""Render a source-verified private coach review sheet, never an approved lineup.

Consumes only the HockeyOS private fixture-matched defensive-watch record.
No personal player messages, HTO writes, public article or named matchup.
"""
from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
import json
import re
import sys

SCHEMA = "brave-hc-game-night-opponent-defensive-review/private-v1"
CUES = {
    "DEFEND_INSIDE_SHOOTING_LANE": (
        "When on ice, protect the slot first. The nearest defender maintains "
        "inside body position; F1 angles the carrier outside, and the winger "
        "removes the middle-pass option."),
    "DENY_MIDDLE_PASSING_LANE": (
        "Identify central passing seams early. Strong winger closes the inside "
        "lane, weak winger stays inside, and defenders control the slot."),
    "F1_PRESSURE_AND_FORCE_OUTSIDE": (
        "F1 pressures with an outside angle. Strong winger supports the boards, "
        "weak winger covers the middle, and defenders protect net-front.")
}
class BriefHold(ValueError): pass

def need(ok, why):
    if not ok: raise BriefHold("COACH_BRIEF_HOLD:" + why)

def plain(value):
    value=str(value)
    need(len(value)<300 and not any(c in value for c in ("<",">","[","]","\r")),
         "UNSAFE_SOURCE_TEXT")
    return value

def render(doc):
    need(doc.get("schema")==SCHEMA and
         doc.get("status")=="PRIVATE_COACH_REVIEW_PROPOSALS_ONLY" and
         doc.get("managerReviewRequired") is True and
         doc.get("anyNamedAssignmentsApproved") is False and
         doc.get("opponentAttendanceConfirmed") is False and
         doc.get("bravesAttendanceAndRolesConfirmed") is False and
         doc.get("outboundMessages")==0 and doc.get("publicDataChanged") is False,
         "SOURCE_NOT_PRIVATE_OR_APPROVAL_CHANGED")
    game=doc.get("fixture",{})
    need(type(game.get("htoGameId")) is int and game["htoGameId"]>0 and
         re.fullmatch(r"20\d{2}-\d{2}-\d{2}",game.get("date","")) and
         re.fullmatch(r"\d{2}:\d{2}",game.get("timeToronto","")) and
         game.get("opponent") and game.get("rink") and
         game.get("svhlScheduleProof")=="MATCH_SOURCE_ADMITTED",
         "FIXTURE_NOT_SOURCE_BOUND")
    targets=doc.get("reviewTargets")
    need(isinstance(targets,list) and len(targets)<=4 and
         doc.get("allWatchCandidates",0)>=len(targets) and
         len({p.get("sourcePlayerId") for p in targets})==len(targets),
         "DUPLICATE_OR_OVERFLOW_TARGETS")
    lines=[
        "# Brave H.C. — Defensive game-night coach review",
        "",
        "**Source scope:** Official SVHL opponent player statistics; HTO governs "
        "Brave H.C. player records. Advisory only, not a published lineup.",
        "",
        f"**Fixture:** {plain(game['date'])} at {plain(game['timeToronto'])} "
        f"(Toronto) · {plain(game['opponent'])} · {plain(game['rink'])} "
        f"· HTO game {game['htoGameId']}",
        f"**Opponent source cutoff:** {plain(doc['sourceCutoff'])}",
        "",
        "**Base system remains unchanged:** Centre/F1 forces the carrier outside; "
        "strong winger denies inside passing lanes; weak winger protects the "
        "middle and far lane; defenders control slot and net front.",
        "",
        "## Source-ranked opponent attention",
        ""
    ]
    for index,player in enumerate(targets,1):
        need(type(player.get("sourcePlayerId")) is int and
             player["sourcePlayerId"]>0 and
             player.get("priority") in (
                 "SPECIAL_DEFENSIVE_ATTENTION_REVIEW","OPPONENT_WATCH_REVIEW") and
             player.get("proposedDefensiveResponsibility") in CUES and
             player.get("bravePlayerAssigned") is None and
             player.get("opponentConfirmedDressed") is False and
             player.get("coachApproved") is False and
             all(type(player.get(k)) is int and player[k]>=0
                 for k in ("reportedGP","reportedGoals","reportedAssists",
                           "reportedPoints")) and
             player["reportedGoals"]+player["reportedAssists"]==
             player["reportedPoints"],"UNVERIFIED_TARGET_OR_MATCHUP")
        cue=CUES[player["proposedDefensiveResponsibility"]]
        lines.extend([
            f"### {index}. {plain(player['nameAsPublished'])} "
            f"— {plain(player['priority']).replace('_',' ').title()}",
            f"**Published season:** {player['reportedGP']} GP · "
            f"{player['reportedGoals']} G · {player['reportedAssists']} A "
            f"· {player['reportedPoints']} PTS.",
            f"**Recent form:** {plain(player.get('formState') or 'UNKNOWN').replace('_',' ').title()}. "
            f"New reported GP: {player.get('newReportedGP') if player.get('newReportedGP') is not None else 'not available'}; "
            f"new reported points: {player.get('newReportedPoints') if player.get('newReportedPoints') is not None else 'not available'}.",
            "**Tactical responsibility to consider:** "+cue,
            "**Review before assigning:** Opponent dressed? [ ] · Brave H.C. "
            "attendance and role confirmed? [ ] · Coach approves specific matchup? [ ]",
            "No Brave H.C. player assigned by HockeyOS.",
            ""
        ])
    lines.extend([
        "## Coach decision controls",
        "",
        "- Confirm official opponent game-day appearance from evidence or warmups; "
        "a season GP number does not prove attendance this Sunday.",
        "- Confirm Brave H.C. full-timers and part-timers who are actually "
        "available, then verify positions and side suitability.",
        "- Assign named defenders only after the coach's explicit game-night "
        "decision. Any assignment remains separate from this automatic sheet.",
        "- Use observations or authorized video to evaluate shooting lanes, "
        "passing patterns, transition speed and support; scoring totals "
        "alone do not prove playing style.",
        "- Record whether the matchup was used and whether the outside-pressure/"
        "middle-protection system was executed.",
        "",
        "**Hold:** One-game scoring surges are watches, not confirmed sustained "
        "hot streaks. League season statistics and historical rates can be "
        "inaccurate, and no player availability, video evidence or outcome "
        "has been inferred.",
        ""
    ])
    return "\n".join(lines)

def main():
    a=ArgumentParser()
    a.add_argument("--input",type=Path,required=True)
    a.add_argument("--out",type=Path,required=True)
    args=a.parse_args()
    try:
        need(args.input.resolve()!=args.out.resolve() and
             args.out.parent.is_dir() and
             "widgets" not in [x.lower() for x in args.out.parts],
             "PRIVATE_OUTPUT_REQUIRED")
        document=json.loads(args.input.read_text("utf8"))
        output=render(document)
        need(not args.out.exists(),"NO_OVERWRITE_OF_REVIEW_SHEET")
        args.out.write_text(output,encoding="utf8")
        print(json.dumps({"status":"PRIVATE_COACH_SHEET_READY",
              "fixture":document["fixture"]["htoGameId"],
              "targets":len(document["reviewTargets"]),
              "assignedBravePlayers":0,"publicWritten":False,
              "output":str(args.out)}))
        return 0
    except (BriefHold,KeyError,TypeError,ValueError,OSError) as exc:
        print(json.dumps({"status":"HOLD","reason":str(exc)[:350]}),
              file=sys.stderr)
        return 2
if __name__=="__main__":
    sys.exit(main())
