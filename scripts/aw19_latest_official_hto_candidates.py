"""Official-HockeyOS latest completed HTO game / career profile milestone evidence.
READ-ONLY: all HTTP GETs, private on-device receipt; never mutates native Awards.
Supports Game, Goal, Assist, Point, Win, Shutout clubs. Exact game/HTO playerID
and published season/career parity required; no unverified award is granted.
"""
from __future__ import annotations
import argparse,collections,datetime,hashlib,json,re,sys
from pathlib import Path
from urllib.parse import parse_qs,urlparse,urljoin
import requests
from bs4 import BeautifulSoup
from aw19_verified_club_engine import event_to_awards, planned_awards_category_order

HTO="https://www.htosports.com/teams/default.asp"
BRAVE="BRAVESHOCKEY"
def norm(s):return re.sub(r"\s+"," ",s or "").strip()
def canonical_name(s):
 s=norm(s)
 if "," in s:
  last,first=[norm(x) for x in s.split(",",1)]
  return (first+" "+last).casefold()
 return s.casefold()

def canonical_url(url,game_id):
 u=urlparse(url);q=parse_qs(u.query)
 assert u.scheme=="https" and u.netloc=="www.htosports.com" and u.path=="/teams/default.asp"
 assert q.get("u")==[BRAVE] and q.get("p")==["boxscore"] and q.get("gameID")==[str(game_id)]
 return url

def read_official_link_id(link):
 u=urlparse(urljoin(HTO,link))
 q=parse_qs(u.query)
 if (u.scheme!="https" or u.netloc!="www.htosports.com" or u.path!="/teams/default.asp"
     or q.get("u")!=[BRAVE] or q.get("p")!=["profile"]):raise ValueError("Nonofficial player profile")
 val=q.get("playerID",[""])[0]
 if not val.isdigit() or int(val)<=0:raise ValueError("Player id missing")
 return int(val)

def rows_from_stat_table(table,required):
 trs=table.select("tr")
 header=None
 for tr in trs:
  cells=tr.find_all(["th","td"],recursive=False)
  vals=[norm(z.get_text(" ",strip=True)) for z in cells]
  if "Name" in vals and set(required)<=set(vals):
   header=vals;break
 if not header:return None
 found={}
 for tr in trs:
  cells=tr.find_all(["th","td"],recursive=False)
  if len(cells)!=len(header):continue
  raw=[norm(z.get_text(" ",strip=True)) for z in cells]
  row=dict(zip(header,raw))
  linked=cells[header.index("Name")].select_one('a[href*="playerID="]')
  if not linked:continue
  pid=read_official_link_id(linked["href"])
  if pid in found:raise ValueError("Duplicate official playerID in boxscore")
  record={"id":pid,"name":row["Name"]}
  for key in required:
   if not re.fullmatch(r"\d+",row[key]):raise ValueError("Invalid official stat "+key)
   record[key]=int(row[key])
  found[pid]=record
 return found

def parse_boxscore(html,game_id):
 soup=BeautifulSoup(html,"html.parser")
 skaters=[];goalies=[]
 for t in soup.select("table"):
  a=rows_from_stat_table(t,("GP","G","A","Pts"))
  if a is not None and len(a)>=1:skaters.append(a)
  b=rows_from_stat_table(t,("GP","W","GA"))
  if b is not None and len(b)>=1:goalies.append(b)
 if len(skaters)!=1 or len(goalies)!=1:raise ValueError("Official skater/goalie tables not unique")
 for r in skaters[0].values():
  if r["G"]+r["A"]!=r["Pts"]:raise ValueError("Boxscore per-player point arithmetic wrong")
 return skaters[0],goalies[0]

def parse_profile_career(html,player_id,expected_kind,current_season):
 s=BeautifulSoup(html,"html.parser")
 candidate=[]
 for table in s.select("table"):
  heading=None;career=None;season=None
  for tr in table.select("tr"):
   cells=[norm(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)]
   if "Season" in cells and "GP" in cells:
    heading=cells;continue
   if heading is None or len(cells)!=len(heading):continue
   item=dict(zip(heading,cells))
   if cells[0]=="Career":career=item
   if item.get("Season")==current_season:season=item
  if career is not None and season is not None:candidate.append((career,season))
 if len(candidate)!=1:raise ValueError(f"HTO profile {player_id}: career/current season stats not unique")
 career,season=candidate[0]
 metric_names={"skater":("GP","G","A","Pts"),"goalie":("GP","W","SHO","GA")}
 totals={}
 now={}
 for k in metric_names[expected_kind]:
  if k not in career or k not in season:raise ValueError("Required HTO stat missing "+k)
  if not re.fullmatch(r"\d+",career[k]) or not re.fullmatch(r"\d+",season[k]):
   raise ValueError("HTO career/season stat noninteger "+k)
  totals[k]=int(career[k]);now[k]=int(season[k])
 if expected_kind=="skater" and totals["G"]+totals["A"]!=totals["Pts"]:
  raise ValueError("HTO official career totals fail G+A=PTS")
 return totals,now

