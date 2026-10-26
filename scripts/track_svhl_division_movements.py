"""Append-only SVHL division-movement timeline and incoming-team profiles.

The first observation compares a pinned earlier Cristillo-only public standings
snapshot with the full later league standings; it cannot assert the previous
division of a newly admitted opponent. Later detections compare two FULL
official league snapshots by stable season team ID. Dates mean *observed
between these source captures*, not necessarily the league's effective date.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime
from pathlib import Path
import json
CRISTILLO="The Cristillo Division"
SCHEMA="brave-hc-svhl-division-movement-ledger/v1"
class MovementHold(ValueError):pass
def need(ok,reason):
 if not ok:raise MovementHold(reason)
def utc(s):
 try:v=datetime.fromisoformat(s.replace("Z","+00:00"))
 except (AttributeError,ValueError) as err:raise MovementHold("MOVEMENT_SOURCE_TIMESTAMP_BAD") from err
 need(v.tzinfo is not None,"MOVEMENT_SOURCE_TIMESTAMP_UNZONED")
 return v
def byid(data):
 teams=data.get("teams",[])
 need(len(teams)==len({x.get("sourceTeamId") for x in teams}),
      "DUPLICATED_SVHL_SEASON_TEAM_ID")
 return {x["sourceTeamId"]:x for x in teams}
def new_event(tid,name,fromdiv,todiv,previous_at,current_at,kind,provenance):
 return {"eventId":str(tid)+"|"+str(previous_at)+"|"+str(current_at)+"|"+str(fromdiv)+"|"+str(todiv),
         "sourceTeamId":tid,"leagueName":name,
         "fromDivision":fromdiv,"toDivision":todiv,
         "eventType":kind,"sourceBasis":provenance,
         "lastObservedAt":previous_at,"firstObservedAt":current_at,
         "effectiveDateNotVerified":True}
def assert_current_source(doc):
 need(doc.get("schema")=="brave-hc-league-intelligence/public-v1" and
      doc.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
      doc.get("currentSourceDataConcordant") is True and
      doc.get("leagueId")==570,"UNVERIFIED_LEAGUE_MOVEMENT_SOURCE")
 need(20<=len(doc.get("teams",[]))<=45,"LEAGUE_MOVEMENT_TEAM_COUNT_CHANGED")
 return byid(doc)
def profile(team,source_time):
 return {"sourceTeamId":team["sourceTeamId"],"leagueName":team["leagueName"],
   "displayName":team["displayName"],"divisionLastSeen":team["divisionNow"],
   "lastSeenUTC":source_time,"recordLastSeen":deepcopy(team["record"]),
   "completedGames":deepcopy(team["completedGames"]),
   "bravesMatchHistory":deepcopy(team["bravesMatchHistory"]),
   "previousWinter":deepcopy(team.get("previousWinter")),
   "source":team["source"]}
def incoming_report(team,event):
 p=profile(team,event["firstObservedAt"])
 return {"eventId":event["eventId"],"sourceTeamId":team["sourceTeamId"],
   "leagueName":team["leagueName"],"displayName":team["displayName"],
   "fromDivision":event["fromDivision"],
   "fromDivisionUnknown":event["fromDivision"] is None,
   "toDivision":CRISTILLO,
   "detectedBetween":{"lastObservedAt":event["lastObservedAt"],
                      "firstObservedAt":event["firstObservedAt"]},
   "currentRecordAtFirstDetection":deepcopy(team["record"]),
   "opponentsFacedAtFirstDetection":deepcopy(team["completedGames"]),
   "opponentDifficultyAtFirstDetection":team["opponentCurrentWinPctAverage"],
   "previousWinter":deepcopy(team.get("previousWinter")),
   "bravesHistoryAtFirstDetection":deepcopy(team["bravesMatchHistory"]),
   "source":team["source"],
   "isPrediction":False,
   "interpretation":"Source-supported context only. Previous league membership date is not inferred."}
def enrich(previous,current,baseline):
 old=assert_current_source(previous)
 new=assert_current_source(current)
 before=utc(previous["asOf"]);after=utc(current["asOf"])
 need(after>=before,"OLDER_LEAGUE_SNAPSHOT_CANNOT_REPLACE_NEWER")
 prior_ledger=previous.get("movementLedger")
 if prior_ledger is not None:
  need(prior_ledger.get("schema")==SCHEMA and
       isinstance(prior_ledger.get("events"),list) and
       isinstance(prior_ledger.get("incomingCristilloReports"),list) and
       isinstance(prior_ledger.get("previouslyTrackedTeams"),list),
       "PREVIOUS_MOVE_LEDGER_NOT_QUALIFIED")
  ledger=deepcopy(prior_ledger)
  recorded_ids={e["eventId"] for e in ledger["events"]}
  need(len(recorded_ids)==len(ledger["events"]),"PREVIOUS_MOVE_EVENT_DUPLICATED")
 else:
  ledger={"schema":SCHEMA,
    "sourceScope":"RECORDED_SVHL_TEAM_DIRECTORY_MEMBERSHIP_NOT_EFFECTIVE_DATES",
    "baseline":"cristillo-membership-20261026-baseline.json",
    "events":[],"incomingCristilloReports":[],
    "previouslyTrackedTeams":[],
    "changeState":"SOURCE_OBSERVATION_NOT_AN_OFFICIAL_RESCHEDULE_DATE"}
  recorded_ids=set()
  # Seed ONLY the known prior Cristillo membership captured in the earlier
  # published original league source. All other old divisions are UNKNOWN.
  need(baseline.get("schema")=="brave-hc-cristillo-membership-observation/v1" and
       baseline.get("sourceCommit")=="7ece75e" and
       baseline.get("sourceLeagueId")==570 and
       baseline.get("sourceDivision")==CRISTILLO and
       baseline.get("sourceScope")=="ONLY_CRISTILLO_MEMBER_LIST_AT_RECORDED_CAPTURE",
       "UNVERIFIED_HISTORICAL_CRISTILLO_BASELINE")
  baseline_at=baseline["observedAt"]
  need(utc(baseline_at)<=after,"BASELINE_NEWER_THAN_CANDIDATE")
  prior_names={x["officialSeasonTeamId"]:x["leagueName"] for x in baseline["teams"]}
  need(len(prior_names)==len(baseline["teams"])==8 and
       "Braves HC" in prior_names.values() and
       "Sugo Sundays" in prior_names.values() and
       "Maplewolves" not in prior_names.values(),
       "EARLIER_EIGHT_TEAM_MEMBERSHIP_CHANGED")
  for tid,name in sorted(prior_names.items()):
   if tid not in new:continue
   need(new[tid]["leagueName"]==name,
        "EARLIER_STABLE_SEASON_TEAM_ID_CHANGED")
   target=new[tid]["divisionNow"]
   if target!=CRISTILLO:
    event=new_event(tid,name,CRISTILLO,target,baseline_at,current["asOf"],
     "OBSERVED_EXIT_FROM_CRISTILLO","PINNED_EARLIER_CRISTILLO_ONLY_SNAPSHOT")
    ledger["events"].append(event);recorded_ids.add(event["eventId"])
  for tid,t in sorted(new.items()):
   if t["divisionNow"]==CRISTILLO and tid not in prior_names:
    event=new_event(tid,t["leagueName"],None,CRISTILLO,baseline_at,current["asOf"],
     "OBSERVED_ENTRY_TO_CRISTILLO","NOT_IN_EARLIER_CRISTILLO_ONLY_SNAPSHOT")
    ledger["events"].append(event);recorded_ids.add(event["eventId"])
    ledger["incomingCristilloReports"].append(incoming_report(t,event))
 # Any later full snapshot can attest named from/to divisions, not just
 # Cristillo. The same season team ID is required on both sides.
 if prior_ledger is not None and after>before:
  for tid in sorted(set(old)&set(new)):
   a,b=old[tid],new[tid]
   need(a["leagueName"]==b["leagueName"],"SAME_SVHL_TEAM_ID_CHANGED_NAME")
   if a["divisionNow"]==b["divisionNow"]:continue
   event=new_event(tid,b["leagueName"],a["divisionNow"],b["divisionNow"],
        previous["asOf"],current["asOf"],"OBSERVED_DIVISION_TRANSFER",
        "TWO_FULL_OFFICIAL_SVHL_LEAGUE_SNAPSHOTS")
   need(event["eventId"] not in recorded_ids,"DUPLICATE_DIVISION_CHANGE_EVENT")
   ledger["events"].append(event);recorded_ids.add(event["eventId"])
   if b["divisionNow"]==CRISTILLO:
    ledger["incomingCristilloReports"].append(incoming_report(b,event))
  for tid in sorted(set(old)-set(new)):
   old_team=old[tid]
   event=new_event(tid,old_team["leagueName"],old_team["divisionNow"],None,
       previous["asOf"],current["asOf"],"LEFT_CURRENT_LEAGUE_DIRECTORY",
       "TWO_FULL_OFFICIAL_SVHL_LEAGUE_SNAPSHOTS")
   need(event["eventId"] not in recorded_ids,"DUPLICATE_LEAGUE_DEPARTURE_EVENT")
   ledger["events"].append(event);recorded_ids.add(event["eventId"])
   ledger["previouslyTrackedTeams"].append(profile(old_team,previous["asOf"]))
  for tid in sorted(set(new)-set(old)):
   team=new[tid]
   event=new_event(tid,team["leagueName"],None,team["divisionNow"],
       previous["asOf"],current["asOf"],"ENTERED_CURRENT_LEAGUE_DIRECTORY",
       "TWO_FULL_OFFICIAL_SVHL_LEAGUE_SNAPSHOTS")
   need(event["eventId"] not in recorded_ids,"DUPLICATE_LEAGUE_ADMISSION_EVENT")
   ledger["events"].append(event);recorded_ids.add(event["eventId"])
   if team["divisionNow"]==CRISTILLO:
    ledger["incomingCristilloReports"].append(incoming_report(team,event))
 # Previously archived clubs may re-enter the league, but prior records are
 # kept as snapshots. Do not silently remove any historical game.
 need(len(ledger["events"])<=250 and len(ledger["incomingCristilloReports"])<=120
      and len(ledger["previouslyTrackedTeams"])<=75,
      "MOVEMENT_HISTORY_CAPACITY_REVIEW_REQUIRED")
 archived={p["sourceTeamId"] for p in ledger["previouslyTrackedTeams"]}
 need(len(archived)==len(ledger["previouslyTrackedTeams"]),
      "DUPLICATE_DEPARTED_TEAM_ARCHIVE")
 result=deepcopy(current)
 ledger["latestSnapshotUTC"]=current["asOf"]
 ledger["eventsRecorded"]=len(ledger["events"])
 ledger["incomingCristilloEventsRecorded"]=len(ledger["incomingCristilloReports"])
 ledger["departedTeamProfilesRetained"]=len(ledger["previouslyTrackedTeams"])
 result["movementLedger"]=ledger
 return result
def main():
 import argparse
 p=argparse.ArgumentParser()
 p.add_argument("--previous",required=True)
 p.add_argument("--current",required=True)
 p.add_argument("--baseline",required=True)
 p.add_argument("--out",required=True)
 a=p.parse_args()
 old=json.loads(Path(a.previous).read_text(encoding="utf8"))
 curr=json.loads(Path(a.current).read_text(encoding="utf8"))
 baseline=json.loads(Path(a.baseline).read_text(encoding="utf8"))
 result=enrich(old,curr,baseline)
 out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 print(json.dumps({"status":"MEMBERSHIP_HISTORY_SOURCE_QUALIFIED","movements":result["movementLedger"]["eventsRecorded"],
 "incomingCristillo":result["movementLedger"]["incomingCristilloEventsRecorded"],"departedRetained":result["movementLedger"]["departedTeamProfilesRetained"],"sourceRecordsUnchanged":True}))
if __name__=="__main__":main()
