"""LeagueOS V23: public source roster facts, exact player ID cross-night bridge.

Read-only requests from 96 current source-qualified official team pages.
No public player names, personal details, HTML, CSS, photos, or full profile pages
are saved. Player performance observations are limited to published game stats.
No official source write, no HTO data reuse, no inferred person-by-name joins.
"""
from __future__ import annotations
import argparse,concurrent.futures,datetime,hashlib,json,re,sys,time
from pathlib import Path
from urllib.parse import urljoin,parse_qs,urlparse
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]/"widgets"
SCHEMA="bruttech-leagueos-cross-night-public-player-bridge/v23"
IN="leagueos_division_alignment_public_v2.json"
OUT="leagueos-cross-night-player-bridge-v23.json"
URL_ROOT="https://leagues.sportsvillage.ca/"
STANDARD=["#","Name","POS","GP","G","A","PTS","PIM"]
def need(x,why):
 if not x:raise ValueError("V23_ROSTER_HOLD:"+str(why))
def norm(t):return re.sub(r"\s+"," ",t or "").strip()
def one(row):
 league,team=row["league_id"],row["team_id"]
 url=f"{URL_ROOT}TeamInfo.aspx?leagueid={league}&teamid={team}&page_type=Adult"
 session=requests.Session()
 session.headers.update({"User-Agent":"BruTTech-Independent-Research/1.0 (public fact validation)"})
 for attempt in range(2):
  try:
   res=session.get(url,timeout=20)
   res.raise_for_status()
   if res.url.split("?")[0].lower()!=url.split("?")[0].lower(): raise ValueError("Redirected to another source path")
   soup=BeautifulSoup(res.content,"html.parser")
   tables=soup.find_all("table")
   found=[]
   for table in tables:
    rows=table.find_all("tr")
    if not rows:continue
    labels=[norm(x.get_text(" ",strip=True)) for x in rows[0].find_all(["td","th"],recursive=False)]
    if labels==STANDARD:found.append(rows)
   if len(found)!=1:raise ValueError("One expected source skater table was not found")
   players=[];seen=set();held=0
   for rowhtml in found[0][1:]:
    cells=rowhtml.find_all(["td","th"],recursive=False)
    vals=[norm(c.get_text(" ",strip=True)) for c in cells]
    if not vals or not any(vals):continue
    if len(vals)!=8: raise ValueError("Unexpected player row width")
    link=cells[1].find("a",href=True)
    if not link:held+=1;continue
    src=urljoin(url,link["href"])
    u=urlparse(src);args=parse_qs(u.query)
    if (u.scheme!="https" or u.netloc.lower()!="leagues.sportsvillage.ca" or
        u.path.lower()!="/playerinfo.aspx"): raise ValueError("Unexpected player profile host")
    if args.get("leagueid")!=[str(league)] or args.get("teamid")!=[str(team)]:
     raise ValueError("Player link mismatched source team")
    pid=args.get("playerid",[None])[0]
    if not pid or not re.fullmatch(r"\d{3,9}",pid):raise ValueError("Player ID absent")
    if pid in seen:raise ValueError("Duplicate player ID on one roster")
    seen.add(pid)
    if not all(re.fullmatch(r"\d{1,3}",vals[i]) for i in (3,4,5,6,7)):
     held+=1;continue
    gp,g,a,pts,pim=[int(vals[i]) for i in (3,4,5,6,7)]
    if g+a!=pts or (gp==0 and pts>0):held+=1;continue
    players.append({"id":pid,"gp":gp,"g":g,"a":a,"pts":pts})
   need(len(players)>=3,"Insufficient valid public players on team "+str(team))
   return {"league_id":league,"team_id":team,"night":row["night"],
           "program":row["program"],"division":row["division"],
           "source_url":url,"source_sha256":hashlib.sha256(res.content).hexdigest(),
           "status":"PUBLIC_FACTS_QUALIFIED","qualified":len(players),
           "heldPlayerRows":held,"players":sorted(players,key=lambda p:p["id"])}
  except (requests.RequestException,ValueError,IndexError) as e:
   if attempt==1:
    return {"league_id":league,"team_id":team,"night":row["night"],
            "division":row["division"],"program":row["program"],
            "source_url":url,"status":"SOURCE_HOLD","reason":str(e)[:150],
            "players":[],"qualified":0,"heldPlayerRows":0,"source_sha256":None}
   time.sleep(.35)
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--output",default=str(ROOT/OUT))
 p.add_argument("--workers",type=int,default=5)
 args=p.parse_args()
 need(1<=args.workers<=6,"Worker limit")
 raw=(ROOT/IN).read_bytes()
 model=json.loads(raw)
 need(model.get("schema")=="bruttech-division-alignment-research/v2" and
       model.get("status")=="RESEARCH_ONLY_SOURCE_QUALIFIED_NOT_SVHL_APPROVED" and
       len(model.get("teams",[]))==96,"Unrecognized four-night current source")
 rows=model["teams"]
 need(len({(r["league_id"],r["team_id"]) for r in rows})==96,
      "Duplicate source team ID")
 start=time.monotonic()
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
  collected=list(pool.map(one,rows))
 collected.sort(key=lambda r:(r["league_id"],r["team_id"]))
 verified=[r for r in collected if r["status"]=="PUBLIC_FACTS_QUALIFIED"]
 by_player={}
 for team in verified:
  for player in team["players"]:
   if player["gp"]==0:continue # rostered but no published game-performance evidence
   by_player.setdefault(player["id"],[]).append(
     {"league_id":team["league_id"],"team_id":team["team_id"],
      "night":team["night"],"program":team["program"],
      "division":team["division"],
      "gp":player["gp"],"pts":player["pts"],"g":player["g"],"a":player["a"]})
 bridges=[]
 for pid,obs in by_player.items():
  nights={o["night"] for o in obs}
  if len(nights)<2:continue
  bridges.append({"playerId":pid,
    "observations":sorted(obs,key=lambda x:(x["night"],x["team_id"])),
    "nightCount":len(nights),"distinctDivisions":len({(o["league_id"],o["division"]) for o in obs}),
    "samePlayerIdDirectPublicEvidence":True})
 bridges.sort(key=lambda p:int(p["playerId"]))
 nights=sorted({r["night"] for r in rows})
 counts={"sourceTeams":len(rows),"qualifiedTeams":len(verified),
    "heldTeams":len(rows)-len(verified),
    "qualifiedCurrentPlayerObservations":sum(len(r["players"]) for r in verified),
    "crossNightPlayerIDsWithPublishedGP":len(bridges),
    "crossNightObservations":sum(len(r["observations"]) for r in bridges),
    "crossProgramBridgeIDs":sum(len({o["program"] for o in b["observations"]})>1 for b in bridges)}
 result={
  "schema":SCHEMA,"createdAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "status":"PUBLIC_CURRENT_ROSTER_FACTS_NOT_LEAGUE_ELIGIBILITY",
  "source":"Official current team public skater tables, 2026/27",
  "sourceModelSha256":hashlib.sha256(raw).hexdigest(),
  "playerIdentity":"EXACT_PUBLISHED_SVHL_PLAYER_ID_ONLY_NOT_NAME_MATCH",
  "noPrivateContactInfo":True,
  "notOfficialRegistrationOrAvailability":True,
  "qualification":{
   "currentPlayerObservationsOnly":True,
   "gpMustBePositiveForPerformanceBridge":True,
   "pointsEqualsGoalsPlusAssists":True,
   "samePlayerIdAcrossNightsNotProofOfSameGameRole":True,
   "noCurrentPlayerRatingFromOneLeagueNightToAnother":True,
   "MastersAndOpenNotAutomaticallyMixable":True,
   "historicalDivisionTierApprovalNotConnected":True},
  "counts":counts,"nights":nights,
  "teams":collected,"bridges":bridges}
 out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
 print(json.dumps({"state":"PUBLIC_CURRENT_CROSS_NIGHT_BRIDGE_CAPTURED",
   "file":str(out),"counts":counts,"elapsedSeconds":round(time.monotonic()-start,1),
   "heldTeams": [{"night":x["night"],"id":x["team_id"],"reason":x["reason"]} for x in collected if x["status"]=="SOURCE_HOLD"][:20],
   "bridgeNightPairs":{a+"↔"+b:sum({a,b}.issubset({o["night"] for o in p["observations"]}) for p in bridges)
     for i,a in enumerate(nights) for b in nights[i+1:]},
   "scope":"Public source only, no HTO or league writes"},indent=2))
if __name__=="__main__":
 try:main()
 except Exception as e:
  print("V23_ROSTER_CAPTURE_HOLD:",str(e),file=sys.stderr);sys.exit(2)
