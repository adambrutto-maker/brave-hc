"""Hourly PUBLIC HTO skater-actuals acquisition; fail-closed and publish-only-on-change.

Never writes HTO, awards, player Highlights, the Master Workbook, or projections.
Official stats AND independently published final scoreboards must match.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE="https://www.htosports.com/teams/default.asp"
QUERY={"s":"hockey","u":"BRAVESHOCKEY"}
STAT_URL="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"
SCORES_URL="https://www.htosports.com/teams/default.asp?p=scores&s=hockey&u=BRAVESHOCKEY"
HEADER=["No","Name","POS","","GP","G","A","Pts"]
SCORE_HEAD=["REGULAR SEASON","1","2","3","OT","2OT","F"]
# Official HTO omits overtime columns for regulation-only games. Keep exact
# accepted header variants; never infer game completion from unsupported shapes.
SCORE_HEADERS=(SCORE_HEAD,["REGULAR SEASON","1","2","3","OT","F"],
               ["REGULAR SEASON","1","2","3","F"])
TEAM_HEAD=["GP","GF","GA","PPO","PK%"]
OUTPUT=ROOT/"widgets/player-actuals-hourly.json"
BASELINE=ROOT/"widgets/player-actuals.json"

class SourceHold(ValueError):
    pass

def require(ok,reason):
    if not ok:raise SourceHold(reason)

def text(cell):
    return " ".join(cell.get_text(" ",strip=True).split())

def cells(row):
    return [text(c) for c in row.find_all(["td","th"],recursive=False)]

def rows(table):
    return [cells(r) for r in table.find_all("tr") if cells(r)]

def read_html(uri):
    response=requests.get(uri,timeout=25,headers={"User-Agent":"BraveHC-HTO-PublicSource-Validation/1.0",
                                                   "Cache-Control":"no-cache"})
    require(response.status_code==200,"HTO_HTTP_ERROR_"+str(response.status_code))
    require(12000<=len(response.content)<=2_000_000,"HTO_RESPONSE_SIZE_OUT_OF_BOUNDS")
    return response.text

def parse(stats_html,scores_html,read_at=None):
    stamp=(read_at or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
    stats=BeautifulSoup(stats_html,"html.parser")
    scores=BeautifulSoup(scores_html,"html.parser")
    title=text(stats.title) if stats.title else ""
    match=re.fullmatch(r"Brave H\.C\. Stats - (Winter|Summer) (\d{4})/(\d{4})",title)
    require(bool(match),"HTO_STATS_PAGE_IDENTITY_OR_SEASON")
    name,first,last=match.groups()
    require(int(last)==int(first)+1,"HTO_SEASON_RANGE")
    season=("W" if name=="Winter" else "S")+first+"/"+last[-2:]
    require(text(scores.title)=="Brave H.C. "+name+" "+first+"/"+last+" Scores",
            "HTO_SCORES_SEASON_MISMATCH")

    tables=[rows(t) for t in stats.find_all("table")]
    skater=[table for table in tables if table and table[0][:len(HEADER)]==HEADER]
    require(len(skater)==1,"HTO_SKATER_HEADER_NOT_UNIQUE")
    record=skater[0]
    require(len(record)>=17 and len(record)<=180,"HTO_SKATER_ROW_COUNT")
    players=[]
    team=None
    names=set()
    for item in record[1:]:
        require(len(item)==len(record[0]),"HTO_SKATER_STAT_ROW_WIDTH")
        gp,g,a,pts=item[4:8]
        require(all(re.fullmatch(r"\d+",v) for v in (gp,g,a,pts)),"HTO_SKATER_NONINTEGER")
        gp,g,a,pts=map(int,(gp,g,a,pts))
        require(pts==g+a and all(0<=v<=1000 for v in (gp,g,a,pts)),
                "HTO_SKATER_POINTS_PARITY")
        if item[1]=="Team Stats":
            require(team is None,"HTO_TEAM_STATS_DUPLICATED")
            team=dict(gp=gp,g=g,a=a,pts=pts)
            continue
        require(bool(item[1]) and item[1] not in names,"HTO_SKATER_DUPLICATE_IDENTITY")
        names.add(item[1])
        players.append({"name":item[1],"gp":gp,"g":g,"a":a,"pts":pts})
    require(15<=len(players)<=120 and team is not None,"HTO_TEAM_OR_ROSTER_MISSING")
    require(all(sum(p[key] for p in players)==team[key] for key in ("g","a","pts")),
            "HTO_SKATER_TO_TEAM_TOTALS_DRIFT")

    board=[table for table in tables if table and table[0]==TEAM_HEAD]
    require(len(board)==1,"HTO_TEAM_BOARD_MISSING")
    require(len(board[0])==2,"HTO_TEAM_BOARD_ROW_COUNT")
    totals=board[0][1]
    require(all(re.fullmatch(r"\d+",v) for v in totals[:3]),"HTO_TEAM_GP_GF_GA_NONINTEGER")
    gp,gf,ga=map(int,totals[:3])
    require(gp==team["gp"] and gf==team["g"],"HTO_STATS_TEAM_TOTAL_MISMATCH")
    require(1<=gp<=250 and 0<=gf<=1500 and 0<=ga<=1500,"HTO_TEAM_TOTAL_OUT_OF_BOUNDS")
    require(all(p["gp"]<=gp for p in players),"HTO_PLAYER_GP_EXCEEDS_TEAM")

    scored=BeautifulSoup(scores_html,"html.parser")
    boards=[r for r in (rows(t) for t in scored.find_all("table"))
            if r and r[0] in SCORE_HEADERS]
    require(len(boards)==gp,"HTO_FINAL_SCORES_GP_MISMATCH")
    game_scores=[]
    for table in boards:
        # Each official table may differ in OT columns, never in row width.
        require(len(table)==3 and all(len(x)==len(table[0]) for x in table),
                "HTO_SCORE_BOARD_MALFORMED")
        require(sum(1 for r in table[1:] if r[0]=="Brave H.C.")==1,
                "HTO_SCORE_OUR_TEAM_IDENTITY")
        require(all(all(re.fullmatch(r"\d+",x) for x in r[1:]) for r in table[1:]),
                "HTO_SCORE_NONINTEGER")
        ours=next(r for r in table[1:] if r[0]=="Brave H.C.")
        theirs=next(r for r in table[1:] if r[0]!="Brave H.C.")
        game_scores.append((int(ours[-1]),int(theirs[-1])))
    require(sum(x for x,_ in game_scores)==gf and sum(y for _,y in game_scores)==ga,
            "HTO_OFFICIAL_SCORES_VS_STATS_MISMATCH")
    result={"schema":"brave-hc-hto-player-actuals/v1","status":"VERIFIED_HTO_CURRENT",
            "source":"Official Brave H.C. HTO current-season player statistics",
            "sourceUrl":STAT_URL,"season":season,"asOf":stamp,
            "teamGP":gp,"teamGF":gf,"teamGA":ga,
            "teamGoals":team["g"],"teamAssists":team["a"],
            "teamPlayerPoints":team["pts"],"playerCount":len(players),"players":players}
    return result

def signature(x):
    # Compare only independently verified official skater fields; preserved roster
    # attendance enrichments in another feed must not create spurious updates.
    cols=("schema","status","source","sourceUrl","season","teamGP","teamGF",
          "teamGA","teamGoals","teamAssists","teamPlayerPoints","playerCount","players")
    return json.dumps({k:x.get(k) for k in cols},sort_keys=True,separators=(",",":"))

def decide(proposed,previous):
    if previous is None:return "NEW_VERIFIED"
    require(previous.get("schema")==proposed["schema"] and
            previous.get("status")=="VERIFIED_HTO_CURRENT" and
            previous.get("sourceUrl")==STAT_URL,"PREVIOUS_PUBLISHED_SOURCE_IDENTITY")
    if proposed["season"]==previous["season"]:
        require(proposed["teamGP"]>=previous["teamGP"] and
                proposed["teamGF"]>=previous["teamGF"] and
                proposed["teamGA"]>=previous["teamGA"],
                "CURRENT_SEASON_TEAM_TOTAL_REGRESSION_REVIEW")
        by_name={x["name"]:x for x in proposed["players"]}
        for old in previous["players"]:
            if old["gp"]>0:
                require(old["name"] in by_name,"HTO_ROSTER_REMOVED_PUBLISHED_PLAYER_REVIEW")
                new=by_name[old["name"]]
                require(new["gp"]>=old["gp"] and new["g"]>=old["g"] and
                        new["a"]>=old["a"] and new["pts"]>=old["pts"],
                        "HTO_PLAYER_STAT_CORRECTION_REQUIRES_REVIEW")
    else:
        require(int(proposed["season"][1:5])>=int(previous["season"][1:5]),
                "HTO_PUBLISHED_SEASON_REWIND")
    if signature(proposed)==signature(previous):return "UNCHANGED_VERIFIED"
    return "UPDATED_VERIFIED"

def run(output,receipt,check_only=False):
    # Fetch both independently: scoreboard/stat races produce HOLD, never partial publication.
    stats=read_html(STAT_URL)
    scores=read_html(SCORES_URL)
    proposal=parse(stats,scores)
    # Preserve the distinct rosterCoverage authority in the established actuals file.
    # Hourly skater actuals use a separate, source-verified feed, never overwrite it.
    if output.resolve()==BASELINE.resolve():
        raise SourceHold("REFUSE_TO_OVERWRITE_SOURCE_QUALIFIED_PLAYER_ACTUALS")
    baseline=json.loads(BASELINE.read_text(encoding="utf-8")) if BASELINE.exists() else None
    if baseline is not None:decide(proposal,baseline)
    old=json.loads(output.read_text(encoding="utf-8")) if output.exists() else None
    status=decide(proposal,old)
    summary={"status":status,"checkedAtUTC":proposal["asOf"],
             "source":"HTO_PUBLIC_STATS_AND_FINAL_SCORES",
             "teamGP":proposal["teamGP"],"teamGF":proposal["teamGF"],
             "teamGA":proposal["teamGA"],"players":proposal["playerCount"],
             "outputChanged":False,"checkOnly":check_only,
             "historicalAchievementsChanged":False,"awardsInferred":0}
    if status in ("NEW_VERIFIED","UPDATED_VERIFIED") and not check_only:
        output.parent.mkdir(parents=True,exist_ok=True)
        raw=json.dumps(proposal,indent=2,ensure_ascii=False)+"\n"
        with tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",
                   dir=output.parent,prefix=".hto-hourly-",suffix=".tmp",
                   delete=False) as f:
            temp=Path(f.name)
            f.write(raw)
        os.replace(temp,output)
        summary["outputChanged"]=True
    if receipt is not None:
        receipt.parent.mkdir(parents=True,exist_ok=True)
        receipt.write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    return summary

def main():
    arg=argparse.ArgumentParser()
    arg.add_argument("--output",type=Path,default=OUTPUT)
    arg.add_argument("--receipt",type=Path)
    arg.add_argument("--check-only",action="store_true")
    a=arg.parse_args()
    try:
        print(json.dumps(run(a.output,a.receipt,a.check_only),indent=2))
    except (SourceHold,requests.RequestException,ValueError,OSError,KeyError) as e:
        error={"status":"HOLD_NOT_PUBLISHED","reason":str(e),"outputChanged":False,
               "historicalAchievementsChanged":False}
        if a.receipt:
            a.receipt.parent.mkdir(parents=True,exist_ok=True)
            a.receipt.write_text(json.dumps(error,indent=2)+"\n",encoding="utf-8")
        print(json.dumps(error),file=sys.stderr)
        return 2
    return 0

if __name__=="__main__":
    sys.exit(main())
