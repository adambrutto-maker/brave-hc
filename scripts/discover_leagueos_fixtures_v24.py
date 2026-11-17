"""V24 read-only four-night fixture discovery from exact public SVHL game IDs.

Uses the existing, originally authored BruTTech public-league parsers. Fetches
current official team directories and every public team schedule; requires
two independent team-page references to the SAME official game ID, date, time,
teams, side and score. Unpaired/ambiguous rows are held and never published
as accepted games. Source-negative W/L rows do NOT invalidate roster IDs.
No HTO/SVHL/standings/roster write, no inference of available ice.
"""
from __future__ import annotations
import argparse,concurrent.futures,datetime,hashlib,json,re,sys,time
from pathlib import Path
from urllib.parse import parse_qs,urlparse
from zoneinfo import ZoneInfo
from collect_svhl_league_intelligence import get,url_league,url_team,TABLE_RE,Parsed
from collect_svhl_player_game_events import team_sheet
ROOT=Path(__file__).resolve().parents[1]/"widgets"
BASE=ROOT/"leagueos-source-qualified-current-fixtures-v4.json"
OUT=ROOT/"leagueos-fixture-discovery-v24.json"
SCHEMA="bruttech-leagueos-four-night-fixture-discovery/v24"
NIGHTS={570:"Sunday",568:"Tuesday",567:"Wednesday",569:"Thursday"}
HEAD=["Team","GP","W","L","T","PTS","GF","GA","PIM"]
QUALIFIED={"NEW_FUTURE_RECIPROCAL","NEW_RECIPROCAL_SETTLED",
           "NEW_PAST_ZERO_ZERO_HOLD","NEW_SAME_DAY_SCORE_HOLD"}
def need(test,why):
 if not test:raise ValueError("V24_DISCOVERY_HOLD:"+why)
def source_team_directory(league):
 html,page_sha=get(url_league(league))
 parsed=Parsed();parsed.feed(html)
 ids={}
 for ref in parsed.refs:
  u=urlparse(ref["url"].replace("&amp;","&"))
  q=parse_qs(u.query)
  if u.path.lower().lstrip("/")!="teaminfo.aspx":continue
  if q.get("leagueid")!=[str(league)] or len(q.get("teamid",[]))!=1:continue
  raw=q["teamid"][0]
  if not re.fullmatch(r"\d{3,9}",raw):continue
  name=" ".join(ref["label"].split())
  if not name:continue
  key=int(raw)
  if name in ids:need(ids[name]==key,"Name ID conflict "+name)
  ids[name]=key
 divisions=[];actual=set();invalid_standings=[]
 for table in TABLE_RE.finditer(html):
  label=" ".join(table.group(1).split())
  t=Parsed();t.feed("<table>"+table.group(3)+"</table>")
  need(t.rows and t.rows[0]==HEAD,"Standing table header changed for "+str(league))
  for row in t.rows[1:]:
   need(len(row)==len(HEAD),"Standings row width changed "+label)
   name=row[0];need(name in ids,"Standings team ID missing "+name)
   key=ids[name];need(key not in actual,"Source team in two divisions "+name)
   actual.add(key)
   if not all(re.fullmatch(r"-?\d+",val) for val in row[1:]):
    invalid_standings.append({"id":key,"reason":"NON_NUMERIC_STANDINGS_ROW"})
   elif any(int(v)<0 for v in row[1:]):
    invalid_standings.append({"id":key,"reason":"NEGATIVE_PUBLISHED_STANDING_VALUE"})
   elif int(row[1])!=int(row[2])+int(row[3])+int(row[4]):
    invalid_standings.append({"id":key,"reason":"PUBLISHED_WLT_NOT_GP_PARITY"})
   divisions.append({"night":NIGHTS[league],"league_id":league,
     "team_id":key,"name":name,"division":label})
 need(len(actual)>=15 and len(actual)<=40,"Unexpected current-team count "+str(league))
 need(len(divisions)==len(actual),"Duplicate division roster")
 return {"leagueId":league,"night":NIGHTS[league],"url":url_league(league),
         "sourceSHA256":page_sha,"teams":divisions,
         "invalidStandings":invalid_standings}
