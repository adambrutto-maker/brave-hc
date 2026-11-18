"""LeagueOS V25: independent, read-only extraction of bounded public historical skater priors.
Source: verified local archive SQLite in read-only mode. Historical public player
IDs + season scoring facts are derived only for players appearing on qualified
current public team rosters. No names, personal information, raw archive or
private workbook sheets are exported. Full archive never enters GitHub.
"""
from __future__ import annotations
import argparse,collections,datetime,hashlib,json,os,re,sqlite3,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"widgets"
DEFAULT_ARCHIVE=Path(os.environ.get("LEAGUEOS_V25_PRIVATE_ARCHIVE_DB",""))
OUT=ROOT/"leagueos-player-history-priors-v25.json"
SCHEMA="bruttech-leagueos-historical-public-player-priors/v25"
CURRENT_IDS={567,568,569,570}
def need(x,s):
 if not x:raise ValueError("V25_SOURCE_HOLD: "+s)
def y(season):
 m=re.search(r"(20\d\d)",str(season))
 return int(m.group(1)) if m else 0
def valid(g):
 return all(isinstance(g[k],int) and g[k]>=0 for k in ("gp","goals","assists","points")) and g["gp"]>0 and g["goals"]+g["assists"]==g["points"]
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--archive",default=str(DEFAULT_ARCHIVE))
 p.add_argument("--output",default=str(OUT))
 args=p.parse_args()
 archive=Path(args.archive)
 need(archive.is_file() and archive.stat().st_size>10_000_000,"Required qualified source archive inaccessible")
 currentpath=ROOT/"leagueos-cross-night-player-bridge-v23.json"
 currentbytes=currentpath.read_bytes();current=json.loads(currentbytes)
 need(current["schema"]=="bruttech-leagueos-cross-night-public-player-bridge/v23" and
      current["counts"]["sourceTeams"]==96 and current["noPrivateContactInfo"] is True,
      "Current public roster source invalid")
 validteams=[t for t in current["teams"] if t["status"]=="PUBLIC_FACTS_QUALIFIED"]
 need(len(validteams)>=88,"Too many current public roster source holds")
 active={p["id"] for t in validteams for p in t["players"] if p["gp"]>0}
 need(len(active)>=800,"Current unique skater ID coverage is unexpectedly low")
 conn=sqlite3.connect(f"file:{archive.as_posix()}?mode=ro",uri=True)
 conn.row_factory=sqlite3.Row
 try:
  integrity=conn.execute("pragma quick_check").fetchone()[0]
  need(integrity=="ok","Archive SQLite quality failed")
  released=conn.execute("select release_id from scope_release limit 1").fetchone()
  need(released and released[0]=="W2011_12_AND_LATER_V1","Historic archive release not qualified")
  conflict={str(r[0]) for r in conn.execute("select player_id from player_identity_flags")}
  held={(r[0],r[1],str(r[2])) for r in conn.execute(
    "select league_id,team_id,player_id from roster_stat_quality_holds")}
  seasons={r["league_id"]:(r["night"],r["cycle"],r["season"]) for r in conn.execute(
    "select league_id,night,cycle,season from league_seasons")}
  division={(r["league_id"],r["source_team_id"]):r["division"] for r in conn.execute(
    "select league_id,source_team_id,division from division_standings")}
  rows=conn.execute("select league_id,team_id,player_id,gp,goals,assists,points,position from roster_skater_stats")
  byId=collections.defaultdict(list);heldRows=collections.Counter();included=0
  for row in rows:
   pid=str(row["player_id"])
   if pid not in active:continue
   if row["league_id"] in CURRENT_IDS:continue
   if pid in conflict:
    heldRows["PUBLISHED_PLAYER_IDENTITY_COLLISION"]+=1;continue
   if (row["league_id"],row["team_id"],pid) in held:
    heldRows["QUARANTINED_SKATER_ROW"]+=1;continue
   fact={"gp":row["gp"],"goals":row["goals"],"assists":row["assists"],"points":row["points"]}
   if not valid(fact):
    heldRows["INVALID_GP_OR_POINTS_ARITHMETIC"]+=1;continue
   meta=seasons.get(row["league_id"]);div=division.get((row["league_id"],row["team_id"]))
   if not meta or not div:
    heldRows["NO_LEAGUE_SEASON_OR_DIVISION"]+=1;continue
   night,cycle,season=meta
   if y(season)<2011 or night not in ("Sunday","Tuesday","Wednesday","Thursday","Friday"):
    heldRows["OUT_OF_ARCHIVE_SCOPE"]+=1;continue
   byId[pid].append({"leagueId":row["league_id"],"sourceTeamId":row["team_id"],
     "night":night,"season":season,"cycle":cycle,"division":div,"gp":fact["gp"],
     "g":fact["goals"],"a":fact["assists"],"pts":fact["points"]})
   included+=1
  result=[]
  for pid in sorted(active,key=int):
   history=sorted(byId.get(pid,[]),key=lambda x:(y(x["season"]),x["season"],x["leagueId"]),reverse=True)
   # Do not cherry-pick one night: retain the eight most recent source-qualified seasons across nights.
   selected=history[:8]
   totalGP=sum(q["gp"] for q in history)
   r3=[q for q in history if y(q["season"])>=2023]
   result.append({"playerId":pid,"historyRows":len(history),
    "historyGP":totalGP,
    "careerGoalRate":round(sum(q["g"] for q in history)/totalGP,4) if totalGP else None,
    "careerAssistRate":round(sum(q["a"] for q in history)/totalGP,4) if totalGP else None,
    "recent3YearGP":sum(q["gp"] for q in r3),
    "recent3YearGoalRate":round(sum(q["g"] for q in r3)/sum(q["gp"] for q in r3),4) if r3 else None,
    "recent3YearAssistRate":round(sum(q["a"] for q in r3)/sum(q["gp"] for q in r3),4) if r3 else None,
    "sourceDivisions":selected,
    "historyRateAdmitted":totalGP>0})
  withHistory=[x for x in result if x["historyRows"]]
  counts={"qualifiedCurrentTeamPages":len(validteams),"distinctCurrentPlayerIDs":len(active),
    "playerIDsWithPriorSourceSeasons":len(withHistory),
    "playerIDsWithoutPriorSourceSeasons":len(result)-len(withHistory),
    "totalAcceptedHistoricalStatRows":included,
    "identityConflictPlayerIDs":len(conflict),
    "excludedHistoryRowsByReason":dict(heldRows)}
  need(counts["totalAcceptedHistoricalStatRows"]>=900 and len(withHistory)>=300,
       "Insufficient verified archive prior coverage")
  archiveDigest=hashlib.sha256(archive.read_bytes()).hexdigest()
  doc={"schema":SCHEMA,"status":"SOURCE_QUALIFIED_HISTORIC_PUBLIC_FACTS",
    "asOfUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "sourceArchiveSHA256":archiveDigest,"sourceCurrentRosterSHA256":hashlib.sha256(currentbytes).hexdigest(),
    "scope":"CURRENT_EXACT_PUBLIC_PLAYER_IDS_ONLY_AFTER_W2011_12",
    "rawArchivePublished":False,"privateCoachWorkbookUsed":False,
    "noNamesAddressesAgesOrContactData":True,
    "identityPolicy":"Exact source player ID only; exclude source name-collision IDs and player stat quality holds.",
    "qualification":{"sourceArchiveRelease":"W2011_12_AND_LATER_V1",
     "sourceScoresNotSignedAttendance":True,"sourceDivisionLabelsNotOfficialABCD":True,
     "historyCannotProveEligibility":True,"historicalRecentSampleCap":8},
    "counts":counts,"players":result}
  dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
  dest.write_text(json.dumps(doc,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf-8")
  print(json.dumps({"state":"EXACT_PLAYER_ID_PRIORS_EXTRACTED", "counts":counts,
    "file":str(dest),"archiveSHA256":archiveDigest[:15],
    "privateDataPublished":False},ensure_ascii=False,indent=2))
 finally:conn.close()
if __name__=="__main__":
 try:main()
 except Exception as ex:
  print("V25_EXTRACTION_HOLD:",repr(ex),file=sys.stderr);sys.exit(2)
