#!/usr/bin/env python3
"""Merge bounded read-only SVHL scorer/roster evidence receipts; never admit goals.

Each individual receipt is privately saved outside public widgets. This program
enforces source-game ID and captured-page lineage against the admitted public
137-game review index and produces a PRIVATE 39-game identity review snapshot.
"""
import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse,parse_qs

SOURCE_SCHEMA="brave-hc-svhl-official-scorer-roster-holds-private-review/v1"
REVIEW_SCHEMA="brave-hc-svhl-gameinfo-raw-source-holds-review/v1"
CATEGORY="RAW_SCORE_PARITY_WITH_SEASON_ROSTER_ID_HOLD"

def check(condition,reason):
    if not condition:raise ValueError("SCORER_RECEIPT_MERGE_HOLD:"+reason)

def url_identifiers(url):
    parsed=urlparse(url.replace("&amp;","&"))
    q=parse_qs(parsed.query)
    check(parsed.path.lower().lstrip("/")=="playerinfo.aspx" and
          parsed.scheme in ("","https") and
          parsed.netloc in ("","leagues.sportsvillage.ca") and
          all(len(q.get(k,[]))==1 and q[k][0].isdigit()
              for k in ("leagueid","teamid","playerid")),
          "UNQUALIFIED_OFFICIAL_SCORER_LINK")
    return tuple(int(q[k][0]) for k in ("leagueid","teamid","playerid"))