def team_page(t):
 url=url_team(t["league_id"],t["team_id"])
 try:
  raw,sha=get(url)
  fixtures,holds=team_sheet(t["league_id"],{"sourceTeamId":t["team_id"]},raw,sha)
  return {"team":t,"sourceSHA256":sha,"fixtures":fixtures,"holds":holds}
 except Exception as e:
  return {"team":t,"error":str(e)[:200],"fixtures":[],"holds":[]}
def accepted_game(observed,today):
 need(len(observed)==2,"Expected exactly two sources")
 a,b=observed
 need(a["leagueId"]==b["leagueId"] and a["gameId"]==b["gameId"] and
      a["teamId"]!=b["teamId"] and
      a["teamId"]==b["opponentTeamId"] and
      b["teamId"]==a["opponentTeamId"] and a["side"]!=b["side"] and
      a["date"]==b["date"] and a["time"]==b["time"] and
      a["homeGoals"]==b["homeGoals"] and
      a["visitorGoals"]==b["visitorGoals"],"Reciprocal game details mismatch")
 home=a if a["side"]=="Home" else b
 away=b if home is a else a
 hg,ag=home["homeGoals"],home["visitorGoals"]
 if hg==0 and ag==0:
  status="NEW_FUTURE_RECIPROCAL" if home["date"]>=today else "NEW_PAST_ZERO_ZERO_HOLD"
 else: status="NEW_RECIPROCAL_SETTLED" if home["date"]<today else "NEW_SAME_DAY_SCORE_HOLD"
 return {"league_id":home["leagueId"],"game_id":home["gameId"],
  "night":NIGHTS[home["leagueId"]],"date":home["date"],"time":home["time"],
  "home_team_id":home["teamId"],"away_team_id":away["teamId"],
  "status":status,"homeGoals":hg if status=="NEW_RECIPROCAL_SETTLED" else None,
  "awayGoals":ag if status=="NEW_RECIPROCAL_SETTLED" else None,
  "reciprocal":True,"sourceCount":2,"statusEvidence":"EXACT_TWO_TEAM_SOURCE_GAME_ID_PARITY",
  "sourceTeamPageSHA256":[home["teamPageHash"],away["teamPageHash"]],
  "sourceURLs":[url_team(home["leagueId"],home["teamId"]),
                url_team(away["leagueId"],away["teamId"])],
  "officialGameUrl":f"https://leagues.sportsvillage.ca/gameinfo.aspx?leagueid={home['leagueId']}&gameid={home['gameId']}&page_type=Adult",
  "officialWriteAllowed":False}
