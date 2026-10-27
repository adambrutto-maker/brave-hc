"""Read-only Sports Village game event reconciler by official gameId, playerId and teamId.

GameInfo goals are linked to official player IDs. Assists on GameInfo are
display-name strings and can be admitted only when an exact UNIQUE current-
season team roster match exists. A season roster does NOT show game attendance.
Only fully score-complete, reciprocal game sheets can be admitted as scoring
events; missing links and discrepancies are preserved, not silently corrected.

Output is private candidate: this command has NO Git or public write.
"""
from __future__ import annotations
from argparse import ArgumentParser
from collections import Counter,defaultdict
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from urllib.request import Request,urlopen
import json,re,sys,unicodedata
from collect_svhl_league_intelligence import get,url_team
from collect_svhl_roster_season_evidence import roster as parse_roster

SCHEMA="brave-hc-svhl-game-events/private-source-audit-v1"
ALLOW={570,547,531,512,494,476,420,375}
ADULT={"Fazzari Partners","The Cristillo Division","Remax Division"}
SCHEDULE_ID="ctl00_MainContent_ucTeamSchedules_GridViewTeamSchedule"
SCORE_ID=re.compile(r"^ctl00_MainContent_GridViewScoresPeriod([1234])$")
class EventHold(ValueError):pass
def need(ok,s):
 if not ok:raise EventHold("INDIVIDUAL_GAME_HOLD:"+s)
def fetch_game(url):
 u=urlparse(url)
 need(u.scheme=="https" and u.hostname=="leagues.sportsvillage.ca" and
      u.path.lower()=="/gameinfo.aspx" and
      parse_qs(u.query).get("leagueid",[""])[0].isdigit() and
      parse_qs(u.query).get("gameid",[""])[0].isdigit() and
      int(parse_qs(u.query)["leagueid"][0]) in ALLOW,
      "GAMEINFO_SOURCE_URL_NOT_ALLOWLISTED")
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 BraveHC-HockeyOS public-game-reconciliation-read-only"}),timeout=18) as resp:
  need(resp.status==200,"GAMEINFO_HTTP_"+str(resp.status))
  raw=resp.read(350001)
 need(0<len(raw)<=350000,"GAMEINFO_SOURCE_SIZE_HOLD")
 return raw.decode("utf8",errors="replace"),sha256(raw).hexdigest()
def url_game(lid,gid):
 need(lid in ALLOW and type(gid) is int and gid>0,"GAME_ID_NOT_ALLOWED")
 return f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={lid}&gameid={gid}&page_type=Adult"
def normalize(v):
 v=unicodedata.normalize("NFKD",str(v)).encode("ascii","ignore").decode().lower()
 return re.sub(r"[^a-z0-9]","",v)
def person_name(v):
 bits=[s.strip() for s in str(v).split(",",1)]
 return bits[1]+" "+bits[0] if len(bits)==2 else bits[0]
def fingerprint(v):
 return sha256(v.encode("utf8")).hexdigest()