def merge(review,receipts):
    check(review.get("schema")==REVIEW_SCHEMA and review.get("gamePages")==137
          and review.get("reviewOnly") is True and
          review.get("publicStatsOrScoresChanged") is False
          and review.get("status")=="SOURCE_HASH_VERIFIED_AUTHOR_AUDIT_NOT_INDEPENDENTLY_ACCEPTED",
          "PUBLIC_GAME_REVIEW_SOURCE_UNQUALIFIED")
    held={(r["leagueId"],r["gameId"]):r for r in review["games"]
          if r["category"]==CATEGORY}
    check(len(held)==review["categories"].get(CATEGORY)==39,
          "SOURCE_ROSTER_GAME_COUNT_NOT_39")
    check(receipts and len(receipts)<=39,"UNBOUNDED_RECEIPT_COUNT")
    games=set()
    events=[]
    captured_cases={}
    expected_input_games=0
    for receipt in receipts:
        check(receipt.get("schema")==SOURCE_SCHEMA and
              receipt.get("scope")=="SVHL_ONLY_NOT_VAHL" and
              receipt.get("noPlayerAttendanceOrRegistrationInferred") is True and
              receipt.get("canonicalPlayerScoresWritten") is False and
              receipt.get("officialRosterWritten") is False and
              receipt.get("releaseEligible") is False and
              receipt.get("pageOrReplayHolds")==0 and not receipt.get("sourceHolds") and
              receipt.get("targetGames")==receipt.get("sourceVerifiedGames"),
              "PRIVATE_RECEIPT_UNQUALIFIED")
        new=receipt["sourceVerifiedGames"]
        expected_input_games+=new
        check(1<=new<=4 and
              len(receipt["perEventEvidence"])==receipt["unadmittedScorerEvents"],
              "BOUNDED_RECEIPT_GAME_OR_EVENT_COUNT")
        source_games={}
        for group in receipt["scorerReviewCases"]:
            lid,tid,pid=(group["leagueId"],group["sourceTeamId"],group["officialScorerPlayerId"])
            key=(lid,tid,pid)
            check(key not in source_games,"SOURCE_GROUP_DUPLICATED")
            source_games[key]=group
        check(len(source_games)==receipt["distinctSeasonTeamScorerCases"],
              "SOURCE_SCORER_GROUP_COUNT")
        this_games=set()
        for row in receipt["perEventEvidence"]:
            lid,gid=row["leagueId"],row["gameId"]
            key=(lid,gid)
            check(key in held and isinstance(row["officialPlayerId"],int)
                  and row["officialPlayerId"]>0 and
                  row["officialGoalTeamId"]>0 and
                  row["reason"]=="OFFICIAL_GOAL_SCORER_ID_ABSENT_SOURCE_SEASON_TEAM_ROSTER" and
                  row["registrationOrGameAttendanceProved"] is False and
                  row["rosterAndGoalsOverwritten"] is False,
                  "EVENT_NOT_HELD_OR_IDENTITY_UNQUALIFIED")
            actual_group=(lid,row["officialGoalTeamId"],row["officialPlayerId"])
            check(actual_group in source_games and
                  row["officialGoalTeamName"] in
                    (held[key]["homeTeam"],held[key]["awayTeam"]),
                  "SCORER_TEAM_OR_GROUP_NOT_SOURCE_MATCHED")
            check(url_identifiers(row["officialScorerLink"])==actual_group,
                  "SCORER_PROFILE_IDENTITY_MISMATCH")
            check(row["gameDate"]==held[key]["date"],
                  "SCORER_GAME_DATE_NOT_PINNED")
            check(held[key]["heldReasons"].get(
                  "GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER",0)>=1,
                  "GAME_NOT_ROSTER_ID_HOLD")
            this_games.add(key)
            record={**row,
                    "officialPageSHA256":held[key]["officialPageSHA256"],
                    "officialGameInfoURL":held[key]["officialGameInfoURL"],
                    "disposition":"INDEPENDENT_SOURCE_OWNER_EVIDENCE_REQUIRED"}
            events.append(record)
        check(len(this_games)==new and this_games.isdisjoint(games),
              "DUPLICATED_OR_INCOMPLETE_GAME_BATCH")
        games.update(this_games)
        for group_key,group in source_games.items():
            previous=captured_cases.get(group_key)
            if previous:
                check(previous["teamName"]==group["teamName"] and
                      previous["sourceDisplayName"]==group["sourceDisplayName"],
                      "CONFLICTING_SAME_SCORER_SOURCE_DISPLAY")
            else:
                captured_cases[group_key]={
                    "leagueId":group_key[0],"sourceTeamId":group_key[1],
                    "officialScorerPlayerId":group_key[2],
                    "teamName":group["teamName"],
                    "sourceDisplayName":group["sourceDisplayName"],
                    "sourceGames":[],
                    "otherSameSeasonTeamEvidence":group["otherSameSeasonTeamEvidence"],
                    "otherSeasonRosterEvidence":group["otherSeasonRosterEvidence"],
                    "reviewDecision":"PENDING_SOURCE_OWNER_REGISTRATION",
                    "acceptedForScoring":False}
    check(expected_input_games==len(games) and games==set(held),
          "NOT_ALL_39_SOURCE_GAMES_ACCOUNTED")
    per_game_counts=defaultdict(int)
    event_keys=set()
    for event in events:
        k=(event["leagueId"],event["gameId"],event["period"],event["ordinal"])
        check(k not in event_keys,"DUPLICATE_SOURCE_SCORING_EVENT")
        event_keys.add(k)
        per_game_counts[(event["leagueId"],event["gameId"])]+=1
        group=(event["leagueId"],event["officialGoalTeamId"],event["officialPlayerId"])
        captured_cases[group]["sourceGames"].append({
            "gameId":event["gameId"],"date":event["gameDate"],
            "period":event["period"],"ordinal":event["ordinal"],
            "sourceSHA256":event["officialPageSHA256"]})
    check(all(per_game_counts.get(key,0)==game["heldReasons"].get(
              "GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER",0)
              for key,game in held.items()),
          "SOURCE_GAME_ROSTER_HOLD_EVENT_COUNTS_NOT_EQUAL")
    check(all(v["sourceGames"] for v in captured_cases.values()),
          "EMPTY_SCORER_GROUP")
    cases=sorted(captured_cases.values(),key=lambda s:(
        -int(s["leagueId"]==570),-len(s["sourceGames"]),
        -s["leagueId"],s["sourceTeamId"],s["officialScorerPlayerId"]))
    return {
        "schema":SOURCE_SCHEMA,"scope":"SVHL_ONLY_NOT_VAHL",
        "status":"39_SOURCE_GAMES_REPLAYED_REGISTRATION_NOT_VERIFIED",
        "sourceGameReviewCaptureUTC":review["capturedUTC"],
        "targetGames":39,"sourceVerifiedGames":39,
        "pageOrReplayHolds":0,"sourceHolds":[],
        "unadmittedScorerEvents":len(events),
        "distinctSeasonTeamScorerCases":len(cases),
        "scorerReviewCases":cases,"perEventEvidence":events,
        "noPlayerAttendanceOrRegistrationInferred":True,
        "canonicalPlayerScoresWritten":False,"officialRosterWritten":False,
        "releaseEligible":False,
        "independentAcceptance":"PENDING_SOURCE_OWNER_AND_INDEPENDENT_QA",
        "notice":"Official GameInfo scorer links prove source attribution, not on-date roster registration or attendance. Never transfer these held events to accepted G/A without authorized human review."
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument("--receipts-dir",type=Path,required=True,
                   help="Private implementation directory with exact 11 batch receipts")
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--summary-csv",type=Path,help="Private 17-case source-owner review worksheet")
    args=p.parse_args()
    widgets=(args.repo/"widgets").resolve()
    check(not args.output.resolve().is_relative_to(widgets) and
          (args.summary_csv is None or not args.summary_csv.resolve().is_relative_to(widgets)),
          "PRIVATE_OUTPUT_CANNOT_BE_PUBLISHED_WIDGET")
    review=json.loads((widgets/"svhl-gameinfo-hold-review.json").read_text(encoding="utf-8"))
    filenames=["261027_ENG59_Roster_Exception_TwoGame_Probe_PRIVATE.json"]+[
        f"261027_ENG59_RosterPilot_Batch{i}_PRIVATE.json" for i in range(2,12)]
    docs=[json.loads((args.receipts_dir/name).read_text(encoding="utf-8"))
          for name in filenames]
    result=merge(review,docs)
    result["consolidatedUTC"]=datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",
                           encoding="utf-8")
    if args.summary_csv:
        args.summary_csv.parent.mkdir(parents=True,exist_ok=True)
        columns=["leagueId","sourceTeamId","officialScorerPlayerId","teamName",
                 "sourceDisplayName","heldScoringEvents","distinctGames","gameIds",
                 "otherArchivedSeasonRosterObservations","otherSameSeasonTeamEvidence",
                 "reviewDecision","sourceOwnerName","sourceOwnerDecisionDate",
                 "documentaryEvidenceReference","independentReviewer","finalDisposition"]
        with args.summary_csv.open("w",encoding="utf-8-sig",newline="") as f:
            writer=csv.DictWriter(f,fieldnames=columns);writer.writeheader()
            for case in result["scorerReviewCases"]:
                entry={k:case.get(k,"") for k in columns}
                entry.update({"heldScoringEvents":len(case["sourceGames"]),
                              "distinctGames":len(set(x["gameId"] for x in case["sourceGames"])),
                              "gameIds":",".join(str(x) for x in sorted(set(g["gameId"] for g in case["sourceGames"]))),
                              "otherArchivedSeasonRosterObservations":len(case["otherSeasonRosterEvidence"]),
                              "otherSameSeasonTeamEvidence":len(case["otherSameSeasonTeamEvidence"]),
                              "sourceOwnerName":"","sourceOwnerDecisionDate":"",
                              "documentaryEvidenceReference":"","independentReviewer":"",
                              "finalDisposition":""})
                writer.writerow(entry)
    print(json.dumps({k:result[k] for k in
       ("status","targetGames","sourceVerifiedGames","unadmittedScorerEvents",
        "distinctSeasonTeamScorerCases","releaseEligible")}))
if __name__=="__main__":main()
