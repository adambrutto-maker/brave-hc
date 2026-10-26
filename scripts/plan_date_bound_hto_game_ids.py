"""Read-only future HTO game-ID to original Master Schedule date mapping.

Source authority: original pinned Master Workbook 2026/27 game calendar and
source-qualified completed HTO Score cards. Never guess a new Game Number by
sequence, opponent name or elapsed week; exact unique date match is required.
No schedule/boxscore, HTO site, Excel or public GitHub writes.
"""
from __future__ import annotations
from datetime import date,datetime,timedelta
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import argparse,json,os,re,sys
N="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
MASTER_SHA="0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154"
SEASON="W2026/27"
AUDITED={
3356177:("2026-09-20",359,"Dateline Predators",0,3),
3356178:("2026-09-27",360,"Mohawks H.C.",3,6),
3369564:("2026-10-04",361,"Michelob Morts",2,3),
3375601:("2026-10-18",362,"Zamboner Crew",1,7),
3375682:("2026-10-25",363,"Big Bastones",6,4)
}
class SourceHold(ValueError):pass
def require(c,why):
 if not c:raise SourceHold(why)
def calendar(source):
 source=Path(source)
 require(source.is_file() and sha256(source.read_bytes()).hexdigest()==MASTER_SHA,
         "CANONICAL_MASTER_WORKBOOK_HASH_NOT_ADMITTED")
 with ZipFile(source) as z:
  strings_root=ET.fromstring(z.read("xl/sharedStrings.xml"))
  strings=["".join(v.text or "" for v in si.iter(N+"t")) for si in strings_root.findall(N+"si")]
  rows=[]
  for _,row in ET.iterparse(z.open("xl/worksheets/sheet12.xml"),events=("end",)):
   if row.tag!=N+"row":continue
   values={}
   for cell in row.findall(N+"c"):
    key=re.match(r"[A-Z]+",cell.get("r",""))
    if not key or key.group() not in ("B","C","D","E","X"):continue
    val=cell.find(N+"v")
    if val is None:continue
    v=val.text
    if cell.get("t")=="s":v=strings[int(v)]
    values[key.group()]=v
   if values.get("C")==SEASON and values.get("D")=="Regular Season":
    try:
     game=int(values["B"])
     day=(datetime(1899,12,30)+timedelta(days=float(values["E"]))).date().isoformat()
    except (ValueError,KeyError,OverflowError) as exc:raise SourceHold("CANONICAL_SCHEDULE_ROW_INVALID") from exc
    rows.append({"masterGameNumber":game,"date":day,"sourceSheetRow":int(row.get("r","0")),
                 "workbookContested":values.get("X") in ("1","1.0")})
   row.clear()
 require(len(rows)==24,"WORKBOOK_REGULAR_SEASON_SLOT_COUNT_CHANGED")
 require(len({r["date"] for r in rows})==len(rows),"DUPLICATE_MASTER_CALENDAR_DATE")
 require(len({r["masterGameNumber"] for r in rows})==len(rows),"DUPLICATE_MASTER_GAME_NUMBER")
 require({r["masterGameNumber"] for r in rows}==set(range(359,383)),
         "CANONICAL_MASTER_GAME_NUMBER_SPAN_CHANGED")
 return sorted(rows,key=lambda x:x["date"])

