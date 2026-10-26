"""Independent public-only validation for published SVHL all-division results."""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime,timezone,timedelta
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import json,argparse,sys
class ReleaseHold(ValueError):pass
def need(cond,msg):
 if not cond:raise ReleaseHold(msg)
def verify(data,accepted=None,fresh=False,now=None):
 now=now or datetime.now(timezone.utc)
 need(data.get("schema")=="brave-hc-league-intelligence/public-v1" and
      data.get("status")=="OFFICIAL_LEAGUE_RESULTS_SOURCE_QUALIFIED" and
      data.get("currentSourceDataConcordant") is True and
      data.get("originalWorkbookWritten") is False,
      "PUBLIC_LEAGUE_SOURCE_SCHEMA_OR_PROVENANCE_REGRESSED")
 need(data.get("leagueId")==570 and data.get("previousLeagueId")==547 and
      data.get("season")=="Sunday Winter 2026/27" and
      data.get("currentDivisionCount")==4 and
      data.get("allPublishedDivisions")==5,
      "UNEXPECTED_LEAGUE_YEAR_OR_DIVISION_COVERAGE")
 ts=datetime.fromisoformat(data["asOf"].replace("Z","+00:00"))
 need(ts.tzinfo is not None and ts<=now+timedelta(minutes=15),
      "PUBLIC_LEAGUE_SOURCE_TIMESTAMP_MALFORMED_OR_FUTURE")
 if fresh:
  need(now-ts<=timedelta(days=3),"PUBLIC_ALL_DIVISION_SOURCE_STALE")
 teams=data.get("teams",[])
 need(isinstance(teams,list) and len(teams)==data.get("currentLeagueTeamCount") and
      20<=len(teams)<=45 and
      len({t.get("sourceTeamId") for t in teams})==len(teams) and
      len({t.get("leagueName") for t in teams})==len(teams),
      "DUPLICATE_OR_MISSING_CURRENT_TEAM")
 divs=data.get("divisions",[])
 need(isinstance(divs,list) and len(divs)==5 and
      len({x["name"] for x in divs})==5 and
      sum(bool(x["competitive"]) for x in divs)==4 and
      sum(len(x["teams"]) for x in divs)==len(teams),
      "ALL_SVHL_DIVISIONS_NOT_SOURCE_QUALIFIED")
 byname={t["leagueName"]:t for t in teams}
 for division in divs:
  for name in division["teams"]:
   need(name in byname and byname[name]["divisionNow"]==division["name"],
        "TEAM_MEMBERSHIP_OR_DIVISION_KEY_UNVERIFIED_"+name)
 pair=defaultdict(list)
 for t in teams:
  r=t.get("record",{});games=t.get("completedGames",[])
  requireKeys=("gp","w","l","t","pts","gf","ga")
  need(all(type(r.get(k)) is int and r[k]>=0 for k in requireKeys) and
       r["gp"]==r["w"]+r["l"]+r["t"] and
       r["pts"]==2*r["w"]+r["t"] and
       len(games)==r["gp"]==t.get("gamesConfirmed") and
       r["gf"]==sum(g["gf"] for g in games) and
       r["ga"]==sum(g["ga"] for g in games),
       "TEAM_STANDINGS_RECIPROCAL_GAME_PARITY_FAILED_"+t["leagueName"])
  url=urlparse(t.get("source",""));q=parse_qs(url.query)
  need(url.scheme=="https" and url.hostname=="leagues.sportsvillage.ca" and
       url.path=="/TeamInfo.aspx" and q.get("leagueid")==["570"] and
       q.get("teamid")==[str(t["sourceTeamId"])],
       "OFFICIAL_TEAM_SOURCE_URL_CHANGED_"+t["leagueName"])
  for g in games:
   other=g.get("opponent")
   need(other in byname and other!=t["leagueName"] and
        g.get("opponentCurrentDivision")==byname[other]["divisionNow"] and
        g.get("result") in ("W","L","T") and
        type(g.get("gf")) is int and type(g.get("ga")) is int and
        g["gf"]+g["ga"]>0 and g["gf"]>=0 and g["ga"]>=0,
        "TEAM_FIXTURE_OPPONENT_OR_SCORE_UNVERIFIED_"+t["leagueName"])
   name=tuple(sorted((t["leagueName"],other)))
   pair[(g["date"],name)].append((t["leagueName"],g))
  previous=t.get("previousWinter")
  if previous is not None:
   need(previous.get("association")=="ROSTER_ID_CONTINUITY_CONFIRMED" and
        previous.get("officialRosterSharedIDs",0)>=3 and
        previous.get("rosterContinuityShare",0)>=.25 and
        previous.get("record",{}).get("gp",0)>0,
        "CROSS_SEASON_ROSTER_IDENTITY_NOT_VERIFIED_"+t["leagueName"])
  if t["leagueName"]=="Braves HC":
   need(t["displayName"]=="Brave H.C." and
        t["bravesMatchHistory"]["state"]=="SELF_TEAM_NOT_APPLICABLE",
        "SOURCE_CANONICAL_BRAVES_NAME_REGRESSED")
 for event,entries in pair.items():
  need(len(entries)==2 and len({x[0] for x in entries})==2 and
       entries[0][1]["gf"]==entries[1][1]["ga"] and
       entries[0][1]["ga"]==entries[1][1]["gf"] and
       (entries[0][1]["result"],entries[1][1]["result"]) in
       (("W","L"),("L","W"),("T","T")),
       "UNPAIRED_OR_DIVERGENT_OFFICIAL_SVHL_GAME_"+str(event))
 need(len(pair)==data.get("verifiedReciprocalCompletedGames") and
      sum(t["previousWinter"] is not None for t in teams)==
       data.get("priorSeasonRosterContinuityQualifiedCount") and
      data.get("unverifiedZeroZeroScheduleSlots",0)>=0,
      "LEAGUE_TOTALS_OR_ROSTER_CONTINUITY_COUNT_DRIFT")
 if accepted:
  acceptedTeams={x["name"]:x for x in accepted["teams"]}
  for name,source in acceptedTeams.items():
   if name not in byname:continue
   h=byname[name]["bravesMatchHistory"]
   if source.get("verification")!="NO_EXACT_HISTORY":
    need(h.get("state")=="SOURCE_VERIFIED_H2H" and
         h.get("bravesAllTime")==source.get("allTime"),
         "HISTORICAL_BRAVES_CANONICAL_MATCHUP_DRIFT_"+name)
 need("playerIDs" not in json.dumps(data) and
      "D:\\\\" not in json.dumps(data),
      "PRIVATE_PLAYER_ORIGINAL_MASTER_INFORMATION_LEAK")
 return {"status":"SVHL_ALL_DIVISIONS_PUBLIC_PARITY_PASS","teams":len(teams),
         "divisions":len(divs),"pairedGames":len(pair),
         "priorRosterQualified":data["priorSeasonRosterContinuityQualifiedCount"]}
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--source",default=str(Path(__file__).resolve().parents[1]/"widgets"/"league-intelligence.json"))
 p.add_argument("--accepted-opponent",default=str(Path(__file__).resolve().parents[1]/"widgets"/"opponent-intelligence.json"))
 p.add_argument("--fresh",action="store_true")
 a=p.parse_args()
 try:
  v=verify(json.loads(Path(a.source).read_text(encoding="utf8")),
    json.loads(Path(a.accepted_opponent).read_text(encoding="utf8")),fresh=a.fresh)
  print(json.dumps(v));return 0
 except (ReleaseHold,KeyError,ValueError,TypeError,OSError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e),"sourceUnmodified":True}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