class Tables(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.tables={};self.target=None;self.tr=None;self.td=None
  self.link=None
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=="table":
   ident=a.get("id","")
   if ident==SCHEDULE_ID or SCORE_ID.fullmatch(ident):
    need(self.target is None,"NESTED_EVIDENCE_TABLE")
    self.target=ident;self.tables[ident]=[]
  if self.target:
   if t=="tr":self.tr=[]
   if t in ("th","td") and self.tr is not None:self.td={"text":[],"links":[]}
   if t=="a" and self.td is not None:
    self.link={"href":a.get("href",""),"text":[]}
 def handle_data(self,v):
  if self.td is not None:self.td["text"].append(v)
  if self.link is not None:self.link["text"].append(v)
 def handle_endtag(self,t):
  if t=="a" and self.link is not None and self.td is not None:
   self.td["links"].append({"href":self.link["href"],
    "text":" ".join("".join(self.link["text"]).split())})
   self.link=None
  if t in ("th","td") and self.td is not None and self.tr is not None:
   self.td["text"]=" ".join("".join(self.td["text"]).split())
   self.tr.append(self.td);self.td=None
  if t=="tr" and self.tr is not None:
   if self.tr and self.target:self.tables[self.target].append(self.tr)
   self.tr=None
  if t=="table" and self.target and self.tr is None:self.target=None
def scoped_link(url,path,lid,identifier,team=None):
 u=urlparse(url.replace("&amp;","&"));q=parse_qs(u.query)
 need(u.path.lower().lstrip("/")==path and
      q.get("leagueid")==[str(lid)] and
      q.get(identifier) and len(q[identifier])==1 and
      q[identifier][0].isdigit() and
      (team is None or q.get("teamid")==[str(team)]),
      "SOURCE_URL_SCOPE_MISMATCH_"+path)
 return int(q[identifier][0])
def team_sheet(lid,team,html,sha):
 parsed=Tables();parsed.feed(html)
 rows=parsed.tables.get(SCHEDULE_ID)
 need(rows is not None and len(rows)>=2 and
      [x["text"] for x in rows[0]]==
      ["Date","Time","vs. Team","Home/Visitor","Score"],
      "TEAM_SCHEDULE_SCHEMA_CHANGED")
 fixtures=[]
 for cells in rows[1:]:
  need(len(cells)==5,"TEAM_SCHEDULE_CELLS_CHANGED")
  d,clock,other,side,score=[x["text"] for x in cells]
  # In this page, score has one canonical game-info hyperlink even for 0-0.
  gameLinks=[x for x in cells[4]["links"] if "gameinfo.aspx" in x["href"].lower()]
  oppLinks=[x for x in cells[2]["links"] if "teaminfo.aspx" in x["href"].lower()]
  need(len(gameLinks)==len(oppLinks)==1 and side in ("Home","Visitor"),
       "TEAM_SCHEDULE_LINKS_OR_SIDE_CHANGED")
  gid=scoped_link(gameLinks[0]["href"],"gameinfo.aspx",lid,"gameid")
  opp=scoped_link(oppLinks[0]["href"],"teaminfo.aspx",lid,"teamid")
  m=re.fullmatch(r"(\d+)\s*-\s*(\d+)",score)
  need(m is not None,"UNRECOGNIZED_SCORE")
  goals=[int(m.group(1)),int(m.group(2))]
  need(max(goals)<=40,"SCORE_SANITY_LIMIT")
  date=datetime.strptime(d,"%b %d, %Y").date().isoformat()
  dt=datetime.strptime(clock.upper(),"%I:%M%p").strftime("%H:%M")
  fixtures.append({"leagueId":lid,"gameId":gid,"teamId":team["sourceTeamId"],
   "opponentTeamId":opp,"side":side,"date":date,"time":dt,
   "homeGoals":goals[0],"visitorGoals":goals[1],
   "scoreStatus":"ZERO_ZERO_HOLD" if goals==[0,0] else "SOURCE_NONZERO",
   "teamPageHash":sha})
 count=Counter(f["gameId"] for f in fixtures)
 duplicate={gid for gid,v in count.items() if v>1}
 holds=[]
 for gid in duplicate:
  repeated=[f for f in fixtures if f["gameId"]==gid]
  need(all(x["scoreStatus"]=="ZERO_ZERO_HOLD" for x in repeated),
       "DUPLICATED_NONZERO_COMPLETED_TEAM_GAME_ID")
  holds.append({"leagueId":lid,"gameId":gid,
    "reason":"DUPLICATED_UNPLAYED_ZERO_ZERO_SCHEDULE_ID"})
 return [f for f in fixtures if f["gameId"] not in duplicate],holds
def season_games(lid,teams,fetch=get):
 need(lid in ALLOW and len(teams)>=2,"SOURCE_SEASON_TEAM_DIRECTORY_INVALID")
 byid={t["sourceTeamId"]:t for t in teams}
 need(len(byid)==len(teams),"DUPLICATE_TEAM_IDENTIFIER")
 def worker(t):
  html,sha=fetch(url_team(lid,t["sourceTeamId"]))
  fixt,held=team_sheet(lid,t,html,sha)
  players=parse_roster(lid,t,html,sha)
  return {"leagueId":lid,"sourceTeamId":t["sourceTeamId"],"name":t["name"],
   "division":t["division"],"sourceSHA256":sha,"players":players,
   "fixtures":fixt,"teamScheduleHolds":held}
 pages=[];holds=[]
 with ThreadPoolExecutor(max_workers=4) as pool:
  fut={pool.submit(worker,t):t for t in teams}
  for call in as_completed(fut):
   try:pages.append(call.result())
   except Exception as e:
    t=fut[call];holds.append({"teamId":t["sourceTeamId"],
      "reason":str(e)[:190]})
 need(not holds,"OFFICIAL_TEAM_PAGE_HOLD:"+json.dumps(holds[:5]))
 sources=defaultdict(list)
 for page in pages:
  for game in page["fixtures"]:
   sources[game["gameId"]].append(game)
 qualified=[];held=[h for page in pages for h in page["teamScheduleHolds"]]
 for gid,observations in sources.items():
  if len(observations)!=2:
   held.append({"leagueId":lid,"gameId":gid,"reason":"ONE_OR_MORE_TEAMS_OUTSIDE_SELECTED_SCOPE"})
   continue
  a,b=observations
  if a["scoreStatus"]=="ZERO_ZERO_HOLD" or b["scoreStatus"]=="ZERO_ZERO_HOLD":
   held.append({"leagueId":lid,"gameId":gid,"reason":"ZERO_ZERO_SCHEDULE_NOT_ACCEPTED_AS_FINAL"})
   continue
  if not (a["teamId"]==b["opponentTeamId"] and
    b["teamId"]==a["opponentTeamId"] and a["side"]!=b["side"] and
    a["date"]==b["date"] and a["time"]==b["time"] and
    (a["homeGoals"],a["visitorGoals"])==(b["homeGoals"],b["visitorGoals"])):
   held.append({"leagueId":lid,"gameId":gid,"reason":"RECIPROCAL_SCHEDULE_PARITY_FAILURE"})
   continue
  home=a if a["side"]=="Home" else b
  away=b if home is a else a
  qualified.append({"leagueId":lid,"gameId":gid,"date":a["date"],
   "homeId":home["teamId"],"awayId":away["teamId"],
   "homeGoals":home["homeGoals"],"awayGoals":home["visitorGoals"],
   "sourceTeamPages":[url_team(lid,a["teamId"]),url_team(lid,b["teamId"])],
   "teamPageSHA256":[a["teamPageHash"],b["teamPageHash"]]})
 qualified.sort(key=lambda x:x["gameId"])
 return {"leagueId":lid,"teams":pages,"qualified":qualified,
         "held":held,"scheduleGameLinks":len(sources)}
def official_game(lid,game,html,sha,rosters):
 parsed=Tables();parsed.feed(html)
 need(re.fullmatch(r"[0-9a-f]{64}",sha) is not None and
      all("ctl00_MainContent_GridViewScoresPeriod"+str(i) in parsed.tables
          for i in range(1,5)),"GAMEINFO_SCORING_TABLES_MISSING")
 ids={game["homeId"],game["awayId"]}
 # exact normalized surname/given order within SAME season-team roster ONLY
 nameLookup={}
 for tid in ids:
  lookup=defaultdict(list)
  for p in rosters[tid]:
   lookup[normalize(person_name(p["name"]))].append(p["playerId"])
  nameLookup[tid]=lookup
 events=[];holds=[]
 for period in range(1,5):
  rows=parsed.tables["ctl00_MainContent_GridViewScoresPeriod"+str(period)]
  need(rows and [c["text"] for c in rows[0]]==
       ["Period "+("OT" if period==4 else str(period)),
        "Player / Team","Assist"],"GAME_SCORING_TABLE_HEADER_CHANGED")
  for ordinal,cells in enumerate(rows[1:],1):
   need(len(cells)==3 and cells[0]["text"],"SCORING_EVENT_CELLS_INVALID")
   links=cells[1]["links"]
   scorerLinks=[p for p in links if "playerinfo.aspx" in p["href"].lower()]
   teamLinks=[p for p in links if "teaminfo.aspx" in p["href"].lower()]
   if len(scorerLinks)!=1 or len(teamLinks)!=1:
    holds.append({"period":period,"ordinal":ordinal,
      "reason":"GOAL_SCORER_PLAYER_OR_TEAM_LINK_MISSING"});continue
   tid=scoped_link(teamLinks[0]["href"],"teaminfo.aspx",lid,"teamid")
   pid=scoped_link(scorerLinks[0]["href"],"playerinfo.aspx",lid,"playerid",tid)
   if tid not in ids:raise EventHold("GAME_SCORER_OUTSIDE_RECIPROCAL_TEAMS")
   rosterIDSet={p["playerId"] for p in rosters[tid]}
   if pid not in rosterIDSet:
    holds.append({"period":period,"ordinal":ordinal,
      "reason":"GOAL_PLAYER_ID_NOT_LISTED_ON_VERIFIED_TEAM_ROSTER"});continue
   rawAssists=[n.strip() for n in cells[2]["text"].split(",") if n.strip()]
   if len(rawAssists)>2:
    holds.append({"period":period,"ordinal":ordinal,
      "reason":"MORE_THAN_TWO_ASSISTS_UNSUPPORTED",
      "assistNames":rawAssists});continue
   aids=[];ambiguous=[]
   for n in rawAssists:
    match=nameLookup[tid].get(normalize(n),[])
    if len(match)!=1 or match[0]==pid or match[0] in aids:
     ambiguous.append(n)
    else:aids.append(match[0])
   events.append({"period":period,"ordinal":ordinal,"time":cells[0]["text"],
    "sourceTeamId":tid,"sourcePlayerId":pid,
    "scorerName":scorerLinks[0]["text"],"assistNames":rawAssists,
    "admittedAssistPlayerIds":aids,
    "assistResolution":"EXACT_UNIQUE_OFFICIAL_TEAM_ROSTER_NAME" if not ambiguous else
      "AMBIGUOUS_NAME_HOLD","unresolvedAssistNames":ambiguous})
 expected={game["homeId"]:game["homeGoals"],game["awayId"]:game["awayGoals"]}
 observed=Counter(e["sourceTeamId"] for e in events)
 full=not holds and all(observed.get(tid,0)==count for tid,count in expected.items())
 status=("FULL_GAME_GOAL_EVENTS_SCORE_PARITY" if full else
         "PARTIAL_GAME_SCORING_NOT_A_SEASON_TOTAL")
 return {"leagueId":lid,"gameId":game["gameId"],"date":game["date"],
  "homeId":game["homeId"],"awayId":game["awayId"],
  "homeGoals":game["homeGoals"],"awayGoals":game["awayGoals"],
  "pageSHA256":sha,"source":url_game(lid,game["gameId"]),
  "status":status,"expectedTeamGoals":{str(k):v for k,v in expected.items()},
  "sourceLinkedTeamGoalCounts":{str(k):observed.get(k,0) for k in expected},
  "events":events,"heldEvents":holds,
  "unresolvedAssistCount":sum(len(e["unresolvedAssistNames"]) for e in events)}
def collect_games(lid,season,fetch=fetch_game):
 candidates=season["qualified"];rosters={t["sourceTeamId"]:t["players"]
    for t in season["teams"]}
 evidence=[];hold=[]
 def worker(g):
  html,sha=fetch(url_game(lid,g["gameId"]))
  return official_game(lid,g,html,sha,rosters)
 with ThreadPoolExecutor(max_workers=6) as pool:
  fut={pool.submit(worker,g):g for g in candidates}
  for call in as_completed(fut):
   try:evidence.append(call.result())
   except Exception as err:
    g=fut[call];hold.append({"gameId":g["gameId"],
      "reason":str(err)[:250]})
 evidence.sort(key=lambda g:g["gameId"])
 return evidence,hold
def directory(league,archive,roster,lids):
 from collect_svhl_historical_standings import validate as validate_archive
 validate_archive(archive)
 need(league["schema"]=="brave-hc-league-intelligence/public-v1" and
   league["currentSourceDataConcordant"] is True and
   roster["schema"]=="brave-hc-public-svhl-roster-seasons/v1" and
   len(set(lids))==len(lids) and all(lid in ALLOW for lid in lids),
   "ADMITTED_SOURCE_OR_LEAGUES_INVALID")
 out={}
 for lid in lids:
  if lid==570:
   team=[{"sourceTeamId":t["sourceTeamId"],"name":t["leagueName"],
      "division":t["divisionNow"]}
     for t in league["teams"] if t["divisionNow"] in ADULT]
  else:
   seasons=[s for s in archive["seasons"] if s["leagueId"]==lid]
   need(len(seasons)==1,"HISTORICAL_SEASON_NOT_IN_ARCHIVE")
   team=[{"sourceTeamId":t["seasonTeamId"],"name":t["name"],
      "division":division["name"]}
     for division in seasons[0]["divisions"]
     if division["category"]=="COMPETITIVE_SUNDAY_DIVISION" and
        division["name"]!="VAHL Division"
     for t in division["teams"]]
  need(len(team)>=12,"TEAM_DIRECTORY_TOO_SMALL")
  out[lid]=team
 return out
def main():
 ap=ArgumentParser()
 for flag in ("--league","--archive","--roster","--out"):ap.add_argument(flag,required=True)
 ap.add_argument("--lids",default="570,547")
 args=ap.parse_args()
 try:
  ids=[int(x) for x in args.lids.split(",")]
  load=lambda x:json.loads(Path(x).read_text(encoding="utf8"))
  dirs=directory(load(args.league),load(args.archive),load(args.roster),ids)
  report={"schema":SCHEMA,"status":"PRIVATE_GAME_EVENTS_AUDIT_NOT_SEASON_ADMISSION",
   "capturedUTC":datetime.now(timezone.utc).isoformat(),
   "leagues":ids,"years":[],"individualGameProofOnly":True,
   "seasonGPNotDeterminedByGoalSheets":True,
   "sourcePlayerNamesNotAcceptedWithoutUniqueOfficialID":True,
   "seasonAggregateNotOverwritten":True,"workbookWritten":False}
  for lid in ids:
   season=season_games(lid,dirs[lid])
   games,holds=collect_games(lid,season)
   report["years"].append({"leagueId":lid,
    "teams":len(season["teams"]),"sourceFixtureGameIds":season["scheduleGameLinks"],
    "reciprocalCompletedGames":len(season["qualified"]),
    "scheduleHeldGames":season["held"],"gamePageHolds":holds,
    "games":games,"sourceTeamRosters":[{"teamId":t["sourceTeamId"],"name":t["name"],
      "pageSHA256":t["sourceSHA256"],"rosterCount":len(t["players"]),
      "players":t["players"]} for t in season["teams"]]})
   print(json.dumps({"stage":"OFFICIAL_GAME_PAGES_CAPTURED","league":lid,
     "reciprocal":len(season["qualified"]),
     "sheets":len(games),"full":sum(g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY" for g in games),
     "pageHeld":len(holds),"scheduleHeld":len(season["held"])}),flush=True)
  path=Path(args.out);path.parent.mkdir(parents=True,exist_ok=True)
  temp=path.with_suffix(".tmp");temp.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
  temp.replace(path)
  print(json.dumps({"state":"PRIVATE_INDIVIDUAL_GAME_SOURCE_AUDIT_COMPLETE",
    "games":sum(len(x["games"]) for x in report["years"]),
    "fullScoringSheets":sum(sum(g["status"]=="FULL_GAME_GOAL_EVENTS_SCORE_PARITY" for g in x["games"]) for x in report["years"]),
    "publicWrites":False}))
  return 0
 except (EventHold,ValueError,KeyError,TypeError,OSError) as err:
  print(json.dumps({"state":"HOLD","reason":str(err)[:900],
   "publicWrites":False}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
