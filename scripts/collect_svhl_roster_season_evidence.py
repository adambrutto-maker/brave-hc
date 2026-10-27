"""Read-only Sports Village public player-roster evidence by exact league season/team ID.

The source has known inaccuracies; do NOT reinterpret career sums as verified
game events, infer who is on the next game lineup, or join players by name.
Only linked official playerID numbers can connect roster-season observations.
"""
from __future__ import annotations
from html.parser import HTMLParser
from urllib.parse import urlparse,parse_qs
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from pathlib import Path
from collections import defaultdict
import argparse,json,re,sys,hashlib
from collect_svhl_league_intelligence import get,url_team

SCHEMA="brave-hc-public-svhl-roster-seasons/v1"
ALLOWLEAGUES=(570,547,531,512,494,476,420,375)
DIVISIONS=("Fazzari Partners","The Cristillo Division","Remax Division")
TABLE=re.compile(r'(?is)<table\b(?=[^>]*\bid="ctl00_MainContent_ucTeamRosters_GridViewPlayers")[^>]*>(.*?)</table>')
class RosterHold(ValueError): pass
def need(b,why):
 if not b:raise RosterHold("PUBLIC_ROSTER_HOLD:"+why)
class Grid(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.rows=[];self.row=None;self.cell=None;self.links=[];self.link=None
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=="tr":self.row=[]
  if t in ("th","td") and self.row is not None:self.cell=[]
  if t=="a" and self.cell is not None:self.link=a.get("href")
 def handle_data(self,v):
  if self.cell is not None:self.cell.append(v)
 def handle_endtag(self,t):
  if t in ("th","td") and self.row is not None and self.cell is not None:
   self.row.append(" ".join("".join(self.cell).split()))
   self.cell=None
  if t=="tr" and self.row is not None:
   if self.row:self.rows.append(self.row)
   self.row=None
 def handle_startendtag(self,t,attrs):pass
def roster(league,team,html,sha):
 need(league in ALLOWLEAGUES and team.get("sourceTeamId") and
      team.get("name") and isinstance(sha,str) and re.fullmatch("[0-9a-f]{64}",sha),
      "TEAM_SOURCE_NOT_ALLOWED")
 table=TABLE.search(html)
 need(table is not None,"OFFICIAL_ROSTER_TABLE_MISSING")
 grid=Grid();grid.feed("<table>"+table.group(1)+"</table>")
 need(grid.rows and [x.upper() for x in grid.rows[0]]==
      ["#","NAME","POS","GP","G","A","PTS","PIM"],"ROSTER_HEADER_CHANGED")
 source=team["sourceTeamId"]
 entries=[];seen=set()
 for row in grid.rows[1:]:
  need(len(row)==8 and row[1] and re.fullmatch(r"\d+",row[3]) is not None,
       "ROSTER_ROW_SHAPE_CHANGED")
  # Extract official profile URLs only from the parsed, source-scoped roster
  # table fragment; do not infer player IDs from display names.
  # The roster rendering preserves players' order.
  entries.append(row)
 matches=re.findall(r'(?is)<a\b[^>]*href="([^"]*playerinfo\.aspx[^"]*)"[^>]*>\s*([^<]+?)\s*</a>',table.group(1))
 need(len(matches)==len(entries),"PLAYER_URL_COUNT_OR_HEADER_MISMATCH")
 result=[]
 for row,(href,anchor) in zip(entries,matches):
  u=urlparse(href.replace("&amp;","&"));q=parse_qs(u.query)
  need(u.path.lower().lstrip("/")=="playerinfo.aspx" and
       q.get("leagueid")==[str(league)] and
       q.get("teamid")==[str(source)] and len(q.get("playerid",[]))==1 and
       q["playerid"][0].isdigit(),"PLAYER_ID_NOT_SOURCE_QUALIFIED")
  pid=int(q["playerid"][0])
  need(pid>0 and pid not in seen,"DUPLICATE_TEAM_SEASON_PLAYER")
  seen.add(pid)
  name=" ".join(anchor.split())
  need(name==row[1],"PLAYER_NAME_ANCHOR_DISAGREEMENT")
  try:gp,g,a,pts,pim=map(int,row[3:])
  except ValueError as e:raise RosterHold("PUBLIC_ROSTER_HOLD:STATS_NOT_NUMERIC") from e
  need(all(0<=n<=2000 for n in (gp,g,a,pts,pim)),"STATS_OUTSIDE_ALLOWED_RANGE")
  issues=[]
  if g+a!=pts:issues.append("SOURCE_POINTS_DO_NOT_EQUAL_GOALS_PLUS_ASSISTS")
  if gp==0 and (g or a or pts):issues.append("STATS_REPORTED_WITH_ZERO_GAMES")
  pos=row[2].strip()
  result.append({"playerId":pid,"name":name,"jersey":row[0],
   "positionAsPublished":pos if pos not in (""," ","-") else None,
   "gp":gp,"g":g,"a":a,"pts":pts,"pim":pim,
   "statStatus":"SOURCE_CONFLICT_HOLD" if issues else "PUBLISHED_ARITHMETICALLY_CONSISTENT",
   "statWarnings":issues,
   "profileUrl":f"https://leagues.sportsvillage.ca/playerinfo.aspx?leagueid={league}&teamid={source}&playerid={pid}&page_type=Adult"})
 return result
def build(index,fetch=get,now=None,work_limit=4):
 need(index.get("schema")=="brave-hc-svhl-historical-divisions/v1" and
      index.get("status")=="OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED" and
      len(index.get("seasons",[]))>=7,"ARCHIVE_NOT_QUALIFIED")
 from collect_svhl_historical_standings import validate as validate_archive
 validate_archive(index)
 # Do not scrape VAHL or noncompetitive/placeholder divisions. Current
 # 2026/27 team roster page source IDs are independently admitted live.
 jobs=[]
 for season in index["seasons"]:
  for div in season["divisions"]:
   if div["category"]!="COMPETITIVE_SUNDAY_DIVISION" or div["name"]=="VAHL Division":continue
   for t in div["teams"]:
    need(type(t["seasonTeamId"]) is int and t["seasonTeamId"]>0,
      "HISTORICAL_TEAM_ID_NOT_PUBLIC")
    jobs.append({"leagueId":season["leagueId"],"season":season["season"],
       "sourceTeamId":t["seasonTeamId"],"name":t["name"],"division":div["name"]})
 return jobs
def collect(jobs,fetch=get):
 results=[];errors=[]
 def worker(t):
  html,sha=fetch(url_team(t["leagueId"],t["sourceTeamId"]))
  players=roster(t["leagueId"],t,html,sha)
  return {**t,"sourceUrl":url_team(t["leagueId"],t["sourceTeamId"]),
   "sourceSHA256":sha,"players":players,
   "rosterCount":len(players),
   "scoringRowsQualified":sum(p["statStatus"]=="PUBLISHED_ARITHMETICALLY_CONSISTENT" for p in players)}
 with ThreadPoolExecutor(max_workers=4) as pool:
  fut={pool.submit(worker,t):t for t in jobs}
  for task in as_completed(fut):
   try:results.append(task.result())
   except Exception as e:
    t=fut[task];errors.append({"season":t["season"],"leagueId":t["leagueId"],
       "teamId":t["sourceTeamId"],"reason":str(e)[:200]})
 results.sort(key=lambda t:(t["leagueId"],t["division"],t["name"]))
 return results,errors
def assemble(current,jobs,source):
 now=datetime.now(timezone.utc).isoformat()
 present={t["sourceTeamId"]:t for t in current["teams"] if
          t["divisionNow"] in DIVISIONS}
 need(len(present)==22,"CURRENT_ADULT_TEAM_ID_COUNT_CHANGED")
 current_entries=[t for t in source if t["leagueId"]==570]
 archival=[t for t in source if t["leagueId"]!=570]
 need({t["sourceTeamId"] for t in current_entries}==set(present),
      "CURRENT_ROSTER_TEAM_COVERAGE_INCOMPLETE")
 need(len({(t["leagueId"],t["sourceTeamId"]) for t in source})==len(source),
      "DUPLICATE_ROSTER_SEASON_TEAM")
 # Identify players strictly by their official source playerID, not by
 # human display names. Current team and prior season team distinct sources.
 byYear=defaultdict(list)
 for entry in archival:
  for p in entry["players"]:
   byYear[(entry["leagueId"],p["playerId"])].append((entry,p))
 result=[]
 for t in current_entries:
  analysis=[]
  for p in t["players"]:
   prior=[]
   for lid in (547,531,512,494,476,420,375):
    for entry,old in byYear[(lid,p["playerId"])]:
     prior.append({"leagueId":lid,"season":entry["season"],
       "teamName":entry["name"],"sourceTeamId":entry["sourceTeamId"],
       "division":entry["division"],"gp":old["gp"],"g":old["g"],"a":old["a"],
       "pts":old["pts"],"warnings":old["statWarnings"],
       "statStatus":old["statStatus"],"source":old["profileUrl"]})
   reliable=[x for x in prior if x["statStatus"]=="PUBLISHED_ARITHMETICALLY_CONSISTENT" and x["gp"]>0]
   gp=sum(x["gp"] for x in reliable);points=sum(x["pts"] for x in reliable)
   analysis.append({**p,"previousOfficialObservations":prior,
     "previousQualifiedSeasons":len({x["leagueId"] for x in reliable}),
     "previousQualifiedGP":gp,"previousQualifiedPoints":points,
     "historicalPointsPerGame":round(points/gp,3) if gp else None,
     "historicalContextOnly":True,
     "lineupPresenceNotVerified":True})
  valid=[x for x in analysis if x["statStatus"]=="PUBLISHED_ARITHMETICALLY_CONSISTENT"]
  active=[x for x in valid if x["gp"]>0]
  source_points=sum(x["pts"] for x in active)
  scored=sorted(active,key=lambda x:(-x["pts"],-x["g"],-x["gp"],x["name"]))
  # Top two points producers identify scoring concentration, not a position.
  contrib=sum(x["pts"] for x in scored[:2])/source_points if source_points else None
  result.append({**{k:t[k] for k in ("leagueId","season","sourceTeamId","name","division",
     "sourceUrl","sourceSHA256","rosterCount","scoringRowsQualified")},
    "observedSkatersWithGP":len(active),"publishedRosterPoints":source_points,
    "twoPlayerPointsShare":round(contrib,3) if contrib is not None else None,
    "scoringLeaderSourceIds":[x["playerId"] for x in scored[:3]],
    "sourcePlayerWarnings":sum(x["statStatus"]!="PUBLISHED_ARITHMETICALLY_CONSISTENT" for x in analysis),
    "players":analysis})
 report={"schema":SCHEMA,"status":"SOURCE_LINKED_OFFICIAL_ROSTER_SEASON_OBSERVATIONS",
  "asOf":now,"sourceLeagueId":570,"sourceLeagueAsOf":current["asOf"],
  "historicalLeagueIds":[547,531,512,494,476,420,375],
  "sourceArchiveSeasonTeamEntries":len(archival),
  "currentTeams":len(result),
  "sourceHistoricalTeamsRead":len(archival),
  "playerSeasonObservations":sum(len(t["players"]) for t in source),
  "currentPlayerObservations":sum(len(t["players"]) for t in result),
  "teams":result,
  "identityBasis":"EXACT_OFFICIAL_PLAYER_ID_PER_ROSTER_SEASON_NOT_NAMES",
  "statTreatment":"PUBLISHED_COUNT_DATA_NOT_RECONCILED_TO_INDIVIDUAL_GAME_LOGS",
  "lineupAvailability":"NOT_VERIFIED_BY_SEASON_ROSTER",
  "sourceWarnings":"Historical league site statistics may contain reporting mistakes. Distinguish source arithmetic from player identity proof and upcoming-game availability. No scouting grade is automatically a projected outcome.",
  "originalWorkbookWritten":False,
  "playerPrivacy":"PUBLIC_SPORTS_VILLAGE_PROFILE_STATS_ONLY_NO_PERSONAL_CONTACTS"}
 need(len(result)==22,"22_CURRENT_SOURCE_TEAMS_MISSING")
 return report
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--current",required=True);p.add_argument("--archive",required=True)
 p.add_argument("--out",required=True);p.add_argument("--limit",type=int,default=0)
 args=p.parse_args()
 try:
  current=json.loads(Path(args.current).read_text(encoding="utf8"))
  archive=json.loads(Path(args.archive).read_text(encoding="utf8"))
  from collect_svhl_historical_standings import validate as archive_check
  archive_check(archive)
  need(current.get("schema")=="brave-hc-league-intelligence/public-v1" and
     current.get("currentSourceDataConcordant") is True,"LIVE_SOURCE_INVALID")
  jobs=build(archive)
  # Include live 570 source roster pages; VAHL excluded by adult policy.
  jobs.extend({"leagueId":570,"season":"Sunday Winter 2026/27",
    "sourceTeamId":t["sourceTeamId"],"name":t["leagueName"],
    "division":t["divisionNow"]}
    for t in current["teams"] if t["divisionNow"] in DIVISIONS)
  if args.limit:jobs=jobs[:args.limit]
  pages,errors=collect(jobs)
  need(not errors,"SOURCE_ROSTER_PAGES_HELD:"+json.dumps(errors[:8]))
  report=assemble(current,jobs,pages)
  path=Path(args.out);path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  print(json.dumps({"state":"PUBLIC_SVHL_ROSTER_HISTORY_PASS","teams":report["currentTeams"],
    "historicalSourceTeams":report["sourceHistoricalTeamsRead"],
    "sourcePlayerSeasons":report["playerSeasonObservations"],
    "sourceWarnings":sum(t["sourcePlayerWarnings"] for t in report["teams"])}))
  return 0
 except (RosterHold,TypeError,ValueError,KeyError,OSError) as e:
  print(json.dumps({"state":"HOLD","reason":str(e)[:900],"publicNotWritten":True}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
