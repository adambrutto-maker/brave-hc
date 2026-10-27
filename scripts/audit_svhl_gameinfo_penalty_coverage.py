"""Sample documented official GameInfo penalty table completeness, read-only.

Deterministic 17 game pages per published adult winter source season. Header-only
penalty tables do not prove zero penalties, zero PIM or full game attendance.
Writes only the requested research report after all pages pass source checks.
"""
from __future__ import annotations
from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request,urlopen
import json,re,sys
SCHEMA="brave-hc-svhl-penalty-table-source-coverage/v1"
YEARS=(570,547,531,512,494,476,420,375)
class SourceHold(ValueError):pass
def need(ok,reason):
 if not ok:raise SourceHold("OFFICIAL_PENALTY_SAMPLE_HOLD:"+reason)
class PenaltyTables(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.target=None;self.row=None;self.cells=None
  self.tables={}
 def handle_starttag(self,tag,attributes):
  a=dict(attributes)
  if tag=="table":
   found=re.fullmatch(r"ctl00_MainContent_GridViewPenaltiesPeriod([1234])",a.get("id",""))
   if found:
    need(self.target is None,"NESTED_PENALTY_TABLE")
    self.target=int(found.group(1))
    self.tables[self.target]=[]
  if tag=="tr" and self.target:self.row=[]
  if tag in ("td","th") and self.row is not None:self.cells=[]
 def handle_data(self,data):
  if self.cells is not None:self.cells.append(data)
 def handle_endtag(self,tag):
  if tag in ("td","th") and self.row is not None and self.cells is not None:
   self.row.append(" ".join("".join(self.cells).split()))
   self.cells=None
  if tag=="tr" and self.row is not None and self.target:
   if self.row:self.tables[self.target].append(self.row)
   self.row=None
  if tag=="table" and self.target is not None:self.target=None
def fetch_one(lid,game):
 gid=game["gameId"]
 need(game["leagueId"]==lid and type(gid) is int and gid>0 and
      game["source"]=="https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid="+
        str(lid)+"&gameid="+str(gid)+"&page_type=Adult",
      "UNQUALIFIED_OR_UNEXPECTED_GAME_URL")
 with urlopen(Request(game["source"],headers={
  "User-Agent":"Mozilla/5.0 BraveHC-SportsVillage-Source-Audit-read-only"
 }),timeout=20) as r:
  need(r.status==200,"GAMEINFO_HTTP_UNAVAILABLE")
  data=r.read(350001)
 need(0<len(data)<=350000,"GAMEINFO_SIZE_HOLD")
 tables=PenaltyTables()
 tables.feed(data.decode("utf-8","replace"))
 need(set(tables.tables)=={1,2,3,4},"PENALTY_PERIOD_SOURCE_TABLES_MISSING")
 for number,rows in tables.tables.items():
  need(rows and rows[0]==[
    "Period "+("OT" if number==4 else str(number)),
    "Player / Team","Assist"],"PENALTY_SOURCE_HEADER_CHANGED")
 populated=sum(len(rows)-1 for rows in tables.tables.values())
 return {"leagueId":lid,"gameId":gid,"source":game["source"],
  "sourcePageSHA256":sha256(data).hexdigest(),
  "periodTablesFound":4,"populatedPenaltyRows":populated,
  "sourceHeaderLabel":"Player / Team | Assist",
  "informationScope":"SCORING_STYLE_TEMPLATE_NOT_A_VERIFIED_PENALTY_EVENT"}
def collect(root):
 from threading import Lock
 samples=[]
 for lid in YEARS:
  path=root/("svhl-player-game-"+str(lid)+".json")
  year=json.loads(path.read_text(encoding="utf-8"))
  need(year["leagueId"]==lid and year["schema"]==
    "brave-hc-svhl-season-individual-game-evidence/v1" and
    year["summary"]["completedReciprocalGameSheets"]==len(year["games"]),
    "ADMITTED_GAME_YEAR_SOURCE_UNAVAILABLE")
  games=year["games"]
  step=max(1,len(games)//17)
  selected=games[::step][:17]
  need(len(selected)==17 and len({x["gameId"] for x in selected})==17,
    "DETERMINISTIC_SAMPLE_INCOMPLETE")
  samples.extend((lid,game) for game in selected)
 results=[];holds=[]
 with ThreadPoolExecutor(max_workers=6) as pool:
  jobs={pool.submit(fetch_one,lid,g):(lid,g["gameId"]) for lid,g in samples}
  for task in as_completed(jobs):
   try:results.append(task.result())
   except Exception as exc:
    lid,gid=jobs[task];holds.append({"leagueId":lid,"gameId":gid,
      "reason":str(exc)[:220]})
 need(not holds,"INCOMPLETE_OR_CHANGED_GAMEINFO_SOURCE:"+json.dumps(holds[:8]))
 results.sort(key=lambda x:(-x["leagueId"],x["gameId"]))
 populated=sum(g["populatedPenaltyRows"] for g in results)
 report={"schema":SCHEMA,
  "status":"SAMPLED_PENALTY_TABLES_SOURCE_UNPOPULATED" if populated==0 else
     "PENALTY_ROWS_PRESENT_REQUIRES_ID_PROOF",
  "capturedUTC":datetime.now(timezone.utc).isoformat(),
  "leagues":list(YEARS),"gamesPerSeason":17,
  "totalGamesSampled":len(results),
  "totalPopulatedPenaltyRows":populated,
  "penaltyGPVerified":False,"seasonPIMReconciled":False,
  "seasonGPReconciled":False,
  "coverage":"DETERMINISTIC_17_GAMEINFO_SHEETS_PER_ADMITTED_LEAGUE_SEASON",
  "notExhaustive":True,"games":results,
  "caveat":"Four penalty period tables exist on sampled GameInfo sheets, but headers alone are not penalty events. An empty table cannot verify zero PIM, player attendance, penalty duration or player identity. Full 2,206 game coverage is NOT asserted. Source observations may change after capture."}
 need(len(results)==17*len(YEARS),"WRONG_NUMBER_OF_SOURCE_SAMPLES")
 return report
def main():
 p=ArgumentParser()
 p.add_argument("--widgets",required=True);p.add_argument("--out",required=True)
 args=p.parse_args()
 try:
  report=collect(Path(args.widgets))
  need(report["totalPopulatedPenaltyRows"]==0,
    "NONEMPTY_PENALTY_ROWS_REQUIRE_SEPARATE_IDENTITY_VALIDATION")
  dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True)
  tmp=dest.with_suffix(".tmp")
  tmp.write_text(json.dumps(report,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
  tmp.replace(dest)
  print(json.dumps({"status":report["status"],"seasonCount":len(report["leagues"]),
    "sampled":report["totalGamesSampled"],
    "populatedPenaltyRows":report["totalPopulatedPenaltyRows"],
    "sourceWrites":False}))
  return 0
 except (SourceHold,OSError,KeyError,ValueError,TypeError) as exc:
  print(json.dumps({"status":"HOLD","reason":str(exc)[:950],
    "publicEvidenceNotWritten":True}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())