def current_plan(slots,evidence,today=None):
 today=today or date.today()
 require(evidence.get("schema")=="brave-hc-hto-completed-score-evidence/private-v1" and
         evidence.get("status")=="PRIVATE_SOURCE_ONLY" and evidence.get("publicationAuthorized") is False,
         "OFFICIAL_HTO_SCORE_STAGE_NOT_QUALIFIED")
 games=evidence.get("games")
 require(isinstance(games,list) and len(games)>=5 and len(games)==evidence.get("sourceGamesCount"),
         "HTO_COMPLETED_GAME_COUNT_NOT_SOURCE_QUALIFIED")
 lookup={row["date"]:row for row in slots}
 ids=set();days=set();result=[]
 for g in games:
  gid=g.get("htoGameId")
  require(type(gid) is int and gid>0 and gid not in ids,"DUPLICATE_OR_INVALID_HTO_GAME_ID")
  ids.add(gid)
  day=g.get("date")
  try:completed=date.fromisoformat(day)
  except (ValueError,TypeError) as exc:raise SourceHold("HTO_COMPLETED_DATE_MALFORMED") from exc
  require(completed<=today,"FUTURE_GAME_NOT_YET_COMPLETED")
  require(day not in days,"MORE_THAN_ONE_COMPLETED_GAME_SAME_CALENDAR_DATE")
  days.add(day)
  require(day in lookup,"OFFICIAL_COMPLETED_DATE_NOT_IN_MASTER_SCHEDULE:"+str(day))
  require(g.get("season")==SEASON and g.get("gameType")=="Regular Season",
          "UNEXPECTED_SEASON_OR_GAME_TYPE")
  name=g.get("opponentExact")
  require(isinstance(name,str) and name.strip(),"COMPLETED_HTO_OPPONENT_NAME_MISSING")
  gf,ga=g.get("gf"),g.get("ga")
  require(type(gf) is int and type(ga) is int and 0<=gf<=30 and 0<=ga<=30,
          "UNQUALIFIED_GOAL_TOTALS")
  expected_result="W" if gf>ga else "L" if ga>gf else "T"
  require(g.get("result")==expected_result,"HTO_SCORE_RESULT_MISMATCH")
  u=urlparse(g.get("sourceUrl",""))
  q=parse_qs(u.query)
  require(u.scheme=="https" and u.hostname=="www.htosports.com" and
          u.path=="/teams/default.asp" and q.get("u")==["BRAVESHOCKEY"] and
          q.get("p")==["boxscore"] and q.get("gameID")==[str(gid)],
          "HTO_BOXSCORE_SOURCE_URL_MISMATCH")
  num=lookup[day]["masterGameNumber"]
  if gid in AUDITED:
   exp_day,exp_num,exp_opp,exp_gf,exp_ga=AUDITED[gid]
   require((day,num,name,gf,ga)==(exp_day,exp_num,exp_opp,exp_gf,exp_ga),
           "PREVIOUSLY_AUDITED_GAME_SOURCE_CHANGED:"+str(gid))
  result.append({"htoGameId":gid,"masterGameNumber":num,"date":day,
                 "opponentExact":name,"gf":gf,"ga":ga,
                 "sourceWorkbookRow":lookup[day]["sourceSheetRow"],
                 "workbookCompletedFlag":lookup[day]["workbookContested"]})
 require(set(AUDITED).issubset(ids),"AUDITED_FIVE_CURRENT_GAME_COVERAGE_INCOMPLETE")
 require(len({x["masterGameNumber"] for x in result})==len(result),"MASTER_SLOT_MAPPED_TWICE")
 ordered=sorted(result,key=lambda x:x["masterGameNumber"])
 return {"status":"PRIVATE_HTO_GAME_DATE_MAPPING_VALIDATED",
         "schema":"brave-hc-date-bound-hto-map/private-v1",
         "masterSHA256":MASTER_SHA,"officialHTOGames":len(ordered),
         "sourceValidatedGameIDs":[v["htoGameId"] for v in ordered],
         "auditedFirstFiveUnchanged":True,"mapping":ordered,
         "workbookWritten":False,"publicFeedWritten":False,
         "requiresNewConsumerSourceParity":True}
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--master",required=True)
 p.add_argument("--scores",required=True)
 p.add_argument("--out",required=True)
 args=p.parse_args()
 try:
  output=current_plan(calendar(args.master),json.loads(Path(args.scores).read_text(encoding="utf8")))
  dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True)
  tmp=dest.with_suffix(dest.suffix+".tmp")
  tmp.write_text(json.dumps(output,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  os.replace(tmp,dest)
  print(json.dumps({"status":output["status"],"games":output["officialHTOGames"],
                    "mapped":[[r["htoGameId"],r["masterGameNumber"]] for r in output["mapping"]],
                    "private":True}))
  return 0
 except (SourceHold,KeyError,TypeError,ValueError,OSError) as exc:
  print(json.dumps({"status":"HOLD","reason":str(exc),"workbookWritten":False}),file=sys.stderr)
  return 2
if __name__=="__main__":sys.exit(main())
