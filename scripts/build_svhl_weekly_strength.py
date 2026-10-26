"""Weekly league-strength observation ledger, separate from material-change trend log.

One documented observation per Toronto-local calendar week; the *current*
week is updated to its newest source-accepted state on each daily run.
Completed earlier weeks are frozen, not rewritten. Weekly reporting is a
source-observed index, not a predictive probability or a verified franchise tier.
"""
from __future__ import annotations
from datetime import datetime,timezone,timedelta
from zoneinfo import ZoneInfo
from copy import deepcopy
import re
SCHEMA="brave-hc-svhl-weekly-context/v1"
ZONE="America/Toronto"
class WeeklyHold(ValueError):pass
def need(ok,msg):
 if not ok:raise WeeklyHold("WEEKLY_CONTEXT_HOLD:"+msg)
def time(s):
 try:v=datetime.fromisoformat(s.replace("Z","+00:00"))
 except (ValueError,TypeError,AttributeError) as e:raise WeeklyHold("WEEKLY_CONTEXT_HOLD:INVALID_ASOF") from e
 need(v.tzinfo is not None,"UNZONED_TIME")
 return v.astimezone(timezone.utc)
def monday(iso):
 local=time(iso).astimezone(ZoneInfo(ZONE)).date()
 return (local-timedelta(days=local.weekday())).isoformat()
def snapshot(doc):
 teams=[]
 for t in doc["teams"]:
  r=t["record"];s=t["strengthContext"]
  need(type(t["sourceTeamId"]) is int and type(r["gp"]) is int and
       type(s["completedGames"]) is int and s["completedGames"]==r["gp"],
       "TEAM_WEEKLY_SCOPE_INVALID")
  teams.append({"sourceTeamId":t["sourceTeamId"],"leagueName":t["leagueName"],
                "divisionNow":t["divisionNow"],
                "gp":r["gp"],"w":r["w"],"l":r["l"],"t":r["t"],
                "gf":r["gf"],"ga":r["ga"],
                "contextIndex":s["contextIndex"],"rank":s["rank"],
                "confidence":s["confidence"],"currentForm":s["currentForm"],
                "scheduleDifficulty":s["scheduleDifficulty"],
                "qualifiedPriorWinterUsed":s["priorWinterForm"] is not None})
 return {"weekStartToronto":monday(doc["asOf"]),"observedAtUTC":doc["asOf"],
         "sourceSHA256":doc["sourceSHA256"],"teams":teams}
def validate(doc,require_current_week=False):
 led=doc.get("weeklyLedger")
 need(isinstance(led,dict) and led.get("schema")==SCHEMA and
      led.get("timeZone")==ZONE and led.get("method")==
      "LATEST_ACCEPTED_SOURCE_OBSERVATION_PER_TORONTO_WEEK" and
      led.get("notWinProbabilities") is True,"WEEKLY_SCHEMA_INVALID")
 weeks=led.get("weeks")
 need(isinstance(weeks,list) and 1<=len(weeks)<=160 and
      len(weeks)==led.get("weeksRecorded"),"WEEKLY_COUNT_INVALID")
 past=None
 seen=set()
 for point in weeks:
  dt=time(point["observedAtUTC"])
  wk=point["weekStartToronto"]
  need(re.fullmatch(r"\d{4}-\d{2}-\d{2}",wk) is not None and
       wk==monday(point["observedAtUTC"]) and
       dt<=time(doc["asOf"]) and
       wk not in seen and (past is None or wk>past),"WEEKLY_CHRONOLOGY_BAD")
  seen.add(wk);past=wk
  need(re.fullmatch(r"[0-9a-f]{64}",point["sourceSHA256"]) is not None,
       "WEEKLY_SOURCE_HASH_MISSING")
  rows=point.get("teams")
  need(isinstance(rows,list) and len(rows)<=50 and
       len({x["sourceTeamId"] for x in rows})==len(rows),
       "WEEKLY_TEAM_ROWS_DUPLICATE")
  for r in rows:
   need(type(r["sourceTeamId"]) is int and
        all(type(r[k]) is int and r[k]>=0 for k in ("gp","w","l","t","gf","ga")) and
        r["gp"]==r["w"]+r["l"]+r["t"] and
        (r["contextIndex"] is None or
         type(r["contextIndex"]) in (int,float) and 0<=r["contextIndex"]<=100) and
        r["confidence"] in ("EARLY_SAMPLE","LIMITED_SAMPLE","LARGER_SAMPLE","NO_CURRENT_GAMES"),
        "WEEKLY_TEAM_SCOPE_INVALID")
 if require_current_week:
  need(weeks[-1]==snapshot(doc),"LATEST_WEEK_MUST_MATCH_ACCEPTED_LEAGUE_SOURCE")
 return True
def enrich(previous,current):
 need(current.get("schema")=="brave-hc-league-intelligence/public-v1" and
      current.get("currentSourceDataConcordant") is True and
      current.get("strengthModel",{}).get("type")=="DESCRIPTIVE_NOT_PREDICTIVE",
      "PUBLIC_LEAGUE_CONTEXT_NOT_QUALIFIED")
 point=snapshot(current)
 old=previous.get("weeklyLedger")
 if old is None:weeks=[snapshot(previous)]
 else:
  validate(previous)
  weeks=deepcopy(old["weeks"])
 oldwk=weeks[-1]["weekStartToronto"]
 newwk=point["weekStartToronto"]
 need(newwk>=oldwk and
      time(point["observedAtUTC"])>=time(weeks[-1]["observedAtUTC"]),
      "BACKDATED_WEEKLY_SOURCE")
 if newwk==oldwk:weeks[-1]=point
 else:
  need(len(weeks)<160,"WEEK_CAPACITY_REVIEW_REQUIRED")
  weeks.append(point)
 output=deepcopy(current)
 output["weeklyLedger"]={
  "schema":SCHEMA,"timeZone":ZONE,
  "method":"LATEST_ACCEPTED_SOURCE_OBSERVATION_PER_TORONTO_WEEK",
  "source":"Source-qualified SVHL current standings and context index",
  "notWinProbabilities":True,
  "weeksRecorded":len(weeks),"weeks":weeks,
  "note":"Each week is represented by its latest accepted source capture. Prior closed weeks are immutable. Weekly comparisons are descriptive, not official division assignments."}
 validate(output,True)
 return output