def current_winter(dateobj):
 if dateobj.month>=9:return f"Winter {dateobj.year}/{dateobj.year+1}"
 if dateobj.month<=4:return f"Winter {dateobj.year-1}/{dateobj.year}"
 raise ValueError("Latest HTO game season is not winter; source season explicit required")

def season_aggregate_for_player(feed,pid_row,kind):
 # Feed has full published current-season official games with source parity,
 # but not immutable player IDs. Bind the exact HTO boxscore playerID to the
 # feed name at the latest game, then resolve each prior same-source player
 # by identical HTO Name field; ambiguity is a HOLD, never automatic grant.
 goal_name=canonical_name(pid_row["name"])
 stats=collections.Counter()
 for game in feed["games"]:
  group=game["skaters"] if kind=="skater" else game["goalies"]
  matches=[p for p in group if canonical_name(p["name"])==goal_name]
  if len(matches)>1:raise ValueError("Ambiguous source name in verified HTO feed")
  if not matches:continue
  player=matches[0]
  if kind=="skater":
   for key in ("gp","g","a","pts"):stats[key.upper() if key!="pts" else "Pts"]+=int(player.get(key,0))
  else:
   stats["GP"]+=int(player["gp"]);stats["GA"]+=int(player["goalsAgainst"])
   # A goalie can be assigned a win or shutout only if it was the
   # sole goalie for the completed game, with clear scored result.
   if len(group)==1 and int(player["gp"])==1:
    stats["W"]+=int(game["teamGoals"]>game["teamGoalsAgainst"])
    stats["SHO"]+=int(game["teamGoalsAgainst"]==0 and int(player["goalsAgainst"])==0)
   else:raise ValueError("Split/ambiguous goalie outcome: season proof HOLD")
 return stats

