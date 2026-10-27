"""Independent source hash, 136 sampled GameInfo penalty-table coverage checker.

This does NOT certify zero penalties or reconcile any PIM or attendance.
"""
from argparse import ArgumentParser
from collections import Counter
from pathlib import Path
import json,re,sys
YEARS={570,547,531,512,494,476,420,375}
class CoverageHold(ValueError):pass
def need(test,msg):
 if not test:raise CoverageHold("PENALTY_TABLE_SOURCE_HOLD:"+msg)
def verify(sample,yearshards):
 need(sample.get("schema")=="brave-hc-svhl-penalty-table-source-coverage/v1" and
  sample.get("status")=="SAMPLED_PENALTY_TABLES_SOURCE_UNPOPULATED" and
  sample.get("penaltyGPVerified") is False and
  sample.get("seasonPIMReconciled") is False and
  sample.get("seasonGPReconciled") is False and
  sample.get("notExhaustive") is True and
  sample.get("coverage")=="DETERMINISTIC_17_GAMEINFO_SHEETS_PER_ADMITTED_LEAGUE_SEASON",
  "FALSE_COMPLETE_PENALTY_OR_ATTENDANCE_CLAIM")
 games=sample.get("games")
 need(len(sample.get("leagues",[]))==len(YEARS) and
  set(sample["leagues"])==YEARS and
  sample.get("gamesPerSeason")==17 and
  isinstance(games,list) and len(games)==sample.get("totalGamesSampled")==136 and
  sample.get("totalPopulatedPenaltyRows")==0,
  "SAMPLE_SIZE_OR_LEAGUE_SCOPE_CHANGED")
 counts=Counter();seen=set()
 for item in games:
  lid,gid=item["leagueId"],item["gameId"]
  need(lid in YEARS and type(gid) is int and gid>0 and
    (lid,gid) not in seen and item.get("periodTablesFound")==4 and
    item.get("populatedPenaltyRows")==0 and
    item.get("sourceHeaderLabel")=="Player / Team | Assist" and
    re.fullmatch(r"[a-f0-9]{64}",item.get("sourcePageSHA256","")) is not None and
    item["source"]==f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={lid}&gameid={gid}&page_type=Adult",
    "OFFICIAL_SOURCE_GAMEINFO_URL_HASH_OR_TABLES_UNQUALIFIED")
  seen.add((lid,gid));counts[lid]+=1
 for lid in YEARS:
  year=yearshards[lid]
  need(year["leagueId"]==lid and
    year["schema"]=="brave-hc-svhl-season-individual-game-evidence/v1",
    "GAME_YEAR_SOURCE_NOT_ACCEPTED")
  played=year["games"];step=max(1,len(played)//17)
  expected={g["gameId"] for g in played[::step][:17]}
  recorded={gid for league,gid in seen if league==lid}
  need(counts[lid]==17 and expected==recorded,
    "DETERMINISTIC_SOURCE_GAMEID_SAMPLE_CHANGED")
 return {"status":"PENALTY_TABLE_SAMPLE_PROVENANCE_PASS",
   "sampledGameInfoPages":136,"sourceSeasons":8,
   "populatedPenaltyRowsInSample":0,
   "gameAttendanceReconciled":False,
   "penaltyMinutesReconciled":False,
   "limitation":"Empty sampled period tables do not prove the source recorded zero penalties."}
def main():
 p=ArgumentParser()
 p.add_argument("--widgets",default=str(Path(__file__).resolve().parents[1]/"widgets"))
 a=p.parse_args()
 try:
  folder=Path(a.widgets)
  sample=json.loads((folder/"svhl-penalty-source-coverage.json").read_text(encoding="utf8"))
  years={lid:json.loads((folder/("svhl-player-game-"+str(lid)+".json")).read_text(encoding="utf8"))
    for lid in YEARS}
  print(json.dumps(verify(sample,years)));return 0
 except (CoverageHold,TypeError,KeyError,ValueError,OSError) as e:
  print(json.dumps({"status":"HOLD","reason":str(e)[:800]}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())