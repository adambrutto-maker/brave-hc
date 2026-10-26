"""Export public current Brave H.C. skater totals directly from HTO readback.

Only public HTO GP/G/A/PTS by player are used. The workbook projection and
its five career trend thresholds remain completely unchanged.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone,timedelta
from pathlib import Path
import json,os,sys

class Hold(ValueError):pass

def parse(source,now=None):
    now=now or datetime.now(timezone.utc)
    if source.get("readOnly") is not True:raise Hold("HTO_READBACK_NOT_READ_ONLY")
    try:stamp=datetime.fromisoformat(source["date"].replace("Z","+00:00"))
    except (KeyError,TypeError,ValueError) as e:raise Hold("HTO_SOURCE_TIMESTAMP_MISSING") from e
    if stamp.tzinfo is None or not timedelta(0)<=now-stamp<=timedelta(hours=30):
        raise Hold("HTO_SOURCE_STALE")
    p=[p for p in source.get("pages",[]) if p.get("name")=="hto_stats"]
    if (len(p)!=1 or p[0].get("error") or
        p[0].get("url")!="https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY"):
        raise Hold("HTO_PUBLIC_STATS_SOURCE_IDENTITY")
    stats=p[0]
    if "STATS - WINTER 2026/2027" not in stats.get("text",""):
        raise Hold("HTO_SEASON_PAGE_MISMATCH")
    table=next((t for t in stats.get("tables",[]) if
                t.get("rows") and t["rows"][0][:2]==["No","Name"]),None)
    if table is None:raise Hold("HTO_SKATER_TABLE_MISSING")
    rows=table["rows"]
    if len(rows)<6 or rows[0][4:8]!=["GP","G","A","Pts"]:
        raise Hold("HTO_SKATER_COLUMN_CONTRACT_CHANGED")
    players=[];sourceTotals=None;names=set()
    for row in rows[1:]:
        if len(row)<8:raise Hold("HTO_STAT_ROW_INCOMPLETE")
        try:gp,g,a,pts=map(int,row[4:8])
        except ValueError as e:raise Hold("HTO_SKATER_STAT_NOT_INTEGER") from e
        if any(x<0 for x in (gp,g,a,pts)) or pts!=g+a:
            raise Hold("HTO_SKATER_POINTS_MISMATCH")
        name=row[1].strip()
        if name=="Team Stats":
            sourceTotals={"gp":gp,"g":g,"a":a,"pts":pts}
            continue
        if not name or name in names:raise Hold("HTO_SKATER_IDENTITY_DUPLICATE")
        names.add(name)
        players.append({"name":name,"gp":gp,"g":g,"a":a,"pts":pts})
    if sourceTotals is None or len(players)<15:raise Hold("HTO_SKATER_AGGREGATE_MISSING")
    if (sum(p["g"] for p in players),sum(p["a"] for p in players),
        sum(p["pts"] for p in players))!=(sourceTotals["g"],sourceTotals["a"],sourceTotals["pts"]):
        raise Hold("HTO_PLAYER_SUMS_DO_NOT_MATCH_TEAM")
    team=next((t for t in stats.get("tables",[]) if
               t.get("rows") and t["rows"][0]==["GP","GF","GA","PPO","PK%"]),None)
    if team is None or len(team["rows"])!=2:raise Hold("HTO_TEAM_SCORE_TABLE_MISSING")
    try:teamGP,GF,GA=map(int,team["rows"][1][:3])
    except ValueError as e:raise Hold("HTO_TEAM_SCORE_NOT_INTEGER") from e
    if teamGP!=sourceTotals["gp"] or GF!=sourceTotals["g"]:
        raise Hold("HTO_SKATER_VS_TEAM_GOALS_GP_MISMATCH")
    scores=next((p for p in source.get("pages",[]) if p.get("name")=="hto_scores"),None)
    if not scores or scores.get("error"):raise Hold("HTO_SCORES_CROSSCHECK_UNAVAILABLE")
    scoreTables=[t for t in scores.get("tables",[]) if t.get("rows") and t["rows"][0][0]=="REGULAR SEASON"]
    if len(scoreTables)!=teamGP:raise Hold("HTO_SCORECARD_GAME_COUNT_DRIFT")
    confirmed=[]
    for t in scoreTables:
        rows=t.get("rows",[])
        if len(rows)!=3:raise Hold("HTO_SCORECARD_TABLE_UNEXPECTED")
        ours=[r for r in rows[1:] if r[0]=="Brave H.C."]
        theirs=[r for r in rows[1:] if r[0]!="Brave H.C."]
        if len(ours)!=1 or len(theirs)!=1:raise Hold("HTO_SCORECARD_TEAM_IDENTITY")
        confirmed.append((int(ours[0][-1]),int(theirs[0][-1])))
    if (sum(x[0] for x in confirmed),sum(x[1] for x in confirmed))!=(GF,GA):
        raise Hold("HTO_SCORECARD_VS_STATS_AGGREGATE_DRIFT")
    return {"schema":"brave-hc-hto-player-actuals/v1",
            "status":"VERIFIED_HTO_CURRENT","source":"Official Brave H.C. HTO current-season player statistics",
            "sourceUrl":p[0]["url"],"season":"W2026/27",
            "asOf":source["date"],"teamGP":teamGP,"teamGF":GF,"teamGA":GA,
            "teamGoals":sourceTotals["g"],"teamAssists":sourceTotals["a"],"teamPlayerPoints":sourceTotals["pts"],
            "playerCount":len(players),"players":players}

def export(source,output):
    d=parse(json.loads(Path(source).read_text(encoding="utf-8-sig")))
    path=Path(output);path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    os.replace(tmp,path)
    return {"status":d["status"],"teamGP":d["teamGP"],"teamGF":d["teamGF"],
            "teamGA":d["teamGA"],"skaters":d["playerCount"],"output":str(path)}
def main():
    ap=ArgumentParser()
    ap.add_argument("--source",required=True);ap.add_argument("--output",required=True)
    a=ap.parse_args()
    try:print(json.dumps(export(a.source,a.output)));return 0
    except (Hold,KeyError,ValueError,OSError) as e:
        print(json.dumps({"state":"HOLD","reason":str(e),"published":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
