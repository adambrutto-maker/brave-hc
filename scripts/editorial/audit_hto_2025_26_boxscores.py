from __future__ import annotations
import requests,bs4,re,json,concurrent.futures,collections,datetime,hashlib
from pathlib import Path
INPUT=Path(__file__).resolve().parents[2]/"docs/editorial/261102_BraveHC_HTO_Historical_Game_Source_Index.json"
data=json.loads(INPUT.read_text(encoding="utf-8"))
season=next(s for s in data["seasons"] if s["key"]=="Winter_2025/2026")
games=season["games"]
def clean(s):return re.sub(r"\s+"," ",str(s).replace("\xa0"," ")).strip()
def rows(table):return [[clean(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)] for tr in table.find_all("tr")]
def audit(game):
 obj={k:game.get(k) for k in ("id","date","gameType","gf","ga","opponentRaw","disposition","boxscoreURL")}
 if game["disposition"]=="FORFEIT_REVIEW_ONLY":
  obj.update({"auditStatus":"FORFEIT_ONLY_NO_ON_ICE_RECAP","checks":[]});return obj
 if game["disposition"]!="SOURCE_SCORE_VERIFIED":
  obj.update({"auditStatus":"SOURCE_SCORE_HELD","checks":["Source index hold"]});return obj
 try:
  r=requests.get(game["boxscoreURL"]+"&archTog=1",timeout=25,headers={"User-Agent":"BraveHC-archive-editorial-audit/1.0"})
  r.raise_for_status()
  soup=bs4.BeautifulSoup(r.text,"html.parser")
  obj["htmlSHA256"]=hashlib.sha256(r.content).hexdigest()
  obj["pageURL"]=r.url
  tables=[rows(t) for t in soup.find_all("table")]
  board=next((rs for rs in tables if len(rs)==3 and rs[0] and rs[0][0].upper() in ("PLAYOFFS","REGULAR SEASON") and len(rs[0])>=5),None)
  errors=[]
  if not board:errors.append("OFFICIAL_SCOREBOARD_MISSING")
  else:
   header=board[0]
   teams={x[0]:x for x in board[1:]}
   ours=teams.get("Brave H.C.")
   rival=teams.get(game["opponentRaw"])
   if ours is None or rival is None:errors.append("OFFICIAL_TEAM_IDENTITY_DRIFT")
   else:
    try:
     gf,ga=int(ours[-1]),int(rival[-1])
     periods_ours=[int(x) for x in ours[1:-1]]
     periods_rival=[int(x) for x in rival[1:-1]]
     if sum(periods_ours)!=gf or sum(periods_rival)!=ga:errors.append("OFFICIAL_PERIOD_SUM_DRIFT")
     if (gf,ga)!=(game["gf"],game["ga"]):errors.append("SOURCE_INDEX_SCORE_DISAGREES_WITH_BOX")
     if header[0].upper()!=game["gameType"]:errors.append("OFFICIAL_GAME_TYPE_DRIFT")
     obj["periods"]=[{"period":header[i+1],"braves":v,"opponent":periods_rival[i]} for i,v in enumerate(periods_ours)]
    except Exception as e:errors.append("SCORE_VALUE_INVALID")
  event_rows=next((rs for rs in tables if rs and rs[0] and "Per Period" in rs[0] and any("Scorer" in c for c in rs[0])),None)
  parsed_events=[]
  if event_rows:
   for event in event_rows[1:]:
    if len(event)<6:errors.append("SCORER_ROW_INCOMPLETE");continue
    period,clock,strength,team,credit,result=event[:6]
    if period not in ("1","2","3","OT","2OT") or not re.fullmatch(r"\d{1,2}:\d\d",clock):
     errors.append("SCORER_PERIOD_OR_CLOCK_INVALID")
    if team not in ("Brave H.C.",game["opponentRaw"]):
     errors.append("SCORER_TEAM_CONFLICT")
    parsed_events.append({"period":period,"clock":clock,"strength":strength,
                          "team":team,"credit":credit,"scoreText":result})
  obj["events"]=parsed_events
  if event_rows and len(parsed_events)!=game["gf"]+game["ga"]:
   errors.append("SCORER_EVENTS_DO_NOT_MATCH_FINAL_SCORE")
  skater=None
  for rs in tables:
   if not rs:continue
   header=rs[0]
   if all(x in header for x in ("No","Name","GP")) and "POS" in header:
    skater=rs;break
  players=[]
  if skater:
   keys=skater[0]
   for line in skater[1:]:
    if len(line)!=len(keys):errors.append("SKATER_ROW_WIDTH");continue
    if line[keys.index("Name")] in ("","Team Stats"):continue
    record={"name":line[keys.index("Name")],"number":line[keys.index("No")],
            "position":line[keys.index("POS")]}
    for metric in ("GP","G","A","Pts","POTG","GWG","PPG","PIM"):
     if metric in keys:
      try:record[metric]=int(line[keys.index(metric)])
      except ValueError:errors.append("SKATER_NON_INTEGER_"+metric)
    if all(k in record for k in ("G","A","Pts")) and record["G"]+record["A"]!=record["Pts"]:
     errors.append("PLAYER_POINT_MISMATCH")
    players.append(record)
  obj["players"]=players
  has_full_player_stats=bool(players) and all(all(k in p for k in ("G","A","Pts")) for p in players)
  if has_full_player_stats and sum(p["G"] for p in players)!=game["gf"]:
   errors.append("PLAYER_GOALS_SOURCE_MISMATCH")
  if event_rows and has_full_player_stats:
   helpers=0
   for e in parsed_events:
    if e["team"]=="Brave H.C.":
     match=re.search(r"\(([^)]*)\)",e["credit"])
     helpers+=len([x for x in match.group(1).split(",") if clean(x)]) if match else 0
   if sum(p["A"] for p in players)!=helpers:
    errors.append("PLAYER_ASSISTS_SOURCE_MISMATCH")
   # Verify each recorded scorer and helper against the same-number HTO skater,
   # not merely the total goals and assists across the team.
   by_number={p["number"]:p for p in players}
   if len(by_number)!=len(players):errors.append("DUPLICATE_PLAYER_JERSEY_NUMBER")
   credited_goals=collections.Counter()
   credited_assists=collections.Counter()
   for event in parsed_events:
    if event["team"]!="Brave H.C.":continue
    scorer=re.match(r"^\s*(\d+)\s+\S",event["credit"])
    if not scorer:errors.append("GOAL_SCORER_NUMBER_MISSING");continue
    credited_goals[scorer.group(1)]+=1
    helpers_raw=re.search(r"\(([^)]*)\)",event["credit"])
    if helpers_raw:
     for helper in helpers_raw.group(1).split(","):
      helper_no=re.match(r"^\s*(\d+)\s+\S",helper)
      if not helper_no:errors.append("ASSIST_NUMBER_MISSING")
      else:credited_assists[helper_no.group(1)]+=1
   for number,p in by_number.items():
    if credited_goals[number]!=p["G"] or credited_assists[number]!=p["A"]:
     errors.append("INDIVIDUAL_SCORER_ASSIST_PARITY_"+number)
   for number in set(credited_goals)|set(credited_assists):
    if number not in by_number:errors.append("GOAL_OR_ASSIST_PLAYER_NOT_ON_GAME_SHEET_"+number)
  goalie=[]
  for rs in tables:
   if not rs:continue
   header=rs[0]
   if (all(x in header for x in ("No","Name","GP")) and "POS" not in header and
       any(x in header for x in ("GA","SHO","W","L"))):
    for line in rs[1:]:
     if len(line)!=len(header) or line[header.index("Name")] in ("","Team Stats"):continue
     item={"name":line[header.index("Name")],"number":line[header.index("No")]}
     for metric in ("GP","W","L","GA","SHO","POTG","GAA"):
      if metric in header:
       item[metric]=line[header.index(metric)]
     goalie.append(item)
  obj["goalies"]=goalie
  obj["eventsCoverage"]=("COMPLETE" if len(parsed_events)==game["gf"]+game["ga"] and event_rows else "MISSING_OR_INCOMPLETE")
  obj["playerStatsCoverage"]="COMPLETE" if has_full_player_stats else "PARTIAL"
  obj["checks"]=sorted(set(errors))
  obj["auditStatus"]=("HOLD_SOURCE_CONFLICT" if errors else
    "FULL_GAME_EVENTS_AND_SKATERS" if obj["eventsCoverage"]=="COMPLETE" and has_full_player_stats else
    "EVENTS_WITH_PARTIAL_PLAYER_STATS" if obj["eventsCoverage"]=="COMPLETE" else
    "SCOREBOARD_AND_SKATERS_ONLY" if has_full_player_stats else
    "SCOREBOARD_ONLY")
  return obj
 except Exception as exc:
  obj.update({"auditStatus":"HOLD_SOURCE_FETCH","checks":[str(exc)[:220]]})
  return obj
output=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for obj in pool.map(audit,games):
  output.append(obj)
  print("AUDIT",obj["id"],obj["date"],obj["gf"],obj["ga"],obj["opponentRaw"],obj["auditStatus"],
        "events",len(obj.get("events",[])),"players",len(obj.get("players",[])),
        "issues",obj.get("checks"),flush=True)
counts=collections.Counter(x["auditStatus"] for x in output)
payload={"schema":"brave-hc-hto-2025-26-boxscore-audit/read-only-v1",
         "source":"24 original official HTO game boxscores plus three explicit forfeit entries",
         "checkedAtUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
         "season":"Winter_2025/2026","gameCount":len(output),"counts":counts,"games":output,
         "publicationAuthorized":False,"nativeHTOChanged":False,
         "coverageLimitations":["Missing scoring table remains unknown, never invented as zero.",
                               "Source-scored results are not contemporary newspaper articles.",
                               "Roster statuses and event mechanisms not inferable from boxscore alone."]}
dest=Path(__file__).resolve().parents[2]/"docs/editorial/native_hto/2025-26/official_boxscore_source_audit.json"
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
print("FINAL",dict(counts),"FILE",dest,flush=True)
