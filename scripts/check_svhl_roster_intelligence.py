"""Independent public player-season roster proof check, no contact data or writes."""
from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import json,re,sys
ADULT={"Fazzari Partners","The Cristillo Division","Remax Division"}
ALLOWED={547,531,512,494,476,420,375}
class RosterSourceHold(ValueError):pass
def need(ok,why):
 if not ok:raise RosterSourceHold("PUBLIC_ROSTER_SOURCE_HOLD:"+why)
def verify(league,doc):
 need(league.get("schema")=="brave-hc-league-intelligence/public-v1" and
  league.get("currentSourceDataConcordant") is True and
  doc.get("schema")=="brave-hc-public-svhl-roster-seasons/v1" and
  doc.get("status")=="SOURCE_LINKED_OFFICIAL_ROSTER_SEASON_OBSERVATIONS" and
  doc.get("sourceLeagueId")==570 and
  doc.get("sourceLeagueAsOf")==league.get("asOf") and
  doc.get("identityBasis")=="EXACT_OFFICIAL_PLAYER_ID_PER_ROSTER_SEASON_NOT_NAMES" and
  doc.get("lineupAvailability")=="NOT_VERIFIED_BY_SEASON_ROSTER" and
  doc.get("statTreatment")=="PUBLISHED_COUNT_DATA_NOT_RECONCILED_TO_INDIVIDUAL_GAME_LOGS" and
  doc.get("playerPrivacy")=="PUBLIC_SPORTS_VILLAGE_PROFILE_STATS_ONLY_NO_PERSONAL_CONTACTS" and
  doc.get("originalWorkbookWritten") is False,
  "PUBLIC_SOURCE_BOUNDARY_INVALID")
 live={t["sourceTeamId"]:t for t in league["teams"] if t["divisionNow"] in ADULT}
 teams=doc.get("teams",[])
 need(len(live)==len(teams)==doc.get("currentTeams")==22 and
  len({t["sourceTeamId"] for t in teams})==22,"ADULT_CURRENT_TEAM_COVERAGE_BAD")
 manifest=doc.get("historicalRosterManifest",[])
 need(len(manifest)==doc.get("historicalManifestCount")==
  doc.get("sourceHistoricalTeamsRead")==191 and
  len({(t["leagueId"],t["sourceTeamId"]) for t in manifest})==len(manifest),
  "HISTORICAL_TEAM_PAGE_PROOF_MISSING")
 old={}
 for entry in manifest:
  lid,tid=entry["leagueId"],entry["sourceTeamId"]
  need(lid in ALLOWED and type(tid) is int and tid>0 and
    re.fullmatch(r"[0-9a-f]{64}",entry["sourceSHA256"]) is not None and
    entry["sourceUrl"]==
     f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid={lid}&teamid={tid}&page_type=Adult",
    "OLD_TEAM_PAGE_HOST_OR_HASH_BAD")
  old[(lid,tid)]=entry
 historicalObs=0;seenCurrentObs=0;held=0
 for team in teams:
  tid=team["sourceTeamId"]
  need(tid in live and team["name"]==live[tid]["leagueName"] and
   team["division"]==live[tid]["divisionNow"] and team["leagueId"]==570 and
   team["sourceUrl"]==
    f"https://leagues.sportsvillage.ca/TeamInfo.aspx?leagueid=570&teamid={tid}&page_type=Adult" and
   re.fullmatch(r"[0-9a-f]{64}",team["sourceSHA256"]) is not None and
   len(team["players"])==team["rosterCount"],"TEAM_IDENTITY_OR_SOURCE_BAD")
  seen=set()
  for p in team["players"]:
   pid=p["playerId"]
   need(type(pid) is int and pid>0 and pid not in seen and
    p["profileUrl"]==
     f"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid=570&teamid={tid}&playerid={pid}&page_type=Adult" and
    all(type(p[k]) is int and p[k]>=0 for k in ("gp","g","a","pts","pim")),
    "CURRENT_PLAYER_ID_OR_PROFILE_INVALID")
   seen.add(pid);seenCurrentObs+=1
   if p["statStatus"]=="PUBLISHED_ARITHMETICALLY_CONSISTENT":
    need(p["g"]+p["a"]==p["pts"],"PUBLISHED_PLAYER_POINT_PARITY_FAILED")
   else:need(p["statStatus"]=="SOURCE_CONFLICT_HOLD","INVALID_PLAYER_STAT_STATUS");held+=1
   for h in p["previousOfficialObservations"]:
    key=(h["leagueId"],h["sourceTeamId"])
    need(key in old and
     h["sourcePageSHA256"]==old[key]["sourceSHA256"] and
     h["source"]==
      f"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid={key[0]}&teamid={key[1]}&playerid={pid}&page_type=Adult" and
     h["statStatus"] in ("PUBLISHED_ARITHMETICALLY_CONSISTENT","SOURCE_CONFLICT_HOLD"),
     "HISTORICAL_ID_OR_TEAM_PAGE_HASH_INVALID")
    historicalObs+=1
 need(seenCurrentObs==doc.get("currentPlayerObservations") and
  doc.get("playerSeasonObservations",0)>=seenCurrentObs+historicalObs,
  "PLAYER_SOURCE_COUNTS_INVALID")
 return {"state":"PUBLIC_HISTORICAL_ROSTER_PLAYER_ID_PARITY_PASS",
   "teams":len(teams),"historicalTeamSources":len(manifest),
   "originalPlayerSeasonRows":doc["playerSeasonObservations"],
   "currentPlayers":seenCurrentObs,"historicalCurrentIDLinks":historicalObs,
   "unqualifiedCurrentRows":held}
def main():
 p=ArgumentParser()
 root=Path(__file__).resolve().parents[1]/"widgets"
 p.add_argument("--league",default=str(root/"league-intelligence.json"))
 p.add_argument("--roster",default=str(root/"svhl-roster-intelligence.json"))
 a=p.parse_args()
 try:
  read=lambda x:json.loads(Path(x).read_text(encoding="utf-8-sig"))
  print(json.dumps(verify(read(a.league),read(a.roster))))
  return 0
 except (RosterSourceHold,ValueError,TypeError,KeyError,OSError) as e:
  print(json.dumps({"state":"HOLD","reason":str(e)}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
