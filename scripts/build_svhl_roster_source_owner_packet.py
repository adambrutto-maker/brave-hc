#!/usr/bin/env python3
"""Read-only official SVHL scorer/roster discrepancy packet. No scorer admissions.

The public 137-game source review is the inventory of record. Source-linked
individual scorer identity is included only for the two independently re-read
pilot games in an external PRIVATE receipt. All other held cases stay unknown.
"""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse,parse_qs

SCHEMA="brave-hc-svhl-scorer-roster-source-owner-packet/v1"
CATEGORY="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"

def require(value,why):
    if not value:raise ValueError("SOURCE_OWNER_ROSTER_REVIEW_HOLD:"+why)

def compile_packet(review,private_pilot):
    require(review.get("schema")=="brave-hc-svhl-gameinfo-raw-source-holds-review/v1"
            and review.get("status")=="SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED"
            and review.get("reviewOnly") is True
            and review.get("gamePages")==137
            and review.get("publicStatsOrScoresChanged") is False,
            "PUBLIC_REVIEW_SOURCE_UNQUALIFIED")
    held=[x for x in review["games"] if x["category"]==CATEGORY]
    require(len(held)==review["categories"].get(CATEGORY)==39,
            "EXPECTED_39_SCORER_ROSTER_HOLDS")
    require(private_pilot.get("schema")=="brave-hc-svhl-official-scorer-roster-holds-private-review/v1"
            and private_pilot.get("sourceVerifiedGames")==2
            and private_pilot.get("pageOrReplayHolds")==0
            and private_pilot.get("targetGames")==2
            and private_pilot.get("noPlayerAttendanceOrRegistrationInferred") is True
            and private_pilot.get("canonicalPlayerScoresWritten") is False
            and private_pilot.get("officialRosterWritten") is False
            and private_pilot.get("releaseEligible") is False,
            "PILOT_NOT_QUALIFIED")
    records={(x["leagueId"],x["gameId"]):x for x in held}
    require(len(records)==39,"DUPLICATE_SOURCE_GAME")
    findings={}
    for f in private_pilot["perEventEvidence"]:
        key=(f.get("leagueId"),f.get("gameId"))
        require(key in records and records[key]["leagueId"]==570,
                "UNKNOWN_PILOT_CASE")
        require(key in records and key not in findings
                and f["officialPlayerId"]>0
                and f["officialGoalTeamId"]>0
                and f["reason"]=="OFFICIAL_GOAL_SCORER_ID_ABSENT_SOURCE_SEASON_TEAM_ROSTER"
                and f["registrationOrGameAttendanceProved"] is False
                and f["rosterAndGoalsOverwritten"] is False,
                "PILOT_SCORER_QUALIFICATION_INVALID")
        link=urlparse(f.get("officialScorerLink","").replace("&amp;","&"))
        link_query=parse_qs(link.query)
        require(link.path.lower().lstrip("/")=="playerinfo.aspx"
                and link.scheme in ("","https")
                and link.netloc in ("","leagues.sportsvillage.ca")
                and link_query.get("leagueid")==[str(key[0])]
                and link_query.get("teamid")==[str(f["officialGoalTeamId"])]
                and link_query.get("playerid")==[str(f["officialPlayerId"])]
                and f["officialGoalTeamName"] in
                  (records[key]["homeTeam"],records[key]["awayTeam"]),
                "PILOT_LINK_IDENTITY_OR_TEAM_MISMATCH")
        require(records[key]["heldReasons"].get(
                "GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER",0)>=1,
                "PILOT_HELD_REASONS_DIFFER")
        findings[key]=f
    require(len(findings)==2,"TWO_PILOT_GAMES_NOT_ACCOUNTED")
    source_cases=[]
    for key,g in sorted(records.items(),key=lambda x:(
            -x[0][0],x[1]["date"],x[0][1])):
        f=findings.get(key)
        source_cases.append({
            "leagueId":g["leagueId"],"gameId":g["gameId"],
            "date":g["date"],"homeTeam":g["homeTeam"],"awayTeam":g["awayTeam"],
            "publishedFinalScore":g["finalScore"],
            "rawGoalTableRows":g["rawScoringRows"],
            "qualifiedGoalEvents":g["rosterQualifiedEvents"],
            "officialGameInfoURL":g["officialGameInfoURL"],
            "archivedOfficialPageSHA256":g["officialPageSHA256"],
            "officialScorerId":f["officialPlayerId"] if f else None,
            "officialGoalTeamId":f["officialGoalTeamId"] if f else None,
            "officialScorerDisplay":f["scorerDisplayInGoalTable"] if f else None,
            "officialScorerProfileURL":("https://leagues.sportsvillage.ca/"+
              f["officialScorerLink"].lstrip("/") if f else None),
            "identifiedScorerStatus":(
                "EXACT_SOURCE_LINK_AND_ROSTER_GAP_VERIFIED_PRIVATE_PILOT"
                if f else "IDENTITY_NOT_YET_REPLAYED_FOR_THIS_GAME"),
            "sameSeasonOtherTeamMatches":f["sameSeasonOtherListedTeams"] if f else [],
            "historicalSourceIdOverlaps":f["otherArchivedSeasonRosterObservations"] if f else [],
            "reviewQuestions":[
                "Confirm the scorer's official player ID and game-day team identity from a source-owner record.",
                "Confirm the historical roster registration or an authorized guest/call-up exception for the game date.",
                "Record source owner, dated documentary reference and independently reviewed disposition.",
                "If insufficient, retain original game, roster and scoring holds."
            ],
            "reviewDecision":"OPEN_SOURCE_OWNER_REGISTRATION_VERIFICATION",
            "scoringAdmission":False,"publicPlayerStatisticsCorrected":False
        })
    return {
        "schema":SCHEMA,
        "status":"PRIVATE_SOURCE_OWNER_REVIEW_REQUIRED_NOT_SCORING_ACCEPTANCE",
        "sourceGameReviewCaptureUTC":review["capturedUTC"],
        "sourceScope":"OFFICIAL_SVHL_ONLY_VAHL_EXCLUDED",
        "totalRosterHoldGames":len(source_cases),
        "sourceIdentitiesReplayed":len(findings),
        "identityInvestigationPending":len(source_cases)-len(findings),
        "officialRosterAdmissionAuthorized":False,
        "canonicalScoringOrWorkbookModified":False,
        "humanApprovalAndIndependentQARequired":True,
        "cases":source_cases,
        "instructions":[
            "Only two current-season scorer identities have a complete private source-link pilot.",
            "Do not infer names, historical playing assignments or absent dates for the other games.",
            "Historical source roster omission does not establish roster misconduct, error, or player ineligibility.",
            "Independent evidence and human source-owner authority are necessary before accepting any correction."
        ]
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument("--pilot",type=Path,required=True)
    p.add_argument("--json-out",type=Path,required=True)
    p.add_argument("--csv-out",type=Path,required=True)
    args=p.parse_args()
    widgets=(args.repo/"widgets").resolve()
    for output in [args.json_out,args.csv_out]:
        require(not output.resolve().is_relative_to(widgets),
                "NO_PRIVATE_PILOT_IDENTITIES_IN_PUBLIC_WIDGET_DIRECTORY")
    review=json.loads((widgets/"svhl-gameinfo-hold-review.json").read_text(encoding="utf-8"))
    pilot=json.loads(args.pilot.read_text(encoding="utf-8"))
    packet=compile_packet(review,pilot)
    args.json_out.parent.mkdir(parents=True,exist_ok=True)
    args.json_out.write_text(json.dumps(packet,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    columns=["leagueId","gameId","date","homeTeam","awayTeam","publishedFinalScore",
             "rawGoalTableRows","qualifiedGoalEvents","officialScorerId",
             "officialGoalTeamId","officialScorerDisplay","identifiedScorerStatus",
             "officialGameInfoURL","archivedOfficialPageSHA256","reviewDecision"]
    with args.csv_out.open("w",encoding="utf-8-sig",newline="") as file:
        w=csv.DictWriter(file,fieldnames=columns);w.writeheader()
        for case in packet["cases"]:
            data={key:case[key] for key in columns}
            data["publishedFinalScore"]="-".join(map(str,data["publishedFinalScore"]))
            w.writerow(data)
    print(json.dumps({k:packet[k] for k in
        ["status","totalRosterHoldGames","sourceIdentitiesReplayed",
         "identityInvestigationPending","officialRosterAdmissionAuthorized"]}))

if __name__=="__main__":main()
