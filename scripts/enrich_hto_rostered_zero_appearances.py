"""Qualify 0 GP for CURRENTLY ROSTERED Brave HC skaters with no appearances.

Four source gates: official current HTO Roster, HTO Stats actuals, all completed
HTO game sheets, and original workbook-derived 22-player model classifications.
Adds a SOURCE-QUALIFIED rosterCoverage field to existing actuals feed.
No source workbook edits, no inference about availability or next-week lineups.
"""
from __future__ import annotations
from datetime import datetime,timezone,timedelta
from html.parser import HTMLParser
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
from pathlib import Path
import json,os,re,sys
SEASON="W2026/27"
ROSTER_URL="https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=roster"
class SourceHold(ValueError):pass
def require(cond,msg):
 if not cond:raise SourceHold(msg)
class Tables(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.tables=[];self.table=None;self.row=None;self.cell=None
 def handle_starttag(self,tag,attrs):
  if tag=="table":
   if self.table is not None:raise SourceHold("NESTED_HTO_ROSTER_TABLE_UNSUPPORTED")
   self.table=[]
  elif tag=="tr" and self.table is not None:self.row=[]
  elif tag in ("td","th") and self.row is not None:self.cell=[]
 def handle_data(self,data):
  if self.cell is not None:self.cell.append(data)
 def handle_endtag(self,tag):
  if tag in ("td","th") and self.cell is not None:
   self.row.append(" ".join("".join(self.cell).split()))
   self.cell=None
  elif tag=="tr" and self.row is not None:
   if self.row:self.table.append(self.row)
   self.row=None
  elif tag=="table" and self.table is not None:
   self.tables.append(self.table)
   self.table=None
def canonical_name(raw):
 require(type(raw) is str and raw.strip(),"HTO_ROSTER_NAME_INVALID")
 value=raw.strip()
 value=re.sub(r"\s+-\s+(Captain|Asst\.\s*Capt\.)$", "",value,flags=re.I)
 require("," in value and value.count(",")==1,"HTO_ROSTER_PERSON_NAME_FORMAT_CHANGED")
 return value
def parse_roster(html):
 require(isinstance(html,str) and "Brave H.C. Winter 2026/2027 Roster" in html,
         "HTO_ROSTER_PAGE_SEASON_IDENTITY_CHANGED")
 reader=Tables();reader.feed(html)
 matches=[t for t in reader.tables if t and t[0][:3]==["No","Name","Pos"] and len(t[0])==9]
 require(len(matches)==1,"OFFICIAL_HTO_ROSTER_TABLE_AMBIGUOUS")
 rows=matches[0][1:]
 require(20<=len(rows)<=40,"HTO_ROSTER_COUNT_OUTSIDE_REVIEW_SCOPE")
 names={}
 for row in rows:
  require(len(row)==9 and re.fullmatch(r"\d{1,3}",row[0]) is not None,
          "HTO_ROSTER_ROW_FORMAT_CHANGED")
  name=canonical_name(row[1])
  require(name not in names,"HTO_ROSTER_DUPLICATE_NAME")
  require(all(x in ("G","F","C","LW","RW","LD","RD","D") for x in re.split(r"[\u00B7/]",row[2])),"HTO_ROSTER_POSITION_CHANGED")
  names[name]={"jerseyNo":row[0],"position":row[2]}
 return names
def fetch_roster(url=ROSTER_URL):
 require(url==ROSTER_URL,"UNVERIFIED_ROSTER_URL")
 with urlopen(Request(url,headers={"User-Agent":"Mozilla/5.0 (HockeyOS source verification)"}),timeout=20) as r:
  require(r.status==200,"HTO_ROSTER_HTTP_NOT_200")
  b=r.read(380_000)
  require(len(b)<380_000,"HTO_ROSTER_RESPONSE_TOO_LARGE")
  return b.decode("utf-8",errors="replace")
def qualify(actual,feed,model,roster,now=None):
 now=now or datetime.now(timezone.utc)
 require(actual.get("schema")=="brave-hc-hto-player-actuals/v1" and
         actual.get("status")=="VERIFIED_HTO_CURRENT" and actual.get("season")==SEASON,
         "CURRENT_HTO_ACTUALS_FEED_UNQUALIFIED")
 require(feed.get("schema")=="brave-hc-hto-verified-game-feed/v1" and
         feed.get("sourceValidationState")=="PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS" and
         feed.get("allGamesDiscovered") is True and feed.get("playerAggregateParity") is True,
         "COMPLETE_HTO_GAME_BOX_SOURCE_NOT_QUALIFIED")
 require(model.get("schema")=="brave-hc-workbook-projection/v1" and
         model.get("modelCurrent") is False and
         model.get("sourceInputs",{}).get("htoRecordedTeamGP")==feed.get("teamGP")==actual.get("teamGP"),
         "WORKBOOK_SCENARIO_HTO_COVERAGE_CONFLICT")
 try:
  ats=datetime.fromisoformat(actual["asOf"].replace("Z","+00:00"))
  gts=datetime.fromisoformat(feed["sourceReadback"].replace("Z","+00:00"))
 except (ValueError,KeyError,TypeError) as e:raise SourceHold("SOURCE_TIMESTAMP_INVALID") from e
 require(ats.tzinfo and gts.tzinfo and timedelta(0)<=now-ats<=timedelta(hours=24)
         and timedelta(0)<=now-gts<=timedelta(hours=24),
         "RECORDED_HTO_SOURCES_STALE")
 participants={p["name"] for g in feed["games"] for p in g["skaters"]}
 goalies=set(feed.get("goalieGameTotals",{}))
 statistics={p["name"] for p in actual["players"]}
 require(len(participants)==actual["playerCount"] and participants==statistics,
         "HTO_SCORER_ATTENDANCE_VS_CURRENT_STATS_MISMATCH")
 require(not goalies.intersection(statistics),"GOALIE_INCLUDED_AS_SKATER")
 require(set(roster)==statistics|goalies|{m["name"] for m in model["players"] if m["name"] not in statistics},
         "HTO_ROSTER_COVERAGE_DOES_NOT_RECONCILE")
 absent=set(roster)-statistics-goalies
 modelNames={p["name"]:p for p in model["players"]}
 require(absent==set(model.get("workbookPlayersAbsentFromHTO",[])),
         "MODEL_ROSTER_EXCEPTION_NOT_EQUAL_CURRENT_ROSTER_ABSENCE")
 records=[]
 for name in sorted(absent):
  m=modelNames.get(name)
  require(m and m["rosterStatus"] in ("FT","CU") and m["currentGP"]==0 and
          m["currentG"]==0 and m["currentA"]==0,"MODEL_ROSTER_ABSENCE_NOT_VERIFIED")
  records.append({"name":name,"gp":0,"g":0,"a":0,"pts":0,
                  "classification":m["rosterStatus"],
                  "jerseyNo":roster[name]["jerseyNo"],
                  "evidence":"Rostered on HTO; no recorded appearance in all completed HTO games"})
 result=dict(actual)
 result["rosterCoverage"]={
  "schema":"brave-hc-hto-rostered-no-appearance/v1",
  "status":"SOURCE_QUALIFIED_NO_RECORDED_APPEARANCES",
  "season":SEASON,"teamGP":feed["teamGP"],
  "sourceUrl":ROSTER_URL,
  "qualifiedAtUTC":now.isoformat(),
  "rosterCount":len(roster),
  "observedSkaters":len(statistics),"observedGoalies":len(goalies),
  "rosteredWithoutRecordedAppearance":records
 }
 return result
def enrich_from_files(actualfile,gamefile,modelfile,output):
 actual=json.loads(Path(actualfile).read_text(encoding="utf8"))
 feed=json.loads(Path(gamefile).read_text(encoding="utf8"))
 model=json.loads(Path(modelfile).read_text(encoding="utf8"))
 doc=qualify(actual,feed,model,parse_roster(fetch_roster()))
 out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
 temp=out.with_suffix(out.suffix+".tmp")
 temp.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 os.replace(temp,out)
 return {"status":doc["rosterCoverage"]["status"],"teamGP":doc["teamGP"],
         "skatersWithRecordedStats":len(doc["players"]),
         "rosteredNoRecordedAppearance":doc["rosterCoverage"]["rosteredWithoutRecordedAppearance"],
         "output":str(out),"workbookWritten":False}
if __name__=="__main__":
 import argparse
 p=argparse.ArgumentParser()
 for key in ("actuals","games","model","out"):p.add_argument("--"+key,required=True)
 args=p.parse_args()
 try:
  print(json.dumps(enrich_from_files(args.actuals,args.games,args.model,args.out)))
 except (SourceHold,OSError,ValueError,KeyError,TypeError) as exc:
  print(json.dumps({"state":"HOLD","reason":str(exc),"written":False}),file=sys.stderr)
  raise SystemExit(2)