def reconcile_latest(feed,fetch,now=None):
 now=now or datetime.datetime.now(datetime.timezone.utc)
 if now.tzinfo is None:raise ValueError("Current time must be timezone-aware")
 if feed.get("schema")!="brave-hc-hto-verified-game-feed/v1" or feed.get("allGamesDiscovered") is not True or feed.get("playerAggregateParity") is not True:
  raise ValueError("Official HTO entire season feed not verified")
 games=feed.get("games")
 if not isinstance(games,list) or not games or len(games)!=feed.get("teamGP"):raise ValueError("Feed game coverage mismatch")
 ids=[g.get("htoGameId") for g in games]
 if len(ids)!=len(set(ids)) or not all(isinstance(i,int) and i>0 for i in ids):
  raise ValueError("Duplicate or invalid HTO game IDs")
 stamped=datetime.datetime.fromisoformat(feed["sourceReadback"].replace("Z","+00:00"))
 if stamped.tzinfo is None or (now-stamped).total_seconds()< -300 or (now-stamped).total_seconds()>3*3600:
  raise ValueError("Official HTO feed stale or future; run authenticated collector first")
 last=sorted(games,key=lambda g:(g["date"],g["htoGameId"]))[-1]
 game_id=last["htoGameId"];game_date=datetime.date.fromisoformat(last["date"])
 if game_date>now.date():raise ValueError("Future game in source")
 url=canonical_url(last["sourceUrl"],game_id)
 box_raw=fetch(url)
 skaters,goalies=parse_boxscore(box_raw,game_id)
 if len(skaters)!=len(last["skaters"]) or len(goalies)!=len(last["goalies"]):
  raise ValueError("Latest boxscore source roster count != verified feed")
 feed_sk={canonical_name(p["name"]):p for p in last["skaters"]}
 feed_gk={canonical_name(p["name"]):p for p in last["goalies"]}
 if set(feed_sk)!=set(canonical_name(p["name"]) for p in skaters.values()):
  raise ValueError("Skater identity match not exact")
 if set(feed_gk)!=set(canonical_name(p["name"]) for p in goalies.values()):
  raise ValueError("Goalie identity match not exact")
 for p in skaters.values():
  q=feed_sk[canonical_name(p["name"])]
  if (p["G"],p["A"],p["Pts"],p["GP"])!=(q["g"],q["a"],q["pts"],q["gp"]):
   raise ValueError("Official boxscore vs verified feed skater stat mismatch")
 for p in goalies.values():
  q=feed_gk[canonical_name(p["name"])]
  if p["GP"]!=q["gp"] or p["GA"]!=q["goalsAgainst"]:
   raise ValueError("Goalie boxscore vs source feed mismatch")
 if sum(p["G"] for p in skaters.values())!=last["teamGoals"]:
  raise ValueError("Scorer goals do not sum to team goals")
 season=current_winter(game_date)
 candidate_events=[];held=[]
 for kind,group in (("skater",skaters),("goalie",goalies)):
  for player in group.values():
   pid=player["id"]
   profile_url=f"{HTO}?u=BRAVESHOCKEY&s=hockey&p=profile&playerID={pid}"
   try:
    profile_raw=fetch(profile_url)
    career,season_totals=parse_profile_career(profile_raw,pid,kind,season)
    aggregate=season_aggregate_for_player(feed,player,kind)
    checks=("GP","G","A","Pts") if kind=="skater" else ("GP","W","SHO","GA")
    if any(aggregate.get(m,0)!=season_totals[m] for m in checks):
     raise ValueError("Official season totals do not match all verified feed games: "+str([(m,aggregate.get(m,0),season_totals[m]) for m in checks]))
    metrics=(("Game","GP","GP"),("Goal","G","G"),("Assist","A","A"),("Point","Pts","Pts")) if kind=="skater" else (("Game","GP","GP"),("Win","W","W"),("Shutout","SHO","SHO"))
    for label,careerkey,gamekey in metrics:
     if kind=="goalie" and label in ("Win","Shutout"):
      # If source has split goalies or an ambiguous outcome, the season
      # aggregate helper already held; now require latest sole-goalie game.
      if len(goalies)!=1 or player["GP"]!=1:raise ValueError("Ambiguous latest goalie award")
      increment=int(player["W"]==1) if label=="Win" else int(last["teamGoalsAgainst"]==0 and player["GA"]==0)
     else:increment=player[gamekey]
     current=career[careerkey];before=current-increment
     if before<0:raise ValueError("Career total smaller than latest verified game")
     if increment==0:continue
     candidate_events.append({"player_id":pid,"player_name":canonical_name(player["name"]).title(),
       "game_id":str(game_id),"game_date":game_date.isoformat(),"metric":label,
       "previous_total":before,"new_total":current,"source_url":url,
       "official_game_verified":True,"player_identity_verified":True,
       "source_sha256":hashlib.sha256(box_raw).hexdigest(),
       "profile_source_sha256":hashlib.sha256(profile_raw).hexdigest()})
   except Exception as exc:
    held.append({"official_player_id":pid,"name":player["name"],"kind":kind,"reason":str(exc)})
 proposed=[];errors=[]
 for event in candidate_events:
  try:proposed.extend(event_to_awards(event))
  except Exception as exc:errors.append({"event":event,"reason":str(exc)})
 if errors:raise RuntimeError("Internal AW19 source-contract failure: "+repr(errors))
 return {"schema":"brave-hc-aw19-exact-current-game-reconciliation/v1","status":"SOURCE_RECONCILIATION_PASS_WITH_HOLDS" if held else "SOURCE_RECONCILIATION_PASS",
 "verified_game_id":game_id,"game_date":game_date.isoformat(),"game_source_url":url,
 "game_source_sha256":hashlib.sha256(box_raw).hexdigest(),"source_feed_timestamp":feed["sourceReadback"],
 "source_player_count":len(skaters)+len(goalies),
 "event_count":len(candidate_events),"proposed_milestones":proposed,
 "proposed_club_categories":planned_awards_category_order(sorted(set(p["club"] for p in proposed))),
 "held_players":held,
 "native_hto_writes":0,"automatic_grants":0}

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--feed",type=Path,required=True)
 ap.add_argument("--output",type=Path,required=True)
 args=ap.parse_args()
 feed_bytes=args.feed.read_bytes()
 feed=json.loads(feed_bytes.decode("utf-8-sig"))
 def fetch(url):
  r=requests.get(url,timeout=25,headers={"User-Agent":"BruTTech-HockeyOS-AW19-SourceReview/1.0"})
  r.raise_for_status()
  return r.content
 doc=reconcile_latest(feed,fetch)
 doc["source_feed_sha256"]=hashlib.sha256(feed_bytes).hexdigest()
 args.output.parent.mkdir(parents=True,exist_ok=True)
 args.output.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({k:v for k,v in doc.items() if k not in ("proposed_milestones","held_players")},ensure_ascii=False,indent=2))
 print("HOLDS",doc["held_players"][:5],"PROPOSALS",doc["proposed_milestones"][:5])
if __name__=="__main__":main()