def run(asof=None,workers=5,output=OUT,fetch_dir=source_team_directory,fetch_team=team_page):
 need(1<=workers<=6,"Worker limit")
 now=asof or datetime.datetime.now(ZoneInfo("America/Toronto")).date().isoformat()
 need(bool(re.fullmatch(r"20\d{2}-\d{2}-\d{2}",now)),"Invalid Toronto date")
 original_raw=BASE.read_bytes();baseline=json.loads(original_raw)
 need(baseline.get("schema")=="bruttech-svhl-current-fixture-window/v4" and
      baseline.get("counts",{}).get("total")==411,"Original V4 fixture baseline missing")
 oldids={(x["league_id"],x["game_id"]) for x in baseline["fixtures"]}
 sources=[fetch_dir(lid) for lid in NIGHTS]
 all_teams=[t for d in sources for t in d["teams"]]
 ids={(t["league_id"],t["team_id"]) for t in all_teams}
 need(len(ids)==len(all_teams) and 96<=len(all_teams)<=115,
      "Current four-night teams outside bounded source scope")
 model=json.loads((ROOT/"leagueos_division_alignment_public_v2.json").read_text("utf8"))
 need(model.get("schema")=="bruttech-division-alignment-research/v2" and
      len(model.get("teams",[]))==96,"Current rating coverage baseline missing")
 rated={(t["league_id"],t["team_id"]) for t in model["teams"]}
 unrated=sorted([{"leagueId":t["league_id"],"night":t["night"],"teamId":t["team_id"],
     "name":t["name"],"division":t["division"],
     "status":"NO_VERIFIED_COMPARABLE_TEAM_RATING"}
     for t in all_teams if (t["league_id"],t["team_id"]) not in rated],
    key=lambda x:(x["night"],x["teamId"]))
 directory=sorted([{"leagueId":t["league_id"],"night":t["night"],
   "teamId":t["team_id"],"name":t["name"],"division":t["division"]}
   for t in all_teams],key=lambda x:(x["leagueId"],x["teamId"]))
 with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
  pages=list(pool.map(fetch_team,all_teams))
 source_holds=[{"leagueId":p["team"]["league_id"],"teamId":p["team"]["team_id"],
   "reason":p["error"]} for p in pages if p.get("error")]
 need(not source_holds,"Current public team page coverage incomplete: "+json.dumps(source_holds[:5]))
 observations={};row_holds=[]
 for p in pages:
  for h in p["holds"]:row_holds.append(h)
  for row in p["fixtures"]:
   key=(row["leagueId"],row["gameId"])
   observations.setdefault(key,[]).append(row)
 candidates=[];held=[]
 for (lid,gid),rows in sorted(observations.items()):
  try:case=accepted_game(rows,now)
  except ValueError as e:
   held.append({"leagueId":lid,"gameId":gid,"reason":str(e)[:160]});continue
  if (lid,gid) in oldids:continue
  candidates.append(case)
 candidates.sort(key=lambda g:(g["date"],g["league_id"],g["game_id"]))
 # Preserve immutable accepted first-seen provenance; do not silently
 # erase previous candidates if source coverage changes or a game disappears.
 existing=None
 if output.exists():
  existing=json.loads(output.read_text("utf8"))
  need(existing.get("schema")==SCHEMA and
       existing.get("baseFixtureSha256")==hashlib.sha256(original_raw).hexdigest() and
       existing.get("officialRecordsEdited") is False,
       "Previously published discovery artifact conflicts with immutable V4 baseline")
 previous={(g["league_id"],g["game_id"]):g for g in (existing or {}).get("candidates",[])}
 published=[]
 for curr in candidates:
  key=(curr["league_id"],curr["game_id"])
  old=previous.pop(key,None)
  if old and any(old[k]!=curr[k] for k in ("home_team_id","away_team_id")):
   # Never silently rebind a published source game ID to another pair.
   raise ValueError("V24_DISCOVERY_HOLD:Published game ID source teams changed "+str(key))
  if old:
   # Evidence sha changes alone are not a material publication update.
   original_fields={k:v for k,v in old.items() if k not in
     ("sourceTeamPageSHA256","firstSeenAt","lastChangedAt","missingFromCurrentSource")}
   revised_fields={k:v for k,v in curr.items() if k not in
     ("sourceTeamPageSHA256","firstSeenAt","lastChangedAt","missingFromCurrentSource")}
   curr["firstSeenAt"]=old.get("firstSeenAt",now)
   if original_fields==revised_fields:
    published.append(old);continue
  else:curr["firstSeenAt"]=now
  curr["lastChangedAt"]=now
  curr["missingFromCurrentSource"]=False
  published.append(curr)
 for key,old in previous.items():
  if not old.get("missingFromCurrentSource"):
   old={**old,"lastChangedAt":now,"missingFromCurrentSource":True,
        "previousObservedStatus":old["status"],
        "status":"SOURCE_MISSING_REVIEW_HOLD",
        "homeGoals":None,"awayGoals":None}
  published.append(old)
 published.sort(key=lambda g:(g["date"],g["league_id"],g["game_id"]))
 for g in published:
  if (g.get("missingFromCurrentSource") and
      g["status"]!="SOURCE_MISSING_REVIEW_HOLD"):
   raise ValueError("V24_DISCOVERY_HOLD:Missing source candidate cannot be qualified")
 material=[{k:v for k,v in g.items() if k!="sourceTeamPageSHA256"} for g in published]
 existing_material=[{k:v for k,v in g.items() if k!="sourceTeamPageSHA256"} for g in (existing or {}).get("candidates",[])]
 updated=(existing is None or material!=existing_material or
          directory!=(existing or {}).get("teamDirectory") or
          unrated!=(existing or {}).get("unratedTeams") or
          held[:80]!=(existing or {}).get("sourceHolds",[]) or
          row_holds[:80]!=(existing or {}).get("sourceDuplicateZeroZeroHolds",[]) or
          len(observations)!=(existing or {}).get("counts",{}).get("sourceGameIDsObserved") or
          sum(len(x["invalidStandings"]) for x in sources)!=
            (existing or {}).get("counts",{}).get("sourceInvalidStandingsRows"))
 counts={"currentLeagueTeams":len(all_teams),
  "unratedByCurrentDivisionModel":len(unrated),
  "sourceNights":4,"sourcePagesAccepted":len(pages),"sourcePagesHeld":len(source_holds),
  "sourceGameIDsObserved":len(observations),
  "newCandidateCount":len(published),
  "currentNewFuture":sum(g["status"]=="NEW_FUTURE_RECIPROCAL" for g in published),
  "newSettled":sum(g["status"]=="NEW_RECIPROCAL_SETTLED" for g in published),
  "newHeld":sum(g["status"] not in ("NEW_FUTURE_RECIPROCAL","NEW_RECIPROCAL_SETTLED") for g in published),
  "unpairedSourceGameIdsHeld":len(held),
  "sourceDuplicateZeroZeroHolds":len(row_holds),
  "sourceInvalidStandingsRows":sum(len(x["invalidStandings"]) for x in sources)}
 result={"schema":SCHEMA,"status":"READ_ONLY_CANDIDATE_SOURCE_NOT_LEAGUE_APPROVED",
   "baseFixtureSha256":hashlib.sha256(original_raw).hexdigest(),
   "firstCapturedToronto":(existing or {}).get("firstCapturedToronto",now),
   "lastMaterialChangeToronto":now if updated else existing.get("lastMaterialChangeToronto",now),
   "officialRecordsEdited":False,"noAvailableIceInference":True,
   "sourcePolicy":"Exact game IDs + two reciprocal current team pages. New fixtures are source candidates, not official ice allocations or approved division changes.",
   "leagueNights":[{"leagueId":x["leagueId"],"night":x["night"],
       "currentTeamCount":len(x["teams"]),"sourceInvalidStandingRows":len(x["invalidStandings"])}
       for x in sources],
   "counts":counts,"teamDirectory":directory,"unratedTeams":unrated,
   "candidates":published,"sourceHolds":held[:80],
   "sourceDuplicateZeroZeroHolds":row_holds[:80]}
 # Volatile receipts are logged but not used as a reason for a public commit.
 if existing and not updated:
  print(json.dumps({"state":"NO_NEW_VERIFIED_FIXTURE_CHANGE","asOfToronto":now,
    "changed":False,"counts":counts,"sourceHolds":len(held),
    "officialChanges":False},ensure_ascii=False));return result,False
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n","utf8")
 print(json.dumps({"state":"V24_READ_ONLY_DISCOVERY_PUBLISHED","asOfToronto":now,
  "changed":True,"counts":counts,
  "firstCandidates":[{"league":g["league_id"],"id":g["game_id"],"date":g["date"],"status":g["status"]} for g in published[:9]],
  "officialChanges":False},ensure_ascii=False))
 return result,True
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--asof",help="Test-only Toronto YYYY-MM-DD date override")
 p.add_argument("--workers",type=int,default=5)
 p.add_argument("--output",default=str(OUT))
 args=p.parse_args()
 run(args.asof,args.workers,Path(args.output))
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(json.dumps({"state":"SOURCE_HOLD","error":str(e)[:350],"officialChanges":False}),file=sys.stderr)
  sys.exit(2)
