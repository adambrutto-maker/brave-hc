"""Append-only, evidence-qualified league context trends.

One observation per source-backed material change, NOT per scheduler run.
The initial baseline is the last accepted public snapshot; no earlier score
history is reconstructed from unqualified captures. Future team/league
changes may shift opposition context even without new games for this team.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone
import re
SCHEMA="brave-hc-svhl-context-trend-ledger/v1"
SCOPE="ACCEPTED_PUBLIC_SNAPSHOT_CHANGES_NOT_PREDICTED_FORM"
RECORD=("gp","w","l","t","pts","gf","ga")
MAX_POINTS=120
class TrendHold(ValueError):pass
def need(ok,msg):
 if not ok:raise TrendHold("TREND_HOLD:"+msg)
def timestamp(value):
 try:dt=datetime.fromisoformat(value.replace("Z","+00:00"))
 except (ValueError,AttributeError,TypeError) as err:raise TrendHold("TREND_HOLD:INVALID_TIMESTAMP") from err
 need(dt.tzinfo is not None,"UNZONED_TIMESTAMP")
 return dt.astimezone(timezone.utc)
def assert_source(doc):
 need(doc.get("schema")=="brave-hc-league-intelligence/public-v1" and
      doc.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
      doc.get("currentSourceDataConcordant") is True and
      doc.get("leagueId")==570 and
      doc.get("strengthModel",{}).get("schema")=="svhl-schedule-adjusted-context/v1",
      "NOT_A_QUALIFIED_CONTEXT_SOURCE")
 timestamp(doc.get("asOf"))
 need(isinstance(doc.get("sourceSHA256"),str) and
      re.fullmatch(r"[0-9a-f]{64}",doc["sourceSHA256"]) is not None,
      "SOURCE_FINGERPRINT_MISSING")
 teams=doc.get("teams",[])
 need(isinstance(teams,list) and len({t["sourceTeamId"] for t in teams})==len(teams),
      "SOURCE_TEAM_IDS_NOT_UNIQUE")
 return teams
def point(doc,team):
 record=team["record"];score=team["strengthContext"]
 need(all(type(record.get(k)) is int and record[k]>=0 for k in RECORD) and
      record["gp"]==record["w"]+record["l"]+record["t"] and
      record["pts"]==2*record["w"]+record["t"],"RECORD_NOT_QUALIFIED")
 need(score.get("completedGames")==record["gp"],"SCORE_GAMES_DIVERGE")
 return {"observedAtUTC":doc["asOf"],"sourceSHA256":doc["sourceSHA256"],
         "divisionNow":team["divisionNow"],
         "record":{k:record[k] for k in RECORD},
         "contextIndex":score["contextIndex"],
         "currentForm":score["currentForm"],
         "scheduleDifficulty":score["scheduleDifficulty"],
         "priorWinterForm":score["priorWinterForm"],
         "rank":score["rank"],"confidence":score["confidence"],
         "weights":deepcopy(score["weights"])}
def material(p):
 return {k:v for k,v in p.items() if k not in ("observedAtUTC","sourceSHA256")}
def validate(doc):
 teams=assert_source(doc)
 ledger=doc.get("trendLedger")
 need(isinstance(ledger,dict) and ledger.get("schema")==SCHEMA and
      ledger.get("sourceScope")==SCOPE and ledger.get("leagueId")==570 and
      ledger.get("latestSnapshotUTC")==doc["asOf"],"LEDGER_SCHEMA_OR_SCOPE_INVALID")
 groups=ledger.get("teams")
 need(isinstance(groups,list) and len(groups)<=100 and
      len({g.get("sourceTeamId") for g in groups})==len(groups),
      "LEDGER_TEAM_IDS_DUPLICATE")
 known={t["sourceTeamId"]:t for t in teams}
 seen=set();count=0
 for group in groups:
  tid=group.get("sourceTeamId")
  need(type(tid) is int and isinstance(group.get("leagueName"),str) and
       bool(group["leagueName"]),"LEDGER_TEAM_ID_INVALID")
  observations=group.get("observations")
  need(isinstance(observations,list) and 1<=len(observations)<=MAX_POINTS,
       "LEDGER_POINTS_MISSING_OR_CAP_EXCEEDED")
  old=None
  for item in observations:
   need(type(item) is dict and isinstance(item.get("sourceSHA256"),str) and
        re.fullmatch(r"[0-9a-f]{64}",item["sourceSHA256"]) is not None and
        isinstance(item.get("divisionNow"),str),"POINT_PROVENANCE_INVALID")
   dt=timestamp(item.get("observedAtUTC"))
   need(dt<=timestamp(doc["asOf"]) and (old is None or dt>timestamp(old["observedAtUTC"])),
        "POINT_CHRONOLOGY_INVALID")
   rec=item.get("record",{})
   need(type(rec) is dict and all(type(rec.get(k)) is int and rec[k]>=0 for k in RECORD) and
        rec["gp"]==rec["w"]+rec["l"]+rec["t"] and rec["pts"]==2*rec["w"]+rec["t"],
        "POINT_RECORD_INVALID")
   for field in ("contextIndex","currentForm","scheduleDifficulty","priorWinterForm"):
    score=item.get(field)
    need(score is None or (type(score) in (int,float) and 0<=score<=100),
         "POINT_INDEX_INVALID")
   need(item.get("rank") is None or
        (type(item["rank"]) is int and item["rank"]>=1),"POINT_RANK_INVALID")
   need(item.get("confidence") in ("EARLY_SAMPLE","LIMITED_SAMPLE",
        "LARGER_SAMPLE","NO_CURRENT_GAMES"),"POINT_CONFIDENCE_INVALID")
   need(item.get("weights") is None or (type(item["weights"]) is dict and
        set(item["weights"])=={"currentForm","scheduleDifficulty","previousWinterForm"} and
        abs(sum(item["weights"].values())-1)<1e-8),"POINT_WEIGHTS_INVALID")
   if old is not None:
    earlier=old["record"]
    need(all(rec[k]>=earlier[k] for k in RECORD),"VERIFIED_TEAM_RECORD_REGRESSED")
    need(material(old)!=material(item),"DUPLICATE_UNCHANGED_OBSERVATION")
   old=item
  count+=len(observations)
  if tid in known:
   team=known[tid]
   need(group["leagueName"]==team["leagueName"],"TEAM_ID_REASSIGNED")
   need(material(observations[-1])==material(point(doc,team)),
        "LATEST_POINT_DOES_NOT_MATCH_PUBLISHED_TEAM")
   seen.add(tid)
 need(seen==set(known),"CURRENT_TEAM_TREND_MISSING")
 need(ledger.get("observationsRecorded")==count and
      ledger.get("materialChangesRecorded")==count-len(groups) and
      ledger.get("trackedTeams")==len(groups),"TREND_COUNT_MISMATCH")
 return True
def enrich(previous,current):
 old_teams=assert_source(previous);new_teams=assert_source(current)
 need(timestamp(current["asOf"])>=timestamp(previous["asOf"]),
      "BACKDATED_SNAPSHOT")
 old_ledger=previous.get("trendLedger")
 if old_ledger is None:
  # Only the immediately preceding accepted public snapshot is historical evidence.
  groups=[{"sourceTeamId":t["sourceTeamId"],"leagueName":t["leagueName"],
           "observations":[point(previous,t)]} for t in old_teams]
 else:
  validate(previous)
  groups=deepcopy(old_ledger["teams"])
 byid={g["sourceTeamId"]:g for g in groups}
 for team in new_teams:
  tid=team["sourceTeamId"];latest=point(current,team)
  if tid not in byid:
   group={"sourceTeamId":tid,"leagueName":team["leagueName"],
          "observations":[latest]}
   groups.append(group);byid[tid]=group
  else:
   group=byid[tid]
   need(group["leagueName"]==team["leagueName"],"SAME_ID_CHANGED_NAME")
   observations=group["observations"]
   if material(observations[-1])!=material(latest):
    need(timestamp(latest["observedAtUTC"])>timestamp(observations[-1]["observedAtUTC"]),
         "DIFFERENT_STATE_SAME_TIMESTAMP")
    need(len(observations)<MAX_POINTS,"POINT_CAPACITY_REVIEW_REQUIRED")
    observations.append(latest)
 ledger={"schema":SCHEMA,"sourceScope":SCOPE,"leagueId":570,
         "latestSnapshotUTC":current["asOf"],
         "teams":groups,"trackedTeams":len(groups),
         "observationsRecorded":sum(len(g["observations"]) for g in groups),
         "materialChangesRecorded":sum(len(g["observations"])-1 for g in groups),
         "baselineNote":"First point is the accepted public source at tracking adoption; no inferred earlier scores. Unchanged refreshes add no points."}
 result=deepcopy(current);result["trendLedger"]=ledger
 validate(result)
 return result

